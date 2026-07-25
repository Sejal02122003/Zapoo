import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { FoodUserWallet } from '../modules/food/user/models/userWallet.model.js';
import { WalletLedgerEntry } from '../modules/food/user/models/walletLedgerEntry.model.js';

dotenv.config();

export async function migrateUserWallets() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        console.log('[MIGRATION] Skipping database connection (MONGODB_URI not provided).');
        return;
    }

    try {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(mongoUri);
        }
        console.log('[MIGRATION] Starting User Wallet balance migration...');

        const wallets = await FoodUserWallet.find({});
        let migratedCount = 0;

        for (const wallet of wallets) {
            const currentBalance = Number(wallet.balance) || 0;
            const currentCashBalance = Number(wallet.cashBalance) || 0;

            // If cashBalance hasn't been initialized but balance > 0
            if (currentBalance > 0 && currentCashBalance === 0) {
                wallet.cashBalance = currentBalance;
                wallet.cashbackBalance = wallet.cashbackBalance || 0;
                await wallet.save();

                // Check if migration entry already exists
                const existingLedger = await WalletLedgerEntry.findOne({
                    userId: wallet.userId,
                    entryType: 'ADMIN_ADJUSTMENT',
                    'metadata.migration': true
                });

                if (!existingLedger) {
                    await WalletLedgerEntry.create({
                        userId: wallet.userId,
                        entryType: 'ADMIN_ADJUSTMENT',
                        sourceType: 'CASH',
                        amount: currentBalance,
                        originalAmount: currentBalance,
                        remainingAmount: currentBalance,
                        status: 'ACTIVE',
                        description: 'Initial migrated cash balance',
                        metadata: { migration: true }
                    });
                }
                migratedCount++;
            }
        }

        console.log(`[MIGRATION] User Wallet balance migration complete! Migrated ${migratedCount} wallets.`);
    } catch (err) {
        console.error('[MIGRATION] Error migrating user wallets:', err);
    }
}

if (process.argv[1]?.endsWith('migrateUserWallets.js')) {
    migrateUserWallets().then(() => process.exit(0));
}
