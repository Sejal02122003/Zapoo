import mongoose from 'mongoose';
import { FoodOrder, FoodSettings } from '../models/order.model.js';
import { FoodRestaurant } from '../../restaurant/models/restaurant.model.js';
import { FoodDeliveryPartner } from '../../delivery/models/deliveryPartner.model.js';
import { FoodDeliveryCashDeposit } from '../../delivery/models/foodDeliveryCashDeposit.model.js';
import { FoodDeliveryCashLimit } from '../../admin/models/deliveryCashLimit.model.js';
import { FoodFeeSettings } from '../../admin/models/feeSettings.model.js';
import { ValidationError, NotFoundError } from '../../../../core/auth/errors.js';
import { logger } from '../../../../utils/logger.js';
import { config } from '../../../../config/env.js';
import { getIO, rooms } from '../../../../config/socket.js';
import { addOrderJob } from '../../../../queues/producers/order.producer.js';
import { getVehicleRangeConfigs, filterRidersByVehicleRange } from '../../delivery/services/riderEligibility.service.js';
import {
  buildDeliverySocketPayload,
  buildOrderIdentityFilter,
  haversineKm,
  notifyOwnerSafely,
  notifyOwnersSafely,
} from './order.helpers.js';

// ── Batched Notification Helper ──
// Splits large target arrays into chunks of BATCH_SIZE and yields
// the event loop between each batch (via setImmediate) so the server
// doesn't freeze when notifying hundreds of riders at once.
const NOTIFICATION_BATCH_SIZE = 50;

async function batchedNotifyOwnersSafely(targets, payload) {
  if (!Array.isArray(targets) || targets.length === 0) return;

  for (let i = 0; i < targets.length; i += NOTIFICATION_BATCH_SIZE) {
    const chunk = targets.slice(i, i + NOTIFICATION_BATCH_SIZE);
    await notifyOwnersSafely(chunk, payload);

    // Yield the event loop between batches so other requests can be processed
    if (i + NOTIFICATION_BATCH_SIZE < targets.length) {
      await new Promise((resolve) => setImmediate(resolve));
    }
  }
}

async function filterPartnersByCashLimit(partners = [], options = {}) {
  // Since we are removing cash limit checks, we simply map partners to ensure they have expected shape.
  // We allow all partners to bypass cash limit.
  if (!Array.isArray(partners) || partners.length === 0) return [];

  return partners.map((p) => ({
    ...p,
    availableCashLimit: Number.MAX_SAFE_INTEGER,
    allowOverLimit: true,
    requiredCashForOrder: 0,
  }));
}

