import { FoodOfferRestaurant } from '../models/offerRestaurant.model.js';
import { FoodRestaurant } from '../../restaurant/models/restaurant.model.js';

export const getPublicOffers = async () => {
    const docs = await FoodOfferRestaurant.find({ isActive: true })
        .sort({ priority: 1, createdAt: -1 })
        .lean();

    const restaurantIds = docs.map((d) => d.restaurantId);
    const restaurants = await FoodRestaurant.find({ _id: { $in: restaurantIds } })
        .select('restaurantName area city profileImage rating cuisines slug pureVegRestaurant location estimatedDeliveryTime zoneId')
        .lean();

    const restaurantMap = new Map(restaurants.map((r) => [r._id.toString(), r]));

    const dailyDeals = [];
    const bestOffers = [];

    docs.forEach((item) => {
        const r = restaurantMap.get(item.restaurantId.toString());
        if (r) {
            const offerData = {
                id: item._id,
                restaurantId: r._id,
                restaurantName: r.restaurantName,
                restaurantImage: r.profileImage,
                restaurantRating: r.rating || 0,
                subtitle: r.cuisines ? r.cuisines.join(', ') : '',
                location: r.location?.address || r.area || r.city || '',
                zoneId: r.zoneId,
                priority: item.priority
            };

            if (item.offerType === 'daily_deal') {
                offerData.dealText = item.offerText || 'Special Deal';
                dailyDeals.push(offerData);
            } else if (item.offerType === 'best_offer') {
                offerData.title = item.offerText || 'Best Offer';
                bestOffers.push(offerData);
            }
        }
    });

    return { dailyDeals, bestOffers };
};

export const getAllAdminOffers = async () => {
    return await FoodOfferRestaurant.find()
        .populate('restaurantId', 'restaurantName profileImage zoneId')
        .sort({ offerType: 1, priority: 1, createdAt: -1 })
        .lean();
};

export const addOffer = async (restaurantId, offerType, offerText) => {
    const priority = await FoodOfferRestaurant.countDocuments({ offerType });
    
    // Check if already exists in this category
    const existing = await FoodOfferRestaurant.findOne({ restaurantId, offerType });
    if (existing) {
        throw new Error(`Restaurant already added as ${offerType}`);
    }

    const offer = new FoodOfferRestaurant({
        restaurantId,
        offerType,
        offerText,
        priority
    });
    await offer.save();
    return offer;
};

export const updateOfferOrder = async (id, newOrder) => {
    const offer = await FoodOfferRestaurant.findById(id);
    if (!offer) throw new Error('Offer not found');
    offer.priority = newOrder;
    await offer.save();
    return offer;
};

export const toggleOfferStatus = async (id) => {
    const offer = await FoodOfferRestaurant.findById(id);
    if (!offer) throw new Error('Offer not found');
    offer.isActive = !offer.isActive;
    await offer.save();
    return offer;
};

export const deleteOffer = async (id) => {
    const offer = await FoodOfferRestaurant.findByIdAndDelete(id);
    if (!offer) throw new Error('Offer not found');
    return true;
};
