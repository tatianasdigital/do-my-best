/*
 * DO MY BEST — smooth scrolling
 *
 * The document keeps scrolling NATIVELY (so sticky sections, focus and anchors all behave
 * normally). Wheel / trackpad and arrow / page keys move a target, and the real scroll
 * position glides towards it with frame-rate independent exponential easing — so the
 * page trails the input slightly and keeps coasting a moment after it stops (the
 * "Lenis-style" feel). Time constant: config.smooth.lerp. Any scroll that does not
 * come from us (keys, scrollbar drag, find-in-page) simply re-syncs the target.
 * Every scroll-driven effect reads window.scrollY, so they stay in sync with the
 * actual position. Disabled with prefers-reduced-motion (plain native scrolling).
 *
 * main.js routes wheel events: the first screen and the overlays may consume them
 * first; everything else goes to SmoothScroll.wheel().
 */
(function () {
  'use strict';

  const C = window.DMB_CONFIG.smooth;
  const rm = window.matchMedia('(prefers-reduced-motion: reduce)');

  let target = window.scrollY;
  let current = window.scrollY;
  let raf = 0;
  let last = 0;
  let lastSet = -1;
  let tween = null;          // programmatic scroll { from, to, t0, ms, done }
  let hold = false;          // after a locked snap: wheel ignored until the current gesture ends
  let lastWheelAt = 0;
  const listeners = new Set();

  const maxScroll = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const clamp = (v) => Math.max(0, Math.min(maxScroll(), v));
  const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

  function set(y) {
    lastSet = Math.round(y);
    window.scrollTo(0, y);
  }

  function frame(now) {
    const dt = Math.min(50, now - (last || now));
    last = now;
    if (tween) {
      const k = Math.min(1, (now - tween.t0) / tween.ms);
      current = tween.from + (tween.to - tween.from) * easeInOut(k);
      target = current;
      set(current);
      if (k >= 1) { const d = tween.done; tween = null; raf = 0; last = 0; if (d) d(); return; }
    } else {
      const a = 1 - Math.exp(-dt / C.lerp);
      current += (target - current) * a;
      if (Math.abs(target - current) < 0.4) current = target;
      set(current);
      if (current === target) { raf = 0; last = 0; return; }
    }
    raf = requestAnimationFrame(frame);
  }
  function run() { if (!raf) raf = requestAnimationFrame(frame); }

  /* foreign scrolls (keyboard, scrollbar, focus) re-sync the target */
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (!raf && Math.abs(y - lastSet) > 1) { target = current = y; }
    for (const fn of listeners) fn(y);
  }, { passive: true });

  window.SmoothScroll = {
    get enabled() { return !rm.matches; },
    get target() { return target; },
    get moving() { return !!raf; },
    get snapping() { return !!(tween && tween.lock); },
    get tweening() { return !!tween; },     // a programmatic scroll (link, snap) is running
    /* called by main.js with a wheel event it decided to scroll the page with */
    wheel(e) {
      if (rm.matches) return false;           // let the browser scroll natively
      e.preventDefault();
      // a locked snap (e.g. DiscordSection settling at the top): the wheel can't interrupt it,
      // and once it has landed the page stays put until the current gesture (incl. trackpad
      // inertia) is over — the next scroll moves on
      const now = performance.now(), idle = now - lastWheelAt;
      lastWheelAt = now;
      if (tween && tween.lock) return true;
      if (hold) { if (idle < C.snapIdleMs) return true; hold = false; }
      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 16;
      else if (e.deltaMode === 2) dy *= window.innerHeight;
      if (tween) { tween = null; current = target = window.scrollY; }
      if (!raf) current = window.scrollY;
      target = clamp(target + dy * C.wheelMultiplier);
      run();
      return true;
    },
    /* glide by dy px (keyboard) */
    nudge(dy) {
      if (rm.matches) { window.scrollBy(0, dy); return; }
      if (tween) { tween = null; current = target = window.scrollY; }
      if (!raf) current = window.scrollY;
      target = clamp(target + dy);
      run();
    },
    /* smooth programmatic scroll (links, back to top) */
    scrollTo(y, opts = {}) {
      y = clamp(y);
      if (rm.matches || opts.instant) { cancelAnimationFrame(raf); raf = 0; tween = null; current = target = y; set(y); if (opts.done) opts.done(); return; }
      const dist = Math.abs(y - window.scrollY);
      const ms = opts.duration || Math.min(C.linkDuration * 1.6, Math.max(500, C.linkDuration * Math.sqrt(dist / window.innerHeight) * 0.75));
      const done = opts.lock ? () => { hold = true; if (opts.done) opts.done(); } : opts.done;
      tween = { from: window.scrollY, to: y, t0: performance.now(), ms, done, lock: !!opts.lock };
      run();
    },
    stop() { cancelAnimationFrame(raf); raf = 0; tween = null; current = target = window.scrollY; },
    onScroll(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
})();
