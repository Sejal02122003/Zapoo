import mongoose from 'mongoose';
import { FoodSurgeConfig } from '../models/surgeConfig.model.js';
import { FoodSurgeSnapshot } from '../models/surgeSnapshot.model.js';
import { FoodOrder } from '../../orders/models/order.model.js';
import { FoodRestaurant } from '../../restaurant/models/restaurant.model.js';
import { FoodDeliveryPartner } from '../../delivery/models/deliveryPartner.model.js';
import { logger } from '../../../../utils/logger.js';

/**
 * Counts active demand (pending orders) for a restaurant.
 */
export async function getPendingOrdersCount(restaurantId) {
    if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) return 0;
    const rId = new mongoose.Types.ObjectId(restaurantId);

    const count = await FoodOrder.countDocuments({
        restaurantId: rId,
        orderStatus: { $in: ['placed', 'accepted', 'processing', 'ready_for_pickup'] }
    });

    return count;
}

/**
 * Counts available supply (online, approved riders) near a restaurant location.
 */
export async function getAvailableRidersCount(restaurantId, radiusKm = 10) {
    if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) return 0;
    const rId = new mongoose.Types.ObjectId(restaurantId);

    const restaurant = await FoodRestaurant.findById(rId).select('location').lean();
    if (!restaurant?.location?.coordinates || restaurant.location.coordinates.length !== 2) {
        return 0;
    }

    const [rLng, rLat] = restaurant.location.coordinates;

    const geoNearPipeline = [
        {
            $geoNear: {
                near: { type: 'Point', coordinates: [rLng, rLat] },
                distanceField: 'distanceMeters',
                maxDistance: radiusKm * 1000,
                spherical: true,
                query: {
                    status: 'approved',
                    availabilityStatus: 'online'
                }
            }
        },
        { $count: 'count' }
    ];

    const res = await FoodDeliveryPartner.aggregate(geoNearPipeline);
    return res[0]?.count || 0;
}

/**
 * Gets effective surge config for a restaurant (or global default fallback).
 */
export async function getEffectiveSurgeConfig(restaurantId) {
    let config = null;
    if (restaurantId && mongoose.Types.ObjectId.isValid(restaurantId)) {
        config = await FoodSurgeConfig.findOne({ restaurantId, enabled: true }).lean();
    }

    if (!config) {
        config = await FoodSurgeConfig.findOne({ restaurantId: null, enabled: true }).lean();
    }

    if (!config) {
        config = {
            enabled: true,
            lowThresholdRatio: 1.2,
            highThresholdRatio: 3.0,
            baseSurgeAmount: 10,
            maxSurgeAmount: 50,
            smoothingAlpha: 0.3,
            riderSurgeSharePercent: 80,
            radiusKm: 10
        };
    }

    return config;
}

/**
 * Computes raw surge interpolated linearly between low and high ratio thresholds.
 */
export function computeRawSurgeAmount(ratio, config) {
    const { lowThresholdRatio, highThresholdRatio, baseSurgeAmount, maxSurgeAmount } = config;

    if (ratio < lowThresholdRatio) return 0;
    if (ratio >= highThresholdRatio) return maxSurgeAmount;

    // Linear interpolation
    const fraction = (ratio - lowThresholdRatio) / (highThresholdRatio - lowThresholdRatio);
    const interpolated = baseSurgeAmount + fraction * (maxSurgeAmount - baseSurgeAmount);

    return Math.round(interpolated * 100) / 100;
}

/**
 * Core computation service: computes demand, supply, ratio, applies exponential smoothing, and saves snapshot.
 */
export async function computeSurgeForRestaurant(restaurantId) {
    if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) return null;

    const config = await getEffectiveSurgeConfig(restaurantId);
    if (!config || !config.enabled) {
        return null;
    }

    const pendingOrders = await getPendingOrdersCount(restaurantId);
    const availableRiders = await getAvailableRidersCount(restaurantId, config.radiusKm);

    // Guard against divide by zero when 0 riders available
    const effectiveRiders = Math.max(0.5, availableRiders);
    const ratio = Math.round((pendingOrders / effectiveRiders) * 100) / 100;

    const rawSurge = computeRawSurgeAmount(ratio, config);

    // Get previous snapshot for exponential smoothing
    const lastSnapshot = await FoodSurgeSnapshot.findOne({ restaurantId })
        .sort({ createdAt: -1 })
        .lean();

    let smoothedSurge = rawSurge;
    if (lastSnapshot && typeof lastSnapshot.surgeAmount === 'number') {
        const alpha = config.smoothingAlpha || 0.3;
        smoothedSurge = alpha * rawSurge + (1 - alpha) * lastSnapshot.surgeAmount;
        smoothedSurge = Math.round(smoothedSurge * 100) / 100;
    }

    // Expiry set for 6 minutes (gives 1 min buffer for 5 min cron)
    const validUntil = new Date(Date.now() + 6 * 60 * 1000);

    const snapshot = await FoodSurgeSnapshot.create({
        restaurantId,
        pendingOrdersCount: pendingOrders,
        availableRidersCount: availableRiders,
        demandSupplyRatio: ratio,
        rawSurgeAmount: rawSurge,
        surgeAmount: smoothedSurge,
        validUntil
    });

    return snapshot.toObject();
}

/**
 * Fast sub-millisecond lookup for pricing: retrieves current valid surge snapshot.
 */
export async function getCurrentSurgeForRestaurant(restaurantId) {
    if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) {
        return { surgeAmount: 0, snapshotId: null, riderSurgeBonus: 0 };
    }

    const now = new Date();
    const snapshot = await FoodSurgeSnapshot.findOne({
        restaurantId,
        validUntil: { $gte: now }
    })
        .sort({ createdAt: -1 })
        .lean();

    if (!snapshot || !snapshot.surgeAmount || snapshot.surgeAmount <= 0) {
        return { surgeAmount: 0, snapshotId: null, riderSurgeBonus: 0 };
    }

    const config = await getEffectiveSurgeConfig(restaurantId);
    const sharePercent = config?.riderSurgeSharePercent != null ? config.riderSurgeSharePercent : 80;
    const riderSurgeBonus = Math.round(snapshot.surgeAmount * (sharePercent / 100) * 100) / 100;

    return {
        surgeAmount: snapshot.surgeAmount,
        snapshotId: snapshot._id,
        riderSurgeBonus
    };
}
