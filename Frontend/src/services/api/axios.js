/**
 * Central API client for backend (auth and future APIs).
 * - baseURL from VITE_API_BASE_URL (e.g. http://localhost:5000/api/v1)
 * - Implements industry-standard specialized clients for User, Restaurant, Delivery, and Admin.
 */

import axios from "axios";

// Prefer explicit env. If not set, default to /api/v1 so the Vite proxy can forward to backend.
const baseURL =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL
    ? String(import.meta.env.VITE_API_BASE_URL).replace(/\/$/, "")
    : "/api/v1";

/** 
 * Common Helpers 
 */

function getAccessToken(module) {
  try {
    const key = `${module}_accessToken`;
    const moduleToken = localStorage.getItem(key);
    if (moduleToken) return moduleToken;

    if (module === "delivery") {
      return (
        localStorage.getItem("delivery_accessToken") ||
        localStorage.getItem("deliveryToken") ||
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        null
      );
    }

    if (module === "user") {
      return localStorage.getItem("accessToken") || null;
    }
    return null;
  } catch {
    return null;
  }
}

function getRefreshToken(module) {
  try {
    const moduleRefreshToken = localStorage.getItem(`${module}_refreshToken`);
    if (moduleRefreshToken) return moduleRefreshToken;

    if (module === "user") {
      return localStorage.getItem("refreshToken") || null;
    }
    return null;
  } catch {
    return null;
  }
}

function clearModuleAuth(module) {
  try {
    localStorage.removeItem(`${module}_accessToken`);
    localStorage.removeItem(`${module}_refreshToken`);
    localStorage.removeItem(`${module}_authenticated`);
    localStorage.removeItem(`${module}_user`);
  } catch (_) {}
}

/**
 * Factory to create role-specific API clients.
 * Benefit: Isolation of tokens, refresh logic, and error handling.
 */
function createModuleClient(moduleName) {
  const client = axios.create({
    baseURL: baseURL || undefined,
    timeout: 30000,
    headers: { "Content-Type": "application/json" },
  });

  let isRefreshing = false;
  let subscribers = [];

  const subscribeToRefresh = (cb) => subscribers.push(cb);
  const onRefreshed = (newToken) => {
    subscribers.forEach((cb) => cb(newToken));
    subscribers = [];
  };

  const onRefreshFailed = () => {
    // Check if they were actually logged in before we clear, to avoid redirect loops for public users
    const wasLoggedIn = 
      localStorage.getItem(`${moduleName}_authenticated`) === "true" || 
      !!localStorage.getItem(`${moduleName}_accessToken`) ||
      !!localStorage.getItem("accessToken");

    clearModuleAuth(moduleName);
    subscribers.forEach((cb) => cb(null));
    subscribers = [];
    
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("authRefreshFailed", { detail: { module: moduleName } }));
      
      // If their session expired, forcefully redirect them to the correct login page to clear React state
      if (wasLoggedIn && !window.location.pathname.includes('/auth') && !window.location.pathname.includes('/login')) {
        // We removed the window.location.href hard redirect because it causes a white screen flash and redirect loops.
        // Instead, we rely on the dispatched 'authRefreshFailed' event which the app listens to (e.g. DeliveryHomeV2)
        // to gracefully handle logout and route navigation.
      }
    }
  };

  // Request Interceptor
  client.interceptors.request.use(
    (config) => {
      config.contextModule = moduleName;
      
      // FormData handling
      if (config.data instanceof FormData) {
        if (config.headers && config.headers["Content-Type"]) {
          delete config.headers["Content-Type"];
        }
      }

      const token = getAccessToken(moduleName);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Automatically inject Zone ID and Coordinates for user/public endpoints
      if (moduleName === "user" || moduleName === "public") {
        const zoneId = localStorage.getItem("userZoneId");
        const lat = localStorage.getItem("userLat");
        const lng = localStorage.getItem("userLng");
        if (zoneId) {
          config.headers["X-Zone-Id"] = zoneId;
        }
        if (lat && lng) {
          config.headers["X-User-Lat"] = lat;
          config.headers["X-User-Lng"] = lng;
        }
      }

      // Prevent native browser caching for GET requests
      if (config.method?.toLowerCase() === 'get') {
        config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        config.headers['Pragma'] = 'no-cache';
        config.headers['Expires'] = '0';
        
        // Also add a timestamp query parameter as a fallback cache-buster
        config.params = { ...config.params, _ts: Date.now() };
      }

      return config;
    },
    (err) => Promise.reject(err)
  );

  // Response Interceptor
  client.interceptors.response.use(
    (response) => response,
    async (err) => {
      const original = err?.config;
      
      if (err?.response?.status === 429) return Promise.reject(err);
      
      // 403 handling (Forbidden vs Unauthorized)
      if (err?.response?.status === 403) {
        // Token is valid but wrong role. Don't logout, just deny access.
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("accessDenied", { detail: { module: moduleName } }));
        }
        return Promise.reject(err);
      }

      // 401 handling (Unauthorized / Expired)
      if (err?.response?.status !== 401 || !original || original._retry) {
        return Promise.reject(err);
      }

      const currentToken = getAccessToken(moduleName);
      const requestToken = original.headers.Authorization?.replace('Bearer ', '');

      // Prevent stale 401s from logging out a newly logged-in user
      if (requestToken && currentToken && requestToken !== currentToken) {
        original.headers.Authorization = `Bearer ${currentToken}`;
        return client(original);
      }

      const refreshToken = getRefreshToken(moduleName);
      if (!refreshToken) {
        onRefreshFailed();
        return Promise.reject(err);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeToRefresh((newToken) => {
            if (newToken) {
              original.headers.Authorization = `Bearer ${newToken}`;
              resolve(client(original));
            } else {
              reject(err);
            }
          });
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const refreshUrl = baseURL ? `${baseURL}/food/auth/refresh-token` : "/api/v1/food/auth/refresh-token";
        const { data } = await axios.post(refreshUrl, { refreshToken }, { timeout: 10000 });
        const newAccessToken = data?.data?.accessToken || data?.accessToken;

        if (newAccessToken) {
          localStorage.setItem(`${moduleName}_accessToken`, newAccessToken);
          window.dispatchEvent(new CustomEvent("authRefreshed", { 
            detail: { module: moduleName, token: newAccessToken } 
          }));
          onRefreshed(newAccessToken);
          original.headers.Authorization = `Bearer ${newAccessToken}`;
          return client(original);
        }
      } catch (error) {
        // Only logout if the backend explicitly rejected the refresh token (4xx/5xx).
        // If it's a network error (e.g., delivery boy loses internet), do NOT log them out.
        if (!error.response || error.code === 'ERR_NETWORK') {
          return Promise.reject(err);
        }
        onRefreshFailed();
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }

      onRefreshFailed();
      return Promise.reject(err);
    }
  );

  return client;
}

