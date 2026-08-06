require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./src/models/Product');

async function main() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // find products
        const products = await Product.find({}, 'name images');
        console.log('Total products:', products.length);

        for (const p of products) {
            if (p.name.toLowerCase().includes('airpods')) {
                console.log('Found Airpods:', p.name);
                p.images = [{ url: '/images/AirPods Pro Gen 2 (USB-C).PNG', isPrimary: true }];
                await p.save();
                console.log('Updated AirPods');
            }
            if (p.name.toLowerCase().includes('20w')) {
                console.log('Found Charger 20w:', p.name);
                p.images = [{ url: '/images/cu-sac-nhanh-20w-iphone_type c.jpg', isPrimary: true }];
                await p.save();
                console.log('Updated Charger');
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
}
main();
