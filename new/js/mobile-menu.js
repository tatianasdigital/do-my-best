/*
 * DO MY BEST — phones only: MenuMobile button → ModalMenu (Figma 137:1307)
 *
 * The menu covers the screen (#0E0F0E); its own top bar has the logo and a CLOSE pill in the
 * very same places as the TopBar's logo and MENU pill, so the button seems to turn into CLOSE.
 * Entrance (like kstoimenov.com): five vertical dark columns fill the screen from the bottom up, one
 * after another, then the logo, CLOSE, the links (HOME · ABOUT · OUR GAMES · CONTACT) and the socials
 * come in. Closing plays it the other way: the text goes, then the columns leave upwards. The links are the NavigationNew ones (main.js scrolls to the section); the menu
 * closes first, then the page glides there. Close: CLOSE, Escape, or a link.
 * Only ever used in the mobile layout (the MENU button is hidden on desktop).
 */
(function () {
  'use strict';

  const menu = document.getElementById('mobile-menu');
  const opener = document.querySelector('.topbar .menu-button');
  if (!menu || !opener) return;
  const page = document.getElementById('page');
  const html = document.documentElement;
  const mq = window.matchMedia('(max-width: 767px)');
  let open = false, timers = [], savedY = 0;

  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
  // timings (keep in step with the CSS: 5 columns × 70 ms stagger + 640 ms each)
  const OPEN_MS = 760, TEXT_OUT_MS = 220, CLOSE_MS = 980;

  function show() {
    if (open || (window.DMBGameModals && window.DMBGameModals.isOpen)) return;
    open = true;
    clearTimers();
    savedY = window.scrollY;
    if (window.SmoothScroll) window.SmoothScroll.stop();
    html.classList.add('is-locked');
    page.setAttribute('inert', '');
    menu.classList.remove('is-closing', 'is-items');
    menu.hidden = false;
    menu.offsetWidth;
    menu.classList.add('is-open');                     // 1. the dark columns fill the screen from the bottom up
    later(() => menu.classList.add('is-items'), OPEN_MS);   // 2. then the logo, CLOSE, links and socials come in
    opener.setAttribute('aria-expanded', 'true');
    later(() => menu.querySelector('[data-menu-close]').focus({ preventScroll: true }), 60);
  }

  /* instant: a link was tapped — the page must be scrollable again right away */
  function hide(instant) {
    if (!open) return;
    open = false;
    clearTimers();
    menu.classList.remove('is-items');                 // 1. the text goes first
    later(() => menu.classList.add('is-closing'), TEXT_OUT_MS);   // 2. then the columns leave upwards, one after another
    page.removeAttribute('inert');
    if (!(window.DMBHero && window.DMBHero.locksPage)) html.classList.remove('is-locked');
    if (!instant) window.scrollTo(0, savedY);
    opener.setAttribute('aria-expanded', 'false');
    later(() => { menu.hidden = true; menu.classList.remove('is-open', 'is-closing'); }, TEXT_OUT_MS + CLOSE_MS);
    if (!instant) opener.focus({ preventScroll: true });
    if (window.DMBChrome) window.DMBChrome.update();
  }

  opener.addEventListener('click', (e) => { e.preventDefault(); show(); });
  // capture phase: the menu closes (and the page unlocks) before main.js scrolls to the section
  menu.addEventListener('click', (e) => {
    if (e.target.closest('[data-menu-close]')) { e.preventDefault(); hide(); return; }
    if (e.target.closest('[data-scroll-to], [data-goto-game]')) hide(true);
  }, true);
  document.addEventListener('keydown', (e) => {
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); hide(); return; }
    if (e.key === 'Tab') {                                     // keep focus inside the menu
      const items = [...menu.querySelectorAll('a[href], button')];
      const i = items.indexOf(document.activeElement);
      e.preventDefault();
      items[i === -1 ? 0 : (i + (e.shiftKey ? -1 : 1) + items.length) % items.length].focus();
    }
  });
  // no swiping the page (or the first screen) underneath
  menu.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  // leaving the phone layout (rotating a tablet, resizing) closes it
  (mq.addEventListener ? mq.addEventListener.bind(mq, 'change') : mq.addListener.bind(mq))(() => { if (!mq.matches) hide(true); });

  window.DMBMobileMenu = { open: show, close: hide, get isOpen() { return open; } };
})();
