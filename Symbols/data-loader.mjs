// Bounded requests prevent indefinite library/model/detail loading.
export async function loadJSON(url,{timeout=20000,fetchImpl=fetch}={}){
 const controller=new AbortController();let timer;
 const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Слишком долгое ожидание ответа'));},timeout)});
 try{const response=await Promise.race([fetchImpl(url,{signal:controller.signal,cache:'no-cache'}),deadline]);if(!response.ok)throw new Error('Данные временно недоступны');return await Promise.race([response.json(),deadline]);}
 finally{clearTimeout(timer)}
}
