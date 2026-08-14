const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
    await mongoose.connect(process.env.MONGO_URI);
    const Product = require('./src/models/Product');
    
    const sourceDir = path.join(__dirname, 'public', 'images');
    const files = fs.readdirSync(sourceDir);
    
    const products = await Product.find({}).lean();
    console.log(`Total products in DB: ${products.length}`);
    console.log(`Total image files in public/images: ${files.length}`);
    
    console.log('\n--- IMAGE FILES ---');
    files.forEach(f => console.log('File:', f));
    
    process.exit(0);
}
check().catch(console.error);
