import { shiftService } from '../services/shift.service.js';
import { shiftRepository } from '../repositories/shift.repository.js';

export const shiftController = {
    // --- ADMIN APIs ---
    
    createShift: async (req, res) => {
        try {
            const shift = await shiftService.createShift(req.body, req.user._id);
            res.status(201).json({ success: true, data: shift });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getShiftsAdmin: async (req, res) => {
        try {
            const filter = req.query.city ? { city: req.query.city } : {};
            const shifts = await shiftRepository.getShifts(filter, { sort: { startTime: -1 } });
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
            // Aggregate shift reports (bookings, settlements, attendance)
            const shiftId = req.params.id;
            const shift = await shiftRepository.getShiftById(shiftId);
            const totalBooked = await shiftRepository.getBookingCountForShift(shiftId);
            
            // Getting settlements summary
            // ... in a full production system, we'd use mongoose aggregations here.
            res.status(200).json({ success: true, data: { shift, totalBooked } });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // --- RIDER APIs ---
    
    getAvailableShifts: async (req, res) => {
        try {
            // Assuming rider's city is in req.user
            const city = req.user.city || req.query.city;
            const shifts = await shiftService.getAvailableShifts(city);
            res.status(200).json({ success: true, data: shifts });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    bookShift: async (req, res) => {
        try {
            const booking = await shiftService.bookShift(req.user._id, req.params.id);
            res.status(200).json({ success: true, data: booking, message: "Shift booked successfully" });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    },

    cancelBooking: async (req, res) => {
        try {
            await shiftService.cancelBooking(req.user._id, req.params.id);
            res.status(200).json({ success: true, message: "Booking cancelled" });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // --- ATTENDANCE APIs ---

    heartbeat: async (req, res) => {
        try {
            const { shiftId, gps } = req.body; // gps: { lat, lng }
            const attendance = await shiftService.recordHeartbeat(req.user._id, shiftId, gps);
            res.status(200).json({ success: true, data: attendance });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    logout: async (req, res) => {
        try {
            await shiftService.logoutAttendance(req.user._id, req.body.shiftId);
            res.status(200).json({ success: true, message: "Logged out from shift" });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // --- SYSTEM/SCHEDULER API ---

    runSettlement: async (req, res) => {
        try {
            // Protect via internal token check if needed
            const results = await shiftService.processShiftSettlements(req.body.shiftId);
            res.status(200).json({ success: true, data: results });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};
