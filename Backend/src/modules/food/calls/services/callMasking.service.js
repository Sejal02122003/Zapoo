import { config } from '../../../../config/env.js';
import { FoodOrder } from '../../orders/models/order.model.js';
import { FoodCallLog } from '../models/callLog.model.js';
import { FoodDeliveryPartner } from '../../delivery/models/deliveryPartner.model.js';
import { FoodRestaurant } from '../../restaurant/models/restaurant.model.js';
import { FoodUser } from '../../../../core/users/user.model.js';
import logger from '../../../../utils/logger.js';

/**
 * Format Indian phone number for Exotel REST API.
 * Exotel in India standard format: '0XXXXXXXXXX' or '91XXXXXXXXXX'.
 * We standardize to '0' + 10-digit mobile number (e.g., '09876543210').
 */
export function formatExotelPhone(phone) {
    if (!phone) return null;
    let digits = String(phone).replace(/\D/g, '');
    
    // If starting with 91 and 12 digits, strip 91 -> 10 digits
    if (digits.length === 12 && digits.startsWith('91')) {
        digits = digits.slice(2);
    } else if (digits.length === 11 && digits.startsWith('0')) {
        digits = digits.slice(1);
    } else if (digits.length === 13 && digits.startsWith('091')) {
        digits = digits.slice(3);
    }

    if (digits.length === 10) {
        return `0${digits}`;
    }
    
    // Fallback: return formatted digits with leading 0 if 10+ digits
    return digits.length >= 10 ? `0${digits.slice(-10)}` : digits;
}

/**
 * Mask phone number for display / privacy (e.g., '+91 98******10')
 */
export function maskPhoneNumber(phone) {
    if (!phone) return 'XXXXXXXXXX';
    const digits = String(phone).replace(/\D/g, '');
    if (digits.length <= 4) return '****';
    const last10 = digits.slice(-10);
    return `+91 ${last10.slice(0, 2)}******${last10.slice(-2)}`;
}

/**
 * Clean phone to pure 10 digits for local comparison
 */
function cleanPhone10(phone) {
    if (!phone) return '';
    const digits = String(phone).replace(/\D/g, '');
    return digits.length >= 10 ? digits.slice(-10) : digits;
}

/**
 * Check if Exotel call masking is configured and ready.
 */
export function isCallMaskingConfigured() {
    return Boolean(
        config.callMaskingEnabled &&
        config.exotelApiKey &&
        config.exotelApiToken &&
        config.exotelSid &&
        config.exotelVirtualNumbers &&
        config.exotelVirtualNumbers.length > 0
    );
}

/**
 * Initiate an Exotel Call Bridge between Caller and Callee on an active order.
 *
 * @param {Object} params
 * @param {string} params.orderId - Mongo ID or display Order ID
 * @param {Object} params.callerUser - Authenticated user object { _id, role, phone }
 * @param {string} params.targetRole - 'rider' | 'customer' | 'restaurant'
 * @param {string} [params.customCallerPhone] - Optional override
 */
