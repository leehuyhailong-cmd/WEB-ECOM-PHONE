'use strict';

const { Review } = require('../models');
const mongoose = require('mongoose');

/**
 * ReviewRepository — data-access seam for all Review queries.
 *
 * Rules (nodejs-backend-patterns + improve-codebase-architecture):
 *   1. ONLY place that writes Mongoose queries for reviews
 *   2. Always .lean() on read-only queries
 *   3. Always .select() — fetch only needed fields
 *   4. Services never import Review model directly
 *
 * Deletion test: deleting this file concentrates all Review query
 * complexity into the service. That's bad. This file IS load-bearing.
 */

// ── Create ────────────────────────────────────────────────────────────────────

/**
 * Create a new review.
 * @param {object} data - Validated review data
 * @returns {Promise<object>}
 */
async function create(data) {
  const review = await Review.create(data);
  return review.toObject();
}

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * Find a review by ID.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function findById(id) {
  return Review.findById(id).lean();
}

/**
 * Find a user's existing review for a specific product.
 * Uses the { userId: 1, productId: 1 } unique index.
 *
 * @param {string} userId
 * @param {string} productId
 * @returns {Promise<object|null>}
 */
async function findByUserAndProduct(userId, productId) {
  return Review.findOne({ userId, productId }).lean();
}

/**
 * Paginated reviews for a product.
 * Uses the { productId: 1, createdAt: -1 } index.
 *
 * @param {string} productId
 * @param {{ page: number, limit: number, sort?: string, rating?: number }} params
 * @returns {Promise<{ reviews: object[], total: number }>}
 */
async function findByProduct(productId, params = {}) {
  const { page = 1, limit = 10, sort = 'newest', rating } = params;
  const skip = (page - 1) * limit;

  const filter = {
    productId: new mongoose.Types.ObjectId(productId),
    isHidden: false,
  };
  if (rating) filter.rating = rating;

  const sortMap = {
    newest:  { createdAt: -1 },
    oldest:  { createdAt: 1 },
    highest: { rating: -1, createdAt: -1 },
    lowest:  { rating: 1, createdAt: -1 },
    helpful: { helpfulCount: -1, createdAt: -1 },
  };
  const sortObj = sortMap[sort] || sortMap.newest;

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .select('userId rating title comment images isVerifiedPurchase helpfulCount createdAt')
      .populate('userId', 'name avatar')
      .lean(),
    Review.countDocuments(filter),
  ]);

  return { reviews, total };
}

/**
 * Rating distribution for a product (aggregation pipeline).
 * Returns: [{ _id: 5, count: 42 }, { _id: 4, count: 18 }, ...]
 *
 * @param {string} productId
 * @returns {Promise<Array<{ _id: number, count: number }>>}
 */
async function getRatingDistribution(productId) {
  return Review.aggregate([
    { $match: { productId: new mongoose.Types.ObjectId(productId), isHidden: false } },
    { $group: { _id: '$rating', count: { $sum: 1 } } },
    { $sort: { _id: -1 } },
  ]);
}

/**
 * Get all reviews by a specific user (paginated).
 * Uses the { userId: 1, createdAt: -1 } index.
 *
 * @param {string} userId
 * @param {{ page: number, limit: number }} params
 * @returns {Promise<{ reviews: object[], total: number }>}
 */
async function findByUser(userId, params = {}) {
  const { page = 1, limit = 10 } = params;
  const skip = (page - 1) * limit;
  const filter = { userId: new mongoose.Types.ObjectId(userId) };

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('productId rating title comment images isVerifiedPurchase helpfulCount createdAt')
      .populate('productId', 'name slug images price')
      .lean(),
    Review.countDocuments(filter),
  ]);

  return { reviews, total };
}

// ── Update ────────────────────────────────────────────────────────────────────

/**
 * Update a review's content fields.
 * Uses save() to trigger the post('save') hook that recomputes avgRating.
 *
 * @param {string} id
 * @param {object} updates - { rating?, title?, comment?, images? }
 * @returns {Promise<object|null>}
 */
async function update(id, updates) {
  const review = await Review.findById(id);
  if (!review) return null;

  Object.assign(review, updates);
  await review.save(); // Triggers post('save') → _recomputeProductRating
  return review.toObject();
}

/**
 * Increment or decrement the helpfulCount.
 * Atomic operation — no race conditions.
 *
 * @param {string} id
 * @param {number} delta - +1 or -1
 * @returns {Promise<object|null>}
 */
async function updateHelpfulCount(id, delta) {
  return Review.findByIdAndUpdate(
    id,
    { $inc: { helpfulCount: Math.max(-1, Math.min(1, delta)) } },
    { new: true, lean: true },
  );
}

/**
 * Admin: toggle isHidden flag on a review.
 * Uses save() to trigger recomputation (hidden reviews excluded from avg).
 *
 * @param {string} id
 * @param {boolean} isHidden
 * @returns {Promise<object|null>}
 */
async function setHidden(id, isHidden) {
  const review = await Review.findById(id);
  if (!review) return null;

  review.isHidden = isHidden;
  await review.save(); // Triggers post('save') → recompute excludes hidden
  return review.toObject();
}

// ── Delete ────────────────────────────────────────────────────────────────────

/**
 * Delete a review by ID.
 * Uses findOneAndDelete to trigger the post('findOneAndDelete') hook
 * that recomputes avgRating on the product.
 *
 * @param {string} id
 * @returns {Promise<object|null>} The deleted review, or null
 */
async function deleteById(id) {
  return Review.findOneAndDelete({ _id: id });
}

module.exports = {
  create,
  findById,
  findByUserAndProduct,
  findByProduct,
  getRatingDistribution,
  findByUser,
  update,
  updateHelpfulCount,
  setHidden,
  deleteById,
};
