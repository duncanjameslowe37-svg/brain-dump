'use strict';
(() => {
const CATS={today:['☀️','Today'],all:['🗂️','All'],task:['✅','Tasks'],reminder:['⏰','Reminders'],shopping:['🛒','Shopping'],idea:['💡','Ideas'],note:['📝','Notes'],contact:['👤','People'],money:['💷','Money']};
const REAL=Object.keys(CATS).slice(2);
const KEY='braindump.v1',$=s=>document.querySelector(s);
const TICK='<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const state={items:load(),tab:'today',q:'',fresh:new Set()};
function load(){try{const v=localStorage.getItem(KEY);if(v===null)return null;const a=JSON.parse(v);return Array.isArray(a)?a:[]}catch{return[]}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state.items))}catch{toast('Storage full — export a backup')}}
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cap=s=>s?s[0].toUpperCase()+s.slice(1):s;
const byId=id=>state.items.find(i=>i.id===id);
const endToday=()=>{const d=new Date();d.setHours(23,59,59,999);return d.getTime()};
const ts=i=>i.due?new Date(i.due).getTime():Infinity;

/* ---------- model ---------- */
function makeItem(text){const r=BD.classify(text);const it={id:uid(),text:r.text,cat:r.category,due:r.due||null,hasTime:!!r.hasTime,amount:r.amount||null,items:null,created:Date.now(),done:false,doneAt:null,notified:false};applyText(it,r);return it}
function applyText(it,r){r=r||BD.classify(it.text);
 if(it.cat==='shopping'){const list=BD.splitItems(it.text).map(cap);if(list.length>1){it.items=list.map(t=>({t,d:false}));it.title='Shopping list'}else{it.items=null;it.title=list[0]||cap(it.text)}}
 else{it.items=null;it.title=(r.category===it.cat||r.due)&&r.due?r.title:cap(it.text)}}
function isToday(i){if(i.done)return!!i.doneAt&&new Date(i.doneAt).toDateString()===new Date().toDateString();return!!i.due&&ts(i)<=endToday()}
function visible(){const{items,tab,q}=state;if(q){const s=q.toLowerCase();return items.filter(i=>(i.title+' '+i.text+' '+(i.items||[]).map(x=>x.t).join(' ')).toLowerCase().includes(s))}
 return tab==='today'?items.filter(isToday):tab==='all'?items:items.filter(i=>i.cat===tab)}
const order=(a,b)=>(a.done-b.done)||(a.done?(b.doneAt-a.doneAt):((ts(a)-ts(b))||(b.created-a.created)));
function counts(){const c={};for(const k in CATS)c[k]=0;for(const i of state.items){if(i.done)continue;c.all++;c[i.cat]++;if(isToday(i))c.today++}return c}

/* ---------- view ---------- */
function fmtDue(iso,hasTime){const d=new Date(iso),a=new Date(d).setHours(0,0,0,0),b=new Date().setHours(0,0,0,0),diff=Math.round((a-b)/864e5);
 let s=diff===0?'Today':diff===1?'Tomorrow':diff===-1?'Yesterday':diff>1&&diff<7?d.toLocaleDateString('en-GB',{weekday:'long'}):d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:d.getFullYear()!==new Date().getFullYear()?'numeric':undefined});
 return hasTime?s+', '+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):s}
