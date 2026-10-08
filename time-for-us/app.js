
    let selectedCard=1, history={};
    const stateKey='time-for-us:history:v1';
    try{history=JSON.parse(localStorage.getItem(stateKey)||'{}');if(!history||typeof history!=='object'||Array.isArray(history))history={}}catch{}
    const months=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
    const seasons={Зима:[11,0,1],Весна:[2,3,4],Лето:[5,6,7],Осень:[8,9,10]};
    const imageFor=n=>`/time-for-us/cards/meetings%2048.${String(n).padStart(3,'0')}.jpeg`;
    let activeFilter='Все';
    const filterRoot=document.querySelector('#filters'),grid=document.querySelector('#cards-grid');
    ['Все','Текущий месяц','Весна','Лето','Осень','Зима'].forEach(name=>{const b=document.createElement('button');b.textContent=name;b.className=name==='Все'?'active':'';b.onclick=()=>{activeFilter=name;filterRoot.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));renderCards()};filterRoot.append(b)});
    function renderCards(){grid.innerHTML='';for(let n=1;n<=48;n++){let month=Math.floor((n-1)/4),week=(n-1)%4+1;if(activeFilter==='Текущий месяц'?month!==new Date().getMonth():activeFilter!=='Все'&&!seasons[activeFilter].includes(month))continue;const tile=document.createElement('button');tile.className='card-tile';tile.setAttribute('aria-label',`Открыть свидание: ${week} неделя, ${months[month]}`);tile.innerHTML=`<img loading="lazy" src="${imageFor(n)}" alt="${week} неделя, ${months[month]}"><span class="tile-label"><span>${history[String(n)]?.done?'✓ ':''}${String(week).padStart(2,'0')} НЕДЕЛЯ</span><span>${months[month].toUpperCase()}</span></span>`;tile.onclick=()=>openCard(n);grid.append(tile)}}
    function currentCardNumber(date=new Date()){let month=date.getMonth(),week=Math.min(4,Math.floor((date.getDate()-1)/7)+1);return month*4+week}
    function openCard(n){selectedCard=n;document.querySelector('#completed').checked=!!history[String(n)]?.done;document.querySelector('#memory-note').value=history[String(n)]?.note||'';document.querySelector('#modal-image').src=imageFor(n);document.querySelector('#modal-image').alt=`Карточка ${n}: ${months[Math.floor((n-1)/4)]}`;document.querySelector('#card-modal').showModal()}
    let now=new Date(),num=currentCardNumber(now),month=now.getMonth(),week=(num-1)%4+1;
    document.querySelector('#date-title').textContent=`${week} неделя · ${months[month]}`;document.querySelector('#date-subtitle').textContent=now.toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'}).toUpperCase();document.querySelector('#current-img').src=imageFor(num);document.querySelector('#current-img').alt=`${week} неделя, ${months[month]}`;
    document.querySelector('#current-card').onclick=()=>openCard(num);document.querySelector('#open-current').onclick=()=>openCard(num);
    document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{const view=button.dataset.view;document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===view));document.querySelectorAll('.nav [data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));window.scrollTo({top:0,behavior:'smooth'})}));
    document.querySelectorAll('.memory-object').forEach(button=>button.addEventListener('click',()=>{const panel=document.getElementById(button.getAttribute('aria-controls')),isOpen=button.getAttribute('aria-expanded')==='true';document.querySelectorAll('.memory-object').forEach(b=>{b.setAttribute('aria-expanded','false');document.getElementById(b.getAttribute('aria-controls')).classList.remove('open')});if(!isOpen){button.setAttribute('aria-expanded','true');panel.classList.add('open')}}));
    const modal=document.querySelector('#card-modal');document.querySelector('.modal-close').onclick=()=>modal.close();modal.addEventListener('click',e=>{if(e.target===modal)modal.close()});renderCards();
  
function saveMemory(){
 history[String(selectedCard)]={done:document.querySelector('#completed').checked,note:document.querySelector('#memory-note').value.slice(0,2000)};
 try{localStorage.setItem(stateKey,JSON.stringify(history));renderCards();document.querySelector('#save-status').textContent='Сохранено на этом устройстве.'}
 catch{document.querySelector('#save-status').textContent='Браузер запретил сохранение. Разрешите хранение данных для этого сайта.'}
}
document.querySelector('#save-memory').onclick=saveMemory;
document.querySelector('#completed').onchange=saveMemory;
document.querySelector('#logout').onclick=async()=>{await fetch('/time-for-us/api/logout',{method:'POST'});location.assign('/time-for-us/')};
document.querySelector('#season').textContent=Object.keys(seasons).find(s=>seasons[s].includes(new Date().getMonth()));
document.querySelector('#month-cards').onclick=()=>{document.querySelector('.nav [data-view="catalog"]').click();[...filterRoot.children].find(b=>b.textContent==='Текущий месяц').click()};
document.querySelector('#export-history').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({product:'time-for-us',version:1,history},null,2)],{type:'application/json'}));a.download='time-for-us-history.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
document.querySelector('#import-history').onchange=async e=>{try{const data=JSON.parse(await e.target.files[0].text());if(data.product!=='time-for-us'||data.version!==1||!data.history)throw Error();const next={};for(const [key,value]of Object.entries(data.history)){if(!/^([1-9]|[1-3][0-9]|4[0-8])$/.test(key)||typeof value?.done!=='boolean'||typeof value?.note!=='string')throw Error();next[key]={done:value.done,note:value.note.slice(0,2000)}}localStorage.setItem(stateKey,JSON.stringify(next));history=next;renderCards();alert('История восстановлена.')}catch{alert('Не удалось восстановить историю. Проверьте файл и разрешение на сохранение данных.')}e.target.value=''};
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&new Date().toDateString()!==now.toDateString())location.reload()});
setInterval(()=>{if(new Date().toDateString()!==now.toDateString())location.reload()},60000);
