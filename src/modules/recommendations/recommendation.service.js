'use strict';

const userEventRepository = require('../../repositories/userEvent.repository');
const productRepository   = require('../../repositories/product.repository');
const { logger }          = require('../../utils/logger');

/**
 * RecommendationService — the scoring/ranking engine hidden behind a clean seam.
 *
 * Deep module:
 *   Interface:  getHomepage(userId?), getRelated(productId), getCartSuggestions(productIds)
 *   Implementation: event aggregation, co-occurrence pipeline, content-based matching,
 *                   deduplication, fallback logic
 *
 * Callers don't know about weights, TTLs, or aggregation pipelines.
 * The algorithm can be swapped without changing any route or controller.
 */

// ── Homepage Recommendations ──────────────────────────────────────────────────

/**
 * Get homepage recommendations.
 * Returns up to 3 sections:
 *   1. "Đang hot" — globally trending products (last 24h)
 *   2. "Gợi ý cho bạn" — personalised (logged-in users only)
 *   3. "Bán chạy nhất" — fallback: top products by soldCount
 *
 * @param {string|null} userId - null for guests
 * @returns {Promise<{ trending: object[], personalised: object[], bestSellers: object[] }>}
 */
async function getHomepage(userId = null) {
  // 1. Trending — always available (guests + users)
  const trendingScores = await userEventRepository.getTrending(24, 10);
  const trendingIds    = trendingScores.map(t => t.productId.toString());
  let trending         = [];

  if (trendingIds.length > 0) {
    trending = await productRepository.findByIds(trendingIds);
    // Preserve score-based ordering
    trending = _orderByIds(trending, trendingIds);
  }

  // 2. Personalised — only for logged-in users
  let personalised = [];
  if (userId) {
    try {
      personalised = await _getPersonalised(userId, trendingIds);
    } catch (err) {
      // Personalisation failure must never break the homepage
      logger.warn({ err, userId }, 'Personalisation failed, returning empty');
    }
  }

  // 3. Best sellers — reliable fallback, always available
  const bestSellerData = await productRepository.findAll({
    sort: 'popular',
    limit: 10,
    page: 1,
  });

  // Deduplicate: remove best sellers that already appear in trending or personalised
  const shownIds = new Set([
    ...trending.map(p => p._id.toString()),
    ...personalised.map(p => p._id.toString()),
  ]);
  const bestSellers = bestSellerData.products.filter(
    p => !shownIds.has(p._id.toString()),
  ).slice(0, 8);

  return { trending, personalised, bestSellers };
}

// ── Related Products (Content-Based) ──────────────────────────────────────────

/**
 * Get content-based related products for a product detail page.
 * Delegates to the existing productRepository.findRelated().
 *
 * @param {string} productId
 * @returns {Promise<object[]>}
 */
async function getRelated(productId) {
  const product = await productRepository.findById(productId);
  if (!product) return [];

  return productRepository.findRelated(product, 8);
}

// ── Cart Suggestions (Co-Occurrence) ──────────────────────────────────────────

/**
 * "Mua cùng nhau" — products frequently ordered together with the user's cart items.
 * Uses the order co-occurrence aggregation pipeline.
 *
 * @param {string[]} cartProductIds - Product IDs currently in the user's cart
 * @returns {Promise<object[]>}
 */
async function getCartSuggestions(cartProductIds) {
  if (!cartProductIds || cartProductIds.length === 0) return [];

  const coOccurrence = await userEventRepository.getCoOccurrence(cartProductIds, 6);
  const coIds = coOccurrence.map(c => c.productId.toString());

  if (coIds.length === 0) {
    // Fallback: return best sellers as suggestions
    const fallback = await productRepository.findAll({ sort: 'popular', limit: 6, page: 1 });
    return fallback.products.filter(p => !cartProductIds.includes(p._id.toString()));
  }

  const products = await productRepository.findByIds(coIds);
  return _orderByIds(products, coIds);
}

// ── Event Tracking ────────────────────────────────────────────────────────────

/**
 * Fire-and-forget event tracking.
 * Called from the recommendation controller when users view/cart/purchase products.
 *
 * @param {{ userId?, sessionId, productId, eventType, meta? }} data
 */
async function trackEvent(data) {
  await userEventRepository.logEvent(data);
}

// ── Private Helpers ───────────────────────────────────────────────────────────

/**
 * Build personalised recommendations from user's event history.
 *
 * Algorithm:
 *   1. Get user's top-interacted products (by weighted score)
 *   2. Fetch those products' brand + category
 *   3. Find related products (same brand/category, different products)
 *   4. Exclude products already shown in trending
 *
 * @param {string} userId
 * @param {string[]} excludeIds - IDs already shown (trending)
 * @returns {Promise<object[]>}
 */
async function _getPersonalised(userId, excludeIds = []) {
  // Step 1: Get user's top products by interaction score
  const topProducts = await userEventRepository.getUserTopProducts(userId, 10);
  if (topProducts.length === 0) return [];

  // Step 2: Fetch the actual product documents to get brand/category
  const topIds   = topProducts.map(t => t.productId.toString());
  const products = await productRepository.findByIds(topIds);

  if (products.length === 0) return [];

  // Step 3: Extract unique brands and categories from user's preferences
  const brands     = [...new Set(products.map(p => p.brand))];
  const categories = [...new Set(products.map(p => p.category))];

  // Step 4: Find products matching user's brand/category preferences
  // Use the first brand/category for a targeted query
  const recommendations = await productRepository.findAll({
    brand:    brands[0],
    category: categories[0],
    sort:     'popular',
    limit:    12,
    page:     1,
  });

  // Step 5: Deduplicate against trending + user's already-interacted products
  const excludeSet = new Set([...excludeIds, ...topIds]);
  return recommendations.products
    .filter(p => !excludeSet.has(p._id.toString()))
    .slice(0, 8);
}

/**
 * Order an array of products to match the order of an ID array.
 * Used to preserve score-based ranking after findByIds() fetch.
 *
 * @param {object[]} products
 * @param {string[]} orderedIds
 * @returns {object[]}
 */
function _orderByIds(products, orderedIds) {
  const map = new Map(products.map(p => [p._id.toString(), p]));
  return orderedIds.map(id => map.get(id)).filter(Boolean);
}

module.exports = {
  getHomepage,
  getRelated,
  getCartSuggestions,
  trackEvent,
};