function dueCls(i){if(!i.due||i.done)return'';const t=ts(i)-Date.now();return t<0?'over':t<3*36e5?'soon':''}
function card(i,showCat){const fresh=state.fresh.has(i.id);
 const meta=[showCat?`<span>${CATS[i.cat][0]} ${CATS[i.cat][1]}</span>`:'',i.due?`<span class="due ${dueCls(i)}">${fmtDue(i.due,i.hasTime)}</span>`:'',i.amount?`<span>£${i.amount.toFixed(2)}</span>`:'',i.items?`<span>${i.items.filter(x=>x.d).length}/${i.items.length}</span>`:''].join('');
 return`<div class="item${i.done?' done':''}${fresh?' enter':''}" data-id="${i.id}"><div class="swipebg">${i.done?'Undo':'Complete'}</div><div class="row">
<button class="chk" data-a="toggle" aria-label="${i.done?'Mark not done':'Complete'}" aria-pressed="${i.done}"><i>${TICK}</i></button>
<div class="body" data-a="edit" role="button" tabindex="0"><div class="ttl">${esc(i.title)}</div>${i.items?`<ul class="subs">${i.items.map((x,k)=>`<li><button class="${x.d?'x':''}" data-a="sub" data-k="${k}"><i>${TICK}</i>${esc(x.t)}</button></li>`).join('')}</ul>`:''}<div class="meta">${meta}</div></div></div></div>`}
function group(title,list,showCat){return list.length?`${title?`<div class="sec"><span>${title}</span><span>${list.length}</span></div>`:'<div style="height:8px"></div>'}<div class="group">${list.map(i=>card(i,showCat)).join('')}</div>`:''}
const EMPTY={today:['🌤️','Nothing due today','Add a reminder like “dentist tomorrow 3pm”.'],all:['🧠','Your mind, empty','Type or speak anything below. It sorts itself.'],task:['✅','No tasks','Try “call the plumber”.'],reminder:['⏰','No reminders','Try “bins out tonight”.'],shopping:['🛒','Shopping list is empty','Try “milk, eggs and bread”.'],idea:['💡','No ideas yet','Start with “idea: …”.'],note:['📝','No notes','Anything else lands here.'],contact:['👤','No people','Try “Sarah’s number is 07700 900123”.'],money:['💷','No money notes','Try “owe Sam £20”.']};
function render(){const{tab,q}=state;const c=counts();
 const h=new Date().getHours();$('#greet').textContent=`${h<12?'Good morning':h<18?'Good afternoon':'Good evening'}, Duncan${c.today?` · ${c.today} due today`:''}`;
 $('#tabs').innerHTML=Object.entries(CATS).map(([k,[e,n]])=>`<button class="tab" role="tab" data-t="${k}" aria-selected="${tab===k&&!q}">${e} ${n}${c[k]?`<span class="n">${c[k]}</span>`:''}</button>`).join('');
 const l=visible().sort(order);let html='';
 if(!l.length){const[e,t,s]=q?['🔍','No matches',`Nothing contains “${esc(q)}”.`]:(state.items.length?EMPTY[tab]:EMPTY.all);html=`<div class="empty"><div class="e">${e}</div><h2>${t}</h2><p>${s}</p></div>`}
 else if(tab==='today'&&!q){const now=Date.now();html=group('Overdue',l.filter(i=>!i.done&&ts(i)<now),true)+group('Today',l.filter(i=>!i.done&&ts(i)>=now),true)+group('Done today',l.filter(i=>i.done),true)}
 else{const showCat=tab==='all'||!!q;html=group('',l.filter(i=>!i.done),showCat)+group('Completed',l.filter(i=>i.done),showCat)}
 $('#list').innerHTML=html;state.fresh.clear()}

/* ---------- toast ---------- */
let tt=0;function toast(msg,action,fn){const t=$('#toast'),b=t.querySelector('button');t.querySelector('span').textContent=msg;
 b.hidden=!action;b.textContent=action||'';b.onclick=action?()=>{fn();hide()}:null;t.classList.add('on');clearTimeout(tt);tt=setTimeout(hide,action?5000:2000);
 function hide(){t.classList.remove('on');b.onclick=null}}

/* ---------- actions ---------- */
function add(text){const lines=text.split(/\n+/).map(s=>s.trim()).filter(Boolean);if(!lines.length)return;
 const made=lines.map(makeItem);state.items.unshift(...made);made.forEach(i=>state.fresh.add(i.id));save();
 const cats=[...new Set(made.map(i=>i.cat))];
 if(!state.q&&state.tab!=='all'&&!made.some(i=>state.tab==='today'?isToday(i):i.cat===state.tab))state.tab=cats.length===1?cats[0]:'all';
 render();toast(made.length>1?`Added ${made.length} entries`:`Added to ${CATS[made[0].cat][1]}`)}
function setDone(id,v){const i=byId(id);if(!i)return;i.done=v;i.doneAt=v?Date.now():null;if(i.items&&!v&&i.items.every(x=>x.d))i.items.forEach(x=>x.d=false);save();render();
 if(v){navigator.vibrate?.(10);toast('Completed','Undo',()=>setDone(id,false))}}
function remove(id){const k=state.items.findIndex(i=>i.id===id);if(k<0)return;const[it]=state.items.splice(k,1);save();render();
 toast('Deleted','Undo',()=>{state.items.splice(Math.min(k,state.items.length),0,it);state.fresh.add(it.id);save();render()})}

