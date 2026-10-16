/*
 * DO MY BEST — first screen, Liquid Flow "lens + burst" F12 → F14   (burn2)
 *
 *   1st scroll ↓ : a liquid lens opens under the cursor and follows it softly (with
 *                  inertia), showing F14 and its video through F12; its edge keeps
 *                  swirling and gently breathing.
 *   2nd scroll ↓ : the lens opens up to full screen from where the cursor is — smooth
 *                  acceleration, then a long soft deceleration; the liquid edge livens
 *                  up a little and settles with the motion. F14 titles slide in at ~85 %.
 *   scroll ↑     : the reveal collapses back into the lens, then the lens closes.
 * Without a mouse (touch) the lens stays in the centre.
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
      const p = { ...B, center: lens.c };
      for (const k of SCALED) if (k in p) p[k] *= stageScale;
      const b = lens.boost || 0;                       // "boil": stronger liquid (the faster swirl is done via the clock, see loop)
      p.displacement *= 1 + (CFG.lens.boilDisplacement - 1) * b;
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

  /* ---------- Lens + burst timeline ----------
     The burn is radial (Liquid Flow sweep: 'radial'); its centre is wherever the lens is.
     A point at distance d (fraction of centre→far corner) is burned through once
       T(1+spread) − d·spread ≥ swapAt      ⇒  hole radius at progress T = (T(1+spread) − swapAt) / spread */

  const L = CFG.lens;
  const ease = {
    outCubic: (k) => 1 - Math.pow(1 - k, 3),
    inCubic: (k) => k * k * k,
    inOutSine: (k) => -(Math.cos(Math.PI * k) - 1) / 2,
    inOutCubic: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
    outQuart: (k) => 1 - Math.pow(1 - k, 4),
    outExpo: (k) => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k)),
  };

  const P0 = () => (fx ? fx.params : { ...LiquidFlow.DEFAULTS, ...LiquidFlow.PRESETS.burn, ...B });
  const goneAt = (d, P) => (P.swapAt + d * P.spread) / (1 + P.spread);
  /* distance from a centre (fractions) to the farthest window corner, in px */
  function farFrom(c) {
    const vw = window.innerWidth, vh = window.innerHeight;
    const cx = c[0] * vw, cy = c[1] * vh;
    return Math.hypot(Math.max(cx, vw - cx), Math.max(cy, vh - cy));
  }
  /* progress at which the hole around centre c has a radius of rPx (Figma px, scaled) */
  function progressForRadius(rPx, c) { return goneAt((rPx * stageScale) / farFrom(c), P0()); }

  /* progress at which `share` of the window is burned through, burst from centre c */
  function revealProgress(share, c = lens.c) {
    const P = P0(), vw = window.innerWidth, vh = window.innerHeight;
    const cx = c[0] * vw, cy = c[1] * vh, far = farFrom(c);
    const ts = [];
    for (let y = 0.5; y < 24; y++) for (let x = 0.5; x < 40; x++) ts.push(goneAt(Math.hypot((x / 40) * vw - cx, (y / 24) * vh - cy) / far, P));
    ts.sort((p, q) => p - q);
    return ts[Math.min(ts.length - 1, Math.floor(share * ts.length))];
  }

  /* The lens: its centre follows the cursor with inertia while it holds (state 1) */
  const lens = { c: [0.5, 0.5], target: [0.5, 0.5], follow: false, radius: 0, boost: 0 };
  window.addEventListener('mousemove', (e) => {
    lens.target = [e.clientX / window.innerWidth, e.clientY / window.innerHeight];
  }, { passive: true });

  /* Master render loop (runs while the canvas is on screen). Each frame:
     - eases the lens centre toward the cursor (state 1),
     - advances the current animation (radius in px, or burst progress),
     - converts it into burn progress T and redraws, so the edge always keeps swirling. */
  let T = 0;
  let mode = 'radius';       // 'radius' = T from lens.radius (px) · 'burst' = T animated directly
  let loopRaf = 0, lastNow = 0;
  let phase = 0;             // shader clock (s): advances faster while the edge boils — never jumps
  let anim = null;           // { key, from, to, t0, ms, ease, done }
  const clock0 = performance.now();
  function loop(now) {
    const dt = Math.min(64, now - (lastNow || now)); lastNow = now;
    phase += (dt / 1000) * (1 + (L.boilSpeed - 1) * (lens.boost || 0));
    if (lens.follow) {
      const a = 1 - Math.exp(-dt / L.followLag);
      lens.c[0] += (lens.target[0] - lens.c[0]) * a;
      lens.c[1] += (lens.target[1] - lens.c[1]) * a;
    }
    let finished = null;
    if (anim) {
      const k = Math.min(1, (now - anim.t0) / anim.ms);
      const v = anim.from + (anim.to - anim.from) * anim.ease(k);
      if (anim.key === 'T') T = v; else lens[anim.key] = v;
      if (k >= 1) { finished = anim.done; anim = null; }
    }
    if (mode === 'radius') {
      const breathe = lens.follow ? 1 + L.breathe * Math.sin((now - clock0) / 1000 * 2.2) : 1;
      T = progressForRadius(Math.max(0, lens.radius) * breathe, lens.c);
    }
    fx.renderAt(Math.max(0, Math.min(1, T)), phase);
    if (finished) finished();
    if (loopRaf) loopRaf = requestAnimationFrame(loop);
  }
  function startLoop() { if (!loopRaf) { lastNow = 0; loopRaf = requestAnimationFrame(loop); } }
  function stopLoop() { cancelAnimationFrame(loopRaf); loopRaf = 0; anim = null; lens.follow = false; cancelAnimationFrame(boostRaf); lens.boost = 0; }
  function animate(key, to, ms, easeFn, done) {
    const from = key === 'T' ? T : lens[key];
    anim = { key, from, to, t0: performance.now(), ms, ease: easeFn, done };
    startLoop();
  }
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

  /* ---------- F12 → lens → full reveal → F14 (and back) ----------
     state 0 = F12 · state 1 = liquid lens following the cursor · state 2 = F14 */

  function goTo(target) {
    if (reducedMotion || !fx) target = target > state ? 2 : 0;
    if (target === state || target < 0 || target > 2) return;
    const from = state;
    state = target;
    root.dataset.state = ['F12', 'lens', 'F14'][state];
    busy = true;
    lockedUntil = Infinity;
    const done = () => { busy = false; lockedUntil = performance.now(); };

    if (from === 0) video.play(CFG.video.restartOnReveal);
    if (from === 2) hideTitles(CFG.titles.hideDuration);

    if (reducedMotion || !fx) {
      root.style.setProperty('--fade', `${CFG.reducedMotion.fade}ms`);
      root.classList.toggle('is-f12-hidden', target === 2);
      if (target === 2) showTitles(CFG.reducedMotion.fade);
      setTimeout(done, CFG.reducedMotion.fade);
      return;
    }

    if (from === 0 && target === 1) {                 // 1st scroll: the lens opens under the cursor
      lens.c = [...lens.target];
      lens.radius = 0; lens.boost = 0; mode = 'radius';
      root.classList.add('is-burning', 'is-f12-hidden');
      lens.follow = true;
      animate('radius', L.radius, L.openDuration, ease[L.openEasing], done);
    } else if (from === 1 && target === 2) {          // 2nd scroll: the lens opens up to full screen
      const burst = () => {
        lens.follow = false;                          // grows from exactly where the lens is
        mode = 'burst';
        const e = ease[L.burstEasing];
        showTitles(timeToReach(T, 1, L.burstDuration, e, revealProgress(CFG.titles.revealAt)));
        boostPulse(L.burstBoil, L.burstDuration);     // the edge livens up gently, then settles with the motion
        animate('T', 1, L.burstDuration, e, () => {
          stopLoop();
          root.classList.remove('is-burning');
          done();
        });
      };
      if (L.inhaleDuration > 0 && L.inhaleScale < 1) {   // optional anticipation (off by default)
        animate('radius', L.radius * L.inhaleScale, L.inhaleDuration, ease.inOutSine, burst);
      } else burst();
    } else if (from === 2 && target === 1) {          // back: the burst collapses into the lens
      root.classList.add('is-burning');
      mode = 'burst'; T = 1;
      const tLens = progressForRadius(L.radius, lens.c);
      animate('T', tLens, L.burstDuration / L.reverseSpeed, ease.inOutCubic, () => {
        mode = 'radius'; lens.radius = L.radius; lens.follow = true; done();
      });
    } else if (from === 1 && target === 0) {          // back: the lens closes
      animate('radius', 0, L.openDuration / L.reverseSpeed, ease.inCubic, () => {
        stopLoop();
        root.classList.remove('is-burning', 'is-f12-hidden');
        done();
      });
    }
  }

  /* liquid "boil" multiplier: one smooth bump (0 → peak → 0, sine-shaped) over `ms` */
  let boostRaf = 0;
  function boostPulse(peak, ms) {
    cancelAnimationFrame(boostRaf);
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms);
      lens.boost = peak * Math.sin(Math.PI * k);
      if (k < 1) boostRaf = requestAnimationFrame(step); else lens.boost = 0;
    };
    boostRaf = requestAnimationFrame(step);
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
    freeze(t, c) { if (!fx) return; stopLoop(); if (c) lens.c = c; buildBurn(); root.classList.add('is-burning', 'is-f12-hidden'); T = t; fx.renderAt(t, 1 + t * 2); },
    unfreeze() { stopLoop(); root.classList.remove('is-burning'); root.classList.toggle('is-f12-hidden', state === 2); },
    lens,
    progressForRadius,
    config: CFG,
  };

  init();
})();
