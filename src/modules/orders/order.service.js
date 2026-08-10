'use strict';

const orderRepository   = require('../../repositories/order.repository');
const cartRepository    = require('../../repositories/cart.repository');
const productRepository = require('../../repositories/product.repository');
const { getVNPay, ProductCode, VnpLocale } = require('../../config/vnpay');
const {
  NotFoundError, ConflictError, ForbiddenError, BadRequestError, AppError,
} = require('../../utils/errors');
const { logger } = require('../../utils/logger');

/**
 * OrderService — deep module owning all order + payment logic.
 *
 * Critical path: createOrder()
 *   1. Load and validate cart
 *   2. Snapshot current prices (immutable — protects against price changes post-order)
 *   3. Atomically decrement stock for every item ($gte guard = no oversell)
 *   4. Create Order document
 *   5. Clear cart
 *   If any stock decrement fails → rollback already-decremented items → throw
 *
 * VNPay flow:
 *   createOrder() → paymentMethod==='vnpay' → createPaymentUrl()
 *   → user pays on VNPay → VNPay IPN hits handleIpn() → order.paymentStatus='paid'
 *   → VNPay redirects user to handleReturn() → frontend shows result
 */

// ── Create order ──────────────────────────────────────────────────────────────

/**
 * Create a new order from the user's current cart.
 * @param {string} userId
 * @param {{ shippingAddress, paymentMethod, note }} data
 * @param {string} ipAddr - Client IP for VNPay
 * @returns {Promise<{ order: object, paymentUrl?: string }>}
 */
async function createOrder(userId, data, ipAddr) {
  const { shippingAddress, paymentMethod = 'cod', note = '', items } = data;

  if (!items || !items.length) {
    throw new BadRequestError('Giỏ hàng trống — không thể tạo đơn hàng');
  }

  // 2. Validate all items and snapshot prices
  const snapshots = [];
  for (const item of items) {
    const product = await productRepository.findById(item.productId);
    if (!product || !product.isActive) {
      throw new ConflictError(`Sản phẩm "${item.productId}" không tồn tại hoặc ngừng bán`);
    }
    if (product.stock < item.quantity) {
      throw new ConflictError(
        `Sản phẩm "${product.name}" chỉ còn ${product.stock} — vui lòng cập nhật giỏ hàng`,
      );
    }
    snapshots.push({
      productId: product._id,
      name:      product.name,
      slug:      product.slug,
      price:     product.price,      // PRICE SNAPSHOT — immutable after order
      quantity:  item.quantity,
      image:     product.images?.[0]?.url || '',
      subtotal:  product.price * item.quantity,
    });
  }

  const subtotal   = snapshots.reduce((s, i) => s + i.subtotal, 0);
  const totalPrice = subtotal; // extend here for shipping fees / discounts

  // 3. Atomic stock decrement — per-item with $gte guard (no oversell)
  const decremented = [];
  try {
    for (const snap of snapshots) {
      const updated = await productRepository.decrementStock(snap.productId, snap.quantity);
      if (!updated) {
        throw new ConflictError(`Sản phẩm "${snap.name}" đã hết hàng trong lúc xử lý đơn`);
      }
      decremented.push({ productId: snap.productId, quantity: snap.quantity });
    }
  } catch (err) {
    // Rollback: restore stock for already-decremented items
    if (decremented.length > 0) {
      await Promise.allSettled(
        decremented.map(d =>
          productRepository.incrementStock(d.productId, d.quantity),
        ),
      );
      logger.warn({ msg: 'Stock rollback executed', items: decremented });
    }
    throw err;
  }

  // 4. Create order document
  const order = await orderRepository.create({
    userId,
    items:           snapshots,
    shippingAddress,
    paymentMethod,
    paymentStatus:   paymentMethod === 'cod' ? 'pending' : 'pending',
    subtotal,
    totalPrice,
    note,
    status:          'pending',
  });

  // 5. Clear cart
  await cartRepository.clearByUserId(userId);

  logger.info({
    msg:      'Order created',
    orderId:  order._id,
    userId,
    total:    totalPrice,
    payment:  paymentMethod,
  });

  // 6. If VNPay — generate payment URL
  if (paymentMethod === 'vnpay') {
    const paymentUrl = _createVNPayUrl(order, ipAddr);
    return { order, paymentUrl };
  }

  return { order };
}

// ── User: get orders ──────────────────────────────────────────────────────────

async function getMyOrders(userId, params) {
  const { orders, total } = await orderRepository.findByUser(userId, params);
  return { orders, total, page: params.page || 1, limit: params.limit || 10 };
}

async function getMyOrderById(userId, orderId) {
  const order = await orderRepository.findByIdPopulated(orderId);
  if (!order) throw new NotFoundError('Không tìm thấy đơn hàng');
  if (order.userId._id?.toString() !== userId && order.userId?.toString() !== userId) {
    throw new ForbiddenError('Bạn không có quyền xem đơn hàng này');
  }
  return order;
}

// ── User: cancel order ────────────────────────────────────────────────────────

/**
 * User can only cancel 'pending' orders.
 * Stock is restored on cancellation.
 */
