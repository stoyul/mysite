export const CATEGORIES = ['Должен', 'Хочу', 'Радость'];
export function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Укажи дату');
  const [y,m,d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y,m-1,d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m-1 || date.getUTCDate() !== d) throw new Error('Некорректная дата');
  return date;
}
export function shiftDate(value, days) {
  const date = parseDate(value); date.setUTCDate(date.getUTCDate()+days);
  return date.toISOString().slice(0,10);
}
export function monthDates(month) {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('Некорректный месяц');
  const first = parseDate(`${month}-01`);
  const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth()+1,0)).getUTCDate();
  return Array.from({length:count},(_,i)=>`${month}-${String(i+1).padStart(2,'0')}`);
}
export function shiftMonth(month, delta) {
  const date = parseDate(`${month}-01`); date.setUTCMonth(date.getUTCMonth()+delta);
  return date.toISOString().slice(0,7);
}
export function clockMinutes(clock) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(clock)) throw new Error('Укажи время в формате ЧЧ:ММ');
  const [h,m] = clock.split(':').map(Number); return h*60+m;
}
function partsAt(ms,zone) {
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(ms);
  return Object.fromEntries(parts.map(p=>[p.type,p.value]));
}
export function dateInZone(ms = Date.now(), zone = 'Europe/Berlin') {
  const p=partsAt(ms,zone);return `${p.year}-${p.month}-${p.day}`;
}
// Determine offsets near this date, then verify each candidate against IANA wall time.
export function zonedInstant(date, clock, zone, occurrence = 'reject') {
  parseDate(date);const minutes=clockMinutes(clock);
  const wall = Date.parse(`${date}T00:00:00Z`) + minutes*60000;
  const offsets = new Set();
  for (const hours of [-36,-12,0,12,36]) {
    const point=wall+hours*3600000,p=partsAt(point,zone);
    offsets.add(Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00Z`)-point);
  }
  const candidates=[...offsets].map(offset=>wall-offset).filter(ms=>{
    const p=partsAt(ms,zone);return `${p.year}-${p.month}-${p.day}`===date && `${p.hour}:${p.minute}`===clock;
  }).sort((a,b)=>a-b);
  if (!candidates.length) throw new Error('Это время отсутствует при переводе часов. Выбери другое время');
  if (candidates.length>1 && occurrence==='reject') throw new Error('Это время повторяется при переводе часов. Выбери первое или второе вхождение');
  return candidates[occurrence==='later'?candidates.length-1:0];
}
export function mergeIntervals(intervals) {
  const sorted = intervals.filter(([s,e])=>e>s).map(x=>[...x]).sort((a,b)=>a[0]-b[0]);
  return sorted.reduce((out,[s,e])=>{
    const last=out.at(-1);if(last && s<=last[1]) last[1]=Math.max(last[1],e); else out.push([s,e]);return out;
  },[]);
}
const total = intervals => mergeIntervals(intervals).reduce((n,[s,e])=>n+(e-s)/60000,0);
export function validateTask(task) {
  if (!task.title?.trim() || task.title.length>200) throw new Error('Название дела: от 1 до 200 символов');
  if (!Number.isInteger(task.duration)||task.duration<1||task.duration>1440) throw new Error('Длительность: от 1 до 1440 минут');
  if (!CATEGORIES.includes(task.category)) throw new Error('Выбери категорию');
  if (!Number.isFinite(task.start)) throw new Error('Некорректное начало дела');
  return {...task,title:task.title.trim()};
}
export function dayStats(tasks, date, zone, sleep = null) {
  const start=zonedInstant(date,'00:00',zone,'earlier'), end=zonedInstant(shiftDate(date,1),'00:00',zone,'earlier');
  const clip=([s,e])=>[Math.max(s,start),Math.min(e,end)];
  const selected=tasks.filter(t=>t.start<end && t.start+t.duration*60000>start);
  const intervals=selected.map(t=>clip([t.start,t.start+t.duration*60000]));
  const occupied=mergeIntervals(intervals), free=[];let cursor=start;
  for(const [s,e] of occupied){if(s>cursor)free.push([cursor,s]);cursor=e;}if(cursor<end)free.push([cursor,end]);
  const conflicts=[];
  for(let i=0;i<selected.length;i++)for(let j=i+1;j<selected.length;j++){
    const a=intervals[i],b=intervals[j];if(Math.max(a[0],b[0])<Math.min(a[1],b[1])) conflicts.push([selected[i].id,selected[j].id]);
  }
  let sleepIntervals=[];
  if(sleep){
    const bed=clockMinutes(sleep.bed),wake=clockMinutes(sleep.wake);
    if(bed===wake) throw new Error('Уточни разные часы сна и пробуждения');
    if(bed>wake){sleepIntervals=[[start,zonedInstant(date,sleep.wake,zone,'later')],[zonedInstant(date,sleep.bed,zone,'earlier'),end]];}
    else sleepIntervals=[[zonedInstant(date,sleep.bed,zone,'earlier'),zonedInstant(date,sleep.wake,zone,'later')]];
  }
  const unavailable=mergeIntervals([...occupied,...sleepIntervals]);let prev=start;const awakeFree=[];
  for(const [s,e] of unavailable){if(s>prev)awakeFree.push([prev,s]);prev=e;}if(prev<end)awakeFree.push([prev,end]);
  return {tasks:selected,dayMinutes:(end-start)/60000,busyMinutes:total(occupied),freeMinutes:total(free),free,awakeFree,
    awakeFreeMinutes:total(awakeFree),sleepMinutes:sleep?total(sleepIntervals):null,conflicts,
    categories:Object.fromEntries(CATEGORIES.map(c=>[c,total(selected.filter(t=>t.category===c).map(t=>clip([t.start,t.start+t.duration*60000])))]))};
}
export const percent=(done,planned)=>planned ? Math.round(done/planned*10000)/100:null;
export function habitProgress(habit,month,through=monthDates(month).at(-1)) {
  const scheduled=monthDates(month).filter(d=>d<=through && (!habit.start||d>=habit.start) && habit.weekdays.includes(parseDate(d).getUTCDay()));
  const done=scheduled.filter(d=>habit.checks.includes(d)).length;
  return {done,planned:scheduled.length,percent:percent(done,scheduled.length)};
}
export function grantReward(state,key,amount,reason,date) {
  if(!Number.isInteger(amount)||amount<0) throw new Error('Некорректная награда');
  if(state.rewards.some(r=>r.key===key))return false;
  state.rewards.push({key,amount,reason,date});return true;
}
export const crystals=state=>state.rewards.reduce((n,r)=>n+r.amount,0);
export const mastery=state=>1+Math.floor(crystals(state)/100);
export function chapterSnapshot(state,month,at) {
  const record=state.months[month]||{};
  return {month,createdAt:at,goals:structuredClone(record.goals||[]),events:record.events||'',
    decisions:structuredClone((state.decisions||[]).filter(d=>d.month===month)),
    completedTasks:structuredClone(state.tasks.filter(t=>t.done&&dateInZone(t.start,state.profile.zone).startsWith(month))),
    habits:structuredClone(record.habits||[]),cards:structuredClone(record.cards||[]),
    insights:record.insights||'',joy:record.joy||'',changes:record.changes||''};
}
export function closeMonth(state,month,at) {
  monthDates(month);
  if(month>=dateInZone(at,state.profile.zone).slice(0,7))throw new Error('Итоги можно завершить после окончания месяца');
  if(state.chapters[month])return false;
  state.chapters[month]=chapterSnapshot(state,month,at);
  grantReward(state,`month:${month}`,30,'Завершение месяца',dateInZone(at,state.profile.zone));return true;
}
export function initialState(zone='Europe/Berlin') {
  return {version:1,profile:{zone,bed:'23:30',wake:'07:00'},tasks:[],months:{},chapters:{},rewards:[],decisions:[],favorites:[],cardRuns:[]};
}
