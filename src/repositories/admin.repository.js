'use strict';

const { User, Product, Order } = require('../models');
const mongoose = require('mongoose');

/**
 * AdminRepository — data-access seam for all admin dashboard aggregations.
 *
 * Rules:
 *   - All Mongoose/aggregation queries live HERE, never in the service
 *   - .lean() on every read-only query
 *   - All money in VND integers
 *
 * Deletion test: removing this file scatters 6+ aggregation pipelines
 * across the service layer. Absolutely load-bearing.
 */

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns the start of the current day (00:00:00 UTC+7 → converted to UTC).
 * Vietnam is UTC+7, so "today" in VN starts at 17:00 UTC yesterday.
 */
function _startOfToday() {
  const now = new Date();
  const vnOffset = 7 * 60 * 60 * 1000; // UTC+7
  const vnMidnight = new Date(now.getTime() + vnOffset);
  vnMidnight.setUTCHours(0, 0, 0, 0);
  return new Date(vnMidnight.getTime() - vnOffset);
}

/**
 * Returns the start of the current month.
 */
function _startOfMonth() {
  const now = new Date();
  const vnOffset = 7 * 60 * 60 * 1000;
  const vnNow = new Date(now.getTime() + vnOffset);
  vnNow.setUTCDate(1);
  vnNow.setUTCHours(0, 0, 0, 0);
  return new Date(vnNow.getTime() - vnOffset);
}

// ── KPI: Overview stats ───────────────────────────────────────────────────────

/**
 * Revenue month-to-date.
 * Counts only delivered orders (completed transactions).
 *
 * @returns {Promise<number>} Total revenue in VND
 */
async function getRevenueMTD() {
  const [result] = await Order.aggregate([
    {
      $match: {
        status:    'delivered',
        createdAt: { $gte: _startOfMonth() },
      },
    },
    {
      $group: {
        _id:   null,
        total: { $sum: '$totalPrice' },
      },
    },
  ]);

  return result?.total || 0;
}

/**
 * Count orders created today (all statuses).
 *
 * @returns {Promise<number>}
 */
async function getOrdersToday() {
  return Order.countDocuments({ createdAt: { $gte: _startOfToday() } });
}

/**
 * Count new users registered today.
 *
 * @returns {Promise<number>}
 */
async function getNewUsersToday() {
  return User.countDocuments({ createdAt: { $gte: _startOfToday() } });
}

/**
 * Products with low stock (< threshold).
 *
 * @param {number} [threshold=10]
 * @returns {Promise<object[]>}
 */
async function getLowStockProducts(threshold = 10) {
  return Product.find({
    stock:    { $lt: threshold, $gte: 0 },
    isActive: true,
  })
    .sort({ stock: 1 })
    .select('name slug brand category stock price images')
    .limit(20)
    .lean();
}

/**
 * Total counts for overview cards.
 *
 * @returns {Promise<{ totalProducts, totalUsers, totalOrders }>}
 */
async function getTotalCounts() {
  const [totalProducts, totalUsers, totalOrders] = await Promise.all([
    Product.countDocuments({ isActive: true }),
    User.countDocuments(),
    Order.countDocuments(),
  ]);

  return { totalProducts, totalUsers, totalOrders };
}

// ── Chart: Revenue by day ─────────────────────────────────────────────────────

/**
 * Revenue aggregated by day for the last N days.
 * Only counts delivered orders.
 *
 * @param {number} [days=30]
 * @returns {Promise<Array<{ date: string, revenue: number, count: number }>>}
 */
async function getRevenueByDay(days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  return Order.aggregate([
    {
      $match: {
        status:    'delivered',
        createdAt: { $gte: since },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format:   '%Y-%m-%d',
            date:     '$createdAt',
            timezone: '+07:00', // Vietnam timezone
          },
        },
        revenue: { $sum: '$totalPrice' },
        count:   { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id:     0,
        date:    '$_id',
        revenue: 1,
        count:   1,
      },
    },
  ]);
}

// ── Chart: Top products by revenue ────────────────────────────────────────────

/**
 * Top N products by revenue from delivered orders.
 * Unwinds order items → groups by productId → sums subtotal.
 *
 * @param {number} [limit=5]
 * @returns {Promise<Array<{ productId, name, revenue, unitsSold }>>}
 */
