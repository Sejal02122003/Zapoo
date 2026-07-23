import { FoodOrder } from '../../orders/models/order.model.js';
import { FoodEmergencyBroadcast } from '../../admin/models/emergencyBroadcast.model.js';
import { FoodBroadcastRecipient } from '../../admin/models/broadcastRecipient.model.js';
import { getIO } from '../../../../config/socket.js';

export const acceptEmergencyBroadcast = async (req, res) => {
    try {
        const { id: orderId } = req.params;
        const riderId = req.user._id;

        // Ensure the rider was actually a recipient of this broadcast
        const broadcast = await FoodEmergencyBroadcast.findOne({ orderId, status: 'ACTIVE' });
        if (!broadcast) {
            return res.status(409).json({ success: false, error: 'ALREADY_ACCEPTED', message: 'This emergency order has already been accepted or expired.' });
        }

        const recipient = await FoodBroadcastRecipient.findOne({ broadcastId: broadcast._id, riderId });
        if (!recipient) {
            return res.status(403).json({ success: false, message: 'You are not eligible for this broadcast.' });
        }
        
        if (recipient.status === 'REJECTED' || recipient.status === 'TIMEOUT') {
            return res.status(400).json({ success: false, message: `You have already ${recipient.status.toLowerCase()} this order.` });
        }

        // CRITICAL RACE-CONDITION PROTECTION: Atomic findOneAndUpdate
        // Only updates if the order is still searching and broadcastStatus is ACTIVE
        const order = await FoodOrder.findOneAndUpdate(
            { 
                _id: orderId, 
                // Assumes 'pending', 'needs_manual_assignment' or similar statuses imply no rider yet
                status: { $in: ['pending', 'needs_manual_assignment'] }, 
                broadcastStatus: 'ACTIVE',
                'dispatch.deliveryPartnerId': { $exists: false } // ensure no rider assigned
            },
            { 
                $set: { 
                    'dispatch.deliveryPartnerId': riderId,
                    'dispatch.status': 'assigned',
                    'dispatch.assignedAt': new Date(),
                    status: 'accepted',
                    broadcastStatus: 'COMPLETED'
                } 
            },
            { new: true }
        );

        if (!order) {
            // Did not match -> someone else accepted it first or it changed state
            return res.status(409).json({ success: false, error: 'ALREADY_ACCEPTED', message: 'This emergency order has already been accepted.' });
        }

        // We won the race! Update Broadcast records
        broadcast.status = 'COMPLETED';
        broadcast.acceptedBy = riderId;
        await broadcast.save();

        recipient.status = 'ACCEPTED';
        recipient.acceptedAt = new Date();
        await recipient.save();

        // Mark all other NOTIFIED recipients as REJECTED (loss notification)
        await FoodBroadcastRecipient.updateMany(
            { broadcastId: broadcast._id, status: 'NOTIFIED', riderId: { $ne: riderId } },
            { $set: { status: 'REJECTED' } }
        );

        // Notify losers via Socket.io
        const io = getIO();
        if (io) {
            const losers = await FoodBroadcastRecipient.find({ broadcastId: broadcast._id, status: 'REJECTED', riderId: { $ne: riderId } });
            losers.forEach(loser => {
                io.to(`delivery_partner_${loser.riderId}`).emit('EMERGENCY_BROADCAST_CLOSED', {
                    type: "EMERGENCY_BROADCAST_CLOSED",
                    broadcastId: broadcast._id,
                    orderId: broadcast.orderId,
                    reason: "ALREADY_ACCEPTED"
                });
            });

            // Notify Admin
            io.to('admin_room').emit('BROADCAST_UPDATED', { broadcastId: broadcast._id, status: 'COMPLETED', acceptedBy: riderId });
        }

        res.status(200).json({ success: true, message: 'Emergency order accepted successfully!' });
    } catch (error) {
        console.error('Error accepting emergency broadcast:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const declineEmergencyBroadcast = async (req, res) => {
    try {
        const { id: orderId } = req.params;
        const riderId = req.user._id;

        const broadcast = await FoodEmergencyBroadcast.findOne({ orderId, status: 'ACTIVE' });
        if (!broadcast) {
            // Already expired or completed, so declining is a no-op essentially.
            return res.status(200).json({ success: true, message: 'Broadcast no longer active.' });
        }

        const recipient = await FoodBroadcastRecipient.findOne({ broadcastId: broadcast._id, riderId });
        if (recipient && recipient.status === 'NOTIFIED') {
            recipient.status = 'REJECTED';
            await recipient.save();
        }

        res.status(200).json({ success: true, message: 'Declined successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
