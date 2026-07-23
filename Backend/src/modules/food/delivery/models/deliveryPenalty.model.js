import mongoose from 'mongoose';

const deliveryPenaltySchema = new mongoose.Schema(
    {
        orderId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'FoodOrder', 
            required: true,
            index: true 
        },
        riderId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'FoodDeliveryPartner', 
            required: true,
            index: true 
        },
        expectedDelivery: { type: Date, required: true },
        deliveredAt: { type: Date, required: true },
        graceMinutes: { type: Number, required: true, min: 0 },
        lateMinutes: { type: Number, required: true },
        chargeableMinutes: { type: Number, required: true, min: 0 },
        penaltyPerMinute: { type: Number, required: true, min: 0 },
        penaltyAmount: { type: Number, required: true, min: 0 },
        policyVersionId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'DeliveryPolicyVersion',
            required: true 
        },
        reason: { type: String, trim: true, default: '' },
        status: { 
            type: String, 
            enum: ['PENDING', 'APPLIED', 'APPEALED', 'REFUNDED', 'WAIVED', 'DISABLED'], 
            default: 'PENDING',
            index: true
        },
        appliedAt: { type: Date },
        
        // Appeal sub-fields (so we don't need a separate collection)
        appealReason: { type: String, trim: true, default: '' },
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reviewedAt: { type: Date },
        resolutionNote: { type: String, trim: true, default: '' }
    },
    { collection: 'food_delivery_penalties', timestamps: true }
);

deliveryPenaltySchema.index({ riderId: 1, createdAt: -1 });

export const DeliveryPenalty = mongoose.model('DeliveryPenalty', deliveryPenaltySchema);
