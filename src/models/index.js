'use strict';

/**
 * Central models registry.
 * Import from here everywhere — never require individual model files directly.
 *
 * Usage:
 *   const { User, Product, Order } = require('../models');
 */

const User        = require('./User');
const Product     = require('./Product');
const Order       = require('./Order');
const Cart        = require('./Cart');
const Review      = require('./Review');
const ChatSession = require('./ChatSession');
const UserEvent   = require('./UserEvent');

module.exports = { User, Product, Order, Cart, Review, ChatSession, UserEvent };
