import mongoose from 'mongoose';

const restaurantChallengeParticipationSchema = new mongoose.Schema({
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodRestaurant', required: true },
    challengeId: { type: mongoose.Schema.Types.ObjectId, ref: 'RestaurantChallenge', required: true },
    progress: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    rewardIssued: { type: Boolean, default: false },
    rewardIssuedAt: { type: Date },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'RestaurantBonusTransaction' }
}, { 
    collection: 'food_restaurant_challenge_participations', 
    timestamps: true 
});

// A restaurant can only participate in a specific challenge once per recurrence period (for ONCE, just one record)
// For now, enforce one unique combination. Recurrence handling can be done by active dates logic.
restaurantChallengeParticipationSchema.index({ restaurantId: 1, challengeId: 1 }, { unique: true });

export const RestaurantChallengeParticipation = mongoose.model('RestaurantChallengeParticipation', restaurantChallengeParticipationSchema);
