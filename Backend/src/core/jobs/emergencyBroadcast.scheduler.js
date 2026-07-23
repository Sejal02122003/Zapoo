import { FoodEmergencyBroadcast } from '../../modules/food/admin/models/emergencyBroadcast.model.js';
import { FoodBroadcastRecipient } from '../../modules/food/admin/models/broadcastRecipient.model.js';
import { FoodOrder } from '../../modules/food/orders/models/order.model.js';
import { getIO } from '../../config/socket.js';

export const startEmergencyBroadcastScheduler = () => {
    // Run every 30 seconds
    setInterval(async () => {
        try {
            const now = new Date();
            // Find active broadcasts that have passed their expiration time
            const expiredBroadcasts = await FoodEmergencyBroadcast.find({
                status: 'ACTIVE',
                expiresAt: { $lt: now }
            });

            for (const broadcast of expiredBroadcasts) {
                broadcast.status = 'EXPIRED';
                await broadcast.save();

                // Mark any NOTIFIED recipients as TIMEOUT
                await FoodBroadcastRecipient.updateMany(
                    { broadcastId: broadcast._id, status: 'NOTIFIED' },
                    { $set: { status: 'TIMEOUT' } }
                );

                const order = await FoodOrder.findById(broadcast.orderId);
                if (order && order.broadcastStatus === 'ACTIVE') {
                    order.broadcastStatus = 'EXPIRED';
                    await order.save();
                }

                const io = getIO();
                if (io) {
                    // Notify any riders who had it pending that it's gone
                    const timedOutRecipients = await FoodBroadcastRecipient.find({ broadcastId: broadcast._id, status: 'TIMEOUT' });
                    timedOutRecipients.forEach(r => {
                        io.to(`delivery_partner_${r.riderId}`).emit('EMERGENCY_BROADCAST_CLOSED', {
                            type: "EMERGENCY_BROADCAST_CLOSED",
                            broadcastId: broadcast._id,
                            orderId: broadcast.orderId,
                            reason: "EXPIRED"
                        });
                    });

                    // Notify Admin
                    io.to('admin_room').emit('BROADCAST_UPDATED', { broadcastId: broadcast._id, status: 'EXPIRED' });
                }
            }
        } catch (error) {
            console.error('Error in emergency broadcast expiry scheduler:', error);
        }
    }, 30 * 1000);
};
