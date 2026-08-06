'use strict';

const { z } = require('zod');

/**
 * Review Zod validation schemas.
 *
 * Convention: every schema validates { body?, query?, params? }
 * and is consumed by the validate() middleware factory.
 */

// ── Reusable primitives ───────────────────────────────────────────────────────

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'ID không hợp lệ');

// ── Create Review ─────────────────────────────────────────────────────────────

const createReviewSchema = z.object({
  body: z.object({
    productId: objectId,
    rating: z.number()
      .int('Điểm đánh giá phải là số nguyên')
      .min(1, 'Điểm tối thiểu là 1')
      .max(5, 'Điểm tối đa là 5'),
    title: z.string()
      .trim()
      .max(100, 'Tiêu đề không được quá 100 ký tự')
      .optional()
      .default(''),
    comment: z.string()
      .trim()
      .max(1000, 'Nội dung không được quá 1000 ký tự')
      .optional()
      .default(''),
    images: z.array(z.string().url('URL ảnh không hợp lệ'))
      .max(5, 'Tối đa 5 ảnh cho mỗi đánh giá')
      .optional()
      .default([]),
  }),
});

// ── Update Review ─────────────────────────────────────────────────────────────

const updateReviewSchema = z.object({
  params: z.object({
    id: objectId,
  }),
  body: z.object({
    rating: z.number()
      .int('Điểm đánh giá phải là số nguyên')
      .min(1, 'Điểm tối thiểu là 1')
      .max(5, 'Điểm tối đa là 5')
      .optional(),
    title: z.string()
      .trim()
      .max(100, 'Tiêu đề không được quá 100 ký tự')
      .optional(),
    comment: z.string()
      .trim()
      .max(1000, 'Nội dung không được quá 1000 ký tự')
      .optional(),
    images: z.array(z.string().url('URL ảnh không hợp lệ'))
      .max(5, 'Tối đa 5 ảnh')
      .optional(),
  }).refine(
    data => Object.keys(data).length > 0,
    { message: 'Cần ít nhất một trường để cập nhật' },
  ),
});

// ── Query params for product reviews list ─────────────────────────────────────

const reviewQuerySchema = z.object({
  params: z.object({
    productId: objectId,
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(50).optional().default(10),
    sort: z.enum(['newest', 'oldest', 'highest', 'lowest', 'helpful'])
      .optional()
      .default('newest'),
    rating: z.coerce.number().int().min(1).max(5).optional(),
  }),
});

// ── Params with :id ───────────────────────────────────────────────────────────

const reviewIdParamSchema = z.object({
  params: z.object({
    id: objectId,
  }),
});

// ── Event tracking (for recommendations) ──────────────────────────────────────

const trackEventSchema = z.object({
  body: z.object({
    productId: objectId,
    eventType: z.enum(['view', 'cart', 'purchase', 'wishlist'], {
      errorMap: () => ({ message: 'Loại sự kiện không hợp lệ' }),
    }),
    sessionId: z.string().min(1, 'sessionId là bắt buộc'),
    meta: z.object({
      page:     z.string().optional(),
      query:    z.string().optional(),
      position: z.number().int().optional(),
    }).optional(),
  }),
});

module.exports = {
  createReviewSchema,
  updateReviewSchema,
  reviewQuerySchema,
  reviewIdParamSchema,
  trackEventSchema,
};
