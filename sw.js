const VERSION='bd-v2-2026-10-11';
const ASSETS=['./','index.html','style.css?v=2','app.js?v=2','classifier.js?v=2','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(ASSETS.map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==VERSION).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const req=e.request;if(req.method!=='GET'||new URL(req.url).origin!==location.origin)return;
 const isHTML=req.mode==='navigate'||(req.headers.get('accept')||'').includes('text/html');
 if(isHTML){e.respondWith(fetch(req,{cache:'no-store'}).then(r=>{const c=r.clone();caches.open(VERSION).then(x=>x.put('./',c));return r}).catch(()=>caches.match('./').then(r=>r||caches.match('index.html'))));return}
 e.respondWith(caches.open(VERSION).then(c=>c.match(req).then(hit=>{const net=fetch(req).then(r=>{if(r.ok)c.put(req,r.clone());return r}).catch(()=>hit);return hit||net})))});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(l=>l[0]?l[0].focus():clients.openWindow('./')))});
