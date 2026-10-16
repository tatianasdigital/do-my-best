/*
 * DO MY BEST — website orchestrator
 *
 * - waits for fonts and images, lays out the measured sections, starts the first screen
 * - one wheel router: Navigation overlay → first screen (until FirstScreen2 is revealed,
 *   or a fresh upward gesture at the very top) → smooth page scrolling. A gesture keeps
 *   the owner it started with, so trackpad inertia never leaks from one to the other.
 * - one keyboard router with the same rules (native keyboard scrolling otherwise)
 * - one scroll listener drives every scroll-linked effect from window.scrollY
 * - links: social / email (config.links), in-page scrolls, "go to game N"
 * Console: window.DMB (config, layout(), hero, games, about, …)
 */
(function () {
  'use strict';

  const CFG = window.DMB_CONFIG;
  const html = document.documentElement;
  const hero = window.DMBHero;
  const about = window.DMBAbout;
  const games = window.DMBGames;
  const chrome = window.DMBChrome;
  const overlay = window.DMBNavOverlay || { isOpen: false };   // the old "Our games" overlay is gone (NavigationNew links to pages)
  const smooth = window.SmoothScroll;

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  html.classList.add('is-locked');
  html.style.setProperty('--hover-ms', `${CFG.buttonHover.duration}ms`);

  /* ---------- links from config ---------- */
  for (const a of document.querySelectorAll('[data-link]')) {
    const url = CFG.links[a.dataset.link];
    if (!url) continue;
    a.href = url;
    if (url.startsWith('mailto:')) { a.removeAttribute('target'); a.removeAttribute('rel'); }
    else { a.target = '_blank'; a.rel = 'noopener'; }
  }

  /* ---------- lock: the page scrolls only once FirstScreen2 is revealed and no overlay is open ---------- */
  function applyLock() {
    html.classList.toggle('is-locked', hero.locksPage || overlay.isOpen);
    chrome.update();
  }
  hero.onChange = applyLock;

  /* ---------- layout (fluid; re-measured on resize) ---------- */
  function measure() {
    about.layout();
    games.layout();
    chrome.measure();
    onScroll(window.scrollY);
  }
  function layout() {
    hero.layout();
    measure();
  }
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layout, 150);
  });

  /* ---------- every scroll-linked effect, from the real scroll position ---------- */
  function onScroll(y) {
    about.update(y);
    games.update(y);
    chrome.update(y);
    hero.setVideoActive(y < window.innerHeight);
  }
  smooth.onScroll(onScroll);

  /* ---------- wheel router ---------- */
  let lastWheel = 0, owner = 'page';
  window.addEventListener('wheel', (e) => {
    if (e.ctrlKey) return;                               // pinch-zoom
    const now = performance.now();
    if (now - lastWheel > CFG.input.idleMs) {            // a new gesture decides its owner
      const atTop = window.scrollY <= 1 && !smooth.moving;
      if (overlay.isOpen) owner = 'none';
      else if (hero.locksPage || (atTop && e.deltaY < 0)) owner = 'hero';
      else owner = 'page';
    }
    lastWheel = now;
    if (overlay.isOpen || owner === 'none' || (window.DMBGameModals && window.DMBGameModals.isOpen)) { e.preventDefault(); return; }
    if (owner === 'hero' || hero.locksPage) { hero.wheel(e); return; }
    smooth.wheel(e);
  }, { passive: false });

  /* ---------- keyboard router ---------- */
  const DOWN = ['ArrowDown', 'PageDown', ' ', 'Spacebar'];
  const UP = ['ArrowUp', 'PageUp', 'Home'];
  window.addEventListener('keydown', (e) => {
    if (overlay.isOpen || (window.DMBGameModals && window.DMBGameModals.isOpen) || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target;
    if ((e.key === ' ' || e.key === 'Enter') && t.closest && t.closest('button, a, input, textarea, select')) return;
    const down = DOWN.includes(e.key) && !e.shiftKey;
    const up = UP.includes(e.key) || (e.key === ' ' && e.shiftKey);
    if (hero.locksPage) {
      if (down || up || e.key === 'End') { e.preventDefault(); if (down || up) hero.step(down ? 1 : -1); }
      return;
    }
    if (up && window.scrollY <= 1 && smooth.target <= 1) { e.preventDefault(); hero.step(-1); return; }
    // keyboard scrolling glides like the wheel
    if (t.closest && t.closest('input, textarea, select')) return;
    const vh = window.innerHeight, step = CFG.smooth.keyStep;
    const d = { ArrowDown: step, ArrowUp: -step, PageDown: vh * 0.9, PageUp: -vh * 0.9, ' ': (e.shiftKey ? -1 : 1) * vh * 0.9 }[e.key];
    if (d !== undefined) { e.preventDefault(); smooth.nudge(d); }
    else if (e.key === 'Home') { e.preventDefault(); smooth.scrollTo(0); }
    else if (e.key === 'End') { e.preventDefault(); smooth.scrollTo(document.documentElement.scrollHeight); }
  });

  /* ---------- in-page links ---------- */
  function goToGame(k) {
    hero.complete();
    applyLock();
    smooth.scrollTo(games.scrollYFor(k));
  }
  overlay.onGoto = goToGame;
  document.addEventListener('click', (e) => {
    const g = e.target.closest('[data-goto-game]');
    if (g && !g.closest('.nav-overlay')) { e.preventDefault(); goToGame(+g.dataset.gotoGame); return; }
    const s = e.target.closest('[data-scroll-to]');
    if (s) {
      e.preventDefault();
      const id = s.dataset.scrollTo;
      if (id === 'top') { smooth.scrollTo(0); return; }
      if (hero.locksPage) { hero.complete(); applyLock(); }
      if (id === 'about') smooth.scrollTo(about.top + 2);
      if (id === 'contact') { const f = document.querySelector('.footer'); smooth.scrollTo(f.getBoundingClientRect().top + window.scrollY); }
    }
  });
  document.querySelector('.skip-link').addEventListener('click', (e) => {
    e.preventDefault();
    hero.complete(); applyLock();
    smooth.scrollTo(about.top + 2, { instant: true });
    document.getElementById('about-label').setAttribute('tabindex', '-1');
    document.getElementById('about-label').focus();
  });

  /* ---------- boot ---------- */
  function assetsReady() {
    const fonts = ['200px Boldonse', '500 16px "Space Grotesk"', '400 16px "Space Grotesk"', '400 16px Syne']
      .map((f) => document.fonts.load(f).catch(() => {}));
    const imgs = [...document.images].map((i) => (i.decode ? i.decode().catch(() => {}) : Promise.resolve()));
    return Promise.race([
      Promise.all([...fonts, ...imgs]).then(() => document.fonts.ready),
      new Promise((r) => setTimeout(r, 6000)),
    ]);
  }

  assetsReady().then(() => {
    layout();
    hero.start();
    applyLock();
  });

  window.DMB = {
    config: CFG,
    layout,
    measure,
    hero,
    about,
    games,
    chrome,
    overlay,
    smooth,
    goToGame,
  };
})();
