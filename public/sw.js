/* Klassi — Service Worker de la PWA
 * Push (Web Push/VAPID), clic en notificación y caché básica offline.
 * Precaché completo con Serwist queda como mejora posterior.
 */

// Subir la versión purga las cachés viejas en 'activate'
const CACHE = "klassi-v2";

// En desarrollo el service worker no debe cachear: serviría JS/HTML obsoleto
// que rompe la hidratación y oculta componentes nuevos. Solo actúa en prod.
const IS_DEV =
  self.location.hostname === "localhost" ||
  self.location.hostname === "127.0.0.1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Push ──────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let payload = { title: "Klassi", body: "Tienes una nueva notificación", data: {} };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch (_) { /* payload no-JSON: usar defaults */ }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body:  payload.body,
      icon:  "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data:  payload.data || {},
      tag:   payload.data && payload.data.notificationId ? String(payload.data.notificationId) : undefined,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/portal/notificaciones";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client) client.navigate(url);
          return;
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

// ── Offline básico ────────────────────────────────────────────────
// Navegaciones: red primero, caché como respaldo. Estáticos propios: caché primero.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // En local: pasar directo a la red, sin caché (evita bundles obsoletos)
  if (IS_DEV) return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/portal")))
    );
    return;
  }

  if (url.pathname.startsWith("/icons/") || url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached ||
        fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
      )
    );
  }
});
