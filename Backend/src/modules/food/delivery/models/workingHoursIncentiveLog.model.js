import mongoose from 'mongoose';

const workingHoursIncentiveLogSchema = new mongoose.Schema(
    {
        riderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodDeliveryPartner',
            required: true,
            index: true
        },
        tierId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodWorkingHoursIncentiveConfig',
            required: true
        },
        tierName: {
            type: String,
            required: true
        },
        minHours: {
            type: Number,
            required: true
        },
        incentiveAmount: {
            type: Number,
            required: true,
            min: 0
        },
        claimedAt: {
            type: Date,
            default: Date.now,
            index: true
        }
    },
    { collection: 'food_working_hours_incentive_logs', timestamps: true }
);

workingHoursIncentiveLogSchema.index({ riderId: 1, tierId: 1, claimedAt: -1 });

export const FoodWorkingHoursIncentiveLog = mongoose.model(
    'FoodWorkingHoursIncentiveLog',
    workingHoursIncentiveLogSchema
);
