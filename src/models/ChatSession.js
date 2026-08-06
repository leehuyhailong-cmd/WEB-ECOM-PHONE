'use strict';

const mongoose = require('mongoose');

// ── Message sub-schema ────────────────────────────────────────────────────────

const MessageSchema = new mongoose.Schema(
  {
    role: {
      type:    String,
      enum:    { values: ['user', 'assistant', 'system'], message: 'Role không hợp lệ' },
      required: true,
    },
    content: {
      type:      String,
      required:  true,
      maxlength: [4000, 'Nội dung tin nhắn không được quá 4000 ký tự'],
    },
    // Intent detected for this message (populated for user messages only)
    intent: {
      type: String,
      enum: ['product_search', 'order_status', 'comparison', 'general', null],
      default: null,
    },
  },
  {
    _id:        false,
    timestamps: { createdAt: 'ts', updatedAt: false }, // Compact timestamp field name
  },
);

// ── Main schema ───────────────────────────────────────────────────────────────

const ChatSessionSchema = new mongoose.Schema(
  {
    // userId is null for anonymous chat sessions
    userId: {
      type:   mongoose.Schema.Types.ObjectId,
      ref:    'User',
      default: null,
    },
    sessionId: {
      // Client-generated UUID — allows guest sessions before login
      type:     String,
      required: true,
    },

    messages: {
      type:    [MessageSchema],
      default: [],
      validate: {
        // Hard cap at 200 messages — older sessions should be archived
        validator: v => v.length <= 200,
        message:   'Phiên chat không được quá 200 tin nhắn',
      },
    },

    // Title derived from first user message (set by chatbot service)
    title: {
      type:    String,
      default: 'Cuộc trò chuyện mới',
      trim:    true,
      maxlength: 100,
    },

    // ── TTL field (24-hour session expiry) ────────────────────────────────────
    // updatedAt is touched on every message append → TTL resets with activity.
    // MongoDB's TTL monitor deletes documents where updatedAt < now - 86400s.
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// ── Indexes ───────────────────────────────────────────────────────────────────
ChatSessionSchema.index({ sessionId: 1 }, { unique: true });            // Session lookup by client ID
ChatSessionSchema.index({ userId: 1, updatedAt: -1 });          // User's chat history
ChatSessionSchema.index(
  { updatedAt: 1 },
  { expireAfterSeconds: 86400 },  // 24 hours TTL — sessions expire after 24h of inactivity
);

// ── Instance: append a message ────────────────────────────────────────────────
/**
 * Appends a message and trims to keep only the last N for context window.
 * Automatically updates updatedAt (resetting the TTL clock).
 *
 * @param {{ role: string, content: string, intent?: string }} message
 * @param {number} [maxMessages=100] - Trim to this many messages
 */
ChatSessionSchema.methods.appendMessage = function appendMessage(message, maxMessages = 100) {
  this.messages.push(message);
  if (this.messages.length > maxMessages) {
    // Keep system message (index 0) + most recent messages
    const systemMsg = this.messages[0]?.role === 'system' ? [this.messages[0]] : [];
    this.messages = [...systemMsg, ...this.messages.slice(-maxMessages + systemMsg.length)];
  }
};

/**
 * Returns the last N messages formatted for the OpenAI API context window.
 * @param {number} [limit=6] - Number of recent messages to include
 * @returns {{ role: string, content: string }[]}
 */
ChatSessionSchema.methods.getContextWindow = function getContextWindow(limit = 6) {
  return this.messages
    .filter(m => m.role !== 'system')
    .slice(-limit)
    .map(m => ({ role: m.role, content: m.content }));
};

module.exports = mongoose.model('ChatSession', ChatSessionSchema);
