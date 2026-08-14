const mongoose = require('mongoose');
require('dotenv').config();

async function checkMapping() {
    await mongoose.connect(process.env.MONGO_URI);
    const Product = require('./src/models/Product');
    const products = await Product.find({}).lean();
    
    products.forEach(p => {
        console.log(`[${p.brand}] ${p.name} -> ${p.images?.[0]?.url}`);
    });
    
    process.exit(0);
}
checkMapping().catch(console.error);
