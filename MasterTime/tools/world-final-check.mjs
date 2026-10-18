import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {initialState} from '../src/domain.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.MASTER_TIME_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),context=await browser.newContext(),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));const base=process.env.MASTER_TIME_BASE||'http://127.0.0.1:4174/',widths=[320,375,390,430,768,1440],snaps=JSON.parse(await readFile('preview/full/snapshots.json','utf8')),cards=JSON.parse(await readFile('data/cards.json','utf8'));
const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
async function fit(label){await settle();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+' document overflow');const bad=await page.evaluate(()=>[...document.querySelectorAll('#content h1,#content h2,#content button,#content select,#content input:not([type=hidden]),#content textarea,dialog[open] input,dialog[open] select,dialog[open] textarea,dialog[open] button,.world-menu[open] nav')].filter(el=>el.getClientRects().length).map(el=>({el,r:el.getBoundingClientRect()})).filter(({r})=>r.width&&(r.left< -1||r.right>innerWidth+1)).map(({el})=>el.outerHTML.slice(0,130)));assert.deepEqual(bad,[],label);}
async function restore(s,width){await page.setViewportSize({width,height:900});await page.goto(base+'#game');await page.evaluate(state=>localStorage.setItem('master-time:v1',JSON.stringify(state)),s.state||initialState());await page.goto(base+'#'+s.route);await page.reload();await page.locator('#content h1').first().waitFor();if(s.selected)await page.locator(s.selected).click();}
let checks=0;
try{
 for(const s of snaps){if(s.name==='rhythm-day')s.selected='[data-schedule-category="social"]';if(s.name==='author-practice')s.selected=`[data-action=card][data-id="${cards[0].id}"]`;if(s.name==='home'&&!s.state)s.state=initialState();}
 if(!process.argv.includes('--controls-only')){
 const targets=snaps.filter(s=>s.name.startsWith('month-')||['rhythm-day','author-practice'].includes(s.name));
 for(const s of targets)for(const width of widths){await restore(s,width);await page.locator('#content details>summary').evaluateAll(nodes=>nodes.forEach(n=>n.parentElement.open=true));await fit(s.name+' '+width);checks++;if(s.shot&&(width===390||width===1440))await page.screenshot({path:`preview/full/${s.name}-${width}.png`,fullPage:s.name!=='author-practice',animations:'disabled'});}
 const longest=[...cards].sort((a,b)=>(b.description.length+b.practice.length)-(a.description.length+a.practice.length)).slice(0,3),catalog=snaps.find(s=>s.name==='catalog');
 for(const card of longest)for(const width of widths){await restore(catalog,width);await page.locator(`[data-action=card][data-id="${card.id}"]`).click();await fit('long author '+card.id+' '+width);checks++;}
 }
 const day=snaps.find(s=>s.name==='real-day');
 for(const width of widths){await restore(day,width);await page.locator('[data-action=add]').click();await fit('task editor '+width);checks++;if(width===390)await page.screenshot({path:'preview/full/task-editor-390.png',animations:'disabled'});await page.locator('#cancel-edit').click();await page.locator('.world-menu summary').click();await fit('menu '+width);checks++;}
 const week=snaps.find(s=>s.name==='week-scene-1');for(const width of widths){await restore(week,width);await page.locator('[data-chapter-inspect]').first().click();await fit('history dialog '+width);checks++;await page.locator('#scene-review button').click();}
 // Stable final print; the first and last page will be rendered and reviewed separately.
 await restore(snaps.find(s=>s.name==='report'),1440);await page.evaluate(()=>document.fonts.ready);await page.pdf({path:'preview/full/Книга-решений-проверка.pdf',format:'A4',printBackground:true});
 // Direct-file support remains functional after extending the explicit module graph.
 await page.goto(new URL('../index.html',import.meta.url).href+'#game');await page.locator('.observatory-clock').waitFor();await page.setViewportSize({width:320,height:740});await fit('file:// 320');checks++;
 const tg=await browser.newContext();await tg.addInitScript(()=>{window.Telegram={WebApp:{platform:'ios',ready(){},expand(){},openLink(url){window.__printLink=url;},BackButton:{onClick(){},show(){},hide(){}}}};});const tp=await tg.newPage();await tp.goto(base+'#report');assert.match(await tp.locator('[data-action=print-report]').textContent(),/Открыть для печати/);await tp.locator('[data-action=print-report]').click();assert.match(await tp.evaluate(()=>window.__printLink),/#report$/);await tg.close();checks++;
 assert.deepEqual(errors,[]);await writeFile('preview/full/snapshots.json',JSON.stringify(snaps));await writeFile('preview/full/final-targeted-checks.json',JSON.stringify({pass:true,checks,widths,scope:process.argv.includes('--controls-only')?'dialogs, menu, file, Telegram print bridge':'content and controls',errors},null,2));console.log('PASS: '+checks+' targeted '+(process.argv.includes('--controls-only')?'control':'content and control')+' checks; final PDF regenerated.');
}catch(e){await page.screenshot({path:'preview/full/final-failure.png',fullPage:true});console.error(page.url());throw e;}finally{await browser.close();}
