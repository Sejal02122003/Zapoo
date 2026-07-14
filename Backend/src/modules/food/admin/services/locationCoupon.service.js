import { LocationCoupon } from '../models/locationCoupon.model.js';

/**
 * Validates and applies a location coupon during checkout.
 * Returns the discount amount and the matched coupon document (if valid).
 * If invalid but code provided, returns { error: "reason" }.
 */
export async function validateLocationCoupon({ couponCode, restaurantId, subtotal, itemsCount, distanceKm }) {
    if (!couponCode) return { discount: 0, appliedCoupon: null };

    const codeRaw = String(couponCode).trim().toUpperCase();

    const coupon = await LocationCoupon.findOne({
        code: codeRaw,
        restaurantId,
        isActive: true
    }).lean();

    if (!coupon) {
        return { error: 'Location coupon not found or inactive for this restaurant.' };
    }

    const now = new Date();
    if (coupon.startDate && now < new Date(coupon.startDate)) {
        return { error: 'This coupon is not active yet.' };
    }
    if (coupon.endDate && now > new Date(coupon.endDate)) {
        return { error: 'This coupon has expired.' };
    }

    if (subtotal < (coupon.minimumOrderAmount || 0)) {
        return { error: `Minimum order amount of ₹${coupon.minimumOrderAmount} is required.` };
    }

    if (itemsCount < (coupon.minimumItems || 1)) {
        return { error: `Minimum ${coupon.minimumItems} items required for this coupon.` };
    }

    if (distanceKm != null && distanceKm > (coupon.maximumDistance || 0)) {
        return { error: `This coupon is only valid for deliveries up to ${coupon.maximumDistance} km.` };
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discountType === 'percentage') {
        const raw = subtotal * (Number(coupon.discountValue) / 100);
        const capped = Number(coupon.maximumDiscount) > 0 ? Math.min(raw, Number(coupon.maximumDiscount)) : raw;
        discount = Math.floor(capped);
    } else {
        discount = Math.floor(Number(coupon.discountValue) || 0);
    }

    discount = Math.max(0, Math.min(subtotal, discount));

    return { discount, appliedCoupon: coupon };
}
