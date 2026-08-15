import mongoose from 'mongoose';
import { Coupon } from '../models/coupon.model.js';
import { CouponRedemption } from '../models/couponRedemption.model.js';
import { CashbackLedger } from '../models/cashbackLedger.model.js';
import { ValidationError } from '../../../../core/auth/errors.js';

/**
 * Validate a coupon for checkout
 */
export async function validateCoupon({
    couponCode,
    userId,
    restaurantId,
    orderSubtotal,
    orderType = 'DELIVERY',
    hasCashbackRuleApplied = false,
    hasOtherCouponsApplied = false
}) {
    if (!couponCode) {
        throw new ValidationError('Coupon code is required');
    }

    const codeUpper = String(couponCode).trim().toUpperCase();
    const coupon = await Coupon.findOne({ code: codeUpper, isActive: true }).lean();

    if (!coupon) {
        throw new ValidationError('Invalid or inactive coupon code');
    }

    const now = new Date();
    if (coupon.validFrom && new Date(coupon.validFrom) > now) {
        throw new ValidationError('Coupon is not active yet');
    }
    if (coupon.validUntil && new Date(coupon.validUntil) < now) {
        throw new ValidationError('Coupon has expired');
    }

    // Restaurant Scope check
    if (coupon.restaurantScope === 'SPECIFIC') {
        const scopedIds = (coupon.restaurantIds || []).map(id => String(id));
        if (restaurantId && !scopedIds.includes(String(restaurantId))) {
            throw new ValidationError('Coupon is not valid for this restaurant');
        }
    }

    // Order Type Scope check
    if (coupon.orderTypeScope && coupon.orderTypeScope !== 'BOTH') {
        if (coupon.orderTypeScope.toUpperCase() !== String(orderType).toUpperCase()) {
            throw new ValidationError(`Coupon is valid for ${coupon.orderTypeScope.toLowerCase()} orders only`);
        }
    }

    // Min Order Value check
    if (orderSubtotal < (coupon.minOrderValue || 0)) {
        throw new ValidationError(`Minimum order value of ₹${coupon.minOrderValue} required for this coupon`);
    }

    // Total Usage Limit check
    if (coupon.totalUsageLimit !== null && coupon.totalUsageLimit !== undefined) {
        if (coupon.totalUsageCount >= coupon.totalUsageLimit) {
            throw new ValidationError('Coupon usage limit has been reached');
        }
    }

    // Per User Usage Limit check
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        const userRedemptions = await CouponRedemption.countDocuments({
            couponId: coupon._id,
            userId: new mongoose.Types.ObjectId(userId)
        });
        if (userRedemptions >= (coupon.perUserUsageLimit || 1)) {
            throw new ValidationError(`You have reached the max usage limit (${coupon.perUserUsageLimit}) for this coupon`);
        }
    }

    // User Segment check
    if (coupon.userSegment === 'NEW_USERS_ONLY' && userId && mongoose.Types.ObjectId.isValid(userId)) {
        const { FoodOrder } = await import('../../orders/models/order.model.js');
        const priorDeliveredCount = await FoodOrder.countDocuments({
            userId: new mongoose.Types.ObjectId(userId),
            orderStatus: 'delivered'
        });
        if (priorDeliveredCount > 0) {
            throw new ValidationError('Coupon is valid for new users only');
        }
    } else if (coupon.userSegment === 'SPECIFIC_USER_IDS') {
        const allowedUserIds = (coupon.specificUserIds || []).map(id => String(id));
        if (!userId || !allowedUserIds.includes(String(userId))) {
            throw new ValidationError('Coupon is not valid for your user account');
        }
    }

    // Active Days Of Week check (0 = Sunday, 6 = Saturday)
    if (Array.isArray(coupon.activeDaysOfWeek) && coupon.activeDaysOfWeek.length > 0) {
        const currentDay = now.getDay();
        if (!coupon.activeDaysOfWeek.includes(currentDay)) {
            throw new ValidationError('Coupon is not valid on this day of the week');
        }
    }

    // Active Time Window check
    if (coupon.activeTimeWindow && coupon.activeTimeWindow.startHour !== null && coupon.activeTimeWindow.endHour !== null) {
        const currentHour = now.getHours();
        const { startHour, endHour } = coupon.activeTimeWindow;
        const inWindow = startHour <= endHour
            ? (currentHour >= startHour && currentHour <= endHour)
            : (currentHour >= startHour || currentHour <= endHour); // Handles overnight windows
        if (!inWindow) {
            throw new ValidationError(`Coupon is active only between ${startHour}:00 and ${endHour}:00`);
        }
    }

    // First Order Only for Restaurant check
    if (coupon.firstOrderOnlyForRestaurant && userId && restaurantId && mongoose.Types.ObjectId.isValid(userId)) {
        const { FoodOrder } = await import('../../orders/models/order.model.js');
        const priorRestaurantOrders = await FoodOrder.countDocuments({
            userId: new mongoose.Types.ObjectId(userId),
            restaurantId: new mongoose.Types.ObjectId(restaurantId),
            orderStatus: 'delivered'
        });
        if (priorRestaurantOrders > 0) {
            throw new ValidationError('Coupon is valid only on your first order at this restaurant');
        }
    }

    // Stacking check
    if (hasCashbackRuleApplied && !coupon.stackableWithCashback) {
        throw new ValidationError('This coupon cannot be combined with active cashback offers');
    }
    if (hasOtherCouponsApplied && !coupon.stackableWithOtherCoupons) {
        throw new ValidationError('This coupon cannot be combined with other coupons');
    }

    const rType = coupon.rewardType || 'INSTANT_DISCOUNT';

    // Calculate discount amount
    let computedAmount = 0;
    if (rType === 'INSTANT_DISCOUNT' || rType === 'BOTH') {
        if (coupon.discountType === 'PERCENTAGE') {
            const raw = (orderSubtotal * coupon.discountValue) / 100;
            computedAmount = coupon.maxDiscountCap ? Math.min(raw, coupon.maxDiscountCap) : raw;
        } else {
            computedAmount = coupon.discountValue;
        }
        computedAmount = Math.max(0, Math.min(orderSubtotal, Math.floor(computedAmount)));
    }

    let computedCashbackAmount = 0;
    if (rType === 'CASHBACK' || rType === 'BOTH') {
        // Fallback for old CASHBACK coupons that used discountValue instead of cashbackValue
        let cType = (rType === 'CASHBACK' && !coupon.cashbackValue) ? coupon.discountType : coupon.cashbackType;
        let cValue = (rType === 'CASHBACK' && !coupon.cashbackValue) ? coupon.discountValue : coupon.cashbackValue;
        let cCap = (rType === 'CASHBACK' && !coupon.cashbackValue) ? coupon.maxDiscountCap : coupon.maxCashbackCap;

        if (cType === 'PERCENTAGE') {
            const rawCb = (orderSubtotal * cValue) / 100;
            computedCashbackAmount = cCap ? Math.min(rawCb, cCap) : rawCb;
        } else {
            computedCashbackAmount = cValue;
        }
        computedCashbackAmount = Math.max(0, Math.floor(computedCashbackAmount));
    }

    return {
        coupon,
        computedAmount,
        computedCashbackAmount,
        rewardType: coupon.rewardType || 'INSTANT_DISCOUNT'
    };
}

