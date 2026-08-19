'use strict';

const express = require('express');

const asyncHandler             = require('../../utils/asyncHandler');
const validate                 = require('../../middlewares/validate');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const orderController          = require('./order.controller');
const { createOrderSchema, updateStatusSchema, cancelOrderSchema } = require('./order.validator');

const router = express.Router();

/**
 * Order Router
 *
 * Public (VNPay server callback — no auth, signature verified in service):
 *   GET  /api/orders/payment/vnpay/ipn     — VNPay server-to-server IPN
 *   GET  /api/orders/payment/vnpay/return  — VNPay user redirect after payment
 *
 * Protected (authenticated user):
 *   POST /api/orders                       — create order from cart
 *   GET  /api/orders                       — user's order history
 *   GET  /api/orders/:id                   — order detail (ownership checked in service)
 *   POST /api/orders/:id/cancel            — cancel pending order
 *
 * Admin only:
 *   GET   /api/orders/admin                — all orders with filters
 *   PATCH /api/orders/:id/status           — update order status
 *
 * IMPORTANT: Static paths (/admin, /payment/*) declared before /:id
 */

// ── VNPay callbacks — PUBLIC (no auth, signature verified in service) ─────────
router.get('/payment/vnpay/ipn',    asyncHandler(orderController.vnpayIpn));
router.get('/payment/vnpay/return', asyncHandler(orderController.vnpayReturn));

// ── Admin routes ──────────────────────────────────────────────────────────────
router.get(
  '/admin',
  authenticate,
  authorize('admin'),
  asyncHandler(orderController.getAllOrders),
);

router.patch(
  '/:id/status',
  authenticate,
  authorize('admin'),
  validate(updateStatusSchema),
  asyncHandler(orderController.updateOrderStatus),
);

// ── User routes ───────────────────────────────────────────────────────────────
router.post(
  '/',
  authenticate,
  validate(createOrderSchema),
  asyncHandler(orderController.createOrder),
);

router.get('/',   authenticate, asyncHandler(orderController.getMyOrders));
router.get('/:id', authenticate, asyncHandler(orderController.getMyOrderById));

router.post('/:id/pay', authenticate, asyncHandler(orderController.payOrder));
router.post(
  '/:id/cancel',
  authenticate,
  validate(cancelOrderSchema),
  asyncHandler(orderController.cancelOrder),
);

module.exports = router;
