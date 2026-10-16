/*
 * DO MY BEST — scroll-driven stage machine
 *
 * The sequence is a list of discrete stages (0–7). One scroll gesture moves
 * exactly one stage forward or back. For every layer, `stateFor(layer, stage)`
 * describes how it looks at that stage; moving between stages applies the new
 * states with CSS transitions whose timings come from config.js.
 *
 *  -1  before intro       (titles hidden)
 *   0  Frame 01           (after the automatic title entrance)
 *   1  Frame 02           black top→bottom fill, THEN the Title2 swap
 *   2  + GlassEffect1
 *   3  + GlassEffect2
 *   4  + GlassEffect4
 *   5  + GlassEffect3     (Frame 03)
 *   6  glass shatters into shards that fall in 3D, title fades out
 *   7  Frame 04           Headline → StudioLabels → Character → Smoke
 */
(function () {
  'use strict';

  const CFG = window.DMB_CONFIG;
  const LAST_STAGE = 7;
  const root = document.getElementById('viewport');
  const $ = (sel) => root.querySelector(sel);

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = reducedMotionQuery.matches;

  /* ---------- Layers (names follow the Figma layer names) ---------- */

  const layers = {
    blackBackground:  $('.scene--dark'),
    chromeDark:       $('.scene--chrome-dark'),
    title1:           $('.title1-f01'),
    title1Dark:       $('.title1-f02'),
    title2Original:   $('.scene--light .title2-out'),   // Frame 01 Title2, black
    title2OriginalDark: $('.scene--dark .title2-out'),  // same block in white, revealed by the black wipe
    title2Incoming:   $('.title2-in'),                  // Frame 02 Title2
    glassComposition: $('.glass'),
    glassEffect1:     $('.glass-effect-1'),
    glassEffect2:     $('.glass-effect-2'),
    glassEffect4:     $('.glass-effect-4'),
    glassEffect3:     $('.glass-effect-3'),
    headline:         $('.headline'),
    studioLabels:     $('.studio-labels'),
    character:        $('.character'),
    smoke:            $('.smoke'),
  };

  /* Stage at which each glass piece appears (reveal order 1 → 2 → 4 → 3) */
  const GLASS_REVEAL = { glassEffect1: 2, glassEffect2: 3, glassEffect4: 4, glassEffect3: 5 };

  /* Title1 moves from y 415.6 (Frame 01) to y 438.6 (Frame 02) */
  const TITLE1_SHIFT = 438.6 - 415.6;

  const WIPE_HIDDEN = 'inset(0px 0px 100% 0px)';
  const WIPE_SHOWN  = 'inset(0px 0px 0% 0px)';

  /* ---------- Visual state per layer per stage ---------- */

  function stateFor(name, s) {
    const travel = CFG.title2Slot.travel;
    const rm = reducedMotion;

    switch (name) {
      case 'blackBackground':
      case 'chromeDark':
        if (rm) return { clipPath: WIPE_SHOWN, opacity: s >= 1 ? 1 : 0 };
        return { clipPath: s >= 1 ? WIPE_SHOWN : WIPE_HIDDEN, opacity: 1 };

      case 'title1':
      case 'title2Original':
        return { opacity: s >= 0 ? 1 : 0 };

      // White Title1 sits at the Frame 01 position until the swap, then
      // settles into its Frame 02 position (23px lower) together with Title2.
      case 'title1Dark':
        return {
          opacity: s >= 6 ? 0 : 1,
          transform: `translate3d(0, ${s >= 1 || rm ? 0 : -TITLE1_SHIFT}px, 0)`,
        };

      case 'title2OriginalDark':
        if (rm) return { opacity: s >= 1 ? 0 : 1, transform: 'translate3d(0,0,0)' };
        return { opacity: 1, transform: `translate3d(0, ${s >= 1 ? travel : 0}px, 0)` };

      case 'title2Incoming':
        if (rm) return { opacity: s >= 1 && s <= 5 ? 1 : 0, transform: 'translate3d(0,0,0)' };
        return {
          opacity: s >= 6 ? 0 : 1,
          transform: `translate3d(0, ${s >= 1 ? 0 : -travel}px, 0)`,
        };

      // Without reduced motion the Stage 6 exit is the shatter (shatter.js),
      // which hides this layer and animates shards instead.
      case 'glassComposition':
        return { opacity: rm && s >= 6 ? 0 : 1 };

      case 'glassEffect1':
      case 'glassEffect2':
      case 'glassEffect4':
      case 'glassEffect3':
        return { opacity: s >= GLASS_REVEAL[name] ? 1 : 0 };

      case 'headline':
      case 'studioLabels':
      case 'character':
      case 'smoke':
        return { opacity: s >= 7 ? 1 : 0 };
    }
    return {};
  }

  /* Timing used when crossing the boundary between stage k-1 and k (forward). */
  function forwardTiming(name, k) {
    const st = CFG.stages;
    const rmFade = { duration: CFG.reducedMotion.fadeDuration, delay: 0, easing: 'ease' };

    if (k === 0) {
      const i = CFG.intro;
      if (name === 'title1') return { duration: i.duration, delay: i.title1Delay, easing: i.easing };
      if (name === 'title2Original') return { duration: i.duration, delay: i.title2Delay, easing: i.easing };
    }
    if (k === 1) {
      // 1) black wipe, 2) then the Title2 swap
      const wipe = name === 'blackBackground' || name === 'chromeDark';
      const t = wipe ? st[1].wipe : st[1].titleSwap;
      const delay = wipe ? 0 : st[1].wipe.duration + st[1].titleSwap.delayAfterWipe;
      if (reducedMotion) return { ...rmFade, delay: wipe ? 0 : rmFade.duration };
      return { duration: t.duration, delay, easing: t.easing };
    }
    if (k >= 2 && k <= 5) return { duration: st[k].duration, delay: 0, easing: st[k].easing };
    if (k === 6) {
      if (name === 'glassComposition') {
        return reducedMotion ? rmFade : { duration: st[6].glassDuration, delay: 0, easing: st[6].glassEasing };
      }
      return { duration: st[6].titleFadeDuration, delay: 0, easing: st[6].titleFadeEasing };
    }
    if (k === 7 && st[7][name]) {
      const t = st[7][name];
      return { duration: reducedMotion ? Math.min(t.duration, CFG.reducedMotion.fadeDuration) : t.duration, delay: t.delay, easing: t.easing };
    }
    return { duration: 0, delay: 0, easing: 'linear' };
  }

  function reverseTiming(name, k) {
    const f = forwardTiming(name, k);
    const r = CFG.reverse;
    const scale = (d) => Math.max(r.minDuration, Math.round(d * r.durationScale));
    let delay = 0;
    // Stage 1 backwards mirrors the forward order: Title2 swaps back first,
    // then the black wipe retracts upward.
    if (k === 1 && (name === 'blackBackground' || name === 'chromeDark')) {
      delay = reducedMotion ? CFG.reducedMotion.fadeDuration : scale(CFG.stages[1].titleSwap.duration);
    }
    return { duration: scale(f.duration), delay, easing: f.easing };
  }

  /* ---------- Applying states ---------- */

  const PROPS = { opacity: 'opacity', transform: 'transform', clipPath: 'clip-path' };
  const lastApplied = {};

  function applyStage(from, to) {
    const forward = to > from;
    const boundary = forward ? to : from; // the boundary k being crossed
    let longest = 0;

    for (const name of Object.keys(layers)) {
      const el = layers[name];
      const next = stateFor(name, to);
      const prev = lastApplied[name] || {};
      const changed = Object.keys(next).filter((p) => next[p] !== prev[p]);
      if (!changed.length) continue;

      const t = forward ? forwardTiming(name, boundary) : reverseTiming(name, boundary);
      el.style.transition = changed
        .map((p) => `${PROPS[p]} ${t.duration}ms ${t.easing} ${t.delay}ms`)
        .join(', ');
      for (const p of changed) el.style[p] = next[p];
      lastApplied[name] = next;
      longest = Math.max(longest, t.duration + t.delay);
    }

    // Stage 6: glass shatters (forward) / reassembles (backward)
    if (boundary === 6 && !reducedMotion) {
      longest = Math.max(longest, forward ? shatter.play() : shatter.reverse());
    }

    updateSmokeDrift(to);
    return longest;
  }

  /* Put every layer in its state for `stage` with no animation. */
  function snapTo(stage) {
    for (const name of Object.keys(layers)) {
      const el = layers[name];
      const next = stateFor(name, stage);
      el.style.transition = 'none';
      Object.assign(el.style, next);
      lastApplied[name] = next;
    }
    root.offsetWidth; // flush so later transitions start from here
    shatter.snap(stage >= 6 && !reducedMotion);
    updateSmokeDrift(stage);
  }

  /* Smoke drift loop runs only while the smoke is (becoming) visible. */
  let smokeTimer = 0;
  function updateSmokeDrift(stage) {
    clearTimeout(smokeTimer);
    const smoke = layers.smoke;
    if (stage >= 7 && !reducedMotion) {
      // start the drift as the smoke begins to fade in, so it is already moving
      smokeTimer = setTimeout(() => smoke.classList.add('is-drifting'), CFG.stages[7].smoke.delay);
    } else if (stage < 7) {
      // stop once it has faded out
      smokeTimer = setTimeout(() => smoke.classList.remove('is-drifting'), 600);
    } else {
      smoke.classList.remove('is-drifting');
    }
    // reduced motion: one still copy of the smoke at its design position
    smoke.querySelectorAll('.smoke__plume').forEach((p, i) => {
      p.style.opacity = reducedMotion ? (i === 0 ? '1' : '0') : '';
    });
  }

  /* ---------- Stage machine & input ---------- */

  const shatter = window.DMBShatter($('.scene--fx .stage'), layers.glassComposition, CFG.shatter);

  let stage = -1;
  let ready = false;       // true once the intro has played
  let lockedUntil = 0;     // timestamp: current transition still running
  let lastWheelAt = 0;
  let lastWheelAbs = 0;
  let wheelAccum = 0;
  let gestureConsumed = false;

  function goTo(target) {
    target = Math.max(0, Math.min(LAST_STAGE, target));
    if (target === stage) return false;
    // never skip: only ever move one stage at a time
    const next = stage + Math.sign(target - stage);
    const busy = applyStage(stage, next);
    stage = next;
    root.dataset.stage = String(stage);
    lockedUntil = performance.now() + busy;
    return true;
  }

  function step(dir) {
    if (!ready) return;
    if (performance.now() < lockedUntil) return;
    goTo(stage + dir);
  }

  function onWheel(e) {
    e.preventDefault();
    const now = performance.now();
    const idle = now - lastWheelAt;
    lastWheelAt = now;

    // a pause between wheel events = a new gesture
    if (idle > CFG.input.idleMs) { gestureConsumed = false; wheelAccum = 0; }

    let dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 16;           // lines → px
    else if (e.deltaMode === 2) dy *= window.innerHeight;
    const abs = Math.abs(dy);
    const prevAbs = lastWheelAbs;
    lastWheelAbs = abs;

    // A gesture that already triggered a step cannot trigger another one, so
    // trackpad inertia and fast wheel spins never skip stages. It re-arms when
    // the transition is over AND either a fresh swipe starts (deltas rise
    // again; inertia only decays) or the user keeps scrolling for a while.
    if (gestureConsumed) {
      const freshSwipe = abs > prevAbs * CFG.input.reaccelerationRatio + 2;
      const settled = now >= lockedUntil;
      const longHold = now >= lockedUntil + CFG.input.maxExtraLockMs;
      if (!settled || !(freshSwipe || longHold)) return;
      gestureConsumed = false;
      wheelAccum = 0;
    }
    if (Math.sign(dy) !== Math.sign(wheelAccum)) wheelAccum = 0;
    wheelAccum += dy;

    if (Math.abs(wheelAccum) >= CFG.input.wheelThreshold && ready && now >= lockedUntil) {
      const dir = wheelAccum > 0 ? 1 : -1;
      wheelAccum = 0;
      gestureConsumed = true;
      step(dir);
    }
  }

  function onKey(e) {
    const down = ['ArrowDown', 'PageDown', ' ', 'Spacebar'];
    const up = ['ArrowUp', 'PageUp'];
    if (down.includes(e.key) && !e.shiftKey) { e.preventDefault(); step(1); }
    else if (up.includes(e.key) || (e.key === ' ' && e.shiftKey)) { e.preventDefault(); step(-1); }
    else if (e.key === 'Home') { e.preventDefault(); step(-1); }
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

  /* ---------- Layout: scale the 1920×1080 stage to the viewport ---------- */

  function layout() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.min(vw / CFG.frame.width, vh / CFG.frame.height);
    const x = (vw - CFG.frame.width * scale) / 2;
    const y = (vh - CFG.frame.height * scale) / 2;
    const s = document.documentElement.style;
    s.setProperty('--stage-scale', scale);
    s.setProperty('--stage-x', `${x}px`);
    s.setProperty('--stage-y', `${y}px`);
    // distance (in stage px) that moves the glass top edge below the viewport bottom
    s.setProperty('--glass-exit', `${(vh - y) / scale + CFG.stages[6].exitOvershoot}px`);
    if (typeof shatter !== 'undefined') shatter.relayout();
  }

  function applyStaticConfig() {
    const slot = CFG.title2Slot;
    root.querySelectorAll('.title2-slot').forEach((el) => {
      el.style.top = `${slot.top}px`;
      el.style.height = `${slot.height}px`;
    });
    root.querySelectorAll('.title2-out').forEach((el) => { el.style.top = `${527.46 - slot.top}px`; }); // Frame 01 Title2 y
    layers.title2Incoming.style.top = `${550.46 - slot.top}px`; // Frame 02 Title2 y

    const sm = CFG.smoke;
    const s = layers.smoke.style;
    s.setProperty('--smoke-period', `${sm.period}ms`);
    s.setProperty('--smoke-rise', `${sm.rise}px`);
    s.setProperty('--smoke-start', `${sm.startOffset}px`);
    s.setProperty('--smoke-sway', `${sm.sway}px`);
    s.setProperty('--smoke-scale', sm.scale);
    s.setProperty('--smoke-peak', sm.peakOpacity);
  }

  /* ---------- Boot ---------- */

  function whenAssetsReady() {
    const imgs = Array.from(document.images).map((img) =>
      img.complete ? Promise.resolve() : new Promise((r) => { img.onload = img.onerror = r; }));
    const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
    const timeout = new Promise((r) => setTimeout(r, 4000));
    return Promise.race([Promise.all([...imgs, fonts]), timeout]);
  }

  function init() {
    applyStaticConfig();
    layout();
    snapTo(-1);

    window.addEventListener('resize', layout);
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    reducedMotionQuery.addEventListener('change', onReducedMotionChange);

    whenAssetsReady().then(() => {
      requestAnimationFrame(() => {
        const busy = applyStage(-1, 0); // intro: Title1, then Title2
        stage = 0;
        root.dataset.stage = '0';
        setTimeout(() => { ready = true; }, busy);
      });
    });
  }

  function onReducedMotionChange(e) {
    reducedMotion = e.matches;
    snapTo(Math.max(stage, 0));
  }

  function destroy() {
    window.removeEventListener('resize', layout);
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('touchend', onTouchEnd);
    reducedMotionQuery.removeEventListener('change', onReducedMotionChange);
    clearTimeout(smokeTimer);
    shatter.destroy();
  }

  /* Small console API for tuning: DMB.goTo(3), DMB.snapTo(5), DMB.stage */
  window.DMB = {
    get stage() { return stage; },
    get ready() { return ready; },
    next: () => step(1),
    prev: () => step(-1),
    goTo: (n) => { lockedUntil = 0; return goTo(n); },
    snapTo: (n) => { stage = n; root.dataset.stage = String(n); snapTo(n); },
    destroy,
    config: CFG,
  };

  init();
})();