export async function initiateMaskedCall({ orderId, callerUser, targetRole, customCallerPhone }) {
    if (!orderId) {
        throw new Error('Order ID is required to initiate call');
    }
    if (!targetRole) {
        throw new Error('Target role (rider, customer, restaurant) is required');
    }

    // Normalize target role
    let normalizedTarget = String(targetRole).toLowerCase().trim();
    if (normalizedTarget === 'delivery_partner' || normalizedTarget === 'deliverypartner') {
        normalizedTarget = 'rider';
    } else if (normalizedTarget === 'user') {
        normalizedTarget = 'customer';
    }

    // Find the order
    let order = null;
    if (orderId.match(/^[0-9a-fA-F]{24}$/)) {
        order = await FoodOrder.findById(orderId)
            .populate('userId', 'name phone')
            .populate('deliveryPartner', 'fullName name phone')
            .populate('restaurantId', 'restaurantName phone ownerPhone location')
            .lean();
    }
    if (!order) {
        order = await FoodOrder.findOne({ orderId })
            .populate('userId', 'name phone')
            .populate('deliveryPartner', 'fullName name phone')
            .populate('restaurantId', 'restaurantName phone ownerPhone location')
            .lean();
    }

    if (!order) {
        throw new Error(`Order #${orderId} not found`);
    }

    // Determine Caller and Callee details
    let callerPhone = customCallerPhone || callerUser.phone;
    let callerRole = callerUser.role || 'USER';
    let callerModel = 'FoodUser';
    let callerId = callerUser._id;

    if (callerRole === 'DELIVERY_PARTNER') callerModel = 'FoodDeliveryPartner';
    else if (callerRole === 'RESTAURANT') callerModel = 'FoodRestaurant';
    else if (['ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN'].includes(callerRole)) callerModel = 'FoodAdmin';

    let calleePhone = '';
    let calleeRole = '';
    let calleeModel = '';
    let calleeId = null;

    // If caller didn't have phone attached in req.user, resolve from order
    if (!callerPhone) {
        if (callerRole === 'USER') {
            callerPhone = order.customerPhone || order.deliveryAddress?.phone || order.userId?.phone;
        } else if (callerRole === 'DELIVERY_PARTNER') {
            callerPhone = order.deliveryPartner?.phone;
        } else if (callerRole === 'RESTAURANT') {
            callerPhone = order.restaurantId?.phone || order.restaurantId?.ownerPhone;
        }
    }

    // Resolve Callee based on normalizedTarget
    if (normalizedTarget === 'rider') {
        calleeRole = 'DELIVERY_PARTNER';
        calleeModel = 'FoodDeliveryPartner';
        calleeId = order.deliveryPartner?._id || order.deliveryPartnerId;
        calleePhone = order.deliveryPartner?.phone;

        // If not populated, lookup delivery partner directly
        if (!calleePhone && calleeId) {
            const dp = await FoodDeliveryPartner.findById(calleeId).select('phone').lean();
            calleePhone = dp?.phone;
        }
    } else if (normalizedTarget === 'restaurant') {
        calleeRole = 'RESTAURANT';
        calleeModel = 'FoodRestaurant';
        calleeId = order.restaurantId?._id || order.restaurantId;
        calleePhone = order.restaurantId?.phone || order.restaurantId?.ownerPhone;

        if (!calleePhone && calleeId) {
            const rest = await FoodRestaurant.findById(calleeId).select('phone ownerPhone').lean();
            calleePhone = rest?.phone || rest?.ownerPhone;
        }
    } else if (normalizedTarget === 'customer') {
        calleeRole = 'USER';
        calleeModel = 'FoodUser';
        calleeId = order.userId?._id || order.userId;
        calleePhone = order.customerPhone || order.deliveryAddress?.phone || order.userId?.phone;

        if (!calleePhone && calleeId) {
            const u = await FoodUser.findById(calleeId).select('phone').lean();
            calleePhone = u?.phone;
        }
    } else {
        throw new Error(`Unsupported target role: ${targetRole}`);
    }

    if (!callerPhone || cleanPhone10(callerPhone).length < 10) {
        throw new Error('Your registered phone number is missing or invalid. Please update your profile phone number.');
    }

    if (!calleePhone || cleanPhone10(calleePhone).length < 10) {
        throw new Error(`The phone number for the ${normalizedTarget} is currently unavailable for this order.`);
    }

    // Check if Call Masking / Exotel is enabled & configured
    if (!isCallMaskingConfigured()) {
        logger.warn('[CallMasking] Exotel Call Masking is not enabled or credentials are incomplete.');
        return {
            success: false,
            fallbackToDirect: true,
            message: 'Call masking is not active. Please use direct call.',
            directPhone: calleePhone,
            targetRole: normalizedTarget
        };
    }

    // Pick virtual number
    const virtualNumber = config.exotelVirtualNumbers[0];
    const fromFormatted = formatExotelPhone(callerPhone);
    const toFormatted = formatExotelPhone(calleePhone);

    logger.info(`[CallMasking] Initiating Exotel bridge: From=${fromFormatted} (${callerRole}) -> To=${toFormatted} (${calleeRole}) via VN=${virtualNumber} for Order=${order._id}`);

    // Exotel Connect API call
    const authHeader = `Basic ${Buffer.from(`${config.exotelApiKey}:${config.exotelApiToken}`).toString('base64')}`;
    const exotelSubdomain = config.exotelSubdomain || 'api';
    const exotelUrl = `https://${exotelSubdomain}.exotel.com/v1/Accounts/${config.exotelSid}/Calls/connect.json`;

    const statusCallbackUrl = `${config.exotelStatusCallbackBaseUrl}/api/v1/food/calls/callback`;

    const formParams = new URLSearchParams();
    formParams.append('From', fromFormatted);
    formParams.append('To', toFormatted);
    formParams.append('CallerId', virtualNumber);
    formParams.append('CallType', 'trans');
    formParams.append('TimeLimit', '1800'); // 30 minutes max call duration
    formParams.append('TimeOut', '45'); // 45s ringing timeout for caller leg
    formParams.append('StatusCallback', statusCallbackUrl);
    formParams.append('StatusCallbackEvents[0]', 'terminal');
    formParams.append('CustomField', JSON.stringify({ orderId: String(order._id), targetRole: normalizedTarget }));

    try {
        const response = await fetch(exotelUrl, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formParams.toString()
        });

        const responseText = await response.text();
        let responseJson = null;
        try {
            responseJson = JSON.parse(responseText);
        } catch (_err) {
            responseJson = { raw: responseText };
        }

        if (!response.ok) {
            logger.error(`[CallMasking] Exotel API failed HTTP ${response.status}: ${responseText}`);
            const errorMsg = responseJson?.RestException?.Message || responseJson?.message || 'Failed to initiate secure call with Exotel.';
            return {
                success: false,
                fallbackToDirect: true,
                message: errorMsg,
                directPhone: calleePhone,
                targetRole: normalizedTarget
            };
        }

        const callData = responseJson?.Call || {};
        const callSid = callData.Sid || callData.sid || `EXO_${Date.now()}`;

        // Save Call Log in MongoDB
        const callLog = await FoodCallLog.create({
            orderId: order._id,
            callerRole,
            callerId,
            callerModel,
            callerPhoneMasked: maskPhoneNumber(callerPhone),
            callerPhoneRaw: callerPhone,
            calleeRole,
            calleeId,
            calleeModel,
            calleePhoneMasked: maskPhoneNumber(calleePhone),
            calleePhoneRaw: calleePhone,
            targetRole: normalizedTarget,
            virtualNumber,
            callSid,
            status: 'initiated',
            exotelDetails: responseJson
        });

        logger.info(`[CallMasking] Exotel call initiated successfully: CallSid=${callSid}, LogId=${callLog._id}`);

        return {
            success: true,
            message: `Connecting secure call via Zapoo Masking. Exotel is dialing your phone (${maskPhoneNumber(callerPhone)}) from ${virtualNumber}. Please answer to connect.`,
            callSid,
            virtualNumber,
            callerPhoneMasked: maskPhoneNumber(callerPhone),
            calleePhoneMasked: maskPhoneNumber(calleePhone),
            targetRole: normalizedTarget
        };
    } catch (err) {
        logger.error(`[CallMasking] Network error connecting to Exotel: ${err.message}`, err);
        return {
            success: false,
            fallbackToDirect: true,
            message: `Could not connect to call service (${err.message}).`,
            directPhone: calleePhone,
            targetRole: normalizedTarget
        };
    }
}

