import mongoose from 'mongoose';
import { CashbackRule } from '../models/cashbackRule.model.js';
import { CashbackLedger } from '../models/cashbackLedger.model.js';
import { creditCashbackToWallet } from '../../user/services/userWallet.service.js';
import { ValidationError } from '../../../../core/auth/errors.js';
import { logger } from '../../../../utils/logger.js';
import { notifyOwnerSafely } from '../../../../core/notifications/firebase.service.js';
import { appEvents, EVENTS } from '../../../../core/utils/events.js';

/**
 * Evaluates active cashback rules for an order and returns applicable rule & computed amount.
 */
export async function evaluateCashbackRule({
    restaurantId,
    userId,
    orderSubtotal,
    orderType = 'DELIVERY',
    hasCouponApplied = false
}) {
    if (!restaurantId || orderSubtotal <= 0) return null;

    const normalizedOrderType = String(orderType || 'DELIVERY').toUpperCase();
    const rId = mongoose.Types.ObjectId.isValid(restaurantId) ? new mongoose.Types.ObjectId(restaurantId) : null;
    const uId = userId && mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null;

    const now = new Date();

    // Query active cashback rules
    const query = {
        isActive: true,
        orderType: { $in: ['BOTH', normalizedOrderType] },
        minOrderValue: { $lte: orderSubtotal }
    };

    const rules = await CashbackRule.find(query).lean();
    if (!rules || rules.length === 0) return null;

    // Filter rules based on custom flags
    const validRules = [];
    for (const rule of rules) {
        // Date range check
        if (rule.validFrom && new Date(rule.validFrom) > now) continue;
        if (rule.validUntil && new Date(rule.validUntil) < now) continue;

        // Scope check
        if (rule.restaurantScope === 'SELECTED' || rule.restaurantScope === 'SPECIFIC') {
            const scopedIds = [
                ...(rule.restaurantId ? [String(rule.restaurantId)] : []),
                ...((rule.restaurantIds || []).map(id => String(id)))
            ];
            if (rId && !scopedIds.includes(String(rId))) continue;
        }

        // Stacking check
        if (hasCouponApplied && !rule.stackableWithCoupons) continue;

        // User Segment check
        if (rule.userSegment === 'NEW_USERS_ONLY' && uId) {
            const { FoodOrder } = await import('../../orders/models/order.model.js');
            const priorDeliveredCount = await FoodOrder.countDocuments({
                userId: uId,
                orderStatus: 'delivered'
            });
            if (priorDeliveredCount > 0) continue;
        } else if (rule.userSegment === 'SPECIFIC_USER_IDS') {
            const allowedUserIds = (rule.specificUserIds || []).map(id => String(id));
            if (!uId || !allowedUserIds.includes(String(uId))) continue;
        }

        // Active Days Of Week check
        if (Array.isArray(rule.activeDaysOfWeek) && rule.activeDaysOfWeek.length > 0) {
            if (!rule.activeDaysOfWeek.includes(now.getDay())) continue;
        }

        // Active Time Window check
        if (rule.activeTimeWindow && rule.activeTimeWindow.startHour !== null && rule.activeTimeWindow.endHour !== null) {
            const currentHour = now.getHours();
            const { startHour, endHour } = rule.activeTimeWindow;
            const inWindow = startHour <= endHour
                ? (currentHour >= startHour && currentHour <= endHour)
                : (currentHour >= startHour || currentHour <= endHour);
            if (!inWindow) continue;
        }

        // First Order Only for Restaurant check
        if (rule.firstOrderOnlyForRestaurant && uId && rId) {
            const { FoodOrder } = await import('../../orders/models/order.model.js');
            const priorRestaurantOrders = await FoodOrder.countDocuments({
                userId: uId,
                restaurantId: rId,
                orderStatus: 'delivered'
            });
            if (priorRestaurantOrders > 0) continue;
        }

        // Compute cashback value
        let amount = 0;
        if (rule.cashbackType === 'PERCENTAGE') {
            const raw = (orderSubtotal * Number(rule.cashbackValue)) / 100;
            const capped = rule.maxCashbackAmount ? Math.min(raw, Number(rule.maxCashbackAmount)) : raw;
            amount = Math.floor(Math.max(0, capped));
        } else {
            amount = Math.floor(Math.max(0, Number(rule.cashbackValue || 0)));
        }

        if (amount > 0) {
            validRules.push({ rule, amount });
        }
    }

    if (validRules.length === 0) return null;

    // Pick highest value rule
    validRules.sort((a, b) => b.amount - a.amount);
    return validRules[0];
}

