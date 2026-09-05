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
    .select("status location itemDiscounts discountRules discount packagingFee zoneId isTakeawayEnabled isAcceptingOrders")
    .lean();
  if (!restaurant) throw new ValidationError("Restaurant not found");
  if (restaurant.status !== "approved")
    throw new ValidationError("Restaurant not available");
  if (restaurant.isAcceptingOrders === false)
    throw new ValidationError("Restaurant is currently not accepting orders");

  const orderType = String(dto.orderType || 'delivery').toLowerCase();
  if (orderType === 'takeaway' && restaurant.isTakeawayEnabled === false) {
    throw new ValidationError("Takeaway orders are currently disabled for this restaurant");
  }

  const items = Array.isArray(dto.items) ? dto.items : [];
  let itemDiscountTotal = 0;
  let subtotal = 0;
  let eligibleSubtotalForCoupon = 0;

  const itemIds = items.map((it) => it.id || it._id || it.foodId || it.itemId)
    .filter(Boolean)
    .map(id => String(id))
    .filter(id => mongoose.Types.ObjectId.isValid(id));
  const foodDocs = itemIds.length ? await FoodItem.find({ _id: { $in: itemIds } }).lean() : [];
  const foodMap = new Map(foodDocs.map((f) => [String(f._id), f]));

  for (const it of items) {
    const itemIdStr = String(it.id || it._id || it.foodId || it.itemId || '');
    const foodDoc = foodMap.get(itemIdStr);

    // Base original price of item or variant
    let basePrice = 0;
    if (it.variantId) {
      const vDoc = foodDoc?.variants?.find((v) => String(v._id) === String(it.variantId));
      if (vDoc && vDoc.price != null && Number(vDoc.price) > 0) {
        basePrice = Number(vDoc.price);
      } else if (it.originalPrice != null && Number(it.originalPrice) > 0) {
        basePrice = Number(it.originalPrice);
      } else if (it.variantPrice != null && Number(it.variantPrice) > 0) {
        basePrice = Number(it.variantPrice);
      } else {
        basePrice = Number(it.price) || 0;
      }
    } else if (it.originalPrice != null && Number(it.originalPrice) > 0) {
      basePrice = Number(it.originalPrice);
    } else if (foodDoc && foodDoc.price != null && Number(foodDoc.price) > 0) {
      basePrice = Number(foodDoc.price);
    } else {
      basePrice = Number(it.price) || 0;
    }
    const qty = Number(it.quantity) || 1;

    let bestDiscountAmount = 0;
    let isStackable = true;

    // 1. Check dedicated ItemDiscountRule table (admin dynamic smart rules)
    const smartRule = await resolveItemDiscountRule({
      restaurantId: dto.restaurantId,
      menuItemId: itemIdStr,
      categoryId: foodDoc?.categoryId ? String(foodDoc.categoryId) : null,
      orderType: orderType.toUpperCase()
    });

    if (smartRule) {
      let smartDisc = 0;
      if (smartRule.discountType === 'PERCENTAGE') {
        const rawDiscount = basePrice * (Number(smartRule.discountValue) / 100);
        smartDisc = smartRule.maxDiscountAmount ? Math.min(rawDiscount, Number(smartRule.maxDiscountAmount)) : rawDiscount;
      } else {
        smartDisc = Number(smartRule.discountValue) || 0;
      }
      smartDisc = Math.max(0, Math.min(basePrice, smartDisc));
      if (smartDisc > bestDiscountAmount) {
        bestDiscountAmount = smartDisc;
        isStackable = smartRule.stackable !== false;
      }
    }

    // 2. Check Restaurant-level specific item discounts (restaurant.itemDiscounts)
    if (Array.isArray(restaurant?.itemDiscounts) && restaurant.itemDiscounts.length > 0) {
      const itemDisc = restaurant.itemDiscounts.find(
        (d) => String(d.itemId || '') === itemIdStr || (foodDoc && String(d.itemId || '') === String(foodDoc._id))
      );
      if (itemDisc && Number(itemDisc.discountValue) > 0) {
        const isFlat = String(itemDisc.discountType || '').toUpperCase() === 'FLAT';
        const dVal = Number(itemDisc.discountValue);
        const itemDiscAmount = isFlat ? dVal : (basePrice * dVal) / 100;
        const capped = Math.max(0, Math.min(basePrice, itemDiscAmount));
        if (capped > bestDiscountAmount) {
          bestDiscountAmount = capped;
        }
      }
    }

    // 3. Check Restaurant-level price-condition rules (restaurant.discountRules)
    if (Array.isArray(restaurant?.discountRules) && restaurant.discountRules.length > 0) {
      const matchRule = restaurant.discountRules.find((r) => {
        const val = Number(r.conditionValue);
        if (r.conditionType === 'PRICE_ABOVE' && basePrice > val) return true;
        if (r.conditionType === 'PRICE_BELOW' && basePrice < val) return true;
        return false;
      });
      if (matchRule && Number(matchRule.discountValue) > 0) {
        const isFlat = String(matchRule.discountType || '').toUpperCase() === 'FLAT';
        const dVal = Number(matchRule.discountValue);
        const ruleDiscAmount = isFlat ? dVal : (basePrice * dVal) / 100;
        const capped = Math.max(0, Math.min(basePrice, ruleDiscAmount));
        if (capped > bestDiscountAmount) {
          bestDiscountAmount = capped;
        }
      }
    }

    // 4. Check Restaurant-wide flat percentage discount (restaurant.discount)
    const restGlobalDiscount = Number(restaurant?.discount || 0);
    if (restGlobalDiscount > 0) {
      const globalDiscAmount = (basePrice * restGlobalDiscount) / 100;
      const capped = Math.max(0, Math.min(basePrice, globalDiscAmount));
      if (capped > bestDiscountAmount) {
        bestDiscountAmount = capped;
      }
    }

    const itemDiscountAmountPerUnit = Math.round(bestDiscountAmount * 100) / 100;
    const discountedUnitPrice = Math.max(0, basePrice - itemDiscountAmountPerUnit);

    const clientSentPrice = Number(it.price);
    if (Number.isFinite(clientSentPrice) && Math.abs(clientSentPrice - discountedUnitPrice) > 1) {
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
  itemDiscountTotal = Math.round(itemDiscountTotal * 100) / 100;

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

  const packagingFee = restaurant?.packagingFee != null ? Number(restaurant.packagingFee) : (feeSettings.packagingFee != null ? Number(feeSettings.packagingFee) : 0);

  const freeUpTo = Number(feeSettings.freeDeliveryUpTo || 0);
  let distanceKm = null;

  // Extract restaurant coordinates: [lng, lat]
  let rLng = null, rLat = null;
  if (Array.isArray(restaurant?.location?.coordinates) && restaurant.location.coordinates.length === 2) {
    rLng = Number(restaurant.location.coordinates[0]);
    rLat = Number(restaurant.location.coordinates[1]);
  } else if (restaurant?.location?.lat != null && restaurant?.location?.lng != null) {
    rLat = Number(restaurant.location.lat);
    rLng = Number(restaurant.location.lng);
  } else if (restaurant?.lat != null && restaurant?.lng != null) {
    rLat = Number(restaurant.lat);
    rLng = Number(restaurant.lng);
  }

  // Extract delivery address coordinates: [lng, lat]
  let dLng = null, dLat = null;
  const dLoc = dto?.deliveryAddress?.location;
  if (Array.isArray(dLoc?.coordinates) && dLoc.coordinates.length === 2) {
    dLng = Number(dLoc.coordinates[0]);
    dLat = Number(dLoc.coordinates[1]);
  } else if (dLoc?.latitude != null && dLoc?.longitude != null) {
    dLat = Number(dLoc.latitude);
    dLng = Number(dLoc.longitude);
  } else if (dLoc?.lat != null && dLoc?.lng != null) {
    dLat = Number(dLoc.lat);
    dLng = Number(dLoc.lng);
  } else if (dto?.deliveryAddress?.latitude != null && dto?.deliveryAddress?.longitude != null) {
    dLat = Number(dto.deliveryAddress.latitude);
    dLng = Number(dto.deliveryAddress.longitude);
  } else if (dto?.deliveryAddress?.lat != null && dto?.deliveryAddress?.lng != null) {
    dLat = Number(dto.deliveryAddress.lat);
    dLng = Number(dto.deliveryAddress.lng);
  }

  if (Number.isFinite(rLat) && Number.isFinite(rLng) && Number.isFinite(dLat) && Number.isFinite(dLng)) {
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
      deliveryFee = slabPr > 0 ? slabPr : Number(feeSettings.deliveryFee || 25);
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
          const fallbackRule = rules[rules.length - 1];
          deliveryFee = fallbackRule ? Number(fallbackRule.fee || 25) : Number(feeSettings.deliveryFee || 25);
        }
      } else {
        deliveryFee = Number(feeSettings.deliveryFee || 25);
      }
    } else {
      deliveryFee = Number(feeSettings.deliveryFee || 25);
    }
  } else {
    const ranges = Array.isArray(feeSettings.deliveryFeeRanges)
      ? [...feeSettings.deliveryFeeRanges]
      : [];
    if (ranges.length > 0) {
      const sortedRanges = ranges.sort((a, b) => Number(a.min) - Number(b.min));
      let matched = null;
      for (let i = 0; i < sortedRanges.length; i += 1) {
        const r = sortedRanges[i] || {};
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
        const isLast = i === sortedRanges.length - 1;
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
        const lastRange = sortedRanges[sortedRanges.length - 1];
        matched = lastRange && Number.isFinite(Number(lastRange.fee))
          ? Number(lastRange.fee)
          : Number(feeSettings.deliveryFee || 25);
      }

      deliveryFee = Number.isFinite(matched)
        ? matched
        : (sortedRanges[0]?.fee != null ? Number(sortedRanges[0].fee) : Number(feeSettings.deliveryFee || 25));
    } else {
      deliveryFee = Number(feeSettings.deliveryFee != null && Number(feeSettings.deliveryFee) > 0 ? feeSettings.deliveryFee : 25);
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

  const couponDiscount = Math.round(discount);
  const roundedRestaurantCouponDiscount = Math.round(restaurantCouponDiscount);
  const totalDiscount = couponDiscount + roundedRestaurantCouponDiscount;

  // Recalculate itemTax and total tax based on reduced subtotal due to restaurant discount
  const taxableSubtotal = Math.max(0, subtotal - roundedRestaurantCouponDiscount);
  itemTax = (Number.isFinite(gstRate) && gstRate > 0) ? (taxableSubtotal * (gstRate / 100)) : 0;
  tax = Math.round(itemTax + deliveryTax + platformTax + packagingTax + weatherGST);

  const roundedSubtotal = Math.round(subtotal);
  const roundedDeliveryFee = Math.round(deliveryFee);
  const roundedPlatformFee = Math.round(platformFee);
  const roundedPackagingFee = Math.round(packagingFee);
  const roundedWeatherFee = Math.round(weatherFee);

  const totalBeforeDiscount = roundedSubtotal + roundedDeliveryFee + tax + roundedPlatformFee + roundedPackagingFee + roundedWeatherFee;

  // --- Rule-based Cashback Evaluation for Pricing Display ---
  let ruleCashback = null;
  try {
    const { evaluateCashbackRule } = await import('../../admin/services/cashback.service.js');
    const cashbackResult = await evaluateCashbackRule({
      restaurantId: dto.restaurantId,
      userId,
      orderSubtotal: eligibleSubtotalForCoupon,
      orderType: (dto.orderType || 'DELIVERY').toUpperCase(),
      hasCouponApplied: Boolean(appliedCoupon)
    });
    if (cashbackResult && cashbackResult.amount > 0) {
      ruleCashback = {
        ruleId: cashbackResult.rule._id,
        name: cashbackResult.rule.name || 'Order Cashback',
        amount: cashbackResult.amount,
        cashbackType: cashbackResult.rule.cashbackType,
        cashbackValue: cashbackResult.rule.cashbackValue
      };
    }
  } catch (err) {
    // Non-fatal
  }

  const couponCashbackAmount = (appliedCashbackCoupon?.amount || (appliedCoupon?.rewardType === 'CASHBACK' || appliedCoupon?.rewardType === 'BOTH' ? appliedCoupon.amount : 0) || 0);
  const totalCashbackAmount = couponCashbackAmount + (ruleCashback?.amount || 0);

  // Total payable by user: only actual discounts reduce the order total.
  // Cashback is a reward credited to the customer's wallet after order completion/delivery, NOT an upfront bill deduction.
  const total = Math.round(Math.max(0, totalBeforeDiscount - totalDiscount));

  const pgFeeRate = feeSettings.applyGlobalTaxes !== false ? (Number(feeSettings.globalPaymentGatewayFee) || 0) : 0;
  const pgBaseAmount = Math.max(0, roundedSubtotal + roundedPackagingFee - roundedRestaurantCouponDiscount - couponDiscount);
  const paymentGatewayFee = Math.round(pgBaseAmount * (pgFeeRate / 100) * 100) / 100;

  return {
    pricing: {
      subtotal: roundedSubtotal,
      tax,
      taxBreakdown: {
        itemTax: Math.round(itemTax),
        deliveryTax: Math.round(deliveryTax),
        platformTax: Math.round(platformTax),
        packagingTax: Math.round(packagingTax)
      },
      packagingFee: roundedPackagingFee,
      deliveryFee: roundedDeliveryFee,
      deliveryFeeBreakdown: deliveryFeeBreakdown || undefined,
      weatherFee: roundedWeatherFee,
      weatherGST: Math.round(weatherGST),
      weatherPricing: weatherPricingSnapshot,
      freeDeliveryUpTo: Number.isFinite(freeUpTo) ? freeUpTo : undefined,
      platformFee: roundedPlatformFee,
      paymentGatewayFee,
      discount: totalDiscount,
      itemDiscount: itemDiscountTotal > 0 ? Math.round(itemDiscountTotal) : undefined,
      couponDiscount: couponDiscount > 0 ? couponDiscount : 0,
      restaurantCouponDiscount: roundedRestaurantCouponDiscount > 0 ? roundedRestaurantCouponDiscount : 0,
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
      ruleCashback,
      cashbackAmount: totalCashbackAmount > 0 ? totalCashbackAmount : 0,
      cashbackBreakdown: (couponCashbackAmount > 0 || ruleCashback) ? {
        couponCashback: couponCashbackAmount,
        ruleCashback: ruleCashback?.amount || 0,
        ruleName: ruleCashback?.name || null
      } : undefined,
      couponError,
    },
  };
}