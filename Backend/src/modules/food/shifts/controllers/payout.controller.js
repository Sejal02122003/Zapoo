import { shiftRepository } from '../repositories/shift.repository.js';
import { shiftService } from '../services/shift.service.js';
import { FoodShiftPayout } from '../models/payout.model.js';

export const payoutController = {
    // GET /api/v1/food/admin/payouts
    getPayoutsAdmin: async (req, res) => {
        try {
            await shiftService.syncPendingPayoutsForBookings();

            const { status, riderId, date, zoneId } = req.query;
            const filter = {};
            if (status && status !== 'ALL') filter.status = status;
            if (riderId) filter.riderId = riderId;
            if (date) {
                const startDate = new Date(date);
                startDate.setHours(0,0,0,0);
                const endDate = new Date(date);
                endDate.setHours(23,59,59,999);
                filter.createdAt = { $gte: startDate, $lte: endDate };
            }

            if (zoneId && zoneId !== 'All') {
                const { FoodShift } = await import('../models/shift.model.js');
                const { FoodDeliveryPartner } = await import('../../delivery/models/deliveryPartner.model.js');
                
                const matchingShifts = await FoodShift.find({ zoneId }).select('_id').lean();
                const matchingRiders = await FoodDeliveryPartner.find({ zoneId }).select('_id').lean();
                
                const shiftIds = matchingShifts.map(s => s._id);
                const riderIds = matchingRiders.map(r => r._id);

                filter.$or = [
                    { shiftId: { $in: shiftIds } },
                    { riderId: { $in: riderIds } }
                ];
            }

            const payouts = await shiftRepository.getPayouts(filter, { sort: { createdAt: -1 } });
            res.status(200).json({ success: true, data: payouts });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // GET /api/v1/food/admin/payouts/:id
    getPayoutByIdAdmin: async (req, res) => {
        try {
            const payout = await shiftRepository.getPayoutById(req.params.id);
            if (!payout) return res.status(404).json({ success: false, message: 'Payout not found' });
            res.status(200).json({ success: true, data: payout });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // POST /api/v1/food/admin/payouts/:id/mark-paid
    markAsPaid: async (req, res) => {
        try {
            const { referenceNumber, note } = req.body;
            const payout = await FoodShiftPayout.findById(req.params.id);
            if (!payout) return res.status(404).json({ success: false, message: 'Payout not found' });

            if (payout.status === 'PAID') {
                return res.status(400).json({ success: false, message: 'Payout has already been marked as paid' });
            }

            payout.status = 'PAID';
            payout.referenceNumber = referenceNumber || '';
            payout.note = note || '';
            payout.paidAt = new Date();
            payout.paidBy = req.user?._id || req.user?.id;

            await payout.save();
            res.status(200).json({ success: true, message: 'Payout marked as paid successfully', data: payout });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // POST /api/v1/food/admin/payouts/:id/hold
    holdPayout: async (req, res) => {
        try {
            const { holdReason } = req.body;
            const payout = await FoodShiftPayout.findById(req.params.id);
            if (!payout) return res.status(404).json({ success: false, message: 'Payout not found' });

            payout.status = 'ON_HOLD';
            payout.holdReason = holdReason || 'Held by admin';

            await payout.save();
            res.status(200).json({ success: true, message: 'Payout placed on hold', data: payout });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // GET /api/v1/food/delivery/payouts (Rider view)
    getRiderPayouts: async (req, res) => {
        try {
            const riderId = req.user?._id || req.user?.id;
            const filter = { riderId };
            const payouts = await shiftRepository.getPayouts(filter, { sort: { createdAt: -1 } });
            res.status(200).json({ success: true, data: payouts });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};
