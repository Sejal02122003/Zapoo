import mongoose from 'mongoose';

const foodOfferRestaurantSchema = new mongoose.Schema(
    {
        restaurantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodRestaurant',
            required: true
        },
        offerType: {
            type: String,
            enum: ['daily_deal', 'best_offer'],
            required: true
        },
        offerText: {
            type: String,
            default: ''
        },
        priority: {
            type: Number,
            default: 0,
            index: true
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true
        }
    },
    {
        timestamps: true
    }
);

// Prevent duplicate restaurant in the same offer type
foodOfferRestaurantSchema.index({ restaurantId: 1, offerType: 1 }, { unique: true });

export const FoodOfferRestaurant = mongoose.model('FoodOfferRestaurant', foodOfferRestaurantSchema);
