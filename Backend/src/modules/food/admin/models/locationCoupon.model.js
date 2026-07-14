import mongoose from 'mongoose';

const locationCouponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
        unique: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FoodRestaurant',
        required: true,
        index: true
    },
    minimumOrderAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    minimumItems: {
        type: Number,
        default: 1,
        min: 1
    },
    discountType: {
        type: String,
        enum: ['flat', 'percentage'],
        required: true
    },
    discountValue: {
        type: Number,
        required: true,
        min: 0
    },
    maximumDiscount: {
        type: Number,
        default: 0,
        min: 0
    },
    maximumDistance: {
        type: Number,
        required: true,
        min: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    startDate: {
        type: Date,
        default: null
    },
    endDate: {
        type: Date,
        default: null
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    }
}, { timestamps: true });

export const LocationCoupon = mongoose.model('LocationCoupon', locationCouponSchema);
