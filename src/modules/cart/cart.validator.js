'use strict';

const { z } = require('zod');

// ── Add item to cart ──────────────────────────────────────────────────────────
const addItemSchema = z.object({
  body: z.object({
    productId: z.string().min(1, 'productId là bắt buộc'),
    quantity:  z.preprocess(
      v => (v !== undefined ? Number(v) : 1),
      z.number().int('Số lượng phải là số nguyên').min(1).max(50),
    ),
  }),
});

// ── Update item quantity ──────────────────────────────────────────────────────
const updateItemSchema = z.object({
  body: z.object({
    quantity: z.preprocess(
      v => Number(v),
      z.number().int().min(1, 'Số lượng ít nhất là 1').max(50),
    ),
  }),
  params: z.object({
    productId: z.string().min(1, 'productId là bắt buộc'),
  }),
});

// ── Merge guest cart on login ─────────────────────────────────────────────────
const mergeCartSchema = z.object({
  body: z.object({
    items: z.array(
      z.object({
        productId: z.string().min(1),
        quantity:  z.number().int().min(1).max(50),
      }),
    ).max(50, 'Giỏ hàng không được quá 50 sản phẩm'),
  }),
});

module.exports = { addItemSchema, updateItemSchema, mergeCartSchema };
