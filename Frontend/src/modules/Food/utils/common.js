/**
 * Common utility functions for the Food module
 */

/**
 * Normalizes an image URL to handle relative paths, backend origins, and Google/external redirects
 */
export const normalizeImageUrl = (imageUrl, backendOrigin = "") => {
  if (typeof imageUrl !== "string") return "";
  let trimmed = imageUrl.trim();
  if (!trimmed || /^data:/i.test(trimmed) || /^blob:/i.test(trimmed)) return trimmed;

  // 1. Unwrap Google Images Search / Redirect URLs
  if (/google\.[a-z.]+\/imgres/i.test(trimmed) || /google\.[a-z.]+\/url/i.test(trimmed)) {
    try {
      const u = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
      const directUrl = u.searchParams.get("imgurl") || u.searchParams.get("url") || u.searchParams.get("q");
      if (directUrl && /^https?:\/\//i.test(directUrl)) {
        trimmed = decodeURIComponent(directUrl);
      }
    } catch {}
  }

  // 2. Google Drive share links -> direct view URL
  if (/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/i.test(trimmed)) {
    const match = trimmed.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/i);
    if (match && match[1]) {
      return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
  }

  // 3. Dropbox links -> raw=1
  if (/dropbox\.com\//i.test(trimmed) && trimmed.includes("dl=0")) {
    trimmed = trimmed.replace("dl=0", "raw=1");
  }

  const appProtocol = typeof window !== "undefined" ? window.location?.protocol : "";
  const appHost = typeof window !== "undefined" ? window.location?.hostname : "";

  let normalized = trimmed
    .replace(/\\/g, "/")
    .replace(/^(https?):\/(?!\/)/i, "$1://")
    .replace(/^(https?:\/\/)(https?:\/\/)/i, "$1");

  if (/^\/\//.test(normalized)) normalized = `${appProtocol || "https:"}${normalized}`;

  if (/^(https?:)?\/\//i.test(normalized)) {
    try {
      const parsed = new URL(normalized, window.location.origin);
      if (appHost && !/^(localhost|127\.0\.0\.1)$/i.test(appHost) && /^(localhost|127\.0\.0\.1)$/i.test(parsed.hostname)) {
        const backendUrl = new URL(backendOrigin || window.location.origin);
        parsed.protocol = backendUrl.protocol;
        parsed.hostname = backendUrl.hostname;
        parsed.port = backendUrl.port;
      }
      if (appProtocol === "https:" && parsed.protocol === "http:") parsed.protocol = "https:";
      const finalUrl = parsed.toString();
      // Prevent double encoding of Firebase URLs which already contain %2F
      if (finalUrl.includes('firebasestorage.googleapis.com')) return finalUrl;
      const hasSigned = /[?&](X-Amz-|Signature=|Expires=|AWSAccessKeyId=|GoogleAccessId=|token=|sig=|se=|sp=|sv=|alt=)/i.test(finalUrl);
      return hasSigned ? finalUrl : finalUrl.replace(/ /g, '%20');
    } catch {
      return normalized;
    }
  }

  const absolutePath = normalized.startsWith("/")
    ? `${backendOrigin}${normalized}`
    : `${backendOrigin}/${normalized.replace(/^\.?\/*/, "")}`;
  return absolutePath;
};

/**
 * Extracts a list of image URLs from a source (string, array of strings, or object with image properties)
 */
export const extractImages = (source, backendOrigin = "") => {
  if (!source) return [];
  const normalize = (val) => {
    if (!val) return "";
    if (typeof val === "string") return normalizeImageUrl(val, backendOrigin);
    if (Array.isArray(val)) {
      if (val.length === 0) return "";
      return normalize(val[0]);
    }
    if (typeof val === "object") {
      const src = val.url || val.secure_url || val.imageUrl || val.image || val.src || "";
      return typeof src === "string" ? normalizeImageUrl(src, backendOrigin) : "";
    }
    return "";
  };

  const candidates = Array.isArray(source) ? source.map(normalize) : [normalize(source)];
  return candidates.filter(Boolean);
};

/**
 * Calculates distance between two coordinates in kilometers using Haversine formula
 */
export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  if (!lat1 || !lng1 || !lat2 || !lng2) return null;
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  // Apply a routing multiplier (tortuosity factor) to approximate actual driving distance
  // from the straight-line Haversine distance. 1.35 is standard for urban grids.
  const ROUTING_MULTIPLIER = 1.35;
  return (R * c) * ROUTING_MULTIPLIER;
};

/**
 * Formats distance for display
 */
export const formatDistance = (distanceInKm) => {
  if (distanceInKm === null || distanceInKm === undefined) return "1.2 km";
  if (distanceInKm >= 1) {
    return `${distanceInKm.toFixed(1)} km`;
  } else {
    return `${Math.round(distanceInKm * 1000)} m`;
  }
};

/**
 * Slugifies a string for use in URLs or as identifiers
 */
export const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
