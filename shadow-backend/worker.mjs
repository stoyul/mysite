import {codeConfig} from './code-config.mjs';
const prefix='/shadow-transformation/';
const enc=new TextEncoder();
const hex=b=>Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join('');
const digest=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(s)));
const reply=(body,status=200,cookie)=>Response.json(body,{status,headers:{'Cache-Control':'no-store',...(cookie?{'Set-Cookie':cookie}:{})}});
const cookie=(token,age)=>`shadow_session=${token}; Path=${prefix}; Max-Age=${age}; HttpOnly; Secure; SameSite=Strict`;
const equal=(a,b)=>{let n=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)n|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return n===0;};
async function setup(db){await db.batch([db.prepare('CREATE TABLE IF NOT EXISTS shadow_sessions (token_hash TEXT PRIMARY KEY, expires INTEGER NOT NULL, code_version TEXT NOT NULL)'),db.prepare('CREATE TABLE IF NOT EXISTS shadow_attempts (ip_hash TEXT PRIMARY KEY, start INTEGER NOT NULL, attempts INTEGER NOT NULL)')]);}
async function authorized(request,db,version){const token=(request.headers.get('Cookie')||'').match(/(?:^|;\s*)shadow_session=([a-f0-9]{64})(?:;|$)/)?.[1];if(!token)return false;const row=await db.prepare('SELECT expires, code_version FROM shadow_sessions WHERE token_hash=?').bind(await digest(token)).first();return !!row&&row.expires>Date.now()&&row.code_version===version;}
export async function shadowFetch(request,env){
 const url=new URL(request.url);if(url.pathname==='/shadow-transformation')return Response.redirect(url.origin+prefix,308);if(!url.pathname.startsWith(prefix))return null;
 const path=url.pathname.slice(prefix.length);
 const cfg={...codeConfig,hash:env.SHADOW_CODE_HASH||codeConfig.hash,salt:env.SHADOW_CODE_SALT||codeConfig.salt};
 if(path.startsWith('api/')){
  if(!env.MAMA_DB)return reply({error:'Сервис входа временно недоступен. Попробуй позже.'},503);
  const db=env.MAMA_DB;await setup(db);
  if(path==='api/session'&&request.method==='GET')return await authorized(request,db,cfg.hash)?reply({ok:true}):reply({error:'Кодовое слово требуется для входа.'},401);
  if(request.method!=='POST')return reply({error:'Метод не поддерживается'},405);
  if(request.headers.get('Origin')!==url.origin)return reply({error:'Запрос отклонен'},403);
  if(path==='api/logout'){const token=(request.headers.get('Cookie')||'').match(/(?:^|;\s*)shadow_session=([a-f0-9]{64})(?:;|$)/)?.[1];if(token)await db.prepare('DELETE FROM shadow_sessions WHERE token_hash=?').bind(await digest(token)).run();return reply({ok:true},200,cookie('',0));}
  if(path!=='api/login')return reply({error:'Не найдено'},404);
  if(Number(request.headers.get('Content-Length')||0)>2048)return reply({error:'Слишком длинный запрос'},413);
  const ip=await digest(request.headers.get('CF-Connecting-IP')||'unknown');const now=Date.now();
  await db.prepare('INSERT INTO shadow_attempts(ip_hash,start,attempts) VALUES(?,?,1) ON CONFLICT(ip_hash) DO UPDATE SET attempts=CASE WHEN start<? THEN 1 ELSE attempts+1 END,start=CASE WHEN start<? THEN excluded.start ELSE start END').bind(ip,now,now-900000,now-900000).run();
  const attempt=await db.prepare('SELECT attempts FROM shadow_attempts WHERE ip_hash=?').bind(ip).first();if(attempt.attempts>10)return reply({error:'Слишком много попыток. Попробуй через 15 минут.'},429);
  let code;try{const text=await request.text();if(text.length>2048)throw 0;code=JSON.parse(text).code;}catch{return reply({error:'Некорректный запрос'},400);}
  if(typeof code!=='string'||code.length>128)return reply({error:'Кодовое слово не найдено. Попробуй еще раз'},401);
  const key=await crypto.subtle.importKey('raw',enc.encode(code),'PBKDF2',false,['deriveBits']);const computed=hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(cfg.salt),iterations:cfg.iterations,hash:'SHA-256'},key,256));
  if(!equal(computed,cfg.hash))return reply({error:'Кодовое слово не найдено. Попробуй еще раз'},401);
  const token=hex(crypto.getRandomValues(new Uint8Array(32)));await db.batch([db.prepare('INSERT INTO shadow_sessions VALUES(?,?,?)').bind(await digest(token),now+2592000000,cfg.hash),db.prepare('DELETE FROM shadow_sessions WHERE expires<?').bind(now),db.prepare('DELETE FROM shadow_attempts WHERE start<?').bind(now-86400000)]);
  return reply({ok:true},200,cookie(token,2592000));
 }
 const publicPaths=['','index.html','style.css','access.js'];
 if(!publicPaths.includes(path)){
  if(env.MAMA_DB)await setup(env.MAMA_DB);
  if(!env.MAMA_DB||!await authorized(request,env.MAMA_DB,cfg.hash))return reply({error:'Кодовое слово требуется для входа.'},401);
 }
 const response=await env.ASSETS.fetch(request);const headers=new Headers(response.headers);headers.set('Cache-Control','private, no-store');headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','same-origin');return new Response(response.body,{status:response.status,headers});
}
