import mongoose from 'mongoose';

const surgeConfigSchema = new mongoose.Schema(
    {
        // Null restaurantId represents global default configuration fallback
        restaurantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodRestaurant',
            default: null,
            index: true
        },
        enabled: {
            type: Boolean,
            default: true
        },
        // Low threshold ratio (demand/supply) below which surge is zero (e.g. 1.2)
        lowThresholdRatio: {
            type: Number,
            default: 1.2,
            min: 0
        },
        // High threshold ratio (demand/supply) at or above which max surge is reached (e.g. 3.0)
        highThresholdRatio: {
            type: Number,
            default: 3.0,
            min: 0.1
        },
        // Base surge amount in currency (₹) applied when low threshold is exceeded (e.g. ₹10)
        baseSurgeAmount: {
            type: Number,
            default: 10,
            min: 0
        },
        // Maximum surge amount in currency (₹) (e.g. ₹50)
        maxSurgeAmount: {
            type: Number,
            default: 50,
            min: 0
        },
        // Exponential smoothing factor alpha (0.1 to 1.0, e.g. 0.3) to prevent sudden jumps
        smoothingAlpha: {
            type: Number,
            default: 0.3,
            min: 0.05,
            max: 1.0
        },
        // Percentage of customer surge fee passed through to rider payout (0-100%)
        riderSurgeSharePercent: {
            type: Number,
            default: 80,
            min: 0,
            max: 100
        },
        // Radius in km around restaurant to count available online riders
        radiusKm: {
            type: Number,
            default: 10,
            min: 1
        }
    },
    { collection: 'food_surge_configs', timestamps: true }
);

export const FoodSurgeConfig = mongoose.model('FoodSurgeConfig', surgeConfigSchema);
