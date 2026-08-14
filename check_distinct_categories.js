const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const Product = require('./src/models/Product');
    const categories = await Product.collection.distinct('category');
    console.log('Distinct category values in Product collection:', categories);
    
    for (const cat of categories) {
        const count = await Product.collection.countDocuments({ category: cat });
        console.log(`- Category "${cat}": ${count} products`);
    }
    process.exit(0);
}).catch(console.error);
