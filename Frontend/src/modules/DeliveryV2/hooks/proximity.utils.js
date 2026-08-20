/**
 * Haversine formula to calculate the great-circle distance between two points on a sphere.
 * Returns distance in METERS.
 * 
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} Distance in meters
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const pLat1 = parseFloat(lat1);
  const pLon1 = parseFloat(lon1);
  const pLat2 = parseFloat(lat2);
  const pLon2 = parseFloat(lon2);

  if (!Number.isFinite(pLat1) || !Number.isFinite(pLon1) || !Number.isFinite(pLat2) || !Number.isFinite(pLon2)) {
    return Infinity;
  }
  
  const R = 6371e3; // Earth radius in meters
  const φ1 = (pLat1 * Math.PI) / 180;
  const φ2 = (pLat2 * Math.PI) / 180;
  const Δφ = ((pLat2 - pLat1) * Math.PI) / 180;
  const Δλ = ((pLon2 - pLon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};
