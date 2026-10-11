const CATS={today:['☀️','Today'],all:['🗂️','All'],task:['✅','Tasks'],reminder:['⏰','Reminders'],shopping:['🛒','Shopping'],idea:['💡','Ideas'],note:['📝','Notes'],contact:['👤','People'],money:['💷','Money']};
const $=s=>document.querySelector(s);const KEY='braindump.v1';
let items=JSON.parse(localStorage.getItem(KEY)||'[]'),tab='today',q='',openCats=null;
const save=()=>localStorage.setItem(KEY,JSON.stringify(items));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const esc=s=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('on'),1800)}
function fmtDue(iso,hasTime){const d=new Date(iso),n=new Date(),day=new Date(d).setHours(0,0,0,0),td=new Date().setHours(0,0,0,0),diff=Math.round((day-td)/864e5);
 let s=diff===0?'Today':diff===1?'Tomorrow':diff===-1?'Yesterday':diff>1&&diff<7?d.toLocaleDateString('en-GB',{weekday:'long'}):d.toLocaleDateString('en-GB',{day:'numeric',month:'short'});
 if(hasTime!==false)s+=' '+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});return s}
function dueCls(i){if(!i.due||i.done)return'';const t=new Date(i.due)-Date.now();return t<0?'over':t<36e5*3?'soon':''}
function greet(){const h=new Date().getHours();const open=items.filter(i=>!i.done&&i.due&&new Date(i.due)<new Date().setHours(23,59,59)).length;
 $('#greet').textContent=(h<12?'Good morning':h<18?'Good afternoon':'Good evening')+', Duncan'+(open?` · ${open} due today`:' · all clear ✨')}
function isToday(i){if(i.done)return i.doneAt&&new Date(i.doneAt).toDateString()===new Date().toDateString();if(i.due)return new Date(i.due)<=new Date().setHours(23,59,59,999);return i.cat==='task'&&Date.now()-i.created<864e5*2||i.cat==='shopping'}
function filtered(){let l=items;if(q){const s=q.toLowerCase();return l.filter(i=>(i.title+' '+i.text+' '+(i.items||[]).map(x=>x.t).join(' ')).toLowerCase().includes(s))}
 if(tab==='today')l=l.filter(isToday);else if(tab!=='all')l=l.filter(i=>i.cat===tab);return l}
function sortL(l){return l.slice().sort((a,b)=>(a.done-b.done)||((a.due?new Date(a.due):Infinity)-(b.due?new Date(b.due):Infinity))||b.created-a.created)}
function renderTabs(){$('#tabs').innerHTML=Object.entries(CATS).map(([k,[e,n]])=>{const c=k==='today'?items.filter(i=>isToday(i)&&!i.done).length:k==='all'?items.filter(i=>!i.done).length:items.filter(i=>i.cat===k&&!i.done).length;
 return`<button class="tab ${tab===k?'on':''}" data-t="${k}">${e} ${n}${c?`<span class="n">${c}</span>`:''}</button>`}).join('')}
function card(i){const[e,n]=CATS[i.cat];return`<div class="item ${i.done?'done':''}" data-id="${i.id}"><div class="bgdone">✓ Done</div><div class="row">
<button class="chk" data-a="toggle">${i.done?'✓':''}</button><div class="body"><div class="ttl">${esc(i.title)}</div>
${i.items?`<ul class="subs">${i.items.map((x,k)=>`<li class="${x.d?'x':''}" data-a="sub" data-k="${k}">${esc(x.t)}</li>`).join('')}</ul>`:''}
<div class="meta"><button class="pill" data-a="cats">${e} ${n}</button>${i.due?`<span class="pill due ${dueCls(i)}">⏰ ${fmtDue(i.due,i.hasTime)}</span>`:''}${i.amount?`<span class="pill">£${i.amount.toFixed(2)}</span>`:''}</div>
${openCats===i.id?`<div class="cats">${Object.entries(CATS).slice(2).map(([k,[e,n]])=>`<button data-a="recat" data-c="${k}">${e} ${n}</button>`).join('')}</div>`:''}
</div><button class="del" data-a="del" aria-label="Delete">×</button></div></div>`}
function render(){greet();renderTabs();const l=sortL(filtered());
 if(!l.length){$('#list').innerHTML=`<div class="empty"><b>${q?'🔍':tab==='today'?'🌤️':CATS[tab][0]}</b>${q?'Nothing matches.':'Nothing here yet.<br>Just type or speak anything below — it sorts itself.'}</div>`;return}
 let h='';if(tab==='today'&&!q){const over=l.filter(i=>!i.done&&i.due&&new Date(i.due)<Date.now()),rest=l.filter(i=>!over.includes(i)&&!i.done),done=l.filter(i=>i.done);
  if(over.length)h+='<div class="sec">Overdue</div>'+over.map(card).join('');if(rest.length)h+='<div class="sec">Today</div>'+rest.map(card).join('');if(done.length)h+='<div class="sec">Done today</div>'+done.map(card).join('')}
 else h=l.map(card).join('');$('#list').innerHTML=h}
