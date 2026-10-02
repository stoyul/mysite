import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('../dist/',import.meta.url);
function setup({session=false,reject=false}={}) {
 const calls=[],listeners={},store=new Map();
 const node=()=>({gain:{value:0},threshold:{value:0},knee:{value:0},ratio:{value:0},connect(to){return to},disconnect(){},start(){calls.push('primer-start')}});
 class Context {
  constructor(){calls.push('context');this.state='suspended';this.sampleRate=8000;this.destination=node()}
  resume(){calls.push('resume');if(reject)return Promise.reject(Error('blocked'));this.state='running';return Promise.resolve()}
  suspend(){calls.push('suspend');this.state='suspended';return Promise.resolve()}
  createGain(){return node()} createDynamicsCompressor(){return node()}
  createBufferSource(){return node()} createBuffer(){return {}}
 }
 class Media {
  constructor(url){calls.push(['media',url]);this.paused=true}
  setAttribute(){} play(){calls.push('media-play');this.paused=false;return reject?Promise.reject(Error('blocked')):Promise.resolve()}
  pause(){calls.push('media-pause');this.paused=true}
 }
 const navigator={userAgent:'iPhone',platform:'iPhone',maxTouchPoints:5};
 if(session)navigator.audioSession={type:'auto'};
 const ctx=vm.createContext({window:{navigator,AudioContext:Context,Audio:Media,addEventListener:(n,f)=>listeners[n]=f},document:{hidden:false,getElementById:()=>null,addEventListener:(n,f)=>listeners[n]=f},localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},setTimeout,clearTimeout,console});
 for(const file of ['sound-config.js','sound-manager.js'])vm.runInContext(fs.readFileSync(new URL(file,root),'utf8'),ctx);
 return {ctx,calls,listeners,navigator,sound:ctx.SoundManager};
}
const modern=setup({session:true});
assert.equal(modern.calls.length,0,'no audio starts at page load');
modern.listeners.touchend();await modern.sound.ready;
assert.equal(modern.navigator.audioSession.type,'playback');
assert.deepEqual(modern.calls,['context','resume','primer-start']);
modern.ctx.document.hidden=true;modern.listeners.visibilitychange();
assert.equal(modern.sound.context.state,'suspended');
modern.ctx.document.hidden=false;modern.listeners.visibilitychange();await modern.sound.ready;
assert.equal(modern.sound.context.state,'running','returning to Telegram restores existing audio');
modern.sound.setEnabled(false);const count=modern.calls.length;
modern.listeners.touchend();modern.listeners.pageshow();assert.equal(modern.calls.length,count,'mute remains final across touches and returns');
modern.sound.setEnabled(true);await modern.sound.ready;
const old=setup();old.listeners.touchend();await old.sound.ready;
assert(old.calls.some(c=>Array.isArray(c)&&c[1]==='./assets/audio/mobile-unlock.wav'));
assert(old.calls.includes('media-play'),'legacy iOS starts HTML audio inside the gesture');
old.sound.setEnabled(false);assert.equal(old.sound.mobileRoute.paused,true,'mute stops legacy route too');
old.sound.setEnabled(true);await old.sound.ready;assert.equal(old.sound.mobileRoute.paused,false);
old.ctx.document.hidden=true;old.listeners.visibilitychange();assert.equal(old.sound.mobileRoute.paused,true);
old.ctx.document.hidden=false;old.listeners.visibilitychange();await old.sound.ready;
old.sound.context.state='closed';old.listeners.click();await old.sound.ready;
assert.equal(old.calls.filter(c=>c==='context').length,2,'a closed mobile context can be recreated by a gesture');
const blocked=setup({reject:true});blocked.listeners.touchend();await blocked.sound.ready;
await new Promise(setImmediate);
assert.equal(blocked.sound.context.state,'suspended','blocked playback is safely handled');
assert.equal(fs.readFileSync(new URL('assets/audio/mobile-unlock.wav',root)).toString('ascii',0,4),'RIFF');
console.log('PASS mobile audio: touch unlock, iOS playback session, legacy media route, mute, hide/return, closed context, blocked playback');
