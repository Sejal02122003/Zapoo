import express from 'express';
import { createLocationCoupon, getLocationCoupons, updateLocationCoupon, deleteLocationCoupon } from '../controllers/locationCoupon.controller.js';
const router = express.Router();

router.post('/', createLocationCoupon);
router.get('/', getLocationCoupons);
router.patch('/:id', updateLocationCoupon);
router.delete('/:id', deleteLocationCoupon);

export default router;
