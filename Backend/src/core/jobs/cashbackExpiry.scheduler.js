import cron from 'node-cron';
import { WalletLedgerEntry } from '../../modules/food/user/models/walletLedgerEntry.model.js';
import { FoodUserWallet } from '../../modules/food/user/models/userWallet.model.js';
import { FoodAdminWallet } from '../../modules/food/admin/models/adminWallet.model.js';
import { notifyOwnerSafely } from '../notifications/firebase.service.js';
import { logger } from '../../utils/logger.js';

export async function processExpiredCashbackEntries() {
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

export const startCashbackExpiryScheduler = () => {
    // Run daily at 02:00 AM
    cron.schedule('0 2 * * *', async () => {
        try {
            await processExpiredCashbackEntries();
        } catch (error) {
            logger.error(`Error in Cashback Expiry Scheduler: ${error?.message}`);
        }
    });

    logger.info('Cashback Expiry Scheduler started (daily at 02:00 AM).');
};
