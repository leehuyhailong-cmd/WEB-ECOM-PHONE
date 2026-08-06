'use strict';

const mongoose = require('mongoose');

// ── Sub-schemas ───────────────────────────────────────────────────────────────

/**
 * Snapshot of the product at time of purchase.
 * NEVER use a reference here — if the product is updated later,
 * the order history must still show the original price and name.
 */
const OrderItemSchema = new mongoose.Schema(
  {
    productId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name:       { type: String, required: true },    // Snapshot
    image:      { type: String, default: '' },        // Primary image URL snapshot
    price:      { type: Number, required: true },     // VND integer at time of purchase
    quantity:   { type: Number, required: true, min: 1 },
    subtotal:   { type: Number, required: true },     // price × quantity
  },
  { _id: false },
);

const ShippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone:    { type: String, required: true },
    street:   { type: String, required: true },
    ward:     { type: String, required: true },
    district: { type: String, required: true },
    province: { type: String, required: true },
  },
  { _id: false },
);

// ── Main schema ───────────────────────────────────────────────────────────────

const OrderSchema = new mongoose.Schema(
  {
    // ── Ownership ─────────────────────────────────────────────────────────────
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'Đơn hàng phải thuộc về một người dùng'],
    },

    // ── Items ─────────────────────────────────────────────────────────────────
    items: {
      type:     [OrderItemSchema],
      required: true,
      validate: {
        validator: v => v.length > 0,
        message:   'Đơn hàng phải có ít nhất một sản phẩm',
      },
    },

    // ── Shipping ──────────────────────────────────────────────────────────────
    shippingAddress: {
      type:     ShippingAddressSchema,
      required: [true, 'Địa chỉ giao hàng là bắt buộc'],
    },
    shippingFee: {
      type:    Number,
      default: 0,
      min:     0,
      validate: { validator: Number.isInteger, message: 'Phí ship phải là số nguyên (VND)' },
    },

    // ── Pricing (all VND integers) ────────────────────────────────────────────
    subtotal: {
      type:     Number,
      required: true,
      min:      0,
      validate: { validator: Number.isInteger, message: 'Tạm tính phải là số nguyên (VND)' },
    },
    discountAmount: {
      type:    Number,
      default: 0,
      min:     0,
    },
    totalPrice: {
      type:     Number,
      required: true,
      min:      0,
      validate: { validator: Number.isInteger, message: 'Tổng tiền phải là số nguyên (VND)' },
    },

    // ── Order status ──────────────────────────────────────────────────────────
    status: {
      type:    String,
      enum: {
        values:  ['pending', 'confirmed', 'processing', 'shipping', 'delivered', 'cancelled', 'refunded'],
        message: 'Trạng thái đơn hàng không hợp lệ',
      },
      default: 'pending',
    },
    cancelReason: { type: String, default: '' },

    // ── Payment ───────────────────────────────────────────────────────────────
    paymentMethod: {
      type: String,
      enum: {
        values:  ['cod', 'vnpay', 'momo', 'bank_transfer'],
        message: 'Phương thức thanh toán không hợp lệ',
      },
      default: 'cod',
    },
    paymentStatus: {
      type:    String,
      enum: {
        values:  ['pending', 'paid', 'failed', 'refunded'],
        message: 'Trạng thái thanh toán không hợp lệ',
      },
      default: 'pending',
    },

    // ── VNPay fields (Phase 4) ────────────────────────────────────────────────
    vnpayTransactionId: { type: String, default: null },  // vnp_TransactionNo
    vnpayBankCode:      { type: String, default: null },  // vnp_BankCode
    vnpayResponseCode:  { type: String, default: null },  // vnp_ResponseCode ('00' = success)
    paidAt:             { type: Date,   default: null },

    // ── Note ──────────────────────────────────────────────────────────────────
    note: {
      type:      String,
      trim:      true,
      maxlength: [500, 'Ghi chú không được quá 500 ký tự'],
      default:   '',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// ── Indexes (from strategy Section 3) ────────────────────────────────────────
OrderSchema.index({ userId: 1, createdAt: -1 });          // User order history (most important)
OrderSchema.index({ status: 1, createdAt: -1 });           // Admin order management by status
OrderSchema.index({ paymentStatus: 1 });                   // Payment reconciliation queries
OrderSchema.index({ vnpayTransactionId: 1 }, { sparse: true }); // VNPay IPN lookup
OrderSchema.index({ createdAt: -1 });                      // Admin: all orders newest first

// ── Pre-save: calculate subtotal, discountAmount, totalPrice ──────────────────
OrderSchema.pre('save', function (next) {
  if (this.isModified('items') || this.isModified('shippingFee') || this.isModified('discountAmount')) {
    this.subtotal   = this.items.reduce((sum, item) => sum + item.subtotal, 0);
    this.totalPrice = Math.max(0, this.subtotal + (this.shippingFee || 0) - (this.discountAmount || 0));
  }
  next();
});

// ── Static: valid status transitions (business rule) ─────────────────────────
OrderSchema.statics.VALID_TRANSITIONS = {
  pending:    ['confirmed', 'cancelled'],
  confirmed:  ['processing', 'cancelled'],
  processing: ['shipping', 'cancelled'],
  shipping:   ['delivered'],
  delivered:  ['refunded'],
  cancelled:  [],
  refunded:   [],
};

OrderSchema.statics.canTransition = function (from, to) {
  return (OrderSchema.statics.VALID_TRANSITIONS[from] || []).includes(to);
};

module.exports = mongoose.model('Order', OrderSchema);
