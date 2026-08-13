import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { FoodLandingSettings } from '../modules/food/landing/models/landingSettings.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const run = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/zapoo';
        console.log('Connecting to Mongo:', mongoUri);
        await mongoose.connect(mongoUri);

        const targetUrl = 'https://play.google.com/store/search?q=zapoo&c=apps&hl=en_IN';
        const result = await FoodLandingSettings.updateMany(
            {},
            { $set: { 'appLinks.playStore': targetUrl } }
        );

        console.log(`Successfully updated ${result.modifiedCount} landing settings documents to ${targetUrl}`);
        process.exit(0);
    } catch (err) {
        console.error('Error updating landing settings:', err);
        process.exit(1);
    }
};

run();
