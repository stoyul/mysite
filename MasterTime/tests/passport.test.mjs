import test from 'node:test';import assert from 'node:assert/strict';
import {newPassportDraft,sleepWindow,setSleep,setDay,addCustom,setRhythm,setPrime,finishPassport} from '../src/passport.mjs';
test('Сон через полночь, проверка несовпадения и защищенное неучтенное время',()=>{
  assert.equal(sleepWindow('23:30','07:00'),450);
  const d=newPassportDraft({},true);assert.throws(()=>setSleep(d,{bed:'23:00',wake:'07:00',hours:'5',minutes:'0'}),/Уточни/);
  setSleep(d,{bed:'23:30',wake:'07:00',hours:'7',minutes:'30'});assert.equal(d.step,1);
  const values=Object.fromEntries(Object.entries(d.schedule).filter(([k])=>k!=='sleep').flatMap(([k,n])=>[[`${k}Hours`,Math.floor(n/60)],[`${k}Minutes`,n%60]]));setDay(d,values);
  assert.equal(d.step,2);assert.equal(d.schedule.sleep,450);
  addCustom(d,'Уход за садом',0,30);assert.equal(d.custom[0].minutes,30);
  setRhythm(d,'evening');d.energyHours[21]='high';setPrime(d,{focus:'21:00',complex:'20:00',slump:'14:00',observations:'Вечером проще читать'});
  const p=finishPassport(d,['Читать книги'],'');assert.equal(p.focus,'21:00');assert.equal(p.desires[0],'Читать книги');
});
