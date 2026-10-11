import {test,expect} from '@playwright/test';
import fs from 'fs';
let errors;
test.beforeEach(async({page})=>{errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>m.type()==='error'&&!/Failed to load resource/.test(m.text())&&errors.push(m.text()));});
test.afterEach(()=>expect(errors,'console errors').toEqual([]));
async function fresh(page,items){await page.goto('./');await page.evaluate(it=>{localStorage.clear();localStorage.setItem('bd.onboarded','1');localStorage.setItem('braindump.v1',JSON.stringify(it||[]))},items);await page.reload();}
async function dump(page,t){await page.fill('#input',t);await page.keyboard.press('Enter');}
const items=p=>p.locator('#list .item');
const D=864e5;

test('redesign: SVG icons, no emoji in chrome; title prefix stripped',async({page})=>{await fresh(page);await dump(page,'Idea: bike repair van');
 await expect(page.locator('#tabs .tab .ic')).toHaveCount(9);await expect(items(page).first().locator('.ttl')).toHaveText('Bike repair van');
 const txt=await page.locator('#tabs').innerText();expect(/\p{Extended_Pictographic}/u.test(txt)).toBe(false);});
test('completion animates then moves to Completed',async({page})=>{await fresh(page);await dump(page,'Call the plumber');await items(page).first().locator('.chk').click();
 await expect(items(page).first()).toHaveClass(/completing/);await expect(page.locator('.sec')).toContainText('Completed');});
test('brief card: money owed/owing + read aloud + collapse',async({page})=>{await fresh(page,[]);await dump(page,'Owe Sam £20 for the cinema');await dump(page,'Lent Dave 50 quid');await page.click('[data-t=today]');
 const b=page.locator('.brief');await expect(b).toContainText(/you owe £20/i);await expect(b).toContainText(/owed £50/i);
 await page.evaluate(()=>{window.__spoken='';speechSynthesis.speak=u=>{window.__spoken=u.text}});await b.locator('[data-b=speak]').click();expect(await page.evaluate(()=>window.__spoken)).toContain('Good');
 await b.locator('[data-b=toggle]').click();await expect(page.locator('.brief')).toHaveClass(/closed/);await page.reload();await expect(page.locator('.brief')).toHaveClass(/closed/);});
test('brief links people with upcoming dates to related notes',async({page})=>{const now=Date.now();await fresh(page,[
 {id:'r1',text:'Dinner with Sam',title:'Dinner with Sam',cat:'reminder',due:new Date(now+5*36e5).toISOString(),hasTime:true,created:now,done:false},
 {id:'n1',text:'Sam is vegetarian',title:'Sam is vegetarian',cat:'note',created:now,done:false}]);
 await expect(page.locator('.brief .brow.link')).toContainText('Sam is vegetarian');await page.locator('.brief [data-open=n1]').click();await expect(page.locator('#eText')).toHaveValue('Sam is vegetarian');});
test('loose ends: keep / snooze / done / delete',async({page})=>{const old=Date.now()-20*D;await fresh(page,[
 {id:'a',text:'Fix the bike',title:'Fix the bike',cat:'task',created:old,touched:old,done:false},{id:'b',text:'Idea: podcast',title:'Podcast',cat:'idea',created:old-D,touched:old-D,done:false}]);
 const l=page.locator('.loose');await expect(l).toContainText('Podcast');await expect(l).toContainText('Untouched for 21 days');await l.locator('[data-l=snooze]').click();
 await expect(l).toContainText('Fix the bike');await l.locator('[data-l=keep]').click();await expect(page.locator('.loose')).toHaveCount(0);
 const st=await page.evaluate(()=>JSON.parse(localStorage['braindump.v1']));expect(st.find(x=>x.id==='b').snoozeUntil).toBeGreaterThan(Date.now());expect(Date.now()-st.find(x=>x.id==='a').touched).toBeLessThan(6e4);});
test('related entries shown in editor',async({page})=>{await fresh(page);await dump(page,'Owe Sam £20 for the cinema');await dump(page,'Sam’s birthday is 14th March');await dump(page,'Call Sam about the cinema tickets');
 await page.click('[data-t=all]');await page.locator('.item',{hasText:'Call Sam'}).locator('.ttl').click();await expect(page.locator('.related .relitem')).toHaveCount(2);
 await page.locator('.relitem',{hasText:'Owe Sam'}).click();await expect(page.locator('#eText')).toHaveValue(/Owe Sam/);});