/* ---------- list events ---------- */
let suppressClick=false;
$('#list').addEventListener('click',e=>{if(suppressClick){suppressClick=false;return}const b=e.target.closest('[data-a]');if(!b)return;const id=b.closest('.item').dataset.id,i=byId(id);if(!i)return;
 if(b.dataset.a==='toggle')setDone(id,!i.done);
 else if(b.dataset.a==='sub'){e.stopPropagation();const x=i.items[+b.dataset.k];x.d=!x.d;if(i.items.every(x=>x.d)){setDone(id,true);return}if(i.done){i.done=false;i.doneAt=null}save();render()}
 else if(b.dataset.a==='edit')openEdit(id)});
$('#list').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.body')){e.preventDefault();openEdit(e.target.closest('.item').dataset.id)}});
// swipe right to complete — direction-locked; vertical scroll wins via touch-action:pan-y
let sw=null;
$('#list').addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')return;const row=e.target.closest('.row');if(!row)return;sw={row,x:e.clientX,y:e.clientY,dx:0,lock:null,id:e.pointerId}});
$('#list').addEventListener('pointermove',e=>{if(!sw||e.pointerId!==sw.id)return;const dx=e.clientX-sw.x,dy=e.clientY-sw.y;
 if(!sw.lock){if(Math.abs(dx)<8&&Math.abs(dy)<8)return;sw.lock=Math.abs(dx)>Math.abs(dy)*1.3&&dx>0?'x':'y';if(sw.lock==='x'){sw.row.classList.remove('snap');sw.row.parentNode.classList.add('swiping');sw.row.setPointerCapture?.(e.pointerId)}}
 if(sw.lock!=='x')return;sw.dx=Math.max(0,dx);sw.row.style.transform=`translateX(${sw.dx<120?sw.dx:120+(sw.dx-120)*.3}px)`});
function endSwipe(e){if(!sw)return;const s=sw;sw=null;if(s.lock!=='x')return;suppressClick=true;setTimeout(()=>suppressClick=false,350);
 s.row.classList.add('snap');const item=s.row.parentNode;
 if(s.dx>90&&e.type==='pointerup'){s.row.style.transform='translateX(100%)';setTimeout(()=>{const i=byId(item.dataset.id);if(i)setDone(i.id,!i.done)},180)}
 else{s.row.style.transform='';setTimeout(()=>item.classList.remove('swiping'),220)}}
$('#list').addEventListener('pointerup',endSwipe);$('#list').addEventListener('pointercancel',endSwipe);

/* ---------- sheet (menu + editor) ---------- */
const sheet=$('#sheet'),panel=sheet.querySelector('.panel');let lastFocus=null;
function openSheet(html,init){lastFocus=document.activeElement;panel.innerHTML=html;sheet.hidden=false;document.body.style.overflow='hidden';init&&init(panel)}
function closeSheet(){if(sheet.hidden)return;sheet.hidden=true;panel.innerHTML='';document.body.style.overflow='';lastFocus?.focus?.({preventScroll:true})}
sheet.addEventListener('click',e=>{if(e.target.closest('[data-close]'))closeSheet()});
addEventListener('keydown',e=>{if(e.key==='Escape'){if(!sheet.hidden)closeSheet();else if(!$('#searchBar').hidden)toggleSearch(false)}});
const pad=n=>String(n).padStart(2,'0');const toLocal=iso=>{const d=new Date(iso);return`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`};
function openEdit(id){const i=byId(id);if(!i)return;let cat=i.cat;
 const text=i.items?i.items.map(x=>x.t).join(', '):i.text;
 openSheet(`<h3>Edit entry</h3><textarea id="eText" aria-label="Text">${esc(text)}</textarea>
<label>Category</label><div class="chips">${REAL.map(k=>`<button type="button" class="chip" data-c="${k}" aria-pressed="${k===cat}">${CATS[k][0]} ${CATS[k][1]}</button>`).join('')}</div>
<label for="eDue">Date &amp; time</label><div class="daterow"><input type="datetime-local" id="eDue" value="${i.due?toLocal(i.due):''}"><button type="button" class="btn" id="eClear" style="flex:0 0 auto;padding:0 16px">Clear</button></div>
<div class="btns"><button type="button" class="btn dng" id="eDel">Delete</button><button type="button" class="btn" data-close>Cancel</button><button type="button" class="btn pri" id="eSave">Save</button></div>`,p=>{
  p.querySelector('.chips').onclick=e=>{const c=e.target.closest('.chip');if(!c)return;cat=c.dataset.c;p.querySelectorAll('.chip').forEach(x=>x.setAttribute('aria-pressed',x===c))};
  p.querySelector('#eClear').onclick=()=>p.querySelector('#eDue').value='';
  p.querySelector('#eDel').onclick=()=>{closeSheet();remove(id)};
  p.querySelector('#eSave').onclick=()=>{const t=p.querySelector('#eText').value.trim();if(!t){closeSheet();remove(id);return}
   const dv=p.querySelector('#eDue').value,newDue=dv?new Date(dv).toISOString():null;const prevDone=i.items?new Set(i.items.filter(x=>x.d).map(x=>x.t)):null;
   const changed=t!==text||cat!==i.cat;i.text=t;i.cat=cat;
   if(changed){const r=BD.classify(t);applyText(i,r);if(i.items&&prevDone)i.items.forEach(x=>x.d=prevDone.has(x.t));i.amount=r.amount||null;
     if(!dv&&r.due&&!i.due&&['reminder','task','money'].includes(cat)){i.due=r.due;i.hasTime=!!r.hasTime}else{if(i.due!==newDue)i.notified=false;i.due=newDue;if(dv)i.hasTime=true}}
   else{if(newDue!==(i.due?new Date(toLocal(i.due)).toISOString():null)){i.due=newDue;i.hasTime=!!dv;i.notified=false}}
   save();closeSheet();render();toast('Saved')};
 })}
