'use strict';

const chatSessionRepository = require('../../repositories/chatSession.repository');
const productRepository     = require('../../repositories/product.repository');
const orderRepository       = require('../../repositories/order.repository');
const { NotFoundError }     = require('../../utils/errors');
const { logger }            = require('../../utils/logger');
const { Product }           = require('../../models');

/**
 * Enhanced Intent & Criteria Extraction Engine
 * Parses user text & conversation context into explicit query parameters:
 * { intent, brand, category, model, minPrice, maxPrice, useCase, isComparison, isGeneralInfo, brands }
 */

const BRAND_ALIASES = {
  samsung: 'Samsung',
  'sam sung': 'Samsung',
  apple: 'Apple',
  iphone: 'Apple',
  ipad: 'Apple',
  airpods: 'Apple',
  xiaomi: 'Xiaomi',
  redmi: 'Xiaomi',
  poco: 'Xiaomi',
  oppo: 'OPPO',
  vivo: 'Vivo',
  realme: 'Realme',
  garmin: 'Garmin',
  jbl: 'JBL',
  anker: 'Anker',
  asus: 'ASUS',
  rog: 'ASUS',
  lenovo: 'Lenovo',
  sony: 'Sony',
  google: 'Google',
  pixel: 'Google'
};

function parseUserCriteria(message, historyContext = []) {
  const text = message.toLowerCase().trim();

  // 1. General Info / Q&A Check (e.g. "Samsung là hãng gì?", "chính sách bảo hành", "Phonestore ở đâu")
  const isGeneralInfo = /là (hãng|công ty|gì)|thành lập|ở đâu|địa chỉ|bảo hành|đổi trả|giao hàng như thế nào|khái niệm/i.test(message) &&
                        !/tư vấn|gợi ý|tìm|mua|bán|giá|bao nhiêu|mẫu|con|máy/i.test(message);

  // 2. Comparison Detection (e.g. "Samsung hay iPhone tốt hơn?", "so sánh S24 vs iPhone 15")
  const isComparison = /so sánh|versus|\bvs\b|hay là|tốt hơn|khác (gì|nhau)|nên (chọn|mua) .+ (hay|hoặc)/i.test(message) ||
                       (/samsung/i.test(message) && /iphone|apple/i.test(message) && /hay|hoặc|vs|so sánh|với/i.test(message));

  // 3. Order Tracking Intent
  const isOrderTracking = /đơn hàng|order|trạng thái|giao hàng|đã đặt|tracking|vận chuyển|đã ship|khi nào nhận/i.test(message);

  // 4. Extract Brands
  let detectedBrands = [];
  if (/samsung|sam sung/i.test(message)) detectedBrands.push('Samsung');
  if (/iphone|apple|ipad|airpods/i.test(message)) detectedBrands.push('Apple');
  if (/xiaomi|redmi|poco/i.test(message)) detectedBrands.push('Xiaomi');
  if (/oppo|reno/i.test(message)) detectedBrands.push('OPPO');
  if (/vivo/i.test(message)) detectedBrands.push('Vivo');
  if (/realme/i.test(message)) detectedBrands.push('Realme');
  if (/garmin/i.test(message)) detectedBrands.push('Garmin');
  if (/jbl/i.test(message)) detectedBrands.push('JBL');
  if (/anker/i.test(message)) detectedBrands.push('Anker');

  let brand = detectedBrands.length === 1 ? detectedBrands[0] : null;

  // 5. Extract Category
  let category = null;
  if (/máy tính bảng|ipad|\btab\b/i.test(message)) category = 'tablet';
  else if (/đồng hồ|watch|smartwatch/i.test(message)) category = 'smartwatch';
  else if (/tai nghe|headphone|earbuds|buds|airpods|củ sạc|sạc|cáp|ốp lưng|loa|phụ kiện|accessory/i.test(message)) category = 'accessory';
  else if (/điện thoại|phone|smartphone|\bmáy\b|dế/i.test(message) || /iphone|galaxy s|galaxy a|galaxy z|reno|redmi note/i.test(message)) category = 'smartphone';

  // Specific keyword alias category override
  if (/airpods/i.test(message)) { brand = 'Apple'; category = 'accessory'; }
  if (/ipad/i.test(message)) { brand = 'Apple'; category = 'tablet'; }
  if (/apple watch/i.test(message)) { brand = 'Apple'; category = 'smartwatch'; }
  if (/galaxy watch/i.test(message)) { brand = 'Samsung'; category = 'smartwatch'; }
  if (/galaxy tab/i.test(message)) { brand = 'Samsung'; category = 'tablet'; }
  if (/galaxy buds/i.test(message)) { brand = 'Samsung'; category = 'accessory'; }

  // 6. Extract Price Limits
  let minPrice = undefined;
  let maxPrice = undefined;

  // Range: "từ 10 đến 20 triệu", "10-20tr", "10 đến 20tr"
  const rangeMatch = message.match(/(từ|from)?\s*(\d+)\s*(đến|to|-)\s*(\d+)\s*(triệu|tr|million|m)/i);
  if (rangeMatch) {
    minPrice = parseInt(rangeMatch[2], 10) * 1_000_000;
    maxPrice = parseInt(rangeMatch[4], 10) * 1_000_000;
  }

  // Under / Max: "dưới 15 triệu", "dưới 15tr", "< 15 triệu", "rẻ hơn 15 triệu", "tối đa 15tr"
  if (!maxPrice) {
    const underMatch = message.match(/(dưới|under|<|nhỏ hơn|rẻ hơn|tối đa|mức|ngân sách)\s*(\d+)\s*(triệu|tr|million|m)/i);
    if (underMatch) {
      maxPrice = parseInt(underMatch[2], 10) * 1_000_000;
    }
  }

  // Around / Approx: "khoảng 15 triệu", "tầm 15 triệu", "quanh 15tr"
  if (!maxPrice && !minPrice) {
    const aroundMatch = message.match(/(khoảng|tầm|around|about|ngân sách)\s*(\d+)\s*(triệu|tr|million|m)/i);
    if (aroundMatch) {
      const base = parseInt(aroundMatch[2], 10) * 1_000_000;
      minPrice = Math.round(base * 0.75);
      maxPrice = Math.round(base * 1.25);
    }
  }

  // Over / Min: "trên 20 triệu", "> 20tr", "lớn hơn 20tr"
  if (!minPrice) {
    const overMatch = message.match(/(trên|over|>|lớn hơn|hơn)\s*(\d+)\s*(triệu|tr|million|m)/i);
    if (overMatch) {
      minPrice = parseInt(overMatch[2], 10) * 1_000_000;
    }
  }

  // Raw number without unit: e.g. "dưới 15"
  if (!maxPrice && !minPrice) {
    const rawMatch = message.match(/(dưới|<)\s*(\d{1,2})\b/i);
    if (rawMatch) {
      maxPrice = parseInt(rawMatch[2], 10) * 1_000_000;
    }
  }

  // 7. Extract Use Cases
  let useCase = null;
  if (/chơi game|gaming|game|cấu hình|hiệu năng|chip/i.test(message)) useCase = 'gaming';
  else if (/chụp ảnh|camera|quay video|nhiếp ảnh|sắc nét/i.test(message)) useCase = 'photography';
  else if (/pin trâu|pin lâu|dung lượng pin|pin trâu/i.test(message)) useCase = 'battery';
  else if (/giá rẻ|bình dân|học sinh|sinh viên|tiết kiệm/i.test(message)) useCase = 'budget';
  else if (/cao cấp|flagship|sang trọng|xịn/i.test(message)) useCase = 'premium';

  // 8. Context Inheritance (Requirement 15)
  // Read previous turns to inherit brand, category, or price if user didn't specify a conflicting brand
  if (historyContext && historyContext.length > 0) {
    for (let i = historyContext.length - 1; i >= 0; i--) {
      const pastMsg = historyContext[i];
      if (pastMsg.role === 'user') {
        const pastCriteria = parseUserCriteria(pastMsg.content, []);
        
        // Inherit brand if current turn didn't specify a brand and didn't ask for comparison
        if (!brand && !isComparison && pastCriteria.brand) {
          brand = pastCriteria.brand;
        }
        // Inherit category if current turn didn't specify category
        if (!category && pastCriteria.category) {
          category = pastCriteria.category;
        }
        // Inherit maxPrice if current turn didn't specify price limits
        if (maxPrice === undefined && minPrice === undefined && pastCriteria.maxPrice) {
          maxPrice = pastCriteria.maxPrice;
          minPrice = pastCriteria.minPrice;
        }
        break;
      }
    }
  }

  // Default category to smartphone if brand is specified or general shopping intent
  if (!category && (brand || !isGeneralInfo)) {
    category = 'smartphone';
  }

  let intent = 'product_search';
  if (isOrderTracking) intent = 'order_status';
  else if (isComparison) intent = 'comparison';
  else if (isGeneralInfo) intent = 'general_info';

  return {
    intent,
    brand,
    brands: detectedBrands.length > 1 ? detectedBrands : (brand ? [brand] : []),
    category,
    minPrice,
    maxPrice,
    useCase,
    isComparison,
    isGeneralInfo
  };
}

