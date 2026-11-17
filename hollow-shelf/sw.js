// Ivy Shelf — offline support
const SHELL = 'hollow-shelf-v6';
const RUNTIME = 'hollow-shelf-images';
const FILES = ['./', './index.html', './js/sprites.js', './js/app.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];
const IMAGE_HOSTS = ['covers.openlibrary.org', 'books.google.com', 'books.googleusercontent.com', 'steamstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== SHELL && k !== RUNTIME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // App files: network first so updates arrive quickly, saved copy when offline
  if (url.origin === location.origin) {
    e.respondWith(fetch(req).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(SHELL).then(c => c.put(req.mode === 'navigate' ? './index.html' : req, copy)); }
      return r;
    }).catch(() => caches.match(req.mode === 'navigate' ? './index.html' : req).then(hit => hit || caches.match(req, { ignoreSearch: true }))));
    return;
  }
  // Covers and fonts: keep a copy so the shelf looks right offline
  if (IMAGE_HOSTS.some(h => url.hostname.endsWith(h))) {
    e.respondWith(caches.open(RUNTIME).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const r = await fetch(req);
      if (r.ok || r.type === 'opaque') c.put(req, r.clone());
      return r;
    }));
  }
});
