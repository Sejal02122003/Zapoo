/**
 * Helper to resolve the active commission rule for a specific restaurant and order type.
 */
export function resolveCommissionRuleForOrder({ rule, globalSettings, orderType = 'delivery' }) {
    const isTakeaway = String(orderType).toLowerCase() === 'takeaway';

    let commissionConfig = null;

    if (rule && rule.status !== false) {
        if (isTakeaway) {
            if (rule.takeawayCommission && Number.isFinite(Number(rule.takeawayCommission.value)) && Number(rule.takeawayCommission.value) > 0) {
                commissionConfig = {
                    type: rule.takeawayCommission.type || 'percentage',
                    value: Number(rule.takeawayCommission.value)
                };
            } else if (rule.defaultCommission && Number.isFinite(Number(rule.defaultCommission.value)) && Number(rule.defaultCommission.value) >= 0) {
                commissionConfig = {
                    type: rule.defaultCommission.type || 'percentage',
                    value: Number(rule.defaultCommission.value)
                };
            } else if (rule.takeawayCommission && Number.isFinite(Number(rule.takeawayCommission.value)) && Number(rule.takeawayCommission.value) >= 0) {
                commissionConfig = {
                    type: rule.takeawayCommission.type || 'percentage',
                    value: Number(rule.takeawayCommission.value)
                };
            }
        } else {
            if (rule.deliveryCommission && Number.isFinite(Number(rule.deliveryCommission.value)) && Number(rule.deliveryCommission.value) > 0) {
                commissionConfig = {
                    type: rule.deliveryCommission.type || 'percentage',
                    value: Number(rule.deliveryCommission.value)
                };
            } else if (rule.defaultCommission && Number.isFinite(Number(rule.defaultCommission.value)) && Number(rule.defaultCommission.value) >= 0) {
                commissionConfig = {
                    type: rule.defaultCommission.type || 'percentage',
                    value: Number(rule.defaultCommission.value)
                };
            } else if (rule.deliveryCommission && Number.isFinite(Number(rule.deliveryCommission.value)) && Number(rule.deliveryCommission.value) >= 0) {
                commissionConfig = {
                    type: rule.deliveryCommission.type || 'percentage',
                    value: Number(rule.deliveryCommission.value)
                };
            }
        }
    }

    if (!commissionConfig) {
        let globalVal = 0;
        if (isTakeaway) {
            const takeawayVal = Number(globalSettings?.globalTakeawayRestaurantCommission);
            const defaultVal = Number(globalSettings?.globalRestaurantCommission);
            if (Number.isFinite(takeawayVal) && takeawayVal > 0) {
                globalVal = takeawayVal;
            } else if (Number.isFinite(defaultVal) && defaultVal >= 0) {
                globalVal = defaultVal;
            } else {
                globalVal = 0;
            }
        } else {
            const defaultVal = Number(globalSettings?.globalRestaurantCommission);
            if (Number.isFinite(defaultVal) && defaultVal >= 0) {
                globalVal = defaultVal;
            } else {
                globalVal = 0;
            }
        }

        commissionConfig = {
            type: 'percentage',
            value: Math.max(0, globalVal)
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
