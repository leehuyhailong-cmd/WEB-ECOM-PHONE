'use strict';

const { Router } = require('express');
const asyncHandler = require('../../utils/asyncHandler');
const validate     = require('../../middlewares/validate');
const { optionalAuthenticate } = require('../../middlewares/auth.middleware');
const { chatbotLimiter }       = require('../../middlewares/rate-limit');

const chatbotController = require('./chatbot.controller');
const {
  sendMessageSchema,
  getSessionSchema,
  deleteSessionSchema,
} = require('./chatbot.validator');

const router = Router();

/**
 * Chatbot Router
 *
 * All routes use optionalAuthenticate — guests can chat,
 * but logged-in users get personalised responses (order status, etc.).
 *
 * Routing rule: static paths BEFORE dynamic paths.
 *
 * Endpoints:
 *   POST   /api/chatbot/message        — Send message, get JSON reply
 *   POST   /api/chatbot/message/stream — Send message, get SSE stream
 *   GET    /api/chatbot/session        — Get session messages
 *   DELETE /api/chatbot/session        — Delete session
 */

// ── Rate-limited + optionally authenticated ──────────────────────────────────
router.use(chatbotLimiter);     // 20 req/min per IP
router.use(optionalAuthenticate); // Attach req.user if token present

// ── POST / & /message — Standard JSON response ───────────────────────────────────
router.post(
  '/',
  validate(sendMessageSchema),
  asyncHandler(chatbotController.sendMessage),
);

router.post(
  '/message',
  validate(sendMessageSchema),
  asyncHandler(chatbotController.sendMessage),
);

// ── POST /message/stream — SSE streaming response ────────────────────────────
// Note: asyncHandler is NOT used here because the SSE handler manages its own
// error handling and writes to res directly. Express error handlers don't work
// with SSE after headers are sent.
router.post(
  '/message/stream',
  validate(sendMessageSchema),
  chatbotController.sendMessageStream,
);

// ── GET /session — Retrieve session messages ─────────────────────────────────
router.get(
  '/session',
  validate(getSessionSchema),
  asyncHandler(chatbotController.getSession),
);

// ── DELETE /session — Clear session ──────────────────────────────────────────
router.delete(
  '/session',
  validate(deleteSessionSchema),
  asyncHandler(chatbotController.deleteSession),
);

module.exports = router;
