const CACHE_VERSION = 3;
const CACHE_NAME = `tactical-breathing-v${CACHE_VERSION}`;
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.svg',
  'https://cdn.tailwindcss.com/3.4.17',
  'https://unpkg.com/react@18.3.1/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone@7.28.5/babel.min.js'
];

// Install - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .catch((err) => console.warn('Cache failed:', err))
  );
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith('tactical-breathing-') && cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch - cache first, then network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then((networkResponse) => {
          // Cache successful responses
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        });
      })
      .catch(() => {
        // Return offline fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      })
  );
});

// Handle notification click - deep link to pattern
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const pattern = event.notification.data?.pattern || 'box';
  const action = event.action;

  let url = './';
  if (action === 'start' || !action) {
    url = `./?pattern=${pattern}&autostart=true`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus existing window and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Open new window if none exists
      return clients.openWindow(url);
    })
  );
});

// Handle messages from app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const pattern = event.data.pattern || 'box';
    const patternNames = {
      box: 'Box Breathing',
      relaxing: '4-7-8 Relaxation',
      energizing: 'Energizing',
      calm: 'Quick Calm'
    };

    self.registration.showNotification('Tactical Breathing', {
      body: event.data.body || 'Time for your daily breathing session',
      icon: './icon-192.svg',
      badge: './icon-192.svg',
      vibrate: [100, 50, 100],
      tag: 'breathing-reminder',
      renotify: true,
      requireInteraction: false,
      data: { pattern },
      actions: [
        { action: 'start', title: `Start ${patternNames[pattern] || 'Session'}` },
        { action: 'dismiss', title: 'Later' }
      ]
    });
  }

  // Handle skip waiting request
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Log service worker version on install
console.log(`Service Worker v${CACHE_VERSION} loaded`);
