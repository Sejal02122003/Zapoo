import { useMemo } from 'react';
import { useDeliveryStore } from '@/modules/DeliveryV2/store/useDeliveryStore';
import { calculateDistance } from '@/modules/DeliveryV2/hooks/proximity.utils';

/**
 * Safely extracts { lat, lng } from any location/order candidate.
 */
export const extractCoordinates = (loc) => {
  if (!loc) return null;

  // Direct array [lng, lat] (GeoJSON standard) or [lat, lng]
  if (Array.isArray(loc) && loc.length >= 2) {
    const v0 = parseFloat(loc[0]);
    const v1 = parseFloat(loc[1]);
    if (Number.isFinite(v0) && Number.isFinite(v1)) {
      // In India/general coords, lat is typically ~8 to ~37, lng is ~68 to ~98
      if (Math.abs(v0) <= 90 && Math.abs(v1) <= 180 && v0 < v1) {
        // [lat, lng]
        return { lat: v0, lng: v1 };
      }
      // GeoJSON [lng, lat]
      return { lat: v1, lng: v0 };
    }
  }

  // Direct lat / lng properties
  let lat = loc.lat ?? loc.latitude ?? loc.latPoint;
  let lng = loc.lng ?? loc.longitude ?? loc.lngPoint ?? loc.long;

  // Nested in .location
  if ((lat == null || lng == null) && loc.location) {
    lat = loc.location.lat ?? loc.location.latitude ?? loc.location.latPoint;
    lng = loc.location.lng ?? loc.location.longitude ?? loc.location.lngPoint ?? loc.location.long;
    if ((lat == null || lng == null) && Array.isArray(loc.location.coordinates) && loc.location.coordinates.length >= 2) {
      lng = loc.location.coordinates[0];
      lat = loc.location.coordinates[1];
    }
  }

  // GeoJSON [lng, lat] directly on coordinates property
  if ((lat == null || lng == null) && Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) {
    lng = loc.coordinates[0];
    lat = loc.coordinates[1];
  }

  // Nested in .coords (HTML5 Geolocation position.coords)
  if ((lat == null || lng == null) && loc.coords) {
    lat = loc.coords.latitude ?? loc.coords.lat;
    lng = loc.coords.longitude ?? loc.coords.lng;
  }

  // Fallback for address or deliveryAddress object
  if ((lat == null || lng == null) && (loc.deliveryAddress || loc.address || loc.restaurantLocation || loc.customerLocation)) {
    const sub = loc.deliveryAddress || loc.address || loc.restaurantLocation || loc.customerLocation;
    return extractCoordinates(sub);
  }

  const pLat = parseFloat(lat);
  const pLng = parseFloat(lng);

  if (Number.isFinite(pLat) && Number.isFinite(pLng)) {
    return { lat: pLat, lng: pLng };
  }
  return null;
};

/**
 * useProximityCheck - Hook for dynamic range monitoring.
 * Ensures rider can advance based on Admin-defined ranges.
 * 
 * @returns {Object} { distanceToTarget, isWithinRange, actionLimit }
 */
export const useProximityCheck = () => {
  const riderLocation = useDeliveryStore((state) => state.riderLocation);
  const activeOrder = useDeliveryStore((state) => state.activeOrder);
  const tripStatus = useDeliveryStore((state) => state.tripStatus);
  const settings = useDeliveryStore((state) => state.settings);

  // Determine current target based on trip state
  const targetLocation = useMemo(() => {
    if (!activeOrder) return null;
    
    // If heading to pickup or arrived at pickup, target is restaurant
    if (['PICKING_UP', 'REACHED_PICKUP'].includes(tripStatus) || !['PICKED_UP', 'REACHED_DROP', 'DELIVERING', 'COMPLETED'].includes(tripStatus)) {
      const restCandidate = 
        activeOrder.restaurantLocation || 
        activeOrder.restaurant_location ||
        activeOrder.restaurant?.location ||
        activeOrder.restaurantId?.location ||
        activeOrder.restaurant ||
        activeOrder.restaurantId ||
        activeOrder.pickupLocation;
      return extractCoordinates(restCandidate);
    }
    
    // If heading to drop or arrived at drop, target is customer
    if (['PICKED_UP', 'REACHED_DROP', 'DELIVERING'].includes(tripStatus)) {
      const dropCandidate = 
        activeOrder.customerLocation || 
        activeOrder.customer_location ||
        activeOrder.deliveryAddress?.location ||
        activeOrder.deliveryAddress ||
        activeOrder.dropLocation ||
        activeOrder.drop_location ||
        activeOrder.userLocation;
      return extractCoordinates(dropCandidate);
    }
    
    return null;
  }, [activeOrder, tripStatus]);

  // Determine current range limit from admin settings (default 500m)
  const actionLimit = useMemo(() => {
    if (tripStatus === 'PICKING_UP') return settings?.pickupRangeLimit || 500;
    if (tripStatus === 'PICKED_UP') return settings?.deliveryRangeLimit || 500;
    return 500;
  }, [tripStatus, settings]);

  const parsedRider = useMemo(() => extractCoordinates(riderLocation), [riderLocation]);

  // Calculate real-time distance
  const distanceToTarget = useMemo(() => {
    if (!parsedRider || !targetLocation) return Infinity;
    
    const dist = calculateDistance(
      parsedRider.lat,
      parsedRider.lng,
      targetLocation.lat,
      targetLocation.lng
    );

    return Number.isFinite(dist) ? dist : Infinity;
  }, [parsedRider, targetLocation]);

  // Dev mode bypass
  const isDevMode = import.meta.env.VITE_APP_MODE === 'developer' || 
                    import.meta.env.VITE_ENABLE_RANGE_BYPASS === 'true' ||
                    import.meta.env.DEV;

  // Proximity check:
  // 1. If in dev mode: bypass
  // 2. If distance is calculated and <= actionLimit (e.g. 500m): within range
  // 3. If targetLocation is missing on the order, allow rider to proceed so they aren't trapped
  const isWithinRange = useMemo(() => {
    if (isDevMode) return true;
    if (distanceToTarget !== null && Number.isFinite(distanceToTarget) && distanceToTarget !== Infinity) {
      return distanceToTarget <= actionLimit;
    }
    // If target coordinates or GPS coordinates cannot be resolved, allow rider to proceed
    if (!targetLocation || !parsedRider) return true;
    return false;
  }, [isDevMode, distanceToTarget, actionLimit, targetLocation, parsedRider]);

  return {
    distanceToTarget,
    isWithinRange,
    actionLimit,
  };
};
