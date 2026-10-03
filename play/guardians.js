/* One text-only Guardian mechanic for all five worlds. Rewards have distinct IDs. */
const guardianQuestions=[
 'Какое главное осознание ты получила о своем запросе?',
 'Какую потребность ты признаешь своей и что теперь выбираешь для себя?',
 'Какую часть себя ты больше не хочешь отрицать и какую Силу готова принять?',
 'Что ты заметила о своей энергии и что возвращаешь себе?',
 'Какое будущее ты начинаешь создавать и какой шаг приближает тебя к нему?'
];
const guardianLegacyFields=['finalInsight','choice','guardianInsight','returnGuardianInsight','futureGuardianInsight'];
const guardianShowModal=showModal;
showModal=function(...args){ge('game-modal').classList.remove('guardian-modal');guardianShowModal(...args)};
function updateGuardianViewport(){const height=window.visualViewport?.height||window.innerHeight;if(height>0)document.documentElement.style.setProperty('--guardian-viewport',`${height}px`)}
window.visualViewport?.addEventListener('resize',updateGuardianViewport);
window.addEventListener('resize',updateGuardianViewport);updateGuardianViewport();
function ensureGuardians(){
 ensureRun();
 if(!Array.isArray(game.guardianRecords))game.guardianRecords=[];
 game.guardianDrafts||={};
 // Adopt already completed Guardians without issuing any extra reward.
 for(let level=0;level<levelRoutes.length;level++)for(const cell of routeCells(level).filter(c=>c.type==='guardian')){
  const id=cell.id||`guardian-${level}-${cell.name}`;
  if(game.guardianRecords.some(r=>r.guardianId===id&&r.levelId===level+1))continue;
  const old=game.insights.find(i=>i.level===level&&i.kind===cell.name);
  if(old&&game.keys[level])game.guardianRecords.push({runId:game.runId,guardianId:id,guardianType:cell.name,levelId:level+1,insightText:old.text,requestAtTime:old.requestAtTime||game.originalRequest,guardianCompleted:true,keyGranted:true,keyConsumed:!!game.completedModules?.[level],completedAt:old.at,legacy:true});
 }
}
function guardianRecord(cell,level=game.level){
 ensureGuardians();
 const id=cell.id||`guardian-${level}-${cell.name}`;
 let record=game.guardianRecords.find(r=>r.guardianId===id&&r.levelId===level+1);
 if(!record){record={runId:game.runId,guardianId:id,guardianType:cell.name,levelId:level+1,insightText:'',requestAtTime:currentRequest(),guardianCompleted:false,keyGranted:false,keyConsumed:false,completedAt:null};game.guardianRecords.push(record)}
 return record;
}
function guardianKeyFlight(){
 if(reducedMotion())return;
 const target=ge('circle-key');if(!target)return;
 const rect=target.getBoundingClientRect();if(!rect.width)return;
 const flight=document.createElement('span');flight.className='guardian-key-flight';flight.textContent='🔑';flight.setAttribute('aria-hidden','true');
 flight.style.setProperty('--key-dx',`${rect.left+rect.width/2-window.innerWidth/2}px`);
 flight.style.setProperty('--key-dy',`${rect.top+rect.height/2-window.innerHeight/2}px`);
 document.body.append(flight);setTimeout(()=>flight.remove(),1100);
}
function showGuardian(cell=routeCells().find(c=>c.type==='guardian')){
 if(!cell)return;
 const level=game.level,record=guardianRecord(cell,level),runId=game.runId;
 if(record.guardianCompleted){showModal(record.guardianType,'🔑 КЛЮЧ УЖЕ ПОЛУЧЕН',`<p class="guardian-saved">${escapeHtml(record.insightText)}</p><p>${record.keyConsumed?'Ключ открыл следующий этап.':'Твое осознание сохранено. Ключ для этого этапа уже есть.'}</p>`,singleClose('ПРОДОЛЖИТЬ'));return}
 const draft=game.guardianDrafts[record.guardianId]??game[guardianLegacyFields[level]]??'';
 showModal(record.guardianType,record.guardianType,`<section class="guardian-work"><p>${escapeHtml(guardianQuestions[level])}</p><p class="modal-note"><b>Мой запрос:</b> ${escapeHtml(currentRequest())}</p><label for="guardian-insight">МОЕ ОСОЗНАНИЕ</label><textarea id="guardian-insight" rows="4" placeholder="Что я поняла о себе?">${escapeHtml(draft)}</textarea></section>`,[
  {label:'СОХРАНИТЬ И ПОЛУЧИТЬ КЛЮЧ 🔑',action:()=>{
   if(record.guardianCompleted||game.runId!==runId||game.level!==level)return;
   const field=ge('guardian-insight');if(!field||!hasReflectionText(field.value))return;
   const button=ge('modal-buttons').querySelector('button');button.disabled=true;field.blur();
   const text=field.value.trim(),at=new Date().toISOString(),alreadyOwned=!!game.keys[level];
   record.insightText=text;record.requestAtTime=currentRequest();record.guardianCompleted=true;record.keyGranted=true;record.completedAt=at;
   game.keys[level]=true;game[guardianLegacyFields[level]]=text;delete game.guardianDrafts[record.guardianId];
   const source=`guardian:${record.guardianId}:${level}`;
   game.insights.push({id:`${runId}:${source}`,runId,guardianId:record.guardianId,guardianType:record.guardianType,levelId:level+1,kind:record.guardianType,requestAtTime:record.requestAtTime,level,cell:game.position,text,at,crystalSource:source,crystalRewardClaimed:!!(Player.economy?.rewards.insight>0)});
   // Save completion and key together before animations or asynchronous work.
   persist();claimCrystal(source,'insight','Осознание у Хранителя');renderGame();
   showModal(record.guardianType,'КЛЮЧ ПОЛУЧЕН',`<div class="key-reveal key-journey guardian-key-reveal"><span>🔑</span></div><p class="guardian-key-amount">${alreadyOwned?'🔑 1 / 1 ✓':'+1 🔑'}</p><p>Твое осознание открыло путь дальше.</p>`,singleClose('ПРОДОЛЖИТЬ'));
   guardianKeyFlight();playSound('keyReveal');globalThis.SoundManager?.play('keyActivate',{delay:.75});
  }},
  {label:'Позже',secondary:true,action:closeModal}
 ]);
 const field=ge('guardian-insight'),button=ge('modal-buttons').querySelector('button');
 const update=()=>{button.disabled=!hasReflectionText(field.value);game.guardianDrafts[record.guardianId]=field.value;persist()};
 field.addEventListener('input',update);button.disabled=!hasReflectionText(field.value);persist();
 ge('game-modal').classList.add('guardian-modal');
 field.addEventListener('blur',()=>button.scrollIntoView?.({block:'nearest',behavior:reducedMotion()?'auto':'smooth'}));
}
const guardianCellHandler=handleCell;
handleCell=function(){const cell=routeCells()[game.position];if(cell.type==='guardian'){playSound('guardian');showGuardian(cell);return}guardianCellHandler()};
// Preserve circle and energy requirements; the key itself confirms Guardian work.
const guardianPortal=showPortalChoice;
showPortalChoice=function(){guardianPortal();if(!game.keys[game.level]){ge('modal-title').textContent='ТЕБЕ НУЖЕН КЛЮЧ 🔑';const hint=document.createElement('p');hint.textContent='Чтобы открыть этот Портал, сначала получи Ключ у Хранителя.';ge('modal-content').prepend(hint)}else{const hint=document.createElement('p');hint.className='guardian-portal-key';hint.textContent=canPassPortal()?'🔑 КЛЮЧ ЕСТЬ · Путь открыт.':'🔑 КЛЮЧ ЕСТЬ';ge('modal-content').prepend(hint)}};
const guardianTransition=transitionTo;
transitionTo=function(next){if(moving||!canPassPortal())return;const level=game.level;guardianTransition(next);if(moving){ensureGuardians();for(const record of game.guardianRecords)if(record.levelId===level+1&&record.keyGranted)record.keyConsumed=true;persist()}};
const guardianClose=closeModal;
closeModal=function(){guardianClose();if(!modalOpen)ge('game-modal').classList.remove('guardian-modal')};
ensureGuardians();persist();renderGame();
