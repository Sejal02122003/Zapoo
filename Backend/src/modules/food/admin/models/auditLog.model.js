import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
    {
        action: { 
            type: String, 
            enum: ["ASSIGN_RIDER", "INCENTIVE_ADDED", "INCENTIVE_CANCELLED", "REASSIGNMENT", "ASSIGNMENT_EXPIRED"],
            required: true
        },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: "FoodOrder", required: true },
        riderId: { type: mongoose.Schema.Types.ObjectId, ref: "FoodDeliveryPartner" },
        incentiveAmount: { type: Number, default: 0 },
        reason: { type: String, default: "" },
        metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
    },
    { collection: 'food_audit_logs', timestamps: true }
);

export const FoodAuditLog = mongoose.model('FoodAuditLog', auditLogSchema);
