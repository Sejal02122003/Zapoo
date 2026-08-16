import cron from 'node-cron';
import { FoodRestaurant } from '../../modules/food/restaurant/models/restaurant.model.js';
import { FoodRestaurantOutletTimings } from '../../modules/food/restaurant/models/outletTimings.model.js';
import { getIO, rooms } from '../../config/socket.js';
import { invalidateCache } from '../../utils/cache.js';
import { logger } from '../../utils/logger.js';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const getISTTime = (now = new Date()) => {
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utcTime + (330 * 60000));
};

export const parseTimeStrToMinutes = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const normalized = timeStr.trim().toLowerCase();
    const meridiemMatch = normalized.match(/^(\d{1,2}):(\d{2})\s*([ap]m)$/);
    if (meridiemMatch) {
        let h = Number(meridiemMatch[1]);
        const m = Number(meridiemMatch[2]);
        const period = meridiemMatch[3];
        if (period === 'pm' && h < 12) h += 12;
        if (period === 'am' && h === 12) h = 0;
        if (h < 0 || h > 23 || m < 0 || m > 59) return null;
        return h * 60 + m;
    }
    const match24 = normalized.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
        const h = Number(match24[1]);
        const m = Number(match24[2]);
        if (h < 0 || h > 23 || m < 0 || m > 59) return null;
        return h * 60 + m;
    }
    return null;
};

export const isWithinWindow = (currentMinutes, openingMinutes, closingMinutes) => {
    if (openingMinutes === null || closingMinutes === null) return true;
    if (openingMinutes === closingMinutes) return true;
    if (closingMinutes > openingMinutes) {
        return currentMinutes >= openingMinutes && currentMinutes <= closingMinutes;
    }
    // Overnight window (e.g. 20:00 to 02:00)
    return currentMinutes >= openingMinutes || currentMinutes <= closingMinutes;
};

export function evaluateRestaurantOpenStatus(restaurant, outletTimingsDoc, now = new Date()) {
    const istTime = getISTTime(now);
    const currentDay = DAYS[istTime.getDay()];
    const currentMinutes = istTime.getHours() * 60 + istTime.getMinutes();

    // 1. Check outletTimings document
    const timings = Array.isArray(outletTimingsDoc?.timings) ? outletTimingsDoc.timings : [];
    const todayTiming = timings.find(
        (t) => String(t?.day || '').trim().toLowerCase() === currentDay.toLowerCase()
    );

    if (todayTiming) {
        if (todayTiming.isOpen === false) {
            return { isOpenNow: false, reason: 'day_closed', todayTiming };
        }
        const openMin = parseTimeStrToMinutes(todayTiming.openingTime);
        const closeMin = parseTimeStrToMinutes(todayTiming.closingTime);
        if (openMin !== null && closeMin !== null) {
            const within = isWithinWindow(currentMinutes, openMin, closeMin);
            return { isOpenNow: within, reason: within ? 'open' : 'outside_hours', todayTiming };
        }
    }

    // 2. Fallback to restaurant model openDays & openingTime/closingTime
    const openDays = Array.isArray(restaurant?.openDays) ? restaurant.openDays : [];
    if (openDays.length > 0) {
        const isDayOpen = openDays.some((d) => {
            const dStr = String(d || '').trim().toLowerCase();
            return dStr === currentDay.toLowerCase() || currentDay.toLowerCase().startsWith(dStr.slice(0, 3));
        });
        if (!isDayOpen) {
            return { isOpenNow: false, reason: 'day_closed_fallback', todayTiming: null };
        }
    }

    const openMin = parseTimeStrToMinutes(restaurant?.openingTime);
    const closeMin = parseTimeStrToMinutes(restaurant?.closingTime);
    if (openMin !== null && closeMin !== null) {
        const within = isWithinWindow(currentMinutes, openMin, closeMin);
        return { isOpenNow: within, reason: within ? 'open' : 'outside_hours_fallback', todayTiming: null };
    }

    return { isOpenNow: true, reason: 'default_open', todayTiming: null };
}

