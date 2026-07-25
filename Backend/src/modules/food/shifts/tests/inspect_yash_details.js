import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { FoodDeliveryPartner } from '../../delivery/models/deliveryPartner.model.js';

async function check() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/zapoo';
        await mongoose.connect(mongoUri);
        
        const yash = await FoodDeliveryPartner.findOne({ name: /yash/i }).lean();
        console.log('Yash partner doc:', JSON.stringify(yash, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

check();
