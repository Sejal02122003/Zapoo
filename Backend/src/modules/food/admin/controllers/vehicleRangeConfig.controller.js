import { VehicleRangeConfig } from '../models/vehicleRangeConfig.model.js';
import { sendResponse } from '../../../../utils/response.js';
import { ValidationError } from '../../../../core/auth/errors.js';

export async function getVehicleRangeConfigs(req, res, next) {
    try {
        const configs = await VehicleRangeConfig.find({}).sort({ maxRangeKm: 1 }).lean();
        return sendResponse(res, 200, 'Vehicle range configurations retrieved', configs);
    } catch (err) {
        next(err);
    }
}

export async function updateVehicleRangeConfig(req, res, next) {
    try {
        const { vehicleType } = req.params;
        const { maxRangeKm, allowFallbackToLargerVehicle, description } = req.body;

        const cleanType = String(vehicleType || '').trim().toUpperCase();
        if (!['BICYCLE', 'BIKE', 'SCOOTER', 'CAR'].includes(cleanType)) {
            throw new ValidationError('Invalid vehicle type parameter');
        }

        const updateData = {};
        if (maxRangeKm !== undefined) {
            const rangeNum = Number(maxRangeKm);
            if (!Number.isFinite(rangeNum) || rangeNum <= 0) {
                throw new ValidationError('maxRangeKm must be greater than 0');
            }
            updateData.maxRangeKm = rangeNum;
        }
        if (allowFallbackToLargerVehicle !== undefined) {
            updateData.allowFallbackToLargerVehicle = Boolean(allowFallbackToLargerVehicle);
        }
        if (description !== undefined) {
            updateData.description = String(description).trim();
        }

        const config = await VehicleRangeConfig.findOneAndUpdate(
            { vehicleType: cleanType },
            { $set: updateData },
            { new: true, upsert: true }
        ).lean();

        return sendResponse(res, 200, `${cleanType} range configuration updated successfully`, config);
    } catch (err) {
        next(err);
    }
}
