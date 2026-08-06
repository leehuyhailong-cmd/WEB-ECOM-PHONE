'use strict';

const reviewRepository  = require('../../repositories/review.repository');
const productRepository = require('../../repositories/product.repository');
const orderRepository   = require('../../repositories/order.repository');
const { NotFoundError, ConflictError, ForbiddenError } = require('../../utils/errors');
const { logger } = require('../../utils/logger');

/**
 * ReviewService — all review business logic lives here.
 *
 * Deep module:
 *   Interface: createReview(userId, data), getProductReviews(productId, params)
 *   Implementation: verified purchase check, dedup guard, ownership validation,
 *                   rating distribution aggregation, helpful vote logic
 *
 * Controllers never touch Mongoose. This service never touches req/res.
 */

// ── Create ────────────────────────────────────────────────────────────────────

/**
 * Create a new review.
 * Business rules:
 *   1. Product must exist and be active
 *   2. One review per user per product (unique index as safety net)
 *   3. Check if user has a delivered order containing this product → isVerifiedPurchase
 *
 * @param {string} userId
 * @param {{ productId, rating, title?, comment?, images? }} data
 * @returns {Promise<object>} Created review
 */
async function createReview(userId, data) {
  const { productId, rating, title, comment, images } = data;

  // 1. Product must exist
  const product = await productRepository.findById(productId);
  if (!product || !product.isActive) {
    throw new NotFoundError('Sản phẩm không tồn tại');
  }

  // 2. Dedup check — better error message than unique index violation
  const existing = await reviewRepository.findByUserAndProduct(userId, productId);
  if (existing) {
    throw new ConflictError('Bạn đã đánh giá sản phẩm này rồi');
  }

  // 3. Verified purchase check
  const isVerifiedPurchase = await _hasDeliveredOrder(userId, productId);

  const review = await reviewRepository.create({
    userId,
    productId,
    rating,
    title:   title || '',
    comment: comment || '',
    images:  images || [],
    isVerifiedPurchase,
  });

  logger.info({ reviewId: review._id, productId, userId }, 'Review created');
  return review;
}

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * Get paginated reviews for a product + rating distribution stats.
 *
 * @param {string} productId
 * @param {{ page, limit, sort, rating? }} params
 * @returns {Promise<{ reviews, total, distribution }>}
 */
async function getProductReviews(productId, params) {
  // Verify product exists
  const product = await productRepository.findById(productId);
  if (!product) {
    throw new NotFoundError('Sản phẩm không tồn tại');
  }

  const [reviewData, distribution] = await Promise.all([
    reviewRepository.findByProduct(productId, params),
    reviewRepository.getRatingDistribution(productId),
  ]);

  // Transform distribution into a map: { 5: 42, 4: 18, 3: 5, 2: 1, 1: 0 }
  const distMap = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  distribution.forEach(d => { distMap[d._id] = d.count; });

  return {
    reviews:      reviewData.reviews,
    total:        reviewData.total,
    distribution: distMap,
    avgRating:    product.avgRating || 0,
    reviewCount:  product.reviewCount || 0,
  };
}

/**
 * Get current user's own reviews (paginated).
 *
 * @param {string} userId
 * @param {{ page, limit }} params
 * @returns {Promise<{ reviews, total }>}
 */
async function getMyReviews(userId, params) {
  return reviewRepository.findByUser(userId, params);
}

// ── Update ────────────────────────────────────────────────────────────────────

/**
 * Update a review. Only the owner can update their review.
 *
 * @param {string} reviewId
 * @param {string} userId - Current user (ownership check)
 * @param {{ rating?, title?, comment?, images? }} updates
 * @returns {Promise<object>}
 */
async function updateReview(reviewId, userId, updates) {
  const review = await reviewRepository.findById(reviewId);
  if (!review) {
    throw new NotFoundError('Đánh giá không tồn tại');
  }
  if (review.userId.toString() !== userId) {
    throw new ForbiddenError('Bạn chỉ có thể chỉnh sửa đánh giá của mình');
  }

  const updated = await reviewRepository.update(reviewId, updates);
  logger.info({ reviewId, userId }, 'Review updated');
  return updated;
}

// ── Delete ────────────────────────────────────────────────────────────────────

/**
 * Delete a review. Only the owner can delete their review.
 *
 * @param {string} reviewId
 * @param {string} userId
 */
async function deleteReview(reviewId, userId) {
  const review = await reviewRepository.findById(reviewId);
  if (!review) {
    throw new NotFoundError('Đánh giá không tồn tại');
  }
  if (review.userId.toString() !== userId) {
    throw new ForbiddenError('Bạn chỉ có thể xóa đánh giá của mình');
  }

  await reviewRepository.deleteById(reviewId);
  logger.info({ reviewId, userId }, 'Review deleted');
}

// ── Helpful Vote ──────────────────────────────────────────────────────────────

/**
 * Toggle "helpful" vote on a review.
 * Simple increment/decrement — no tracking of who voted (YAGNI for graduation).
 *
 * @param {string} reviewId
 * @param {string} userId - Voter (can't vote on own review)
 * @returns {Promise<object>}
 */
async function toggleHelpful(reviewId, userId) {
  const review = await reviewRepository.findById(reviewId);
  if (!review) {
    throw new NotFoundError('Đánh giá không tồn tại');
  }
  if (review.userId.toString() === userId) {
    throw new ForbiddenError('Bạn không thể đánh giá hữu ích cho chính mình');
  }

  // Simple +1 for now. Tracking individual votes would need a separate collection (YAGNI).
  const updated = await reviewRepository.updateHelpfulCount(reviewId, 1);
  return updated;
}

// ── Admin: Hide/Unhide ────────────────────────────────────────────────────────

/**
 * Admin toggles isHidden on a review.
 * Hidden reviews are excluded from avgRating computation (handled by post-save hook).
 *
 * @param {string} reviewId
 * @param {boolean} isHidden
 * @returns {Promise<object>}
 */
async function setReviewVisibility(reviewId, isHidden) {
  const updated = await reviewRepository.setHidden(reviewId, isHidden);
  if (!updated) {
    throw new NotFoundError('Đánh giá không tồn tại');
  }

  logger.info({ reviewId, isHidden }, 'Review visibility changed by admin');
  return updated;
}

// ── Private Helpers ───────────────────────────────────────────────────────────

/**
 * Check if a user has a delivered/confirmed/shipping order containing productId.
 * @param {string} userId
 * @param {string} productId
 * @returns {Promise<boolean>}
 */
async function _hasDeliveredOrder(userId, productId) {
  const orders = await orderRepository.findByUser(userId, {
    page: 1, limit: 100,
  });

  const validStatuses = ['delivered', 'confirmed', 'shipping', 'processing'];

  return orders.orders.some(order =>
    validStatuses.includes(order.status) &&
    order.items.some(item => item.productId.toString() === productId),
  );
}

module.exports = {
  createReview,
  getProductReviews,
  getMyReviews,
  updateReview,
  deleteReview,
  toggleHelpful,
  setReviewVisibility,
};
