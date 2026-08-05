import mongoose from 'mongoose';
import { FoodOrder } from '../models/order.model.js';
import { FoodRestaurant } from '../../restaurant/models/restaurant.model.js';
import { FoodFeeSettings } from '../../admin/models/feeSettings.model.js';
import { FoodOffer } from '../../admin/models/offer.model.js';
import { FoodOfferUsage } from '../../admin/models/offerUsage.model.js';
import { FoodItem } from '../../admin/models/food.model.js';
import { resolveItemDiscountRule } from '../../admin/services/itemDiscount.service.js';
import { getCurrentSurgeForRestaurant } from '../../admin/services/surgeCalculation.service.js';
import { ValidationError } from '../../../../core/auth/errors.js';
import { haversineKm } from './order.helpers.js';
import { validateLocationCoupon } from '../../admin/services/locationCoupon.service.js';
import { logger } from '../../../../utils/logger.js';
import { getActiveWeatherPolicy, evaluateWeatherPricing } from '../../weatherPricing/services/weatherPricing.service.js';

export async function calculateOrderPricing(userId, dto) {
  const restaurant = await FoodRestaurant.findById(dto.restaurantId)
    .select("status location itemDiscounts")
    .lean();
  if (!restaurant) throw new ValidationError("Restaurant not found");
  if (restaurant.status !== "approved")
    throw new ValidationError("Restaurant not available");

  const items = Array.isArray(dto.items) ? dto.items : [];
  let itemDiscountTotal = 0;
  let subtotal = 0;
  let eligibleSubtotalForCoupon = 0;
  const orderType = String(dto.orderType || 'delivery').toLowerCase();

  const itemIds = items.map((it) => it.id || it._id || it.foodId).filter(Boolean);
  const foodDocs = itemIds.length ? await FoodItem.find({ _id: { $in: itemIds } }).lean() : [];
  const foodMap = new Map(foodDocs.map((f) => [String(f._id), f]));

  for (const it of items) {
    const itemIdStr = String(it.id || it._id || it.foodId || '');
    const foodDoc = foodMap.get(itemIdStr);
    
    const basePrice = foodDoc ? Number(foodDoc.price) || 0 : Number(it.originalPrice || it.price) || 0;
    const qty = Number(it.quantity) || 1;

    const rule = await resolveItemDiscountRule({
      restaurantId: dto.restaurantId,
      menuItemId: itemIdStr,
      categoryId: foodDoc?.categoryId ? String(foodDoc.categoryId) : null,
      orderType: orderType.toUpperCase()
    });

    let discountedUnitPrice = basePrice;
    let itemDiscountAmountPerUnit = 0;
    let isStackable = true;

    if (rule) {
      if (rule.discountType === 'PERCENTAGE') {
        const rawDiscount = basePrice * (Number(rule.discountValue) / 100);
        const cappedDiscount = rule.maxDiscountAmount ? Math.min(rawDiscount, Number(rule.maxDiscountAmount)) : rawDiscount;
        itemDiscountAmountPerUnit = Math.max(0, Math.min(basePrice, cappedDiscount));
      } else {
        itemDiscountAmountPerUnit = Math.max(0, Math.min(basePrice, Number(rule.discountValue) || 0));
      }
      discountedUnitPrice = basePrice - itemDiscountAmountPerUnit;
      isStackable = rule.stackable !== false;
    }

    const clientSentPrice = Number(it.price);
    if (Number.isFinite(clientSentPrice) && Math.abs(clientSentPrice - discountedUnitPrice) > 0.5) {
      logger.warn(`[SECURITY] Price mismatch detected for item ${itemIdStr} in restaurant ${dto.restaurantId}: clientSent=${clientSentPrice}, serverCalculated=${discountedUnitPrice}`);
    }

    const lineTotal = discountedUnitPrice * qty;
    const lineDiscount = itemDiscountAmountPerUnit * qty;

    subtotal += lineTotal;
    itemDiscountTotal += lineDiscount;

    if (isStackable) {
      eligibleSubtotalForCoupon += lineTotal;
    }

    it.originalPrice = basePrice;
    it.discountedPrice = discountedUnitPrice;
    it.discount = lineDiscount;
  }
  itemDiscountTotal = Math.floor(itemDiscountTotal);

  const feeDoc = await FoodFeeSettings.findOne({ isActive: true })
    .sort({ createdAt: -1 })
    .lean();
  const feeSettings = feeDoc || {
    deliveryFee: 25,
    deliveryFeeRanges: [],
    freeDeliveryUpTo: 0,
    platformFee: 5,
    packagingFee: 0,
    gstRate: 5,
  };

  let platformFee = 0;
  let gstOnPlatformFee = 0;
  
  if (orderType === 'takeaway') {
    platformFee = feeSettings.takeawayPlatformFee != null ? Number(feeSettings.takeawayPlatformFee) : 0;
    gstOnPlatformFee = feeSettings.gstOnTakeawayPlatformFee != null ? Number(feeSettings.gstOnTakeawayPlatformFee) : 0;
  } else {
    platformFee = feeSettings.platformFee != null ? Number(feeSettings.platformFee) : 0;
    gstOnPlatformFee = feeSettings.gstOnPlatformFee != null ? Number(feeSettings.gstOnPlatformFee) : 0;
  }
  
  const packagingFee = feeSettings.packagingFee != null ? Number(feeSettings.packagingFee) : 0;

  const freeUpTo = Number(feeSettings.freeDeliveryUpTo || 0);
  let distanceKm = null;
  if (
    restaurant?.location?.coordinates?.length === 2 &&
    dto?.deliveryAddress?.location?.coordinates?.length === 2
  ) {
    const [rLng, rLat] = restaurant.location.coordinates;
    const [dLng, dLat] = dto.deliveryAddress.location.coordinates;
    const d = haversineKm(rLat, rLng, dLat, dLng);
    distanceKm = Number.isFinite(d) ? d : null;
  }
  let deliveryFee = 0;
  let deliveryFeeBreakdown = null;

  if (orderType === 'takeaway') {
    deliveryFee = 0;
  } else if (
    Number.isFinite(freeUpTo) &&
    freeUpTo > 0 &&
    subtotal >= freeUpTo
  ) {
    deliveryFee = 0;
  } else if (
    Number.isFinite(Number(feeSettings.discountDeliveryThreshold)) &&
    Number(feeSettings.discountDeliveryThreshold) > 0 &&
    subtotal >= Number(feeSettings.discountDeliveryThreshold)
  ) {
    deliveryFee = Number(feeSettings.discountedDeliveryFee || 0);
  } else if (feeSettings.deliveryFeeType === 'slab') {
    const slabDist = Number(feeSettings.slabDistance || 0);
    const slabPr = Number(feeSettings.slabPrice || 0);
    const extraPr = Number(feeSettings.extraPricePerKm || 0);
    if (Number.isFinite(distanceKm)) {
      if (distanceKm <= slabDist) {
        deliveryFee = slabPr;
      } else {
        const extraKm = distanceKm - slabDist;
        deliveryFee = slabPr + extraKm * extraPr;
      }
      deliveryFeeBreakdown = {
        source: "slab",
        distanceKm,
        slabDistance: slabDist,
        slabPrice: slabPr,
        extraPricePerKm: extraPr,
        fee: deliveryFee
      };
    } else {
      deliveryFee = slabPr;
    }
  } else if (feeSettings.deliveryFeeType === 'matrix') {
    const matrices = Array.isArray(feeSettings.deliveryFeeMatrix)
      ? [...feeSettings.deliveryFeeMatrix]
      : [];
    if (matrices.length > 0 && Number.isFinite(distanceKm)) {
      matrices.sort((a, b) => Number(a.minDistance) - Number(b.minDistance));
      let matchedMatrix = null;
      for (let i = 0; i < matrices.length; i++) {
        const m = matrices[i];
        const min = Number(m.minDistance);
        const max = m.maxDistance != null ? Number(m.maxDistance) : Infinity;
        const isLast = i === matrices.length - 1;
        const inRange = isLast
          ? distanceKm >= min && distanceKm <= max
          : distanceKm >= min && distanceKm < max;
        if (inRange) {
          matchedMatrix = m;
          break;
        }
      }
      
      if (matchedMatrix && Array.isArray(matchedMatrix.amountRules)) {
        const rules = [...matchedMatrix.amountRules].sort((a, b) => Number(a.minAmount) - Number(b.minAmount));
        let matchedFee = null;
        for (let i = 0; i < rules.length; i++) {
          const r = rules[i];
          const minAmt = Number(r.minAmount);
          const maxAmt = r.maxAmount != null ? Number(r.maxAmount) : Infinity;
          const isLastRule = i === rules.length - 1;
          const inAmtRange = isLastRule
            ? subtotal >= minAmt && subtotal <= maxAmt
            : subtotal >= minAmt && subtotal < maxAmt;
            
          if (inAmtRange) {
            if (r.feeType === 'per_km') {
               matchedFee = Number(r.fee) * distanceKm;
            } else {
               matchedFee = Number(r.fee);
            }
            break;
          }
        }
        if (matchedFee !== null) {
          deliveryFee = matchedFee;
          deliveryFeeBreakdown = {
            source: "matrix",
            distanceKm,
            minKm: matchedMatrix.minDistance,
            maxKm: matchedMatrix.maxDistance,
            subtotal,
            fee: deliveryFee
          };
        } else {
           throw new ValidationError(`No delivery fee rules configured for this cart value (₹${subtotal.toFixed(2)}).`);
        }
      } else {
         throw new ValidationError(`Delivery is not available at this distance (${distanceKm.toFixed(1)} km). Please select a closer address.`);
      }
    } else if (!Number.isFinite(distanceKm)) {
        deliveryFee = Number(feeSettings.deliveryFee || 0);
    } else {
        throw new ValidationError(`Delivery is not available at this distance (${distanceKm.toFixed(1)} km). Please select a closer address.`);
    }
  } else {
    const ranges = Array.isArray(feeSettings.deliveryFeeRanges)
      ? [...feeSettings.deliveryFeeRanges]
      : [];
    if (ranges.length > 0) {
      ranges.sort((a, b) => Number(a.min) - Number(b.min));
      let matched = null;
      for (let i = 0; i < ranges.length; i += 1) {
        const r = ranges[i] || {};
        const min = Number(r.min);
        const max = Number(r.max);
        const fee = Number(r.fee);
        if (
          !Number.isFinite(min) ||
          !Number.isFinite(max) ||
          !Number.isFinite(fee)
        ) {
          continue;
        }
        const isLast = i === ranges.length - 1;
        if (!Number.isFinite(distanceKm)) {
          continue;
        }
        const inRange = isLast
          ? distanceKm >= min && distanceKm <= max
          : distanceKm >= min && distanceKm < max;
        if (inRange) {
          matched = fee;
          if (Number.isFinite(distanceKm)) {
            deliveryFeeBreakdown = {
              source: "distance",
              distanceKm,
              minKm: min,
              maxKm: max,
              fee,
            };
          }
          break;
        }
      }

      if (Number.isFinite(distanceKm) && !Number.isFinite(matched)) {
        throw new ValidationError(`Delivery is not available at this distance (${distanceKm.toFixed(1)} km). Please select a closer address.`);
      }

      deliveryFee = Number.isFinite(matched)
        ? matched
        : Number(feeSettings.deliveryFee || 0);
    } else {
      deliveryFee = Number(feeSettings.deliveryFee || 0);
    }
  }

  // --- Dynamic Surge Pricing Integration ---
  const surgeInfo = orderType === 'delivery'
    ? await getCurrentSurgeForRestaurant(dto.restaurantId)
    : { surgeAmount: 0, snapshotId: null, riderSurgeBonus: 0 };

  const surgeAmount = surgeInfo?.surgeAmount || 0;
  const riderSurgeBonus = surgeInfo?.riderSurgeBonus || 0;
  const surgeSnapshotId = surgeInfo?.snapshotId || null;

  // Surge is combined seamlessly into deliveryFee (never shown as a distinct line item to the customer)
  deliveryFee = deliveryFee + surgeAmount;
  // --- End Dynamic Surge Pricing Integration ---

  // --- Weather Pricing Logic ---
  const activeWeatherPolicy = await getActiveWeatherPolicy();
  const weatherEval = evaluateWeatherPricing(activeWeatherPolicy, distanceKm, restaurant.zoneId);
  
  const weatherFee = weatherEval.isEligible ? weatherEval.weatherFee : 0;
  const weatherGST = weatherEval.isEligible ? weatherEval.gstAmount : 0;
  
  const weatherPricingSnapshot = weatherEval.isEligible ? {
      enabled: true,
      weatherCondition: weatherEval.weatherCondition,
      distance: distanceKm,
      feePerKm: weatherEval.feePerKm,
      weatherFee: weatherEval.weatherFee,
      gstPercentage: weatherEval.gstPercentage,
      gstAmount: weatherEval.gstAmount,
      totalWeatherCharge: weatherEval.totalWeatherCharge,
      policyId: weatherEval.policyId
  } : undefined;
  // --- End Weather Pricing Logic ---

  const gstRate = feeSettings.gstRate != null ? Number(feeSettings.gstRate) : 0;
  const gstOnDeliveryFee = feeSettings.gstOnDeliveryFee != null ? Number(feeSettings.gstOnDeliveryFee) : 0;
  const gstOnPackagingFee = feeSettings.gstOnPackagingFee != null ? Number(feeSettings.gstOnPackagingFee) : 0;

  let itemTax = (Number.isFinite(gstRate) && gstRate > 0) ? (subtotal * (gstRate / 100)) : 0;
  const deliveryTax = (Number.isFinite(gstOnDeliveryFee) && gstOnDeliveryFee > 0) ? (deliveryFee * (gstOnDeliveryFee / 100)) : 0;
  const platformTax = (Number.isFinite(gstOnPlatformFee) && gstOnPlatformFee > 0) ? (platformFee * (gstOnPlatformFee / 100)) : 0;
  const packagingTax = (Number.isFinite(gstOnPackagingFee) && gstOnPackagingFee > 0) ? (packagingFee * (gstOnPackagingFee / 100)) : 0;

  let tax = Math.round(itemTax + deliveryTax + platformTax + packagingTax + weatherGST);

  let discount = 0;
  let appliedCoupon = null;
  let couponError = null;
  const codeRaw = dto.couponCode
    ? String(dto.couponCode).trim().toUpperCase()
    : "";

  let appliedCashbackCoupon = null;
  if (codeRaw) {
    try {
      const { validateCoupon } = await import('../../admin/services/coupon.service.js');
      const couponRes = await validateCoupon({
        couponCode: codeRaw,
        userId,
        restaurantId: dto.restaurantId,
        orderSubtotal: eligibleSubtotalForCoupon,
        orderType: dto.orderType || 'DELIVERY'
      });

      if (couponRes && couponRes.coupon) {
        if (couponRes.rewardType === 'CASHBACK') {
          discount = 0; // Order total is unaffected at checkout for cashback reward coupons
          appliedCashbackCoupon = {
            couponId: couponRes.coupon._id,
            code: codeRaw,
            amount: couponRes.computedCashbackAmount || couponRes.computedAmount
          };
          appliedCoupon = { code: codeRaw, discount: 0, rewardType: 'CASHBACK', amount: couponRes.computedCashbackAmount || couponRes.computedAmount };
        } else if (couponRes.rewardType === 'BOTH') {
          discount = couponRes.computedAmount || 0;
          appliedCashbackCoupon = {
            couponId: couponRes.coupon._id,
            code: codeRaw,
            amount: couponRes.computedCashbackAmount
          };
          appliedCoupon = { code: codeRaw, discount: discount, rewardType: 'BOTH', amount: couponRes.computedCashbackAmount };
        } else {
          discount = couponRes.computedAmount;
          appliedCoupon = { code: codeRaw, discount: couponRes.computedAmount, rewardType: 'INSTANT_DISCOUNT' };
        }
      }
    } catch (err) {
      // If unified coupon throws specific error, save couponError and try legacy fallback if needed
      couponError = err.message || "Invalid coupon code";
    }

    if (!appliedCoupon && !couponError) {
      const now = new Date();
      let offer = await FoodOffer.findOne({ couponCode: codeRaw }).lean();

    if (!offer) {
      const locationCoupon = await LocationCoupon.findOne({ code: codeRaw, restaurantId: dto.restaurantId, isActive: true }).lean();
      if (locationCoupon) {
        offer = {
          _id: locationCoupon._id,
          status: locationCoupon.isActive ? "active" : "inactive",
          startDate: locationCoupon.startDate,
          endDate: locationCoupon.endDate,
          restaurantScope: "selected",
          restaurantId: locationCoupon.restaurantId,
          minOrderValue: locationCoupon.minimumOrderAmount || 0,
          usageLimit: 0,
          usedCount: 0,
          discountType: locationCoupon.discountType === 'percentage' ? 'percentage' : 'flat',
          discountValue: locationCoupon.discountValue,
          maxDiscount: locationCoupon.maximumDiscount || 0,
          perUserLimit: 0,
          customerScope: "all"
        };
      } else {
        const { default: Promocode } = await import('../../../../models/Promocode.js');
        const promo = await Promocode.findOne({ code: codeRaw, restaurantId: dto.restaurantId }).lean();
        if (promo) {
          offer = {
            _id: promo._id,
            status: promo.isActive ? "active" : "inactive",
            startDate: promo.startDate,
            endDate: promo.expiryDate,
            restaurantScope: "selected",
            restaurantId: promo.restaurantId,
            minOrderValue: promo.minOrderAmount || 0,
            usageLimit: promo.usageLimit || 0,
            usedCount: promo.usageCount || 0,
            discountType: promo.discountType === 'PERCENTAGE' ? 'percentage' : 'flat',
            discountValue: promo.discountValue,
            maxDiscount: promo.maxDiscountAmount || 0,
            perUserLimit: 0,
            customerScope: "all"
          };
        }
      }
    }

      if (offer) {
        const statusOk = offer.status === "active";
        const startOk = !offer.startDate || now >= new Date(offer.startDate);
        const endOk = !offer.endDate || now < new Date(offer.endDate);
        const scopeOk =
          offer.restaurantScope !== "selected" ||
          String(offer.restaurantId || "") === String(dto.restaurantId || "");
        const minOk = eligibleSubtotalForCoupon >= (Number(offer.minOrderValue) || 0);
        let usageOk = true;
        if (
          Number(offer.usageLimit) > 0 &&
          Number(offer.usedCount || 0) >= Number(offer.usageLimit)
        ) {
          usageOk = false;
        }

        let perUserOk = true;
        if (userId && Number(offer.perUserLimit) > 0) {
          const usage = await FoodOfferUsage.findOne({
            offerId: offer._id,
            userId,
          }).lean();
          if (usage && Number(usage.count) >= Number(offer.perUserLimit)) {
            perUserOk = false;
          }
        }

        let firstOrderOk = true;
        if (userId && offer.customerScope === "first-time") {
          const c = await FoodOrder.countDocuments({
            userId: new mongoose.Types.ObjectId(userId),
          });
          firstOrderOk = c === 0;
        }
        if (userId && offer.isFirstOrderOnly === true) {
          const c2 = await FoodOrder.countDocuments({
            userId: new mongoose.Types.ObjectId(userId),
          });
          if (c2 > 0) firstOrderOk = false;
        }

        const allowed =
          statusOk &&
          startOk &&
          endOk &&
          scopeOk &&
          minOk &&
          usageOk &&
          perUserOk &&
          firstOrderOk;

        if (allowed) {
          if (eligibleSubtotalForCoupon <= 0) {
            couponError = "This coupon is not applicable on discounted items. Please try other items.";
          } else {
            if (offer.discountType === "percentage") {
              const raw = eligibleSubtotalForCoupon * (Number(offer.discountValue) / 100);
              const capped = Number(offer.maxDiscount)
                ? Math.min(raw, Number(offer.maxDiscount))
                : raw;
              discount = Math.max(0, Math.min(eligibleSubtotalForCoupon, Math.floor(capped)));
            } else {
              discount = Math.max(
                0,
                Math.min(eligibleSubtotalForCoupon, Math.floor(Number(offer.discountValue) || 0)),
              );
            }
            appliedCoupon = { code: codeRaw, discount };
          }
        } else {
          if (!minOk) {
            couponError = `Minimum order value of ${offer.minOrderValue} required for this coupon.`;
          }
        }
      } else {
        couponError = "Invalid or expired coupon code.";
      }
    }
  }

  // --- Location Coupon Service Execution ---
  let restaurantCouponDiscount = 0;
  let appliedRestaurantCoupon = null;
  const restaurantCodeRaw = dto.restaurantCouponCode
    ? String(dto.restaurantCouponCode).trim().toUpperCase()
    : "";

  if (restaurantCodeRaw) {
    const itemsCount = items.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0);
    const locationRes = await validateLocationCoupon({
        couponCode: restaurantCodeRaw,
        restaurantId: dto.restaurantId,
        subtotal,
        itemsCount,
        distanceKm
    });

    if (locationRes.discount > 0) {
        // We found a valid location coupon!
        restaurantCouponDiscount = locationRes.discount;
        appliedRestaurantCoupon = locationRes.appliedCoupon;
    } else if (locationRes.error && !appliedCoupon) {
        // If neither global nor location coupon was valid, show the location coupon error
        // ONLY if the global coupon error was generic "Invalid or expired"
        if (couponError === "Invalid or expired coupon code.") {
            couponError = locationRes.error;
        }
    }
  }
  // --- End Location Coupon Service Execution ---

  const couponDiscount = discount;
  const totalDiscount = couponDiscount + restaurantCouponDiscount;
  
  // Recalculate itemTax and total tax based on reduced subtotal due to restaurant discount
  const taxableSubtotal = Math.max(0, subtotal - restaurantCouponDiscount);
  itemTax = (Number.isFinite(gstRate) && gstRate > 0) ? (taxableSubtotal * (gstRate / 100)) : 0;
  tax = Math.round(itemTax + deliveryTax + platformTax + packagingTax + weatherGST);

  const totalBeforeDiscount = subtotal + deliveryFee + tax + platformFee + packagingFee + weatherFee;
  const total = Math.max(0, totalBeforeDiscount - totalDiscount);

  return {
    pricing: {
      subtotal,
      tax,
      taxBreakdown: {
        itemTax,
        deliveryTax,
        platformTax,
        packagingTax
      },
      packagingFee,
      deliveryFee,
      deliveryFeeBreakdown: deliveryFeeBreakdown || undefined,
      weatherFee,
      weatherGST,
      weatherPricing: weatherPricingSnapshot,
      freeDeliveryUpTo: Number.isFinite(freeUpTo) ? freeUpTo : undefined,
      platformFee,
      discount: totalDiscount,
      itemDiscount: itemDiscountTotal > 0 ? itemDiscountTotal : undefined,
      couponDiscount: couponDiscount > 0 ? couponDiscount : undefined,
      restaurantCouponDiscount: restaurantCouponDiscount > 0 ? restaurantCouponDiscount : undefined,
      deductGstFromRestaurant: feeSettings.deductGstFromRestaurant !== false,
      total,
      currency: "INR",
      surgeAmount: surgeAmount > 0 ? surgeAmount : 0,
      riderSurgeBonus: riderSurgeBonus > 0 ? riderSurgeBonus : 0,
      surgeSnapshotId: surgeSnapshotId || undefined,
      couponCode: appliedCoupon?.code || codeRaw || null,
      restaurantCouponCode: appliedRestaurantCoupon?.code || restaurantCodeRaw || null,
      appliedCoupon,
      appliedRestaurantCoupon,
      couponError,
    },
  };
}
