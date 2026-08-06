'use strict';

const mongoose = require('mongoose');

/**
 * UserEvent — lightweight behavioural event log for the recommendation engine.
 *
 * Event types and weights (from strategy Section 2.2):
 *   purchase → weight 5  (strongest signal)
 *   cart     → weight 3
 *   view     → weight 1  (weakest signal)
 *
 * TTL: 30 days. Events older than 30 days are automatically deleted by MongoDB.
 * This keeps the collection small and ensures recommendations stay fresh.
 *
 * Design principle (improve-codebase-architecture):
 *   The RecommendationService aggregates this collection — callers just
 *   fire-and-forget `UserEvent.create(...)`. The scoring algorithm is hidden
 *   behind the recommendations module seam.
 */

const UserEventSchema = new mongoose.Schema(
  {
    // userId is null for guest/anonymous sessions
    userId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'User',
      default: null,
    },
    // sessionId links guest events to a client session (UUID from cookie)
    sessionId: {
      type:     String,
      required: [true, 'sessionId è bắt buộc để theo dõi phiên'],
    },

    productId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Product',
      required: [true, 'productId là bắt buộc'],
    },

    // ── Event type ────────────────────────────────────────────────────────────
    eventType: {
      type:     String,
      enum: {
        values:  ['view', 'cart', 'purchase', 'wishlist'],
        message: 'Loại sự kiện không hợp lệ',
      },
      required: [true, 'Loại sự kiện là bắt buộc'],
    },

    // Derived weight — set by pre-save hook based on eventType
    weight: {
      type:    Number,
      default: 1,
    },

    // Optional: context metadata (for analytics, not recommendation scoring)
    meta: {
      page:     String,   // e.g. 'product_detail', 'search', 'homepage'
      query:    String,   // Search query that led to this view
      position: Number,   // Position in listing (for CTR analysis)
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Only createdAt needed
    versionKey: false,
  },
);

// ── Indexes (from strategy Section 3 — Performance Rules) ─────────────────────
UserEventSchema.index({ userId: 1, productId: 1 });           // Recommendation engine join
UserEventSchema.index({ userId: 1, eventType: 1 });           // "What has this user bought?"
UserEventSchema.index({ productId: 1, eventType: 1 });        // "Who viewed/bought this product?"
UserEventSchema.index({ sessionId: 1 });                      // Guest session tracking
UserEventSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 30 },   // 30-day TTL (2,592,000 seconds)
);

// ── Event weight constants ─────────────────────────────────────────────────────
const EVENT_WEIGHTS = {
  purchase: 5,
  cart:     3,
  wishlist: 2,
  view:     1,
};

// ── Pre-save: set weight from eventType ───────────────────────────────────────
UserEventSchema.pre('save', function (next) {
  this.weight = EVENT_WEIGHTS[this.eventType] || 1;
  next();
});

// ── Static: fire-and-forget event logging ─────────────────────────────────────
/**
 * Log an event without blocking the calling request.
 * Errors are swallowed — a failed event log must never break the user's action.
 *
 * @param {{ userId?, sessionId, productId, eventType, meta? }} data
 */
UserEventSchema.statics.log = async function log(data) {
  try {
    await this.create(data);
  } catch (_) {
    // Silent fail — recommendation data loss is acceptable; user experience is not
  }
};

/**
 * Get a user's top N products by weighted score.
 * Used by the recommendation engine as "Gợi ý cho bạn" input.
 *
 * @param {string} userId
 * @param {number} [limit=20]
 * @returns {Promise<Array<{ productId: ObjectId, score: number }>>}
 */
UserEventSchema.statics.getUserTopProducts = async function getUserTopProducts(userId, limit = 20) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id:   '$productId',
        score: { $sum: '$weight' },
      },
    },
    { $sort: { score: -1 } },
    { $limit: limit },
    { $project: { productId: '$_id', score: 1, _id: 0 } },
  ]);
};

/**
 * Get the global trending products by view/purchase count in the last N hours.
 * Used by the "🔥 Đang hot" widget.
 *
 * @param {number} [hoursAgo=24]
 * @param {number} [limit=10]
 * @returns {Promise<Array<{ productId: ObjectId, score: number }>>}
 */
UserEventSchema.statics.getTrending = async function getTrending(hoursAgo = 24, limit = 10) {
  const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  return this.aggregate([
    { $match: { createdAt: { $gte: since }, eventType: { $in: ['view', 'purchase', 'cart'] } } },
    { $group: { _id: '$productId', score: { $sum: '$weight' } } },
    { $sort: { score: -1 } },
    { $limit: limit },
    { $project: { productId: '$_id', score: 1, _id: 0 } },
  ]);
};

module.exports = mongoose.model('UserEvent', UserEventSchema);
