'use strict';
(() => {
const CATS={today:'Today',all:'All',task:'Tasks',reminder:'Reminders',shopping:'Shopping',idea:'Ideas',note:'Notes',contact:'People',money:'Money'};
const REAL=['task','reminder','shopping','idea','note','contact','money'];
const KEY='braindump.v1',$=s=>document.querySelector(s),I=Icon;
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const state={items:load(),tab:'today',q:'',fresh:new Set(),briefOpen:localStorage.getItem('bd.brief')!=='0'};
function load(){try{const v=localStorage.getItem(KEY);if(v===null)return null;const a=JSON.parse(v);return Array.isArray(a)?a:[]}catch{return[]}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state.items))}catch{toast('Storage full — export a backup')}syncServer()}
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cap=s=>s?s[0].toUpperCase()+s.slice(1):s;
const byId=id=>state.items.find(i=>i.id===id);
const endToday=()=>{const d=new Date();d.setHours(23,59,59,999);return d.getTime()};
const ts=i=>i.due?new Date(i.due).getTime():Infinity;
const gbp=v=>'£'+(+v).toFixed(2);
const mmss=s=>`${Math.floor(s/60)}:${String(Math.round(s%60)).padStart(2,'0')}`;
const touch=i=>{i.touched=Date.now()};
const haptic=ms=>{try{navigator.vibrate?.(ms)}catch{}};

/* ---------- recurrence ---------- */
const DOW=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
function parseRecur(text){const t=text.toLowerCase();let m,rule=null,hit='';
 if(m=t.match(/\b(every\s+(?:single\s+)?day|daily|each day)\b/)){rule={freq:'day',n:1};hit=m[0]}
 else if(m=t.match(/\bevery\s+(other|\d+)\s+(day|week|month|year)s?\b/)){rule={freq:m[2],n:m[1]==='other'?2:+m[1]};hit=m[0]}
 else if(m=t.match(/\b(?:every|each)\s+(mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)(?:day|nesday|sday|urday)?s?\b/)){rule={freq:'week',n:1,dow:DOW.findIndex(d=>d.startsWith(m[1]))};hit=m[0]}
 else if(m=t.match(/\b(every\s+week|weekly|each week)\b/)){rule={freq:'week',n:1};hit=m[0]}
 else if(m=t.match(/\b(every\s+month|monthly|each month)\b/)){rule={freq:'month',n:1};hit=m[0]}
 else if(m=t.match(/\b(every\s+year|yearly|annually|each year)\b/)){rule={freq:'year',n:1};hit=m[0]}
 return rule?{rule,hit}:null}
function nextDue(iso,rule,after=Date.now()){const d=new Date(iso);let guard=0;do{if(rule.freq==='day')d.setDate(d.getDate()+rule.n);else if(rule.freq==='week')d.setDate(d.getDate()+7*rule.n);else if(rule.freq==='month'){const day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+rule.n);d.setDate(Math.min(day,new Date(d.getFullYear(),d.getMonth()+1,0).getDate()))}else d.setFullYear(d.getFullYear()+rule.n)}while(d.getTime()<=after&&++guard<1000);return d.toISOString()}
function recurLabel(r){if(!r)return'';const n=r.n>1?r.n+' ':'';if(r.freq==='week'&&r.dow!=null&&r.n===1)return'Every '+cap(DOW[r.dow]);return r.n===1?{day:'Daily',week:'Weekly',month:'Monthly',year:'Yearly'}[r.freq]:`Every ${n}${r.freq}s`}
function applyRecur(it){const pr=parseRecur(it.text);if(!pr){it.recur=null;return}it.recur=pr.rule;
 it.title=cap(it.title.replace(new RegExp('\\s*\\b'+pr.hit.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i'),'').replace(/\s*\b(every|each)\b\s*(?=$|\s(on|at)\b)/i,'').replace(/\s+(on|at)$/i,'').trim())||it.title;
 if(!it.due){const d=new Date();d.setHours(9,0,0,0);if(pr.rule.dow!=null){d.setDate(d.getDate()+((pr.rule.dow-d.getDay()+7)%7||7))}else if(d<=Date.now())d.setDate(d.getDate()+1);it.due=d.toISOString();it.hasTime=false}
 if(it.cat==='task'||it.cat==='note')it.cat='reminder'}

/* ---------- model ---------- */
function makeItem(text,extra){const r=BD.classify(text);const it={id:uid(),text:r.text,cat:r.category,due:r.due||null,hasTime:!!r.hasTime,amount:r.amount||null,items:null,created:Date.now(),touched:Date.now(),done:false,doneAt:null,notified:false,pinned:false,...extra};applyText(it,r);applyRecur(it);return it}
function applyText(it,r){r=r||BD.classify(it.text);
 if(it.cat==='shopping'){const list=BD.splitItems(it.text).map(cap);if(list.length>1){it.items=list.map(t=>({t,d:false}));it.title='Shopping list'}else{it.items=null;it.title=list[0]||cap(it.text)}}
 else{it.items=null;it.title=cap((r.due?r.title:it.text).replace(/^(idea|note|fyi|business idea|app idea)\s*[:\-–]\s*/i,''))||cap(it.text)}}
function isToday(i){if(i.done)return!!i.doneAt&&new Date(i.doneAt).toDateString()===new Date().toDateString();return!!i.due&&ts(i)<=endToday()}
function visible(){const{items,tab,q}=state;if(q){const s=q.toLowerCase();return items.filter(i=>(i.title+' '+i.text+' '+(i.items||[]).map(x=>x.t).join(' ')+' '+(i.ocr||'')).toLowerCase().includes(s))}
 return tab==='today'?items.filter(isToday):tab==='all'?items:items.filter(i=>i.cat===tab)}
const order=(a,b)=>(a.done-b.done)||((!!b.pinned)-(!!a.pinned))||(a.done?(b.doneAt-a.doneAt):((ts(a)-ts(b))||(b.created-a.created)));
function counts(){const c={};for(const k in CATS)c[k]=0;for(const i of state.items){if(i.done)continue;c.all++;c[i.cat]++;if(isToday(i))c.today++}return c}

/* ---------- formatting ---------- */
function fmtDue(iso,hasTime){const d=new Date(iso),a=new Date(d).setHours(0,0,0,0),b=new Date().setHours(0,0,0,0),diff=Math.round((a-b)/864e5);
 let s=diff===0?'Today':diff===1?'Tomorrow':diff===-1?'Yesterday':diff>1&&diff<7?d.toLocaleDateString('en-GB',{weekday:'long'}):d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:d.getFullYear()!==new Date().getFullYear()?'numeric':undefined});
 return hasTime?s+' '+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):s}
function dueCls(i){if(!i.due||i.done)return'';const t=ts(i)-Date.now();if(t<0&&!(i.hasTime===false&&new Date(i.due).toDateString()===new Date().toDateString()))return'over';return t<3*36e5?'soon':''}

