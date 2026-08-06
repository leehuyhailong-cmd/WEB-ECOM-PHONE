'use strict';

const reviewService = require('./review.service');
const { ApiResponse, parsePagination } = require('../../utils/apiResponse');

/**
 * ReviewController — HTTP only. Reads req, calls service, returns ApiResponse.
 * Zero Mongoose. Zero business logic.
 */

/**
 * POST /api/reviews
 * Create a new review (authenticated user).
 */
async function create(req, res) {
  const review = await reviewService.createReview(req.user.id, req.body);
  return ApiResponse.created(res, review, 'Đánh giá đã được tạo');
}

/**
 * GET /api/reviews/product/:productId
 * Get paginated reviews for a product with rating distribution.
 */
async function getByProduct(req, res) {
  const { productId } = req.params;
  const { page, limit } = parsePagination(req.query);
  const { sort, rating } = req.query;

  const result = await reviewService.getProductReviews(productId, {
    page, limit, sort, rating,
  });

  return res.status(200).json({
    status: 'success',
    message: 'Thành công',
    data: {
      reviews:      result.reviews,
      distribution: result.distribution,
      avgRating:    result.avgRating,
      reviewCount:  result.reviewCount,
    },
    pagination: {
      page,
      limit,
      total:      result.total,
      totalPages: Math.ceil(result.total / limit),
      hasNext:    page < Math.ceil(result.total / limit),
      hasPrev:    page > 1,
    },
  });
}

/**
 * GET /api/reviews/my
 * Get current user's own reviews (paginated).
 */
async function getMy(req, res) {
  const { page, limit } = parsePagination(req.query);
  const result = await reviewService.getMyReviews(req.user.id, { page, limit });

  return ApiResponse.paginated(res, result.reviews, {
    page, limit, total: result.total,
  });
}

/**
 * PUT /api/reviews/:id
 * Update own review.
 */
async function update(req, res) {
  const review = await reviewService.updateReview(req.params.id, req.user.id, req.body);
  return ApiResponse.success(res, review, 'Đánh giá đã được cập nhật');
}

/**
 * DELETE /api/reviews/:id
 * Delete own review.
 */
async function remove(req, res) {
  await reviewService.deleteReview(req.params.id, req.user.id);
  return ApiResponse.noContent(res);
}

/**
 * POST /api/reviews/:id/helpful
 * Toggle helpful vote on a review.
 */
async function helpful(req, res) {
  const review = await reviewService.toggleHelpful(req.params.id, req.user.id);
  return ApiResponse.success(res, review, 'Đã đánh dấu hữu ích');
}

/**
 * PATCH /api/reviews/:id/hide
 * Admin: toggle hide/unhide a review.
 */
async function hide(req, res) {
  const isHidden = req.body.isHidden !== false; // Default to hide
  const review = await reviewService.setReviewVisibility(req.params.id, isHidden);
  return ApiResponse.success(res, review,
    isHidden ? 'Đánh giá đã bị ẩn' : 'Đánh giá đã được hiện lại',
  );
}

module.exports = {
  create,
  getByProduct,
  getMy,
  update,
  remove,
  helpful,
  hide,
};
