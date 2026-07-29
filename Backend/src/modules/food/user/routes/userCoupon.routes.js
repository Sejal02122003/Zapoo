import express from 'express';
import { getAvailableCoupons, validateCouponEndpoint, getUserCashbackHistory } from '../controllers/userCoupon.controller.js';
import { authMiddleware } from '../../../../core/auth/auth.middleware.js';

const router = express.Router();

router.get('/coupons/available', getAvailableCoupons);
router.post('/order/validate-coupon', authMiddleware, validateCouponEndpoint);
router.get('/wallet/cashback-history', authMiddleware, getUserCashbackHistory);

export default router;
