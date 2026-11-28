// Lets Fomery install to the home screen and open without a connection.
// Same-origin files are fetched from the network first so every deploy shows up
// immediately; the cached copy is only used when the phone is offline.
// Supabase, Google sign-in and Maps requests are cross-origin and never touched.
const CACHE = 'fomery-shell-v1';
const SHELL = [
  './',
  './index.html',
  './journal.css',
  './journal.mjs',
  './journal-data.mjs',
  './journal-media.mjs',
  './meal-reader.mjs',
  './fomery-wordmark.svg',
  './manifest.webmanifest',
  './icons/icon-192.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy)));
      }
      return response;
    } catch (error) {
      const cached = await caches.match(request, { ignoreSearch: true })
        ?? (request.mode === 'navigate' ? await caches.match('./index.html') : undefined);
      if (cached) return cached;
      throw error;
    }
  })());
});
