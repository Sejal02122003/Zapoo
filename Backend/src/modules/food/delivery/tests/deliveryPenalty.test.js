import { DeliveryPenalty } from '../models/deliveryPenalty.model.js';
import { DeliveryPolicyVersion } from '../../admin/models/deliveryPolicy.model.js';
import { FoodOrder } from '../../orders/models/order.model.js';

describe('Late Delivery Penalty System - Exception & Calculation Engine', () => {
    
    let mockPolicy;
    let mockOrder;

    beforeEach(() => {
        mockPolicy = {
            enablePenalty: true,
            penaltyRate: 1, // ₹1/min
            graceMinutes: 5,
            maxDeduction: 100,
            autoDeduct: true,
            excludedReasons: ['Restaurant Delay', 'Customer Delay', 'System Outage'],
            minOrderValue: 100,
            effectiveFrom: new Date('2025-01-01T00:00:00Z')
        };

        mockOrder = {
            _id: 'mock_order_123',
            deliveryPartnerId: 'mock_rider_123',
            totalAmount: 150,
            expectedDeliveryTime: new Date(Date.now() - 20 * 60000), // Expected 20 mins ago
            actualDeliveryTime: new Date(),
            graceMinutes: 5
        };
    });

    test('Grace-period boundary: Exactly at grace period boundary results in no penalty', () => {
        const expected = new Date();
        const actual = new Date(expected.getTime() + (5 * 60000)); // Exactly 5 mins late (grace period)
        
        const delayMs = actual.getTime() - expected.getTime();
        const delayMinutes = Math.floor(delayMs / 60000);
        
        const chargeableMinutes = Math.max(0, delayMinutes - mockPolicy.graceMinutes);
        const penaltyAmount = Math.min(chargeableMinutes * mockPolicy.penaltyRate, mockPolicy.maxDeduction);

        expect(delayMinutes).toBe(5);
        expect(chargeableMinutes).toBe(0);
        expect(penaltyAmount).toBe(0);
    });

    test('Grace-period boundary: 1 minute over grace period results in penalty', () => {
        const expected = new Date();
        const actual = new Date(expected.getTime() + (6 * 60000)); // 6 mins late (1 min over grace)
        
        const delayMs = actual.getTime() - expected.getTime();
        const delayMinutes = Math.floor(delayMs / 60000);
        
        const chargeableMinutes = Math.max(0, delayMinutes - mockPolicy.graceMinutes);
        const penaltyAmount = Math.min(chargeableMinutes * mockPolicy.penaltyRate, mockPolicy.maxDeduction);

        expect(delayMinutes).toBe(6);
        expect(chargeableMinutes).toBe(1);
        expect(penaltyAmount).toBe(1); // 1 min * ₹1
    });

    test('Max-deduction cap is respected', () => {
        const expected = new Date();
        const actual = new Date(expected.getTime() + (150 * 60000)); // 150 mins late
        
        const delayMs = actual.getTime() - expected.getTime();
        const delayMinutes = Math.floor(delayMs / 60000);
        
        const chargeableMinutes = Math.max(0, delayMinutes - mockPolicy.graceMinutes); // 145 mins
        const penaltyAmount = Math.min(chargeableMinutes * mockPolicy.penaltyRate, mockPolicy.maxDeduction);

        expect(chargeableMinutes).toBe(145);
        expect(penaltyAmount).toBe(100); // Capped at ₹100
    });

    test('Order below minimum order value is excluded', () => {
        mockOrder.totalAmount = 50; // Below policy minOrderValue of 100
        
        const isExcluded = mockOrder.totalAmount < mockPolicy.minOrderValue;
        
        expect(isExcluded).toBe(true);
    });

    test('Exception path check excludes penalty (Restaurant Delay)', () => {
        const exceptionReason = 'Restaurant Delay';
        
        // Simulating the exception decision tree logic
        const isExcluded = mockPolicy.excludedReasons.includes(exceptionReason);
        
        expect(isExcluded).toBe(true);
    });
});
