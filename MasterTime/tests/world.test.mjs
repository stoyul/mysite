import test from 'node:test';
import assert from 'node:assert/strict';
import scenarios from '../data/game-scenarios.mjs';
import {newExperiment,currentScene,applyChoice,timeTotal,DEFAULT_SCHEDULE,scheduleToAllocation} from '../src/game.mjs';
import {initialState} from '../src/domain.mjs';
import {reportView} from '../src/report-view.mjs';
test('все восемь отдельных испытаний доступны и сохраняют 1440 минут для каждого выбора',()=>{
  for(const scene of scenarios)for(let index=0;index<scene.choices.length;index++){
    const run=newExperiment(scene.id,'trial',1);
    assert.equal(currentScene(run).id,scene.id);
    applyChoice(run,scene.id,index,2);
    assert.equal(timeTotal(run),1440);
    assert.equal(run.history.at(-1).choice,scene.choices[index].label);
    assert.equal(run.history.at(-1).cost,scene.choices[index].cost);
    assert.throws(()=>applyChoice(run,scene.id,index,3),/Сначала|Решение/);
  }
  assert.throws(()=>newExperiment('injected','invalid',1),/Неизвестное испытание/);
});
test('реальный сон допускает точные минуты, остальные занятия сохраняют шаг 15 минут',()=>{
  const schedule={...DEFAULT_SCHEDULE,sleep:440};
  assert.equal(scheduleToAllocation(schedule).allocation.sleep,440);
  assert.throws(()=>scheduleToAllocation({...schedule,work:481}),/шагом 15/);
});
test('отчет показывает завершенный день при активном незавершенном и сохраняет открытия эксперимента',()=>{
  const state=initialState(),run=newExperiment('source-0','experiment',1);applyChoice(run,'source-0',1,2);run.reflection='<Мое открытие>';
  state.experimentRuns=[run];const report=reportView(state,'2026-10-18');
  assert.match(report,/Отдельное испытание/);assert.match(report,/&lt;Мое открытие&gt;/);assert.match(report,/Аудит реальной недели/);
  assert.deepEqual(state.rewards,[],'эксперимент не начисляет награды календарю');
});
