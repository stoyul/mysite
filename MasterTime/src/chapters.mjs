// Simulation chapters: choices affect only game state, never overwrite real calendar records.
export const CHAPTERS={
  week:{title:'Моя неделя',unit:'дней',mission:'Сохрани три получасовых блока для желания и два периода отдыха.',threshold:3,restTarget:2,
    nodes:[
      ['Понедельник','Неделя начинается с новых просьб. Один час еще свободен.','Оставить полчаса для желания и согласовать срок','Заполнить час чужими просьбами'],
      ['Вторник','После работы зовут на встречу. Сил уже меньше.','Назначить встречу на удобное время и отдохнуть','Согласиться сразу и отменить паузу'],
      ['Среда','Задача затянулась. В календаре есть полчаса тишины.','Защитить этот блок для важного шага','Продолжить работу без нового срока'],
      ['Четверг','Тебе предложили помочь с чужим проектом.','Помочь в пределах 30 минут и оставить время себе','Взять весь проект без оценки времени'],
      ['Пятница','Соблазн доделывать все до идеала усилился.','Остановиться по ясному критерию и восстановиться','Переделывать уже готовое вечером'],
      ['Суббота','Близкие зовут провести время вместе.','Быть рядом и оставить небольшой личный блок','Сделать вид, что сил хватает на все'],
      ['Воскресенье','Перед новой неделей хочется заполнить каждый пробел.','Оставить место для отдыха и одного желания','Составить плотное расписание без резерва']
    ]},
  month:{title:'Мой месяц',unit:'недель',mission:'Повтори маленький шаг каждую неделю и сохрани два блока восстановления.',threshold:4,restTarget:2,
    nodes:[
      ['Первая неделя','В начале месяца новая привычка кажется легкой.','Выбрать посильный шаг и записать его в календарь','Взять сразу слишком много задач'],
      ['Вторая неделя','Один день выпал из привычного ритма.','Вернуться к маленькому шагу без самокритики','Объявить попытку неудачной и бросить'],
      ['Третья неделя','Усталость накопилась. Время на восстановление можно защитить.','Сохранить паузу и продолжить в своем темпе','Заполнить паузу дополнительной работой'],
      ['Четвертая неделя','Месяц заканчивается. Что взять с собой дальше?','Повторить работающий шаг и отметить открытие','Начать все заново, не заметив пройденное']
    ]},
  year:{title:'Мой год',unit:'месяцев',mission:'Прими решения в каждом месяце и сохрани восемь месяцев для важных целей и восстановления.',threshold:8,restTarget:4,
    nodes:[
      ['Январь','Год начинается с больших ожиданий.','Выбрать одно главное направление','Обещать себе изменить все сразу'],
      ['Февраль','Повседневные дела вытесняют январское решение.','Вернуть небольшой еженедельный блок','Отложить желание до свободного месяца'],
      ['Март','Появилась новая возможность учиться.','Сверить нагрузку и выделить подходящее время','Добавить курс поверх всех обязательств'],
      ['Апрель','Весна приносит больше встреч и приглашений.','Выбрать те, что приносят радость','Согласиться на каждую встречу'],
      ['Май','Сил стало меньше, хотя планы растут.','Оставить время на отдых','Продолжить без паузы'],
      ['Июнь','Полгода близко. Первый замысел уже изменился.','Обновить цель по нынешним ценностям','Держаться за старый план любой ценой'],
      ['Июль','Лето обещает свободные дни.','Подарить часть дня близким и себе','Заполнить все дни делами'],
      ['Август','Тебе предлагают новый проект.','Обсудить сроки и границы','Взять проект без оценки времени'],
      ['Сентябрь','Возвращается привычный быстрый ритм.','Сохранить повторяющийся личный час','Отменить свой час до конца осени'],
      ['Октябрь','Один из планов не сбылся.','Замечать сделанное и выбрать следующий шаг','Считать весь год неудачей'],
      ['Ноябрь','Появилось чувство усталости.','Упростить расписание и восстановиться','Добавить новые обязательства'],
      ['Декабрь','Ты видишь прожитый год целиком.','Собрать важные открытия и оставить место новому','Смотреть только на несделанное']
    ]}
};
export const CHAPTER_ORDER=['week','month','year'];
export function chapterUnlocked(state,kind){return CHAPTER_ORDER.includes(kind);}
export function newChapter(kind,runId,at,goal=''){if(!CHAPTERS[kind])throw Error('Неизвестная глава');return {id:runId,kind,startedAt:at,phase:kind==='week'?'scene':'setup',goal,step:0,resources:{energy:70,joy:50,freedom:60},progress:0,rest:0,history:[],completedAt:null};}
export function prepareChapter(run,focus){if(run.phase!=='setup')throw Error('Глава уже началась');const value=String(focus||'').trim();if(!value||value.length>100)throw Error('Напиши короткое название: до 100 символов');run.focus=value;run.phase='scene';}
export function chapterScene(run){const config=CHAPTERS[run.kind],node=config.nodes[run.kind==='year'&&run.experienceVersion===3?run.step*3:run.step];if(!node)return null;
  if(run.kind==='year'&&run.experienceVersion===3){const quarter=config.nodes.slice(run.step*3,run.step*3+3),last=run.history.at(-1);return {label:`${quarter[0][0]} — ${quarter[2][0]}`,situation:`Перед тобой три месяца. ${quarter.map(n=>n[1]).join(' ')} ${run.resources.energy<45?'После прежних решений сил стало меньше.':''}`,followUp:last?`Прошлый выбор: «${last.choice}». Он изменил запас сил и место для важного.`:'Это первый поворот года.',options:[
    {title:'Защитить один важный шаг в каждом месяце',reason:'Три небольших решения сохраняют направление и дают один период восстановления.',progress:3,rest:1,delta:{energy:2,joy:3,freedom:4}},
    {title:'Согласиться на все, не меняя прежний план',reason:'Новые обязательства добавляются поверх старых; запас сил уменьшается.',progress:0,rest:0,delta:{energy:-9,joy:-5,freedom:-7}},
    {title:'Выбрать два месяца для цели и пересмотреть третий',reason:'Ты сохраняешь два шага, но оставляешь меньше места для восстановления.',progress:2,rest:0,delta:{energy:-3,joy:1,freedom:2}}
  ]};}
  const base={label:node[0],situation:run.resources.energy<45?`${node[1]} Ты ощущаешь усталость после прежних решений.`:node[1],followUp:run.history.length?`Предыдущий выбор: «${run.history.at(-1).choice}». ${run.resources.energy<45?'Накопленная нагрузка сузила доступные силы.':'Посмотри, сколько сил осталось.'}`:'Первое решение задаст ритм главы.',options:[
  {title:node[2],progress:1,rest:run.kind==='week'?[1,2,4,6].includes(run.step)?1:0:run.kind==='month'?[1,2].includes(run.step)?1:0:[3,4,6,10].includes(run.step)?1:0,delta:{energy:4,joy:4,freedom:5}},
  {title:node[3],progress:0,rest:0,delta:{energy:-12,joy:-6,freedom:-8}}
]};if(run.experienceVersion===3)base.options.push({title:run.kind==='week'?'Согласовать помощь на ограниченное время':'Сделать посильную часть и вернуться к привычке',reason:'Ты ищешь промежуточное решение: шаг остается, но восстановление придется спланировать отдельно.',progress:1,rest:0,delta:{energy:-2,joy:2,freedom:1}});return base;}
export function chooseChapter(run,index,at){if(run.phase!=='scene')throw Error('Решение уже принято');const scene=chapterScene(run),choice=scene?.options[index];if(!choice)throw Error('Выбери решение');
  const months=run.kind==='year'&&run.experienceVersion===3?CHAPTERS.year.nodes.slice(run.step*3,run.step*3+3):[null];
  months.forEach((month,i)=>{const before={...run.resources};for(const key of Object.keys(before))run.resources[key]=Math.max(0,Math.min(100,before[key]+choice.delta[key]));const progress=month&&index===2?(i===1?0:1):month?(index===0?1:0):choice.progress,rest=month?(index===0&&i===2?1:0):choice.rest;run.progress+=progress;run.rest+=rest;run.history.push({step:run.step,label:month?.[0]||scene.label,situation:month?.[1]||scene.situation,choice:choice.title,reason:choice.reason||'Это решение меняет нагрузку и оставшееся пространство для важного.',progress,rest,delta:Object.fromEntries(Object.keys(before).map(k=>[k,run.resources[k]-before[k]])),at});});run.phase='consequence';}
export function advanceChapter(run,at){if(run.phase!=='consequence')throw Error('Сначала сделай выбор');const length=run.kind==='year'&&run.experienceVersion===3?4:CHAPTERS[run.kind].nodes.length;if(run.step+1===length){run.phase='result';run.completedAt=at;}else{run.step++;run.phase='scene';}}
export function chapterWon(run){const config=CHAPTERS[run.kind];return run.progress>=config.threshold&&run.rest>=config.restTarget;}
export function chapterReward(run){return 10+run.history.length+(chapterWon(run)?5:0);}
export function chapterInsight(run){const total=run.history.length,overloaded=run.history.filter(h=>h.delta.energy<0).length,focus=run.focus||run.goal||'важного для тебя';const rhythm=run.kind==='year'?'месяцах':run.kind==='week'?'днях':'неделях';return `В ${run.progress} из ${total} ${rhythm} ты сохранила шаг для «${focus}»; ${run.rest} раза оставила место восстановлению. ${overloaded?`В ${overloaded} решениях запас сил уменьшился.`:'В этой главе решения не уменьшили запас сил.'} Это результат выбранных игровых стратегий, а не оценка твоих привычек в жизни.`;}
