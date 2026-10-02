import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../dist/telegram-miniapp.js',import.meta.url),'utf8');
function run(app) {
  const classes=new Set(), styles={}, buttons=[], calls=[], events={};
  const host=app ? {...app,onEvent:(name,fn)=>{(events[name]??=[]).push(fn)}} : undefined;
  for (const name of ['ready','expand','setHeaderColor','setBackgroundColor','setBottomBarColor','requestFullscreen','exitFullscreen']) {
    if(host) host[name]=(...args)=>calls.push([name,...args]);
  }
  const document={documentElement:{classList:{add:c=>classes.add(c)},style:{setProperty:(k,v)=>styles[k]=v}},body:{append:b=>buttons.push(b)},createElement:()=>({setAttribute(){},addEventListener(name,fn){this[name]=fn}})};
  vm.runInNewContext(source,{window:{Telegram:host?{WebApp:host}:undefined},document});
  return {host,classes,styles,buttons,calls,events};
}
assert.equal(run().classes.size,0,'ordinary browser is unchanged without SDK');
assert.equal(run({initData:''}).classes.size,0,'SDK alone does not activate Telegram mode');
const old=run({initData:'signed-host-data',viewportStableHeight:620,isVersionAtLeast:()=>false});
assert.deepEqual(old.calls.map(c=>c[0]),['ready','expand']);
assert.equal(old.buttons.length,0,'older clients do not get unsupported fullscreen controls');
const modern=run({initData:'signed-host-data',viewportStableHeight:700,safeAreaInset:{top:22,bottom:18},contentSafeAreaInset:{top:70},isVersionAtLeast:()=>true});
assert.equal(modern.styles['--miniapp-safe-top'],'70px');
assert.equal(modern.styles['--miniapp-safe-bottom'],'18px');
assert.equal(modern.styles['--miniapp-height'],'700px');
assert.equal(modern.buttons.length,1);
modern.buttons[0].click();
assert.equal(modern.calls.at(-1)[0],'requestFullscreen');
modern.host.isFullscreen=true;
modern.events.fullscreenChanged.forEach(fn=>fn());
assert.equal(modern.buttons[0].textContent,'Свернуть экран');
modern.buttons[0].click();
assert.equal(modern.calls.at(-1)[0],'exitFullscreen');
modern.host.viewportStableHeight=430;
modern.events.viewportChanged.forEach(fn=>fn());
assert.equal(modern.styles['--miniapp-height'],'430px');
modern.host.safeAreaInset={top:-10,bottom:NaN};
modern.host.contentSafeAreaInset={};
modern.events.safeAreaChanged.forEach(fn=>fn());
assert.equal(modern.styles['--miniapp-safe-top'],'0px');
assert.equal(modern.styles['--miniapp-safe-bottom'],'0px');
assert.doesNotMatch(source,/(?:app|window)\.(?:initDataUnsafe|sendData|CloudStorage)|localStorage\./,'adapter does not change game persistence or send answers');
console.log('PASS Telegram adapter: browser fallback, old clients, safe areas, viewport, fullscreen, no data transfer');
