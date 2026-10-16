/*
 * DO MY BEST — Navigation overlay ("Our games", Modal 75:1539)
 *
 * Open (click Navigation):
 *   1. the page behind blurs and the black panel appears (it is anchored so that its
 *      NavigationClose slot is exactly where the fixed Navigation button is)
 *   2. Navigation turns into NavigationClose ("CLOSE")
 *   3. the Games block (three covers) rises in
 * Close: the Navigation/NavigationClose button, Escape, or a click on the blurred page.
 * While open, the page can't scroll or be clicked (main.js stops wheel/keys), focus stays
 * inside, and on close the scroll position and focus are restored. Reversible/repeatable.
 */
(function () {
  'use strict';

  const N = window.DMB_CONFIG.nav;
  const overlay = document.getElementById('nav-overlay');
  const nav = document.querySelector('.navigation');
  const page = document.getElementById('page');
  const topbar = document.querySelector('.topbar');
  let isOpen = false;
  let timers = [];
  let savedY = 0;
  let lastFocus = null;
  let onGoto = () => {};

  overlay.style.setProperty('--nav-blur-ms', `${N.blurDuration}ms`);
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  function open() {
    if (isOpen) return;
    isOpen = true;
    clearTimers();
    savedY = window.scrollY;
    lastFocus = document.activeElement;
    if (window.SmoothScroll) window.SmoothScroll.stop();
    if (window.DMBBuyMenu) window.DMBBuyMenu.closeAll();
    if (window.DMBYouTube) window.DMBYouTube.suspendAll();      // the background videos pause while the Modal is open
    document.documentElement.classList.add('is-locked');
    page.setAttribute('inert', '');
    topbar.setAttribute('inert', '');
    overlay.hidden = false;
    overlay.offsetWidth;
    overlay.classList.add('is-blurred');
    nav.setAttribute('aria-expanded', 'true');
    nav.setAttribute('aria-label', 'Close games menu');
    later(() => overlay.classList.add('is-panel'), N.panelDelay);
    later(() => { nav.classList.add('is-open'); window.DMBChrome.update(); }, N.closeStateDelay);
    later(() => {
      overlay.classList.add('is-games');
      const first = overlay.querySelector('.nav-game__cover');
      if (first) first.focus({ preventScroll: true });
    }, N.gamesDelay);
  }

  function close(opts = {}) {
    if (!isOpen) return;
    isOpen = false;
    clearTimers();
    overlay.classList.remove('is-games');
    later(() => { nav.classList.remove('is-open'); window.DMBChrome.update(); }, 80);
    later(() => overlay.classList.remove('is-panel'), 120);
    later(() => overlay.classList.remove('is-blurred'), 160);
    later(() => {
      overlay.hidden = true;
      page.removeAttribute('inert');
      topbar.removeAttribute('inert');
      // the first screen keeps the page locked until FirstScreen2 is revealed
      if (!(window.DMBHero && window.DMBHero.locksPage)) document.documentElement.classList.remove('is-locked');
      window.scrollTo(0, savedY);                // scroll position restored exactly
      if (window.DMBYouTube) window.DMBYouTube.resumeAll();     // …and carry on where they stopped
      if (opts.then) opts.then();
    }, 160 + N.closeDuration);
    nav.setAttribute('aria-expanded', 'false');
    nav.removeAttribute('aria-label');
    if (!opts.then && lastFocus && lastFocus !== document.body) lastFocus.focus({ preventScroll: true });
    else nav.focus({ preventScroll: true });
  }

  nav.addEventListener('click', () => (isOpen ? close() : open()));
  overlay.querySelector('[data-close]').addEventListener('click', () => close());

  overlay.addEventListener('click', (e) => {
    const card = e.target.closest('[data-goto-game]');
    if (!card) return;
    const k = +card.dataset.gotoGame;
    close({ then: () => onGoto(k) });
  });

  /* Escape + focus trap (panel + the Navigation/close button) */
  document.addEventListener('keydown', (e) => {
    if (!isOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'Tab') {
      const items = [...overlay.querySelectorAll('a[href], button'), nav];
      const i = items.indexOf(document.activeElement);
      e.preventDefault();
      const next = (i + (e.shiftKey ? -1 : 1) + items.length) % items.length;
      items[i === -1 ? 0 : next].focus();
    }
  });

  window.DMBNavOverlay = {
    open,
    close,
    get isOpen() { return isOpen; },
    set onGoto(fn) { onGoto = fn; },
  };
})();
