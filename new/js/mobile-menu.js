/*
 * DO MY BEST — phones only: MenuMobile button → ModalMenu (Figma 137:1307)
 *
 * The menu covers the screen (#0E0F0E); its own top bar has the logo and a CLOSE pill in the
 * very same places as the TopBar's logo and MENU pill, so the button seems to turn into CLOSE.
 * Entrance: the black screen fades in, then the links (HOME · ABOUT · OUR GAMES · CONTACT)
 * and the social links rise in one after another — the same kind of motion as the desktop
 * modals. The links are the NavigationNew ones (main.js scrolls to the section); the menu
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

  function show() {
    if (open || (window.DMBGameModals && window.DMBGameModals.isOpen)) return;
    open = true;
    clearTimers();
    savedY = window.scrollY;
    if (window.SmoothScroll) window.SmoothScroll.stop();
    html.classList.add('is-locked');
    page.setAttribute('inert', '');
    menu.hidden = false;
    menu.offsetWidth;
    menu.classList.add('is-open');                     // 1. the black screen fades in
    later(() => menu.classList.add('is-items'), 120);  // 2. the links rise in, one after another
    opener.setAttribute('aria-expanded', 'true');
    later(() => menu.querySelector('[data-menu-close]').focus({ preventScroll: true }), 60);
  }

  /* instant: a link was tapped — the page must be scrollable again right away */
  function hide(instant) {
    if (!open) return;
    open = false;
    clearTimers();
    menu.classList.remove('is-items');
    menu.classList.remove('is-open');
    page.removeAttribute('inert');
    if (!(window.DMBHero && window.DMBHero.locksPage)) html.classList.remove('is-locked');
    if (!instant) window.scrollTo(0, savedY);
    opener.setAttribute('aria-expanded', 'false');
    later(() => { menu.hidden = true; }, 380);
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
