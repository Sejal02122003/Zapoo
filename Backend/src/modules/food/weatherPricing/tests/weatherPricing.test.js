import { evaluateWeatherPricing } from '../services/weatherPricing.service.js';

describe('Weather Pricing Service', () => {
    const defaultPolicy = {
        _id: 'mock-id-123',
        isEnabled: true,
        feePerKm: 2,
        gstPercentage: 18,
        maxFee: 100,
        minDistance: 2,
        applicableZones: ['ALL'],
        weatherCondition: ['RAIN']
    };

    it('should return isEligible: false if distance is less than minDistance', () => {
        const result = evaluateWeatherPricing(defaultPolicy, 1.5, 'zone-a');
        expect(result.isEligible).toBe(false);
    });

    it('should calculate weather fee properly without hitting cap', () => {
        const result = evaluateWeatherPricing(defaultPolicy, 10, 'zone-a');
        expect(result.isEligible).toBe(true);
        expect(result.weatherFee).toBe(20); // 10km * 2 = 20
        expect(result.gstAmount).toBe(3.6); // 18% of 20 = 3.6
        expect(result.totalWeatherCharge).toBe(23.6);
    });

    it('should cap the fee at maxFee and calculate GST on maxFee', () => {
        const result = evaluateWeatherPricing(defaultPolicy, 60, 'zone-a'); // 60km * 2 = 120
        expect(result.isEligible).toBe(true);
        expect(result.weatherFee).toBe(100); // capped at 100
        expect(result.gstAmount).toBe(18); // 18% of 100
        expect(result.totalWeatherCharge).toBe(118);
    });

    it('should return isEligible: false if zone does not match', () => {
        const restrictedPolicy = { ...defaultPolicy, applicableZones: ['zone-b'] };
        const result = evaluateWeatherPricing(restrictedPolicy, 10, 'zone-a');
        expect(result.isEligible).toBe(false);
    });

    it('should return isEligible: true if zone matches exactly', () => {
        const restrictedPolicy = { ...defaultPolicy, applicableZones: ['zone-a', 'zone-b'] };
        const result = evaluateWeatherPricing(restrictedPolicy, 10, 'zone-a');
        expect(result.isEligible).toBe(true);
    });
});
