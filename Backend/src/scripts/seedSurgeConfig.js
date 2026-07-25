import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { FoodSurgeConfig } from '../modules/food/admin/models/surgeConfig.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function seedGlobalSurgeConfig() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/zapoo';
        console.log('Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB.');

        const existingGlobal = await FoodSurgeConfig.findOne({ restaurantId: null });
        if (existingGlobal) {
            console.log('Global default SurgeConfig already exists in DB.');
        } else {
            const created = await FoodSurgeConfig.create({
                restaurantId: null,
                enabled: true,
                lowThresholdRatio: 1.2,
                highThresholdRatio: 3.0,
                baseSurgeAmount: 10,
                maxSurgeAmount: 50,
                smoothingAlpha: 0.3,
                riderSurgeSharePercent: 80,
                radiusKm: 10
            });
            console.log('Successfully seeded global default SurgeConfig.');
        }
    } catch (err) {
        console.error('Error seeding global SurgeConfig:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
    }
}

seedGlobalSurgeConfig();
