import { FoodShift } from '../models/shift.model.js';
import { FoodShiftTemplate } from '../models/shiftTemplate.model.js';
import { FoodShiftBooking } from '../models/shiftBooking.model.js';
import { FoodShiftAttendance } from '../models/attendance.model.js';
import { FoodShiftSettlement } from '../models/shiftSettlement.model.js';
import { FoodShiftPayout } from '../models/payout.model.js';
import { DeliveryBonusTransaction } from '../../admin/models/deliveryBonusTransaction.model.js';
import { FoodDeliveryWallet } from '../../delivery/models/deliveryWallet.model.js';

export const shiftRepository = {
    // --- Templates ---
    createTemplate: async (data) => FoodShiftTemplate.create(data),
    getTemplateById: async (id) => FoodShiftTemplate.findById(id),
    updateTemplate: async (id, data) => FoodShiftTemplate.findByIdAndUpdate(id, data, { new: true }),
    getTemplates: async (filter = {}) => FoodShiftTemplate.find(filter).sort({ createdAt: -1 }),
    deleteTemplate: async (id) => FoodShiftTemplate.findByIdAndDelete(id),

    // --- Shifts ---
    createShift: async (data) => FoodShift.create(data),
    getShiftById: async (id) => FoodShift.findById(id),
    updateShift: async (id, data) => FoodShift.findByIdAndUpdate(id, data, { new: true }),
    getShifts: async (filter, options = {}) => FoodShift.find(filter, null, options),

    // --- Bookings ---
    createBooking: async (data, options = {}) => FoodShiftBooking.create(data, options),
    getBookingByRiderAndShift: async (riderId, shiftId) => FoodShiftBooking.findOne({ riderId, shiftId }),
    getBookingCountForShift: async (shiftId) => FoodShiftBooking.countDocuments({ 
        $or: [{ shiftId }, { shiftId: String(shiftId) }], 
        status: { $in: ['BOOKED', 'COMPLETED'] } 
    }),
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

    // --- Payouts ---
    createPayout: async (data, options = {}) => FoodShiftPayout.create(data, options),
    getPayoutById: async (id) => FoodShiftPayout.findById(id).populate('riderId', 'name phone email').populate('shiftId', 'name startTime endTime'),
    getPayoutBySettlementId: async (shiftSettlementId) => FoodShiftPayout.findOne({ shiftSettlementId }),
    getPayouts: async (filter = {}, options = {}) => 
        FoodShiftPayout.find(filter, null, options)
            .populate('riderId', 'name phone email vehicleType')
            .populate('shiftId', 'name startTime endTime city'),

    // --- Settlement & Wallet (Atomic Bonus Injection & Payout Creation) ---
    executeSettlementTransaction: async (session, { settlementData, bonusAmount, reference, payoutData }) => {
        // 1. Create settlement record
        const settlement = await FoodShiftSettlement.create([settlementData], { session });
        const settlementRecord = settlement[0];

        // 2. Create Payout record snapshotting bank details
        if (payoutData) {
            await FoodShiftPayout.create([{
                ...payoutData,
                shiftSettlementId: settlementRecord._id
            }], { session });
        }

        // 3. If bonus > 0, credit wallet and record bonus transaction
        if (bonusAmount > 0) {
            await DeliveryBonusTransaction.create([{
                deliveryPartnerId: settlementData.riderId,
                transactionId: `SHIFT_BONUS_${settlementData.shiftId}_${settlementData.riderId}`,
                amount: bonusAmount,
                reference: reference
            }], { session });

            await FoodDeliveryWallet.findOneAndUpdate(
                { deliveryPartnerId: settlementData.riderId },
                { 
                    $inc: { 
                        balance: bonusAmount,
                        totalBonus: bonusAmount
                    }
                },
                { session, new: true, upsert: true }
            );
        }
        return settlementRecord;
    }
};
