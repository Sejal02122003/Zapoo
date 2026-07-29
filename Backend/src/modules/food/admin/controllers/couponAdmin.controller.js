import { Coupon } from '../models/coupon.model.js';
import { validateCoupon, redeemCouponAtomic } from '../services/coupon.service.js';
import { ValidationError } from '../../../../core/auth/errors.js';
import { sendResponse } from '../../../../utils/response.js';

export async function createCoupon(req, res, next) {
    try {
        const body = req.body;
        if (!body.code) {
            throw new ValidationError('Coupon code is required');
        }
        if (!body.discountValue || Number(body.discountValue) <= 0) {
            throw new ValidationError('Discount value must be greater than 0');
        }
        if (!body.validUntil) {
            throw new ValidationError('Expiration date (validUntil) is required');
        }

        const codeUpper = String(body.code).trim().toUpperCase();
        const existing = await Coupon.findOne({ code: codeUpper });
        if (existing) {
            throw new ValidationError('Coupon code already exists');
        }

        const coupon = await Coupon.create({
            code: codeUpper,
            restaurantScope: body.restaurantScope || 'ALL',
            restaurantIds: Array.isArray(body.restaurantIds) ? body.restaurantIds : [],
            discountType: body.discountType || 'PERCENTAGE',
            discountValue: Number(body.discountValue),
            maxDiscountCap: body.maxDiscountCap != null ? Number(body.maxDiscountCap) : null,
            rewardType: body.rewardType || 'INSTANT_DISCOUNT',
            minOrderValue: Number(body.minOrderValue || 0),
            perUserUsageLimit: Number(body.perUserUsageLimit || 1),
            totalUsageLimit: body.totalUsageLimit != null ? Number(body.totalUsageLimit) : null,
            validFrom: body.validFrom ? new Date(body.validFrom) : new Date(),
            validUntil: new Date(body.validUntil),
            orderTypeScope: body.orderTypeScope || 'BOTH',
            stackableWithCashback: Boolean(body.stackableWithCashback),
            stackableWithOtherCoupons: Boolean(body.stackableWithOtherCoupons),
            userSegment: body.userSegment || 'ALL',
            specificUserIds: Array.isArray(body.specificUserIds) ? body.specificUserIds : [],
            activeDaysOfWeek: Array.isArray(body.activeDaysOfWeek) ? body.activeDaysOfWeek : [],
            activeTimeWindow: body.activeTimeWindow || null,
            firstOrderOnlyForRestaurant: Boolean(body.firstOrderOnlyForRestaurant),
            isActive: true,
            createdBy: req.user?.userId || null
        });

        return sendResponse(res, 201, 'Coupon created successfully', coupon);
    } catch (error) {
        next(error);
    }
}

export async function getCoupons(req, res, next) {
    try {
        const { restaurantId, includeInactive } = req.query;
        const query = { isActive: true };
        if (includeInactive === 'true') {
            delete query.isActive;
        }
        if (restaurantId) {
            query.$or = [
                { restaurantScope: 'ALL' },
                { restaurantIds: restaurantId }
            ];
        }

        const coupons = await Coupon.find(query)
            .populate('restaurantIds', 'restaurantName')
            .sort({ createdAt: -1 })
            .lean();

        return sendResponse(res, 200, 'Coupons fetched successfully', coupons);
    } catch (error) {
        next(error);
    }
}

export async function updateCoupon(req, res, next) {
    try {
        const { id } = req.params;
        const body = req.body;
        const coupon = await Coupon.findById(id);
        if (!coupon) {
            throw new ValidationError('Coupon not found');
        }

        if (body.code) coupon.code = String(body.code).trim().toUpperCase();
        if (body.restaurantScope) coupon.restaurantScope = body.restaurantScope;
        if (Array.isArray(body.restaurantIds)) coupon.restaurantIds = body.restaurantIds;
        if (body.discountType) coupon.discountType = body.discountType;
        if (body.discountValue !== undefined) coupon.discountValue = Number(body.discountValue);
        if (body.maxDiscountCap !== undefined) coupon.maxDiscountCap = body.maxDiscountCap != null ? Number(body.maxDiscountCap) : null;
        if (body.rewardType) coupon.rewardType = body.rewardType;
        if (body.minOrderValue !== undefined) coupon.minOrderValue = Number(body.minOrderValue);
        if (body.perUserUsageLimit !== undefined) coupon.perUserUsageLimit = Number(body.perUserUsageLimit);
        if (body.totalUsageLimit !== undefined) coupon.totalUsageLimit = body.totalUsageLimit != null ? Number(body.totalUsageLimit) : null;
        if (body.validFrom) coupon.validFrom = new Date(body.validFrom);
        if (body.validUntil) coupon.validUntil = new Date(body.validUntil);
        if (body.orderTypeScope) coupon.orderTypeScope = body.orderTypeScope;
        if (body.stackableWithCashback !== undefined) coupon.stackableWithCashback = Boolean(body.stackableWithCashback);
        if (body.stackableWithOtherCoupons !== undefined) coupon.stackableWithOtherCoupons = Boolean(body.stackableWithOtherCoupons);
        if (body.userSegment) coupon.userSegment = body.userSegment;
        if (Array.isArray(body.specificUserIds)) coupon.specificUserIds = body.specificUserIds;
        if (Array.isArray(body.activeDaysOfWeek)) coupon.activeDaysOfWeek = body.activeDaysOfWeek;
        if (body.activeTimeWindow !== undefined) coupon.activeTimeWindow = body.activeTimeWindow;
        if (body.firstOrderOnlyForRestaurant !== undefined) coupon.firstOrderOnlyForRestaurant = Boolean(body.firstOrderOnlyForRestaurant);
        if (body.isActive !== undefined) coupon.isActive = Boolean(body.isActive);

        await coupon.save();
        return sendResponse(res, 200, 'Coupon updated successfully', coupon);
    } catch (error) {
        next(error);
    }
}

export async function deleteCoupon(req, res, next) {
    try {
        const { id } = req.params;
        const coupon = await Coupon.findById(id);
        if (!coupon) {
            throw new ValidationError('Coupon not found');
        }
        // Soft delete to preserve historical redemptions
        coupon.isActive = false;
        await coupon.save();

        return sendResponse(res, 200, 'Coupon deactivated successfully', { success: true });
    } catch (error) {
        next(error);
    }
}