async function getTopProducts(limit = 5) {
  return Order.aggregate([
    { $match: { status: 'delivered' } },
    { $unwind: '$items' },
    {
      $group: {
        _id:       '$items.productId',
        name:      { $first: '$items.name' },
        image:     { $first: '$items.image' },
        revenue:   { $sum: '$items.subtotal' },
        unitsSold: { $sum: '$items.quantity' },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: limit },
    {
      $project: {
        _id:       0,
        productId: '$_id',
        name:      1,
        image:     1,
        revenue:   1,
        unitsSold: 1,
      },
    },
  ]);
}

// ── Chart: Orders by status ───────────────────────────────────────────────────

/**
 * Order count grouped by status (for pie chart).
 *
 * @returns {Promise<Array<{ status: string, count: number }>>}
 */
async function getOrdersByStatus() {
  return Order.aggregate([
    {
      $group: {
        _id:   '$status',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    {
      $project: {
        _id:    0,
        status: '$_id',
        count:  1,
      },
    },
  ]);
}

// ── Chart: Revenue by category ────────────────────────────────────────────────

/**
 * Revenue breakdown by product category from delivered orders.
 * Joins order items with products to get category.
 *
 * @returns {Promise<Array<{ category: string, revenue: number, count: number }>>}
 */
async function getRevenueByCategory() {
  return Order.aggregate([
    { $match: { status: 'delivered' } },
    { $unwind: '$items' },
    {
      $lookup: {
        from:         'products',
        localField:   'items.productId',
        foreignField: '_id',
        as:           'product',
        pipeline:     [{ $project: { category: 1 } }],
      },
    },
    { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id:     { $ifNull: ['$product.category', 'unknown'] },
        revenue: { $sum: '$items.subtotal' },
        count:   { $sum: 1 },
      },
    },
    { $sort: { revenue: -1 } },
    {
      $project: {
        _id:      0,
        category: '$_id',
        revenue:  1,
        count:    1,
      },
    },
  ]);
}

// ── User management ───────────────────────────────────────────────────────────

/**
 * Paginated user list for admin panel.
 *
 * @param {{ page, limit, search, role }} params
 * @returns {Promise<{ users: object[], total: number }>}
 */
async function findUsers(params = {}) {
  const page  = Math.max(1, params.page || 1);
  const limit = Math.min(50, params.limit || 20);
  const skip  = (page - 1) * limit;

  const filter = {};
  if (params.role) filter.role = params.role;
  if (params.search) {
    filter.$or = [
      { name:  new RegExp(params.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
      { email: new RegExp(params.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('name email role avatar phone isActive createdAt')
      .lean(),
    User.countDocuments(filter),
  ]);

  return { users, total };
}

/**
 * Update a user's role.
 *
 * @param {string} userId
 * @param {string} role
 * @returns {Promise<object|null>}
 */
async function updateUserRole(userId, role) {
  return User.findByIdAndUpdate(
    userId,
    { role },
    { new: true, runValidators: true },
  )
    .select('name email role isActive createdAt')
    .lean();
}

/**
 * Toggle user active status.
 *
 * @param {string} userId
 * @param {boolean} isActive
 * @returns {Promise<object|null>}
 */
async function updateUserStatus(userId, isActive) {
  return User.findByIdAndUpdate(
    userId,
    { isActive },
    { new: true, runValidators: true },
  )
    .select('name email role isActive createdAt')
    .lean();
}

/**
 * Find a single user by ID (admin view).
 *
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
async function findUserById(userId) {
  return User.findById(userId)
    .select('name email role avatar phone addresses isActive createdAt updatedAt')
    .lean();
}

// ── Recent activity ───────────────────────────────────────────────────────────

/**
 * Get the most recent orders (for dashboard activity feed).
 *
 * @param {number} [limit=10]
 * @returns {Promise<object[]>}
 */
async function getRecentOrders(limit = 10) {
  return Order.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('userId items status totalPrice paymentMethod paymentStatus createdAt')
    .populate('userId', 'name email')
    .lean();
}

module.exports = {
  // KPI overview
  getRevenueMTD,
  getOrdersToday,
  getNewUsersToday,
  getLowStockProducts,
  getTotalCounts,
  // Charts
  getRevenueByDay,
  getTopProducts,
  getOrdersByStatus,
  getRevenueByCategory,
  // User management
  findUsers,
  updateUserRole,
  updateUserStatus,
  findUserById,
  // Activity
  getRecentOrders,
};
