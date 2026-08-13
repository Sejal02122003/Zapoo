import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { FoodRestaurant } from '../modules/food/restaurant/models/restaurant.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const run = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/zapoo';
        console.log('Connecting to Mongo:', mongoUri);
        await mongoose.connect(mongoUri);

        const result = await FoodRestaurant.updateMany(
            { $or: [{ isTakeawayEnabled: { $exists: false } }, { isTakeawayEnabled: false }] },
            { $set: { isTakeawayEnabled: true } }
        );

        console.log(`Successfully updated ${result.modifiedCount} restaurants to have isTakeawayEnabled = true.`);
        process.exit(0);
    } catch (err) {
        console.error('Error updating takeaway enabled status:', err);
        process.exit(1);
    }
};

run();
