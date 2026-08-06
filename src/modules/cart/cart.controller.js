'use strict';

const cartService    = require('./cart.service');
const { ApiResponse } = require('../../utils/apiResponse');

/**
 * CartController — HTTP layer only.
 * All methods delegate to cartService and return via ApiResponse.
 */

// GET /api/cart
async function getCart(req, res) {
  const result = await cartService.getCart(req.user.id);
  return ApiResponse.success(res, result, 'Lấy giỏ hàng thành công');
}

// POST /api/cart/items
async function addItem(req, res) {
  const { productId, quantity } = req.body;
  const result = await cartService.addItem(req.user.id, productId, quantity);
  return ApiResponse.success(res, result, 'Đã thêm sản phẩm vào giỏ hàng');
}

// PATCH /api/cart/items/:productId
async function updateItem(req, res) {
  const result = await cartService.updateItem(
    req.user.id,
    req.params.productId,
    req.body.quantity,
  );
  return ApiResponse.success(res, result, 'Đã cập nhật giỏ hàng');
}

// DELETE /api/cart/items/:productId
async function removeItem(req, res) {
  const result = await cartService.removeItem(req.user.id, req.params.productId);
  return ApiResponse.success(res, result, 'Đã xoá sản phẩm khỏi giỏ hàng');
}

// DELETE /api/cart
async function clearCart(req, res) {
  await cartService.clearCart(req.user.id);
  return ApiResponse.success(res, null, 'Đã xoá toàn bộ giỏ hàng');
}

// POST /api/cart/merge  — merge guest localStorage cart on login
async function mergeCart(req, res) {
  const result = await cartService.mergeGuestCart(req.user.id, req.body.items);
  return ApiResponse.success(res, result, 'Đã đồng bộ giỏ hàng');
}

module.exports = { getCart, addItem, updateItem, removeItem, clearCart, mergeCart };
