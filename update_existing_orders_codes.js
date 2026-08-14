const mongoose = require('mongoose');
require('dotenv').config();

async function updateOrderCodes() {
    await mongoose.connect(process.env.MONGO_URI);
    const Order = require('./src/models/Order');

    const orders = await Order.collection.find({}).toArray();
    console.log(`Updating ${orders.length} orders in MongoDB with realistic order codes...`);

    let idx = 1;
    for (const o of orders) {
        const orderCode = `ORD-${9800 + idx}`;
        await Order.collection.updateOne(
            { _id: o._id },
            { $set: { orderCode } }
        );
        idx++;
    }

    console.log('✅ Updated all existing orders with realistic orderCode fields!');
    process.exit(0);
}

updateOrderCodes().catch(console.error);
