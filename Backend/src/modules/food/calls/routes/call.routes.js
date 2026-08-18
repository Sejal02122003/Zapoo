import express from 'express';
import {
    initiateCallBridgeController,
    exotelCallbackController,
    exotelPassthruController,
    getCallConfigController
} from '../controllers/call.controller.js';
import { authMiddleware } from '../../../../core/auth/auth.middleware.js';
import { privateRateLimiter } from '../../../../middleware/rateLimit.js';

const router = express.Router();

// Public / Webhook routes
router.all('/callback', exotelCallbackController);
router.all('/passthru', exotelPassthruController);
router.get('/config', getCallConfigController);

// Authenticated Call Bridge endpoints (User, Delivery Partner, Restaurant, Admin)
router.post('/bridge', authMiddleware, privateRateLimiter, initiateCallBridgeController);
router.post('/initiate', authMiddleware, privateRateLimiter, initiateCallBridgeController);

export default router;
