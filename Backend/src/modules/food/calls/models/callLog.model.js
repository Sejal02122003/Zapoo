import mongoose from 'mongoose';

const callLogSchema = new mongoose.Schema(
    {
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodOrder',
            required: true,
            index: true
        },
        callerRole: {
            type: String,
            enum: ['USER', 'DELIVERY_PARTNER', 'RESTAURANT', 'ADMIN'],
            required: true
        },
        callerId: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'callerModel'
        },
        callerModel: {
            type: String,
            enum: ['FoodUser', 'FoodDeliveryPartner', 'FoodRestaurant', 'FoodAdmin']
        },
        callerPhoneMasked: {
            type: String,
            default: ''
        },
        callerPhoneRaw: {
            type: String,
            default: ''
        },
        calleeRole: {
            type: String,
            enum: ['USER', 'DELIVERY_PARTNER', 'RESTAURANT', 'ADMIN'],
            required: true
        },
        calleeId: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'calleeModel'
        },
        calleeModel: {
            type: String,
            enum: ['FoodUser', 'FoodDeliveryPartner', 'FoodRestaurant', 'FoodAdmin']
        },
        calleePhoneMasked: {
            type: String,
            default: ''
        },
        calleePhoneRaw: {
            type: String,
            default: ''
        },
        targetRole: {
            type: String,
            enum: ['rider', 'customer', 'restaurant'],
            required: true
        },
        virtualNumber: {
            type: String,
            required: true
        },
        callSid: {
            type: String,
            index: true
        },
        status: {
            type: String,
            enum: ['initiated', 'ringing', 'in-progress', 'completed', 'busy', 'no-answer', 'failed', 'canceled'],
            default: 'initiated',
            index: true
        },
        duration: {
            type: Number,
            default: 0
        },
        recordingUrl: {
            type: String,
            default: null
        },
        exotelDetails: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    {
        timestamps: true
    }
);

callLogSchema.index({ createdAt: -1 });
callLogSchema.index({ callerPhoneRaw: 1, createdAt: -1 });

export const FoodCallLog = mongoose.model('FoodCallLog', callLogSchema);
