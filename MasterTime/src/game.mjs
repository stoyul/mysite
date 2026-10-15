import scenarios from '../data/game-scenarios.mjs';
export const BUDGET=1440;
export const ALLOCATION=[['sleep','Сон'],['work','Работа'],['duties','Обязанности'],['rest','Отдых'],['wishes','Моя цель'],['joy','Радость']];
export const DEFAULT_PLAN={sleep:480,work:480,duties:120,rest:60,wishes:60,joy:60};
export const RESOURCE_LABELS={energy:'Энергия',attention:'Внимание',joy:'Радость',freedom:'Свобода',crystals:'Кристаллы'};
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
export function validateAllocation(input){
  const plan=Object.fromEntries(ALLOCATION.map(([key])=>[key,Number(input[key])]));
  if(Object.values(plan).some(n=>!Number.isInteger(n)||n<0||n>BUDGET))throw Error('Введи целые минуты от 0 до 1440');
  const used=Object.values(plan).reduce((a,b)=>a+b,0);
  if(used>BUDGET)throw Error(`В сутках 1440 минут. Убери еще ${used-BUDGET} мин`);
  if(plan.sleep===0)throw Error('Предусмотри время для сна');
  if(plan.wishes<15)throw Error('Выдели хотя бы 15 минут своей цели');
  return {...plan,buffer:BUDGET-used};
}
export function newRun(runId,at,variant=0){return {id:runId,startedAt:at,variant,phase:'intro',step:0,allocation:null,initialAllocation:null,goal:'',resources:{energy:70,attention:70,joy:50,freedom:60,crystals:0},history:[],overload:0,practice:null,achievements:[],eventsMinutes:0,displaced:[],completedAt:null};}
export function startDay(run,input,goal){
  if(run.phase!=='plan')throw Error('Сейчас другой этап игры');
  if(!goal?.trim()||goal.trim().length>200)throw Error('Назови свою цель: до 200 символов');
  run.allocation=validateAllocation(input);run.initialAllocation=structuredClone(run.allocation);run.goal=goal.trim();
  // These are disclosed game points, not an estimate of actual wellbeing.
  if(run.allocation.sleep<420){run.resources.energy=55;run.history.push({kind:'setup',explanation:'Менее 7 часов сна в условном сценарии: начальная энергия 55 вместо 70.'});}
  run.phase='scene';
}
export function currentScene(run){
  if(!run.allocation)return null;
  if(run.step===0)return scenarios[run.variant%2===0?0:4];
  if(run.step===1)return scenarios[1];
  if(run.step===2){
    if(run.overload>=2||run.resources.energy<55)return run.initialAllocation.sleep<420?scenarios[5]:{...scenarios[5],title:'🛌 Накопленная усталость',description:'Предыдущие решения добавили нагрузку. Сил стало меньше, а оставшиеся планы требуют внимания. Как ты пересмотришь день?'};
    return scenarios[6];
  }
  return scenarios[run.resources.attention<50?0:7];
}
export function consumeTime(run,cost,label){
  if(!Number.isInteger(cost)||cost<0)throw Error('Некорректная длительность события');
  const available=run.allocation.buffer+['wishes','joy','rest','work','duties'].reduce((n,k)=>n+run.allocation[k],0);
  if(cost>available)throw Error('В дне нет столько времени без сокращения сна. Выбери другой вариант');
  let remaining=cost;const shifts=[];
  for(const key of ['buffer','wishes','joy','rest','work','duties']){
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
  const before=structuredClone(run.resources),shifts=consumeTime(run,choice.cost,choice.label);
  for(const key of ['energy','attention','joy','freedom'])run.resources[key]=clamp(run.resources[key]+choice[key]);
  run.resources.crystals=Math.max(0,run.resources.crystals+choice.crystals);run.overload+=choice.overload;
  const delta=Object.fromEntries(Object.keys(before).map(key=>[key,run.resources[key]-before[key]]));
  run.history.push({kind:'choice',step:run.step,sceneId:scene.id,title:scene.title,choice:choice.label,explanation:choice.explanation,cause:CHOICE_CAUSES[scene.id]?.[index]||choice.explanation,cost:choice.cost,delta,shifts,at});
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
  if(run.step===3){run.phase='result';run.completedAt=at;run.achievements=['Первый прожитый день'];
    if(run.allocation.wishes>=15)run.achievements.push('Мастер приоритетов');
    if(run.overload===0&&run.allocation.rest>=30)run.achievements.push('Защитник отдыха');
    if(run.practice)run.achievements.push('От мысли к действию');return;}
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
export function timeTotal(run){return run.allocation?Object.values(run.allocation).reduce((a,b)=>a+b,0)+run.eventsMinutes:0;}
export function gameProgress(run){if(!run)return 0;if(run.phase==='result')return 100;return Math.round(run.history.filter(h=>h.kind==='choice').length/4*100);}
export function recommendation(run){
  if(run.overload>=2)return 'Ты часто добавляла дела поверх плана. В следующем прохождении сохрани больший резерв или договорись о других сроках.';
  if(run.allocation.wishes<15)return 'События вытеснили время твоей цели. Попробуй увеличить резерв или защитить свой рабочий блок.';
  return 'Тебе удалось защитить время для своей цели. Перенеси небольшой шаг в реальный план и посмотри, как он впишется в день.';
}
