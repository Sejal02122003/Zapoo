import { FoodShift } from '../models/shift.model.js';
import { FoodShiftBooking } from '../models/shiftBooking.model.js';
import { FoodShiftAttendance } from '../models/attendance.model.js';
import { FoodShiftSettlement } from '../models/shiftSettlement.model.js';
import { DeliveryBonusTransaction } from '../../admin/models/deliveryBonusTransaction.model.js';
import { FoodDeliveryWallet } from '../../delivery/models/deliveryWallet.model.js';

export const shiftRepository = {
    // --- Shifts ---
    createShift: async (data) => FoodShift.create(data),
    getShiftById: async (id) => FoodShift.findById(id),
    updateShift: async (id, data) => FoodShift.findByIdAndUpdate(id, data, { new: true }),
    getShifts: async (filter, options = {}) => FoodShift.find(filter, null, options),

    // --- Bookings ---
    createBooking: async (data) => FoodShiftBooking.create(data),
    getBookingByRiderAndShift: async (riderId, shiftId) => FoodShiftBooking.findOne({ riderId, shiftId }),
    getBookingCountForShift: async (shiftId) => FoodShiftBooking.countDocuments({ shiftId, status: { $in: ['BOOKED', 'COMPLETED'] } }),
    updateBookingStatus: async (riderId, shiftId, status) => FoodShiftBooking.findOneAndUpdate({ riderId, shiftId }, { status }, { new: true }),
    getBookingsForSettlement: async (shiftId) => FoodShiftBooking.find({ shiftId, status: { $in: ['BOOKED', 'COMPLETED'] } }),

    // --- Attendance ---
    getAttendanceByRiderAndShift: async (riderId, shiftId) => FoodShiftAttendance.findOne({ riderId, shiftId }),
    createOrUpdateAttendance: async (riderId, shiftId, updateData) => 
        FoodShiftAttendance.findOneAndUpdate(
            { riderId, shiftId },
            { $set: updateData },
            { new: true, upsert: true }
        ),

    // --- Settlement & Wallet (Atomic Bonus Injection) ---
    // Execute multiple DB operations atomically for a settlement
    executeSettlementTransaction: async (session, { settlementData, bonusAmount, reference }) => {
        // 1. Create settlement record
        const settlement = await FoodShiftSettlement.create([settlementData], { session });

        // 2. If bonus > 0, credit wallet and record bonus transaction
        if (bonusAmount > 0) {
            // Add bonus transaction
            await DeliveryBonusTransaction.create([{
                deliveryPartnerId: settlementData.riderId,
                transactionId: `SHIFT_BONUS_${settlementData.shiftId}_${settlementData.riderId}`,
                amount: bonusAmount,
                reference: reference
            }], { session });

            // Update rider wallet balance and totalBonus
            await FoodDeliveryWallet.findOneAndUpdate(
                { deliveryPartnerId: settlementData.riderId },
                { 
                    $inc: { 
                        balance: bonusAmount,
                        totalBonus: bonusAmount
                    }
                },
                { session, new: true }
            );
        }
        return settlement[0];
    }
};