function add(text){text=text.trim();if(!text)return;
 const lines=text.split(/\n+/).filter(s=>s.trim());lines.forEach(t=>{const r=BD.classify(t);
  items.unshift({id:uid(),text:r.text,title:r.category==='shopping'?(r.items.length>1?'Shopping list':r.items[0]?cap(r.items[0]):r.title):r.title,cat:r.category,due:r.due,hasTime:r.hasTime,amount:r.amount,items:r.category==='shopping'&&r.items.length>1?r.items.map(t=>({t:cap(t),d:false})):null,created:Date.now(),done:false});
  toast(`${CATS[r.category][0]} Added to ${CATS[r.category][1]}`)});
 save();if(tab!=='all'&&tab!=='today'&&!items.slice(0,lines.length).some(i=>i.cat===tab))tab='all';render()}
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
const byId=id=>items.find(i=>i.id===id);
function toggle(id){const i=byId(id);i.done=!i.done;i.doneAt=i.done?Date.now():null;save();if(i.done&&navigator.vibrate)navigator.vibrate(15);render()}
$('#list').addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b)return;const el=b.closest('.item'),id=el.dataset.id,i=byId(id);
 ({toggle:()=>toggle(id),del:()=>{el.classList.add('leaving');setTimeout(()=>{const k=items.indexOf(i);items.splice(k,1);save();render();undo(i,k)},280)},
  cats:()=>{openCats=openCats===id?null:id;render()},recat:()=>{const r=BD.classify(i.text);i.cat=b.dataset.c;if(i.cat==='shopping'&&!i.items){const it=BD.splitItems(i.text);if(it.length>1)i.items=it.map(t=>({t:cap(t),d:false}))}
   if(['reminder','task'].includes(i.cat)&&!i.due&&r.due){i.due=r.due;i.hasTime=r.hasTime}openCats=null;save();render();toast('Moved to '+CATS[i.cat][1])},
  sub:()=>{const x=i.items[+b.dataset.k];x.d=!x.d;if(i.items.every(x=>x.d)){i.done=true;i.doneAt=Date.now()}save();render()}})[b.dataset.a]()});
function undo(i,k){const t=$('#toast');t.innerHTML='Deleted · <u style="pointer-events:auto;cursor:pointer">Undo</u>';t.style.pointerEvents='auto';t.classList.add('on');clearTimeout(t._t);
 t.onclick=()=>{items.splice(k,0,i);save();render();t.classList.remove('on')};t._t=setTimeout(()=>{t.classList.remove('on');t.style.pointerEvents='none';t.onclick=null},4000)}
// swipe to complete
let sx=0,sy=0,row=null,dx=0;
$('#list').addEventListener('touchstart',e=>{const r=e.target.closest('.row');if(!r||e.target.closest('button,li'))return;row=r;sx=e.touches[0].clientX;sy=e.touches[0].clientY;dx=0;row.style.transition='none'},{passive:true});
$('#list').addEventListener('touchmove',e=>{if(!row)return;dx=e.touches[0].clientX-sx;if(Math.abs(e.touches[0].clientY-sy)>Math.abs(dx)&&dx<20){row.style.transform='';row=null;return}row.style.transform=`translateX(${Math.max(0,dx)}px)`},{passive:true});
$('#list').addEventListener('touchend',()=>{if(!row)return;row.style.transition='';if(dx>90){row.style.transform='translateX(100%)';const id=row.closest('.item').dataset.id;setTimeout(()=>toggle(id),200)}else row.style.transform='';row=null});
$('#tabs').addEventListener('click',e=>{const b=e.target.closest('.tab');if(b){tab=b.dataset.t;openCats=null;render();b.scrollIntoView({inline:'center',behavior:'smooth',block:'nearest'})}});
const inp=$('#input');
function preview(){const v=inp.value.trim();$('#send').disabled=!v;if(!v){$('#preview').innerHTML='';return}const r=BD.classify(v.split('\n')[0]);
 $('#preview').innerHTML=`→ <b>${CATS[r.category][0]} ${CATS[r.category][1]}</b>${r.due?' · '+fmtDue(r.due,r.hasTime):''}${r.items&&r.items.length>1?' · '+r.items.length+' items':''}${r.amount?' · £'+r.amount.toFixed(2):''}`}
