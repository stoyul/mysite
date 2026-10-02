/* Telegram is a presentation host, not an authentication provider here.
 * Psychological answers stay in the game's existing local storage.
 * Never use initDataUnsafe as proof of identity or send answers to a bot. */
(() => {
  'use strict';
  const app = window.Telegram?.WebApp;
  if (!app || !app.initData) return;
  const root = document.documentElement;
  const supported = version => typeof app.isVersionAtLeast === 'function' && app.isVersionAtLeast(version);
  const call = (method, ...args) => {
    try { if (typeof app[method] === 'function') app[method](...args); } catch (_) { /* Older hosts remain playable. */ }
  };
  root.classList.add('telegram-miniapp');
  function updateViewport() {
    const height = Number(app.viewportStableHeight);
    if (Number.isFinite(height) && height > 0) root.style.setProperty('--miniapp-height', `${height}px`);
    for (const side of ['top', 'right', 'bottom', 'left']) {
      const safe = Math.max(0, Number(app.safeAreaInset?.[side]) || 0);
      const content = Math.max(0, Number(app.contentSafeAreaInset?.[side]) || 0);
      root.style.setProperty(`--miniapp-safe-${side}`, `${Math.max(safe, content)}px`);
    }
  }
  updateViewport();
  call('ready');
  call('expand');
  if (supported('6.1')) {
    call('setHeaderColor', '#100d14');
    call('setBackgroundColor', '#100d14');
  }
  if (supported('7.10')) call('setBottomBarColor', '#100d14');
  for (const event of ['viewportChanged', 'safeAreaChanged', 'contentSafeAreaChanged', 'fullscreenChanged']) {
    call('onEvent', event, updateViewport);
  }
  // Explicit control keeps fullscreen optional; regular browsers have no extra UI.
  if (supported('8.0') && typeof app.requestFullscreen === 'function') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'miniapp-fullscreen';
    function label() {
      button.textContent = app.isFullscreen ? 'Свернуть экран' : 'На весь экран';
      button.setAttribute('aria-pressed', String(Boolean(app.isFullscreen)));
    }
    button.addEventListener('click', () => call(app.isFullscreen ? 'exitFullscreen' : 'requestFullscreen'));
    call('onEvent', 'fullscreenChanged', label);
    label();
    document.body.append(button);
  }
})();
