import mongoose from 'mongoose';

const emergencyBroadcastSchema = new mongoose.Schema(
    {
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodOrder',
            required: true,
            index: true
        },
        radius: {
            type: Number,
            required: true,
            min: 0.1
        },
        extraIncentive: {
            type: Number,
            default: 0,
            min: 0
        },
        priority: {
            type: String,
            enum: ['HIGH', 'CRITICAL'],
            default: 'HIGH'
        },
        duration: {
            type: Number,
            required: true,
            min: 60 // Minimum duration in seconds
        },
        message: {
            type: String,
            default: '',
            trim: true
        },
        status: {
            type: String,
            enum: ['ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED'],
            default: 'ACTIVE',
            index: true
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin',
            required: true
        },
        acceptedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodDeliveryPartner',
            default: null
        },
        totalRecipients: {
            type: Number,
            default: 0
        },
        expiresAt: {
            type: Date,
            required: true,
            index: true
        }
    },
    {
        collection: 'food_emergency_broadcasts',
        timestamps: true
    }
);

export const FoodEmergencyBroadcast = mongoose.model('FoodEmergencyBroadcast', emergencyBroadcastSchema);
