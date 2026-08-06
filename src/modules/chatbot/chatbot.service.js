'use strict';

const chatSessionRepository = require('../../repositories/chatSession.repository');
const productRepository     = require('../../repositories/product.repository');
const orderRepository       = require('../../repositories/order.repository');
const { NotFoundError }     = require('../../utils/errors');
const { logger }            = require('../../utils/logger');

/**
 * ChatbotService — deep module that hides the full RAG pipeline.
 *
 * Interface (simple):
 *   sendMessage(userId, sessionId, text) → { role, content, intent }
 *   getSession(sessionId, limit) → session with messages
 *   deleteSession(sessionId, userId)
 *
 * Implementation (complex):
 *   1. Intent classification (regex + keyword rules)
 *   2. Context retrieval from MongoDB (product search, order lookup)
 *   3. System prompt construction with injected context
 *   4. OpenAI GPT-4o-mini call with streaming
 *   5. Session persistence with TTL
 *
 * Deletion test: removing this file scatters intent detection, prompt
 * engineering, and API orchestration across controller. Load-bearing.
 */

// ── Intent classification ─────────────────────────────────────────────────────

/**
 * @typedef {'product_search'|'order_status'|'comparison'|'general'} Intent
 */

/**
 * Intent keyword map — Vietnamese + English terms.
 * Order matters: first match wins. More specific intents checked first.
 *
 * @type {Array<{ intent: Intent, patterns: RegExp[] }>}
 */
const INTENT_RULES = [
  {
    intent: 'comparison',
    patterns: [
      /so sánh/i, /compare/i, /khác (nhau|gì)/i, /nên (mua|chọn)/i,
      /hay là/i, /tốt hơn/i, /versus|vs\b/i, /giữa .+ và/i,
    ],
  },
  {
    intent: 'order_status',
    patterns: [
      /đơn hàng/i, /order/i, /trạng thái/i, /giao hàng/i,
      /đã đặt/i, /tracking/i, /vận chuyển/i, /đã ship/i,
      /khi nào nhận/i, /bao giờ (giao|nhận)/i,
    ],
  },
  {
    intent: 'product_search',
    patterns: [
      /tìm (điện thoại|phone|sản phẩm|máy)/i,
      /giá (dưới|từ|trên|khoảng|tầm)/i,
      /recommend|gợi ý|đề xuất|tư vấn/i,
      /pin (trâu|lâu|tốt)/i,
      /camera (đẹp|tốt|chụp)/i,
      /chơi game/i, /gaming/i,
      /(mua|buy)\s+(gì|cái)/i,
      /iphone|samsung|xiaomi|oppo|vivo|realme|huawei|pixel/i,
      /smartphone|tablet|smartwatch|phụ kiện|accessory/i,
      /ram \d/i, /\d+\s*gb/i,
      /triệu|million|vnđ|vnd/i,
    ],
  },
];

/**
 * Classify the intent of a user message.
 * Falls back to 'general' for greetings, thanks, chit-chat.
 *
 * @param {string} message
 * @returns {Intent}
 */
function classifyIntent(message) {
  for (const rule of INTENT_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(message)) return rule.intent;
    }
  }
  return 'general';
}

// ── Context extraction helpers ────────────────────────────────────────────────

/**
 * Extract search parameters from a user message for product_search intent.
 * Uses regex to pull budget, brand, and category hints.
 *
 * @param {string} message
 * @returns {{ brand?: string, category?: string, maxPrice?: number, minPrice?: number }}
 */
