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
  const settings = { reminders: false, time: '09:00', timezone: localZone, birthday: '', specialDates: '', importantDates: [], onboardingCompleted: false, ...store.get('settings', {}) };
  let cards = [];
  let view = 'today';
  let viewing = null;
  let toastTimer;
  let cloudReady = false;
  let onboardingStep = 0;
  let editingDate = -1;
  let saveQueue = Promise.resolve();
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
  function formatDate(date, withYear=false) { return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',...(withYear?{year:'numeric'}:{})}).format(date).toLocaleLowerCase('ru-RU'); }
  function opened() { return store.get('opened',[]); }
  function favorites() { return store.get('favorites',[]); }
  function persistSettings() {
    store.set('settings',settings);
    if (onboardingStep) return Promise.resolve();
    if (!initData) { setStatus('Даты сохранены на устройстве. Для посланий открой приложение через @Mamacalendar_bot.'); return Promise.resolve(); }
    const snapshot = {...settings, opened:opened(), favorites:favorites()};
    saveQueue = saveQueue.catch(()=>{}).then(()=>syncRequest('settings',snapshot)).then(()=>setStatus('Настройки сохранены у бота ❤️')).catch(error=>{setStatus(error.message);throw error;});
    return saveQueue;
  }
  function saveFromControl() { persistSettings().catch(()=>{}); }
  function setStatus(text) { q('#notification-status').textContent=text; }

  function showToast(text) { const el=q('#toast'); el.textContent=text; el.classList.add('visible'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('visible'),2600); }
  async function syncRequest(path, body) {
    if (!initData) throw new Error('Открой приложение через @Mamacalendar_bot и нажми «Начать» в чате.');
    try {
      const response=await fetch(new URL(`api/${path}`,document.baseURI),{method:body?'POST':'GET',cache:'no-store',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json','X-Telegram-Init-Data':initData},...(body?{body:JSON.stringify(body)}:{})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(data.error||'Сервер посланий пока недоступен. Настройки не сохранены у бота.');
      return data;
    } catch(error) { throw new Error(error instanceof TypeError || error.name==='TimeoutError' ? 'Не удалось связаться с ботом. Проверь подключение и попробуй снова.' : error.message); }
  }
  function backgroundSync(body) { if(initData) syncRequest('sync',body).catch(error=>setStatus(error.message)); }
  function updateNav(next) {
    document.querySelectorAll('.nav-item').forEach(el=>{const active=el.dataset.view===next;el.classList.toggle('active',active);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
  }
  function setView(next) {
    if(onboardingStep) return;
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
    q('#gift-stage').hidden=true; q('#gift-caption').hidden=true; q('#welcome-note').hidden=true; q('#daily-invitation').hidden=true;
    q('#daily-card').hidden=false; q('#open-today').hidden=true; q('#future-note').hidden=true;
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
    viewing=null; q('#daily-card').hidden=true; q('#gift-stage').hidden=false; q('#gift-caption').hidden=future; q('#future-note').hidden=!future;
    const welcomed=store.get('welcomed',false);
    q('#welcome-note').hidden=welcomed;
    q('#daily-invitation').hidden=!welcomed;
    q('#date-label').textContent=devMode?'ТЕСТОВАЯ ДАТА':'СЕГОДНЯ'; q('#today-date').textContent=formatDate(date,true);
    const monthDay=dayId(date), personalDays=[...(settings.specialDates||'').split(',').map(x=>x.trim()),...(settings.importantDates||[]).map(x=>x.date)].filter(x=>/^\d{2}-\d{2}$/.test(x));
    const birthdayMatch=settings.birthday&&settings.birthday.slice(5)===`${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    const isSpecial=['1-1','2-14','3-8'].includes(monthDay)||Boolean(birthdayMatch)||personalDays.includes(`${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`);
    q('#special-banner').hidden=!isSpecial;q('#gift-stage').classList.toggle('special-day',isSpecial);
    q('#page-title').innerHTML='Маленькое послание<br>для тебя, мама';
    const key=dateKey(date), seen=opened().includes(key);
    q('#gift-stage').hidden=future; q('#open-today').hidden=future; q('#open-today').disabled=false;
    q('#open-today').querySelector('span:first-child').textContent=seen?'Перечитать сегодняшнее послание':'Открыть сегодняшнее послание';
    q('#open-today').onclick=()=>revealToday();
    q('#opened-count').textContent=`Мы уже открыли ${opened().length} ${plural(opened().length)} тепла ♡`;
    if(future){q('#page-title').textContent='Всё хорошее приходит в свой день';}
    if(seen&&!future)showEntry(entry,date);
    if(!entry){q('#open-today').disabled=true;showToast('Для этого дня не нашлась карточка.');}
  }
  function revealToday() {
    const date=selectedDate(), entry=cardForDate(date); if(!entry)return;
    if(isFuture(date)){setView('locked');return;}
    store.set('welcomed',true);
    const env=q('#envelope'); env.classList.add('is-opening');
    q('#open-today').disabled=true;
    const finish=()=>{
      env.classList.remove('is-opening');const key=dateKey(date);
      if(!devMode&&!opened().includes(key)){store.set('opened',[...opened(),key]);backgroundSync({opened:opened(),favorites:favorites()});}
      showEntry(entry,date); q('#open-today').disabled=false;
    };
    setTimeout(finish,480);
  }
  q('#favorite-toggle').addEventListener('click',()=>{
    const entry=viewing?.entry||cardForDate(selectedDate()); if(!entry)return;
    const ids=favorites(),on=ids.includes(entry.n),next=on?ids.filter(n=>n!==entry.n):[...ids,entry.n];store.set('favorites',next);
    q('#favorite-toggle').setAttribute('aria-pressed',String(!on));q('#favorite-toggle').textContent=on?'♡':'♥';q('#favorite-toggle').setAttribute('aria-label',on?'Добавить в любимые':'Убрать из любимых');
    backgroundSync({opened:opened(),favorites:next});showToast(on?'Убрала из любимых':'Сохранила в любимые ♡');
  });
  document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>setView(button.dataset.view)));
  const presetTimes=['07:00','08:00','09:00','10:00'];
  function refreshSettings() {
    settings.importantDates=Array.isArray(settings.importantDates)?settings.importantDates:[];
    // Upgrade the existing unnamed dates in place to the same editable named list.
    for(const date of (settings.specialDates||'').split(',').map(d=>d.trim()).filter(validMonthDay)){
      if(!settings.importantDates.some(d=>d.date===date))settings.importantDates.push({name:'Особенный день',date});
    }
    settings.specialDates='';
    q('#notifications-toggle').checked=settings.reminders;
    q('#notifications-toggle').disabled=!initData||!cloudReady;
    q('#test-notification').disabled=!initData||!cloudReady;
    q('#scheduled-test').disabled=!initData||!cloudReady;
    q('#reminder-time').value=presetTimes.includes(settings.time)?settings.time:'custom';
    q('#custom-time').hidden=q('#reminder-time').value!=='custom';
    q('#custom-time').value=settings.time;
    q('#timezone').value=settings.timezone;
    q('#birthday').value=settings.birthday||'';
    q('#special-days').value=settings.specialDates||'';
    renderDates();
  }
  q('#notifications-toggle').addEventListener('change',e=>{settings.reminders=e.target.checked;saveFromControl();});
  q('#reminder-time').addEventListener('change',e=>{const custom=e.target.value==='custom';q('#custom-time').hidden=!custom;if(custom)q('#custom-time').focus();else {settings.time=e.target.value;saveFromControl();}});
  q('#custom-time').addEventListener('change',e=>{if(e.target.value){settings.time=e.target.value;saveFromControl();}});
  q('#timezone').addEventListener('change',e=>{try{const zone=e.target.value.trim();if(!zone)throw new Error();new Intl.DateTimeFormat('ru-RU',{timeZone:zone});settings.timezone=zone;saveFromControl();renderToday();}catch{e.target.value=settings.timezone;showToast('Проверь название часового пояса');}});
  q('#birthday').addEventListener('change',e=>{settings.birthday=e.target.value;saveFromControl();renderToday();});
  q('#special-days').addEventListener('change',e=>{const value=e.target.value;if(value.split(',').some(d=>d.trim()&&!validMonthDay(d.trim()))){showToast('Укажи даты в формате ММ-ДД, например 05-12');e.target.value=settings.specialDates;return;}settings.specialDates=value;saveFromControl();renderToday();});
  function validMonthDay(value) {
    if(!/^\d{2}-\d{2}$/.test(value))return false;
    const [m,d]=value.split('-').map(Number), date=new Date(2000,m-1,d,12);
    return date.getMonth()===m-1&&date.getDate()===d;
  }
  function cancelDate() {editingDate=-1;q('#date-form').reset();q('#date-cancel').hidden=true;q('#date-save').textContent='Добавить дату';}
  function renderDates() {
    const list=q('#important-dates-list');list.replaceChildren();
    (settings.importantDates||[]).forEach((date,index)=>{
      const row=document.createElement('div');row.className='important-date';
      const text=document.createElement('span');text.textContent=`${date.name} · ${date.date.split('-').reverse().join('.')}`;
      const edit=document.createElement('button');edit.type='button';edit.textContent='Изменить';edit.setAttribute('aria-label',`Изменить дату: ${date.name}`);
      edit.onclick=()=>{editingDate=index;q('#date-name').value=date.name;q('#date-value').value=`2000-${date.date}`;q('#date-save').textContent='Сохранить дату';q('#date-cancel').hidden=false;q('#date-name').focus();};
      const remove=document.createElement('button');remove.type='button';remove.textContent='Удалить';remove.setAttribute('aria-label',`Удалить дату: ${date.name}`);
      remove.onclick=()=>{settings.importantDates.splice(index,1);cancelDate();renderDates();saveFromControl();renderToday();};
      row.append(text,edit,remove);list.append(row);
    });
  }
  q('#date-cancel').onclick=cancelDate;
  q('#date-form').addEventListener('submit',event=>{
    event.preventDefault();const name=q('#date-name').value.trim(),date=q('#date-value').value.slice(5);
    if(!name||!validMonthDay(date))return;
    const entry={name,date};if(editingDate>=0)settings.importantDates[editingDate]=entry;else settings.importantDates.push(entry);
    cancelDate();renderDates();saveFromControl();renderToday();
  });
  async function checkNotification(scheduled=false) {
    const button=q(scheduled?'#scheduled-test':'#test-notification');button.disabled=true;
    try {
      await saveQueue.catch(()=>{});
      const result=await syncRequest(scheduled?'scheduled-test':'test-notification',{});
      if(scheduled&&result.scheduled)setStatus('Проверка назначена через 2 минуты ❤️ Можно закрыть приложение и Telegram. После возвращения нажми «Проверить результат».');
      else if(result.sent)setStatus('Telegram принял сообщение ❤️ Проверь чат @Mamacalendar_bot.');
      else throw new Error('Сервер не подтвердил отправку.');
      if(scheduled){q('#retry-connection').hidden=false;q('#retry-connection').textContent='Проверить результат';q('#retry-connection').onclick=checkDeliveryStatus;}
    }catch(error){setStatus(error.message);}finally{button.disabled=false;}
  }
  async function checkDeliveryStatus() {
    try {const result=await syncRequest('notification-status');const test=result.deliveries.find(d=>d.kind==='scheduled-test');setStatus(test?.status==='sent'?'Послание по расписанию отправлено ❤️ Проверь чат бота.':test?.status==='failed'?'Послание не отправлено. Нужно проверить подключение бота.':'Послание ещё ожидает отправки. Проверь результат чуть позже.');}catch(error){setStatus(error.message);}
  }
  q('#test-notification').onclick=()=>checkNotification();
  q('#scheduled-test').onclick=()=>checkNotification(true);
  function onboarding(step) {
    onboardingStep=step;
    document.querySelectorAll('main .view').forEach(el=>el.hidden=true);
    q('#onboarding-view').hidden=false;q('.bottom-nav').hidden=true;q('.settings-shortcut').hidden=true;
    q('#onboarding-progress').textContent=`ШАГ ${step} ИЗ 3`;
    q('#dates-home').append(q('#dates-panel'));q('#notification-home').append(q('#notification-panel'));
    q('#onboarding-sound').hidden=step!==2;
    const titles=['','Мамочка, я тебя люблю ❤️','Ежедневное послание 💌','Всё готово ❤️'];
    q('#onboarding-title').textContent=titles[step];
    q('#onboarding-copy').textContent=step===1?'Давай настроим твой календарь, чтобы каждый день он напоминал тебе, как ты важна. Проверь или добавь важные даты 🎂':step===2?'Во сколько тебе удобно получать новое послание?':settings.reminders?'Теперь каждое утро тебя будет ждать маленькое послание.':'Твои послания ждут тебя в календаре. Напоминания можно включить в настройках.';
    q('#onboarding-next span:first-child').textContent=step===1?'Даты проверены, дальше':step===2?'Сохранить и продолжить':'Открыть сегодняшнее послание';
    if(step===1)q('#onboarding-dates').append(q('#dates-panel'));
    if(step===2)q('#onboarding-notifications').append(q('#notification-panel'));
    q('#onboarding-title').focus();window.scrollTo({top:0});
  }
  q('#onboarding-next').onclick=async()=>{
    if(onboardingStep===1){onboarding(2);return;}
    if(onboardingStep===2){
      const button=q('#onboarding-next');button.disabled=true;q('#onboarding-error').textContent='';
      try {
        if(q('#reminder-time').value==='custom'){if(!q('#custom-time').value)throw new Error('Выбери удобное время.');settings.time=q('#custom-time').value;}
        settings.onboardingCompleted=true;
        if(initData)await syncRequest('settings',{...settings,opened:opened(),favorites:favorites()});
        store.set('settings',settings);onboarding(3);
      }catch(error){settings.onboardingCompleted=false;q('#onboarding-error').textContent=error.message;}finally{button.disabled=false;}
      return;
    }
    onboardingStep=0;q('.bottom-nav').hidden=false;q('.settings-shortcut').hidden=false;setView('today');revealToday();
  };
  refreshSettings();
  q('#developer-tools').hidden=!devMode;
  if(devMode){q('#test-date').value=params.get('date')||dateKey(actualToday());q('#test-date').addEventListener('change',renderToday);q('#test-date-reset').addEventListener('click',()=>{q('#test-date').value=dateKey(actualToday());renderToday();});}
  let activeDateKey=dateKey(actualToday());
  function refreshDay(){if(devMode||view!=='today'||viewing)return;const current=dateKey(actualToday());if(current!==activeDateKey){activeDateKey=current;renderToday();}}
  window.addEventListener('focus',refreshDay);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshDay();});
  // Day changes are refreshed when the user returns; delivery runs on the server.
  async function init() {
    if(tg){tg.ready();tg.expand();try{tg.setHeaderColor('#f5f0e8');tg.setBackgroundColor('#f5f0e8');}catch{}}
    const response=await fetch('./cards.json');cards=await response.json();
    if(initData){
      try {
        const cloud=await syncRequest('settings');cloudReady=true;
        const oldDates={birthday:settings.birthday,specialDates:settings.specialDates,importantDates:settings.importantDates};
        Object.assign(settings,cloud.settings,{timezone:cloud.settings.timezone||localZone});
        // Preserve dates already saved on this device when enrolling in the new backend.
        if(!cloud.settings.onboardingCompleted){
          if(!settings.birthday)settings.birthday=oldDates.birthday;
          if(!settings.specialDates)settings.specialDates=oldDates.specialDates;
          if(!settings.importantDates?.length)settings.importantDates=oldDates.importantDates;
        }
        store.set('settings',settings);
        store.set('opened',[...new Set([...opened(),...(cloud.opened||[])])]);
        store.set('favorites',[...new Set([...favorites(),...(cloud.favorites||[])])]);
        setStatus(cloud.blocked?'Разблокируй бота и нажми «Начать» в его чате.':cloud.botStarted?'Бот подключён ❤️':'Нажми «Начать» в чате @Mamacalendar_bot.');
        if(!settings.onboardingCompleted) settings.reminders=Boolean(cloud.botStarted&&!cloud.blocked);
      }catch(error){setStatus(error.message);q('#retry-connection').hidden=false;q('#retry-connection').onclick=()=>location.reload();}
    }else setStatus('Для утренних посланий открой календарь через @Mamacalendar_bot.');
    refreshSettings();
    renderToday();
    if(!settings.onboardingCompleted&&(!initData||cloudReady)){onboarding(1);}
    else if(params.get('open')==='today') {store.set('welcomed',true);revealToday();}
    else if(['archive','favorites','settings'].includes(params.get('view'))) {setView(params.get('view'));}
    if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }
  init().catch(()=>showToast('Не удалось загрузить послания. Попробуй обновить страницу.'));
})();
