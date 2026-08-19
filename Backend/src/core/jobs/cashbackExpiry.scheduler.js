import cron from 'node-cron';
import mongoose from 'mongoose';
import { WalletLedgerEntry } from '../../modules/food/user/models/walletLedgerEntry.model.js';
import { FoodUserWallet } from '../../modules/food/user/models/userWallet.model.js';
import { FoodAdminWallet } from '../../modules/food/admin/models/adminWallet.model.js';
import { CashbackLedger } from '../../modules/food/admin/models/cashbackLedger.model.js';
import { notifyOwnerSafely } from '../notifications/firebase.service.js';
import { logger } from '../../utils/logger.js';

export async function processExpiredCashbackEntries() {
    if (mongoose.connection.readyState !== 1) {
        return { processedCount: 0, totalAmountExpired: 0 };
    }
    const now = new Date();
    logger.info('[CASHBACK-EXPIRY] Starting daily cashback expiry check...');

    const expiredEntries = await WalletLedgerEntry.find({
        entryType: 'CASHBACK',
        sourceType: 'PROMOTIONAL',
        status: { $in: ['ACTIVE', 'PARTIALLY_USED'] },
        expiryDate: { $lt: now },
        remainingAmount: { $gt: 0 }
    });

    if (!expiredEntries || !expiredEntries.length) {
        logger.info('[CASHBACK-EXPIRY] No expired cashback entries found today.');
        return { processedCount: 0, totalAmountExpired: 0 };
    }

    let processedCount = 0;
    let totalAmountExpired = 0;

    for (const entry of expiredEntries) {
        try {
            const amountToExpire = Number(entry.remainingAmount) || 0;
            if (amountToExpire <= 0) continue;

            const userId = entry.userId;
            const wallet = await FoodUserWallet.findOne({ userId });

            if (wallet) {
                wallet.cashbackBalance = Math.max(0, Number(wallet.cashbackBalance || 0) - amountToExpire);
                wallet.balance = Number(wallet.cashBalance || 0) + wallet.cashbackBalance;
                
                wallet.transactions.unshift({
                    type: 'expiry',
                    amount: amountToExpire,
                    status: 'Completed',
                    description: 'Cashback expired',
                    metadata: { originalEntryId: entry._id }
                });
                await wallet.save();
            }

            // Mark entry EXPIRED (idempotency guard)
            entry.status = 'EXPIRED';
            entry.remainingAmount = 0;
            await entry.save();

            // Update CashbackLedger record if linked to an order
            if (entry.relatedOrderId) {
                await CashbackLedger.updateOne(
                    { orderId: entry.relatedOrderId, userId, status: 'CREDITED' },
                    { $set: { status: 'EXPIRED', expiredAt: now } }
                );
            }

            // Record expiry deduction ledger entry for user
            await WalletLedgerEntry.create({
                userId,
                entryType: 'EXPIRY_DEDUCTION',
                sourceType: 'PROMOTIONAL',
                amount: -amountToExpire,
                status: 'ACTIVE',
                relatedOrderId: entry.relatedOrderId || null,
                description: 'Cashback expired',
                metadata: { originalEntryId: entry._id, expiredAmount: amountToExpire }
            });

            // Credit Admin Wallet with expired funds
            await FoodAdminWallet.findOneAndUpdate(
                { key: 'platform' },
                {
                    $inc: { balance: amountToExpire, totalRevenue: amountToExpire }
                },
                { upsert: true, new: true }
            );

            // Notify user
            void notifyOwnerSafely(
                { ownerType: 'USER', ownerId: String(userId) },
                {
                    title: 'Cashback Expired',
                    body: `₹${amountToExpire} unused cashback has expired and was removed from your wallet.`,
                    data: { type: 'cashback_expired', amount: String(amountToExpire) }
                }
            );

            processedCount++;
            totalAmountExpired += amountToExpire;
        } catch (err) {
            logger.error(`[CASHBACK-EXPIRY] Error processing entry ${entry._id}: ${err?.message}`);
        }
    }

    logger.info(`[CASHBACK-EXPIRY] Completed! Expired ${processedCount} entries totaling ₹${totalAmountExpired}.`);
    return { processedCount, totalAmountExpired };
}

import { processPendingCashbacks } from '../../scripts/processPendingCashbacks.js';

export const startCashbackExpiryScheduler = () => {
    // Run daily at 02:00 AM for expired entries
    cron.schedule('0 2 * * *', async () => {
        try {
            await processExpiredCashbackEntries();
        } catch (error) {
            logger.error(`Error in Cashback Expiry Scheduler: ${error?.message}`);
        }
    });

    // Run every 5 minutes to credit pending cashbacks for completed/delivered orders
    cron.schedule('*/5 * * * *', async () => {
        try {
            await processPendingCashbacks();
        } catch (error) {
            logger.error(`Error in Pending Cashback Sync: ${error?.message}`);
        }
    });

    // Immediately trigger a sync on server startup
    processPendingCashbacks().catch(err => logger.error(`Initial processPendingCashbacks failed: ${err?.message}`));

    logger.info('Cashback Expiry & Sync Schedulers started.');
};
