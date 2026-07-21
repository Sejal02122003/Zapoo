import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { FoodAuditLog } from './src/modules/food/admin/models/auditLog.model.js';
import { FoodOrder } from './src/modules/food/orders/models/order.model.js';
import { FoodAdmin } from './src/core/admin/admin.model.js';
import { FoodDeliveryPartner } from './src/modules/food/delivery/models/deliveryPartner.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function seed() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to DB");

        const admin = await FoodAdmin.findOne({});
        if (!admin) {
            console.log("No admin found. Please create one.");
            process.exit(1);
        }

        const rider = await FoodDeliveryPartner.findOne({});
        if (!rider) {
            console.log("No rider found.");
            process.exit(1);
        }

        // Get 5 existing orders
        const orders = await FoodOrder.find({}).limit(5);
        if (orders.length === 0) {
            console.log("No orders found to update.");
            process.exit(1);
        }

        // Seed Audit Logs
        const logs = [];
        const today = new Date();
        
        for (let i = 0; i < orders.length; i++) {
            const order = orders[i];
            const amount = [50, 100, 150, 0, 200][i];
            const hasIncentive = amount > 0;
            const action = amount > 0 ? "INCENTIVE_ADDED" : "ASSIGN_RIDER";
            
            // Give 2 of them a city in deliveryAddress if possible
            if (!order.deliveryAddress) order.deliveryAddress = {};
            order.deliveryAddress.city = i % 2 === 0 ? "Mumbai" : "Delhi";

            await FoodOrder.updateOne({ _id: order._id }, {
                $set: {
                    deliveryAssignment: {
                        assignedBy: admin._id,
                        assignedAt: new Date(today.getTime() - i * 24 * 60 * 60 * 1000),
                        assignmentType: "MANUAL",
                        incentive: amount,
                        incentiveReason: hasIncentive ? "Bad weather" : "",
                        incentiveStatus: hasIncentive ? (i === 1 ? "CANCELLED" : "PENDING") : "PENDING"
                    },
                    dispatch: {
                        offeredTo: [
                            { partnerId: rider._id, action: i === 1 ? "rejected" : "accepted", timestamp: new Date() }
                        ]
                    }
                }
            });

            logs.push({
                action: action,
                performedBy: admin._id,
                orderId: order._id,
                riderId: rider._id,
                incentiveAmount: amount,
                reason: hasIncentive ? "Bad weather" : "",
                createdAt: new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
            });

            if (i === 1 && hasIncentive) {
                logs.push({
                    action: "INCENTIVE_CANCELLED",
                    performedBy: admin._id,
                    orderId: order._id,
                    riderId: rider._id,
                    incentiveAmount: amount,
                    reason: "Rider rejected order",
                    createdAt: new Date(today.getTime() - i * 12 * 60 * 60 * 1000)
                });
            }
        }

        await FoodAuditLog.deleteMany({});
        await FoodAuditLog.insertMany(logs);

        console.log("Seeding complete! Check your Admin Panel.");
        process.exit(0);

    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seed();