/**
 * Execute strict MongoDB query and rank results accurately based on criteria.
 */
async function retrieveProductsForChatbot(criteria, message) {
  const { brand, brands, category, minPrice, maxPrice, useCase, isComparison } = criteria;

  // Handle Comparison Intent: Query products for each specified brand
  if (isComparison && brands.length >= 2) {
    const brandProducts = await Promise.all(
      brands.map(b =>
        productRepository.findAll({
          brand: b,
          category: category || 'smartphone',
          inStock: true,
          limit: 3,
          sort: 'popular'
        })
      )
    );

    const recommendations = brandProducts.flatMap(r => r.products || []).slice(0, 4);

    let listText = brands.map((b, idx) => {
      const items = (brandProducts[idx]?.products || []).map(p =>
        `- ${p.name}: ${new Intl.NumberFormat('vi-VN').format(p.price)}₫ | RAM: ${p.specs?.ram || 'N/A'} | Pin: ${p.specs?.battery || 'N/A'} | Camera: ${p.specs?.camera || 'N/A'}`
      ).join('\n');
      return `📱 **THƯƠNG HIỆU ${b.toUpperCase()}**:\n${items || 'Chưa có sản phẩm phù hợp.'}`;
    }).join('\n\n');

    return {
      contextData: `DỮ LIỆU SO SÁNH GIỮA CÁC THƯƠNG HIỆU:\n${listText}`,
      recommendations,
      noExactPriceMatch: false
    };
  }

  // 1. Strict Query Params
  const queryParams = {
    inStock: true,
    limit: 10,
    page: 1
  };
  if (brand) queryParams.brand = brand;
  if (category) queryParams.category = category;
  if (minPrice !== undefined) queryParams.minPrice = minPrice;
  if (maxPrice !== undefined) queryParams.maxPrice = maxPrice;

  let { products } = await productRepository.findAll(queryParams);

  let noExactPriceMatch = false;

  // 2. Strict Brand Enforcement (Requirement 11)
  // If no products match strict brand + price, DO NOT DROP BRAND FILTER!
  // Perform relaxed query ONLY for the specified brand to find closest matching products.
  if ((!products || products.length === 0) && brand) {
    noExactPriceMatch = true;
    const relaxedBrandParams = {
      brand: brand,
      category: category || 'smartphone',
      inStock: true,
      sort: 'price_asc',
      limit: 4
    };
    const relaxedRes = await productRepository.findAll(relaxedBrandParams);
    products = relaxedRes.products || [];
  }

  // If no brand specified and 0 products match price, query general products matching price/category
  if ((!products || products.length === 0) && !brand) {
    const fallbackRes = await productRepository.findAll({
      category: category || 'smartphone',
      inStock: true,
      limit: 5,
      sort: 'popular'
    });
    products = fallbackRes.products || [];
  }

  // 3. Rank products based on useCase & search query
  if (products && products.length > 0) {
    products.sort((a, b) => {
      // High score for exact brand match
      if (brand) {
        const aBrand = (a.brand || '').toLowerCase() === brand.toLowerCase();
        const bBrand = (b.brand || '').toLowerCase() === brand.toLowerCase();
        if (aBrand && !bBrand) return -1;
        if (!aBrand && bBrand) return 1;
      }

      // Ranking based on UseCase
      if (useCase === 'gaming') {
        const aRam = parseInt(a.specs?.ram || '0', 10);
        const bRam = parseInt(b.specs?.ram || '0', 10);
        if (aRam !== bRam) return bRam - aRam;
      } else if (useCase === 'photography') {
        if ((a.avgRating || 0) !== (b.avgRating || 0)) {
          return (b.avgRating || 0) - (a.avgRating || 0);
        }
      } else if (useCase === 'budget') {
        return a.price - b.price;
      } else if (useCase === 'premium') {
        return b.price - a.price;
      }

      return (b.soldCount || 0) - (a.soldCount || 0);
    });
  }

  // Limit to MAX 3 - 5 products (Requirement 13)
  const topProducts = (products || []).slice(0, 4);

  if (topProducts.length === 0) {
    return {
      contextData: `Hiện tại Phonestore chưa tìm thấy sản phẩm ${brand || ''} phù hợp với yêu cầu của bạn.`,
      recommendations: [],
      noExactPriceMatch: false
    };
  }

  const formattedList = topProducts.map((p, i) => {
    const priceStr = new Intl.NumberFormat('vi-VN').format(p.price);
    const specsStr = p.specs ? Object.entries(p.specs).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(' | ') : '';
    return `${i + 1}. ${p.name} — Giá: ${priceStr}₫ | Đánh giá: ⭐ ${p.avgRating || 5}/5 (${p.reviewCount || 10} review) | Thông số: ${specsStr} | Slug: ${p.slug}`;
  }).join('\n');

  let contextHeader = `DANH SÁCH SẢN PHẨM PHÙ HỢP (${topProducts.length} sản phẩm từ Database):\n${formattedList}`;
  if (noExactPriceMatch && brand && maxPrice) {
    const maxPriceStr = new Intl.NumberFormat('vi-VN').format(maxPrice);
    contextHeader = `LƯU Ý: Không tìm thấy sản phẩm ${brand} có giá dưới ${maxPriceStr}₫. Dưới đây là các sản phẩm ${brand} có giá tốt nhất hiện có tại cửa hàng:\n${formattedList}`;
  }

  return {
    contextData: contextHeader,
    recommendations: topProducts,
    noExactPriceMatch
  };
}

