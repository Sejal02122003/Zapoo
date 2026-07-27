import mongoose from 'mongoose';

const vehicleRangeConfigSchema = new mongoose.Schema(
    {
        vehicleType: {
            type: String,
            enum: ['BICYCLE', 'BIKE', 'SCOOTER', 'CAR'],
            required: true,
            unique: true,
            uppercase: true
        },
        maxRangeKm: {
            type: Number,
            required: true,
            min: 0.1
        },
        allowFallbackToLargerVehicle: {
            type: Boolean,
            default: true
        },
        description: {
            type: String,
            default: ''
        }
    },
    { collection: 'food_vehicle_range_configs', timestamps: true }
);

export const VehicleRangeConfig = mongoose.model('VehicleRangeConfig', vehicleRangeConfigSchema);
