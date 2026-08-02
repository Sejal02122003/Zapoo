import mongoose from 'mongoose';
import { shiftService } from '../services/shift.service.js';
import { shiftRepository } from '../repositories/shift.repository.js';
import { FoodDeliveryPartner } from '../../delivery/models/deliveryPartner.model.js';

export const shiftController = {
    // --- TEMPLATE APIs ---

    createTemplate: async (req, res) => {
        try {
            const adminId = req.user?._id || req.user?.id;
            const template = await shiftService.createTemplate(req.body, adminId);
            res.status(201).json({ success: true, data: template });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getTemplates: async (req, res) => {
        try {
            const { city, zoneId } = req.query;
            const templates = await shiftService.getTemplates({ city, zoneId });
            res.status(200).json({ success: true, data: templates });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getTemplateById: async (req, res) => {
        try {
            const template = await shiftService.getTemplateById(req.params.id);
            if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
            res.status(200).json({ success: true, data: template });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    updateTemplate: async (req, res) => {
        try {
            const template = await shiftService.updateTemplate(req.params.id, req.body);
            res.status(200).json({ success: true, data: template });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    deleteTemplate: async (req, res) => {
        try {
            await shiftService.deleteTemplate(req.params.id);
            res.status(200).json({ success: true, message: 'Template deleted' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    generateShifts: async (req, res) => {
        try {
            const { targetDate, zoneId } = req.body;
            const adminId = req.user?._id || req.user?.id;
            const shifts = await shiftService.generateShiftsFromTemplates(targetDate || new Date(), adminId, zoneId || req.query.zoneId);
            res.status(200).json({ success: true, message: `Generated ${shifts.length} shifts`, data: shifts });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // --- ADMIN SHIFT APIs ---
    
    createShift: async (req, res) => {
        try {
            const adminId = req.user?._id || req.user?.id;
            const shift = await shiftService.createShift(req.body, adminId);
            res.status(201).json({ success: true, data: shift });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getShiftsAdmin: async (req, res) => {
        try {
            const { city, zoneId } = req.query;
            const shifts = await shiftService.getShiftsAdmin({ city, zoneId });
            res.status(200).json({ success: true, data: shifts });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    updateShift: async (req, res) => {
        try {
            const shift = await shiftRepository.updateShift(req.params.id, req.body);
            res.status(200).json({ success: true, data: shift });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getShiftReport: async (req, res) => {
        try {
            const shiftId = req.params.id;
            const shift = await shiftRepository.getShiftById(shiftId);
            const totalBooked = await shiftRepository.getBookingCountForShift(shiftId);
            res.status(200).json({ success: true, data: { shift, totalBooked } });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getShiftRidersDetail: async (req, res) => {
        try {
            const data = await shiftService.getShiftRidersDetail(req.params.id);
            res.status(200).json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    payRiderForShift: async (req, res) => {
        try {
            const adminId = req.user?._id || req.user?.id;
            const payout = await shiftService.payRiderForShift(req.params.id, req.params.riderId, req.body, adminId);
            res.status(200).json({ success: true, message: 'Payment recorded and marked as paid', data: payout });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // --- RIDER APIs ---
    
    getAvailableShifts: async (req, res) => {
        try {
            const userId = req.user?.userId || req.user?._id || req.user?.id;
            let city = req.query.city;
            let zoneId = req.query.zoneId || req.headers['x-zone-id'];
            let riderZoneName = null;

            let partner = null;
            if (userId) {
                const phone = req.user?.phone;
                if (mongoose.Types.ObjectId.isValid(userId)) {
                    partner = await FoodDeliveryPartner.findById(userId);
                }
                if (!partner) {
                    partner = await FoodDeliveryPartner.findOne({ userId: String(userId) });
                }
                if (!partner && phone) {
                    partner = await FoodDeliveryPartner.findOne({ phone: String(phone) });
                }
                if (!partner) {
                    partner = await FoodDeliveryPartner.findOne({ phone: String(userId) });
                }

                if (partner) {
                    if (partner.zoneId) zoneId = partner.zoneId;
                    if (partner.zoneName) riderZoneName = partner.zoneName;
                    if (partner.city && !city) city = partner.city;
                }
            }
            const shifts = await shiftService.getAvailableShifts({ city: city || 'All', zoneId });
            res.status(200).json({ success: true, data: shifts, riderZone: { zoneId, zoneName: riderZoneName || city || 'Default Zone' } });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    bookShift: async (req, res) => {
        try {
            const riderId = req.user?.userId || req.user?._id || req.user?.id;
            const booking = await shiftService.bookShift(riderId, req.params.id);
            res.status(200).json({ success: true, data: booking, message: "Shift booked successfully" });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    },

    cancelBooking: async (req, res) => {
        try {
            const riderId = req.user?.userId || req.user?._id || req.user?.id;
            await shiftService.cancelBooking(riderId, req.params.id);
            res.status(200).json({ success: true, message: "Booking cancelled" });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getRiderBookedShifts: async (req, res) => {
        try {
            const riderId = req.user?.userId || req.user?._id || req.user?.id;
            const bookedShifts = await shiftService.getRiderBookedShifts(riderId);
            res.status(200).json({ success: true, data: bookedShifts });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // --- ATTENDANCE APIs ---

    heartbeat: async (req, res) => {
        try {
            const riderId = req.user?.userId || req.user?._id || req.user?.id;
            const { shiftId, gps } = req.body;
            const attendance = await shiftService.recordHeartbeat(riderId, shiftId, gps);
            res.status(200).json({ success: true, data: attendance });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    logout: async (req, res) => {
        try {
            const riderId = req.user?.userId || req.user?._id || req.user?.id;
            await shiftService.logoutAttendance(riderId, req.body.shiftId);
            res.status(200).json({ success: true, message: "Logged out from shift" });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // --- SYSTEM/SCHEDULER API ---

    runSettlement: async (req, res) => {
        try {
            const results = await shiftService.processShiftSettlements(req.body.shiftId);
            res.status(200).json({ success: true, data: results });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};
