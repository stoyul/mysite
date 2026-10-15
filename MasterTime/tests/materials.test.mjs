import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('74 исходные карточки; номера 2–75; устойчивые уникальные идентификаторы и происхождение',async()=>{
  const cards=JSON.parse(await readFile(new URL('../data/cards.json',import.meta.url),'utf8'));
  assert.equal(cards.length,74);assert.equal(new Set(cards.map(c=>c.id)).size,74);
  assert.deepEqual(cards.map(c=>c.number),Array.from({length:74},(_,i)=>i+2));
  for(const c of cards){assert.ok(c.description);assert.ok(c.practice);assert.equal(c.source.row,c.number);assert.equal(c.title,c.description.split('\n')[0].trim());assert.ok(!('situation' in c)&&!('action' in c)&&!('original' in c));}
});
