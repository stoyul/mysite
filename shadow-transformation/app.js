(() => {
  'use strict';

  function normalizeText(value) {
    return String(value ?? '').replace(/[\u0401\u0451]/g, (letter) => letter.charCodeAt(0) === 0x0401 ? 'Е' : 'е');
  }

  function normalizeStrings(value) {
    if (typeof value === 'string') return normalizeText(value);
    if (Array.isArray(value)) return value.map(normalizeStrings);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalizeStrings(item)]));
    return value;
  }

  const cards = normalizeStrings(window.SHADOW_ARCHETYPES || []);
  const metacodes = normalizeStrings(window.SHADOW_METACODES || {});
  const STORAGE_KEY = 'shadow-strength-paths-v1';
  let store = readStore();
  let current = null;
  let face = 'shadow';
  let practiceFinished = false;
  let completionPath = 'transformation';
  let reflectionEditedAfterPractice = false;
  let pendingAwareness = '';
  let lastScreen = 'home';

  const $ = (selector) => document.querySelector(selector);
  const screens = ['home', 'draw', 'card', 'practice', 'recommendations', 'final', 'library'];

  function readStore() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return saved && typeof saved === 'object' ? saved : {};
    } catch (_) { return {}; }
  }

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }
    catch (_) { /* The journey remains usable if browser storage is disabled. */ }
    updateCounts();
  }

  function updateCounts() {
    const values = Object.values(store);
    $('#saved-count').textContent = String(values.filter((item) => item.saved).length);
    $('#opened-stat').textContent = String(values.length);
    $('#transformed-stat').textContent = String(values.filter((item) => item.transformed && item.completionMode === 'transformation').length);
  }

  function recordFor(id) {
    return store[id] || null;
  }

  function isMeaningfulInsight(value) {
    const clean = String(value || '').trim();
    return clean.length >= 20 && clean.split(/\s+/).filter(Boolean).length >= 4;
  }

  function updateAwarenessButton() {
    const button = $('#complete-awareness');
    if (!button) return;
    button.disabled = !isMeaningfulInsight($('#awareness-input').value)
      || (completionPath === 'transformation' && (!practiceFinished || !reflectionEditedAfterPractice));
  }

  function ensureRecord(card) {
    if (!store[card.id]) {
      store[card.id] = { id: card.id, cardId: card.id, number: card.number, shadowName: card.shadowName, powerName: card.powerName, openedAt: new Date().toISOString(), powerOpened: false, transformed: false, saved: false, awareness: '' };
    }
    Object.assign(store[card.id], { cardId: card.id, number: card.number, shadowName: card.shadowName, powerName: card.powerName });
    persist();
    return store[card.id];
  }

  function setScreen(name) {
    for (const screen of screens) $(`#${screen}-screen`).hidden = screen !== name;
    lastScreen = name;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (name === 'library') renderLibrary();
  }

  function drawCard() {
    if (!cards.length) return;
    const selected = cards[Math.floor(Math.random() * cards.length)];
    current = selected;
    face = 'shadow';
    practiceFinished = false;
    pendingAwareness = '';
    ensureRecord(current);
    $('#draw-message').textContent = 'Твоя карта уже близко';
    setScreen('draw');
    window.setTimeout(() => {
      if (lastScreen === 'draw') showCurrentCard(false);
    }, 1450);
  }

  function openCard(id) {
    current = cards.find((card) => card.id === id) || null;
    if (!current) return;
    const record = ensureRecord(current);
    face = record.powerOpened ? 'power' : 'shadow';
    practiceFinished = Boolean(record.transformed);
    pendingAwareness = record.awareness || '';
    showCurrentCard(true);
  }

  function showCurrentCard(instant) {
    if (!current) return;
    const record = ensureRecord(current);
    const stage = $('.card-stage');
    stage.classList.toggle('is-power', face === 'power');
    stage.classList.toggle('no-motion', Boolean(instant));
    $('#card-image-front').src = current.shadowImage;
    $('#card-image-back').src = current.powerImage;
    $('#card-image-front').alt = `Карта Тени «${current.shadowName}»`;
    $('#card-image-back').alt = `Карта Силы «${current.powerName}»`;
    $('#card-image-front').onerror = () => { $('#card-image-front').alt = `Изображение карты Тени «${current.shadowName}» недоступно`; };
    $('#card-image-back').onerror = () => { $('#card-image-back').alt = `Изображение карты Силы «${current.powerName}» недоступно`; };
    $('#side-label').textContent = face === 'shadow' ? 'ТВОЯ ТЕНЬ' : 'СКРЫТАЯ СИЛА';
    $('#archetype-title').textContent = face === 'shadow' ? current.shadowName : current.powerName;
    $('#archetype-subtitle').textContent = face === 'shadow' ? 'Заметь, что откликается именно сейчас.' : 'Та же энергия — в ее принятом и осознанном проявлении.';
    const copy = face === 'shadow' ? current.shadowDescription : current.powerDescription;
    $('#side-copy').textContent = firstSentences(copy, 2);
    $('#card-hint').innerHTML = face === 'shadow'
      ? 'Нажми на карту, чтобы увидеть скрытую в ней Силу <span>↗</span>'
      : 'Нажми на карту, чтобы снова увидеть Тень <span>↺</span>';
    $('#flip-notice').hidden = !record.powerOpened || face !== 'power';
    $('#question-copy').textContent = face === 'shadow' ? 'Что ты сейчас понимаешь о себе?' : 'Как эта Сила уже проявляется в тебе?';
    $('#first-reflection').value = pendingAwareness;
    $('#description-copy').replaceChildren(...paragraphs(current.fullDescription));
    $('#description-panel').hidden = true;
    $('[data-action="description"]').setAttribute('aria-expanded', 'false');
    $('[data-action="description"]').innerHTML = 'Открыть описание <span aria-hidden="true">＋</span>';
    $('#journey-progress').style.width = face === 'shadow' ? '25%' : '50%';
    $('#journey-step').textContent = face === 'shadow' ? '01 / 04' : '02 / 04';
    $('#phase-kicker').textContent = face === 'shadow' ? 'ПЕРВЫЙ ШАГ · УВИДЕТЬ' : 'ВТОРОЙ ШАГ · ОТКРЫТЬ';
    setScreen('card');
  }

  function firstSentences(text, count) {
    const clean = String(text || '').trim();
    const sentences = clean.match(/[^.!?]+[.!?]+(?:[»”\"])?/g) || [clean];
    return sentences.slice(0, count).join(' ').trim();
  }

  function paragraphs(text) {
    return String(text || '').split(/\n\s*\n/).filter(Boolean).map((line) => {
      const p = document.createElement('p');
      p.textContent = line;
      return p;
    });
  }

  function renderMetacodes(card) {
    const container = $('#practice-copy');
    const data = metacodes[String(card.number)];
    container.replaceChildren();
    if (!data) {
      const notice = document.createElement('p');
      notice.textContent = 'Для этой пары пока нет сопоставленного текста метакодов.';
      container.append(notice);
      return;
    }
    for (const stage of data.stages) {
      const section = document.createElement('section');
      section.className = 'metacode-stage';
      const heading = document.createElement('h2');
      heading.textContent = stage.title;
      section.append(heading);
      for (const text of stage.paragraphs) {
        const p = document.createElement('p');
        p.textContent = text;
        section.append(p);
      }
      container.append(section);
    }
    const ending = document.createElement('p');
    ending.className = 'metacode-affirmation';
    ending.textContent = data.finalAffirmation;
    container.append(ending);
  }

  function showDescription() {
    const panel = $('#description-panel');
    panel.hidden = !panel.hidden;
    const button = $('[data-action="description"]');
    button.setAttribute('aria-expanded', String(!panel.hidden));
    button.innerHTML = panel.hidden ? 'Открыть описание <span aria-hidden="true">＋</span>' : 'Скрыть описание <span aria-hidden="true">−</span>';
    if (!panel.hidden) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function flipCard() {
    if (!current) return;
    const record = ensureRecord(current);
    face = face === 'shadow' ? 'power' : 'shadow';
    if (face === 'power') {
      record.powerOpened = true;
      persist();
    }
    showCurrentCard(false);
  }

  function openPractice() {
    if (!current) return;
    ensureRecord(current);
    completionPath = 'transformation';
    practiceFinished = false;
    reflectionEditedAfterPractice = false;
    $('#practice-pair').textContent = `${current.shadowName}  →  ${current.powerName}`;
    $('#practice-label').textContent = 'МЕТАКОДЫ ТРАНСФОРМАЦИИ';
    $('#practice-copy').hidden = false;
    renderMetacodes(current);
    $('#awareness-input').value = '';
    $('#awareness-area').hidden = true;
    $('#finish-practice').hidden = false;
    $('#awareness-error').textContent = '';
    updateAwarenessButton();
    $('#crystal-toast').hidden = true;
    setScreen('practice');
  }

  function openAwarenessOnly() {
    if (!current) return;
    completionPath = 'already-understood';
    practiceFinished = false;
    reflectionEditedAfterPractice = false;
    const record = ensureRecord(current);
    $('#practice-pair').textContent = `${current.shadowName}  →  ${current.powerName}`;
    $('#practice-label').textContent = 'ЛИЧНОЕ ОСОЗНАНИЕ';
    $('#practice-copy').hidden = true;
    $('#awareness-area').hidden = false;
    $('#finish-practice').hidden = true;
    $('#awareness-input').value = record.awareness || $('#first-reflection').value.trim();
    $('#awareness-error').textContent = '';
    updateAwarenessButton();
    $('#crystal-toast').hidden = true;
    setScreen('practice');
    $('#awareness-area').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function finishPractice() {
    if (!current) return;
    const record = ensureRecord(current);
    record.transformationStepReachedAt = new Date().toISOString();
    persist();
    practiceFinished = true;
    reflectionEditedAfterPractice = false;
    $('#finish-practice').hidden = true;
    $('#awareness-area').hidden = false;
    $('#awareness-input').value = '';
    $('#awareness-error').textContent = '';
    updateAwarenessButton();
    $('#crystal-toast').hidden = false;
    $('#crystal-toast').querySelector('span:last-child').innerHTML = 'Трансформация пройдена<br><small>Запиши свое осознание</small>';
    window.setTimeout(() => { $('#crystal-toast').hidden = true; }, 3200);
    $('#awareness-area').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function saveAwareness() {
    if (!current) return;
    pendingAwareness = $('#awareness-input').value.trim();
    if (!isMeaningfulInsight(pendingAwareness)) {
      $('#awareness-error').textContent = 'Запиши свое осознание хотя бы одним предложением.';
      updateAwarenessButton();
      return;
    }
    if (completionPath === 'transformation' && (!practiceFinished || !reflectionEditedAfterPractice)) {
      $('#awareness-error').textContent = 'Сначала пройди трансформацию и запиши итоговое осознание.';
      updateAwarenessButton();
      return;
    }
    const record = ensureRecord(current);
    record.awareness = pendingAwareness;
    record.shadowName = current.shadowName;
    record.powerName = current.powerName;
    record.number = current.number;
    record.completionMode = completionPath;
    record.transformed = completionPath === 'transformation';
    record.transformedAt = record.transformed ? new Date().toISOString() : null;
    record.completedAt = new Date().toISOString();
    persist();
    $('#journey-progress').style.width = '100%';
    showFinal();
  }

  function showRecommendations() {
    if (!current) return;
    const record = recordFor(current.id);
    $('#recommendation-pair').textContent = `${current.shadowName}  →  ${current.powerName}`;
    $('#recommendation-copy').replaceChildren(...paragraphs(current.recommendationText));
    if (record?.saved) $('#journey-progress').style.width = '100%';
    setScreen('recommendations');
  }

  function showFinal() {
    if (!current) return;
    const record = ensureRecord(current);
    if (!record.completedAt || !record.completionMode || !isMeaningfulInsight(record.awareness)) return;
    $('#final-shadow').textContent = current.shadowName;
    $('#final-power').textContent = current.powerName;
    $('#final-awareness').textContent = record.awareness;
    $('#final-awareness').hidden = false;
    $('#final-power-image').src = current.powerImage;
    $('#final-power-image').alt = `Карта Силы «${current.powerName}»`;
    $('#final-transformation-note').textContent = record.completionMode === 'transformation'
      ? 'Ты прошла трансформацию и записала свое осознание. Теперь ты возвращаешь себе эту Силу.'
      : 'Ты зафиксировала свое осознание. Теперь ты возвращаешь себе эту Силу.';
    $('#saved-feedback').textContent = record.saved ? 'Этот путь уже сохранен в твоих результатах.' : '';
    $('#save-result').hidden = Boolean(record.saved);
    $('#open-next-shadow').hidden = !record.saved;
    setScreen('final');
  }

  function saveResult() {
    if (!current) return;
    const record = ensureRecord(current);
    if (!record.completedAt || !record.completionMode || !isMeaningfulInsight(record.awareness)) return;
    record.cardId = current.id;
    record.number = current.number;
    record.shadowName = current.shadowName;
    record.powerName = current.powerName;
    record.saved = true;
    record.savedAt ||= new Date().toISOString();
    persist();
    $('#saved-feedback').textContent = 'Результат сохранен в твоем личном пространстве.';
    $('#save-result').hidden = true;
    $('#open-next-shadow').hidden = false;
  }

  function dateLabel(value) {
    if (!value) return 'Открыто ранее';
    try { return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value)); }
    catch (_) { return 'Открыто ранее'; }
  }

  function renderLibrary() {
    const entries = Object.values(store).sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt));
    updateCounts();
    $('#library-empty').hidden = entries.length > 0;
    const list = $('#library-list');
    list.replaceChildren();
    for (const record of entries) {
      const card = cards.find((item) => item.id === record.id);
      if (!card) continue;
      const article = document.createElement('article');
      article.className = 'saved-card';
      const image = document.createElement('div');
      image.className = 'saved-thumb';
      const img = document.createElement('img');
      img.src = card.shadowImage;
      img.alt = `Тень «${card.shadowName}»`;
      image.append(img);
      const info = document.createElement('div');
      info.className = 'saved-info';
      const title = document.createElement('h2');
      title.textContent = card.shadowName;
      const power = document.createElement('p');
      power.className = 'saved-power';
      power.textContent = `↓ ${card.powerName}`;
      const date = document.createElement('p');
      date.className = 'saved-date';
      date.textContent = dateLabel(record.savedAt || record.openedAt);
      const statuses = document.createElement('div');
      statuses.className = 'saved-status';
      const statusTexts = [record.powerOpened ? 'Сила открыта' : 'Тень открыта'];
      if (record.transformed && record.completionMode === 'transformation') statusTexts.push('Трансформация завершена');
      else if (record.completedAt) statusTexts.push('Осознание зафиксировано');
      if (record.saved) statusTexts.push('Результат сохранен');
      for (const text of statusTexts) {
        const pill = document.createElement('span');
        pill.className = 'status-pill';
        pill.textContent = text;
        statuses.append(pill);
      }
      info.append(title, power, date, statuses);
      if (record.awareness) {
        const awareness = document.createElement('p');
        awareness.className = 'awareness-preview';
        awareness.textContent = `«${record.awareness}»`;
        info.append(awareness);
      }
      const button = document.createElement('button');
      button.className = 'text-button';
      button.dataset.action = 'continue-card';
      button.dataset.id = card.id;
      button.textContent = 'Вернуться к архетипу →';
      info.append(button);
      article.append(image, info);
      list.append(article);
    }
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    if (action === 'consultation' && current) {
      const message = 'Здравствуйте! Хочу получить консультацию по трансформации Тени в Силу. Я из приложения „Архетипы Тени и Силы“.\n\nМоя Тень: ' + current.shadowName + '. Сила: ' + current.powerName + '.';
      $('#consultation-message').value = message;
      const telegramUrl = 'https://t.me/stoyul?text=' + encodeURIComponent(message);
      button.href = telegramUrl;
      $('#telegram-draft').href = telegramUrl;
      $('#consultation-dialog').showModal();
    }
    if (action === 'home') setScreen('home');
    if (action === 'draw') drawCard();
    if (action === 'flip') flipCard();
    if (action === 'description') showDescription();
    if (action === 'description-close') {
      $('#description-panel').hidden = true;
      $('[data-action="description"]').setAttribute('aria-expanded', 'false');
      $('[data-action="description"]').innerHTML = 'Открыть описание <span aria-hidden="true">＋</span>';
    }
    if (action === 'transform') openPractice();
    if (action === 'transform-from-recommendations') openPractice();
    if (action === 'already-understood') openAwarenessOnly();
    if (action === 'finish-practice') finishPractice();
    if (action === 'save-awareness') saveAwareness();
    if (action === 'recommendations') showRecommendations();
    if (action === 'save-result') saveResult();
    if (action === 'library') setScreen('library');
    if (action === 'back-card' && current) showCurrentCard(true);
    if (action === 'continue-card') openCard(button.dataset.id);
  });

  $('#first-reflection').addEventListener('input', (event) => {
    pendingAwareness = event.target.value;
    if (!current) return;
    const record = ensureRecord(current);
    record.awareness = pendingAwareness;
    persist();
  });
  $('#awareness-input').addEventListener('input', (event) => {
    pendingAwareness = event.target.value;
    if (completionPath === 'transformation' && practiceFinished) reflectionEditedAfterPractice = true;
    $('#awareness-error').textContent = '';
    if (!current) return;
    const record = ensureRecord(current);
    record.awareness = pendingAwareness;
    persist();
    updateAwarenessButton();
  });
  updateCounts();
})();
