import {test,expect} from '@playwright/test';
let errors;
test.beforeEach(async({page})=>{errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>m.type()==='error'&&!/Failed to load resource/.test(m.text())&&errors.push(m.text()));});
test.afterEach(()=>expect(errors,'console errors').toEqual([]));
async function fresh(page,items,onb=true){await page.goto('./');await page.evaluate(([it,o])=>{localStorage.clear();if(o)localStorage.setItem('bd.onboarded','1');localStorage.setItem('braindump.v1',JSON.stringify(it||[]))},[items,onb]);await page.reload();}
async function dump(page,t){await page.fill('#input',t);await page.keyboard.press('Enter');}
const items=p=>p.locator('#list .item');

test('onboarding tour shows once, steps through, then never again',async({page})=>{await fresh(page,[],false);await expect(page.locator('.onb h3')).toHaveText('Dump anything');
 await page.click('#oNext');await expect(page.locator('.onb h3')).toHaveText('It sorts itself');await page.click('#oSkip');await expect(page.locator('.onb h3')).toHaveText('Dump anything');
 await page.click('#oNext');await page.click('#oNext');await page.click('#oNext');await expect(page.locator('#sheet')).toBeHidden();await page.reload();await expect(page.locator('#sheet')).toBeHidden();});
test('recurring: "every Monday at 9am" rolls forward on complete, with undo',async({page})=>{await fresh(page);await dump(page,'Put the bins out every Monday at 7pm');await page.click('[data-t=all]');
 const it=items(page).first();await expect(it).toContainText('Every Monday');await expect(it.locator('.ttl')).toHaveText('Put the bins out');
 const before=await page.evaluate(()=>__bd.state.items[0].due);expect(new Date(before).getDay()).toBe(1);
 await it.locator('.chk').click();await expect(page.locator('#toast')).toContainText('Next:');const after=await page.evaluate(()=>__bd.state.items[0].due);
 expect(new Date(after)-new Date(before)).toBe(7*864e5);await expect(items(page).first()).not.toHaveClass(/done/);
 await page.locator('#toast button').click();expect(await page.evaluate(()=>__bd.state.items[0].due)).toBe(before);});
test('recurring: "pay rent monthly" gets a due date + editor repeat chips',async({page})=>{await fresh(page);await dump(page,'Pay rent monthly');await page.click('[data-t=all]');
 await expect(items(page).first()).toContainText('Monthly');await items(page).first().locator('.ttl').click();await expect(page.locator('#eRep [data-r=month]')).toHaveAttribute('aria-pressed','true');
 await page.click('#eRep [data-r=""]');await page.click('#eSave');await expect(items(page).first()).not.toContainText('Monthly');});
test('pin/star floats an entry to the top',async({page})=>{await fresh(page);await dump(page,'Call the plumber');await dump(page,'Renew passport');await page.click('[data-t=task]');
 await expect(items(page).first()).toContainText('Renew passport');await items(page).nth(1).locator('.ttl').click();await page.click('#ePin');await page.click('#eSave');
 await expect(items(page).first()).toContainText('Call the plumber');await expect(items(page).first().locator('.pin')).toBeVisible();});
test('Web Share Target: shared text/url lands in the input (not auto-saved)',async({page})=>{await fresh(page);await page.goto('./?share-title=Great%20article&share-text=Read%20later&share-url=https%3A%2F%2Fexample.com%2Fa');
 await expect(page.locator('#input')).toHaveValue('Great article Read later https://example.com/a');expect(page.url()).not.toContain('share-');await page.click('#send');await page.click('[data-t=all]');await expect(items(page)).toHaveCount(1);});
test('home-screen shortcuts + share_target declared in manifest',async({page,request,baseURL})=>{const m=await (await request.get(baseURL+'manifest.webmanifest')).json();
 expect(m.share_target.params.text).toBe('share-text');expect(m.shortcuts.map(s=>s.short_name||s.name)).toEqual(['Add','Voice','Today']);
 await fresh(page);await page.goto('./?add=1');await expect(page.locator('#input')).toBeFocused();});
test('notification actions: snooze and done deep links',async({page})=>{await fresh(page);await dump(page,'Dentist today at 9am');const id=await page.evaluate(()=>__bd.state.items[0].id);
 await page.evaluate(id=>location.hash='#act=snooze:'+id,id);await expect(page.locator('#toast')).toContainText('Snoozed for 1 hour');const due=await page.evaluate(()=>__bd.state.items[0].due);expect(Math.abs(new Date(due)-Date.now()-36e5)).toBeLessThan(6e4);
 await page.evaluate(id=>location.hash='#act=done:'+id,id);await expect.poll(()=>page.evaluate(()=>__bd.state.items[0].done)).toBe(true);});
