import mongoose from 'mongoose';

const shiftSettlementSchema = new mongoose.Schema(
    {
        shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodShift', required: true, index: true },
        riderId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodDeliveryPartner', required: true, index: true },
        
        attendancePercentage: { type: Number, required: true },
        completedOrders: { type: Number, required: true },
        actualEarnings: { type: Number, required: true },
        guaranteeAmount: { type: Number, required: true },
        guaranteeBonus: { type: Number, required: true },
        
        eligibilityStatus: { 
            type: String, 
            enum: ['ELIGIBLE', 'REJECTED_ATTENDANCE', 'REJECTED_ORDERS', 'REJECTED_FRAUD'], 
            required: true 
        },
        rejectionReason: { type: String }, // Populated when not eligible
        
        settledAt: { type: Date, default: Date.now },
        
        // Snapshot rules reference for complete auditability
        policyVersion: {
            guaranteeAmount: { type: Number, required: true },
            minimumOrders: { type: Number, required: true },
            minimumLoginPercentage: { type: Number, required: true }
        }
    },
    { collection: 'food_shift_settlements', timestamps: true }
);

// Immutable record rule: Prevent edits
shiftSettlementSchema.pre('save', function(next) {
    if (!this.isNew) {
        return next(new Error('ShiftSettlement records are immutable and cannot be updated. Create adjustment records instead.'));
    }
    next();
});

// Idempotency: Ensure settlement runs only once per rider per shift
shiftSettlementSchema.index({ shiftId: 1, riderId: 1 }, { unique: true });

export const FoodShiftSettlement = mongoose.model('FoodShiftSettlement', shiftSettlementSchema);
