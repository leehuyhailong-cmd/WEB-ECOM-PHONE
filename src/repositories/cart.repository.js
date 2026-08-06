'use strict';

const { Cart } = require('../models');

/**
 * CartRepository — sole data-access seam for the Cart collection.
 * All Mongoose queries for Cart live here. Services never import Cart directly.
 * Rule: .lean() on read-only queries; return the full Mongoose doc when caller needs to .save().
 */

/**
 * Find a user's cart, populated with current product data.
 * populate() resolves productId → product fields needed for cart display.
 * @param {string} userId
 * @returns {Promise<object|null>} Lean cart object
 */
async function findByUserId(userId) {
  return Cart.findOne({ userId })
    .populate(
      'items.productId',
      'name slug price comparePrice stock images isActive brand',
    )
    .lean();
}

/**
 * Find or create a cart document. Returns the Mongoose document (not lean)
 * so that instance methods (upsertItem, removeItem, clear) can be called.
 * @param {string} userId
 * @returns {Promise<import('mongoose').Document>}
 */
async function findOrCreate(userId) {
  let cart = await Cart.findOne({ userId });
  if (!cart) cart = await Cart.create({ userId, items: [] });
  return cart;
}

/**
 * Clear all items in a user's cart.
 * Called after order creation — atomic update, no document load needed.
 * @param {string} userId
 * @param {object} [session] - Mongoose session for transactions
 */
async function clearByUserId(userId, session) {
  return Cart.findOneAndUpdate({ userId }, { $set: { items: [] } }, { session });
}

module.exports = { findByUserId, findOrCreate, clearByUserId };