/* ---------- rendering ---------- */
function card(i,showCat){const fresh=state.fresh.has(i.id);const dc=dueCls(i);
 const meta=[showCat?`<span class="cat c-${i.cat}">${I(i.cat)}${CATS[i.cat]}</span>`:'',i.due?`<span class="due ${dc}">${I('clock')}${fmtDue(i.due,i.hasTime)}</span>`:'',i.recur?`<span class="rec">${I('repeat')}${recurLabel(i.recur)}</span>`:'',i.amount?`<span class="amt">${gbp(i.amount)}</span>`:'',i.items?`<span>${i.items.filter(x=>x.d).length} of ${i.items.length}</span>`:'',i.photo?`<span>${I('image')}Photo</span>`:''].join('');
 return`<div class="item c-${i.cat}${i.done?' done':''}${fresh?' enter':''}" data-id="${i.id}"><div class="swipebg">${I('check')}<span>${i.done?'Undo':'Done'}</span></div><div class="row">
<button class="chk" data-a="toggle" aria-label="${i.done?'Mark not done':'Complete'}: ${esc(i.title)}" aria-pressed="${i.done}"><i>${I('check')}</i></button>
<div class="body"><div class="ttl" data-a="edit" role="button" tabindex="0">${i.pinned?`<span class="pin" aria-label="Pinned">${I('star')}</span>`:''}${esc(i.title)}</div>
${i.voice?`<button class="player" data-a="play" data-key="${i.voice.key}" aria-label="Play voice note">${I('play','pl')}${I('pause','pa')}<span class="bar"><span></span></span><span class="dur">${mmss(i.voice.dur)}</span></button>`:''}
${i.items?`<ul class="subs">${i.items.map((x,k)=>`<li><button class="${x.d?'x':''}" data-a="sub" data-k="${k}" aria-pressed="${x.d}"><i>${I('check')}</i>${esc(x.t)}</button></li>`).join('')}</ul>`:''}
<div class="meta" data-a="edit">${meta}</div></div>${i.photo?`<img class="thumb" data-a="edit" data-photo="${i.photo}" alt="">`:''}</div></div>`}
function group(title,list,showCat,cls=''){return list.length?`${title?`<div class="sec ${cls}"><span>${title}</span><span class="cnt">${list.length}</span></div>`:'<div class="gap"></div>'}<div class="group">${list.map(i=>card(i,showCat)).join('')}</div>`:''}
const EMPTY={today:['today','Nothing due today','Add a reminder like “dentist tomorrow 3pm”.'],all:['all','A clear mind','Type, speak or snap anything below. It sorts itself.'],task:['task','No tasks','Try “call the plumber”.'],reminder:['reminder','No reminders','Try “bins out tonight”.'],shopping:['shopping','Shopping list is empty','Try “milk, eggs and bread”.'],idea:['idea','No ideas yet','Start with “idea: …”.'],note:['note','No notes','Anything else lands here.'],contact:['contact','No people yet','Try “Sarah’s number is 07700 900123”.'],money:['money','No money notes','Try “owe Sam £20”.']};
function briefCard(){const b=Insights.brief(state.items);if(!state.items.length)return'';
 const h=new Date().getHours();const greet=h<12?'Good morning':h<18?'Good afternoon':'Good evening';
 const rows=[];if(b.money.owe||b.money.owed)rows.push(`<div class="brow">${I('money')}<span>${b.money.owe?`You owe <b>${gbp(b.money.owe)}</b>`:''}${b.money.owe&&b.money.owed?' · ':''}${b.money.owed?`You’re owed <b>${gbp(b.money.owed)}</b>`:''}</span></div>`);
 for(const l of b.linked.slice(0,2))rows.push(`<div class="brow link" data-open="${l.reminder.id}">${I('link')}<span>${esc(l.reminder.title)} — ${l.notes.map(n=>`<a data-open="${n.id}">${esc(n.title)}</a>`).join(', ')}</span></div>`);
 return`<section class="brief${state.briefOpen?'':' closed'}" aria-label="Today brief"><div class="bhead"><div><div class="beyebrow">${greet}, Duncan</div><div class="bline">${esc(b.headline)}</div></div>
<button class="ib sm" data-b="speak" aria-label="Read it to me">${I('speaker')}</button><button class="ib sm chev" data-b="toggle" aria-label="${state.briefOpen?'Collapse':'Expand'} brief" aria-expanded="${state.briefOpen}"><svg class="ic" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></button></div>${state.briefOpen&&rows.length?`<div class="bbody">${rows.join('')}</div>`:''}</section>`}
function looseCard(){if(state.q)return'';const l=Insights.looseEnds(state.items)[0];if(!l)return'';const days=Math.floor((Date.now()-(l.touched||l.created))/864e5);
 return`<section class="loose" data-id="${l.id}"><div class="lq">Still want to do this?</div><div class="lt">${I(l.cat,'c-'+l.cat)}<span>${esc(l.title)}</span></div><div class="lsub">Untouched for ${days} days</div>
<div class="lbtns"><button data-l="keep">Keep</button><button data-l="done">Done</button><button data-l="snooze">Snooze</button><button data-l="delete" class="dng">Delete</button></div></section>`}
function render(){const{tab,q}=state;const c=counts();Insights.learn(state.items);
 $('#title').textContent=q?'Search':CATS[tab];$('#sub').textContent=tab==='today'&&!q?new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'}):q?'':`${c[tab]||0} open`;
 $('#tabs').innerHTML=Object.entries(CATS).map(([k,n])=>`<button class="tab c-${k}" role="tab" data-t="${k}" aria-selected="${tab===k&&!q}">${I(k)}<span>${n}</span>${c[k]?`<span class="n">${c[k]}</span>`:''}</button>`).join('');
 const l=visible().sort(order);let html='';
 if(tab==='today'&&!q)html+=briefCard()+looseCard();
 if(!l.length){const[e,t,s]=q?['search','No matches',`Nothing contains “${esc(q)}”.`]:(state.items.length?EMPTY[tab]:EMPTY.all);html+=`<div class="empty"><div class="eico c-${e}">${I(e)}</div><h2>${t}</h2><p>${s}</p></div>`}
 else if(tab==='today'&&!q){const over=l.filter(i=>!i.done&&dueCls(i)==='over');html+=group('Overdue',over,true,'red')+group('Today',l.filter(i=>!i.done&&!over.includes(i)),true)+group('Done today',l.filter(i=>i.done),true)}
 else{const showCat=tab==='all'||!!q;html+=group('',l.filter(i=>!i.done),showCat)+group('Completed',l.filter(i=>i.done),showCat)}
 $('#list').innerHTML=html;state.fresh.clear();loadThumbs()}
