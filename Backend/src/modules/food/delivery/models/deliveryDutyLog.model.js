import mongoose from 'mongoose';

const deliveryDutyLogSchema = new mongoose.Schema(
    {
        riderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodDeliveryPartner',
            required: true,
            index: true
        },
        onlineAt: {
            type: Date,
            required: true,
            index: true
        },
        offlineAt: {
            type: Date,
            default: null
        },
        lastHeartbeatAt: {
            type: Date,
            default: Date.now,
            index: true
        },
        durationMinutes: {
            type: Number,
            default: 0,
            min: 0
        },
        status: {
            type: String,
            enum: ['OPEN', 'CLOSED'],
            default: 'OPEN',
            index: true
        },
        closeReason: {
            type: String,
            enum: ['MANUAL', 'AUTO_TIMEOUT', 'ADMIN'],
            default: null
        }
    },
    { collection: 'food_delivery_duty_logs', timestamps: true }
);

deliveryDutyLogSchema.index({ riderId: 1, onlineAt: -1 });
deliveryDutyLogSchema.index({ riderId: 1, status: 1 });

export const FoodDeliveryDutyLog = mongoose.model('FoodDeliveryDutyLog', deliveryDutyLogSchema);