// ── System prompt builder ─────────────────────────────────────────────────────

const BASE_SYSTEM_PROMPT = `Bạn là Trợ lý tư vấn sản phẩm AI của cửa hàng Phonestore.

QUY TẮC CỨNG (TUYỆT ĐỐI NGHÊM NGẶT):
1. CHỈ tư vấn và đưa ra các sản phẩm trong DỮ LIỆU TỪ HỆ THỐNG bên dưới. KHÔNG ĐƯỢC TỰ BỊA sản phẩm, giá cả, thông số RAM/ROM, pin hay tồn kho.
2. NẾU KHÁCH HÀNG YÊU CẦU MỘT THƯƠNG HIỆU CỤ THỂ (Ví dụ: Samsung, iPhone/Apple, Xiaomi, OPPO...):
   - CHỈ ĐƯỢC TƯ VẤN VÀ HIỂN THỊ CÁC SẢN PHẨM THUỘC THƯƠNG HIỆU ĐÓ.
   - TUYỆT ĐỐI KHÔNG ĐƯỢC ĐƯA THƯƠNG HIỆU KHÁC (như iPhone, Xiaomi...) vào câu trả lời trừ khi người dùng chủ động hỏi so sánh.
3. NẾU KHÔNG CÓ SẢN PHẨM PHÙ HỢP VỚI MỨC GIÁ YÊU CẦU:
   - Thông báo rõ ràng: "Hiện tại cửa hàng chưa có sản phẩm [Brand] phù hợp dưới [Giá]. Bạn có muốn tham khảo các mẫu [Brand] ở mức giá gần nhất không?"
   - KHÔNG ĐƯỢC tự động đổi sang thương hiệu khác.
4. Trả lời ngắn gọn, lịch sự, đúng trọng tâm. Định dạng danh sách rõ ràng (Tên, Giá, Điểm nổi bật) và kết thúc bằng câu hỏi gợi mở nhu cầu (ví dụ: camera, pin, gaming).`;

