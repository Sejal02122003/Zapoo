import mongoose from 'mongoose';
import { ItemDiscountRule } from '../models/itemDiscountRule.model.js';
import { ValidationError } from '../../../../core/auth/errors.js';

/**
 * Resolves the most specific active item-level discount rule for a line item.
 * Precedence hierarchy: MENU_ITEM > CATEGORY > RESTAURANT_WIDE
 */
export async function resolveItemDiscountRule({ restaurantId, menuItemId, categoryId, orderType = 'DELIVERY' }) {
    if (!restaurantId) return null;

    const rId = new mongoose.Types.ObjectId(restaurantId);
    const mId = menuItemId && mongoose.Types.ObjectId.isValid(menuItemId) ? new mongoose.Types.ObjectId(menuItemId) : null;
    const cId = categoryId && mongoose.Types.ObjectId.isValid(categoryId) ? new mongoose.Types.ObjectId(categoryId) : null;
    const now = new Date();
    const normalizedOrderType = String(orderType || 'DELIVERY').toUpperCase();

    const rules = await ItemDiscountRule.find({
        restaurantId: rId,
        isActive: true,
        $or: [{ orderType: 'ALL' }, { orderType: normalizedOrderType }],
        $and: [
            { $or: [{ effectiveFrom: null }, { effectiveFrom: { $lte: now } }] },
            { $or: [{ effectiveTill: null }, { effectiveTill: { $gte: now } }] }
        ]
    }).lean();

    if (!rules || !rules.length) return null;

    // 1. Try MENU_ITEM match
    if (mId) {
        const itemRule = rules.find(
            (r) => r.scope === 'MENU_ITEM' && String(r.targetId || '') === String(mId)
        );
        if (itemRule) return itemRule;
    }

    // 2. Try CATEGORY match
    if (cId) {
        const catRule = rules.find(
            (r) => r.scope === 'CATEGORY' && String(r.targetId || '') === String(cId)
        );
        if (catRule) return catRule;
    }

    // 3. Try RESTAURANT_WIDE match
    const restRule = rules.find((r) => r.scope === 'RESTAURANT_WIDE');
    if (restRule) return restRule;

    return null;
}

export async function createItemDiscountRule(data, adminId = null) {
    const { restaurantId, scope, targetId, targetName, orderType, discountType, discountValue, maxDiscountAmount, stackable, effectiveFrom, effectiveTill } = data;

    if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) {
        throw new ValidationError('Valid restaurantId is required');
    }
    if (!discountValue || Number(discountValue) <= 0) {
        throw new ValidationError('Discount value must be greater than 0');
    }

    const rule = await ItemDiscountRule.create({
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        scope: scope || 'RESTAURANT_WIDE',
        targetId: targetId && mongoose.Types.ObjectId.isValid(targetId) ? new mongoose.Types.ObjectId(targetId) : null,
        targetName: targetName || '',
        orderType: (orderType || 'ALL').toUpperCase(),
        discountType: (discountType || 'PERCENTAGE').toUpperCase(),
        discountValue: Number(discountValue),
        maxDiscountAmount: maxDiscountAmount != null ? Number(maxDiscountAmount) : null,
        stackable: stackable !== false,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : null,
        effectiveTill: effectiveTill ? new Date(effectiveTill) : null,
        createdBy: adminId && mongoose.Types.ObjectId.isValid(adminId) ? new mongoose.Types.ObjectId(adminId) : null
    });

    return rule;
}

export async function getItemDiscountRules(restaurantId, filter = {}) {
    const query = {};
    if (restaurantId && mongoose.Types.ObjectId.isValid(restaurantId)) {
        query.restaurantId = new mongoose.Types.ObjectId(restaurantId);
    }
    if (filter.scope) query.scope = filter.scope;
    if (filter.isActive !== undefined) query.isActive = Boolean(filter.isActive);

    return ItemDiscountRule.find(query).sort({ createdAt: -1 }).lean();
}

export async function updateItemDiscountRule(ruleId, updates) {
    if (!ruleId || !mongoose.Types.ObjectId.isValid(ruleId)) {
        throw new ValidationError('Valid rule ID is required');
    }

    const rule = await ItemDiscountRule.findById(ruleId);
    if (!rule) throw new ValidationError('Item discount rule not found');

    if (updates.discountValue !== undefined) rule.discountValue = Number(updates.discountValue);
    if (updates.maxDiscountAmount !== undefined) rule.maxDiscountAmount = updates.maxDiscountAmount != null ? Number(updates.maxDiscountAmount) : null;
    if (updates.orderType !== undefined) rule.orderType = String(updates.orderType).toUpperCase();
    if (updates.discountType !== undefined) rule.discountType = String(updates.discountType).toUpperCase();
    if (updates.scope !== undefined) rule.scope = updates.scope;
    if (updates.targetId !== undefined) rule.targetId = updates.targetId && mongoose.Types.ObjectId.isValid(updates.targetId) ? new mongoose.Types.ObjectId(updates.targetId) : null;
    if (updates.targetName !== undefined) rule.targetName = updates.targetName;
    if (updates.stackable !== undefined) rule.stackable = Boolean(updates.stackable);
    if (updates.effectiveFrom !== undefined) rule.effectiveFrom = updates.effectiveFrom ? new Date(updates.effectiveFrom) : null;
    if (updates.effectiveTill !== undefined) rule.effectiveTill = updates.effectiveTill ? new Date(updates.effectiveTill) : null;
    if (updates.isActive !== undefined) rule.isActive = Boolean(updates.isActive);

    await rule.save();
    return rule;
}

export async function deleteItemDiscountRule(ruleId) {
    if (!ruleId || !mongoose.Types.ObjectId.isValid(ruleId)) {
        throw new ValidationError('Valid rule ID is required');
    }
    await ItemDiscountRule.findByIdAndDelete(ruleId);
    return { success: true };
}
