import { LocationCoupon } from '../models/locationCoupon.model.js';
import { sendResponse } from '../../../../utils/response.js';

export async function createLocationCoupon(req, res, next) {
    try {
        const { code, title, description, restaurantId, minimumOrderAmount, minimumItems, discountType, discountValue, maximumDiscount, maximumDistance, isActive, startDate, endDate } = req.body;
        
        const coupon = new LocationCoupon({
            code, title, description, restaurantId, minimumOrderAmount, minimumItems, discountType, discountValue, maximumDiscount, maximumDistance, isActive, startDate, endDate,
            createdBy: req.user.userId
        });
        
        await coupon.save();
        sendResponse(res, 201, 'Location coupon created successfully', coupon);
    } catch (error) {
        next(error);
    }
}

export async function getLocationCoupons(req, res, next) {
    try {
        const query = {};
        if (req.query.restaurantId) query.restaurantId = req.query.restaurantId;
        
        const coupons = await LocationCoupon.find(query).populate('restaurantId', 'restaurantName').sort({ createdAt: -1 });
        sendResponse(res, 200, 'Location coupons fetched', coupons);
    } catch (error) {
        next(error);
    }
}

export async function updateLocationCoupon(req, res, next) {
    try {
        const { id } = req.params;
        const updates = req.body;
        const coupon = await LocationCoupon.findByIdAndUpdate(id, updates, { new: true });
        if (!coupon) return sendResponse(res, 404, 'Coupon not found');
        sendResponse(res, 200, 'Location coupon updated', coupon);
    } catch (error) {
        next(error);
    }
}

export async function deleteLocationCoupon(req, res, next) {
    try {
        const { id } = req.params;
        const coupon = await LocationCoupon.findByIdAndDelete(id);
        if (!coupon) return sendResponse(res, 404, 'Coupon not found');
        sendResponse(res, 200, 'Location coupon deleted', coupon);
    } catch (error) {
        next(error);
    }
}
