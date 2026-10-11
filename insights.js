'use strict';
// Local-only intelligence: people/keyword extraction, related entries, loose ends, morning brief, money owed.
globalThis.Insights=(()=>{
const STOP=new Set('the a an and or but to of for in on at by with from this that these those is are was were be been am i me my we our you your it its he she they them his her their what when where who how why will would could should can just about into than then there here have has had do does did not no yes get got make need want also some any all more most very really today tomorrow tonight next last week month year remind reminder call email text buy note idea pay paid owe owes lent borrowed back time morning evening afternoon'.split(' '));
const NOTNAME=new Set('I Monday Tuesday Wednesday Thursday Friday Saturday Sunday January February March April May June July August September October November December Mon Tue Wed Thu Fri Sat Sun Jan Feb Mar Apr Jun Jul Aug Sep Sept Oct Nov Dec Today Tomorrow Tonight Idea Note Remind Reminder Buy Call Email Text Book Pay Owe Lent Get Pick Need Don Remember Fix Renew Cancel Send Check Meeting Dentist Doctor GP MOT Tesco Asda Aldi Lidl Sainsbury Sainsburys Waitrose Netflix Amazon Shopping Business What Maybe The A An Wifi Thai Indian Chinese Italian English British French Spanish Mexican Japanese Christmas Easter Halloween Brain Dump Google Outlook Apple If It We He She They My Our Your His Her Their This That There Here Also Just Still Please Thanks Hi Hello Dear Doctors Mum Dad'.split(' '));
let KNOWN=new Set();
function candidates(it){const t=it.text||'';const out=new Set();let m;
 const re=/\b([A-Z][a-z]{1,15})(?:'s)?\b/g;while((m=re.exec(t))){const w=m[1];if(NOTNAME.has(w))continue;const before=t.slice(0,m.index).trim();
  if(before&&!/[.!?:]$/.test(before))out.add(w);else if(it.cat==='contact')out.add(w)}
 const re2=/\b(?:call|text|ring|email|message|with|owe|owes|lent|tell|ask|meet|see|visit|for|and)\s+([A-Z][a-z]{1,15})\b/gi;while((m=re2.exec(t)))if(/^[A-Z]/.test(m[1])&&!NOTNAME.has(m[1]))out.add(m[1]);
 return out}
function learn(items){const k=new Set();for(const i of items)for(const w of candidates(i))k.add(w);KNOWN=k;return k}
function people(it){const t=it.text||'';const out=new Set(candidates(it));const re=/\b([A-Z][a-z]{1,15})(?:'s)?\b/g;let m;while((m=re.exec(t)))if(KNOWN.has(m[1]))out.add(m[1]);return[...out]}
function keywords(it){return[...new Set((it.text||'').toLowerCase().replace(/[^a-z0-9£' ]/g,' ').split(/\s+/).map(w=>w.replace(/'s$/,'')).filter(w=>w.length>=4&&!STOP.has(w)&&!/^\d+$/.test(w)))]}
function related(item,items,max=5){if(!KNOWN.size)learn(items);const p=new Set(people(item).map(x=>x.toLowerCase())),k=new Set(keywords(item));
 return items.filter(o=>o.id!==item.id).map(o=>{let s=0;for(const x of people(o))if(p.has(x.toLowerCase()))s+=3;for(const x of keywords(o))if(k.has(x))s+=1;return[o,s]}).filter(([,s])=>s>=2).sort((a,b)=>b[1]-a[1]).slice(0,max).map(([o])=>o)}
const DAY=864e5;
function looseEnds(items,now=Date.now()){return items.filter(i=>!i.done&&(i.cat==='task'||i.cat==='idea')&&!i.due&&now-(i.touched||i.created)>14*DAY&&!(i.snoozeUntil>now)).sort((a,b)=>(a.touched||a.created)-(b.touched||b.created))}
function money(items){let owe=0,owed=0;const who={};for(const i of items){if(i.done||i.cat!=='money'||!i.amount)continue;const t=i.text.toLowerCase();
 if(/\b(owes me|lent|paid for .* (him|her|them)|i paid .* for)\b/.test(t)||/\bowes?\b.*\bme\b/.test(t)){owed+=i.amount;const p=people(i)[0];if(p)who[p]=(who[p]||0)+i.amount}
 else if(/\b(i owe|owe|borrowed|pay back|paying back)\b/.test(t)){owe+=i.amount}}return{owe,owed,who}}
function brief(items,now=new Date()){learn(items);const end=new Date(now);end.setHours(23,59,59,999);const n=now.getTime();
 const open=items.filter(i=>!i.done);const overdue=open.filter(i=>i.due&&new Date(i.due)<n&&!(i.hasTime===false&&new Date(i.due).toDateString()===now.toDateString()));
 const today=open.filter(i=>i.due&&new Date(i.due)<=end&&!overdue.includes(i));const loose=looseEnds(items,n);const m=money(items);
 const soon=open.filter(i=>i.due&&new Date(i.due)>n&&new Date(i.due)-n<2*DAY);const linked=[];
 for(const r of soon){for(const p of people(r)){const rel=items.filter(o=>o.id!==r.id&&!o.done&&['contact','note','money','idea'].includes(o.cat)&&people(o).some(x=>x.toLowerCase()===p.toLowerCase()));if(rel.length&&!linked.some(l=>l.person===p))linked.push({person:p,reminder:r,notes:rel.slice(0,3)})}}
 const GBP=v=>'£'+v.toFixed(2).replace(/\.00$/,'');const parts=[];
 if(today.length)parts.push(`${today.length} thing${today.length>1?'s':''} due today`);if(overdue.length)parts.push(`${overdue.length} overdue`);
 if(m.owe)parts.push(`you owe ${GBP(m.owe)}`);if(m.owed)parts.push(`you're owed ${GBP(m.owed)}`);if(loose.length)parts.push(`${loose.length} loose end${loose.length>1?'s':''}`);
 const headline=parts.length?cap(parts.join(', '))+'.':'Nothing pressing. Enjoy your day.';
 const speech=[ (now.getHours()<12?'Good morning':now.getHours()<18?'Good afternoon':'Good evening')+' Duncan.',headline,
   today.length?'Today: '+today.slice(0,5).map(i=>i.title).join('; ')+'.':'',overdue.length?'Still overdue: '+overdue.slice(0,3).map(i=>i.title).join('; ')+'.':'',
   linked.length?linked.map(l=>`Coming up with ${l.person}: ${l.notes.map(n=>n.title).join('; ')}.`).join(' '):''].filter(Boolean).join(' ');
 return{today,overdue,loose,money:m,linked,headline,speech}}
const cap=s=>s?s[0].toUpperCase()+s.slice(1):s;
return{learn,people,keywords,related,looseEnds,money,brief}})();
if(typeof module!=='undefined')module.exports=globalThis.Insights;
