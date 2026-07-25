import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { DeliveryPolicyVersion } from '../modules/food/admin/models/deliveryPolicy.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function seedDeliveryPolicy() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/zapoo';
        console.log('Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB.');

        const existingPolicy = await DeliveryPolicyVersion.findOne({});
        if (existingPolicy) {
            console.log('Active Delivery Policy Version already exists:', existingPolicy);
        } else {
            const created = await DeliveryPolicyVersion.create({
                enablePenalty: true,
                penaltyRate: 1, // ₹1 per minute late
                graceMinutes: 5, // 5 minutes grace period
                maxDeduction: 100, // Max ₹100 penalty
                autoDeduct: true,
                excludedReasons: ['Restaurant Delay', 'Customer Delay', 'Weather', 'Traffic Override', 'System Outage'],
                minOrderValue: 100,
                effectiveFrom: new Date()
            });
            console.log('Successfully seeded default Delivery Policy Version:', created);
        }
    } catch (err) {
        console.error('Error seeding Delivery Policy:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
    }
}

seedDeliveryPolicy();
