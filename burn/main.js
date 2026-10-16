/*
 * DO MY BEST — first screen, Liquid Flow burn F12 → F14
 *
 * F14 lies underneath F12. On page load the F12 titles slide out of their masks.
 * Scroll down: a snapshot of F12 (raster.js) is handed to Liquid Flow (preset
 * "burn"), the real F12 is hidden, and the shader burns the snapshot away from the
 * centre outwards — a small liquid hole that grows into a ring until F14 is fully
 * revealed (YouTube background video from 0:25, video.js). When ~85 % of the screen
 * is burned through, the F14 titles slide out of their masks like the F12 titles on load.
 * Scroll up: the burn plays backwards and F12 is shown again (the video keeps playing
 * underneath, never paused, so YouTube never shows its pause overlay).
 * One gesture triggers at most one transition; input is locked while it runs.
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

  let state = -1;          // -1 intro, 0 = F12, 1 = F14
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

  /* ---------- F14 titles ---------- */

  /* Burn progress (0..1) at which `share` of the window has been burned through.
     Mirrors the shader's radial timeline: a point at normalised distance d from the
     centre is gone once  t ≥ (swapAt + d·spread) / (1 + spread). */
  function revealProgress(share) {
    const P = fx ? fx.params : { ...CFG.burn, swapAt: 0.45, spread: 2.4, center: [0.5, 0.5] };
    const vw = window.innerWidth, vh = window.innerHeight;
    const cx = P.center[0] * vw, cy = P.center[1] * vh;
    const far = Math.hypot(Math.max(cx, vw - cx), Math.max(cy, vh - cy));
    const ts = [];
    for (let y = 0.5; y < 24; y++) for (let x = 0.5; x < 40; x++) {
      const d = Math.hypot((x / 40) * vw - cx, (y / 24) * vh - cy) / far;
      ts.push((P.swapAt + d * P.spread) / (1 + P.spread));
    }
    ts.sort((a, b) => a - b);
    return Math.min(1, ts[Math.min(ts.length - 1, Math.floor(share * ts.length))]);
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

  /* ---------- F12 ⇄ F14 ---------- */

  function goTo(target) {
    if (target === state || (target !== 0 && target !== 1)) return;
    const dir = target > state ? 1 : -1;
    state = target;
    root.dataset.state = state ? 'F14' : 'F12';
    busy = true;
    lockedUntil = Infinity;
    const done = () => { busy = false; lockedUntil = performance.now(); };

    if (dir > 0) video.play(CFG.video.restartOnReveal);   // the video starts as F14 is revealed
    if (dir < 0) hideTitles(CFG.titles.hideDuration);       // titles go first, then F12 re-forms

    if (reducedMotion || !fx) {
      root.style.setProperty('--fade', `${CFG.reducedMotion.fade}ms`);
      root.classList.toggle('is-f12-hidden', dir > 0);
      if (dir > 0) showTitles(CFG.reducedMotion.fade);
      setTimeout(done, CFG.reducedMotion.fade);
      return;
    }
    if (dir > 0) showTitles(revealProgress(CFG.titles.revealAt) * B.duration);
    fx.play({
      direction: dir,
      speed: dir > 0 ? 1 : B.reverseSpeed,
      onStart() {
        root.classList.add('is-burning');          // the snapshot takes over…
        root.classList.add('is-f12-hidden');       // …so the real F12 can go
      },
      onDone() {
        root.classList.toggle('is-f12-hidden', dir > 0);
        root.classList.remove('is-burning');
        done();
      },
    });
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
    root.classList.toggle('is-f12-hidden', state === 1);
    if (state === 1) { clearTimeout(titleTimer); for (const el of [fText1, fText2]) { el.style.transition = 'none'; el.style.transform = 'none'; el.style.opacity = '1'; } }
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
    if (fx) fx.stop();
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
    freeze(t) { if (!fx) return; buildBurn(); root.classList.add('is-burning', 'is-f12-hidden'); fx.renderAt(t, t * B.duration / 1000); },
    unfreeze() { root.classList.remove('is-burning'); root.classList.toggle('is-f12-hidden', state === 1); },
    config: CFG,
  };

  init();
})();
