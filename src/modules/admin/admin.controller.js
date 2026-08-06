'use strict';

const adminService = require('./admin.service');
const { ApiResponse, parsePagination } = require('../../utils/apiResponse');

/**
 * AdminController — HTTP only.
 * Reads req, calls service, returns ApiResponse.
 * Zero Mongoose. Zero aggregation logic. Zero business rules.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// KPI & Stats
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/stats/overview
 * All KPI cards in one call: revenue MTD, orders today, new users, low stock.
 */
async function overview(req, res) {
  const data = await adminService.getOverview();
  return ApiResponse.success(res, data, 'Thống kê tổng quan');
}

/**
 * GET /api/admin/stats/revenue?days=30
 * Revenue by day for chart rendering.
 */
async function revenueChart(req, res) {
  const { days } = req.query;
  const data = await adminService.getRevenueChart(days);
  return ApiResponse.success(res, data, 'Doanh thu theo ngày');
}

/**
 * GET /api/admin/stats/top-products?limit=5
 * Top N products by revenue.
 */
async function topProducts(req, res) {
  const { limit } = req.query;
  const data = await adminService.getTopProducts(limit);
  return ApiResponse.success(res, data, 'Sản phẩm bán chạy');
}

/**
 * GET /api/admin/stats/orders-by-status
 * Order count grouped by status (pie chart).
 */
async function ordersByStatus(req, res) {
  const data = await adminService.getOrdersByStatus();
  return ApiResponse.success(res, data, 'Đơn hàng theo trạng thái');
}

/**
 * GET /api/admin/stats/category-breakdown
 * Revenue by product category.
 */
async function categoryBreakdown(req, res) {
  const data = await adminService.getRevenueByCategory();
  return ApiResponse.success(res, data, 'Doanh thu theo danh mục');
}

/**
 * GET /api/admin/stats/low-stock?threshold=10
 * Products with stock below threshold.
 */
async function lowStock(req, res) {
  const { threshold } = req.query;
  const data = await adminService.getLowStock(threshold);
  return ApiResponse.success(res, data, 'Sản phẩm sắp hết hàng');
}

/**
 * GET /api/admin/stats/recent-orders
 * Most recent orders for activity feed.
 */
async function recentOrders(req, res) {
  const data = await adminService.getRecentOrders();
  return ApiResponse.success(res, data, 'Đơn hàng gần đây');
}

// ═══════════════════════════════════════════════════════════════════════════════
// User Management
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/users
 * Paginated user list with search.
 */
async function listUsers(req, res) {
  const { page, limit } = parsePagination(req.query, 20);
  const result = await adminService.listUsers({ ...req.query, page, limit });

  return ApiResponse.paginated(res, result.users, {
    page:  result.page,
    limit: result.limit,
    total: result.total,
  });
}

/**
 * GET /api/admin/users/:id
 * Single user detail.
 */
async function getUser(req, res) {
  const user = await adminService.getUserById(req.params.id);
  return ApiResponse.success(res, user, 'Thông tin người dùng');
}

/**
 * PATCH /api/admin/users/:id/role
 * Change user role (user ↔ admin).
 */
async function updateRole(req, res) {
  const user = await adminService.updateUserRole(
    req.params.id,
    req.body.role,
    req.user.id, // The admin performing the action
  );
  return ApiResponse.success(res, user, 'Cập nhật quyền thành công');
}

/**
 * PATCH /api/admin/users/:id/status
 * Activate/deactivate user account.
 */
async function updateStatus(req, res) {
  const user = await adminService.updateUserStatus(
    req.params.id,
    req.body.isActive,
    req.user.id,
  );
  return ApiResponse.success(res, user, 'Cập nhật trạng thái thành công');
}

module.exports = {
  overview,
  revenueChart,
  topProducts,
  ordersByStatus,
  categoryBreakdown,
  lowStock,
  recentOrders,
  listUsers,
  getUser,
  updateRole,
  updateStatus,
};