/**
 * Creates PENDING CashbackLedger entry at order placement.
 */
export async function createPendingCashbackLedger({ orderId, userId, cashbackRuleId, couponId, sourceType, amount }) {
    if (!orderId || !userId || !amount || amount <= 0) return null;

    return CashbackLedger.create({
        userId: new mongoose.Types.ObjectId(userId),
        orderId: new mongoose.Types.ObjectId(orderId),
        sourceType: sourceType || (couponId ? 'COUPON' : 'RULE'),
        cashbackRuleId: cashbackRuleId ? new mongoose.Types.ObjectId(cashbackRuleId) : null,
        couponId: couponId ? new mongoose.Types.ObjectId(couponId) : null,
        amount,
        status: 'PENDING'
    });
}

/**
 * Transitions PENDING CashbackLedger entries for an order to CREDITED upon delivery.
 */
export async function creditPendingCashbackForOrder(orderId) {
    if (!orderId) return [];

    const rawStr = String(orderId || '').trim();
    let oId = mongoose.Types.ObjectId.isValid(rawStr) ? new mongoose.Types.ObjectId(rawStr) : null;
    let customOrderId = null;

    const { FoodOrder } = await import('../../orders/models/order.model.js');
    if (!oId) {
        const orderDoc = await FoodOrder.findOne({ orderId: rawStr }).select('_id orderId').lean();
        if (orderDoc?._id) {
            oId = orderDoc._id;
            customOrderId = orderDoc.orderId;
        }
    }

    const orderQueryConditions = [];
    if (oId) orderQueryConditions.push({ orderId: oId });
    if (rawStr) orderQueryConditions.push({ orderId: rawStr });
    if (customOrderId) orderQueryConditions.push({ orderId: customOrderId });

    const pendingLedgers = await CashbackLedger.find({
        $or: orderQueryConditions,
        status: 'PENDING'
    });

    if (!pendingLedgers || pendingLedgers.length === 0) return [];

    const results = [];
    for (const ledger of pendingLedgers) {
        // Atomic transition from PENDING -> CREDITED to prevent concurrent duplicate payouts
        const updatedLedger = await CashbackLedger.findOneAndUpdate(
            { _id: ledger._id, status: 'PENDING' },
            { $set: { status: 'CREDITED', creditedAt: new Date() } },
            { new: true }
        );
        if (!updatedLedger) {
            // Already credited by a concurrent request
            continue;
        }

        let expiryDays = 60;
        if (ledger.cashbackRuleId) {
            const rule = await CashbackRule.findById(ledger.cashbackRuleId).lean();
            if (rule?.expiryDays) expiryDays = rule.expiryDays;
        } else if (ledger.couponId) {
            const { Coupon } = await import('../models/coupon.model.js');
            const coupon = await Coupon.findById(ledger.couponId).lean();
            if (coupon?.expiryDays) expiryDays = coupon.expiryDays;
        }

        const description = `Cashback earned on Order #${orderId}`;
        const walletResult = await creditCashbackToWallet(
            ledger.userId,
            ledger.amount,
            expiryDays,
            orderId,
            description
        );

        logger.info(`[CASHBACK] Credited ₹${ledger.amount} cashback to user ${ledger.userId} for order ${orderId}`);

        // Notify user via push
        void notifyOwnerSafely(
            { ownerType: 'USER', ownerId: String(ledger.userId) },
            {
                title: 'Cashback Earned! 🎉',
                body: `You earned ₹${ledger.amount} cashback on your order! Valid for ${expiryDays} days.`,
                data: { type: 'cashback_earned', amount: String(ledger.amount), orderId: String(orderId) }
            }
        );

        results.push({ ledger, walletResult });
    }

    return results;
}

/**
 * Reverses CREDITED / PENDING cashback entries if an order is cancelled/refunded.
 */
