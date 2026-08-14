const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Product = require('./src/models/Product');
  const products = await Product.find({ 'images.url': { $regex: 'unsplash' } }, 'name');
  
  if (products.length === 0) {
    console.log("Tất cả sản phẩm đã có ảnh thật.");
  } else {
    console.log("Danh sách sản phẩm chưa có ảnh thật (đang dùng ảnh mẫu unsplash):");
    products.forEach(p => console.log(`- ${p.name}`));
  }
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
