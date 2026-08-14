'use strict';

const { Product } = require('../models');

/**
 * ProductRepository — the data-access seam for all product queries.
 *
 * Rules (from nodejs-backend-patterns + improve-codebase-architecture):
 *   1. This file is the ONLY place that writes Mongoose queries for products
 *   2. Always .lean() on read-only queries (2–5x faster — no Mongoose overhead)
 *   3. Always .select() only the fields callers need
 *   4. Services never import Product model directly — they go through this seam
 *
 * Deletion test: deleting this file concentrates all Mongoose query complexity
 * into the service. That's bad. This file IS load-bearing.
 */

// ── Sort map — maps client sort param to Mongoose sort object ─────────────────
const SORT_MAP = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  popular: { soldCount: -1 },
  rating: { avgRating: -1, reviewCount: -1 },
};

// ── Query builder — builds the Mongoose filter object from client params ───────
function _buildFilter(params = {}) {
  const filter = { isActive: true };

  if (params.category) filter.category = params.category;

  if (params.brand) {
    const brandList = typeof params.brand === 'string'
      ? params.brand.split(',').map(b => b.trim()).filter(Boolean)
      : (Array.isArray(params.brand) ? params.brand : [params.brand]);

    if (brandList.length === 1) {
      filter.brand = new RegExp(`^${brandList[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    } else if (brandList.length > 1) {
      filter.brand = {
        $in: brandList.map(b => new RegExp(`^${b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')),
      };
    }
  }

  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    filter.price = {};
    if (params.minPrice !== undefined) filter.price.$gte = params.minPrice;
    if (params.maxPrice !== undefined) filter.price.$lte = params.maxPrice;
  }

  if (params.inStock) filter.stock = { $gt: 0 };

  if (params.featured) filter.isFeatured = true;

  return filter;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Paginated product list with filters and sorting.
 * Uses the { category: 1, price: 1 } and { brand: 1, soldCount: -1 } indexes.
 *
 * @param {object} params - Filter params from req.query (validated)
 * @returns {Promise<{ products: object[], total: number }>}
 */
async function findAll(params = {}) {
  const {
    page = 1, limit = 12, sort = 'newest',
    category, brand, minPrice, maxPrice, inStock, featured,
  } = params;

  const filter = _buildFilter({ category, brand, minPrice, maxPrice, inStock, featured });
  const sortObj = SORT_MAP[sort] || SORT_MAP.newest;
  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .select('name slug brand category price comparePrice stock images avgRating reviewCount soldCount isFeatured isActive createdAt')
      .lean(),
    Product.countDocuments(filter),
  ]);

  return { products, total };
}

/**
 * Full-text search using MongoDB text index.
 * Index: { name: 'text', description: 'text' } with weights { name: 10, description: 5 }
 *
 * @param {string} query - Search string
 * @param {object} params - Filter + pagination params
 * @returns {Promise<{ products: object[], total: number }>}
 */
async function search(query, params = {}) {
  const {
    page = 1, limit = 12,
    category, brand, minPrice, maxPrice, inStock,
  } = params;

  const filter = {
    ..._buildFilter({ category, brand, minPrice, maxPrice, inStock }),
    $text: { $search: query },
  };

  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    Product.find(filter, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' }, soldCount: -1 })
      .skip(skip)
      .limit(limit)
      .select('name slug brand category price comparePrice stock images avgRating reviewCount soldCount')
      .lean(),
    Product.countDocuments(filter),
  ]);

  return { products, total };
}

/**
 * Find a single product by slug (public product detail page).
 * Uses the { slug: 1 } unique index.
 *
 * @param {string} slug
 * @returns {Promise<object|null>}
 */
async function findBySlug(slug) {
  return Product.findOne({ slug, isActive: true }).lean();
}

/**
 * Find a single product by ID (admin use — no isActive filter).
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function findById(id) {
  return Product.findById(id).lean();
}

/**
 * Content-based related products.
 * Finds products with the same brand or category, sorted by popularity.
 * Uses the { brand: 1, soldCount: -1 } and { category: 1, price: 1 } indexes.
 *
 * @param {object} product - Current product (lean object)
 * @param {number} [limit=6]
 * @returns {Promise<object[]>}
 */
