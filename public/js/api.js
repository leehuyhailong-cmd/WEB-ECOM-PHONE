/**
 * Phonestore API Service Layer
 * Centralized API client connecting frontend to Express Backend (/api/...)
 */

const API_BASE = '/api';

// ── Realistic Mock Product Data ──────────────────────────────────────────────
const MOCK_PRODUCTS = [
  // ── SMARTPHONES ──────────────────────────────────────────────────────────
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
    images: [{ url: 'https://cdn2.cellphones.com.vn/insecure/rs:fill:358:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/i/p/iphone-16-pro-max-titan-sa-mac_4.png', isPrimary: true }],
    specs: { ram: '8GB', storage: '256GB', display: '6.9 inch Super Retina XDR OLED 120Hz', battery: '4685 mAh', os: 'iOS 18', processor: 'Apple A18 Pro', camera: '48MP Main + 48MP Ultrawide + 12MP Telephoto 5x', color: 'Titan Sa Mạc' },
    description: 'iPhone 16 Pro Max sở hữu khung viền Titan chuẩn hàng không vũ trụ, chip A18 Pro đột phá cùng nút bấm Camera Control thế hệ mới.'
  },
  {
    _id: 'p2',
    name: 'iPhone 15 Pro 128GB',
    slug: 'iphone-15-pro-128gb',
    brand: 'Apple',
    category: 'smartphone',
    price: 27990000,
    comparePrice: 29990000,
    stock: 20,
    soldCount: 210,
    avgRating: 4.8,
    reviewCount: 56,
    isFeatured: false,
    images: [{ url: 'https://cdn2.cellphones.com.vn/insecure/rs:fill:358:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/i/p/iphone-15-pro-128gb-titan-den_2.png', isPrimary: true }],
    specs: { ram: '8GB', storage: '128GB', display: '6.1 inch Super Retina XDR OLED 120Hz ProMotion', battery: '3274 mAh', os: 'iOS 17', processor: 'Apple A17 Pro', camera: '48MP Main + 12MP Ultrawide + 12MP Telephoto 3x', color: 'Titan Đen' },
    description: 'iPhone 15 Pro với thiết kế Titan nhẹ hơn, nút Action Button đa năng và chip A17 Pro mạnh mẽ nhất từ trước đến nay.'
  },
  {
    _id: 'p3',
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
    images: [{ url: 'https://cdn2.cellphones.com.vn/insecure/rs:fill:358:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/s/a/samsung-galaxy-s24-ultra-512gb-titan-den_3.png', isPrimary: true }],
    specs: { ram: '12GB', storage: '512GB', display: '6.8 inch Dynamic AMOLED 2X 120Hz', battery: '5000 mAh', os: 'Android 14 (One UI 6.1)', processor: 'Snapdragon 8 Gen 3 for Galaxy', camera: '200MP + 50MP + 12MP + 10MP', color: 'Xám Titan' },
    description: 'Trải nghiệm đỉnh cao công nghệ AI di động với Galaxy AI, camera 200MP Zoom mắt thần đêm và bút S-Pen tích hợp tiện lợi.'
  },
  {
    _id: 'p4',
    name: 'Samsung Galaxy S24+ 256GB',
    slug: 'samsung-galaxy-s24-plus-256gb',
    brand: 'Samsung',
    category: 'smartphone',
    price: 22990000,
    comparePrice: 24990000,
    stock: 15,
    soldCount: 73,
    avgRating: 4.7,
    reviewCount: 21,
    isFeatured: false,
    images: [{ url: 'https://cdn2.cellphones.com.vn/insecure/rs:fill:358:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/s/a/samsung-galaxy-s24-256gb-den_2.png', isPrimary: true }],
    specs: { ram: '12GB', storage: '256GB', display: '6.7 inch Dynamic AMOLED 2X 120Hz', battery: '4900 mAh', os: 'Android 14', processor: 'Snapdragon 8 Gen 3', camera: '50MP + 12MP + 10MP', color: 'Đen Onyx' },
    description: 'Màn hình tràn viền đẹp mắt, pin lớn 4900mAh với sạc nhanh 45W và Galaxy AI thông minh.'
  },
  {
    _id: 'p5',
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
    images: [{ url: 'https://cdn2.cellphones.com.vn/insecure/rs:fill:358:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/x/i/xiaomi-14-ultra-den.png', isPrimary: true }],
    specs: { ram: '16GB', storage: '512GB', display: '6.73 inch LTPO AMOLED 120Hz 3000nits', battery: '5000 mAh (Sạc 90W)', os: 'Xiaomi HyperOS', processor: 'Snapdragon 8 Gen 3', camera: '4 Camera Leica 50MP Cảm biến 1-inch', color: 'Đen Da' },
    description: 'Kiệt tác nhiếp ảnh di động đồng chế tác cùng Leica, trang bị bộ 4 ống kính quang học cao cấp nhất.'
  },
  {
    _id: 'p6',
    name: 'OPPO Reno 11 Pro 5G 12GB/256GB',
    slug: 'oppo-reno-11-pro-5g',
    brand: 'OPPO',
    category: 'smartphone',
    price: 10990000,
    comparePrice: 12490000,
    stock: 22,
    soldCount: 87,
    avgRating: 4.6,
    reviewCount: 31,
    isFeatured: false,
    images: [{ url: 'https://cdn2.cellphones.com.vn/insecure/rs:fill:358:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/o/p/oppo-reno11-pro-xanh-duong-dem.png', isPrimary: true }],
    specs: { ram: '12GB', storage: '256GB', display: '6.7 inch AMOLED 120Hz 2412x1080', battery: '4600 mAh (Sạc 80W)', os: 'Android 14 (ColorOS 14)', processor: 'MediaTek Dimensity 8200', camera: '50MP Sony LYT-600 + 32MP Telephoto 2x + 8MP', color: 'Xanh Dương Đêm' },
    description: 'Thiết kế sang trọng đặc trưng OPPO, camera chân dung hàng đầu phân khúc và sạc siêu tốc 80W.'
  },
  {
    _id: 'p7',
    name: 'Xiaomi Redmi Note 13 Pro+ 5G 12GB/256GB',
    slug: 'xiaomi-redmi-note-13-pro-plus-5g',
    brand: 'Xiaomi',
    category: 'smartphone',
    price: 8990000,
    comparePrice: 9990000,
    stock: 35,
    soldCount: 165,
    avgRating: 4.6,
    reviewCount: 48,
    isFeatured: false,
    images: [{ url: 'https://cdn2.cellphones.com.vn/insecure/rs:fill:358:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/r/e/redmi-note-13-pro-plus-trang.png', isPrimary: true }],
    specs: { ram: '12GB', storage: '256GB', display: '6.67 inch AMOLED 120Hz 1800nits IP68', battery: '5000 mAh (Sạc 120W)', os: 'MIUI 14', processor: 'Dimensity 7200 Ultra', camera: '200MP + 8MP Ultrawide + 2MP', color: 'Trắng Ngọc Trai' },
    description: 'Camera 200MP đỉnh cao phân khúc tầm trung, sạc siêu tốc 120W và chống nước IP68 chuẩn flagship.'
  },
  // ── TABLETS ───────────────────────────────────────────────────────────────
  {
    _id: 'p8',
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
    isFeatured: true,
    images: [{ url: 'https://cdn2.cellphones.com.vn/insecure/rs:fill:358:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/i/p/ipad-pro-m4-11-inch-wifi-256gb.png', isPrimary: true }],
    specs: { ram: '8GB', storage: '256GB', display: '11 inch Ultra Retina XDR OLED', battery: '8160 mAh', os: 'iPadOS 18', processor: 'Apple M4', camera: '12MP Wide + LiDAR Scanner', color: 'Đen Không Gian' },
    description: 'Thiết kế mỏng chưa từng có, màn hình OLED Tandem đột phá cùng sức mạnh vô song từ con chip Apple M4.'
  },
  {
    _id: 'p9',
    name: 'Samsung Galaxy Tab S9 FE 6GB/128GB',
    slug: 'samsung-galaxy-tab-s9-fe',
    brand: 'Samsung',
    category: 'tablet',
    price: 9990000,
    comparePrice: 11490000,
    stock: 16,
    soldCount: 44,
    avgRating: 4.5,
    reviewCount: 17,
    isFeatured: false,
    images: [{ url: 'https://cdn2.cellphones.com.vn/insecure/rs:fill:358:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/s/a/samsung-galaxy-tab-s9-fe-xam.png', isPrimary: true }],
    specs: { ram: '6GB', storage: '128GB', display: '10.9 inch TFT LCD 90Hz IP68', battery: '8000 mAh', os: 'Android 13 (One UI 5.1)', processor: 'Exynos 1380', camera: '8MP + 10MP Front', color: 'Xám Xanh' },
    description: 'Tablet phổ thông chống nước IP68, màn hình lớn 10.9 inch và bút S-Pen đi kèm trong hộp.'
  },
  // ── SMARTWATCHES ──────────────────────────────────────────────────────────
  {
    _id: 'p10',
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
    isFeatured: true,
    images: [{ url: 'https://cdn2.cellphones.com.vn/insecure/rs:fill:358:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/a/p/apple-watch-s10-46mm-den.png', isPrimary: true }],
    specs: { ram: 'N/A', storage: '64GB', display: 'OLED góc nhìn rộng sáng hơn 40%', battery: 'Up to 36 hours', os: 'watchOS 11', processor: 'Apple S10 SiP', camera: 'Không có', color: 'Nhôm Jet Black' },
    description: 'Màn hình lớn nhất và mỏng nhất từng có trên Apple Watch, tính năng phát hiện ngưng thở khi ngủ chuẩn y khoa.'
  },
  {
    _id: 'p11',
    name: 'Samsung Galaxy Watch 7 44mm',
    slug: 'samsung-galaxy-watch-7-44mm',
    brand: 'Samsung',
    category: 'smartwatch',
    price: 6990000,
    comparePrice: 7990000,
    stock: 20,
    soldCount: 52,
    avgRating: 4.6,
    reviewCount: 18,
    isFeatured: false,
    images: [{ url: 'https://cdn2.cellphones.com.vn/insecure/rs:fill:358:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/s/a/samsung-galaxy-watch7-44mm-xanh.png', isPrimary: true }],
    specs: { ram: '2GB', storage: '16GB', display: '1.5 inch Super AMOLED 480x480', battery: '425 mAh (40h)', os: 'Wear OS 5', processor: 'Exynos W1000 5nm', camera: 'Không có', color: 'Xanh Lá Tươi' },
    description: 'Theo dõi sức khỏe toàn diện với BioActive Sensor thế hệ mới, phân tích năng lượng và giấc ngủ chuyên sâu.'
  },
  // ── ACCESSORIES ───────────────────────────────────────────────────────────
  {
    _id: 'p12',
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
    images: [{ url: '/images/airpods-pro-2.png', isPrimary: true }],
    specs: { ram: 'N/A', storage: 'N/A', display: 'N/A', battery: '6h nghe (30h với hộp)', os: 'N/A', processor: 'Apple H2', camera: 'N/A', color: 'Trắng' },
    description: 'Chống ồn chủ động gấp 2 lần, chế độ Xuyên Âm Thích Ứng và âm thanh vòm Spatial Audio theo dõi chuyển động đầu.'
  },
  {
    _id: 'p13',
    name: 'Củ sạc nhanh Apple 20W USB-C',
    slug: 'cu-sac-nhanh-apple-20w-usbc',
    brand: 'Apple',
    category: 'accessory',
    price: 490000,
    comparePrice: 590000,
    stock: 100,
    soldCount: 345,
    avgRating: 4.7,
    reviewCount: 124,
    isFeatured: false,
    images: [{ url: '/images/cu-sac-20w.jpg', isPrimary: true }],
    specs: { ram: 'N/A', storage: 'N/A', display: 'N/A', battery: 'N/A', os: 'N/A', processor: 'N/A', camera: 'N/A', color: 'Trắng' },
    description: 'Củ sạc chính hãng Apple 20W USB-C, tương thích iPhone 12 trở lên và iPad. Sạc nhanh đầy 50% chỉ trong 30 phút.'
  },
  {
    _id: 'p14',
    name: 'Samsung Galaxy Buds3 Pro',
    slug: 'samsung-galaxy-buds3-pro',
    brand: 'Samsung',
    category: 'accessory',
    price: 4490000,
    comparePrice: 4990000,
    stock: 28,
    soldCount: 67,
    avgRating: 4.7,
    reviewCount: 23,
    isFeatured: false,
    images: [{ url: 'https://cdn2.cellphones.com.vn/insecure/rs:fill:358:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/s/a/samsung-galaxy-buds3-pro-trang.png', isPrimary: true }],
    specs: { ram: 'N/A', storage: 'N/A', display: 'N/A', battery: '6h (30h với hộp)', os: 'N/A', processor: 'N/A', camera: 'N/A', color: 'Trắng Ngân' },
    description: 'Tai nghe không dây chống ồn chủ động ANC thông minh, âm thanh Hi-Fi 24bit và chống nước IPX7.'
  },
  {
    _id: 'p15',
    name: 'Ốp lưng MagSafe iPhone 16 Pro Max',
    slug: 'op-lung-magsafe-iphone-16-pro-max',
    brand: 'Apple',
    category: 'accessory',
    price: 1190000,
    comparePrice: 1390000,
    stock: 60,
    soldCount: 189,
    avgRating: 4.5,
    reviewCount: 42,
    isFeatured: false,
    images: [{ url: 'https://cdn2.cellphones.com.vn/insecure/rs:fill:358:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/o/p/op-lung-magsafe-iphone-16-pro-max-xanh.png', isPrimary: true }],
    specs: { ram: 'N/A', storage: 'N/A', display: 'N/A', battery: 'N/A', os: 'N/A', processor: 'N/A', camera: 'N/A', color: 'Xanh Dương' },
    description: 'Ốp lưng chính hãng Apple MagSafe với vòng nam châm tích hợp, bảo vệ toàn diện và giữ nguyên vẻ đẹp của iPhone.'
  },
  {
    _id: 'p16',
    name: 'Cáp sạc USB-C to Lightning 1m (Apple)',
    slug: 'cap-sac-usbc-lightning-1m',
    brand: 'Apple',
    category: 'accessory',
    price: 390000,
    comparePrice: 490000,
    stock: 80,
    soldCount: 298,
    avgRating: 4.6,
    reviewCount: 95,
    isFeatured: false,
    images: [{ url: 'https://cdn2.cellphones.com.vn/insecure/rs:fill:358:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/c/a/cap-usb-c-to-lightning-apple-1m-trang.png', isPrimary: true }],
    specs: { ram: 'N/A', storage: 'N/A', display: 'N/A', battery: 'N/A', os: 'N/A', processor: 'N/A', camera: 'N/A', color: 'Trắng' },
    description: 'Cáp sạc chính hãng Apple MFi certified, hỗ trợ sạc nhanh và truyền dữ liệu tốc độ cao.'
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
      // Attach JWT token if available
      const token = localStorage.getItem('phonestore_token');
      if (token) config.headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}${endpoint}`, config);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Lỗi kết nối (${res.status})`);
      }
      return await res.json();
    } catch (err) {
      console.warn(`[API Fallback] ${endpoint}:`, err.message);
      return null;
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
    else filtered.sort((a, b) => b.price - a.price);

    return { status: 'success', total: filtered.length, data: filtered };
  },

  async getProductBySlugOrId(idOrSlug) {
    const res = await this.request(`/products/${idOrSlug}`);
    if (res && res.data) return res.data;
    return MOCK_PRODUCTS.find(p => p._id === idOrSlug || p.slug === idOrSlug) || MOCK_PRODUCTS[0];
  },

  async getRelatedProducts(productId) {
    try {
      const res = await this.request(`/recommendations/product/${productId}`);
      if (res && res.data) return res.data;
    } catch (e) {
      console.warn('Could not fetch recommendations:', e);
    }
    return [];
  },

  // ── Auth API ──────────────────────────────────────────────────────────────
  async login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi đăng nhập');
    return data.data; // { user, token }
  },

  async register(name, email, password) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi đăng ký');
    return data.data; // { user, token }
  },

  async getMe() {
    const token = localStorage.getItem('phonestore_token');
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.data?.user || data.data || null;
    } catch {
      return null;
    }
  },

  async getMyOrders() {
    const res = await fetch(`${API_BASE}/orders`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('phonestore_token')}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi lấy đơn hàng');
    return Array.isArray(data.data) ? data.data : (data.data?.orders || []);
  },

  // ── Cart & Order API ──────────────────────────────────────────────────────
  async checkoutOrder(orderData) {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('phonestore_token')}`
      },
      body: JSON.stringify(orderData)
    });
    const data = await res.json();
    if (!res.ok) {
      let errMsg = data.message || 'Lỗi đặt hàng';
      if (data.errors && data.errors.length > 0) {
        errMsg = data.errors[0].message;
      }
      throw new Error(errMsg);
    }
    return data.data; // { order, paymentUrl }
  },

  // ── AI Chatbot API ────────────────────────────────────────────────────────
  async sendChatMessage(message, sessionId) {
    const res = await this.request('/chatbot/message', {
      method: 'POST',
      body: JSON.stringify({ message, sessionId })
    });
    if (res && res.reply) return res;

    let reply = `Chào bạn! Tôi là Trợ lý AI Phonestore. Rất vui được hỗ trợ bạn tìm kiếm mẫu điện thoại phù hợp nhất.`;
    const q = message.toLowerCase();
    if (q.includes('iphone') || q.includes('apple')) {
      reply = `iPhone 16 Pro Max là mẫu flagship cao cấp nhất của Apple hiện tại với viền Titan và chip A18 Pro. Giá từ 34.990.000đ!`;
    } else if (q.includes('samsung') || q.includes('s24')) {
      reply = `Samsung Galaxy S24 Ultra với bộ công cụ Galaxy AI và camera 200MP đang có chương trình giảm 2.000.000đ trực tiếp!`;
    } else if (q.includes('rẻ') || q.includes('giá')) {
      reply = `Phonestore có nhiều mẫu tầm trung từ 8-12 triệu như OPPO Reno 11 Pro, Xiaomi Redmi Note 13 Pro+. Trả góp 0% lãi suất!`;
    } else if (q.includes('tai nghe') || q.includes('airpods')) {
      reply = `AirPods Pro 2 USB-C với chống ồn ANC mạnh nhất và Spatial Audio đang có giá 5.690.000đ tại Phonestore!`;
    }

    return { reply, sessionId: sessionId || 'sess_demo', recommendations: [MOCK_PRODUCTS[0], MOCK_PRODUCTS[2]] };
  },

  async getAdminStats() {
    const res = await fetch(`${API_BASE}/admin/stats/overview`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('phonestore_token')}`
      }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi lấy thống kê admin');
    return data.data;
  },

  async getAdminProducts() {
    const res = await fetch(`${API_BASE}/products/admin`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('phonestore_token')}`
      }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi lấy danh sách sản phẩm admin');
    return Array.isArray(data.data) ? data.data : (data.data?.products || []);
  },

  async createAdminProduct(formData) {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('phonestore_token')}`
      },
      body: formData // multipart/form-data
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi thêm sản phẩm');
    return data.data;
  },

  async updateAdminProduct(id, formData) {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('phonestore_token')}`
      },
      body: formData // multipart/form-data
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi cập nhật sản phẩm');
    return data.data;
  },

  async deleteAdminProduct(id) {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('phonestore_token')}`
      }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi xóa sản phẩm');
    return data.data;
  },

  // ── Admin Orders API ────────────────────────────────────────────────────────
  async getAdminOrders() {
    const res = await fetch(`${API_BASE}/orders/admin`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('phonestore_token')}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi lấy danh sách đơn hàng admin');
    return Array.isArray(data.data) ? data.data : (data.data?.orders || []);
  },

  async updateOrderStatus(id, status) {
    const res = await fetch(`${API_BASE}/orders/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('phonestore_token')}`
      },
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi cập nhật trạng thái đơn hàng');
    return data.data;
  },

  // ── Admin Users API ─────────────────────────────────────────────────────────
  async getAdminUsers() {
    const res = await fetch(`${API_BASE}/admin/users`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('phonestore_token')}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi lấy danh sách người dùng admin');
    return Array.isArray(data.data) ? data.data : (data.data?.users || []);
  },

  async updateUserRole(id, role) {
    const res = await fetch(`${API_BASE}/admin/users/${id}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('phonestore_token')}`
      },
      body: JSON.stringify({ role })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi cập nhật quyền người dùng');
    return data.data;
  },

  async updateUserStatus(id, isActive) {
    const res = await fetch(`${API_BASE}/admin/users/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('phonestore_token')}`
      },
      body: JSON.stringify({ isActive })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi cập nhật trạng thái người dùng');
    return data.data;
  }
};
