import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { shiftService } from '../services/shift.service.js';
import { shiftRepository } from '../repositories/shift.repository.js';
import { FoodShiftPayout } from '../models/payout.model.js';

async function checkPayouts() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/zapoo';
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        await shiftService.syncPendingPayoutsForBookings();

        const allPayouts = await FoodShiftPayout.find({}).lean();
        console.log(`Found ${allPayouts.length} FoodShiftPayout documents in DB:`);
        console.log(JSON.stringify(allPayouts, null, 2));

        const populated = await shiftRepository.getPayouts({}, { sort: { createdAt: -1 } });
        console.log('\nPopulated payouts via shiftRepository.getPayouts:');
        console.log(JSON.stringify(populated, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

checkPayouts();