function _extractSearchParams(message) {
  const params = {};

  // Brand extraction
  const brands = ['apple', 'iphone', 'samsung', 'xiaomi', 'oppo', 'vivo', 'realme', 'huawei', 'nokia', 'google', 'pixel', 'asus', 'sony', 'oneplus', 'motorola'];
  const lowerMsg = message.toLowerCase();
  for (const brand of brands) {
    if (lowerMsg.includes(brand)) {
      // Normalise aliases
      if (brand === 'iphone') params.brand = 'Apple';
      else if (brand === 'pixel') params.brand = 'Google';
      else params.brand = brand.charAt(0).toUpperCase() + brand.slice(1);
      break;
    }
  }

  // Category extraction
  if (/tablet|máy tính bảng|ipad/i.test(message)) params.category = 'tablet';
  else if (/smartwatch|đồng hồ|watch/i.test(message)) params.category = 'smartwatch';
  else if (/phụ kiện|accessory|ốp lưng|sạc|tai nghe/i.test(message)) params.category = 'accessory';
  else if (/phone|điện thoại|smartphone/i.test(message)) params.category = 'smartphone';

  // Budget extraction (Vietnamese: "dưới 10 triệu", "tầm 5-8 triệu", "khoảng 15tr")
  const budgetMatch = message.match(/(dưới|under|<)\s*(\d+)\s*(triệu|tr|million)/i);
  if (budgetMatch) {
    params.maxPrice = parseInt(budgetMatch[2], 10) * 1_000_000;
  }

  const rangeMatch = message.match(/(từ|from)\s*(\d+)\s*(đến|to|-)\s*(\d+)\s*(triệu|tr|million)/i);
  if (rangeMatch) {
    params.minPrice = parseInt(rangeMatch[2], 10) * 1_000_000;
    params.maxPrice = parseInt(rangeMatch[4], 10) * 1_000_000;
  }

  const aroundMatch = message.match(/(khoảng|tầm|around|about)\s*(\d+)\s*(triệu|tr|million)/i);
  if (aroundMatch) {
    const base = parseInt(aroundMatch[2], 10) * 1_000_000;
    params.minPrice = Math.round(base * 0.7);
    params.maxPrice = Math.round(base * 1.3);
  }

  const overMatch = message.match(/(trên|trở lên|over|>)\s*(\d+)\s*(triệu|tr|million)/i);
  if (overMatch) {
    params.minPrice = parseInt(overMatch[2], 10) * 1_000_000;
  }

  return params;
}

/**
 * Extract product names for comparison intent.
 * Looks for "X vs Y", "X hay Y", "so sánh X với/và Y" patterns.
 *
 * @param {string} message
 * @returns {string[]} Product name fragments
 */
function _extractComparisonProducts(message) {
  // "so sánh X với/và/hay Y"
  const match = message.match(/so sánh\s+(.+?)\s+(với|và|hay|vs)\s+(.+?)(\?|$)/i);
  if (match) return [match[1].trim(), match[3].trim()];

  // "X vs Y" / "X hay Y"
  const vsMatch = message.match(/(.+?)\s+(vs|versus|hay là|hay)\s+(.+?)(\?|$)/i);
  if (vsMatch) return [vsMatch[1].trim(), vsMatch[3].trim()];

  return [];
}

// ── Context retrieval ─────────────────────────────────────────────────────────

/**
 * Retrieve relevant context from MongoDB based on the intent.
 * Returns a structured context string to inject into the system prompt.
 *
 * @param {Intent} intent
 * @param {string} message
 * @param {string|null} userId
 * @returns {Promise<string>} Context string for the GPT prompt
 */