let cronTask = null;

export async function processAutoOpenCloseForAllRestaurants() {
    try {
        const approvedRestaurants = await FoodRestaurant.find({ status: 'approved' })
            .select('_id restaurantName isAcceptingOrders isClosed isOpen openDays openingTime closingTime')
            .lean();

        if (!approvedRestaurants.length) return;

        const restaurantIds = approvedRestaurants.map((r) => r._id);
        const allTimings = await FoodRestaurantOutletTimings.find({
            restaurantId: { $in: restaurantIds }
        }).lean();

        const timingsMap = new Map();
        for (const t of allTimings) {
            timingsMap.set(String(t.restaurantId), t);
        }

        const now = new Date();
        const io = getIO();
        let changedCount = 0;

        for (const restaurant of approvedRestaurants) {
            const timingsDoc = timingsMap.get(String(restaurant._id));
            const { isOpenNow } = evaluateRestaurantOpenStatus(restaurant, timingsDoc, now);

            const currentlyActive =
                restaurant.isAcceptingOrders === true &&
                restaurant.isClosed !== true &&
                restaurant.isOpen !== false;

            // If timing says it should be OPEN, but it is currently closed
            if (isOpenNow && !currentlyActive) {
                await FoodRestaurant.findByIdAndUpdate(restaurant._id, {
                    $set: { isAcceptingOrders: true, isClosed: false, isOpen: true }
                });
                changedCount++;
                logger.info(`[TIMING CRON] Auto-OPENED restaurant ${restaurant.restaurantName || restaurant._id} (Opening time matched).`);

                // Emit real-time socket event to restaurant app
                if (io) {
                    io.to(rooms.restaurant(String(restaurant._id))).emit('food:restaurant:availability_changed', {
                        restaurantId: String(restaurant._id),
                        isOnline: true,
                        isAcceptingOrders: true,
                        isOpen: true,
                        isClosed: false,
                        autoUpdated: true
                    });
                }
            }
            // If timing says it should be CLOSED, but it is currently open
            else if (!isOpenNow && currentlyActive) {
                await FoodRestaurant.findByIdAndUpdate(restaurant._id, {
                    $set: { isAcceptingOrders: false, isClosed: true, isOpen: false }
                });
                changedCount++;
                logger.info(`[TIMING CRON] Auto-CLOSED restaurant ${restaurant.restaurantName || restaurant._id} (Closing time / Day-off matched).`);

                // Emit real-time socket event to restaurant app
                if (io) {
                    io.to(rooms.restaurant(String(restaurant._id))).emit('food:restaurant:availability_changed', {
                        restaurantId: String(restaurant._id),
                        isOnline: false,
                        isAcceptingOrders: false,
                        isOpen: false,
                        isClosed: true,
                        autoUpdated: true
                    });
                }
            }
        }

        if (changedCount > 0) {
            await invalidateCache('restaurants:*');
            await invalidateCache('restaurant_detail:*');
            logger.info(`[TIMING CRON] Successfully synced open/close state for ${changedCount} restaurants.`);
        }
    } catch (err) {
        logger.error(`[TIMING CRON] Error running restaurant timing scheduler: ${err.message}`);
    }
}

export function startRestaurantTimingScheduler() {
    if (cronTask) return cronTask;

    // Run every minute
    cronTask = cron.schedule('* * * * *', async () => {
        await processAutoOpenCloseForAllRestaurants();
    });

    logger.info(`[TIMING SCHEDULER] Periodic restaurant open/close timing cron job scheduled (every minute).`);

    // Initial check on startup
    processAutoOpenCloseForAllRestaurants().catch((err) => {
        logger.error(`[TIMING SCHEDULER] Initial startup open/close check error: ${err.message}`);
    });

    return cronTask;
}
