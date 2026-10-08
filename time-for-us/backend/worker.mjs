import existingSite from '../../mama-backend/worker.mjs';
import { accessCodes } from './codes.mjs';

const root='/time-for-us/';
const cookieName='tfu_session';
const publicPaths=new Set([root+'style.css',root+'cover.jpeg']);
const json=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store'}});
export async function hash(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function setup(db){
  await db.prepare('CREATE TABLE IF NOT EXISTS tfu_sessions (token_hash TEXT PRIMARY KEY, code_hash TEXT NOT NULL, expires INTEGER NOT NULL)').run();
  await db.prepare('CREATE TABLE IF NOT EXISTS tfu_attempts (ip_hash TEXT PRIMARY KEY, count INTEGER NOT NULL, window INTEGER NOT NULL)').run();
}
async function loginPage(request,env,message='',status=200){
  const response=await env.ASSETS.fetch(new Request(new URL(root+'login.html',request.url)));
  return new Response((await response.text()).replace('{{ERROR}}',message),{status,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex'}});
}
async function session(request,db){
  const token=request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1);
  if(!token||!/^\w{64}$/.test(token))return null;
  const item=await db.prepare('SELECT * FROM tfu_sessions WHERE token_hash = ? AND expires > ?').bind(await hash(token),Date.now()).first();
  return item&&accessCodes.some(c=>c.active&&c.hash===item.code_hash)?item:null;
}
export async function handleTimeForUs(request,env){
  const url=new URL(request.url);
  if(url.pathname==='/time-for-us')return Response.redirect(url.origin+root,308);
  let path;try{path=decodeURIComponent(url.pathname)}catch{return json({error:'Invalid path'},400)}
  if(publicPaths.has(path))return env.ASSETS.fetch(request);
  // Never serve server source, documentation or tests through the public asset binding.
  if(path.includes('/backend/')||path.includes('/tests/')||path.endsWith('.md'))return json({error:'Not found'},404);
  if(!env.MAMA_DB)return loginPage(request,env,'Вход временно недоступен. Попробуйте позже.',503);
  const db=env.MAMA_DB;
  await setup(db);
  if(path===root+'api/login'){
    if(request.method!=='POST')return json({error:'Method not allowed'},405);
    if(request.headers.get('origin')!==url.origin)return json({error:'Forbidden'},403);
    const ipHash=await hash(request.headers.get('cf-connecting-ip')||'unknown');
    const window=Math.floor(Date.now()/900000);
    const attempt=await db.prepare('INSERT INTO tfu_attempts(ip_hash,count,window) VALUES(?,1,?) ON CONFLICT(ip_hash) DO UPDATE SET count=CASE WHEN window=excluded.window THEN count+1 ELSE 1 END, window=excluded.window RETURNING count').bind(ipHash,window).first();
    if(attempt.count>10)return loginPage(request,env,'Слишком много попыток. Попробуйте через 15 минут.',429);
    if(Number(request.headers.get('content-length')||0)>1024)return json({error:'Too large'},413);
    const body=await request.text();if(body.length>1024)return json({error:'Too large'},413);
    const code=(new URLSearchParams(body).get('code')||'').trim().toLowerCase();
    const codeHash=await hash(code);
    if(!/^luna\d{2}$/.test(code)||!accessCodes.some(c=>c.active&&c.hash===codeHash))return loginPage(request,env,'Неверный или неактивный код. Проверьте ввод.',401);
    const token=[...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,'0')).join('');
    await db.prepare('INSERT INTO tfu_sessions(token_hash,code_hash,expires) VALUES(?,?,?)').bind(await hash(token),codeHash,Date.now()+30*86400000).run();
    await db.prepare('DELETE FROM tfu_sessions WHERE expires <= ?').bind(Date.now()).run();
    await db.prepare('DELETE FROM tfu_attempts WHERE window < ?').bind(window-1).run();
    return new Response(null,{status:303,headers:{location:root,'set-cookie':`${cookieName}=${token}; Path=${root}; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`,'cache-control':'no-store'}});
  }
  if(path===root+'api/logout'){
    if(request.method!=='POST')return json({error:'Method not allowed'},405);
    if(request.headers.get('origin')!==url.origin)return json({error:'Forbidden'},403);
    const current=await session(request,db);
    if(current)await db.prepare('DELETE FROM tfu_sessions WHERE token_hash = ?').bind(current.token_hash).run();
    return new Response(null,{status:204,headers:{'set-cookie':`${cookieName}=; Path=${root}; HttpOnly; Secure; SameSite=Strict; Max-Age=0`,'cache-control':'no-store'}});
  }
  const current=await session(request,db);
  if(!current){
    if(path===root||path===root+'index.html'||path===root+'login.html')return loginPage(request,env);
    return json({error:'Введите код доступа.'},401);
  }
  if(path.startsWith(root+'api/'))return json({error:'Not found'},404);
  if(![root,root+'index.html',root+'app.js'].includes(path)&&!/^\/time-for-us\/cards\/meetings 48\.0(0[1-9]|[1-3][0-9]|4[0-8])\.jpeg$/.test(path))return json({error:'Not found'},404);
  const response=await env.ASSETS.fetch(request);
  const result=new Response(response.body,response);
  result.headers.set('cache-control','private, no-store');
  result.headers.set('x-robots-tag','noindex');
  result.headers.set('x-content-type-options','nosniff');
  return result;
}
export default {
  fetch(request,env,ctx){
    const path=new URL(request.url).pathname;
    if(path==='/time-for-us'||path.startsWith(root))return handleTimeForUs(request,env).catch(()=>json({error:'Вход временно недоступен. Попробуйте позже.'},503));
    return existingSite.fetch(request,env,ctx);
  },
  scheduled: existingSite.scheduled
};