const urls=new Map();async function blobUrl(key){if(urls.has(key))return urls.get(key);const b=await Media.get(key).catch(()=>null);if(!b)return null;const u=URL.createObjectURL(b);urls.set(key,u);return u}
function loadThumbs(){document.querySelectorAll('img[data-photo]').forEach(async im=>{const u=await blobUrl(im.dataset.photo);if(u)im.src=u;else im.remove()})}

/* ---------- toast ---------- */
let tt=0;function toast(msg,action,fn){const t=$('#toast'),b=t.querySelector('button');t.querySelector('span').textContent=msg;
 b.hidden=!action;b.textContent=action||'';b.onclick=action?()=>{fn();hide()}:null;t.classList.add('on');clearTimeout(tt);tt=setTimeout(hide,action?5000:2200);
 function hide(){t.classList.remove('on');b.onclick=null}}

/* ---------- actions ---------- */
function addItems(made){state.items.unshift(...made);made.forEach(i=>state.fresh.add(i.id));save();
 const cats=[...new Set(made.map(i=>i.cat))];
 if(!state.q&&state.tab!=='all'&&!made.some(i=>state.tab==='today'?isToday(i):i.cat===state.tab))state.tab=cats.length===1?cats[0]:'all';
 render();toast(made.length>1?`Added ${made.length} entries`:`Added to ${CATS[made[0].cat]}`)}
function add(text){const lines=text.split(/\n+/).map(s=>s.trim()).filter(Boolean);if(lines.length)addItems(lines.map(t=>makeItem(t)))}
function setDone(id,v,animate){const i=byId(id);if(!i)return;
 if(v&&i.recur&&i.due){const el=document.querySelector(`.item[data-id="${id}"]`);const old={due:i.due,notified:i.notified};
  const roll=()=>{i.due=nextDue(i.due,i.recur);i.notified=false;touch(i);if(i.items)i.items.forEach(x=>x.d=false);save();render();haptic(12);toast('Next: '+fmtDue(i.due,i.hasTime),'Undo',()=>{Object.assign(i,old);save();render()})};
  if(animate&&el&&!reduce.matches){el.classList.add('completing');setTimeout(roll,420)}else roll();return}
 const commit=()=>{i.done=v;i.doneAt=v?Date.now():null;touch(i);if(i.items&&!v&&i.items.every(x=>x.d))i.items.forEach(x=>x.d=false);save();render();if(v){haptic(10);toast('Completed','Undo',()=>setDone(id,false))}};
 const el=document.querySelector(`.item[data-id="${id}"]`);
 if(animate&&v&&el&&!reduce.matches){el.classList.add('completing');setTimeout(commit,420)}else commit()}
function remove(id){const k=state.items.findIndex(i=>i.id===id);if(k<0)return;const[it]=state.items.splice(k,1);save();render();
 toast('Deleted','Undo',()=>{state.items.splice(Math.min(k,state.items.length),0,it);state.fresh.add(it.id);save();render()})}

/* ---------- list events ---------- */
let suppressClick=false;
$('#list').addEventListener('click',e=>{if(suppressClick){suppressClick=false;return}
 const op=e.target.closest('[data-open]');if(op){e.stopPropagation();openEdit(op.dataset.open);return}
 const bb=e.target.closest('[data-b]');if(bb){if(bb.dataset.b==='toggle'){state.briefOpen=!state.briefOpen;localStorage.setItem('bd.brief',state.briefOpen?'1':'0');render()}else speak();return}
 const lb=e.target.closest('[data-l]');if(lb){const id=lb.closest('.loose').dataset.id,i=byId(id);if(!i)return;const a=lb.dataset.l;
  if(a==='keep'){touch(i);save();render();toast('Kept — we’ll check again in 2 weeks')}else if(a==='done')setDone(id,true);else if(a==='snooze'){i.snoozeUntil=Date.now()+7*864e5;save();render();toast('Snoozed for a week')}else remove(id);return}
 const b=e.target.closest('[data-a]');if(!b)return;const el=b.closest('.item');if(!el)return;const id=el.dataset.id,i=byId(id);if(!i)return;
 if(b.dataset.a==='toggle')setDone(id,!i.done,true);
 else if(b.dataset.a==='sub'){const x=i.items[+b.dataset.k];x.d=!x.d;touch(i);if(i.items.every(x=>x.d)){setDone(id,true,true);return}if(i.done){i.done=false;i.doneAt=null}save();render()}
 else if(b.dataset.a==='play')play(b);
 else if(b.dataset.a==='edit')openEdit(id)});
$('#list').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.ttl')){e.preventDefault();openEdit(e.target.closest('.item').dataset.id)}});
// swipe right to complete — direction-locked; vertical scroll wins via touch-action:pan-y
let sw=null;
$('#list').addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')return;const row=e.target.closest('.row');if(!row||e.target.closest('.player'))return;sw={row,x:e.clientX,y:e.clientY,dx:0,lock:null,id:e.pointerId}});
$('#list').addEventListener('pointermove',e=>{if(!sw||e.pointerId!==sw.id)return;const dx=e.clientX-sw.x,dy=e.clientY-sw.y;
 if(!sw.lock){if(Math.abs(dx)<8&&Math.abs(dy)<8)return;sw.lock=Math.abs(dx)>Math.abs(dy)*1.3&&dx>0?'x':'y';if(sw.lock==='x'){sw.row.classList.remove('snap');sw.row.parentNode.classList.add('swiping');sw.row.setPointerCapture?.(e.pointerId)}}
 if(sw.lock!=='x')return;sw.dx=Math.max(0,dx);sw.row.style.transform=`translateX(${sw.dx<110?sw.dx:110+(sw.dx-110)*.25}px)`;const arm=sw.dx>90;if(arm!==sw.armed){sw.armed=arm;if(arm)haptic(6)}sw.row.parentNode.classList.toggle('armed',arm)});
function endSwipe(e){if(!sw)return;const s=sw;sw=null;if(s.lock!=='x')return;suppressClick=true;setTimeout(()=>suppressClick=false,350);
 s.row.classList.add('snap');const item=s.row.parentNode;
 if(s.dx>90&&e.type==='pointerup'){s.row.style.transform='translateX(100%)';setTimeout(()=>{const i=byId(item.dataset.id);if(i)setDone(i.id,!i.done)},200)}
 else{s.row.style.transform='';setTimeout(()=>item.classList.remove('swiping','armed'),240)}}
$('#list').addEventListener('pointerup',endSwipe);$('#list').addEventListener('pointercancel',endSwipe);

/* ---------- audio playback ---------- */
const audio=new Audio();let playingBtn=null;
async function play(btn){if(playingBtn===btn&&!audio.paused){audio.pause();return}const u=await blobUrl(btn.dataset.key);if(!u)return toast('Recording not found on this device');
 playingBtn?.classList.remove('on');playingBtn=btn;audio.src=u;btn.classList.add('on');audio.play().catch(()=>toast('Could not play recording'))}