async function listNearbyOnlineDeliveryPartners(
  restaurantId,
  { maxKm = 25, limit = 50, requiredAmount = 0, allowOverLimitFallback = true, fallbackToAll = false } = {},
) {
  const rId = (restaurantId?._id || restaurantId).toString();
  const restaurant = await FoodRestaurant.findById(rId)
    .select("location zoneId")
    .lean();

  if (!restaurant) {
    logger.warn(`listNearbyOnlineDeliveryPartners: Restaurant ${rId} not found.`);
    return { restaurant: null, partners: [] };
  }

  const [rLng, rLat] = Array.isArray(restaurant.location?.coordinates) && restaurant.location.coordinates.length === 2
    ? restaurant.location.coordinates
    : [null, null];

  let picked = [];

  // 1. Try $geoNear if restaurant has valid GPS coordinates
  if (rLng != null && rLat != null) {
    try {
      const geoNearPipeline = [
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [rLng, rLat] },
            distanceField: 'distanceMeters',
            maxDistance: fallbackToAll ? 99999999 : (maxKm * 1000),
            spherical: true,
            query: {
              status: 'approved',
              $or: [
                { availabilityStatus: 'online' },
                { online: true }
              ],
              'lastLocation.coordinates': { $exists: true },
            },
          },
        },
        {
          $project: {
            _id: 1,
            status: 1,
            vehicleType: 1,
            distanceMeters: 1,
          },
        },
        { $sort: { distanceMeters: 1 } },
        { $limit: Math.max(1, limit * 2) },
      ];

      const rangeMap = await getVehicleRangeConfigs();
      const geoResults = await FoodDeliveryPartner.aggregate(geoNearPipeline);

      if (Array.isArray(geoResults) && geoResults.length > 0) {
        const eligibleResults = filterRidersByVehicleRange({
          partners: geoResults,
          deliveryDistanceKm: maxKm,
          rangeMap
        });

        picked = eligibleResults.slice(0, Math.max(1, limit)).map((p) => ({
          partnerId: p._id,
          distanceKm: Number((p.distanceMeters / 1000).toFixed(2)),
          status: p.status,
        }));
      }
    } catch (geoErr) {
      logger.warn(`[Dispatch] $geoNear failed, proceeding to fallback: ${geoErr.message}`);
    }
  }

  // 2. Comprehensive Fallback: If $geoNear returned 0 or failed, fetch all online approved riders
  if (picked.length === 0) {
    try {
      const allOnline = await FoodDeliveryPartner.find({
        status: 'approved',
        $or: [
          { availabilityStatus: 'online' },
          { online: true }
        ]
      })
        .select('_id status lastLat lastLng lastLocation vehicleType zoneId')
        .lean();

      const scored = [];
      for (const p of allOnline) {
        const lat = p.lastLat != null ? p.lastLat : p.lastLocation?.coordinates?.[1];
        const lng = p.lastLng != null ? p.lastLng : p.lastLocation?.coordinates?.[0];

        let d = 0;
        if (rLat != null && rLng != null && lat != null && lng != null) {
          d = haversineKm(rLat, rLng, lat, lng);
        }

        if (!Number.isFinite(d)) d = 0;

        // Allow all online riders in search range, or all available if fallback
        if (d <= maxKm || fallbackToAll || scored.length === 0) {
          scored.push({ partnerId: p._id, distanceKm: Number(d.toFixed(2)), status: p.status });
        }
      }

      scored.sort((a, b) => a.distanceKm - b.distanceKm);
      picked = scored.slice(0, Math.max(1, limit));
    } catch (fallbackErr) {
      logger.error(`[Dispatch] Fallback rider lookup error: ${fallbackErr.message}`);
    }
  }

  if (picked.length === 0) {
    logger.info(`[Dispatch] No online approved delivery partners found in area.`);
    return { partners: [] };
  }

  // GHOST-ASSIGNMENT FIX: Exclude riders who currently have an ACTIVE accepted order
  let busyPartnerIds = new Set();
  try {
    const activeOrderDocs = await FoodOrder.find({
      'dispatch.status': 'accepted',
      orderStatus: { $in: ['confirmed', 'preparing', 'ready_for_pickup', 'picked_up'] },
      createdAt: { $gte: new Date(Date.now() - 1 * 60 * 60 * 1000) }
    }).select('dispatch.deliveryPartnerId').lean();

    for (const doc of activeOrderDocs) {
      if (doc?.dispatch?.deliveryPartnerId) {
        busyPartnerIds.add(doc.dispatch.deliveryPartnerId.toString());
      }
    }

    if (busyPartnerIds.size > 0) {
      logger.info(`[Dispatch] Excluding ${busyPartnerIds.size} busy rider(s) from new order notification.`);
    }
  } catch (err) {
    logger.warn(`[Dispatch] Could not fetch busy riders: ${err.message}. Proceeding without exclusion.`);
    busyPartnerIds = new Set();
  }

  const final = picked.filter(p => !busyPartnerIds.has(p.partnerId.toString()));

  const cashEligibleFinal = await filterPartnersByCashLimit(final, {
    requiredAmount,
    allowOverLimitFallback,
  });

  return { partners: cashEligibleFinal };
}

export async function getDispatchSettings() {
  return { dispatchMode: "auto" };
}

