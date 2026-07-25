import mongoose from 'mongoose';

const bankDetailsAuditLogSchema = new mongoose.Schema(
    {
        riderId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodDeliveryPartner', required: true, index: true },
        changedBy: { type: mongoose.Schema.Types.ObjectId, required: true },
        changedByRole: { type: String, enum: ['DELIVERY_PARTNER', 'ADMIN'], default: 'DELIVERY_PARTNER' },
        previousValues: { type: mongoose.Schema.Types.Mixed },
        newValues: { type: mongoose.Schema.Types.Mixed },
        changedAt: { type: Date, default: Date.now }
    },
    { collection: 'rider_bank_details_audit_logs', timestamps: true }
);

bankDetailsAuditLogSchema.index({ riderId: 1, changedAt: -1 });

export const RiderBankDetailsAuditLog = mongoose.model('RiderBankDetailsAuditLog', bankDetailsAuditLogSchema);
