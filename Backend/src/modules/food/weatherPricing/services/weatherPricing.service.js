import { WeatherPricingPolicy } from '../models/weatherPricing.model.js';

export async function getActiveWeatherPolicy() {
    return await WeatherPricingPolicy.findOne({
        isEnabled: true,
        effectiveFrom: { $lte: new Date() },
        $or: [
            { effectiveTill: null },
            { effectiveTill: { $gt: new Date() } }
        ]
    }).sort({ effectiveFrom: -1 }).lean();
}

/**
 * Evaluates whether an order matches the bad weather pricing policy.
 * @param {Object} policy Active WeatherPricingPolicy document
 * @param {Number} distanceKm Distance from restaurant to customer
 * @param {String} zoneId The city/zone ID of the restaurant
 * @returns {Object} { isEligible, weatherFee, gstAmount, totalWeatherCharge, feePerKm, gstPercentage }
 */
export function evaluateWeatherPricing(policy, distanceKm, zoneId) {
    if (!policy) {
        return { isEligible: false };
    }

    // 1. Min distance check
    if (!distanceKm || distanceKm < policy.minDistance) {
        return { isEligible: false };
    }

    // 2. Zone check
    if (policy.applicableZones && policy.applicableZones.length > 0) {
        const isAll = policy.applicableZones.includes('ALL');
        const matchesZone = zoneId ? policy.applicableZones.includes(zoneId.toString()) : false;
        
        if (!isAll && !matchesZone) {
            return { isEligible: false };
        }
    }

    // Calculate fee (pre-GST cap)
    const rawFee = distanceKm * policy.feePerKm;
    const maxFee = policy.maxFee;
    let weatherFee = rawFee;

    if (maxFee != null && maxFee > 0 && rawFee > maxFee) {
        weatherFee = maxFee;
    }

    const gstAmount = Math.round((weatherFee * (policy.gstPercentage / 100)) * 100) / 100;
    const totalWeatherCharge = weatherFee + gstAmount;

    return {
        isEligible: true,
        weatherFee,
        gstAmount,
        totalWeatherCharge,
        feePerKm: policy.feePerKm,
        gstPercentage: policy.gstPercentage,
        policyId: policy._id,
        weatherCondition: policy.weatherCondition?.[0] || 'RAIN'
    };
}
