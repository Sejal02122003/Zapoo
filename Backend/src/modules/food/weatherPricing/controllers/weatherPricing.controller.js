import { WeatherPricingPolicy } from '../models/weatherPricing.model.js';

export async function getActiveWeatherPolicy(req, res, next) {
    try {
        const policy = await WeatherPricingPolicy.findOne({
            effectiveFrom: { $lte: new Date() },
            $or: [
                { effectiveTill: null },
                { effectiveTill: { $gt: new Date() } }
            ]
        }).sort({ effectiveFrom: -1 }).lean();

        // If no policy exists at all, return a default template structure
        if (!policy) {
            return res.status(200).json({
                success: true,
                data: {
                    isEnabled: false,
                    weatherCondition: ['RAIN'],
                    feePerKm: 2,
                    gstPercentage: 18,
                    maxFee: 100,
                    minDistance: 1,
                    applicableZones: ['ALL'],
                }
            });
        }

        return res.status(200).json({
            success: true,
            data: policy
        });
    } catch (err) {
        next(err);
    }
}

export async function updateWeatherPolicy(req, res, next) {
    try {
        const {
            isEnabled,
            weatherCondition,
            feePerKm,
            gstPercentage,
            maxFee,
            minDistance,
            applicableZones
        } = req.body;

        const currentPolicy = await WeatherPricingPolicy.findOne({
            effectiveFrom: { $lte: new Date() },
            $or: [
                { effectiveTill: null },
                { effectiveTill: { $gt: new Date() } }
            ]
        }).sort({ effectiveFrom: -1 });

        const now = new Date();

        // Sunset current policy
        if (currentPolicy) {
            currentPolicy.effectiveTill = now;
            await currentPolicy.save();
        }

        // Create new policy version
        const newPolicy = await WeatherPricingPolicy.create({
            isEnabled: typeof isEnabled === 'boolean' ? isEnabled : (currentPolicy?.isEnabled || false),
            weatherCondition: weatherCondition || currentPolicy?.weatherCondition || ['RAIN'],
            feePerKm: feePerKm ?? currentPolicy?.feePerKm ?? 2,
            gstPercentage: gstPercentage ?? currentPolicy?.gstPercentage ?? 18,
            maxFee: maxFee ?? currentPolicy?.maxFee,
            minDistance: minDistance ?? currentPolicy?.minDistance ?? 1,
            applicableZones: applicableZones || currentPolicy?.applicableZones || ['ALL'],
            effectiveFrom: now,
            createdBy: req.user?.userId
        });

        return res.status(200).json({
            success: true,
            message: 'Weather pricing policy updated successfully',
            data: newPolicy
        });
    } catch (err) {
        next(err);
    }
}

export async function toggleWeatherPolicy(req, res, next) {
    try {
        const { enabled } = req.body;

        if (typeof enabled !== 'boolean') {
            return res.status(400).json({ success: false, message: 'Enabled field must be a boolean' });
        }

        const currentPolicy = await WeatherPricingPolicy.findOne({
            effectiveFrom: { $lte: new Date() },
            $or: [
                { effectiveTill: null },
                { effectiveTill: { $gt: new Date() } }
            ]
        }).sort({ effectiveFrom: -1 });

        if (!currentPolicy) {
            return res.status(404).json({ success: false, message: 'No active policy found to toggle. Please configure it first.' });
        }

        if (currentPolicy.isEnabled === enabled) {
            return res.status(200).json({ success: true, data: currentPolicy }); // No change
        }

        const now = new Date();
        currentPolicy.effectiveTill = now;
        await currentPolicy.save();

        const newPolicy = await WeatherPricingPolicy.create({
            isEnabled: enabled,
            weatherCondition: currentPolicy.weatherCondition,
            feePerKm: currentPolicy.feePerKm,
            gstPercentage: currentPolicy.gstPercentage,
            maxFee: currentPolicy.maxFee,
            minDistance: currentPolicy.minDistance,
            applicableZones: currentPolicy.applicableZones,
            effectiveFrom: now,
            createdBy: req.user?.userId
        });

        return res.status(200).json({
            success: true,
            message: `Weather mode turned ${enabled ? 'ON' : 'OFF'}`,
            data: newPolicy
        });
    } catch (err) {
        next(err);
    }
}
