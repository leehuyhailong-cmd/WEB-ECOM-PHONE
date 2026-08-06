'use strict';

const rateLimit = require('express-rate-limit');

/**
 * Rate limiting middleware factory.
 * All limiters share the same in-memory store by default.
 * Swap to a Redis store (rate-limit-redis) when scaling horizontally.
 *
 * Seam: import only the limiter you need per route group.
 */

const _baseOptions = {
  standardHeaders: true,  // Return RateLimit-* headers (RFC 6585)
  legacyHeaders:   false, // Disable X-RateLimit-* legacy headers
  handler: (req, res) => {
    res.status(429).json({
      status:  'error',
      message: 'Quá nhiều yêu cầu từ địa chỉ IP này, vui lòng thử lại sau',
    });
  },
};

/** General API limiter — applied to all /api/* routes */
const apiLimiter = rateLimit({
  ..._baseOptions,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max:      200,
  message:  'Quá nhiều yêu cầu, vui lòng thử lại sau 15 phút',
});

/**
 * Strict limiter for authentication endpoints.
 * 5 failed attempts per 15 minutes → blocks IP.
 * skipSuccessfulRequests: only counts failed attempts toward the limit.
 */
const authLimiter = rateLimit({
  ..._baseOptions,
  windowMs:               15 * 60 * 1000,
  max:                    5,
  skipSuccessfulRequests: true,
  message:                'Quá nhiều lần đăng nhập thất bại, vui lòng thử lại sau 15 phút',
});

/** Lenient limiter for public browsing (product listing, search) */
const publicLimiter = rateLimit({
  ..._baseOptions,
  windowMs: 1 * 60 * 1000, // 1 minute
  max:      60,
});

/** Chatbot limiter — prevent prompt-injection abuse */
const chatbotLimiter = rateLimit({
  ..._baseOptions,
  windowMs: 1 * 60 * 1000,
  max:      20,
  message:  'Bạn đang gửi quá nhiều tin nhắn, vui lòng chờ một lúc',
});

module.exports = { apiLimiter, authLimiter, publicLimiter, chatbotLimiter };
