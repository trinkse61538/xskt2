const CACHE='xskt2-v1';
const CORE=['/','/index.html','/assets/style.css','/assets/app.js','/manifest.webmanifest','/offline.html'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE))));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(x=>x||fetch(e.request).catch(()=>caches.match('/offline.html')))));
