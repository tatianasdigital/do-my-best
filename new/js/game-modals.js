/*
 * DO MY BEST — game modals: BuyNow (store links) and WatchTrailer (YouTube)
 *
 * Same entrance as the "Our games" Modal: the page behind blurs, the black panel rises in
 * (slight scale + slide), then its content appears. Close with the × button, Escape or a
 * click on the blurred page. While open the page can't scroll or be clicked, focus stays
 * inside, and on close the scroll position and focus are restored.
 * BuyNow is filled from config.gameInfo[n] (cover, title, store URLs). WatchTrailer creates
 * the YouTube iframe on open (autoplay — the click is the user gesture) and removes it on
 * close, so the video stops. The iframe scales with the window (16:9).
 */
(function () {
  'use strict';

  const CFG = window.DMB_CONFIG;
  const N = CFG.nav;
  const page = document.getElementById('page');
  const topbar = document.querySelector('.topbar');
  const nav = document.querySelector('.navigation');
  const buy = document.getElementById('buy-modal');
  const video = document.getElementById('trailer-modal');
  const frame = video.querySelector('.video-modal__frame');
  let current = null, timers = [], savedY = 0, lastFocus = null;

  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
  for (const m of [buy, video]) m.style.setProperty('--nav-blur-ms', `${N.blurDuration}ms`);

  function fillBuy(k) {
    const g = CFG.gameInfo[k];
    buy.dataset.game = k;
    buy.querySelector('.buy-modal__cover img').src = g.cover;
    buy.querySelector('.buy-modal__title').innerHTML = g.title;
    for (const a of buy.querySelectorAll('.store-pill')) a.href = g.stores[a.dataset.store];
  }
  function fillVideo(k) {
    const g = CFG.gameInfo[k];
    video.setAttribute('aria-label', `${g.name} — trailer`);
    frame.innerHTML = `<iframe src="https://www.youtube.com/embed/${g.trailer}?autoplay=1&rel=0&playsinline=1" title="${g.name} — trailer" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
  }

  function open(modal, k, opener) {
    if (current) return;
    current = modal;
    clearTimers();
    savedY = window.scrollY;
    lastFocus = opener || document.activeElement;
    if (window.SmoothScroll) window.SmoothScroll.stop();
    if (window.DMBYouTube) window.DMBYouTube.suspendAll();      // the background videos stop
    if (modal === buy) fillBuy(k); else fillVideo(k);
    document.documentElement.classList.add('is-locked');
    for (const el of [page, topbar, nav]) el.setAttribute('inert', '');
    modal.hidden = false;
    modal.offsetWidth;
    modal.classList.add('is-blurred');                       // 1. the page blurs
    later(() => modal.classList.add('is-panel'), N.panelDelay);   // 2. the black panel rises in
    later(() => {                                             // 3. its content appears
      modal.classList.add('is-content');
      const first = modal.querySelector(modal === buy ? '.store-pill' : '.modal-close');
      if (first) first.focus({ preventScroll: true });
    }, N.closeStateDelay + 80);
  }

  function close() {
    const modal = current;
    if (!modal) return;
    current = null;
    clearTimers();
    modal.classList.remove('is-content');
    later(() => modal.classList.remove('is-panel'), 80);
    later(() => modal.classList.remove('is-blurred'), 120);
    later(() => {
      modal.hidden = true;
      if (modal === video) frame.innerHTML = '';               // stop the trailer
      for (const el of [page, topbar, nav]) el.removeAttribute('inert');
      if (!(window.DMBHero && window.DMBHero.locksPage)) document.documentElement.classList.remove('is-locked');
      window.scrollTo(0, savedY);
      if (window.DMBYouTube) window.DMBYouTube.resumeAll();     // …and carry on where they stopped
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    }, 120 + N.closeDuration);
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-buy]');
    if (b) { e.preventDefault(); open(buy, +b.dataset.buy, b); return; }
    const t = e.target.closest('[data-trailer]');
    if (t) { e.preventDefault(); open(video, +t.dataset.trailer, t); return; }
    if (current && e.target.closest('[data-close]')) { e.preventDefault(); close(); }
  });

  document.addEventListener('keydown', (e) => {
    if (!current) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'Tab') {                                     // keep focus inside the panel
      const items = [...current.querySelectorAll('a[href], button')];
      const i = items.indexOf(document.activeElement);
      e.preventDefault();
      const next = i === -1 ? 0 : (i + (e.shiftKey ? -1 : 1) + items.length) % items.length;
      items[next].focus();
    }
  });

  window.DMBGameModals = {
    openBuy: (k) => open(buy, k),
    openTrailer: (k) => open(video, k),
    close,
    get isOpen() { return !!current; },
  };
})();