audio.addEventListener('timeupdate',()=>{if(!playingBtn||!document.contains(playingBtn))return;const d=isFinite(audio.duration)?audio.duration:+(byId(playingBtn.closest('.item')?.dataset.id)?.voice?.dur)||1;playingBtn.querySelector('.bar span').style.width=Math.min(100,audio.currentTime/d*100)+'%';playingBtn.querySelector('.dur').textContent=mmss(audio.currentTime)});
const stopUI=()=>{if(!playingBtn)return;playingBtn.classList.remove('on');const it=byId(playingBtn.closest('.item')?.dataset.id);if(it?.voice)playingBtn.querySelector('.dur').textContent=mmss(it.voice.dur);playingBtn.querySelector('.bar span').style.width='0'};
audio.addEventListener('pause',stopUI);audio.addEventListener('ended',()=>{stopUI();playingBtn=null});

/* ---------- speech synthesis ---------- */
function speak(){if(!('speechSynthesis'in window))return toast('Read-aloud isn’t supported here');const s=speechSynthesis;if(s.speaking){s.cancel();return}
 const u=new SpeechSynthesisUtterance(Insights.brief(state.items).speech);u.lang='en-GB';const v=s.getVoices().find(v=>v.lang==='en-GB');if(v)u.voice=v;u.rate=1.02;s.speak(u)}

/* ---------- sheets ---------- */
const sheet=$('#sheet'),panel=sheet.querySelector('.panel');let lastFocus=null,onClose=null;
function openSheet(html,init,close){if(!sheet.hidden)closeSheet(true);$('#toast').classList.remove('on');lastFocus=document.activeElement;panel.innerHTML=html;sheet.hidden=false;document.body.classList.add('locked');onClose=close||null;init&&init(panel)}
function closeSheet(silent){if(sheet.hidden)return;sheet.hidden=true;panel.innerHTML='';document.body.classList.remove('locked');const f=onClose;onClose=null;f&&f();if(!silent)lastFocus?.focus?.({preventScroll:true})}
sheet.addEventListener('click',e=>{if(e.target.closest('[data-close]'))closeSheet()});
addEventListener('keydown',e=>{if(e.key==='Escape'){if(rec)stopRec(false);else if(!sheet.hidden)closeSheet();else if(!$('#searchBar').hidden)toggleSearch(false)}});
const pad=n=>String(n).padStart(2,'0');const toLocal=iso=>{const d=new Date(iso);return`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`};
function openEdit(id){const i=byId(id);if(!i)return;let cat=i.cat;
 const text=i.items?i.items.map(x=>x.t).join(', '):i.text;const rel=Insights.related(i,state.items);
 openSheet(`<div class="sh-head"><span class="cat c-${i.cat}" id="eCatLbl">${I(i.cat)}${CATS[i.cat]}</span><span class="hgap"></span><button class="ib sm pinbtn" id="ePin" aria-pressed="${!!i.pinned}" aria-label="Pin to top">${I('star')}</button><button class="ib sm" data-close aria-label="Close">${I('x')}</button></div>
<textarea id="eText" aria-label="Text" rows="2">${esc(text)}</textarea>
${i.voice?`<button class="player big" data-key="${i.voice.key}" id="ePlay">${I('play','pl')}${I('pause','pa')}<span class="bar"><span></span></span><span class="dur">${mmss(i.voice.dur)}</span></button>`:''}
${i.photo?`<img class="photo" id="ePhoto" alt="Attached photo">`:''}
<label>Category</label><div class="chips">${REAL.map(k=>`<button type="button" class="chip c-${k}" data-c="${k}" aria-pressed="${k===cat}">${I(k)}${CATS[k]}</button>`).join('')}</div>
<label for="eDue">Date &amp; time</label><div class="daterow"><input type="datetime-local" id="eDue" value="${i.due?toLocal(i.due):''}"><button type="button" class="btn" id="eClear">Clear</button></div>
<label>Repeat</label><div class="chips" id="eRep">${[['','Never'],['day','Daily'],['week','Weekly'],['month','Monthly'],['year','Yearly']].map(([k,n])=>`<button type="button" class="chip rchip" data-r="${k}" aria-pressed="${(i.recur?.freq||'')===k}">${n}</button>`).join('')}</div>
${i.due?`<div class="calrow"><span>${I('cal')}Add to calendar</span><button type="button" class="pill" id="eIcs">.ics</button><a class="pill" target="_blank" rel="noopener" href="${Cal.google(i)}">Google</a><a class="pill" target="_blank" rel="noopener" href="${Cal.outlook(i)}">Outlook</a></div>`:''}
${rel.length?`<label>Related</label><div class="related">${rel.map(r=>`<button type="button" class="relitem" data-rel="${r.id}">${I(r.cat,'c-'+r.cat)}<span>${esc(r.title)}</span></button>`).join('')}</div>`:''}
${i.ocr?`<details class="ocr"><summary>Scanned text</summary><pre>${esc(i.ocr)}</pre></details>`:''}
<div class="btns stick"><button type="button" class="btn dng" id="eDel" aria-label="Delete">${I('trash')}</button><button type="button" class="btn" data-close>Cancel</button><button type="button" class="btn pri" id="eSave">Save</button></div>`,p=>{
  if(i.photo)blobUrl(i.photo).then(u=>{const im=p.querySelector('#ePhoto');if(im&&u)im.src=u});
  p.querySelector('#ePlay')?.addEventListener('click',e=>play(e.currentTarget));
  p.querySelector('.chips').onclick=e=>{const c=e.target.closest('.chip');if(!c)return;cat=c.dataset.c;p.querySelectorAll('.chip[data-c]').forEach(x=>x.setAttribute('aria-pressed',x===c));const l=p.querySelector('#eCatLbl');l.className='cat c-'+cat;l.innerHTML=I(cat)+CATS[cat]};
  p.querySelector('#eClear').onclick=()=>p.querySelector('#eDue').value='';
  let pinned=!!i.pinned,recur=i.recur||null;
  p.querySelector('#ePin').onclick=e=>{pinned=!pinned;e.currentTarget.setAttribute('aria-pressed',pinned);haptic(6)};
  p.querySelector('#eRep').onclick=e=>{const c=e.target.closest('[data-r]');if(!c)return;const f=c.dataset.r;recur=f?(recur&&recur.freq===f?recur:{freq:f,n:1,dow:f==='week'&&p.querySelector('#eDue').value?new Date(p.querySelector('#eDue').value).getDay():undefined}):null;p.querySelectorAll('[data-r]').forEach(b=>b.setAttribute('aria-pressed',b===c))};
  p.querySelector('#eIcs')?.addEventListener('click',()=>Cal.download(`${i.title.slice(0,40).replace(/[^\w ]/g,'')||'reminder'}.ics`,Cal.ics([i])));
  p.querySelector('.related')?.addEventListener('click',e=>{const r=e.target.closest('[data-rel]');if(r)openEdit(r.dataset.rel)});
  p.querySelector('#eDel').onclick=()=>{closeSheet();remove(id)};
  p.querySelector('#eSave').onclick=()=>{const t=p.querySelector('#eText').value.trim();if(!t){closeSheet();remove(id);return}
   const dv=p.querySelector('#eDue').value,newDue=dv?new Date(dv).toISOString():null;const prevDone=i.items?new Set(i.items.filter(x=>x.d).map(x=>x.t)):null;
   const changed=t!==text||cat!==i.cat;i.text=t;i.cat=cat;touch(i);
   if(changed){const r=BD.classify(t);applyText(i,r);if(i.items&&prevDone)i.items.forEach(x=>x.d=prevDone.has(x.t));if(r.amount)i.amount=r.amount;
     if(!dv&&r.due&&!i.due&&['reminder','task','money'].includes(cat)){i.due=r.due;i.hasTime=!!r.hasTime}else{if(i.due!==newDue)i.notified=false;i.due=newDue;i.hasTime=!!dv}}
   else{const old=i.due?new Date(toLocal(i.due)).toISOString():null;if(newDue!==old){i.due=newDue;i.hasTime=!!dv;i.notified=false}}
   i.pinned=pinned;i.recur=recur;if(recur&&!i.due){const d=new Date();d.setDate(d.getDate()+1);d.setHours(9,0,0,0);i.due=d.toISOString();i.hasTime=false}
   save();closeSheet();render();toast('Saved')};
 },()=>{if(playingBtn&&!document.contains(playingBtn)){audio.pause();playingBtn=null}})}

