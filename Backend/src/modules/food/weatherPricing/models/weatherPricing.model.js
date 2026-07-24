import mongoose from 'mongoose';

const weatherPricingPolicySchema = new mongoose.Schema(
    {
        isEnabled: { type: Boolean, default: false },
        weatherCondition: {
            type: [String],
            default: ['RAIN'],
            // Example: ['RAIN', 'HEAVY_RAIN', 'STORM', 'FLOOD']
        },
        feePerKm: { type: Number, required: true, min: 0 },
        gstPercentage: { type: Number, required: true, min: 0 },
        maxFee: { type: Number, min: 0 }, // pre-GST cap
        minDistance: { type: Number, default: 0, min: 0 },
        applicableZones: {
            type: [String],
            default: ['ALL']
        },
        effectiveFrom: { type: Date, required: true },
        effectiveTill: { type: Date, default: null }, // Used for append-only versioning
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    { collection: 'food_weather_pricing_policies', timestamps: true }
);

// Indexes to quickly find the active policy version
weatherPricingPolicySchema.index({ effectiveFrom: -1 });
weatherPricingPolicySchema.index({ effectiveTill: 1 });

export const WeatherPricingPolicy = mongoose.model('WeatherPricingPolicy', weatherPricingPolicySchema);
