export const STORAGE_KEY='put-k-sebe:journey:v3';
export const BACKUP_KEY=STORAGE_KEY+':backup';
export const emptyState=()=>({version:3,currentDay:0,intention:Array(5).fill(''),wishes:[],goals:[],tasks:[],resources:[],gratitude:{},answers:{},evenings:{},final:Array(6).fill(''),completed:[],unlockedBonuses:[],joys:[],notes:[],reminder:{enabled:false,time:'21:00',timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'Europe/Berlin'},finished:false});
export function normalize(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Неверный формат записей');
 const v=value.state||value; const s=emptyState();
 for(const k of ['intention','wishes','goals','tasks','resources','final','completed','unlockedBonuses','joys','notes'])if(Array.isArray(v[k]))s[k]=v[k];
 for(const k of ['gratitude','answers','evenings'])if(v[k]&&typeof v[k]==='object'&&!Array.isArray(v[k]))s[k]=v[k];
 if(v.intention?.length===4){s.intention=[v.intention[0],'',v.intention[2],v.intention[3],''];if(v.intention[1])s.notes.push({id:id(),text:String(v.intention[1]),kind:'Первоначальные ожидания',date:''})}
 s.intention=Array.from({length:5},(_,i)=>String(s.intention[i]||''));s.final=Array.from({length:6},(_,i)=>String(s.final[i]||''));
 s.wishes=s.wishes.map(w=>({...w,id:String(w.id||id()),text:String(w.text||''),category:w.category||'',status:w.status||(w.done?'fulfilled':'active')}));
 s.goals=s.goals.map(g=>({...g,id:String(g.id||id()),title:String(g.title||''),why:g.why||'',importance:g.importance||'',lifeChange:g.lifeChange||g.feeling||'',step:g.step||'',returnDate:g.returnDate||'',wishId:g.wishId||null}));
 s.tasks=s.tasks.map(t=>({...t,id:String(t.id||id()),text:String(t.text||''),date:t.date||localDate(),kind:Number(t.kind)||0,day:t.day??2,done:!!t.done,joy:!!t.joy,feeling:String(t.feeling||'')}));
 if(v.lessonAnswers)Object.assign(s.answers,v.lessonAnswers);
 if(v.blessings)s.resources.push(...v.blessings.map(b=>({...b,kind:0,text:String(b.text||'')})));
 if(v.reminder&&typeof v.reminder==='object')s.reminder={...s.reminder,...v.reminder};
 s.currentDay=Number.isInteger(v.currentDay)&&v.currentDay>=0&&v.currentDay<=5?v.currentDay:0;
 s.finished=!!v.finished; return s;
}
export function load(storage){
 const raw=storage.getItem(STORAGE_KEY);if(!raw)return emptyState();
 try{return normalize(JSON.parse(raw))}catch{
 const backup=storage.getItem(BACKUP_KEY);if(backup){try{return normalize(JSON.parse(backup))}catch{}}
 throw Error('Не удалось прочитать записи. Сохраните резервную копию перед восстановлением.');
 }
}
export function save(storage,state){
 const data=JSON.stringify(state);const prior=storage.getItem(STORAGE_KEY);
 if(prior){try{normalize(JSON.parse(prior));storage.setItem(BACKUP_KEY,prior)}catch{}}
 storage.setItem(STORAGE_KEY,data);
}
export const id=()=>globalThis.crypto.randomUUID();
export function localDate(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
export function setWishStatus(s,wishId,status){if(!['active','fulfilled','archived'].includes(status))throw Error('Неверный статус');const w=s.wishes.find(w=>w.id===wishId);if(w){w.status=status;w.completedAt=status==='fulfilled'?new Date().toISOString():null}}
export function addGoal(s,wishId=null){const wish=s.wishes.find(w=>w.id===wishId);const goal={id:id(),title:wish?.text||'',wishId,importance:'',why:'',lifeChange:'',step:'',returnDate:'',status:'active'};s.goals.push(goal);return goal}
export function completeDay(s,day){if(!s.completed.includes(day))s.completed.push(day);return day===5?'final':`day/${day+1}`}
export function diary(s){
 const result=[...s.notes];
 for(const [i,text]of s.intention.entries())if(text.trim())result.push({text,kind:'Намерение',date:''});
 for(const t of s.tasks){if(t.feeling.trim())result.push({text:t.feeling,kind:'Состояние',date:t.date});if(t.done&&t.joy)result.push({text:t.text,kind:'Радость',date:t.date})}
 for(const [key,answers]of Object.entries(s.answers))for(const [i,text]of Object.entries(answers))if(typeof text==='string'&&text.trim())result.push({text,kind:key.startsWith('gratitude')||key==='meditation-gratitude'?'Благодарность':'Открытие',date:'',id:`${key}:${i}`});
 for(const [key,r]of Object.entries(s.evenings))for(const [i,text]of Object.entries(r.answers||{}))if(typeof text==='string'&&text.trim())result.push({text,kind:Number(r.day)>=3&&Number(i)===1?'Благодарность':Number(r.day)===5&&Number(i)<2?'Благодарность':'Итог дня',date:r.date||'',id:`${key}:${i}`});
 for(const [i,text]of s.final.entries())if(text.trim())result.push({text,kind:'Итог марафона',date:'',id:`final:${i}`});
 return result;
}
export function joys(s){return [...s.tasks.filter(t=>t.done&&t.joy).map(t=>({id:t.id,text:t.text,date:t.date})),...s.joys,...Object.entries(s.evenings).flatMap(([key,r])=>{const index=Number(r.day)===2?1:Number(r.day)===3?0:-1;const text=index>=0?r.answers?.[index]:'';return text?.trim()?[{id:key+':joy',text,date:r.date||''}]:[]})]}
export function result(s){const entries=diary(s);return {wishes:s.wishes.length,fulfilled:s.wishes.filter(w=>w.status==='fulfilled').length,goals:s.goals.filter(g=>g.title.trim()).length,joys:joys(s).length,gratitude:entries.filter(e=>e.kind==='Благодарность').length}}
export function eveningKey(day,date){return `day${day}:${date}`}
