import mongoose from 'mongoose';

const shiftSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        startTime: { type: Date, required: true },
        endTime: { type: Date, required: true },
        guaranteeAmount: { type: Number, required: true, min: 0 },
        minimumOrders: { type: Number, required: true, min: 0 },
        minimumLoginPercentage: { type: Number, required: true, min: 0, max: 100 },
        city: { type: String, required: true },
        maxPartners: { type: Number, required: true, min: 1 },
        bonusEnabled: { type: Boolean, default: true },
        isActive: { type: Boolean, default: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },
    { collection: 'food_shifts', timestamps: true }
);

// Indexes
shiftSchema.index({ startTime: 1, endTime: 1 });
shiftSchema.index({ city: 1, isActive: 1 });

export const FoodShift = mongoose.model('FoodShift', shiftSchema);
