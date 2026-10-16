/*
 * DO MY BEST — First screen: FirstScreen1 → FirstScreen2
 *
 * The Liquid Flow shader (js/lib/liquid-flow.js) on a DOM snapshot (js/lib/raster.js):
 *   scroll ↓ : the liquid burn starts at once in the centre and, by itself (no further
 *              scrolling), spreads to all sides until FirstScreen1 is gone (config.hero.steps
 *              revealDuration / revealEasing); at 85 % revealed the FirstScreen2 headline slides
 *              out of its masks and the fixed TopBar / Navigation switch to their dark theme
 *   scroll ↑ (at the very top) : the same, backwards
 * While the first screen is not fully revealed the page itself does not scroll
 * (main.js routes the wheel / keys here). Layout is fluid: all shader distances are
 * Figma px × the current Figma scale.
 */
(function () {
  'use strict';

  const CFG = window.DMB_CONFIG;
  const H = CFG.hero;
  const root = document.querySelector('.hero');
  const sceneF1 = root.querySelector('.hero__scene--f1');
  const canvas = root.querySelector('.burn-canvas');
  const mask1 = sceneF1.querySelector('.title-mask--1');
  const mask2 = sceneF1.querySelector('.title-mask--2');
  const text1 = mask1.querySelector('.title-text');
  const text2 = mask2.querySelector('.title-text');
  const sceneF2 = root.querySelector('.hero__scene--f2');
  const fMask1 = sceneF2.querySelector('.title-mask--1');
  const fMask2 = sceneF2.querySelector('.title-mask--2');
  const fText1 = fMask1.querySelector('.title-text');
  const fText2 = fMask2.querySelector('.title-text');

  const rmQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = rmQuery.matches;

  let state = -1;          // -1 intro, 0 = FirstScreen1, 1 = small circle, 2 = FirstScreen2
  let ready = false;
  let busy = false;
  let lockedUntil = 0;
  let u = 1;               // Figma px → CSS px
  let onChange = () => {};

  /* FirstScreen2 background video (Vimeo, muted, looping). It plays under
     FirstScreen1 from load, so it is already running when the burn reveals it; it pauses
     while the first screen is scrolled away (main.js → setVideoActive). */
  const video = window.DMBVimeo(sceneF2.querySelector('.hero-video'), {
    vimeoId: H.video.vimeoId,
    start: H.video.start,
    zoom: H.video.zoom,
    title: 'BookWalker CG Trailer',
  });

  /* ---------- Liquid Flow (burn4 settings) ---------- */
  const B = H.burn;
  const SCALED = ['displacement', 'noiseScale', 'smear'];
  const source = { image: null, box: { left: 0, top: 0, width: 1, height: 1 } };
  const size = () => ({ w: root.clientWidth || window.innerWidth, h: root.clientHeight || window.innerHeight });
  const fx = window.LiquidFlow && window.LiquidFlow.create(canvas, {
    mode: 'image',
    preset: 'burn',
    from: source,          // a snapshot of FirstScreen1 …
    to: null,              // … burns away to nothing; FirstScreen2 is the DOM underneath
    region: () => { const s = size(); return { x: 0, y: 0, w: s.w, h: s.h }; },
    params: () => {
      const p = { ...B };
      for (const k of SCALED) if (k in p) p[k] *= u;
      return p;
    },
  });

  function buildBurn() {
    if (!fx) return;
    const k = Math.min(window.devicePixelRatio || 1, 1.5);
    const s = size();
    source.image = window.DMBRasterize(sceneF1, k);
    source.box = { left: 0, top: 0, width: s.w, height: s.h };
    fx.build(1);
  }

  /* ---------- Layout ---------- */
  function layout() {
    u = Math.min(window.innerWidth / CFG.frame.width, window.innerHeight / CFG.frame.height);
    sizeMasks();
    if (state === -1) return;
    // keep the titles that are already "out" in place, the hidden ones parked outside their masks
    if (state < 2 && !busy) hideF2TitlesInstant();
    if (ready && !busy) buildBurn();
    if (state === 1 && !busy && fx) { T = circleProgress(H.steps.circleRadius); }
  }

  /* Size each title mask to its text (centred by CSS), with a little room for glyph edges */
  function sizeMasks() {
    const m = H.intro.maskMargin * u;
    for (const [mask, text] of [[mask1, text1], [mask2, text2], [fMask1, fText1], [fMask2, fText2]]) {
      const w = text.offsetWidth;
      mask.style.width = `${w + 2 * m}px`;
      text.style.left = `${m}px`;
    }
  }

  /* ---------- Intro: FirstScreen1 headline slides out of its masks ---------- */
  function setIntroStart() {
    for (const el of [text1, text2]) { el.style.transition = 'none'; el.style.opacity = ''; }
    if (reducedMotion) {
      text1.style.transform = text2.style.transform = 'none';
      text1.style.opacity = text2.style.opacity = '0';
    } else {
      text1.style.transform = `translate3d(${-mask1.offsetWidth}px,0,0)`;
      text2.style.transform = `translate3d(${mask2.offsetWidth}px,0,0)`;
    }
    root.offsetWidth;
  }
  function playIntro() {
    const I = H.intro;
    const d2 = I.title1Delay + I.title2Delay;
    if (reducedMotion) {
      const f = H.reducedMotionFade;
      text1.style.transition = `opacity ${f}ms ease ${I.title1Delay}ms`;
      text2.style.transition = `opacity ${f}ms ease ${d2}ms`;
      text1.style.opacity = text2.style.opacity = '1';
      return d2 + f;
    }
    text1.style.transition = `transform ${I.title1Duration}ms ${I.easing} ${I.title1Delay}ms`;
    text2.style.transition = `transform ${I.title2Duration}ms ${I.easing} ${d2}ms`;
    text1.style.transform = text2.style.transform = 'translate3d(0,0,0)';
    return Math.max(I.title1Delay + I.title1Duration, d2 + I.title2Duration);
  }

  /* ---------- Two-step timeline (burn4) ---------- */
  const S = H.steps;
  const ease = {
    outCubic: (k) => 1 - Math.pow(1 - k, 3),
    inCubic: (k) => k * k * k,
    inOutCubic: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
    inOutQuint: (k) => (k < 0.5 ? 16 * k ** 5 : 1 - Math.pow(-2 * k + 2, 5) / 2),
    inOutSine: (k) => -(Math.cos(Math.PI * k) - 1) / 2,
  };
  const P = () => (fx ? fx.params : { ...LiquidFlow.DEFAULTS, ...LiquidFlow.PRESETS.burn, ...B });
  /* a point at distance d (fraction of centre → far corner) is burned through once T(1+spread) − d·spread ≥ swapAt */
  const goneAt = (d, p) => (p.swapAt + d * p.spread) / (1 + p.spread);
  const circleProgress = (r) => goneAt(r, P());
  function revealProgress(share) {
    const p = P(), s = size();
    const cx = p.center[0] * s.w, cy = p.center[1] * s.h;
    const far = Math.hypot(Math.max(cx, s.w - cx), Math.max(cy, s.h - cy));
    const ts = [];
    for (let y = 0.5; y < 24; y++) for (let x = 0.5; x < 40; x++) ts.push(goneAt(Math.min(1, Math.hypot((x / 40) * s.w - cx, (y / 24) * s.h - cy) / far), p));
    ts.sort((a, b) => a - b);
    return ts[Math.min(ts.length - 1, Math.floor(share * ts.length))];
  }

  /* master render loop: while the canvas is on screen it redraws every frame,
     so the liquid edge keeps swirling while the small circle holds */
  let T = 0, loopRaf = 0, anim = null;
  const clock0 = performance.now();
  function loop(now) {
    if (anim) {
      const k = Math.min(1, (now - anim.t0) / anim.ms);
      T = anim.from + (anim.to - anim.from) * anim.ease(k);
      if (k >= 1) { const cb = anim.done; anim = null; fx.renderAt(T, (now - clock0) / 1000); if (cb) cb(); }
    }
    if (loopRaf) fx.renderAt(T, (now - clock0) / 1000);
    if (loopRaf) loopRaf = requestAnimationFrame(loop);
  }
  function startLoop() { if (!loopRaf) loopRaf = requestAnimationFrame(loop); }
  function stopLoop() { cancelAnimationFrame(loopRaf); loopRaf = 0; anim = null; }
  function animateTo(to, ms, easeFn, done) { anim = { from: T, to, t0: performance.now(), ms, ease: easeFn, done }; startLoop(); }
  function timeToReach(from, to, ms, easeFn, at) {
    let lo = 0, hi = 1;
    for (let i = 0; i < 30; i++) { const k = (lo + hi) / 2; if (from + (to - from) * easeFn(k) >= at) hi = k; else lo = k; }
    return hi * ms;
  }

  /* ---------- FirstScreen2 headline: the same mask entrance as on load ---------- */
  let titleTimer = 0, chromeTimer = 0;
  function hideF2TitlesInstant() {
    clearTimeout(titleTimer);
    for (const el of [fText1, fText2]) { el.style.transition = 'none'; el.style.opacity = '1'; }
    if (reducedMotion) {
      fText1.style.transform = fText2.style.transform = 'none';
      fText1.style.opacity = fText2.style.opacity = '0';
    } else {
      fText1.style.transform = `translate3d(${-fMask1.offsetWidth}px,0,0)`;
      fText2.style.transform = `translate3d(${fMask2.offsetWidth}px,0,0)`;
    }
  }
  function showF2TitlesInstant() {
    clearTimeout(titleTimer);
    for (const el of [fText1, fText2]) { el.style.transition = 'none'; el.style.transform = 'none'; el.style.opacity = '1'; }
  }
  function showTitles(atMs) {
    const I = H.intro;
    hideF2TitlesInstant();
    root.offsetWidth;
    const d1 = Math.round(atMs), d2 = Math.round(atMs + I.title2Delay);
    if (reducedMotion) {
      const f = H.reducedMotionFade;
      fText1.style.transition = `opacity ${f}ms ease ${d1}ms`;
      fText2.style.transition = `opacity ${f}ms ease ${d2}ms`;
      fText1.style.opacity = fText2.style.opacity = '1';
      return;
    }
    fText1.style.transition = `transform ${I.title1Duration}ms ${I.easing} ${d1}ms`;
    fText2.style.transition = `transform ${I.title2Duration}ms ${I.easing} ${d2}ms`;
    fText1.style.transform = fText2.style.transform = 'translate3d(0,0,0)';
  }
  function hideTitles(ms) {
    clearTimeout(titleTimer);
    for (const el of [fText1, fText2]) { el.style.transition = `opacity ${ms}ms ease`; el.style.opacity = '0'; }
    titleTimer = setTimeout(hideF2TitlesInstant, ms);
  }
  function chromeLater(ms) { clearTimeout(chromeTimer); clearTimeout(navTimer); chromeTimer = setTimeout(() => window.DMBChrome.setHeroBright(false), ms); }
  function chromeBright() { clearTimeout(chromeTimer); clearTimeout(navTimer); window.DMBChrome.setHeroBright(true); }

  /* The fixed TopBar and Navigation switch theme exactly when the burn passes UNDER them (each one
     separately — the Navigation sits near the centre, so it is reached long before the corners):
     T at which the point under an element is burned through (forward) / starts to come back (reverse) */
  let navTimer = 0;
  function pointT(el, reverse) {
    const p = P(), s = size(), r = el.getBoundingClientRect();
    const cx = p.center[0] * s.w, cy = p.center[1] * s.h;
    const far = Math.hypot(Math.max(cx, s.w - cx), Math.max(cy, s.h - cy));
    // the element's farthest edge from the centre must be burned (forward) / its nearest edge back (reverse)
    const xs = [r.left, r.right], ys = [r.top, r.bottom];
    let dMax = 0, dMin = Infinity;
    for (const x of xs) for (const y of ys) { const d = Math.hypot(x - cx, y - cy) / far; dMax = Math.max(dMax, d); dMin = Math.min(dMin, d); }
    if (!reverse) return goneAt(Math.min(1, dMax), p);
    return (Math.min(1, dMin) * p.spread) / (1 + p.spread);        // the burn starts to reach it here
  }
  const timeToFall = (from, to, ms, easeFn, at) => {                 // decreasing T: time until T ≤ at
    let lo = 0, hi = 1;
    for (let i = 0; i < 30; i++) { const k = (lo + hi) / 2; if (from + (to - from) * easeFn(k) <= at) hi = k; else lo = k; }
    return hi * ms;
  };
  const navEl = document.querySelector('.navigation'), topEl = document.querySelector('.topbar__logo');
  function chromeForward(T0, TEND, ms, e) {
    clearTimeout(chromeTimer); clearTimeout(navTimer);
    const tNav = timeToReach(T0, TEND, ms, e, Math.min(TEND, pointT(navEl) + 0.01));
    const tTop = timeToReach(T0, TEND, ms, e, Math.min(TEND, pointT(topEl) + 0.01));
    navTimer = setTimeout(() => window.DMBChrome.setHeroBright(false, 'nav'), tNav);
    chromeTimer = setTimeout(() => window.DMBChrome.setHeroBright(false, 'top'), tTop);
  }
  function chromeReverse(TEND, ms, e) {
    clearTimeout(chromeTimer); clearTimeout(navTimer);
    const tNav = timeToFall(TEND, 0, ms, e, pointT(navEl, true));
    const tTop = timeToFall(TEND, 0, ms, e, pointT(topEl, true));
    navTimer = setTimeout(() => window.DMBChrome.setHeroBright(true, 'nav'), tNav);
    chromeTimer = setTimeout(() => window.DMBChrome.setHeroBright(true, 'top'), tTop);
  }

  /* ---------- FirstScreen1 → circle → FirstScreen2 (and back) ---------- */
  function goTo(target) {
    if (reducedMotion || !fx) target = target > state ? 2 : 0;
    if (target === state || target < 0 || target > 2) return;
    const from = state;
    state = target;
    root.dataset.state = ['F1', 'circle', 'F2'][state];
    busy = true;
    lockedUntil = Infinity;
    onChange(state, true);
    const done = () => { busy = false; lockedUntil = performance.now(); onChange(state, false); };

    if (from === 2) { hideTitles(H.titles.hideDuration); if (reducedMotion || !fx) chromeBright(); }

    if (reducedMotion || !fx) {
      const f = H.reducedMotionFade;
      root.style.setProperty('--fade', `${f}ms`);
      root.classList.toggle('is-f1-hidden', target === 2);
      if (target === 2) { showTitles(f); chromeLater(f / 2); }
      setTimeout(done, f);
      return;
    }

    const T1 = circleProgress(S.circleRadius);
    const TEND = Math.min(1, circleProgress(1) + 0.02);   // the far corners are gone here
    const R = ease[S.revealEasing] || ease.inOutSine;
    if (from === 0 && target === 2) {                    // one gesture: burn starts and opens fully by itself
      root.classList.add('is-burning', 'is-f1-hidden');
      T = 0;
      showTitles(timeToReach(0, TEND, S.revealDuration, R, revealProgress(H.titles.revealAt)));
      chromeForward(0, TEND, S.revealDuration, R);
      animateTo(TEND, S.revealDuration, R, () => { stopLoop(); root.classList.remove('is-burning'); done(); });
    } else if (from === 2 && target === 0) {             // back up at the very top: the same, reversed
      root.classList.add('is-burning');
      T = TEND;
      chromeReverse(TEND, S.revealDuration / S.reverseSpeed, R);
      animateTo(0, S.revealDuration / S.reverseSpeed, R, () => {
        stopLoop();
        root.classList.remove('is-burning', 'is-f1-hidden');
        done();
      });
    } else if (from === 0 && target === 1) {
      root.classList.add('is-burning', 'is-f1-hidden');
      T = 0;
      animateTo(T1, S.openDuration, ease[S.openEasing], done);
    } else if (from === 1 && target === 2) {
      const e = ease[S.growEasing];
      showTitles(timeToReach(T, TEND, S.growDuration, e, revealProgress(H.titles.revealAt)));
      chromeLater(timeToReach(T, TEND, S.growDuration, e, revealProgress(H.chromeAt)));
      animateTo(TEND, S.growDuration, e, () => { stopLoop(); root.classList.remove('is-burning'); done(); });
    } else if (from === 2 && target === 1) {
      root.classList.add('is-burning');
      T = TEND;
      animateTo(T1, S.growDuration / S.reverseSpeed, ease[S.growEasing], done);
    } else if (from === 1 && target === 0) {
      animateTo(0, S.openDuration / S.reverseSpeed, ease.inCubic, () => {
        stopLoop();
        root.classList.remove('is-burning', 'is-f1-hidden');
        done();
      });
    }
  }

  function step(dir) {
    if (!ready || busy || performance.now() < lockedUntil) return false;
    goTo(dir > 0 ? 2 : 0);              // no intermediate small-circle stop any more
    return true;
  }

  /* jump straight to FirstScreen2 (used by links that scroll deeper into the page) */
  function complete() {
    if (state === 2 && !busy) return;
    stopLoop();
    clearTimeout(chromeTimer); clearTimeout(navTimer);
    state = 2; busy = false; lockedUntil = 0;
    root.dataset.state = 'F2';
    root.classList.remove('is-burning');
    root.classList.add('is-f1-hidden');
    showF2TitlesInstant();
    window.DMBChrome.setHeroBright(false);
    onChange(state, false);
  }

  /* ---------- Wheel gestures: one gesture = one step (trackpad inertia can't re-trigger) ---------- */
  const IN = CFG.input;
  let lastWheelAt = 0, lastWheelAbs = 0, wheelAccum = 0, gestureConsumed = false;
  function wheel(e) {
    e.preventDefault();
    const now = performance.now();
    const idle = now - lastWheelAt;
    lastWheelAt = now;
    if (idle > IN.idleMs) { gestureConsumed = false; wheelAccum = 0; }
    let dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 16; else if (e.deltaMode === 2) dy *= window.innerHeight;
    const abs = Math.abs(dy), prevAbs = lastWheelAbs;
    lastWheelAbs = abs;
    if (gestureConsumed) {
      const freshSwipe = abs > prevAbs * IN.reaccelerationRatio + 2;
      const settled = !busy && now >= lockedUntil;
      const longHold = !busy && now >= lockedUntil + IN.maxExtraLockMs;
      if (!settled || !(freshSwipe || longHold)) return;
      gestureConsumed = false; wheelAccum = 0;
    }
    if (Math.sign(dy) !== Math.sign(wheelAccum)) wheelAccum = 0;
    wheelAccum += dy;
    if (Math.abs(wheelAccum) >= IN.wheelThreshold && ready && !busy) {
      const dir = wheelAccum > 0 ? 1 : -1;
      wheelAccum = 0;
      gestureConsumed = true;
      step(dir);
    }
  }

  function onReducedMotionChange(e) {
    reducedMotion = e.matches;
    stopLoop();
    if (state === 1) state = 0;
    root.classList.remove('is-burning');
    root.classList.toggle('is-f1-hidden', state === 2);
    if (state === 2) showF2TitlesInstant(); else hideF2TitlesInstant();
    root.classList.toggle('is-fade', reducedMotion || !fx);
    busy = false; lockedUntil = 0;
    onChange(state, false);
  }

  /* ---------- Boot ---------- */
  function start() {
    root.classList.toggle('is-fade', reducedMotion || !fx);
    u = Math.min(window.innerWidth / CFG.frame.width, window.innerHeight / CFG.frame.height);
    sizeMasks();
    hideF2TitlesInstant();
    setIntroStart();
    text1.style.visibility = text2.style.visibility = '';
    requestAnimationFrame(() => {
      const total = playIntro();
      state = 0;
      root.dataset.state = 'F1';
      onChange(state, false);
      setTimeout(() => {
        for (const el of [text1, text2]) { el.style.transition = ''; el.style.opacity = ''; }
        buildBurn();             // snapshot FirstScreen1 now that the headline is in place
        ready = true;
      }, total + 50);
    });
  }
  text1.style.visibility = text2.style.visibility = 'hidden';
  rmQuery.addEventListener('change', onReducedMotionChange);

  window.DMBHero = {
    start,
    layout,
    wheel,
    step,
    complete,
    get state() { return state; },
    get busy() { return busy; },
    get ready() { return ready; },
    /* the page may scroll only once FirstScreen2 is fully revealed */
    get locksPage() { return state < 2 || busy; },
    set onChange(fn) { onChange = fn; },
    fx,
    video,
    setVideoActive(v) { video.setActive(v); },
    freeze(t) { if (!fx) return; stopLoop(); buildBurn(); root.classList.add('is-burning', 'is-f1-hidden'); T = t; fx.renderAt(t, 1 + t * 2); },
    unfreeze() { stopLoop(); root.classList.remove('is-burning'); root.classList.toggle('is-f1-hidden', state === 2); },
    circleProgress,
  };
})();
