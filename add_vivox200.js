const mongoose = require('mongoose');
require('dotenv').config();

async function addVivoX200() {
    await mongoose.connect(process.env.MONGO_URI);
    const Product = require('./src/models/Product');
    
    let existing = await Product.collection.findOne({ slug: 'vivo-x200-pro-5g' });
    if (!existing) {
        await Product.collection.insertOne({
            name: 'Vivo X200 Pro 5G',
            slug: 'vivo-x200-pro-5g',
            brand: 'Vivo',
            category: 'smartphone',
            tags: ['vivo', 'zeiss', 'flagship', 'x200'],
            price: 24990000,
            comparePrice: 27990000,
            stock: 25,
            soldCount: 40,
            avgRating: 4.9,
            reviewCount: 30,
            isFeatured: true,
            description: 'Đột phá nhiếp ảnh với cụm ống kính ZEISS APO, vi xử lý Dimensity 9400 cực khủng.',
            images: [{ url: '/images/vivo x200.jpg', isPrimary: true }],
            specs: {
                display: '6.78 inch AMOLED 120Hz',
                processor: 'MediaTek Dimensity 9400',
                ram: '16GB',
                storage: '512GB',
                camera: '50MP ZEISS + 200MP Periscope Telephoto',
                battery: '6000 mAh, Sạc 90W'
            },
            createdAt: new Date(),
            updatedAt: new Date()
        });
        console.log('Added Vivo X200 Pro 5G to DB.');
    } else {
        console.log('Vivo X200 Pro 5G already in DB.');
    }
    
    process.exit(0);
}
addVivoX200().catch(console.error);
