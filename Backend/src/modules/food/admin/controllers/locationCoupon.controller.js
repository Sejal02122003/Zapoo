import { LocationCoupon } from '../models/locationCoupon.model.js';
import { FoodRestaurant } from '../../restaurant/models/restaurant.model.js';
import { sendResponse } from '../../../../utils/response.js';

export async function createLocationCoupon(req, res, next) {
    try {
        const { code, title, description, restaurantName, minimumOrderAmount, minimumItems, discountType, discountValue, maximumDiscount, maximumDistance, isActive, startDate, endDate } = req.body;

        if (!restaurantName) return sendResponse(res, 400, 'Restaurant Name is required');
        const restaurant = await FoodRestaurant.findOne({ restaurantName: new RegExp('^' + restaurantName + '$', 'i') });
        if (!restaurant) return sendResponse(res, 404, 'Restaurant not found with the given name');
        const restaurantId = restaurant._id;
        
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
        if (updates.restaurantName) {
            const restaurant = await FoodRestaurant.findOne({ restaurantName: new RegExp('^' + updates.restaurantName + '$', 'i') });
            if (!restaurant) return sendResponse(res, 404, 'Restaurant not found with the given name');
            updates.restaurantId = restaurant._id;
            delete updates.restaurantName;
        }
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