export async function reverseCashbackForOrder(orderId, reason = 'Order cancelled / refunded') {
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) return [];

    const oId = new mongoose.Types.ObjectId(orderId);
    const ledgers = await CashbackLedger.find({ orderId: oId, status: { $in: ['PENDING', 'CREDITED'] } });

    if (!ledgers || ledgers.length === 0) return [];

    const { WalletLedgerEntry } = await import('../../user/models/walletLedgerEntry.model.js');

    const results = [];
    for (const ledger of ledgers) {
        const wasCredited = ledger.status === 'CREDITED';
        ledger.status = 'REVERSED';
        ledger.reversedAt = new Date();
        ledger.reversalReason = reason;
        await ledger.save();

        if (wasCredited) {
            // Deduct promotional cashback from user wallet ledger (can make promotional balance negative)
            await WalletLedgerEntry.create({
                userId: ledger.userId,
                entryType: 'EXPIRY_DEDUCTION',
                sourceType: 'PROMOTIONAL',
                amount: -Math.abs(ledger.amount),
                originalAmount: ledger.amount,
                remainingAmount: 0,
                status: 'EXPIRED',
                relatedOrderId: oId,
                description: `Cashback reversed for Order #${orderId}: ${reason}`
            });
            logger.info(`[CASHBACK] Reversed ₹${ledger.amount} cashback for user ${ledger.userId} on order ${orderId}`);
        }
        results.push(ledger);
    }

    return results;
}

export async function createCashbackRule(data, adminId = null) {
    const {
        name,
        restaurantScope,
        restaurantId,
        restaurantIds,
        orderType,
        minOrderValue,
        cashbackType,
        cashbackValue,
        maxCashbackAmount,
        expiryDays,
        stackableWithCoupons,
        userSegment,
        specificUserIds,
        activeDaysOfWeek,
        activeTimeWindow,
        firstOrderOnlyForRestaurant,
        validFrom,
        validUntil
    } = data;

    if (!cashbackValue || Number(cashbackValue) <= 0) {
        throw new ValidationError('Cashback value must be greater than 0');
    }

    const scope = String(restaurantScope || 'ALL').toUpperCase();
    let rId = null;
    let rIds = [];
    if (scope === 'SELECTED' || scope === 'SPECIFIC') {
        if (restaurantId && mongoose.Types.ObjectId.isValid(restaurantId)) {
            rId = new mongoose.Types.ObjectId(restaurantId);
        }
        if (Array.isArray(restaurantIds)) {
            rIds = restaurantIds.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id));
        }
        if (!rId && rIds.length === 0) {
            throw new ValidationError('At least one valid restaurant is required for SELECTED scope');
        }
    }

    const rule = await CashbackRule.create({
        name: name || 'Cashback Offer',
        restaurantScope: scope,
        restaurantId: rId,
        restaurantIds: rIds,
        orderType: String(orderType || 'BOTH').toUpperCase(),
        minOrderValue: Number(minOrderValue || 0),
        cashbackType: String(cashbackType || 'PERCENTAGE').toUpperCase(),
        cashbackValue: Number(cashbackValue),
        maxCashbackAmount: maxCashbackAmount != null ? Number(maxCashbackAmount) : null,
        expiryDays: Number(expiryDays || 60),
        stackableWithCoupons: Boolean(stackableWithCoupons),
        userSegment: userSegment || 'ALL',
        specificUserIds: Array.isArray(specificUserIds) ? specificUserIds.filter(id => mongoose.Types.ObjectId.isValid(id)) : [],
        activeDaysOfWeek: Array.isArray(activeDaysOfWeek) ? activeDaysOfWeek : [],
        activeTimeWindow: activeTimeWindow || null,
        firstOrderOnlyForRestaurant: Boolean(firstOrderOnlyForRestaurant),
        validFrom: validFrom ? new Date(validFrom) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
        isActive: true,
        createdBy: adminId && mongoose.Types.ObjectId.isValid(adminId) ? new mongoose.Types.ObjectId(adminId) : null
    });

    return rule;
}

