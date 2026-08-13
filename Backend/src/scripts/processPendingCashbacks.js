import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { CashbackLedger } from '../modules/food/admin/models/cashbackLedger.model.js';
import { FoodOrder } from '../modules/food/orders/models/order.model.js';
import { creditPendingCashbackForOrder } from '../modules/food/admin/services/cashback.service.js';

dotenv.config();

export async function processPendingCashbacks() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        console.log('[CASHBACK_SYNC] No MONGODB_URI found');
        return;
    }

    try {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(mongoUri);
        }
        console.log('[CASHBACK_SYNC] Scanning for un-credited pending cashbacks...');

        const pendingLedgers = await CashbackLedger.find({ status: 'PENDING' });
        console.log(`[CASHBACK_SYNC] Found ${pendingLedgers.length} pending cashback ledger entries.`);

        let processed = 0;
        for (const ledger of pendingLedgers) {
            const order = await FoodOrder.findById(ledger.orderId).lean();
            if (order && (order.orderStatus === 'delivered' || order.orderStatus === 'completed' || order.deliveryState?.status === 'delivered')) {
                console.log(`[CASHBACK_SYNC] Crediting pending cashback ₹${ledger.amount} for completed order ${ledger.orderId}...`);
                await creditPendingCashbackForOrder(ledger.orderId);
                processed++;
            }
        }
        console.log(`[CASHBACK_SYNC] Finished. Processed and credited ${processed} pending cashbacks.`);
    } catch (err) {
        console.error('[CASHBACK_SYNC] Error running pending cashback sync:', err);
    }
}

if (process.argv[1]?.endsWith('processPendingCashbacks.js')) {
    processPendingCashbacks().then(() => process.exit(0));
}
