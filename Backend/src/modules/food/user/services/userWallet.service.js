import mongoose from 'mongoose';
import { ValidationError } from '../../../../core/auth/errors.js';
import { FoodUserWallet } from '../models/userWallet.model.js';
import { WalletLedgerEntry } from '../models/walletLedgerEntry.model.js';
import { createRazorpayOrder, getRazorpayKeyId, isRazorpayConfigured, verifyPaymentSignature } from '../../orders/helpers/razorpay.helper.js';

const ensureWallet = async (userId) => {
    const id = String(userId || '');
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        throw new ValidationError('User not found');
    }
    const oid = new mongoose.Types.ObjectId(id);
    let wallet = await FoodUserWallet.findOne({ userId: oid });
    if (!wallet) {
        wallet = await FoodUserWallet.create({
            userId: oid,
            cashBalance: 0,
            cashbackBalance: 0,
            balance: 0,
            referralEarnings: 0,
            transactions: []
        });
    }
    return wallet;
};

export const getUserWallet = async (userId) => {
    const id = String(userId || '');
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        throw new ValidationError('User not found');
    }
    const oid = new mongoose.Types.ObjectId(id);
    const wallet = await ensureWallet(userId);

    const now = new Date();

    // Auto-expire any cashback entries past their expiry date
    const expiredEntries = await WalletLedgerEntry.find({
        userId: oid,
        sourceType: 'PROMOTIONAL',
        status: { $in: ['ACTIVE', 'PARTIALLY_USED'] },
        expiryDate: { $lt: now }
    });
    for (const exp of expiredEntries) {
        exp.status = 'EXPIRED';
        exp.remainingAmount = 0;
        await exp.save();
    }

    // Fetch all active non-expired cashback entries
    const activeCashbacks = await WalletLedgerEntry.find({
        userId: oid,
        sourceType: 'PROMOTIONAL',
        status: { $in: ['ACTIVE', 'PARTIALLY_USED'] },
        remainingAmount: { $gt: 0 }
    })
    .sort({ expiryDate: 1 })
    .lean();

    const activeCashbackBalance = activeCashbacks.reduce((sum, c) => sum + (Number(c.remainingAmount) || 0), 0);
    const cashBalance = Number(wallet.cashBalance || 0);

    // Auto-sync wallet model if cache/balance document is out of sync with ledgers
    if (Number(wallet.cashbackBalance) !== activeCashbackBalance) {
        wallet.cashbackBalance = activeCashbackBalance;
        wallet.balance = cashBalance + activeCashbackBalance;
        await wallet.save();
    }

    const totalBalance = cashBalance + activeCashbackBalance;

    const ledgerEntries = await WalletLedgerEntry.find({ userId: oid })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

    return {
        balance: totalBalance,
        cashBalance,
        cashbackBalance: activeCashbackBalance,
        referralEarnings: Number(wallet.referralEarnings) || 0,
        activeCashbacks: activeCashbacks.map((c) => ({
            id: String(c._id),
            remainingAmount: c.remainingAmount,
            expiryDate: c.expiryDate,
            createdAt: c.createdAt
        })),
        transactions: ledgerEntries.map((t) => ({
            id: String(t._id),
            _id: t._id,
            type: t.entryType,
            sourceType: t.sourceType,
            amount: Number(t.amount) || 0,
            status: t.status || 'Completed',
            description: t.description || '',
            date: t.createdAt,
            createdAt: t.createdAt,
            expiryDate: t.expiryDate || null,
            metadata: t.metadata || {}
        }))
    };
};

