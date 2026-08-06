'use strict';

const { Router } = require('express');
const asyncHandler = require('../../utils/asyncHandler');
const validate     = require('../../middlewares/validate');
const { authenticate, optionalAuthenticate } = require('../../middlewares/auth.middleware');

const recommendationController = require('./recommendation.controller');
const { trackEventSchema }     = require('../reviews/review.validator');

const router = Router();

/**
 * Recommendation routes.
 *
 * Routing rule: static paths BEFORE dynamic /:productId paths.
 *   /homepage  — static
 *   /cart      — static
 *   /events    — static
 *   /product/:productId — dynamic (last)
 *
 * Auth: most routes are public or optionally authenticated.
 */

// ── Static routes ────────────────────────────────────────────────────────────

// Homepage: trending + personalised (optional auth for personalisation)
router.get(
  '/homepage',
  optionalAuthenticate,
  asyncHandler(recommendationController.homepage),
);

// Cart suggestions: "bought together"
router.get(
  '/cart',
  asyncHandler(recommendationController.cartSuggestions),
);

// Event tracking: fire-and-forget (optional auth)
router.post(
  '/events',
  optionalAuthenticate,
  validate(trackEventSchema),
  asyncHandler(recommendationController.trackEvent),
);

// ── Dynamic routes (must be last) ────────────────────────────────────────────

// Related products for a product detail page
router.get(
  '/product/:productId',
  asyncHandler(recommendationController.related),
);

module.exports = router;
