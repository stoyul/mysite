export const KEY='money-codes:journal:v1';
export const empty=()=>({schemaVersion:1,sessions:[],favorites:[],planned:[],settings:{rhythm:'В своем темпе'},lastSession:null});
const fields=['resonance','situation','feelings','behavior','research','body','response','noticed','release','formulation','action','deadline','outcome','returnNote'];
export function validate(value,ids){
 if(!value||value.schemaVersion!==1||!Array.isArray(value.sessions)||!Array.isArray(value.favorites)||!Array.isArray(value.planned)||!value.settings||typeof value.settings.rhythm!=='string')throw Error('Это не резервная копия дневника поддерживаемой версии.');
 const allowed=new Set(ids),seen=new Set();
 if(value.sessions.length>10000)throw Error('Слишком много записей в файле.');
 for(const s of value.sessions){
  if(!s||typeof s.id!=='string'||!s.id||seen.has(s.id)||!allowed.has(s.cardId)||!['draft','completed'].includes(s.status)||!Number.isInteger(s.step)||s.step<0||s.step>4||!Number.isFinite(Date.parse(s.date))||!Number.isFinite(Date.parse(s.updatedAt))||!s.answers||typeof s.answers!=='object'||Array.isArray(s.answers))throw Error('Файл содержит поврежденную или повторяющуюся запись.');
  if(Object.entries(s.answers).some(([k,v])=>!fields.includes(k)||typeof v!=='string'))throw Error('Неверный формат ответов.');
  if(s.stage!==undefined&&(!Number.isInteger(s.stage)||s.stage<0||s.stage>6))throw Error('Неверный этап чтения.');
  if(s.read!==undefined&&typeof s.read!=='boolean')throw Error('Неверная отметка чтения.');
  seen.add(s.id);
 }
 if([...value.favorites,...value.planned].some(id=>!allowed.has(id)))throw Error('В файле есть неизвестные карточки.');
 return structuredClone(value);
}
export function merge(current,incoming,policy='keep'){
 const result=structuredClone(current),conflicts=[];
 for(const s of incoming.sessions){let index=result.sessions.findIndex(x=>x.id===s.id);if(index<0)result.sessions.push(s);else if(JSON.stringify(result.sessions[index])!==JSON.stringify(s)){conflicts.push(s.id);if(policy==='incoming')result.sessions[index]=s;}}
 result.favorites=[...new Set([...current.favorites,...incoming.favorites])];result.planned=[...new Set([...current.planned,...incoming.planned])];return {data:result,conflicts};
}
export function createSession(card){return {id:crypto.randomUUID(),cardId:card.id,date:new Date().toISOString(),updatedAt:new Date().toISOString(),status:'draft',step:0,stage:0,read:false,answers:{formulation:card.formulation,action:card.action}};}
export function choose(pool,last,mode='random'){
 if(!pool.length)return null;if(mode==='order'){const i=pool.findIndex(c=>c.id===last);return pool[(i+1)%pool.length];}
 const candidates=pool.length>1?pool.filter(c=>c.id!==last):pool;return candidates[Math.floor(Math.random()*candidates.length)];
}
export function load(storage,ids){try{let raw=storage.getItem(KEY);return {data:raw?validate(JSON.parse(raw),ids):empty(),error:null};}catch(e){return {data:empty(),error:'Не удалось прочитать хранилище. Исходные данные не перезаписаны. Сохраните резервную копию или импортируйте проверенный файл.'};}}
export function save(storage,data){try{storage.setItem(KEY,JSON.stringify(data));return true;}catch{return false;}}
