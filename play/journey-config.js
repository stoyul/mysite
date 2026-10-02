/* Редактируемые тексты и визуальные сцены. Игровые маршруты хранятся отдельно. */
const journeySteps=[
 {name:'ТЕЛО',question:'ГДЕ МОЙ ЗАПРОС ПРОЯВЛЯЕТСЯ ВО МНЕ?',introQuestion:'ГДЕ МОЯ ПРОБЛЕМА?',text:'Тело помогает увидеть, на каком уровне проявляется внутреннее напряжение и что может стоять за твоим запросом.',intro:'Исследуй, как твой запрос проявляется в теле, эмоциях и внутренних программах.',visual:'body',result:'ТЫ УВИДЕЛА, ГДЕ ПРОЯВЛЯЕТСЯ ТВОЙ ЗАПРОС',bridge:'Но чего ты на самом деле хочешь?'},
 {name:'ПОТРЕБНОСТЬ',question:'ЧЕГО Я ХОЧУ НА САМОМ ДЕЛЕ?',text:'За желанием всегда стоит потребность. Понимая ее, ты можешь направить энергию в то, что тебе действительно нужно.',intro:'Найди истинную потребность, которая стоит за твоим желанием.',visual:'need',result:'ТЫ УВИДЕЛА СВОЮ ПОТРЕБНОСТЬ',bridge:'Но что внутри тебя мешает свободно двигаться к желаемому?'},
 {name:'ТЕНЬ → СИЛА',question:'ЧТО Я В СЕБЕ ОТРИЦАЮ?',text:'В отвергнутых качествах может находиться сила, которой тебе сейчас не хватает.',intro:'Найди скрытую в Тени силу, которая нужна тебе для движения вперед.',visual:'shadow',result:'ТО, ЧТО БЫЛО ТЕНЬЮ, МОЖЕТ СТАТЬ ТВОЕЙ СИЛОЙ',bridge:'Теперь ты увидела свою силу. Но где еще остается твоя энергия?'},
 {name:'ЭНЕРГИЯ',question:'ГДЕ СЕЙЧАС МОЯ ЭНЕРГИЯ?',introQuestion:'ГДЕ МОЯ ЭНЕРГИЯ?',text:'Исследуй, куда уходит твоя энергия, и верни себе то, что больше не хочешь тратить.',intro:'Увидь, куда уходит твоя энергия, и верни ее себе.',visual:'return',result:'ЭНЕРГИЯ ВОЗВРАЩАЕТСЯ К ТЕБЕ',bridge:'Энергия вернулась. Теперь главный вопрос — что ты будешь с ней делать?'},
 {name:'ТВОРЕНИЕ',question:'КУДА Я НАПРАВЛЮ СВОЮ ЭНЕРГИЮ?',introQuestion:'КУДА Я ЕЕ НАПРАВЛЮ?',text:'Ты исследовала свой запрос, потребности, Тень и источники энергии. Теперь преврати осознания в цель, выбор и действие.',intro:'Осознанно направь собранную энергию в свои цели, желания и улучшение своей жизни.',visual:'creation',result:'МОЯ ТОЧКА СИЛЫ',bridge:'Какой первый шаг ты сделаешь в реальной жизни?'}
];
const journeyTiming={opening:3000,benefit:10000,step:4000,final:3000,portal:1700};

