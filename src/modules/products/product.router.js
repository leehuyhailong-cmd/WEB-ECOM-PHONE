'use strict';

const express = require('express');

const asyncHandler  = require('../../utils/asyncHandler');
const validate      = require('../../middlewares/validate');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { publicLimiter }           = require('../../middlewares/rate-limit');
const { productUpload }           = require('../../middlewares/upload');
const productController           = require('./product.controller');
const {
  createProductSchema,
  updateProductSchema,
  listProductsSchema,
} = require('./product.validator');

const router = express.Router();

/**
 * Product Router
 *
 * Public routes (no authentication):
 *   GET  /api/products              — paginated list with filters + search
 *   GET  /api/products/brands       — distinct brand list (filter sidebar)
 *   GET  /api/products/:slug        — product detail by slug
 *
 * Admin-only routes (authenticate + authorize('admin')):
 *   GET    /api/products/admin      — full product list including inactive
 *   GET    /api/products/id/:id     — get by MongoDB _id
 *   POST   /api/products            — create product (multipart/form-data)
 *   PUT    /api/products/:id        — update product (multipart/form-data)
 *   DELETE /api/products/:id        — soft-delete product
 */

// ── Public routes ─────────────────────────────────────────────────────────────

// IMPORTANT: Static routes (/brands, /admin) MUST be declared before /:slug
// to prevent Express matching 'brands' and 'admin' as slugs.

router.get(
  '/brands',
  publicLimiter,
  asyncHandler(productController.brands),
);

router.get(
  '/',
  publicLimiter,
  validate(listProductsSchema),
  asyncHandler(productController.list),
);

// ── Admin-only routes ─────────────────────────────────────────────────────────

router.get(
  '/admin',
  authenticate,
  authorize('admin'),
  asyncHandler(productController.listAdmin),
);

router.get(
  '/id/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(productController.getById),
);

router.post(
  '/',
  authenticate,
  authorize('admin'),
  productUpload,              // multer: parses multipart, stores files in memory
  validate(createProductSchema),
  asyncHandler(productController.create),
);

router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  productUpload,
  validate(updateProductSchema),
  asyncHandler(productController.update),
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(productController.remove),
);

// ── Public: product detail — MUST be last (catches /:slug) ───────────────────
router.get(
  '/:slug',
  publicLimiter,
  asyncHandler(productController.getBySlug),
);

module.exports = router;
