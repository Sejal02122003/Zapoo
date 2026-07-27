import { ValidationError } from '../../../../core/auth/errors.js';

export const ALLOWED_VEHICLE_TYPES = ['BICYCLE', 'BIKE', 'SCOOTER', 'CAR'];

/**
 * Normalizes vehicle type string to uppercase standard enum value.
 */
export function normalizeVehicleType(rawType) {
    if (!rawType || typeof rawType !== 'string') return 'BIKE';
    const clean = rawType.trim().toUpperCase();
    if (ALLOWED_VEHICLE_TYPES.includes(clean)) {
        return clean;
    }
    return 'BIKE';
}

/**
 * Validates vehicle type and conditional registration number requirements.
 */
export function validateVehicleDetails({ vehicleType, vehicleNumber }) {
    const normalizedType = normalizeVehicleType(vehicleType);

    if (!ALLOWED_VEHICLE_TYPES.includes(normalizedType)) {
        throw new ValidationError(`Invalid vehicle type. Allowed types: ${ALLOWED_VEHICLE_TYPES.join(', ')}`);
    }

    let cleanVehicleNumber = vehicleNumber ? String(vehicleNumber).trim().toUpperCase() : '';

    if (normalizedType === 'BICYCLE') {
        // Bicycle does not require/allow a vehicle registration number
        cleanVehicleNumber = null;
    } else {
        // Bike, Scooter, Car require a vehicle registration number
        if (!cleanVehicleNumber) {
            throw new ValidationError(`Vehicle registration number is required for ${normalizedType}`);
        }
        if (cleanVehicleNumber.length < 3) {
            throw new ValidationError('Vehicle registration number must be at least 3 characters long');
        }
    }

    return {
        vehicleType: normalizedType,
        vehicleNumber: cleanVehicleNumber
    };
}
