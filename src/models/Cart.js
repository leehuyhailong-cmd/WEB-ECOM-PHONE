'use strict';

const mongoose = require('mongoose');

// ── Sub-schema ────────────────────────────────────────────────────────────────

const CartItemSchema = new mongoose.Schema(
  {
    productId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Product',
      required: true,
    },
    quantity: {
      type:    Number,
      required: true,
      min:     [1, 'Số lượng phải ít nhất là 1'],
      default: 1,
      validate: { validator: Number.isInteger, message: 'Số lượng phải là số nguyên' },
    },
    // Price snapshot captured when item is added (for detecting price changes)
    priceSnapshot: {
      type:    Number,
      default: 0,
    },
    addedAt: {
      type:    Date,
      default: Date.now,
    },
  },
  { _id: true },
);

// ── Main schema ───────────────────────────────────────────────────────────────

const CartSchema = new mongoose.Schema(
  {
    // One cart per user — enforced by unique index below.
    // Guest carts live in localStorage (client-side); merged on login.
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },

    items: {
      type:    [CartItemSchema],
      default: [],
      validate: {
        validator: v => v.length <= 50,
        message:   'Giỏ hàng không được quá 50 sản phẩm',
      },
    },
  },
  {
    timestamps: true,  // updatedAt is the cart's "last touched" timestamp
    versionKey: false,
  },
);

// ── Indexes ───────────────────────────────────────────────────────────────────
CartSchema.index({ userId: 1 }, { unique: true }); // One cart per user

// ── Virtual: total item count ─────────────────────────────────────────────────
CartSchema.virtual('totalItems').get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// ── Virtual: estimated total (using snapshots) ────────────────────────────────
CartSchema.virtual('estimatedTotal').get(function () {
  return this.items.reduce((sum, item) => sum + item.priceSnapshot * item.quantity, 0);
});

// ── Instance: upsert item (add or update quantity) ────────────────────────────
CartSchema.methods.upsertItem = function upsertItem(productId, quantity, price) {
  const existing = this.items.find(i => i.productId.equals(productId));
  if (existing) {
    existing.quantity += quantity;
    if (existing.quantity < 1) existing.quantity = 1;
  } else {
    this.items.push({ productId, quantity, priceSnapshot: price });
  }
};

// ── Instance: remove item ─────────────────────────────────────────────────────
CartSchema.methods.removeItem = function removeItem(productId) {
  this.items = this.items.filter(i => !i.productId.equals(productId));
};

// ── Instance: clear cart ──────────────────────────────────────────────────────
CartSchema.methods.clear = function clear() {
  this.items = [];
};

module.exports = mongoose.model('Cart', CartSchema);
