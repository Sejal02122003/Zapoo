import mongoose from 'mongoose';

const deliveryFeeAmountRuleSchema = new mongoose.Schema(
    {
        minAmount: { type: Number, required: true, min: 0 },
        maxAmount: { type: Number, default: null }, // null means above this amount
        fee: { type: Number, required: true, min: 0 },
        feeType: { type: String, enum: ['flat', 'per_km'], default: 'flat' }
    },
    { _id: false }
);

const deliveryFeeMatrixRuleSchema = new mongoose.Schema(
    {
        minDistance: { type: Number, required: true, min: 0 },
        maxDistance: { type: Number, default: null },
        amountRules: { type: [deliveryFeeAmountRuleSchema], default: [] }
    },
    { _id: false }
);

const deliveryFeeRangeSchema = new mongoose.Schema(
    {
        min: { type: Number, required: true, min: 0 },
        max: { type: Number, required: true, min: 0 },
        fee: { type: Number, required: true, min: 0 }
    },
    { _id: false }
);

const riderPayoutRangeSchema = new mongoose.Schema(
    {
        min: { type: Number, required: true, min: 0 },
        max: { type: Number, required: true, min: 0 },
        pay: { type: Number, required: true, min: 0 },
        payType: { type: String, enum: ['flat', 'per_km'], default: 'flat' }
    },
    { _id: false }
);

const feeSettingsSchema = new mongoose.Schema(
    {
        // Customer Delivery Fee Settings
        deliveryFeeType: { type: String, enum: ['range', 'slab', 'matrix'], default: 'range' },
        slabDistance: { type: Number, min: 0, default: 0 },
        slabPrice: { type: Number, min: 0, default: 0 },
        extraPricePerKm: { type: Number, min: 0, default: 0 },
        deliveryFee: { type: Number, min: 0 },
        deliveryFeeRanges: { type: [deliveryFeeRangeSchema], default: [] },
        deliveryFeeMatrix: { type: [deliveryFeeMatrixRuleSchema], default: [] },
        freeDeliveryUpTo: { type: Number, min: 0 },
        freeDeliveryThreshold: { type: Number, min: 0 },
        discountDeliveryThreshold: { type: Number, min: 0 },
        discountedDeliveryFee: { type: Number, min: 0 },

        // Rider Payout Settings (Separate from Customer Charges)
        riderPayoutType: { type: String, enum: ['range'], default: 'range' },
        riderBasePayout: { type: Number, min: 0 },
        riderPayoutRanges: { type: [riderPayoutRangeSchema], default: [] },
        deliveryBonusAmount: { type: Number, min: 0, default: 0 },

        platformFee: { type: Number, min: 0 },
        takeawayPlatformFee: { type: Number, min: 0 },
        packagingFee: { type: Number, min: 0 },
        gstRate: { type: Number, min: 0, max: 100 },
        gstOnDeliveryFee: { type: Number, min: 0, max: 100, default: 0 },
        gstOnPlatformFee: { type: Number, min: 0, max: 100, default: 0 },
        gstOnTakeawayPlatformFee: { type: Number, min: 0, max: 100, default: 0 },
        gstOnPackagingFee: { type: Number, min: 0, max: 100, default: 0 },
        dispatchRadiusTiers: { type: [Number], default: [2, 4, 6, 8, 10] },
        globalRestaurantCommission: { type: Number, min: 0, default: 0 },
        globalTakeawayRestaurantCommission: { type: Number, min: 0, default: 0 },
        globalGstOnItem: { type: Number, min: 0, max: 100, default: 0 },
        globalGstOnCommission: { type: Number, min: 0, max: 100, default: 18 },
        globalPaymentGatewayFee: { type: Number, min: 0, max: 100, default: 2 },
        globalTcs: { type: Number, min: 0, max: 100, default: 1 },
        applyGlobalTaxes: { type: Boolean, default: true },
        deductGstFromRestaurant: { type: Boolean, default: true },
        
        isActive: { type: Boolean, default: true, index: true }
    },
    { collection: 'food_fee_settings', timestamps: true }
);

feeSettingsSchema.index({ isActive: 1, createdAt: -1 });

export const FoodFeeSettings = mongoose.model('FoodFeeSettings', feeSettingsSchema);

