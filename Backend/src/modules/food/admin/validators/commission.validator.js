import { z } from 'zod';
import mongoose from 'mongoose';
import { ValidationError } from '../../../../core/auth/errors.js';

const commissionSubSchema = z.object({
    type: z.enum(['percentage', 'amount']).default('percentage'),
    value: z.number().min(0, 'Commission value must be 0 or greater')
});

const restaurantCommissionUpsertSchema = z.object({
    restaurantId: z.string().min(1, 'Restaurant is required'),
    defaultCommission: commissionSubSchema.optional(),
    deliveryCommission: commissionSubSchema.optional(),
    takeawayCommission: commissionSubSchema.optional(),
    notes: z.string().optional().or(z.literal(''))
});

export const validateRestaurantCommissionUpsertDto = (body) => {
    const defaultVal = body?.defaultCommission || body?.deliveryCommission || { type: 'percentage', value: 0 };

    const normalized = {
        restaurantId: body?.restaurantId ? String(body.restaurantId) : '',
        defaultCommission: {
            type: defaultVal?.type || 'percentage',
            value: Number(defaultVal?.value || 0)
        },
        deliveryCommission: {
            type: body?.deliveryCommission?.type || defaultVal?.type || 'percentage',
            value: Number(body?.deliveryCommission?.value ?? defaultVal?.value ?? 0)
        },
        takeawayCommission: {
            type: body?.takeawayCommission?.type || defaultVal?.type || 'percentage',
            value: Number(body?.takeawayCommission?.value ?? defaultVal?.value ?? 0)
        },
        notes: body?.notes != null ? String(body.notes) : ''
    };

    const result = restaurantCommissionUpsertSchema.safeParse(normalized);
    if (!result.success) {
        throw new ValidationError(result.error.errors[0].message);
    }
    if (!mongoose.Types.ObjectId.isValid(result.data.restaurantId)) {
        throw new ValidationError('Invalid restaurantId');
    }
    
    ['defaultCommission', 'deliveryCommission', 'takeawayCommission'].forEach((key) => {
        const comm = result.data[key];
        if (comm && comm.type === 'percentage' && (comm.value < 0 || comm.value > 100)) {
            throw new ValidationError(`${key} percentage must be between 0-100`);
        }
    });

    return {
        restaurantId: result.data.restaurantId,
        defaultCommission: result.data.defaultCommission,
        deliveryCommission: result.data.deliveryCommission,
        takeawayCommission: result.data.takeawayCommission,
        notes: result.data.notes ? result.data.notes.trim() : ''
    };
};

const toggleBoolSchema = z.object({
    status: z.boolean().optional()
});

export const validateOptionalStatusDto = (body) => {
    const result = toggleBoolSchema.safeParse(body || {});
    if (!result.success) {
        throw new ValidationError(result.error.errors[0].message);
    }
    return result.data;
};

const deliveryRuleSchema = z.object({
    name: z.string().optional().or(z.literal('')),
    minDistance: z.number().min(0, 'Minimum distance must be 0 or greater'),
    maxDistance: z.number().nullable().optional(),
    commissionPerKm: z.number().min(0, 'Commission per km must be 0 or greater'),
    basePayout: z.number().min(0, 'Base payout must be 0 or greater'),
    status: z.boolean().optional()
});

export const validateDeliveryCommissionRuleDto = (body) => {
    const result = deliveryRuleSchema.safeParse(body || {});
    if (!result.success) {
        throw new ValidationError(result.error.errors[0].message);
    }
    return result.data;
};
