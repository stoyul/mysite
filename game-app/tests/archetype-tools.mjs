import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';
const root=new URL('../dist/',import.meta.url),html=fs.readFileSync(new URL('index.html',root),'utf8');
async function setup(saved){const dom=new JSDOM(html,{url:'https://game.test/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;w.matchMedia=()=>({matches:true});w.fetch=async p=>({ok:true,json:async()=>p==='/api/me'?{signedIn:false,profile:null}:JSON.parse(fs.readFileSync(new URL(p.slice(2),root)))});if(saved)w.localStorage.setItem('tochka-sily-game-v2',saved);const context=dom.getInternalVMContext(),run=s=>vm.runInContext(s,context);for(const script of w.document.querySelectorAll('script[src]'))run(fs.readFileSync(new URL(script.getAttribute('src').slice(2),root),'utf8'));await new Promise(r=>setTimeout(r,40));run('ge("journey-cinema").hidden=true');return {dom,w,run}}
let t=await setup();t.run('game.originalRequest="Исходный запрос";game.request="Мой актуальный запрос";game.energy=9;game.stage="intro";renderGame()');
assert(t.w.document.getElementById('journey-tools-next'));assert(!t.w.document.querySelector('[data-tool]'));
t.w.document.getElementById('journey-tools-next').click();assert.equal(t.w.document.querySelectorAll('[data-tool]').length,4);assert(t.w.document.querySelector('[data-tool=archetype]'));assert(t.w.document.querySelector('[data-tool=view]'));const saved=t.w.localStorage.getItem('tochka-sily-game-v2');t.dom.window.close();t=await setup(saved);assert(t.w.document.getElementById('journey-begin'),'tools screen restores after reload');t.w.document.getElementById('journey-begin').click();assert.equal(t.run('game.stage'),'board');
const oldRoutes=JSON.parse(fs.readFileSync(new URL('../docs/routes-before-redesign.json',import.meta.url)));
let replaced=0;
for(let level=0;level<5;level++){
 t.run(`game.level=${level};game.position=0;boardLevelRendered=-1;renderGame()`);
 const cells=JSON.parse(t.run('JSON.stringify(routeCells())'));
 assert.deepEqual(cells.map(c=>c.type),oldRoutes[level].cells.map(c=>c.type==='blank'?'archetype':c.type));
 assert.equal(t.w.document.querySelectorAll('.cell-number,.cell-symbol').length,0);assert.equal(t.w.document.querySelectorAll('.circle-cells text').length,0);
 assert(!t.w.document.getElementById('board-note').textContent.includes('Клетка'));
 for(const c of cells.filter(c=>c.type==='archetype')){
  replaced++;t.run(`game.position=${c.index};handleCell()`);
  assert.equal(t.run('game.openedCards.at(-1).deck'),'Богини / Архетипы силы');
  if(replaced===1){assert.equal(t.w.document.getElementById('modal-title').textContent,'АРХЕТИП СИЛЫ');assert.equal(t.w.document.querySelector('#modal-buttons button').textContent,'ОТКРЫТЬ АРХЕТИП');const pending=t.w.localStorage.getItem('tochka-sily-game-v2');const count=t.run('game.openedCards.length');t.dom.window.close();t=await setup(pending);await new Promise(r=>setTimeout(r,600));assert.equal(t.run('game.openedCards.length'),count,'reload introduction never draws a new card');assert.equal(t.w.document.querySelector('#modal-buttons button').textContent,'ОТКРЫТЬ АРХЕТИП');t.w.document.querySelector('#modal-buttons button').click()}
  const page=t.w.document.querySelector('.archetype-page');assert(page);assert.equal(page.firstElementChild.tagName,'IMG');assert.equal(page.lastElementChild.querySelector('h3').textContent,t.run('activeCard.title'));assert.equal(page.firstElementChild.getAttribute('src'),t.run('activeCard.image'));
  assert.match(t.w.document.querySelector('.card-request').textContent,/Мой актуальный запрос/);assert(t.w.document.querySelector('.card-guidance').textContent.includes(t.run('archetypeQuestion()')));
  assert(t.w.document.getElementById('card-how'));assert.equal(t.run('game.energy'),9);assert.equal(t.run('crystalBalance()'),0);t.run('closeModal()');
 }
 t.run(`game.stage=${JSON.stringify(['intro','intro2','intro3','intro4','intro5'][level])};game.levelEntry={level:${level},view:'tools'};renderGame()`);
 const displayed=Array.from(t.w.document.querySelectorAll('[data-tool]'),x=>x.dataset.tool);assert.deepEqual(displayed,Array.from(t.run('toolsForLevel(game.level).map(x=>x.type)')));assert(displayed.includes('event')&&displayed.includes('archetype'));assert(!displayed.includes('leak'));if(level===4)assert.match(t.w.document.querySelector('.level-special-tools').textContent,/КОЛЕСО БАЛАНСА/);t.w.document.getElementById('journey-begin').click();
}
assert.equal(replaced,13);t.run('showDrawnCard(activeCard)');t.w.document.getElementById('card-how').click();assert.match(t.w.document.getElementById('modal-content').textContent,/Твоя задача/);t.w.document.querySelector('#modal-buttons button').click();assert(t.w.document.querySelector('.archetype-page'));t.dom.window.close();
console.log('PASS archetype/tools: 13 exact replacements, five stage questions, first/repeat/help, image-title-full text, current query, no automatic rewards, no visible numbers, actual tools, persisted two-step entry');
