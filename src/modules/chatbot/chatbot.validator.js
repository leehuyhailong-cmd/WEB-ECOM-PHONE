'use strict';

const { z } = require('zod');

/**
 * Chatbot Validators — Zod schemas for chatbot endpoints.
 *
 * Rules:
 *   - Every mutating route has a validate(schema) middleware
 *   - Schemas validate req.body / req.query / req.params as needed
 */

// ── POST /api/chatbot/message ─────────────────────────────────────────────────
const sendMessageSchema = z.object({
  body: z.object({
    message: z
      .string({ required_error: 'Nội dung tin nhắn là bắt buộc' })
      .trim()
      .min(1, 'Tin nhắn không được để trống')
      .max(2000, 'Tin nhắn không được quá 2000 ký tự'),

    sessionId: z
      .string({ required_error: 'Session ID là bắt buộc' })
      .trim()
      .min(1, 'Session ID không được để trống')
      .max(100, 'Session ID quá dài'),
  }),
});

// ── GET /api/chatbot/session ──────────────────────────────────────────────────
const getSessionSchema = z.object({
  query: z.object({
    sessionId: z
      .string({ required_error: 'Session ID là bắt buộc' })
      .trim()
      .min(1, 'Session ID không được để trống'),

    limit: z
      .preprocess(
        v => (v !== undefined && v !== '' ? Number(v) : 20),
        z.number().int().min(1).max(100).default(20),
      ),
  }),
});

// ── DELETE /api/chatbot/session ───────────────────────────────────────────────
const deleteSessionSchema = z.object({
  body: z.object({
    sessionId: z
      .string({ required_error: 'Session ID là bắt buộc' })
      .trim()
      .min(1, 'Session ID không được để trống'),
  }),
});

module.exports = {
  sendMessageSchema,
  getSessionSchema,
  deleteSessionSchema,
};
