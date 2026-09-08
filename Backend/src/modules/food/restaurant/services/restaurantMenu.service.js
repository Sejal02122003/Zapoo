import mongoose from 'mongoose';
import { ValidationError } from '../../../../core/auth/errors.js';
import { FoodRestaurant } from '../models/restaurant.model.js';
import { FoodItem } from '../../admin/models/food.model.js';
import { FoodCategory } from '../../admin/models/category.model.js';
import { ItemDiscountRule } from '../../admin/models/itemDiscountRule.model.js';
import { getFoodDisplayPrice, serializeFoodVariants } from '../../admin/services/foodVariant.service.js';

const buildMenuFromFoods = async (foods = []) => {
    const categoryIds = Array.from(
        new Set(
            (foods || [])
                .map((food) => {
                    const raw = food?.categoryId;
                    if (!raw) return '';
                    return String(raw);
                })
                .filter((value) => mongoose.Types.ObjectId.isValid(value))
        )
    );

    const restaurantIds = Array.from(
        new Set(
            (foods || [])
                .map((food) => (food?.restaurantId ? String(food.restaurantId) : ''))
                .filter((value) => mongoose.Types.ObjectId.isValid(value))
        )
    ).map((id) => new mongoose.Types.ObjectId(id));

    const now = new Date();
    const [categoryDocs, activeDiscountRules] = await Promise.all([
        categoryIds.length
            ? FoodCategory.find({ _id: { $in: categoryIds } })
                  .select('name image sortOrder')
                  .lean()
            : [],
        restaurantIds.length
            ? ItemDiscountRule.find({
                  restaurantId: { $in: restaurantIds },
                  isActive: true,
                  orderType: { $in: ['ALL', 'DELIVERY'] },
                  $and: [
                      { $or: [{ effectiveFrom: null }, { effectiveFrom: { $lte: now } }] },
                      { $or: [{ effectiveTill: null }, { effectiveTill: { $gte: now } }] }
                  ]
              }).lean()
            : []
    ]);

    const categoryMap = new Map(categoryDocs.map((doc) => [String(doc._id), doc]));

    const byCategory = new Map();
    for (const food of foods) {
        const categoryId = food?.categoryId ? String(food.categoryId) : '';
        const categoryDoc = categoryMap.get(categoryId) || null;
        const rawCategoryName = typeof categoryDoc?.name === 'string' ? categoryDoc.name : (typeof food?.categoryName === 'string' ? food.categoryName : (typeof food?.category === 'string' ? food.category : 'Menu'));
        const sectionName = String(rawCategoryName || 'Menu').trim() || 'Menu';
        const groupKey = categoryId || `name:${sectionName.toLowerCase()}`;

        const basePrice = getFoodDisplayPrice(food);
        
        let discountedPrice = basePrice;
        let discountPercentage = 0;
        let hasDiscount = false;

        let rule = null;
        if (activeDiscountRules.length > 0) {
            const fRestIdStr = String(food.restaurantId || '');
            const fFoodIdStr = String(food._id || '');
            const restRules = activeDiscountRules.filter((r) => String(r.restaurantId) === fRestIdStr);
            rule = restRules.find((r) => r.scope === 'MENU_ITEM' && String(r.targetId || '') === fFoodIdStr);
            if (!rule && categoryId) {
                rule = restRules.find((r) => r.scope === 'CATEGORY' && String(r.targetId || '') === categoryId);
            }
            if (!rule) {
                rule = restRules.find((r) => r.scope === 'RESTAURANT_WIDE');
            }
        }

        if (rule) {
            if (rule.discountType === 'PERCENTAGE') {
                discountPercentage = rule.discountValue;
                const raw = basePrice * (rule.discountValue / 100);
                const capped = rule.maxDiscountAmount ? Math.min(raw, rule.maxDiscountAmount) : raw;
                discountedPrice = Math.max(0, basePrice - capped);
            } else {
                discountedPrice = Math.max(0, basePrice - rule.discountValue);
                if (basePrice > 0) {
                    discountPercentage = Math.round(((basePrice - discountedPrice) / basePrice) * 100);
                }
            }
            hasDiscount = discountedPrice < basePrice;
        }

        if (!byCategory.has(groupKey)) {
            byCategory.set(groupKey, {
                id: categoryId || null,
                name: sectionName,
                image: categoryDoc?.image || '',
                sortOrder: Number.isFinite(Number(categoryDoc?.sortOrder)) ? Number(categoryDoc.sortOrder) : Number.MAX_SAFE_INTEGER,
                items: []
            });
        }

        byCategory.get(groupKey).items.push({
            id: String(food._id),
            _id: food._id,
            categoryId: categoryId || null,
            categoryName: sectionName,
            category: sectionName,
            name: food.name,
            description: food.description || '',
            price: discountedPrice,
            basePrice: basePrice,
            originalPrice: hasDiscount ? basePrice : null,
            discountedPrice: discountedPrice,
            discountPercentage: hasDiscount ? discountPercentage : 0,
            hasDiscount,
            offerText: hasDiscount ? `${discountPercentage}% OFF` : '',
            priceOnOtherPlatforms: food.priceOnOtherPlatforms || null,
            otherPlatformGst: food.otherPlatformGst ?? null,
            variants: serializeFoodVariants(food.variants),
            variations: serializeFoodVariants(food.variants),
            image: food.image || '',
            foodType: food.foodType || 'Non-Veg',
            isAvailable: food.isAvailable !== false,
            outOfStockUntil: food.isAvailable === false ? (food.outOfStockUntil || null) : null,
            stockTimingMode: food.isAvailable === false ? (food.stockTimingMode || 'manual') : 'none',
            stockTimingConfig: food.isAvailable === false ? (food.stockTimingConfig || null) : null,
            stockRule: food.isAvailable === false ? {
                mode: food.stockTimingMode || (food.outOfStockUntil ? 'specific-time' : 'manual'),
                resumeAt: food.outOfStockUntil ? new Date(food.outOfStockUntil).toISOString() : null,
                config: food.stockTimingConfig || null
            } : null,
            approvalStatus: food.approvalStatus || 'approved',
            rejectionReason: food.rejectionReason || '',
            requestedAt: food.requestedAt,
            approvedAt: food.approvedAt,
            rejectedAt: food.rejectedAt,
            preparationTime: food.preparationTime || '',
            createdAt: food.createdAt,
            updatedAt: food.updatedAt
        });
    }

    const orderedGroups = Array.from(byCategory.values()).sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return String(a.name || '').localeCompare(String(b.name || ''));
    });

    const sections = orderedGroups.map((group, idx) => ({
        id: group.id || `section-${idx}`,
        categoryId: group.id || null,
        name: group.name,
        image: group.image || '',
        sortOrder: Number.isFinite(Number(group.sortOrder)) ? Number(group.sortOrder) : 0,
        itemCount: group.items.length,
        items: group.items.sort((a, b) => {
            const at = new Date(a.createdAt || a.requestedAt || 0).getTime();
            const bt = new Date(b.createdAt || b.requestedAt || 0).getTime();
            return bt - at;
        }),
        subsections: []
    }));

    const categories = sections.map((section) => ({
        id: section.categoryId || section.id,
        categoryId: section.categoryId || null,
        name: section.name,
        image: section.image || '',
        sortOrder: section.sortOrder || 0,
        itemCount: section.itemCount || 0
    }));

    return { sections, categories };
};

