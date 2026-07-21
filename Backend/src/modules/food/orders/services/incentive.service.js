import { ValidationError, ForbiddenError } from '../../../../../core/errors.js';

/**
 * Validates whether an incentive can be applied to an order.
 * @param {Object} order - The FoodOrder document
 * @param {Object} admin - The Admin user attempting the assignment
 * @param {Number} incentiveAmount - The proposed incentive amount
 * @param {String} incentiveReason - The reason for the incentive
 * @returns {Boolean} - Returns true if valid, throws an error otherwise.
 */
export function validateIncentiveEligibility(order, admin, incentiveAmount, incentiveReason, assignmentType = "MANUAL") {
    // 1. Incentives only allowed for manual assignments
    if (assignmentType !== "MANUAL" && incentiveAmount > 0) {
        throw new ValidationError("Incentives are only allowed for manually assigned orders");
    }

    // 2. Validate incentive amount
    if (incentiveAmount !== undefined && incentiveAmount !== null) {
        const amount = Number(incentiveAmount);
        if (isNaN(amount) || amount < 0 || amount > 500) {
            throw new ValidationError("Incentive amount must be a positive number between 0 and 500");
        }
    }

    // 3. Reason is required if incentive > 0
    if (incentiveAmount > 0) {
        if (!incentiveReason || incentiveReason.trim().length < 3) {
            throw new ValidationError("A reason of at least 3 characters is required when applying an incentive");
        }
    }

    // 4. Validate Admin Permission (assuming all admins can assign for now, but leaving hook for specific permission)
    if (admin && admin.canAssignIncentive === false && incentiveAmount > 0) {
        throw new ForbiddenError("You do not have permission to assign incentives");
    }

    // 5. Block incentive changes once EARNED
    if (order?.deliveryAssignment?.incentiveStatus === "EARNED") {
        throw new ValidationError("Cannot modify incentive because it has already been paid out to the rider");
    }

    return true;
}

/**
 * Cancels a pending incentive on an order and creates an AuditLog.
 */
export async function cancelPendingIncentive(order, performedById, reason, triggerMetadata) {
    if (order?.deliveryAssignment?.incentiveStatus === 'PENDING') {
        const previousIncentiveAmount = order.deliveryAssignment.incentive;
        order.deliveryAssignment.incentiveStatus = 'CANCELLED';
        
        try {
            const { FoodAuditLog } = await import('../../admin/models/auditLog.model.js');
            await FoodAuditLog.create({
                action: "INCENTIVE_CANCELLED",
                performedBy: order.deliveryAssignment.assignedBy || performedById,
                orderId: order._id,
                riderId: order.dispatch?.deliveryPartnerId,
                incentiveAmount: previousIncentiveAmount,
                reason: reason || "Order Cancelled",
                metadata: { trigger: triggerMetadata }
            });
        } catch (err) {
            console.error(`[Incentive] Failed to log INCENTIVE_CANCELLED: ${err.message}`);
        }
    }
}