inp.addEventListener('input',()=>{inp.style.height='auto';inp.style.height=inp.scrollHeight+'px';preview()});
inp.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('#dump').requestSubmit()}});
$('#dump').addEventListener('submit',e=>{e.preventDefault();add(inp.value);inp.value='';inp.style.height='auto';preview()});
// voice
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;let rec=null;
if(!SR)$('#mic').classList.add('hidden');
$('#mic').onclick=()=>{if(rec){rec.stop();return}rec=new SR();rec.lang='en-GB';rec.interimResults=true;const base=inp.value;
 rec.onresult=e=>{inp.value=(base?base+' ':'')+[...e.results].map(r=>r[0].transcript).join('');preview()};
 rec.onend=()=>{$('#mic').classList.remove('rec');rec=null;if(inp.value.trim()&&inp.value!==base){$('#dump').requestSubmit()}};
 rec.onerror=e=>toast('Mic: '+e.error);rec.start();$('#mic').classList.add('rec')};
// search
$('#searchBtn').onclick=()=>{$('#searchBar').classList.toggle('hidden');if(!$('#searchBar').classList.contains('hidden'))$('#search').focus();else{q='';$('#search').value='';render()}};
$('#search').addEventListener('input',e=>{q=e.target.value;render()});
// theme
const setTheme=t=>{document.documentElement.dataset.theme=t;localStorage.setItem('bd.theme',t);document.querySelector('meta[name=theme-color]').content=t==='dark'?'#0e0d16':'#f6f5fb'};
setTheme(localStorage.getItem('bd.theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
$('#themeBtn').onclick=()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
// menu
let deferred=null;addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;$('#installBtn').classList.remove('hidden')});
$('#menuBtn').onclick=()=>$('#sheet').classList.remove('hidden');
$('#sheet').addEventListener('click',async e=>{if(e.target.id==='sheet'){$('#sheet').classList.add('hidden');return}const a=e.target.dataset.a;if(!a)return;
 if(a==='export'){const b=new Blob([JSON.stringify({app:'brain-dump',version:1,exported:new Date().toISOString(),items},null,2)],{type:'application/json'});const l=document.createElement('a');l.href=URL.createObjectURL(b);l.download=`brain-dump-${new Date().toISOString().slice(0,10)}.json`;l.click();toast('Exported '+items.length+' items')}
 if(a==='import')$('#file').click();
 if(a==='notify'){if(!('Notification'in window))return toast('Notifications not supported');const p=await Notification.requestPermission();toast(p==='granted'?'🔔 Reminders on':'Notifications blocked')}
 if(a==='clearDone'){const n=items.filter(i=>i.done).length;items=items.filter(i=>!i.done);save();render();toast(`Cleared ${n}`)}
 if(a==='install'&&deferred){deferred.prompt();deferred=null}
 $('#sheet').classList.add('hidden')});
$('#file').onchange=async e=>{try{const d=JSON.parse(await e.target.files[0].text());const inc=(d.items||d).filter(x=>x.id&&x.text);const ids=new Set(items.map(i=>i.id));const nw=inc.filter(x=>!ids.has(x.id));items=items.concat(nw);save();render();toast(`Imported ${nw.length} items`)}catch{toast('Invalid file')}e.target.value=''};
// reminders
function checkReminders(){const now=Date.now();let ch=false;items.forEach(i=>{if(i.due&&!i.done&&!i.notified&&new Date(i.due)<=now&&now-new Date(i.due)<36e5*12){i.notified=true;ch=true;
 if('Notification'in window&&Notification.permission==='granted'){const show=()=>new Notification('⏰ '+i.title,{body:'Brain Dump reminder',icon:'icons/icon-192.png',tag:i.id});
  navigator.serviceWorker?.ready.then(r=>r.showNotification('⏰ '+i.title,{body:'Brain Dump reminder',icon:'icons/icon-192.png',tag:i.id})).catch(show)}else toast('⏰ '+i.title)}});if(ch){save();render()}}
setInterval(()=>{checkReminders();greet()},20000);checkReminders();
document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
if(!items.length){['Remind me to call mum tomorrow at 3pm','milk, eggs, bread and butter','Idea: an app that remembers everything for me','Owe Sam £20 for the cinema'].forEach(t=>add(t))}
render();preview();
