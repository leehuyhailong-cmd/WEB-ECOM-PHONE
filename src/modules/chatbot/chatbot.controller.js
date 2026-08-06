'use strict';

const chatbotService  = require('./chatbot.service');
const chatSessionRepo = require('../../repositories/chatSession.repository');
const { ApiResponse } = require('../../utils/apiResponse');
const { logger }      = require('../../utils/logger');

/**
 * ChatbotController — HTTP only. Reads req, calls service, returns response.
 * Zero Mongoose. Zero business logic. Zero OpenAI calls.
 *
 * Supports two response modes:
 *   1. Standard JSON response (POST /message)
 *   2. SSE streaming response (POST /message/stream)
 */

// ── POST /api/chatbot/message ─────────────────────────────────────────────────
/**
 * Send a message and get a complete JSON response.
 * Use this for simple integrations or when SSE is not needed.
 */
async function sendMessage(req, res) {
  const userId    = req.user ? req.user.id : null;
  const { message, sessionId } = req.body;

  const result = await chatbotService.sendMessage(userId, sessionId, message);

  return ApiResponse.success(res, result, 'Thành công');
}

// ── POST /api/chatbot/message/stream ──────────────────────────────────────────
/**
 * Send a message and receive the response as an SSE stream.
 * Each SSE event contains a chunk of the assistant's reply.
 *
 * Event types:
 *   - data: { type: 'chunk', content: '...' }   — text chunk
 *   - data: { type: 'done', intent: '...' }      — stream complete
 *   - data: { type: 'error', message: '...' }    — error during stream
 */
async function sendMessageStream(req, res) {
  const userId    = req.user ? req.user.id : null;
  const { message, sessionId } = req.body;

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type':  'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection':    'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  });

  try {
    const { stream, fallbackReply, intent, session } =
      await chatbotService.sendMessageStream(userId, sessionId, message);

    if (fallbackReply) {
      // No OpenAI key — send the full fallback as a single chunk
      res.write(`data: ${JSON.stringify({ type: 'chunk', content: fallbackReply })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'done', intent })}\n\n`);
      return res.end();
    }

    // Parse the OpenAI streaming response
    let fullReply = '';
    const reader  = stream.getReader();
    const decoder = new TextDecoder();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      const lines = text.split('\n').filter(l => l.startsWith('data: '));

      for (const line of lines) {
        const data = line.slice(6); // Remove 'data: ' prefix
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullReply += content;
            res.write(`data: ${JSON.stringify({ type: 'chunk', content })}\n\n`);
          }
        } catch {
          // Skip malformed chunks
        }
      }
    }

    // Persist the complete assistant reply
    if (fullReply) {
      await chatSessionRepo.appendMessage(session, { role: 'assistant', content: fullReply });
    }

    res.write(`data: ${JSON.stringify({ type: 'done', intent })}\n\n`);
    res.end();
  } catch (err) {
    logger.error({ msg: 'SSE stream error', error: err.message, sessionId });
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'Lỗi xử lý tin nhắn' })}\n\n`);
    res.end();
  }
}

// ── GET /api/chatbot/session ──────────────────────────────────────────────────
/**
 * Get messages for a chat session.
 */
async function getSession(req, res) {
  const { sessionId, limit } = req.query;
  const session = await chatbotService.getSession(sessionId, limit);

  return ApiResponse.success(res, session, 'Thành công');
}

// ── DELETE /api/chatbot/session ───────────────────────────────────────────────
/**
 * Delete a chat session.
 */
async function deleteSession(req, res) {
  const userId    = req.user ? req.user.id : null;
  const { sessionId } = req.body;

  await chatbotService.deleteSession(sessionId, userId);

  return ApiResponse.noContent(res);
}

module.exports = {
  sendMessage,
  sendMessageStream,
  getSession,
  deleteSession,
};
