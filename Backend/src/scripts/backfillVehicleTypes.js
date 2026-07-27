import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { FoodDeliveryPartner } from '../modules/food/delivery/models/deliveryPartner.model.js';
import { VehicleRangeConfig } from '../modules/food/admin/models/vehicleRangeConfig.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const ALLOWED_TYPES = ['BICYCLE', 'BIKE', 'SCOOTER', 'CAR'];

async function runVehicleBackfillMigration() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/zapoo';
        console.log('Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('Connected successfully.');

        // 1. Seed Vehicle Range Config Defaults if missing
        const defaultConfigs = [
            { vehicleType: 'BICYCLE', maxRangeKm: 3, description: 'Bicycle max delivery radius' },
            { vehicleType: 'BIKE', maxRangeKm: 10, description: 'Standard Bike max delivery radius' },
            { vehicleType: 'SCOOTER', maxRangeKm: 12, description: 'Scooter max delivery radius' },
            { vehicleType: 'CAR', maxRangeKm: 25, description: 'Car max delivery radius' }
        ];

        for (const cfg of defaultConfigs) {
            const exists = await VehicleRangeConfig.findOne({ vehicleType: cfg.vehicleType });
            if (!exists) {
                await VehicleRangeConfig.create({ ...cfg, allowFallbackToLargerVehicle: true });
                console.log(`Seeded default VehicleRangeConfig for ${cfg.vehicleType}`);
            }
        }

        // 2. Backfill existing riders
        const riders = await FoodDeliveryPartner.find({});
        console.log(`Found ${riders.length} delivery partners to inspect/backfill.`);

        let updatedCount = 0;
        for (const rider of riders) {
            let modified = false;
            let currentType = rider.vehicleType ? String(rider.vehicleType).trim().toUpperCase() : '';

            if (!ALLOWED_TYPES.includes(currentType)) {
                rider.vehicleType = 'BIKE';
                rider.needsVehicleConfirmation = true;
                modified = true;
            } else if (rider.vehicleType !== currentType) {
                rider.vehicleType = currentType;
                modified = true;
            }

            if (rider.vehicleType === 'BICYCLE' && rider.vehicleNumber) {
                rider.vehicleNumber = undefined;
                modified = true;
            }

            if (modified) {
                await rider.save();
                updatedCount++;
            }
        }

        console.log(`Vehicle backfill migration complete! Updated ${updatedCount} rider records.`);
    } catch (err) {
        console.error('Error running vehicle backfill migration:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
    }
}

runVehicleBackfillMigration();
