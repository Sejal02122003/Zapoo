import mongoose from 'mongoose';
import { logger } from '../../../../utils/logger.js';
import {
  sendNotificationToOwner,
  sendNotificationToOwners,
} from "../../../../core/notifications/firebase.service.js";
import { getIO, rooms } from '../../../../config/socket.js';
import { addOrderJob } from '../../../../queues/producers/order.producer.js';

export function enqueueOrderEvent(action, payload = {}) {
  try {
    void addOrderJob({ action, ...payload }).catch((err) => {
      logger.warn(`BullMQ enqueue order event failed: ${action} - ${err?.message || err}`);
    });
  } catch (err) {
    logger.warn(`BullMQ enqueue order event failed (sync): ${action} - ${err?.message || err}`);
  }
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c) * 1.35; // Apply routing multiplier for road distance approximation
}

export function generateFourDigitDeliveryOtp() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function sanitizeOrderForExternal(orderDoc) {
  const o = orderDoc?.toObject ? orderDoc.toObject() : { ...(orderDoc || {}) };
  delete o.deliveryOtp;
  delete o.pickupOtp;
  const dv = o.deliveryVerification;
  if (dv) {
    const d = dv.dropOtp || {};
    const p = dv.pickupOtp || {};
    o.deliveryVerification = {
      ...dv,
      dropOtp: {
        required: Boolean(d.required),
        verified: Boolean(d.verified),
      },
      pickupOtp: {
        required: Boolean(p.required !== false),
        verified: Boolean(p.verified),
      }
    };
  }
  const method = String(o.payment?.method || o.paymentMethod || 'cash').toLowerCase();
  const status = String(o.payment?.status || '').toLowerCase();
  const isPaid = status === 'paid' || method === 'wallet' || (method === 'razorpay' && status === 'paid');
  const walletUsed = Number(o.pricing?.walletAmountUsed || 0);
  const totalAmount = Number(o.pricing?.total || o.total || 0);
  const fallbackDue = Math.max(0, totalAmount - walletUsed);
  const due = isPaid ? 0 : (o.payment?.amountDue != null ? Number(o.payment.amountDue) : fallbackDue);
  if (o.payment) {
    if (isPaid) {
      o.payment.status = 'paid';
      o.payment.amountDue = 0;
    } else {
      o.payment.amountDue = due;
    }
  }
  o.amountDue = due;
  o.collectAmount = due;
  o.orderMongoId = (o._id || orderDoc?._id || "").toString();
  // Ensure orderId field for UI always contains the pretty ID
  o.orderId = o.order_id || o.orderMongoId; 
  return o;
}

export function emitDeliveryDropOtpToUser(order, plainOtp) {
  try {
    const io = getIO();
    if (!io || !plainOtp || !order?.userId) return;
    io.to(rooms.user(order.userId)).emit("delivery_drop_otp", {
      orderMongoId: order._id?.toString?.(),
      orderId: order.order_id || order._id?.toString?.(),
      otp: plainOtp,
      message:
        "Share this OTP with your delivery partner to hand over the order.",
    });
  } catch (e) {
    logger.warn(`emitDeliveryDropOtpToUser failed: ${e?.message || e}`);
  }
}

export async function notifyOwnersSafely(targets, payload) {
  try {
    await sendNotificationToOwners(targets, payload);
  } catch (error) {
    logger.warn(`FCM notification failed: ${error?.message || error}`);
  }
}

export async function notifyOwnerSafely(target, payload) {
  try {
    await sendNotificationToOwner({ ...target, payload });
  } catch (error) {
    logger.warn(`FCM notification failed: ${error?.message || error}`);
  }
}

export function buildOrderIdentityFilter(orderIdOrMongoId) {
  const raw = String(orderIdOrMongoId || "").trim();
  if (!raw) return null;
  if (mongoose.isValidObjectId(raw)) {
    return {
      $or: [
        { _id: new mongoose.Types.ObjectId(raw) },
        { order_id: raw },
        { orderId: raw }
      ]
    };
  }
  
  // Search BOTH underscore and camelCase variants for robust lookup
  return { 
    $or: [
        { order_id: raw },
        { orderId: raw }
    ]
  };
}

