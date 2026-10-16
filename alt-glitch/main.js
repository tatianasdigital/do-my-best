/*
 * DO MY BEST — alternative first screen: intro + scroll-triggered sequence
 *
 * States:
 *   intro  titles hidden in their line masks; entrance plays automatically on load
 *   F7     (0) after the entrance; waiting for the first scroll down
 *   F8     (1) after the transition; scrolling up plays it back to F7
 *
 * Scroll down (F7 → F8):
 *   1. Title2 glitches "BUILDERS." → "DESTROYERS." (stays #0E0F0E)   glitch.js
 *   2. black fills the screen in vertical columns, top → bottom       fill.js
 *   3. Navigation, Social links, Scroll hint switch to F8 colours     CSS transitions
 * Scroll up: 3 → 2 → 1 reversed, `reverseSpeed` faster.
 *
 * One scroll gesture triggers at most one transition; input is locked until it
 * has fully finished, and trackpad inertia cannot re-trigger it (see onWheel).
 */
(function () {
  'use strict';

  const CFG = window.DMB2_CONFIG;
  const root = document.getElementById('viewport');
  const title1 = root.querySelector('.title1--f7');
  const title2 = root.querySelector('.title2--old');

  const rmQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = rmQuery.matches;

  const glitch = window.DMB2Glitch(root, CFG);
  const fill = window.DMB2Fill(root, CFG);

  let state = -1;         // -1 intro, 0 = F7, 1 = F8
  let ready = false;      // input accepted only after the entrance
  let busy = false;       // a transition is running
  let lockedUntil = 0;    // when the last transition finished (for gesture re-arming)
  let runId = 0;          // cancels a running sequence (reduced-motion switch / replay)
  const timers = new Set();

  /* ---------- Layout: scale the 1920×1080 stage to fit the viewport ---------- */

  function layout() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.min(vw / CFG.frame.width, vh / CFG.frame.height);
    const s = document.documentElement.style;
    s.setProperty('--stage-scale', scale);
    s.setProperty('--stage-x', `${(vw - CFG.frame.width * scale) / 2}px`);
    s.setProperty('--stage-y', `${(vh - CFG.frame.height * scale) / 2}px`);
    fill.relayout(vw, vh);
  }

  /* ---------- Intro: Title1 from its line start, Title2 from its line end ---------- */

  // Start positions: each title fully hidden just outside its line mask
  // (.title-band--1 / --2): Title1 left of the line start, Title2 right of the line end.
  function title1Start() { return -(915.514 + CFG.intro.revealExtra); }
  function title2Start() { return 1225.77 + CFG.intro.revealExtra; }

  function setIntroStart() {
    for (const el of [title1, title2]) { el.style.transition = 'none'; el.style.opacity = ''; }
    if (reducedMotion) {
      title1.style.transform = title2.style.transform = 'none';
      title1.style.opacity = title2.style.opacity = '0';
    } else {
      title1.style.transform = `translate3d(${title1Start()}px,0,0)`;
      title2.style.transform = `translate3d(${title2Start()}px,0,0)`;
    }
    root.offsetWidth; // flush
  }

  function playIntro() {
    const I = CFG.intro;
    const t2Delay = I.title1Delay + I.title2Delay;
    if (reducedMotion) {
      const d = CFG.reducedMotion.introFade;
      title1.style.transition = `opacity ${d}ms ease ${I.title1Delay}ms`;
      title2.style.transition = `opacity ${d}ms ease ${t2Delay}ms`;
      title1.style.opacity = title2.style.opacity = '1';
      return t2Delay + d;
    }
    title1.style.transition = `transform ${I.title1Duration}ms ${I.easing} ${I.title1Delay}ms`;
    title2.style.transition = `transform ${I.title2Duration}ms ${I.easing} ${t2Delay}ms`;
    title1.style.transform = 'translate3d(0,0,0)';
    title2.style.transform = 'translate3d(0,0,0)';
    return Math.max(I.title1Delay + I.title1Duration, t2Delay + I.title2Duration);
  }

  /* ---------- Sequence helpers ---------- */

  const wait = (ms) => new Promise((resolve) => {
    const id = setTimeout(() => { timers.delete(id); resolve(); }, Math.max(0, ms));
    timers.add(id);
  });
  const glitchStep = (dir, speed) => new Promise((resolve) => glitch.play(dir, speed, resolve));
  const fillStep = (dir, speed) => new Promise((resolve) => fill.play(dir, speed, resolve));

  function setChrome(f8, duration) {
    root.style.setProperty('--chrome-dur', `${Math.round(duration)}ms`);
    root.style.setProperty('--chrome-ease', CFG.chrome.easing);
    root.classList.toggle('is-chrome-f8', f8);
    return wait(duration);
  }

  function cancelRunning() {
    runId++;
    timers.forEach(clearTimeout);
    timers.clear();
    glitch.stop();
    fill.stop();
  }

  /* ---------- F7 → F8 and back ---------- */

  async function forward(id) {
    if (reducedMotion) {
      const d = CFG.reducedMotion.stepFade;
      root.classList.add('is-swapped');        await wait(d); if (id !== runId) return;
      root.classList.add('is-filled');         await wait(d); if (id !== runId) return;
      await setChrome(true, d);
      return;
    }
    await glitchStep(1, 1);                    if (id !== runId) return;
    root.classList.add('is-swapped');
    await wait(CFG.fill.delayAfterGlitch);     if (id !== runId) return;
    await fillStep(1, 1);                      if (id !== runId) return;
    await wait(CFG.chrome.delayAfterFill);     if (id !== runId) return;
    await setChrome(true, CFG.chrome.duration);
  }

  async function backward(id) {
    if (reducedMotion) {
      const d = CFG.reducedMotion.stepFade;
      await setChrome(false, d);               if (id !== runId) return;
      root.classList.remove('is-filled');      await wait(d); if (id !== runId) return;
      root.classList.remove('is-swapped');     await wait(d);
      return;
    }
    const s = CFG.reverseSpeed;
    await setChrome(false, CFG.chrome.duration / s);   if (id !== runId) return;
    await wait(CFG.chrome.delayAfterFill / s);         if (id !== runId) return;
    await fillStep(-1, s);                             if (id !== runId) return;
    await wait(CFG.fill.delayAfterGlitch / s);         if (id !== runId) return;
    const g = glitchStep(-1, s);
    root.classList.remove('is-swapped'); // resting title is hidden while the strips run
    await g;
  }

  function goTo(target) {
    if (target === state || (target !== 0 && target !== 1)) return;
    const dir = target > state ? 1 : -1;
    state = target;
    root.dataset.state = state ? 'F8' : 'F7';
    busy = true;
    lockedUntil = Infinity;
    const id = ++runId;
    (dir > 0 ? forward(id) : backward(id)).then(() => {
      if (id !== runId) return;
      busy = false;
      lockedUntil = performance.now();
    });
  }

  function step(dir) {
    if (!ready || busy || performance.now() < lockedUntil) return;
    goTo(state + dir);
  }

  /* ---------- Input ---------- */

  let lastWheelAt = 0;
  let lastWheelAbs = 0;
  let wheelAccum = 0;
  let gestureConsumed = false;

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

    // A gesture that already triggered cannot trigger again, so one big flick
    // or trackpad inertia never plays the transition twice / skips straight back.
    // It re-arms after the transition when a fresh swipe starts (deltas rise
    // again — inertia only decays) or the user keeps scrolling for a while.
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

  /* ---------- Reduced motion ---------- */

  function applyReducedMotionClass() {
    root.classList.toggle('is-reduced', reducedMotion);
    root.style.setProperty('--rm-fade', `${CFG.reducedMotion.stepFade}ms`);
  }

  /* Jump straight to the current state's final look (no animation) */
  function snapToState() {
    const f8 = state === 1;
    root.style.setProperty('--chrome-dur', '0ms');
    root.classList.toggle('is-swapped', f8);
    root.classList.toggle('is-filled', f8);
    root.classList.toggle('is-chrome-f8', f8);
    root.querySelector('.scene--f8').style.clipPath = '';
  }

  function onReducedMotionChange(e) {
    reducedMotion = e.matches;
    cancelRunning();
    applyReducedMotionClass();
    if (state >= 0) {
      for (const el of [title1, title2]) { el.style.transition = 'none'; el.style.transform = 'none'; el.style.opacity = ''; }
      snapToState();
      busy = false;
      lockedUntil = 0;
    }
  }

  /* ---------- Boot ---------- */

  function whenAssetsReady() {
    const imgs = Array.from(document.images).map((img) =>
      img.complete ? Promise.resolve() : new Promise((r) => { img.onload = img.onerror = r; }));
    const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
    const timeout = new Promise((r) => setTimeout(r, 4000));
    return Promise.race([Promise.all([...imgs, fonts]), timeout]);
  }

  function replayIntro() {
    cancelRunning();
    ready = false;
    busy = false;
    state = -1;
    root.dataset.state = 'intro';
    snapToState(); // back to F7 colours
    setIntroStart();
    requestAnimationFrame(() => {
      const total = playIntro();
      state = 0;
      root.dataset.state = 'F7';
      setTimeout(() => {
        // hand Title2's opacity back to the stylesheet (reduced-motion crossfade)
        title2.style.transition = '';
        title2.style.opacity = '';
        ready = true;
      }, total);
    });
  }

  function init() {
    applyReducedMotionClass();
    layout();
    setIntroStart();

    window.addEventListener('resize', layout);
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    rmQuery.addEventListener('change', onReducedMotionChange);

    whenAssetsReady().then(replayIntro);
  }

  /* Console helpers for tuning */
  window.DMB2 = {
    get state() { return state; },
    get ready() { return ready; },
    get busy() { return busy; },
    next: () => step(1),
    prev: () => step(-1),
    replayIntro,
    glitch,
    fill,
    config: CFG,
  };

  init();
})();
