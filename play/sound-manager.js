/* Звук не меняет состояние игры. Контекст создается только внутри осознанного жеста. */
class GameSoundManager{
 constructor(design){this.design=design;this.context=null;this.master=null;this.active=new Set();this.timers=new Map();this.buffers=new Map();this.last=new Map();this.generation=0;this.groups=new Map();this.ready=Promise.resolve();try{this.enabled=localStorage.getItem('tochka-sily-sound')!=='off'}catch{this.enabled=true}}
 unlock(){if(!this.enabled||document.hidden)return;try{
  // Ask iOS for media playback rather than the default silent-switch-sensitive route.
  const nav=window.navigator;let playbackSession=false;
  try{if(nav?.audioSession){nav.audioSession.type='playback';playbackSession=true}}catch{}
  // Older iOS / embedded WebViews need an HTML audio route as well as Web Audio.
  // A silent local PCM file keeps that route alive only while this visible game is unmuted.
  const ios=/iPad|iPhone|iPod/.test(nav?.userAgent||'')||(nav?.platform==='MacIntel'&&nav?.maxTouchPoints>1);
  if(ios&&!playbackSession&&window.Audio){if(!this.mobileRoute){this.mobileRoute=new window.Audio(this.design.mobileUnlockUrl||'./assets/audio/mobile-unlock.wav');this.mobileRoute.loop=true;this.mobileRoute.preload='auto';this.mobileRoute.setAttribute('playsinline','');this.mobileRoute.setAttribute('aria-hidden','true')}if(this.mobileRoute.paused)Promise.resolve(this.mobileRoute.play()).catch(()=>{})}
  if(!this.context||this.context.state==='closed'){const C=window.AudioContext||window.webkitAudioContext;if(!C)return;this.context=new C();this.master=this.context.createGain();this.master.gain.value=this.design.volume;const limiter=this.context.createDynamicsCompressor();limiter.threshold.value=-22;limiter.knee.value=24;limiter.ratio.value=4;this.master.connect(limiter).connect(this.context.destination)}
  if(this.context.state!=='running'){
   // Both resume and the first source start run synchronously inside the touch gesture.
   this.ready=Promise.resolve(this.context.resume()).catch(()=>{});
   const primer=this.context.createBufferSource();primer.buffer=this.context.createBuffer(1,1,this.context.sampleRate);primer.connect(this.context.destination);primer.onended=()=>primer.disconnect();primer.start(0);
  }
 }catch{this.ready=Promise.resolve()}}
 pause(){this.stop();try{this.mobileRoute?.pause()}catch{}if(this.context?.state!=='closed')try{Promise.resolve(this.context?.suspend()).catch(()=>{})}catch{}}
 setEnabled(value){this.enabled=!!value;try{localStorage.setItem('tochka-sily-sound',value?'on':'off')}catch{}if(!value)this.pause();else this.unlock();this.updateButton()}
 updateButton(){const b=document.getElementById('global-sound');if(!b)return;b.textContent=this.enabled?'🔊':'🔇';b.setAttribute('aria-label',this.enabled?'Отключить звук':'Включить звук');b.setAttribute('aria-pressed',String(this.enabled));b.title=this.enabled?'Отключить звук':'Включить звук'}
 stop(group){if(group)this.groups.set(group,(this.groups.get(group)||0)+1);else this.generation++;for(const [id,g] of this.timers)if(!group||g===group){clearTimeout(id);this.timers.delete(id)}for(const record of [...this.active])if(!group||record.group===group){try{record.source.stop();record.source.disconnect();record.gain.disconnect()}catch{}this.active.delete(record)}}
 later(fn,ms,group){const id=setTimeout(()=>{this.timers.delete(id);if(this.enabled&&!document.hidden)fn()},ms);this.timers.set(id,group);return id}
 loop(name,group='portal'){this.stop(group);const tick=()=>{this.play(name,{group});this.later(tick,2800,group)};tick()}
 async play(name,{step=0,group='effect',delay=0,fast=false}={}){if(!this.enabled||document.hidden||!this.context)return;const generation=this.generation,groupVersion=this.groups.get(group)||0;await this.ready;if(generation!==this.generation||groupVersion!==(this.groups.get(group)||0)||!this.enabled||document.hidden||this.context.state!=='running')return;let cfg=this.design.events[name];if(!cfg)return;const now=this.context.currentTime;if(now-(this.last.get(name)??-100)<.2)return;this.last.set(name,now);
  try{if(cfg.url){let buffer=this.buffers.get(cfg.url);if(!buffer){const r=await fetch(cfg.url);if(!r.ok)throw Error('audio');buffer=await this.context.decodeAudioData(await r.arrayBuffer());this.buffers.set(cfg.url,buffer)}if(generation!==this.generation||groupVersion!==(this.groups.get(group)||0)||!this.enabled||document.hidden)return;const source=this.context.createBufferSource();source.buffer=buffer;this.source(source,now+delay,buffer.duration,cfg.gain??.15,group);return}
  if(name==='stepReveal'){const f=cfg.steps[step]||cfg.steps[0];cfg={notes:[[f,0,1.6,.16],[f*2,.25,1.3,.08],[f*3,.6,1,.035]],air:step===3?1.3:0};if(step===2)cfg.notes.push([392,.9,1,.065])}
  const scale=fast?.3:1;for(const [frequency,start,duration,level,end]of cfg.notes||[]){const osc=this.context.createOscillator();osc.type='sine';osc.frequency.setValueAtTime(frequency,now+delay+start*scale);if(end)osc.frequency.exponentialRampToValueAtTime(end,now+delay+(start+duration)*scale);this.source(osc,now+delay+start*scale,duration*scale,level,group)}
  if(cfg.air){const duration=cfg.air*scale,b=this.context.createBuffer(1,Math.ceil(this.context.sampleRate*duration),this.context.sampleRate),data=b.getChannelData(0);let prev=0;for(let i=0;i<data.length;i++){prev=.97*prev+.03*(Math.random()*2-1);data[i]=prev}const source=this.context.createBufferSource();source.buffer=b;const filter=this.context.createBiquadFilter();filter.type='bandpass';filter.frequency.value=cfg.water?350:750;filter.Q.value=.4;source.connect(filter);this.source(source,now+delay,duration,.18,group,filter)}
  }catch{/* Отсутствие файла или Web Audio не блокирует игру. */}}
 source(source,at,duration,level,group,output=source){const ctx=this.context,gain=ctx.createGain();at=Math.max(at,ctx.currentTime);duration=Math.max(.1,duration);gain.gain.setValueAtTime(.00001,at);gain.gain.exponentialRampToValueAtTime(Math.max(.00002,Math.min(.22,level)),at+Math.min(.25,duration*.3));gain.gain.exponentialRampToValueAtTime(.00001,at+duration);output.connect(gain).connect(this.master);const record={source,gain,group};this.active.add(record);source.onended=()=>{this.active.delete(record);try{source.disconnect();output.disconnect();gain.disconnect()}catch{}};source.start(at);source.stop(at+duration+.03)}
}
globalThis.SoundManager=new GameSoundManager(globalThis.soundDesign);
document.addEventListener('click',()=>SoundManager.unlock(),true);
document.addEventListener('touchend',()=>SoundManager.unlock(),{capture:true,passive:true});
document.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')SoundManager.unlock()},true);
document.addEventListener('visibilitychange',()=>{if(document.hidden)SoundManager.pause();else if(SoundManager.context)SoundManager.unlock()});
window.addEventListener?.('pageshow',()=>{if(SoundManager.context)SoundManager.unlock()});
