import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
function app(storage={}){
  const elements=new Map();
  function element(){return {children:[],textContent:'',value:'',checked:false,innerHTML:'',classList:{toggle(){},remove(){},add(){}},setAttribute(){},append(e){this.children.push(e)},querySelectorAll(){return this.children},addEventListener(n,fn){this[n]=fn},showModal(){this.open=true},close(){this.open=false},click(){this.onclick?.()},getAttribute(){return ''}}}
  function get(id){if(!elements.has(id))elements.set(id,element());return elements.get(id)}
  const grid=get('#cards-grid');Object.defineProperty(grid,'innerHTML',{set(){grid.children=[]},get(){return ''}});
  const context={document:{querySelector:get,querySelectorAll(){return []},createElement:element,addEventListener(){}},localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},window:{scrollTo(){}},setInterval(){},setTimeout(){},Date,URL,Blob,console,alert(){}};
  vm.createContext(context);vm.runInContext(source,context);return {context,get,storage};
}
test('calendar covers all days and all 48 cards, including leap day and fifth weeks',()=>{const {context}=app();for(let month=0;month<12;month++)for(let day=1;day<=new Date(2028,month+1,0).getDate();day++){const actual=vm.runInContext(`currentCardNumber(new Date(2028,${month},${day}))`,context);assert.equal(actual,month*4+Math.min(4,Math.floor((day-1)/7)+1))}assert.equal(vm.runInContext('currentCardNumber(new Date(2026,9,8))',context),38)});
test('all 48 images exist; month and season filters select 4 and 12 cards',()=>{const {get}=app();assert.equal(get('#cards-grid').children.length,48);for(let n=1;n<=48;n++)assert.ok(existsSync(new URL(`../cards/meetings 48.${String(n).padStart(3,'0')}.jpeg`,import.meta.url)));get('#filters').children.find(x=>x.textContent==='Текущий месяц').onclick();assert.equal(get('#cards-grid').children.length,4);get('#filters').children.find(x=>x.textContent==='Осень').onclick();assert.equal(get('#cards-grid').children.length,12)});
test('completed state and note survive reload; modal can open and close',()=>{const first=app();first.get('#cards-grid').children[0].onclick();assert.equal(first.get('#card-modal').open,true);first.get('#completed').checked=true;first.get('#memory-note').value='Наш уютный вечер';first.get('#save-memory').onclick();const second=app(first.storage);second.get('#cards-grid').children[0].onclick();assert.equal(second.get('#completed').checked,true);assert.equal(second.get('#memory-note').value,'Наш уютный вечер');second.get('.modal-close').onclick();assert.equal(second.get('#card-modal').open,false)});
