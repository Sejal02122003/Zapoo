import mongoose from 'mongoose';

const walletTransactionSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ['addition', 'deduction', 'refund', 'cashback', 'expiry'],
            required: true
        },
        amount: { type: Number, required: true },
        status: { type: String, default: 'Completed' },
        description: { type: String, default: '' },
        metadata: { type: Object, default: {} },
        razorpayOrderId: { type: String, default: null },
        razorpayPaymentId: { type: String, default: null },
        razorpaySignature: { type: String, default: null }
    },
    { timestamps: true }
);

const userWalletSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, index: true },
        cashBalance: { type: Number, default: 0, min: 0 },
        cashbackBalance: { type: Number, default: 0, min: 0 },
        balance: { type: Number, default: 0, min: 0 },
        referralEarnings: { type: Number, default: 0, min: 0 },
        transactions: { type: [walletTransactionSchema], default: [] }
    },
    { collection: 'food_user_wallets', timestamps: true }
);

export const FoodUserWallet = mongoose.model('FoodUserWallet', userWalletSchema);
