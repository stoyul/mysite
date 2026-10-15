import {CATEGORIES,initialState,dateInZone,zonedInstant,dayStats,shiftDate,parseDate,monthDates,habitProgress,percent,validateTask,grantReward,crystals,mastery,closeMonth} from './domain.mjs';
import {newRun,startDay,applyChoice,advance,completePractice,skipPractice,scheduleToAllocation,chooseWishes,DAY_ACTIVITIES} from './game.mjs';
import {gameView} from './game-view.mjs';
import {journeyView,wishes} from './journey-view.mjs';
import {CHAPTERS,chapterUnlocked,newChapter,prepareChapter,chooseChapter,advanceChapter,chapterReward} from './chapters.mjs';
import {chapterLanding,chapterView} from './chapter-view.mjs';
import {newPassportDraft,sleepWindow,setSleep,setDay,addCustom,setRhythm,setPrime,finishPassport} from './passport.mjs';
import {passportView} from './passport-view.mjs';
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='master-time:v1';let state=initialState(),storageError='',cards=[],view='day',search='',favoritesOnly=false,selectedCard=null,introSlide=0;
try{const raw=localStorage.getItem(KEY);if(raw){const data=JSON.parse(raw);if(data.version!==1||!Array.isArray(data.tasks)||!data.profile?.zone||!data.months||!data.chapters||!Array.isArray(data.rewards))throw Error('Неизвестный формат сохранения');state=data;}}catch(error){storageError='Сохранение не удалось прочитать. Данные не перезаписаны. '+error.message;}
let date=dateInZone(Date.now(),state.profile.zone),month=date.slice(0,7),year=Number(month.slice(0,4));
let noticeTimer;
function notify(message){$('notice').textContent=message;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').textContent='',5000);}
let soundOn=localStorage.getItem('master-time:sound')==='on',musicOn=localStorage.getItem('master-time:music')==='on',audioCtx,musicVoices=[];
function playSound(kind='tap'){
  if(!soundOn)return;
  try{audioCtx??=new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();const now=audioCtx.currentTime,patterns={reward:[660,880,1100],step:[440,660],card:[520,700],start:[294,440,587],event:[392,466],decision:[520,659],success:[523,659,784],surprise:[392,330,440],end:[330,440,523],level:[440,587,880],tap:[490]},notes=patterns[kind]||patterns.tap;notes.forEach((pitch,i)=>{const osc=audioCtx.createOscillator(),gain=audioCtx.createGain(),start=now+i*.09;osc.type='sine';osc.frequency.setValueAtTime(pitch,start);gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.025,start+.018);gain.gain.exponentialRampToValueAtTime(.0001,start+.24);osc.connect(gain).connect(audioCtx.destination);osc.start(start);osc.stop(start+.25);});}catch{}
}
function startMusic(){if(!musicOn||musicVoices.length)return;try{audioCtx??=new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();const gain=audioCtx.createGain();gain.gain.value=.0001;gain.connect(audioCtx.destination);const voices=[1,1.5].map(factor=>{const osc=audioCtx.createOscillator();osc.type='sine';osc.frequency.value=196*factor;osc.connect(gain);osc.start();return osc;});gain.gain.exponentialRampToValueAtTime(.007,audioCtx.currentTime+1);musicVoices=[...voices,gain];}catch{}}
function stopMusic(){if(!musicVoices.length)return;const gain=musicVoices.at(-1);try{gain.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+.4);musicVoices.slice(0,-1).forEach(osc=>osc.stop(audioCtx.currentTime+.45));}catch{}musicVoices=[];}
document.addEventListener('pointerdown',()=>{if(musicOn)startMusic();},{once:true});
function showRewardBurst(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const burst=$('reward-burst');burst.replaceChildren();
  for(let i=0;i<9;i++){const crystal=document.createElement('span');crystal.className='reward-crystal';crystal.style.setProperty('--angle',`${i*40}deg`);crystal.style.setProperty('--delay',`${i*35}ms`);burst.append(crystal);}
  setTimeout(()=>burst.replaceChildren(),1600);
}
function update(fn,message='Сохранено на этом устройстве'){
  if(storageError){notify(storageError);return false;}
  const next=structuredClone(state);const oldLevel=mastery(state),oldBalance=crystals(state),oldRun=activeGame(state),oldRunCrystals=oldRun?.resources.crystals??0;
  try{fn(next);localStorage.setItem(KEY,JSON.stringify(next));state=next;render();notify(message);
    if(crystals(state)>oldBalance||activeGame(state)?.id===oldRun?.id&&activeGame(state)?.resources.crystals>oldRunCrystals){document.body.classList.add('reward');showRewardBurst();playSound('reward');setTimeout(()=>document.body.classList.remove('reward'),1300);if(mastery(state)>oldLevel)notify(`Новый уровень мастерства: ${mastery(state)}`);}return true;
  }catch(error){notify(`Не сохранено: ${error.message}`);return false;}
}
const id=()=>crypto.randomUUID();
const localClock=ms=>new Intl.DateTimeFormat('ru-RU',{timeZone:state.profile.zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(ms);
const dateLabel=d=>parseDate(d).toLocaleDateString('ru-RU',{timeZone:'UTC',day:'numeric',month:'long',weekday:'long'}).replaceAll('ё','е');
const monthLabel=m=>parseDate(`${m}-01`).toLocaleDateString('ru-RU',{timeZone:'UTC',month:'long',year:'numeric'}).replaceAll('ё','е');
const hours=min=>`${Math.floor(min/60)} ч ${Math.round(min%60)} мин`;
const button=(label,action,extra='',cls='')=>`<button type="button" class="${cls}" data-action="${action}" ${extra}>${label}</button>`;
function monthRecord(s,key=month){return s.months[key]??=( {goals:[],events:'',habits:[],cards:[],insights:'',joy:'',changes:''});}
function hourglass(progress=0){return `<svg class="hourglass" viewBox="0 0 180 230" role="img" aria-label="Песочные часы жизни. Выполнено ${progress}% дел"><defs><linearGradient id="gold" x2="1" y2="1"><stop stop-color="#fff0bc"/><stop offset=".48" stop-color="#f3c55b"/><stop offset="1" stop-color="#8c5c21"/></linearGradient><clipPath id="glass"><path d="M42 28H138C138 78 116 95 97 115C116 135 138 151 138 201H42C42 151 64 135 83 115C64 95 42 78 42 28Z"/></clipPath></defs><ellipse cx="90" cy="214" rx="68" ry="9" fill="#f5c45c30"/><path d="M42 28H138C138 78 116 95 97 115C116 135 138 151 138 201H42C42 151 64 135 83 115C64 95 42 78 42 28Z" fill="#f8e9ca08" stroke="#f4ce83" stroke-width="2.5"/><g clip-path="url(#glass)"><path d="M36 ${55+progress*.6}Q90 ${48+progress*.6} 144 ${55+progress*.6}V115H36Z" fill="url(#gold)" opacity=".85"/><rect x="35" y="${200-progress*.62}" width="110" height="${progress*.62+5}" fill="url(#gold)"/><path class="sand-stream" d="M90 110V200" stroke="#ffe7a0" stroke-width="2.5"/>${[0,1,2,3,4].map((_,i)=>`<circle class="sand-grain" cx="${89+i%2*2}" cy="118" r="${i%2?1.2:1.7}" style="animation-delay:${i*.32}s"/>`).join('')}</g><path d="M28 22H152M28 207H152" stroke="url(#gold)" stroke-width="9" stroke-linecap="round"/><path d="M33 33V197M147 33V197" stroke="#b58b42" stroke-width="3"/><circle cx="154" cy="75" r="2" fill="#efd49b"/><path d="M13 128h12m-6-6v12" stroke="#efd49b"/></svg>`;}
function hero(title,description,progress=0){return `<section class="hero"><div><p class="eyebrow">ВРЕМЯ ДЛЯ ТОГО, ЧТО ВАЖНО</p><h1>${title}</h1><p>${description}</p><span class="tag">Уровень ${mastery(state)} · ${crystals(state)} кристаллов</span></div>${hourglass(progress)}</section>`;}
function taskList(tasks){return tasks.length?tasks.slice().sort((a,b)=>a.start-b.start).map(t=>`<article class="task ${t.done?'done':''}"><div class="task-main"><time>${localClock(t.start)}</time><strong>${esc(t.title)}</strong></div><small>${t.duration} мин · ${esc(t.category)} · до ${localClock(t.start+t.duration*60000)}</small><div class="actions">${button(t.done?'✓ Выполнено':'Выполнить','done',`data-id="${t.id}"`)}${button('Изменить','edit',`data-id="${t.id}"`,'subtle')}${button('Удалить','delete',`data-id="${t.id}"`,'subtle danger')}</div><label>Радость процесса: <select data-joy="${t.id}" aria-label="Радость процесса: ${esc(t.title)}"><option value="">Пока не отмечена</option>${[1,2,3,4,5].map(n=>`<option value="${n}" ${t.joy===n?'selected':''}>${n} из 5</option>`).join('')}</select></label></article>`).join(''):'<p class="empty">Здесь появится первое дело. Оставь в дне место и для отдыха.</p>';}
function dayView(){const stats=dayStats(state.tasks,date,state.profile.zone,{bed:state.profile.bed,wake:state.profile.wake}),done=stats.tasks.filter(t=>t.done).length,p=percent(done,stats.tasks.length)??0;
  return hero('Подари внимание<br>своему дню.','Одно важное дело, немного пространства и радость от самого процесса.',p)+`<div class="heading"><div><p class="eyebrow">МОЙ ДЕНЬ</p><label>Дата<input id="day-date" type="date" value="${date}"></label></div>${button('+ Новое дело','add','','primary')}</div><div class="metrics"><div class="metric"><strong>${hours(stats.busyMinutes)}</strong><span>Занято без пересечений</span></div><div class="metric"><strong>${hours(stats.awakeFreeMinutes)}</strong><span>Свободное бодрствование</span></div><div class="metric"><strong>${done} / ${stats.tasks.length}</strong><span>Выполнено дел</span></div></div>${stats.conflicts.length?`<p class="warning">Пересекаются дела: ${stats.conflicts.map(pair=>pair.map(id=>esc(state.tasks.find(t=>t.id===id).title)).join(' / ')).join('; ')}. Измени время или перенеси дело.</p>`:''}<div class="grid"><section class="panel"><div class="heading"><h2>${dateLabel(date)}</h2><span class="tag">${p}% плана</span></div><progress value="${p}" max="100" aria-label="Выполнение плана дня"></progress>${taskList(stats.tasks)}${stats.tasks.length?button('Завершить день','close-day','','primary'):''}</section><div><section class="panel"><p class="eyebrow">ПРОСТРАНСТВО ДЛЯ ЖИЗНИ</p><h2>Свободные интервалы</h2>${stats.awakeFree.map(([s,e])=>`<p>${localClock(s)} — ${dateInZone(e,state.profile.zone)!==date?'24:00':localClock(e)}<br><small>${hours((e-s)/60000)}</small></p>`).join('')||'<p>Свободных интервалов нет. Стоит пересмотреть план.</p>'}<small>Время в постели: ${hours(stats.sleepMinutes)}. Это не измерение фактического сна. В этих сутках ${hours(stats.dayMinutes)}.</small></section><section class="panel"><h2>Баланс дня</h2>${CATEGORIES.map(c=>`<p>${c} <span class="tag">${hours(stats.categories[c])}</span></p>`).join('')}<small>Внутри категории пересечения объединены. Разные категории могут пересекаться, поэтому их суммы не складываются в общую занятость.</small></section></div></div>`;
}
function weekView(){const monday=shiftDate(date,-((parseDate(date).getUTCDay()+6)%7)),days=Array.from({length:7},(_,i)=>shiftDate(monday,i));return hero('Неделя в своем ритме.','Начни с главного. Отдых тоже заслуживает места в календаре.')+`<div class="heading">${button('← Неделя','prev-week')}${button('Следующая неделя →','next-week')}</div><div class="day-strip">${days.map(d=>{const n=state.tasks.filter(t=>dateInZone(t.start,state.profile.zone)===d).length;return button(`${dateLabel(d).split(',')[0].slice(0,2)}<strong>${Number(d.slice(-2))}</strong>${n} дел`,'choose-day',`data-date="${d}"`);}).join('')}</div><section class="panel" style="margin-top:24px"><h2>План недели</h2>${days.map(d=>`<details><summary>${dateLabel(d)}</summary>${taskList(dayStats(state.tasks,d,state.profile.zone).tasks)}</details>`).join('')}</section>`;}
function monthView(){const m=state.months[month]||{goals:[],habits:[],cards:[]},completed=m.goals.filter(g=>g.done).length;return hero('Месяц маленьких шагов.','Выбирай важное, замечай изменения и сохраняй то, что приносит радость.',percent(completed,m.goals.length)??0)+`<label>Месяц<input type="month" id="month-select" value="${month}"></label><div class="grid"><div><section class="panel"><h2>Мои цели · ${monthLabel(month)}</h2><p>${completed} из ${m.goals.length} запланированных действий · ${percent(completed,m.goals.length)??'Нет данных'}${m.goals.length?'%':''}</p><form id="goal-form"><label>Следующее действие<input name="title" maxlength="200" required placeholder="Один конкретный шаг"></label><button class="primary">Добавить цель</button></form>${m.goals.map(g=>`<p><label><input type="checkbox" data-goal="${g.id}" ${g.done?'checked':''}>${esc(g.title)}</label></p>`).join('')}</section><section class="panel"><h2>Мой дневник месяца</h2><form id="month-form">${[['events','Что произошло'],['insights','Что я поняла о себе'],['joy','Что принесло мне радость'],['changes','Что я хочу изменить']].map(([key,label])=>`<label>${label}<textarea name="${key}" maxlength="20000">${esc(m[key]||'')}</textarea></label>`).join('')}<button class="primary">Сохранить записи</button></form></section></div><section class="panel"><p class="eyebrow">ПРИВЫЧКИ БЕЗ ГОНКИ</p><h2>До трех маленьких опор</h2><form id="habit-form"><label>Название привычки<input name="title" required maxlength="100"></label><label>Ради чего?<input name="goal" maxlength="200"></label><label>Периодичность<select name="frequency"><option value="daily">Ежедневно</option><option value="workdays">Понедельник, среда, пятница</option></select></label><button ${m.habits.length>=3?'disabled':''}>Добавить привычку</button></form>${m.habits.map(h=>{const p=habitProgress(h,month);return `<details open><summary>${esc(h.title)} · ${p.done}/${p.planned}</summary><p>${esc(h.goal)} · ${p.percent??'Нет данных'}${p.planned?'%':''}</p><div class="habit-days">${monthDates(month).map(d=>{const scheduled=h.weekdays.includes(parseDate(d).getUTCDay())&&d>=h.start,future=d>dateInZone(Date.now(),state.profile.zone);return button(d.slice(-2),'habit',`data-id="${h.id}" data-date="${d}" aria-pressed="${h.checks.includes(d)}" aria-label="${esc(h.title)}: ${d}" ${!scheduled||future?'disabled':''}`,h.checks.includes(d)?'checked':'');}).join('')}</div><small>Знаменатель — все запланированные дни месяца. Пропуск не обнуляет прогресс.</small></details>`;}).join('')}</section></div>`;}
function wheelSlice(index){
  const angle=n=>(-90+n*30)*Math.PI/180;
  const point=(r,a)=>[220+r*Math.cos(a),220+r*Math.sin(a)].map(v=>v.toFixed(2)).join(' ');
  const start=angle(index+.035),end=angle(index+.965);
  return `M${point(188,start)} A188 188 0 0 1 ${point(188,end)} L${point(86,end)} A86 86 0 0 0 ${point(86,start)} Z`;
}
function yearView(){
  const months=Array.from({length:12},(_,i)=>`${year}-${String(i+1).padStart(2,'0')}`);
  return hero('Твой год — твоя история.','У каждого месяца свое место. Цели, решения и открытия остаются с тобой.')+`<div class="heading">${button('← Год','prev-year')}<h2>${year}</h2>${button('Следующий год →','next-year')}</div><div class="grid"><section class="panel year-panel"><svg class="wheel" viewBox="0 0 440 440" role="group" aria-label="Колесо моего года — выбери месяц"><circle class="wheel-aura" cx="220" cy="220" r="203"/>${months.map((m,i)=>{const a=(-75+i*30)*Math.PI/180,x=220+135*Math.cos(a),y=220+135*Math.sin(a);return `<a href="#month" data-month="${m}" class="wheel-month ${m===month?'current':''} ${state.chapters[m]?'closed':''}" aria-label="${monthLabel(m)}"><path d="${wheelSlice(i)}"/><text x="${x}" y="${y+5}" text-anchor="middle">${i+1}</text></a>`;}).join('')}<circle class="wheel-core" cx="220" cy="220" r="78"/><text class="wheel-year" x="220" y="212" text-anchor="middle">${year}</text><text class="wheel-subtitle" x="220" y="241" text-anchor="middle">МОЕ ВРЕМЯ</text></svg><div class="month-list">${months.map(m=>button(monthLabel(m).split(' ')[0],'select-month',`data-month="${m}"`,m===month?'active':'')).join('')}</div></section><section class="panel"><p class="eyebrow">ИСТОРИЯ МЕСЯЦА</p><h2>${monthLabel(month)}</h2><p>Целей: ${(state.months[month]?.goals||[]).length}<br>Привычек: ${(state.months[month]?.habits||[]).length}<br>Сохраненных карточек: ${(state.months[month]?.cards||[]).length}<br>Решений: ${state.decisions.filter(d=>d.month===month).length}</p>${button('Открыть месяц','open-month','','primary')}<p style="margin-top:22px">${state.chapters[month]?'Глава сохранена в книге.':month<dateInZone(Date.now(),state.profile.zone).slice(0,7)?'Месяц закончился. Можно сохранить главу с итогами.':'Глава автоматически появится после завершения месяца при следующем входе.'}</p></section></div>`;
}
function cardsView(){
  const selected=cards.find(c=>c.id===selectedCard);
  if(selected){
    const sourceText=(selected.original?.description||'').replaceAll('ё','е').replaceAll('Ё','Е');
    const sourcePractice=(selected.original?.practice||'').replaceAll('ё','е').replaceAll('Ё','Е');
    return hero(esc(selected.title),'Одно небольшое действие может изменить привычный день.')+`<section class="panel card-detail">${button('← В каталог','cards-back')}<p class="eyebrow">КАРТОЧКА ${selected.number}</p><div class="card-editorial"><div><span class="card-part">01 · СИТУАЦИЯ</span><p>${esc(selected.situation||selected.description)}</p></div><div><span class="card-part">02 · ПОПРОБУЙ</span><p>${esc(selected.action||selected.practice)}</p></div></div><details><summary>Подробнее: исходная методика</summary><p class="card-description">${esc(sourceText)}</p><p class="card-description">${esc(sourcePractice)}</p><small>${esc(selected.source.file)}, строка ${selected.source.row}</small></details><form id="card-form"><label>Мое открытие<textarea name="note" maxlength="20000" required></textarea></label><button class="primary">Выполнить и сохранить</button></form><div class="actions">${button(state.favorites.includes(selected.id)?'★ В избранном':'☆ В избранное','favorite',`data-id="${selected.id}"`)}${button('Добавить в мой план','plan-card',`data-id="${selected.id}"`)}</div><small>За первое выполнение: +3 кристалла. Повторная практика сохраняется без повторной награды.</small>${state.cardRuns.filter(r=>r.cardId===selected.id).map(r=>`<details><summary>${esc(r.date)} · мое открытие</summary><p class="card-description">${esc(r.note)}</p></details>`).join('')}</section>`;
  }
  const found=cards.filter(c=>(!favoritesOnly||state.favorites.includes(c.id))&&`${c.title} ${c.situation||c.description} ${c.action||c.practice}`.toLowerCase().includes(search.toLowerCase()));
  return hero('Сокровищница времени.','74 практики: короткие истории и действия, к которым можно возвращаться.')+`<div class="fields"><label>Поиск по карточкам<input id="search" type="search" value="${esc(search)}" placeholder="Отдых, внимание, цели..."></label><label>Показать<select id="filter"><option value="all">Все карточки</option><option value="favorites" ${favoritesOnly?'selected':''}>Избранное</option></select></label></div><p class="muted">Найдено ${found.length} · Выполнено ${new Set(state.cardRuns.map(r=>r.cardId)).size} / ${cards.length}</p><div class="card-list">${found.map(c=>`<article class="practice"><span class="eyebrow">ПРАКТИКА ${c.number} ${state.favorites.includes(c.id)?'★':''}</span><h2>${esc(c.title)}</h2><p>${esc(c.situation||c.description)}</p>${button('Открыть практику →','card',`data-id="${c.id}"`)}</article>`).join('')||'<p class="empty">По этому запросу карточек нет.</p>'}</div>`;
}
function bookView(){const entries=Object.values(state.chapters).sort((a,b)=>a.month.localeCompare(b.month));return hero('Книга моего времени.','Здесь остаются прожитые месяцы. История, которую ты создаешь каждый день.')+`<p class="warning">Экспорт PDF будет добавлен отдельным этапом с проверкой кириллицы и печатных страниц.</p>${entries.map(c=>`<article class="panel chapter"><h2>${monthLabel(c.month)}</h2>${[['Мои цели',c.goals.map(g=>`${g.done?'✓':'○'} ${g.title}`).join('\n')],['Что произошло',c.events],['Какие решения я приняла',c.decisions.map(d=>d.choice||'').join('\n')],['Что удалось',c.completedTasks.map(t=>t.title).join('\n')],['Какие привычки сформировались',c.habits.map(h=>`${h.title}: ${habitProgress(h,c.month).done}/${habitProgress(h,c.month).planned} отметок`).join('\n')],['Какие карточки я сохранила',c.cards.map(id=>cards.find(card=>card.id===id)?.title||id).join('\n')],['Что я поняла о себе',c.insights],['Что принесло мне радость',c.joy],['Что я хочу изменить',c.changes]].map(([title,text])=>`<h3>${title}</h3><p>${esc(text||'Нет записей')}</p>`).join('')}</article>`).join('')||'<section class="panel"><h2>Первая глава еще впереди</h2><p>Записывай цели и открытия в разделе «Мой месяц». При следующем входе после окончания месяца глава сохранится автоматически.</p></section>'}`;}
function settingsView(){return hero('Мой ритм и мои данные.','Настрой время сна и часовой пояс. Сохраняй резервную копию важных записей.')+`<section class="panel"><h2>Параметры расчетов</h2><form id="profile-form"><label>Часовой пояс IANA<input name="zone" value="${esc(state.profile.zone)}" required placeholder="Europe/Berlin"></label><div class="fields"><label>Отход ко сну<input name="bed" type="time" value="${state.profile.bed}" required></label><label>Пробуждение<input name="wake" type="time" value="${state.profile.wake}" required></label></div><button class="primary">Сохранить настройки</button></form><p style="margin-top:20px">Часовой пояс определяет отображение сохраненных моментов времени. При его смене часы задач могут измениться.</p></section><section class="panel"><h2>Данные на этом устройстве</h2><p>Серверная синхронизация и вход через Telegram пока не подключены. Очистка браузера удалит локальный прогресс.</p>${button('Скачать резервную копию JSON','backup','','primary')}<p>Восстановление копии и импорт данных старого прототипа будут добавлены после проверки схемы миграции.</p></section>`;}
function runsView(){return `<section class="panel"><p class="eyebrow">МОИ ПРОХОЖДЕНИЯ</p><h1>Каждая попытка остается с тобой.</h1><p>Игровые дни и главы можно повторять без ожидания и без потери прежних результатов.</p><h2>Игровые дни</h2>${(state.gameRuns||[]).map((r,i)=>`<p>${button(`${r.phase==='result'?'Итог':'Продолжить'} · День ${i+1}: ${esc(r.goal||'моя цель')}`,'past-run',`data-id="${r.id}"`)}</p>`).join('')||'<p>Пока нет прохождений.</p>'}<h2>Неделя, месяц и год</h2>${(state.chapterRuns||[]).map((r,i)=>`<p>${button(`${r.phase==='result'?'Итог':'Продолжить'} · ${esc(CHAPTERS[r.kind]?.title||r.kind)} ${i+1}`,'past-chapter',`data-id="${r.id}"`)}</p>`).join('')||'<p>Пока нет глав.</p>'}<a class="chapter-entry" href="#game">Начать новый игровой день →</a></section>`;}
function toolsView(){return `<section class="tools-landing"><p class="eyebrow">РЕАЛЬНАЯ ЖИЗНЬ</p><h1>Инструменты планирования</h1><p class="game-lead">Игровые ситуации — тренировка. Здесь ты планируешь конкретные даты и сохраняешь настоящие дела.</p><div class="chapter-tiles">${[['day','Мой реальный день','Дела и свободные интервалы на выбранную дату'],['week','Моя реальная неделя','План на семь календарных дней'],['month','Мой реальный месяц','Цели и привычки на текущий месяц'],['year','Колесо моего года','История всех двенадцати месяцев'],['cards','Карточки','74 практики тайм-менеджмента'],['book','Книга моего времени','Сохраненные главы месяца']].map(([key,title,desc])=>`<a class="chapter-tile" href="#${key}"><h2>${title}</h2><p>${desc}</p><span>Открыть →</span></a>`).join('')}</div></section>`;}
function achievementsView(){const completeDays=(state.gameRuns||[]).filter(r=>r.phase==='result'),completeChapters=(state.chapterRuns||[]).filter(r=>r.phase==='result');return `<section class="panel"><p class="eyebrow">МОИ ДОСТИЖЕНИЯ</p><h1>Твои решения оставляют след.</h1><div class="landing-stats"><div><strong>${completeDays.length}</strong><span>Игровых дней</span></div><div><strong>${completeChapters.length}</strong><span>Глав</span></div><div><strong>${crystals(state)}</strong><span>Кристаллов</span></div></div><div class="achievement-list">${[...new Set(completeDays.flatMap(r=>r.achievements||[]))].map(a=>`<span>✦ ${esc(a)}</span>`).join('')||'<p>Первое достижение появится после игрового дня.</p>'}</div><details><summary>История наград</summary>${state.rewards.map(r=>`<p>${esc(r.reason||r.key)} · +${r.amount} кристаллов</p>`).join('')}</details></section>`;}
const routes=[['game','Играть'],['runs','Мои прохождения'],['passport','Мой ритм'],['tools','Инструменты планирования'],['achievements','Мои достижения'],['chapters','Игровые главы'],['day','Мой реальный день'],['week','Моя неделя'],['month','Мой месяц'],['year','Колесо года'],['cards','Карточки'],['book','Книга времени'],['settings','Настройки']];
function render(){const requested=location.hash.slice(1);view=requested==='play'||requested==='chapter'?requested:routes.some(([key])=>key===requested)?requested:'game';document.body.classList.toggle('game-mode',['game','play','chapters','chapter','runs','passport','tools','achievements'].includes(view));$('navigation').innerHTML=routes.map(([key,label])=>`<a href="#${key}" ${key===view?'aria-current="page"':''}>${label}</a>`).join('');$('balance').textContent=`✦ ${crystals(state)} кристаллов`;
  $('sound-toggle').textContent=soundOn?'♪ Звуки включены':'♪ Звуки выключены';$('sound-toggle').setAttribute('aria-pressed',String(soundOn));$('music-toggle').textContent=musicOn?'♫ Музыка включена':'♫ Музыка выключена';$('music-toggle').setAttribute('aria-pressed',String(musicOn));
  const game=()=>{const run=activeGame(state),args={state,cards,hourglass,crystals,mastery,screen:view,introSlide};return view==='game'||!run||run.mode==='journey-v2'?journeyView(args):gameView(args);};
  const views={game,play:game,chapters:()=>chapterLanding(state),chapter:()=>chapterView(state),runs:runsView,passport:()=>passportView(state),tools:toolsView,achievements:achievementsView,day:dayView,week:weekView,month:monthView,year:yearView,cards:cardsView,book:bookView,settings:settingsView};
  try{$('content').innerHTML=(storageError?`<p role="alert" class="warning">${esc(storageError)}</p>`:'')+views[view]();const past=$('past-runs');if(past)past.innerHTML=(state.gameRuns||[]).map(r=>`<p>${button(`${r.phase==='result'?'Итог':'Продолжить'} · Прохождение ${(state.gameRuns||[]).indexOf(r)+1}: ${esc(r.goal||'Новый день')}`,'past-run',`data-id="${r.id}"`)}</p>`).join('');}catch(error){$('content').innerHTML=`<p role="alert" class="warning">Не удалось открыть раздел: ${esc(error.message)}. Данные не удалены.</p>`;}
}
function openEditor(task=null){const f=$('task-form');f.reset();delete f.dataset.gameRun;f.elements.id.value=task?.id||'';f.elements.title.value=task?.title||'';f.elements.date.value=task?dateInZone(task.start,state.profile.zone):date;f.elements.time.value=task?localClock(task.start):'09:00';f.elements.duration.value=task?.duration||30;f.elements.category.value=task?.category||'Хочу';f.elements.occurrence.value=task?.occurrence||'reject';$('editor-title').textContent=task?'Изменить дело':'Новое дело';$('form-error').textContent='';$('editor').showModal();}
$('cancel-edit').onclick=()=>$('editor').close();
const activeGame=s=>(s.gameRuns||[]).find(r=>r.id===s.activeRun);
function recordGameResult(s,run){
  if(run.phase!=='result')return;
  const today=dateInZone(Date.now(),s.profile.zone);
  if(grantReward(s,`game:${run.id}:complete`,20+run.resources.crystals,'Завершение игрового дня',today)){
    for(const entry of run.history.filter(h=>h.kind==='choice'))s.decisions.push({id:`${run.id}:${entry.step}`,month:today.slice(0,7),gameRun:run.id,date:today,event:entry.title,choice:entry.choice,delta:entry.delta,explanation:entry.explanation});
  }
}
document.addEventListener('click',event=>{
  const passportTarget=event.target.closest('[data-passport]');
  if(passportTarget){
    const action=passportTarget.dataset.passport;
    if(action==='begin'){update(s=>{s.passportDraft=newPassportDraft(s.profile,false);},'');return;}
    if(action==='back'){update(s=>{s.passportDraft.step=Math.max(0,s.passportDraft.step-1);},'');return;}
    if(action==='energy-hour'){update(s=>{const d=s.passportDraft,h=Number(passportTarget.dataset.hour),levels=['unknown','low','medium','high'];d.energyHours[h]=levels[(levels.indexOf(d.energyHours[h])+1)%levels.length];},'');return;}
    if(action==='add-custom'){
      const form=$('passport-day-form');if(!form)return;
      update(s=>{const d=s.passportDraft;setDay(d,Object.fromEntries(new FormData(form)));d.step=1;addCustom(d,$('custom-name').value,$('custom-hours').value,$('custom-minutes').value);d.schedule.other+=d.custom.at(-1).minutes;},'Занятие добавлено');return;
    }
    if(action==='remove-custom'){
      update(s=>{const d=s.passportDraft,i=Number(passportTarget.dataset.index),removed=d.custom.splice(i,1)[0];if(removed)d.schedule.other-=removed.minutes;},'Занятие удалено');return;
    }
    return;
  }
  const chapterTarget=event.target.closest('[data-chapter]');
  if(chapterTarget){
    const action=chapterTarget.dataset.chapter,kind=chapterTarget.dataset.kind;
    if(action==='history'){if(update(s=>{s.activeChapter=chapterTarget.dataset.id;},'')){location.hash='chapter';render();}return;}
    if(action==='bridge-week'){
      const run=state.chapterRuns.find(r=>r.id===state.activeChapter);openEditor();const form=$('task-form');form.elements.title.value=`30 минут: ${run.goal||'мое желание'}`.slice(0,200);form.elements.duration.value=30;form.elements.category.value='Хочу';return;
    }
    if(action==='bridge-month'){
      if(update(s=>{const run=s.chapterRuns.find(r=>r.id===s.activeChapter),m=monthRecord(s);if(m.habits.some(h=>h.sourceChapterId===run.id))throw Error('Эта привычка уже добавлена');if(m.habits.length>=3)throw Error('В месяце уже три привычки');m.habits.push({id:id(),title:run.focus,goal:'Маленький шаг каждый день',start:`${month}-01`,weekdays:[0,1,2,3,4,5,6],checks:[],sourceChapterId:run.id});},'Привычка добавлена в мой месяц'))playSound('reward');return;
    }
    if(action==='bridge-year'){
      if(update(s=>{const run=s.chapterRuns.find(r=>r.id===s.activeChapter),m=monthRecord(s);if(m.goals.some(g=>g.sourceChapterId===run.id))throw Error('Приоритет уже добавлен');m.goals.push({id:id(),title:run.focus,done:false,sourceChapterId:run.id});},'Приоритет добавлен в цели месяца'))playSound('reward');return;
    }
    if(action==='open'||action==='replay'){
      if(!state.profile.passport){if(update(s=>{s.passportDraft=newPassportDraft(s.profile,false);},'')){location.hash='passport';render();}return;}
      if(action==='open'&&!chapterUnlocked(state,kind)){notify('Сначала заверши предыдущую главу');return;}
      const existing=action==='open'?[...(state.chapterRuns||[])].reverse().find(r=>r.kind===kind&&r.phase!=='result'):null;
      if(update(s=>{s.chapterRuns??=[];if(existing)s.activeChapter=existing.id;else{const day=[...(s.gameRuns||[])].reverse().find(r=>r.phase==='result');const run=newChapter(kind,id(),Date.now(),day?.goal||'');s.chapterRuns.push(run);s.activeChapter=run.id;}},'')){location.hash='chapter';render();playSound('step');}return;
    }
    if(action==='choose'){if(update(s=>chooseChapter(s.chapterRuns.find(r=>r.id===s.activeChapter),Number(chapterTarget.dataset.choice),Date.now()),''))playSound('card');return;}
    if(action==='advance'){if(update(s=>{const run=s.chapterRuns.find(r=>r.id===s.activeChapter);advanceChapter(run,Date.now());if(run.phase==='result')grantReward(s,`chapter:${run.id}`,chapterReward(run),`Завершение главы: ${CHAPTERS[run.kind].title}`,dateInZone(Date.now(),s.profile.zone));},''))playSound('step');return;}
    return;
  }
  if(event.target.closest('#sound-toggle')){soundOn=!soundOn;localStorage.setItem('master-time:sound',soundOn?'on':'off');render();playSound('step');return;}
  if(event.target.closest('#music-toggle')){musicOn=!musicOn;localStorage.setItem('master-time:music',musicOn?'on':'off');if(musicOn)startMusic();else stopMusic();render();return;}
  if(event.target.closest('#close-journey-review')){$('journey-review').close();return;}
  const target=event.target.closest('[data-game]');if(!target)return;
  const action=target.dataset.game;
  if(action==='adjust-time'){
    const form=$('game-plan-form'),input=form.elements[target.dataset.key],next=Math.max(0,Math.min(1440,Number(input.value)+Number(target.dataset.delta)));input.value=String(next);
    form.querySelector(`[data-time-output="${target.dataset.key}"]`).textContent=next>=60?`${Math.floor(next/60)} ч${next%60?' '+next%60+' мин':''}`:`${next} мин`;
    const used=[...form.querySelectorAll('.activity-row input')].reduce((n,item)=>n+Number(item.value),0),remaining=1440-used;
    $('day-used').textContent=`${Math.floor(used/60)} ч${used%60?' '+used%60+' мин':''}`;
    $('game-budget-preview').textContent=remaining>=0?`Не учтено ${Math.floor(remaining/60)} ч${remaining%60?' '+remaining%60+' мин':''}`:`Превышено на ${Math.floor(-remaining/60)} ч${-remaining%60?' '+(-remaining%60)+' мин':''}. Уменьши время.`;
    $('game-budget-preview').classList.toggle('warning',remaining<0);
    const colors=['#e9bb66','#dc418c','#6b91e6','#9c70cd','#f07865','#d4a46c','#b9ad68','#7daaa3','#6bc29a','#925cb7','#f3dc81','#74717e','#f7d990'];let angle=0;const slices=[];
    DAY_ACTIVITIES.forEach(([key],i)=>{const size=Number(form.elements[key].value)/1440*360;if(size>0){slices.push(`${colors[i]} ${angle}deg ${angle+size}deg`);angle+=size;}});slices.push(`#302b37 ${angle}deg 360deg`);$('day-ring').style.background=`conic-gradient(${slices.join(',')})`;
    playSound();return;
  }
  if(action==='intro-next'){introSlide=Math.min(2,introSlide+1);render();playSound('card');return;}
  if(action==='toggle-wish'){update(s=>{const run=activeGame(s),wish=wishes[Number(target.dataset.wishIndex)];run.desires??=[];run.desires=run.desires.includes(wish)?run.desires.filter(x=>x!==wish):[...run.desires,wish];},'');playSound('card');return;}
  if(action==='remove-custom-wish'){update(s=>{const run=activeGame(s),custom=(run.desires||[]).filter(x=>!wishes.includes(x));run.desires=run.desires.filter(x=>x!==custom[Number(target.dataset.customIndex)]);},'');return;}
  if(action==='desire-next'){const run=activeGame(state);if(!run.desires?.length){$('wish-error').textContent='Выбери хотя бы одно желание';return;}update(s=>{activeGame(s).desireStep=1;},'');playSound('step');return;}
  if(action==='desire-back'){update(s=>{activeGame(s).desireStep=0;},'');return;}
  if(action==='focus-wish'){const run=activeGame(state),goal=run.desires[Number(target.dataset.wishIndex)];if(update(s=>chooseWishes(activeGame(s),run.desires,goal),''))playSound('step');return;}
  if(action==='skip-practice'){update(s=>skipPractice(activeGame(s),Date.now()),'');return;}
  if(action==='active-node'){document.getElementById('active-scene')?.scrollIntoView({behavior:'smooth',block:'start'});playSound('step');return;}
  if(action==='history-node'){const entry=activeGame(state)?.history.find(h=>h.kind==='choice'&&h.step===Number(target.dataset.step));if(entry){$('journey-review-content').innerHTML=`<p class="eyebrow">ТВОЕ ПРОШЛОЕ РЕШЕНИЕ</p><h2>${esc(entry.title)}</h2><p><strong>${esc(entry.choice)}</strong></p><p>${esc(entry.explanation)}</p><p>Время события: ${entry.cost} мин. Для желания: ${entry.goalAfter??'—'} мин.</p>`;$('journey-review').showModal();playSound('card');}return;}
  if(action==='start'||action==='replay'){
    if(!state.profile.passport){if(update(s=>{s.passportDraft=newPassportDraft(s.profile,true);},'')){location.hash='passport';render();}return;}
    introSlide=0;if(update(s=>{s.gameRuns??=[];const run=newRun(id(),Date.now(),s.gameRuns.length);run.schedule={...s.profile.passport.schedule};run.desires=[...s.profile.passport.desires];run.prime={focus:s.profile.passport.focus,complex:s.profile.passport.complex,slump:s.profile.passport.slump,energyHours:s.profile.passport.energyHours,unknown:s.profile.passport.primeUnknown};run.rhythm=s.profile.passport.rhythm;s.gameRuns.push(run);s.activeRun=run.id;},'')){location.hash='play';render();playSound('step');}return;
  }
  if(action==='resume'){if(target.dataset.id&&target.dataset.id!==state.activeRun)update(s=>{s.activeRun=target.dataset.id;},'');location.hash='play';render();return;}
  if(action==='advance'){update(s=>{const run=activeGame(s);advance(run,Date.now());recordGameResult(s,run);},'');playSound('step');}
  if(action==='choose'){update(s=>applyChoice(activeGame(s),target.dataset.scene,Number(target.dataset.choice),Date.now()),'');playSound('card');}
  if(action==='bridge'){
    const run=activeGame(state),existing=state.tasks.find(t=>t.sourceRunId===run.id);openEditor(existing);
    if(!existing){const f=$('task-form');f.dataset.gameRun=run.id;f.elements.title.value=run.practice.action;f.elements.duration.value=run.practice.minutes;f.elements.category.value='Хочу';}
  }
});
document.addEventListener('input',event=>{
  if(event.target.closest('#passport-sleep-form')){const form=$('passport-sleep-form');try{const n=sleepWindow(form.elements.bed.value,form.elements.wake.value);const text=form.querySelector('p strong');if(text)text.textContent=`${Math.floor(n/60)} ч ${n%60} мин`;}catch{}return;}
  if(event.target.closest('#passport-day-form')){const form=$('passport-day-form'),draft=state.passportDraft,custom=draft.custom.reduce((n,c)=>n+c.minutes,0),values=Object.fromEntries(new FormData(form)),parts=[draft.averageSleep],colors=['#e9bb66','#dc418c','#6b91e6','#9c70cd','#f07865','#d4a46c','#b9ad68','#7daaa3','#6bc29a','#925cb7','#f3dc81','#74717e','#f7d990'];DAY_ACTIVITIES.filter(([key])=>key!=='sleep').forEach(([key])=>parts.push(Number(values[`${key}Hours`]||0)*60+Number(values[`${key}Minutes`]||0)+(key==='other'?custom:0)));const used=parts.reduce((n,v)=>n+v,0);$('passport-used').textContent=`${Math.floor(used/60)} ч ${used%60} мин`;$('passport-unknown').textContent=used<=1440?`Не учтено: ${Math.floor((1440-used)/60)} ч ${(1440-used)%60} мин`:`Превышение: ${used-1440} мин`;let angle=0;const slices=[];parts.forEach((n,i)=>{const width=n/1440*360;if(width>0){slices.push(`${colors[i]} ${angle}deg ${angle+width}deg`);angle+=width;}});slices.push(`#302b37 ${angle}deg 360deg`);$('passport-ring').style.background=`conic-gradient(${slices.join(',')})`;return;}
  if(!event.target.closest('#game-plan-form'))return;
  const form=document.getElementById('game-plan-form'),names=['sleep','work','duties','rest','wishes','joy'];
  const used=names.reduce((n,key)=>n+Number(form.elements[key].value||0),0);
  $('game-budget-preview').textContent=used<=1440?`Резерв: ${1440-used} мин · всего 24 часа`:`За пределами дня: ${used-1440} мин. Пересмотри распределение`;
});
document.addEventListener('submit',event=>{
  const form=event.target;if(!(form instanceof HTMLFormElement))return;event.preventDefault();const values=Object.fromEntries(new FormData(form)),formId=form.getAttribute('id');
  if(formId==='passport-sleep-form'){update(s=>setSleep(s.passportDraft,values),'');return;}
  if(formId==='passport-day-form'){update(s=>setDay(s.passportDraft,values),'');return;}
  if(formId==='passport-rhythm-form'){update(s=>setRhythm(s.passportDraft,values.rhythm),'');return;}
  if(formId==='passport-prime-form'){update(s=>setPrime(s.passportDraft,values),'');return;}
  if(formId==='passport-wishes-form'){
    const desires=new FormData(form).getAll('desire');
    if(update(s=>{const draft=s.passportDraft,passport=finishPassport(draft,desires,values.customWish);s.profile.passport=passport;s.profile.bed=passport.bed;s.profile.wake=passport.wake;s.passportDraft=null;if(draft.returnToGame){s.gameRuns??=[];const run=newRun(id(),Date.now(),s.gameRuns.length);run.schedule={...passport.schedule};run.desires=[...passport.desires];run.prime={focus:passport.focus,complex:passport.complex,slump:passport.slump,energyHours:passport.energyHours,unknown:passport.primeUnknown};run.rhythm=passport.rhythm;s.gameRuns.push(run);s.activeRun=run.id;}},'Паспорт времени сохранен')){location.hash=state.activeRun&&state.gameRuns?.at(-1)?.id===state.activeRun?'play':'passport';render();playSound('step');}return;
  }
  if(formId==='chapter-setup-form'){if(update(s=>prepareChapter(s.chapterRuns.find(r=>r.id===s.activeChapter),values.focus),''))playSound('step');return;}
  if(formId==='game-plan-form'){
    if(activeGame(state)?.mode==='journey-v2'){
      try{const {allocation,detail}=scheduleToAllocation(values);if(update(s=>startDay(activeGame(s),allocation,null,detail),''))playSound('step');}catch(error){$('game-form-error').textContent=error.message;}
    }else update(s=>startDay(activeGame(s),values,values.goal),'');return;
  }
  if(formId==='custom-wish-form'){const wish=String(values.wish||'').trim();if(!wish)return;update(s=>{const run=activeGame(s);run.desires??=[];if(!run.desires.includes(wish))run.desires.push(wish);},'');playSound('card');return;}
  if(formId==='game-practice-form'){
    update(s=>{const run=activeGame(s);completePractice(run,values.note,values.action,Number(values.minutes),Date.now());const today=dateInZone(Date.now(),s.profile.zone),m=monthRecord(s,today.slice(0,7));s.cardRuns.push({id:id(),cardId:run.practice.cardId,date:today,note:run.practice.note,month:today.slice(0,7),gameRun:run.id});if(!m.cards.includes(run.practice.cardId))m.cards.push(run.practice.cardId);},'');return;
  }
  if(formId==='task-form'){
    try{const old=state.tasks.find(t=>t.id===values.id),task=validateTask({id:values.id||id(),title:values.title,start:zonedInstant(values.date,values.time,state.profile.zone,values.occurrence),duration:Number(values.duration),category:values.category,occurrence:values.occurrence,done:old?.done||false,joy:old?.joy??null,sourceRunId:old?.sourceRunId||form.dataset.gameRun||null});if(update(s=>{const index=s.tasks.findIndex(t=>t.id===task.id);if(index<0)s.tasks.push(task);else s.tasks[index]=task;}))$('editor').close();}catch(error){$('form-error').textContent=error.message;}return;
  }
  if(formId==='goal-form')update(s=>monthRecord(s).goals.push({id:id(),title:values.title.trim(),done:false}));
  if(formId==='month-form')update(s=>Object.assign(monthRecord(s),values));
  if(formId==='habit-form')update(s=>{const m=monthRecord(s);if(m.habits.length>=3)throw Error('Не более трех привычек');m.habits.push({id:id(),title:values.title.trim(),goal:values.goal,start:`${month}-01`,weekdays:values.frequency==='daily'?[0,1,2,3,4,5,6]:[1,3,5],checks:[]});});
  if(formId==='card-form')update(s=>{const today=dateInZone(Date.now(),s.profile.zone),runMonth=today.slice(0,7),m=monthRecord(s,runMonth);s.cardRuns.push({id:id(),cardId:selectedCard,date:today,note:values.note,month:runMonth});if(!m.cards.includes(selectedCard))m.cards.push(selectedCard);grantReward(s,`card:${selectedCard}`,3,'Первое выполнение карточки',today);});
  if(formId==='profile-form')update(s=>{new Intl.DateTimeFormat('ru-RU',{timeZone:values.zone}).format();dayStats([],date,values.zone,{bed:values.bed,wake:values.wake});Object.assign(s.profile,values);});
});
document.addEventListener('click',event=>{
  const target=event.target.closest('[data-action],[data-month]');if(!target)return;
  if(target.dataset.month){month=target.dataset.month;year=Number(month.slice(0,4));if(target.tagName==='a'){render();return;}}
  const {action,id:taskId}=target.dataset;
  if(action==='add')openEditor();
  if(action==='past-run') {if(update(s=>{s.activeRun=taskId;},'Открыто сохраненное прохождение')){location.hash='play';render();}}
  if(action==='past-chapter'){if(update(s=>{s.activeChapter=taskId;},'Открыта сохраненная глава')){location.hash='chapter';render();}}
  if(action==='edit')openEditor(state.tasks.find(t=>t.id===taskId));
  if(action==='delete')update(s=>{s.tasks=s.tasks.filter(t=>t.id!==taskId);});
  if(action==='done')update(s=>{const t=s.tasks.find(t=>t.id===taskId);t.done=!t.done;if(t.done)grantReward(s,`task:${t.id}`,5,'Первое выполнение дела',date);});
  if(action==='close-day')update(s=>{if(date>dateInZone(Date.now(),s.profile.zone))throw Error('Будущий день еще не завершен');if(!dayStats(s.tasks,date,s.profile.zone).tasks.every(t=>t.done))throw Error('Сначала выполни дела или перенеси оставшиеся');grantReward(s,`day:${date}`,10,'Завершение дня',date);},'День завершен. Спасибо за внимание к себе');
  if(action==='prev-week'||action==='next-week'){date=shiftDate(date,action==='prev-week'?-7:7);render();}
  if(action==='choose-day'){date=target.dataset.date;location.hash='day';render();}
  if(action==='prev-year'||action==='next-year'){year+=action==='prev-year'?-1:1;month=`${year}-${month.slice(5)}`;render();}
  if(action==='select-month'||action==='open-month'){location.hash='month';render();}
  if(action==='card'){selectedCard=taskId;render();window.scrollTo(0,0);}
  if(action==='cards-back'){selectedCard=null;render();}
  if(action==='favorite')update(s=>{s.favorites=s.favorites.includes(taskId)?s.favorites.filter(c=>c!==taskId):[...s.favorites,taskId];});
  if(action==='plan-card'){openEditor();$('task-form').elements.title.value=cards.find(c=>c.id===taskId).title.slice(0,200);}
  if(action==='habit')update(s=>{const h=monthRecord(s).habits.find(h=>h.id===taskId),d=target.dataset.date;h.checks=h.checks.includes(d)?h.checks.filter(x=>x!==d):[...h.checks,d];});
  if(action==='backup'){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`MasterTime-${dateInZone(Date.now(),state.profile.zone)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
});
document.addEventListener('change',event=>{const t=event.target;
  if(t.id==='day-date'&&t.value){date=t.value;render();}
  if(t.id==='month-select'&&t.value){month=t.value;year=Number(month.slice(0,4));render();}
  if(t.id==='search'){search=t.value;render();}
  if(t.id==='filter'){favoritesOnly=t.value==='favorites';render();}
  if(t.dataset.joy)update(s=>{s.tasks.find(task=>task.id===t.dataset.joy).joy=t.value?Number(t.value):null;});
  if(t.dataset.goal)update(s=>{const goal=monthRecord(s).goals.find(g=>g.id===t.dataset.goal);goal.done=t.checked;});
});
window.addEventListener('hashchange',render);
try{const response=await fetch('./data/cards.json');if(!response.ok)throw Error('Не удалось загрузить каталог');cards=await response.json();}catch(error){notify(error.message);}
// Close existing past months once, based on saved records, when the app is opened.
const past=Object.keys(state.months).filter(m=>m<dateInZone(Date.now(),state.profile.zone).slice(0,7)&&!state.chapters[m]);
if(past.length&&!storageError)update(s=>past.forEach(m=>closeMonth(s,m,Date.now())),'Главы завершенных месяцев добавлены в книгу');
render();