/**
 * Atomically redeem coupon at checkout / order placement
 */
export async function redeemCouponAtomic({ couponId, userId, orderId, amount, rewardType = 'INSTANT_DISCOUNT' }) {
    if (!couponId || !userId || !orderId) {
        throw new ValidationError('Missing parameters for coupon redemption');
    }

    // Atomic usage count increment with limit filter
    const couponObjId = new mongoose.Types.ObjectId(couponId);
    const updatedCoupon = await Coupon.findOneAndUpdate(
        {
            _id: couponObjId,
            isActive: true,
            $or: [
                { totalUsageLimit: null },
                { totalUsageLimit: { $exists: false } },
                { $expr: { $lt: ['$totalUsageCount', '$totalUsageLimit'] } }
            ]
        },
        { $inc: { totalUsageCount: 1 } },
        { new: true }
    );

    if (!updatedCoupon) {
        throw new ValidationError('Coupon could not be redeemed (usage limit reached or inactive)');
    }

    // Record Coupon Redemption
    const redemption = await CouponRedemption.create({
        couponId: couponObjId,
        userId: new mongoose.Types.ObjectId(userId),
        orderId: new mongoose.Types.ObjectId(orderId),
        discountAmount: amount
    });

    // If rewardType === CASHBACK or BOTH, create PENDING CashbackLedger entry
    let cashbackLedger = null;
    if ((rewardType === 'CASHBACK' || rewardType === 'BOTH') && amount > 0) {
        cashbackLedger = await CashbackLedger.create({
            userId: new mongoose.Types.ObjectId(userId),
            orderId: new mongoose.Types.ObjectId(orderId),
            sourceType: 'COUPON',
            couponId: couponObjId,
            amount,
            status: 'PENDING'
        });
    }

    return { redemption, cashbackLedger };
}
