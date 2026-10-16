/*
 * DO MY BEST — MainButton mini modal (BuyNowDropdown 74:539)
 *
 * The yellow panel with PS Store / Xbox / Steam grows upwards out of the MainButton
 * (clip-path), the store buttons rise in one after another and the arrow turns into
 * the close cross. Closes on the cross, Escape, a click outside (that click is
 * swallowed so nothing behind is activated), or when the game state changes.
 * Focus moves into the menu on open and back to the MainButton on close.
 */
(function () {
  'use strict';

  const stores = window.DMB_CONFIG.stores;
  const menus = [...document.querySelectorAll('.buy')];
  let open = null;

  for (const a of document.querySelectorAll('.store-button')) {
    const url = stores[a.dataset.store];
    if (url) a.href = url;
    else { a.setAttribute('aria-disabled', 'true'); a.removeAttribute('target'); a.addEventListener('click', (e) => e.preventDefault()); }
  }

  function show(buy) {
    if (open && open !== buy) hide(open, false);
    const btn = buy.querySelector('.main-button');
    const menu = buy.querySelector('.buy__menu');
    menu.hidden = false;
    menu.offsetWidth;                         // start the clip-path transition from the closed state
    buy.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', 'Close store links');
    open = buy;
    const first = menu.querySelector('.store-button');
    setTimeout(() => { if (open === buy && first) first.focus({ preventScroll: true }); }, 60);
  }

  function hide(buy, restoreFocus = true) {
    if (!buy) return;
    const btn = buy.querySelector('.main-button');
    const menu = buy.querySelector('.buy__menu');
    buy.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    btn.removeAttribute('aria-label');
    setTimeout(() => { if (!buy.classList.contains('is-open')) menu.hidden = true; }, 480);
    if (open === buy) open = null;
    if (restoreFocus) btn.focus({ preventScroll: true });
  }

  for (const buy of menus) {
    buy.querySelector('.main-button').addEventListener('click', () => {
      if (buy.classList.contains('is-open')) hide(buy); else show(buy);
    });
  }

  /* outside click: close, and don't let the click reach what is behind */
  document.addEventListener('click', (e) => {
    if (!open || open.contains(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    hide(open, false);
  }, true);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) { e.stopPropagation(); hide(open); }
  }, true);

  window.DMBBuyMenu = {
    closeAll() { if (open) hide(open, false); },
    get isOpen() { return !!open; },
  };
})();
