/*
 * PAWVIDA — Service Worker
 * Fase 1: Cache-first para funcionar offline.
 * Fase 2 (nativo): Este archivo no se necesita en Flutter/React Native.
 *                  El caché nativo lo maneja el framework.
 */

const CACHE_NAME = 'pawvida-v1.0.0';

// Recursos a cachear al instalar
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&family=Playfair+Display:wght@700&display=swap'
];

// ── INSTALL ──────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE ─────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH — Cache first, network fallback ────────────────────────
self.addEventListener('fetch', event => {
  // Solo manejar GET
  if (event.request.method !== 'GET') return;

  // Ignorar requests de extensiones del browser
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;

        return fetch(event.request)
          .then(response => {
            // Solo cachear respuestas válidas
            if (!response || response.status !== 200 || response.type === 'opaque') {
              return response;
            }

            // Guardar copia en caché
            const toCache = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
            return response;
          })
          .catch(() => {
            // Offline fallback: devolver index.html para navegación
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
          });
      })
  );
});

// ── PUSH NOTIFICATIONS (preparado para Fase 2) ───────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  self.registration.showNotification(data.title || 'Pawvida', {
    body: data.body || '',
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: data.tag || 'pawvida',
    data: data.url || '/'
  });
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});
