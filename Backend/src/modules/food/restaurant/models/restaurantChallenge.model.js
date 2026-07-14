import mongoose from 'mongoose';

const restaurantChallengeSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    status: { 
        type: String, 
        enum: ['Draft', 'Active', 'Paused', 'Expired', 'Completed'],
        default: 'Draft' 
    },
    startDate: { type: Date },
    endDate: { type: Date },
    recurrence: { 
        type: String, 
        enum: ['ONCE', 'DAILY', 'WEEKLY', 'MONTHLY'],
        default: 'ONCE' 
    },
    reward: { type: mongoose.Schema.Types.Mixed }, // e.g., { type: "WALLET_CREDIT", amount: 500 }
    criteria: { type: mongoose.Schema.Types.Mixed }, // e.g., { type: "TOTAL_ORDERS", target: 100 }
    restaurantFilter: { type: mongoose.Schema.Types.Mixed }, // e.g., { type: "ALL" }
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodAdmin' }
}, { 
    collection: 'food_restaurant_challenges', 
    timestamps: true 
});

export const RestaurantChallenge = mongoose.model('RestaurantChallenge', restaurantChallengeSchema);
