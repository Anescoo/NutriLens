const CACHE_NAME = 'nutrilens-v4';
const STATIC_ASSETS = [
  '/',
  '/scan',
  '/journal',
  '/workout',
  '/goals',
  '/community',
  '/profile',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

const OFFLINE_URL = '/offline';

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Push: show notification when server sends a push
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'NutriLens', body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'NutriLens', {
      body: data.body ?? '',
      icon: data.icon ?? '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url ?? '/' },
      vibrate: [200, 100, 200],
    })
  );
});

// Notification click: open/focus the app at the target URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// Fetch: network-first for API routes, cache-first for static
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and cross-origin requests
  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // API routes: network-only with offline JSON response
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(
          JSON.stringify({ error: 'Vous êtes hors ligne.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );
    return;
  }

  // Navigation requests: network-first, fall back to cache, then offline page
  // Let auth pages (login, signup, reset-password) bypass the SW entirely
  if (event.request.mode === 'navigate' && (
    url.pathname === '/login' ||
    url.pathname === '/signup' ||
    url.pathname === '/forgot-password' ||
    url.pathname.startsWith('/reset-password/')
  )) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          const offlinePage = await caches.match(OFFLINE_URL);
          if (offlinePage) return offlinePage;
          // Minimal inline fallback if /offline isn't cached yet
          return new Response(
            `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NutriLens — Hors ligne</title>
            <style>*{box-sizing:border-box;margin:0;padding:0}body{background:#08080F;color:#EDE8FF;font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100svh;text-align:center;padding:2rem;gap:1rem}
            svg{opacity:.35;margin-bottom:.5rem}h1{font-size:1.25rem;font-weight:700;letter-spacing:-.02em}p{font-size:.875rem;color:#52507A;max-width:22rem}
            a{display:inline-block;margin-top:1.5rem;padding:.75rem 1.5rem;background:#7C3AED;color:#fff;border-radius:1rem;font-size:.875rem;font-weight:600;text-decoration:none}</style></head>
            <body>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9D80FF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
                <path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
                <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>
              </svg>
              <h1>Vous êtes hors ligne</h1>
              <p>Reconnectez-vous à internet pour accéder à NutriLens.</p>
              <a href="/">Réessayer</a>
            </body></html>`,
            { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // Static assets (_next/static, images, fonts): stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || networkFetch;
    })
  );
});
