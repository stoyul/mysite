/* Touch-first motion enhancement. Catalog content and personal records remain independent. */
(() => {
  const main = document.querySelector('main');
  if (!main) return;
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const items = '.chapter, .need-card, .reading, .way, .gentle';
  const seen = new WeakSet();
  let frame;
  let pageAnimation;
  let pressed;
  const reveal = element => {
    element.classList.remove('motion-pending');
    element.classList.add('motion-visible');
  };
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        reveal(entry.target);
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: 0.04, rootMargin: '0px 0px 35px 0px' }) : null;
  const artObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    for (const entry of entries) entry.target.classList.toggle('motion-in-view', entry.isIntersecting);
  }, { threshold: 0.05 }) : null;
  function enhance() {
    frame = undefined;
    main.querySelectorAll(items).forEach((element, index) => {
      if (seen.has(element)) return;
      seen.add(element);
      element.style.setProperty('--reveal-delay', `${Math.min(index % 4 * 35, 105)}ms`);
      if (preference.matches || !observer) reveal(element);
      else {
        element.classList.add('motion-pending');
        observer.observe(element);
      }
    });
    main.querySelectorAll('.hero-art').forEach(element => {
      if (seen.has(element)) return;
      seen.add(element);
      if (artObserver) artObserver.observe(element);
      else element.classList.add('motion-in-view');
    });
    main.querySelectorAll('.chakra-dot').forEach(button => {
      const image = button.querySelector('.medallion');
      if (image) button.style.setProperty('--chakra-color', image.style.getPropertyValue('--color'));
    });
  }
  const changes = new MutationObserver(records => {
    if (!records.some(record => record.addedNodes.length)) return;
    if (records.some(record => record.target === main) && !preference.matches && main.animate) {
      pageAnimation?.cancel();
      pageAnimation = main.animate([
        { opacity: 0.4, transform: 'translateY(6px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 230, easing: 'cubic-bezier(.2,.7,.3,1)' });
    }
    if (frame === undefined) frame = requestAnimationFrame(enhance);
  });
  changes.observe(main, { childList: true, subtree: true });
  function clearPress() {
    if (pressed) pressed.element.classList.remove('touch-engaged');
    pressed = undefined;
  }
  main.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    const element = event.target.closest('button, .need-card');
    if (!element || element.disabled) return;
    clearPress();
    pressed = { element, x: event.clientX, y: event.clientY, id: event.pointerId };
    element.classList.add('touch-engaged');
  }, { passive: true });
  main.addEventListener('pointermove', event => {
    if (pressed && pressed.id === event.pointerId && Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) > 10) clearPress();
  }, { passive: true });
  window.addEventListener('pointercancel', clearPress, { passive: true });
  window.addEventListener('pointerup', clearPress, { passive: true });
  window.addEventListener('blur', clearPress);
  function syncVisibility() {
    document.body.classList.toggle('motion-paused', document.hidden);
    if (document.hidden) clearPress();
  }
  document.addEventListener('visibilitychange', syncVisibility);
  function syncPreference() {
    if (preference.matches) {
      pageAnimation?.cancel();
      main.querySelectorAll('.motion-pending').forEach(reveal);
      clearPress();
    }
  }
  if (preference.addEventListener) preference.addEventListener('change', syncPreference);
  else preference.addListener(syncPreference);
  window.addEventListener('beforeprint', () => main.querySelectorAll('.motion-pending').forEach(reveal));
  syncVisibility();
  enhance();
})();
