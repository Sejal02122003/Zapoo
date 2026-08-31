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
        let zoneId = data.zoneId;
        if (zoneId === 'All' || zoneId === '' || zoneId === 'null' || !zoneId) {
            zoneId = null;
        } else if (mongoose.Types.ObjectId.isValid(zoneId)) {
            zoneId = new mongoose.Types.ObjectId(zoneId);
        } else {
            zoneId = null;
        }

        let zoneName = data.zoneName;
        if (zoneId && (!zoneName || zoneName === 'All' || zoneName === 'Zone')) {
            const foundZone = await FoodZone.findById(zoneId).lean();
            if (foundZone) {
                zoneName = foundZone.name || foundZone.zoneName || foundZone.serviceLocation || 'Zone';
            }
        }

        return shiftRepository.createTemplate({
            ...data,
            zoneId,
            zoneName: zoneName || data.city || 'All',
            city: data.city || zoneName || 'All',
            createdBy: adminId
        });
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
        const updatePayload = { ...data };
        if (data.zoneId !== undefined) {
            if (data.zoneId === 'All' || data.zoneId === '' || data.zoneId === 'null' || !data.zoneId) {
                updatePayload.zoneId = null;
            } else if (mongoose.Types.ObjectId.isValid(data.zoneId)) {
                updatePayload.zoneId = new mongoose.Types.ObjectId(data.zoneId);
            }
        }
        return shiftRepository.updateTemplate(id, updatePayload);
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

        let zoneObjId = null;
        if (targetZoneId && targetZoneId !== 'All' && mongoose.Types.ObjectId.isValid(targetZoneId)) {
            zoneObjId = new mongoose.Types.ObjectId(targetZoneId);
        }
        
        let templateFilter = { isActive: true };
        if (zoneObjId) {
            templateFilter = {
                $or: [
                    { zoneId: zoneObjId },
                    { zoneId: String(targetZoneId) },
                    { zoneId: null },
                    { zoneId: { $exists: false } },
                    { city: 'All' }
                ],
                isActive: true
            };
        }

        let activeTemplates = await shiftRepository.getTemplates(templateFilter);

        // If no zone-specific templates, fall back to any active template
        if (activeTemplates.length === 0) {
            activeTemplates = await shiftRepository.getTemplates({ isActive: true });
        }

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
        if (zoneObjId) {
            const foundZone = await FoodZone.findById(zoneObjId).lean();
            if (foundZone) {
                targetZoneName = foundZone.name || foundZone.zoneName || foundZone.serviceLocation || '';
            }
        }

        const createdShifts = [];

        for (const template of activeTemplates) {
            const effectiveZoneId = template.zoneId || zoneObjId || null;
            const effectiveZoneName = template.zoneName || targetZoneName || template.city || 'All';

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
        let zoneId = data.zoneId;
        if (zoneId === 'All' || zoneId === '' || zoneId === 'null' || !zoneId) {
            zoneId = null;
        } else if (mongoose.Types.ObjectId.isValid(zoneId)) {
            zoneId = new mongoose.Types.ObjectId(zoneId);
        } else {
            zoneId = null;
        }

        let zoneName = data.zoneName;
        if (zoneId && (!zoneName || zoneName === 'All' || zoneName === 'Zone')) {
            const foundZone = await FoodZone.findById(zoneId).lean();
            if (foundZone) {
                zoneName = foundZone.name || foundZone.zoneName || foundZone.serviceLocation || 'Zone';
            }
        }

        const startTime = new Date(data.startTime);
        
        // Compute bookingOpensAt = startTime - 1 day at 00:00:00 if not provided
        let bookingOpensAt = data.bookingOpensAt ? new Date(data.bookingOpensAt) : new Date(startTime);
        if (!data.bookingOpensAt) {
            bookingOpensAt.setDate(bookingOpensAt.getDate() - 1);
            bookingOpensAt.setHours(0, 0, 0, 0);
        }

        return shiftRepository.createShift({
            ...data,
            zoneId,
            zoneName: zoneName || data.city || 'All',
            city: data.city || zoneName || 'All',
            bonusEnabled: Number(data.guaranteeAmount || 0) > 0,
            bookingOpensAt,
            createdBy: adminId
        });
    },

    updateShift: async (id, data) => {
        const updatePayload = { ...data };
        if (data.zoneId !== undefined) {
            if (data.zoneId === 'All' || data.zoneId === '' || data.zoneId === 'null' || !data.zoneId) {
                updatePayload.zoneId = null;
            } else if (mongoose.Types.ObjectId.isValid(data.zoneId)) {
                updatePayload.zoneId = new mongoose.Types.ObjectId(data.zoneId);
            }
        }
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
            const shiftObj = shift.toObject ? shift.toObject() : shift;
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
        let targetZoneName = null;

        if (typeof filterOptions === 'string') {
            targetCity = filterOptions;
        } else if (filterOptions && typeof filterOptions === 'object') {
            targetCity = filterOptions.city;
            targetZoneId = filterOptions.zoneId;
            targetZoneName = filterOptions.zoneName;
        }

        if (targetZoneId === 'All' || targetZoneId === 'null' || targetZoneId === '' || targetZoneId === undefined) {
            targetZoneId = null;
        }

        let zoneObjId = null;
        if (targetZoneId && mongoose.Types.ObjectId.isValid(targetZoneId)) {
            zoneObjId = new mongoose.Types.ObjectId(targetZoneId);
        }

        // Build zone query conditions
        const zoneQueryConditions = [];
        if (zoneObjId) {
            zoneQueryConditions.push({ zoneId: zoneObjId }, { zoneId: String(targetZoneId) });
        }
        if (targetZoneName && targetZoneName !== 'All') {
            zoneQueryConditions.push({ zoneName: new RegExp(`^${targetZoneName}$`, 'i') });
        }
        if (targetCity && targetCity !== 'All') {
            zoneQueryConditions.push({ city: new RegExp(`^${targetCity}$`, 'i') });
        }
        // Universal shifts for all zones
        zoneQueryConditions.push(
            { zoneId: null },
            { zoneId: { $exists: false } },
            { city: 'All' },
            { zoneName: 'All' }
        );

        // 1. Check if upcoming shifts exist specifically for this rider's zone or universally
        const existingForZone = await FoodShift.countDocuments({
            isActive: true,
            endTime: { $gt: now },
            $or: zoneQueryConditions
        });

        // 2. If NO upcoming shifts exist for this zone, auto-generate today and tomorrow from templates
        if (existingForZone === 0) {
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
            endTime: { $gt: now },
            $or: zoneQueryConditions
        };

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
                isFullyBooked: bookedCount >= (shift.maxPartners || 50)
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
        try {
            await shiftService.autoSettlePastShifts();
        } catch (e) {}

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

        const results = await Promise.all(bookings.map(async (b) => {
            const bookingObj = b.toObject();
            const shift = bookingObj.shiftId || {};
            const endTime = shift.endTime ? new Date(shift.endTime) : null;
            const startTime = shift.startTime ? new Date(shift.startTime) : null;

            // Fetch payout info for this booking
            const payout = await FoodShiftPayout.findOne({
                shiftId: shift._id,
                riderId: { $in: riderIds }
            }).lean();

            return {
                ...bookingObj,
                canCancel: bookingObj.status === 'BOOKED' && startTime && now < startTime,
                isPast: endTime ? now > endTime : false,
                payout: payout ? {
                    payoutId: payout._id,
                    amount: payout.amount,
                    status: payout.status,
                    referenceNumber: payout.referenceNumber || '',
                    paidAt: payout.paidAt || null
                } : null
            };
        }));

        return results;
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

    autoSettlePastShifts: async () => {
        try {
            const now = new Date();
            const pastShifts = await FoodShift.find({ endTime: { $lte: now } }).select('_id').lean();
            if (!pastShifts || pastShifts.length === 0) return;
            for (const shift of pastShifts) {
                const pendingBookings = await FoodShiftBooking.countDocuments({
                    shiftId: shift._id,
                    status: 'BOOKED'
                });
                if (pendingBookings > 0) {
                    await shiftService.processShiftSettlements(shift._id);
                }
            }
        } catch (e) {
            console.error('Error auto-settling past shifts:', e);
        }
    },

    processShiftSettlements: async (shiftId) => {
        const shift = await shiftRepository.getShiftById(shiftId);
        if (!shift) throw new Error("Shift not found");

        const bookings = await shiftRepository.getBookingsForSettlement(shiftId);
        let results = [];

        for (const booking of bookings) {
            const session = await mongoose.startSession();
            session.startTransaction();
            try {
                let partner = (mongoose.Types.ObjectId.isValid(booking.riderId) ? await FoodDeliveryPartner.findById(booking.riderId) : null) ||
                              await FoodDeliveryPartner.findOne({ userId: String(booking.riderId) });
                let userDoc = (mongoose.Types.ObjectId.isValid(booking.riderId) ? await FoodUser.findById(booking.riderId).lean() : null) ||
                              await FoodAdmin.findById(booking.riderId).lean();

                const resolvedRiderId = partner?._id || booking.riderId;
                const partnerIds = [booking.riderId];
                if (partner?._id) partnerIds.push(partner._id);
                if (partner?.userId) partnerIds.push(partner.userId);

                // Check if already settled
                const existingSettlement = await mongoose.model('FoodShiftSettlement').findOne({ 
                    shiftId, 
                    riderId: { $in: partnerIds } 
                });
                if (existingSettlement) {
                    await session.abortTransaction();
                    continue; // Already settled
                }

                const attendance = await shiftRepository.getAttendanceByRiderAndShift(booking.riderId, shiftId) ||
                                   (partner?._id ? await shiftRepository.getAttendanceByRiderAndShift(partner._id, shiftId) : null);
                const attendancePercentage = attendance ? (attendance.loginPercentage || 0) : 0;

                const completedOrdersCount = await FoodOrder.countDocuments({
                    $and: [
                        {
                            $or: [
                                { 'dispatch.deliveryPartnerId': { $in: partnerIds } },
                                { deliveryPartnerId: { $in: partnerIds } }
                            ]
                        },
                        {
                            $or: [
                                { 'deliveryState.deliveredAt': { $gte: shift.startTime, $lte: shift.endTime } },
                                { deliveredAt: { $gte: shift.startTime, $lte: shift.endTime } },
                                { createdAt: { $gte: shift.startTime, $lte: shift.endTime } },
                                { updatedAt: { $gte: shift.startTime, $lte: shift.endTime } }
                            ]
                        }
                    ],
                    orderStatus: { $in: ['delivered', 'completed', 'Delivered', 'Completed'] }
                });

                // Query Earnings in shift window
                const transactions = await FoodTransaction.find({
                    deliveryPartnerId: { $in: partnerIds },
                    createdAt: { $gte: shift.startTime, $lte: shift.endTime },
                    status: { $in: ['authorized', 'captured', 'settled', 'success'] }
                });
                
                const actualEarnings = transactions.reduce((sum, tx) => sum + (tx.amounts?.riderShare || 0), 0);
                
                // --- Eligibility Rules ---
                const rules = {
                    guaranteeAmount: booking.snapshotRules?.guaranteeAmount ?? shift.guaranteeAmount ?? 0,
                    minimumOrders: booking.snapshotRules?.minimumOrders ?? shift.minimumOrders ?? 0,
                    minimumLoginPercentage: booking.snapshotRules?.minimumLoginPercentage ?? shift.minimumLoginPercentage ?? 0
                };

                let isEligible = true;
                let rejectionReason = null;
                let guaranteeBonus = 0;

                if (rules.minimumLoginPercentage > 0 && attendancePercentage < rules.minimumLoginPercentage) {
                    isEligible = false;
                    rejectionReason = 'REJECTED_ATTENDANCE';
                } else if (rules.minimumOrders > 0 && completedOrdersCount < rules.minimumOrders) {
                    isEligible = false;
                    rejectionReason = 'REJECTED_ORDERS';
                } else if (attendance?.gpsAnomalyFlags?.length > 5) {
                    isEligible = false;
                    rejectionReason = 'REJECTED_FRAUD';
                }

                if (isEligible && (shift.bonusEnabled || rules.guaranteeAmount > 0) && actualEarnings < rules.guaranteeAmount) {
                    guaranteeBonus = rules.guaranteeAmount - actualEarnings;
                }

                const totalPayoutOwed = Math.max(rules.guaranteeAmount > 0 ? (isEligible ? rules.guaranteeAmount : actualEarnings) : 0, actualEarnings + guaranteeBonus);

                // Decrypt account number if encrypted
                const rawAccNum = partner?.bankAccountNumber || partner?.documents?.bankDetails?.accountNumber || '';
                let decryptedAccNum = '';
                try {
                    if (rawAccNum) decryptedAccNum = decrypt(rawAccNum);
                } catch (e) {
                    decryptedAccNum = rawAccNum;
                }

                const hasBankDetails = Boolean((decryptedAccNum || partner?.upiId || partner?.documents?.bankDetails?.upiId) && (partner?.bankIfscCode || partner?.documents?.bankDetails?.ifscCode));

                const payoutSnapshot = {
                    accountHolderName: partner?.bankAccountHolderName || partner?.documents?.bankDetails?.accountHolderName || partner?.name || userDoc?.name || 'N/A',
                    accountNumber: decryptedAccNum || 'N/A',
                    ifscCode: partner?.bankIfscCode || partner?.documents?.bankDetails?.ifscCode || 'N/A',
                    bankName: partner?.bankName || partner?.documents?.bankDetails?.bankName || 'N/A',
                    upiId: partner?.upiId || partner?.documents?.bankDetails?.upiId || 'N/A',
                    upiQrCode: partner?.upiQrCode || partner?.documents?.bankDetails?.upiQrCode?.url || partner?.documents?.bankDetails?.upiQrCode || ''
                };

                const payoutData = {
                    riderId: resolvedRiderId,
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
                        riderId: resolvedRiderId,
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

            const rawAcc = partner?.bankAccountNumber || partner?.documents?.bankDetails?.accountNumber || '';
            let decryptedAccount = '';
            try {
                if (rawAcc) {
                    decryptedAccount = decrypt(rawAcc);
                }
            } catch (e) {
                decryptedAccount = rawAcc;
            }

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
                    accountHolderName: partner?.bankAccountHolderName || partner?.documents?.bankDetails?.accountHolderName || riderName,
                    accountNumber: decryptedAccount || '',
                    ifscCode: partner?.bankIfscCode || partner?.documents?.bankDetails?.ifscCode || '',
                    bankName: partner?.bankName || partner?.documents?.bankDetails?.bankName || '',
                    upiId: partner?.upiId || partner?.documents?.bankDetails?.upiId || partner?.documents?.upiId || '',
                    upiQrCode: partner?.upiQrCode || partner?.documents?.bankDetails?.upiQrCode?.url || partner?.documents?.bankDetails?.upiQrCode || partner?.documents?.upiQrCode || ''
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

        const rawAcc = partner.bankAccountNumber || partner.documents?.bankDetails?.accountNumber || '';
        let decryptedAccount = '';
        try {
            if (rawAcc) {
                decryptedAccount = decrypt(rawAcc);
            }
        } catch (e) {
            decryptedAccount = rawAcc;
        }

        const payoutAmount = amount || shift.guaranteeAmount || 0;

        if (!payout) {
            payout = await FoodShiftPayout.create({
                shiftId,
                riderId,
                riderName: partner.name,
                riderPhone: partner.phone,
                bankDetailsSnapshot: {
                    accountHolderName: partner.bankAccountHolderName || partner.documents?.bankDetails?.accountHolderName || partner.name,
                    accountNumber: decryptedAccount || 'N/A',
                    ifscCode: partner.bankIfscCode || partner.documents?.bankDetails?.ifscCode || 'N/A',
                    bankName: partner.bankName || partner.documents?.bankDetails?.bankName || 'N/A',
                    upiId: partner.upiId || partner.documents?.bankDetails?.upiId || 'N/A'
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
        try {
            await shiftService.autoSettlePastShifts();
        } catch (e) {}

        const bookings = await FoodShiftBooking.find({ status: { $in: ['BOOKED', 'COMPLETED'] } }).lean();
        for (const booking of bookings) {
            const shift = await FoodShift.findById(booking.shiftId).lean();
            if (!shift) continue;

            let partner = (mongoose.Types.ObjectId.isValid(booking.riderId) ? await FoodDeliveryPartner.findById(booking.riderId).lean() : null) || 
                          await FoodDeliveryPartner.findOne({ userId: String(booking.riderId) }).lean();
            let userDoc = (mongoose.Types.ObjectId.isValid(booking.riderId) ? await FoodUser.findById(booking.riderId).lean() : null) || 
                          await FoodAdmin.findById(booking.riderId).lean();

            const partnerIds = [booking.riderId];
            if (partner?._id) partnerIds.push(partner._id);
            if (partner?.userId) partnerIds.push(partner.userId);

            const existingPayout = await FoodShiftPayout.findOne({ 
                shiftId: booking.shiftId,
                riderId: { $in: partnerIds }
            }).lean();

            if (!existingPayout) {
                const rawAcc = partner?.bankAccountNumber || partner?.documents?.bankDetails?.accountNumber || '';
                let decryptedAccount = '';
                try {
                    if (rawAcc) {
                        decryptedAccount = decrypt(rawAcc);
                    }
                } catch (e) {
                    decryptedAccount = rawAcc;
                }

                const riderName = partner?.name || userDoc?.name || booking.riderName || 'Delivery Partner';
                const riderPhone = partner?.phone || userDoc?.phone || booking.riderPhone || 'N/A';
                const guaranteeAmount = booking.snapshotRules?.guaranteeAmount ?? shift.guaranteeAmount ?? 350;

                await FoodShiftPayout.create({
                    shiftId: booking.shiftId,
                    riderId: partner?._id || booking.riderId,
                    amount: guaranteeAmount,
                    status: 'PENDING',
                    bankDetailsSnapshot: {
                        accountHolderName: partner?.bankAccountHolderName || partner?.documents?.bankDetails?.accountHolderName || riderName,
                        accountNumber: decryptedAccount || 'N/A',
                        ifscCode: partner?.bankIfscCode || partner?.documents?.bankDetails?.ifscCode || 'N/A',
                        bankName: partner?.bankName || partner?.documents?.bankDetails?.bankName || 'N/A',
                        upiId: partner?.upiId || partner?.documents?.bankDetails?.upiId || partner?.documents?.upiId || 'N/A',
                        upiQrCode: partner?.upiQrCode || partner?.documents?.bankDetails?.upiQrCode?.url || partner?.documents?.bankDetails?.upiQrCode || partner?.documents?.upiQrCode || ''
                    }
                });
            }
        }
    }
};
