import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { FoodRestaurantCommission } from '../modules/food/admin/models/restaurantCommission.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function runMigration() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/zapoo';
        console.log(`Connecting to MongoDB...`);
        await mongoose.connect(mongoUri);
        console.log(`Connected successfully.`);

        const docs = await FoodRestaurantCommission.find({});
        console.log(`Found ${docs.length} restaurant commission records to verify/migrate.`);

        let updatedCount = 0;
        for (const doc of docs) {
            let modified = false;

            const defaultVal = doc.defaultCommission?.value || 0;
            const defaultType = doc.defaultCommission?.type || 'percentage';

            if (!doc.deliveryCommission || !doc.deliveryCommission.value) {
                doc.deliveryCommission = { type: defaultType, value: defaultVal };
                modified = true;
            }

            if (!doc.takeawayCommission || !doc.takeawayCommission.value) {
                doc.takeawayCommission = { type: defaultType, value: defaultVal };
                modified = true;
            }

            if (modified) {
                await doc.save();
                updatedCount++;
            }
        }

        console.log(`Migration complete! Updated ${updatedCount} records.`);
    } catch (err) {
        console.error(`Migration error:`, err);
    } finally {
        await mongoose.disconnect();
        console.log(`Disconnected from MongoDB.`);
    }
}

runMigration();
