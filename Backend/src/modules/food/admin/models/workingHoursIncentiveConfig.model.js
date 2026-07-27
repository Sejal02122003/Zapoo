import mongoose from 'mongoose';

const workingHoursIncentiveConfigSchema = new mongoose.Schema(
    {
        tierName: {
            type: String,
            required: true,
            trim: true
        },
        minHours: {
            type: Number,
            required: true,
            min: 1
        },
        incentiveAmount: {
            type: Number,
            required: true,
            min: 0
        },
        isEnabled: {
            type: Boolean,
            default: true
        },
        description: {
            type: String,
            default: '',
            trim: true
        }
    },
    { collection: 'food_working_hours_incentive_configs', timestamps: true }
);

workingHoursIncentiveConfigSchema.index({ minHours: 1 });
workingHoursIncentiveConfigSchema.index({ isEnabled: 1 });

export const FoodWorkingHoursIncentiveConfig = mongoose.model(
    'FoodWorkingHoursIncentiveConfig',
    workingHoursIncentiveConfigSchema
);
