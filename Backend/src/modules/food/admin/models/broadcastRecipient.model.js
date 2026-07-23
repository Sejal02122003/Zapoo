import mongoose from 'mongoose';

const broadcastRecipientSchema = new mongoose.Schema(
    {
        broadcastId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodEmergencyBroadcast',
            required: true
        },
        riderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodDeliveryPartner',
            required: true,
            index: true
        },
        status: {
            type: String,
            enum: ['NOTIFIED', 'VIEWED', 'ACCEPTED', 'REJECTED', 'TIMEOUT'],
            default: 'NOTIFIED',
            index: true
        },
        viewedAt: {
            type: Date,
            default: null
        },
        acceptedAt: {
            type: Date,
            default: null
        }
    },
    {
        collection: 'food_broadcast_recipients',
        timestamps: true
    }
);

// Compound unique index for broadcast + rider
broadcastRecipientSchema.index({ broadcastId: 1, riderId: 1 }, { unique: true });

export const FoodBroadcastRecipient = mongoose.model('FoodBroadcastRecipient', broadcastRecipientSchema);
