import mongoose from 'mongoose';

const bankSnapshotSchema = new mongoose.Schema({
    accountHolderName: { type: String, default: '' },
    accountNumber: { type: String, default: '' }, // Decrypted snapshot at payout creation time
    ifscCode: { type: String, default: '' },
    bankName: { type: String, default: '' },
    upiId: { type: String, default: '' },
    upiQrCode: { type: String, default: '' }
}, { _id: false });

const shiftPayoutSchema = new mongoose.Schema(
    {
        riderId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodDeliveryPartner', required: true, index: true },
        shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodShift', required: true, index: true },
        shiftSettlementId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodShiftSettlement', required: false, sparse: true, index: true },
        
        amount: { type: Number, required: true, min: 0 },
        status: { 
            type: String, 
            enum: ['PENDING', 'PAID', 'FAILED', 'ON_HOLD'], 
            default: 'PENDING',
            index: true 
        },
        
        bankDetailsSnapshot: { type: bankSnapshotSchema, required: true },
        
        referenceNumber: { type: String, trim: true }, // Transaction / UTR ref
        note: { type: String, trim: true },
        holdReason: { type: String, trim: true },
        
        paidAt: { type: Date },
        paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },
    { collection: 'food_shift_payouts', timestamps: true }
);

shiftPayoutSchema.index({ status: 1, createdAt: -1 });

export const FoodShiftPayout = mongoose.model('FoodShiftPayout', shiftPayoutSchema);