async function _retrieveContext(intent, message, userId) {
  switch (intent) {
    case 'product_search': {
      const params = _extractSearchParams(message);
      const { products } = await productRepository.findAll({
        ...params,
        inStock: true,
        sort:    'popular',
        limit:   5,
        page:    1,
      });

      if (products.length === 0) {
        return 'Không tìm thấy sản phẩm phù hợp trong kho hàng hiện tại.';
      }

      const list = products.map((p, i) => {
        const price = new Intl.NumberFormat('vi-VN').format(p.price);
        return `${i + 1}. ${p.name} — ${price}₫ | ⭐ ${p.avgRating || 0}/5 (${p.reviewCount || 0} đánh giá) | Tồn kho: ${p.stock} | Slug: ${p.slug}`;
      }).join('\n');

      return `SẢN PHẨM PHÙ HỢP (${products.length} kết quả):\n${list}`;
    }

    case 'comparison': {
      const names = _extractComparisonProducts(message);
      if (names.length < 2) {
        return 'Không xác định được 2 sản phẩm để so sánh. Hãy hỏi người dùng cung cấp tên cụ thể.';
      }

      // Search for each product by name
      const results = await Promise.all(
        names.map(name => productRepository.search(name, { limit: 1, page: 1 })),
      );

      const found = results
        .filter(r => r.products.length > 0)
        .map(r => r.products[0]);

      if (found.length < 2) {
        return `Chỉ tìm thấy ${found.length}/2 sản phẩm. Sản phẩm có thể không tồn tại trong cửa hàng.`;
      }

      const compare = found.map(p => {
        const price = new Intl.NumberFormat('vi-VN').format(p.price);
        return `- ${p.name}: ${price}₫ | ⭐ ${p.avgRating || 0}/5 | RAM: ${p.specs?.ram || 'N/A'} | Pin: ${p.specs?.battery || 'N/A'} | Camera: ${p.specs?.camera || 'N/A'} | Slug: ${p.slug}`;
      }).join('\n');

      return `SO SÁNH SẢN PHẨM:\n${compare}`;
    }

    case 'order_status': {
      if (!userId) {
        return 'Người dùng chưa đăng nhập. Yêu cầu đăng nhập để xem thông tin đơn hàng.';
      }

      const { orders } = await orderRepository.findByUser(userId, { page: 1, limit: 3 });
      if (orders.length === 0) {
        return 'Người dùng chưa có đơn hàng nào.';
      }

      const statusMap = {
        pending:    'Chờ xử lý',
        confirmed:  'Đã xác nhận',
        processing: 'Đang xử lý',
        shipping:   'Đang giao hàng',
        delivered:  'Đã giao hàng',
        cancelled:  'Đã huỷ',
      };

      const list = orders.map((o, i) => {
        const total = new Intl.NumberFormat('vi-VN').format(o.totalPrice);
        const items = o.items.map(it => it.name).join(', ');
        const date  = new Date(o.createdAt).toLocaleDateString('vi-VN');
        return `${i + 1}. Đơn #${o._id.toString().slice(-6)} | ${statusMap[o.status] || o.status} | ${total}₫ | ${date}\n   Sản phẩm: ${items}`;
      }).join('\n');

      return `ĐƠN HÀNG GẦN NHẤT (${orders.length} đơn):\n${list}`;
    }

    default:
      return '';
  }
}

// ── System prompt builder ─────────────────────────────────────────────────────

const BASE_SYSTEM_PROMPT = `Bạn là trợ lý mua sắm AI của Phonestore — cửa hàng điện thoại và phụ kiện công nghệ uy tín tại Việt Nam.

QUY TẮC BẮT BUỘC:
1. Luôn trả lời bằng tiếng Việt, thân thiện, ngắn gọn.
2. Chỉ giới thiệu sản phẩm từ danh sách được cung cấp bên dưới (nếu có). Không bịa sản phẩm.
3. Khi giới thiệu sản phẩm, nêu rõ: tên, giá, đánh giá.
4. Nếu không có thông tin, nói rõ và gợi ý người dùng truy cập website hoặc liên hệ hotline.
5. Không trả lời câu hỏi ngoài phạm vi mua sắm điện thoại/phụ kiện công nghệ.
6. Sử dụng emoji phù hợp để tạo trải nghiệm thân thiện.`;

/**
 * Build the messages array for the OpenAI API call.
 *
 * @param {string} contextData  - Retrieved context string
 * @param {Array}  history      - Last N conversation messages
 * @param {string} userMessage  - Current user message
 * @returns {Array<{role: string, content: string}>}
 */
