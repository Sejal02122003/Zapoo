/**
 * Helper to resolve the active commission rule for a specific restaurant and order type.
 */
export function resolveCommissionRuleForOrder({ rule, globalSettings, orderType = 'delivery' }) {
    const isTakeaway = String(orderType).toLowerCase() === 'takeaway';

    let commissionConfig = null;

    if (rule) {
        if (isTakeaway && rule.takeawayCommission?.value > 0) {
            commissionConfig = rule.takeawayCommission;
        } else if (!isTakeaway && rule.deliveryCommission?.value > 0) {
            commissionConfig = rule.deliveryCommission;
        } else if (rule.defaultCommission?.value > 0) {
            commissionConfig = rule.defaultCommission;
        }
    }

    if (!commissionConfig || !commissionConfig.value) {
        const globalVal = isTakeaway
            ? (globalSettings?.globalTakeawayRestaurantCommission || globalSettings?.globalRestaurantCommission || 0)
            : (globalSettings?.globalRestaurantCommission || 0);

        commissionConfig = {
            type: 'percentage',
            value: globalVal
        };
    }

    return commissionConfig;
}

export function computeCommissionAmount(baseAmount, commissionConfig) {
    const safeBase = Math.max(0, Number(baseAmount) || 0);
    if (!Number.isFinite(safeBase) || safeBase < 0) {
        return { commissionAmount: 0, commissionType: 'percentage', commissionValue: 0, baseAmount: safeBase };
    }

    const commissionType = commissionConfig?.type || 'percentage';
    const commissionValue = Math.max(0, Number(commissionConfig?.value ?? 0) || 0);

    let commissionAmount = 0;
    if (commissionType === 'percentage') {
        commissionAmount = safeBase * (commissionValue / 100);
    } else if (commissionType === 'amount') {
        commissionAmount = commissionValue;
    }

    commissionAmount = Math.round((commissionAmount || 0) * 100) / 100;
    commissionAmount = Math.max(0, Math.min(commissionAmount, safeBase));

    return { commissionAmount, commissionType, commissionValue, baseAmount: safeBase };
}
