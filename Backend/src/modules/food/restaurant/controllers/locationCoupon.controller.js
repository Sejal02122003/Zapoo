import { LocationCoupon } from '../../admin/models/locationCoupon.model.js';
import { FoodOrder } from '../../orders/models/order.model.js';
import { sendResponse } from '../../../../utils/response.js';

export async function getRestaurantLocationCoupons(req, res, next) {
    try {
        const restaurantId = req.user.userId; // authMiddleware sets userId as the restaurantId for restaurant users
        
        // Fetch all coupons for this restaurant
        const coupons = await LocationCoupon.find({ restaurantId }).sort({ createdAt: -1 }).lean();
        
        // For each coupon, get analytics
        const enhancedCoupons = await Promise.all(coupons.map(async (coupon) => {
            const stats = await FoodOrder.aggregate([
                { $match: { "pricing.appliedRestaurantCoupon._id": coupon._id.toString() } },
                { $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalDiscount: { $sum: "$pricing.restaurantCouponDiscount" }
                }}
            ]);
            
            return {
                ...coupon,
                analytics: {
                    ordersUsed: stats[0]?.totalOrders || 0,
                    totalDiscountGiven: stats[0]?.totalDiscount || 0
                }
            };
        }));
        
        sendResponse(res, 200, 'Restaurant location coupons fetched', enhancedCoupons);
    } catch (error) {
        next(error);
    }
}
