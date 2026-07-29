import mongoose from 'mongoose';

const couponRedemptionSchema = new mongoose.Schema(
    {
        couponId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Coupon',
            required: true,
            index: true
        },
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
        discountAmount: {
            type: Number,
            required: true,
            min: 0
        },
        redeemedAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        collection: 'food_coupon_redemptions',
        timestamps: true
    }
);

couponRedemptionSchema.index({ couponId: 1, userId: 1 });

export const CouponRedemption = mongoose.model('CouponRedemption', couponRedemptionSchema);
