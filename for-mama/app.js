(() => {
  const q = (selector) => document.querySelector(selector);
  const params = new URLSearchParams(location.search);
  const devMode = params.get('dev') === '1';
  const tg = window.Telegram?.WebApp;
  const initData = tg?.initData || '';
  const store = {
    get(key, fallback) { try { const value = localStorage.getItem(`mama365:${key}`); return value === null ? fallback : JSON.parse(value); } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(`mama365:${key}`, JSON.stringify(value)); } catch {} }
  };
  const firstLaunch=store.get('firstLaunch',new Date().toISOString());store.set('firstLaunch',firstLaunch);
  const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin';
  const settings = { reminders: false, time: '09:00', timezone: localZone, birthday: '', specialDates: '', ...store.get('settings', {}) };
  let cards = [];
  let view = 'today';
  let viewing = null;
  let toastTimer;
  const dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const dayId = (d) => `${d.getMonth()+1}-${d.getDate()}`;
  function actualToday() {
    const parts=new Intl.DateTimeFormat('en',{timeZone:settings.timezone||localZone,year:'numeric',month:'numeric',day:'numeric'}).formatToParts(new Date());
    const values=Object.fromEntries(parts.map(p=>[p.type,p.value]));return new Date(Number(values.year),Number(values.month)-1,Number(values.day),12);
  }
  function selectedDate() {
    if (devMode && q('#test-date')?.value) {
      const [y,m,d] = q('#test-date').value.split('-').map(Number);
      if (y && m && d) return new Date(y,m-1,d,12);
    }
    return actualToday();
  }
  function dateFromKey(key) { const [y,m,d] = key.split('-').map(Number); return new Date(y,m-1,d,12); }
  function cardForDate(date) {
    const month=date.getMonth()+1, day=date.getDate();
    const targetMonth=month===2&&day===29?2:month;
    const targetDay=month===2&&day===29?28:day;
    return cards.find(c=>c.month===targetMonth&&c.day===targetDay);
  }
  function isFuture(date) { const a=dateKey(date), b=dateKey(actualToday()); return a>b; }
  function formatDate(date, withYear=false) { return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',...(withYear?{year:'numeric'}:{})}).format(date); }
  function opened() { return store.get('opened',[]); }
  function favorites() { return store.get('favorites',[]); }
  function persistSettings() { store.set('settings',settings); syncSettings(); }
  function showToast(text) { const el=q('#toast'); el.textContent=text; el.classList.add('visible'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('visible'),2600); }
  function syncRequest(path, body) {
    if (!initData) return Promise.resolve(null);
    const payload=body?{...body,firstLaunch}:null;
    return fetch(new URL(`api/${path}`,document.baseURI),{method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-Telegram-Init-Data':initData},...(payload?{body:JSON.stringify(payload)}:{})}).then(r=>r.ok?r.json():null).catch(()=>null);
  }
  function syncSettings() {
    if (!initData) return;
    syncRequest('settings',{...settings,opened:opened(),favorites:favorites()});
  }
  function updateNav(next) {
    document.querySelectorAll('.nav-item').forEach(el=>{const active=el.dataset.view===next;el.classList.toggle('active',active);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
  }
  function setView(next) {
    view=next; viewing=null;
    document.querySelectorAll('main .view').forEach(el=>el.hidden=true);
    q(`#${next}-view`)?.removeAttribute('hidden');
    if(next==='today')renderToday();
    updateNav(next); window.scrollTo({top:0,behavior:'smooth'});
    if(next==='archive') renderArchive(); if(next==='favorites') renderFavorites();
  }
  function appendCardButton(container, entry, date, isFavorite=false) {
    const button=document.createElement('button'); button.className='list-card'; button.type='button';
    const img=document.createElement('img'); img.src=entry.image; img.loading='lazy'; img.alt='';
    const text=document.createElement('span');
    const title=document.createElement('strong'); title.textContent=formatDate(date,true);
    const desc=document.createElement('small'); desc.textContent=entry.text;
    text.append(title,desc);
    const heart=document.createElement('span'); heart.className='list-heart'; heart.textContent=isFavorite?'♥':'♡';
    button.append(img,text,heart); button.addEventListener('click',()=>openPast(entry,date)); container.append(button);
  }
  function renderArchive() {
    const list=q('#archive-list'); list.replaceChildren();
    const rows=opened().map(key=>({date:dateFromKey(key),entry:cardForDate(dateFromKey(key))})).filter(x=>x.entry&&!isFuture(x.date)).sort((a,b)=>b.date-a.date);
    q('#archive-empty').hidden=rows.length>0; rows.forEach(x=>appendCardButton(list,x.entry,x.date,favorites().includes(x.entry.n)));
  }
  function renderFavorites() {
    const list=q('#favorites-list'); list.replaceChildren(); const fav=new Set(favorites());
    const rows=cards.filter(c=>fav.has(c.n)).sort((a,b)=>a.n-b.n);
    q('#favorites-empty').hidden=rows.length>0;
    rows.forEach(entry=>{const date=new Date(2025,entry.month-1,entry.day,12);appendCardButton(list,entry,date,true);});
  }
  function openPast(entry,date) {
    if(isFuture(date)){setView('locked');return;}
    viewing={entry,date};
    document.querySelectorAll('main .view').forEach(el=>el.hidden=true);
    q('#today-view').hidden=false; view='today'; updateNav('today');
    showEntry(entry,date,true); window.scrollTo({top:0,behavior:'smooth'});
  }
  function showEntry(entry,date,fromArchive=false) {
    q('#gift-stage').hidden=true; q('#daily-card').hidden=false; q('#open-today').hidden=true; q('#future-note').hidden=true;
    q('#date-label').textContent=fromArchive?'ИЗ ТВОИХ ПОСЛАНИЙ':'ПОСЛАНИЕ НА СЕГОДНЯ';
    q('#today-date').textContent=formatDate(date,true);
    q('#card-image').src=entry.image; q('#card-image').alt=`Открытка для мамы на ${formatDate(date)}`;
    q('#card-phrase').textContent=entry.text;
    const fav=favorites().includes(entry.n), toggle=q('#favorite-toggle'); toggle.setAttribute('aria-pressed',String(fav));toggle.textContent=fav?'♥':'♡';toggle.setAttribute('aria-label',fav?'Убрать из любимых':'Добавить в любимые');
    q('#opened-count').textContent=fromArchive?'Здесь всегда можно перечитать эти слова.':`Мы уже открыли ${opened().length} ${plural(opened().length)} тепла ♡`;
    if(fromArchive) { const open=q('#open-today');open.hidden=false;open.querySelector('span:first-child').textContent='К сегодняшнему посланию';open.onclick=()=>{viewing=null;renderToday();}; }
  }
  function plural(n) { const a=n%10,b=n%100;return a===1&&b!==11?'послание':a>=2&&a<=4&&(b<12||b>14)?'послания':'посланий'; }
  function renderToday() {
    const date=selectedDate(), future=isFuture(date), entry=cardForDate(date);
    viewing=null; q('#daily-card').hidden=true; q('#gift-stage').hidden=false; q('#future-note').hidden=!future;
    q('#date-label').textContent=devMode?'ТЕСТОВАЯ ДАТА':'СЕГОДНЯ'; q('#today-date').textContent=formatDate(date,true);
    const monthDay=dayId(date), personalDays=(settings.specialDates||'').split(',').map(x=>x.trim()).filter(x=>/^\d{2}-\d{2}$/.test(x));
    const birthdayMatch=settings.birthday&&settings.birthday.slice(5)===`${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    const isSpecial=['1-1','2-14','3-8'].includes(monthDay)||Boolean(birthdayMatch)||personalDays.includes(`${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`);
    q('#special-banner').hidden=!isSpecial;q('#gift-stage').classList.toggle('special-day',isSpecial);
    q('#page-title').innerHTML='Маленькое послание<br>для тебя, мама';
    const key=dateKey(date), seen=opened().includes(key);
    q('#gift-stage').hidden=future; q('#open-today').hidden=future; q('#open-today').disabled=false;
    q('#open-today').querySelector('span:first-child').textContent=seen?'Перечитать сегодняшнее послание':'Открыть послание';
    q('#open-today').onclick=()=>revealToday();
    q('#opened-count').textContent=`Мы уже открыли ${opened().length} ${plural(opened().length)} тепла ♡`;
    if(future){q('#page-title').textContent='Всё хорошее приходит в свой день';}
    if(seen&&!future)showEntry(entry,date);
    if(!entry){q('#open-today').disabled=true;showToast('Для этого дня не нашлась карточка.');}
  }
  function revealToday() {
    const date=selectedDate(), entry=cardForDate(date); if(!entry)return;
    if(isFuture(date)){setView('locked');return;}
    const env=q('#envelope'); env.classList.add('is-opening');
    q('#open-today').disabled=true;
    const finish=()=>{
      env.classList.remove('is-opening');const key=dateKey(date);
      if(!devMode&&!opened().includes(key)){store.set('opened',[...opened(),key]);syncRequest('sync',{opened:opened(),favorites:favorites()});}
      showEntry(entry,date); q('#open-today').disabled=false;
    };
    setTimeout(finish,480);
  }
  q('#favorite-toggle').addEventListener('click',()=>{
    const entry=viewing?.entry||cardForDate(selectedDate()); if(!entry)return;
    const ids=favorites(),on=ids.includes(entry.n),next=on?ids.filter(n=>n!==entry.n):[...ids,entry.n];store.set('favorites',next);
    q('#favorite-toggle').setAttribute('aria-pressed',String(!on));q('#favorite-toggle').textContent=on?'♡':'♥';q('#favorite-toggle').setAttribute('aria-label',on?'Добавить в любимые':'Убрать из любимых');
    syncRequest('sync',{opened:opened(),favorites:next});showToast(on?'Убрала из любимых':'Сохранила в любимые ♡');
  });
  document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>setView(button.dataset.view)));
  q('#notifications-toggle').checked=settings.reminders;
  const presetTimes=['07:00','08:00','09:00','10:00'];
  q('#reminder-time').value=presetTimes.includes(settings.time)?settings.time:'custom';
  q('#custom-time').hidden=q('#reminder-time').value!=='custom';
  q('#custom-time').value=settings.time;
  q('#timezone').value=settings.timezone;
  q('#birthday').value=settings.birthday||'';
  q('#special-days').value=settings.specialDates||'';
  q('#notifications-toggle').addEventListener('change',e=>{settings.reminders=e.target.checked;persistSettings();showToast(initData?(settings.reminders?'Напоминания включены':'Напоминания выключены'):'Бот еще не подключен к приложению');});
  q('#reminder-time').addEventListener('change',e=>{const custom=e.target.value==='custom';q('#custom-time').hidden=!custom;if(!custom){settings.time=e.target.value;persistSettings();showToast('Время сохранено');}});
  q('#custom-time').addEventListener('change',e=>{if(e.target.value){settings.time=e.target.value;persistSettings();showToast('Время сохранено');}});
  q('#timezone').addEventListener('change',e=>{try{new Intl.DateTimeFormat('ru-RU',{timeZone:e.target.value});settings.timezone=e.target.value.trim();persistSettings();renderToday();showToast('Часовой пояс сохранен');}catch{e.target.value=settings.timezone;showToast('Проверь название часового пояса');}});
  q('#birthday').addEventListener('change',e=>{settings.birthday=e.target.value;persistSettings();renderToday();});
  q('#special-days').addEventListener('change',e=>{settings.specialDates=e.target.value;persistSettings();renderToday();});
  q('#developer-tools').hidden=!devMode;
  if(devMode){q('#test-date').value=params.get('date')||dateKey(actualToday());q('#test-date').addEventListener('change',renderToday);q('#test-date-reset').addEventListener('click',()=>{q('#test-date').value=dateKey(actualToday());renderToday();});}
  q('#welcome-open').addEventListener('click',()=>{store.set('welcomed',true);q('#welcome-screen').hidden=true;revealToday();});
  q('#welcome-skip').addEventListener('click',()=>{store.set('welcomed',true);q('#welcome-screen').hidden=true;});
  let activeDateKey=dateKey(actualToday());
  function refreshDay(){if(devMode||view!=='today'||viewing)return;const current=dateKey(actualToday());if(current!==activeDateKey){activeDateKey=current;renderToday();}}
  window.addEventListener('focus',refreshDay);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshDay();});
  setInterval(refreshDay,30000);
  async function init() {
    if(tg){tg.ready();tg.expand();try{tg.setHeaderColor('#edf3f6');tg.setBackgroundColor('#edf3f6');}catch{}}
    const response=await fetch('./cards.json');cards=await response.json();
    if(initData){const cloud=await syncRequest('settings');if(cloud?.settings){Object.assign(settings,cloud.settings,{timezone:cloud.settings.timezone||settings.timezone});store.set('settings',settings);store.set('opened',[...new Set([...opened(),...(cloud.opened||[])])]);store.set('favorites',[...new Set([...favorites(),...(cloud.favorites||[])])]);q('#notifications-toggle').checked=settings.reminders;q('#reminder-time').value=presetTimes.includes(settings.time)?settings.time:'custom';q('#custom-time').hidden=q('#reminder-time').value!=='custom';q('#custom-time').value=settings.time;q('#timezone').value=settings.timezone;q('#birthday').value=settings.birthday||'';q('#special-days').value=settings.specialDates||'';syncSettings();}}
    renderToday();
    if(params.get('open')==='today') {store.set('welcomed',true);revealToday();}
    else if(['archive','favorites','settings'].includes(params.get('view'))) {store.set('welcomed',true);setView(params.get('view'));}
    else if(!store.get('welcomed',false)) q('#welcome-screen').hidden=false;
    if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }
  init().catch(()=>showToast('Не удалось загрузить послания. Попробуй обновить страницу.'));
})();
