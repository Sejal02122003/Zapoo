import mongoose from 'mongoose';

const surgeSnapshotSchema = new mongoose.Schema(
    {
        restaurantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodRestaurant',
            required: true,
            index: true
        },
        pendingOrdersCount: {
            type: Number,
            default: 0,
            min: 0
        },
        availableRidersCount: {
            type: Number,
            default: 0,
            min: 0
        },
        demandSupplyRatio: {
            type: Number,
            default: 0,
            min: 0
        },
        rawSurgeAmount: {
            type: Number,
            default: 0,
            min: 0
        },
        surgeAmount: {
            type: Number,
            default: 0,
            min: 0
        },
        validUntil: {
            type: Date,
            required: true,
            index: true
        }
    },
    { collection: 'food_surge_snapshots', timestamps: true }
);

surgeSnapshotSchema.index({ restaurantId: 1, createdAt: -1 });

export const FoodSurgeSnapshot = mongoose.model('FoodSurgeSnapshot', surgeSnapshotSchema);
