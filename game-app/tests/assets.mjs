import fs from 'node:fs';
import assert from 'node:assert/strict';
const visuals=JSON.parse(fs.readFileSync('dist/cell-visuals.json')).types;
const mapping=JSON.parse(fs.readFileSync('docs/cell-image-map.json'));
const routes=JSON.parse(fs.readFileSync('docs/routes-before-redesign.json'));
const gifts=JSON.parse(fs.readFileSync('dist/economy-config.json')).gifts;
const prompts=JSON.parse(fs.readFileSync('docs/image-prompts.json'));
assert.equal(Object.values(visuals).filter(v=>!v.base).length,18);
assert.equal(new Set(Object.values(visuals).map(v=>v.file)).size,18);
assert.equal(gifts.length,8);assert.equal(new Set(gifts.map(g=>g.image)).size,8);
assert.equal(prompts.length,26);assert.equal(new Set(prompts.map(p=>p.file)).size,26);
assert.equal(mapping.length,104);assert.equal(new Set(mapping.map(c=>c.id)).size,104);
for(const [level,route] of routes.entries())for(const [index,cell] of route.cells.entries()){
 const type=cell.type==='blank'?'archetype':cell.type;
 const entry=mapping.find(c=>c.level===level+1&&c.index===index);
 assert.equal(entry.type,type);assert.equal(entry.image,visuals[type].file);
}
for(const file of [...Object.values(visuals).map(v=>v.file),...gifts.map(g=>g.image)]){
 const path='dist/'+file.slice(2);assert(fs.existsSync(path),path);
 assert.equal(fs.readFileSync(path).subarray(8,12).toString(),'WEBP');
 assert(prompts.some(p=>p.file===file&&p.prompt.length>200),file+' prompt');
}
console.log('PASS assets: 18 distinct cell images, 8 gift images, all 104 route IDs, WebP files and exact prompts');
