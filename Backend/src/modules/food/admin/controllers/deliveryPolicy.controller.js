import { DeliveryPolicyVersion } from '../models/deliveryPolicy.model.js';
import { sendResponse } from '../../../../utils/response.js';

export const getDeliveryPolicyController = async (req, res, next) => {
    try {
        const policy = await DeliveryPolicyVersion.findOne()
            .sort({ effectiveFrom: -1 })
            .lean();
        
        if (!policy) {
            // Return defaults if none exist
            return sendResponse(res, 200, 'Current delivery policy', { 
                policy: {
                    enablePenalty: true,
                    penaltyRate: 1,
                    graceMinutes: 5,
                    maxDeduction: 100,
                    autoDeduct: true,
                    excludedReasons: ['Restaurant Delay', 'Customer Delay', 'Weather', 'Traffic Override', 'System Outage'],
                    minOrderValue: 100
                } 
            });
        }
        
        return sendResponse(res, 200, 'Current delivery policy', { policy });
    } catch (error) {
        next(error);
    }
};

export const updateDeliveryPolicyController = async (req, res, next) => {
    try {
        const {
            enablePenalty,
            penaltyRate,
            graceMinutes,
            maxDeduction,
            autoDeduct,
            excludedReasons,
            minOrderValue,
            effectiveFrom
        } = req.body;
        
        // This MUST create a new version, not update in place
        const newPolicy = await DeliveryPolicyVersion.create({
            enablePenalty: enablePenalty ?? true,
            penaltyRate: penaltyRate ?? 1,
            graceMinutes: graceMinutes ?? 5,
            maxDeduction: maxDeduction ?? 100,
            autoDeduct: autoDeduct ?? true,
            excludedReasons: excludedReasons ?? ['Restaurant Delay', 'Customer Delay', 'Weather', 'Traffic Override', 'System Outage'],
            minOrderValue: minOrderValue ?? 100,
            effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
            createdBy: req.user?._id
        });
        
        return sendResponse(res, 200, 'Delivery policy updated successfully', { policy: newPolicy });
    } catch (error) {
        next(error);
    }
};
