const KEY='sacred-geometry.v1';
const fresh=()=>({version:1,favorites:[],notes:{},history:[],lastRoute:'home'});
export class LocalStorageAdapter{
 constructor(storage=globalThis.localStorage){this.storage=storage;this.available=true;this.data=fresh();try{const raw=storage.getItem(KEY);if(raw){const d=JSON.parse(raw);if(d.version===1&&Array.isArray(d.favorites)&&d.notes&&Array.isArray(d.history))this.data={...fresh(),...d};}else{const notes=JSON.parse(storage.getItem('sakura.notes.v1')||'{}');for(const [id,n] of Object.entries(notes))this.data.notes[id]={meaning:n.note||'',encounters:'',updatedAt:n.updatedAt||'',legacyQuestion:n.question||''};const history=JSON.parse(storage.getItem('sakura.history.v1')||'[]');this.data.history=history.filter(x=>x.id).map(x=>({id:Number(x.id),date:x.date}));}}catch{this.available=false;}}
 save(){try{this.storage.setItem(KEY,JSON.stringify(this.data));this.available=true;return true;}catch{this.available=false;return false;}}
 toggle(id){const f=this.data.favorites;this.data.favorites=f.includes(id)?f.filter(x=>x!==id):[...f,id];return this.save();}
 note(id,meaning,encounters){this.data.notes[id]={meaning,encounters,updatedAt:new Date().toISOString()};return this.save();}
 visit(id){this.data.history=[{id,date:new Date().toISOString()},...this.data.history.filter(x=>x.id!==id)].slice(0,84);this.save();}
 route(route){this.data.lastRoute=route;this.save();}
 export(){return JSON.stringify(this.data,null,2);}
 import(raw){const d=JSON.parse(raw);if(d.version!==1||!Array.isArray(d.favorites)||!d.notes||typeof d.notes!=='object'||Array.isArray(d.notes)||!Array.isArray(d.history))throw Error('Неверный формат резервной копии');const valid=id=>Number.isInteger(Number(id))&&Number(id)>=1&&Number(id)<=84;for(const[id,n]of Object.entries(d.notes)){if(!valid(id)||typeof n.meaning!=='string'||typeof n.encounters!=='string')throw Error('Неверный формат записей');}if(!d.favorites.every(id=>Number.isInteger(id)&&valid(id))||!d.history.every(x=>valid(x.id)&&typeof x.date==='string'))throw Error('Неверные идентификаторы');this.data.notes={...this.data.notes,...d.notes};this.data.favorites=[...new Set([...this.data.favorites,...d.favorites])];this.data.history=[...this.data.history,...d.history].filter((x,i,a)=>a.findIndex(y=>y.id===x.id)===i).slice(0,84);return this.save();}
}
