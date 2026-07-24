import express from 'express';
import { shiftController } from '../controllers/shift.controller.js';

export const shiftRoutes = express.Router();

// --- ADMIN APIs ---
// Mounted in routes/index.js under /v1/food/admin/shifts
shiftRoutes.post('/', shiftController.createShift);
shiftRoutes.get('/', shiftController.getShiftsAdmin);
shiftRoutes.patch('/:id', shiftController.updateShift);
shiftRoutes.get('/:id/report', shiftController.getShiftReport);

// --- RIDER APIs ---
// Consider moving rider routes to /v1/food/delivery-partner/shifts if strictly following patterns,
// but for now we mount them here.
shiftRoutes.get('/rider', shiftController.getAvailableShifts);
shiftRoutes.post('/rider/:id/book', shiftController.bookShift);
shiftRoutes.post('/rider/:id/cancel', shiftController.cancelBooking);

// --- ATTENDANCE APIs ---
shiftRoutes.post('/rider/attendance/heartbeat', shiftController.heartbeat);
shiftRoutes.post('/rider/attendance/logout', shiftController.logout);

// --- SYSTEM API ---
shiftRoutes.post('/system/settlement', shiftController.runSettlement);
