import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,grantReward} from '../src/domain.mjs';
import {CHAPTERS,CHAPTER_ORDER,chapterUnlocked,newChapter,prepareChapter,chapterScene,chooseChapter,advanceChapter,chapterWon,chapterReward} from '../src/chapters.mjs';
test('Главы открываются по порядку и сохраняют решения',()=>{
  const state=initialState();assert.equal(chapterUnlocked(state,'week'),true);
  state.gameRuns=[{phase:'result'}];assert.equal(chapterUnlocked(state,'week'),true);
  for(const kind of CHAPTER_ORDER){
    assert.equal(chapterUnlocked(state,kind),true);
    const run=newChapter(kind,kind,1,'Учить язык');if(run.phase==='setup')prepareChapter(run,kind==='month'?'Читать каждый день':'Больше времени для близких');let previousEnergy=run.resources.energy;
    while(run.phase!=='result'){
      const scene=chapterScene(run);assert.ok(scene.situation);assert.equal(scene.options.length,2);
      chooseChapter(run,0,2);assert.equal(run.resources.energy,Math.min(100,previousEnergy+4));
      assert.throws(()=>chooseChapter(run,0,2));
      previousEnergy=run.resources.energy;advanceChapter(run,3);
    }
    assert.equal(run.history.length,CHAPTERS[kind].nodes.length);
    assert.equal(run.progress,CHAPTERS[kind].nodes.length);
    assert.equal(chapterWon(run),true);
    assert.equal(chapterReward(run),15+CHAPTERS[kind].nodes.length);
    const saved=structuredClone(run);assert.deepEqual(JSON.parse(JSON.stringify(run)),saved);
    state.chapterRuns??=[];state.chapterRuns.push(run);
    assert.equal(grantReward(state,`chapter:${run.id}`,chapterReward(run),'Глава','2026-10-15'),true);
    assert.equal(grantReward(state,`chapter:${run.id}`,chapterReward(run),'Глава','2026-10-15'),false);
  }
});
test('Перегрузка меняет следующую сцену и может сорвать миссию',()=>{
  const run=newChapter('week','w',1);for(let i=0;i<7;i++){chooseChapter(run,1,2);if(i===2)assert.ok(chapterScene(run).situation);advanceChapter(run,3);if(run.phase==='scene'&&i>=2)assert.match(chapterScene(run).situation,/усталость/);}
  assert.equal(run.phase,'result');assert.equal(run.progress,0);assert.equal(chapterWon(run),false);assert.equal(chapterReward(run),17);assert.equal(run.resources.energy,0);
});
