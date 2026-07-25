import mongoose from 'mongoose';

const cashbackRuleSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            trim: true,
            default: 'Cashback Offer'
        },
        restaurantScope: {
            type: String,
            enum: ['ALL', 'SELECTED'],
            default: 'ALL',
            required: true,
            index: true
        },
        restaurantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodRestaurant',
            default: null,
            index: true
        },
        orderType: {
            type: String,
            enum: ['DELIVERY', 'TAKEAWAY', 'BOTH'],
            default: 'BOTH',
            required: true,
            index: true
        },
        minOrderValue: {
            type: Number,
            default: 0,
            min: 0
        },
        cashbackType: {
            type: String,
            enum: ['PERCENTAGE', 'FLAT'],
            default: 'PERCENTAGE',
            required: true
        },
        cashbackValue: {
            type: Number,
            required: true,
            min: 0
        },
        maxCashbackAmount: {
            type: Number,
            default: null,
            min: 0
        },
        expiryDays: {
            type: Number,
            default: 60,
            min: 1
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodAdmin',
            default: null
        }
    },
    {
        collection: 'food_cashback_rules',
        timestamps: true
    }
);

cashbackRuleSchema.index({ restaurantScope: 1, restaurantId: 1, isActive: 1, orderType: 1 });

export const CashbackRule = mongoose.model('CashbackRule', cashbackRuleSchema);
