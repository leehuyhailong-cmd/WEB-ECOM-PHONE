'use strict';

const mongoose = require('mongoose');

// ── Main schema ───────────────────────────────────────────────────────────────

const ReviewSchema = new mongoose.Schema(
  {
    productId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Product',
      required: [true, 'Review phải thuộc về một sản phẩm'],
    },
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'Review phải thuộc về một người dùng'],
    },
    orderId: {
      // Link to the order that allows this review (verified purchase)
      type: mongoose.Schema.Types.ObjectId,
      ref:  'Order',
    },

    // ── Content ───────────────────────────────────────────────────────────────
    rating: {
      type:     Number,
      required: [true, 'Điểm đánh giá là bắt buộc'],
      min:      [1, 'Điểm tối thiểu là 1'],
      max:      [5, 'Điểm tối đa là 5'],
      validate: { validator: Number.isInteger, message: 'Điểm phải là số nguyên từ 1 đến 5' },
    },
    title: {
      type:      String,
      trim:      true,
      maxlength: [100, 'Tiêu đề không được quá 100 ký tự'],
      default:   '',
    },
    comment: {
      type:      String,
      trim:      true,
      maxlength: [1000, 'Nội dung không được quá 1000 ký tự'],
      default:   '',
    },
    images: {
      type:    [String],   // Array of image URLs
      default: [],
      validate: { validator: v => v.length <= 5, message: 'Tối đa 5 ảnh cho mỗi đánh giá' },
    },

    // ── Moderation ────────────────────────────────────────────────────────────
    isVerifiedPurchase: { type: Boolean, default: false },
    isHidden:           { type: Boolean, default: false },  // Admin can hide abusive reviews
    helpfulCount:       { type: Number,  default: 0, min: 0 },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// ── Indexes ───────────────────────────────────────────────────────────────────
ReviewSchema.index({ productId: 1, createdAt: -1 });  // Product reviews list
ReviewSchema.index({ userId: 1, productId: 1 }, { unique: true }); // One review per user per product
ReviewSchema.index({ productId: 1, rating: 1 });      // Rating distribution query
ReviewSchema.index({ userId: 1, createdAt: -1 });     // User's own reviews list

// ── Post-save: recompute avgRating on Product ─────────────────────────────────
/**
 * After any review is saved or removed, recalculate the product's
 * avgRating and reviewCount atomically using an aggregation pipeline.
 *
 * This is the canonical pattern for derived aggregate fields in MongoDB:
 * keep Reviews in a separate collection (no embedding) and push the
 * aggregate back to Product after write.
 */
async function _recomputeProductRating(productId) {
  const Product = mongoose.model('Product');
  const Review  = mongoose.model('Review');

  const [stats] = await Review.aggregate([
    { $match: { productId, isHidden: false } },
    {
      $group: {
        _id:         null,
        avgRating:   { $avg: '$rating' },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  await Product.findByIdAndUpdate(productId, {
    avgRating:   stats ? Math.round(stats.avgRating * 10) / 10 : 0,
    reviewCount: stats ? stats.reviewCount : 0,
  });
}

ReviewSchema.post('save', async function () {
  await _recomputeProductRating(this.productId);
});

ReviewSchema.post('findOneAndDelete', async function (doc) {
  if (doc) await _recomputeProductRating(doc.productId);
});

ReviewSchema.post('deleteMany', async function () {
  // Bulk deletes don't provide productId — caller should trigger recompute manually
});

module.exports = mongoose.model('Review', ReviewSchema);
