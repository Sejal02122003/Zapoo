import mongoose from 'mongoose';

const incentiveSchema = new mongoose.Schema(
    {
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodOrder',
            required: true,
            index: true
        },
        deliveryPartnerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodDeliveryPartner',
            required: true,
            index: true
        },
        incentiveType: {
            type: String,
            enum: ['MANUAL_ASSIGNMENT', 'SURGE', 'RAIN', 'NIGHT', 'FESTIVAL', 'EMERGENCY_BROADCAST', 'OTHER'],
            required: true,
            default: 'MANUAL_ASSIGNMENT'
        },
        amount: {
            type: Number,
            required: true,
            min: 0
        },
        reason: {
            type: String,
            default: '',
            trim: true
        },
        status: {
            type: String,
            enum: ['PENDING', 'APPROVED', 'CREDITED', 'REJECTED', 'CANCELLED'],
            default: 'PENDING'
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId, // Admin or System ID
            ref: 'Admin', // Assuming Admin model name
            default: null
        }
    },
    {
        collection: 'food_incentives',
        timestamps: true
    }
);

incentiveSchema.index({ orderId: 1, deliveryPartnerId: 1 });
incentiveSchema.index({ status: 1 });

export const FoodIncentive = mongoose.model('FoodIncentive', incentiveSchema);
