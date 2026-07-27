import mongoose from 'mongoose';
import { VehicleRangeConfig } from '../../admin/models/vehicleRangeConfig.model.js';
import { FoodDeliveryPartner } from '../models/deliveryPartner.model.js';
import { FoodRestaurant } from '../../restaurant/models/restaurant.model.js';
import { haversineKm } from '../../orders/services/order.helpers.js';
import { logger } from '../../../../utils/logger.js';

export const DEFAULT_VEHICLE_RANGES = {
    BICYCLE: { maxRangeKm: 3, order: 1 },
    BIKE: { maxRangeKm: 10, order: 2 },
    SCOOTER: { maxRangeKm: 12, order: 3 },
    CAR: { maxRangeKm: 25, order: 4 }
};

/**
 * Gets effective vehicle range limits and fallback setting.
 */
export async function getVehicleRangeConfigs() {
    try {
        const configs = await VehicleRangeConfig.find({}).lean();
        const map = { ...DEFAULT_VEHICLE_RANGES };

        configs.forEach((cfg) => {
            const vType = String(cfg.vehicleType).toUpperCase();
            if (map[vType]) {
                map[vType].maxRangeKm = Number(cfg.maxRangeKm) || map[vType].maxRangeKm;
                map[vType].allowFallback = cfg.allowFallbackToLargerVehicle !== false;
            }
        });

        return map;
    } catch (err) {
        logger.error(`Error loading VehicleRangeConfig: ${err.message}`);
        return DEFAULT_VEHICLE_RANGES;
    }
}

/**
 * Filters a list of nearby riders by their vehicle type range limits and delivery distance.
 */
export function filterRidersByVehicleRange({ partners = [], deliveryDistanceKm = 0, rangeMap = DEFAULT_VEHICLE_RANGES }) {
    if (!Array.isArray(partners) || partners.length === 0) return [];
    if (!deliveryDistanceKm || deliveryDistanceKm <= 0) return partners;

    // Filter riders whose vehicle type max range covers the delivery distance
    const exactMatches = partners.filter((partner) => {
        const vType = String(partner.vehicleType || 'BIKE').toUpperCase();
        const rangeObj = rangeMap[vType] || DEFAULT_VEHICLE_RANGES.BIKE;
        return deliveryDistanceKm <= rangeObj.maxRangeKm;
    });

    if (exactMatches.length > 0) {
        return exactMatches;
    }

    // Fallback: If no exact matches within range, check if fallback to larger vehicle (e.g. CAR) is enabled
    const isFallbackAllowed = Object.values(rangeMap).some((r) => r.allowFallback !== false);
    if (!isFallbackAllowed) {
        return [];
    }

    // Fallback logic: offer to riders with the largest vehicle type (e.g. CAR / SCOOTER) capable of distance
    const fallbackMatches = partners.filter((partner) => {
        const vType = String(partner.vehicleType || 'BIKE').toUpperCase();
        const rangeObj = rangeMap[vType] || DEFAULT_VEHICLE_RANGES.BIKE;
        return vType === 'CAR' || deliveryDistanceKm <= (rangeObj.maxRangeKm * 1.5);
    });

    return fallbackMatches;
}

/**
 * Fetches online approved riders near restaurant filtered by vehicle range eligibility.
 */
export async function getEligibleNearbyRiders({
    restaurantId,
    deliveryAddress = null,
    deliveryDistanceKm = null,
    maxSearchRadiusKm = 25,
    limit = 25
}) {
    if (!restaurantId) return { restaurant: null, partners: [] };
    const rId = (restaurantId?._id || restaurantId).toString();

    const restaurant = await FoodRestaurant.findById(rId).select('location').lean();
    if (!restaurant?.location?.coordinates?.length) {
        return { restaurant: null, partners: [] };
    }

    const [rLng, rLat] = restaurant.location.coordinates;

    // Determine delivery distance if not provided
    let calculatedDistKm = Number(deliveryDistanceKm);
    if ((!calculatedDistKm || !Number.isFinite(calculatedDistKm)) && deliveryAddress?.location?.coordinates?.length === 2) {
        const [dLng, dLat] = deliveryAddress.location.coordinates;
        calculatedDistKm = haversineKm(rLat, rLng, dLat, dLng);
    }
    if (!calculatedDistKm || !Number.isFinite(calculatedDistKm)) {
        calculatedDistKm = 0;
    }

    const geoNearPipeline = [
        {
            $geoNear: {
                near: { type: 'Point', coordinates: [rLng, rLat] },
                distanceField: 'distanceMeters',
                maxDistance: maxSearchRadiusKm * 1000,
                spherical: true,
                query: {
                    status: 'approved',
                    availabilityStatus: 'online'
                }
            }
        },
        { $limit: limit * 2 }
    ];

    const rawPartners = await FoodDeliveryPartner.aggregate(geoNearPipeline);
    const rangeMap = await getVehicleRangeConfigs();

    const eligiblePartners = filterRidersByVehicleRange({
        partners: rawPartners,
        deliveryDistanceKm: calculatedDistKm,
        rangeMap
    });

    return {
        restaurant,
        deliveryDistanceKm: calculatedDistKm,
        partners: eligiblePartners.slice(0, limit)
    };
}