export async function getCashbackRules(filter = {}) {
    const query = { isActive: true };
    if (filter.restaurantScope) query.restaurantScope = filter.restaurantScope.toUpperCase();
    if (filter.restaurantId && mongoose.Types.ObjectId.isValid(filter.restaurantId)) {
        query.$or = [
            { restaurantId: new mongoose.Types.ObjectId(filter.restaurantId) },
            { restaurantIds: new mongoose.Types.ObjectId(filter.restaurantId) }
        ];
    }
    if (filter.includeInactive === 'true') {
        delete query.isActive;
    }

    return CashbackRule.find(query).populate('restaurantId', 'restaurantName').populate('restaurantIds', 'restaurantName').sort({ createdAt: -1 }).lean();
}

export async function updateCashbackRule(ruleId, updates) {
    if (!ruleId || !mongoose.Types.ObjectId.isValid(ruleId)) {
        throw new ValidationError('Valid rule ID is required');
    }
    const rule = await CashbackRule.findById(ruleId);
    if (!rule) throw new ValidationError('Cashback rule not found');

    if (updates.name !== undefined) rule.name = updates.name;
    if (updates.restaurantScope !== undefined) rule.restaurantScope = updates.restaurantScope.toUpperCase();
    if (updates.restaurantId !== undefined) rule.restaurantId = updates.restaurantId && mongoose.Types.ObjectId.isValid(updates.restaurantId) ? new mongoose.Types.ObjectId(updates.restaurantId) : null;
    if (Array.isArray(updates.restaurantIds)) rule.restaurantIds = updates.restaurantIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (updates.orderType !== undefined) rule.orderType = updates.orderType.toUpperCase();
    if (updates.minOrderValue !== undefined) rule.minOrderValue = Number(updates.minOrderValue);
    if (updates.cashbackType !== undefined) rule.cashbackType = updates.cashbackType.toUpperCase();
    if (updates.cashbackValue !== undefined) rule.cashbackValue = Number(updates.cashbackValue);
    if (updates.maxCashbackAmount !== undefined) rule.maxCashbackAmount = updates.maxCashbackAmount != null ? Number(updates.maxCashbackAmount) : null;
    if (updates.expiryDays !== undefined) rule.expiryDays = Number(updates.expiryDays);
    if (updates.stackableWithCoupons !== undefined) rule.stackableWithCoupons = Boolean(updates.stackableWithCoupons);
    if (updates.userSegment !== undefined) rule.userSegment = updates.userSegment;
    if (Array.isArray(updates.specificUserIds)) rule.specificUserIds = updates.specificUserIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (Array.isArray(updates.activeDaysOfWeek)) rule.activeDaysOfWeek = updates.activeDaysOfWeek;
    if (updates.activeTimeWindow !== undefined) rule.activeTimeWindow = updates.activeTimeWindow;
    if (updates.firstOrderOnlyForRestaurant !== undefined) rule.firstOrderOnlyForRestaurant = Boolean(updates.firstOrderOnlyForRestaurant);
    if (updates.validFrom !== undefined) rule.validFrom = updates.validFrom ? new Date(updates.validFrom) : null;
    if (updates.validUntil !== undefined) rule.validUntil = updates.validUntil ? new Date(updates.validUntil) : null;
    if (updates.isActive !== undefined) rule.isActive = Boolean(updates.isActive);

    await rule.save();
    return rule;
}

/**
 * Delete or deactivate cashback rule
 */
export async function deleteCashbackRule(ruleId) {
    if (!ruleId || !mongoose.Types.ObjectId.isValid(ruleId)) {
        throw new ValidationError('Valid rule ID is required');
    }
    const rule = await CashbackRule.findById(ruleId);
    if (!rule) throw new ValidationError('Cashback rule not found');

    const ledgerCount = await CashbackLedger.countDocuments({ cashbackRuleId: rule._id });
    if (ledgerCount === 0) {
        await CashbackRule.findByIdAndDelete(ruleId);
    } else {
        rule.isActive = false;
        await rule.save();
    }

    return { success: true };
}

// Auto-register order completion hook to credit cashback
appEvents.on(EVENTS.ORDER_COMPLETED, async (order) => {
    try {
        if (order?._id) {
            await creditPendingCashbackForOrder(order._id);
        }
    } catch (err) {
        logger.error(`[CASHBACK] Error crediting cashback for order ${order?._id}: ${err?.message}`);
    }
});