/* ---------- push opt-in ---------- */
function openPush(){const S=Sync.state;const ios=Sync.isIOS(),sa=Sync.standalone(),sup=Sync.pushSupported();
 openSheet(`<div class="sh-head"><h3>Reminder notifications</h3><button class="ib sm" data-close aria-label="Close">${I('x')}</button></div>
<div class="hero c-reminder">${I('bell')}</div>
<p class="lead">Get a notification when a reminder is due — even when Brain Dump is closed.</p>
<ul class="facts"><li>${I('check')}Only the reminder’s title and time are sent to our server, nothing else.</li><li>${I('check')}Everything else stays on this device.</li><li>${I('check')}Turn it off any time.</li></ul>
${ios&&!sa?`<div class="ios"><b>On iPhone or iPad:</b> notifications only work once Brain Dump is on your Home Screen.<ol><li>Tap the Share button in Safari</li><li>Choose <b>Add to Home Screen</b></li><li>Open Brain Dump from your Home Screen and turn this on</li></ol></div>`:''}
<label class="toggle"><span>Morning brief at 8am</span><input type="checkbox" id="pBrief" ${S.brief?'checked':''}><i></i></label>
<div class="btns">${S.push?`<button class="btn" id="pOff">Turn off</button><button class="btn pri" data-close>Done</button>`:`<button class="btn" data-close>Not now</button><button class="btn pri" id="pOn" ${!sup&&!(ios&&!sa)?'disabled':''}>${ios&&!sa?'Got it':'Turn on'}</button>`}</div>
${!sup&&!(ios&&!sa)?'<p class="fine">This browser doesn’t support web push.</p>':''}`,p=>{
  p.querySelector('#pBrief').onchange=e=>{S.brief=e.target.checked;Sync.persist();syncServer(true);toast(S.brief?'Morning brief on':'Morning brief off')};
  p.querySelector('#pOn')?.addEventListener('click',async e=>{if(ios&&!sa){closeSheet();return}e.target.disabled=true;e.target.textContent='Turning on…';
   try{await Sync.enablePush();syncServer(true);closeSheet();toast('Notifications on');}catch(err){e.target.disabled=false;e.target.textContent='Turn on';toast(err.message==='denied'?'Notifications are blocked in browser settings':'Couldn’t turn on notifications')}});
  p.querySelector('#pOff')?.addEventListener('click',async()=>{await Sync.disablePush();closeSheet();toast('Notifications off')})})}
function syncPayload(){const now=Date.now();const list=state.items.filter(i=>!i.done&&i.due&&ts(i)>now-864e5).slice(0,400).map(i=>({id:i.id,title:i.title,due:i.due,allDay:i.hasTime===false}));
 if(Sync.state.brief&&Sync.state.push){const d=new Date();if(d.getHours()>=8)d.setDate(d.getDate()+1);d.setHours(8,0,0,0);
  const b=Insights.brief(state.items,d);list.push({id:'brief-'+d.toISOString().slice(0,10),title:b.headline,due:d.toISOString()})}
 return list}
function syncServer(){Sync.schedule(syncPayload())}

/* ---------- calendar subscribe ---------- */
function openCalendar(){const S=Sync.state;
 openSheet(`<div class="sh-head"><h3>Calendar</h3><button class="ib sm" data-close aria-label="Close">${I('x')}</button></div>
<button class="mi" id="cExport">${I('download')}<span><b>Export all reminders</b><small>One .ics file for Apple, Google or Outlook</small></span></button>
<button class="mi" id="cSub">${I('cal')}<span><b>${S.feed?'Live calendar feed is on':'Subscribe in your calendar'}</b><small>Reminders appear and update automatically</small></span></button>
${S.feed?`<div class="feed"><input readonly value="${Sync.feedUrl()}" id="cUrl" aria-label="Calendar feed URL"><button class="btn" id="cCopy">${I('copy')}</button></div>
<div class="btns"><a class="btn pri" href="${Sync.feedUrl()}">Open in Calendar</a><a class="btn" target="_blank" rel="noopener" href="https://calendar.google.com/calendar/r?cid=${encodeURIComponent(Sync.feedUrl())}">Google</a></div>
<p class="fine">Only reminder titles and times are shared. Anyone with this link can see them. <a href="#" id="cOff">Turn off feed</a></p>`:`<p class="fine">The feed shares reminder titles and times via our server, like push notifications.</p>`}`,p=>{
  p.querySelector('#cExport').onclick=()=>{const l=state.items.filter(i=>i.due&&!i.done);if(!l.length)return toast('No upcoming reminders to export');Cal.download('brain-dump-reminders.ics',Cal.ics(l));toast(`Exported ${l.length} reminders`)};
  p.querySelector('#cSub').onclick=()=>{if(S.feed)return;S.feed=true;Sync.persist();syncServer();openCalendar()};
  p.querySelector('#cCopy')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(Sync.feedUrl());toast('Link copied')}catch{p.querySelector('#cUrl').select()}});
  p.querySelector('#cOff')?.addEventListener('click',async e=>{e.preventDefault();S.feed=false;Sync.persist();if(!S.push)await Sync.call('schedule',{replace:true,reminders:[]}).catch(()=>{});openCalendar()})})}