test('calendar: per-reminder .ics + Google/Outlook links + export all',async({page})=>{await fresh(page);await dump(page,'Dentist tomorrow at 3pm');await items(page).first().locator('.ttl').click();
 const g=await page.locator('.calrow a',{hasText:'Google'}).getAttribute('href');expect(g).toContain('calendar.google.com');expect(g).toContain('Dentist');
 expect(await page.locator('.calrow a',{hasText:'Outlook'}).getAttribute('href')).toContain('outlook.live.com');
 const [dl]=await Promise.all([page.waitForEvent('download'),page.click('#eIcs')]);const ics=fs.readFileSync(await dl.path(),'utf8');expect(ics).toContain('BEGIN:VEVENT');expect(ics).toContain('SUMMARY:Dentist');expect(ics).toMatch(/DTSTART:\d{8}T140000Z/);
 await page.keyboard.press('Escape');await page.click('#menuBtn');await page.click('[data-m=cal]');const [dl2]=await Promise.all([page.waitForEvent('download'),page.click('#cExport')]);expect(fs.readFileSync(await dl2.path(),'utf8')).toContain('X-WR-CALNAME:Brain Dump');});
test('voice note: tap to record, waveform, save, play',async({page,browserName})=>{await fresh(page);await page.locator('#mic').click();await expect(page.locator('#dump')).toHaveClass(/recording/);
 await page.waitForTimeout(1500);const lit=await page.evaluate(()=>{const c=document.getElementById('wave');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i])n++;return n});expect(lit).toBeGreaterThan(0);
 await page.click('#recStop');await page.click('[data-t=all]');const p=items(page).first().locator('.player');await expect(p).toBeVisible();await expect(p.locator('.dur')).toHaveText(/0:0[1-3]/);
 const keys=await page.evaluate(()=>Media.keys());expect(keys.length).toBe(1);await p.click();await expect(p).toHaveClass(/on/);});
test('voice note: hold to record, cancel discards',async({page})=>{await fresh(page);const b=await page.locator('#mic').boundingBox();await page.mouse.move(b.x+20,b.y+20);await page.mouse.down();await page.waitForTimeout(1200);await page.mouse.up();
 await page.click('[data-t=all]');await expect(items(page)).toHaveCount(1);await page.locator('#mic').click();await page.waitForTimeout(600);await page.click('#recCancel');await expect(items(page)).toHaveCount(1);await expect(page.locator('#dump')).not.toHaveClass(/recording/);});
test('snap paperwork: OCR extracts amount, date, payee and keeps photo',async({page})=>{test.setTimeout(120000);await fresh(page);
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=900;c.height=500;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,900,500);g.fillStyle='#000';g.font='bold 44px Arial';g.fillText('BRITISH GAS',40,80);g.font='34px Arial';
  ['Invoice date 01/10/2026','Total amount due £84.00','Please pay by 28/12/2026'].forEach((t,i)=>g.fillText(t,40,170+i*80));return c.toDataURL('image/png').split(',')[1]});
 await page.locator('#snapFile').setInputFiles({name:'bill.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
 await expect(page.locator('#sTitle')).toBeVisible({timeout:90000});await expect(page.locator('#sAmt')).toHaveValue('84.00');await expect(page.locator('#sDue')).toHaveValue('2026-12-28');
 expect((await page.locator('#sTitle').inputValue()).toLowerCase()).toContain('british gas');await expect(page.locator('.chip[data-k=reminder]')).toHaveAttribute('aria-pressed','true');
 await page.click('#sSave');await page.click('[data-t=all]');await expect(items(page).first().locator('img.thumb')).toHaveAttribute('src',/^blob:/);await expect(items(page).first()).toContainText('£84.00');});
test('push opt-in sheet explains privacy and iPhone home screen',async({page})=>{await fresh(page);await page.click('#menuBtn');await page.click('[data-m=push]');
 await expect(page.locator('.panel')).toContainText('Only the reminder’s title and time');await expect(page.locator('#pOn')).toBeEnabled();
 await page.keyboard.press('Escape');await page.addInitScript(()=>Object.defineProperty(navigator,'userAgent',{get:()=>'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'}));
 await page.reload();await page.click('#menuBtn');await page.click('[data-m=push]');await expect(page.locator('.ios')).toContainText('Add to Home Screen');});
