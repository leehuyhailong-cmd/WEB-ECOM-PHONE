'use strict';

const { ChatSession } = require('../models');

/**
 * ChatSessionRepository — data-access seam for all ChatSession queries.
 *
 * Deletion test: removing this file scatters session lookup, message
 * append, and trimming logic into the service. Load-bearing.
 */

// ── Find / Create ─────────────────────────────────────────────────────────────

/**
 * Find an active session by its client-generated sessionId.
 * Uses the { sessionId: 1 } unique index.
 *
 * @param {string} sessionId
 * @returns {Promise<Document|null>} Full Mongoose document (not lean — we need .save())
 */
async function findBySessionId(sessionId) {
  return ChatSession.findOne({ sessionId });
}

/**
 * Find or create a session. Upsert pattern:
 *   - If session exists → return it
 *   - If not → create with userId (nullable for guests)
 *
 * @param {string} sessionId
 * @param {string|null} userId
 * @returns {Promise<Document>}
 */
async function findOrCreate(sessionId, userId = null) {
  let session = await ChatSession.findOne({ sessionId });
  if (session) {
    // Attach userId if logging in mid-session
    if (userId && !session.userId) {
      session.userId = userId;
      await session.save();
    }
    return session;
  }

  session = await ChatSession.create({ sessionId, userId });
  return session;
}

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * Get paginated session history for a user (most recent first).
 * Uses the { userId: 1, updatedAt: -1 } index.
 *
 * @param {string} userId
 * @param {{ page?: number, limit?: number }} params
 * @returns {Promise<{ sessions: object[], total: number }>}
 */
async function findByUser(userId, params = {}) {
  const page  = Math.max(1, params.page || 1);
  const limit = Math.min(20, params.limit || 10);
  const skip  = (page - 1) * limit;

  const [sessions, total] = await Promise.all([
    ChatSession.find({ userId })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('sessionId title messages updatedAt')
      .lean(),
    ChatSession.countDocuments({ userId }),
  ]);

  return { sessions, total };
}

/**
 * Get the last N messages for a session (for display).
 *
 * @param {string} sessionId
 * @param {number} [limit=20]
 * @returns {Promise<object|null>} Lean session with trimmed messages
 */
async function getMessages(sessionId, limit = 20) {
  const session = await ChatSession.findOne({ sessionId })
    .select('sessionId title messages updatedAt')
    .lean();

  if (!session) return null;

  // Return only the last N messages
  session.messages = session.messages.slice(-limit);
  return session;
}

// ── Update ────────────────────────────────────────────────────────────────────

/**
 * Append a message to a session and save.
 * Uses the instance method which handles trimming.
 * Saving also touches updatedAt → resets the 24h TTL clock.
 *
 * @param {Document} session - Mongoose document (not lean)
 * @param {{ role: string, content: string, intent?: string }} message
 * @returns {Promise<Document>}
 */
async function appendMessage(session, message) {
  session.appendMessage(message);
  await session.save();
  return session;
}

/**
 * Set the session title (derived from first user message).
 *
 * @param {Document} session
 * @param {string} title
 */
async function setTitle(session, title) {
  session.title = title.slice(0, 100);
  await session.save();
}

// ── Delete ────────────────────────────────────────────────────────────────────

/**
 * Delete a session by sessionId.
 *
 * @param {string} sessionId
 * @returns {Promise<object|null>}
 */
async function deleteBySessionId(sessionId) {
  return ChatSession.findOneAndDelete({ sessionId });
}

/**
 * Delete a session only if it belongs to the given user.
 *
 * @param {string} sessionId
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
async function deleteBySessionIdAndUser(sessionId, userId) {
  return ChatSession.findOneAndDelete({ sessionId, userId });
}

module.exports = {
  findBySessionId,
  findOrCreate,
  findByUser,
  getMessages,
  appendMessage,
  setTitle,
  deleteBySessionId,
  deleteBySessionIdAndUser,
};