export function toGeoPoint(lat, lng) {
  if (lat == null || lng == null) return undefined;
  const a = Number(lat);
  const b = Number(lng);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return undefined;
  return { type: "Point", coordinates: [b, a] };
}

export function pushStatusHistory(order, { byRole, byId, from, to, note = "" }) {
  order.statusHistory.push({
    at: new Date(),
    byRole,
    byId: byId || undefined,
    from,
    to,
    note,
  });
}

export function normalizeOrderForClient(orderDoc) {
  const order = orderDoc?.toObject ? orderDoc.toObject() : orderDoc || {};
  const mongoId = (order._id || orderDoc?._id || "").toString();
  const displayId = order.order_id || order.orderId || mongoId;
  const orderStatus = String(order?.orderStatus || order?.status || "").toLowerCase();
  const isCancelled = orderStatus.includes('cancel') || orderStatus === 'dead';
  const paymentMethod = String(order?.payment?.method || order?.paymentMethod || "").toLowerCase();
  const paymentStatusRaw = String(order?.payment?.status || "").toLowerCase();
  const hasRazorpayId = !!(order?.payment?.razorpay_payment_id || order?.payment?.razorpayPaymentId || order?.payment?.razorpay?.paymentId);
  const isPaid = ["paid", "authorized", "captured", "settled"].includes(paymentStatusRaw) || (hasRazorpayId && paymentStatusRaw !== "failed");
  const isRefunded = paymentStatusRaw === "refunded" || order?.payment?.refund?.status === "processed";

  let clientPaymentStatus = order?.paymentStatus || order?.payment?.status || "pending";
  if (isRefunded) {
    clientPaymentStatus = "refunded";
  } else if (isCancelled) {
    clientPaymentStatus = isPaid ? (isRefunded ? "refunded" : "paid") : "cancelled";
  } else if (isPaid) {
    clientPaymentStatus = "paid";
  } else if (paymentStatusRaw === "failed") {
    clientPaymentStatus = "failed";
  } else if (orderStatus === "delivered" && (paymentMethod === "cash" || paymentMethod === "cod")) {
    clientPaymentStatus = "paid";
  }

  const cancelHistoryEntry = Array.isArray(order.statusHistory)
    ? [...order.statusHistory].reverse().find(h => String(h?.to || '').toLowerCase().includes('cancel'))
    : null;
  const cancellationReason = isCancelled 
    ? (cancelHistoryEntry?.note || order.cancellationReason || "")
    : null;

  const walletUsed = Number(order?.pricing?.walletAmountUsed || 0);
  const totalAmount = Number(order?.pricing?.total || order?.total || 0);
  const fallbackDue = Math.max(0, totalAmount - walletUsed);
  const due = isPaid ? 0 : (order?.payment?.amountDue != null ? Number(order.payment.amountDue) : fallbackDue);

  return {
    ...order,
    id: mongoId,
    _id: mongoId,
    orderMongoId: mongoId,
    orderId: displayId,
    status: order?.orderStatus || order?.status || "",
    payment: {
      ...(order?.payment || {}),
      status: clientPaymentStatus,
      amountDue: due,
    },
    paymentStatus: clientPaymentStatus,
    amountDue: due,
    collectAmount: due,
    deliveredAt:
      order?.deliveryState?.deliveredAt || order?.deliveredAt || null,
    deliveryPartnerId:
      order?.dispatch?.deliveryPartnerId || order?.deliveryPartnerId || null,
    rating: order?.ratings?.restaurant?.rating ?? order?.rating ?? null,
    restaurantNote: order?.restaurantNote || "",
    cancellationReason,
    deliveryState: {
      ...(order?.deliveryState || {}),
      currentLocation: order?.lastRiderLocation?.coordinates?.length >= 2 ? {
        lat: order.lastRiderLocation.coordinates[1],
        lng: order.lastRiderLocation.coordinates[0]
      } : (order?.deliveryState?.currentLocation || null)
    }
  };
}

