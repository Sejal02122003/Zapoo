import { DeliveryPenalty } from '../../delivery/models/deliveryPenalty.model.js';
import { FoodOrder } from '../../orders/models/order.model.js';
import { FoodTransaction } from '../../orders/models/foodTransaction.model.js';
import { sendResponse } from '../../../../utils/response.js';
import { ValidationError, NotFoundError } from '../../../../core/auth/errors.js';
import mongoose from 'mongoose';

export const getPenaltiesHistoryController = async (req, res, next) => {
    try {
        const { status, riderId, orderId, page = 1, limit = 50 } = req.query;
        
        const filter = {};
        if (status) filter.status = status;
        if (riderId && mongoose.Types.ObjectId.isValid(riderId)) filter.riderId = new mongoose.Types.ObjectId(riderId);
        if (orderId && mongoose.Types.ObjectId.isValid(orderId)) filter.orderId = new mongoose.Types.ObjectId(orderId);
        
        const penalties = await DeliveryPenalty.find(filter)
            .populate('riderId', 'firstName lastName phone')
            .populate('orderId', 'order_id')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .lean();
            
        const total = await DeliveryPenalty.countDocuments(filter);
        
        return sendResponse(res, 200, 'Penalties fetched successfully', { penalties, total, page, limit });
    } catch (error) {
        next(error);
    }
};

export const getPenaltiesAnalyticsController = async (req, res, next) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [todayLate, totalAgg, statusAgg] = await Promise.all([
            DeliveryPenalty.countDocuments({ createdAt: { $gte: today } }),
            DeliveryPenalty.aggregate([
                { $group: { _id: null, totalPenalties: { $sum: '$penaltyAmount' }, avgDelay: { $avg: '$lateMinutes' } } }
            ]),
            DeliveryPenalty.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ])
        ]);

        const statuses = statusAgg.reduce((acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
        }, {});

        const analytics = {
            todayLateDeliveries: todayLate,
            totalPenaltyAmount: totalAgg[0]?.totalPenalties || 0,
            averageDelayMins: Math.round(totalAgg[0]?.avgDelay || 0),
            refundRequests: statuses['APPEALED'] || 0,
            waived: statuses['WAIVED'] || 0,
            refunded: statuses['REFUNDED'] || 0,
            applied: statuses['APPLIED'] || 0
        };

        return sendResponse(res, 200, 'Analytics fetched successfully', { analytics });
    } catch (error) {
        next(error);
    }
};

export const refundOrWaivePenaltyController = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { id } = req.params;
        const { action, amount, resolutionNote } = req.body; // action: 'REFUND', 'WAIVE', 'APPROVE_APPEAL', 'REJECT_APPEAL'
        
        if (!['REFUND', 'WAIVE', 'APPROVE_APPEAL', 'REJECT_APPEAL'].includes(action)) {
            throw new ValidationError('Invalid action');
        }

        const penalty = await DeliveryPenalty.findById(id).session(session);
        if (!penalty) throw new NotFoundError('Penalty not found');

        if (['REFUNDED', 'WAIVED'].includes(penalty.status)) {
            throw new ValidationError(`Penalty is already ${penalty.status}`);
        }

        const order = await FoodOrder.findById(penalty.orderId).session(session);

        if (action === 'REJECT_APPEAL') {
            penalty.status = 'APPLIED';
            penalty.resolutionNote = resolutionNote || 'Appeal rejected by admin';
            penalty.reviewedBy = req.user?._id;
            penalty.reviewedAt = new Date();
            await penalty.save({ session });
            await session.commitTransaction();
            return sendResponse(res, 200, 'Appeal rejected successfully');
        }

        // For Refund/Waive/Approve Appeal -> Compensating transaction
        const refundAmount = amount && amount > 0 && amount <= penalty.penaltyAmount ? amount : penalty.penaltyAmount;

        penalty.status = action === 'WAIVE' ? 'WAIVED' : 'REFUNDED';
        penalty.resolutionNote = resolutionNote || `Admin action: ${action}`;
        penalty.reviewedBy = req.user?._id;
        penalty.reviewedAt = new Date();
        await penalty.save({ session });

        // Decrease the penalty amount on the order (compensating)
        if (order) {
            order.penaltyAmount = Math.max(0, order.penaltyAmount - refundAmount);
            if (order.penaltyAmount === 0) {
                order.penaltyApplied = false;
                order.deliveryPerformanceStatus = 'LATE_EXCUSED';
            }
            await order.save({ session });
        }

        // Rider wallet refund happens automatically since the getDeliveryPartnerWalletEnhanced 
        // only subtracts APPLIED penalties! By changing the status to REFUNDED/WAIVED, 
        // the pocketBalance will automatically increase. No explicit wallet transaction row needed.

        await session.commitTransaction();
        return sendResponse(res, 200, `Penalty ${action.toLowerCase()}ed successfully`, { penalty });
    } catch (error) {
        await session.abortTransaction();
        next(error);
    } finally {
        session.endSession();
    }
};
