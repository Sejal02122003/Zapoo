import { PromoBanner } from '../models/promoBanner.model.js';
import AdRequest from '../../../food/admin/models/adRequest.model.js';
import { processAndSaveImage } from '../../../../utils/sharp.util.js';
import { STORAGE_CATEGORIES } from '../../../../config/storage.config.js';
import { FoodDiningBanner } from '../models/diningBanner.model.js';

export const createPromoBanner = async (req, res) => {
    try {
        const { idSlug, title, subtitle, ctaText, category, restaurantId, scope, zoneId, adRequestId, isActive } = req.body;

        // Payment verification logic
        if (adRequestId) {
            const adReq = await AdRequest.findById(adRequestId);
            if (!adReq) {
                return res.status(404).json({ success: false, message: 'Ad Request not found' });
            }
            if (adReq.status !== 'paid' && adReq.status !== 'live') {
                return res.status(400).json({ success: false, message: 'Cannot create banner: Payment is not completed for this Ad Request' });
            }
        } else {
            // Depending on strictness, we might block creation entirely if there's no paid adRequestId
            return res.status(400).json({ success: false, message: 'Ad Request ID is required to verify payment status' });
        }

        let imageUrl = '';
        if (req.file) {
            const file = req.file;
            const sharpRes = await processAndSaveImage(file.buffer, STORAGE_CATEGORIES.BANNERS);
            imageUrl = sharpRes.fullUrl;
        }

        if (!imageUrl) {
            return res.status(400).json({ success: false, message: 'Image is required for Promo Banner' });
        }

        const targetScope = (scope === 'zone' || zoneId) ? 'zone' : (scope || 'global');
        const resolvedZoneId = targetScope === 'zone' && zoneId ? zoneId : null;

        const newBanner = new PromoBanner({
            idSlug,
            title,
            subtitle,
            ctaText,
            category,
            imageUrl,
            restaurantId: restaurantId || null,
            scope: targetScope,
            zoneId: resolvedZoneId,
            adRequestId,
            isActive: isActive === 'true' || isActive === true
        });

        // Save as FoodDiningBanner so it's visible in the "Sponsored Ads" section in the user app
        const newDiningBanner = new FoodDiningBanner({
            imageUrl,
            publicId: `promo_${idSlug}_${Date.now()}`,
            title,
            subtitle,
            ctaText,
            ctaLink: restaurantId ? `/food/user/restaurants/${restaurantId}` : '',
            targetScope,
            zoneId: resolvedZoneId,
            isActive: isActive === 'true' || isActive === true
        });
        await newDiningBanner.save();
        
        // Optionally update the Ad Request status to 'live' if it was 'paid'
        if (adRequestId) {
            await AdRequest.findByIdAndUpdate(adRequestId, { status: 'live' });
        }

        res.status(201).json({ success: true, data: newBanner, message: 'Promo Banner created successfully and is now Live' });
    } catch (error) {
        console.error('Error creating promo banner:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

export const getPromoBanners = async (req, res) => {
    try {
        const banners = await PromoBanner.find().populate('restaurantId', 'restaurantName').sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: banners });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};
