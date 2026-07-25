import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { FoodShiftBooking } from '../models/shiftBooking.model.js';
import { FoodDeliveryPartner } from '../../delivery/models/deliveryPartner.model.js';

async function assignToYash() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/zapoo';
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        const yash = await FoodDeliveryPartner.findOne({ name: /yash/i }).lean();
        if (!yash) {
            console.log('Yash delivery partner not found');
            return;
        }

        console.log('Found Yash delivery partner:', yash._id, yash.name, yash.phone);

        const result = await FoodShiftBooking.updateMany(
            {},
            { 
                $set: { 
                    riderId: yash._id, 
                    riderName: yash.name, 
                    riderPhone: yash.phone 
                } 
            }
        );

        console.log(`Updated ${result.modifiedCount} shift bookings to Yash (${yash.name}, ${yash.phone})!`);
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

assignToYash();
