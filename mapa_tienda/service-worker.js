const CACHE_NAME = 'my-pwa-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/manifest.json',
  // '/assets/icons/icon-192x192.png',
  // '/assets/icons/icon-512x512.png',
  '/js/main.js',
  '/js/data.json',
  '/style.css'
  // Agrega aquí más recursos que deseas cachear
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
