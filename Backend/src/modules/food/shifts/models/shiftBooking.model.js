import mongoose from 'mongoose';

const shiftBookingSchema = new mongoose.Schema(
    {
        shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodShift', required: true, index: true },
        riderId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodDeliveryPartner', required: true, index: true },
        status: { 
            type: String, 
            enum: ['BOOKED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'], 
            default: 'BOOKED',
            index: true
        },
        bookedAt: { type: Date, default: Date.now },
        cancelledAt: { type: Date },
        
        // Snapshot rules in effect at booking time to prevent retroactive admin changes
        snapshotRules: {
            guaranteeAmount: { type: Number, required: true },
            minimumOrders: { type: Number, required: true },
            minimumLoginPercentage: { type: Number, required: true }
        }
    },
    { collection: 'food_shift_bookings', timestamps: true }
);

// Enforce one active booking per rider per shift
shiftBookingSchema.index({ shiftId: 1, riderId: 1 }, { unique: true });

export const FoodShiftBooking = mongoose.model('FoodShiftBooking', shiftBookingSchema);
