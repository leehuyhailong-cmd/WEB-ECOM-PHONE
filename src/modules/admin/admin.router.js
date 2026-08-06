'use strict';

const { Router } = require('express');
const asyncHandler = require('../../utils/asyncHandler');
const validate     = require('../../middlewares/validate');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');

const adminController = require('./admin.controller');
const {
  revenueQuerySchema,
  topProductsQuerySchema,
  listUsersSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  lowStockQuerySchema,
} = require('./admin.validator');

const router = Router();

/**
 * Admin Dashboard Router
 *
 * EVERY route requires: authenticate + authorize('admin')
 * No public or user-level access.
 *
 * Route groups:
 *   /stats/*  — KPI cards and chart data
 *   /users/*  — User management CRUD
 */

// ── Global admin guard — applies to ALL routes in this router ────────────────
router.use(authenticate);
router.use(authorize('admin'));

// ═══════════════════════════════════════════════════════════════════════════════
// Stats & Charts (all GET)
// ═══════════════════════════════════════════════════════════════════════════════

// KPI overview — all metrics in one call
router.get(
  '/stats/overview',
  asyncHandler(adminController.overview),
);

// Revenue by day (line chart)
router.get(
  '/stats/revenue',
  validate(revenueQuerySchema),
  asyncHandler(adminController.revenueChart),
);

// Top products by revenue (bar chart)
router.get(
  '/stats/top-products',
  validate(topProductsQuerySchema),
  asyncHandler(adminController.topProducts),
);

// Orders by status (pie chart)
router.get(
  '/stats/orders-by-status',
  asyncHandler(adminController.ordersByStatus),
);

// Revenue by category (donut chart)
router.get(
  '/stats/category-breakdown',
  asyncHandler(adminController.categoryBreakdown),
);

// Low stock products
router.get(
  '/stats/low-stock',
  validate(lowStockQuerySchema),
  asyncHandler(adminController.lowStock),
);

// Recent orders activity feed
router.get(
  '/stats/recent-orders',
  asyncHandler(adminController.recentOrders),
);

// ═══════════════════════════════════════════════════════════════════════════════
// User Management
// ═══════════════════════════════════════════════════════════════════════════════

// List users with search and pagination
router.get(
  '/users',
  validate(listUsersSchema),
  asyncHandler(adminController.listUsers),
);

// Get single user detail
router.get(
  '/users/:id',
  asyncHandler(adminController.getUser),
);

// Change user role (user ↔ admin)
router.patch(
  '/users/:id/role',
  validate(updateUserRoleSchema),
  asyncHandler(adminController.updateRole),
);

// Activate / deactivate user
router.patch(
  '/users/:id/status',
  validate(updateUserStatusSchema),
  asyncHandler(adminController.updateStatus),
);

module.exports = router;
