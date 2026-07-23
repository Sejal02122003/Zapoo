import mongoose from 'mongoose';
import { FoodOrder } from '../../orders/models/order.model.js';
import { FoodDeliveryAssignment } from '../../delivery/models/deliveryAssignment.model.js';
import { FoodIncentive } from '../../orders/models/incentive.model.js';
import { FoodSettings } from '../../orders/models/order.model.js';
import { FoodDeliveryPartner } from '../../delivery/models/deliveryPartner.model.js';
import { pushStatusHistory } from '../../orders/services/order.helpers.js';

export const getAvailableRiders = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await FoodOrder.findById(orderId).lean();
        
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Dummy implementation for distance (assuming location-based search exists in project)
        // In a real scenario, this would use a geospatial query near order.deliveryAddress.location
        const riders = await FoodDeliveryPartner.find({
            status: 'approved',
            online: true
        }).select('name phone rating currentLocation').limit(50).lean();

        // Calculate straight line distance or map distance based on `order.restaurantId` location
        // For simplicity, returning the list
        res.status(200).json({ success: true, riders });
    } catch (error) {
        console.error('Error fetching available riders:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

export const assignDeliveryPartner = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { orderId } = req.params;
        const { deliveryPartnerId, manualIncentive = 0, reason = '', notifyRider = true } = req.body;
        const adminId = req.user?.id || req.user?._id; // standard admin auth injection

        if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(deliveryPartnerId)) {
            return res.status(400).json({ success: false, message: 'Invalid orderId or deliveryPartnerId' });
        }

        const order = await FoodOrder.findById(orderId).session(session);
        if (!order) {
            throw new Error('Order not found');
        }

        if (order.orderStatus !== 'needs_manual_assignment' && order.dispatch?.status !== 'unassigned') {
            throw new Error('Order is not in a valid state for manual assignment');
        }

        const rider = await FoodDeliveryPartner.findById(deliveryPartnerId).session(session);
        if (!rider || !rider.online) {
            throw new Error('Selected delivery partner is not available or offline');
        }

        // Validate incentive limit
        const settings = await FoodSettings.findOne({ key: 'general_settings' }).session(session); // Assume general settings key
        const maxLimit = settings?.maxManualIncentive || 500;
        
        if (manualIncentive < 0 || manualIncentive > maxLimit) {
            throw new Error(`Incentive amount must be between 0 and ${maxLimit}`);
        }

        // Check if assignment already exists
        const existingAssignment = await FoodDeliveryAssignment.findOne({
            orderId,
            deliveryPartnerId,
            status: { $in: ['PENDING', 'ACCEPTED'] }
        }).session(session);

        if (existingAssignment) {
            throw new Error('Delivery partner is already assigned to this order');
        }

        // Create assignment record
        const assignment = new FoodDeliveryAssignment({
            orderId,
            deliveryPartnerId,
            assignedBy: adminId,
            assignmentType: 'MANUAL',
            manualIncentive,
            reason,
            status: 'PENDING'
        });
        await assignment.save({ session });

        // Create Incentive Record
        if (manualIncentive > 0) {
            const incentive = new FoodIncentive({
                orderId,
                deliveryPartnerId,
                incentiveType: 'MANUAL_ASSIGNMENT',
                amount: manualIncentive,
                reason,
                status: 'PENDING',
                createdBy: adminId
            });
            await incentive.save({ session });
        }

        // Update Order
        order.dispatch.status = 'assigned';
        order.dispatch.deliveryPartnerId = deliveryPartnerId;
        order.dispatch.assignedAt = new Date();
        
        order.manualAssignment = {
            assignedBy: adminId,
            manualIncentive,
            reason,
            assignedAt: new Date()
        };

        // If pushStatusHistory is imported properly, use it
        // pushStatusHistory(order, { byRole: 'ADMIN', byId: adminId, from: 'unassigned', to: 'assigned', note: 'Manually assigned' });
        
        await order.save({ session });

        await session.commitTransaction();
        session.endSession();

        // Notification logic here (outside transaction)
        if (notifyRider) {
            // Send Push Notification
            // TODO: Standardize payload
        }

        res.status(200).json({ success: true, message: 'Delivery partner assigned successfully', assignment });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Error assigning delivery partner:', error);
        res.status(400).json({ success: false, message: error.message || 'Error assigning delivery partner' });
    }
};

export const getIncentiveReport = async (req, res) => {
    try {
        const { dateFrom, dateTo, riderId, page = 1, limit = 20 } = req.query;
        
        const filter = { incentiveType: 'MANUAL_ASSIGNMENT' };
        if (riderId) filter.deliveryPartnerId = riderId;
        if (dateFrom && dateTo) {
            filter.createdAt = { $gte: new Date(dateFrom), $lte: new Date(dateTo) };
        }

        const skip = (page - 1) * limit;

        const incentives = await FoodIncentive.find(filter)
            .populate('deliveryPartnerId', 'name phone')
            .populate('orderId', 'order_id orderStatus')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const total = await FoodIncentive.countDocuments(filter);

        // Calculate summary
        const summary = await FoodIncentive.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: null,
                    totalIncentivesAmount: { $sum: '$amount' },
                    totalOrders: { $sum: 1 },
                    averageIncentive: { $avg: '$amount' }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: incentives,
            summary: summary[0] || { totalIncentivesAmount: 0, totalOrders: 0, averageIncentive: 0 },
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching incentive report:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
