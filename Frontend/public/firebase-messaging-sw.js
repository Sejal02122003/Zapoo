/* eslint-disable no-undef */
/* sw_version: 2 — force browser to detect new SW and clear stale chunk cache */
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

// Force immediate SW activation — no waiting for tab close
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

const sanitize = (value) => String(value || "").trim().replace(/^['"]|['"]$/g, "");
const PUSH_DEBUG_PREFIX = "[push-sw]";
const pushDebugLog = () => {};
const getNotificationKey = (payload) => {
  const fcmId = payload?.messageId || payload?.data?.messageId || payload?.data?.notificationId;
  if (fcmId) return String(fcmId);

  const title = (payload?.notification?.title || payload?.data?.title || "").trim();
  const body = (payload?.notification?.body || payload?.data?.body || "").trim();
  const orderId = payload?.data?.orderId || "";
  
  if (!title && !body && !orderId) return "unknown";

  return [
    title.toLowerCase(),
    body.toLowerCase(),
    orderId
  ].join("|");
};

async function notifyOpenClients(payload) {
  pushDebugLog(PUSH_DEBUG_PREFIX, "Broadcasting push to open clients", { payload });
  const windowClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
  windowClients.forEach((client) => {
    client.postMessage({
      type: "push-notification-received",
      payload,
    });
  });
}

function getTargetPathFromPayload(payload = {}) {
  const rawTarget =
    payload?.data?.targetUrl ||
    payload?.data?.link ||
    payload?.data?.click_action ||
    payload?.fcmOptions?.link ||
    "/";

  try {
    const url = new URL(rawTarget, self.location.origin);
    return url.pathname || "/";
  } catch {
    return "/";
  }
}

async function hasVisibleClientForTarget(payload = {}) {
  const windowClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
  const targetPath = getTargetPathFromPayload(payload);
  const targetRoot = `/${String(targetPath).split("/").filter(Boolean)[0] || ""}`;
  const visibleClient = windowClients.find((client) => {
    const isVisible = client.visibilityState === "visible" || client.focused;
    if (!isVisible) return false;
    try {
      const clientUrl = new URL(client.url);
      if (targetRoot === "/" || !targetRoot) {
        return true;
      }
      return clientUrl.pathname.startsWith(targetRoot);
    } catch {
      return false;
    }
  });
  pushDebugLog(PUSH_DEBUG_PREFIX, "Visible client check", {
    count: windowClients.length,
    targetPath,
    targetRoot,
    hasVisibleClient: Boolean(visibleClient),
    clients: windowClients.map((client) => ({
      url: client.url,
      visibilityState: client.visibilityState,
      focused: client.focused,
    })),
  });
  return Boolean(visibleClient);
}

async function loadFirebaseWebConfig() {
  const candidates = [
    "/api/v1/food/public/env",
    "/api/v1/env/public",
    "/api/env/public",
  ];
  for (const url of candidates) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) continue;
      const json = await response.json();
      const data = (json && json.data) || {};
      const config = {
        apiKey: sanitize(data.VITE_FIREBASE_API_KEY || data.FIREBASE_API_KEY),
        authDomain: sanitize(data.VITE_FIREBASE_AUTH_DOMAIN || data.FIREBASE_AUTH_DOMAIN),
        projectId: sanitize(data.VITE_FIREBASE_PROJECT_ID || data.FIREBASE_PROJECT_ID),
        appId: sanitize(data.VITE_FIREBASE_APP_ID || data.FIREBASE_APP_ID),
        messagingSenderId: sanitize(data.VITE_FIREBASE_MESSAGING_SENDER_ID || data.FIREBASE_MESSAGING_SENDER_ID),
        storageBucket: sanitize(data.VITE_FIREBASE_STORAGE_BUCKET || data.FIREBASE_STORAGE_BUCKET),
        measurementId: sanitize(data.VITE_FIREBASE_MEASUREMENT_ID || data.FIREBASE_MEASUREMENT_ID),
      };

      if (config.apiKey && config.projectId && config.appId && config.messagingSenderId) {
        pushDebugLog(PUSH_DEBUG_PREFIX, "Loaded Firebase web config");
        return config;
      }
    } catch {
      // try next candidate
    }
  }

  return null;
}

