'use strict';

const productRepository              = require('../../repositories/product.repository');
const { uploadToCloudinary, deleteFromCloudinary } = require('../../middlewares/upload');
const { NotFoundError }              = require('../../utils/errors');
const { logger }                     = require('../../utils/logger');

/**
 * ProductService — deep module owning all product business logic.
 *
 * Responsibilities:
 *   - Orchestrate repository calls
 *   - Handle Cloudinary image upload/delete lifecycle
 *   - Apply business rules (e.g. can't set comparePrice < price)
 *   - Coordinate slug generation (delegated to Product model pre-save hook)
 *
 * Controllers never call productRepository or Cloudinary directly.
 */

// ── Public listing ────────────────────────────────────────────────────────────

/**
 * Get paginated product list with filters, sorting, and search.
 * Routes to full-text search if `q` param is present.
 *
 * @param {object} query - Validated req.query from listProductsSchema
 * @returns {Promise<{ products, total, page, limit }>}
 */
async function listProducts(query) {
  const { q, page, limit, ...filters } = query;

  const { products, total } = q
    ? await productRepository.search(q, { page, limit, ...filters })
    : await productRepository.findAll({ page, limit, ...filters });

  return { products, total, page, limit };
}

/**
 * Get a single product by slug — public product detail page.
 * Includes related products for the "Sản phẩm liên quan" widget.
 *
 * @param {string} slug
 * @returns {Promise<{ product: object, related: object[] }>}
 */
async function getProductBySlug(slug) {
  const product = await productRepository.findBySlug(slug);
  if (!product) throw new NotFoundError('Không tìm thấy sản phẩm');

  const related = await productRepository.findRelated(product, 6);
  return { product, related };
}

/**
 * Get a single product by ID — admin use.
 * @param {string} id
 * @returns {Promise<object>}
 */
async function getProductById(id) {
  const product = await productRepository.findById(id);
  if (!product) throw new NotFoundError('Không tìm thấy sản phẩm');
  return product;
}

// ── Admin: Create ─────────────────────────────────────────────────────────────

/**
 * Create a new product.
 * Uploads any attached images to Cloudinary before saving to DB.
 *
 * @param {object} data    - Validated req.body (from createProductSchema)
 * @param {object[]} files - Array of multer file objects (req.files)
 * @returns {Promise<object>}
 */
async function createProduct(data, files = []) {
  let images = await _uploadImages(files, 'phonestore/products');
  const { imageUrl, ...productData } = data;

  if (imageUrl) {
    const exists = images.some(i => i.url === imageUrl);
    if (!exists) {
      images.unshift({ url: imageUrl, publicId: null, isPrimary: true });
    }
  }

  if (images.length === 0) {
    images = [{ url: '/images/iphone15promax.jpg', publicId: null, isPrimary: true }];
  }

  images.forEach((img, i) => { img.isPrimary = i === 0; });

  const product = await productRepository.create({ ...productData, images });
  logger.info({ msg: 'Product created', productId: product._id, name: product.name });
  return product;
}

// ── Admin: Update ─────────────────────────────────────────────────────────────

/**
 * Update a product.
 * Handles:
 *   - Adding new images (uploaded to Cloudinary)
 *   - Removing specified images by publicId (deleted from Cloudinary)
 *   - Triggering slug re-generation if name changes (via model pre-save hook)
 *
 * @param {string}   id    - Product _id
 * @param {object}   data  - Validated req.body (from updateProductSchema)
 * @param {object[]} files - New image files (req.files)
 * @returns {Promise<object>}
 */
async function updateProduct(id, data, files = []) {
  const existing = await productRepository.findById(id);
  if (!existing) throw new NotFoundError('Không tìm thấy sản phẩm');

  const { removeImageIds = [], imageUrl, ...productData } = data;
  let currentImages = existing.images || [];

  if (removeImageIds.length > 0) {
    await Promise.all(removeImageIds.map(pid => deleteFromCloudinary(pid)));
    currentImages = currentImages.filter(
      img => !removeImageIds.includes(img.publicId),
    );
  }

  if (files.length > 0) {
    const newImages = await _uploadImages(files, 'phonestore/products');
    currentImages = [...newImages, ...currentImages];
  }

  if (imageUrl) {
    const exists = currentImages.some(i => i.url === imageUrl);
    if (!exists) {
      currentImages = [{ url: imageUrl, publicId: null, isPrimary: true }, ...currentImages];
    }
  }

  if (currentImages.length > 0) {
    currentImages.forEach((img, i) => { img.isPrimary = i === 0; });
  }

  productData.images = currentImages;

  const updated = await productRepository.update(id, productData);
  logger.info({ msg: 'Product updated', productId: id });
  return updated;
}

// ── Admin: Delete ─────────────────────────────────────────────────────────────

/**
 * Soft-delete a product (sets isActive = false).
 * Images are preserved in Cloudinary — product can be restored by admin.
 *
 * @param {string} id
 */