function _buildPromptMessages(contextData, history, userMessage) {
  const messages = [];

  let systemContent = BASE_SYSTEM_PROMPT;
  if (contextData) {
    systemContent += `\n\nDỮ LIỆU TỪ HỆ THỐNG:\n${contextData}`;
  }
  messages.push({ role: 'system', content: systemContent });

  // Conversation history (last 6 exchanges)
  for (const msg of history) {
    messages.push({ role: msg.role, content: msg.content });
  }

  messages.push({ role: 'user', content: userMessage });
  return messages;
}

// ── OpenAI API call & Fallback Generator ─────────────────────────────────────

async function _callOpenAI(messages, stream = false) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logger.warn('OPENAI_API_KEY not set — using enhanced dynamic response generator');
    return _generateDynamicResponse(messages);
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  try {
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
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error({ msg: 'OpenAI API error', status: response.status, body: errorBody });
      return _generateDynamicResponse(messages);
    }

    if (stream) return response.body;

    const data = await response.json();
    return data.choices?.[0]?.message?.content || _generateDynamicResponse(messages);
  } catch (err) {
    logger.error({ msg: 'OpenAI call exception — falling back to local generator', err: err.message });
    return _generateDynamicResponse(messages);
  }
}

/**
 * Smart dynamic response generator for offline / fallback mode.
 * Fulfills all formatting, brand restrictions, and pricing rules.
 */