(async () => {
  const config = await loadFirebaseWebConfig();
  if (!config || !config.apiKey || !config.projectId || !config.appId || !config.messagingSenderId) {
    return;
  }

  firebase.initializeApp(config);
  pushDebugLog(PUSH_DEBUG_PREFIX, "Firebase messaging service worker initialized");
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage(async (payload) => {
    pushDebugLog(PUSH_DEBUG_PREFIX, "Received Firebase background message", { payload });
    
    const visibleClient = await hasVisibleClientForTarget(payload);
    
    // 💡 IMPORTANT: If the payload contains a 'notification' object, the browser/FCM SDK
    // will often display a system notification automatically in the background.
    // To prevent double notifications (one from browser, one from our manual call),
    // we only call showNotification manually if 'notification' is missing (Data-only message)
    // AND there is no visible window for the user.
    // For delivery order alerts, ALWAYS show notification even if app is open.
    // Riders need the system alert even when app is in the foreground/locked screen.
    const isDeliveryOrderAlert = 
      payload?.data?.type === 'new_order' &&
      (String(payload?.data?.targetUrl || '').includes('/food/delivery') || String(payload?.data?.link || '').includes('/food/delivery'));

    const isRestaurantOrderAlert =
      payload?.data?.type === 'new_order' ||
      String(payload?.data?.targetUrl || '').includes('/food/restaurant') ||
      String(payload?.data?.link || '').includes('/food/restaurant') ||
      String(payload?.data?.click_action || '').includes('/food/restaurant');

    const isUrgentOrderAlert = isDeliveryOrderAlert || isRestaurantOrderAlert;

    if (!payload.notification && (isUrgentOrderAlert || !visibleClient)) {
      const defaultTitle = isRestaurantOrderAlert ? "🔔 New Order Received!" : (isDeliveryOrderAlert ? "🚴 New Order Available!" : "New Notification");
      const defaultBody = isRestaurantOrderAlert ? "You have received a new order waiting for review." : (isDeliveryOrderAlert ? "A new delivery order is waiting for you!" : "");
      const title = payload?.data?.title || defaultTitle;
      const body = payload?.data?.body || defaultBody;
      const image =
        payload?.data?.image ||
        payload?.data?.imageUrl ||
        undefined;
      const notificationKey = getNotificationKey(payload);
      
      self.registration.showNotification(title, {
        body,
        icon: "/logo.png",
        image,
        tag: notificationKey,
        renotify: true,
        silent: false,
        requireInteraction: true,
        vibrate: [300, 100, 300, 100, 300],
        data: payload?.data || {},
      });
    }

    // Always notify clients regardless of visibility
    await notifyOpenClients(payload);
  });
})();

self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    pushDebugLog(PUSH_DEBUG_PREFIX, "Received raw push event", { payload });
    // No client relay here. onBackgroundMessage handles delivery, and relaying in both
    // places can produce duplicate notifications in web clients.
    event.waitUntil(Promise.resolve());
  } catch {
    // Ignore malformed payloads.
  }
});

self.addEventListener("notificationclick", (event) => {
  pushDebugLog(PUSH_DEBUG_PREFIX, "Notification click received", {
    data: event?.notification?.data || {},
  });
  event.notification.close();
  const rawLink =
    event?.notification?.data?.link ||
    event?.notification?.data?.click_action ||
    event?.notification?.data?.targetUrl ||
    event?.notification?.data?.url ||
    "";

  let targetUrl = "";
  if (rawLink) {
    try {
      const parsed = new URL(rawLink, self.location.origin);
      if (parsed.origin === self.location.origin) {
        targetUrl = parsed.pathname + parsed.search + parsed.hash;
      } else if (String(rawLink).startsWith("/")) {
        targetUrl = String(rawLink);
      }
    } catch {
      if (String(rawLink).startsWith("/")) {
        targetUrl = String(rawLink);
      }
    }
  }

  if (!targetUrl || targetUrl === "/") {
    const title = String(event?.notification?.title || "").toLowerCase();
    const dataStr = JSON.stringify(event?.notification?.data || {}).toLowerCase();
    if (dataStr.includes("delivery") || title.includes("delivery") || title.includes("pickup") || title.includes("rider")) {
      targetUrl = "/food/delivery";
    } else if (dataStr.includes("restaurant") || title.includes("order") || title.includes("restaurant")) {
      targetUrl = "/food/restaurant";
    } else {
      targetUrl = "/";
    }
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      const client = windowClients.find((c) => c.url.includes(self.location.origin));
      if (client) {
        client.focus();
        return client.navigate(targetUrl);
      }
      return clients.openWindow(targetUrl);
    }),
  );
});
