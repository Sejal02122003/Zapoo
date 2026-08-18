import * as itemDiscountService from '../services/itemDiscount.service.js';
import * as cashbackService from '../services/cashback.service.js';
import { WalletLedgerEntry } from '../../user/models/walletLedgerEntry.model.js';
import { FoodAdminWallet } from '../models/adminWallet.model.js';
import { sendResponse } from '../../../../utils/response.js';
import { invalidateCache } from '../../../../middleware/cache.js';

// --- Item Discounts ---
export async function createItemDiscountRule(req, res, next) {
    try {
        const rule = await itemDiscountService.createItemDiscountRule(req.body, req.user?.userId);
        await invalidateCache('restaurant_menu:*');
        return sendResponse(res, 201, 'Item discount rule created successfully', rule);
    } catch (err) {
        next(err);
    }
}

export async function getItemDiscountRules(req, res, next) {
    try {
        const rules = await itemDiscountService.getItemDiscountRules(req.query.restaurantId, req.query);
        return sendResponse(res, 200, 'Item discount rules retrieved', rules);
    } catch (err) {
        next(err);
    }
}

export async function updateItemDiscountRule(req, res, next) {
    try {
        const rule = await itemDiscountService.updateItemDiscountRule(req.params.id, req.body);
        await invalidateCache('restaurant_menu:*');
        return sendResponse(res, 200, 'Item discount rule updated successfully', rule);
    } catch (err) {
        next(err);
    }
}

export async function deleteItemDiscountRule(req, res, next) {
    try {
        await itemDiscountService.deleteItemDiscountRule(req.params.id);
        await invalidateCache('restaurant_menu:*');
        return sendResponse(res, 200, 'Item discount rule deleted successfully');
    } catch (err) {
        next(err);
    }
}

// --- Cashback Rules ---
export async function createCashbackRule(req, res, next) {
    try {
        const rule = await cashbackService.createCashbackRule(req.body, req.user?.userId);
        return sendResponse(res, 201, 'Cashback rule created successfully', rule);
    } catch (err) {
        next(err);
    }
}

export async function getCashbackRules(req, res, next) {
    try {
        const rules = await cashbackService.getCashbackRules(req.query);
        return sendResponse(res, 200, 'Cashback rules retrieved', rules);
    } catch (err) {
        next(err);
    }
}

export async function updateCashbackRule(req, res, next) {
    try {
        const rule = await cashbackService.updateCashbackRule(req.params.id, req.body);
        return sendResponse(res, 200, 'Cashback rule updated successfully', rule);
    } catch (err) {
        next(err);
    }
}

export async function deleteCashbackRule(req, res, next) {
    try {
        await cashbackService.deleteCashbackRule(req.params.id);
        return sendResponse(res, 200, 'Cashback rule deleted successfully');
    } catch (err) {
        next(err);
    }
}

// --- Expiry Report ---
export async function getCashbackExpiryReport(req, res, next) {
    try {
        const expiredEntries = await WalletLedgerEntry.find({ entryType: 'EXPIRY_DEDUCTION' })
            .populate('userId', 'name email phone')
            .sort({ createdAt: -1 })
            .limit(200)
            .lean();

        const totalExpiredAgg = await WalletLedgerEntry.aggregate([
            { $match: { entryType: 'EXPIRY_DEDUCTION' } },
            { $group: { _id: null, totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]);

        const adminWallet = await FoodAdminWallet.findOne({ key: 'platform' }).lean();

        return sendResponse(res, 200, 'Cashback expiry report retrieved', {
            adminPlatformBalance: adminWallet?.balance || 0,
            totalExpiredAmount: Math.abs(totalExpiredAgg[0]?.totalAmount || 0),
            totalExpiredCount: totalExpiredAgg[0]?.count || 0,
            recentExpiries: expiredEntries.map((e) => ({
                id: e._id,
                user: e.userId,
                amount: Math.abs(e.amount),
                date: e.createdAt,
                description: e.description
            }))
        });
    } catch (err) {
        next(err);
    }
}

// --- Cashback Distribution Ledger ---
export async function getCashbackLedgers(req, res, next) {
    try {
        const result = await cashbackService.getCashbackLedgers(req.query);
        return sendResponse(res, 200, 'Cashback distribution ledger retrieved', result);
    } catch (err) {
        next(err);
    }
}
