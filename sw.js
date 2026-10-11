const VERSION='bd-v3-2026-10-11d';
const ASSETS=['./','index.html','style.css?v=3c','icons.js?v=3c','classifier.js?v=3c','insights.js?v=3c','cal.js?v=3c','store.js?v=3c','sync.js?v=3c','snap.js?v=3c','app.js?v=3c','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(ASSETS.map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==VERSION).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const req=e.request;if(req.method!=='GET'||new URL(req.url).origin!==location.origin)return;
 const isHTML=req.mode==='navigate'||(req.headers.get('accept')||'').includes('text/html');
 if(isHTML){e.respondWith(fetch(req,{cache:'no-store'}).then(r=>{const c=r.clone();caches.open(VERSION).then(x=>x.put('./',c));return r}).catch(()=>caches.match('./').then(r=>r||caches.match('index.html'))));return}
 e.respondWith(caches.open(VERSION).then(c=>c.match(req).then(hit=>{const net=fetch(req).then(r=>{if(r.ok)c.put(req,r.clone());return r}).catch(()=>hit);return hit||net})))});
self.addEventListener('push',e=>{let d={};try{d=e.data?e.data.json():{}}catch{d={title:e.data&&e.data.text()}}
 const brief=String(d.id||'').startsWith('brief-');
 const when=d.due&&!d.allDay?new Date(d.due).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/London'}):'';
 e.waitUntil(self.registration.showNotification(brief?'Your morning brief':(d.title||'Reminder'),{body:brief?d.title:(when?`Due ${when}`:'Due today'),icon:'icons/icon-192.png',badge:'icons/icon-192.png',tag:d.id||'bd',renotify:true,data:{id:d.id},actions:brief?[]:[{action:'snooze',title:'Snooze 1 hour'},{action:'done',title:'Done'}],timestamp:d.due?Date.parse(d.due):Date.now()}))});
self.addEventListener('notificationclick',e=>{e.notification.close();const id=e.notification.data&&e.notification.data.id;const a=e.action;
 const url=new URL('./'+(id?(a?`#act=${a}:${id}`:'#e='+id):''),self.registration.scope).href;
 e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(l=>{const w=l.find(c=>c.url.startsWith(self.registration.scope));if(w){w.postMessage(a?{act:a,id}:{open:id});return w.focus()}return clients.openWindow(url)}))});
