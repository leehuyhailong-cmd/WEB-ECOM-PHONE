'use strict';

const { Router } = require('express');
const asyncHandler = require('../../utils/asyncHandler');
const validate     = require('../../middlewares/validate');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');

const reviewController = require('./review.controller');
const {
  createReviewSchema,
  updateReviewSchema,
  reviewQuerySchema,
  reviewIdParamSchema,
} = require('./review.validator');

const router = Router();

/**
 * Review routes.
 *
 * Routing rule: static paths BEFORE dynamic /:id paths.
 *   /product/:productId — static prefix "product"
 *   /my                 — static prefix "my"
 *   /:id                — dynamic (last)
 */

// ── Static routes (before /:id) ──────────────────────────────────────────────

// Public: get reviews for a product (with rating distribution)
router.get(
  '/product/:productId',
  validate(reviewQuerySchema),
  asyncHandler(reviewController.getByProduct),
);

// Authenticated: get current user's own reviews
router.get(
  '/my',
  authenticate,
  asyncHandler(reviewController.getMy),
);

// Authenticated: create a new review
router.post(
  '/',
  authenticate,
  validate(createReviewSchema),
  asyncHandler(reviewController.create),
);

// ── Dynamic routes (/:id — must be last) ─────────────────────────────────────

// Authenticated: toggle helpful vote
router.post(
  '/:id/helpful',
  authenticate,
  validate(reviewIdParamSchema),
  asyncHandler(reviewController.helpful),
);

// Admin: hide/unhide a review
router.patch(
  '/:id/hide',
  authenticate,
  authorize('admin'),
  validate(reviewIdParamSchema),
  asyncHandler(reviewController.hide),
);

// Authenticated: update own review
router.put(
  '/:id',
  authenticate,
  validate(updateReviewSchema),
  asyncHandler(reviewController.update),
);

// Authenticated: delete own review
router.delete(
  '/:id',
  authenticate,
  validate(reviewIdParamSchema),
  asyncHandler(reviewController.remove),
);

module.exports = router;
