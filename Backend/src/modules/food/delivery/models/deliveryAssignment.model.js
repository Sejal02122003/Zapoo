import mongoose from 'mongoose';

const deliveryAssignmentSchema = new mongoose.Schema(
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
        assignedBy: {
            type: mongoose.Schema.Types.ObjectId, // null if auto, otherwise Admin ID
            ref: 'FoodAdmin', // Assuming Admin collection or whatever it is called
            default: null
        },
        assignmentType: {
            type: String,
            enum: ['AUTO', 'MANUAL'],
            required: true,
            default: 'AUTO'
        },
        manualIncentive: {
            type: Number,
            default: 0,
            min: 0
        },
        reason: {
            type: String,
            default: '',
            trim: true
        },
        status: {
            type: String,
            enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED'],
            default: 'PENDING'
        },
        assignedAt: {
            type: Date,
            default: Date.now
        },
        respondedAt: {
            type: Date,
            default: null
        }
    },
    {
        collection: 'food_delivery_assignments',
        timestamps: true
    }
);

deliveryAssignmentSchema.index({ orderId: 1, deliveryPartnerId: 1 });
deliveryAssignmentSchema.index({ status: 1 });

export const FoodDeliveryAssignment = mongoose.model('FoodDeliveryAssignment', deliveryAssignmentSchema);
