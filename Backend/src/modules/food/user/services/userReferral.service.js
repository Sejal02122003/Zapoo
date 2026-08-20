import mongoose from 'mongoose';
import { ValidationError } from '../../../../core/auth/errors.js';
import { FoodUser } from '../../../../core/users/user.model.js';
import { FoodUserWallet } from '../models/userWallet.model.js';
import { FoodReferralSettings } from '../../admin/models/referralSettings.model.js';
import { FoodReferralLog } from '../../admin/models/referralLog.model.js';
import { appEvents, EVENTS } from '../../../../core/utils/events.js';
import { creditReferralReward } from './userWallet.service.js';
import { notifyOwnersSafely } from '../../../../core/notifications/firebase.service.js';
import { logger } from '../../../../utils/logger.js';

export const getUserReferralStats = async (userId) => {
    const id = String(userId || '');
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        throw new ValidationError('User not found');
    }
    const oid = new mongoose.Types.ObjectId(id);
    const [user, wallet, settingsDoc] = await Promise.all([
        FoodUser.findById(oid).select('_id referralCount referralCode').lean(),
        FoodUserWallet.findOne({ userId: oid }).select('referralEarnings').lean(),
        FoodReferralSettings.findOne({ isActive: { $ne: false } }).sort({ createdAt: -1 }).lean()
            .then(s => s || FoodReferralSettings.findOne().sort({ createdAt: -1 }).lean())
    ]);

    return {
        referralCount: Number(user?.referralCount) || 0,
        totalReferralEarnings: Number(wallet?.referralEarnings) || 0,
        rewardAmount: Math.max(0, Number(settingsDoc?.referralRewardUser) || 0)
    };
};

export const getUserReferralDetails = async (userId) => {
    const id = String(userId || '');
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        throw new ValidationError('User not found');
    }

    const oid = new mongoose.Types.ObjectId(id);
    const [user, wallet, settingsDoc, logs] = await Promise.all([
        FoodUser.findById(oid).select('_id referralCount referralCode').lean(),
        FoodUserWallet.findOne({ userId: oid }).select('referralEarnings').lean(),
        FoodReferralSettings.findOne({ isActive: { $ne: false } }).sort({ createdAt: -1 }).lean()
            .then(s => s || FoodReferralSettings.findOne().sort({ createdAt: -1 }).lean()),
        FoodReferralLog.find({ referrerId: oid, role: 'USER' })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean()
    ]);

    const refereeIds = Array.from(
        new Set(
            (Array.isArray(logs) ? logs : [])
                .map((log) => String(log?.refereeId || ''))
                .filter(Boolean)
        )
    )
        .filter((value) => mongoose.Types.ObjectId.isValid(value))
        .map((value) => new mongoose.Types.ObjectId(value));

    const referees = refereeIds.length
        ? await FoodUser.find({ _id: { $in: refereeIds } })
            .select('_id name phone profileImage')
            .lean()
        : [];

    const refereeMap = new Map(referees.map((entry) => [String(entry._id), entry]));

    const invitedFriends = (Array.isArray(logs) ? logs : []).map((log) => {
        const referee = refereeMap.get(String(log?.refereeId || ''));
        const rawPhone = String(referee?.phone || '');
        const maskedPhone = rawPhone
            ? `${rawPhone.slice(0, Math.min(3, rawPhone.length))}${'*'.repeat(Math.max(rawPhone.length - 5, 0))}${rawPhone.slice(-2)}`
            : '';

        return {
            id: String(log?._id || ''),
            refereeId: String(log?.refereeId || ''),
            name: String(referee?.name || '').trim() || 'Friend',
            phone: maskedPhone,
            profileImage: String(referee?.profileImage || '').trim() || '',
            status: String(log?.status || 'pending'),
            reason: String(log?.reason || ''),
            rewardAmount: Math.max(0, Number(log?.rewardAmount) || 0),
            earnedAmount: String(log?.status || '') === 'credited' ? Math.max(0, Number(log?.rewardAmount) || 0) : 0,
            invitedAt: log?.createdAt || null
        };
    });

    const totalInvited = invitedFriends.length;
    const creditedCount = invitedFriends.filter((entry) => entry.status === 'credited').length;
    const pendingCount = invitedFriends.filter((entry) => entry.status === 'pending').length;
    const rejectedCount = invitedFriends.filter((entry) => entry.status === 'rejected').length;

    return {
        stats: {
            referralCount: Number(user?.referralCount) || 0,
            totalReferralEarnings: Number(wallet?.referralEarnings) || 0,
            rewardAmount: Math.max(0, Number(settingsDoc?.referralRewardUser) || 0),
            totalInvited,
            creditedCount,
            pendingCount,
            rejectedCount
        },
        invitedFriends
    };
};

