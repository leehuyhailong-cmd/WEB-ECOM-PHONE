'use strict';

const productService  = require('./product.service');
const { ApiResponse, parsePagination } = require('../../utils/apiResponse');

/**
 * ProductController — HTTP layer only.
 * No business logic, no Mongoose calls, no Cloudinary calls.
 * Every method delegates to productService and returns via ApiResponse.
 */

// ── GET /api/products ─────────────────────────────────────────────────────────
async function list(req, res) {
  const { page, limit } = parsePagination(req.query);
  const result = await productService.listProducts({ ...req.query, page, limit });
  return ApiResponse.paginated(res, result.products, {
    page:  result.page,
    limit: result.limit,
    total: result.total,
  });
}

// ── GET /api/products/brands ──────────────────────────────────────────────────
async function brands(req, res) {
  const data = await productService.getBrands();
  return ApiResponse.success(res, { brands: data }, 'Lấy danh sách thương hiệu thành công');
}

// ── GET /api/products/:slug ───────────────────────────────────────────────────
async function getBySlug(req, res) {
  const { product, related } = await productService.getProductBySlug(req.params.slug);
  return ApiResponse.success(res, { product, related }, 'Lấy thông tin sản phẩm thành công');
}

// ── GET /api/products/id/:id (admin) ─────────────────────────────────────────
async function getById(req, res) {
  const product = await productService.getProductById(req.params.id);
  return ApiResponse.success(res, { product }, 'Lấy thông tin sản phẩm thành công');
}

// ── GET /api/products/admin (admin) ──────────────────────────────────────────
async function listAdmin(req, res) {
  const { page, limit } = parsePagination(req.query, 20);
  const result = await productService.listProductsAdmin({ ...req.query, page, limit });
  return ApiResponse.paginated(res, result.products, {
    page:  result.page,
    limit: result.limit,
    total: result.total,
  });
}

// ── POST /api/products (admin) ────────────────────────────────────────────────
async function create(req, res) {
  // req.files populated by productUpload multer middleware
  const product = await productService.createProduct(req.body, req.files || []);
  return ApiResponse.created(res, { product }, 'Thêm sản phẩm thành công');
}

// ── PUT /api/products/:id (admin) ─────────────────────────────────────────────
async function update(req, res) {
  const product = await productService.updateProduct(
    req.params.id,
    req.body,
    req.files || [],
  );
  return ApiResponse.success(res, { product }, 'Cập nhật sản phẩm thành công');
}

// ── DELETE /api/products/:id (admin) ─────────────────────────────────────────
async function remove(req, res) {
  await productService.deleteProduct(req.params.id);
  return ApiResponse.noContent(res);
}

// ── GET /api/products/recommended & /recommended/:userId ───────────────────
async function recommended(req, res) {
  const userId = req.params.userId || req.user?._id || null;
  const productId = req.query.productId || null;
  const data = await productService.getRecommendedProducts(userId, productId);
  return ApiResponse.success(res, data, 'Lấy danh sách sản phẩm gợi ý thành công');
}

module.exports = { list, brands, getBySlug, getById, listAdmin, create, update, remove, recommended };
