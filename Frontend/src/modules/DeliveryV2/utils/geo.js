/**
 * Haversine formula to calculate the distance between two points in meters.
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} Distance in meters
 */
export const getHaversineDistance = (lat1, lon1, lat2, lon2) => {
    const pLat1 = parseFloat(lat1);
    const pLon1 = parseFloat(lon1);
    const pLat2 = parseFloat(lat2);
    const pLon2 = parseFloat(lon2);

    if (!Number.isFinite(pLat1) || !Number.isFinite(pLon1) || !Number.isFinite(pLat2) || !Number.isFinite(pLon2)) {
        return 0;
    }

    const R = 6371e3; // Earth Radius in meters
    const phi1 = (pLat1 * Math.PI) / 180;
    const phi2 = (pLat2 * Math.PI) / 180;
    const deltaPhi = ((pLat2 - pLat1) * Math.PI) / 180;
    const deltaLambda = ((pLon2 - pLon1) * Math.PI) / 180;

    const a =
        Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};

/**
 * Formats a distance in meters to a clean string representation.
 * @param {number} distanceInMeters 
 * @param {boolean} showUnit 
 * @returns {string} e.g. "450 m", "1.2 km", or "1.2"
 */
export const formatDistance = (distanceInMeters, showUnit = true) => {
    const d = parseFloat(distanceInMeters);
    if (!Number.isFinite(d) || d < 0) {
        return showUnit ? '-- km' : '--';
    }
    if (d < 1000) {
        if (!showUnit) {
            return (d / 1000).toFixed(1);
        }
        return `${Math.round(d)} m`;
    }
    const km = (d / 1000).toFixed(1);
    return showUnit ? `${km} km` : km;
};

/**
 * Calculates accurate ETA in minutes based on distance and rolling average speed.
 * @param {number} distanceInMeters 
 * @param {number} averageSpeedMetersPerSec 
 * @returns {number} ETA in minutes (minimum 1)
 */
export const calculateETA = (distanceInMeters, averageSpeedMetersPerSec) => {
    const dist = parseFloat(distanceInMeters);
    if (!Number.isFinite(dist) || dist <= 0) return 0;
    // Fallback speed if stationary/low speed (avg human biking speed 4.5m/s approx 16km/h)
    const rawSpeed = parseFloat(averageSpeedMetersPerSec);
    const speed = (Number.isFinite(rawSpeed) && rawSpeed > 1) ? rawSpeed : 4.5;
    const seconds = dist / speed;
    return Math.max(1, Math.round(seconds / 60));
};

/**
 * Formats ETA minutes to a user-friendly label.
 * @param {number} mins 
 * @returns {string} e.g. "5 mins", "1 min"
 */
export const formatETA = (mins) => {
    const m = parseInt(mins, 10);
    if (!Number.isFinite(m) || m <= 0) return '--';
    return m === 1 ? '1 min' : `${m} mins`;
};

/**
 * Calculates the bearing (heading) between two points in degrees.
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} Angle in degrees [0, 360)
 */
export const calculateHeading = (lat1, lon1, lat2, lon2) => {
    const pLat1 = parseFloat(lat1);
    const pLon1 = parseFloat(lon1);
    const pLat2 = parseFloat(lat2);
    const pLon2 = parseFloat(lon2);

    if (!Number.isFinite(pLat1) || !Number.isFinite(pLon1) || !Number.isFinite(pLat2) || !Number.isFinite(pLon2)) {
        return 0;
    }

    const lat1Rad = (pLat1 * Math.PI) / 180;
    const lat2Rad = (pLat2 * Math.PI) / 180;
    const deltaLonRad = ((pLon2 - pLon1) * Math.PI) / 180;

    const y = Math.sin(deltaLonRad) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(deltaLonRad);
    
    const bearing = (Math.atan2(y, x) * 180) / Math.PI;
    return (bearing + 360) % 360;
};
