import mongoose from 'mongoose';

const itemDiscountRuleSchema = new mongoose.Schema(
    {
        restaurantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodRestaurant',
            required: true,
            index: true
        },
        scope: {
            type: String,
            enum: ['MENU_ITEM', 'CATEGORY', 'RESTAURANT_WIDE'],
            default: 'RESTAURANT_WIDE',
            required: true,
            index: true
        },
        targetId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
            index: true
        },
        targetName: {
            type: String,
            trim: true,
            default: ''
        },
        orderType: {
            type: String,
            enum: ['DELIVERY', 'TAKEAWAY', 'ALL'],
            default: 'ALL',
            required: true,
            index: true
        },
        discountType: {
            type: String,
            enum: ['PERCENTAGE', 'FLAT'],
            default: 'PERCENTAGE',
            required: true
        },
        discountValue: {
            type: Number,
            required: true,
            min: 0
        },
        maxDiscountAmount: {
            type: Number,
            default: null,
            min: 0
        },
        stackable: {
            type: Boolean,
            default: true
        },
        effectiveFrom: {
            type: Date,
            default: null
        },
        effectiveTill: {
            type: Date,
            default: null
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
        collection: 'food_item_discount_rules',
        timestamps: true
    }
);

itemDiscountRuleSchema.index({ restaurantId: 1, isActive: 1, orderType: 1 });
itemDiscountRuleSchema.index({ scope: 1, targetId: 1, isActive: 1 });

export const ItemDiscountRule = mongoose.model('ItemDiscountRule', itemDiscountRuleSchema);
