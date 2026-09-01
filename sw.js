const CACHE='xskt2-web-v1.1';
const CORE=['./','./index.html','./assets/style.css','./assets/app.js','./assets/data.js','./assets/personal.js','./assets/history.js','./assets/guide.js','./assets/screens.js','./manifest.webmanifest','./offline.html'];
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)))});
self.addEventListener('activate',event=>event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()])));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url),isJson=url.pathname.includes('/data/');
  if(isJson){event.respondWith(fetch(event.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));return r}).catch(()=>caches.match(event.request)));return;}
  event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(r=>{if(url.origin===location.origin)caches.open(CACHE).then(c=>c.put(event.request,r.clone()));return r}).catch(()=>caches.match('./offline.html'))));
});