function _generateDynamicResponse(messages) {
  const systemMsg = messages.find(m => m.role === 'system');
  const userMsg = messages[messages.length - 1]?.content || '';
  const content = systemMsg?.content || '';

  if (content.includes('LƯU Ý: Không tìm thấy sản phẩm')) {
    const section = content.split('DỮ LIỆU TỪ HỆ THỐNG:\n')[1] || '';
    const productLines = section.split('\n').filter(l => /^\d+\./.test(l.trim()));
    
    return `Hiện tại Phonestore chưa có sản phẩm theo mức giá bạn yêu cầu. Tuy nhiên, cửa hàng có các mẫu cùng thương hiệu với mức giá ưu đãi nhất hiện có:\n\n${productLines.join('\n')}\n\nBạn có muốn tham khảo chi tiết mẫu nào không?`;
  }

  if (content.includes('DANH SÁCH SẢN PHẨM PHÙ HỢP')) {
    const section = content.split('DANH SÁCH SẢN PHẨM PHÙ HỢP')[1] || '';
    const productLines = section.split('\n').filter(l => /^\d+\./.test(l.trim()));

    return `Dưới đây là các sản phẩm phù hợp nhất theo yêu cầu của bạn tại Phonestore:\n\n${productLines.join('\n')}\n\nBạn ưu tiên tính năng chụp ảnh, hiệu năng chơi game hay dung lượng pin để mình tư vấn mẫu tốt nhất?`;
  }

  if (content.includes('DỮ LIỆU SO SÁNH GIỮA CÁC THƯƠNG HIỆU')) {
    const section = content.split('DỮ LIỆU SO SÁNH GIỮA CÁC THƯƠNG HIỆU:\n')[1] || '';
    return `📊 **SO SÁNH CÁC DÒNG SẢN PHẨM**:\n\n${section}\n\nBạn cần thông tin chi tiết hơn về dòng máy nào?`;
  }

  if (content.includes('ĐƠN HÀNG GẦN NHẤT')) {
    const section = content.split('ĐƠN HÀNG GẦN NHẤT')[1] || '';
    return `📦 **THÔNG TIN ĐƠN HÀNG CỦA BẠN**:\n\n${section}\n\nBạn cần hỗ trợ thêm gì về đơn hàng này không?`;
  }

  return `Xin chào! 👋 Tôi là Trợ lý tư vấn AI của Phonestore. Tôi có thể hỗ trợ bạn:\n\n• 📱 Tìm kiếm điện thoại theo hãng (Samsung, iPhone, Xiaomi, OPPO...)\n• 💰 Lọc sản phẩm theo tầm giá (dưới 10tr, 15-20tr...)\n• 🎮 Gợi ý điện thoại theo nhu cầu (chơi game, chụp ảnh, pin trâu...)\n• 📊 So sánh các dòng máy\n\nBạn đang quan tâm đến sản phẩm nào?`;
}

// ── Public API ────────────────────────────────────────────────────────────────

