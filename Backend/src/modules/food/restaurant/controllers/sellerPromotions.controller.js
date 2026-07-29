import { Coupon } from '../../admin/models/coupon.model.js';
import { CashbackRule } from '../../admin/models/cashbackRule.model.js';
import { sendResponse } from '../../../../utils/response.js';

export async function getSellerActivePromotions(req, res, next) {
    try {
        const restaurantId = req.user?.restaurantId || req.user?.id || req.user?._id;
        const now = new Date();

        // Active coupons for this seller's restaurant
        const activeCoupons = await Coupon.find({
            isActive: true,
            validFrom: { $lte: now },
            validUntil: { $gte: now },
            $or: [
                { restaurantScope: 'ALL' },
                { restaurantIds: restaurantId }
            ]
        }).select('code rewardType discountType discountValue minOrderValue validUntil restaurantScope').lean();

        // Active cashback rules for this seller's restaurant
        const activeCashbacks = await CashbackRule.find({
            isActive: true,
            $or: [
                { restaurantScope: 'ALL' },
                { restaurantId: restaurantId },
                { restaurantIds: restaurantId }
            ]
        }).select('name cashbackType cashbackValue minOrderValue expiryDays restaurantScope').lean();

        return sendResponse(res, 200, 'Active promotions fetched for restaurant', {
            coupons: activeCoupons,
            cashbackRules: activeCashbacks
        });
    } catch (error) {
        next(error);
    }
}
