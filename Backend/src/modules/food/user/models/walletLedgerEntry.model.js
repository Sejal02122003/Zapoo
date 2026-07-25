import mongoose from 'mongoose';

const walletLedgerEntrySchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodUser',
            required: true,
            index: true
        },
        entryType: {
            type: String,
            enum: ['TOPUP', 'CASHBACK', 'ORDER_PAYMENT', 'REFUND', 'EXPIRY_DEDUCTION', 'ADMIN_ADJUSTMENT'],
            required: true,
            index: true
        },
        sourceType: {
            type: String,
            enum: ['CASH', 'PROMOTIONAL'],
            required: true,
            default: 'CASH',
            index: true
        },
        amount: {
            type: Number,
            required: true
        },
        originalAmount: {
            type: Number,
            default: 0
        },
        remainingAmount: {
            type: Number,
            default: 0,
            index: true
        },
        expiryDate: {
            type: Date,
            default: null,
            index: true
        },
        status: {
            type: String,
            enum: ['ACTIVE', 'PARTIALLY_USED', 'FULLY_USED', 'EXPIRED'],
            default: 'ACTIVE',
            index: true
        },
        relatedOrderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodOrder',
            default: null
        },
        description: {
            type: String,
            trim: true,
            default: ''
        },
        metadata: {
            type: Object,
            default: {}
        }
    },
    {
        collection: 'food_wallet_ledger_entries',
        timestamps: true
    }
);

walletLedgerEntrySchema.index({ userId: 1, sourceType: 1, status: 1, expiryDate: 1 });
walletLedgerEntrySchema.index({ entryType: 1, status: 1, expiryDate: 1 });

export const WalletLedgerEntry = mongoose.model('WalletLedgerEntry', walletLedgerEntrySchema);
