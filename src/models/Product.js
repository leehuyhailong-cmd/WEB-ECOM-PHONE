'use strict';

const mongoose = require('mongoose');
const slugify  = require('slugify');

// ── Sub-schemas ───────────────────────────────────────────────────────────────

const ImageSchema = new mongoose.Schema(
  {
    url:      { type: String, required: true },
    publicId: { type: String },           // Cloudinary public_id — needed for deletion
    isPrimary:{ type: Boolean, default: false },
  },
  { _id: false },
);

// Flexible specs object — different per category (RAM, storage, OS, battery, etc.)
// Stored as Mixed for maximum flexibility; validated at service layer with Zod
const SpecsSchema = new mongoose.Schema(
  {
    os:           String,
    ram:          String,   // e.g. '8GB'
    storage:      String,   // e.g. '256GB'
    display:      String,   // e.g. '6.7 inch OLED'
    battery:      String,   // e.g. '4500 mAh'
    camera:       String,   // e.g. '200MP + 10MP'
    processor:    String,
    connectivity: String,   // e.g. '5G, WiFi 6E'
    color:        String,
    weight:       String,   // e.g. '195g'
  },
  { _id: false, strict: false }, // strict: false allows extra spec fields
);

// ── Main schema ───────────────────────────────────────────────────────────────

const ProductSchema = new mongoose.Schema(
  {
    // ── Identity ─────────────────────────────────────────────────────────────
    name: {
      type:      String,
      required:  [true, 'Tên sản phẩm là bắt buộc'],
      trim:      true,
      minlength: [3, 'Tên sản phẩm phải có ít nhất 3 ký tự'],
      maxlength: [200, 'Tên sản phẩm không được quá 200 ký tự'],
    },
    slug: {
      type:      String,
      lowercase: true,
    },
    description: {
      type:    String,
      trim:    true,
      default: '',
    },

    // ── Taxonomy ──────────────────────────────────────────────────────────────
    brand: {
      type:     String,
      required: [true, 'Thương hiệu là bắt buộc'],
      trim:     true,
      // e.g. 'Apple', 'Samsung', 'Xiaomi', 'OPPO', 'Vivo', 'Realme'
    },
    category: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Category',
      required: [true, 'Danh mục là bắt buộc'],
    },
    tags: {
      type:    [String],
      default: [],
    },

    // ── Pricing — ALL VALUES IN VND AS INTEGERS ───────────────────────────────
    price: {
      type:     Number,
      required: [true, 'Giá bán là bắt buộc'],
      min:      [0, 'Giá không được âm'],
      validate: {
        validator: Number.isInteger,
        message:   'Giá phải là số nguyên (VND)',
      },
    },
    comparePrice: {
      // Original / crossed-out price for showing discount
      type:    Number,
      default: 0,
      min:     0,
      validate: {
        validator: v => v === 0 || Number.isInteger(v),
        message:   'Giá gốc phải là số nguyên (VND)',
      },
    },

    // ── Inventory ─────────────────────────────────────────────────────────────
    stock: {
      type:     Number,
      required: [true, 'Số lượng tồn kho là bắt buộc'],
      min:      [0, 'Tồn kho không được âm'],
      default:  0,
      validate: {
        validator: Number.isInteger,
        message:   'Tồn kho phải là số nguyên',
      },
    },
    soldCount: {
      type:    Number,
      default: 0,
      min:     0,
    },

    // ── Media ─────────────────────────────────────────────────────────────────
    images: {
      type:    [ImageSchema],
      default: [],
      validate: {
        validator: v => v.length <= 10,
        message:   'Không được quá 10 ảnh cho một sản phẩm',
      },
    },

    // ── Specs ─────────────────────────────────────────────────────────────────
    specs: {
      type:    SpecsSchema,
      default: {},
    },

    // ── Ratings (aggregated from Review collection) ───────────────────────────
    avgRating: {
      type:    Number,
      default: 0,
      min:     0,
      max:     5,
      set:     v => Math.round(v * 10) / 10, // Round to 1 decimal place
    },
    reviewCount: {
      type:    Number,
      default: 0,
      min:     0,
    },

    // ── Visibility ────────────────────────────────────────────────────────────
    isActive:   { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// ── Indexes (from strategy Section 3 — Performance Rules) ────────────────────
ProductSchema.index({ name: 'text', description: 'text' }, {
  weights:           { name: 10, description: 5 },
  name:              'product_text_search',
  default_language:  'none', // Disable stemming — better for Vietnamese + model names
});
ProductSchema.index({ category: 1, price: 1 });           // Category page + price filter
ProductSchema.index({ brand: 1, soldCount: -1 });          // Brand page sorted by popularity
ProductSchema.index({ price: 1 });                         // Price range filter
ProductSchema.index({ isActive: 1, isFeatured: -1 });      // Homepage featured query
ProductSchema.index({ slug: 1 }, { unique: true });            // Product detail page lookup
ProductSchema.index({ createdAt: -1 });                    // "Mới nhất" sort

// ── Computed virtual: discount percentage ─────────────────────────────────────
ProductSchema.virtual('discountPercent').get(function () {
  if (!this.comparePrice || this.comparePrice <= this.price) return 0;
  return Math.round(((this.comparePrice - this.price) / this.comparePrice) * 100);
});

// ── Pre-save: auto-generate slug from name ────────────────────────────────────
ProductSchema.pre('save', async function (next) {
  if (!this.isModified('name') && this.slug) return next();

  let baseSlug = slugify(this.name, {
    lower:       true,
    strict:      true,
    locale:      'vi',
    replacement: '-',
    remove:      /[*+~.()'"!:@]/g,
  });

  // Guarantee uniqueness: append numeric suffix if slug exists
  let slug     = baseSlug;
  let counter  = 1;
  while (await mongoose.model('Product').exists({ slug, _id: { $ne: this._id } })) {
    slug = `${baseSlug}-${counter++}`;
  }

  this.slug = slug;
  next();
});

module.exports = mongoose.model('Product', ProductSchema);
