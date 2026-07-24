import mongoose from 'mongoose';
import { registerDeliveryPartner, updateDeliveryPartnerProfile, updateDeliveryPartnerBankDetails, listSupportTicketsByPartner, createSupportTicket, getSupportTicketByIdAndPartner, updateDeliveryPartnerDetails, updateDeliveryPartnerProfilePhotoBase64, updateDeliveryAvailability, getDeliveryPartnerWallet, getDeliveryPartnerEarnings, getDeliveryPartnerTripHistory, getDeliveryPocketDetails, getActiveEarningAddonsForPartner } from '../services/delivery.service.js';
import { createDeliveryCashDepositOrder, getDeliveryPartnerWalletEnhanced, requestDeliveryWithdrawal, verifyDeliveryCashDepositPayment } from '../services/deliveryFinance.service.js';
import { getDeliveryCashLimitSettings, getDeliveryEmergencyHelp } from '../../admin/services/admin.service.js';
import { DeliveryBonusTransaction } from '../../admin/models/deliveryBonusTransaction.model.js';
import { validateDeliveryRegisterDto, validateDeliveryProfileUpdateDto, validateDeliveryBankDetailsDto } from '../validators/delivery.validator.js';
import { sendResponse } from '../../../../utils/response.js';
import { getDeliveryReferralStats } from '../services/deliveryReferral.service.js';

export const registerDeliveryPartnerController = async (req, res, next) => {
    try {
        const validated = validateDeliveryRegisterDto(req.body);
        const partner = await registerDeliveryPartner(validated, req.files);
        return sendResponse(res, 201, 'Delivery partner registered successfully', partner);
    } catch (error) {
        next(error);
    }
};

export const updateDeliveryPartnerProfileController = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        const validated = validateDeliveryProfileUpdateDto(req.body);
        const result = await updateDeliveryPartnerProfile(userId, validated, req.files);
        return sendResponse(res, 200, 'Profile updated successfully', result);
    } catch (error) {
        next(error);
    }
};

export const updateDeliveryPartnerDetailsController = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        const partner = await updateDeliveryPartnerDetails(userId, req.body || {});
        return sendResponse(res, 200, 'Profile updated successfully', { partner });
    } catch (error) {
        next(error);
    }
};

export const updateDeliveryPartnerProfilePhotoBase64Controller = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        const partner = await updateDeliveryPartnerProfilePhotoBase64(userId, req.body || {});
        return sendResponse(res, 200, 'Profile photo updated successfully', { partner });
    } catch (error) {
        next(error);
    }
};

export const updateDeliveryPartnerBankDetailsController = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        const validated = validateDeliveryBankDetailsDto(req.body);
        const partner = await updateDeliveryPartnerBankDetails(userId, validated, req.files);
        const data = {
            bankDetails: {
                accountHolderName: partner.bankAccountHolderName,
                accountNumber: partner.bankAccountNumber,
                ifscCode: partner.bankIfscCode,
                bankName: partner.bankName,
                upiId: partner.upiId,
                upiQrCode: partner.upiQrCode
            },
            panNumber: partner.panNumber
        };
        return sendResponse(res, 200, 'Bank details updated successfully', data);
    } catch (error) {
        next(error);
    }
};

export const listSupportTicketsController = async (req, res, next) => {
    try {
        const deliveryPartnerId = req.user?.userId;
        const tickets = await listSupportTicketsByPartner(deliveryPartnerId);
        return sendResponse(res, 200, 'Tickets fetched successfully', { tickets });
    } catch (error) {
        next(error);
    }
};

export const createSupportTicketController = async (req, res, next) => {
    try {
        const deliveryPartnerId = req.user?.userId;
        const ticket = await createSupportTicket(deliveryPartnerId, req.body);
        return sendResponse(res, 201, 'Ticket created successfully', ticket);
    } catch (error) {
        next(error);
    }
};

