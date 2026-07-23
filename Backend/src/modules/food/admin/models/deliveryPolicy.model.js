import mongoose from 'mongoose';

const deliveryPolicyVersionSchema = new mongoose.Schema(
    {
        enablePenalty: { type: Boolean, default: true },
        penaltyRate: { type: Number, required: true, min: 0, default: 1 }, // INR per minute
        graceMinutes: { type: Number, required: true, min: 0, default: 5 },
        maxDeduction: { type: Number, required: true, min: 0, default: 100 },
        autoDeduct: { type: Boolean, default: true },
        excludedReasons: { 
            type: [String], 
            default: ['Restaurant Delay', 'Customer Delay', 'Weather', 'Traffic Override', 'System Outage', 'Below Minimum Order Value', 'Admin Override'] 
        },
        minOrderValue: { type: Number, required: true, min: 0, default: 100 },
        effectiveFrom: { type: Date, required: true, default: Date.now },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },
    { collection: 'food_delivery_policy_versions', timestamps: true }
);

deliveryPolicyVersionSchema.index({ effectiveFrom: -1 });

export const DeliveryPolicyVersion = mongoose.model('DeliveryPolicyVersion', deliveryPolicyVersionSchema);
