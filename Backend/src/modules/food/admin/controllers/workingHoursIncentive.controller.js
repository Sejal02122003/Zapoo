import mongoose from 'mongoose';
import { FoodWorkingHoursIncentiveConfig } from '../models/workingHoursIncentiveConfig.model.js';
import { FoodWorkingHoursIncentiveLog } from '../../delivery/models/workingHoursIncentiveLog.model.js';
import { FoodDeliveryWallet } from '../../delivery/models/deliveryWallet.model.js';
import { FoodDeliveryPartner } from '../../delivery/models/deliveryPartner.model.js';
import { get7DayActiveHours } from '../../delivery/services/dutyLog.service.js';
import { sendResponse } from '../../../../utils/response.js';
import { ValidationError, NotFoundError } from '../../../../core/auth/errors.js';

// Seed default tiers if collection is empty
const DEFAULT_TIERS = [
    { tierName: 'Bronze Tier', minHours: 15, incentiveAmount: 250, description: 'Complete 15 order delivery hours in 7 days' },
    { tierName: 'Silver Tier', minHours: 30, incentiveAmount: 600, description: 'Complete 30 order delivery hours in 7 days' },
    { tierName: 'Gold Tier', minHours: 50, incentiveAmount: 1200, description: 'Complete 50 order delivery hours in 7 days' }
];

async function ensureDefaultTiers() {
    const count = await FoodWorkingHoursIncentiveConfig.countDocuments();
    if (count === 0) {
        await FoodWorkingHoursIncentiveConfig.insertMany(DEFAULT_TIERS);
    }
}

export async function getWorkingHoursIncentivesController(req, res, next) {
    try {
        await ensureDefaultTiers();
        const configs = await FoodWorkingHoursIncentiveConfig.find().sort({ minHours: 1 }).lean();
        return sendResponse(res, 200, 'Working hours incentive rules retrieved', configs);
    } catch (err) {
        next(err);
    }
}

export async function createWorkingHoursIncentiveController(req, res, next) {
    try {
        const { tierName, minHours, incentiveAmount, description } = req.body || {};
        if (!tierName || !minHours || incentiveAmount == null) {
            throw new ValidationError('tierName, minHours, and incentiveAmount are required');
        }

        const config = await FoodWorkingHoursIncentiveConfig.create({
            tierName: String(tierName).trim(),
            minHours: Number(minHours),
            incentiveAmount: Number(incentiveAmount),
            description: String(description || '').trim()
        });

        return sendResponse(res, 201, 'Working hours incentive rule created', config);
    } catch (err) {
        next(err);
    }
}

export async function updateWorkingHoursIncentiveController(req, res, next) {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            throw new ValidationError('Invalid rule ID parameter');
        }

        const { tierName, minHours, incentiveAmount, isEnabled, description } = req.body || {};
        const config = await FoodWorkingHoursIncentiveConfig.findById(id);
        if (!config) {
            throw new NotFoundError('Incentive rule not found');
        }

        if (tierName !== undefined) config.tierName = String(tierName).trim();
        if (minHours !== undefined) config.minHours = Number(minHours);
        if (incentiveAmount !== undefined) config.incentiveAmount = Number(incentiveAmount);
        if (isEnabled !== undefined) config.isEnabled = Boolean(isEnabled);
        if (description !== undefined) config.description = String(description).trim();

        await config.save();
        return sendResponse(res, 200, 'Working hours incentive rule updated', config);
    } catch (err) {
        next(err);
    }
}

export async function deleteWorkingHoursIncentiveController(req, res, next) {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            throw new ValidationError('Invalid rule ID parameter');
        }

        const deleted = await FoodWorkingHoursIncentiveConfig.findByIdAndDelete(id);
        if (!deleted) {
            throw new NotFoundError('Incentive rule not found');
        }

        return sendResponse(res, 200, 'Working hours incentive rule deleted');
    } catch (err) {
        next(err);
    }
}

