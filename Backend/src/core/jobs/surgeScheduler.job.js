import cron from 'node-cron';
import mongoose from 'mongoose';
import { FoodRestaurant } from '../../modules/food/restaurant/models/restaurant.model.js';
import { computeSurgeForRestaurant } from '../../modules/food/admin/services/surgeCalculation.service.js';
import { logger } from '../../utils/logger.js';

let cronTask = null;

export async function processSurgeCalculationForAllRestaurants() {
    try {
        if (mongoose.connection.readyState !== 1) {
            return;
        }
        const approvedRestaurants = await FoodRestaurant.find({
            status: 'approved',
            isAcceptingOrders: true
        })
            .select('_id restaurantName')
            .lean();

        if (!approvedRestaurants.length) return;

        const results = await Promise.allSettled(
            approvedRestaurants.map((restaurant) => computeSurgeForRestaurant(restaurant._id))
        );

        const succeeded = results.filter((r) => r.status === 'fulfilled' && r.value).length;
        logger.info(`[SURGE CRON] Computed surge for ${succeeded}/${approvedRestaurants.length} active restaurants.`);
    } catch (err) {
        logger.error(`[SURGE CRON] Error running surge calculation cron: ${err.message}`);
    }
}

export function startSurgeScheduler() {
    if (cronTask) return cronTask;

    // Run every 5 minutes: '*/5 * * * *'
    cronTask = cron.schedule('*/5 * * * *', async () => {
        logger.info(`[SURGE CRON] 5-minute periodic surge calculation started...`);
        await processSurgeCalculationForAllRestaurants();
    });

    logger.info(`[SURGE SCHEDULER] Periodic surge cron job scheduled (every 5 minutes).`);
    
    // Initial run on startup
    processSurgeCalculationForAllRestaurants().catch((err) => {
        logger.error(`[SURGE SCHEDULER] Initial startup calculation error: ${err.message}`);
    });

    return cronTask;
}
