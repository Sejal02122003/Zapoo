import { FoodDeliveryDutyLog } from '../../modules/food/delivery/models/deliveryDutyLog.model.js';
import { FoodDeliveryPartner } from '../../modules/food/delivery/models/deliveryPartner.model.js';
import { logger } from '../../utils/logger.js';

export const STALE_TIMEOUT_MINUTES = 15;

/**
 * Auto-closes crashed/disconnected sessions if no heartbeat was received for > 15 mins.
 */
export async function processStaleSessionCleanup() {
    try {
        const timeoutCutoff = new Date(Date.now() - STALE_TIMEOUT_MINUTES * 60 * 1000);

        const openStaleSessions = await FoodDeliveryDutyLog.find({
            status: 'OPEN',
            lastHeartbeatAt: { $lt: timeoutCutoff }
        });

        if (!openStaleSessions || openStaleSessions.length === 0) {
            return { closedCount: 0 };
        }

        let closedCount = 0;
        for (const session of openStaleSessions) {
            const closeTime = session.lastHeartbeatAt || timeoutCutoff;
            const diffMs = Math.max(0, closeTime.getTime() - session.onlineAt.getTime());
            const durationMinutes = Math.round(diffMs / 60000);

            session.offlineAt = closeTime;
            session.durationMinutes = durationMinutes;
            session.status = 'CLOSED';
            session.closeReason = 'AUTO_TIMEOUT';
            await session.save();

            // Set rider availability status to offline if still marked online
            await FoodDeliveryPartner.findByIdAndUpdate(session.riderId, {
                availabilityStatus: 'offline'
            });

            closedCount++;
        }

        logger.info(`[DutyLog Cleanup] Auto-closed ${closedCount} stale rider sessions due to heartbeat timeout.`);
        return { closedCount };
    } catch (err) {
        logger.error(`[DutyLog Cleanup] Error during stale session cleanup: ${err.message}`);
        return { closedCount: 0, error: err.message };
    }
}
