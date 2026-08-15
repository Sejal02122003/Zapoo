import mongoose from 'mongoose';
import { FoodRestaurant } from '../models/restaurant.model.js';
import { FoodOrder } from '../../orders/models/order.model.js';
import { AccountDeletion } from '../../admin/models/accountDeletion.model.js';

/**
 * Permanently delete a RESTAURANT account and all its associated data.
 */
export async function deleteRestaurantAccount(userId) {
    const rawId = String(userId || '').trim();
    if (!rawId || !mongoose.Types.ObjectId.isValid(rawId)) {
        throw new Error('Invalid restaurant ID');
    }
    const rId = new mongoose.Types.ObjectId(rawId);

    const restaurant = await FoodRestaurant.findById(rId).lean();
    if (!restaurant) throw new Error('Restaurant not found');

    const phone = restaurant.ownerPhone || restaurant.phone || restaurant.primaryContactNumber || '';
    const email = restaurant.ownerEmail || restaurant.email || '';

    // 1. Snapshot financial data
    try {
        let walletBalance = 0;
        let totalEarnings = 0;
        try {
            const walletDoc = await mongoose.connection.db
                .collection('food_restaurant_wallets')
                .findOne({ restaurantId: rId });
            walletBalance = walletDoc?.balance || 0;
            totalEarnings = walletDoc?.totalEarnings || 0;
        } catch (_) {}

        let pendingWithdrawals = 0;
        try {
            const withdrawalAgg = await mongoose.connection.db
                .collection('food_restaurant_withdrawals')
                .aggregate([
                    { $match: { restaurantId: rId, status: 'pending' } },
                    { $group: { _id: null, total: { $sum: '$amount' } } }
                ])
                .toArray();
            pendingWithdrawals = withdrawalAgg[0]?.total || 0;
        } catch (_) {}

        let totalCommissionPaid = 0;
        try {
            const commissionAgg = await mongoose.connection.db
                .collection('food_restaurant_commissions')
                .aggregate([
                    { $match: { restaurantId: rId } },
                    { $group: { _id: null, total: { $sum: '$amount' } } }
                ])
                .toArray();
            totalCommissionPaid = commissionAgg[0]?.total || 0;
        } catch (_) {}

        const orderStats = await FoodOrder.aggregate([
            { $match: { restaurantId: rId } },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: { $ifNull: ['$pricing.total', 0] } },
                    count: { $sum: 1 }
                }
            }
        ]);

        const stats = orderStats[0] || { totalAmount: 0, count: 0 };

        await AccountDeletion.create({
            accountType: 'RESTAURANT',
            originalId: restaurant._id,
            phone: phone || '',
            name: restaurant.restaurantName || restaurant.name || 'Unknown',
            email: email || '',
            financialSnapshot: {
                totalOrderAmount: stats.totalAmount,
                walletBalance,
                totalEarnings,
                pendingWithdrawals,
                totalCommissionPaid
            },
            orderCount: stats.count
        }).catch(() => {});
    } catch (snapshotErr) {
        console.warn('[deleteRestaurantAccount] Snapshot warning:', snapshotErr.message);
    }

    // 2. Anonymize orders (keep financial fields, clear restaurantId)
    await FoodOrder.updateMany(
        { restaurantId: rId },
        {
            $set: {
                restaurantId: null,
                'restaurant.name': 'Deleted Restaurant',
                'restaurant.restaurantName': 'Deleted Restaurant',
                'restaurant.phone': ''
            }
        }
    ).catch(() => {});

    // 3. Anonymize transactions
    try {
        await mongoose.connection.db.collection('food_transactions').updateMany(
            { restaurantId: rId },
            { $set: { restaurantId: null, restaurantName: 'Deleted Restaurant' } }
        );
    } catch (_) {}

    // 4. Delete restaurant-specific data from all related collections
    const collectionsToClean = [
        { col: 'food_restaurant_wallets', field: 'restaurantId' },
        { col: 'food_restaurant_support_tickets', field: 'restaurantId' },
        { col: 'food_restaurant_withdrawals', field: 'restaurantId' },
        { col: 'food_items', field: 'restaurantId' },
        { col: 'food_addons', field: 'restaurantId' },
        { col: 'food_categories', field: 'restaurantId' },
        { col: 'food_restaurant_menus', field: 'restaurantId' },
        { col: 'food_restaurant_outlet_timings', field: 'restaurantId' },
        { col: 'food_restaurant_commissions', field: 'restaurantId' },
        { col: 'food_dining_restaurants', field: 'restaurantId' },
        { col: 'food_dining_requests', field: 'restaurantId' },
        { col: 'food_offers', field: 'restaurantId' },
        { col: 'food_restaurant_joining_requests', field: 'restaurantId' },
        { col: 'food_restaurant_challenges', field: 'restaurantId' },
        { col: 'food_restaurant_challenge_participations', field: 'restaurantId' },
        { col: 'food_restaurant_bonus_transactions', field: 'restaurantId' }
    ];

    for (const { col, field } of collectionsToClean) {
        try {
            await mongoose.connection.db.collection(col).deleteMany({ [field]: rId });
        } catch (_) {}
    }

    // 5. Delete joining requests matched by phone or email
    try {
        const queryConditions = [];
        if (rId) queryConditions.push({ restaurantId: rId }, { _id: rId });
        if (phone) queryConditions.push({ ownerPhone: phone }, { phone }, { primaryContactNumber: phone });
        if (email) queryConditions.push({ ownerEmail: email }, { email });

        if (queryConditions.length > 0) {
            await mongoose.connection.db.collection('food_restaurant_joining_requests').deleteMany({ $or: queryConditions });
        }
    } catch (_) {}

    // 6. Delete the restaurant document
    await FoodRestaurant.deleteOne({ _id: rId });

    return { success: true, id: rId, message: 'Restaurant deleted permanently' };
}
