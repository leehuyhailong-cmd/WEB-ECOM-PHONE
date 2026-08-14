const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const Product = require('./src/models/Product');
    const Category = require('./src/models/Category');
    
    const categories = await Category.find({}).lean();
    console.log('Categories count:', categories.length);
    
    for (const cat of categories) {
        const count = await Product.countDocuments({ category: cat._id });
        console.log(`Category: ${cat.name} (${cat.slug}) -> ${count} products`);
    }
    
    // Also check products by category string or ref
    const sampleProducts = await Product.find({}).limit(5).lean();
    console.log('\nSample product category values:', sampleProducts.map(p => p.category));
    
    process.exit(0);
}).catch(console.error);
