import mongoose from 'mongoose';

const cashbackLedgerSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodUser',
            required: true,
            index: true
        },
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodOrder',
            required: true,
            index: true
        },
        sourceType: {
            type: String,
            enum: ['RULE', 'COUPON'],
            required: true,
            index: true
        },
        cashbackRuleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'CashbackRule',
            default: null
        },
        couponId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Coupon',
            default: null
        },
        amount: {
            type: Number,
            required: true,
            min: 0
        },
        status: {
            type: String,
            enum: ['PENDING', 'CREDITED', 'REVERSED'],
            default: 'PENDING',
            required: true,
            index: true
        },
        creditedAt: {
            type: Date,
            default: null
        },
        reversedAt: {
            type: Date,
            default: null
        },
        reversalReason: {
            type: String,
            default: null
        }
    },
    {
        collection: 'food_cashback_ledgers',
        timestamps: true
    }
);

cashbackLedgerSchema.index({ userId: 1, status: 1 });
cashbackLedgerSchema.index({ orderId: 1, status: 1 });

export const CashbackLedger = mongoose.model('CashbackLedger', cashbackLedgerSchema);