export async function getRiderIncentivesProgressController(req, res, next) {
    try {
        await ensureDefaultTiers();

        const uId = req.user?.userId || req.user?._id || req.user?.id;
        const phone = req.user?.phone;

        let partner = null;
        if (uId && mongoose.Types.ObjectId.isValid(uId)) {
            partner = await FoodDeliveryPartner.findById(uId).select('_id').lean();
        }
        if (!partner && phone) {
            partner = await FoodDeliveryPartner.findOne({ phone: String(phone) }).select('_id').lean();
        }

        const partnerId = partner?._id;
        if (!partnerId) {
            return sendResponse(res, 404, 'Delivery partner profile not found');
        }

        const hoursData = await get7DayActiveHours(partnerId);
        const currentHours = hoursData.totalHours;

        const activeConfigs = await FoodWorkingHoursIncentiveConfig.find({ isEnabled: true }).sort({ minHours: 1 }).lean();
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);

        const claimedLogs = await FoodWorkingHoursIncentiveLog.find({
            riderId: partnerId,
            claimedAt: { $gte: sevenDaysAgo }
        }).lean();

        const claimedTierIds = new Set(claimedLogs.map((l) => String(l.tierId)));

        const tiers = activeConfigs.map((tier) => {
            const isClaimed = claimedTierIds.has(String(tier._id));
            const progressPct = Math.min(100, Math.round((currentHours / tier.minHours) * 100));
            const isEligible = currentHours >= tier.minHours && !isClaimed;

            return {
                id: tier._id,
                tierName: tier.tierName,
                minHours: tier.minHours,
                incentiveAmount: tier.incentiveAmount,
                description: tier.description,
                progressPct,
                isEligible,
                isClaimed
            };
        });

        return sendResponse(res, 200, 'Rider working hours incentive progress retrieved', {
            currentHours,
            tiers
        });
    } catch (err) {
        next(err);
    }
}

export async function claimIncentiveController(req, res, next) {
    try {
        const { tierId } = req.body || {};
        if (!tierId || !mongoose.Types.ObjectId.isValid(tierId)) {
            throw new ValidationError('tierId is required');
        }

        const uId = req.user?.userId || req.user?._id || req.user?.id;
        const partner = await FoodDeliveryPartner.findById(uId).select('_id').lean();
        if (!partner) {
            throw new NotFoundError('Delivery partner not found');
        }

        const tier = await FoodWorkingHoursIncentiveConfig.findById(tierId);
        if (!tier || !tier.isEnabled) {
            throw new ValidationError('Incentive tier rule is invalid or disabled');
        }

        const hoursData = await get7DayActiveHours(partner._id);
        if (hoursData.totalHours < tier.minHours) {
            throw new ValidationError(`Requirement not met: ${hoursData.totalHours} hrs / ${tier.minHours} hrs needed`);
        }

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
        const existingClaim = await FoodWorkingHoursIncentiveLog.findOne({
            riderId: partner._id,
            tierId: tier._id,
            claimedAt: { $gte: sevenDaysAgo }
        });

        if (existingClaim) {
            throw new ValidationError('Incentive bonus for this tier has already been claimed in the current 7-day period');
        }

        // Credit incentive amount to rider wallet
        let wallet = await FoodDeliveryWallet.findOne({ deliveryPartnerId: partner._id });
        if (!wallet) {
            wallet = await FoodDeliveryWallet.create({ deliveryPartnerId: partner._id, balance: 0 });
        }

        wallet.balance += tier.incentiveAmount;
        wallet.transactions.push({
            type: 'CREDIT',
            amount: tier.incentiveAmount,
            description: `Working Hours Incentive Bonus (${tier.tierName})`,
            createdAt: new Date()
        });

        await wallet.save();

        const claimLog = await FoodWorkingHoursIncentiveLog.create({
            riderId: partner._id,
            tierId: tier._id,
            tierName: tier.tierName,
            minHours: tier.minHours,
            incentiveAmount: tier.incentiveAmount
        });

        return sendResponse(res, 200, `Successfully credited ₹${tier.incentiveAmount} incentive bonus to wallet!`, {
            walletBalance: wallet.balance,
            claimLog
        });
    } catch (err) {
        next(err);
    }
}
