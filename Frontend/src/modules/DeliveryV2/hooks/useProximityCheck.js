import { useMemo } from 'react';
import { useDeliveryStore } from '@/modules/DeliveryV2/store/useDeliveryStore';
import { calculateDistance } from '@/modules/DeliveryV2/hooks/proximity.utils';

/**
 * Safely extracts { lat, lng } from any location/order candidate.
 */
export const extractCoordinates = (loc) => {
  if (!loc) return null;

  // Direct lat / lng
  let lat = loc.lat ?? loc.latitude ?? loc.latPoint;
  let lng = loc.lng ?? loc.longitude ?? loc.lngPoint ?? loc.long;

  // Nested in .location
  if ((lat == null || lng == null) && loc.location) {
    lat = loc.location.lat ?? loc.location.latitude;
    lng = loc.location.lng ?? loc.location.longitude;
    if ((lat == null || lng == null) && Array.isArray(loc.location.coordinates) && loc.location.coordinates.length >= 2) {
      lng = loc.location.coordinates[0];
      lat = loc.location.coordinates[1];
    }
  }

  // GeoJSON [lng, lat] directly on object
  if ((lat == null || lng == null) && Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) {
    lng = loc.coordinates[0];
    lat = loc.coordinates[1];
  }

  // Fallback for address object
  if ((lat == null || lng == null) && loc.deliveryAddress) {
    lat = loc.deliveryAddress.latitude ?? loc.deliveryAddress.lat;
    lng = loc.deliveryAddress.longitude ?? loc.deliveryAddress.lng;
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
