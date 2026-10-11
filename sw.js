const C='bd-v1';const A=['./','index.html','style.css','app.js','classifier.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(r=>{const f=fetch(e.request).then(n=>{if(n.ok){const cl=n.clone();caches.open(C).then(c=>c.put(e.request,cl))}return n}).catch(()=>r);return r||f}))});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.matchAll({type:'window'}).then(l=>l[0]?l[0].focus():clients.openWindow('./')))});