function _buildPromptMessages(contextData, history, userMessage) {
  const messages = [];

  // System prompt with context injection
  let systemContent = BASE_SYSTEM_PROMPT;
  if (contextData) {
    systemContent += `\n\nDỮ LIỆU TỪ HỆ THỐNG:\n${contextData}`;
  }
  messages.push({ role: 'system', content: systemContent });

  // Conversation history (last 6 exchanges for continuity)
  for (const msg of history) {
    messages.push({ role: msg.role, content: msg.content });
  }

  // Current user message
  messages.push({ role: 'user', content: userMessage });

  return messages;
}

// ── OpenAI API call ───────────────────────────────────────────────────────────

/**
 * Call OpenAI Chat Completions API.
 * Returns the full response text (non-streaming for now).
 * SSE streaming is handled at the controller level using this as a generator.
 *
 * @param {Array<{role: string, content: string}>} messages
 * @param {boolean} [stream=false]
 * @returns {Promise<string|ReadableStream>}
 */
async function _callOpenAI(messages, stream = false) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logger.warn('OPENAI_API_KEY not set — using fallback response');
    return _fallbackResponse(messages);
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream,
      max_tokens:  800,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    logger.error({ msg: 'OpenAI API error', status: response.status, body: errorBody });
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  if (stream) {
    return response.body; // Return the ReadableStream for SSE piping
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'Xin lỗi, tôi không thể xử lý yêu cầu này.';
}

/**
 * Fallback response when OpenAI API is not configured.
 * Provides a rule-based response using the context data.
 *
 * @param {Array<{role: string, content: string}>} messages
 * @returns {string}
 */
