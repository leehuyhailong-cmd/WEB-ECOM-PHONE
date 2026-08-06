'use strict';

const { z } = require('zod');

/**
 * Product Validators — Zod schemas for product creation and update.
 *
 * Key rules from the strategy:
 *   - All prices MUST be integers (VND)
 *   - Category is an enum
 *   - At least 1 image required on creation
 */

const VALID_CATEGORIES = ['smartphone', 'tablet', 'accessory', 'smartwatch'];

const VALID_BRANDS = [
  'Apple', 'Samsung', 'Xiaomi', 'OPPO', 'Vivo', 'Realme', 'Huawei',
  'Nokia', 'Motorola', 'Sony', 'OnePlus', 'Google', 'Asus', 'Lenovo', 'Other',
];

// ── Reusable sub-schemas ──────────────────────────────────────────────────────

const specsSchema = z.object({
  os:           z.string().optional(),
  ram:          z.string().optional(),
  storage:      z.string().optional(),
  display:      z.string().optional(),
  battery:      z.string().optional(),
  camera:       z.string().optional(),
  processor:    z.string().optional(),
  connectivity: z.string().optional(),
  color:        z.string().optional(),
  weight:       z.string().optional(),
}).passthrough(); // Allow extra spec fields for flexibility

// ── Create Product ────────────────────────────────────────────────────────────
const createProductSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Tên sản phẩm là bắt buộc' })
      .trim()
      .min(3,   'Tên phải có ít nhất 3 ký tự')
      .max(200, 'Tên không được quá 200 ký tự'),

    description: z.string().trim().max(5000).optional().default(''),

    brand: z
      .string({ required_error: 'Thương hiệu là bắt buộc' })
      .trim()
      .min(1, 'Thương hiệu là bắt buộc'),

    category: z.enum(VALID_CATEGORIES, {
      errorMap: () => ({ message: `Danh mục phải là một trong: ${VALID_CATEGORIES.join(', ')}` }),
    }),

    // Prices: coerce string → number (multipart forms send strings), then validate integer
    price: z
      .preprocess(
        v => (v !== undefined && v !== '' ? Number(v) : undefined),
        z.number({ required_error: 'Giá bán là bắt buộc' })
          .int('Giá phải là số nguyên (VND)')
          .min(1_000, 'Giá tối thiểu là 1,000 VND')
          .max(200_000_000, 'Giá tối đa là 200,000,000 VND'),
      ),

    comparePrice: z
      .preprocess(
        v => (v !== undefined && v !== '' ? Number(v) : 0),
        z.number().int('Giá gốc phải là số nguyên').min(0).optional().default(0),
      ),

    stock: z
      .preprocess(
        v => (v !== undefined && v !== '' ? Number(v) : 0),
        z.number({ required_error: 'Số lượng tồn kho là bắt buộc' })
          .int('Tồn kho phải là số nguyên')
          .min(0, 'Tồn kho không được âm'),
      ),

    tags: z
      .preprocess(
        v => {
          if (typeof v === 'string') {
            try { return JSON.parse(v); } catch { return v.split(',').map(t => t.trim()); }
          }
          return v;
        },
        z.array(z.string().trim()).max(20, 'Tối đa 20 tags').optional().default([]),
      ),

    specs: z
      .preprocess(
        v => (typeof v === 'string' ? JSON.parse(v) : v),
        specsSchema.optional().default({}),
      ),

    isActive:   z.preprocess(
      v => v === undefined ? undefined : (v === 'true' || v === true),
      z.boolean().default(true),
    ),
    isFeatured: z.preprocess(
      v => v === undefined ? undefined : (v === 'true' || v === true),
      z.boolean().default(false),
    ),
  }).refine(
    d => !d.comparePrice || d.comparePrice === 0 || d.comparePrice >= d.price,
    { message: 'Giá gốc phải lớn hơn hoặc bằng giá bán', path: ['comparePrice'] },
  ),
});

// ── Update Product (all fields optional) ─────────────────────────────────────
const updateProductSchema = z.object({
  body: z.object({
    name:         z.string().trim().min(3).max(200).optional(),
    description:  z.string().trim().max(5000).optional(),
    brand:        z.string().trim().min(1).optional(),
    category:     z.enum(VALID_CATEGORIES).optional(),
    price:        z.preprocess(v => v !== undefined ? Number(v) : undefined,
                    z.number().int().min(1_000).max(200_000_000).optional()),
    comparePrice: z.preprocess(v => v !== undefined ? Number(v) : undefined,
                    z.number().int().min(0).optional()),
    stock:        z.preprocess(v => v !== undefined ? Number(v) : undefined,
                    z.number().int().min(0).optional()),
    tags:         z.preprocess(
                    v => { if (typeof v === 'string') { try { return JSON.parse(v); } catch { return v.split(',').map(t => t.trim()); } } return v; },
                    z.array(z.string().trim()).max(20).optional(),
                  ),
    specs:        z.preprocess(v => (typeof v === 'string' ? JSON.parse(v) : v), specsSchema.optional()),
    isActive:     z.preprocess(
                    v => v === undefined ? undefined : (v === 'true' || v === true || v === false || v === 'false' ? (v === 'true' || v === true) : undefined),
                    z.boolean().optional()),
    isFeatured:   z.preprocess(
                    v => v === undefined ? undefined : (v === 'true' || v === true || v === false || v === 'false' ? (v === 'true' || v === true) : undefined),
                    z.boolean().optional()),
    // removeImageIds: client sends array of publicIds to delete
    removeImageIds: z.preprocess(
                    v => { if (typeof v === 'string') { try { return JSON.parse(v); } catch { return [v]; } } return v; },
                    z.array(z.string()).optional().default([]),
                  ),
  }),

  params: z.object({
    id: z.string().min(1, 'Product ID là bắt buộc'),
  }),
});

// ── List / Search query params ────────────────────────────────────────────────
const listProductsSchema = z.object({
  query: z.object({
    page:     z.preprocess(v => Number(v) || 1,    z.number().int().min(1).default(1)),
    limit:    z.preprocess(v => Number(v) || 12,   z.number().int().min(1).max(100).default(12)),
    category: z.enum(VALID_CATEGORIES).optional(),
    brand:    z.string().trim().optional(),
    minPrice: z.preprocess(v => v ? Number(v) : undefined, z.number().int().min(0).optional()),
    maxPrice: z.preprocess(v => v ? Number(v) : undefined, z.number().int().min(0).optional()),
    inStock:  z.preprocess(v => v === 'true', z.boolean().optional()),
    sort:     z.enum(['newest', 'oldest', 'price_asc', 'price_desc', 'popular', 'rating'])
               .default('newest').optional(),
    q:        z.string().trim().min(1).max(200).optional(), // Full-text search query
    featured: z.preprocess(v => v === 'true', z.boolean().optional()),
  }),
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  listProductsSchema,
  VALID_CATEGORIES,
  VALID_BRANDS,
};