export async function applyAggregateRating(model, entityId, newRating) {
  if (!entityId) return;
  const doc = await model.findById(entityId).select("rating totalRatings");
  if (!doc) return;

  const totalRatings = Number(doc.totalRatings || 0);
  const currentAverage = Number(doc.rating || 0);
  const nextTotal = totalRatings + 1;
  const nextAverage = Number(
    ((currentAverage * totalRatings + Number(newRating)) / nextTotal).toFixed(1),
  );

  doc.totalRatings = nextTotal;
  doc.rating = nextAverage;
  await doc.save();
}

export function buildDeliverySocketPayload(orderDoc, restaurantDoc = null) {
  const order = orderDoc?.toObject ? orderDoc.toObject() : orderDoc || {};
  const restaurant = restaurantDoc || order?.restaurantId || null;
  const restaurantLocation = restaurant?.location || {};
  const deliveryAddress = order?.deliveryAddress || {};
  const customerAddressParts = [
    deliveryAddress.street,
    deliveryAddress.additionalDetails,
    deliveryAddress.city,
    deliveryAddress.state,
    deliveryAddress.zipCode,
  ]
    .map((v) => String(v || '').trim())
    .filter(Boolean);

  const orderMongoId =
    orderDoc?._id?.toString?.() || order?._id?.toString?.() || order?._id;
  const displayOrderId = order?.order_id || orderMongoId;

  const method = String(order?.payment?.method || order?.paymentMethod || 'cash').toLowerCase();
  const status = String(order?.payment?.status || '').toLowerCase();
  const isPaid = status === 'paid' || method === 'wallet' || (method === 'razorpay' && status === 'paid');
  const walletUsed = Number(order?.pricing?.walletAmountUsed || 0);
  const totalAmount = Number(order?.pricing?.total || order?.total || 0);
  const fallbackDue = Math.max(0, totalAmount - walletUsed);
  const amountDue = isPaid ? 0 : (order?.payment?.amountDue != null ? Number(order.payment.amountDue) : fallbackDue);

  const paymentObj = {
    ...(order?.payment || {}),
    method,
    status: isPaid ? 'paid' : (order?.payment?.status || 'cod_pending'),
    amountDue,
  };

  return {
    _id: orderMongoId,
    orderMongoId,
    orderId: displayOrderId,
    status: orderDoc?.orderStatus || order?.orderStatus,
    items: order?.items || [],
    pricing: order?.pricing,
    total: order?.pricing?.total,
    payment: paymentObj,
    paymentMethod: method,
    isPrepaid: isPaid,
    collectAmount: isPaid ? 0 : amountDue,
    restaurantId:
      order?.restaurantId?._id?.toString?.() ||
      order?.restaurantId?.toString?.() ||
      order?.restaurantId,
    restaurantName: restaurant?.restaurantName || order?.restaurantName,
    restaurantAddress:
      restaurantLocation?.address ||
      restaurantLocation?.formattedAddress ||
      restaurant?.addressLine1 ||
      "",
    restaurantPhone: restaurant?.phone || "",
    restaurantLocation: {
      latitude: restaurantLocation?.latitude ?? (Array.isArray(restaurantLocation?.coordinates) ? restaurantLocation.coordinates[1] : undefined),
      longitude: restaurantLocation?.longitude ?? (Array.isArray(restaurantLocation?.coordinates) ? restaurantLocation.coordinates[0] : undefined),
      lat: restaurantLocation?.latitude ?? restaurantLocation?.lat ?? (Array.isArray(restaurantLocation?.coordinates) ? restaurantLocation.coordinates[1] : undefined),
      lng: restaurantLocation?.longitude ?? restaurantLocation?.lng ?? (Array.isArray(restaurantLocation?.coordinates) ? restaurantLocation.coordinates[0] : undefined),
      coordinates: Array.isArray(restaurantLocation?.coordinates) ? restaurantLocation.coordinates : undefined,
      address:
        restaurantLocation?.address ||
        restaurantLocation?.formattedAddress ||
        restaurant?.addressLine1 ||
        "",
      area: restaurantLocation?.area || restaurant?.area || "",
      city: restaurantLocation?.city || restaurant?.city || "",
      state: restaurantLocation?.state || restaurant?.state || "",
    },
    deliveryAddress: order?.deliveryAddress,
    customerAddress: customerAddressParts.length ? customerAddressParts.join(', ') : "",
    customerName: order?.customerName || order?.deliveryAddress?.fullName || order?.deliveryAddress?.name || order?.userId?.name || "",
    customerPhone: order?.customerPhone || order?.deliveryAddress?.phone || order?.userId?.phone || "",
    userName: order?.customerName || order?.deliveryAddress?.fullName || order?.deliveryAddress?.name || order?.userId?.name || "",
    userPhone: order?.customerPhone || order?.deliveryAddress?.phone || order?.userId?.phone || "",
    note: order?.note || "",
    riderEarning: order?.riderEarning || 0,
    deliveryBonusAmount: order?.deliveryBonusAmount || 0,
    earnings: order?.riderEarning || order?.pricing?.deliveryFee || 0,
    deliveryFee: order?.pricing?.deliveryFee || 0,
    deliveryFleet: order?.deliveryFleet,
    dispatch: order?.dispatch,
    createdAt: order?.createdAt,
    updatedAt: order?.updatedAt,
  };
}

