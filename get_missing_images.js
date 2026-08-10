const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Product = require('./src/models/Product');
  const products = await Product.find({ $or: [{ images: { $size: 0 } }, { images: { $exists: false } }] }, 'name');
  
  if (products.length === 0) {
    console.log("Tất cả sản phẩm đều có ảnh minh hoạ.");
  } else {
    console.log("Danh sách sản phẩm thiếu ảnh minh hoạ:");
    products.forEach(p => console.log(`- ${p.name}`));
  }
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
