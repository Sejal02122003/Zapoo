import express from 'express';
import { shiftController } from '../controllers/shift.controller.js';
import { payoutController } from '../controllers/payout.controller.js';

export const shiftRoutes = express.Router();

// --- ADMIN SHIFT TEMPLATE APIs ---
shiftRoutes.post('/templates', shiftController.createTemplate);
shiftRoutes.get('/templates', shiftController.getTemplates);
shiftRoutes.get('/templates/:id', shiftController.getTemplateById);
shiftRoutes.patch('/templates/:id', shiftController.updateTemplate);
shiftRoutes.delete('/templates/:id', shiftController.deleteTemplate);
shiftRoutes.post('/generate', shiftController.generateShifts);

// --- ADMIN PAYOUT APIs ---
shiftRoutes.get('/payouts', payoutController.getPayoutsAdmin);
shiftRoutes.get('/payouts/:id', payoutController.getPayoutByIdAdmin);
shiftRoutes.post('/payouts/:id/mark-paid', payoutController.markAsPaid);
shiftRoutes.post('/payouts/:id/hold', payoutController.holdPayout);

// --- ADMIN SHIFT APIs ---
shiftRoutes.post('/', shiftController.createShift);
shiftRoutes.get('/', shiftController.getShiftsAdmin);
shiftRoutes.patch('/:id', shiftController.updateShift);
shiftRoutes.get('/:id/report', shiftController.getShiftReport);
shiftRoutes.get('/:id/riders-detail', shiftController.getShiftRidersDetail);
shiftRoutes.post('/:id/riders/:riderId/pay', shiftController.payRiderForShift);

// --- RIDER SHIFT & PAYOUT APIs ---
shiftRoutes.get('/rider', shiftController.getAvailableShifts);
shiftRoutes.post('/rider/:id/book', shiftController.bookShift);
shiftRoutes.post('/rider/:id/cancel', shiftController.cancelBooking);
shiftRoutes.get('/rider/payouts', payoutController.getRiderPayouts);

// --- ATTENDANCE APIs ---
shiftRoutes.post('/rider/attendance/heartbeat', shiftController.heartbeat);
shiftRoutes.post('/rider/attendance/logout', shiftController.logout);

// --- SYSTEM API ---
shiftRoutes.post('/system/settlement', shiftController.runSettlement);