async function sendMessage(userId, sessionId, message) {
  const session = await chatSessionRepository.findOrCreate(sessionId, userId);

  if (session.messages.length === 0 || session.title === 'Cuộc trò chuyện mới') {
    await chatSessionRepository.setTitle(session, message.slice(0, 80));
  }

  const history = session.getContextWindow(6);
  const criteria = parseUserCriteria(message, history);
  logger.info({ msg: 'Chatbot parsed criteria', criteria, sessionId, userId });

  let contextData = '';
  let recommendations = [];

  if (criteria.intent === 'order_status') {
    if (!userId) {
      contextData = 'Người dùng chưa đăng nhập. Yêu cầu đăng nhập để xem thông tin đơn hàng.';
    } else {
      const { orders } = await orderRepository.findByUser(userId, { page: 1, limit: 3 });
      if (!orders || orders.length === 0) {
        contextData = 'Người dùng chưa có đơn hàng nào.';
      } else {
        const list = orders.map((o, i) =>
          `${i + 1}. Đơn #${o._id.toString().slice(-6)} | Trạng thái: ${o.status} | Tổng tiền: ${new Intl.NumberFormat('vi-VN').format(o.totalPrice)}₫`
        ).join('\n');
        contextData = `ĐƠN HÀNG GẦN NHẤT:\n${list}`;
      }
    }
  } else if (criteria.isGeneralInfo) {
    contextData = 'CÂU HỎI THÔNG TIN CHUNG: Người dùng hỏi về khái niệm/hãng/chính sách. Hãy trả lời ngắn gọn, thân thiện.';
  } else {
    const res = await retrieveProductsForChatbot(criteria, message);
    contextData = res.contextData;
    recommendations = res.recommendations;
  }

  const promptMessages = _buildPromptMessages(contextData, history, message);
  const reply = await _callOpenAI(promptMessages, false);

  await chatSessionRepository.appendMessage(session, { role: 'user', content: message, intent: criteria.intent });
  await chatSessionRepository.appendMessage(session, { role: 'assistant', content: reply });

  return { reply, intent: criteria.intent, criteria, sessionId, recommendations };
}

async function sendMessageStream(userId, sessionId, message) {
  const session = await chatSessionRepository.findOrCreate(sessionId, userId);

  if (session.messages.length === 0 || session.title === 'Cuộc trò chuyện mới') {
    await chatSessionRepository.setTitle(session, message.slice(0, 80));
  }

  const history = session.getContextWindow(6);
  const criteria = parseUserCriteria(message, history);
  
  let contextData = '';
  let recommendations = [];

  if (criteria.intent === 'order_status') {
    if (!userId) {
      contextData = 'Người dùng chưa đăng nhập.';
    } else {
      const { orders } = await orderRepository.findByUser(userId, { page: 1, limit: 3 });
      contextData = orders?.length ? `ĐƠN HÀNG:\n${orders.map(o => o.orderCode).join(', ')}` : 'Chưa có đơn hàng.';
    }
  } else if (!criteria.isGeneralInfo) {
    const res = await retrieveProductsForChatbot(criteria, message);
    contextData = res.contextData;
    recommendations = res.recommendations;
  }

  const promptMessages = _buildPromptMessages(contextData, history, message);
  await chatSessionRepository.appendMessage(session, { role: 'user', content: message, intent: criteria.intent });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const fallback = _generateDynamicResponse(promptMessages);
    await chatSessionRepository.appendMessage(session, { role: 'assistant', content: fallback });
    return { stream: null, fallbackReply: fallback, intent: criteria.intent, criteria, sessionId, recommendations, session };
  }

  const stream = await _callOpenAI(promptMessages, true);
  return { stream, fallbackReply: null, intent: criteria.intent, criteria, sessionId, recommendations, session };
}

async function getSession(sessionId, limit = 20) {
  const session = await chatSessionRepository.getMessages(sessionId, limit);
  if (!session) throw new NotFoundError('Không tìm thấy phiên chat');
  return session;
}

async function deleteSession(sessionId, userId) {
  let deleted;
  if (userId) {
    deleted = await chatSessionRepository.deleteBySessionIdAndUser(sessionId, userId);
  } else {
    deleted = await chatSessionRepository.deleteBySessionId(sessionId);
  }
  if (!deleted) throw new NotFoundError('Không tìm thấy phiên chat');
}

module.exports = {
  sendMessage,
  sendMessageStream,
  getSession,
  deleteSession,
  parseUserCriteria,
  retrieveProductsForChatbot
};
