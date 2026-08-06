/**
 * Phonestore API Service Layer
 * Centralized API client connecting frontend to Express Backend (/api/...)
 */

const API_BASE = '/api';

// Realistic mock data fallback for immediate UI rendering
const MOCK_PRODUCTS = [
  {
    _id: 'p1',
    name: 'iPhone 16 Pro Max 256GB',
    slug: 'iphone-16-pro-max-256gb',
    brand: 'Apple',
    category: 'smartphone',
    price: 34990000,
    comparePrice: 36990000,
    stock: 25,
    soldCount: 142,
    avgRating: 4.9,
    reviewCount: 38,
    isFeatured: true,
    images: [{ url: 'https://res.cloudinary.com/demo/image/upload/v1689000000/iphone16pro.png', isPrimary: true }],
    specs: { ram: '8GB', storage: '256GB', display: '6.9 inch Super Retina XDR OLED 120Hz', battery: '4685 mAh', os: 'iOS 18', processor: 'Apple A18 Pro', camera: '48MP Main + 48MP Ultrawide + 12MP Telephoto 5x', color: 'Titan Sa Mạc' },
    description: 'iPhone 16 Pro Max sở hữu khung viền Titan chuẩn hàng không vũ trụ, chip A18 Pro đột phá cùng nút bấm Camera Control thế hệ mới.'
  },
  {
    _id: 'p2',
    name: 'Samsung Galaxy S24 Ultra 512GB',
    slug: 'samsung-galaxy-s24-ultra-512gb',
    brand: 'Samsung',
    category: 'smartphone',
    price: 31990000,
    comparePrice: 33990000,
    stock: 18,
    soldCount: 98,
    avgRating: 4.8,
    reviewCount: 29,
    isFeatured: true,
    images: [{ url: 'https://res.cloudinary.com/demo/image/upload/v1689000000/s24ultra.png', isPrimary: true }],
    specs: { ram: '12GB', storage: '512GB', display: '6.8 inch Dynamic AMOLED 2X 120Hz', battery: '5000 mAh', os: 'Android 14 (One UI 6.1)', processor: 'Snapdragon 8 Gen 3 for Galaxy', camera: '200MP + 50MP + 12MP + 10MP', color: 'Xám Titan' },
    description: 'Trải nghiệm đỉnh cao công nghệ AI di động với Galaxy AI, camera 200MP Zoom mắt thần đêm và bút S-Pen tích hợp tiện lợi.'
  },
  {
    _id: 'p3',
    name: 'Xiaomi 14 Ultra 16GB/512GB Leica',
    slug: 'xiaomi-14-ultra-16gb-512gb',
    brand: 'Xiaomi',
    category: 'smartphone',
    price: 27990000,
    comparePrice: 29990000,
    stock: 12,
    soldCount: 54,
    avgRating: 4.7,
    reviewCount: 19,
    isFeatured: true,
    images: [{ url: 'https://res.cloudinary.com/demo/image/upload/v1689000000/xiaomi14u.png', isPrimary: true }],
    specs: { ram: '16GB', storage: '512GB', display: '6.73 inch LTPO AMOLED 120Hz 3000nits', battery: '5000 mAh (Sạc 90W)', os: 'Xiaomi HyperOS', processor: 'Snapdragon 8 Gen 3', camera: '4 Camera Leica 50MP Cảm biến 1-inch', color: 'Đen Da' },
    description: 'Kiệt tác nhiếp ảnh di động đồng chế tác cùng Leica, trang bị bộ 4 ống kính quang học cao cấp nhất.'
  },
  {
    _id: 'p4',
    name: 'Apple iPad Pro M4 11 inch Wi-Fi 256GB',
    slug: 'apple-ipad-pro-m4-11-inch',
    brand: 'Apple',
    category: 'tablet',
    price: 28490000,
    comparePrice: 29990000,
    stock: 10,
    soldCount: 33,
    avgRating: 4.9,
    reviewCount: 15,
    isFeatured: false,
    images: [{ url: 'https://res.cloudinary.com/demo/image/upload/v1689000000/ipadpro.png', isPrimary: true }],
    specs: { ram: '8GB', storage: '256GB', display: '11 inch Ultra Retina XDR OLED', battery: '8160 mAh', os: 'iPadOS 18', processor: 'Apple M4', camera: '12MP Wide + LiDAR Scanner', color: 'Đen Không Gian' },
    description: 'Thiết kế mỏng chưa từng có, màn hình OLED Tandem đột phá cùng sức mạnh vô song từ con chip Apple M4.'
  },
  {
    _id: 'p5',
    name: 'Apple Watch Series 10 GPS 46mm',
    slug: 'apple-watch-series-10-gps-46mm',
    brand: 'Apple',
    category: 'smartwatch',
    price: 11490000,
    comparePrice: 11990000,
    stock: 30,
    soldCount: 76,
    avgRating: 4.8,
    reviewCount: 22,
    isFeatured: false,
    images: [{ url: 'https://res.cloudinary.com/demo/image/upload/v1689000000/aw10.png', isPrimary: true }],
    specs: { ram: 'N/A', storage: '64GB', display: 'OLED góc nhìn rộng sáng hơn 40%', battery: 'Up to 36 hours (Low Power)', os: 'watchOS 11', processor: 'Apple S10 SiP', camera: 'Không', color: 'Nhôm Nhám Jet Black' },
    description: 'Màn hình lớn nhất và mỏng nhất từng có trên Apple Watch, tính năng phát hiện ngưng thở khi ngủ chuẩn y khoa.'
  },
  {
    _id: 'p6',
    name: 'Tai nghe AirPods Pro 2 USB-C',
    slug: 'airpods-pro-2-usbc',
    brand: 'Apple',
    category: 'accessory',
    price: 5690000,
    comparePrice: 6190000,
    stock: 50,
    soldCount: 210,
    avgRating: 4.9,
    reviewCount: 88,
    isFeatured: true,
    images: [{ url: 'https://res.cloudinary.com/demo/image/upload/v1689000000/airpodspro2.png', isPrimary: true }],
    specs: { ram: 'N/A', storage: 'N/A', display: 'N/A', battery: '6 giờ nghe liên tục (30h với hộp)', os: 'N/A', processor: 'Apple H2', camera: 'N/A', color: 'Trắng' },
    description: 'Chống ồn chủ động gấp 2 lần, chế độ Xuyên Âm Thích Ứng và âm thanh vòm Spatial Audio theo dõi chuyển động đầu.'
  }
];

