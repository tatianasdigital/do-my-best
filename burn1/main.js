/*
 * DO MY BEST — first screen, Liquid Flow SPIRAL burn F12 → F14   (burn1)
 *
 * Same page as burn/, but the Liquid Flow burn is spiral-shaped and takes two scrolls:
 *   1st scroll ↓ : a small liquid circle opens in the centre of F12 and holds there,
 *                  its edge still swirling (state 1)
 *   2nd scroll ↓ : the circle grows outwards along a rotating spiral until F12 is gone —
 *                  smooth acceleration, then a long deceleration (state 2 = F14).
 *                  At ~85 % revealed, the F14 titles slide out of their masks.
 *   scroll ↑     : the same steps backwards (spiral winds back into the circle, then the
 *                  circle closes and F12 returns).
 * F14 has the YouTube background video (video.js) and a 15 % black shade.
 * One gesture = one step; input is locked while a step runs.
 */
(function () {
  'use strict';

  const CFG = window.DMB4_CONFIG;
  const root = document.getElementById('viewport');
  const sceneF12 = root.querySelector('.scene--f12');
  const canvas = root.querySelector('.burn-canvas');
  const mask1 = root.querySelector('.scene--f12 .title-mask--1');
  const mask2 = root.querySelector('.scene--f12 .title-mask--2');
  const text1 = mask1.querySelector('.title-text');
  const text2 = mask2.querySelector('.title-text');
  const fMask1 = root.querySelector('.scene--f14 .title-mask--1');
  const fMask2 = root.querySelector('.scene--f14 .title-mask--2');
  const fText1 = fMask1.querySelector('.title-text');
  const fText2 = fMask2.querySelector('.title-text');

  const rmQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = rmQuery.matches;

  let state = -1;          // -1 intro, 0 = F12, 1 = circle, 2 = F14
  let ready = false;
  let busy = false;
  let lockedUntil = 0;
  let stageScale = 1;
  let snapshot = null;     // F12 bitmap

  // F14 background video (YouTube, muted, from config.video.start)
  const video = window.DMBVideo(root.querySelector('.bg-video'), CFG.video);
  root.style.setProperty('--video-shade', CFG.video.shade);

  /* ---------- Liquid Flow ---------- */

  const B = CFG.burn;
  const SCALED = ['displacement', 'noiseScale', 'smear'];   // Figma px → window px
  const source = { image: null, box: { left: 0, top: 0, width: 1, height: 1 } };
  const fx = window.LiquidFlow && window.LiquidFlow.create(canvas, {
    mode: 'image',
    preset: 'burn',
    from: source,          // the F12 snapshot …
    to: null,              // … burns away to nothing; F14 is the DOM underneath
    region: () => ({ x: 0, y: 0, w: window.innerWidth, h: window.innerHeight }),
    params: () => {
      const p = { ...B };
      for (const k of SCALED) if (k in p) p[k] *= stageScale;
      return p;
    },
  });

  /* Snapshot F12 and upload it (after fonts, images and the intro are settled) */
  function buildBurn() {
    if (!fx) return;
    const k = Math.min(window.devicePixelRatio || 1, 1.5);
    snapshot = window.DMBRasterize(sceneF12, k);
    source.image = snapshot;
    source.box = { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    fx.build(1);
  }

  /* ---------- Layout ---------- */

  let rebuildTimer = 0;
  function layout() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    stageScale = Math.min(vw / CFG.frame.width, vh / CFG.frame.height);
    const s = document.documentElement.style;
    s.setProperty('--stage-scale', stageScale);
    s.setProperty('--stage-x', `${(vw - CFG.frame.width * stageScale) / 2}px`);
    s.setProperty('--stage-y', `${(vh - CFG.frame.height * stageScale) / 2}px`);
    if (typeof video !== 'undefined') video.resize();
    clearTimeout(rebuildTimer);
    if (ready) rebuildTimer = setTimeout(() => { if (!busy) buildBurn(); }, 150);
  }

  /* Size each title mask to its text, centred on the Figma title boxes
     (F12 and F14 boxes share the centre x = 960.5) */
  function sizeMasks() {
    const m = CFG.intro.maskMargin;
    for (const [mask, text] of [[mask1, text1], [mask2, text2], [fMask1, fText1], [fMask2, fText2]]) {
      const w = text.offsetWidth;
      mask.style.left = `${960.5 - w / 2 - m}px`;
      mask.style.width = `${w + 2 * m}px`;
      text.style.left = `${m}px`;
    }
  }

  /* ---------- Intro ---------- */

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
    const I = CFG.intro;
    const d2 = I.title1Delay + I.title2Delay;
    if (reducedMotion) {
      const f = CFG.reducedMotion.fade;
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

  /* ---------- Spiral timeline ---------- */

  const S = CFG.spiral;
  const ease = {
    outCubic: (k) => 1 - Math.pow(1 - k, 3),
    inCubic: (k) => k * k * k,
    inOutCubic: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
    inOutQuint: (k) => (k < 0.5 ? 16 * k ** 5 : 1 - Math.pow(-2 * k + 2, 5) / 2),
    inOutSine: (k) => -(Math.cos(Math.PI * k) - 1) / 2,
  };

  /* Normalised spiral "order" of a point — the same formula as the shader (sweep: 'spiral') */
  function orderAt(px, py, T, P, cx, cy, far) {
    const d = Math.min(1, Math.hypot(px - cx, py - cy) / far);
    const th = Math.atan2(py - cy, px - cx) / (2 * Math.PI);
    const e = Math.min(1, Math.max(0, (d - P.spiralCore) / P.spiralCore));
    const w = e * e * (3 - 2 * e);
    const wave = 0.5 + 0.5 * Math.sin(2 * Math.PI * (P.spiralArms * th + P.spiralTwist * d - P.spiralSpin * T));
    return Math.min(1, (d + P.spiralDepth * w * wave) / (1 + P.spiralDepth));
  }
  /* A point is burned through once  T(1+spread) − order·spread ≥ swapAt */
  const goneAt = (u, P) => (P.swapAt + u * P.spread) / (1 + P.spread);

  /* Progress at which the centre circle has radius `r` (fraction of the far radius) */
  function circleProgress(r) {
    const P = fx ? fx.params : { ...LiquidFlow.DEFAULTS, ...LiquidFlow.PRESETS.burn, ...B };
    return goneAt(r / (1 + P.spiralDepth), P);   // inside the core the hole is a clean circle
  }

  /* Progress at which `share` of the window has been burned through */
  function revealProgress(share) {
    const P = fx ? fx.params : { ...LiquidFlow.DEFAULTS, ...LiquidFlow.PRESETS.burn, ...B };
    const vw = window.innerWidth, vh = window.innerHeight;
    const cx = P.center[0] * vw, cy = P.center[1] * vh;
    const far = Math.hypot(Math.max(cx, vw - cx), Math.max(cy, vh - cy));
    let lo = 0, hi = 1;
    for (let i = 0; i < 24; i++) {          // bisection on T
      const T = (lo + hi) / 2;
      let gone = 0, n = 0;
      for (let y = 0.5; y < 24; y++) for (let x = 0.5; x < 40; x++, n++) {
        if (T >= goneAt(orderAt((x / 40) * vw, (y / 24) * vh, T, P, cx, cy, far), P)) gone++;
      }
      if (gone / n >= share) hi = T; else lo = T;
    }
    return hi;
  }

  /* Master render loop: while the canvas is on screen it redraws every frame, so the
     liquid edge keeps swirling even while the small circle is holding (state 1). */
  let T = 0;                 // current burn progress
  let loopRaf = 0;
  let anim = null;           // { from, to, t0, ms, ease, done }
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
  function animateTo(to, ms, easeFn, done) {
    anim = { from: T, to, t0: performance.now(), ms, ease: easeFn, done };
    startLoop();
  }
  /* time (ms) into an animateTo(from → to, ms, easeFn) at which T passes `at` */
  function timeToReach(from, to, ms, easeFn, at) {
    let lo = 0, hi = 1;
    for (let i = 0; i < 30; i++) { const k = (lo + hi) / 2; if (from + (to - from) * easeFn(k) >= at) hi = k; else lo = k; }
    return hi * ms;
  }

  /* F14 titles use the same entrance as the F12 titles on page load */
  let titleTimer = 0;
  function hideF14TitlesInstant() {
    clearTimeout(titleTimer);
    for (const el of [fText1, fText2]) { el.style.transition = 'none'; el.style.opacity = '1'; }
    if (reducedMotion) {
      fText1.style.transform = fText2.style.transform = 'none';
      fText1.style.opacity = fText2.style.opacity = '0';
    } else {
      fText1.style.transform = `translate3d(${-fMask1.offsetWidth}px,0,0)`;   // just left of its mask
      fText2.style.transform = `translate3d(${fMask2.offsetWidth}px,0,0)`;    // just right of its mask
    }
  }
  function showTitles(atMs) {
    const I = CFG.intro;
    hideF14TitlesInstant();
    root.offsetWidth; // flush the start position
    const d1 = Math.round(atMs), d2 = Math.round(atMs + I.title2Delay);
    if (reducedMotion) {
      const f = CFG.reducedMotion.fade;
      fText1.style.transition = `opacity ${f}ms ease ${d1}ms`;
      fText2.style.transition = `opacity ${f}ms ease ${d2}ms`;
      fText1.style.opacity = fText2.style.opacity = '1';
      return;
    }
    fText1.style.transition = `transform ${I.title1Duration}ms ${I.easing} ${d1}ms`;
    fText2.style.transition = `transform ${I.title2Duration}ms ${I.easing} ${d2}ms`;
    fText1.style.transform = fText2.style.transform = 'translate3d(0,0,0)';
  }
  /* scrolling back: a quick fade, then park them outside their masks again */
  function hideTitles(ms) {
    clearTimeout(titleTimer);
    for (const el of [fText1, fText2]) { el.style.transition = `opacity ${ms}ms ease`; el.style.opacity = '0'; }
    titleTimer = setTimeout(hideF14TitlesInstant, ms);
  }

  /* ---------- F12 → circle → F14 (and back) ----------
     state 0 = F12 · state 1 = small liquid circle in the centre (holding, still swirling)
     state 2 = F14 (the spiral has burned F12 away completely) */

  function goTo(target) {
    if (reducedMotion || !fx) target = target > state ? 2 : 0;   // no intermediate step without the effect
    if (target === state || target < 0 || target > 2) return;
    const from = state;
    state = target;
    root.dataset.state = ['F12', 'circle', 'F14'][state];
    busy = true;
    lockedUntil = Infinity;
    const done = () => { busy = false; lockedUntil = performance.now(); };

    if (from === 0) video.play(CFG.video.restartOnReveal);   // F14 starts showing through the circle
    if (from === 2) hideTitles(CFG.titles.hideDuration);     // titles go first

    if (reducedMotion || !fx) {
      root.style.setProperty('--fade', `${CFG.reducedMotion.fade}ms`);
      root.classList.toggle('is-f12-hidden', target === 2);
      if (target === 2) showTitles(CFG.reducedMotion.fade);
      setTimeout(done, CFG.reducedMotion.fade);
      return;
    }

    const T1 = circleProgress(S.circleRadius);
    if (from === 0 && target === 1) {            // 1st scroll: the small circle opens
      root.classList.add('is-burning', 'is-f12-hidden');
      T = 0;
      animateTo(T1, S.openDuration, ease[S.openEasing], done);
    } else if (from === 1 && target === 2) {     // 2nd scroll: the spiral grows to full screen
      const e = ease[S.growEasing];
      const at = timeToReach(T, 1, S.growDuration, e, revealProgress(CFG.titles.revealAt));
      showTitles(at);
      animateTo(1, S.growDuration, e, () => {
        stopLoop();
        root.classList.remove('is-burning');      // F14 is fully revealed — the live DOM takes over
        done();
      });
    } else if (from === 2 && target === 1) {     // back: the spiral winds back into the circle
      root.classList.add('is-burning');
      T = 1;
      animateTo(T1, S.growDuration / S.reverseSpeed, ease[S.growEasing], done);
    } else if (from === 1 && target === 0) {     // back: the circle closes, F12 returns
      animateTo(0, S.openDuration / S.reverseSpeed, ease.inCubic, () => {
        stopLoop();
        root.classList.remove('is-burning', 'is-f12-hidden');
        done();
      });
    }
  }

  function step(dir) {
    if (!ready || busy || performance.now() < lockedUntil) return;
    goTo(state + dir);
  }

  /* ---------- Input ---------- */

  let lastWheelAt = 0, lastWheelAbs = 0, wheelAccum = 0, gestureConsumed = false;

  function onWheel(e) {
    e.preventDefault();
    const now = performance.now();
    const idle = now - lastWheelAt;
    lastWheelAt = now;
    if (idle > CFG.input.idleMs) { gestureConsumed = false; wheelAccum = 0; }
    let dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 16;
    else if (e.deltaMode === 2) dy *= window.innerHeight;
    const abs = Math.abs(dy);
    const prevAbs = lastWheelAbs;
    lastWheelAbs = abs;
    // one gesture = one transition (trackpad inertia / big flicks can't re-trigger)
    if (gestureConsumed) {
      const freshSwipe = abs > prevAbs * CFG.input.reaccelerationRatio + 2;
      const settled = !busy && now >= lockedUntil;
      const longHold = !busy && now >= lockedUntil + CFG.input.maxExtraLockMs;
      if (!settled || !(freshSwipe || longHold)) return;
      gestureConsumed = false;
      wheelAccum = 0;
    }
    if (Math.sign(dy) !== Math.sign(wheelAccum)) wheelAccum = 0;
    wheelAccum += dy;
    if (Math.abs(wheelAccum) >= CFG.input.wheelThreshold && ready && !busy) {
      const dir = wheelAccum > 0 ? 1 : -1;
      wheelAccum = 0;
      gestureConsumed = true;
      step(dir);
    }
  }

  function onKey(e) {
    const down = ['ArrowDown', 'PageDown', ' ', 'Spacebar'];
    const up = ['ArrowUp', 'PageUp', 'Home'];
    if (down.includes(e.key) && !e.shiftKey) { e.preventDefault(); step(1); }
    else if (up.includes(e.key) || (e.key === ' ' && e.shiftKey)) { e.preventDefault(); step(-1); }
  }

  let touchY = null;
  function onTouchStart(e) { touchY = e.touches[0].clientY; }
  function onTouchMove(e) {
    e.preventDefault();
    if (touchY === null) return;
    const dy = touchY - e.touches[0].clientY;
    if (Math.abs(dy) >= CFG.input.touchThreshold) { step(dy > 0 ? 1 : -1); touchY = null; }
  }
  function onTouchEnd() { touchY = null; }

  function onReducedMotionChange(e) {
    reducedMotion = e.matches;
    if (fx) fx.stop();
    root.classList.remove('is-burning');
    stopLoop();
    if (state === 1) state = 0;                     // the in-between circle has no static equivalent
    root.classList.remove('is-burning');
    root.classList.toggle('is-f12-hidden', state === 2);
    if (state === 2) { clearTimeout(titleTimer); for (const el of [fText1, fText2]) { el.style.transition = 'none'; el.style.transform = 'none'; el.style.opacity = '1'; } }
    else hideF14TitlesInstant();
    root.classList.toggle('is-fade', reducedMotion || !fx);
    busy = false;
    lockedUntil = 0;
  }

  /* ---------- Boot ---------- */

  function assetsReady() {
    const fonts = ['200px Boldonse', '500 16px Manrope', '400 16px Syne', '600 16px Syne']
      .map((f) => document.fonts.load(f).catch(() => {}));
    const imgs = [...document.images].map((i) => (i.decode ? i.decode().catch(() => {}) : Promise.resolve()));
    return Promise.race([Promise.all([...fonts, ...imgs]).then(() => document.fonts.ready), new Promise((r) => setTimeout(r, 5000))]);
  }

  function replayIntro() {
    stopLoop();
    hideF14TitlesInstant();
    ready = false;
    busy = false;
    state = -1;
    root.dataset.state = 'intro';
    root.classList.remove('is-burning', 'is-f12-hidden');
    setIntroStart();
    requestAnimationFrame(() => {
      const total = playIntro();
      state = 0;
      root.dataset.state = 'F12';
      setTimeout(() => {
        for (const el of [text1, text2]) { el.style.transition = ''; el.style.opacity = ''; }
        buildBurn();             // snapshot F12 now that the titles are in place
        ready = true;
      }, total + 50);
    });
  }

  function init() {
    root.classList.toggle('is-fade', reducedMotion || !fx);
    layout();
    text1.style.visibility = text2.style.visibility = 'hidden';
    window.addEventListener('resize', layout);
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    rmQuery.addEventListener('change', onReducedMotionChange);
    assetsReady().then(() => {
      sizeMasks();
      setIntroStart();
      text1.style.visibility = text2.style.visibility = '';
      replayIntro();
    });
  }

  /* Console helpers for tuning */
  window.DMB4 = {
    get state() { return state; },
    get ready() { return ready; },
    get busy() { return busy; },
    next: () => step(1),
    prev: () => step(-1),
    replayIntro,
    fx,
    video,
    snapshot: () => snapshot,
    revealProgress,
    /* freeze the burn at progress t (0..1); DMB4.unfreeze() to exit */
    freeze(t) { if (!fx) return; stopLoop(); buildBurn(); root.classList.add('is-burning', 'is-f12-hidden'); T = t; fx.renderAt(t, 1 + t * 2); },
    unfreeze() { stopLoop(); root.classList.remove('is-burning'); root.classList.toggle('is-f12-hidden', state === 2); },
    circleProgress,
    config: CFG,
  };

  init();
})();
