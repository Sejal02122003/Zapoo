import mongoose from 'mongoose';

const commissionTypeSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ['percentage', 'amount'],
            default: 'percentage'
        },
        value: { type: Number, default: 0, min: 0 }
    },
    { _id: false }
);

const restaurantCommissionSchema = new mongoose.Schema(
    {
        restaurantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodRestaurant',
            required: true,
            unique: true,
            index: true
        },
        defaultCommission: {
            type: commissionTypeSchema,
            default: () => ({ type: 'percentage', value: 0 })
        },
        deliveryCommission: {
            type: commissionTypeSchema,
            default: () => ({ type: 'percentage', value: 0 })
        },
        takeawayCommission: {
            type: commissionTypeSchema,
            default: () => ({ type: 'percentage', value: 0 })
        },
        notes: { type: String, trim: true, default: '' },
        status: { type: Boolean, default: true, index: true }
    },
    { collection: 'food_restaurant_commissions', timestamps: true }
);

export const FoodRestaurantCommission = mongoose.model('FoodRestaurantCommission', restaurantCommissionSchema);
