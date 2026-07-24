import mongoose from 'mongoose';
import { shiftRepository } from '../repositories/shift.repository.js';
import { FoodOrder } from '../../orders/models/order.model.js';
import { FoodTransaction } from '../../orders/models/foodTransaction.model.js';

export const shiftService = {

    createShift: async (data, adminId) => {
        return shiftRepository.createShift({ ...data, createdBy: adminId });
    },

    getAvailableShifts: async (city) => {
        return shiftRepository.getShifts({ 
            city, 
            isActive: true, 
            endTime: { $gt: new Date() } 
        }, { sort: { startTime: 1 } });
    },

    bookShift: async (riderId, shiftId) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const shift = await shiftRepository.getShiftById(shiftId);
            if (!shift) throw new Error("Shift not found");
            if (!shift.isActive) throw new Error("Shift is not active");
            if (new Date() > shift.endTime) throw new Error("Shift has already ended");

            // Check capacity
            const currentBookings = await shiftRepository.getBookingCountForShift(shiftId);
            if (currentBookings >= shift.maxPartners) {
                throw new Error("Shift is fully booked");
            }

            // Create booking
            const booking = await shiftRepository.createBooking([{
                shiftId,
                riderId,
                status: 'BOOKED',
                snapshotRules: {
                    guaranteeAmount: shift.guaranteeAmount,
                    minimumOrders: shift.minimumOrders,
                    minimumLoginPercentage: shift.minimumLoginPercentage
                }
            }], { session });

            await session.commitTransaction();
            return booking[0];
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    },

    cancelBooking: async (riderId, shiftId) => {
        return shiftRepository.updateBookingStatus(riderId, shiftId, 'CANCELLED');
    },

    // --- ATTENDANCE ---

    recordHeartbeat: async (riderId, shiftId, gpsCoordinates) => {
        const attendance = await shiftRepository.getAttendanceByRiderAndShift(riderId, shiftId);
        const now = new Date();
        
        let updateData = { lastHeartbeatAt: now };

        if (!attendance) {
            // First heartbeat = login
            updateData.loginTime = now;
            updateData.onlineMinutes = 0;
            updateData.loginPercentage = 0;
        } else {
            const timeDiffMs = now - attendance.lastHeartbeatAt;
            const timeDiffMins = timeDiffMs / (1000 * 60);

            // If gap is more than 3 minutes, treat it as offline time
            if (timeDiffMins > 3) {
                updateData.offlineMinutes = attendance.offlineMinutes + timeDiffMins;
            } else {
                updateData.onlineMinutes = attendance.onlineMinutes + timeDiffMins;
            }

            // Recalculate percentage based on shift duration
            const shift = await shiftRepository.getShiftById(shiftId);
            if (shift) {
                const shiftDurationMins = (shift.endTime - shift.startTime) / (1000 * 60);
                updateData.loginPercentage = Math.min(100, Math.round((updateData.onlineMinutes / shiftDurationMins) * 100));
            }

            // Basic GPS anomaly check (mock logic for missing GPS)
            if (!gpsCoordinates) {
                updateData.$push = {
                    gpsAnomalyFlags: {
                        flagType: 'NO_GPS',
                        timestamp: now,
                        details: 'Heartbeat received without GPS coordinates'
                    }
                };
            }
        }

        return shiftRepository.createOrUpdateAttendance(riderId, shiftId, updateData);
    },

    logoutAttendance: async (riderId, shiftId) => {
        return shiftRepository.createOrUpdateAttendance(riderId, shiftId, { logoutTime: new Date() });
    },

    // --- SETTLEMENT ENGINE ---

    processShiftSettlements: async (shiftId) => {
        const shift = await shiftRepository.getShiftById(shiftId);
        if (!shift) throw new Error("Shift not found");

        const bookings = await shiftRepository.getBookingsForSettlement(shiftId);
        let results = [];

        for (const booking of bookings) {
            const session = await mongoose.startSession();
            session.startTransaction();
            try {
                // Check if already settled
                const existingSettlement = await mongoose.model('FoodShiftSettlement').findOne({ shiftId, riderId: booking.riderId });
                if (existingSettlement) {
                    await session.abortTransaction();
                    continue; // Skip, already settled
                }

                const attendance = await shiftRepository.getAttendanceByRiderAndShift(booking.riderId, shiftId);
                const attendancePercentage = attendance ? attendance.loginPercentage : 0;

                // Query Orders in shift window
                const completedOrdersCount = await FoodOrder.countDocuments({
                    deliveryPartnerId: booking.riderId,
                    orderStatus: 'Delivered',
                    deliveredAt: { $gte: shift.startTime, $lte: shift.endTime }
                });

                // Query Earnings in shift window
                const transactions = await FoodTransaction.find({
                    deliveryPartnerId: booking.riderId,
                    createdAt: { $gte: shift.startTime, $lte: shift.endTime },
                    status: { $in: ['authorized', 'captured', 'settled'] }
                });
                
                const actualEarnings = transactions.reduce((sum, tx) => sum + (tx.amounts?.riderShare || 0), 0);
                
                // --- Eligibility Rules ---
                const rules = booking.snapshotRules;
                let isEligible = true;
                let rejectionReason = null;
                let guaranteeBonus = 0;

                if (attendancePercentage < rules.minimumLoginPercentage) {
                    isEligible = false;
                    rejectionReason = 'REJECTED_ATTENDANCE';
                } else if (completedOrdersCount < rules.minimumOrders) {
                    isEligible = false;
                    rejectionReason = 'REJECTED_ORDERS';
                } else if (attendance?.gpsAnomalyFlags?.length > 5) { // Basic fraud threshold
                    isEligible = false;
                    rejectionReason = 'REJECTED_FRAUD';
                }

                if (isEligible && shift.bonusEnabled && actualEarnings < rules.guaranteeAmount) {
                    guaranteeBonus = rules.guaranteeAmount - actualEarnings;
                }

                // Execute Atomic Settlement
                const settlementRecord = await shiftRepository.executeSettlementTransaction(session, {
                    settlementData: {
                        shiftId: shift._id,
                        riderId: booking.riderId,
                        attendancePercentage,
                        completedOrders: completedOrdersCount,
                        actualEarnings,
                        guaranteeAmount: rules.guaranteeAmount,
                        guaranteeBonus,
                        eligibilityStatus: isEligible ? 'ELIGIBLE' : rejectionReason,
                        rejectionReason: isEligible ? null : `Failed requirement`,
                        policyVersion: rules
                    },
                    bonusAmount: guaranteeBonus,
                    reference: `Guarantee Bonus for Shift: ${shift.name}`
                });

                // Mark booking completed
                booking.status = 'COMPLETED';
                await booking.save({ session });

                await session.commitTransaction();
                results.push(settlementRecord);

                // TODO: Send push notification to rider (NotificationService)

            } catch (error) {
                await session.abortTransaction();
                console.error(`Error settling rider ${booking.riderId} for shift ${shiftId}:`, error);
            } finally {
                session.endSession();
            }
        }
        return results;
    }
};
