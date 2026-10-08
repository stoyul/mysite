import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import site,{handleTimeForUs} from '../backend/worker.mjs';
import {accessCodes} from '../backend/codes.mjs';
const origin='https://yuliastoyanova.com';
function env(){const sql=new DatabaseSync(':memory:');return {MAMA_DB:{prepare(q){return {bind(...p){return {first:async()=>sql.prepare(q).get(...p),run:async()=>sql.prepare(q).run(...p)}} ,run:async()=>sql.prepare(q).run()}}},ASSETS:{async fetch(r){const p=new URL(r.url).pathname;return new Response(p.endsWith('login.html')?await readFile(new URL('../login.html',import.meta.url),'utf8'):'protected content')}}}}
const req=(path,options={})=>new Request(origin+'/time-for-us/'+path,options);
async function login(e,code='luna48'){return handleTimeForUs(req('api/login',{method:'POST',headers:{origin,'cf-connecting-ip':'127.0.0.1'},body:new URLSearchParams({code})}),e)}
test('public entrance hides codes; protected files reject unauthenticated visitors',async()=>{const e=env();const home=await handleTimeForUs(req(''),e);assert.equal(home.status,200);assert.ok(!(await home.text()).includes('luna48'));for(const path of ['app.js','cards/meetings%2048.001.jpeg'])assert.equal((await handleTimeForUs(req(path),e)).status,401);assert.equal((await handleTimeForUs(req('backend/codes.mjs'),e)).status,404)});
test('correct code opens all 48 original cards; revocation and logout invalidate session',async()=>{const e=env();const result=await login(e);assert.equal(result.status,303);const cookie=result.headers.get('set-cookie').split(';')[0];assert.match(result.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Strict/);for(let n=1;n<=48;n++){const r=await handleTimeForUs(req(`cards/meetings%2048.${String(n).padStart(3,'0')}.jpeg`,{headers:{cookie}}),e);assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'private, no-store')}
accessCodes[0].active=false;assert.equal((await handleTimeForUs(req('app.js',{headers:{cookie}}),e)).status,401);accessCodes[0].active=true;
assert.equal((await handleTimeForUs(req('api/logout',{method:'POST',headers:{origin,cookie}}),e)).status,204);assert.equal((await handleTimeForUs(req('app.js',{headers:{cookie}}),e)).status,401)});
test('wrong code, cross-origin request and excessive attempts fail',async()=>{const e=env();assert.equal((await login(e,'invalid')).status,401);assert.equal((await handleTimeForUs(req('api/login',{method:'POST',body:'code=luna48',headers:{origin:'https://other.test'}}),e)).status,403);for(let i=0;i<9;i++)await login(e,'wrong');assert.equal((await login(e)).status,429)});
test('other products and scheduled handler remain delegated',async()=>{const e=env();assert.equal(await (await site.fetch(new Request(origin+'/put-k-sebe/'),e,{})).text(),'protected content');assert.equal(typeof site.scheduled,'function')});
