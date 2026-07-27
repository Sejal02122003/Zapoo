import mongoose from 'mongoose';
import { get7DayActiveHours, handleHeartbeat } from '../services/dutyLog.service.js';
import { FoodDeliveryPartner } from '../models/deliveryPartner.model.js';
import { sendResponse } from '../../../../utils/response.js';

async function findPartnerIdFromReq(req) {
    const uId = req.user?.userId || req.user?._id || req.user?.id;
    const phone = req.user?.phone;

    let partner = null;
    if (uId && mongoose.Types.ObjectId.isValid(uId)) {
        partner = await FoodDeliveryPartner.findById(uId).select('_id').lean();
    }
    if (!partner && phone) {
        partner = await FoodDeliveryPartner.findOne({ phone: String(phone) }).select('_id').lean();
    }
    if (!partner && uId) {
        partner = await FoodDeliveryPartner.findOne({ userId: String(uId) }).select('_id').lean();
    }

    return partner?._id || null;
}

export async function getRiderActiveHoursController(req, res, next) {
    try {
        const partnerId = await findPartnerIdFromReq(req);
        if (!partnerId) {
            return sendResponse(res, 404, 'Delivery partner profile not found');
        }

        const data = await get7DayActiveHours(partnerId);
        return sendResponse(res, 200, 'Rider 7-day active hours retrieved', data);
    } catch (err) {
        next(err);
    }
}

export async function riderHeartbeatController(req, res, next) {
    try {
        const partnerId = await findPartnerIdFromReq(req);
        if (!partnerId) {
            return sendResponse(res, 404, 'Delivery partner profile not found');
        }

        await handleHeartbeat(partnerId);
        return sendResponse(res, 200, 'Heartbeat recorded');
    } catch (err) {
        next(err);
    }
}

export async function getAdminRiderActiveHoursController(req, res, next) {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return sendResponse(res, 400, 'Invalid rider ID parameter');
        }

        const partner = await FoodDeliveryPartner.findById(id).select('name phone vehicleType status availabilityStatus').lean();
        if (!partner) {
            return sendResponse(res, 404, 'Rider not found');
        }

        const hoursData = await get7DayActiveHours(id);
        return sendResponse(res, 200, 'Admin rider 7-day active hours retrieved', {
            rider: partner,
            ...hoursData
        });
    } catch (err) {
        next(err);
    }
}

export async function getAdminActiveHoursRosterController(req, res, next) {
    try {
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
        const page = Math.max(1, Number(req.query.page) || 1);
        const skip = (page - 1) * limit;

        const riders = await FoodDeliveryPartner.find({ status: 'approved' })
            .select('name phone vehicleType vehicleNumber availabilityStatus profilePhoto')
            .sort({ availabilityStatus: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const totalRiders = await FoodDeliveryPartner.countDocuments({ status: 'approved' });

        const roster = await Promise.all(
            riders.map(async (r) => {
                const h = await get7DayActiveHours(r._id);
                return {
                    riderId: r._id,
                    name: r.name,
                    phone: r.phone,
                    vehicleType: r.vehicleType || 'BIKE',
                    vehicleNumber: r.vehicleNumber || '',
                    availabilityStatus: r.availabilityStatus || 'offline',
                    totalHours: h.totalHours,
                    totalMinutes: h.totalMinutes,
                    isCurrentlyOnline: h.isCurrentlyOnline
                };
            })
        );

        return sendResponse(res, 200, 'Admin active hours roster retrieved', {
            roster,
            pagination: {
                total: totalRiders,
                page,
                limit,
                pages: Math.ceil(totalRiders / limit)
            }
        });
    } catch (err) {
        next(err);
    }
}
