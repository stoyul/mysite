import scenarios from '../data/game-scenarios.mjs';
export const BUDGET=1440;
export const ALLOCATION=[['sleep','Сон'],['work','Работа'],['duties','Обязанности'],['rest','Отдых'],['wishes','Моя цель'],['joy','Радость']];
export const DEFAULT_PLAN={sleep:480,work:480,duties:120,rest:60,wishes:60,joy:60};
export const RESOURCE_LABELS={energy:'Энергия',attention:'Внимание',joy:'Радость',freedom:'Свобода',crystals:'Кристаллы'};
export const DAY_ACTIVITIES=[
  ['sleep','Сон','🌙',480],['work','Работа','💼',480],['commute','Дорога','🚆',30],
  ['home','Домашние дела','🏠',30],['family','Дети и семья','🤍',60],['cooking','Приготовление еды','🍲',30],
  ['shopping','Покупки','🛍️',0],['learning','Обучение','📚',0],['rest','Отдых','🌿',60],
  ['social','Социальные сети','📱',30],['personal','Личное время','✨',0],['other','Другие занятия','✦',0],['free','Проверенный резерв','⏳',60]
];
export const DEFAULT_SCHEDULE=Object.fromEntries(DAY_ACTIVITIES.map(([key,,,minutes])=>[key,minutes]));
export function scheduleToAllocation(schedule){
  const detail=Object.fromEntries(DAY_ACTIVITIES.map(([key])=>[key,Number(schedule[key])]));
  if(Object.values(detail).some(n=>!Number.isInteger(n)||n<0||n>1440||n%15!==0))throw Error('Выбирай время с шагом 15 минут');
  const used=Object.values(detail).reduce((n,v)=>n+v,0);
  if(used>1440)throw Error(`В сутках 24 часа. Убери ${used-1440} мин из распорядка`);
  return {allocation:{sleep:detail.sleep,work:detail.work,duties:detail.commute+detail.home+detail.family+detail.cooking+detail.shopping+detail.other,rest:detail.rest,wishes:detail.personal+detail.learning,joy:detail.social,unaccounted:1440-used},detail};
}
const SAVED_MINUTES={'source-0':[0,15,5],'source-1':[0,10,5],'source-2':[0,5,0],'source-3':[0,10,0],'source-4':[0,5,0],'source-5':[0,10,0],'source-6':[0,5,0],'source-7':[0,10,0]};
const CHOICE_CAUSES={
  'source-0':['Лента заняла защищенный час и отложила твою цель.','Ты убрала отвлечение и сохранила время для первого шага.','Короткая пауза была ограничена заранее и помогла восстановиться.'],
  'source-1':['Разговор занял весь час без проверки срочности.','Ты проявила заботу и сохранила границу для своей задачи.','Ты помогла, заранее обозначив предел разговора.'],
  'source-2':['Неотложное обязательство осталось нерешенным.','Ты освободила место для встречи и оставила запас.','Ты добавила встречу, но не уменьшила остальные ожидания от дня.'],
  'source-3':['Ты взяла дополнительную работу поверх уже важных планов.','Ты защитила отдых и предложила реалистичный срок.','Ты отказалась сразу, не выяснив, что действительно требуется.'],
  'source-4':['Новая учеба добавилась к прежнему расписанию без свободного места.','Ты сверила календарь и освободила время для обучения.','Возможность отложена без следующего конкретного шага.'],
  'source-5':['Ты продолжила день без восстановления, несмотря на усталость.','Ты оставила главное и запланировала восстановление.','Ты остановилась резко, не отделив срочное от необязательного.'],
  'source-6':['Автоматический отказ закрыл возможность для радости.','Ты сопоставила прогулку со своими приоритетами и нашла час.','Ты отменила обязательства, не проверив последствия.'],
  'source-7':['Повторная переделка потратила время без нового критерия качества.','Ты проверила критерии и позволила себе закончить.','Ты удалила сделанное вместо спокойной оценки результата.']
};
const clamp=n=>Math.max(0,Math.min(100,n));
export function validateAllocation(input,{allowEmptyGoal=false}={}){
  const plan=Object.fromEntries(ALLOCATION.map(([key])=>[key,Number(input[key])]));
  if(Object.values(plan).some(n=>!Number.isInteger(n)||n<0||n>BUDGET))throw Error('Введи целые минуты от 0 до 1440');
  const unaccounted=Number(input.unaccounted||0);
  if(!Number.isInteger(unaccounted)||unaccounted<0||unaccounted>BUDGET)throw Error('Некорректное неучтенное время');
  const used=Object.values(plan).reduce((a,b)=>a+b,0)+unaccounted;
  if(used>BUDGET)throw Error(`В сутках 1440 минут. Убери еще ${used-BUDGET} мин`);
  if(plan.sleep===0)throw Error('Предусмотри время для сна');
  if(!allowEmptyGoal&&plan.wishes<15)throw Error('Выдели хотя бы 15 минут своей цели');
  return {...plan,...(unaccounted?{unaccounted}:{}),buffer:BUDGET-used};
}
export function newRun(runId,at,variant=0){return {id:runId,startedAt:at,variant,mode:'journey-v2',phase:'intro',step:0,allocation:null,initialAllocation:null,schedule:null,desires:[],desireStep:0,goal:'',missionAwarded:false,resources:{energy:70,attention:70,joy:50,freedom:60,crystals:0},history:[],overload:0,practice:null,achievements:[],eventsMinutes:0,displaced:[],completedAt:null};}
export function startDay(run,input,goal,detail=null){
  if(run.phase!=='plan')throw Error('Сейчас другой этап игры');
  const chooseLater=goal==null;
  if(!chooseLater&&(!goal?.trim()||goal.trim().length>200))throw Error('Назови свою цель: до 200 символов');
  run.allocation=validateAllocation(input,{allowEmptyGoal:chooseLater});run.initialAllocation=structuredClone(run.allocation);run.goal=chooseLater?'':goal.trim();run.schedule=detail?structuredClone(detail):run.schedule;
  // These are disclosed game points, not an estimate of actual wellbeing.
  if(run.allocation.sleep<420){run.resources.energy=55;run.history.push({kind:'setup',explanation:'Менее 7 часов сна в условном сценарии: начальная энергия 55 вместо 70.'});}
  run.initialResources=structuredClone(run.resources);
  run.phase=chooseLater?'wishes':'scene';
}
export function chooseWishes(run,desires,goal){
  if(run.phase!=='wishes')throw Error('Сейчас другой этап игры');
  const unique=[...new Set(desires.map(s=>String(s).trim()).filter(Boolean))];
  if(!unique.length||unique.some(s=>s.length>200)||!unique.includes(goal))throw Error('Выбери желание и первые 15 минут для него');
  run.desires=unique;run.goal=goal;run.phase='scene';awardFirstMinutes(run);
}
function awardFirstMinutes(run){
  if(run.mode!=='journey-v2'||run.missionAwarded||run.allocation.wishes<15)return false;
  run.missionAwarded=true;run.resources.crystals+=5;run.achievements.push('Первые 15 минут');return true;
}
export function currentScene(run){
  if(!run.allocation)return null;
  let scene;
  if(run.step===0)scene=scenarios[run.variant%2===0?0:4];
  else if(run.step===1)scene=scenarios[1];
  if(run.step===2){
    if(run.overload>=2||run.resources.energy<55)scene=run.initialAllocation.sleep<420?scenarios[5]:{...scenarios[5],title:'🛌 Накопленная усталость',description:'Предыдущие решения добавили нагрузку. Сил стало меньше, а оставшиеся планы требуют внимания. Как ты пересмотришь день?'};
    else scene=scenarios[6];
  }
  if(run.step>=3)scene=scenarios[run.resources.attention<50?0:7];
  if(run.mode==='journey-v2'&&run.prime&&!run.prime.unknown){const hour=Number(run.prime.focus?.slice(0,2)),periods=[[6,12],[12,15],[15,19],[19,24]],range=periods[run.step];if(range&&hour>=range[0]&&hour<range[1])return {...scene,description:`${scene.description} Сейчас близко к твоему Prime Time (${run.prime.focus}). Если потратить его на отвлечение, сложный шаг придется перенести.`};}
  return scene;
}
export function consumeTime(run,cost,label){
  if(!Number.isInteger(cost)||cost<0)throw Error('Некорректная длительность события');
  const order=run.mode==='journey-v2'?['buffer','joy','wishes']:['buffer','wishes','joy','rest','work','duties'];
  const available=order.reduce((n,k)=>n+run.allocation[k],0);
  if(cost>available)throw Error('Для этого выбора не хватает свободных минут. Сон, отдых, работа и время семьи защищены. Выбери другой вариант');
  let remaining=cost;const shifts=[];
  for(const key of order){
    const moved=Math.min(run.allocation[key],remaining);run.allocation[key]-=moved;remaining-=moved;
    if(moved){shifts.push({category:key,minutes:moved,reason:label});if(key!=='buffer')run.displaced.push({category:key,minutes:moved,reason:label});}
    if(!remaining)break;
  }
  run.eventsMinutes+=cost;return shifts;
}
export function applyChoice(run,sceneId,index,at){
  if(run.phase!=='scene')throw Error('Решение уже принято. Продолжи историю');
  const scene=currentScene(run);if(scene.id!==sceneId)throw Error('Сцена уже изменилась');
  const choice=scene.choices[index];if(!choice)throw Error('Выбери один из предложенных вариантов');
  const before=structuredClone(run.resources),goalBefore=run.allocation.wishes,shifts=consumeTime(run,choice.cost,choice.label);
  const saved=run.mode==='journey-v2'?Math.min(SAVED_MINUTES[scene.id]?.[index]||0,run.allocation.buffer):0;
  if(saved){run.allocation.buffer-=saved;run.allocation.wishes+=saved;shifts.push({category:'to-goal',minutes:saved,reason:'Осознанно выделено для желания'});}
  for(const key of ['energy','attention','joy','freedom'])run.resources[key]=clamp(run.resources[key]+choice[key]);
  run.resources.crystals=Math.max(0,run.resources.crystals+choice.crystals);run.overload+=choice.overload;
  const missionUnlocked=awardFirstMinutes(run);
  const delta=Object.fromEntries(Object.keys(before).map(key=>[key,run.resources[key]-before[key]]));
  const primeHere=run.mode==='journey-v2'&&run.prime&&!run.prime.unknown&&scene.description.includes('Prime Time');
  run.history.push({kind:'choice',step:run.step,sceneId:scene.id,title:scene.title,choice:choice.label,explanation:choice.explanation,cause:(CHOICE_CAUSES[scene.id]?.[index]||choice.explanation)+(primeHere&&index===0?' Это затронуло часы твоей наибольшей ясности.':''),cost:choice.cost,saved,missionUnlocked,goalBefore,goalAfter:run.allocation.wishes,delta,shifts,at});
  run.phase='consequence';
}
export function recommendedPractice(run){
  if(run.overload>=2)return {id:'card-024',reason:'Ты дважды взяла дополнительную нагрузку. Попробуй практику личных границ.'};
  if(run.resources.attention<60)return {id:'card-017',reason:'Внимание снизилось после отвлечений. Исследуй своих похитителей времени.'};
  return {id:'card-022',reason:'Ты сохранила пространство для важного. Преврати цель в маленький следующий шаг.'};
}
export function advance(run,at){
  if(run.phase==='intro'){run.phase='plan';return;}
  if(run.phase==='practice-result'){run.phase='scene';run.step=2;return;}
  if(run.phase!=='consequence')throw Error('Сначала прими решение');
  if(run.step===1&&!run.practice){run.phase='practice';return;}
  if(run.step===3){run.phase='result';run.completedAt=at;run.achievements=[...new Set([...run.achievements,'Первый прожитый день'])];
    if(run.allocation.wishes>=15)run.achievements.push('Мастер приоритетов');
    if(run.overload===0&&run.allocation.rest>=30)run.achievements.push('Защитник отдыха');
    if(run.practice&&!run.practice.skipped)run.achievements.push('От мысли к действию');return;}
  run.step++;run.phase='scene';
}
export function completePractice(run,note,action,minutes,at){
  if(run.phase!=='practice'||run.practice)throw Error('Практика уже сохранена');
  if(!note?.trim()||!action?.trim()||note.length>4000||action.length>200)throw Error('Запиши открытие и один небольшой шаг');
  if(!Number.isInteger(minutes)||minutes<5||minutes>60)throw Error('Выбери от 5 до 60 минут для практики');
  const card=recommendedPractice(run),shifts=consumeTime(run,minutes,'Практика: '+action);
  const before=structuredClone(run.resources);run.resources.attention=clamp(run.resources.attention+6);run.resources.energy=clamp(run.resources.energy+4);run.resources.crystals+=3;
  run.practice={cardId:card.id,note:note.trim(),action:action.trim(),minutes,at};
  run.history.push({kind:'practice',title:'Маленький шаг',choice:action.trim(),explanation:'Практика заняла реальное время игрового дня. Условная награда: внимание +6, энергия +4, кристаллы +3.',cost:minutes,shifts,delta:Object.fromEntries(Object.keys(before).map(k=>[k,run.resources[k]-before[k]])),at});
  run.phase='practice-result';
}
export function skipPractice(run,at){
  if(run.phase!=='practice'||run.practice)throw Error('Сейчас нельзя пропустить практику');
  run.practice={skipped:true,minutes:0,at};
  run.history.push({kind:'practice',title:'Пауза без новых дел',choice:'Сохранить текущий план',explanation:'В гибком времени не осталось минут для нового действия. Сон и обязательства сохранены.',cost:0,shifts:[],delta:{energy:0,attention:0,joy:0,freedom:0,crystals:0},at});
  run.phase='practice-result';
}
export function timeTotal(run){return run.allocation?Object.values(run.allocation).reduce((a,b)=>a+b,0)+run.eventsMinutes:0;}
export function gameProgress(run){if(!run)return 0;if(run.phase==='result')return 100;return Math.round(run.history.filter(h=>h.kind==='choice').length/4*100);}
export function recommendation(run){
  if(run.overload>=2)return 'Ты часто добавляла дела поверх плана. В следующем прохождении сохрани больший резерв или договорись о других сроках.';
  if(run.allocation.wishes<15)return 'События вытеснили время твоей цели. Попробуй увеличить резерв или защитить свой рабочий блок.';
  return 'Тебе удалось защитить время для своей цели. Перенеси небольшой шаг в реальный план и посмотри, как он впишется в день.';
}