$('#menuBtn').onclick=()=>openSheet(`<h3>Brain Dump</h3>
<button class="mi" data-m="notify">🔔 <span>${'Notification'in window&&Notification.permission==='granted'?'Reminder notifications on':'Enable reminder notifications'}</span></button>
<button class="mi" data-m="export">⬇️ <span>Export backup (JSON)</span></button><button class="mi" data-m="import">⬆️ <span>Import backup</span></button>
<button class="mi" data-m="clear">🧹 <span>Clear completed</span></button>${deferredInstall?'<button class="mi" data-m="install">📲 <span>Install app</span></button>':''}
<input type="file" id="file" accept="application/json,.json" hidden>`,p=>{
 p.onclick=async e=>{const m=e.target.closest('[data-m]')?.dataset.m;if(!m)return;
  if(m==='import'){p.querySelector('#file').click();return}
  closeSheet();
  if(m==='export'){const blob=new Blob([JSON.stringify({app:'brain-dump',version:2,exported:new Date().toISOString(),items:state.items},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`brain-dump-${new Date().toISOString().slice(0,10)}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast(`Exported ${state.items.length} entries`)}
  if(m==='notify'){if(!('Notification'in window))return toast('Notifications not supported here');const r=await Notification.requestPermission();toast(r==='granted'?'Reminder notifications on':'Notifications blocked in browser settings')}
  if(m==='clear'){const n=state.items.filter(i=>i.done).length;if(!n)return toast('Nothing completed yet');const keep=state.items.slice();state.items=state.items.filter(i=>!i.done);save();render();toast(`Cleared ${n}`,'Undo',()=>{state.items=keep;save();render()})}
  if(m==='install'&&deferredInstall){deferredInstall.prompt();deferredInstall=null}};
 p.querySelector('#file').onchange=async e=>{const f=e.target.files[0];if(!f)return;closeSheet();try{const d=JSON.parse(await f.text());const inc=(Array.isArray(d)?d:d.items||[]).filter(x=>x&&typeof x.id==='string'&&typeof x.text==='string'&&CATS[x.cat]);
  const ids=new Set(state.items.map(i=>i.id));const nw=inc.filter(x=>!ids.has(x.id)).map(x=>({title:x.text,done:false,created:Date.now(),...x}));state.items.push(...nw);save();render();toast(nw.length?`Imported ${nw.length} entries`:'No new entries in that file')}catch{toast('That file isn’t a Brain Dump backup')}}})

/* ---------- input ---------- */
const inp=$('#input'),form=$('#dump');
function autosize(){inp.style.height='auto';inp.style.height=Math.min(inp.scrollHeight,132)+'px'}
function preview(){const v=inp.value.trim(),pv=$('#preview');$('#send').disabled=!v;if(!v){pv.classList.remove('on');return}
 const r=BD.classify(v.split('\n')[0]);pv.innerHTML=`→ <b>${CATS[r.category][1]}</b>${r.due?' · '+fmtDue(r.due,r.hasTime):''}${r.items&&r.items.length>1?` · ${r.items.length} items`:''}${r.amount?' · £'+r.amount.toFixed(2):''}`;pv.classList.add('on')}
inp.addEventListener('input',()=>{autosize();preview()});
inp.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();submit()}});
form.addEventListener('submit',e=>{e.preventDefault();submit()});
function submit(){const v=inp.value;if(!v.trim())return;add(v);inp.value='';autosize();preview()}
// keyboard-aware bottom bar (iOS Safari doesn't resize layout viewport)
if(window.visualViewport){const vv=visualViewport;const f=()=>{const kb=Math.max(0,innerHeight-vv.height-vv.offsetTop);document.documentElement.style.setProperty('--kb',(kb>60?kb:0)+'px')};vv.addEventListener('resize',f);vv.addEventListener('scroll',f)}
// voice
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;let rec=null;
if(!SR)$('#mic').hidden=true;
$('#mic').onclick=()=>{if(rec){rec.stop();return}rec=new SR();rec.lang='en-GB';rec.interimResults=true;const base=inp.value.trim();
 rec.onresult=e=>{inp.value=(base?base+' ':'')+[...e.results].map(r=>r[0].transcript).join('');autosize();preview()};
 rec.onerror=e=>{if(e.error!=='no-speech'&&e.error!=='aborted')toast(e.error==='not-allowed'?'Microphone permission denied':'Voice input error')};
 rec.onend=()=>{$('#mic').classList.remove('rec');$('#mic').setAttribute('aria-label','Speak');rec=null;inp.focus()};
 try{rec.start();$('#mic').classList.add('rec');$('#mic').setAttribute('aria-label','Stop listening')}catch{rec=null}};

/* ---------- header ---------- */
function toggleSearch(on){const bar=$('#searchBar');bar.hidden=!on;if(on)$('#search').focus();else{state.q='';$('#search').value='';render()}}
$('#searchBtn').onclick=()=>toggleSearch($('#searchBar').hidden);
$('#search').addEventListener('input',e=>{state.q=e.target.value.trim();render()});
$('#tabs').addEventListener('click',e=>{const b=e.target.closest('.tab');if(!b)return;state.tab=b.dataset.t;if(state.q)toggleSearch(false);else render();
 $('#tabs').querySelector(`[data-t="${state.tab}"]`)?.scrollIntoView({inline:'nearest',block:'nearest'});scrollTo({top:0})});
function applyTheme(t){document.documentElement.dataset.theme=t;document.querySelector('meta[name=theme-color]').content=t==='dark'?'#0f0f12':'#f7f7f8'}
applyTheme(document.documentElement.dataset.theme);
$('#themeBtn').onclick=()=>{const t=document.documentElement.dataset.theme==='dark'?'light':'dark';localStorage.setItem('bd.theme',t);applyTheme(t)};
let deferredInstall=null;addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e});

/* ---------- reminders ---------- */
function checkReminders(){const now=Date.now();let changed=false;
 for(const i of state.items){if(!i.due||i.done||i.notified||!i.hasTime)continue;const t=ts(i);if(t>now)continue;i.notified=true;changed=true;if(now-t>12*36e5)continue;
  const body=CATS[i.cat][1]+' · '+fmtDue(i.due,true);
  if('Notification'in window&&Notification.permission==='granted'&&navigator.serviceWorker?.controller)navigator.serviceWorker.ready.then(r=>r.showNotification(i.title,{body,icon:'icons/icon-192.png',tag:i.id}));
  else if('Notification'in window&&Notification.permission==='granted')new Notification(i.title,{body,icon:'icons/icon-192.png',tag:i.id});
  else toast('⏰ '+i.title)}
 if(changed){save();if(sheet.hidden)render()}}
setInterval(()=>{checkReminders();if(sheet.hidden&&!sw&&document.activeElement!==$('#search'))render()},30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){checkReminders();if(sheet.hidden)render()}});

/* ---------- service worker ---------- */
if('serviceWorker'in navigator&&location.protocol!=='file:'){const had=!!navigator.serviceWorker.controller;let reloaded=false;
 navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(r=>{r.update();setInterval(()=>r.update(),36e5)}).catch(()=>{});
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(had&&!reloaded&&sheet.hidden&&!inp.value){reloaded=true;location.reload()}})}

/* ---------- boot ---------- */
if(state.items===null){state.items=[];['Remind me to call mum tomorrow at 3pm','milk, eggs, bread and butter','Idea: an app that remembers everything for me','Owe Sam £20 for the cinema','Bins out tonight'].reverse().forEach(t=>state.items.unshift(makeItem(t)));save()}
// migrate v1 entries
state.items.forEach(i=>{if(!CATS[i.cat])i.cat='note';i.title=i.title||i.text;i.created=i.created||Date.now()});
render();preview();checkReminders();
window.__bd=state;
})();