/* ---------- menu ---------- */
$('#menuBtn').onclick=()=>{const S=Sync.state;openSheet(`<div class="sh-head"><h3>Brain Dump</h3><button class="ib sm" data-close aria-label="Close">${I('x')}</button></div>
<button class="mi" data-m="push">${I('bell')}<span><b>Notifications</b><small>${S.push?'On'+(S.brief?' · morning brief at 8am':''):'Off — tap to set up'}</small></span></button>
<button class="mi" data-m="cal">${I('cal')}<span><b>Calendar</b><small>Export or subscribe to your reminders</small></span></button>
<button class="mi" data-m="export">${I('download')}<span><b>Export backup</b><small>JSON (text only — recordings and photos stay on device)</small></span></button>
<button class="mi" data-m="import">${I('upload')}<span><b>Import backup</b></span></button>
<button class="mi" data-m="clear">${I('broom')}<span><b>Clear completed</b></span></button>${deferredInstall?`<button class="mi" data-m="install">${I('phone')}<span><b>Install app</b></span></button>`:''}
<input type="file" id="file" accept="application/json,.json" hidden>`,p=>{
 p.onclick=async e=>{const m=e.target.closest('[data-m]')?.dataset.m;if(!m)return;
  if(m==='import'){p.querySelector('#file').click();return}if(m==='push')return openPush();if(m==='cal')return openCalendar();
  closeSheet();
  if(m==='export'){const blob=new Blob([JSON.stringify({app:'brain-dump',version:3,exported:new Date().toISOString(),items:state.items},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`brain-dump-${new Date().toISOString().slice(0,10)}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast(`Exported ${state.items.length} entries`)}
  if(m==='clear'){const n=state.items.filter(i=>i.done).length;if(!n)return toast('Nothing completed yet');const keep=state.items.slice();state.items=state.items.filter(i=>!i.done);save();render();toast(`Cleared ${n}`,'Undo',()=>{state.items=keep;save();render()})}
  if(m==='install'&&deferredInstall){deferredInstall.prompt();deferredInstall=null}};
 p.querySelector('#file').onchange=async e=>{const f=e.target.files[0];if(!f)return;closeSheet();try{const d=JSON.parse(await f.text());const inc=(Array.isArray(d)?d:d.items||[]).filter(x=>x&&typeof x.id==='string'&&typeof x.text==='string'&&REAL.includes(x.cat));
  const ids=new Set(state.items.map(i=>i.id));const nw=inc.filter(x=>!ids.has(x.id)).map(x=>({title:x.text,done:false,created:Date.now(),...x}));state.items.push(...nw);save();render();toast(nw.length?`Imported ${nw.length} entries`:'No new entries in that file')}catch{toast('That file isn’t a Brain Dump backup')}}})};

/* ---------- input ---------- */
const inp=$('#input'),form=$('#dump');
function autosize(){inp.style.height='auto';inp.style.height=Math.min(inp.scrollHeight,132)+'px'}
function preview(){const v=inp.value.trim(),pv=$('#preview');$('#send').disabled=!v;form.classList.toggle('typing',!!v);if(!v){pv.classList.remove('on');return}
 const r=BD.classify(v.split('\n')[0]);pv.innerHTML=`<span class="cat c-${r.category}">${I(r.category)}${CATS[r.category]}</span>${r.due?`<span>${fmtDue(r.due,r.hasTime)}</span>`:''}${r.items&&r.items.length>1?`<span>${r.items.length} items</span>`:''}${r.amount?`<span>${gbp(r.amount)}</span>`:''}`;pv.classList.add('on')}
inp.addEventListener('input',()=>{autosize();preview()});
inp.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();submit()}});
form.addEventListener('submit',e=>{e.preventDefault();submit()});
function submit(){const v=inp.value;if(!v.trim())return;add(v);inp.value='';autosize();preview()}
if(window.visualViewport){const vv=visualViewport;const f=()=>{const kb=Math.max(0,innerHeight-vv.height-vv.offsetTop);document.documentElement.style.setProperty('--kb',(kb>60?kb:0)+'px')};vv.addEventListener('resize',f);vv.addEventListener('scroll',f)}

/* ---------- voice notes ---------- */
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;const canRec=!!(navigator.mediaDevices?.getUserMedia&&window.MediaRecorder);
if(!canRec&&!SR)$('#mic').hidden=true;
let rec=null;
async function startRec(){if(rec)return;
 if(!canRec){return dictate()}
 let stream;try{stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}})}catch(e){return toast(e.name==='NotAllowedError'?'Microphone permission denied':'No microphone available')}
 const mime=['audio/webm;codecs=opus','audio/mp4','audio/webm','audio/ogg'].find(t=>MediaRecorder.isTypeSupported?.(t))||'';
 const mr=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);const chunks=[];mr.ondataavailable=e=>e.data.size&&chunks.push(e.data);
 const ac=new (window.AudioContext||window.webkitAudioContext)();const src=ac.createMediaStreamSource(stream);const an=ac.createAnalyser();an.fftSize=512;src.connect(an);
 rec={mr,chunks,stream,ac,an,t0:performance.now(),transcript:'',sr:null,raf:0,levels:[]};mr.start(250);
 if(SR){try{const sr=new SR();sr.lang='en-GB';sr.continuous=true;sr.interimResults=true;sr.onresult=e=>{rec&&(rec.transcript=[...e.results].map(r=>r[0].transcript).join(' ').trim(),$('#recText').textContent=rec.transcript)};sr.onerror=()=>{};sr.start();rec.sr=sr}catch{}}
 form.classList.add('recording');$('#recText').textContent=SR?'Listening…':'Recording…';draw();rec.timer=setInterval(()=>{const s=(performance.now()-rec.t0)/1000;$('#recTime').textContent=mmss(s);if(s>300)stopRec(true)},250)}
function draw(){if(!rec)return;const c=$('#wave'),g=c.getContext('2d'),dpr=devicePixelRatio||1;const w=c.clientWidth,h=c.clientHeight;if(c.width!==w*dpr){c.width=w*dpr;c.height=h*dpr}
 const d=new Uint8Array(rec.an.fftSize);rec.an.getByteTimeDomainData(d);let sum=0;for(const v of d)sum+=(v-128)**2;const lvl=Math.min(1,Math.sqrt(sum/d.length)/40);rec.levels.push(lvl);
 const bw=3*dpr,gap=2*dpr,n=Math.floor(c.width/(bw+gap));if(rec.levels.length>n)rec.levels.splice(0,rec.levels.length-n);
 g.clearRect(0,0,c.width,c.height);g.fillStyle=getComputedStyle(c).color;rec.levels.forEach((l,k)=>{const bh=Math.max(2*dpr,l*c.height*.9);const x=c.width-(rec.levels.length-k)*(bw+gap);g.beginPath();g.roundRect?g.roundRect(x,(c.height-bh)/2,bw,bh,bw/2):g.rect(x,(c.height-bh)/2,bw,bh);g.fill()});
 rec.raf=requestAnimationFrame(draw)}
async function stopRec(keep){if(!rec)return;const r=rec;rec=null;cancelAnimationFrame(r.raf);clearInterval(r.timer);form.classList.remove('recording');
 const dur=(performance.now()-r.t0)/1000;try{r.sr?.stop()}catch{}
 const done=new Promise(res=>r.mr.onstop=res);try{r.mr.stop()}catch{}await done;r.stream.getTracks().forEach(t=>t.stop());r.ac.close().catch(()=>{});
 if(!keep)return toast('Recording discarded');if(dur<0.6)return toast('Too short — hold to record');
 const blob=new Blob(r.chunks,{type:r.mr.mimeType||'audio/webm'});const key='a-'+uid();try{await Media.put(key,blob)}catch{return toast('Couldn’t save recording')}
 const text=(r.transcript||inp.value).trim();let it;
 if(text){it=makeItem(text,{voice:{key,dur}});inp.value='';autosize();preview()}else it={id:uid(),text:'Voice note',title:'Voice note · '+new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}),cat:'note',due:null,hasTime:false,amount:null,items:null,created:Date.now(),touched:Date.now(),done:false,doneAt:null,voice:{key,dur}};
 addItems([it])}
function dictate(){const sr=new SR();sr.lang='en-GB';sr.interimResults=true;const base=inp.value.trim();$('#mic').classList.add('rec');
 sr.onresult=e=>{inp.value=(base?base+' ':'')+[...e.results].map(r=>r[0].transcript).join('');autosize();preview()};sr.onend=()=>{$('#mic').classList.remove('rec');inp.focus()};sr.onerror=e=>{if(e.error==='not-allowed')toast('Microphone permission denied')};try{sr.start()}catch{}}
// tap = toggle recording, hold = record while held
let holdT=0,pressAt=0;
$('#mic').addEventListener('pointerdown',e=>{e.preventDefault();pressAt=performance.now();startRec();const up=()=>{removeEventListener('pointerup',up);removeEventListener('pointercancel',up);if(performance.now()-pressAt>450&&rec)stopRec(true)};addEventListener('pointerup',up);addEventListener('pointercancel',up)});
$('#mic').addEventListener('click',e=>e.preventDefault());
$('#recStop').onclick=()=>stopRec(true);$('#recCancel').onclick=()=>stopRec(false);

/* ---------- snap paperwork ---------- */
$('#cam').onclick=()=>$('#snapFile').click();
$('#snapFile').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
 let small;try{small=await downscale(f,1600)}catch{return toast('Couldn’t read that image')}
 const thumb=URL.createObjectURL(small);let cancelled=false;
 openSheet(`<div class="sh-head"><h3>Reading paperwork</h3><button class="ib sm" data-close aria-label="Close">${I('x')}</button></div><img class="photo" src="${thumb}" alt=""><div class="prog"><span id="sProg"></span></div><p class="fine" id="sMsg">Reading text on your device…</p>`,null,()=>{cancelled=true});
 let text='';try{text=await Snap.ocr(small,p=>{const el=$('#sProg');if(el)el.style.width=Math.round(p*100)+'%'})}catch(err){if(!cancelled){const m=$('#sMsg');if(m)m.textContent=err.message}text=''}
 if(cancelled)return;const x=Snap.extract(text);showSnapForm(small,thumb,text,x)};
function showSnapForm(blob,thumb,text,x){let kind=x.kind;
 openSheet(`<div class="sh-head"><h3>From your photo</h3><button class="ib sm" data-close aria-label="Close">${I('x')}</button></div><img class="photo" src="${thumb}" alt="">
<label for="sTitle">Title</label><input class="field" id="sTitle" value="${esc(x.title)}">
<div class="two"><div><label for="sAmt">Amount (£)</label><input class="field" id="sAmt" inputmode="decimal" value="${x.amount!=null?x.amount.toFixed(2):''}"></div><div><label for="sDue">Due date</label><input class="field" type="date" id="sDue" value="${x.due?toLocal(x.due).slice(0,10):''}"></div></div>
<label>Save as</label><div class="chips">${['reminder','money','note'].map(k=>`<button type="button" class="chip c-${k}" data-k="${k}" aria-pressed="${k===kind}">${I(k)}${CATS[k].replace(/s$/,'')}</button>`).join('')}</div>
${text.trim()?`<details class="ocr"><summary>Scanned text</summary><pre>${esc(text.trim())}</pre></details>`:'<p class="fine">No text found — you can still save the photo.</p>'}
<div class="btns stick"><button class="btn" data-close>Cancel</button><button class="btn pri" id="sSave">Save</button></div>`,p=>{
  p.querySelector('.chips').onclick=e=>{const c=e.target.closest('.chip');if(!c)return;kind=c.dataset.k;p.querySelectorAll('.chip').forEach(b=>b.setAttribute('aria-pressed',b===c))};
  p.querySelector('#sSave').onclick=async()=>{const key='p-'+uid();try{await Media.put(key,blob)}catch{return toast('Couldn’t save photo')}
   const title=p.querySelector('#sTitle').value.trim()||'Scanned document',amt=parseFloat(p.querySelector('#sAmt').value.replace(/[£,]/g,'')),dd=p.querySelector('#sDue').value;
   const due=dd?new Date(dd+'T09:00').toISOString():null;
   const it={id:uid(),text:title,title,cat:kind,due:kind==='note'?null:due,hasTime:false,amount:isFinite(amt)?amt:null,items:null,created:Date.now(),touched:Date.now(),done:false,doneAt:null,photo:key,ocr:text.trim().slice(0,4000)};
   closeSheet();URL.revokeObjectURL(thumb);addItems([it])}})}
function downscale(file,max){return new Promise((res,rej)=>{const img=new Image();img.onload=()=>{const s=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(img.src);c.toBlob(b=>b?res(b):rej(),'image/jpeg',.85)};img.onerror=rej;img.src=URL.createObjectURL(file)})}

/* ---------- header ---------- */
function toggleSearch(on){const bar=$('#searchBar');bar.hidden=!on;if(on)$('#search').focus();else{state.q='';$('#search').value='';render()}}
$('#searchBtn').onclick=()=>toggleSearch($('#searchBar').hidden);
$('#search').addEventListener('input',e=>{state.q=e.target.value.trim();render()});
$('#tabs').addEventListener('click',e=>{const b=e.target.closest('.tab');if(!b)return;state.tab=b.dataset.t;if(state.q)toggleSearch(false);else render();
 $('#tabs').querySelector(`[data-t="${state.tab}"]`)?.scrollIntoView({inline:'nearest',block:'nearest'});scrollTo({top:0})});
function applyTheme(t){document.documentElement.dataset.theme=t;document.querySelector('meta[name=theme-color]').content=t==='dark'?'#0c0c0f':'#f5f5f7';$('#themeBtn').innerHTML=I(t==='dark'?'sun':'moon')}
applyTheme(document.documentElement.dataset.theme);
$('#themeBtn').onclick=()=>{const t=document.documentElement.dataset.theme==='dark'?'light':'dark';localStorage.setItem('bd.theme',t);applyTheme(t)};
$('#searchBtn').innerHTML=I('search');$('#menuBtn').innerHTML=I('more');$('#mic').innerHTML=I('mic');$('#cam').innerHTML=I('camera');$('#send').innerHTML=I('up');$('#recStop').innerHTML=I('check');$('#recCancel').innerHTML=I('x');
let deferredInstall=null;addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e});

/* ---------- local reminders (while open) ---------- */
function checkReminders(){const now=Date.now();let changed=false;
 for(const i of state.items){if(!i.due||i.done||i.notified||!i.hasTime)continue;const t=ts(i);if(t>now)continue;i.notified=true;changed=true;if(now-t>12*36e5)continue;
  if(Sync.state.push){toast('⏰ '+i.title);continue}
  if('Notification'in window&&Notification.permission==='granted')navigator.serviceWorker?.ready.then(r=>r.showNotification(i.title,{body:'Brain Dump · '+fmtDue(i.due,true),icon:'icons/icon-192.png',badge:'icons/icon-192.png',tag:i.id,data:{id:i.id},actions:[{action:'snooze',title:'Snooze 1 hour'},{action:'done',title:'Done'}]})).catch(()=>{});
  else toast('⏰ '+i.title)}
 if(changed){try{localStorage.setItem(KEY,JSON.stringify(state.items))}catch{}if(sheet.hidden)render()}}
setInterval(()=>{checkReminders();if(sheet.hidden&&!sw&&!rec&&document.activeElement!==$('#search')&&(!playingBtn||audio.paused))render()},30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){checkReminders();if(sheet.hidden&&!rec)render()}});

/* ---------- deep links from notifications ---------- */
function act(a,id){const i=byId(id);if(!i)return;if(a==='done'){setDone(id,true)}else if(a==='snooze'){i.due=new Date(Date.now()+36e5).toISOString();i.hasTime=true;i.notified=false;touch(i);save();render();toast('Snoozed for 1 hour')}else if(a==='tomorrow'){const d=new Date();d.setDate(d.getDate()+1);d.setHours(9,0,0,0);i.due=d.toISOString();i.hasTime=true;i.notified=false;save();render();toast('Snoozed until tomorrow 09:00')}}
function openFromHash(){const am=location.hash.match(/^#act=(\w+):([\w-]+)/);if(am){history.replaceState(null,'',location.pathname+location.search);act(am[1],am[2]);return}const m=location.hash.match(/^#e=([\w-]+)/);if(!m)return;history.replaceState(null,'',location.pathname+location.search);if(m[1].startsWith('brief-')){state.tab='today';render();return}if(byId(m[1]))openEdit(m[1])}
addEventListener('hashchange',openFromHash);
navigator.serviceWorker?.addEventListener('message',e=>{if(e.data?.act){act(e.data.act,e.data.id);return}if(e.data?.open){if(e.data.open.startsWith('brief-')){closeSheet();state.tab='today';render()}else if(byId(e.data.open))openEdit(e.data.open)}});

/* ---------- service worker ---------- */
if('serviceWorker'in navigator&&location.protocol!=='file:'){const had=!!navigator.serviceWorker.controller;let reloaded=false;
 navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(r=>{r.update().catch(()=>{});setInterval(()=>r.update().catch(()=>{}),36e5)}).catch(()=>{});
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(had&&!reloaded&&sheet.hidden&&!inp.value&&!rec){reloaded=true;location.reload()}})}

/* ---------- boot ---------- */
if(state.items===null){state.items=[];['Remind me to call mum tomorrow at 3pm','milk, eggs, bread and butter','Idea: an app that remembers everything for me','Owe Sam £20 for the cinema','Bins out tonight'].reverse().forEach(t=>state.items.unshift(makeItem(t)));try{localStorage.setItem(KEY,JSON.stringify(state.items))}catch{}}
state.items.forEach(i=>{if(!REAL.includes(i.cat))i.cat='note';i.title=i.title||i.text;i.created=i.created||Date.now()});
// garbage-collect orphaned media
setTimeout(async()=>{try{const used=new Set(state.items.flatMap(i=>[i.voice?.key,i.photo].filter(Boolean)));for(const k of await Media.keys())if(!used.has(k))Media.del(k)}catch{}},8000);
function handleLaunch(){const q=new URLSearchParams(location.search);if(![...q.keys()].length)return;
 const shared=[q.get('share-title'),q.get('share-text'),q.get('share-url')].filter(Boolean);
 history.replaceState(null,'',location.pathname+location.hash);
 if(shared.length){const uniq=[...new Set(shared)];inp.value=uniq.join(' ');autosize();preview();setTimeout(()=>inp.focus(),50);toast('Shared to Brain Dump — tap ↑ to save')}
 if(q.has('add'))setTimeout(()=>inp.focus(),50);if(q.has('voice')&&!$('#mic').hidden)startRec();if(q.has('today')){state.tab='today';render()}}
/* ---------- onboarding ---------- */
function onboard(){if(localStorage.getItem('bd.onboarded'))return;const steps=[
 ['all','Dump anything','Type, speak or snap a photo. One box for every thought — no folders to choose.'],
 ['task','It sorts itself','Tasks, reminders, shopping, ideas, people and money are detected instantly, with dates like “next Friday 3pm”.'],
 ['reminder','Never forget','Swipe right to complete. Turn on notifications and get a morning brief at 8am.']];let k=0;
 const show=()=>openSheet(`<div class="onb"><div class="hero c-${steps[k][0]}">${I(steps[k][0])}</div><h3>${steps[k][1]}</h3><p>${steps[k][2]}</p><div class="dots">${steps.map((_,j)=>`<i class="${j===k?'on':''}"></i>`).join('')}</div>
<div class="btns"><button class="btn" id="oSkip">${k?'Back':'Skip'}</button><button class="btn pri" id="oNext">${k<steps.length-1?'Next':'Get started'}</button></div></div>`,p=>{
  p.querySelector('#oNext').onclick=()=>{if(k<steps.length-1){k++;show()}else{closeSheet()}};p.querySelector('#oSkip').onclick=()=>{if(k){k--;show()}else closeSheet()}},()=>{localStorage.setItem('bd.onboarded','1')});show()}
render();preview();checkReminders();openFromHash();handleLaunch();onboard();if(Sync.state.push||Sync.state.feed)syncServer();
window.__bd={state,render,Sync};
})();
