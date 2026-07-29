import { FoodZone } from '../../admin/models/zone.model.js';
import { FoodBusinessSettings } from '../../admin/models/businessSettings.model.js';

const toFinite = (v) => {
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    return Number.isFinite(n) ? n : null;
};

const calcDistanceKm = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Ray-casting point-in-polygon for lat/lng polygons.
const isPointInPolygon = (lat, lng, polygon) => {
    if (!Array.isArray(polygon) || polygon.length < 3) return false;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].longitude;
        const yi = polygon[i].latitude;
        const xj = polygon[j].longitude;
        const yj = polygon[j].latitude;
        const intersect =
            yi > lat !== yj > lat &&
            lng < ((xj - xi) * (lat - yi)) / (yj - yi + 0.0) + xi;
        if (intersect) inside = !inside;
    }
    return inside;
};

/** GET /zones/detect?lat=..&lng=.. */
export const detectZonePublicController = async (req, res, next) => {
    try {
        const lat = toFinite(req.query.lat);
        const lng = toFinite(req.query.lng);
        if (lat === null || lng === null) {
            return res.status(400).json({ success: false, message: 'lat and lng are required' });
        }

        const settings = await FoodBusinessSettings.findOne().lean();
        const maxRangeKm = Number(settings?.outerZoneDeliveryRangeKm || 15);

        const zones = await FoodZone.find({ isActive: true }).lean();
        for (const zone of zones) {
            const coords = Array.isArray(zone.coordinates) ? zone.coordinates : [];
            if (coords.length < 3) continue;
            if (isPointInPolygon(lat, lng, coords)) {
                return res.status(200).json({
                    success: true,
                    message: 'Zone detected',
                    data: { status: 'IN_SERVICE', zoneId: zone._id, zone, isOuterZone: false }
                });
            }
        }

        // Outer zone distance check (within admin-configured range)
        let nearestZone = null;
        let minDistanceKm = Infinity;

        for (const zone of zones) {
            const coords = Array.isArray(zone.coordinates) ? zone.coordinates : [];
            for (const pt of coords) {
                const d = calcDistanceKm(lat, lng, pt.latitude, pt.longitude);
                if (d < minDistanceKm) {
                    minDistanceKm = d;
                    nearestZone = zone;
                }
            }
        }

        if (nearestZone && minDistanceKm <= maxRangeKm) {
            return res.status(200).json({
                success: true,
                message: `Outer zone detected within ${maxRangeKm}km range`,
                data: { 
                    status: 'IN_SERVICE', 
                    zoneId: nearestZone._id, 
                    zone: nearestZone, 
                    isOuterZone: true, 
                    distanceKm: Number(minDistanceKm.toFixed(1)) 
                }
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Out of service',
            data: { status: 'OUT_OF_SERVICE', zoneId: null, zone: null }
        });
    } catch (error) {
        next(error);
    }
};

/** GET /zones/public - list active zones for onboarding/selects */
export const listZonesPublicController = async (_req, res, next) => {
    try {
        const zones = await FoodZone.find({ isActive: true })
            .select('name zoneName serviceLocation country unit isActive coordinates createdAt')
            .sort({ createdAt: 1 })
            .lean();

        return res.status(200).json({
            success: true,
            message: 'Zones fetched successfully',
            data: { zones }
        });
    } catch (error) {
        next(error);
    }
};

/** GET /zones/nearby - list zones for hotspot/nearby visualization */
export const listZonesNearbyPublicController = async (req, res, next) => {
    try {
        const zones = await FoodZone.find({ isActive: true })
            .select('name zoneName serviceLocation country unit isActive coordinates createdAt')
            .sort({ createdAt: 1 })
            .lean();

        return res.status(200).json({
            success: true,
            message: 'Nearby zones fetched',
            data: { zones }
        });
    } catch (error) {
        next(error);
    }
};