/* Презентация строится по реально используемым типам клеток. */
const levelToolCatalog={
 diagnostic:{deck:'Диагностика',name:'ДИАГНОСТИКА',text:'Помогает исследовать телесные ощущения, эмоции и внутренние реакции, связанные с запросом.'},
 need:{deck:'Потребности',name:'ПОТРЕБНОСТИ',text:'Помогают понять, чего тебе на самом деле не хватает и что ты стремишься получить.'},
 shadow:{deck:'Тень ↔ Сила',name:'ТЕНЬ ↔ СИЛА',text:'Помогает увидеть отвергаемое качество и скрытую за ним силу.'},
 return:{deck:'Возвращение энергии',name:'ВОЗВРАЩЕНИЕ ЭНЕРГИИ',text:'Помогает найти способ вернуть себе часть ресурса.'},
 creation:{deck:'Творение',name:'ТВОРЕНИЕ',text:'Помогает определить, что ты хочешь создать вместо прежнего сценария.'},
 view:{deck:'Другой взгляд',name:'ДРУГОЙ ВЗГЛЯД',text:'Помогает посмотреть на запрос с другой стороны.'},
 archetype:{deck:'Богини / Архетипы силы',name:'АРХЕТИП СИЛЫ',text:'Показывает качество, на которое можно опереться.'},
 event:{deck:'Особое событие',name:'ОСОБОЕ СОБЫТИЕ',text:'Добавляет неожиданное игровое действие.'}
};
const archetypeToolDescriptions=[
 'Показывает качество, которое поддержит тебя в исследовании запроса.',
 'Показывает качество, которое поможет признать свою истинную потребность.',
 'Дает образ качества, на которое можно опереться при принятии своей силы.',
 'Показывает качество, которое поможет вернуть и удержать свою энергию.',
 'Показывает качество, которое поможет воплотить выбранное в жизнь.'
];
function toolsForLevel(level){
 const types=new Set(routeCells(level).map(c=>c.type));
 if(types.has('support'))types.add('archetype');
 return Object.entries(levelToolCatalog).filter(([type])=>types.has(type)).map(([type,info])=>({type,...info,text:type==='archetype'?archetypeToolDescriptions[level]:info.text}));
}
function renderLevelEntry(entry){
 const d=journeySteps[game.level],tools=game.levelEntry?.level===game.level&&game.levelEntry.view==='tools';
 if(!tools){
  entry.innerHTML=`<span class="eyebrow">0${game.level+1} / ${d.name}</span>${sceneVisual(d.visual)}<h2>${d.question}</h2><p>${d.text}</p><button id="journey-tools-next" type="button">ТВОИ ИНСТРУМЕНТЫ</button>`;
  ge('journey-tools-next').onclick=()=>{game.levelEntry={level:game.level,view:'tools'};persist();playSound('screenTransition');renderGame();entry.scrollIntoView?.({block:'start',behavior:reducedMotion()?'auto':'smooth'})};return;
 }
 const specials=game.level===4?[['goal','ЦЕЛЬ','Куда я направляю энергию?'],['action','ДЕЙСТВИЕ','Что я сделаю в реальной жизни?']]:[['energy','ЭНЕРГИЯ','Ресурс для изменений'],['key','КЛЮЧ','Осознание открывает путь'],['ocean','ОКЕАН ИЛЛЮЗИЙ','Перепроверь свой запрос']];
 entry.innerHTML=`<span class="eyebrow">0${game.level+1} / ${d.name}</span><h2>ТВОИ ИНСТРУМЕНТЫ</h2><p class="tools-caption">Колоды, с помощью которых ты исследуешь запрос</p><div class="level-deck-tools">${toolsForLevel(game.level).map(t=>`<article data-tool="${t.type}"><img src="./assets/cells/${t.type}.webp" alt="" width="72" height="72"><div><h3>${t.name}</h3>${t.type==='archetype'?'<small>Богини / Архетипы силы</small>':''}<p>${t.text}</p></div></article>`).join('')}</div><div class="level-special-tools" aria-label="Действия на пути">${specials.map(([type,name,text])=>`<div><img src="./assets/cells/${type}.webp" alt="" width="40" height="40"><span><b>${name}</b><small>${text}</small></span></div>`).join('')}${game.level===4?'<div class="wheel-tool"><span><b>КОЛЕСО БАЛАНСА</b><small>Посмотри на сферы жизни и осознанно распредели энергию.</small></span></div>':''}</div><button id="journey-begin" type="button">НАЧАТЬ УРОВЕНЬ</button><button id="journey-meaning-back" type="button" class="secondary">СМЫСЛ ЭТАПА</button>`;
 ge('journey-begin').onclick=()=>{game.stage='board';persist();renderGame()};
 ge('journey-meaning-back').onclick=()=>{game.levelEntry={level:game.level,view:'meaning'};persist();renderGame()};
}
