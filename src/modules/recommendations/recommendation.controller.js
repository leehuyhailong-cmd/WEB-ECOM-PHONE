'use strict';

const recommendationService = require('./recommendation.service');
const { ApiResponse }       = require('../../utils/apiResponse');

/**
 * RecommendationController — HTTP only. Reads req, calls service, returns ApiResponse.
 * Zero Mongoose. Zero business logic.
 */

/**
 * GET /api/recommendations/homepage
 * Returns trending + personalised (if logged in) + best sellers.
 */
async function homepage(req, res) {
  // userId is optional — guests get trending + best sellers only
  const userId = req.user ? req.user.id : null;
  const data   = await recommendationService.getHomepage(userId);

  return ApiResponse.success(res, data, 'Thành công');
}

/**
 * GET /api/recommendations/product/:productId
 * Content-based related products for a product detail page.
 */
async function related(req, res) {
  const products = await recommendationService.getRelated(req.params.productId);
  return ApiResponse.success(res, products, 'Thành công');
}

/**
 * GET /api/recommendations/cart
 * "Bought together" suggestions based on user's cart items.
 */
async function cartSuggestions(req, res) {
  // Expect cart product IDs as comma-separated query param
  const { productIds } = req.query;
  const objectIdRegex = /^[a-fA-F0-9]{24}$/;
  const ids = productIds
    ? productIds.split(',').map(id => id.trim()).filter(id => objectIdRegex.test(id))
    : [];

  const products = await recommendationService.getCartSuggestions(ids);
  return ApiResponse.success(res, products, 'Thành công');
}

/**
 * POST /api/recommendations/events
 * Fire-and-forget event tracking for the recommendation engine.
 */
async function trackEvent(req, res) {
  const userId = req.user ? req.user.id : null;
  await recommendationService.trackEvent({
    ...req.body,
    userId,
  });

  return ApiResponse.success(res, null, 'Sự kiện đã được ghi nhận');
}

module.exports = {
  homepage,
  related,
  cartSuggestions,
  trackEvent,
};