function _fallbackResponse(messages) {
  const systemMsg = messages.find(m => m.role === 'system');
  const userMsg   = messages[messages.length - 1]?.content || '';

  // Check if system prompt contains product data
  if (systemMsg?.content?.includes('SẢN PHẨM PHÙ HỢP')) {
    const productLines = systemMsg.content
      .split('\n')
      .filter(l => /^\d+\./.test(l))
      .join('\n');
    return `📱 Dựa trên yêu cầu của bạn, đây là những sản phẩm phù hợp:\n\n${productLines}\n\nBạn muốn tìm hiểu thêm về sản phẩm nào?`;
  }

  if (systemMsg?.content?.includes('SO SÁNH SẢN PHẨM')) {
    const compareLines = systemMsg.content
      .split('\n')
      .filter(l => l.startsWith('- '))
      .join('\n');
    return `📊 So sánh sản phẩm:\n\n${compareLines}\n\nBạn cần thêm thông tin chi tiết nào?`;
  }

  if (systemMsg?.content?.includes('ĐƠN HÀNG GẦN NHẤT')) {
    const orderLines = systemMsg.content
      .split('\n')
      .filter(l => /^\d+\./.test(l) || l.startsWith('   '))
      .join('\n');
    return `📦 Thông tin đơn hàng của bạn:\n\n${orderLines}\n\nBạn cần hỗ trợ thêm về đơn hàng nào?`;
  }

  // General fallback
  return `Xin chào! 👋 Tôi là trợ lý mua sắm của Phonestore. Tôi có thể giúp bạn:\n\n• 🔍 Tìm điện thoại phù hợp (VD: "Tìm điện thoại dưới 10 triệu")\n• 📊 So sánh sản phẩm (VD: "So sánh iPhone 15 vs Samsung S24")\n• 📦 Kiểm tra đơn hàng\n• ❓ Trả lời câu hỏi về sản phẩm\n\nBạn cần tìm hiểu gì?`;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Process a user message through the full RAG pipeline.
 *
 * Pipeline:
 *   1. Find or create session
 *   2. Classify intent
 *   3. Retrieve context from MongoDB
 *   4. Build prompt with context + history
 *   5. Call OpenAI (or fallback)
 *   6. Save both user & assistant messages to session
 *   7. Return the assistant reply
 *
 * @param {string|null} userId    - Authenticated user ID or null for guests
 * @param {string}      sessionId - Client-generated session ID
 * @param {string}      message   - User message text
 * @returns {Promise<{ reply: string, intent: string, sessionId: string }>}
 */
async function sendMessage(userId, sessionId, message) {
  // 1. Session management
  const session = await chatSessionRepository.findOrCreate(sessionId, userId);

  // Set title from first user message
  if (session.messages.length === 0 || session.title === 'Cuộc trò chuyện mới') {
    await chatSessionRepository.setTitle(session, message.slice(0, 80));
  }

  // 2. Intent classification
  const intent = classifyIntent(message);
  logger.info({ msg: 'Chatbot intent classified', intent, sessionId, userId });

  // 3. Retrieve context from DB
  const contextData = await _retrieveContext(intent, message, userId);

  // 4. Get conversation history
  const history = session.getContextWindow(6);

  // 5. Build prompt
  const promptMessages = _buildPromptMessages(contextData, history, message);

  // 6. Call LLM
  const reply = await _callOpenAI(promptMessages, false);

  // 7. Persist messages
  await chatSessionRepository.appendMessage(session, { role: 'user', content: message, intent });
  await chatSessionRepository.appendMessage(session, { role: 'assistant', content: reply });

  return { reply, intent, sessionId };
}

/**
 * Send message with SSE streaming response.
 * Returns a ReadableStream that the controller pipes to `res`.
 *
 * @param {string|null} userId
 * @param {string}      sessionId
 * @param {string}      message
 * @returns {Promise<{ stream: ReadableStream|null, intent: string, sessionId: string, session: Document }>}
 */
async function sendMessageStream(userId, sessionId, message) {
  const session = await chatSessionRepository.findOrCreate(sessionId, userId);

  if (session.messages.length === 0 || session.title === 'Cuộc trò chuyện mới') {
    await chatSessionRepository.setTitle(session, message.slice(0, 80));
  }

  const intent      = classifyIntent(message);
  const contextData = await _retrieveContext(intent, message, userId);
  const history     = session.getContextWindow(6);
  const promptMessages = _buildPromptMessages(contextData, history, message);

  // Persist the user message immediately
  await chatSessionRepository.appendMessage(session, { role: 'user', content: message, intent });

  logger.info({ msg: 'Chatbot SSE stream start', intent, sessionId });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Fallback: no streaming, return full text
    const fallback = _fallbackResponse(promptMessages);
    await chatSessionRepository.appendMessage(session, { role: 'assistant', content: fallback });
    return { stream: null, fallbackReply: fallback, intent, sessionId, session };
  }

  const stream = await _callOpenAI(promptMessages, true);
  return { stream, fallbackReply: null, intent, sessionId, session };
}

/**
 * Get chat session messages.
 *
 * @param {string} sessionId
 * @param {number} limit
 * @returns {Promise<object>}
 */
async function getSession(sessionId, limit = 20) {
  const session = await chatSessionRepository.getMessages(sessionId, limit);
  if (!session) throw new NotFoundError('Không tìm thấy phiên chat');
  return session;
}

/**
 * Delete a chat session.
 *
 * @param {string}      sessionId
 * @param {string|null} userId - If provided, enforces ownership check
 */
async function deleteSession(sessionId, userId) {
  let deleted;
  if (userId) {
    deleted = await chatSessionRepository.deleteBySessionIdAndUser(sessionId, userId);
  } else {
    deleted = await chatSessionRepository.deleteBySessionId(sessionId);
  }

  if (!deleted) throw new NotFoundError('Không tìm thấy phiên chat hoặc bạn không có quyền xoá');

  logger.info({ msg: 'Chat session deleted', sessionId, userId });
}

module.exports = {
  sendMessage,
  sendMessageStream,
  getSession,
  deleteSession,
  // Exported for testability
  classifyIntent,
};