export const getSupportTicketByIdController = async (req, res, next) => {
    try {
        const deliveryPartnerId = req.user?.userId;
        const ticket = await getSupportTicketByIdAndPartner(req.params.id, deliveryPartnerId);
        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }
        return sendResponse(res, 200, 'Ticket fetched successfully', ticket);
    } catch (error) {
        next(error);
    }
};

export const updateAvailabilityController = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        const data = await updateDeliveryAvailability(userId, req.body || {});
        return sendResponse(res, 200, 'Availability updated successfully', data);
    } catch (error) {
        next(error);
    }
};

export const getWalletController = async (req, res, next) => {
    try {
        const deliveryPartnerId = req.user?.userId;
        const requestedTypeRaw = String(req.query?.type || '').trim().toLowerCase();
        const rawLimit = Number.parseInt(String(req.query?.limit || ''), 10);
        const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : 50;

        const normalizeWalletTransaction = (tx) => ({
            ...tx,
            id: tx?.id || tx?._id,
            _id: tx?._id || tx?.id,
            amount: Number(tx?.amount) || 0,
            date: tx?.date || tx?.createdAt,
            createdAt: tx?.createdAt || tx?.date
        });

        if (requestedTypeRaw === 'bonus' || requestedTypeRaw === 'deposit' || requestedTypeRaw === 'deduction' || requestedTypeRaw === 'withdrawal') {
            if (!deliveryPartnerId || !mongoose.Types.ObjectId.isValid(deliveryPartnerId)) {
                return sendResponse(res, 200, 'Wallet fetched successfully', { wallet: { transactions: [] } });
            }

            const wallet = await getDeliveryPartnerWalletEnhanced(deliveryPartnerId);
            if (requestedTypeRaw === 'bonus') {
                const bonusList = await DeliveryBonusTransaction.find({ deliveryPartnerId })
                    .sort({ createdAt: -1 })
                    .limit(limit)
                    .lean();

                wallet.transactions = (bonusList || []).map((b) => ({
                    id: b._id,
                    _id: b._id,
                    type: 'bonus',
                    amount: b.amount || 0,
                    status: 'Completed',
                    date: b.createdAt,
                    createdAt: b.createdAt,
                    description: b.reference || 'Bonus',
                    transactionId: b.transactionId
                }));
            } else {
                const allowedTypes = new Set([requestedTypeRaw]);

                wallet.transactions = (wallet.transactions || [])
                    .filter((tx) => allowedTypes.has(String(tx?.type || '').trim().toLowerCase()))
                    .map(normalizeWalletTransaction)
                    .slice(0, limit);
            }

            return sendResponse(res, 200, 'Wallet fetched successfully', { wallet });
        }

        const wallet = await getDeliveryPartnerWalletEnhanced(deliveryPartnerId);
        return sendResponse(res, 200, 'Wallet fetched successfully', { wallet });
    } catch (error) {
        next(error);
    }
};

export const createWithdrawalRequestController = async (req, res, next) => {
    try {
        const deliveryPartnerId = req.user?.userId;
        const result = await requestDeliveryWithdrawal(deliveryPartnerId, req.body || {});
        return sendResponse(res, 201, 'Withdrawal request submitted successfully', { withdrawal: result });
    } catch (error) {
        next(error);
    }
};

export const getEarningsController = async (req, res, next) => {
    try {
        const deliveryPartnerId = req.user?.userId;
        const data = await getDeliveryPartnerEarnings(deliveryPartnerId, req.query || {});
        return sendResponse(res, 200, 'Earnings fetched successfully', data);
    } catch (error) {
        next(error);
    }
};

export const getActiveEarningAddonsController = async (req, res, next) => {
    try {
        const deliveryPartnerId = req.user?.userId;
        const data = await getActiveEarningAddonsForPartner(deliveryPartnerId);
        return sendResponse(res, 200, 'Active earning addons fetched successfully', data);
    } catch (error) {
        next(error);
    }
};