export const deductWalletBalance = async (userId, amountInr, description = 'Order payment', metadata = {}, orderType = 'delivery') => {
    const amount = Number(amountInr);
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new ValidationError('Invalid deduction amount');
    }

    const normalizedOrderType = String(orderType || '').toLowerCase();
    if (normalizedOrderType === 'takeaway') {
        throw new ValidationError('Wallet payments are only available for delivery orders.');
    }

    const oid = new mongoose.Types.ObjectId(userId);
    const wallet = await ensureWallet(userId);

    const cashBalance = Number(wallet.cashBalance || 0);
    const cashbackBalance = Number(wallet.cashbackBalance || 0);
    const totalAvailable = cashBalance + cashbackBalance;

    if (totalAvailable < amount) {
        throw new ValidationError('Insufficient wallet balance');
    }

    let remainingToDeduct = amount;
    let deductedFromCashback = 0;
    let deductedFromCash = 0;

    // FIFO consumption of active cashback entries by earliest expiryDate
    const cashbackEntries = await WalletLedgerEntry.find({
        userId: oid,
        sourceType: 'PROMOTIONAL',
        status: { $in: ['ACTIVE', 'PARTIALLY_USED'] },
        remainingAmount: { $gt: 0 }
    }).sort({ expiryDate: 1 });

    for (const entry of cashbackEntries) {
        if (remainingToDeduct <= 0) break;
        const availableInEntry = Number(entry.remainingAmount) || 0;
        const take = Math.min(remainingToDeduct, availableInEntry);

        entry.remainingAmount = availableInEntry - take;
        if (entry.remainingAmount === 0) {
            entry.status = 'FULLY_USED';
        } else {
            entry.status = 'PARTIALLY_USED';
        }
        await entry.save();

        remainingToDeduct -= take;
        deductedFromCashback += take;
    }

    if (remainingToDeduct > 0) {
        deductedFromCash = remainingToDeduct;
    }

    wallet.cashbackBalance = Math.max(0, cashbackBalance - deductedFromCashback);
    wallet.cashBalance = Math.max(0, cashBalance - deductedFromCash);
    wallet.balance = wallet.cashBalance + wallet.cashbackBalance;

    wallet.transactions.unshift({
        type: 'deduction',
        amount,
        status: 'Completed',
        description,
        metadata: { source: 'order_payment', deductedFromCashback, deductedFromCash, ...(metadata || {}) }
    });
    await wallet.save();

    await WalletLedgerEntry.create({
        userId: oid,
        entryType: 'ORDER_PAYMENT',
        sourceType: deductedFromCashback > 0 && deductedFromCash === 0 ? 'PROMOTIONAL' : 'CASH',
        amount: -amount,
        status: 'ACTIVE',
        relatedOrderId: metadata.orderId && mongoose.Types.ObjectId.isValid(metadata.orderId) ? new mongoose.Types.ObjectId(metadata.orderId) : null,
        description,
        metadata: { deductedFromCashback, deductedFromCash, ...(metadata || {}) }
    });

    return { wallet: await getUserWallet(userId) };
};

export const creditCashbackToWallet = async (userId, amountInr, expiryDays = 60, relatedOrderId = null, description = 'Order Cashback') => {
    const amount = Number(amountInr);
    if (!Number.isFinite(amount) || amount <= 0) {
        return { wallet: await getUserWallet(userId) };
    }

    const oid = new mongoose.Types.ObjectId(userId);
    const wallet = await ensureWallet(userId);

    const now = new Date();
    const expiryDate = new Date(now.getTime() + Number(expiryDays) * 24 * 60 * 60 * 1000);

    const ledgerEntry = await WalletLedgerEntry.create({
        userId: oid,
        entryType: 'CASHBACK',
        sourceType: 'PROMOTIONAL',
        amount,
        originalAmount: amount,
        remainingAmount: amount,
        expiryDate,
        status: 'ACTIVE',
        relatedOrderId: relatedOrderId && mongoose.Types.ObjectId.isValid(relatedOrderId) ? new mongoose.Types.ObjectId(relatedOrderId) : null,
        description,
        metadata: { source: 'cashback_reward', expiryDays }
    });

    wallet.cashbackBalance = Number(wallet.cashbackBalance || 0) + amount;
    wallet.balance = Number(wallet.cashBalance || 0) + wallet.cashbackBalance;

    wallet.transactions.unshift({
        type: 'cashback',
        amount,
        status: 'Completed',
        description,
        metadata: { cashbackEntryId: ledgerEntry._id, expiryDate }
    });

    await wallet.save();
    return { wallet: await getUserWallet(userId) };
};

export const creditReferralReward = async (userId, amountInr, metadata = {}) => {
    const amount = Number(amountInr);
    if (!Number.isFinite(amount) || amount <= 0) {
        return { wallet: await getUserWallet(userId) };
    }
    const oid = new mongoose.Types.ObjectId(userId);
    const wallet = await ensureWallet(userId);

    wallet.cashBalance = Number(wallet.cashBalance || 0) + amount;
    wallet.balance = wallet.cashBalance + Number(wallet.cashbackBalance || 0);
    wallet.referralEarnings = Number(wallet.referralEarnings || 0) + amount;

    wallet.transactions.unshift({
        type: 'addition',
        amount,
        status: 'Completed',
        description: 'Referral reward',
        metadata: { source: 'referral_reward', ...(metadata || {}) }
    });
    await wallet.save();

    await WalletLedgerEntry.create({
        userId: oid,
        entryType: 'TOPUP',
        sourceType: 'CASH',
        amount,
        status: 'ACTIVE',
        description: 'Referral reward',
        metadata: { source: 'referral_reward', ...(metadata || {}) }
    });

    return { wallet: await getUserWallet(userId) };
};

