'use strict';

const orderService    = require('./order.service');
const { ApiResponse, parsePagination } = require('../../utils/apiResponse');

/**
 * OrderController — HTTP layer only.
 * Reads req, delegates to orderService, responds via ApiResponse.
 * The client IP is extracted here (HTTP concern) and passed to the service.
 */

// ── POST /api/orders ──────────────────────────────────────────────────────────
async function createOrder(req, res) {
  const ipAddr = req.ip || req.socket?.remoteAddress || '127.0.0.1';
  const userId = req.user ? req.user.id : null;
  const { order, paymentUrl } = await orderService.createOrder(userId, req.body, ipAddr);
  return ApiResponse.created(res, { order, paymentUrl }, 'Đặt hàng thành công');
}

// ── GET /api/orders ───────────────────────────────────────────────────────────
async function getMyOrders(req, res) {
  const { page, limit } = parsePagination(req.query, 10);
  const result = await orderService.getMyOrders(req.user.id, { page, limit });
  return ApiResponse.paginated(res, result.orders, {
    page: result.page, limit: result.limit, total: result.total,
  });
}

// ── GET /api/orders/:id ───────────────────────────────────────────────────────
async function getMyOrderById(req, res) {
  const order = await orderService.getMyOrderById(req.user.id, req.params.id);
  return ApiResponse.success(res, { order }, 'Lấy chi tiết đơn hàng thành công');
}

// ── POST /api/orders/:id/cancel ───────────────────────────────────────────────
async function cancelOrder(req, res) {
  await orderService.cancelOrder(req.user.id, req.params.id, req.body.reason);
  return ApiResponse.success(res, null, 'Huỷ đơn hàng thành công');
}

// ── ADMIN: GET /api/orders/admin ──────────────────────────────────────────────
async function getAllOrders(req, res) {
  const { page, limit } = parsePagination(req.query, 20);
  const result = await orderService.getAllOrders({ ...req.query, page, limit });
  return ApiResponse.paginated(res, result.orders, {
    page: result.page, limit: result.limit, total: result.total,
  });
}

// ── ADMIN: PATCH /api/orders/:id/status ───────────────────────────────────────
async function updateOrderStatus(req, res) {
  const order = await orderService.updateOrderStatus(
    req.params.id, req.body.status, req.body.cancelReason,
  );
  return ApiResponse.success(res, { order }, 'Cập nhật trạng thái đơn hàng thành công');
}

// ── VNPay IPN — GET /api/orders/payment/vnpay/ipn ────────────────────────────
// Server-to-server: VNPay calls this, we respond with RspCode
async function vnpayIpn(req, res) {
  const result = await orderService.handleVNPayIpn(req.query);
  return res.json(result); // VNPay expects a plain JSON with RspCode
}

// ── VNPay Return — GET /api/orders/payment/vnpay/return ──────────────────────
// User is redirected here by VNPay after payment
async function vnpayReturn(req, res) {
  const { isSuccess, orderId, message } = await orderService.handleVNPayReturn(req.query);
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  // Redirect frontend to order result page
  return res.redirect(
    `${frontendUrl}/order-result.html?status=${isSuccess ? 'success' : 'failed'}&orderId=${orderId}&message=${encodeURIComponent(message)}`,
  );
}

// ── POST /api/orders/:id/pay ───────────────────────────────────────────────────
async function payOrder(req, res) {
  const order = await orderService.payOrder(req.user.id, req.params.id);
  return ApiResponse.success(res, { order }, 'Xác nhận thanh toán thành công');
}

module.exports = {
  createOrder, getMyOrders, getMyOrderById, cancelOrder,
  getAllOrders, updateOrderStatus, vnpayIpn, vnpayReturn, payOrder,
};