export function canExposeOrderToRestaurant(orderLike) {
  if (!orderLike) return false;
  const method = String(orderLike?.payment?.method || "").toLowerCase();
  const status = String(orderLike?.payment?.status || "").toLowerCase();
  const orderStatus = String(orderLike?.orderStatus || "").toLowerCase();
  const orderType = String(orderLike?.orderType || "").toLowerCase();

  // If payment method is cash, cod, wallet, or pay_at_counter
  if (["cash", "cod", "wallet", "pay_at_counter"].includes(method)) return true;
  // If payment status is settled or cod_pending
  if (["paid", "authorized", "captured", "settled", "cod_pending"].includes(status)) return true;
  // If order is active
  if (["created", "pending", "confirmed", "preparing", "ready"].includes(orderStatus)) return true;
  if (orderType === 'takeaway') return true;

  // Only skip if explicitly awaiting online razorpay checkout initialization
  if (method === "razorpay" && status === "created") return false;

  return true;
}

export async function notifyRestaurantNewOrder(orderDoc) {
  try {
    if (!orderDoc || !canExposeOrderToRestaurant(orderDoc)) return;

    const io = getIO();
    const restId = String(orderDoc.restaurantId?._id || orderDoc.restaurantId || '').trim();
    const outletId = String(orderDoc.outletId?._id || orderDoc.outletId || '').trim();

    if (io && restId) {
      const rawDoc = typeof orderDoc.toObject === 'function' ? orderDoc.toObject() : orderDoc;
      const payload = {
        ...rawDoc,
        orderMongoId: rawDoc._id?.toString?.() || rawDoc.orderMongoId,
        orderId: rawDoc.order_id || rawDoc.orderId || rawDoc._id?.toString?.(),
      };
      logger.info(
        `[RestaurantOrders] Emitting new_order & play_notification_sound to restaurant:${restId} (outlet:${outletId || 'none'}) for order ${payload.orderId}`,
      );
      // Emit to named room and raw ID for parent restaurant
      io.to(rooms.restaurant(restId)).emit("new_order", payload);
      io.to(rooms.restaurant(restId)).emit("food:order:restaurant_new_order", payload);
      io.to(rooms.restaurant(restId)).emit("play_notification_sound", payload);
      io.to(`restaurant:${restId}`).emit("new_order", payload);
      io.to(`restaurant:${restId}`).emit("food:order:restaurant_new_order", payload);
      io.to(`restaurant:${restId}`).emit("play_notification_sound", payload);

      // Also emit directly to the specific outlet rooms if assigned
      if (outletId) {
        io.to(rooms.restaurant(outletId)).emit("new_order", payload);
        io.to(rooms.restaurant(outletId)).emit("food:order:restaurant_new_order", payload);
        io.to(rooms.restaurant(outletId)).emit("play_notification_sound", payload);
        io.to(`restaurant:${outletId}`).emit("new_order", payload);
        io.to(`restaurant:${outletId}`).emit("food:order:restaurant_new_order", payload);
        io.to(`restaurant:${outletId}`).emit("play_notification_sound", payload);
        io.to(`outlet:${outletId}`).emit("new_order", payload);
        io.to(`outlet:${outletId}`).emit("food:order:restaurant_new_order", payload);
        io.to(`outlet:${outletId}`).emit("play_notification_sound", payload);
      }
    }

    const notifyTargets = [];
    if (restId) notifyTargets.push({ ownerType: "RESTAURANT", ownerId: restId });
    if (outletId) notifyTargets.push({ ownerType: "RESTAURANT", ownerId: outletId });

    if (notifyTargets.length > 0) {
      await notifyOwnersSafely(
        notifyTargets,
        {
          title: "New order received! 🔔",
          body: `Order #${orderDoc.order_id || orderDoc._id} is waiting for review.`,
          sound: "alert.mp3",
          priority: "high",
          data: {
            type: "new_order",
            orderId: String(orderDoc._id || ''),
            orderMongoId: String(orderDoc._id || ''),
            link: `/food/restaurant/orders/${String(orderDoc._id || '')}`,
            targetUrl: `/food/restaurant/orders/${String(orderDoc._id || '')}`,
            click_action: `/food/restaurant/orders/${String(orderDoc._id || '')}`,
          },
        },
      );
    }
  } catch (err) {
    logger.warn(`Failed to send new order notification to restaurant: ${err?.message}`);
  }
}

