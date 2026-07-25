import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { FoodShiftBooking } from '../models/shiftBooking.model.js';
import { FoodDeliveryPartner } from '../../delivery/models/deliveryPartner.model.js';
import { FoodUser } from '../../../../core/users/user.model.js';
import { FoodAdmin } from '../../../../core/admin/admin.model.js';

async function updateBookings() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/zapoo';
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        const bookings = await FoodShiftBooking.find({}).lean();
        console.log(`Found ${bookings.length} shift bookings to update`);

        for (const b of bookings) {
            let name = null;
            let phone = null;

            const partner = await FoodDeliveryPartner.findById(b.riderId).lean() || await FoodDeliveryPartner.findOne({ userId: b.riderId }).lean();
            const user = await FoodUser.findById(b.riderId).lean();
            const admin = await FoodAdmin.findById(b.riderId).lean();

            if (partner && partner.name) {
                name = partner.name;
                phone = partner.phone;
            } else if (user && user.name) {
                name = user.name;
                phone = user.phone;
            } else if (admin && admin.name) {
                name = admin.name;
                phone = admin.phone;
            } else {
                name = `Rider ${String(b.riderId).slice(-6)}`;
            }

            await FoodShiftBooking.updateOne(
                { _id: b._id },
                { $set: { riderName: name, riderPhone: phone } }
            );

            console.log(`Updated booking ${b._id}: riderName = "${name}", riderPhone = "${phone}"`);
        }

        console.log('✅ ALL BOOKINGS UPDATED WITH RIDER NAMES!');
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

updateBookings();