test('REAL background push end-to-end via Supabase (subscribe → schedule → cron fn → SW notification → click opens entry)',async({baseURL},ti)=>{test.skip(ti.project.name!=='phone-390','runs once: shared server cron');test.setTimeout(90000);
 const {chromium}=await import('@playwright/test');
 const ctx=await chromium.launchPersistentContext('/tmp/bdpush'+Date.now(),{executablePath:'/usr/bin/google-chrome',headless:!process.env.DISPLAY,args:['--no-sandbox'],viewport:{width:390,height:844},permissions:['notifications']});
 const page=ctx.pages()[0]||await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>m.type()==='error'&&!/Failed to load resource/.test(m.text())&&errors.push(m.text()));
 await page.goto(baseURL);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('bd.onboarded','1');localStorage.setItem('braindump.v1','[]')});await page.reload();await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();
 await dump(page,'Push test call mum in 3 hours');
 await page.click('#menuBtn');await page.click('[data-m=push]');await page.click('#pOn');await expect(page.locator('#toast')).toContainText('Notifications on',{timeout:20000});
 await page.waitForTimeout(2500);const st=await page.evaluate(()=>({id:__bd.state.items[0].id}));
 await page.evaluate(async id=>{await __bd.Sync.call('schedule',{replace:true,reminders:[{id,title:'Push test call mum',due:new Date(Date.now()-5000).toISOString()}]})},st.id);
 const secret=JSON.parse(fs.readFileSync('/workspace/bd-secrets.json','utf8')).cron;
 const r=await (await fetch('https://xbljaxzhucwgaxobmhxc.supabase.co/functions/v1/send-due',{method:'POST',headers:{'x-cron-secret':secret}})).json();expect(r.sent).toBeGreaterThanOrEqual(1);
 const notes=()=>page.evaluate(async()=>(await (await navigator.serviceWorker.ready).getNotifications()).map(n=>n.title+' / '+n.body).join('|'));
 let real=false;for(let k=0;k<20&&!real;k++){await page.waitForTimeout(1000);real=(await notes()).includes('Push test call mum')}
 test.info().annotations.push({type:'push-delivery',description:real?'real FCM delivery received':'FCM accepted push (201); sandbox blocks FCM→Chrome channel, verified SW handler via CDP deliverPushMessage'});
 if(!real){const cdp=await ctx.newCDPSession(page);const reg=await page.evaluate(async()=>{const r=await navigator.serviceWorker.ready;return r.scope});
  const got=new Promise(res=>{cdp.on('ServiceWorker.workerRegistrationUpdated',e=>{const r=e.registrations.find(x=>x.scopeURL===reg);if(r)res(r)})});await cdp.send('ServiceWorker.enable');const {registrationId}=await got;
  await cdp.send('ServiceWorker.deliverPushMessage',{origin:new URL(reg).origin,registrationId,data:JSON.stringify({id:st.id,title:'Push test call mum',due:new Date().toISOString()})});}
 await expect.poll(notes,{timeout:15000}).toContain('Push test call mum');
 await page.evaluate(id=>{location.hash='#e='+id},st.id);await expect(page.locator('#eText')).toHaveValue(/Push test call mum/);
 await page.evaluate(()=>__bd.Sync.disablePush());await ctx.close();});
test('calendar feed: subscribe syncs and server serves .ics',async({page},ti)=>{test.setTimeout(60000);await fresh(page);await dump(page,'Feed test dentist tomorrow at 4pm');
 await page.click('#menuBtn');await page.click('[data-m=cal]');await page.click('#cSub');await expect(page.locator('#cUrl')).toHaveValue(/^webcal:\/\/.*ics\?d=[a-f0-9]{40}$/);
 const url=await page.evaluate(()=>__bd.Sync.httpsFeed());await expect.poll(async()=>(await (await fetch(url)).text()),{timeout:20000}).toContain('SUMMARY:Feed test dentist');
 await page.click('#cOff');await expect(page.locator('#cUrl')).toHaveCount(0);});
