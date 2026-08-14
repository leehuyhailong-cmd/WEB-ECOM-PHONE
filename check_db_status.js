const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const Product = require('./src/models/Product');
    const total = await Product.collection.countDocuments();
    const unsplashCount = await Product.collection.countDocuments({ 'images.url': { $regex: 'unsplash' } });
    console.log('Total products in DB:', total);
    console.log('Products with unsplash images:', unsplashCount);
    process.exit(0);
}).catch(console.error);
