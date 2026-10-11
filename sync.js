'use strict';
// Optional server sync for background push + calendar feed. Sends ONLY reminder id, title and time.
window.Sync=(()=>{
const FN='https://xbljaxzhucwgaxobmhxc.supabase.co/functions/v1/';
const ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhibGpheHpodWN3Z2F4b2JtaHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3NDA0MDcsImV4cCI6MjEwNzMxNjQwN30.ucsfDEQ6JU1bQdPs2mK_rKp1h8tZB4iWvW_qzMurh3Q';
const VAPID='BLJm28l6J3vzTPiWLgakKsXl9JsNbv9h4m5G3cpcWcuOwncYKWR7Rdmo-HdfokoUYOIj8hwjW9cqMhuN7Kt-Wu0';
const S=JSON.parse(localStorage.getItem('bd.sync')||'{}');
if(!S.device){const a=new Uint8Array(20);crypto.getRandomValues(a);S.device=[...a].map(b=>b.toString(16).padStart(2,'0')).join('');persist()}
function persist(){localStorage.setItem('bd.sync',JSON.stringify(S))}
async function call(action,body={}){const r=await fetch(FN+'reminders',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+ANON,apikey:ANON},body:JSON.stringify({action,device_id:S.device,...body})});if(!r.ok)throw new Error((await r.json().catch(()=>({}))).error||r.status);return r.json()}
const b64=s=>{const p='='.repeat((4-s.length%4)%4);const raw=atob((s+p).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(raw,c=>c.charCodeAt(0))};
const pushSupported=()=>'serviceWorker'in navigator&&'PushManager'in window&&'Notification'in window;
const isIOS=()=>/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
async function enablePush(){if(!pushSupported())throw new Error(isIOS()&&!standalone()?'ios-home':'unsupported');
 const perm=await Notification.requestPermission();if(perm!=='granted')throw new Error('denied');
 const reg=await navigator.serviceWorker.ready;let sub=await reg.pushManager.getSubscription();if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(VAPID)});
 await call('subscribe',{subscription:sub.toJSON()});S.push=true;persist();return sub}
async function disablePush(){S.push=false;persist();try{const reg=await navigator.serviceWorker.ready;const s=await reg.pushManager.getSubscription();await s?.unsubscribe()}catch{}await call('unsubscribe').catch(()=>{})}
let timer=0,last='';
function schedule(list){if(!S.push&&!S.feed)return;clearTimeout(timer);timer=setTimeout(async()=>{const body=JSON.stringify(list);if(body===last)return;try{await call('schedule',{replace:true,reminders:list});last=body;S.lastSync=Date.now();persist()}catch(e){console.warn('sync failed',e.message)}},800)}
function feedUrl(){return FN.replace('https://','webcal://')+'ics?d='+S.device}
function httpsFeed(){return FN+'ics?d='+S.device}
return{state:S,persist,enablePush,disablePush,schedule,feedUrl,httpsFeed,pushSupported,isIOS,standalone,call}})();
