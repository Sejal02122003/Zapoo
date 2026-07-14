import mongoose from 'mongoose';

const restaurantBonusTransactionSchema = new mongoose.Schema({
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodRestaurant', required: true },
    challengeId: { type: mongoose.Schema.Types.ObjectId, ref: 'RestaurantChallenge' }, // Optional, in case admin manually gives a bonus
    amount: { type: Number, required: true },
    rewardType: { type: String, required: true }, // e.g., 'WALLET_CREDIT'
    remarks: { type: String },
    transactionType: { type: String, default: 'bonus' }
}, { 
    collection: 'food_restaurant_bonus_transactions', 
    timestamps: true 
});

restaurantBonusTransactionSchema.index({ restaurantId: 1, createdAt: -1 });

export const RestaurantBonusTransaction = mongoose.model('RestaurantBonusTransaction', restaurantBonusTransactionSchema);
