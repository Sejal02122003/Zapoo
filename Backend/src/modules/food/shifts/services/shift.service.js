import mongoose from 'mongoose';
import { shiftRepository } from '../repositories/shift.repository.js';
import { FoodShift } from '../models/shift.model.js';
import { FoodShiftBooking } from '../models/shiftBooking.model.js';
import { FoodShiftAttendance } from '../models/attendance.model.js';
import { FoodShiftPayout } from '../models/payout.model.js';
import { FoodOrder } from '../../orders/models/order.model.js';
import { FoodTransaction } from '../../orders/models/foodTransaction.model.js';
import { FoodDeliveryPartner } from '../../delivery/models/deliveryPartner.model.js';
import { FoodUser } from '../../../../core/users/user.model.js';
import { FoodAdmin } from '../../../../core/admin/admin.model.js';
import { FoodZone } from '../../admin/models/zone.model.js';
import { decrypt } from '../../../../utils/encryption.js';

export const shiftService = {
    // --- TEMPLATES ---
    createTemplate: async (data, adminId) => {
        return shiftRepository.createTemplate({ ...data, createdBy: adminId });
    },

    getTemplates: async (filterOptions = {}) => {
        let filter = {};
        if (typeof filterOptions === 'string') {
            if (filterOptions && filterOptions !== 'All') filter = { city: filterOptions };
        } else if (filterOptions && typeof filterOptions === 'object') {
            const { city, zoneId } = filterOptions;
            if (zoneId && zoneId !== 'All') {
                const zoneObjId = mongoose.Types.ObjectId.isValid(zoneId) ? new mongoose.Types.ObjectId(zoneId) : zoneId;
                filter = {
                    $or: [
                        { zoneId: zoneId },
                        { zoneId: zoneObjId },
                        { zoneId: null },
                        { zoneId: { $exists: false } },
                        { city: 'All' }
                    ]
                };
            } else if (city && city !== 'All') {
                filter = { city };
            }
        }
        return shiftRepository.getTemplates(filter);
    },

    getTemplateById: async (id) => {
        return shiftRepository.getTemplateById(id);
    },

    updateTemplate: async (id, data) => {
        return shiftRepository.updateTemplate(id, data);
    },

    deleteTemplate: async (id) => {
        return shiftRepository.deleteTemplate(id);
    },

    generateShiftsFromTemplates: async (targetDateInput = new Date(), adminId = null, targetZoneId = null) => {
        const targetDate = new Date(targetDateInput);
        const year = targetDate.getFullYear();
        const month = String(targetDate.getMonth() + 1).padStart(2, '0');
        const day = String(targetDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        let templateFilter = { isActive: true };
        if (targetZoneId && targetZoneId !== 'All') {
            const zoneObjId = mongoose.Types.ObjectId.isValid(targetZoneId) ? new mongoose.Types.ObjectId(targetZoneId) : targetZoneId;
            templateFilter = {
                $or: [
                    { zoneId: targetZoneId },
                    { zoneId: zoneObjId },
                    { zoneId: null },
                    { zoneId: { $exists: false } },
                    { city: 'All' }
                ],
                isActive: true
            };
        }

        let activeTemplates = await shiftRepository.getTemplates(templateFilter);

        // Auto-seed standard 11AM-11PM template if no template exists in database
        if (activeTemplates.length === 0) {
            const defaultTemplate = await shiftRepository.createTemplate({
                name: 'Standard 11AM-11PM Daily Template',
                city: 'All',
                isActive: true,
                createdBy: adminId,
                slots: [
                    { slotOrder: 1, startTime: '11:00', endTime: '13:00', guaranteeAmount: 350, minimumOrders: 6, minimumLoginPercentage: 80, maxPartners: 50, isNightSlot: false },
                    { slotOrder: 2, startTime: '13:00', endTime: '15:00', guaranteeAmount: 350, minimumOrders: 6, minimumLoginPercentage: 80, maxPartners: 50, isNightSlot: false },
                    { slotOrder: 3, startTime: '15:00', endTime: '18:00', guaranteeAmount: 450, minimumOrders: 8, minimumLoginPercentage: 80, maxPartners: 50, isNightSlot: false },
                    { slotOrder: 4, startTime: '18:00', endTime: '21:00', guaranteeAmount: 500, minimumOrders: 10, minimumLoginPercentage: 85, maxPartners: 50, isNightSlot: false },
                    { slotOrder: 5, startTime: '21:00', endTime: '23:00', guaranteeAmount: 650, minimumOrders: 7, minimumLoginPercentage: 85, maxPartners: 50, isNightSlot: true }
                ]
            });
            activeTemplates = [defaultTemplate];
        }

        // Fetch Zone Name if targetZoneId is passed
        let targetZoneName = '';
        if (targetZoneId && targetZoneId !== 'All') {
            const foundZone = await FoodZone.findById(targetZoneId).lean();
            if (foundZone) {
                targetZoneName = foundZone.name || foundZone.zoneName || foundZone.serviceLocation || '';
            }
        }

        const createdShifts = [];

        for (const template of activeTemplates) {
            const effectiveZoneId = (targetZoneId && targetZoneId !== 'All') ? targetZoneId : (template.zoneId || null);
            const effectiveZoneName = targetZoneName || template.zoneName || template.city || 'All';

            for (const slot of template.slots || []) {
                const shiftStart = new Date(`${dateStr}T${slot.startTime}:00`);
                const shiftEnd = new Date(`${dateStr}T${slot.endTime}:00`);
                
                // If shiftEnd <= shiftStart, it spans midnight (e.g., 23:00 to 01:00)
                if (shiftEnd <= shiftStart) {
                    shiftEnd.setDate(shiftEnd.getDate() + 1);
                }

                // Booking opens 1 day prior at 00:00:00 (midnight)
                const bookingOpensAt = new Date(shiftStart);
                bookingOpensAt.setDate(bookingOpensAt.getDate() - 1);
                bookingOpensAt.setHours(0, 0, 0, 0);

                // Prevent duplicate generation for same template + slotOrder + startTime + zoneId
                const existing = await FoodShift.findOne({
                    $or: [
                        { templateId: template._id, slotOrder: slot.slotOrder, startTime: shiftStart, zoneId: effectiveZoneId },
                        { name: `${template.name} - Slot ${slot.slotOrder} (${slot.startTime} - ${slot.endTime})`, startTime: shiftStart, zoneId: effectiveZoneId }
                    ]
                });

                if (!existing) {
                    const shift = await shiftRepository.createShift({
                        name: `${template.name} - Slot ${slot.slotOrder} (${slot.startTime} - ${slot.endTime})`,
                        startTime: shiftStart,
                        endTime: shiftEnd,
                        guaranteeAmount: slot.guaranteeAmount,
                        minimumOrders: slot.minimumOrders,
                        minimumLoginPercentage: slot.minimumLoginPercentage,
                        city: effectiveZoneName,
                        zoneId: effectiveZoneId,
                        zoneName: effectiveZoneName,
                        maxPartners: slot.maxPartners,
                        bonusEnabled: slot.guaranteeAmount > 0,
                        isActive: true,
                        bookingOpensAt,
                        templateId: template._id,
                        slotOrder: slot.slotOrder,
                        createdBy: adminId || template.createdBy
                    });
                    createdShifts.push(shift);
                }
            }
        }
        return createdShifts;
    },

    // --- SHIFTS ---
    createShift: async (data, adminId) => {
        const startTime = new Date(data.startTime);
        
        // Compute bookingOpensAt = startTime - 1 day at 00:00:00 if not provided
        let bookingOpensAt = data.bookingOpensAt ? new Date(data.bookingOpensAt) : new Date(startTime);
        if (!data.bookingOpensAt) {
            bookingOpensAt.setDate(bookingOpensAt.getDate() - 1);
            bookingOpensAt.setHours(0, 0, 0, 0);
        }

        return shiftRepository.createShift({
            ...data,
            bookingOpensAt,
            createdBy: adminId
        });
    },

    updateShift: async (id, data) => {
        const updatePayload = { ...data };
        if (data.startTime) {
            updatePayload.startTime = new Date(data.startTime);
            if (!data.bookingOpensAt) {
                const bOpens = new Date(updatePayload.startTime);
                bOpens.setDate(bOpens.getDate() - 1);
                bOpens.setHours(0, 0, 0, 0);
                updatePayload.bookingOpensAt = bOpens;
            }
        }
        if (data.endTime) {
            updatePayload.endTime = new Date(data.endTime);
        }
        if (data.guaranteeAmount !== undefined) {
            updatePayload.bonusEnabled = Number(data.guaranteeAmount) > 0;
        }
        return shiftRepository.updateShift(id, updatePayload);
    },

    deleteShift: async (id) => {
        return shiftRepository.deleteShift(id);
    },

    getShiftsAdmin: async (filterOptions = {}) => {
        let filter = {};
        if (typeof filterOptions === 'string') {
            if (filterOptions && filterOptions !== 'All') filter = { city: filterOptions };
        } else if (filterOptions && typeof filterOptions === 'object') {
            const { city, zoneId } = filterOptions;
            if (zoneId && zoneId !== 'All') {
                const zoneObjId = mongoose.Types.ObjectId.isValid(zoneId) ? new mongoose.Types.ObjectId(zoneId) : zoneId;
                filter = {
                    $or: [
                        { zoneId: zoneId },
                        { zoneId: zoneObjId },
                        { zoneId: null },
                        { zoneId: { $exists: false } }
                    ]
                };
            } else if (city && city !== 'All') {
                filter = { city };
            }
        }

        const shifts = await shiftRepository.getShifts(filter, { sort: { startTime: -1 } });
        
        return Promise.all(shifts.map(async (shift) => {
            const shiftObj = shift.toObject();
            const bookedCount = await shiftRepository.getBookingCountForShift(shift._id);
            return {
                ...shiftObj,
                bookedCount
            };
        }));
    },

    getAvailableShifts: async (filterOptions = {}) => {
        const now = new Date();

        let targetCity = null;
        let targetZoneId = null;

        if (typeof filterOptions === 'string') {
            targetCity = filterOptions;
        } else if (filterOptions && typeof filterOptions === 'object') {
            targetCity = filterOptions.city;
            targetZoneId = filterOptions.zoneId;
        }

        // Check if we have active future shifts
        const countFuture = await FoodShift.countDocuments({
            isActive: true,
            endTime: { $gt: now }
        });

        // If zero upcoming shifts, auto-generate today and tomorrow from templates so delivery partner always has shifts
        if (countFuture === 0) {
            try {
                await shiftService.generateShiftsFromTemplates(new Date(), null, targetZoneId);
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                await shiftService.generateShiftsFromTemplates(tomorrow, null, targetZoneId);
            } catch (genErr) {
                console.warn('[Shifts] Auto-generate on available request caught error:', genErr.message);
            }
        }

        const filter = {
            isActive: true,
            endTime: { $gt: now }
        };

        if (targetZoneId && targetZoneId !== 'All') {
            const zoneObjId = mongoose.Types.ObjectId.isValid(targetZoneId) ? new mongoose.Types.ObjectId(targetZoneId) : targetZoneId;
            filter.$or = [
                { zoneId: targetZoneId },
                { zoneId: zoneObjId },
                { zoneId: null },
                { zoneId: { $exists: false } },
                { city: 'All' }
            ];
        } else if (targetCity && targetCity !== 'All') {
            filter.$or = [
                { city: targetCity },
                { city: 'All' },
                { city: { $exists: false } }
            ];
        }

        const shifts = await shiftRepository.getShifts(filter, { sort: { startTime: 1 } });
        
        // Enrich shifts with booking status flags for riders
        return Promise.all(shifts.map(async (shift) => {
            const shiftObj = shift.toObject ? shift.toObject() : shift;
            const bookedCount = await shiftRepository.getBookingCountForShift(shift._id);
            const opensAt = shift.bookingOpensAt ? new Date(shift.bookingOpensAt) : new Date(shift.startTime);
            
            return {
                ...shiftObj,
                bookedCount,
                bookingOpensAt: opensAt,
                isOpenForBooking: now >= opensAt,
                isFullyBooked: bookedCount >= shift.maxPartners
            };
        }));
    },

    bookShift: async (riderId, shiftId) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const shift = await shiftRepository.getShiftById(shiftId);
            if (!shift) throw new Error("Shift not found");
            if (!shift.isActive) throw new Error("Shift is not active");

            const now = new Date();
            if (now > shift.endTime) throw new Error("Shift has already ended");

            // Server-side booking window enforcement (T-1 24h prior)
            const opensAt = shift.bookingOpensAt ? new Date(shift.bookingOpensAt) : new Date(shift.startTime);
            if (now < opensAt) {
                throw new Error(`Booking window for this shift opens on ${opensAt.toLocaleString()}`);
            }

            // Check if rider already booked
            const existingBooking = await shiftRepository.getBookingByRiderAndShift(riderId, shiftId);
            if (existingBooking && ['BOOKED', 'COMPLETED'].includes(existingBooking.status)) {
                throw new Error("You have already booked this shift");
            }

            // Check capacity
            const currentBookings = await shiftRepository.getBookingCountForShift(shiftId);
            if (currentBookings >= shift.maxPartners) {
                throw new Error("Shift is fully booked");
            }

            // Snapshot rider name and phone at booking time
            let riderName = 'Delivery Partner';
            let riderPhone = '';
            const dp = await FoodDeliveryPartner.findById(riderId) || await FoodDeliveryPartner.findOne({ userId: riderId });
            const u = await FoodUser.findById(riderId) || await FoodAdmin.findById(riderId);
            if (dp && dp.name) {
                riderName = dp.name;
                riderPhone = dp.phone || u?.phone || riderPhone;
            } else if (u && u.name) {
                riderName = u.name;
                riderPhone = u.phone || riderPhone;
            }

            // Create booking
            const booking = await shiftRepository.createBooking([{
                shiftId,
                riderId,
                riderName,
                riderPhone,
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

    getRiderBookedShifts: async (riderId) => {
        let partner = null;
        if (mongoose.Types.ObjectId.isValid(riderId)) {
            partner = await FoodDeliveryPartner.findById(riderId);
        }
        if (!partner) {
            partner = await FoodDeliveryPartner.findOne({ userId: String(riderId) });
        }

        const riderIds = [riderId];
        if (partner && partner._id) riderIds.push(partner._id);
        if (partner && partner.userId) riderIds.push(partner.userId);

        const bookings = await shiftRepository.getBookingsByRider(riderIds);
        const now = new Date();

        return bookings.map((b) => {
            const bookingObj = b.toObject();
            const shift = bookingObj.shiftId || {};
            const endTime = shift.endTime ? new Date(shift.endTime) : null;
            const startTime = shift.startTime ? new Date(shift.startTime) : null;

            return {
                ...bookingObj,
                canCancel: bookingObj.status === 'BOOKED' && startTime && now < startTime,
                isPast: endTime ? now > endTime : false,
            };
        });
    },

    // --- ATTENDANCE ---

    recordHeartbeat: async (riderId, shiftId, gpsCoordinates) => {
        const attendance = await shiftRepository.getAttendanceByRiderAndShift(riderId, shiftId);
        const now = new Date();
        
        let updateData = { lastHeartbeatAt: now };

        if (!attendance) {
            updateData.loginTime = now;
            updateData.onlineMinutes = 0;
            updateData.loginPercentage = 0;
        } else {
            const timeDiffMs = now - attendance.lastHeartbeatAt;
            const timeDiffMins = timeDiffMs / (1000 * 60);

            if (timeDiffMins > 3) {
                updateData.offlineMinutes = attendance.offlineMinutes + timeDiffMins;
            } else {
                updateData.onlineMinutes = attendance.onlineMinutes + timeDiffMins;
            }

            const shift = await shiftRepository.getShiftById(shiftId);
            if (shift) {
                const shiftDurationMins = (shift.endTime - shift.startTime) / (1000 * 60);
                updateData.loginPercentage = Math.min(100, Math.round((updateData.onlineMinutes / shiftDurationMins) * 100));
            }

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

    // --- SETTLEMENT ENGINE & PAYOUT TRIGGER ---

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
                    continue; // Already settled
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
                } else if (attendance?.gpsAnomalyFlags?.length > 5) {
                    isEligible = false;
                    rejectionReason = 'REJECTED_FRAUD';
                }

                if (isEligible && shift.bonusEnabled && actualEarnings < rules.guaranteeAmount) {
                    guaranteeBonus = rules.guaranteeAmount - actualEarnings;
                }

                const totalPayoutOwed = actualEarnings + guaranteeBonus;

                // Fetch rider profile to snapshot bank details
                const rider = await FoodDeliveryPartner.findById(booking.riderId);
                
                // Decrypt account number if encrypted
                const rawAccNum = rider?.bankAccountNumber || '';
                const decryptedAccNum = decrypt(rawAccNum);

                const hasBankDetails = Boolean((decryptedAccNum || rider?.upiId || rider?.upiQrCode) && rider?.bankIfscCode);

                const payoutSnapshot = {
                    accountHolderName: rider?.bankAccountHolderName || rider?.name || 'N/A',
                    accountNumber: decryptedAccNum || 'N/A',
                    ifscCode: rider?.bankIfscCode || 'N/A',
                    bankName: rider?.bankName || 'N/A',
                    upiId: rider?.upiId || 'N/A',
                    upiQrCode: rider?.upiQrCode || ''
                };

                const payoutData = {
                    riderId: booking.riderId,
                    shiftId: shift._id,
                    amount: totalPayoutOwed,
                    status: hasBankDetails ? 'PENDING' : 'ON_HOLD',
                    holdReason: hasBankDetails ? null : 'Bank details missing',
                    bankDetailsSnapshot: payoutSnapshot
                };

                // Execute Atomic Settlement + Payout creation
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
                    reference: `Guarantee Bonus for Shift: ${shift.name}`,
                    payoutData
                });

                // Mark booking completed
                booking.status = 'COMPLETED';
                await booking.save({ session });

                await session.commitTransaction();
                results.push(settlementRecord);

            } catch (error) {
                await session.abortTransaction();
                console.error(`Error settling rider ${booking.riderId} for shift ${shiftId}:`, error);
            } finally {
                session.endSession();
            }
        }
        return results;
    },

    // --- SHIFT RIDERS & DIRECT PAY APIs FOR ADMIN SHIFT CARD ---
    getShiftRidersDetail: async (shiftId) => {
        const shift = await FoodShift.findById(shiftId).lean();
        if (!shift) throw new Error('Shift not found');

        const bookings = await FoodShiftBooking.find({ 
            $or: [{ shiftId }, { shiftId: String(shiftId) }], 
            status: { $in: ['BOOKED', 'COMPLETED'] } 
        }).lean();

        const ridersDetail = [];
        for (const booking of bookings) {
            let partner = null;
            let userDoc = null;

            if (booking.riderId) {
                userDoc = await FoodUser.findById(booking.riderId).lean();
                if (!userDoc) {
                    userDoc = await FoodUser.findOne({ _id: String(booking.riderId) }).lean();
                }

                partner = await FoodDeliveryPartner.findById(booking.riderId).lean();
                if (!partner) {
                    partner = await FoodDeliveryPartner.findOne({ 
                        $or: [
                            { userId: booking.riderId }, 
                            { userId: String(booking.riderId) },
                            ...(userDoc?.phone ? [{ phone: userDoc.phone }] : [])
                        ] 
                    }).lean();
                }

                // If not found in FoodUser or FoodDeliveryPartner, search FoodAdmin (for test bookings)
                if (!userDoc && !partner) {
                    const adminDoc = await FoodAdmin.findById(booking.riderId).lean() || await FoodAdmin.findOne({ _id: String(booking.riderId) }).lean();
                    if (adminDoc) {
                        userDoc = adminDoc;
                    }
                }
            }

            const riderName = partner?.name || userDoc?.name || booking.riderName || `Delivery Partner (${String(booking.riderId).slice(-6)})`;
            const riderPhone = partner?.phone || userDoc?.phone || booking.riderPhone || 'N/A';
            const riderEmail = partner?.email || userDoc?.email || 'N/A';
            const deliveryId = partner?.deliveryId || (partner?._id ? `DP-${String(partner._id).slice(-8).toUpperCase()}` : `DP-${String(booking.riderId).slice(-8).toUpperCase()}`);
            const isOnline = !!partner?.isOnline || !!userDoc?.isOnline;

            const bank = partner?.documents?.bankDetails || {};
            let decryptedAccount = bank.accountNumber || '';
            try {
                if (decryptedAccount && decryptedAccount.includes(':')) {
                    decryptedAccount = decrypt(decryptedAccount);
                }
            } catch (e) {}

            const attendance = await FoodShiftAttendance.findOne({ 
                $or: [
                    { riderId: booking.riderId, shiftId },
                    { riderId: String(booking.riderId), shiftId: String(shiftId) }
                ] 
            }).lean();

            const payout = await FoodShiftPayout.findOne({ 
                $or: [
                    { shiftId, riderId: booking.riderId },
                    { shiftId: String(shiftId), riderId: String(booking.riderId) }
                ] 
            }).lean();

            const isActiveInShift = isOnline && (attendance?.status === 'ACTIVE' || !attendance?.logoutTime);
            
            ridersDetail.push({
                riderId: booking.riderId,
                name: riderName,
                phone: riderPhone,
                deliveryId: deliveryId,
                email: riderEmail,
                isOnline: isOnline,
                shiftActiveStatus: isActiveInShift ? 'ACTIVE' : 'NOT_ACTIVE',
                attendance: {
                    status: attendance?.status || 'NOT_LOGGED_IN',
                    totalLoginMinutes: attendance?.totalLoginMinutes || 0,
                    loginPercentage: attendance?.loginPercentage || 0,
                    ordersCompleted: attendance?.completedOrdersCount || 0
                },
                bankDetails: {
                    accountHolderName: bank.accountHolderName || riderName,
                    accountNumber: decryptedAccount,
                    ifscCode: bank.ifscCode || '',
                    bankName: bank.bankName || '',
                    upiId: bank.upiId || partner?.documents?.upiId || '',
                    upiQrCode: partner?.documents?.upiQrCode?.url || partner?.documents?.upiQrCode || ''
                },
                payout: payout ? {
                    payoutId: payout._id,
                    amount: payout.payoutAmount,
                    status: payout.status,
                    utr: payout.utrReference || '',
                    paidAt: payout.paidAt || null,
                    notes: payout.notes || ''
                } : {
                    payoutId: null,
                    amount: shift.guaranteeAmount || 0,
                    status: 'PENDING',
                    utr: '',
                    paidAt: null
                }
            });
        }

        return {
            shift,
            totalBooked: bookings.length,
            riders: ridersDetail
        };
    },

    payRiderForShift: async (shiftId, riderId, { utrReference, notes, amount }, adminId) => {
        const shift = await FoodShift.findById(shiftId);
        if (!shift) throw new Error('Shift not found');

        const partner = await FoodDeliveryPartner.findById(riderId);
        if (!partner) throw new Error('Delivery partner not found');

        let payout = await FoodShiftPayout.findOne({ shiftId, riderId });

        const bank = partner.documents?.bankDetails || {};
        let decryptedAccount = bank.accountNumber || '';
        try {
            if (decryptedAccount && decryptedAccount.includes(':')) {
                decryptedAccount = decrypt(decryptedAccount);
            }
        } catch (e) {}

        const payoutAmount = amount || shift.guaranteeAmount || 0;

        if (!payout) {
            payout = await FoodShiftPayout.create({
                shiftId,
                riderId,
                riderName: partner.name,
                riderPhone: partner.phone,
                bankDetailsSnapshot: {
                    accountHolderName: bank.accountHolderName || partner.name,
                    accountNumber: decryptedAccount,
                    ifscCode: bank.ifscCode || '',
                    bankName: bank.bankName || '',
                    upiId: bank.upiId || ''
                },
                payoutAmount,
                status: 'PAID',
                utrReference: utrReference || 'DIRECT_PAY',
                notes: notes || 'Direct Admin Payment from Shift Card Modal',
                paidAt: new Date(),
                processedBy: adminId
            });
        } else {
            payout.status = 'PAID';
            payout.utrReference = utrReference || payout.utrReference || 'DIRECT_PAY';
            payout.notes = notes || payout.notes;
            payout.paidAt = new Date();
            payout.processedBy = adminId;
            await payout.save();
        }

        return payout;
    },

    syncPendingPayoutsForBookings: async () => {
        const bookings = await FoodShiftBooking.find({ status: { $in: ['BOOKED', 'COMPLETED'] } }).lean();
        for (const booking of bookings) {
            const shift = await FoodShift.findById(booking.shiftId).lean();
            if (!shift) continue;

            const existingPayout = await FoodShiftPayout.findOne({ 
                $or: [
                    { shiftId: booking.shiftId, riderId: booking.riderId },
                    { shiftId: String(booking.shiftId), riderId: String(booking.riderId) }
                ] 
            }).lean();

            if (!existingPayout) {
                let partner = await FoodDeliveryPartner.findById(booking.riderId).lean() || await FoodDeliveryPartner.findOne({ userId: booking.riderId }).lean();
                let userDoc = await FoodUser.findById(booking.riderId).lean() || await FoodAdmin.findById(booking.riderId).lean();

                const bank = partner?.documents?.bankDetails || {};
                let decryptedAccount = bank.accountNumber || '';
                try {
                    if (decryptedAccount && decryptedAccount.includes(':')) {
                        decryptedAccount = decrypt(decryptedAccount);
                    }
                } catch (e) {}

                const riderName = partner?.name || userDoc?.name || booking.riderName || 'Delivery Partner';
                const riderPhone = partner?.phone || userDoc?.phone || booking.riderPhone || 'N/A';

                await FoodShiftPayout.create({
                    shiftId: booking.shiftId,
                    riderId: booking.riderId,
                    amount: shift.guaranteeAmount || 350,
                    status: 'PENDING',
                    bankDetailsSnapshot: {
                        accountHolderName: bank.accountHolderName || riderName,
                        accountNumber: decryptedAccount || 'N/A',
                        ifscCode: bank.ifscCode || 'N/A',
                        bankName: bank.bankName || 'N/A',
                        upiId: bank.upiId || partner?.documents?.upiId || 'N/A',
                        upiQrCode: partner?.documents?.upiQrCode?.url || partner?.documents?.upiQrCode || ''
                    }
                });
            }
        }
    }
};
