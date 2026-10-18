import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_SCHEDULE,quickAudit,scheduleToAllocation,newRun,advance,startDay,chooseWishes,dayInsight,timeTotal} from '../src/game.mjs';
import {newChapter,prepareChapter,chapterScene,chooseChapter,advanceChapter,chapterWon,chapterInsight} from '../src/chapters.mjs';
import {initialState} from '../src/domain.mjs';
import {reportView} from '../src/report-view.mjs';

test('короткий аудит переносит ровно 15 минут и не меняет исходный распорядок',()=>{
  const original=structuredClone(DEFAULT_SCHEDULE),claim=quickAudit(original,'social');
  assert.deepEqual(original,DEFAULT_SCHEDULE);assert.equal(claim.claimed,15);
  assert.equal(claim.schedule.social,original.social-15);assert.equal(claim.schedule.personal,original.personal+15);
  const {allocation,detail}=scheduleToAllocation(claim.schedule),run=newRun('fresh',1);run.experienceVersion=3;advance(run,2);startDay(run,allocation,null,detail);chooseWishes(run,['Читать'],'Читать');
  assert.equal(timeTotal(run),1440);assert.equal(run.allocation.wishes,15);assert.equal(run.resources.crystals,5);
  assert.throws(()=>quickAudit(original,'other'),/нет 15 минут/);
  assert.equal(quickAudit(original,'none').claimed,0);
});

test('новый год проходит четыре поворота и сохраняет историю всех 12 месяцев',()=>{
  const run=newChapter('year','year-new',1);run.experienceVersion=3;prepareChapter(run,'Время с близкими');
  for(let quarter=0;quarter<4;quarter++){
    const scene=chapterScene(run);assert.equal(scene.options.length,3);
    chooseChapter(run,0,quarter+2);assert.equal(run.history.length,(quarter+1)*3);
    advanceChapter(run,quarter+3);
  }
  assert.equal(run.phase,'result');assert.equal(run.progress,12);assert.equal(run.rest,4);assert.equal(chapterWon(run),true);
  assert.deepEqual(run.history.map(h=>h.label),['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']);
  assert.match(chapterInsight(run),/Время с близкими/);
  assert.deepEqual(JSON.parse(JSON.stringify(run)),run);
});

test('компромиссная стратегия оставляет шаги, но не выдает отдых',()=>{
  const run=newChapter('year','year-middle',1);run.experienceVersion=3;prepareChapter(run,'Учиться');
  for(let i=0;i<4;i++){chooseChapter(run,2,i);advanceChapter(run,i+1);}
  assert.equal(run.progress,8);assert.equal(run.rest,0);assert.equal(chapterWon(run),false);
  assert.equal(run.history.filter(h=>h.progress).length,8);
});

test('личный вывод и печатный итог используют сохраненные ответы без диагноза',()=>{
  const state=initialState(),run=newRun('day-new',1);run.experienceVersion=3;run.auditSource='social';run.auditClaimed=15;
  const {allocation,detail}=scheduleToAllocation(quickAudit(DEFAULT_SCHEDULE,'social').schedule);
  advance(run,2);startDay(run,allocation,null,detail);chooseWishes(run,['Читать'],'Читать');
  run.practice={note:'Мне мешает лента',action:'Читать вечером',minutes:15};
  assert.match(dayInsight(run).source,/социальных сетей/);
  assert.match(dayInsight(run).next,/Читать вечером/);
  run.phase='result';state.gameRuns=[run];state.activeRun=run.id;
  const html=reportView(state);assert.match(html,/Мне мешает лента/);assert.match(html,/Аудит реального дня/);assert.match(html,/Печать \/ сохранить PDF/);
});