/**
 * Process referral reward for the referrer when the referee completes their first order.
 * Safe and idempotent: only executes if there is a pending referral log.
 */
export const processReferralRewardOnFirstOrder = async (orderOrOrderId) => {
    try {
        let order = orderOrOrderId;
        if (!order || typeof order === 'string' || mongoose.Types.ObjectId.isValid(order)) {
            const { FoodOrder } = await import('../../orders/models/order.model.js');
            order = await FoodOrder.findById(order).lean();
        }
        if (!order || !order.userId) return;

        const refereeId = new mongoose.Types.ObjectId(String(order.userId));

        // Find pending referral log for this referee
        let pendingLog = await FoodReferralLog.findOne({
            refereeId,
            role: 'USER',
            status: 'pending'
        });

        // If no log exists but referee has a referredBy, create a pending log
        if (!pendingLog) {
            const refereeUser = await FoodUser.findById(refereeId).select('referredBy').lean();
            if (refereeUser?.referredBy) {
                const existingAny = await FoodReferralLog.findOne({
                    refereeId,
                    role: 'USER',
                    status: { $in: ['credited', 'rejected'] }
                }).lean();
                if (existingAny) return; // already processed

                pendingLog = await FoodReferralLog.create({
                    referrerId: refereeUser.referredBy,
                    refereeId,
                    role: 'USER',
                    status: 'pending',
                    reason: 'awaiting_first_order'
                });
            }
        }

        if (!pendingLog || pendingLog.status !== 'pending') {
            return;
        }

        const referrerId = pendingLog.referrerId;
        const [referrer, settingsDoc] = await Promise.all([
            FoodUser.findById(referrerId).select('_id referralCount phone name isActive').lean(),
            FoodReferralSettings.findOne({ isActive: { $ne: false } }).sort({ createdAt: -1 }).lean()
                .then(s => s || FoodReferralSettings.findOne().sort({ createdAt: -1 }).lean())
        ]);

        if (!referrer || referrer.isActive === false) {
            pendingLog.status = 'rejected';
            pendingLog.reason = 'referrer_inactive_or_not_found';
            await pendingLog.save();
            return;
        }

        const reward = Math.max(0, Number(settingsDoc?.referralRewardUser ?? pendingLog.rewardAmount) || 0);
        const limit = Math.max(0, Number(settingsDoc?.referralLimitUser) || 0);
        const isLimitOk = limit === 0 || Number(referrer.referralCount || 0) < limit;

        if (reward <= 0) {
            pendingLog.status = 'rejected';
            pendingLog.reason = 'reward_disabled';
            await pendingLog.save();
            return;
        }

        if (!isLimitOk) {
            pendingLog.status = 'rejected';
            pendingLog.reason = 'limit_reached';
            await pendingLog.save();
            return;
        }

        // Atomically transition status from pending to credited
        const updatedLog = await FoodReferralLog.findOneAndUpdate(
            { _id: pendingLog._id, status: 'pending' },
            {
                $set: {
                    status: 'credited',
                    rewardAmount: reward,
                    reason: `first_order_completed:${order.orderId || order._id}`
                }
            },
            { new: true }
        );

        if (!updatedLog) {
            // Already processed concurrently
            return;
        }

        // 1. Increment referrer's count
        await FoodUser.updateOne(
            { _id: referrerId },
            { $inc: { referralCount: 1 } }
        );

        // 2. Credit referrer's wallet
        await creditReferralReward(referrerId, reward, {
            role: 'USER',
            refereeId: String(refereeId),
            orderId: String(order._id),
            orderDisplayId: order.orderId || '',
            referralLogId: String(updatedLog._id),
            note: 'Referral bonus: friend completed first order'
        });

        // 3. Send Push Notification to Referrer
        try {
            void notifyOwnersSafely(
                [{ ownerType: 'USER', ownerId: referrerId }],
                {
                    title: 'Referral Bonus Credited! 🎁',
                    body: `₹${reward} has been credited to your wallet! Your friend placed their first order.`,
                    data: {
                        type: 'wallet_update',
                        link: '/food/user/wallet'
                    }
                }
            );
        } catch (notifErr) {
            logger.warn(`Failed to send referral push notification: ${notifErr?.message}`);
        }
    } catch (e) {
        logger.warn(`Referral first-order crediting failed: ${e?.message || e}`);
    }
};

// Auto-register order completion hook for referral reward crediting
appEvents.on(EVENTS.ORDER_COMPLETED, async (order) => {
    try {
        if (order) {
            await processReferralRewardOnFirstOrder(order);
        }
    } catch (err) {
        logger.error(`[REFERRAL] Error in ORDER_COMPLETED handler: ${err?.message}`);
    }
});


