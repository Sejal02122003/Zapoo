import { FoodSurgeConfig } from '../models/surgeConfig.model.js';
import { FoodSurgeSnapshot } from '../models/surgeSnapshot.model.js';
import * as surgeService from '../services/surgeCalculation.service.js';
import { processSurgeCalculationForAllRestaurants } from '../../../../core/jobs/surgeScheduler.job.js';
import { sendResponse } from '../../../../utils/response.js';

export async function getSurgeConfigs(req, res, next) {
    try {
        const configs = await FoodSurgeConfig.find({})
            .populate('restaurantId', 'restaurantName ownerName')
            .sort({ createdAt: -1 })
            .lean();

        return sendResponse(res, 200, 'Surge configurations retrieved successfully', configs);
    } catch (err) {
        next(err);
    }
}

export async function upsertSurgeConfig(req, res, next) {
    try {
        const {
            restaurantId,
            enabled,
            lowThresholdRatio,
            highThresholdRatio,
            baseSurgeAmount,
            maxSurgeAmount,
            smoothingAlpha,
            riderSurgeSharePercent,
            radiusKm
        } = req.body;

        const targetId = restaurantId ? String(restaurantId) : null;

        const updateData = {};
        if (enabled !== undefined) updateData.enabled = Boolean(enabled);
        if (lowThresholdRatio !== undefined) updateData.lowThresholdRatio = Number(lowThresholdRatio);
        if (highThresholdRatio !== undefined) updateData.highThresholdRatio = Number(highThresholdRatio);
        if (baseSurgeAmount !== undefined) updateData.baseSurgeAmount = Number(baseSurgeAmount);
        if (maxSurgeAmount !== undefined) updateData.maxSurgeAmount = Number(maxSurgeAmount);
        if (smoothingAlpha !== undefined) updateData.smoothingAlpha = Number(smoothingAlpha);
        if (riderSurgeSharePercent !== undefined) updateData.riderSurgeSharePercent = Number(riderSurgeSharePercent);
        if (radiusKm !== undefined) updateData.radiusKm = Number(radiusKm);

        const config = await FoodSurgeConfig.findOneAndUpdate(
            { restaurantId: targetId },
            { $set: updateData },
            { new: true, upsert: true }
        ).lean();

        return sendResponse(res, 200, 'Surge config updated successfully', config);
    } catch (err) {
        next(err);
    }
}

export async function getActiveSurgeSnapshots(req, res, next) {
    try {
        const now = new Date();
        const snapshots = await FoodSurgeSnapshot.find({ validUntil: { $gte: now } })
            .populate('restaurantId', 'restaurantName ownerName location')
            .sort({ surgeAmount: -1 })
            .lean();

        return sendResponse(res, 200, 'Active surge snapshots retrieved', snapshots);
    } catch (err) {
        next(err);
    }
}

export async function triggerManualSurgeRecalculation(req, res, next) {
    try {
        const { restaurantId } = req.body;
        let result = null;

        if (restaurantId) {
            result = await surgeService.computeSurgeForRestaurant(restaurantId);
        } else {
            await processSurgeCalculationForAllRestaurants();
            result = { message: 'Recalculation triggered for all active restaurants' };
        }

        return sendResponse(res, 200, 'Surge recalculation completed', result);
    } catch (err) {
        next(err);
    }
}
