import mongoose from 'mongoose';
import { FoodOrder } from '../../orders/models/order.model.js';
import { FoodDeliveryPartner } from '../../delivery/models/deliveryPartner.model.js';
import { getSocketIo } from '../../../../utils/socket.js';

// In-memory locks for basic concurrency control
const locks = new Set();

export const triggerReassignment = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const { orderId } = req.params;
        const { newDriverId, reason } = req.body;
        const adminId = req.user._id;

        if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(newDriverId)) {
            return res.status(400).json({ success: false, message: 'Invalid ID format' });
        }

        // 1. Concurrency Lock
        const lockKey = `reassignment_lock_order_${orderId}`;
        if (locks.has(lockKey)) {
            return res.status(429).json({ success: false, message: 'Reassignment already in progress for this order' });
        }
        locks.add(lockKey);

        const order = await FoodOrder.findById(orderId).session(session);
        if (!order) {
            locks.delete(lockKey);
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // 2. Status Guard
        const finalStates = ['DELIVERED', 'CANCELLED'];
        if (finalStates.includes(order.orderStatus)) {
            locks.delete(lockKey);
            return res.status(400).json({ success: false, message: 'Cannot reassign a delivered or cancelled order' });
        }

        // 3. Pending Guard
        if (order.reassignmentStatus === 'pending') {
            locks.delete(lockKey);
            return res.status(400).json({ success: false, message: 'Reassignment is already pending for this order' });
        }

        // 4. New Driver Guard
        const newDriver = await FoodDeliveryPartner.findById(newDriverId).session(session);
        if (!newDriver || !newDriver.online || newDriver.status !== 'approved') {
            locks.delete(lockKey);
            return res.status(400).json({ success: false, message: 'Selected driver is offline or invalid' });
        }
        if (order.dispatch?.deliveryPartnerId && order.dispatch.deliveryPartnerId.toString() === newDriverId.toString()) {
            locks.delete(lockKey);
            return res.status(400).json({ success: false, message: 'Selected driver is already assigned to this order' });
        }

        const currentDriverId = order.dispatch?.deliveryPartnerId || null;

        // 5. Update Order
        order.pendingReassignedDriverId = newDriverId;
        order.previousAssignedDriverId = currentDriverId;
        order.reassignmentStatus = 'pending';
        
        // 60-second timeout
        const timeoutMs = 60000;
        order.reassignmentTimeoutAt = new Date(Date.now() + timeoutMs);
        
        order.reassignmentHistory.push({
            previousDriverId: currentDriverId,
            newDriverId: newDriverId,
            reassignedByAdminId: adminId,
            statusAtReassignment: order.orderStatus,
            reason: reason || '',
            reassignmentStatus: 'pending'
        });

        await order.save({ session });
        await session.commitTransaction();
        locks.delete(lockKey);

        // 6. Realtime Sockets
        const io = getSocketIo();
        if (io) {
            io.to(`delivery_${newDriverId}`).emit('reassignment_requested', {
                orderId: order._id,
                orderNumber: order.order_id,
                reason: reason,
                timeoutAt: order.reassignmentTimeoutAt
            });
            io.to('admin').emit('reassignment_pending_admin', {
                orderId: order._id,
                newDriverId: newDriverId,
                status: 'pending'
            });
        }

        // 7. Schedule Timeout Fallback
        setTimeout(async () => {
            try {
                const checkOrder = await FoodOrder.findById(orderId);
                if (checkOrder && checkOrder.reassignmentStatus === 'pending' && checkOrder.pendingReassignedDriverId?.toString() === newDriverId.toString()) {
                    checkOrder.reassignmentStatus = 'timed_out';
                    checkOrder.pendingReassignedDriverId = null;
                    
                    const historyIndex = checkOrder.reassignmentHistory.length - 1;
                    if (historyIndex >= 0) {
                        checkOrder.reassignmentHistory[historyIndex].reassignmentStatus = 'timed_out';
                    }
                    
                    await checkOrder.save();

                    const ioInstance = getSocketIo();
                    if (ioInstance) {
                        ioInstance.to('admin').emit('reassignment_timed_out', { orderId: checkOrder._id });
                        ioInstance.to(`delivery_${newDriverId}`).emit('reassignment_request_expired', { orderId: checkOrder._id });
                    }
                }
            } catch (e) {
                console.error('Timeout handler error:', e);
            }
        }, timeoutMs);

        return res.status(200).json({ success: true, message: 'Reassignment requested successfully', order });
    } catch (error) {
        await session.abortTransaction();
        const { orderId } = req.params;
        locks.delete(`reassignment_lock_order_${orderId}`);
        console.error('Reassignment trigger error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    } finally {
        session.endSession();
    }
};
