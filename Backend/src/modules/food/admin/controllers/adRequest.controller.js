import AdRequest from '../models/adRequest.model.js';
import AppIntroAd from '../models/appIntroAd.model.js';
import { FoodRestaurant } from '../../restaurant/models/restaurant.model.js';
import { FoodDiningBanner } from '../../landing/models/diningBanner.model.js';
import { PromoBanner } from '../../landing/models/promoBanner.model.js';
import { createRazorpayOrder, getRazorpayKeyId, isRazorpayConfigured, verifyPaymentSignature } from '../../orders/helpers/razorpay.helper.js';
import { processAndSaveImage } from '../../../../utils/sharp.util.js';
import { uploadVideoBuffer } from '../../../../services/cloudinary.service.js';
import { STORAGE_CATEGORIES } from '../../../../config/storage.config.js';

export const createAdRequest = async (req, res) => {
    try {
        const { title, description, scope, zoneId, zoneName, startDate, endDate, mediaType } = req.body;
        const restaurantId = req.user?.userId;

        if (!restaurantId) {
            return res.status(401).json({ success: false, message: 'Restaurant authentication required' });
        }

        const restaurant = await FoodRestaurant.findById(restaurantId);
        const restaurantName = restaurant?.restaurantName || 'Restaurant';
        const restaurantAddress = [restaurant?.addressLine1, restaurant?.addressLine2, restaurant?.area, restaurant?.city].filter(Boolean).join(', ') || '';

        let mediaUrl = req.body.mediaUrl || '';
        if (req.files && req.files.media && req.files.media[0]) {
            const file = req.files.media[0];
            if (file.mimetype?.startsWith('video/')) {
                mediaUrl = await uploadVideoBuffer(file.buffer, 'app_intro_ads');
            } else {
                const sharpRes = await processAndSaveImage(file.buffer, STORAGE_CATEGORIES.BANNERS);
                mediaUrl = sharpRes.fullUrl;
            }
        } else if (req.file) {
            const file = req.file;
            if (file.mimetype?.startsWith('video/')) {
                mediaUrl = await uploadVideoBuffer(file.buffer, 'app_intro_ads');
            } else {
                const sharpRes = await processAndSaveImage(file.buffer, STORAGE_CATEGORIES.BANNERS);
                mediaUrl = sharpRes.fullUrl;
            }
        }

        const resolvedScope = (scope === 'zone' || zoneId) ? 'zone' : (scope || 'global');
        const resolvedZoneId = (resolvedScope === 'zone' && zoneId) ? zoneId : (resolvedScope === 'zone' && restaurant?.zoneId ? restaurant.zoneId : (zoneId || null));

        const adReq = new AdRequest({
            restaurantId,
            restaurantName,
            restaurantAddress,
            title,
            description,
            mediaUrl,
            mediaType: mediaType || 'image',
            scope: resolvedScope,
            zoneId: resolvedZoneId,
            zoneName: zoneName || '',
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            status: 'pending_pricing'
        });

        await adReq.save();
        res.status(201).json({ success: true, data: adReq, message: 'Ad campaign request submitted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// Get requests for a specific restaurant
export const getRestaurantAdRequests = async (req, res) => {
    try {
        const restaurantId = req.user?.userId;
        if (!restaurantId) {
            return res.status(401).json({ success: false, message: 'Restaurant authentication required' });
        }
        const requests = await AdRequest.find({ restaurantId }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: requests });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// Pay for an Ad request (Restaurant)
export const payAdRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const adReq = await AdRequest.findById(id);

        if (!adReq) {
            return res.status(404).json({ success: false, message: 'Ad request not found' });
        }

        if (adReq.status !== 'pending_payment') {
            return res.status(400).json({ success: false, message: 'Payment not required or already done' });
        }

        adReq.paymentStatus = 'paid';
        adReq.status = 'paid';
        await adReq.save();

        res.status(200).json({ success: true, data: adReq, message: 'Payment confirmed successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// Get all Ad requests (Admin)
export const getAdminAdRequests = async (req, res) => {
    try {
        const requests = await AdRequest.find().sort({ createdAt: -1 });

        // Sync any existing live ad requests that don't have a FoodDiningBanner yet
        for (const adReq of requests) {
            if (adReq.status === 'live' && adReq.mediaUrl) {
                const publicId = `ad_${adReq._id}`;
                const exists = await FoodDiningBanner.findOne({ publicId });
                if (!exists) {
                    await FoodDiningBanner.create({
                        imageUrl: adReq.mediaUrl,
                        publicId,
                        title: `${adReq.restaurantName} - ${adReq.title}`,
                        ctaText: 'Order Now',
                        ctaLink: adReq.restaurantId ? `/food/user/restaurants/${adReq.restaurantId}` : '',
                        targetScope: (adReq.scope === 'zone' || adReq.zoneId) ? 'zone' : (adReq.scope || 'global'),
                        zoneId: adReq.zoneId || null,
                        isActive: true
                    });
                }
            }
        }

        res.status(200).json({ success: true, data: requests });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// Set price for an Ad request (Admin)
export const setAdRequestPrice = async (req, res) => {
    try {
        const { id } = req.params;
        const { price } = req.body;

        const adReq = await AdRequest.findById(id);
        if (!adReq) {
            return res.status(404).json({ success: false, message: 'Ad request not found' });
        }

        adReq.price = Number(price);
        adReq.status = 'pending_payment';
        await adReq.save();

        res.status(200).json({ success: true, data: adReq, message: 'Pricing set and request updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// Approve / Make Ad Live (Admin)
export const approveAdRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const adReq = await AdRequest.findById(id);

        if (!adReq) {
            return res.status(404).json({ success: false, message: 'Ad request not found' });
        }

        let mediaUrl = req.body.mediaUrl || adReq.mediaUrl || '';

        // Handle uploaded file if present
        if (req.files && req.files.media && req.files.media[0]) {
            const file = req.files.media[0];
            if (file.mimetype.startsWith('video/')) {
                mediaUrl = await uploadVideoBuffer(file.buffer, 'app_intro_ads');
            } else {
                const sharpRes = await processAndSaveImage(file.buffer, STORAGE_CATEGORIES.BANNERS);
                mediaUrl = sharpRes.fullUrl;
            }
        } else if (req.file) {
            const file = req.file;
            if (file.mimetype.startsWith('video/')) {
                mediaUrl = await uploadVideoBuffer(file.buffer, 'app_intro_ads');
            } else {
                const sharpRes = await processAndSaveImage(file.buffer, STORAGE_CATEGORIES.BANNERS);
                mediaUrl = sharpRes.fullUrl;
            }
        }

        if (!mediaUrl) {
            return res.status(400).json({ success: false, message: 'Ad banner media/file is required for approval' });
        }

        // Create the actual live ad banner
        const newLiveAd = new AppIntroAd({
            title: `${adReq.restaurantName} - ${adReq.title}`,
            mediaUrl: mediaUrl,
            mediaType: adReq.mediaType,
            duration: 5,
            isActive: true,
            type: 'ad',
            startDate: adReq.startDate,
            endDate: adReq.endDate
        });

        await newLiveAd.save();

        // Create or update the actual live dining banner so it shows up in Landing Page / Sponsored Ads Section
        const publicId = `ad_${adReq._id}`;
        await FoodDiningBanner.findOneAndUpdate(
            { publicId },
            {
                imageUrl: mediaUrl,
                publicId,
                title: `${adReq.restaurantName} - ${adReq.title}`,
                ctaText: 'Order Now',
                ctaLink: adReq.restaurantId ? `/food/user/restaurants/${adReq.restaurantId}` : '',
                targetScope: (adReq.scope === 'zone' || adReq.zoneId) ? 'zone' : (adReq.scope || 'global'),
                zoneId: adReq.zoneId || null,
                isActive: true
            },
            { upsert: true, new: true }
        );

        adReq.mediaUrl = mediaUrl;
        adReq.status = 'live';
        await adReq.save();

        res.status(200).json({ success: true, data: adReq, message: 'Ad request approved and campaign is now live' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// Reject Ad request (Admin)
export const rejectAdRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const adReq = await AdRequest.findById(id);
        if (!adReq) {
            return res.status(404).json({ success: false, message: 'Ad request not found' });
        }

        adReq.status = 'rejected';
        adReq.rejectionReason = reason || 'Rejected by admin';
        await adReq.save();

        res.status(200).json({ success: true, data: adReq, message: 'Ad request rejected' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// Cancel Ad request (Admin) - especially for live campaigns
export const cancelAdRequest = async (req, res) => {
    try {
        const { id } = req.params;

        const adReq = await AdRequest.findById(id);
        if (!adReq) {
            return res.status(404).json({ success: false, message: 'Ad request not found' });
        }

        adReq.status = 'rejected';
        adReq.rejectionReason = 'Cancelled by admin after going live';
        await adReq.save();

        // Deactivate associated banners if any
        await FoodDiningBanner.updateMany({ publicId: `ad_${id}` }, { isActive: false });
        await AppIntroAd.updateMany({ title: `${adReq.restaurantName} - ${adReq.title}` }, { isActive: false });
        await PromoBanner.updateMany({ adRequestId: id }, { isActive: false });

        res.status(200).json({ success: true, data: adReq, message: 'Ad request cancelled and banners deactivated' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// Initiate Razorpay payment for Ad request
export const initiateAdRequestPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const adReq = await AdRequest.findById(id);

        if (!adReq) {
            return res.status(404).json({ success: false, message: 'Ad request not found' });
        }

        if (adReq.status !== 'pending_payment') {
            return res.status(400).json({ success: false, message: 'Payment is not pending for this request' });
        }

        // Check if Razorpay is configured
        if (!isRazorpayConfigured()) {
            // Return mock indicator so frontend falls back to mock pay flow if needed
            return res.status(200).json({ 
                success: true, 
                isMock: true, 
                message: 'Razorpay not configured, falling back to mock payment flow' 
            });
        }

        const amountPaise = adReq.price * 100;
        const receipt = `ad_receipt_${adReq._id}`;

        const order = await createRazorpayOrder(amountPaise, 'INR', receipt);

        res.status(200).json({
            success: true,
            isMock: false,
            key: getRazorpayKeyId(),
            orderId: order.id,
            amount: amountPaise,
            currency: 'INR',
            notes: {
                adRequestId: adReq._id.toString(),
                restaurantName: adReq.restaurantName
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error during payment initiation', error: error.message });
    }
};

// Verify Razorpay payment signature
export const verifyAdRequestPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

        const adReq = await AdRequest.findById(id);
        if (!adReq) {
            return res.status(404).json({ success: false, message: 'Ad request not found' });
        }

        if (adReq.status !== 'pending_payment') {
            return res.status(400).json({ success: false, message: 'Ad request status is not pending payment' });
        }

        // Verify Razorpay signature
        const isValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
        if (!isValid) {
            return res.status(400).json({ success: false, message: 'Invalid payment signature verification failed' });
        }

        adReq.paymentStatus = 'paid';
        adReq.status = 'paid';
        adReq.transactionId = razorpayPaymentId;
        await adReq.save();

        res.status(200).json({ success: true, data: adReq, message: 'Payment verified and confirmed successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error during payment verification', error: error.message });
    }
};
