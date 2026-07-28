import express from 'express';
import authRoutes from '../core/auth/auth.routes.js';
import deliveryRoutes from '../modules/food/delivery/routes/delivery.routes.js';
import restaurantRoutes from '../modules/food/restaurant/routes/restaurant.routes.js';
import landingRoutes from '../modules/food/landing/routes/landing.routes.js';
import { getPublicDiningCategories, getPublicDiningRestaurants, getPublicRestaurantOccupiedSeats } from '../modules/food/dining/controllers/diningPublic.controller.js';
import { createBooking, getMyBookings, createReview, getRestaurantBookings, updateBookingStatus } from '../modules/food/dining/controllers/diningBooking.controller.js';
import uploadRoutes from '../modules/uploads/routes/upload.routes.js';
import restaurantAdminRoutes from '../modules/food/admin/routes/admin.routes.js';
import userRoutes from '../modules/food/user/routes/user.routes.js';
import orderUserRoutes from '../modules/food/orders/routes/order.routes.user.js';
import paymentRoutes from '../core/payments/payment.routes.js';
import fcmRoutes from '../core/notifications/fcm.routes.js';
import notificationRoutes from '../core/notifications/notification.routes.js';
import { authMiddleware } from '../core/auth/auth.middleware.js';
import * as businessSettingsController from '../modules/food/admin/controllers/businessSettings.controller.js';
import * as adminController from '../modules/food/admin/controllers/admin.controller.js';
import { requireRoles } from '../core/roles/role.middleware.js';
import { getQueuesController } from '../controllers/admin.controller.js';
import webhookRoutes from '../core/payments/routes/webhook.routes.js';
import searchRoutes from '../modules/food/search/routes/search.routes.js';
import appConfigRoutes from '../core/appConfig/appConfig.routes.js';
import promocodeRoutes from './promocodeRoutes.js';
import { requireZone } from '../middlewares/zone.middleware.js';
import envSettingRoutes from './admin/envSettingRoutes.js';
import { weatherPricingRoutes } from '../modules/food/weatherPricing/routes/weatherPricing.routes.js';
import { shiftRoutes } from '../modules/food/shifts/routes/shift.routes.js';

const router = express.Router();

import { privateRateLimiter } from '../middleware/rateLimit.js';

// Apply Global Zone Interceptor (Reads X-Zone-Id from Frontend Axios)
router.use(requireZone);

router.get('/v1/health', (req, res) => {
    res.status(200).json({ status: 'UP', message: 'Server is healthy' });
});

// App Config Route (Public Category B)
router.use('/v1/app-config', appConfigRoutes);

// Food-prefixed auth routes (Category A Auth limiter attached inside auth.routes.js)
router.use('/v1/food/auth', authRoutes);

// Backward-compatible auth routes
router.use('/v1/auth', authRoutes);
router.use('/v1/food/delivery', deliveryRoutes);
router.use('/v1/food/restaurant', restaurantRoutes);

// Public Category B APIs (Unrestricted per SOP)
router.use('/v1/food', landingRoutes);
router.use('/v1/food/search', searchRoutes);
router.use('/v1/food/promocodes', promocodeRoutes);
router.get('/v1/food/dining/categories/public', getPublicDiningCategories);
router.get('/v1/food/dining/restaurants/public', getPublicDiningRestaurants);
router.get('/v1/food/dining/restaurants/:restaurantId/occupied-seats/public', getPublicRestaurantOccupiedSeats);

// Dining Booking Routes (Private Category C: After authMiddleware -> privateRateLimiter)
router.post('/v1/food/dining/bookings', authMiddleware, privateRateLimiter, requireRoles('USER'), createBooking);
router.get('/v1/food/dining/bookings/my', authMiddleware, privateRateLimiter, requireRoles('USER'), getMyBookings);
router.post('/v1/food/dining/bookings/:bookingId/review', authMiddleware, privateRateLimiter, requireRoles('USER'), createReview);
router.get('/v1/food/dining/bookings/restaurant/:restaurantId', authMiddleware, privateRateLimiter, requireRoles('RESTAURANT', 'ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN'), getRestaurantBookings);
router.patch('/v1/food/dining/bookings/:bookingId/status', authMiddleware, privateRateLimiter, requireRoles('RESTAURANT', 'ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN'), updateBookingStatus);

router.use('/v1/uploads', uploadRoutes);

// Public Admin Settings (Public Category B)
router.get('/v1/food/admin/business-settings/public', businessSettingsController.getBusinessSettings);
router.get('/v1/food/admin/fee-settings/public', adminController.getFeeSettings);
router.get('/v1/food/public/env', (_req, res) => {
    res.json({
        success: true,
        data: {
            VITE_FIREBASE_API_KEY: process.env.VITE_FIREBASE_API_KEY,
            VITE_FIREBASE_AUTH_DOMAIN: process.env.VITE_FIREBASE_AUTH_DOMAIN,
            VITE_FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
            VITE_FIREBASE_APP_ID: process.env.VITE_FIREBASE_APP_ID,
            VITE_FIREBASE_MESSAGING_SENDER_ID: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
            VITE_FIREBASE_STORAGE_BUCKET: process.env.VITE_FIREBASE_STORAGE_BUCKET,
            VITE_FIREBASE_MEASUREMENT_ID: process.env.VITE_FIREBASE_MEASUREMENT_ID
        }
    });
});

// Private Category C APIs (Must run AFTER authMiddleware so req.user exists)
router.use('/v1/food/admin/env', envSettingRoutes);
router.use('/v1/food/admin/weather-pricing', authMiddleware, privateRateLimiter, requireRoles('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN'), weatherPricingRoutes);
router.use('/v1/food/admin/shifts', authMiddleware, privateRateLimiter, shiftRoutes);
router.use('/v1/food/admin', authMiddleware, privateRateLimiter, requireRoles('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN'), restaurantAdminRoutes);
router.use('/v1/food/user', authMiddleware, privateRateLimiter, requireRoles('USER'), userRoutes);
router.use('/v1/food/notifications', authMiddleware, privateRateLimiter, requireRoles('USER', 'RESTAURANT', 'DELIVERY_PARTNER'), notificationRoutes);
router.use('/v1/food/orders', authMiddleware, privateRateLimiter, requireRoles('USER'), orderUserRoutes);
router.use('/v1/food/payments', authMiddleware, privateRateLimiter, paymentRoutes);
router.use('/v1/payments/webhook', webhookRoutes);
router.use('/v1/fcm-tokens', fcmRoutes);
router.use('/fcm-tokens', fcmRoutes);

router.get('/v1/admin/queues', authMiddleware, privateRateLimiter, requireRoles('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN'), getQueuesController);

export default router;