export async function getRestaurantMenu(restaurantId) {
    if (!restaurantId || !mongoose.Types.ObjectId.isValid(String(restaurantId))) {
        throw new ValidationError('Invalid restaurant id');
    }
    const foods = await FoodItem.find({ restaurantId })
        .sort({ createdAt: -1 })
        .limit(5000)
        .lean();
    return buildMenuFromFoods(foods);
}

export async function updateRestaurantMenu(restaurantId, body = {}) {
    // Option A: single source of truth (food_items). Menu layout snapshots are disabled.
    // Keep endpoint for backward compatibility, but make it explicit.
    throw new ValidationError('Menu editing is disabled. Menu is generated from food items.');
}

export async function getPublicApprovedRestaurantMenu(restaurantIdOrSlug) {
    const value = String(restaurantIdOrSlug || '').trim();
    if (!value) throw new ValidationError('Restaurant id is required');

    let restaurant = null;
    if (/^[0-9a-fA-F]{24}$/.test(value)) {
        restaurant = await FoodRestaurant.findOne({ _id: value, status: 'approved' })
            .select('_id status')
            .lean();
    }
    
    if (!restaurant) {
        const normalizedHyphens = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const normalizedSpaces = value.toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ');
        const escapeRegexStr = (s) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

        restaurant = await FoodRestaurant.findOne({
            status: 'approved',
            $or: [
                { slug: value },
                { slug: normalizedHyphens },
                { restaurantNameNormalized: normalizedSpaces },
                { restaurantNameNormalized: normalizedHyphens },
                { restaurantNameNormalized: value.toLowerCase() },
                { restaurantName: { $regex: new RegExp(`^${escapeRegexStr(normalizedSpaces)}$`, 'i') } },
                { restaurantName: { $regex: new RegExp(`^${escapeRegexStr(value)}$`, 'i') } }
            ]
        })
            .select('_id status')
            .lean();
    }

    if (!restaurant?._id) {
        return null;
    }
    const foods = await FoodItem.find({
        $or: [
            { restaurantId: restaurant._id },
            { restaurantId: String(restaurant._id) }
        ],
        approvalStatus: 'approved'
    })
        .sort({ createdAt: -1 })
        .limit(2000)
        .lean();
    return buildMenuFromFoods(foods);
}

export async function syncMenuItemApprovalStatus(restaurantId, itemId, status, rejectionReason = '') {
    // No-op in Option A (menu snapshots removed). Approval status lives only in food_items.
    // Kept to avoid breaking admin approval flows that call this helper.
    return;
}