export async function notifyUserNewOrder(orderDoc) {
  try {
    if (!orderDoc) return;
    const userId = orderDoc.userId?.toString?.() || orderDoc.userId;
    if (!userId) return;

    const io = getIO();
    const orderIdStr = String(orderDoc.order_id || orderDoc._id?.toString?.() || "");
    const orderMongoIdStr = String(orderDoc._id?.toString?.() || "");

    if (io) {
      const payload = {
        orderMongoId: orderMongoIdStr,
        orderId: orderIdStr,
        orderStatus: orderDoc.orderStatus || "pending",
        title: "Order Placed Successfully! 🎉",
        message: `Your order #${orderIdStr} has been placed successfully and sent to the restaurant.`,
      };
      logger.info(`[UserOrders] Emitting order_status_update to ${rooms.user(userId)} for order ${orderMongoIdStr}`);
      io.to(rooms.user(userId)).emit("order_status_update", payload);
      io.to(rooms.user(userId)).emit("order_placed", payload);
    }

    await notifyOwnersSafely(
      [{ ownerType: "USER", ownerId: userId }],
      {
        title: "Order Placed Successfully! 🎉",
        body: `Your order #${orderIdStr} has been placed successfully.`,
        data: {
          type: "order_placed",
          orderId: orderIdStr,
          orderMongoId: orderMongoIdStr,
          link: `/user/orders/${orderMongoIdStr}`,
          targetUrl: `/user/orders/${orderMongoIdStr}`,
          click_action: `/user/orders/${orderMongoIdStr}`,
        },
      },
    );
  } catch (err) {
    logger.warn(`[UserOrders] Failed to send user order creation notification: ${err?.message}`);
  }
}

export const STATUS_PRIORITY = {
  pending: 10,
  placed: 10,
  created: 10,
  confirmed: 20,
  preparing: 30,
  ready: 40,
  ready_for_pickup: 40,
  reached_pickup: 50,
  picked_up: 60,
  reached_drop: 70,
  delivered: 80,
  completed: 80,
  cancelled_by_user: 100,
  cancelled_by_restaurant: 100,
  cancelled_by_admin: 100,
  dead: 100,
};

/**
 * Returns true if the next status is a valid forward progression from the current status.
 * Prevents "reversing" order status (e.g. from Preparing back to Created).
 */
export function isStatusAdvance(current, next) {
  // If current status is missing, it's effectively 'created' or start of flow
  if (!current) return true;
  
  // Same status update (idempotent action like reaffirming confirmation) is allowed
  if (current === next) return true;
  
  const currentPrio = STATUS_PRIORITY[current] || 0;
  const nextPrio = STATUS_PRIORITY[next] || 0;

  // Terminal states (100) cannot transition to anything else
  if (currentPrio >= 100) return false;
  
  // Delivered (80) cannot transition to anything (except maybe cancellation if allowed, but here we say no)
  if (currentPrio === 80) return false;

  // Special case: Cancellation is almost always an advance unless already delivered
  if (nextPrio === 100 && currentPrio < 80) return true;

  return nextPrio >= currentPrio;
}
