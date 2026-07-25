import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { shiftService } from '../services/shift.service.js';

async function fixIndex() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/zapoo';
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        const db = mongoose.connection.db;
        try {
            await db.collection('food_shift_payouts').dropIndex('shiftSettlementId_1');
            console.log('Dropped old shiftSettlementId_1 index');
        } catch (e) {
            console.log('Index drop note:', e.message);
        }

        await db.collection('food_shift_payouts').createIndex(
            { shiftSettlementId: 1 }, 
            { sparse: true }
        );
        console.log('Recreated shiftSettlementId_1 sparse index');

        await shiftService.syncPendingPayoutsForBookings();
        console.log('✅ SYNCED PENDING PAYOUTS FOR BOOKINGS CLEANLY!');
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

fixIndex();
