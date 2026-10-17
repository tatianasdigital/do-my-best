/*
 * DO MY BEST — AboutSection: line-by-line highlight + ReadingProgressBar
 *
 * The AboutText paragraph is split into word spans (same text, spacing and wrapping),
 * and the RENDERED lines are measured (words grouped by their offsetTop). The number of
 * lines therefore follows the current viewport. The section is pinned (position: sticky)
 * and gets one scroll stage per line:
 *     stage k  →  lines 1…k are #E3F14A  →  progress bar = k / lines
 * A line that becomes read fills from left to right in one eased sweep (ease-in-out,
 * config.about.fillDuration); scrolling back up empties it from right to left.
 * Both are set from the same integer k, computed from window.scrollY, so they can never
 * drift apart, and scrolling up simply lowers k again. Re-measured on resize.
 */
(function () {
  'use strict';

  const A = window.DMB_CONFIG.about;
  const section = document.querySelector('.about');
  const text = section.querySelector('.about__text');
  const bar = section.querySelector('.reading-progress');
  const fill = section.querySelector('.reading-progress__fill');
  const original = text.textContent.trim();

  let words = [];
  let lines = [];          // arrays of word spans
  let top = 0;             // document y where the stage pins
  let stagePx = 1;
  let current = -1;
  let geo = [];            // per line: { x0, w, words: [{ el, x, w }] }
  let anim = [];           // per line: { v, from, to, t0 }
  let raf = 0;
  const rm = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);   // smooth start, smooth end

  function split() {
    text.setAttribute('aria-label', original);
    text.textContent = '';
    words = original.split(/\s+/).map((w, i, arr) => {
      const s = document.createElement('span');
      s.className = 'w';
      s.setAttribute('aria-hidden', 'true');
      s.textContent = w;
      text.appendChild(s);
      if (i < arr.length - 1) text.appendChild(document.createTextNode(' '));
      return s;
    });
  }

  function measureLines() {
    lines = [];
    let lastTop = null;
    for (const w of words) {
      const t = w.offsetTop;
      if (lastTop === null || Math.abs(t - lastTop) > 2) { lines.push([]); lastTop = t; }
      lines[lines.length - 1].push(w);
    }
    geo = lines.map((ws) => {
      const x0 = ws[0].offsetLeft;
      const last = ws[ws.length - 1];
      return { x0, w: last.offsetLeft + last.offsetWidth - x0, words: ws.map((el) => ({ el, x: el.offsetLeft - x0, w: el.offsetWidth })) };
    });
    const prev = anim;
    anim = lines.map((_, li) => { const v = prev[li] ? prev[li].to : 0; return { v, from: v, to: v, t0: 0 }; });
    lines.forEach((_, li) => paint(li));
    bar.setAttribute('aria-valuemax', lines.length);
  }

  // phones (HomePageMobile): the About text is static and white — no pinning, no progress bar
  const mobile = window.matchMedia('(max-width: 767px)');

  function layout() {
    if (mobile.matches) {
      section.style.height = '';
      section.style.setProperty('--about-h', `${section.offsetHeight}px`);   // CSS: sticky offset (rides along with the Games screen)
      top = section.getBoundingClientRect().top + window.scrollY;
      current = -1;
      return;
    }
    measureLines();
    const vh = window.innerHeight;
    stagePx = A.stageLength * vh;
    // pinned for (lines − 1) stages + a hold after the last line
    section.style.height = `${vh + (lines.length - 1) * stagePx + A.holdLength * vh}px`;
    top = section.getBoundingClientRect().top + window.scrollY;
    current = -1;
    update(window.scrollY);
  }

  /* the sweep position v (0…1 of the line's width) → how much of each word is filled */
  function paint(li) {
    const g = geo[li], pos = anim[li].v * g.w;
    for (const q of g.words) q.el.style.setProperty('--fill', Math.min(1, Math.max(0, (pos - q.x) / q.w)).toFixed(4));
  }
  function tick(now) {
    let running = false;
    anim.forEach((a, li) => {
      if (a.v === a.to) return;
      const k = Math.min(1, (now - a.t0) / A.fillDuration);
      a.v = k >= 1 ? a.to : a.from + (a.to - a.from) * ease(k);
      paint(li);
      if (k < 1) running = true;
    });
    raf = running ? requestAnimationFrame(tick) : 0;
  }
  function setLine(li, on) {
    const a = anim[li], to = on ? 1 : 0;
    if (a.to === to) return;
    a.from = a.v; a.to = to; a.t0 = performance.now();
    if (rm.matches) { a.v = to; paint(li); return; }
    if (!raf) raf = requestAnimationFrame(tick);
  }

  function update(y) {
    if (mobile.matches) return;
    const rel = y - top;
    const k = rel < -1 ? 0 : Math.min(lines.length, 1 + Math.floor(Math.max(0, rel) / stagePx));
    if (k === current) return;
    current = k;
    lines.forEach((ws, li) => {
      ws.forEach((w) => w.classList.toggle('is-lit', li < k));
      setLine(li, li < k);
    });
    fill.style.transform = `scaleX(${lines.length ? k / lines.length : 0})`;
    bar.setAttribute('aria-valuenow', k);
  }

  split();
  window.DMBAbout = {
    layout,
    update,
    get lines() { return lines.length; },
    get stage() { return current; },
    get top() { return top; },
    get stagePx() { return stagePx; },
  };
})();
