(() => {
  const $ = id => document.getElementById(id);
  const home = $('home-view');
  const cardView = $('card-view');
  const cardStage = $('card-stage');
  const drawStatus = $('draw-status');
  const cardScene = $('card-scene');
  const flipCard = $('flip-card');
  const imageFront = $('front-image');
  const imageBack = $('back-image');
  const insightBox = $('insight-box');
  const insightInput = $('insight-input');
  const saveButton = $('save-insight');
  let currentCard = null;
  let currentInsight = '';
  let isFlipped = false;
  let isSaved = false;
  let drawTimer = 0;
  let enterTimer = 0;
  let toastTimer = 0;

  const readJSON = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  };
  const records = () => readJSON('discipline-mind-reflections-v1', []);
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const dateLabel = iso => new Intl.DateTimeFormat('ru-RU', {day:'numeric',month:'long',year:'numeric'}).format(new Date(`${iso}T12:00:00`));
  const dayKey = () => new Intl.DateTimeFormat('en-CA').format(new Date());
  let recent = readJSON('discipline-mind-recent-v1', []);

  function setHeaderCount() { $('journal-total').textContent = records().length; }
  function showHome() {
    document.body.classList.remove('is-focused');
    $('journal-view').hidden = true;
    cardView.hidden = true;
    home.hidden = false;
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function showJournal() {
    document.body.classList.remove('is-focused');
    home.hidden = true;
    cardView.hidden = true;
    $('journal-view').hidden = false;
    renderJournal();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  $('open-journal').addEventListener('click', showJournal);
  $('journal-back').addEventListener('click', showHome);
  document.querySelector('.site-title').addEventListener('click', event => {event.preventDefault();showHome();});

  function nextCard() {
    if (DECK.length < 2) return DECK[0] || null;
    const protectedIds = new Set(recent.slice(-2));
    const pool = DECK.filter(card => !protectedIds.has(card.id));
    const choices = pool.length ? pool : DECK;
    const selected = choices[Math.floor(Math.random() * choices.length)];
    recent.push(selected.id);
    recent = recent.slice(-8);
    sessionStorage.setItem('discipline-mind-recent-v1', JSON.stringify(recent));
    return selected;
  }

  function draw() {
    clearTimeout(drawTimer);
    clearTimeout(enterTimer);
    $('draw-card').disabled = true;
    $('another-card').disabled = true;
    const leavingHome = !home.hidden;
    if (leavingHome) home.classList.add('is-departing');
    else cardStage.classList.add('is-departing');
    enterTimer = setTimeout(() => {
      home.hidden = true;
      home.classList.remove('is-departing');
      cardStage.classList.remove('is-departing');
      $('journal-view').hidden = true;
      cardView.hidden = false;
      cardStage.hidden = true;
      drawStatus.hidden = false;
      drawStatus.classList.remove('settled');
      document.body.classList.add('is-focused');
      cardView.scrollIntoView({behavior:'smooth',block:'start'});
      drawTimer = setTimeout(() => {
      currentCard = nextCard();
      if (!currentCard) { drawStatus.hidden = true; home.hidden = false; return; }
      revealCard();
      }, 610);
    }, leavingHome ? 300 : 150);
  }
  $('draw-card').addEventListener('click', draw);
  $('another-card').addEventListener('click', draw);

  const deckStack = $('deck-stack');
  deckStack.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const box = deckStack.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width - .5;
    const y = (event.clientY - box.top) / box.height - .5;
    deckStack.style.transform = `translate(${(x * 4).toFixed(1)}px,${(y * 4).toFixed(1)}px)`;
  });
  deckStack.addEventListener('pointerleave', () => { deckStack.style.transform = ''; });

  function revealCard(savedInsight = '') {
    document.body.classList.add('is-focused');
    isFlipped = false;
    isSaved = false;
    currentInsight = savedInsight;
    flipCard.classList.remove('is-flipped');
    imageFront.src = currentCard.frontImage;
    imageBack.src = currentCard.backImage;
    imageFront.alt = `Карта ${currentCard.id}, лицевая сторона`;
    imageBack.alt = `Карта ${currentCard.id}, обратная сторона`;
    imageFront.setAttribute('aria-hidden', 'false');
    imageBack.setAttribute('aria-hidden', 'true');
    cardScene.setAttribute('aria-label', `Карта ${currentCard.id}. Нажмите, чтобы перевернуть`);
    $('flip-hint').textContent = 'НАЖМИ НА КАРТУ, ЧТОБЫ ПЕРЕВЕРНУТЬ';
    cardScene.classList.remove('just-flipped','card-revealing','is-flipping');
    requestAnimationFrame(() => cardScene.classList.add('card-revealing'));
    setTimeout(() => cardScene.classList.remove('card-revealing'), 1000);
    insightBox.hidden = true;
    $('save-message').textContent = '';
    insightInput.value = savedInsight;
    saveButton.disabled = !savedInsight.trim();
    setupAudio();
    drawStatus.hidden = true;
    cardStage.hidden = false;
    cardStage.classList.remove('card-arrives');
    requestAnimationFrame(() => cardStage.classList.add('card-arrives'));
    $('draw-card').disabled = false;
    $('another-card').disabled = false;
  }

  function flip() {
    if (!currentCard) return;
    isFlipped = !isFlipped;
    cardScene.classList.remove('just-flipped');
    cardScene.classList.add('is-flipping');
    setTimeout(() => cardScene.classList.remove('is-flipping'), 840);
    if (isFlipped) {
      requestAnimationFrame(() => cardScene.classList.add('just-flipped'));
      setTimeout(() => cardScene.classList.remove('just-flipped'), 1050);
    }
    flipCard.classList.toggle('is-flipped', isFlipped);
    imageFront.setAttribute('aria-hidden', String(isFlipped));
    imageBack.setAttribute('aria-hidden', String(!isFlipped));
    cardScene.setAttribute('aria-label', isFlipped ? `Карта ${currentCard.id}, обратная сторона. Нажмите, чтобы вернуть` : `Карта ${currentCard.id}, лицевая сторона. Нажмите, чтобы перевернуть`);
    $('flip-hint').textContent = isFlipped ? 'НАЖМИ, ЧТОБЫ ВЕРНУТЬСЯ К ЛИЦЕВОЙ СТОРОНЕ' : 'НАЖМИ НА КАРТУ, ЧТОБЫ ПЕРЕВЕРНУТЬ';
    if (isFlipped) {
      insightBox.hidden = false;
      if (currentInsight) insightInput.value = currentInsight;
      requestAnimationFrame(() => insightBox.classList.add('visible'));
    } else {
      insightBox.classList.remove('visible');
      insightBox.hidden = true;
    }
  }
  cardScene.addEventListener('click', flip);
  cardScene.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const box = cardScene.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width - .5;
    const y = (event.clientY - box.top) / box.height - .5;
    cardScene.style.setProperty('--tilt-x', `${(x * 2.4).toFixed(2)}deg`);
    cardScene.style.setProperty('--tilt-y', `${(-y * 2.4).toFixed(2)}deg`);
    cardScene.style.setProperty('--light-x', `${((x + .5) * 100).toFixed(1)}%`);
    cardScene.style.setProperty('--light-y', `${((y + .5) * 100).toFixed(1)}%`);
  });
  cardScene.addEventListener('pointerleave', () => {
    cardScene.style.setProperty('--tilt-x', '0deg');
    cardScene.style.setProperty('--tilt-y', '0deg');
  });
  insightInput.addEventListener('input', () => { saveButton.disabled = !insightInput.value.trim() || isSaved; });

  function showToast(message) {
    const toast = $('toast');
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 2200);
  }
  saveButton.addEventListener('click', () => {
    const insight = insightInput.value.trim();
    if (!insight || !currentCard || isSaved) return;
    const list = records();
    list.unshift({id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,date:dayKey(),cardId:currentCard.id,frontImage:currentCard.frontImage,backImage:currentCard.backImage,insight});
    localStorage.setItem('discipline-mind-reflections-v1', JSON.stringify(list));
    isSaved = true;
    currentInsight = insight;
    saveButton.disabled = true;
    $('save-message').textContent = 'Сохранено';
    setHeaderCount();
    showToast('Сохранено');
  });

  function renderJournal() {
    const list = records();
    $('journal-list').innerHTML = list.map(entry => `
      <article class="journal-entry" data-entry="${escapeHTML(entry.id)}">
        <button class="entry-open" type="button" aria-label="Открыть карту ${escapeHTML(entry.cardId)}">
          <img src="${escapeHTML(entry.frontImage || DECK.find(card => card.id === entry.cardId)?.frontImage || '')}" alt="Лицевая сторона карты ${escapeHTML(entry.cardId)}">
          <span class="entry-content"><span class="entry-date">${escapeHTML(dateLabel(entry.date))}</span><span class="entry-card-no">КАРТА ${escapeHTML(entry.cardId)}</span><span class="entry-insight">${escapeHTML(entry.insight)}</span><span class="entry-open-label">ОТКРЫТЬ КАРТУ <b aria-hidden="true">↗</b></span></span>
        </button>
        <button class="entry-delete" type="button" aria-label="Удалить осознание от ${escapeHTML(dateLabel(entry.date))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 7h15M9 7V4.8h6V7m-8.2 0 .8 12h8.8l.8-12M10 10v6m4-6v6"/></svg></button>
      </article>`).join('');
    $('journal-empty').hidden = list.length !== 0;
    $('journal-list').hidden = list.length === 0;
    $('journal-list').querySelectorAll('.journal-entry').forEach(row => {
      const id = row.dataset.entry;
      row.querySelector('.entry-open').addEventListener('click', () => {
        const entry = records().find(item => item.id === id);
        if (!entry) return;
        currentCard = DECK.find(card => card.id === entry.cardId);
        if (!currentCard) return;
        $('journal-view').hidden = true;
        cardView.hidden = false;
        drawStatus.hidden = true;
        revealCard(entry.insight);
        window.scrollTo({top:0,behavior:'smooth'});
      });
      row.querySelector('.entry-delete').addEventListener('click', () => {
        localStorage.setItem('discipline-mind-reflections-v1', JSON.stringify(records().filter(item => item.id !== id)));
        setHeaderCount();
        renderJournal();
      });
    });
  }

  function setupAudio() {
    const slot = $('audio-slot');
    slot.replaceChildren();
    slot.hidden = !currentCard?.audio;
    if (!currentCard?.audio) return;
    const audio = new Audio(currentCard.audio);
    const button = document.createElement('button');
    button.className = 'audio-button';
    button.type = 'button';
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 13v-2a7.5 7.5 0 0 1 15 0v2M4.5 12h3v6h-3zm12 0h3v6h-3z"/></svg><span>СЛУШАТЬ</span>';
    button.addEventListener('click', async () => {
      if (audio.paused) { await audio.play(); button.querySelector('span').textContent='ПАУЗА'; }
      else { audio.pause(); button.querySelector('span').textContent='СЛУШАТЬ'; }
    });
    audio.addEventListener('ended', () => button.querySelector('span').textContent='СЛУШАТЬ');
    slot.append(button);
  }

  $('journal-total').textContent = records().length;
  requestAnimationFrame(() => document.body.classList.add('motion-ready'));
})();