/**
 * Specialized Clients
 * Export these for use in index.js to ensure strict role isolation.
 */
export const userClient = createModuleClient("user");
export const restaurantClient = createModuleClient("restaurant");
export const deliveryClient = createModuleClient("delivery");
export const adminClient = createModuleClient("admin");

/**
 * Legacy Smart Client
 * Maintained for backward compatibility and shared services.
 */
const apiClient = axios.create({
  baseURL: baseURL || undefined,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// Reuse the existing smart detection for the legacy client
function getModuleFromUrl(url = "") {
  const u = typeof url === "string" ? url : (url?.url || "");
  if (!u) return "user";
  const normalized = u.toLowerCase();
  if (normalized.includes("/admin/") || normalized.includes("/food/admin/")) return "admin";
  if (normalized.includes("/food/delivery") || normalized.includes("/delivery/")) return "delivery";
  if (normalized.includes("/food/restaurant/") || normalized.includes("/restaurant/")) return "restaurant";
  return "user";
}

apiClient.interceptors.request.use(
  (config) => {
    // FormData handling
    if (config.data instanceof FormData) {
      if (config.headers && config.headers["Content-Type"]) {
        delete config.headers["Content-Type"];
      }
    }

    const module = config.contextModule || getModuleFromUrl(config.url);
    const token = getAccessToken(module);
    if (token) config.headers.Authorization = `Bearer ${token}`;

    // Automatically inject Zone ID and Coordinates for user/public endpoints
    if (module === "user" || module === "public" || module === "delivery") {
      const zoneId = localStorage.getItem("userZoneId");
      const lat = localStorage.getItem("userLat");
      const lng = localStorage.getItem("userLng");
      if (zoneId) {
        config.headers["X-Zone-Id"] = zoneId;
      }
      if (lat && lng) {
        config.headers["X-User-Lat"] = lat;
        config.headers["X-User-Lng"] = lng;
      }
    }

    return config;
  },
  (err) => Promise.reject(err)
);

export default apiClient;
