import { config } from '../config/env.js';
import { getRedisClient } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { coordCacheKey } from '../utils/geo.js';

const GEOCODE_CACHE_TTL_SEC = 7 * 24 * 3600;

function parseGoogleComponents(components = []) {
    const find = (...types) =>
        components.find((c) => types.some((t) => (c.types || []).includes(t)))?.long_name || '';

    const subLocality1 = find('sublocality_level_1');
    const subLocality2 = find('sublocality_level_2');
    const subLocality3 = find('sublocality_level_3');
    const subLocality = find('sublocality');
    const neighborhood = find('neighborhood');

    return {
        area: neighborhood || subLocality3 || subLocality2 || subLocality1 || subLocality || '',
        city: find('locality', 'administrative_area_level_2'),
        state: find('administrative_area_level_1'),
        country: find('country') || 'India',
        postalCode: find('postal_code'),
    };
}

export async function reverseGeocode(latitude, longitude) {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new Error('Valid latitude and longitude are required');
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        throw new Error('Coordinates out of range');
    }

    const key = coordCacheKey(lat, lng);
    const cacheKey = key ? `geocode:rev:${key}` : null;

    try {
        const redis = getRedisClient();
        if (redis && cacheKey) {
            const cached = await redis.get(cacheKey);
            if (cached) return JSON.parse(cached);
        }
    } catch (err) {
        logger.warn(`Geocode cache read failed: ${err.message}`);
    }

    let result = null;
    const apiKey = config.googleMapsApiKey;

    // 1. Try Google Maps if API key is provided
    if (apiKey) {
        try {
            const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=en`;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);
            const data = await res.json();

            if (data.status === 'OK' && data.results?.length) {
                const top = data.results[0];
                const parts = parseGoogleComponents(top.address_components || []);
                const formattedAddress = top.formatted_address || '';
                const displayAddress = parts.area || parts.city || formattedAddress.split(',')[0]?.trim() || '';

                result = {
                    latitude: lat,
                    longitude: lng,
                    ...parts,
                    formattedAddress,
                    address: displayAddress,
                    source: 'google',
                };
            }
        } catch (err) {
            logger.warn(`Google reverse geocode failed: ${err.message}`);
        }
    }

    // 2. Fallback to BigDataCloud
    if (!result) {
        try {
            const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 4000);
            const res = await fetch(bdcUrl, { signal: controller.signal });
            clearTimeout(timeout);
            const bdc = await res.json();

            const area = bdc.locality || bdc.localityInfo?.administrative?.[3]?.name || bdc.localityInfo?.administrative?.[2]?.name || '';
            const city = bdc.city || bdc.principalSubdivision || '';
            const state = bdc.principalSubdivision || '';
            const country = bdc.countryName || 'India';
            const postalCode = bdc.postcode || '';
            const formattedAddress = [area, city, state, country].filter(Boolean).join(', ') || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

            result = {
                latitude: lat,
                longitude: lng,
                area,
                city,
                state,
                country,
                postalCode,
                formattedAddress,
                address: area || city || formattedAddress,
                source: 'bigdatacloud',
            };
        } catch (err) {
            logger.warn(`BigDataCloud reverse geocode failed: ${err.message}`);
        }
    }

    // 3. Fallback to OpenStreetMap Nominatim
    if (!result) {
        try {
            const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 4000);
            const res = await fetch(nomUrl, {
                signal: controller.signal,
                headers: { 'Accept-Language': 'en', 'User-Agent': 'Zapoo-App' }
            });
            clearTimeout(timeout);
            const nom = await res.json();

            const addr = nom.address || {};
            const area = addr.suburb || addr.neighbourhood || addr.residential || addr.road || '';
            const city = addr.city || addr.town || addr.village || addr.county || '';
            const state = addr.state || '';
            const country = addr.country || 'India';
            const postalCode = addr.postcode || '';
            const formattedAddress = nom.display_name || [area, city, state].filter(Boolean).join(', ');

            result = {
                latitude: lat,
                longitude: lng,
                area,
                city,
                state,
                country,
                postalCode,
                formattedAddress,
                address: area || city || formattedAddress,
                source: 'nominatim',
            };
        } catch (err) {
            logger.warn(`Nominatim reverse geocode failed: ${err.message}`);
        }
    }

    // 4. Last resort: coordinates fallback
    if (!result) {
        result = {
            latitude: lat,
            longitude: lng,
            area: '',
            city: '',
            state: '',
            country: 'India',
            postalCode: '',
            formattedAddress: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            source: 'coords_only',
        };
    }

    try {
        const redis = getRedisClient();
        if (redis && cacheKey) {
            await redis.set(cacheKey, JSON.stringify(result), { EX: GEOCODE_CACHE_TTL_SEC });
        }
    } catch (err) {
        logger.warn(`Geocode cache write failed: ${err.message}`);
    }

    return result;
}
