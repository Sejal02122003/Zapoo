import express from 'express';
import { getRestaurantLocationCoupons } from '../controllers/locationCoupon.controller.js';
import { authMiddleware } from '../../../../core/auth/auth.middleware.js';
import { sendError } from '../../../../utils/response.js';

const router = express.Router();

const requireRestaurant = (req, res, next) => {
    if (req.user?.role !== 'RESTAURANT') {
        return sendError(res, 403, 'Restaurant access required');
    }
    next();
};

router.use(authMiddleware, requireRestaurant);

router.get('/', getRestaurantLocationCoupons);

export default router;
