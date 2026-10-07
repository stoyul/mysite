// Отдельный Worker и база. Существующий бот /for-mama/ не изменяется.
const APP_URL='https://yuliastoyanova.com/put-k-sebe/';
const json=(value,status=200)=>Response.json(value,{status,headers:{'cache-control':'no-store'}});
async function hmac(key,text){const enc=new TextEncoder();const secret=await crypto.subtle.importKey('raw',typeof key==='string'?enc.encode(key):key,{name:'HMAC',hash:'SHA-256'},false,['sign']);return new Uint8Array(await crypto.subtle.sign('HMAC',secret,enc.encode(text)))}
export async function authenticate(initData,token,now=Date.now()){
 if(typeof initData!=='string'||initData.length>8192||!token)return null;
 const params=new URLSearchParams(initData),keys=[...params.keys()];if(new Set(keys).size!==keys.length)return null;
 const hash=params.get('hash');if(!/^[a-f0-9]{64}$/.test(hash||''))return null;params.delete('hash');
 const key=await hmac('WebAppData',token),signature=await hmac(key,[...params].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('\n'));
 const expected=[...signature].map(v=>v.toString(16).padStart(2,'0')).join('');let diff=0;for(let i=0;i<64;i++)diff|=hash.charCodeAt(i)^expected.charCodeAt(i);
 const age=now/1000-Number(params.get('auth_date'));if(diff||!Number.isFinite(age)||age<-30||age>86400)return null;
 try{const user=JSON.parse(params.get('user'));return Number.isSafeInteger(user.id)&&user.id>0?user:null}catch{return null}
}
export function validateSettings(body){
 if(typeof body.enabled!=='boolean'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(body.time||''))return false;
 if(typeof body.timezone!=='string'||body.timezone.length>100||!Number.isInteger(body.day)||body.day<3||body.day>5)return false;
 try{new Intl.DateTimeFormat('en',{timeZone:body.timezone});return true}catch{return false}
}
export function localMoment(timezone,now){const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));return {date:`${parts.year}-${parts.month}-${parts.day}`,time:`${parts.hour}:${parts.minute}`}}
export async function handle(request,env){
 const url=new URL(request.url);if(url.pathname!=='/put-k-sebe/api/reminder')return json({error:'Not found'},404);
 if(request.method!=='POST')return json({error:'Method not allowed'},405);
 if(request.headers.get('origin')!=='https://yuliastoyanova.com')return json({error:'Invalid origin'},403);
 if(!env.PUT_K_SEBE_DB||!env.PUT_K_SEBE_BOT_TOKEN)return json({error:'Reminder service is not configured'},503);
 if(Number(request.headers.get('content-length')||0)>12000)return json({error:'Request too large'},413);
 let body;try{const text=await request.text();if(text.length>12000)return json({error:'Request too large'},413);body=JSON.parse(text)}catch{return json({error:'Invalid JSON'},400)}
 const user=await authenticate(body.initData,env.PUT_K_SEBE_BOT_TOKEN);if(!user)return json({error:'Telegram authentication required'},401);
 if(!validateSettings(body))return json({error:'Invalid settings'},400);
 await env.PUT_K_SEBE_DB.prepare('INSERT INTO put_k_sebe_reminders (telegram_id,enabled,time,timezone,day,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(telegram_id) DO UPDATE SET enabled=excluded.enabled,time=excluded.time,timezone=excluded.timezone,day=excluded.day,updated_at=excluded.updated_at').bind(user.id,body.enabled?1:0,body.time,body.timezone,body.day,new Date().toISOString()).run();
 return json({enabled:body.enabled,time:body.time,timezone:body.timezone,day:body.day});
}
export async function runReminders(env,now=new Date()){
 if(!env.PUT_K_SEBE_DB||!env.PUT_K_SEBE_BOT_TOKEN)return;
 const rows=await env.PUT_K_SEBE_DB.prepare('SELECT * FROM put_k_sebe_reminders WHERE enabled=1').all();
 for(const row of rows.results||[]){const local=localMoment(row.timezone,now);if(local.time!==row.time)continue;
 const consent=await env.PUT_K_SEBE_DB.prepare('SELECT enabled,day FROM put_k_sebe_reminders WHERE telegram_id=?').bind(row.telegram_id).first();if(!consent?.enabled)continue;
 const claim=await env.PUT_K_SEBE_DB.prepare('INSERT OR IGNORE INTO put_k_sebe_deliveries (telegram_id,local_date,status,created_at) VALUES (?,?,?,?)').bind(row.telegram_id,local.date,'claimed',now.toISOString()).run();if(!claim.meta?.changes)continue;
 let status='failed';try{const response=await fetch(`https://api.telegram.org/bot${env.PUT_K_SEBE_BOT_TOKEN}/sendMessage`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({chat_id:row.telegram_id,text:'Ваш день подходит к завершению. Уделите несколько минут себе: вспомните радости дня и то, за что сегодня хочется поблагодарить',reply_markup:{inline_keyboard:[[{text:'Завершить день',web_app:{url:APP_URL+'#evening/'+consent.day}}]]}}),signal:AbortSignal.timeout(15000)});const data=await response.json();if(response.ok&&data.ok)status='sent';else if(data.error_code===403)await env.PUT_K_SEBE_DB.prepare('UPDATE put_k_sebe_reminders SET enabled=0 WHERE telegram_id=?').bind(row.telegram_id).run()}catch{/* Не записывать URL с токеном в журнал */}
 await env.PUT_K_SEBE_DB.prepare('UPDATE put_k_sebe_deliveries SET status=? WHERE telegram_id=? AND local_date=?').bind(status,row.telegram_id,local.date).run();
 }
}
export default {fetch:handle,scheduled(controller,env,ctx){ctx.waitUntil(runReminders(env,new Date(controller.scheduledTime)))}};
