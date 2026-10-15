import test from 'node:test';
import assert from 'node:assert/strict';
import {shiftDate,shiftMonth,monthDates,clockMinutes,zonedInstant,mergeIntervals,dayStats,habitProgress,percent,initialState,grantReward,crystals,mastery,closeMonth,validateTask,dateInZone} from '../src/domain.mjs';
const zone='Europe/Berlin';
const task=(id,clock,duration,category='Должен',date='2026-10-15')=>({id,title:id,start:zonedInstant(date,clock,zone),duration,category});
test('Строгая проверка даты, времени, длительности',()=>{
  assert.throws(()=>shiftDate('2026-02-30',1));assert.throws(()=>clockMinutes('24:00'));
  assert.throws(()=>validateTask({...task('a','10:00',30),duration:-1}));
  assert.throws(()=>validateTask({...task('a','10:00',30),title:' '}));
});
test('Дни, недели и годы переходят по календарю',()=>{
  assert.equal(shiftDate('2026-12-31',1),'2027-01-01');assert.equal(shiftDate('2026-12-28',7),'2027-01-04');
  assert.equal(shiftMonth('2026-12',1),'2027-01');assert.equal(shiftMonth('2026-01',-1),'2025-12');
});
test('Февраль и високосный год',()=>{
  assert.equal(monthDates('2026-02').length,28);assert.equal(monthDates('2028-02').length,29);
  assert.equal(monthDates('2026-04').length,30);assert.equal(monthDates('2026-10').length,31);
});
test('Объединение интервалов не меняет аргумент',()=>{
  const input=[[20,40],[10,30],[50,60]];
  assert.deepEqual(mergeIntervals(input),[[10,40],[50,60]]);assert.deepEqual(input,[[20,40],[10,30],[50,60]]);
});
test('Занятость без двойного учета, категории и свободные интервалы',()=>{
  const s=dayStats([task('a','09:00',120),task('b','10:00',120,'Хочу')],'2026-10-15',zone);
  assert.equal(s.busyMinutes,180);assert.equal(s.freeMinutes,1260);
  assert.deepEqual(s.conflicts,[['a','b']]);assert.equal(s.categories['Хочу'],120);
  assert.equal(s.free.length,2);
});
test('Соседние дела не конфликтуют',()=>{
  assert.deepEqual(dayStats([task('a','09:00',60),task('b','10:00',60)],'2026-10-15',zone).conflicts,[]);
});
test('Все пары конфликтов, в том числе вложенные',()=>{
  assert.equal(dayStats([task('a','09:00',180),task('b','10:00',60),task('c','10:30',60)],'2026-10-15',zone).conflicts.length,3);
});
test('Переход дела через полночь учитывается на обоих днях',()=>{
  const a=task('night','23:30',90);
  assert.equal(dayStats([a],'2026-10-15',zone).busyMinutes,30);
  assert.equal(dayStats([a],'2026-10-16',zone).busyMinutes,60);
});
test('Сон отдельно, свободное бодрствование без двойного вычитания',()=>{
  const s=dayStats([task('a','06:30',60)],'2026-10-15',zone,{bed:'23:30',wake:'07:00'});
  assert.equal(s.sleepMinutes,450);assert.equal(s.awakeFreeMinutes,960);
  assert.throws(()=>dayStats([],'2026-10-15',zone,{bed:'07:00',wake:'07:00'}));
});
test('Пустой план не подменяется демонстрационными числами',()=>{
  const s=dayStats([],'2026-10-15',zone);assert.equal(s.busyMinutes,0);assert.equal(s.sleepMinutes,null);assert.equal(s.freeMinutes,1440);
});
test('Весной день содержит 23 часа, осенью 25',()=>{
  assert.equal(dayStats([],'2026-03-29',zone).dayMinutes,1380);
  assert.equal(dayStats([],'2026-10-25',zone).dayMinutes,1500);
});
test('Отсутствующее время и двусмысленное время обрабатываются явно',()=>{
  assert.throws(()=>zonedInstant('2026-03-29','02:30',zone));
  assert.throws(()=>zonedInstant('2026-10-25','02:30',zone));
  assert.equal(zonedInstant('2026-10-25','02:30',zone,'later')-zonedInstant('2026-10-25','02:30',zone,'earlier'),3600000);
});
test('Сон в сутки перевода часов — реальное прошедшее время',()=>{
  assert.equal(dayStats([],'2026-03-29',zone,{bed:'23:30',wake:'07:00'}).sleepMinutes,390);
  assert.equal(dayStats([],'2026-10-25',zone,{bed:'23:30',wake:'07:00'}).sleepMinutes,510);
});
test('Часовой пояс влияет на календарную дату',()=>{
  const instant=Date.parse('2026-12-31T23:30:00Z');assert.equal(dateInZone(instant,zone),'2027-01-01');
  assert.equal(dateInZone(instant,'America/New_York'),'2026-12-31');
});
test('Прогресс привычки учитывает только запланированные дни и уникальные отметки',()=>{
  const h={weekdays:[1,3,5],checks:['2026-02-02','2026-02-02','2026-02-03'],start:'2026-02-01'};
  assert.deepEqual(habitProgress(h,'2026-02'),{done:1,planned:12,percent:8.33});
  assert.equal(habitProgress({weekdays:[],checks:[]},'2026-02').percent,null);
});
test('Проценты: 21/30 = 70, отсутствие данных явно',()=>{
  assert.equal(percent(21,30),70);assert.equal(percent(0,0),null);
});
test('Награды идемпотентны, уровень вычисляется по журналу',()=>{
  const s=initialState();assert.equal(grantReward(s,'mission:a',10,'Миссия','2026-10-15'),true);
  assert.equal(grantReward(s,'mission:a',10,'Миссия','2026-10-15'),false);
  grantReward(s,'month:a',90,'Тест','2026-10-15');assert.equal(crystals(s),100);assert.equal(mastery(s),2);
});
test('Глава хранит снимок; повторное закрытие не стирает историю',()=>{
  const s=initialState();s.months['2026-09']={goals:[{title:'Цель',done:true}],habits:[],cards:[]};
  assert.equal(closeMonth(s,'2026-09',Date.parse('2026-10-15T12:00Z')),true);
  s.months['2026-09'].goals[0].title='Измененная цель';
  assert.equal(s.chapters['2026-09'].goals[0].title,'Цель');
  assert.equal(closeMonth(s,'2026-09',Date.parse('2026-10-15T12:00Z')),false);assert.equal(crystals(s),30);
  assert.throws(()=>closeMonth(s,'2026-10',Date.parse('2026-10-15T12:00Z')));
});
