/* Three original circles, independent SVG rotation, shared book cards and local research history. */
(() => {
  const model = window.NeedsWheelModel;
  const storageKey = 'motivation-wheel-v1';
  const empty = () => ({ emotion: null, manifestations: [], sectors: [], context: 'unsure', note: '', skipped: false });
  let stored = { draft: empty(), history: [] };
  try { const s = JSON.parse(localStorage.getItem(storageKey) || 'null'); if (s && typeof s === 'object') stored = { draft: s.draft || empty(), history: Array.isArray(s.history) ? s.history : [] }; } catch {}
  let config, book, api, main, step = 0, currentRecord = null;
  let angles = [15, 0, 112], cursors = [11, 0, 48], zooms = [1, 1, 1], suggestedOnly = false;
  let activeDrag = null, dragFrame, resizeObserver, candidateKey, candidateValue;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const $ = selector => main?.querySelector(selector);
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ready = fetch('wheel-data.json?v=1').then(r => { if (!r.ok) throw Error('data'); return r.json(); }).then(c => {
    if (c.emotions.length !== 12 || c.manifestations.length !== 32 || c.sectors.length !== 71) throw Error('structure');
    config = c; stored.draft = model.normalize(config, stored.draft);
    stored.history = stored.history.filter(r => r && /^[a-zA-Z0-9-]+$/.test(r.id) && r.draft && typeof r.date === 'string').map(r => ({ ...r, draft: model.normalize(config, r.draft), ways: Array.isArray(r.ways) ? r.ways.filter(w => w && typeof w.id === 'string') : [] }));
    return c;
  });
  ready.catch(() => {});
  window.addEventListener('hashchange', onCancel);
  window.addEventListener('blur', onCancel);
  document.addEventListener('visibilitychange', () => { if (document.hidden) onCancel(); });
  function saveStore(message) {
    try { localStorage.setItem(storageKey, JSON.stringify(stored)); if (message) api?.toast(message); return true; }
    catch { api?.toast('Не удалось сохранить исследование. Проверьте настройки браузера и свободное место.'); return false; }
  }
  const draft = () => stored.draft;
  const items = level => level === 0 ? config.emotions : level === 1 ? config.manifestations : config.sectors;
  const selected = (level, id) => level === 0 ? draft().emotion === id : (level === 1 ? draft().manifestations : draft().sectors).includes(id);
  const canNeeds = () => !!draft().emotion && (draft().manifestations.length > 0 || draft().skipped);
  const canStep = level => level === 0 || (level === 1 ? !!draft().emotion : canNeeds());
  const color = (item, level) => level === 2 ? book.chakras[item.chakra].color : item.color;
  const possibilities = () => { const d=draft(),key=[d.emotion,...d.manifestations,d.context].join('|');if(key!==candidateKey){candidateKey=key;candidateValue=model.analyze(config,book,d);}return candidateValue; };
  function related(level, item) {
    if (level === 1) return config.emotions.find(e => e.id === draft().emotion)?.manifestations.includes(item.id);
    if (level === 2) return canNeeds() && possibilities().some(n => n.id === item.needId);
    return false;
  }
  function point(radius, angle) { const a = angle * Math.PI / 180; return [180 + radius * Math.cos(a), 180 + radius * Math.sin(a)]; }
  function path(a, b, inner = 65) {
    const p = point(166, a), q = point(166, b), r = point(inner, b), s = point(inner, a);
    return `M${p} A166 166 0 0 1 ${q} L${r} A${inner} ${inner} 0 0 0 ${s} Z`;
  }
  function wheelSVG(level) {
    const list = items(level), size = 360 / list.length;
    return `<svg class="wheel-svg" data-wheel-level="${level}" viewBox="0 0 360 360" tabindex="0" role="group" aria-label="${['Круг эмоций','Круг проявлений','Круг потребностей'][level]}. Стрелки вращают круг, Enter выбирает сектор. Также доступен список названий."><circle cx="180" cy="180" r="173" fill="#faf7ef" stroke="#b49a60" stroke-width="1"/><g class="wheel-rotation" style="transform:rotate(${angles[level]}deg)">${list.map((item, i) => {
      const a = i * size - 90, b = a + size, p = point(146, a + size / 2);
      return `<g><path class="wheel-sector" data-sector="${item.id}" data-level="${level}" d="${path(a,b,level===0?35:65)}" fill="${color(item,level)}"><title>${esc(item.label)}${level === 2 ? ' · ' + book.chakras[item.chakra].name : ''}</title></path>${level === 0 ? `<text class="wheel-emotion-label" transform="rotate(${a+size/2} 180 180)" x="290" y="180" dominant-baseline="middle" text-anchor="middle">${esc(item.label)}</text>` : level === 1 ? `<text class="wheel-number" style="transform:rotate(${-angles[level]}deg)" x="${p[0]}" y="${p[1]}" dominant-baseline="middle" text-anchor="middle">${i+1}</text>` : ''}</g>`;
    }).join('')}</g><circle class="wheel-grip" data-wheel-grip="${level}" cx="180" cy="180" r="175"/><circle cx="180" cy="180" r="${level===0?35:63}" fill="#faf7ef" stroke="#b49a60" stroke-width="1"/></svg>`;
  }
  function pane(level) {
    return `<section class="wheel-pane ${step === level ? 'active-step' : ''}" data-pane="${level}"><p class="wheel-stage-label">Круг ${level+1} из 3</p><h2>${['Что я чувствую?','Как это проявляется?','Какая потребность?'][level]}</h2><div class="wheel-face"><div class="wheel-scroller"><div class="wheel-stage" style="width:${zooms[level]*100}%">${wheelSVG(level)}<div class="wheel-pointer"></div><div class="wheel-center">${level===0?'<span class="wheel-center-mark" aria-hidden="true">✳</span>':['','Проявления','Потребности'][level]+`<span>${items(level).length} секторов</span>`}</div></div></div></div><div class="wheel-controls"><button class="secondary" data-wheel-turn="-1" data-level="${level}" aria-label="Предыдущий сектор круга ${level+1}">↶</button><button class="secondary" data-wheel-turn="1" data-level="${level}" aria-label="Следующий сектор круга ${level+1}">↷</button></div><div class="wheel-zoom"><label for="wheel-zoom-${level}">Масштаб</label><input id="wheel-zoom-${level}" type="range" min="1" max="2" step=".25" value="${zooms[level]}" data-wheel-zoom="${level}"></div><div class="wheel-preview" id="wheel-preview-${level}" aria-live="polite"></div><button class="wheel-select-current" data-wheel-select-current="${level}">Выбрать сектор у указателя</button><details open><summary>Доступный список названий</summary>${level === 2 ? '<div class="wheel-list-toggle"><button class="secondary" data-wheel-list="all">Все сектора</button><button class="secondary" data-wheel-list="suggested">Возможные связи</button></div>' : ''}<div class="wheel-options" id="wheel-options-${level}"></div></details></section>`;
  }
  function renderTool() {
    currentRecord = null;
    [draft().emotion, draft().manifestations[draft().manifestations.length-1], draft().sectors[draft().sectors.length-1]].forEach((id,level)=>{if(id){const index=items(level).findIndex(item=>item.id===id);if(index>=0){cursors[level]=index;angles[level]=-(index+.5)*360/items(level).length;}}});
    main.innerHTML = `<section class="wheel-intro"><a class="back" href="#home">← На главную</a><p class="eyebrow">От чувства к пониманию себя</p><h1>Колесо потребностей</h1><p>От того, что я чувствую, к тому, что мне действительно нужно.</p><p class="wheel-note">Подсветка показывает гипотезы, а не диагноз. Вы выбираете то, что вам подходит.</p><div class="wheel-top-actions"><button class="secondary" data-wheel-reset>Сбросить выбор</button><a href="#wheel-history">Мои сохраненные исследования ↗</a></div></section><div class="wheel-steps">${['Чувствую','Проявление','Потребности'].map((label,i) => `<button class="${i===step?'active':''}" data-wheel-step="${i}"><strong>${i+1}. ${label}</strong></button>`).join('')}</div><p class="wheel-step-status">Вращайте золотой ободок или нажимайте стрелки. Выбирайте сектор касанием или через список.</p><div class="wheel-columns"><svg class="wheel-link-layer" aria-hidden="true"></svg>${[0,1,2].map(pane).join('')}</div><div class="wheel-current-path" id="wheel-path" aria-live="polite"></div><section class="wheel-context"><h2>Добавьте свой контекст</h2><label for="wheel-context">К какой сфере относится ваше состояние?</label><select id="wheel-context">${config.contexts.map(c => `<option value="${c.id}" ${draft().context===c.id?'selected':''}>${esc(c.label)}</option>`).join('')}</select><label for="wheel-note">Что сейчас происходит? Что для вас важно?</label><textarea id="wheel-note" maxlength="5000" rows="3" placeholder="Заметка останется только в вашем браузере">${esc(draft().note)}</textarea><p class="wheel-note" style="margin-top:12px">Этот текст сохраняется как ваша заметка. Приложение не анализирует его автоматически.</p></section><div class="wheel-nav"><button class="secondary" data-wheel-prev>Предыдущий этап</button><button data-wheel-next>Следующий этап ↗</button></div><div id="wheel-suggestions" class="wheel-suggestions"></div><details class="wheel-source-info"><summary>Как перенесены исходные круги</summary><p>12 состояний, 32 проявления и 71 сектор потребностей сохранены по трем исходным изображениям. Цветовые группы потребностей соответствуют чакрам.</p><ul>${config.discrepancies.map(t => `<li>${esc(t)}</li>`).join('')}</ul><p>${esc(config.notice)}</p><a href="#catalog">Открыть полный справочник, включая «Комфорт» ↗</a></details>`;
    bind(); update();
    resizeObserver?.disconnect();
    if ('ResizeObserver' in window) { resizeObserver = new ResizeObserver(drawConnections); resizeObserver.observe($('.wheel-columns')); }
    requestAnimationFrame(drawConnections);
  }
  function setRotation(level, value) {
    angles[level] = value;
    const g = $(`[data-wheel-level="${level}"] .wheel-rotation`);
    if (g) { g.style.transform = `rotate(${value}deg)`; g.querySelectorAll(".wheel-number").forEach(number => number.style.transform = `rotate(${-value}deg)`); }
  }
  function turnTo(level, index) {
    cursors[level] = index;
    const desired = -(index + .5) * 360 / items(level).length;
    const delta = ((desired - angles[level] + 540) % 360 + 360) % 360 - 180;
    setRotation(level, angles[level] + delta);
  }
  function choose(level, id) {
    if (!canStep(level)) { api.toast('Сначала завершите предыдущий этап.'); return; }
    const index = items(level).findIndex(x => x.id === id); if (index < 0) return;
    const focused = document.activeElement, preserveFocus = focused?.dataset?.wheelChoice === id;
    if (level === 0) {
      if (draft().emotion !== id) { draft().emotion = id; draft().manifestations = []; draft().sectors = []; draft().skipped = false; }
    } else {
      const key = level === 1 ? 'manifestations' : 'sectors';
      draft()[key] = draft()[key].includes(id) ? draft()[key].filter(x => x !== id) : [...draft()[key], id];
      if (level === 1) draft().skipped = false;
    }
    turnTo(level, index); saveStore(); update();if(preserveFocus)$(`[data-wheel-choice="${id}"][data-level="${level}"]`)?.focus({preventScroll:true});
  }
  function explanation(level, item) {
    if (level === 0) return item.explanation;
    if (level === 1) return 'Можно заметить, где вы узнаете эту реакцию в своей ситуации. Отметьте только то, что вам подходит.';
    const n = book.needs.find(n => n.id === item.needId);
    return n ? n.meaning.split(/(?<=[.!?])\s/)[0] : 'В исходном круге есть «Новизна», но в книге нет ее отдельной карточки. Можно исследовать близкие темы: спонтанность, творчество, удовольствие и право на выбор.';
  }
  function update() {
    if (!$('.wheel-columns')) return;
    for (let level = 0; level < 3; level++) {
      const list = items(level), pane = $(`[data-pane="${level}"]`), current = list[cursors[level]] || list[0];
      pane.classList.toggle('active-step', step === level); pane.classList.toggle('locked', !canStep(level));
      pane.querySelectorAll('.wheel-sector').forEach(path => {
        const item = list.find(x => x.id === path.dataset.sector);
        path.classList.toggle('is-selected', selected(level,item.id));
        path.classList.toggle('is-related', !!related(level,item));
        path.classList.toggle('is-cursor', current.id===item.id);
      });
      $(`#wheel-preview-${level}`).innerHTML = `<p class="wheel-state-caption">${!canStep(level)?'Сначала завершите предыдущий этап':selected(level,current.id)?'Выбранный сектор':'Сектор у указателя'}</p><h3>${esc(current.label)}</h3><p>${esc(explanation(level,current))}</p>${level===2?`<p style="color:${color(current,level)}">${book.chakras[current.chakra].name}</p>`:''}`;
      const picked = level===2?model.uniqueSectors(config,draft()):list.filter(item=>selected(level,item.id));if(picked.length&&(picked.length>1||picked[0].label!==current.label))$(`#wheel-preview-${level}`).insertAdjacentHTML('beforeend',`<p class="wheel-state-caption">Выбрано вами</p><div class="wheel-chosen-names">${picked.map(item=>`<span>${esc(item.label)}</span>`).join('')}</div>`);
      const filtered = level === 2 && suggestedOnly ? list.filter(s => related(level,s)) : list;
      $(`#wheel-options-${level}`).innerHTML = filtered.length ? filtered.map((item,i) => `<button class="wheel-option ${selected(level,item.id)?'selected':''} ${related(level,item)?'related':''}" data-wheel-choice="${item.id}" data-level="${level}" style="--sector-color:${color(item,level)}" aria-pressed="${selected(level,item.id)}" ${!canStep(level)?'disabled':''}>${level<2?(list.indexOf(item)+1)+'. ':''}${esc(item.label)}${level===2?`<small>${book.chakras[item.chakra].name}${!item.needId?' · без отдельной карточки':''}</small>`:''}</button>`).join('') : '<p>После предыдущего этапа здесь появятся возможные связи. Все сектора доступны в полном списке.</p>';
      pane.querySelector('[data-wheel-select-current]').disabled = !canStep(level);
    }
    main.querySelectorAll('[data-wheel-step]').forEach(button => { const level=Number(button.dataset.wheelStep); button.classList.toggle('active',step===level);button.disabled=!canStep(level);button.setAttribute('aria-current',step===level?'step':'false'); });
    $('[data-wheel-prev]').disabled = step===0;
    const next = $('[data-wheel-next]');
    next.disabled = step===0 ? !draft().emotion : step===2 ? !draft().sectors.length : false;
    next.textContent = step===2 ? 'Мое исследование потребности ↗' : step===1 && !draft().manifestations.length ? 'Перейти без выбора проявления ↗' : 'Следующий этап ↗';
    const emotion = config.emotions.find(e=>e.id===draft().emotion), manifestations = config.manifestations.filter(m=>draft().manifestations.includes(m.id));
    $('#wheel-path').innerHTML = `${emotion?`<span class="wheel-pill">${esc(emotion.label)}</span>`:''}${manifestations.length?' → '+manifestations.map(m=>`<span class="wheel-pill">${esc(m.label)}</span>`).join(''):''}${draft().sectors.length?' → '+model.uniqueSectors(config,draft()).map(s=>`<span class="wheel-pill" style="--pill-color:${book.chakras[s.chakra].color}">${esc(s.label)}</span>`).join(''):''}`;
    $('#wheel-suggestions').innerHTML = canNeeds() ? `<h2>Возможные связи в разных чакрах</h2><p>Вы можете выбрать несколько потребностей, сравнить их или исследовать другие сектора. Подсветка не ограничивает ваш выбор.</p><div class="wheel-compare">${possibilities().map(item => {
      const n=book.needs.find(n=>n.id===item.id), sector=config.sectors.find(s=>s.needId===n.id), chosen=draft().sectors.some(id=>config.sectors.find(s=>s.id===id)?.needId===n.id);
      return `<article class="wheel-suggestion" style="--sector-color:${book.chakras[n.chakra].color}"><p style="color:${book.chakras[n.chakra].color}">${book.chakras[n.chakra].name}</p><h3>${esc(n.name)}</h3><p>${esc(n.meaning.split(/(?<=[.!?])\s/)[0])}</p><details><summary>Почему предложена эта тема?</summary>${item.reasons.map(r=>`<p>${esc(r)}</p>`).join('')}<p>Это варианты для размышления, а не доказанная связь.</p></details><div class="actions" style="margin-top:18px"><button class="secondary" data-wheel-choice="${sector.id}" data-level="2" aria-pressed="${chosen}">${chosen?'✓ Выбрана':'Выбрать для сравнения'}</button><a href="#need/${n.id}">Все 10 способов ↗</a></div></article>`;
    }).join('')}</div>` : '';
    drawConnections();
  }
  function drawConnections() {
    const layer=$('.wheel-link-layer'), columns=$('.wheel-columns'); if (!layer || !columns) return;
    const rect=columns.getBoundingClientRect(); if (!rect.width) return;
    layer.setAttribute('viewBox',`0 0 ${rect.width} ${rect.height}`);
    function anchor(level,id){const list=items(level),index=list.findIndex(item=>item.id===id);if(index<0)return null;const r=$(`[data-wheel-level="${level}"]`).getBoundingClientRect(),angle=-90+(index+.5)*360/list.length+angles[level],p=point(143,angle);return [r.left+p[0]*r.width/360-rect.left,r.top+p[1]*r.height/360-rect.top];}
    const curve=(a,b)=>`M${a[0]},${a[1]} C${a[0]+70},${a[1]-45} ${b[0]-70},${b[1]-45} ${b[0]},${b[1]}`;
    const paths=[],emotion=config.emotions.find(e=>e.id===draft().emotion),chosenManifestations=config.manifestations.filter(m=>draft().manifestations.includes(m.id));
    const line=(a,b,c,opacity=.4)=>{if(a&&b)paths.push(`<path d="${curve(a,b)}" fill="none" stroke="${c}" stroke-width="1.7" stroke-dasharray="5 6" opacity="${opacity}"/>`);};
    if(emotion){const targets=chosenManifestations.length?chosenManifestations:config.manifestations.filter(m=>emotion.manifestations.includes(m.id));targets.forEach(m=>line(anchor(0,emotion.id),anchor(1,m.id),'#a58b4d',chosenManifestations.length ? 0.45 : 0.25));}
    if(canNeeds()){
      const targets=draft().sectors.length?model.uniqueSectors(config,draft()):possibilities().map(n=>config.sectors.find(s=>s.needId===n.id));
      targets.forEach(sector=>{if(!sector)return;const ids=sector.needId?[sector.needId]:sector.alternatives||[],manifest=[...chosenManifestations].reverse().find(m=>m.needs.some(id=>ids.includes(id)));if(manifest)line(anchor(1,manifest.id),anchor(2,sector.id),book.chakras[sector.chakra].color);else if(emotion?.needs.some(id=>ids.includes(id)))line(anchor(0,emotion.id),anchor(2,sector.id),book.chakras[sector.chakra].color,.25);});
    }
    layer.innerHTML=paths.join('');
  }
  function researchRecord() {
    return { draft: JSON.parse(JSON.stringify(draft())), ways: model.selectedWays(config,book,draft(),api.wayStates()) };
  }
  function renderResult(record=null) {
    currentRecord=record; const r=record||researchRecord(), d=r.draft;
    const emotion=config.emotions.find(e=>e.id===d.emotion), manifestations=config.manifestations.filter(m=>d.manifestations.includes(m.id)), sectors=model.uniqueSectors(config,d);
    if (!emotion || !sectors.length) { main.innerHTML='<div class="wheel-empty"><h1>Начните свое исследование</h1><p>Выберите состояние и хотя бы одну потребность.</p><a href="#wheel">Открыть колесо ↗</a></div>';bind();return; }
    const wayMap=new Map(book.needs.flatMap(n=>n.ways.map(w=>[w.id,{n,w}])));
    main.innerHTML=`<section class="wheel-result"><a class="back" href="#wheel">← К колесу потребностей</a><p class="eyebrow">${record?'Сохраненное исследование':'Ваш путь к пониманию себя'}</p><h1>Мое исследование потребности</h1><p class="wheel-note">Это ваши наблюдения и возможные направления исследования. Вы сами выбираете, что вам подходит.</p>${record?`<p>${esc(new Date(record.date).toLocaleDateString('ru-RU'))}</p>`:''}<section class="reading"><h2>Что я чувствую</h2><h3>${esc(emotion.label)}</h3><p>${esc(emotion.explanation)}</p></section><section class="reading"><h2>Как это проявляется</h2>${manifestations.length?manifestations.map(m=>`<p>${esc(m.label)}</p>`).join(''):'<p>Проявления не выбраны. Вы решили исследовать потребности напрямую.</p>'}</section><h2>Какие потребности могут за этим стоять</h2><div class="wheel-compare">${sectors.map(s=>{const n=book.needs.find(n=>n.id===s.needId);return `<article class="wheel-suggestion" style="--sector-color:${book.chakras[s.chakra].color}"><p style="color:${book.chakras[s.chakra].color}">${book.chakras[s.chakra].name}</p><h3>${esc(s.label)}</h3><p>${esc(n?n.meaning:explanation(2,s))}</p>${n?`<a href="#need/${n.id}">Открыть описание и все 10 способов ↗</a>`:(s.alternatives||[]).map(id=>`<p><a href="#need/${id}">${esc(book.needs.find(n=>n.id===id).name)} ↗</a></p>`).join('')}</article>`;}).join('')}</div>${d.note?`<section class="reading"><h2>Мой контекст</h2><p>${esc(config.contexts.find(c=>c.id===d.context)?.label||'')}</p><p class="plan-text" style="white-space:pre-wrap">${esc(d.note)}</p></section>`:''}<section class="reading"><h2>Какие способы я выбрал</h2>${r.ways.length?r.ways.map(s=>{const entry=wayMap.get(s.id);return entry?`<h3>${esc(entry.n.name)}</h3><p>${s.done?'✓ Выполнено. ':''}${esc(entry.w.text)}</p>${s.note?`<p class="note">${esc(s.note)}</p>`:''}`:'';}).join(''):'<p>Откройте карточку потребности выше, выберите подходящие способы и вернитесь к исследованию. Они появятся здесь и в личном плане.</p>'}</section><div class="actions no-print"><button data-wheel-save>${record?'Сохранить копию':'Сохранить исследование'}</button><button class="secondary" data-wheel-pdf>Экспорт исследования в PDF</button><button class="secondary" data-wheel-continue>${record?'Продолжить это исследование':'Исследовать другую потребность'}</button><a href="#personal">Мое пространство ↗</a></div><p class="wheel-note" style="margin-top:22px">Результат сохраняется в этом браузере. Сохраненную версию можно открыть позже в «Моем пространстве».</p></section>`;
    bind();
  }
  function renderHistory() {
    main.innerHTML=`<section class="wheel-result"><a class="back" href="#personal">← В мое пространство</a><h1>Мои исследования</h1><div class="actions"><a href="#wheel">Начать новое исследование ↗</a>${stored.history.length?'<button class="secondary" data-wheel-backup>Скачать исследования</button>':''}</div>${stored.history.length?[...stored.history].reverse().map(r=>`<article class="wheel-history-item"><p>${esc(new Date(r.date).toLocaleDateString('ru-RU'))}</p><h2>${esc(config.emotions.find(e=>e.id===r.draft.emotion)?.label||'Мое исследование')}</h2><p>${model.uniqueSectors(config,r.draft).map(s=>esc(s.label)).join(' · ')}</p><a href="#research/${r.id}">Открыть результат ↗</a></article>`).join(''):'<div class="wheel-empty" style="margin-top:25px"><p>Здесь появятся исследования, которые вы сохраните после выбора потребностей.</p></div>'}</section>`;bind();
  }
  function download(blob,name) { const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000); }
  async function exportPDF(button) {
    button.disabled=true;
    try {
      const r=currentRecord||researchRecord(),d=r.draft;
      const emotion=config.emotions.find(e=>e.id===d.emotion), sectors=model.uniqueSectors(config,d), wayStates=Object.fromEntries(r.ways.map(w=>[w.id,{selected:true,done:w.done,note:w.note}]));
      const pdf=await window.motivationPDF({period:'day',plan:'',ways:wayStates,research:{emotion:emotion?.label||'',manifestations:config.manifestations.filter(m=>d.manifestations.includes(m.id)).map(m=>m.label),needs:sectors.map(s=>`${s.label} · ${book.chakras[s.chakra].name}${s.needId?'':' (в книге нет отдельной карточки)'}`),context:config.contexts.find(c=>c.id===d.context)?.label||'',note:d.note}},book);
      download(pdf,'мое-исследование-потребности.pdf');api.toast('PDF исследования готов');
    } catch { api.toast('Не удалось создать PDF. Проверьте подключение и попробуйте снова.'); }
    finally {button.disabled=false;}
  }
  function setStep(value) { if (!canStep(value)) return;step=value;update();$('.wheel-steps')?.scrollIntoView({block:'start',behavior:reduced()?'auto':'smooth'}); }
  function bind() {
    main.removeEventListener('click',onClick);main.addEventListener('click',onClick);
    main.removeEventListener('change',onChange);main.addEventListener('change',onChange);
    main.removeEventListener('input',onInput);main.addEventListener('input',onInput);
    main.removeEventListener('pointerdown',onDown);main.addEventListener('pointerdown',onDown);
    main.removeEventListener('pointermove',onMove);main.addEventListener('pointermove',onMove);
    main.removeEventListener('pointerup',onUp);main.addEventListener('pointerup',onUp);
    main.removeEventListener('pointercancel',onCancel);main.addEventListener('pointercancel',onCancel);
    main.removeEventListener('keydown',onKey);main.addEventListener('keydown',onKey);
  }
  function onClick(event) {
    const sector=event.target.closest('[data-sector]');
    if (sector) {const svg=sector.closest('.wheel-svg');if(svg.dataset.suppressClick==='yes'){svg.dataset.suppressClick='no';return;}choose(Number(sector.dataset.level),sector.dataset.sector);return;}
    const b=event.target.closest('button');if(!b||b.disabled)return;
    if(b.dataset.wheelChoice)choose(Number(b.dataset.level),b.dataset.wheelChoice);
    else if(b.dataset.wheelSelectCurrent!==undefined){const level=Number(b.dataset.wheelSelectCurrent);choose(level,items(level)[cursors[level]].id);}
    else if(b.dataset.wheelTurn){const level=Number(b.dataset.level),size=items(level).length,index=(cursors[level]+Number(b.dataset.wheelTurn)+size)%size;turnTo(level,index);update();}
    else if(b.dataset.wheelStep!==undefined)setStep(Number(b.dataset.wheelStep));
    else if(b.hasAttribute('data-wheel-prev'))setStep(Math.max(0,step-1));
    else if(b.hasAttribute('data-wheel-next')){if(step===1&&!draft().manifestations.length){draft().skipped=true;saveStore();}if(step<2)setStep(step+1);else location.hash='wheel-result';}
    else if(b.hasAttribute('data-wheel-reset')){stored.draft=empty();step=0;angles=[15,0,112];cursors=[11,0,48];zooms=[1,1,1];saveStore();renderTool();}
    else if(b.dataset.wheelList){suggestedOnly=b.dataset.wheelList==='suggested';update();}
    else if(b.hasAttribute('data-wheel-save')){const r=currentRecord?JSON.parse(JSON.stringify(currentRecord)):researchRecord();r.id=crypto.randomUUID?crypto.randomUUID():`r-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;r.date=new Date().toISOString();stored.history.push(r);if(!saveStore('Исследование сохранено'))stored.history.pop();}
    else if(b.hasAttribute('data-wheel-pdf'))exportPDF(b);
    else if(b.hasAttribute('data-wheel-continue')){if(currentRecord)stored.draft=model.normalize(config,currentRecord.draft);step=2;saveStore();location.hash='wheel';}
    else if(b.hasAttribute('data-wheel-backup'))download(new Blob([JSON.stringify({version:1,history:stored.history},null,2)],{type:'application/json'}),'мои-исследования.json');
  }
  function onChange(event){if(event.target.id==='wheel-context'){draft().context=event.target.value;saveStore();update();}}
  function onInput(event){
    if(event.target.id==='wheel-note'){draft().note=event.target.value;saveStore();}
    if(event.target.dataset.wheelZoom!==undefined){const level=Number(event.target.dataset.wheelZoom),value=Number(event.target.value);zooms[level]=value;const stage=$(`[data-pane="${level}"] .wheel-stage`);stage.style.width=`${value*100}%`;drawConnections();}
  }
  function onDown(event){
    const svg=event.target.closest('.wheel-svg');if(!svg||!event.isPrimary||event.button!==0)return;
    const rect=svg.getBoundingClientRect(),level=Number(svg.dataset.wheelLevel);
    activeDrag={svg,level,id:event.pointerId,x:event.clientX,y:event.clientY,cx:rect.left+rect.width/2,cy:rect.top+rect.height/2,previous:Math.atan2(event.clientY-(rect.top+rect.height/2),event.clientX-(rect.left+rect.width/2)),moved:false,grip:!!event.target.closest('[data-wheel-grip]'),mouse:event.pointerType!=='touch'};
    svg.dataset.suppressClick='no';
  }
  function onMove(event){
    const d=activeDrag;if(!d||d.id!==event.pointerId)return;
    const dx=event.clientX-d.x,dy=event.clientY-d.y;
    if(!d.moved){if(Math.hypot(dx,dy)<10)return;if(!d.grip&&!d.mouse&&Math.abs(dy)>Math.abs(dx)){d.svg.dataset.suppressClick='yes';activeDrag=null;return;}d.moved=true;d.svg.classList.add('dragging');d.svg.setPointerCapture?.(event.pointerId);}
    const next=Math.atan2(event.clientY-d.cy,event.clientX-d.cx),delta=Math.atan2(Math.sin(next-d.previous),Math.cos(next-d.previous))*180/Math.PI;
    angles[d.level]+=delta;d.previous=next;d.svg.dataset.suppressClick='yes';
    if(!dragFrame)dragFrame=requestAnimationFrame(()=>{dragFrame=null;if(activeDrag)setRotation(activeDrag.level,angles[activeDrag.level]);});
  }
  function onUp(event){
    const d=activeDrag;if(!d||d.id!==event.pointerId)return;
    if(d.moved){setRotation(d.level,angles[d.level]);const size=360/items(d.level).length;let angle=(((-angles[d.level])%360)+360)%360;cursors[d.level]=Math.floor(angle/size)%items(d.level).length;d.svg.dataset.suppressClick='yes';d.svg.classList.remove('dragging');update();}
    activeDrag=null;
  }
  function onCancel(){if(activeDrag){activeDrag.svg.dataset.suppressClick='yes';activeDrag.svg.classList.remove('dragging');}activeDrag=null;}
  function onKey(event){
    const svg=event.target.closest('.wheel-svg');if(!svg)return;const level=Number(svg.dataset.wheelLevel),size=items(level).length;
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();const delta=['ArrowRight','ArrowDown'].includes(event.key)?1:-1;turnTo(level,(cursors[level]+delta+size)%size);update();}
    else if(event.key==='Enter'||event.key===' '){event.preventDefault();choose(level,items(level)[cursors[level]].id);}
  }
  window.NeedsWheel={
    render(data,bridge){book=data;api=bridge;main=bridge.main;const expected=location.hash;main.innerHTML='<p class="loading">Открываем колесо потребностей...</p>';ready.then(()=>{if(location.hash!==expected)return;const hash=location.hash.slice(1);if(hash==='wheel-history')renderHistory();else if(hash.startsWith('research/')){const record=stored.history.find(r=>r.id===hash.split('/')[1]);if(record)renderResult(record);else{main.innerHTML='<div class="wheel-empty"><h1>Исследование не найдено</h1><a href="#wheel-history">Открыть сохраненные исследования</a></div>';}}else if(hash==='wheel-result')renderResult();else renderTool();}).catch(()=>{if(location.hash===expected)main.innerHTML='<div class="wheel-empty"><h1>Колесо не загрузилось</h1><p>Проверьте подключение и обновите страницу.</p></div>';});},
    needActions(){return `<div class="actions wheel-inline-actions no-print"><a href="#wheel" class="back">Исследовать другую потребность ↗</a>${(currentRecord?.draft||stored.draft).emotion&&(currentRecord?.draft||stored.draft).sectors?.length?`<a href="${currentRecord?'#research/'+currentRecord.id:'#wheel-result'}" class="back">К моему исследованию ↗</a>`:''}</div>`;},
    personalSection(){return `<section class="gentle no-print"><div><h2>Мои исследования потребностей</h2><p>${stored.history.length?'Сохранено исследований: '+stored.history.length:'Пройдите путь от чувства к потребности и сохраните свой результат.'}</p></div><a href="#wheel-history">Открыть исследования ↗</a></section>`;}
  };
})();
