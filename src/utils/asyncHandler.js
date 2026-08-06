'use strict';

/**
 * Wraps an async Express route handler to eliminate try/catch boilerplate.
 * Caught rejections are forwarded to Express's next() error pipeline.
 *
 * Deep module principle: the interface is one function, the contract
 * (zero unhandled rejections across the entire controller layer) is deep.
 *
 * @param {(req, res, next) => Promise<any>} fn
 * @returns {(req, res, next) => void}
 *
 * Usage:
 *   router.get('/products', asyncHandler(productController.list));
 *   router.post('/orders',  authenticate, asyncHandler(orderController.create));
 */
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
