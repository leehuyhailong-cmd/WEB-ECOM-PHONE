'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const slugify  = require('slugify');
const connectDB = require('./src/config/db');
const Product  = require('./src/models/Product');

const productsData = [
  // ── 1. SMARTPHONE (13 sản phẩm) ──────────────────────────────────────────
  {
    name: 'iPhone 15 Pro Max 256GB',
    brand: 'Apple',
    category: 'smartphone',
    tags: ['apple', 'iphone', 'flagship', 'pro-max', '5g'],
    price: 29990000,
    comparePrice: 34990000,
    stock: 45,
    soldCount: 120,
    avgRating: 4.9,
    reviewCount: 85,
    isFeatured: true,
    description: 'Thiết kế khung Titan chuẩn hàng không vũ trụ, chip A17 Pro đỉnh cao hiệu năng, hệ thống camera 5x quang học sắc nét.',
    images: [
      { url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop', isPrimary: true },
      { url: 'https://images.unsplash.com/photo-1695048065057-d04b6b158021?w=800&auto=format&fit=crop', isPrimary: false }
    ],
    specs: {
      display: '6.7 inch Super Retina XDR OLED 120Hz',
      processor: 'Apple A17 Pro (3nm)',
      ram: '8GB',
      storage: '256GB',
      camera: '48MP + 12MP + 12MP (Zoom 5x)',
      battery: '4422 mAh, Sạc sạc nhanh 20W',
      os: 'iOS 17',
      color: 'Titan Tự Nhiên',
      weight: '221g'
    }
  },
  {
    name: 'iPhone 15 Pro 128GB',
    brand: 'Apple',
    category: 'smartphone',
    tags: ['apple', 'iphone', 'flagship', 'pro'],
    price: 24990000,
    comparePrice: 28990000,
    stock: 30,
    soldCount: 95,
    avgRating: 4.8,
    reviewCount: 64,
    isFeatured: true,
    description: 'Viền Titan siêu nhẹ, nút Nút Hành Động hoàn toàn mới, hỗ trợ chuẩn USB-C tốc độ cao.',
    images: [
      { url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      display: '6.1 inch Super Retina XDR OLED 120Hz',
      processor: 'Apple A17 Pro (3nm)',
      ram: '8GB',
      storage: '128GB',
      camera: '48MP + 12MP + 12MP',
      battery: '3274 mAh',
      os: 'iOS 17',
      color: 'Titan Xanh'
    }
  },
  {
    name: 'iPhone 15 128GB',
    brand: 'Apple',
    category: 'smartphone',
    tags: ['apple', 'iphone', 'dynamic-island'],
    price: 19490000,
    comparePrice: 22990000,
    stock: 50,
    soldCount: 210,
    avgRating: 4.7,
    reviewCount: 140,
    isFeatured: false,
    description: 'Trang bị Dynamic Island tiện lợi, camera chính 48MP chụp ảnh sắc nét vượt trội.',
    images: [
      { url: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      display: '6.1 inch OLED Super Retina XDR',
      processor: 'Apple A16 Bionic',
      ram: '6GB',
      storage: '128GB',
      camera: '48MP + 12MP',
      battery: '3349 mAh',
      os: 'iOS 17',
      color: 'Hồng Pastel'
    }
  },
  {
    name: 'Samsung Galaxy S24 Ultra 5G 256GB',
    brand: 'Samsung',
    category: 'smartphone',
    tags: ['samsung', 'galaxy', 'ai', 's24-ultra', 's-pen'],
    price: 29990000,
    comparePrice: 33990000,
    stock: 40,
    soldCount: 180,
    avgRating: 4.9,
    reviewCount: 110,
    isFeatured: true,
    description: 'Quyền năng Galaxy AI đỉnh cao, bút S-Pen tích hợp, khung viền Titan cá tính và màn hình phẳng cao cấp.',
    images: [
      { url: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      display: '6.8 inch Dynamic AMOLED 2X 120Hz QHD+',
      processor: 'Snapdragon 8 Gen 3 for Galaxy',
      ram: '12GB',
      storage: '256GB',
      camera: '200MP + 50MP + 12MP + 10MP',
      battery: '5000 mAh, sạc 45W',
      os: 'Android 14 (One UI 6.1)',
      color: 'Xám Titan'
    }
  },
  {
    name: 'Samsung Galaxy S24 Plus 5G',
    brand: 'Samsung',
    category: 'smartphone',
    tags: ['samsung', 'galaxy', 'ai', 's24+'],
    price: 22990000,
    comparePrice: 26990000,
    stock: 25,
    soldCount: 70,
    avgRating: 4.7,
    reviewCount: 45,
    isFeatured: false,
    description: 'Nâng cấp màn hình QHD+ sắc nét, dung lượng pin lớn hơn cùng công nghệ AI tìm kiếm thông minh.',
    images: [
      { url: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      display: '6.7 inch Dynamic AMOLED 2X QHD+',
      processor: 'Exynos 2400',
      ram: '12GB',
      storage: '256GB',
      camera: '50MP + 12MP + 10MP',
      battery: '4900 mAh',
      os: 'Android 14'
    }
  },
  {
    name: 'Samsung Galaxy Z Fold5 512GB',
    brand: 'Samsung',
    category: 'smartphone',
    tags: ['samsung', 'fold', 'man-hinh-gap'],
    price: 36990000,
    comparePrice: 44990000,
    stock: 15,
    soldCount: 55,
    avgRating: 4.8,
    reviewCount: 38,
    isFeatured: true,
    description: 'Bản lề Flex gập không kẽ hở, đa nhiệm cực đỉnh trên màn hình lớn 7.6 inch.',
    images: [
      { url: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      display: '7.6 inch Dynamic AMOLED 2X 120Hz (Màn gập)',
      processor: 'Snapdragon 8 Gen 2 for Galaxy',
      ram: '12GB',
      storage: '512GB',
      camera: '50MP + 12MP + 10MP',
      battery: '4400 mAh',
      os: 'Android 13 (Up to 14)'
    }
  },
  {
    name: 'Samsung Galaxy Z Flip5 256GB',
    brand: 'Samsung',
    category: 'smartphone',
    tags: ['samsung', 'flip', 'thoi-trang'],
    price: 18990000,
    comparePrice: 23990000,
    stock: 35,
    soldCount: 140,
    avgRating: 4.7,
    reviewCount: 92,
    isFeatured: false,
    description: 'Màn hình phụ Flex Window 3.4 inch độc đáo, thiết kế gập vỏ sò thời trang nhỏ gọn.',
    images: [
      { url: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      display: '6.7 inch Full HD+ 120Hz & Màn phụ 3.4 inch',
      processor: 'Snapdragon 8 Gen 2 for Galaxy',
      ram: '8GB',
      storage: '256GB',
      camera: '12MP + 12MP',
      battery: '3700 mAh'
    }
  },
  {
    name: 'Xiaomi 14 Ultra 512GB Leica',
    brand: 'Xiaomi',
    category: 'smartphone',
    tags: ['xiaomi', 'leica', 'camera-khung'],
    price: 29990000,
    comparePrice: 32990000,
    stock: 20,
    soldCount: 40,
    avgRating: 4.9,
    reviewCount: 30,
    isFeatured: true,
    description: 'Cụm 4 camera Leica 50MP cảm biến 1 inch đỉnh cao nhiếp ảnh di động, ống kính Leica Summilux.',
    images: [
      { url: 'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      display: '6.73 inch LTPO AMOLED 120Hz WQHD+',
      processor: 'Snapdragon 8 Gen 3',
      ram: '16GB',
      storage: '512GB',
      camera: '50MP + 50MP + 50MP + 50MP Leica',
      battery: '5000 mAh, Sạc siêu nhanh 90W'
    }
  },
  {
    name: 'Xiaomi 13T Pro 5G 12GB/512GB',
    brand: 'Xiaomi',
    category: 'smartphone',
    tags: ['xiaomi', 'gia-tot', '120w'],
    price: 13990000,
    comparePrice: 16990000,
    stock: 60,
    soldCount: 150,
    avgRating: 4.6,
    reviewCount: 88,
    isFeatured: false,
    description: 'Camera Leica cao cấp, màn hình 144Hz siêu mượt và công nghệ sạc thần tốc 120W.',
    images: [
      { url: 'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      display: '6.67 inch CrystalRes AMOLED 144Hz',
      processor: 'MediaTek Dimensity 9200+',
      ram: '12GB',
      storage: '512GB',
      camera: '50MP + 50MP + 12MP Leica',
      battery: '5000 mAh, Sạc 120W'
    }
  },
  {
    name: 'OPPO Find N3 5G 512GB',
    brand: 'OPPO',
    category: 'smartphone',
    tags: ['oppo', 'gap', 'flagship'],
    price: 41990000,
    comparePrice: 44990000,
    stock: 10,
    soldCount: 25,
    avgRating: 4.9,
    reviewCount: 18,
    isFeatured: false,
    description: 'Thiết kế gập cao cấp bậc nhất, hệ thống camera Hasselblad chuyên nghiệp, màn hình không nếp gấp.',
    images: [
      { url: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      display: '7.82 inch OLED 120Hz & Màn phụ 6.31 inch',
      processor: 'Snapdragon 8 Gen 2',
      ram: '16GB',
      storage: '512GB',
      camera: '48MP + 64MP + 48MP Hasselblad',
      battery: '4805 mAh, Sạc 67W'
    }
  },
  {
    name: 'OPPO Reno11 Pro 5G',
    brand: 'OPPO',
    category: 'smartphone',
    tags: ['oppo', 'reno', 'chup-anh-dep'],
    price: 11490000,
    comparePrice: 13990000,
    stock: 40,
    soldCount: 110,
    avgRating: 4.6,
    reviewCount: 75,
    isFeatured: false,
    description: 'Chuyên gia chân dung thế hệ mới, mặt lưng thiết kế vân đá quý độc đáo.',
    images: [
      { url: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      display: '6.7 inch OLED 3D 120Hz',
      processor: 'MediaTek Dimensity 8200',
      ram: '12GB',
      storage: '512GB',
      camera: '50MP + 32MP + 8MP',
      battery: '4600 mAh, Sạc 80W'
    }
  },
  {
    name: 'Vivo X100 Pro 5G ZEISS',
    brand: 'Vivo',
    category: 'smartphone',
    tags: ['vivo', 'zeiss', 'camera-khung'],
    price: 22990000,
    comparePrice: 25990000,
    stock: 18,
    soldCount: 35,
    avgRating: 4.8,
    reviewCount: 22,
    isFeatured: false,
    description: 'Ống kính ZEISS APO đỉnh cao nhiếp ảnh, chip xử lý hình ảnh Vivo V3 chuyên biệt.',
    images: [
      { url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      display: '6.78 inch LTPO AMOLED 120Hz',
      processor: 'MediaTek Dimensity 9300',
      ram: '16GB',
      storage: '512GB',
      camera: '50MP ZEISS 1-inch + 50MP + 50MP',
      battery: '5400 mAh, Sạc 100W'
    }
  },
  {
    name: 'Realme GT5 Pro 5G',
    brand: 'Realme',
    category: 'smartphone',
    tags: ['realme', 'cau-hinh-khung', 'gia-re'],
    price: 12990000,
    comparePrice: 14990000,
    stock: 30,
    soldCount: 85,
    avgRating: 4.7,
    reviewCount: 50,
    isFeatured: false,
    description: 'Quái vật cấu hình Snapdragon 8 Gen 3 trong tầm giá, tản nhiệt buồng hơi 12000mm².',
    images: [
      { url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      display: '6.78 inch AMOLED 144Hz 4500 nits',
      processor: 'Snapdragon 8 Gen 3',
      ram: '12GB',
      storage: '256GB',
      camera: '50MP + 50MP Periscope + 8MP',
      battery: '5400 mAh, Sạc 100W'
    }
  },

  // ── 2. TABLET (10 sản phẩm) ──────────────────────────────────────────────
  {
    name: 'iPad Pro 12.9 inch M2 Wi-Fi 128GB',
    brand: 'Apple',
    category: 'tablet',
    tags: ['apple', 'ipad', 'ipad-pro', 'm2'],
    price: 27990000,
    comparePrice: 31990000,
    stock: 25,
    soldCount: 65,
    avgRating: 4.9,
    reviewCount: 42,
    isFeatured: true,
    description: 'Sức mạnh chip M2 đỉnh cao, màn hình Liquid Retina XDR Mini-LED siêu rực rỡ.',
    images: [
      { url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      display: '12.9 inch Liquid Retina XDR Mini-LED 120Hz',
      processor: 'Apple M2 8-core CPU',
      ram: '8GB',
      storage: '128GB',
      camera: '12MP + 10MP + TOF 3D LiDAR',
      battery: '10758 mAh',
      os: 'iPadOS 17'
    }
  },
  {
    name: 'iPad Air 5 M1 Wi-Fi 64GB',
    brand: 'Apple',
    category: 'tablet',
    tags: ['apple', 'ipad', 'ipad-air', 'm1'],
    price: 13990000,
    comparePrice: 16990000,
    stock: 45,
    soldCount: 160,
    avgRating: 4.8,
    reviewCount: 105,
    isFeatured: true,
    description: 'Thiết kế mỏng nhẹ nhiều màu sắc cá tính, hiệu năng vượt trội với chip Apple M1.',
    images: [
      { url: 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      display: '10.9 inch Liquid Retina IPS',
      processor: 'Apple M1',
      ram: '8GB',
      storage: '64GB',
      camera: '12MP Ultra Wide Center Stage',
      os: 'iPadOS 17'
    }
  },
  {
    name: 'iPad Gen 10 10.9 inch Wi-Fi 64GB',
    brand: 'Apple',
    category: 'tablet',
    tags: ['apple', 'ipad', 'hoc-tap'],
    price: 9990000,
    comparePrice: 11990000,
    stock: 70,
    soldCount: 230,
    avgRating: 4.7,
    reviewCount: 150,
    isFeatured: false,
    description: 'Thiết kế tràn viền hiện đại, cổng USB-C tiện lợi, phù hợp hoàn hảo cho học tập và giải trí.',
    images: [
      { url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      display: '10.9 inch Liquid Retina',
      processor: 'Apple A14 Bionic',
      ram: '4GB',
      storage: '64GB',
      camera: '12MP',
      os: 'iPadOS 17'
    }
  },
  {
    name: 'iPad mini 6 8.3 inch Wi-Fi 64GB',
    brand: 'Apple',
    category: 'tablet',
    tags: ['apple', 'ipad', 'mini', 'nho-gon'],
    price: 11990000,
    comparePrice: 14990000,
    stock: 20,
    soldCount: 90,
    avgRating: 4.8,
    reviewCount: 58,
    isFeatured: false,
    description: 'Kích thước vừa vặn trong lòng bàn tay, sức mạnh từ A15 Bionic hỗ trợ Apple Pencil 2.',
    images: [
      { url: 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      display: '8.3 inch Liquid Retina',
      processor: 'Apple A15 Bionic',
      ram: '4GB',
      storage: '64GB',
      os: 'iPadOS 17'
    }
  },
  {
    name: 'Samsung Galaxy Tab S9 Ultra 512GB',
    brand: 'Samsung',
    category: 'tablet',
    tags: ['samsung', 'tab-s9', 'khung-long'],
    price: 28990000,
    comparePrice: 32990000,
    stock: 15,
    soldCount: 40,
    avgRating: 4.9,
    reviewCount: 28,
    isFeatured: true,
    description: 'Màn hình 14.6 inch cực đại, kháng nước IP68 đầu tiên trên máy tính bảng kèm bút S Pen.',
    images: [
      { url: 'https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      display: '14.6 inch Dynamic AMOLED 2X 120Hz',
      processor: 'Snapdragon 8 Gen 2 for Galaxy',
      ram: '12GB',
      storage: '512GB',
      battery: '11200 mAh',
      os: 'Android 13'
    }
  },
  {
    name: 'Samsung Galaxy Tab S9 FE Wi-Fi',
    brand: 'Samsung',
    category: 'tablet',
    tags: ['samsung', 'tab-fe', 'khang-nuoc'],
    price: 8990000,
    comparePrice: 10990000,
    stock: 50,
    soldCount: 120,
    avgRating: 4.6,
    reviewCount: 75,
    isFeatured: false,
    description: 'Chuẩn kháng nước IP68 bền bỉ, tặng kèm bút S Pen thỏa sức sáng tạo.',
    images: [
      { url: 'https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      display: '10.9 inch IPS LCD 90Hz',
      processor: 'Exynos 1380',
      ram: '6GB',
      storage: '128GB',
      battery: '8000 mAh'
    }
  },
  {
    name: 'Samsung Galaxy Tab A9+ 5G',
    brand: 'Samsung',
    category: 'tablet',
    tags: ['samsung', 'tab-a', 'gia-re'],
    price: 5490000,
    comparePrice: 6990000,
    stock: 80,
    soldCount: 250,
    avgRating: 4.5,
    reviewCount: 160,
    isFeatured: false,
    description: 'Máy tính bảng giải trí gia đình giá rẻ, 4 loa Samsung Knox bảo mật hàng đầu.',
    images: [
      { url: 'https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      display: '11.0 inch TFT LCD 90Hz',
      processor: 'Snapdragon 695 5G',
      ram: '4GB',
      storage: '64GB',
      battery: '7040 mAh'
    }
  },
  {
    name: 'Xiaomi Pad 6 8GB/256GB',
    brand: 'Xiaomi',
    category: 'tablet',
    tags: ['xiaomi', 'pad-6', 'man-hinh-144hz'],
    price: 7990000,
    comparePrice: 9490000,
    stock: 60,
    soldCount: 190,
    avgRating: 4.8,
    reviewCount: 120,
    isFeatured: false,
    description: 'Màn hình 2.8K siêu mịn 144Hz, âm thanh Dolby Atmos, khung kim loại nguyên khối.',
    images: [
      { url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      display: '11.0 inch IPS LCD 144Hz 2.8K',
      processor: 'Snapdragon 870',
      ram: '8GB',
      storage: '256GB',
      battery: '8840 mAh, Sạc 33W'
    }
  },
  {
    name: 'OPPO Pad 2 256GB',
    brand: 'OPPO',
    category: 'tablet',
    tags: ['oppo', 'pad-2', 'ty-le-7-5'],
    price: 13490000,
    comparePrice: 14990000,
    stock: 25,
    soldCount: 45,
    avgRating: 4.7,
    reviewCount: 30,
    isFeatured: false,
    description: 'Tỷ lệ màn hình 7:5 độc đáo đọc tài liệu như sách thật, màn hình 144Hz mượt mà.',
    images: [
      { url: 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      display: '11.61 inch IPS 144Hz 2.8K',
      processor: 'MediaTek Dimensity 9000',
      ram: '8GB',
      storage: '256GB',
      battery: '9510 mAh, Sạc 67W'
    }
  },
  {
    name: 'Lenovo Tab P12 Pro',
    brand: 'Lenovo',
    category: 'tablet',
    tags: ['lenovo', 'oled', 'do-hoa'],
    price: 14990000,
    comparePrice: 17990000,
    stock: 18,
    soldCount: 30,
    avgRating: 4.6,
    reviewCount: 20,
    isFeatured: false,
    description: 'Màn hình AMOLED 2K sắc nét, 4 loa JBL công suất lớn cho trải nghiệm điện ảnh.',
    images: [
      { url: 'https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      display: '12.6 inch AMOLED 120Hz 2K',
      processor: 'Snapdragon 870',
      ram: '8GB',
      storage: '256GB',
      battery: '10200 mAh'
    }
  },

  // ── 3. SMARTWATCH (10 sản phẩm) ──────────────────────────────────────────
  {
    name: 'Apple Watch Series 9 GPS 41mm Viền Nhôm',
    brand: 'Apple',
    category: 'smartwatch',
    tags: ['apple', 'watch-s9', 'double-tap'],
    price: 9490000,
    comparePrice: 10490000,
    stock: 35,
    soldCount: 140,
    avgRating: 4.8,
    reviewCount: 95,
    isFeatured: true,
    description: 'Tính năng Chạm Hai Lần (Double Tap) diệu kỳ, chip S9 SIP mạnh mẽ màn hình sáng gấp đôi.',
    images: [
      { url: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      display: 'OLED Retina Always-On 2000 nits',
      processor: 'Apple S9 SiP',
      battery: 'Lên đến 18 giờ (36 giờ chế độ tiết kiệm)',
      os: 'watchOS 10',
      connectivity: 'GPS, Bluetooth 5.3, Wi-Fi'
    }
  },
  {
    name: 'Apple Watch Ultra 2 GPS + Cellular 49mm',
    brand: 'Apple',
    category: 'smartwatch',
    tags: ['apple', 'watch-ultra', 'the-thao-chuyen-nghiep'],
    price: 20990000,
    comparePrice: 21990000,
    stock: 15,
    soldCount: 50,
    avgRating: 4.9,
    reviewCount: 40,
    isFeatured: true,
    description: 'Vỏ Titan 49mm bền bỉ nhất, màn hình 3000 nits siêu sáng, độ sâu lặn biển đến 40m.',
    images: [
      { url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      display: '49mm Titanium Sapphire Crystal 3000 nits',
      processor: 'Apple S9 SiP',
      battery: 'Lên tới 36-72 giờ',
      os: 'watchOS 10'
    }
  },
  {
    name: 'Apple Watch SE 2023 GPS 40mm',
    brand: 'Apple',
    category: 'smartwatch',
    tags: ['apple', 'watch-se', 'gia-tot'],
    price: 5990000,
    comparePrice: 6890000,
    stock: 60,
    soldCount: 280,
    avgRating: 4.7,
    reviewCount: 190,
    isFeatured: false,
    description: 'Đồng hồ thông minh Apple giá dễ tiếp cận nhất, theo dõi sức khỏe và phát hiện va chạm.',
    images: [
      { url: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      display: 'OLED Retina 1000 nits',
      processor: 'Apple S8 SiP',
      battery: 'Lên đến 18 giờ'
    }
  },
  {
    name: 'Samsung Galaxy Watch6 Classic 47mm Bluetooth',
    brand: 'Samsung',
    category: 'smartwatch',
    tags: ['samsung', 'watch6', 'xoay-ly-tam'],
    price: 8490000,
    comparePrice: 9990000,
    stock: 30,
    soldCount: 85,
    avgRating: 4.7,
    reviewCount: 60,
    isFeatured: false,
    description: 'Vòng xoay xoay vật lý cổ điển kinh điển, phân tích thành phần cơ thể BIA chuyên sâu.',
    images: [
      { url: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      display: '1.5 inch Super AMOLED Sapphire',
      processor: 'Exynos W930',
      ram: '2GB',
      storage: '16GB',
      battery: '425 mAh'
    }
  },
  {
    name: 'Samsung Galaxy Watch5 Pro 45mm Titanium',
    brand: 'Samsung',
    category: 'smartwatch',
    tags: ['samsung', 'watch5-pro', 'pin-trau'],
    price: 6990000,
    comparePrice: 11990000,
    stock: 25,
    soldCount: 75,
    avgRating: 4.8,
    reviewCount: 52,
    isFeatured: false,
    description: 'Thiết kế Titan hầm hố, kính Sapphire chống xước, thời lượng pin 80 giờ ấn tượng.',
    images: [
      { url: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      display: '1.4 inch Super AMOLED Sapphire',
      battery: '590 mAh (Pin tới 3-4 ngày)'
    }
  },
  {
    name: 'Garmin Fenix 7 Pro Solar Titamium',
    brand: 'Garmin',
    category: 'smartwatch',
    tags: ['garmin', 'fenix-7', 'pin-mat-troi'],
    price: 21490000,
    comparePrice: 23990000,
    stock: 12,
    soldCount: 30,
    avgRating: 4.9,
    reviewCount: 25,
    isFeatured: true,
    description: 'Sạc năng lượng mặt trời kéo dài thời lượng pin hàng tuần, bản đồ định vị đa băng tần GPS cao cấp.',
    images: [
      { url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      display: '1.3 inch MiP sạc mặt trời',
      battery: 'Lên đến 22 ngày ở chế độ Smartwatch',
      color: 'Titanium Xám'
    }
  },
  {
    name: 'Garmin Forerunner 265 Music',
    brand: 'Garmin',
    category: 'smartwatch',
    tags: ['garmin', 'chay-bo', 'amoled'],
    price: 11690000,
    comparePrice: 12490000,
    stock: 25,
    soldCount: 95,
    avgRating: 4.8,
    reviewCount: 70,
    isFeatured: false,
    description: 'Màn hình AMOLED rực rỡ, trợ lý luyện tập chạy bộ chuyên nghiệp hàng đầu thế giới.',
    images: [
      { url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      display: '1.3 inch AMOLED 416x416',
      battery: '13 ngày ở chế độ Smartwatch, 20 giờ GPS'
    }
  },
  {
    name: 'Xiaomi Watch 2 Pro LTE',
    brand: 'Xiaomi',
    category: 'smartwatch',
    tags: ['xiaomi', 'wear-os', 'e-sim'],
    price: 5990000,
    comparePrice: 6990000,
    stock: 40,
    soldCount: 110,
    avgRating: 4.6,
    reviewCount: 65,
    isFeatured: false,
    description: 'Hệ điều hành Wear OS tích hợp Google Play, nghe gọi độc lập qua eSIM.',
    images: [
      { url: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      display: '1.43 inch AMOLED 466x466',
      processor: 'Snapdragon W5+ Gen 1',
      battery: '495 mAh'
    }
  },
  {
    name: 'Amazfit GTR 4 Limited Edition',
    brand: 'Amazfit',
    category: 'smartwatch',
    tags: ['amazfit', 'gtr-4', 'pin-14-ngay'],
    price: 4490000,
    comparePrice: 5490000,
    stock: 50,
    soldCount: 130,
    avgRating: 4.7,
    reviewCount: 80,
    isFeatured: false,
    description: 'Thiết kế cổ điển sang trọng, theo dõi GPS 6 vệ tinh chuẩn xác, pin 14 ngày.',
    images: [
      { url: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      display: '1.43 inch HD AMOLED',
      battery: '475 mAh (Sử dụng 14 ngày)'
    }
  },
  {
    name: 'Huawei Watch GT 4 46mm Dây Da',
    brand: 'Huawei',
    category: 'smartwatch',
    tags: ['huawei', 'watch-gt4', 'thoi-trang'],
    price: 5290000,
    comparePrice: 6590000,
    stock: 35,
    soldCount: 105,
    avgRating: 4.7,
    reviewCount: 72,
    isFeatured: false,
    description: 'Thiết kế bát giác thời thượng, theo dõi giấc ngủ TruSleep 3.0, pin lên đến 14 ngày.',
    images: [
      { url: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      display: '1.43 inch AMOLED',
      battery: 'Thời lượng pin 14 ngày'
    }
  },

  // ── 4. ACCESSORY (10 sản phẩm) ───────────────────────────────────────────
  {
    name: 'AirPods Pro Gen 2 (USB-C)',
    brand: 'Apple',
    category: 'accessory',
    tags: ['apple', 'airpods', 'pro', 'chong-on'],
    price: 5790000,
    comparePrice: 6190000,
    stock: 90,
    soldCount: 450,
    avgRating: 4.9,
    reviewCount: 310,
    isFeatured: true,
    description: 'Chíp H2 chủ động chống ồn gấp 2 lần, âm thanh thích ứng và hộp sạc chuẩn USB-C.',
    images: [
      { url: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      connectivity: 'Bluetooth 5.3, Hộp sạc USB-C Magsafe',
      battery: '6 giờ tai nghe, 30 giờ cùng hộp sạc',
      color: 'Trắng'
    }
  },
  {
    name: 'AirPods Max USB-C Silver',
    brand: 'Apple',
    category: 'accessory',
    tags: ['apple', 'airpods-max', 'trum-tai'],
    price: 12990000,
    comparePrice: 13990000,
    stock: 15,
    soldCount: 40,
    avgRating: 4.8,
    reviewCount: 32,
    isFeatured: false,
    description: 'Tai nghe chụp tai cao cấp nhất của Apple, âm thanh vòm Spatial Audio sống động.',
    images: [
      { url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      connectivity: 'Bluetooth 5.0, Cổng sạc Type-C',
      battery: '20 giờ phát liên tục'
    }
  },
  {
    name: 'Samsung Galaxy Buds2 Pro',
    brand: 'Samsung',
    category: 'accessory',
    tags: ['samsung', 'buds2-pro', 'am-thanh-24bit'],
    price: 3290000,
    comparePrice: 4990000,
    stock: 50,
    soldCount: 180,
    avgRating: 4.7,
    reviewCount: 115,
    isFeatured: false,
    description: 'Âm thanh chân thực 24-bit Hi-Fi, chống ồn chủ động ANC thông minh và thiết kế nhỏ gọn.',
    images: [
      { url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      connectivity: 'Bluetooth 5.3, Kháng nước IPX7',
      battery: '5 giờ tai nghe, 18 giờ kèm hộp sạc'
    }
  },
  {
    name: 'Sony WH-1000XM5 Wireless Noise Canceling',
    brand: 'Sony',
    category: 'accessory',
    tags: ['sony', 'xm5', 'chong-on-vong-bang'],
    price: 7990000,
    comparePrice: 8990000,
    stock: 30,
    soldCount: 140,
    avgRating: 4.9,
    reviewCount: 98,
    isFeatured: true,
    description: 'Vua chống ồn tai nghe chụp tai, 8 micro thu âm và bộ xử lý Integrated Processor V1.',
    images: [
      { url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      connectivity: 'Bluetooth 5.2, LDAC, USB-C',
      battery: '30 giờ khi bật ANC, sạc nhanh 3 phút được 3 giờ'
    }
  },
  {
    name: 'Pin dự phòng Anker 537 PowerCore 24000mAh 65W',
    brand: 'Anker',
    category: 'accessory',
    tags: ['anker', 'sac-du-phong', '65w', 'laptop'],
    price: 1490000,
    comparePrice: 1890000,
    stock: 75,
    soldCount: 320,
    avgRating: 4.8,
    reviewCount: 210,
    isFeatured: false,
    description: 'Dung lượng lớn 24000mAh, công suất sạc 65W sạc nhanh cho cả MacBook và iPhone.',
    images: [
      { url: 'https://images.unsplash.com/photo-1609592424074-b52b21c4b4d6?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      capacity: '24,000 mAh',
      output: 'USB-C 65W Max, USB-A 22.5W',
      weight: '495g'
    }
  },
  {
    name: 'Củ sạc nhanh Apple 20W Type-C Chính Hãng',
    brand: 'Apple',
    category: 'accessory',
    tags: ['apple', 'sac-20w', 'phu-kien-chinh-hang'],
    price: 490000,
    comparePrice: 590000,
    stock: 200,
    soldCount: 850,
    avgRating: 4.8,
    reviewCount: 520,
    isFeatured: false,
    description: 'Củ sạc nhanh 20W chính hãng Apple bảo vệ pin và tối ưu tốc độ sạc cho iPhone.',
    images: [
      { url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      output: '20W USB-C Power Delivery',
      color: 'Trắng'
    }
  },
  {
    name: 'Cáp Anker PowerLine III Flow USB-C to Lightning 0.9m',
    brand: 'Anker',
    category: 'accessory',
    tags: ['anker', 'cap-sac', 'mfi'],
    price: 290000,
    comparePrice: 380000,
    stock: 120,
    soldCount: 400,
    avgRating: 4.7,
    reviewCount: 240,
    isFeatured: false,
    description: 'Chất liệu Silicon siêu dẻo chống rối, chứng nhận MFi chuẩn Apple chịu gập 25.000 lần.',
    images: [
      { url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      length: '0.9m',
      material: 'Silicone siêu mềm chống rối'
    }
  },
  {
    name: 'Đế sạc không dây 3 in 1 Belkin BoostCharge Pro Magsafe 15W',
    brand: 'Belkin',
    category: 'accessory',
    tags: ['belkin', 'magsafe', '3-in-1'],
    price: 3290000,
    comparePrice: 3790000,
    stock: 20,
    soldCount: 60,
    avgRating: 4.9,
    reviewCount: 45,
    isFeatured: false,
    description: 'Sạc đồng thời iPhone 15W MagSafe, Apple Watch và AirPods trên cùng 1 chân đế thời thượng.',
    images: [
      { url: 'https://images.unsplash.com/photo-1609592424074-b52b21c4b4d6?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      output: '15W Fast Wireless Charging for MagSafe'
    }
  },
  {
    name: 'Tai nghe Bluetooth Marshall Major IV Black',
    brand: 'Marshall',
    category: 'accessory',
    tags: ['marshall', 'major-iv', 'truy-thong'],
    price: 3490000,
    comparePrice: 4290000,
    stock: 35,
    soldCount: 160,
    avgRating: 4.8,
    reviewCount: 110,
    isFeatured: false,
    description: 'Thiết kế Vintage hoài cổ đặc trưng Marshall, thời lượng pin sử dụng liên tục tới 80 giờ.',
    images: [
      { url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      battery: '80+ giờ phát nhạc không dây, Hỗ trợ sạc không dây',
      connectivity: 'Bluetooth 5.0, Jack 3.5mm'
    }
  },
  {
    name: 'Loa Bluetooth JBL Charge 5 40W',
    brand: 'JBL',
    category: 'accessory',
    tags: ['jbl', 'charge-5', 'loa-khang-nuoc'],
    price: 3590000,
    comparePrice: 3990000,
    stock: 45,
    soldCount: 210,
    avgRating: 4.8,
    reviewCount: 145,
    isFeatured: false,
    description: 'Âm thanh JBL Original Pro Sound uy lực, chống nước bụi IP67, kiêm sạc dự phòng.',
    images: [
      { url: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&auto=format&fit=crop', isPrimary: true }
    ],
    specs: {
      power: '40W RMS',
      battery: '20 giờ phát nhạc',
      waterproof: 'IP67'
    }
  }
];

async function seedData() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await connectDB();

    console.log('Clearing old products collection...');
    await Product.deleteMany({});

    console.log(`Creating ${productsData.length} products one by one...`);
    let count = 0;
    const stats = {};

    for (const item of productsData) {
      // Auto-generate slug
      item.slug = slugify(item.name, {
        lower: true,
        strict: true,
        locale: 'vi',
        replacement: '-',
        remove: /[*+~.()'"!:@]/g,
      });

      await Product.create(item);
      count++;
      stats[item.category] = (stats[item.category] || 0) + 1;
    }

    console.log('----------------------------------------------------');
    console.log(`✅ SEED COMPLETED SUCCESSFULLY! Total: ${count} products.`);
    console.log('Breakdown by category:');
    console.table(stats);

    process.exit(0);
  } catch (err) {
    console.error('❌ SEED FAILED:', err);
    process.exit(1);
  }
}

seedData();
