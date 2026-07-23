import { FoodOrder } from '../../orders/models/order.model.js';
import { FoodEmergencyBroadcast } from '../models/emergencyBroadcast.model.js';
import { FoodBroadcastRecipient } from '../models/broadcastRecipient.model.js';
import { FoodDeliveryPartner } from '../../delivery/models/deliveryPartner.model.js';
import { getIO } from '../../../../config/socket.js';

export const startEmergencyBroadcast = async (req, res) => {
    try {
        const { id: orderId } = req.params;
        const { radius, extraIncentive = 0, priority = 'HIGH', duration, message = '' } = req.body;
        const adminId = req.user._id;

        if (!radius || !duration) {
            return res.status(400).json({ success: false, message: 'Radius and duration are required' });
        }

        const order = await FoodOrder.findById(orderId).populate('restaurantId');
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (['delivered', 'cancelled', 'rejected'].includes(order.status)) {
            return res.status(400).json({ success: false, message: 'Order is no longer active' });
        }

        const activeBroadcast = await FoodEmergencyBroadcast.findOne({ orderId, status: 'ACTIVE' });
        if (activeBroadcast) {
            return res.status(400).json({ success: false, message: 'An active broadcast already exists for this order' });
        }

        const coordinates = order.restaurantId?.location?.coordinates || order.restaurantId?.coordinates;
        if (!coordinates || coordinates.length !== 2) {
            return res.status(400).json({ success: false, message: 'Restaurant coordinates not found' });
        }

        // Find eligible riders
        const riders = await FoodDeliveryPartner.find({
            availabilityStatus: 'online',
            isBlocked: false,
            // Assuming current order checking is done via checking active deliveries count or status
            // This would require a more complex query if we track active assignments directly on rider.
            // For now, simple geo-query:
            lastLocation: {
                $nearSphere: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [coordinates[0], coordinates[1]]
                    },
                    $maxDistance: radius * 1000 // Convert km to meters
                }
            }
        });

        const expiresAt = new Date(Date.now() + duration * 1000);

        const broadcast = new FoodEmergencyBroadcast({
            orderId,
            radius,
            extraIncentive,
            priority,
            duration,
            message,
            status: 'ACTIVE',
            createdBy: adminId,
            totalRecipients: riders.length,
            expiresAt
        });

        await broadcast.save();

        const recipients = riders.map(r => ({
            broadcastId: broadcast._id,
            riderId: r._id,
            status: 'NOTIFIED'
        }));

        if (recipients.length > 0) {
            await FoodBroadcastRecipient.insertMany(recipients);
        }

        order.isEmergency = true;
        order.broadcastId = broadcast._id;
        order.emergencyIncentive = extraIncentive;
        order.broadcastStatus = 'ACTIVE';
        await order.save();

        // Emit via Socket.io
        const io = getIO();
        if (io) {
            riders.forEach(rider => {
                io.to(`delivery_partner_${rider._id}`).emit('EMERGENCY_BROADCAST', {
                    type: "EMERGENCY_BROADCAST",
                    broadcastId: broadcast._id,
                    orderId: order._id,
                    pickup: order.restaurantId?.name || "Restaurant",
                    drop: order.deliveryAddress?.street || "Destination",
                    extraIncentive,
                    expiresAt,
                    message
                });
            });
            // Update Admin dashboard
            io.to('admin_room').emit('BROADCAST_STARTED', { orderId, broadcastId: broadcast._id, count: riders.length });
        }

        // TODO: Push notifications using existing firebase.service

        res.status(200).json({ success: true, broadcast });

    } catch (error) {
        console.error('Error starting broadcast:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getEligibleRidersPreview = async (req, res) => {
    try {
        const { id: orderId } = req.params;
        const radius = parseFloat(req.query.radius);

        if (!radius) return res.status(400).json({ success: false, message: 'Radius required' });

        const order = await FoodOrder.findById(orderId).populate('restaurantId');
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        const coordinates = order.restaurantId?.location?.coordinates || order.restaurantId?.coordinates;
        if (!coordinates || coordinates.length !== 2) {
            return res.status(400).json({ success: false, message: 'Restaurant coordinates not found' });
        }

        const count = await FoodDeliveryPartner.countDocuments({
            availabilityStatus: 'online',
            isBlocked: false,
            lastLocation: {
                $nearSphere: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [coordinates[0], coordinates[1]]
                    },
                    $maxDistance: radius * 1000
                }
            }
        });

        res.status(200).json({ success: true, count });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getBroadcasts = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status) filter.status = status;

        const skip = (page - 1) * limit;

        const [broadcasts, total] = await Promise.all([
            FoodEmergencyBroadcast.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            FoodEmergencyBroadcast.countDocuments(filter)
        ]);

        res.status(200).json({ success: true, data: broadcasts, pagination: { total, page: Number(page), limit: Number(limit) } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getBroadcastDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const broadcast = await FoodEmergencyBroadcast.findById(id).populate('createdBy', 'name email');
        if (!broadcast) return res.status(404).json({ success: false, message: 'Broadcast not found' });

        const recipients = await FoodBroadcastRecipient.find({ broadcastId: id }).populate('riderId', 'name phone');

        res.status(200).json({ success: true, data: { ...broadcast.toObject(), recipients } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const cancelBroadcast = async (req, res) => {
    try {
        const { id } = req.params;
        const broadcast = await FoodEmergencyBroadcast.findById(id);
        if (!broadcast) return res.status(404).json({ success: false, message: 'Broadcast not found' });
        
        if (broadcast.status !== 'ACTIVE') {
            return res.status(400).json({ success: false, message: `Cannot cancel broadcast in ${broadcast.status} state` });
        }

        broadcast.status = 'CANCELLED';
        await broadcast.save();

        await FoodBroadcastRecipient.updateMany(
            { broadcastId: id, status: 'NOTIFIED' },
            { $set: { status: 'TIMEOUT' } }
        );

        const order = await FoodOrder.findById(broadcast.orderId);
        if (order) {
            order.broadcastStatus = 'CANCELLED';
            await order.save();
        }

        const io = getIO();
        if (io) {
            const recipients = await FoodBroadcastRecipient.find({ broadcastId: id });
            recipients.forEach(r => {
                io.to(`delivery_partner_${r.riderId}`).emit('EMERGENCY_BROADCAST_CLOSED', {
                    type: "EMERGENCY_BROADCAST_CLOSED",
                    broadcastId: id,
                    orderId: broadcast.orderId,
                    reason: "CANCELLED"
                });
            });
            io.to('admin_room').emit('BROADCAST_UPDATED', { broadcastId: id, status: 'CANCELLED' });
        }

        res.status(200).json({ success: true, message: 'Broadcast cancelled successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const retryBroadcast = async (req, res) => {
    try {
        const { id } = req.params;
        const oldBroadcast = await FoodEmergencyBroadcast.findById(id);
        if (!oldBroadcast) return res.status(404).json({ success: false, message: 'Broadcast not found' });

        if (!['EXPIRED', 'CANCELLED'].includes(oldBroadcast.status)) {
            return res.status(400).json({ success: false, message: 'Can only retry EXPIRED or CANCELLED broadcasts' });
        }

        // Re-use body params if provided, else use old ones
        const radius = req.body.radius || oldBroadcast.radius;
        const extraIncentive = req.body.extraIncentive !== undefined ? req.body.extraIncentive : oldBroadcast.extraIncentive;
        const priority = req.body.priority || oldBroadcast.priority;
        const duration = req.body.duration || oldBroadcast.duration;
        const message = req.body.message || oldBroadcast.message;

        req.params.id = oldBroadcast.orderId;
        req.body = { radius, extraIncentive, priority, duration, message };
        
        return startEmergencyBroadcast(req, res);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
