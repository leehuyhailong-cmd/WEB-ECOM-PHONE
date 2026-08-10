require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../src/models/Category');
const Product = require('../src/models/Product');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/phonestore';

const brands = ['Apple', 'Samsung', 'Xiaomi', 'OPPO', 'Vivo', 'Realme'];

const imagePlaceholder = (brand, type) => {
    // Just a placeholder URL that could look nice
    return `https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&q=80&auto=format&fit=crop`; 
};

// We will generate 6 models for each brand for 'Điện thoại'
const modelsTemplate = {
  Apple: ['iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15', 'iPhone 14 Pro Max', 'iPhone 13'],
  Samsung: ['Galaxy S24 Ultra', 'Galaxy S24+', 'Galaxy S24', 'Galaxy Z Fold5', 'Galaxy Z Flip5', 'Galaxy A55'],
  Xiaomi: ['Xiaomi 14 Ultra', 'Xiaomi 14', 'Redmi Note 13 Pro+', 'Redmi Note 13', 'POCO X6 Pro', 'POCO F5'],
  OPPO: ['Find X7 Ultra', 'Find N3', 'Reno11 Pro', 'Reno11', 'A79 5G', 'A58'],
  Vivo: ['X100 Pro', 'X100', 'V30 Pro', 'V30', 'Y100', 'Y27s'],
  Realme: ['Realme 12 Pro+', 'Realme 12 Pro', 'Realme 12+', 'Realme C67', 'Realme C55', 'Realme 11']
};

const priceMap = {
    'Pro Max': 29990000,
    'Ultra': 31990000,
    'Pro': 25990000,
    'Plus': 23990000,
    'Fold5': 40990000,
    'Flip5': 20990000,
    'N3': 39990000,
    'Base': 18990000,
    'Mid': 9990000,
    'Low': 4990000
};

const getPrice = (name) => {
    if(name.includes('Ultra') || name.includes('Fold')) return priceMap['Ultra'];
    if(name.includes('Pro Max')) return priceMap['Pro Max'];
    if(name.includes('Pro')) return priceMap['Pro'];
    if(name.includes('Plus')) return priceMap['Plus'];
    if(name.includes('Flip')) return priceMap['Flip5'];
    if(name.includes('Reno') || name.includes('V30')) return priceMap['Base'];
    if(name.includes('Redmi') || name.includes('POCO') || name.includes('A55')) return priceMap['Mid'];
    return priceMap['Low'];
};

const getSpecs = (brand, name) => {
    let ram = '8GB';
    let storage = '256GB';
    let display = '6.7 inch OLED, 120Hz';
    if(name.includes('Pro') || name.includes('Ultra')) {
        ram = '12GB';
        storage = '512GB';
        display = '6.8 inch AMOLED, 120Hz';
    }
    return {
        os: brand === 'Apple' ? 'iOS 17' : 'Android 14',
        ram,
        storage,
        display,
        battery: brand === 'Apple' ? '4422 mAh' : '5000 mAh',
        camera: name.includes('Ultra') ? '200MP + 50MP + 50MP' : '50MP + 12MP + 10MP',
        processor: brand === 'Apple' ? 'Apple A17 Pro' : 'Snapdragon 8 Gen 3',
        connectivity: '5G, WiFi 7, Bluetooth 5.3',
        color: 'Titanium, Đen, Trắng',
        weight: '200g'
    };
};

async function seed() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ MongoDB Connected');

        // Create categories
        let phoneCat = await Category.findOne({ name: 'Điện thoại' });
        if (!phoneCat) {
            phoneCat = await Category.create({ name: 'Điện thoại', description: 'Điện thoại thông minh' });
        }
        
        let tabletCat = await Category.findOne({ name: 'Máy tính bảng' });
        if (!tabletCat) {
            tabletCat = await Category.create({ name: 'Máy tính bảng', description: 'Tablet' });
        }

        // Insert phones
        console.log('📦 Seeding phones...');
        for (const brand of brands) {
            const models = modelsTemplate[brand];
            for (let i = 0; i < models.length; i++) {
                const name = models[i];
                const price = getPrice(name);
                const comparePrice = price + 2000000;
                
                // Check if exists
                const exists = await Product.findOne({ name });
                if (!exists) {
                    await Product.create({
                        name,
                        brand,
                        category: phoneCat._id,
                        price,
                        comparePrice,
                        description: `Mẫu điện thoại ${name} chính hãng từ ${brand}. Trang bị cấu hình khủng, camera siêu nét và màn hình tuyệt đẹp. Đảm bảo trải nghiệm tuyệt vời cho mọi tác vụ từ giải trí đến công việc.`,
                        images: [
                            { url: imagePlaceholder(brand, 'phone'), isPrimary: true },
                            { url: imagePlaceholder(brand, 'phone_2'), isPrimary: false }
                        ],
                        stock: 50 + Math.floor(Math.random() * 100),
                        isFeatured: i === 0, // make the first model featured
                        isActive: true,
                        specs: getSpecs(brand, name)
                    });
                    console.log(`- Created ${name}`);
                }
            }
        }

        // Also add some tablets to ensure we have "đa dạng các loại sản phẩm"
        const tabletBrands = ['Apple', 'Samsung', 'Xiaomi'];
        const tabletModels = {
            Apple: ['iPad Pro M4', 'iPad Air M2', 'iPad Gen 10', 'iPad mini 6', 'iPad Pro M2', 'iPad Air 5'],
            Samsung: ['Galaxy Tab S9 Ultra', 'Galaxy Tab S9+', 'Galaxy Tab S9', 'Galaxy Tab S9 FE', 'Galaxy Tab A9+', 'Galaxy Tab A9'],
            Xiaomi: ['Xiaomi Pad 6S Pro', 'Xiaomi Pad 6', 'Redmi Pad SE', 'Xiaomi Pad 5', 'Redmi Pad', 'Xiaomi Pad 6 Max']
        };

        console.log('📦 Seeding tablets...');
        for (const brand of tabletBrands) {
            const models = tabletModels[brand];
            for (let i = 0; i < models.length; i++) {
                const name = models[i];
                const exists = await Product.findOne({ name });
                if (!exists) {
                    await Product.create({
                        name,
                        brand,
                        category: tabletCat._id,
                        price: 15990000,
                        comparePrice: 17990000,
                        description: `Máy tính bảng ${name} chính hãng từ ${brand}. Màn hình lớn, pin trâu, thích hợp học tập và làm việc.`,
                        images: [
                            { url: 'https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?w=500&q=80&auto=format&fit=crop', isPrimary: true }
                        ],
                        stock: 30,
                        isFeatured: false,
                        isActive: true,
                        specs: {
                            os: brand === 'Apple' ? 'iPadOS' : 'Android',
                            ram: '8GB',
                            storage: '128GB',
                            display: '11 inch IPS',
                            battery: '8000 mAh'
                        }
                    });
                    console.log(`- Created ${name}`);
                }
            }
        }

        console.log('🎉 Seed completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seed();