/**
 * Handle Exotel Status Callback (Webhook).
 */
export async function handleExotelCallback(payload) {
    const callSid = payload.CallSid || payload.Sid;
    const status = payload.Status || payload.CallStatus;
    const duration = Number(payload.Duration || payload.DialCallDuration || 0);
    const recordingUrl = payload.RecordingUrl || null;

    logger.info(`[CallMasking Webhook] Received Exotel callback for CallSid=${callSid}, Status=${status}, Duration=${duration}`);

    if (!callSid) {
        return { success: false, message: 'CallSid missing' };
    }

    let mappedStatus = 'completed';
    const s = String(status).toLowerCase();
    if (s.includes('busy')) mappedStatus = 'busy';
    else if (s.includes('no-answer') || s.includes('noanswer')) mappedStatus = 'no-answer';
    else if (s.includes('failed')) mappedStatus = 'failed';
    else if (s.includes('canceled') || s.includes('cancelled')) mappedStatus = 'canceled';
    else if (s.includes('in-progress') || s.includes('in_progress')) mappedStatus = 'in-progress';
    else if (s.includes('ringing')) mappedStatus = 'ringing';
    else if (s.includes('completed')) mappedStatus = 'completed';

    const updated = await FoodCallLog.findOneAndUpdate(
        { callSid },
        {
            $set: {
                status: mappedStatus,
                duration,
                recordingUrl,
                exotelDetails: payload
            }
        },
        { new: true }
    );

    return { success: true, updated: Boolean(updated) };
}

/**
 * Handle Exotel Inbound Passthrough (When someone calls the virtual number directly).
 */
export async function handleExotelPassthru(query) {
    const callerRaw = query.From || query.CallFrom || query.Caller;
    const callerClean = cleanPhone10(callerRaw);

    logger.info(`[CallMasking Passthru] Inbound call received from: ${callerRaw} (clean: ${callerClean})`);

    if (!callerClean || callerClean.length < 10) {
        return { action: 'hangup', message: 'Unknown caller' };
    }

    // Find the most recent active order involving this phone number
    const activeOrder = await FoodOrder.findOne({
        $or: [
            { customerPhone: { $regex: callerClean } },
            { 'deliveryAddress.phone': { $regex: callerClean } }
        ],
        orderStatus: { $in: ['created', 'pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'picked_up', 'arrived'] }
    })
        .populate('deliveryPartner', 'phone')
        .populate('restaurantId', 'phone ownerPhone')
        .sort({ createdAt: -1 })
        .lean();

    if (activeOrder) {
        // Customer called -> route to Delivery Partner or Restaurant
        const destination = activeOrder.deliveryPartner?.phone || activeOrder.restaurantId?.phone || activeOrder.restaurantId?.ownerPhone;
        if (destination) {
            return {
                action: 'dial',
                destination: formatExotelPhone(destination),
                orderId: activeOrder._id
            };
        }
    }

    // Check if caller is a Delivery Partner
    const dp = await FoodDeliveryPartner.findOne({ phone: { $regex: callerClean } }).lean();
    if (dp) {
        const dpActiveOrder = await FoodOrder.findOne({
            deliveryPartner: dp._id,
            orderStatus: { $in: ['accepted', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'picked_up', 'arrived'] }
        })
            .sort({ createdAt: -1 })
            .lean();

        if (dpActiveOrder) {
            const customerPhone = dpActiveOrder.customerPhone || dpActiveOrder.deliveryAddress?.phone;
            if (customerPhone) {
                return {
                    action: 'dial',
                    destination: formatExotelPhone(customerPhone),
                    orderId: dpActiveOrder._id
                };
            }
        }
    }

    return { action: 'hangup', message: 'No active order found for this caller' };
}