export async function updateDispatchSettings(dispatchMode, adminId) {
  // Always set to auto
  await FoodSettings.findOneAndUpdate(
    { key: "dispatch" },
    {
      $set: {
        dispatchMode: "auto",
        updatedBy: { role: "ADMIN", adminId, at: new Date() },
      },
    },
    { upsert: true, new: true },
  );
  return getDispatchSettings();
}

export async function tryAutoAssign(orderId, options = {}) {
  const attempt = options.attempt || 1;
  const lockTimeout = 20000; // 20 seconds lock interval

  const dispatchableStatuses = new Set([
    'confirmed',
    'preparing',
    'ready_for_pickup',
    'ready',
    'picked_up',
  ]);

  const order = await FoodOrder.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(orderId),
      orderType: 'delivery',
      orderStatus: { $in: Array.from(dispatchableStatuses) },
      $or: [
        { 'dispatch.status': 'unassigned' },
        {
          'dispatch.status': 'assigned',
          'dispatch.acceptedAt': { $exists: false },
          'dispatch.assignedAt': { $lt: new Date(Date.now() - lockTimeout) }
        }
      ],
      'dispatch.dispatchingAt': { $exists: false }
    },
    {
      $set: { 'dispatch.dispatchingAt': new Date() }
    },
    { new: true }
  ).populate(['restaurantId', 'userId']);

  if (!order) {
    logger.info(`tryAutoAssign: Skip for ${orderId} (not dispatchable, already dispatching, accepted, or multi-attempt lock active).`);
    return null;
  }

  try {
    const offeredIds = (order.dispatch?.offeredTo || []).map(o => o.partnerId.toString());
    const paymentMethod = String(order.payment?.method || 'cash').toLowerCase();
    const isCashOrder = paymentMethod === 'cash';
    const requiredAmount = isCashOrder ? Number(order?.pricing?.total || 0) : 0;

    // RADIUS EXPANSION LOGIC
    const feeSettings = await FoodFeeSettings.findOne({ isActive: true }).lean();
    let radiusTiers = feeSettings?.dispatchRadiusTiers || [];
    if (!radiusTiers.length) {
      radiusTiers = [10, 15, 20, 25, 30]; // sensible default radius tiers (min 10km)
    }
    const maxKm = radiusTiers[Math.min(attempt - 1, radiusTiers.length - 1)] || 15;

    const isPhase2 = attempt >= 3;

    const searchOptions = {
      maxKm,
      limit: 10000,
      requiredAmount: 0,
      allowOverLimitFallback: true,
      fallbackToAll: isPhase2,
    };
    const { partners } = await listNearbyOnlineDeliveryPartners(order.restaurantId, searchOptions);

    const isPhase3 = attempt >= 6;

    if (isPhase3) {
      logger.error(`[CRITICAL] Order ${order._id} unassigned for ${attempt} attempts. Triggering Admin Alert.`);
      try {
        await notifyOwnersSafely(
          [{ ownerType: 'ADMIN', ownerId: 'GLOBAL' }],
          {
            title: '⚠️ Unassigned Order Alert!',
            body: `Order #${order.order_id || order._id} has not been picked up by any delivery partner yet.`,
            sound: 'alert',
            priority: 'high',
            data: { type: 'admin_alert_unassigned', orderId: order._id.toString() }
          }
        );
      } catch (err) {
        logger.warn(`Admin notification failed: ${err.message}`);
      }
    }

    const eligible = partners.filter(p => !offeredIds.includes(p.partnerId.toString()));

    if (eligible.length === 0) {
      logger.info(`tryAutoAssign: Re-broadcasting order ${order._id} to all ${partners.length} online partner(s)...`);

      const io = getIO();
      if (io && partners.length > 0) {
        const payload = buildDeliverySocketPayload(order, order.restaurantId);
        for (const p of partners) {
          const roomName = rooms.delivery(p.partnerId);
          io.to(roomName).emit('new_order_available', { ...payload, pickupDistanceKm: p.distanceKm });
          io.to(roomName).emit('play_notification_sound', { orderId: order._id.toString(), ...payload });
        }
        io.to('all_delivery').emit('new_order_available', payload);

        const reNotifyList = partners.map(p => ({
          ownerType: 'DELIVERY_PARTNER',
          ownerId: p.partnerId,
        }));
        try {
          await batchedNotifyOwnersSafely(
            reNotifyList,
            {
              title: '🚴 New Order Available!',
              body: `Order #${order.order_id || order._id} is waiting for delivery. Accept now!`,
              sound: 'alert',
              priority: 'high',
              androidChannelId: 'high_importance_channel',
              data: {
                type: 'new_order',
                orderId: order._id.toString(),
                orderMongoId: order._id.toString(),
                restaurantName: order.restaurantId?.restaurantName || '',
                targetUrl: '/food/delivery',
                link: '/food/delivery',
                click_action: '/food/delivery',
              },
            },
          );
        } catch (err) {
          logger.warn(`Re-broadcast push notifications failed: ${err.message}`);
        }
      }

      // Re-queue itself in 20s
      await addOrderJob({
        action: 'DISPATCH_TIMEOUT_CHECK',
        orderMongoId: order._id.toString(),
        orderId: order._id.toString(),
        attempt: attempt + 1
      }, { delay: 20000 });

      return order;
    }

    const io = getIO();
    const payload = buildDeliverySocketPayload(order, order.restaurantId);

    const phase1Batch = eligible;

    logger.info(`[Dispatch] Offering order ${order._id} to ${eligible.length} online delivery partner(s)...`);

    for (const p of eligible) {
      const roomName = rooms.delivery(p.partnerId);
      if (io) {
        const eventPayload = { ...payload, pickupDistanceKm: p.distanceKm };
        io.to(roomName).emit('new_order_available', eventPayload);
        io.to(roomName).emit('play_notification_sound', { orderId: order._id.toString(), ...eventPayload });
      }
    }
    if (io) {
      io.to('all_delivery').emit('new_order_available', payload);
    }

    // High Priority Push Notification with Sound & Alarm Ring
    const notifyList = eligible.map(p => ({
      ownerType: 'DELIVERY_PARTNER',
      ownerId: p.partnerId,
    }));

    try {
      await batchedNotifyOwnersSafely(
        notifyList,
        {
          title: '🚴 New Order Waiting!',
          body: `Order #${order.order_id || order._id} from ${order.restaurantId?.restaurantName || 'Restaurant'} is waiting for pickup. Accept now!`,
          sound: 'alert',
          priority: 'high',
          androidChannelId: 'high_importance_channel',
          data: {
            type: 'new_order',
            orderId: order._id.toString(),
            orderMongoId: order._id.toString(),
            restaurantName: order.restaurantId?.restaurantName || '',
            targetUrl: '/food/delivery',
            link: '/food/delivery',
            click_action: '/food/delivery',
          },
        },
      );
    } catch (err) {
      logger.warn(`Push notifications failed for batch: ${err.message}`);
    }

    const partnersToRecord = eligible;
    const offeredToEntries = partnersToRecord.map(p => ({
      partnerId: p.partnerId,
      at: new Date(),
      action: 'offered',
      allowOverLimit: Boolean(p.allowOverLimit),
      requiredCashForOrder: Number(p.requiredCashForOrder || requiredAmount || 0),
    }));

    order.dispatch.status = 'unassigned';
    order.dispatch.deliveryPartnerId = null;
    order.dispatch.offeredTo.push(...offeredToEntries);
    await order.save();

    // Re-check in 20s
    await addOrderJob({
      action: 'DISPATCH_TIMEOUT_CHECK',
      orderMongoId: order._id.toString(),
      orderId: order._id.toString(),
      attempt: attempt + 1
    }, { delay: 20000 });

    return order;
  } finally {
    await FoodOrder.findByIdAndUpdate(orderId, {
      $unset: { 'dispatch.dispatchingAt': '' },
    });
  }
}


