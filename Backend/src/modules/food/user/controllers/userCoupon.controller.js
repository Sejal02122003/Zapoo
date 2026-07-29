import { Coupon } from '../../admin/models/coupon.model.js';
import { CashbackLedger } from '../../admin/models/cashbackLedger.model.js';
import { validateCoupon } from '../../admin/services/coupon.service.js';
import { sendResponse } from '../../../../utils/response.js';

export async function getAvailableCoupons(req, res, next) {
    try {
        const { restaurantId } = req.query;
        const now = new Date();

        const query = {
            isActive: true,
            validFrom: { $lte: now },
            validUntil: { $gte: now }
        };

        if (restaurantId) {
            query.$or = [
                { restaurantScope: 'ALL' },
                { restaurantIds: restaurantId }
            ];
        }

        const coupons = await Coupon.find(query).sort({ createdAt: -1 }).lean();

        // Format customer-facing label clearly (e.g. "Get ₹50 cashback after delivery" vs "₹50 OFF")
        const formatted = coupons.map(c => {
            let label = '';
            if (c.rewardType === 'CASHBACK') {
                label = c.discountType === 'PERCENTAGE'
                    ? `Get ${c.discountValue}% cashback after delivery`
                    : `Get ₹${c.discountValue} cashback after delivery`;
            } else {
                label = c.discountType === 'PERCENTAGE'
                    ? `${c.discountValue}% OFF`
                    : `₹${c.discountValue} OFF`;
            }

            return {
                _id: c._id,
                code: c.code,
                rewardType: c.rewardType,
                discountType: c.discountType,
                discountValue: c.discountValue,
                maxDiscountCap: c.maxDiscountCap,
                minOrderValue: c.minOrderValue,
                validUntil: c.validUntil,
                label,
                description: c.rewardType === 'CASHBACK'
                    ? `Earn cashback credited to your wallet after order delivery.`
                    : `Get instant discount on your order subtotal.`
            };
        });

        return sendResponse(res, 200, 'Available coupons fetched', formatted);
    } catch (error) {
        next(error);
    }
}

export async function validateCouponEndpoint(req, res, next) {
    try {
        const { couponCode, restaurantId, orderSubtotal, orderType } = req.body;
        const userId = req.user?.userId || req.user?.id;

        const result = await validateCoupon({
            couponCode,
            userId,
            restaurantId,
            orderSubtotal: Number(orderSubtotal || 0),
            orderType: orderType || 'DELIVERY'
        });

        return sendResponse(res, 200, 'Coupon validated successfully', {
            couponId: result.coupon._id,
            code: result.coupon.code,
            rewardType: result.rewardType,
            discountAmount: result.computedAmount,
            message: result.rewardType === 'CASHBACK'
                ? `Coupon applied! You will earn ₹${result.computedAmount} cashback after delivery.`
                : `Coupon applied! You saved ₹${result.computedAmount}.`
        });
    } catch (error) {
        next(error);
    }
}

export async function getUserCashbackHistory(req, res, next) {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) {
            return sendResponse(res, 200, 'Cashback history fetched', []);
        }

        const ledgers = await CashbackLedger.find({ userId })
            .populate('orderId', 'order_id totalAmount orderStatus')
            .populate('couponId', 'code')
            .populate('cashbackRuleId', 'name')
            .sort({ createdAt: -1 })
            .lean();

        return sendResponse(res, 200, 'Cashback history fetched', ledgers);
    } catch (error) {
        next(error);
    }
}
