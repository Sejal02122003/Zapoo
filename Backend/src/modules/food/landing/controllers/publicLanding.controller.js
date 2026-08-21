import { getPublicGourmetRestaurants } from '../services/gourmet.service.js';
import { getLandingSettings } from '../services/landingSettings.service.js';
import { FoodHeroBanner } from '../models/heroBanner.model.js';
import { FoodUnder99Banner } from '../models/under99Banner.model.js';
import { FoodDiningBanner } from '../models/diningBanner.model.js';
import { FoodExploreIcon } from '../models/exploreIcon.model.js';
import { FoodRestaurant } from '../../restaurant/models/restaurant.model.js';
import { sendResponse } from '../../../../utils/response.js';
import mongoose from 'mongoose';

/** Public hero banners for user home: active only, sorted, with linkedRestaurants populated for click-through */
export const getPublicHeroBannersController = async (req, res, next) => {
    try {
        const { zoneId } = req.query;
        let docs = await FoodHeroBanner.find({ isActive: true })
            .sort({ sortOrder: 1, createdAt: -1 })
            .populate({
                path: 'linkedRestaurantIds',
                select: '_id restaurantName slug area city rating cuisines profileImage pureVegRestaurant zoneId',
                model: 'FoodRestaurant'
            })
            .lean();

        if (zoneId && mongoose.Types.ObjectId.isValid(zoneId)) {
            const targetZone = String(zoneId);
            docs = (docs || []).filter(banner => {
                if (banner.targetScope === 'zone' && banner.zoneId) {
                    return String(banner.zoneId) === targetZone;
                }
                const linked = banner.linkedRestaurantIds || [];
                if (linked.length === 0) return true;
                return linked.some(r => String(r.zoneId || '') === targetZone);
            });
        }

        const banners = (docs || []).map((b) => {
            const { linkedRestaurantIds, ...rest } = b;
            return {
                ...rest,
                linkedRestaurants: Array.isArray(linkedRestaurantIds) ? linkedRestaurantIds : [],
                imageUrl: b.imageUrl
            };
        });
        return sendResponse(res, 200, 'Hero banners fetched', { banners });
    } catch (error) {
        next(error);
    }
};

export const getPublicUnder99BannersController = async (req, res, next) => {
    try {
        const { zoneId } = req.query;
        const query = { isActive: true };
        if (zoneId) {
            query.$or = [
                { zoneId: String(zoneId) },
                { zoneId: { $in: [null, ""] } },
                { zoneId: { $exists: false } }
            ];
        }
        const docs = await FoodUnder99Banner.find(query).sort({ sortOrder: 1, createdAt: -1 }).lean();
        return sendResponse(res, 200, 'Under 99 banners fetched', { banners: docs });
    } catch (error) {
        next(error);
    }
};

export const getPublicDiningBannersController = async (req, res, next) => {
    try {
        let { zoneId, lat, lng, latitude, longitude } = req.query;

        // If zoneId is not provided, but lat/lng is available, attempt to detect zone
        if (!zoneId && ((lat && lng) || (latitude && longitude))) {
            const userLat = parseFloat(lat || latitude);
            const userLng = parseFloat(lng || longitude);
            if (Number.isFinite(userLat) && Number.isFinite(userLng)) {
                try {
                    const { FoodZone } = await import('../../admin/models/zone.model.js');
                    const zones = await FoodZone.find({ isActive: true }).lean();
                    for (const zone of zones) {
                        const coords = Array.isArray(zone.coordinates) ? zone.coordinates : [];
                        if (coords.length >= 3) {
                            let inside = false;
                            for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
                                const xi = coords[i].longitude;
                                const yi = coords[i].latitude;
                                const xj = coords[j].longitude;
                                const yj = coords[j].latitude;
                                const intersect =
                                    yi > userLat !== yj > userLat &&
                                    userLng < ((xj - xi) * (userLat - yi)) / (yj - yi + 0.0) + xi;
                                if (intersect) inside = !inside;
                            }
                            if (inside) {
                                zoneId = String(zone._id);
                                break;
                            }
                        }
                    }
                } catch (zErr) {
                    console.warn('[getPublicDiningBannersController] Zone detection error:', zErr.message);
                }
            }
        }

        const query = { isActive: true };
        if (zoneId && mongoose.Types.ObjectId.isValid(zoneId)) {
            const zId = new mongoose.Types.ObjectId(zoneId);
            query.$or = [
                { targetScope: 'global' },
                { targetScope: { $in: [null, ''] }, zoneId: null },
                { targetScope: { $in: [null, ''] }, zoneId: { $exists: false } },
                { targetScope: 'zone', zoneId: zId },
                { targetScope: 'zone', zoneId: String(zoneId) },
                { zoneId: zId },
                { zoneId: String(zoneId) }
            ];
        } else {
            // When no specific zone is requested, only return global or unzoned banners
            query.$or = [
                { targetScope: 'global' },
                { targetScope: { $in: [null, ''] }, zoneId: null },
                { targetScope: { $in: [null, ''] }, zoneId: { $exists: false } },
                { zoneId: null },
                { zoneId: { $exists: false } }
            ];
        }

        const docs = await FoodDiningBanner.find(query)
            .populate('zoneId', 'name city')
            .sort({ sortOrder: 1, createdAt: -1 })
            .lean();

        return sendResponse(res, 200, 'Dining banners fetched', { banners: docs });
    } catch (error) {
        next(error);
    }
};