async function findRelated(product, limit = 6) {
  return Product.find({
    _id: { $ne: product._id },
    isActive: true,
    $or: [
      { brand: product.brand },
      { category: product.category },
    ],
  })
    .sort({ soldCount: -1, avgRating: -1 })
    .limit(limit)
    .select('name slug brand price comparePrice images avgRating reviewCount soldCount')
    .lean();
}

/**
 * Find products by an array of IDs (for recommendation engine).
 * @param {string[]} ids
 * @returns {Promise<object[]>}
 */
async function findByIds(ids) {
  return Product.find({ _id: { $in: ids }, isActive: true })
    .select('name slug brand price comparePrice images avgRating reviewCount soldCount')
    .lean();
}

/**
 * Create a new product. Slug is auto-generated by the pre-save hook.
 * @param {object} data
 * @returns {Promise<object>}
 */
async function create(data) {
  const product = await Product.create(data);
  return product.toObject();
}

/**
 * Update a product by ID.
 * Returns the updated document (lean).
 * @param {string} id
 * @param {object} updates
 * @returns {Promise<object|null>}
 */
async function update(id, updates) {
  const product = await Product.findById(id);
  if (!product) return null;

  // Merge updates — use Object.assign so pre-save hooks fire (slug regen if name changed)
  Object.assign(product, updates);
  await product.save();
  return product.toObject();
}

/**
 * Soft-delete: sets isActive = false.
 * Hard-delete is available but not recommended (preserves order history integrity).
 * @param {string} id
 * @returns {Promise<boolean>}
 */
async function softDelete(id) {
  const result = await Product.findByIdAndUpdate(id, { isActive: false });
  return !!result;
}

/**
 * Atomically decrement stock and increment soldCount.
 * Uses $inc with $gte guard to prevent overselling.
 * Called by OrderService — not by ProductService directly.
 *
 * @param {string} productId
 * @param {number} quantity
 * @param {object} [session] - Mongoose session for transactions
 * @returns {Promise<object|null>} Updated product or null if insufficient stock
 */
async function decrementStock(productId, quantity, session) {
  return Product.findOneAndUpdate(
    { _id: productId, stock: { $gte: quantity }, isActive: true },
    { $inc: { stock: -quantity, soldCount: quantity } },
    { new: true, session, lean: true },
  );
}

/**
 * Restore stock when an order is cancelled or a stock decrement is rolled back.
 * @param {string} productId
 * @param {number} quantity
 * @param {object} [session]
 * @returns {Promise<object|null>}
 */
async function incrementStock(productId, quantity, session) {
  return Product.findByIdAndUpdate(
    productId,
    { $inc: { stock: quantity, soldCount: -quantity } },
    { new: true, session, lean: true },
  );
}

/**
 * Get distinct brands (for filter sidebar).
 * @returns {Promise<string[]>}
 */
async function getDistinctBrands() {
  return Product.distinct('brand', { isActive: true });
}

/**
 * Admin: get all products including inactive ones.
 * @param {object} params
 * @returns {Promise<{ products: object[], total: number }>}
 */
async function findAllAdmin(params = {}) {
  const { page = 1, limit = 20, sort = 'newest', category, brand, isActive } = params;
  const filter = {};
  if (category !== undefined) filter.category = category;
  if (brand !== undefined) filter.brand = brand;
  if (isActive !== undefined) filter.isActive = isActive === 'true' || isActive === true;

  const sortObj = SORT_MAP[sort] || SORT_MAP.newest;
  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    Product.find(filter).sort(sortObj).skip(skip).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);

  return { products, total };
}

module.exports = {
  findAll,
  search,
  findBySlug,
  findById,
  findRelated,
  findByIds,
  create,
  update,
  softDelete,
  decrementStock,
  incrementStock,
  getDistinctBrands,
  findAllAdmin,
};