async function cancelOrder(userId, orderId, reason) {
  const order = await orderRepository.findById(orderId);
  if (!order) throw new NotFoundError('Không tìm thấy đơn hàng');
  if (order.userId.toString() !== userId) throw new ForbiddenError('Không có quyền huỷ đơn');
  if (order.status !== 'pending') {
    throw new ConflictError(`Không thể huỷ đơn hàng đang ở trạng thái "${order.status}"`);
  }

  // Restore stock for each item
  await Promise.all(
    order.items.map(i =>
      productRepository.incrementStock(i.productId, i.quantity),
    ),
  );

  await orderRepository.updateStatus(orderId, 'cancelled', {
    cancelReason: reason || 'Khách hàng huỷ đơn',
  });

  logger.info({ msg: 'Order cancelled', orderId, userId });
}

// ── Admin: manage orders ──────────────────────────────────────────────────────

async function getAllOrders(params) {
  const { orders, total } = await orderRepository.findAllAdmin(params);
  return { orders, total, page: params.page || 1, limit: params.limit || 20 };
}

async function updateOrderStatus(orderId, status, cancelReason) {
  const order = await orderRepository.findById(orderId);
  if (!order) throw new NotFoundError('Không tìm thấy đơn hàng');

  const extra = {};
  if (status === 'cancelled') {
    // Restore stock when admin cancels
    if (['pending', 'confirmed'].includes(order.status)) {
      await Promise.all(
        order.items.map(i =>
          productRepository.incrementStock(i.productId, i.quantity),
        ),
      );
    }
    extra.cancelReason = cancelReason || 'Admin huỷ đơn';
  }
  if (status === 'delivered') extra.deliveredAt = new Date();

  return orderRepository.updateStatus(orderId, status, extra);
}

// ── VNPay: IPN handler (server-to-server) ────────────────────────────────────

/**
 * Called by VNPay's servers to confirm payment.
 * This is the authoritative payment confirmation — not the return URL.
 * @param {object} query - VNPay IPN query params
 * @returns {{ RspCode: string, Message: string }} — response body for VNPay
 */
async function handleVNPayIpn(query) {
  const vnpay = getVNPay();
  if (!vnpay) return { RspCode: '99', Message: 'VNPay not configured' };

  let verify;
  try {
    verify = vnpay.verifyIpnCall(query);
  } catch {
    return { RspCode: '97', Message: 'Invalid signature' };
  }

  if (!verify.isVerified) return { RspCode: '97', Message: 'Invalid signature' };

  const orderId = query.vnp_TxnRef;
  const order   = await orderRepository.findByTxnRef(orderId);

  if (!order) return { RspCode: '01', Message: 'Order not found' };
  if (order.paymentStatus === 'paid') return { RspCode: '02', Message: 'Already confirmed' };

  const isSuccess = query.vnp_ResponseCode === '00' || query.vnp_ResponseCode === '0';

  await orderRepository.updatePayment(orderId, {
    paymentStatus:        isSuccess ? 'paid' : 'failed',
    vnpayTransactionId:   query.vnp_TransactionNo,
    vnpayBankCode:        query.vnp_BankCode,
    vnpayResponseCode:    query.vnp_ResponseCode,
    ...(isSuccess && { paidAt: new Date(), status: 'confirmed' }),
  });

  logger.info({
    msg:       isSuccess ? 'VNPay payment confirmed' : 'VNPay payment failed',
    orderId,
    responseCode: query.vnp_ResponseCode,
  });

  return { RspCode: '00', Message: 'Confirm success' };
}

/**
 * Called when VNPay redirects user back after payment.
 * Verifies signature and redirects frontend with result.
 * @param {object} query
 * @returns {{ isSuccess: boolean, orderId: string, message: string }}
 */
async function handleVNPayReturn(query) {
  const vnpay = getVNPay();
  if (!vnpay) throw new AppError('VNPay chưa được cấu hình', 503);

  let verify;
  try {
    verify = vnpay.verifyReturnUrl(query);
  } catch {
    throw new BadRequestError('Chữ ký VNPay không hợp lệ');
  }

  const isSuccess = verify.isVerified && query.vnp_ResponseCode === '00';
  const orderId   = query.vnp_TxnRef;

  return { isSuccess, orderId, message: isSuccess ? 'Thanh toán thành công' : 'Thanh toán thất bại' };
}

// ── Private helpers ───────────────────────────────────────────────────────────

function _createVNPayUrl(order, ipAddr) {
  const vnpay = getVNPay();
  if (!vnpay) {
    logger.warn({ msg: 'VNPay not configured — cannot create payment URL' });
    return null;
  }

  return vnpay.buildPaymentUrl({
    vnp_Amount:     order.totalPrice,          // VND integer — sdk multiplies ×100
    vnp_IpAddr:     ipAddr || '127.0.0.1',
    vnp_TxnRef:     order._id.toString(),      // Our order _id as transaction reference
    vnp_OrderInfo:  `Thanh toan don hang ${order._id}`,
    vnp_OrderType:  ProductCode.Other,
    vnp_ReturnUrl:  process.env.VNPAY_RETURN_URL,
    vnp_Locale:     VnpLocale.VN,
  });
}

module.exports = {
  createOrder,
  getMyOrders,
  getMyOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
  handleVNPayIpn,
  handleVNPayReturn,
};
