'use strict';
require('dotenv').config();
const mongoose = require('mongoose');

async function fixAppleBrands() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/phonestore';
    await mongoose.connect(mongoUri);
    const db = mongoose.connection;
    const res = await db.collection('products').updateMany(
      { brand: { $in: ['Apple (iPhone)', 'Apple(iPhone)', 'iPhone', 'apple (iphone)'] } },
      { $set: { brand: 'Apple' } }
    );
    console.log(`✅ Updated ${res.modifiedCount} legacy Apple brand products in MongoDB.`);
    await mongoose.disconnect();
  } catch (err) {
    console.warn('DB update warning:', err.message);
  }
}

fixAppleBrands();
