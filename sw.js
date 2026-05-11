/* ══════════════════════════════════════════════════════
   NEO-SUSU — Service Worker PWA
   Version: 2.0
   Stratégie: Cache-First pour assets, Network-First pour pages
══════════════════════════════════════════════════════ */

const CACHE_NAME = 'neosusu-v2';
const OFFLINE_URL = '/index.html';

/* ── Fichiers à mettre en cache immédiatement ── */
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/neo-susu-website.html',
  '/NEO-SUSU-App-Premium.html',
  '/NEO-SUSU_Presentation.html',
  '/NEO-SUSU_App_Presentation.html',
  '/NEO-SUSU_Film_Marketing.html',
  '/NEO-SUSU_Dossier_INPI.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

/* ══ INSTALL ══ */
self.addEventListener('install', event => {
  console.log('[SW] Installation NEO-SUSU PWA v2');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Mise en cache des assets');
      return cache.addAll(PRECACHE_ASSETS.map(url => {
        return new Request(url, { cache: 'reload' });
      })).catch(err => {
        console.warn('[SW] Certains assets non cachés:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

/* ══ ACTIVATE ══ */
self.addEventListener('activate', event => {
  console.log('[SW] Activation NEO-SUSU PWA v2');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Suppression ancien cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

/* ══ FETCH ══ */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  /* Ignorer les requêtes non-HTTP et les API externes */
  if (!request.url.startsWith('http')) return;
  if (request.method !== 'GET') return;

  /* Fonts Google — cache-first avec fallback */
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        }).catch(() => new Response('', { status: 408 }));
      })
    );
    return;
  }

  /* CDN libs (Tone.js etc.) — cache-first */
  if (url.hostname.includes('cdnjs') || url.hostname.includes('cdn.')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        }).catch(() => new Response('', { status: 408 }));
      })
    );
    return;
  }

  /* Pages HTML — Network-First (toujours la dernière version) */
  if (request.destination === 'document' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then(cached => cached || caches.match(OFFLINE_URL));
        })
    );
    return;
  }

  /* Tous les autres assets — Cache-First */
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => {
        return new Response('Asset non disponible hors ligne', { status: 503 });
      });
    })
  );
});

/* ══ MESSAGE (pour forcer la mise à jour) ══ */
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});

/* ══ PUSH NOTIFICATIONS (préparé pour le futur) ══ */
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'NEO-SUSU', {
      body: data.body || 'Nouvelle notification',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-96.png',
      tag: data.tag || 'neosusu-notif',
      data: { url: data.url || '/' },
      actions: [
        { action: 'open', title: 'Ouvrir' },
        { action: 'close', title: 'Fermer' }
      ]
    })
  );
});

/* ══ NOTIFICATION CLICK ══ */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

console.log('[SW] NEO-SUSU Service Worker chargé ✓');