export const createWalletTopupOrder = async (userId, amountInr) => {
    const amount = Number(amountInr);
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new ValidationError('Amount must be greater than 0');
    }
    if (amount > 50000) {
        throw new ValidationError('Maximum amount is 50,000');
    }

    const amountPaise = Math.round(amount * 100);

    if (!isRazorpayConfigured()) {
        const orderId = `order_dev_${Date.now()}`;
        return {
            razorpay: {
                key: getRazorpayKeyId() || 'rzp_test_dummy',
                orderId,
                amount: amountPaise,
                currency: 'INR'
            }
        };
    }

    const receipt = `wallet_topup_${String(userId).slice(-8)}_${Date.now()}`;
    const order = await createRazorpayOrder(amountPaise, 'INR', receipt);

    return {
        razorpay: {
            key: getRazorpayKeyId(),
            orderId: String(order.id),
            amount: Number(order.amount) || amountPaise,
            currency: order.currency || 'INR'
        }
    };
};

export const verifyWalletTopupPayment = async (userId, payload) => {
    const orderId = String(payload?.razorpayOrderId || '').trim();
    const paymentId = String(payload?.razorpayPaymentId || '').trim();
    const signature = String(payload?.razorpaySignature || '').trim();
    const amount = Number(payload?.amount);

    if (!orderId) throw new ValidationError('razorpayOrderId is required');
    if (!paymentId) throw new ValidationError('razorpayPaymentId is required');
    if (!signature) throw new ValidationError('razorpaySignature is required');
    if (!Number.isFinite(amount) || amount <= 0) throw new ValidationError('amount is required');

    const oid = new mongoose.Types.ObjectId(userId);
    const wallet = await ensureWallet(userId);

    const ok = isRazorpayConfigured()
        ? verifyPaymentSignature(orderId, paymentId, signature)
        : true;
    if (!ok) {
        throw new ValidationError('Payment verification failed');
    }

    wallet.cashBalance = Number(wallet.cashBalance || 0) + amount;
    wallet.balance = wallet.cashBalance + Number(wallet.cashbackBalance || 0);

    wallet.transactions.unshift({
        type: 'addition',
        amount,
        status: 'Completed',
        description: isRazorpayConfigured() ? 'Wallet top-up' : 'Wallet top-up (dev)',
        metadata: { source: 'wallet_topup', mode: isRazorpayConfigured() ? 'razorpay' : 'dev' },
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature
    });

    await wallet.save();

    await WalletLedgerEntry.create({
        userId: oid,
        entryType: 'TOPUP',
        sourceType: 'CASH',
        amount,
        status: 'ACTIVE',
        description: 'Wallet top-up',
        metadata: { razorpayOrderId: orderId, razorpayPaymentId: paymentId }
    });

    return { wallet: await getUserWallet(userId) };
};

export const refundWalletBalance = async (userId, amountInr, description = 'Order refund', metadata = {}) => {
    const amount = Number(amountInr);
    if (!Number.isFinite(amount) || amount <= 0) {
        return { wallet: await getUserWallet(userId) };
    }

    const oid = new mongoose.Types.ObjectId(userId);
    const wallet = await ensureWallet(userId);

    wallet.cashBalance = Number(wallet.cashBalance || 0) + amount;
    wallet.balance = wallet.cashBalance + Number(wallet.cashbackBalance || 0);

    wallet.transactions.unshift({
        type: 'refund',
        amount,
        status: 'Completed',
        description,
        metadata: { source: 'order_refund', ...(metadata || {}) }
    });

    await wallet.save();

    await WalletLedgerEntry.create({
        userId: oid,
        entryType: 'REFUND',
        sourceType: 'CASH',
        amount,
        status: 'ACTIVE',
        description,
        metadata: { source: 'order_refund', ...(metadata || {}) }
    });

    return { wallet: await getUserWallet(userId) };
};

export const topupUserWalletByAdmin = async (userId, amountInr, adminId, description = 'Admin Top-up') => {
    const amount = Number(amountInr);
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new ValidationError('Invalid top-up amount');
    }

    const oid = new mongoose.Types.ObjectId(userId);
    const wallet = await ensureWallet(userId);

    wallet.cashBalance = Number(wallet.cashBalance || 0) + amount;
    wallet.balance = wallet.cashBalance + Number(wallet.cashbackBalance || 0);

    wallet.transactions.unshift({
        type: 'addition',
        amount,
        status: 'Completed',
        description,
        metadata: { source: 'admin_topup', adminId: String(adminId) }
    });

    await wallet.save();

    await WalletLedgerEntry.create({
        userId: oid,
        entryType: 'ADMIN_ADJUSTMENT',
        sourceType: 'CASH',
        amount,
        status: 'ACTIVE',
        description,
        metadata: { source: 'admin_topup', adminId: String(adminId) }
    });

    return { wallet: await getUserWallet(userId) };
};
