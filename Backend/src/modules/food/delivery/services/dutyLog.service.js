import mongoose from 'mongoose';
import { FoodDeliveryDutyLog } from '../models/deliveryDutyLog.model.js';
import { FoodDeliveryPartner } from '../models/deliveryPartner.model.js';
import { logger } from '../../../../utils/logger.js';

export const DUTY_TIMEZONE = 'Asia/Kolkata';

/**
 * Handles rider going online (creates or resumes open duty session).
 */
export async function handleGoOnline(riderId) {
    if (!riderId) return null;
    const rId = new mongoose.Types.ObjectId(riderId);

    let openSession = await FoodDeliveryDutyLog.findOne({ riderId: rId, status: 'OPEN' });
    const now = new Date();

    if (openSession) {
        openSession.lastHeartbeatAt = now;
        await openSession.save();
        return openSession;
    }

    openSession = await FoodDeliveryDutyLog.create({
        riderId: rId,
        onlineAt: now,
        lastHeartbeatAt: now,
        status: 'OPEN'
    });

    return openSession;
}

/**
 * Handles rider going offline (closes open duty session).
 */
export async function handleGoOffline(riderId, closeReason = 'MANUAL') {
    if (!riderId) return null;
    const rId = new mongoose.Types.ObjectId(riderId);
    const now = new Date();

    const openSession = await FoodDeliveryDutyLog.findOne({ riderId: rId, status: 'OPEN' });
    if (!openSession) return null;

    const diffMs = Math.max(0, now.getTime() - openSession.onlineAt.getTime());
    const durationMinutes = Math.round(diffMs / 60000);

    openSession.offlineAt = now;
    openSession.lastHeartbeatAt = now;
    openSession.durationMinutes = durationMinutes;
    openSession.status = 'CLOSED';
    openSession.closeReason = closeReason;

    await openSession.save();
    return openSession;
}

/**
 * Handles rider heartbeat (refreshes lastHeartbeatAt of open session).
 */
export async function handleHeartbeat(riderId) {
    if (!riderId) return null;
    const rId = new mongoose.Types.ObjectId(riderId);
    const now = new Date();

    let openSession = await FoodDeliveryDutyLog.findOne({ riderId: rId, status: 'OPEN' });

    // Sync active shift attendance heartbeat
    try {
        const { FoodShiftBooking } = await import('../../shifts/models/shiftBooking.model.js');
        const { FoodShift } = await import('../../shifts/models/shift.model.js');
        const { shiftService } = await import('../../shifts/services/shift.service.js');

        const bookings = await FoodShiftBooking.find({
            riderId: rId,
            status: 'BOOKED'
        }).lean();

        for (const booking of bookings) {
            const shift = await FoodShift.findById(booking.shiftId).lean();
            if (shift && now >= new Date(shift.startTime) && now <= new Date(shift.endTime)) {
                await shiftService.recordHeartbeat(rId.toString(), shift._id.toString(), null);
            }
        }
    } catch (shiftErr) {
        logger.error(`Error syncing shift heartbeat: ${shiftErr.message}`);
    }

    if (openSession) {
        openSession.lastHeartbeatAt = now;
        await openSession.save();
        return openSession;
    }

    // If no open session exists but heartbeat received, create session
    return await handleGoOnline(riderId);
}

/**
 * Splits a time interval [start, end] across IST calendar days proportionally.
 * Returns array of { dateStr (YYYY-MM-DD), minutes }.
 */
export function splitIntervalByDay(start, end) {
    const results = [];
    if (!start || !end || start >= end) return results;

    let current = new Date(start.getTime());

    while (current < end) {
        // Format current in IST
        const istDateStr = current.toLocaleDateString('en-CA', { timeZone: DUTY_TIMEZONE });
        
        // Find next IST midnight boundary
        const nextMidnightUTC = new Date(current.getTime());
        nextMidnightUTC.setUTCDate(nextMidnightUTC.getUTCDate() + 1);
        nextMidnightUTC.setUTCHours(0, 0, 0, 0);

        // Compute IST day end boundary
        const istOffsetMs = 5.5 * 3600 * 1000;
        const dayEnd = new Date(new Date(istDateStr + 'T00:00:00.000+05:30').getTime() + 24 * 3600 * 1000);

        const segmentEnd = end < dayEnd ? end : dayEnd;
        const diffMs = Math.max(0, segmentEnd.getTime() - current.getTime());
        const mins = Math.round(diffMs / 60000);

        if (mins > 0) {
            results.push({ dateStr: istDateStr, minutes: mins });
        }

        current = segmentEnd;
    }

    return results;
}

/**
 * Calculates rolling 7-day active duty hours based strictly on order delivery trips (acceptance -> completion).
 */
