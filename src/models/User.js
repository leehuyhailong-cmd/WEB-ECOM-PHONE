'use strict';

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// ── Sub-schemas ───────────────────────────────────────────────────────────────

const AddressSchema = new mongoose.Schema(
  {
    label:      { type: String, trim: true, default: 'Nhà' }, // e.g. 'Nhà', 'Công ty'
    fullName:   { type: String, required: true, trim: true },
    phone:      { type: String, required: true, trim: true },
    street:     { type: String, required: true, trim: true },
    ward:       { type: String, required: true, trim: true },
    district:   { type: String, required: true, trim: true },
    province:   { type: String, required: true, trim: true },
    isDefault:  { type: Boolean, default: false },
  },
  { _id: true },
);

// ── Main schema ───────────────────────────────────────────────────────────────

const UserSchema = new mongoose.Schema(
  {
    // ── Identity ─────────────────────────────────────────────────────────────
    name: {
      type:     String,
      required: [true, 'Họ tên là bắt buộc'],
      trim:     true,
      minlength: [2, 'Họ tên phải có ít nhất 2 ký tự'],
      maxlength: [100, 'Họ tên không được quá 100 ký tự'],
    },
    email: {
      type:      String,
      required:  [true, 'Email là bắt buộc'],
      lowercase: true,
      trim:      true,
      match:     [/^\S+@\S+\.\S+$/, 'Email không hợp lệ'],
    },

    // ── Authentication ────────────────────────────────────────────────────────
    // passwordHash is absent for pure OAuth users (googleId-only accounts)
    passwordHash: {
      type:   String,
      select: false, // Never returned by default — must be explicitly selected
    },
    refreshToken: {
      type:   String,
      select: false, // HttpOnly cookie stores the raw token; DB stores the hash
    },

    // ── Google OAuth2 (Phase 2) ───────────────────────────────────────────────
    googleId: {
      type: String,
      // Unique sparse index defined below via schema.index()
    },
    googleAvatar: { type: String },

    // ── Profile ───────────────────────────────────────────────────────────────
    avatar: {
      type:    String,
      default: null,
    },
    phone: {
      type:  String,
      trim:  true,
      match: [/^[0-9]{9,11}$/, 'Số điện thoại không hợp lệ'],
    },
    addresses: {
      type:    [AddressSchema],
      default: [],
      validate: {
        validator: v => v.length <= 10,
        message:   'Không được lưu quá 10 địa chỉ',
      },
    },

    // ── Access control ────────────────────────────────────────────────────────
    role: {
      type:    String,
      enum:    { values: ['user', 'admin'], message: 'Role không hợp lệ' },
      default: 'user',
    },
    isActive: { type: Boolean, default: true },

    // ── Password reset ────────────────────────────────────────────────────────
    passwordResetToken:   { type: String, select: false },
    passwordResetExpires: { type: Date,   select: false },
  },
  {
    timestamps: true,    // createdAt, updatedAt
    versionKey: false,
  },
);

// ── Indexes ───────────────────────────────────────────────────────────────────
UserSchema.index({ email: 1 }, { unique: true });           // Login lookup
UserSchema.index({ googleId: 1 }, { unique: true, sparse: true }); // OAuth lookup
UserSchema.index({ role: 1 });                         // Admin queries
UserSchema.index({ createdAt: -1 });                   // Admin user list

// ── Instance methods ──────────────────────────────────────────────────────────

/**
 * Hash and store password. Call before save, not on every save.
 * @param {string} plainPassword
 */
UserSchema.methods.setPassword = async function setPassword(plainPassword) {
  this.passwordHash = await bcrypt.hash(plainPassword, 12);
};

/**
 * Compare a plain-text candidate against the stored hash.
 * Uses .select('+passwordHash') to fetch the hash before calling this.
 *
 * @param {string} candidatePassword
 * @returns {Promise<boolean>}
 */
UserSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

/**
 * Returns a safe user object — no sensitive fields.
 */
UserSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    _id:       this._id,
    name:      this.name,
    email:     this.email,
    avatar:    this.avatar,
    phone:     this.phone,
    role:      this.role,
    addresses: this.addresses,
    createdAt: this.createdAt,
  };
};

// ── Pre-save hook ─────────────────────────────────────────────────────────────
// Ensure only one address is marked isDefault
UserSchema.pre('save', function (next) {
  if (this.isModified('addresses')) {
    const defaults = this.addresses.filter(a => a.isDefault);
    if (defaults.length > 1) {
      // Keep only the last-set default
      this.addresses.forEach((a, i, arr) => {
        a.isDefault = i === arr.length - 1 && a.isDefault;
      });
    }
  }
  next();
});

module.exports = mongoose.model('User', UserSchema);