export const getPublicExploreIconsController = async (req, res, next) => {
    try {
        const docs = await FoodExploreIcon.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 }).lean();
        const items = docs.map(({ targetPath, sortOrder, ...rest }) => ({ ...rest, link: targetPath, order: sortOrder }));
        return sendResponse(res, 200, 'Explore icons fetched', { items });
    } catch (error) {
        next(error);
    }
};


export const getPublicGourmetController = async (req, res, next) => {
    try {
        const { zoneId } = req.query;
        const docs = await getPublicGourmetRestaurants();
        let restaurants = (docs || []).map((d) => ({
            ...(d.restaurant || {}),
            _id: d.restaurant?._id || d.restaurantId,
            zoneId: d.restaurant?.zoneId,
            priority: d.priority
        })).filter((r) => r && r._id);
        
        if (zoneId && mongoose.Types.ObjectId.isValid(zoneId)) {
            restaurants = restaurants.filter(r => String(r.zoneId || '') === String(zoneId));
        }
        
        return sendResponse(res, 200, 'Gourmet restaurants fetched', { restaurants });
    } catch (error) {
        next(error);
    }
};

export const getPublicLandingSettingsController = async (req, res, next) => {
    try {
        const { zoneId } = req.query;
        const settings = await getLandingSettings();
        const ids = settings?.recommendedRestaurantIds || [];
        let recommendedRestaurants = [];
        if (Array.isArray(ids) && ids.length > 0) {
            const query = { _id: { $in: ids }, status: 'approved' };
            if (zoneId && mongoose.Types.ObjectId.isValid(zoneId)) {
                query.zoneId = new mongoose.Types.ObjectId(zoneId);
            }
            recommendedRestaurants = await FoodRestaurant.find(query)
                .select('restaurantName area city profileImage coverImages menuImages slug rating cuisines pureVegRestaurant zoneId location')
                .lean();
        }
        const payload = {
            ...settings,
            recommendedRestaurantIds: undefined,
            recommendedRestaurants
        };
        return sendResponse(res, 200, 'Landing settings fetched', payload);
    } catch (error) {
        next(error);
    }
};

export const getPublicOffersController = async (req, res, next) => {
    try {
        const { zoneId } = req.query;
        // We need to import getPublicOffers from offers.service.js
        const { getPublicOffers } = await import('../services/offers.service.js');
        const { dailyDeals, bestOffers } = await getPublicOffers();

        // Zone filtering
        const filterByZone = (offers) => {
            if (!zoneId || !mongoose.Types.ObjectId.isValid(zoneId)) return offers;
            return offers.filter(o => String(o.zoneId || '') === String(zoneId));
        };

        const filteredDaily = filterByZone(dailyDeals);
        const filteredBest = filterByZone(bestOffers);

        return sendResponse(res, 200, 'Offers fetched', {
            dailyDeals: filteredDaily,
            bestOffers: filteredBest
        });
    } catch (error) {
        next(error);
    }
};
