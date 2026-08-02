import express from 'express';
import {
    calculateOrderController,
    createOrderController,
    verifyPaymentController,
    listOrdersUserController,
    getOrderPaymentsUserController,
    getOrderByIdUserController,
    cancelOrderController,
    submitOrderRatingsController,
    getOrderDropOtpUserController,
    updateOrderInstructionsController,
    getOrderInvoiceController
} from '../controllers/order.controller.js';

const router = express.Router();

router.post('/calculate', calculateOrderController);
router.post('/', createOrderController);
router.post('/verify-payment', verifyPaymentController);
router.get('/', listOrdersUserController);
router.get('/:orderId/payments', getOrderPaymentsUserController);
router.get('/:orderId/drop-otp', getOrderDropOtpUserController);
router.get('/:orderId', getOrderByIdUserController);
router.get('/:orderId/invoice', getOrderInvoiceController);
router.patch('/:orderId/cancel', cancelOrderController);
router.patch('/:orderId/ratings', submitOrderRatingsController);
router.patch('/:orderId/instructions', updateOrderInstructionsController);

export default router;
