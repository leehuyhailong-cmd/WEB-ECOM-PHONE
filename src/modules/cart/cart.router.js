'use strict';

const express = require('express');

const asyncHandler     = require('../../utils/asyncHandler');
const validate         = require('../../middlewares/validate');
const { authenticate } = require('../../middlewares/auth.middleware');
const cartController   = require('./cart.controller');
const { addItemSchema, updateItemSchema, mergeCartSchema } = require('./cart.validator');

const router = express.Router();

/**
 * Cart Router — all routes require authentication (cart is per-user in DB).
 * Guest cart lives in localStorage and is merged via POST /merge on login.
 *
 * GET    /api/cart                  — get current user's cart
 * POST   /api/cart/items            — add item (upsert)
 * PATCH  /api/cart/items/:productId — update quantity
 * DELETE /api/cart/items/:productId — remove item
 * DELETE /api/cart                  — clear all items
 * POST   /api/cart/merge            — merge guest cart on login
 */

// All cart routes require login
router.use(authenticate);

router.get('/', asyncHandler(cartController.getCart));

router.post(
  '/merge',
  validate(mergeCartSchema),
  asyncHandler(cartController.mergeCart),
);

router.post(
  '/items',
  validate(addItemSchema),
  asyncHandler(cartController.addItem),
);

router.patch(
  '/items/:productId',
  validate(updateItemSchema),
  asyncHandler(cartController.updateItem),
);

router.delete('/items/:productId', asyncHandler(cartController.removeItem));

router.delete('/', asyncHandler(cartController.clearCart));

module.exports = router;
