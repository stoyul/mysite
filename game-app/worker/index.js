const economy=/*ECONOMY*/{};
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const textOK=value=>typeof value==='string'&&[...value].filter(c=>!/\s/u.test(c)).length>=2;
export function eligibleClaims(state){
 const out=[];for(const [source,claim]of Object.entries(state.crystalClaims||{})){
  if(source.length>220||!claim||!['insight','lap','module','game'].includes(claim.type))continue;
  let valid=false;
  if(claim.type==='lap'){const m=/^lap:(\d):([1-9]\d*)$/.exec(source);valid=!!m&&Number(m[1])<5&&Number(m[2])<=Math.min(100,Number(state.laps?.[m[1]])||0)}
  if(claim.type==='insight')valid=(state.openedCards||[]).some(c=>c.crystalSource===source&&textOK(c.response))||(state.insights||[]).some(i=>i.crystalSource===source&&textOK(i.text));
  if(claim.type==='module'){const m=/^module:(\d)$/.exec(source);valid=!!m&&Number(m[1])<5&&!!state.completedModules?.[m[1]]}
  if(claim.type==='game')valid=source==='game:complete'&&state.stage==='center'&&state.completedModules?.every(Boolean);
  const amount=economy.rewards?.[claim.type]||0;if(valid&&Number.isSafeInteger(amount)&&amount>0)out.push({source,amount,label:String(claim.label||claim.type).slice(0,180)});
 }return out;
}
function deliveryUrl(gift,reward){return gift.type==='download'?'/api/reward-file?id='+encodeURIComponent(reward.id):gift.url}
const stmt=(db,sql,...args)=>db.prepare(sql).bind(...args);
async function balance(db,id){return Number((await stmt(db,'SELECT COALESCE(SUM(amount),0) AS balance FROM crystal_ledger WHERE owner_id=?',id).first())?.balance)||0}
async function profileData(db,id){const profile=await stmt(db,'SELECT * FROM player_profiles WHERE id=?',id).first();if(!profile)return null;const runs=(await stmt(db,'SELECT id,revision,created_at,updated_at,completed,state_json,journal_json FROM player_runs WHERE owner_id=? ORDER BY updated_at DESC',id).all()).results||[];return {name:profile.name,balance:await balance(db,id),runs:runs.map(r=>({...r,state:JSON.parse(r.state_json),journal:JSON.parse(r.journal_json),state_json:undefined,journal_json:undefined})),ledger:(await stmt(db,'SELECT run_id,source,amount,label,at FROM crystal_ledger WHERE owner_id=? ORDER BY at DESC',id).all()).results||[],rewards:(await stmt(db,'SELECT * FROM player_rewards WHERE owner_id=? ORDER BY at DESC',id).all()).results||[]}}
export default {async fetch(request,env){
 const url=new URL(request.url);if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
 try{
  const user=null; // Standalone auth must be verified server-side before enabling cloud profiles.
  if(url.pathname==='/api/me'&&request.method==='GET')return json({signedIn:!!user,profile:user?await profileData(env.DB,user):null,privacyReady:!!economy.privacy?.ready});
  if(!user)return json({error:'Войди в профиль, чтобы сохранить данные.'},401);
  if(!['GET','HEAD'].includes(request.method)&&request.headers.get('Origin')!==url.origin)return json({error:'Недопустимый источник запроса.'},403);
  const body=request.method==='POST'?await request.json():{};
  if(url.pathname==='/api/profile'&&request.method==='POST'){
   if(!economy.privacy?.ready||!economy.privacy.contact)return json({error:'Профиль будет доступен после публикации контактных данных в политике конфиденциальности.'},503);
   if(body.consent!==true||body.sensitiveConsent!==true||body.version!==economy.privacy.version)return json({error:'Для сохранения нужно явное согласие.'},400);
   const name=String(body.name||'Игрок').trim().slice(0,80);await stmt(env.DB,'INSERT INTO player_profiles(id,name,consent_version,created_at) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name',user,name,body.version,new Date().toISOString()).run();return json({profile:await profileData(env.DB,user)});
  }
  const profile=await stmt(env.DB,'SELECT id FROM player_profiles WHERE id=?',user).first();if(!profile)return json({error:'Сначала создай профиль и выбери согласие на сохранение.'},403);
  if(url.pathname==='/api/run'&&request.method==='POST'){
   const s=body.state,id=String(body.id||'');if(!/^[a-zA-Z0-9-]{8,100}$/.test(id)||!s||JSON.stringify(s).length>1500000||!Number.isInteger(s.level)||s.level<0||s.level>4||!Number.isInteger(s.position)||s.position<0||s.position>20||!Array.isArray(s.laps)||s.laps.length!==5||s.laps.some(n=>!Number.isInteger(n)||n<0||n>100)||!Number.isSafeInteger(s.turn)||s.turn<0||s.turn>3000)return json({error:'Некорректные данные прохождения.'},400);
   const old=await stmt(env.DB,'SELECT owner_id,revision FROM player_runs WHERE id=?',id).first();if(old&&old.owner_id!==user)return json({error:'Прохождение недоступно.'},403);if(old&&old.revision!==body.revision)return json({error:'Прохождение изменилось на другом устройстве. Открой профиль и выбери актуальное сохранение.'},409);
   const revision=(old?.revision||0)+1,state=JSON.stringify(s),journal=JSON.stringify(body.journal||{}),at=new Date().toISOString();const commands=[old?stmt(env.DB,'UPDATE player_runs SET state_json=?,journal_json=?,revision=?,updated_at=?,completed=? WHERE id=? AND owner_id=? AND revision=?',state,journal,revision,at,s.stage==='center'?1:0,id,user,old.revision):stmt(env.DB,'INSERT INTO player_runs(id,owner_id,revision,state_json,journal_json,created_at,updated_at,completed) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING',id,user,revision,state,journal,at,at,s.stage==='center'?1:0)];
   for(const claim of eligibleClaims(s))commands.push(stmt(env.DB,'INSERT INTO crystal_ledger(owner_id,run_id,source,amount,label,at) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM player_runs WHERE id=? AND owner_id=? AND revision=? AND state_json=?) ON CONFLICT(owner_id,run_id,source) DO NOTHING',user,id,claim.source,claim.amount,claim.label,at,id,user,revision,state));
   await env.DB.batch(commands);const saved=await stmt(env.DB,'SELECT revision,state_json FROM player_runs WHERE id=? AND owner_id=?',id,user).first();if(saved?.state_json!==state)return json({error:'Одновременное изменение сохранения. Обнови профиль.'},409);return json({revision:saved.revision,balance:await balance(env.DB,user)});
  }
  if(url.pathname==='/api/redeem'&&request.method==='POST'){
   const gift=economy.gifts?.find(g=>g.id===body.rewardId);if(!gift?.available||(!gift.url&&!gift.fileKey))return json({error:'Эта награда пока недоступна.'},400);if((gift.url&&!/^https:\/\//.test(gift.url))||!Number.isSafeInteger(gift.cost)||gift.cost<1||!['download','access','discount','externalLink'].includes(gift.type))return json({error:'Награда не настроена.'},503);
   const existing=await stmt(env.DB,'SELECT * FROM player_rewards WHERE owner_id=? AND reward_id=?',user,gift.id).first();if(existing)return json({reward:existing,url:deliveryUrl(gift,existing),balance:await balance(env.DB,user),alreadyReceived:true});
   const id=String(body.operationId||'');if(!/^[a-zA-Z0-9-]{8,100}$/.test(id))return json({error:'Некорректная операция.'},400);const at=new Date().toISOString(),source='redeem:'+id;
   await env.DB.batch([stmt(env.DB,'INSERT INTO crystal_ledger(owner_id,run_id,source,amount,label,at) SELECT ?,?,?,?,?,? WHERE (SELECT COALESCE(SUM(amount),0) FROM crystal_ledger WHERE owner_id=?)>=? AND NOT EXISTS(SELECT 1 FROM player_rewards WHERE owner_id=? AND reward_id=?) AND NOT EXISTS(SELECT 1 FROM player_rewards WHERE id=? AND (owner_id<>? OR reward_id<>?)) ON CONFLICT(owner_id,run_id,source) DO NOTHING',user,'rewards',source,-gift.cost,gift.title,at,user,gift.cost,user,gift.id,id,user,gift.id),stmt(env.DB,'INSERT INTO player_rewards(id,owner_id,reward_id,title,cost,at) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM crystal_ledger WHERE owner_id=? AND run_id=? AND source=?) ON CONFLICT DO NOTHING',id,user,gift.id,gift.title,gift.cost,at,user,'rewards',source)]);
   const reward=await stmt(env.DB,'SELECT * FROM player_rewards WHERE owner_id=? AND reward_id=?',user,gift.id).first();if(!reward)return json({error:'Недостаточно Кристаллов или операция уже относится к другой награде.'},409);return json({reward,url:deliveryUrl(gift,reward),balance:await balance(env.DB,user)});
  }
  if(['/api/reward','/api/reward-file'].includes(url.pathname)&&request.method==='GET'){
   const reward=await stmt(env.DB,'SELECT * FROM player_rewards WHERE id=? AND owner_id=?',url.searchParams.get('id'),user).first();const gift=economy.gifts?.find(g=>g.id===reward?.reward_id);if(!gift||(!gift.url&&!gift.fileKey))return json({error:'Награда недоступна.'},404);
   if(url.pathname==='/api/reward')return json({url:deliveryUrl(gift,reward),type:gift.type});
   if(gift.type!=='download')return json({error:'Эта награда не является файлом.'},400);
   let bytes,type;if(gift.fileKey){if(!env.BUCKET)return json({error:'Файл подарка еще не подключен.'},503);const file=await env.BUCKET.get(gift.fileKey);if(!file)return json({error:'Файл пока недоступен.'},404);bytes=file.body;type=file.httpMetadata?.contentType||'application/octet-stream'}else {const file=await fetch(gift.url);if(!file.ok)return json({error:'Файл временно недоступен.'},503);bytes=file.body;type=file.headers.get('Content-Type')||'application/octet-stream'}
   const filename=String(gift.filename||gift.id+'.pdf').replace(/[^a-zA-Z0-9._-]/g,'-');return new Response(bytes,{headers:{'Content-Type':type,'Content-Disposition':'attachment; filename="'+filename+'"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
  }
  if(url.pathname==='/api/profile'&&request.method==='DELETE'){await env.DB.batch(['player_runs','crystal_ledger','player_rewards'].map(t=>stmt(env.DB,`DELETE FROM ${t} WHERE owner_id=?`,user)).concat(stmt(env.DB,'DELETE FROM player_profiles WHERE id=?',user)));return json({deleted:true})}
  return json({error:'Не найдено.'},404);
 }catch{console.error('Profile request failed');return json({error:'Сохранение временно недоступно. Твой ответ остается в браузере; попробуй еще раз.'},503)}
}};
