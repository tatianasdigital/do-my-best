/*
 * DO MY BEST — fixed chrome (TopBar + Navigation) themes and visibility
 *
 * - "bright" theme (TopBarBright 75:748 + dark Navigation 75:738) while FirstScreen1
 *   (yellow) is on screen; the regular theme everywhere else (dark backgrounds, video).
 *   hero.js tells us when the first screen changes; the switch is timed with the burn.
 * - The TopBar hides while the footer covers the viewport — the footer has its own logo
 *   and socials exactly where the TopBar sits.
 * - The Navigation stays over the footer and, like over the other #E3F14A screens,
 *   switches to the bright theme (dark pill) once the footer has reached it.
 */
(function () {
  'use strict';

  const topbar = document.querySelector('.topbar');
  const nav = document.querySelector('.navigation');
  const footer = document.querySelector('.footer');
  let heroBrightTop = true, heroBrightNav = true;   // hero.js switches each one as the burn passes under it
  let footerTop = Infinity;     // document y of the footer (cached on layout)

  function measure() { footerTop = footer.getBoundingClientRect().top + window.scrollY; }

  function update(y = window.scrollY) {
    const vh = window.innerHeight;
    const G = window.DMBGames;
    const onHero = y < vh * 0.5;
    const bright = (heroBrightTop && onHero) || !!(G && G.brightTop);
    const theme = bright ? 'bright' : 'dark';
    if (topbar.dataset.theme !== theme) topbar.dataset.theme = theme;
    const overFooter = y + vh * 0.5 > footerTop;
    topbar.classList.toggle('is-hidden', overFooter);
    // the Navigation is over the (lime) footer once the footer's top edge has passed its middle
    const r = nav.getBoundingClientRect();
    const navOnFooter = footerTop - y < (r.top + r.bottom) / 2;
    const navBright = (heroBrightNav && onHero) || !!(G && G.brightNav) || navOnFooter;
    const navTheme = navBright ? 'bright' : 'dark';
    if (nav.dataset.theme !== navTheme) nav.dataset.theme = navTheme;
    nav.classList.remove('is-hidden');
  }

  window.DMBChrome = {
    measure,
    update,
    /* which: 'top' | 'nav' | undefined (both) */
    setHeroBright(v, which) {
      if (which !== 'nav') heroBrightTop = v;
      if (which !== 'top') heroBrightNav = v;
      update();
    },
  };
})();
