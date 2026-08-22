import mongoose from 'mongoose';
import { ValidationError } from '../../../../core/auth/errors.js';
import { FoodRestaurant } from '../models/restaurant.model.js';
import { FoodAddon } from '../models/foodAddon.model.js';

export async function getPublicApprovedRestaurantAddons(restaurantIdOrSlug) {
    const value = String(restaurantIdOrSlug || '').trim();
    if (!value) throw new ValidationError('Restaurant id is required');

    let restaurant = null;
    if (/^[0-9a-fA-F]{24}$/.test(value)) {
        restaurant = await FoodRestaurant.findOne({ _id: value, status: 'approved' })
            .select('_id status')
            .lean();
    } else {
        const normalized = value.trim().toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ');
        restaurant = await FoodRestaurant.findOne({ restaurantNameNormalized: normalized, status: 'approved' })
            .select('_id status')
            .lean();
    }

    if (!restaurant?._id) {
        return null;
    }

    const addons = await FoodAddon.find({
        restaurantId: new mongoose.Types.ObjectId(String(restaurant._id)),
        isDeleted: { $ne: true },
        approvalStatus: 'approved',
        isAvailable: true,
        $or: [{ published: { $ne: null } }, { draft: { $ne: null } }]
    })
        .sort({ approvedAt: -1, updatedAt: -1 })
        .select('_id published draft')
        .lean();

    return (addons || [])
        .map((a) => {
            const p = a.published || a.draft || {};
            const d = a.draft || {};
            const rawImg = p.image || (Array.isArray(p.images) && p.images[0]) || d.image || (Array.isArray(d.images) && d.images[0]) || '';
            const rawImages = (Array.isArray(p.images) && p.images.length > 0)
                ? p.images
                : ((Array.isArray(d.images) && d.images.length > 0) ? d.images : (rawImg ? [rawImg] : []));
            const imageStr = typeof rawImg === 'object' ? (rawImg?.url || rawImg?.secure_url || '') : String(rawImg || '').trim();
            const imagesArr = rawImages
                .map((img) => (typeof img === 'object' ? (img?.url || img?.secure_url || '') : String(img || '').trim()))
                .filter(Boolean);

            return {
                id: a._id,
                _id: a._id,
                name: p.name || d.name || '',
                description: p.description || d.description || '',
                price: Number(p.price !== undefined && p.price !== null ? p.price : d.price) || 0,
                image: imageStr || (imagesArr.length > 0 ? imagesArr[0] : ''),
                images: imagesArr
            };
        });
}