async function deleteProduct(id) {
  const existing = await productRepository.findById(id);
  if (!existing) throw new NotFoundError('Không tìm thấy sản phẩm');

  await productRepository.softDelete(id);
  logger.info({ msg: 'Product soft-deleted', productId: id });
}

// ── Admin: List ───────────────────────────────────────────────────────────────

async function listProductsAdmin(query) {
  const { page = 1, limit = 20, ...filters } = query;
  const { products, total } = await productRepository.findAllAdmin({ page, limit, ...filters });
  return { products, total, page, limit };
}

// ── Utility ───────────────────────────────────────────────────────────────────

/**
 * Get distinct brand list for filter sidebar.
 * @returns {Promise<string[]>}
 */
async function getBrands() {
  return productRepository.getDistinctBrands();
}

// ── Private helpers ───────────────────────────────────────────────────────────

/**
 * Upload an array of multer file objects to Cloudinary.
 * Falls back gracefully if Cloudinary is not configured (dev mode).
 *
 * @param {object[]} files  - Array of multer file objects
 * @param {string}   folder - Cloudinary target folder
 * @returns {Promise<{ url: string, publicId: string, isPrimary: boolean }[]>}
 */
async function _uploadImages(files, folder) {
  if (!files || files.length === 0) return [];

  const isCloudinaryConfigured = !!process.env.CLOUDINARY_CLOUD_NAME;

  if (!isCloudinaryConfigured) {
    // Dev fallback — return placeholder URLs so the API still works without Cloudinary
    logger.warn({ msg: 'Cloudinary not configured — using placeholder image URLs' });
    return files.map((_, i) => ({
      url:      `https://placehold.co/800x800?text=Product+Image+${i + 1}`,
      publicId: null,
      isPrimary: i === 0,
    }));
  }

  const uploads = await Promise.all(
    files.map(file => uploadToCloudinary(file.buffer, folder)),
  );

  return uploads.map((result, i) => ({
    url:      result.url,
    publicId: result.publicId,
    isPrimary: i === 0,
  }));
}

/**
 * Get personalized / item-based product recommendations.
 * Filters same brand and/or +/- 20% price segment, excluding duplicates.
 */
async function getRecommendedProducts(userId = null, productId = null) {
  let targetBrand = null;
  let targetPrice = null;
  const excludeIds = new Set();

  if (productId) {
    const prod = await productRepository.findById(productId);
    if (prod) {
      targetBrand = prod.brand;
      targetPrice = prod.price;
      excludeIds.add(prod._id.toString());
    }
  }

  if (userId && (!targetBrand || !targetPrice)) {
    try {
      const orderRepository = require('../../repositories/order.repository');
      const { orders } = await orderRepository.findByUser(userId, { page: 1, limit: 1 });
      if (orders && orders.length > 0 && orders[0].items && orders[0].items.length > 0) {
        const item = orders[0].items[0];
        const lastProd = await productRepository.findById(item.product || item.productId);
        if (lastProd) {
          targetBrand = targetBrand || lastProd.brand;
          targetPrice = targetPrice || lastProd.price;
          excludeIds.add(lastProd._id.toString());
        }
      }
    } catch (e) {
      logger.warn({ err: e.message }, 'Recommendation user order fetch error');
    }
  }

  let brandProducts = [];
  if (targetBrand) {
    const res = await productRepository.findAll({ brand: targetBrand, limit: 8, inStock: true });
    brandProducts = (res.products || []).filter(p => !excludeIds.has(p._id.toString()));
  }

  let priceProducts = [];
  if (targetPrice) {
    const minP = Math.round(targetPrice * 0.8);
    const maxP = Math.round(targetPrice * 1.2);
    const res = await productRepository.findAll({ minPrice: minP, maxPrice: maxP, limit: 8, inStock: true });
    priceProducts = (res.products || []).filter(p => !excludeIds.has(p._id.toString()));
  }

  const map = new Map();
  [...brandProducts, ...priceProducts].forEach(p => {
    map.set(p._id.toString(), p);
  });

  let recommended = Array.from(map.values());

  if (recommended.length < 4) {
    const fallbackRes = await productRepository.findAll({ sort: 'popular', limit: 8, inStock: true });
    (fallbackRes.products || []).forEach(p => {
      if (!excludeIds.has(p._id.toString())) {
        map.set(p._id.toString(), p);
      }
    });
    recommended = Array.from(map.values());
  }

  return recommended.slice(0, 8);
}

/**
 * Get content-based related products for a product (same brand or category, excluding current product).
 */
async function getRelatedProducts(idOrSlug, limit = 4) {
  let product = null;
  if (typeof idOrSlug === 'string' && idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
    product = await productRepository.findById(idOrSlug);
  }
  if (!product) {
    product = await productRepository.findBySlug(idOrSlug);
  }
  if (!product) throw new NotFoundError('Không tìm thấy sản phẩm');

  const related = await productRepository.findRelated(product, limit);
  return related;
}

module.exports = {
  listProducts,
  getProductBySlug,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  listProductsAdmin,
  getBrands,
  getRecommendedProducts,
  getRelatedProducts,
};
