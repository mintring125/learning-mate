self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Minimal fetch handler to keep the service worker active for PWA installability.
self.addEventListener('fetch', () => {});