export async function get7DayActiveHours(riderId) {
    if (!riderId) return { totalMinutes: 0, totalHours: 0, isCurrentlyOnTrip: false, dailyBreakdown: [] };
    const rId = new mongoose.Types.ObjectId(riderId);

    const { FoodOrder } = await import('../../orders/models/order.model.js');
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);

    // Prepare 7-day date buckets for IST
    const dailyMap = {};
    const dateList = [];

    for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 3600 * 1000);
        const dateStr = d.toLocaleDateString('en-CA', { timeZone: DUTY_TIMEZONE });
        const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: DUTY_TIMEZONE });
        if (!dailyMap[dateStr]) {
            dailyMap[dateStr] = { dateStr, dayLabel, minutes: 0, hours: 0 };
            dateList.push(dateStr);
        }
    }

    // 1. Fetch completed orders delivered by this rider in the last 7 days
    const completedOrders = await FoodOrder.find({
        $or: [
            { 'dispatch.deliveryPartnerId': rId },
            { 'dispatch.driverId': rId },
            { deliveryPartnerId: rId }
        ],
        orderStatus: { $in: ['delivered', 'completed'] },
        updatedAt: { $gte: sevenDaysAgo }
    }).select('createdAt updatedAt actualDeliveryTime dispatch statusHistory').lean();

    // 2. Fetch active order currently being delivered by this rider
    const activeOrder = await FoodOrder.findOne({
        $or: [
            { 'dispatch.deliveryPartnerId': rId },
            { 'dispatch.driverId': rId },
            { deliveryPartnerId: rId }
        ],
        orderStatus: { $in: ['accepted', 'processing', 'ready_for_pickup', 'reached_pickup', 'picked_up', 'reached_drop'] }
    }).select('createdAt updatedAt dispatch statusHistory').lean();

    // 3. Also fetch raw online duty sessions for complete comparison
    const dutySessions = await FoodDeliveryDutyLog.find({
        riderId: rId,
        $or: [
            { onlineAt: { $gte: sevenDaysAgo } },
            { status: 'OPEN' },
            { offlineAt: { $gte: sevenDaysAgo } }
        ]
    }).lean();

    let totalMinutes = 0;

    for (const order of completedOrders) {
        const acceptHistory = order.statusHistory?.find(h => ['accepted', 'processing', 'picked_up'].includes(h.to));
        const tripStart = order.dispatch?.acceptedAt || order.dispatch?.assignedAt || acceptHistory?.at || order.createdAt;
        const tripEnd = order.actualDeliveryTime || order.updatedAt;

        if (tripStart && tripEnd && tripEnd > tripStart) {
            const start = new Date(Math.max(new Date(tripStart).getTime(), sevenDaysAgo.getTime()));
            const end = new Date(tripEnd);

            const segments = splitIntervalByDay(start, end);
            for (const seg of segments) {
                totalMinutes += seg.minutes;
                if (dailyMap[seg.dateStr]) {
                    dailyMap[seg.dateStr].minutes += seg.minutes;
                }
            }
        }
    }

    let isCurrentlyOnTrip = false;
    let currentSessionElapsedMinutes = 0;

    if (activeOrder) {
        isCurrentlyOnTrip = true;
        const acceptHistory = activeOrder.statusHistory?.find(h => ['accepted', 'processing', 'picked_up'].includes(h.to));
        const tripStart = activeOrder.dispatch?.acceptedAt || activeOrder.dispatch?.assignedAt || acceptHistory?.at || activeOrder.createdAt;

        if (tripStart) {
            const start = new Date(Math.max(new Date(tripStart).getTime(), sevenDaysAgo.getTime()));
            const end = now;
            currentSessionElapsedMinutes = Math.round(Math.max(0, end.getTime() - start.getTime()) / 60000);

            const segments = splitIntervalByDay(start, end);
            for (const seg of segments) {
                totalMinutes += seg.minutes;
                if (dailyMap[seg.dateStr]) {
                    dailyMap[seg.dateStr].minutes += seg.minutes;
                }
            }
        }
    }

    // Calculate total online minutes for reference
    let onlineMinutes = 0;
    for (const session of dutySessions) {
        const sStart = new Date(Math.max(session.onlineAt.getTime(), sevenDaysAgo.getTime()));
        const sEnd = session.offlineAt ? new Date(session.offlineAt.getTime()) : now;
        const diffMs = Math.max(0, sEnd.getTime() - sStart.getTime());
        onlineMinutes += Math.round(diffMs / 60000);
    }

    const dailyBreakdown = dateList.map((dStr) => {
        const mins = dailyMap[dStr].minutes;
        return {
            dateStr: dStr,
            dayLabel: dailyMap[dStr].dayLabel,
            minutes: mins,
            hours: Number((mins / 60).toFixed(1))
        };
    });

    const totalHours = Number((totalMinutes / 60).toFixed(1));
    const onlineHours = Number((onlineMinutes / 60).toFixed(1));

    return {
        totalMinutes,
        totalHours,
        onlineMinutes,
        onlineHours,
        isCurrentlyOnline: isCurrentlyOnTrip,
        isCurrentlyOnTrip,
        currentSessionElapsedMinutes,
        dailyBreakdown
    };
}
