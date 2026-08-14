const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();
const Product = require('./src/models/Product');

async function main() {
    await mongoose.connect(process.env.MONGO_URI);
    
    const sourceDir = path.join(__dirname, 'source image');
    const destDir = path.join(__dirname, 'public', 'images');
    
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, {recursive: true});
    
    const files = fs.readdirSync(sourceDir);
    // Copy files
    for (let file of files) {
        fs.copyFileSync(path.join(sourceDir, file), path.join(destDir, file));
    }
    
    // Use lean to avoid validation issues with existing data when loading
    const products = await Product.find({}).lean();
    
    let updatedCount = 0;
    for (let product of products) {
        let match = files.find(f => {
            let nameWithoutExt = path.parse(f).name;
            let normalize = str => str.toLowerCase().replace(/[^a-z0-9]/g, '');
            return normalize(nameWithoutExt) === normalize(product.name);
        });
        
        if (!match) {
            let normalize = str => str.toLowerCase().replace(/[^a-z0-9]/g, '');
            let pNorm = normalize(product.name);
            match = files.find(f => {
                let fNorm = normalize(path.parse(f).name);
                return pNorm.includes(fNorm) || fNorm.includes(pNorm);
            });
        }
        
        if (match) {
            await Product.collection.updateOne(
                { _id: product._id },
                { $set: { images: [{ url: `/images/${match}`, isPrimary: true }] } }
            );
            updatedCount++;
            console.log(`[+] Cập nhật ảnh thật cho: ${product.name}`);
        }
    }
    
    console.log(`\nĐã cập nhật ảnh cho ${updatedCount} sản phẩm.`);

    // Check which ones still have unsplash images
    const missing = await Product.collection.find({ 'images.url': { $regex: 'unsplash' } }).toArray();
    if (missing.length > 0) {
        console.log(`\n[-] Còn ${missing.length} sản phẩm vẫn thiếu ảnh thật. Tiến hành xóa...`);
        const result = await Product.collection.deleteMany({ 'images.url': { $regex: 'unsplash' } });
        console.log(`Đã xóa ${result.deletedCount} sản phẩm.`);
    } else {
        console.log(`\nTất cả sản phẩm đều đã có ảnh thật.`);
    }
    
    process.exit(0);
}
main().catch(console.error);
