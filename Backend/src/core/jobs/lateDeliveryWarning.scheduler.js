import cron from 'node-cron';
import { FoodOrder } from '../../modules/food/orders/models/order.model.js';
import { DeliveryPolicyVersion } from '../../modules/food/admin/models/deliveryPolicy.model.js';
import { notifyOwnerSafely } from '../notifications/firebase.service.js';
import { logger } from '../../utils/logger.js';

export const startLateDeliveryWarningScheduler = () => {
    // Run every minute
    cron.schedule('* * * * *', async () => {
        try {
            const activePolicy = await DeliveryPolicyVersion.findOne({ effectiveFrom: { $lte: new Date() } }).sort({ effectiveFrom: -1 }).lean();
            if (!activePolicy?.enablePenalty) return;

            const now = new Date();
            const warningThresholdMs = 2 * 60000; // 2 minutes before grace period ends

            // Find orders that are picked up, not delivered, have an expected time, and are close to late
            const orders = await FoodOrder.find({
                orderStatus: 'picked_up',
                expectedDeliveryTime: { $ne: null },
                'deliveryState.currentPhase': 'en_route_to_delivery'
            }).select('expectedDeliveryTime graceMinutes dispatch order_id');

            for (const order of orders) {
                const graceMinutes = order.graceMinutes || activePolicy.graceMinutes || 5;
                const deadlineMs = order.expectedDeliveryTime.getTime() + (graceMinutes * 60000);
                const timeRemainingMs = deadlineMs - now.getTime();

                // If time remaining is between 0 and warning threshold (e.g. 2 minutes)
                if (timeRemainingMs > 0 && timeRemainingMs <= warningThresholdMs) {
                    // Send warning push/socket
                    const deliveryPartnerId = order.dispatch?.deliveryPartnerId;
                    if (deliveryPartnerId) {
                        void notifyOwnerSafely(
                            { ownerType: 'DELIVERY_PARTNER', ownerId: deliveryPartnerId },
                            {
                                title: 'Late Delivery Warning',
                                body: `You are approaching the deadline for Order #${order.order_id}. Deliver soon to avoid a penalty!`,
                                dataOnly: true,
                                data: {
                                    type: 'late_warning',
                                    orderId: order._id.toString()
                                }
                            }
                        );
                    }
                }
            }
        } catch (error) {
            logger.error(`Error in Late Delivery Warning Scheduler: ${error?.message}`);
        }
    });

    logger.info('Late Delivery Warning Scheduler started.');
};
