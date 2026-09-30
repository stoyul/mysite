/* ТОЧКА СИЛЫ — interactions */
(function () {
  'use strict';

  // --- Nav: blur background on scroll ---
  var nav = document.getElementById('nav');
  var onScroll = function () {
    if (window.scrollY > 40) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // --- Burger menu ---
  var burger = document.getElementById('burger');
  var menu = document.getElementById('navMenu');
  var toggle = function (open) {
    var isOpen = open !== undefined ? open : !menu.classList.contains('open');
    menu.classList.toggle('open', isOpen);
    burger.classList.toggle('open', isOpen);
    burger.setAttribute('aria-expanded', String(isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';
  };
  burger.addEventListener('click', function () { toggle(); });
  menu.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () { if (window.innerWidth <= 900) toggle(false); });
  });

  // --- Reveal on scroll ---
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  // --- Light parallax on board glow ---
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var px = document.querySelectorAll('[data-parallax]');
  if (!reduce && px.length) {
    var ticking = false;
    var move = function () {
      px.forEach(function (el) {
        var r = el.getBoundingClientRect();
        var f = parseFloat(el.getAttribute('data-parallax')) || 0.15;
        var offset = (r.top + r.height / 2 - window.innerHeight / 2) * -f;
        el.style.transform = 'translateX(-50%) translateY(' + offset.toFixed(1) + 'px)';
      });
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { window.requestAnimationFrame(move); ticking = true; }
    }, { passive: true });
    move();
  }

  // --- Booking form (placeholder submit) ---
  var form = document.getElementById('bookingForm');
  if (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var name = form.name.value.trim();
      var contact = form.contact.value.trim();
      if (!name || !contact) {
        (name ? form.contact : form.name).focus();
        return;
      }
      var ok = document.getElementById('formOk');
      ok.hidden = false;
      form.querySelector('button[type="submit"]').disabled = true;
      // TODO: подключить реальную отправку (e-mail / CRM / Telegram)
    });
  }
})();
