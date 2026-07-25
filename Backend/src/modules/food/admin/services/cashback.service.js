import mongoose from 'mongoose';
import { CashbackRule } from '../models/cashbackRule.model.js';
import { creditCashbackToWallet } from '../../user/services/userWallet.service.js';
import { ValidationError } from '../../../../core/auth/errors.js';
import { logger } from '../../../../utils/logger.js';
import { notifyOwnerSafely } from '../../../../core/notifications/firebase.service.js';
import { appEvents, EVENTS } from '../../../../core/utils/events.js';

/**
 * Single resolver function for finding the applicable cashback rule for an order.
 * Precedence: Restaurant-Specific Override > Global Default Rule
 */
export async function resolveCashbackRule(restaurantId, orderType = 'DELIVERY') {
    const normalizedOrderType = String(orderType || 'DELIVERY').toUpperCase();
    const rId = restaurantId && mongoose.Types.ObjectId.isValid(restaurantId) ? new mongoose.Types.ObjectId(restaurantId) : null;

    // 1. Try restaurant-specific rule first (override)
    if (rId) {
        const specificRule = await CashbackRule.findOne({
            restaurantScope: 'SELECTED',
            restaurantId: rId,
            isActive: true,
            orderType: { $in: ['BOTH', normalizedOrderType] }
        }).lean();

        if (specificRule) return specificRule;
    }

    // 2. Fallback to global rule
    const globalRule = await CashbackRule.findOne({
        restaurantScope: 'ALL',
        isActive: true,
        orderType: { $in: ['BOTH', normalizedOrderType] }
    }).lean();

    return globalRule || null;
}

/**
 * Evaluates completed order for cashback eligibility and credits user wallet.
 */
export async function evaluateAndCreditCashback(order) {
    if (!order || !order.userId) return null;

    const restaurantId = order.restaurantId || order.restaurant?.id || order.restaurant?._id;
    const orderType = String(order.orderType || 'DELIVERY').toUpperCase();
    const subtotal = Number(order.pricing?.subtotal || order.subtotal || 0);

    const rule = await resolveCashbackRule(restaurantId, orderType);
    if (!rule) return null;

    if (subtotal < Number(rule.minOrderValue || 0)) {
        return null;
    }

    let cashbackAmount = 0;
    if (rule.cashbackType === 'PERCENTAGE') {
        const raw = subtotal * (Number(rule.cashbackValue) / 100);
        const capped = rule.maxCashbackAmount ? Math.min(raw, Number(rule.maxCashbackAmount)) : raw;
        cashbackAmount = Math.floor(Math.max(0, capped));
    } else {
        cashbackAmount = Math.floor(Math.max(0, Number(rule.cashbackValue || 0)));
    }

    if (cashbackAmount <= 0) return null;

    const expiryDays = Number(rule.expiryDays || 60);
    const description = `Cashback earned on Order #${order.order_id || order._id}`;

    const result = await creditCashbackToWallet(
        order.userId,
        cashbackAmount,
        expiryDays,
        order._id,
        description
    );

    logger.info(`[CASHBACK] Credited ₹${cashbackAmount} cashback (valid ${expiryDays} days) to user ${order.userId} for order ${order._id}`);

    // Notify user via push
    void notifyOwnerSafely(
        { ownerType: 'USER', ownerId: String(order.userId) },
        {
            title: 'Cashback Earned! 🎉',
            body: `You earned ₹${cashbackAmount} cashback on your order! Valid for ${expiryDays} days.`,
            data: { type: 'cashback_earned', amount: String(cashbackAmount), orderId: String(order._id) }
        }
    );

    return { cashbackAmount, expiryDays, result };
}

export async function createCashbackRule(data, adminId = null) {
    const { name, restaurantScope, restaurantId, orderType, minOrderValue, cashbackType, cashbackValue, maxCashbackAmount, expiryDays } = data;

    if (!cashbackValue || Number(cashbackValue) <= 0) {
        throw new ValidationError('Cashback value must be greater than 0');
    }

    const scope = String(restaurantScope || 'ALL').toUpperCase();
    let rId = null;
    if (scope === 'SELECTED') {
        if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) {
            throw new ValidationError('Valid restaurantId is required for SELECTED restaurantScope');
        }
        rId = new mongoose.Types.ObjectId(restaurantId);
    }

    const rule = await CashbackRule.create({
        name: name || 'Cashback Offer',
        restaurantScope: scope,
        restaurantId: rId,
        orderType: String(orderType || 'BOTH').toUpperCase(),
        minOrderValue: Number(minOrderValue || 0),
        cashbackType: String(cashbackType || 'PERCENTAGE').toUpperCase(),
        cashbackValue: Number(cashbackValue),
        maxCashbackAmount: maxCashbackAmount != null ? Number(maxCashbackAmount) : null,
        expiryDays: Number(expiryDays || 60),
        isActive: true,
        createdBy: adminId && mongoose.Types.ObjectId.isValid(adminId) ? new mongoose.Types.ObjectId(adminId) : null
    });

    return rule;
}

export async function getCashbackRules(filter = {}) {
    const query = {};
    if (filter.restaurantScope) query.restaurantScope = filter.restaurantScope.toUpperCase();
    if (filter.restaurantId && mongoose.Types.ObjectId.isValid(filter.restaurantId)) {
        query.restaurantId = new mongoose.Types.ObjectId(filter.restaurantId);
    }
    if (filter.isActive !== undefined) query.isActive = Boolean(filter.isActive);

    return CashbackRule.find(query).sort({ createdAt: -1 }).lean();
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
    if (updates.orderType !== undefined) rule.orderType = updates.orderType.toUpperCase();
    if (updates.minOrderValue !== undefined) rule.minOrderValue = Number(updates.minOrderValue);
    if (updates.cashbackType !== undefined) rule.cashbackType = updates.cashbackType.toUpperCase();
    if (updates.cashbackValue !== undefined) rule.cashbackValue = Number(updates.cashbackValue);
    if (updates.maxCashbackAmount !== undefined) rule.maxCashbackAmount = updates.maxDiscountAmount != null ? Number(updates.maxDiscountAmount) : null;
    if (updates.expiryDays !== undefined) rule.expiryDays = Number(updates.expiryDays);
    if (updates.isActive !== undefined) rule.isActive = Boolean(updates.isActive);

    await rule.save();
    return rule;
}

export async function deleteCashbackRule(ruleId) {
    if (!ruleId || !mongoose.Types.ObjectId.isValid(ruleId)) {
        throw new ValidationError('Valid rule ID is required');
    }
    await CashbackRule.findByIdAndDelete(ruleId);
    return { success: true };
}

// Auto-register order completion hook
appEvents.on(EVENTS.ORDER_COMPLETED, async (order) => {
    try {
        await evaluateAndCreditCashback(order);
    } catch (err) {
        logger.error(`[CASHBACK] Error evaluating cashback for order ${order?._id}: ${err?.message}`);
    }
});

