/*
 * DO MY BEST — touch screens: tap feedback instead of "sticky" hover
 *
 * On a phone the browser keeps a tapped button in its :hover look until you tap somewhere else.
 * The hover looks are switched off for touch screens in the CSS (@media (hover: none)); instead,
 * a tapped button fades to 20 % (80 % transparent) while the finger is on it and comes back
 * to its normal look when the finger lifts. Mouse and keyboard are not affected.
 */
(function () {
  'use strict';

  const SEL = 'a[href], button, [data-buy], [data-trailer], [role="button"]';
  const DOWN_MS = 120, UP_MS = 260, MIN_MS = 140;
  let el = null, t0 = 0, anim = null;

  function press(target) {
    el = target; t0 = performance.now();
    if (anim) anim.cancel();
    anim = el.animate([{ opacity: getComputedStyle(el).opacity }, { opacity: 0.2 }], { duration: DOWN_MS, easing: 'ease-out', fill: 'forwards' });
  }
  function release() {
    if (!el) return;
    const target = el, a = anim;
    el = null; anim = null;
    // a quick tap still shows the fade before it comes back
    setTimeout(() => {
      if (a) a.cancel();                                   // (same frame: no flash) …
      const base = getComputedStyle(target).opacity;       // … so this is the button's own opacity again
      const back = target.animate([{ opacity: 0.2 }, { opacity: base }], { duration: UP_MS, easing: 'ease-in-out' });
      back.onfinish = () => back.cancel();
    }, Math.max(0, MIN_MS - (performance.now() - t0)));
  }

  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch' || !e.isPrimary) return;
    const t = e.target.closest && e.target.closest(SEL);
    if (t && !t.disabled) press(t);
  }, { passive: true });
  document.addEventListener('pointerup', release, { passive: true });
  document.addEventListener('pointercancel', release, { passive: true });   // the finger started a scroll
})();