export const API = {
  // Helper for HTTP requests with automatic fallback
  async request(endpoint, options = {}) {
    try {
      const config = {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options
      };
      const res = await fetch(`${API_BASE}${endpoint}`, config);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Lỗi kết nối (${res.status})`);
      }
      return await res.json();
    } catch (err) {
      console.warn(`[API Call Fallback] ${endpoint}:`, err.message);
      return null; // Return null so service callers can use fallback mock data
    }
  },

  // ── Products API ──────────────────────────────────────────────────────────
  async getProducts(params = {}) {
    const res = await this.request(`/products?${new URLSearchParams(params).toString()}`);
    if (res && res.data) return res;

    // Fallback filter algorithm
    let filtered = [...MOCK_PRODUCTS];
    if (params.category && params.category !== 'all') {
      filtered = filtered.filter(p => p.category === params.category);
    }
    if (params.brand) {
      const brands = params.brand.split(',');
      filtered = filtered.filter(p => brands.includes(p.brand));
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q));
    }
    if (params.minPrice) filtered = filtered.filter(p => p.price >= Number(params.minPrice));
    if (params.maxPrice) filtered = filtered.filter(p => p.price <= Number(params.maxPrice));

    // Sort
    if (params.sort === 'price_asc') filtered.sort((a, b) => a.price - b.price);
    else if (params.sort === 'price_desc') filtered.sort((a, b) => b.price - a.price);
    else if (params.sort === 'popular') filtered.sort((a, b) => b.soldCount - a.soldCount);
    else filtered.sort((a, b) => b.price - a.price); // default

    return {
      status: 'success',
      total: filtered.length,
      data: filtered
    };
  },

  async getProductBySlugOrId(idOrSlug) {
    const res = await this.request(`/products/${idOrSlug}`);
    if (res && res.data) return res.data;
    return MOCK_PRODUCTS.find(p => p._id === idOrSlug || p.slug === idOrSlug) || MOCK_PRODUCTS[0];
  },

  // ── Auth API ──────────────────────────────────────────────────────────────
  async login(email, password) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (res && res.data) return res.data;
    // Fallback demo user
    return {
      user: { _id: 'u1', name: 'Nguyễn Văn A', email, role: 'customer' },
      token: 'demo-jwt-token'
    };
  },

  async register(name, email, password) {
    const res = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
    if (res && res.data) return res.data;
    return {
      user: { _id: 'u2', name, email, role: 'customer' },
      token: 'demo-jwt-token-reg'
    };
  },

  // ── Cart & Order API ──────────────────────────────────────────────────────
  async checkoutOrder(orderData) {
    const res = await this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
    if (res && res.data) return res.data;
    // Fallback mock order result
    return {
      _id: 'ord_' + Math.random().toString(36).substring(2, 9),
      orderCode: 'PS-' + Math.floor(100000 + Math.random() * 900000),
      totalAmount: orderData.totalAmount,
      paymentMethod: orderData.paymentMethod,
      paymentUrl: orderData.paymentMethod === 'vnpay' ? 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=3499000000' : null,
      status: 'pending'
    };
  },

  // ── AI Chatbot API ────────────────────────────────────────────────────────
  async sendChatMessage(message, sessionId) {
    const res = await this.request('/chatbot/message', {
      method: 'POST',
      body: JSON.stringify({ message, sessionId })
    });
    if (res && res.reply) return res;

    // Fallback AI Smart Response
    let reply = `Chào bạn! Tôi là Trợ lý AI Phonestore. Rất vui được hỗ trợ bạn tìm kiếm mẫu điện thoại phù hợp nhất.`;
    const q = message.toLowerCase();
    if (q.includes('iphone') || q.includes('apple')) {
      reply = `iPhone 16 Pro Max hiện là mẫu flagship cao cấp nhất của Apple với viền Titan và chip A18 Pro cực mạnh. Giá ưu đãi chỉ từ 34.990.000đ!`;
    } else if (q.includes('samsung') || q.includes('s24')) {
      reply = `Samsung Galaxy S24 Ultra với bộ công cụ Galaxy AI thông minh và camera 200MP đang có chương trình giảm 2.000.000đ trực tiếp!`;
    } else if (q.includes('rẻ') || q.includes('giá')) {
      reply = `Phonestore hỗ trợ trả góp 0% lãi suất và cam kết giá tốt nhất thị trường cùng chính sách bảo hành 1 đổi 1 trong 30 ngày!`;
    }

    return {
      reply,
      sessionId: sessionId || 'sess_demo_123',
      recommendations: [MOCK_PRODUCTS[0], MOCK_PRODUCTS[1]]
    };
  },

  // ── Admin Stats API ───────────────────────────────────────────────────────
  async getAdminStats() {
    const res = await this.request('/admin/stats');
    if (res && res.data) return res.data;
    return {
      revenue: 1458900000,
      totalOrders: 342,
      totalProducts: MOCK_PRODUCTS.length,
      activeUsers: 1250,
      recentOrders: [
        { id: 'ORD-9821', customer: 'Trần Văn Nam', total: 34990000, status: 'Completed', date: 'Vừa xong' },
        { id: 'ORD-9820', customer: 'Lê Thị Mai', total: 31990000, status: 'Processing', date: '5 phút trước' },
        { id: 'ORD-9819', customer: 'Phạm Hoàng Long', total: 5690000, status: 'Shipping', date: '20 phút trước' }
      ]
    };
  }
};
