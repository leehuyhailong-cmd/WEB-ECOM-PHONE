'use strict';

const cartRepository    = require('../../repositories/cart.repository');
const productRepository = require('../../repositories/product.repository');
const { NotFoundError, ConflictError, BadRequestError } = require('../../utils/errors');

/**
 * CartService — deep module owning all cart business logic.
 *
 * Cart strategy (from roadmap):
 *   - Authenticated users: cart persists in MongoDB (Cart model)
 *   - Guest users: cart lives in localStorage (frontend-managed)
 *   - On login: frontend calls POST /api/cart/merge with guest items
 *
 * The service returns clean, serialisable data objects.
 * Controllers never touch cartRepository directly.
 */

// ── Get cart ──────────────────────────────────────────────────────────────────

/**
 * Get a user's cart with populated product info.
 * Also performs inline validation: marks unavailable / out-of-stock items.
 * @param {string} userId
 * @returns {Promise<{ items: object[], summary: object }>}
 */
async function getCart(userId) {
  const cart = await cartRepository.findByUserId(userId);
  if (!cart || !cart.items.length) {
    return { items: [], summary: _buildSummary([]) };
  }

  // Annotate each item with availability status
  const annotated = cart.items.map(item => {
    const product = item.productId; // populated
    if (!product || !product.isActive) {
      return { ...item, product: null, unavailable: true, unavailableReason: 'Sản phẩm không còn bán' };
    }
    const inStock = product.stock >= item.quantity;
    return {
      _id:       item._id,
      quantity:  item.quantity,
      product: {
        _id:          product._id,
        name:         product.name,
        slug:         product.slug,
        brand:        product.brand,
        price:        product.price,
        comparePrice: product.comparePrice,
        image:        product.images?.[0] || null,
        stock:        product.stock,
        isActive:     product.isActive,
      },
      unavailable:       !inStock,
      unavailableReason: !inStock ? `Chỉ còn ${product.stock} sản phẩm` : null,
      subtotal: product.price * item.quantity,
    };
  });

  return { items: annotated, summary: _buildSummary(annotated) };
}

// ── Add item ──────────────────────────────────────────────────────────────────

/**
 * Add a product to the cart, or increment quantity if it already exists.
 * Validates product existence and stock before modifying.
 * @param {string} userId
 * @param {string} productId
 * @param {number} quantity
 * @returns {Promise<{ items, summary }>}
 */
async function addItem(userId, productId, quantity) {
  const product = await productRepository.findById(productId);
  if (!product || !product.isActive) throw new NotFoundError('Không tìm thấy sản phẩm');

  const cart = await cartRepository.findOrCreate(userId);

  // Find existing item
  const existingIdx = cart.items.findIndex(
    i => i.productId.toString() === productId,
  );

  const newQty = existingIdx >= 0
    ? cart.items[existingIdx].quantity + quantity
    : quantity;

  if (newQty > product.stock) {
    throw new ConflictError(
      `Không đủ hàng. Chỉ còn ${product.stock} sản phẩm trong kho.`,
    );
  }
  if (newQty > 50) throw new BadRequestError('Số lượng tối đa mỗi sản phẩm là 50');

  if (existingIdx >= 0) {
    cart.items[existingIdx].quantity = newQty;
  } else {
    cart.items.push({ productId, quantity });
  }

  await cart.save();
  return getCart(userId);
}

// ── Update item quantity ──────────────────────────────────────────────────────

/**
 * Set the exact quantity of a cart item.
 * @param {string} userId
 * @param {string} productId
 * @param {number} quantity
 * @returns {Promise<{ items, summary }>}
 */
async function updateItem(userId, productId, quantity) {
  const product = await productRepository.findById(productId);
  if (!product || !product.isActive) throw new NotFoundError('Không tìm thấy sản phẩm');

  if (quantity > product.stock) {
    throw new ConflictError(`Chỉ còn ${product.stock} sản phẩm trong kho`);
  }

  const cart = await cartRepository.findOrCreate(userId);
  const item = cart.items.find(i => i.productId.toString() === productId);
  if (!item) throw new NotFoundError('Sản phẩm không có trong giỏ hàng');

  item.quantity = quantity;
  await cart.save();
  return getCart(userId);
}

// ── Remove item ───────────────────────────────────────────────────────────────

/**
 * Remove a single item from the cart.
 * @param {string} userId
 * @param {string} productId
 * @returns {Promise<{ items, summary }>}
 */
async function removeItem(userId, productId) {
  const cart = await cartRepository.findOrCreate(userId);
  const before = cart.items.length;
  cart.items = cart.items.filter(i => i.productId.toString() !== productId);

  if (cart.items.length === before) {
    throw new NotFoundError('Sản phẩm không có trong giỏ hàng');
  }

  await cart.save();
  return getCart(userId);
}

// ── Clear cart ────────────────────────────────────────────────────────────────

/**
 * Remove all items from the cart.
 * @param {string} userId
 */
async function clearCart(userId) {
  await cartRepository.clearByUserId(userId);
}

// ── Merge guest cart ──────────────────────────────────────────────────────────

/**
 * Merge a guest (localStorage) cart into the user's DB cart on login.
 * Strategy: guest quantity wins for shared items (more intuitive UX).
 *
 * @param {string} userId
 * @param {{ productId: string, quantity: number }[]} guestItems
 * @returns {Promise<{ items, summary }>}
 */
async function mergeGuestCart(userId, guestItems) {
  if (!guestItems || !guestItems.length) return getCart(userId);

  const cart = await cartRepository.findOrCreate(userId);

  for (const guestItem of guestItems) {
    const idx = cart.items.findIndex(
      i => i.productId.toString() === guestItem.productId,
    );

    if (idx >= 0) {
      // Take the higher quantity (guest wins)
      cart.items[idx].quantity = Math.max(
        cart.items[idx].quantity,
        guestItem.quantity,
      );
    } else {
      cart.items.push({
        productId: guestItem.productId,
        quantity:  Math.min(guestItem.quantity, 50),
      });
    }
  }

  // Cap total items at 50
  if (cart.items.length > 50) cart.items = cart.items.slice(0, 50);

  await cart.save();
  return getCart(userId);
}

// ── Private helpers ───────────────────────────────────────────────────────────

function _buildSummary(items) {
  const available = items.filter(i => !i.unavailable);
  return {
    totalItems:    available.reduce((acc, i) => acc + i.quantity, 0),
    subtotal:      available.reduce((acc, i) => acc + i.subtotal, 0),
    hasUnavailable: items.some(i => i.unavailable),
  };
}

module.exports = { getCart, addItem, updateItem, removeItem, clearCart, mergeGuestCart };
