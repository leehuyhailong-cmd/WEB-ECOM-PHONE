'use strict';

const { Order } = require('../models');

/**
 * OrderRepository — sole data-access seam for the Order collection.
 * Strategy rule: OrderSchema.index({ userId: 1, createdAt: -1 }) covers the hottest query.
 * Always .lean() on reads. Use session param for transaction support.
 */

/**
 * Create a new order inside an optional Mongoose session.
 * Order.create() with a session array is required for transactions.
 * @param {object} data
 * @param {object} [session]
 * @returns {Promise<object>}
 */
async function create(data, session) {
  const [order] = await Order.create([data], session ? { session } : {});
  return order.toObject();
}

/**
 * Find order by ID (no ownership check — use in service layer).
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function findById(id) {
  return Order.findById(id).lean();
}

/**
 * Find order by ID with user details populated.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function findByIdPopulated(id) {
  return Order.findById(id)
    .populate('userId', 'name email phone')
    .lean();
}

/**
 * Paginated order history for a single user.
 * Uses the { userId: 1, createdAt: -1 } index.
 * @param {string} userId
 * @param {{ page?: number, limit?: number }} params
 * @returns {Promise<{ orders: object[], total: number }>}
 */
async function findByUser(userId, params = {}) {
  const page  = Math.max(1, params.page  || 1);
  const limit = Math.min(50, params.limit || 10);
  const skip  = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('items status paymentMethod paymentStatus totalPrice createdAt shippingAddress')
      .lean(),
    Order.countDocuments({ userId }),
  ]);

  return { orders, total };
}

/**
 * Admin: paginated list of all orders, optionally filtered by status.
 * Uses the { status: 1, createdAt: -1 } index.
 * @param {{ page?, limit?, status?, paymentStatus? }} params
 * @returns {Promise<{ orders: object[], total: number }>}
 */
async function findAllAdmin(params = {}) {
  const page  = Math.max(1, params.page  || 1);
  const limit = Math.min(50, params.limit || 20);
  const skip  = (page - 1) * limit;

  const filter = {};
  if (params.status)        filter.status        = params.status;
  if (params.paymentStatus) filter.paymentStatus = params.paymentStatus;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
  ]);

  return { orders, total };
}

/**
 * Update order status (with optional extra fields like cancelReason).
 * @param {string} id
 * @param {string} status
 * @param {object} [extra] - Additional fields to set (e.g. cancelReason)
 * @returns {Promise<object|null>}
 */
async function updateStatus(id, status, extra = {}) {
  return Order.findByIdAndUpdate(
    id,
    { $set: { status, ...extra } },
    { new: true, lean: true },
  );
}

/**
 * Update payment fields after VNPay IPN/return verification.
 * @param {string} id
 * @param {{ paymentStatus, vnpayTransactionId, vnpayBankCode, vnpayResponseCode, paidAt }} fields
 * @returns {Promise<object|null>}
 */
async function updatePayment(id, fields) {
  return Order.findByIdAndUpdate(
    id,
    { $set: fields },
    { new: true, lean: true },
  );
}

/**
 * Find order by VNPay transaction reference (vnp_TxnRef = order._id string).
 * Uses the { vnpayTransactionId: 1 } sparse index.
 * @param {string} txnRef - Order _id string sent to VNPay
 * @returns {Promise<object|null>}
 */
async function findByTxnRef(txnRef) {
  return Order.findById(txnRef).lean();
}

module.exports = {
  create,
  findById,
  findByIdPopulated,
  findByUser,
  findAllAdmin,
  updateStatus,
  updatePayment,
  findByTxnRef,
};