export const createCashDepositOrderController = async (req, res, next) => {
    try {
        const deliveryPartnerId = req.user?.userId;
        const amount = req.body?.amount;
        const data = await createDeliveryCashDepositOrder(deliveryPartnerId, amount);
        return sendResponse(res, 201, 'Cash deposit order created successfully', data);
    } catch (error) {
        next(error);
    }
};

export const verifyCashDepositPaymentController = async (req, res, next) => {
    try {
        const deliveryPartnerId = req.user?.userId;
        const data = await verifyDeliveryCashDepositPayment(deliveryPartnerId, {
            razorpayOrderId: req.body?.razorpay_order_id,
            razorpayPaymentId: req.body?.razorpay_payment_id,
            razorpaySignature: req.body?.razorpay_signature,
            amount: req.body?.amount
        });
        return sendResponse(res, 200, 'Cash deposit verified successfully', data);
    } catch (error) {
        next(error);
    }
};

export const getTripHistoryController = async (req, res, next) => {
    try {
        const deliveryPartnerId = req.user?.userId;
        const data = await getDeliveryPartnerTripHistory(deliveryPartnerId, req.query || {});
        return sendResponse(res, 200, 'Trip history fetched successfully', data);
    } catch (error) {
        next(error);
    }
};

export const getPocketDetailsController = async (req, res, next) => {
    try {
        const deliveryPartnerId = req.user?.userId;
        const data = await getDeliveryPocketDetails(deliveryPartnerId, req.query || {});
        return sendResponse(res, 200, 'Pocket details fetched successfully', data);
    } catch (error) {
        next(error);
    }
};

export const getEmergencyHelpController = async (req, res, next) => {
    try {
        const data = await getDeliveryEmergencyHelp();
        return sendResponse(res, 200, 'Emergency help fetched successfully', data);
    } catch (error) {
        next(error);
    }
};

export const getCashLimitController = async (req, res, next) => {
    try {
        const data = await getDeliveryCashLimitSettings();
        return sendResponse(res, 200, 'Cash limit fetched successfully', data);
    } catch (error) {
        next(error);
    }
};

export const getDeliveryReferralStatsController = async (req, res, next) => {
    try {
        const deliveryPartnerId = req.user?.userId;
        const stats = await getDeliveryReferralStats(deliveryPartnerId);
        return sendResponse(res, 200, 'Referral stats fetched successfully', { stats });
    } catch (error) {
        next(error);
    }
};

import { DeliveryPenalty } from '../models/deliveryPenalty.model.js';
export const getPenaltiesHistoryRiderController = async (req, res, next) => {
    try {
        const riderId = req.user?.userId;
        const penalties = await DeliveryPenalty.find({ riderId, status: { $in: ['APPLIED', 'APPEALED', 'REFUNDED', 'WAIVED'] } })
            .populate('orderId', 'order_id')
            .sort({ createdAt: -1 })
            .lean();
        
        return sendResponse(res, 200, 'Penalties fetched successfully', { penalties });
    } catch (error) {
        next(error);
    }
};

