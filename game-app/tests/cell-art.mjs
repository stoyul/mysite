import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';
const root=new URL('../dist/',import.meta.url),html=fs.readFileSync(new URL('index.html',root),'utf8');
const dom=new JSDOM(html,{url:'https://game.test/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;w.matchMedia=()=>({matches:true});w.fetch=async p=>({ok:true,json:async()=>p==='/api/me'?{signedIn:false,profile:null}:JSON.parse(fs.readFileSync(new URL(p.slice(2),root)))});const ctx=dom.getInternalVMContext(),run=s=>vm.runInContext(s,ctx);for(const script of w.document.querySelectorAll('script[src^="./"]'))run(fs.readFileSync(new URL(script.getAttribute('src').slice(2),root),'utf8'));await new Promise(r=>setTimeout(r,50));
const visuals=JSON.parse(fs.readFileSync(new URL('cell-visuals.json',root))).types;
assert.notEqual(visuals.portal.accent,visuals.ocean.accent);assert.notEqual(visuals.ocean.accent,visuals.energy.accent);assert.notEqual(visuals.energy.accent,visuals.need.accent);
for(let level=0;level<5;level++){
 run(`game.originalRequest='Запрос';game.level=${level};game.stage='board';boardLevelRendered=-1;renderGame()`);
 const cells=Array.from(w.document.querySelectorAll('.circle-cells .cell-hit'));
 assert.equal(cells.length,run('routeCells().length'));assert.equal(w.document.querySelectorAll('.circle-cells text').length,0);
 const delays=[];
 for(const cell of cells){const image=cell.querySelector('image'),mask=cell.querySelector('.cell-art-mask'),motion=cell.querySelector('.cell-art-motion');assert(image&&mask&&motion);assert.equal(mask.getAttribute('clip-path'),`url(#clip-${cell.dataset.id})`);const size=Number(image.getAttribute('width'));assert(size>=80&&size<=145);assert.equal(Number(image.getAttribute('height')),size);assert.equal(image.getAttribute('preserveAspectRatio'),'xMidYMid meet');assert.equal(image.getAttribute('href'),visuals[cell.dataset.type].file);assert.equal(cell.lastElementChild.classList.contains('cell-outline'),true);if(motion.classList.contains('periodic'))delays.push(motion.style.getPropertyValue('--cell-delay'))}
 assert.equal(new Set(delays).size,delays.length,'independent idle phases');assert(delays.length<cells.length,'not every cell animates');
}
assert.match(fs.readFileSync(new URL('circle-board.css',root),'utf8'),/prefers-reduced-motion:reduce/);dom.window.close();console.log('PASS fantasy cells: all route IDs, masked independent art layer, per-symbol canvas with breathing room, distinct accents, outline above artwork, staggered periodic motion, no visible numbers');
