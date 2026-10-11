'use strict';
// Tiny IndexedDB blob store for voice notes and photos (kept on-device only).
window.Media=(()=>{let dbp=null;
 const open=()=>dbp||(dbp=new Promise((res,rej)=>{const r=indexedDB.open('braindump-media',1);r.onupgradeneeded=()=>r.result.createObjectStore('blobs');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}));
 const tx=async(mode,fn)=>{const db=await open();return new Promise((res,rej)=>{const t=db.transaction('blobs',mode);const s=t.objectStore('blobs');const r=fn(s);t.oncomplete=()=>res(r&&r.result);t.onerror=()=>rej(t.error)})};
 return{put:(id,blob)=>tx('readwrite',s=>s.put(blob,id)),get:id=>tx('readonly',s=>s.get(id)),del:id=>tx('readwrite',s=>s.delete(id)),keys:()=>tx('readonly',s=>s.getAllKeys())}})();
