'use strict';

const { UserEvent } = require('../models');
const { Order }     = require('../models');
const mongoose      = require('mongoose');

/**
 * UserEventRepository — data-access seam for behavioural event tracking
 * and recommendation aggregation queries.
 *
 * Deep module: callers fire `logEvent(data)` or ask for recommendations.
 * All aggregation complexity (co-occurrence, trending, scoring) is hidden here.
 *
 * Deletion test: this file concentrates all recommendation query logic.
 * Deleting it scatters aggregation pipelines into the service. Load-bearing.
 */

// ── Event Logging ─────────────────────────────────────────────────────────────

/**
 * Fire-and-forget event log. Errors are swallowed — a failed event
 * must never break the user's action.
 *
 * @param {{ userId?, sessionId, productId, eventType, meta? }} data
 */
async function logEvent(data) {
  await UserEvent.log(data); // Delegates to the static on the model
}

// ── Recommendation Queries ────────────────────────────────────────────────────

/**
 * Get globally trending products by weighted event score in the last N hours.
 * Wraps UserEvent.getTrending() static.
 *
 * @param {number} [hoursAgo=24]
 * @param {number} [limit=10]
 * @returns {Promise<Array<{ productId: ObjectId, score: number }>>}
 */
async function getTrending(hoursAgo = 24, limit = 10) {
  return UserEvent.getTrending(hoursAgo, limit);
}

/**
 * Get a user's top interacted products by weighted score.
 * Wraps UserEvent.getUserTopProducts() static.
 *
 * @param {string} userId
 * @param {number} [limit=20]
 * @returns {Promise<Array<{ productId: ObjectId, score: number }>>}
 */
async function getUserTopProducts(userId, limit = 20) {
  return UserEvent.getUserTopProducts(userId, limit);
}

/**
 * "Frequently Bought Together" — order co-occurrence aggregation.
 *
 * Algorithm:
 *   1. Find all delivered orders that contain ANY of the given productIds
 *   2. Unwind the items array
 *   3. Exclude the input productIds themselves
 *   4. Group by productId and count frequency
 *   5. Sort by frequency descending
 *
 * Uses the { userId: 1, createdAt: -1 } and { status: 1 } indexes on Order.
 *
 * @param {string[]} productIds - Products currently in the user's cart
 * @param {number} [limit=6]
 * @returns {Promise<Array<{ productId: ObjectId, frequency: number }>>}
 */
async function getCoOccurrence(productIds, limit = 6) {
  const objectIds = productIds.map(id => new mongoose.Types.ObjectId(id));

  return Order.aggregate([
    // Step 1: Orders containing at least one of the cart products
    {
      $match: {
        status: { $in: ['delivered', 'confirmed', 'shipping', 'processing'] },
        'items.productId': { $in: objectIds },
      },
    },
    // Step 2: Unwind items
    { $unwind: '$items' },
    // Step 3: Exclude the input products
    {
      $match: {
        'items.productId': { $nin: objectIds },
      },
    },
    // Step 4: Group by productId and count
    {
      $group: {
        _id:       '$items.productId',
        frequency: { $sum: 1 },
      },
    },
    // Step 5: Sort and limit
    { $sort: { frequency: -1 } },
    { $limit: limit },
    // Step 6: Reshape output
    { $project: { productId: '$_id', frequency: 1, _id: 0 } },
  ]);
}

/**
 * Get products the user has purchased (for personalised recommendations).
 * Used to find content-based matches from purchase history.
 *
 * @param {string} userId
 * @param {number} [limit=10]
 * @returns {Promise<string[]>} Array of productId strings
 */
async function getUserPurchasedProductIds(userId, limit = 10) {
  const results = await Order.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        status: { $in: ['delivered', 'confirmed', 'shipping', 'processing'] },
      },
    },
    { $sort: { createdAt: -1 } },
    { $limit: 20 }, // Look at recent orders only
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
      },
    },
    { $limit: limit },
  ]);

  return results.map(r => r._id.toString());
}

module.exports = {
  logEvent,
  getTrending,
  getUserTopProducts,
  getCoOccurrence,
  getUserPurchasedProductIds,
};
