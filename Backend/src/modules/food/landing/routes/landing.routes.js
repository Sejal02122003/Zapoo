import express from 'express';
import { upload } from '../../../../middleware/upload.js';
import {
    listHeroBannersController,
    uploadHeroBannersController,
    deleteHeroBannerController,
    updateHeroBannerOrderController,
    toggleHeroBannerStatusController,
    linkRestaurantsToBannerController,
    updateBannerTargetScopeController
} from '../controllers/heroBanner.controller.js';

import {
    listUnder99BannersController,
    uploadUnder99BannersController,
    deleteUnder99BannerController,
    updateUnder99BannerOrderController,
    toggleUnder99BannerStatusController
} from '../controllers/under99Banner.controller.js';
import {
    listDiningBannersController,
    uploadDiningBannersController,
    deleteDiningBannerController,
    updateDiningBannerOrderController,
    toggleDiningBannerStatusController,
    updateDiningBannerTargetScopeController
} from '../controllers/diningBanner.controller.js';
import {
    getAdminLandingSettingsController,
    updateAdminLandingSettingsController
} from '../controllers/landingSettings.controller.js';
import {
    listExploreMoreController,
    createExploreMoreController,
    updateExploreMoreController,
    deleteExploreMoreController,
    toggleExploreMoreStatusController,
    updateExploreMoreOrderController
} from '../controllers/exploreIcon.controller.js';
import {
    getPublicHeroBannersController,
    getPublicUnder99BannersController,
    getPublicDiningBannersController,
    getPublicExploreIconsController,
    getPublicGourmetController,
    getPublicLandingSettingsController,
    getPublicOffersController
} from '../controllers/publicLanding.controller.js';
import {
    getAdminOffersController,
    addOfferController,
    updateOfferOrderController,
    toggleOfferStatusController,
    deleteOfferController
} from '../controllers/offersAdmin.controller.js';
import { detectZonePublicController, listZonesPublicController, listZonesNearbyPublicController } from '../controllers/zonePublic.controller.js';
import { getPublicEnvController } from '../controllers/publicEnv.controller.js';
import {
    listGourmetAdmin,
    createGourmetAdmin,
    deleteGourmetAdmin,
    updateGourmetOrderAdmin,
    toggleGourmetStatusAdmin
} from '../controllers/top10GourmetAdmin.controller.js';
import { getPublicPageController } from '../../admin/controllers/pageContent.controller.js';
import { getPublicReferralSettingsController } from '../controllers/publicReferralSettings.controller.js';
import { getPublicActiveAds } from '../../admin/controllers/appIntroAd.controller.js';
import { reverseGeocodePublicController, computeDistancePublicController } from '../controllers/locationPublic.controller.js';

const router = express.Router();

// Public CMS pages (About + legal). No auth required.
router.get('/pages/:key', getPublicPageController);
// Public referral settings (no auth required).
router.get('/referral-settings', getPublicReferralSettingsController);

// Admin hero banner management (DEV: auth temporarily disabled for faster integration)
router.get('/hero-banners', listHeroBannersController);
router.post(
    '/hero-banners/multiple',
    upload.array('files'),
    uploadHeroBannersController
);
router.delete('/hero-banners/:id', deleteHeroBannerController);
router.patch('/hero-banners/:id/order', updateHeroBannerOrderController);
router.patch('/hero-banners/:id/status', toggleHeroBannerStatusController);
router.patch('/hero-banners/:id/link-restaurants', linkRestaurantsToBannerController);
router.patch('/hero-banners/:id/target-scope', updateBannerTargetScopeController);


// Admin under 250 banners
router.get('/hero-banners/under-99', listUnder99BannersController);
router.post(
    '/hero-banners/under-99/multiple',
    upload.array('files'),
    uploadUnder99BannersController
);
router.delete('/hero-banners/under-99/:id', deleteUnder99BannerController);
router.patch('/hero-banners/under-99/:id/order', updateUnder99BannerOrderController);
router.patch('/hero-banners/under-99/:id/status', toggleUnder99BannerStatusController);

// Admin ads banners
router.get('/hero-banners/ads', listDiningBannersController);
router.post(
    '/hero-banners/ads/multiple',
    upload.array('files'),
    uploadDiningBannersController
);
router.delete('/hero-banners/ads/:id', deleteDiningBannerController);
router.patch('/hero-banners/ads/:id/order', updateDiningBannerOrderController);
router.patch('/hero-banners/ads/:id/status', toggleDiningBannerStatusController);
router.patch('/hero-banners/ads/:id/target-scope', updateDiningBannerTargetScopeController);

// Admin Explore More (icons)
router.get('/hero-banners/landing/explore-more', listExploreMoreController);
router.post(
    '/hero-banners/landing/explore-more',
    upload.single('image'),
    createExploreMoreController
);
router.delete('/hero-banners/landing/explore-more/:id', deleteExploreMoreController);
router.patch('/hero-banners/landing/explore-more/:id/status', toggleExploreMoreStatusController);
router.patch('/hero-banners/landing/explore-more/:id/order', updateExploreMoreOrderController);
router.patch(
    '/hero-banners/landing/explore-more/:id',
    upload.single('image'),
    updateExploreMoreController
);

// Admin Gourmet (hero-banners)
router.get('/hero-banners/gourmet', listGourmetAdmin);
router.post('/hero-banners/gourmet', createGourmetAdmin);
router.delete('/hero-banners/gourmet/:id', deleteGourmetAdmin);
router.patch('/hero-banners/gourmet/:id/order', updateGourmetOrderAdmin);
router.patch('/hero-banners/gourmet/:id/status', toggleGourmetStatusAdmin);

// Admin Offers (hero-banners)
router.get('/hero-banners/offers', getAdminOffersController);
router.post('/hero-banners/offers', addOfferController);
router.delete('/hero-banners/offers/:id', deleteOfferController);
router.patch('/hero-banners/offers/:id/order', updateOfferOrderController);
router.patch('/hero-banners/offers/:id/status', toggleOfferStatusController);

// Public landing endpoints (Food user app)
router.get('/hero-banners/public', getPublicHeroBannersController);
router.get('/hero-banners/under-99/public', getPublicUnder99BannersController);
router.get('/hero-banners/ads/public', getPublicDiningBannersController);
router.get('/explore-icons/public', getPublicExploreIconsController);
router.get('/hero-banners/gourmet/public', getPublicGourmetController);
router.get('/hero-banners/offers/public', getPublicOffersController);
router.get('/landing/settings/public', getPublicLandingSettingsController);
router.get('/location/reverse-geocode', reverseGeocodePublicController);
router.post('/location/distance', computeDistancePublicController);
router.get('/zones/detect', detectZonePublicController);
router.get('/zones/nearby', listZonesNearbyPublicController);
router.get('/zones/public', listZonesPublicController);
router.get('/public/env', getPublicEnvController);
router.get('/app-intro-ads/public', getPublicActiveAds);

// Admin landing settings (old paths used by admin UI)
router.get('/hero-banners/landing/settings', getAdminLandingSettingsController);
router.patch('/hero-banners/landing/settings', updateAdminLandingSettingsController);

export default router;