export async function processDispatchTimeout(orderId, partnerId, options = {}) {
  const order = await FoodOrder.findById(orderId);
  if (!order) return;

  const stillAssigned = order.dispatch?.status === 'assigned' &&
    String(order.dispatch?.deliveryPartnerId) === String(partnerId) &&
    !order.dispatch?.acceptedAt;

  if (stillAssigned) {
    logger.info(`Dispatch timeout for partner ${partnerId} on order ${orderId}. Re-trying hunt...`);
    const offer = order.dispatch.offeredTo.find(
      o => String(o.partnerId) === String(partnerId) && o.action === 'offered'
    );
    if (offer) offer.action = 'timeout';

    order.dispatch.status = 'unassigned';
    order.dispatch.deliveryPartnerId = null;
    await order.save();

    const attempt = options.attempt || (order.dispatch?.offeredTo?.length || 0) + 1;
    await tryAutoAssign(orderId, { attempt });
  } else if (order.dispatch?.status === 'unassigned') {
    // If it's already unassigned (e.g. from a previous timeout), just keep hunting
    const attempt = options.attempt || (order.dispatch?.offeredTo?.length || 0) + 1;
    await tryAutoAssign(orderId, { attempt });
  }
}


export async function resendDeliveryNotificationRestaurant(orderId, restaurantId) {
  const identity = buildOrderIdentityFilter(orderId);
  const order = await FoodOrder.findOne({
    ...identity,
    restaurantId: new mongoose.Types.ObjectId(restaurantId),
  });

  if (!order) throw new NotFoundError('Order not found');
  if (order.orderType === 'takeaway') throw new ValidationError('Cannot dispatch delivery for takeaway orders');

  const activeStatuses = ['confirmed', 'preparing', 'ready_for_pickup', 'ready'];
  if (!activeStatuses.includes(order.orderStatus)) {
    throw new ValidationError(`Cannot resend notification for order in status: ${order.orderStatus}`);
  }

  if (order.dispatch?.status === 'accepted') {
    throw new ValidationError('A delivery partner has already accepted this order.');
  }

  const paymentMethod = String(order.payment?.method || 'cash').toLowerCase();
  const requiredAmount = paymentMethod === 'cash' ? Number(order?.pricing?.total || 0) : 0;
  const preview = await listNearbyOnlineDeliveryPartners(order.restaurantId, {
    maxKm: 15,
    limit: 10000, // No artificial limit
    requiredAmount,
    allowOverLimitFallback: true,
  });
  const shortlistedCount = Array.isArray(preview?.partners) ? preview.partners.length : 0;

  order.dispatch.status = 'unassigned';
  order.dispatch.deliveryPartnerId = null;
  order.dispatch.offeredTo = [];
  await order.save();

  await tryAutoAssign(order._id);

  const refreshed = await FoodOrder.findById(order._id)
    .select('dispatch.offeredTo dispatch.status dispatch.deliveryPartnerId')
    .lean();
  const notifiedCount = Array.isArray(refreshed?.dispatch?.offeredTo)
    ? refreshed.dispatch.offeredTo.filter((entry) => entry?.action === 'offered').length
    : 0;
  const notifiedPartnerIds = Array.isArray(refreshed?.dispatch?.offeredTo)
    ? refreshed.dispatch.offeredTo
      .filter((entry) => entry?.action === 'offered' && entry?.partnerId)
      .map((entry) => String(entry.partnerId))
    : [];
  const io = getIO();
  const connectedSocketCount = io
    ? notifiedPartnerIds.reduce((count, pid) => {
      const roomName = rooms.delivery(pid);
      const roomSize = io?.sockets?.adapter?.rooms?.get(roomName)?.size || 0;
      return count + roomSize;
    }, 0)
    : 0;

  return {
    success: true,
    notifiedCount,
    shortlistedCount,
    requiredAmount,
    connectedSocketCount,
    dispatchStatus: refreshed?.dispatch?.status || 'unassigned',
  };
}