export const appealPenaltyController = async (req, res, next) => {
    try {
        const riderId = req.user?.userId;
        const penaltyId = req.params.id;
        const { reason } = req.body;

        if (!reason || reason.trim() === '') {
            throw new ValidationError('Appeal reason is required');
        }

        const penalty = await DeliveryPenalty.findOne({ _id: penaltyId, riderId });
        if (!penalty) {
            throw new ValidationError('Penalty not found');
        }
        if (penalty.status !== 'APPLIED') {
            throw new ValidationError(`Cannot appeal penalty in ${penalty.status} state`);
        }

        penalty.status = 'APPEALED';
        penalty.appealReason = reason;
        await penalty.save();

        return sendResponse(res, 200, 'Appeal submitted successfully', { penalty });
    } catch (error) {
        next(error);
    }
};
export const triggerSOSAlertController = async (req, res, next) => {
    try {
        const { type } = req.body;
        const riderId = req.user._id;
        
        // Find if rider has an active order
        const { FoodOrder } = await import('../../orders/models/order.model.js');
        const activeOrder = await FoodOrder.findOne({
            deliveryPartner: riderId,
            orderStatus: { $in: ['DELIVERY_ASSIGNED', 'PICKING_UP', 'PICKED_UP', 'ARRIVED'] }
        }).select('_id orderNumber');
        
        // Dynamically import socket to emit directly to admin room
        const { getSocketIo } = await import('../../../../utils/socket.js');
        const io = getSocketIo();
        
        if (io) {
            io.to('admin').emit('rider_sos_alert', {
                riderId,
                type,
                riderName: `${req.user.firstName} ${req.user.lastName}`,
                phone: req.user.phone,
                activeOrderId: activeOrder ? activeOrder._id : null,
                activeOrderNumber: activeOrder ? activeOrder.orderNumber : null,
                timestamp: new Date()
            });
        }
        
        // Optional: also push a notification
        const { notifyAdminsSafely } = await import('../../../../core/notifications/firebase.service.js');
        await notifyAdminsSafely({
            title: 'EMERGENCY: Rider SOS Alert',
            body: `Rider ${req.user.firstName} ${req.user.lastName} triggered a ${type} alert. ${activeOrder ? 'Active Order: ' + activeOrder.orderNumber : ''}`,
            data: { type: 'sos_alert', riderId: String(riderId), activeOrderId: activeOrder ? String(activeOrder._id) : null }
        });
        
        return sendResponse(res, 200, 'SOS Alert sent successfully');
    } catch (e) {
        next(e);
    }
};

export const acceptReassignmentController = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const currentDriverId = req.user._id;

        const { FoodOrder } = await import('../../orders/models/order.model.js');
        const order = await FoodOrder.findById(orderId);

        if (!order || order.reassignmentStatus !== 'pending' || order.pendingReassignedDriverId?.toString() !== currentDriverId.toString()) {
            return res.status(400).json({ success: false, message: 'Reassignment request is invalid or has expired' });
        }

        order.dispatch = order.dispatch || {};
        order.dispatch.deliveryPartnerId = currentDriverId;
        order.reassignmentStatus = 'accepted';
        order.pendingReassignedDriverId = null;

        const historyIndex = order.reassignmentHistory.length - 1;
        if (historyIndex >= 0) {
            order.reassignmentHistory[historyIndex].reassignmentStatus = 'accepted';
        }

        await order.save();

        const { getSocketIo } = await import('../../../../utils/socket.js');
        const io = getSocketIo();
        if (io) {
            io.to('admin').emit('reassignment_accepted', { orderId: order._id, newDriverId: currentDriverId });
            if (order.previousAssignedDriverId) {
                io.to(`delivery_${order.previousAssignedDriverId}`).emit('reassignment_accepted_previous', { orderId: order._id });
            }
        }

        return res.status(200).json({ success: true, message: 'Reassignment accepted successfully' });
    } catch (error) {
        console.error('acceptReassignment error', error);
        next(error);
    }
};

export const rejectReassignmentController = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const currentDriverId = req.user._id;

        const { FoodOrder } = await import('../../orders/models/order.model.js');
        const order = await FoodOrder.findById(orderId);

        if (!order || order.reassignmentStatus !== 'pending' || order.pendingReassignedDriverId?.toString() !== currentDriverId.toString()) {
            return res.status(400).json({ success: false, message: 'Reassignment request is invalid or has expired' });
        }

        order.reassignmentStatus = 'rejected';
        order.pendingReassignedDriverId = null;

        const historyIndex = order.reassignmentHistory.length - 1;
        if (historyIndex >= 0) {
            order.reassignmentHistory[historyIndex].reassignmentStatus = 'rejected';
        }

        await order.save();

        const { getSocketIo } = await import('../../../../utils/socket.js');
        const io = getSocketIo();
        if (io) {
            io.to('admin').emit('reassignment_rejected', { orderId: order._id, driverId: currentDriverId });
        }

        return res.status(200).json({ success: true, message: 'Reassignment rejected successfully' });
    } catch (error) {
        console.error('rejectReassignment error', error);
        next(error);
    }
};
