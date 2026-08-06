'use strict';

const { z } = require('zod');

/**
 * Admin Validators — Zod schemas for admin dashboard endpoints.
 */

// ── GET /api/admin/stats/revenue ──────────────────────────────────────────────
const revenueQuerySchema = z.object({
  query: z.object({
    days: z.preprocess(
      v => (v !== undefined && v !== '' ? Number(v) : 30),
      z.number().int().min(1).max(365).default(30),
    ),
  }),
});

// ── GET /api/admin/stats/top-products ─────────────────────────────────────────
const topProductsQuerySchema = z.object({
  query: z.object({
    limit: z.preprocess(
      v => (v !== undefined && v !== '' ? Number(v) : 5),
      z.number().int().min(1).max(50).default(5),
    ),
  }),
});

// ── GET /api/admin/users ──────────────────────────────────────────────────────
const listUsersSchema = z.object({
  query: z.object({
    page: z.preprocess(
      v => Number(v) || 1,
      z.number().int().min(1).default(1),
    ),
    limit: z.preprocess(
      v => Number(v) || 20,
      z.number().int().min(1).max(50).default(20),
    ),
    search: z.string().trim().max(100).optional(),
    role: z.enum(['user', 'admin']).optional(),
  }),
});

// ── PATCH /api/admin/users/:id/role ───────────────────────────────────────────
const updateUserRoleSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'User ID là bắt buộc'),
  }),
  body: z.object({
    role: z.enum(['user', 'admin'], {
      errorMap: () => ({ message: 'Role phải là "user" hoặc "admin"' }),
    }),
  }),
});

// ── PATCH /api/admin/users/:id/status ─────────────────────────────────────────
const updateUserStatusSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'User ID là bắt buộc'),
  }),
  body: z.object({
    isActive: z.boolean({
      required_error: 'Trạng thái isActive là bắt buộc',
      invalid_type_error: 'isActive phải là boolean',
    }),
  }),
});

// ── GET /api/admin/stats/low-stock ────────────────────────────────────────────
const lowStockQuerySchema = z.object({
  query: z.object({
    threshold: z.preprocess(
      v => (v !== undefined && v !== '' ? Number(v) : 10),
      z.number().int().min(1).max(100).default(10),
    ),
  }),
});

module.exports = {
  revenueQuerySchema,
  topProductsQuerySchema,
  listUsersSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  lowStockQuerySchema,
};
