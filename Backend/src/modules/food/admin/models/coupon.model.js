import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
            index: true
        },
        restaurantScope: {
            type: String,
            enum: ['ALL', 'SPECIFIC'],
            default: 'ALL',
            required: true,
            index: true
        },
        restaurantIds: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'FoodRestaurant'
            }
        ],
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
        maxDiscountCap: {
            type: Number,
            default: null,
            min: 0
        },
        rewardType: {
            type: String,
            enum: ['INSTANT_DISCOUNT', 'CASHBACK', 'BOTH'],
            default: 'INSTANT_DISCOUNT',
            required: true,
            index: true
        },
        cashbackType: {
            type: String,
            enum: ['PERCENTAGE', 'FLAT'],
            default: 'PERCENTAGE'
        },
        cashbackValue: {
            type: Number,
            min: 0,
            default: 0
        },
        maxCashbackCap: {
            type: Number,
            default: null,
            min: 0
        },
        minOrderValue: {
            type: Number,
            default: 0,
            min: 0
        },
        perUserUsageLimit: {
            type: Number,
            default: 1,
            min: 1
        },
        totalUsageLimit: {
            type: Number,
            default: null,
            min: 1
        },
        totalUsageCount: {
            type: Number,
            default: 0,
            min: 0
        },
        validFrom: {
            type: Date,
            required: true,
            default: Date.now
        },
        validUntil: {
            type: Date,
            required: true
        },
        orderTypeScope: {
            type: String,
            enum: ['DELIVERY', 'TAKEAWAY', 'BOTH'],
            default: 'BOTH',
            required: true
        },
        stackableWithCashback: {
            type: Boolean,
            default: false
        },
        stackableWithOtherCoupons: {
            type: Boolean,
            default: false
        },
        userSegment: {
            type: String,
            enum: ['ALL', 'NEW_USERS_ONLY', 'SPECIFIC_USER_IDS'],
            default: 'ALL',
            required: true
        },
        specificUserIds: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'FoodUser'
            }
        ],
        activeDaysOfWeek: {
            type: [Number], // 0=Sun, 1=Mon, ..., 6=Sat. Empty array = all days
            default: []
        },
        activeTimeWindow: {
            startHour: { type: Number, min: 0, max: 23, default: null },
            endHour: { type: Number, min: 0, max: 23, default: null }
        },
        firstOrderOnlyForRestaurant: {
            type: Boolean,
            default: false
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
        collection: 'food_coupons',
        timestamps: true
    }
);

couponSchema.index({ code: 1, isActive: 1 });
couponSchema.index({ restaurantScope: 1, isActive: 1 });

export const Coupon = mongoose.model('Coupon', couponSchema);
