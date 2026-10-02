import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'power-db-')),dbpath=path.join(temp,'test.sqlite');
const python=`import sqlite3,json,sys
d=sqlite3.connect(sys.argv[1]);d.row_factory=sqlite3.Row
x=json.load(sys.stdin)
if 'schema' in x:d.executescript(x['schema']);r=[]
else:
 r=[]
 with d:
  for q in x['queries']:
   c=d.execute(q['sql'],q['args']);r.append([dict(z) for z in c.fetchall()])
print(json.dumps(r))`;
function sql(input){return JSON.parse(execFileSync('python',['-c',python,dbpath],{input:JSON.stringify(input),encoding:'utf8'}))}
sql({schema:fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort().map(f=>fs.readFileSync('drizzle/'+f,'utf8')).join('\n')});
class Statement{constructor(sqltext,args=[]){this.sql=sqltext;this.args=args}bind(...args){return new Statement(this.sql,args)}async first(){return sql({queries:[this]})[0][0]||null}async all(){return {results:sql({queries:[this]})[0]}}async run(){sql({queries:[this]});return {success:true}}}
const env={DB:{prepare:s=>new Statement(s),batch:async qs=>sql({queries:qs})},ASSETS:{fetch:()=>new Response('asset')}};
const config=JSON.parse(fs.readFileSync('dist/economy-config.json'));
async function worker(c){const source=fs.readFileSync('worker/index.js','utf8').replace('/*ECONOMY*/{}',JSON.stringify(c));return (await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).default}
const gated=await worker(config);config.privacy.ready=true;config.privacy.contact='privacy@example.test';config.gifts[0]={...config.gifts[0],available:true,cost:2,url:'https://example.test/material'};config.gifts[1]={...config.gifts[1],available:true,cost:2,url:'https://example.test/cards'};const app=await worker(config);
async function call(route,method='GET',body,user='a',origin='https://game.test',target=app){const headers={};if(user)headers['oai-authenticated-user-id']=user;if(method!=='GET')headers.Origin=origin;headers['Content-Type']='application/json';const r=await target.fetch(new Request('https://game.test/api/'+route,{method,headers,body:method==='POST'?JSON.stringify(body):undefined}),env);return {status:r.status,data:await r.json()}}
assert.equal((await call('profile','POST',{},'a','https://game.test',gated)).status,503);
assert.equal((await call('run','POST',{},null)).status,401);assert.equal((await call('profile','POST',{},'a','https://other.test')).status,403);
assert.equal((await call('profile','POST',{})).status,400);
const consent={name:'Игрок',consent:true,sensitiveConsent:true,version:config.privacy.version};assert.equal((await call('profile','POST',consent)).status,200);assert.equal((await call('profile','POST',consent,'b')).status,200);
const state={level:0,position:0,laps:[1,0,0,0,0],turn:2,stage:'board',energy:7,insights:[{crystalSource:'field:0:2:0:insight',text:'Да'}],openedCards:[{crystalSource:'card:one',response:'Да'}],bodyMarks:[{crystalSource:'body-only',note:'Да'}],crystalClaims:{'body-only':{type:'insight'},'lap:0:1':{type:'lap',amount:999},'field:0:2:0:insight':{type:'insight'},'card:one':{type:'insight'},'lap:0:2':{type:'lap'},invalid:{type:'insight'}}};
const payload={id:'run-first-123',state,journal:{cards:[]},revision:0};let result=await call('run','POST',payload);assert.equal(result.status,200);assert.equal(result.data.balance,3,'only validated events, server amounts');payload.revision=result.data.revision;
result=await call('run','POST',payload);assert.equal(result.data.balance,3,'retry never rewards twice');assert.equal((await call('run','POST',payload)).status,409,'stale revision rejected');payload.revision=result.data.revision;
assert.equal((await call('run','POST',payload,'b')).status,403,'runs scoped to owner');
const second={...payload,id:'run-second-123',revision:0,state:{...state,energy:0,laps:[0,0,0,0,0],insights:[],openedCards:[],crystalClaims:{}}};assert.equal((await call('run','POST',second)).data.balance,3,'new run keeps lifetime balance');
assert.equal((await call('reward?id=missing')).status,404);const redeem={rewardId:config.gifts[0].id,operationId:'operation-one-123'};result=await call('redeem','POST',redeem);assert.equal(result.status,200);assert.equal(result.data.balance,1);assert.equal((await call('redeem','POST',redeem)).data.balance,1,'idempotent spend');assert.equal((await call('redeem','POST',{...redeem,operationId:'operation-two-123'})).data.balance,1,'same gift new operation never charged twice');assert.equal((await call('redeem','POST',{rewardId:config.gifts[1].id,operationId:'operation-three-123'})).status,409,'insufficient balance');assert.equal((await call('reward?id=operation-one-123','GET',null,'b')).status,404);
const oldFetch=globalThis.fetch;globalThis.fetch=async()=>new Response('protected-pdf',{headers:{'Content-Type':'application/pdf'}});const owned=await app.fetch(new Request('https://game.test/api/reward-file?id=operation-one-123',{headers:{'oai-authenticated-user-id':'a'}}),env);assert.equal(owned.status,200);assert.match(owned.headers.get('Content-Disposition'),/attachment/);assert.equal(await owned.text(),'protected-pdf');assert.equal((await call('reward-file?id=operation-one-123','GET',null,'b')).status,404);assert.equal((await call('reward-file?id=operation-one-123','GET',null,null)).status,401);globalThis.fetch=oldFetch;const me=(await call('me')).data.profile;assert.equal(me.runs.length,2);assert.equal(me.rewards.length,1);assert.equal(me.ledger.length,4);assert.equal((await call('profile','DELETE')).data.deleted,true);assert.equal((await call('me')).data.profile,null);assert((await call('me','GET',null,'b')).data.profile,'deletion does not affect another user');
fs.rmSync(temp,{recursive:true,force:true});console.log('PASS server: consent gate, owner isolation, SQLite transactions, event replay, revision conflicts, lifetime balance, gift debit/retry/access, account deletion');
