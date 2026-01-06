/**
 * MAHLGRAD - Service Worker
 * Ermöglicht Offline-Nutzung
 */

const CACHE_NAME = 'mahlgrad-v12';
const ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/api.js',
    '/manifest.json',
    '/Background.png',
    '/icon-192.png',
    '/icon-512.png',
    '/apple-touch-icon-precomposed.png',
    '/image 1.png',
    '/image 2.png',
    '/image 3.png',
];

// Installation
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Aktivierung - löscht alle alten Caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch - Network first, dann Cache
self.addEventListener('fetch', (event) => {
    // Für API-Requests: Immer vom Netzwerk
    if (event.request.url.includes('/api/')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // Für andere Requests: Cache first, dann Network
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});
