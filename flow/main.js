/*
 * DO MY BEST — first screen F12 → F13 → F14
 *
 * Page load: Title1 slides out of an invisible mask from the left,
 *            Title2 out of its mask from the right (F12).
 * Scroll down (one gesture runs the whole sequence):
 *   1. black fills the screen in vertical columns, top → bottom      fill.js
 *   2. Navigation, Social links, Scroll hint switch to F13 colours   CSS transitions
 *   3. Title2 "BUILDERS." morphs into "DESTROYERS." (F14)           flow.js (WebGL)
 * Scroll up: 3 → 2 → 1 in reverse, `reverseSpeed` faster.
 * One gesture triggers at most one sequence; input is locked until it finishes,
 * and trackpad inertia / a big flick cannot re-trigger it.
 */
(function () {
  'use strict';

  const CFG = window.DMB3_CONFIG;
  const root = document.getElementById('viewport');
  const mask1 = root.querySelector('.title-mask--1');
  const mask2 = root.querySelector('.title-mask--2');
  const text1 = mask1.querySelector('.title-text');
  const text2 = mask2.querySelector('.title-text');
  const t2f13 = root.querySelector('.title2--f13');
  const t2f14 = root.querySelector('.title2--f14');

  const rmQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = rmQuery.matches;

  const fill = window.DMB3Fill(root, CFG);
  const charImg = root.querySelector('.character img');

  // Title2 morph: F13 "BUILDERS." → F14 "DESTROYERS." (one colour, from the CSS)
  const flow = window.DMB3Flow(
    root.querySelector('.flow-canvas'),
    () => CFG.flow,
    { old: t2f13, new: t2f14 },
    () => ({ x: 0, y: 532 - CFG.flow.padding, w: 1920, h: 280 + 2 * CFG.flow.padding }),
    'text',
  );

  // Character: "nothing" → F14 Character (32:689), same shader, full colour.
  // Box 592×811 at (625, 126); the image fills 243.96 % of the width and 100 % of the height (Figma crop).
  const CHAR_BOX = { left: 625, top: 126, width: 592, height: 811, imgW: 592 * 2.4396, imgH: 811 };
  const charParams = () => ({ ...CFG.flow, ...CFG.character });
  const charFlow = window.DMB3Flow(
    root.querySelector('.char-canvas'),
    charParams,
    { old: null, new: { image: charImg, box: CHAR_BOX } },
    () => {
      const pad = CFG.character.padding;
      const y = Math.max(0, CHAR_BOX.top - pad);
      return { x: CHAR_BOX.left - pad, y, w: CHAR_BOX.width + 2 * pad, h: Math.min(1080, CHAR_BOX.top + CHAR_BOX.height + pad) - y };
    },
    'image',
  );
  const buildAll = () => { if (flow) flow.build(stageScale); if (charFlow) charFlow.build(stageScale); };

  let state = -1;        // -1 intro, 0 = F12, 1 = F14 (via F13)
  let ready = false;
  let busy = false;
  let lockedUntil = 0;
  let runId = 0;
  let stageScale = 1;
  const timers = new Set();

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
    fill.relayout(vw, vh);
    clearTimeout(rebuildTimer);
    if (ready) rebuildTimer = setTimeout(() => { if (!busy) buildAll(); }, 150);
  }

  /* Size each F12 mask to its text, centred in the Figma title box (x 225, w 1471) */
  function sizeMasks() {
    const m = CFG.intro.maskMargin;
    const boxLeft = 225, boxWidth = 1471;
    for (const [mask, text] of [[mask1, text1], [mask2, text2]]) {
      const w = text.offsetWidth;
      mask.style.left = `${boxLeft + (boxWidth - w) / 2 - m}px`;
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
      // fully hidden just outside the mask: Title1 to the left, Title2 to the right
      text1.style.transform = `translate3d(${-mask1.offsetWidth}px,0,0)`;
      text2.style.transform = `translate3d(${mask2.offsetWidth}px,0,0)`;
    }
    root.offsetWidth; // flush
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

  /* ---------- Sequence helpers ---------- */

  const wait = (ms) => new Promise((resolve) => {
    const id = setTimeout(() => { timers.delete(id); resolve(); }, Math.max(0, ms));
    timers.add(id);
  });
  const fillStep = (dir, speed) => new Promise((resolve) => fill.play(dir, speed, resolve));
  const flowStep = (dir, speed) => new Promise((resolve) => flow.play(
    dir, speed,
    () => root.classList.add('is-morphing'),
    () => { root.classList.toggle('is-f14', dir > 0); root.classList.remove('is-morphing'); resolve(); },
  ));
  const charStep = (dir, speed) => new Promise((resolve) => {
    if (!charFlow) { root.classList.toggle('is-char', dir > 0); wait(CFG.reducedMotion.fade).then(resolve); return; }
    charFlow.play(
      dir, speed,
      () => root.classList.add('is-char-morphing'),
      () => { root.classList.toggle('is-char', dir > 0); root.classList.remove('is-char-morphing'); resolve(); },
    );
  });

  function setChrome(f13, duration) {
    root.style.setProperty('--chrome-dur', `${Math.round(duration)}ms`);
    root.style.setProperty('--chrome-ease', CFG.chrome.easing);
    root.classList.toggle('is-chrome-f13', f13);
    return wait(duration);
  }

  function cancelRunning() {
    runId++;
    timers.forEach(clearTimeout);
    timers.clear();
    fill.stop();
    if (flow) flow.stop();
    if (charFlow) charFlow.stop();
  }

  /* ---------- F12 → F14 and back ---------- */

  async function forward(id) {
    const f = CFG.reducedMotion.fade;
    if (reducedMotion) {
      root.classList.add('is-filled');             await wait(f); if (id !== runId) return;
      await setChrome(true, f);                    if (id !== runId) return;
      root.classList.add('is-f14');                await wait(f); if (id !== runId) return;
      root.classList.add('is-char');               await wait(f);
      return;
    }
    // Fill, chrome and morph overlap on one timeline (all offsets relative to the end of the fill):
    //   chrome starts chrome.delayAfterFill after it, the morph flow.delayAfterFill after it
    //   (negative = starts while the last columns are still finishing).
    const fillDur = fill.duration(1);
    const chromeAt = fillDur + CFG.chrome.delayAfterFill;
    const morphAt = Math.max(0, fillDur + CFG.flow.delayAfterFill);
    await Promise.all([
      fillStep(1, 1),
      wait(chromeAt).then(() => id === runId && setChrome(true, CFG.chrome.duration)),
      wait(morphAt).then(() => {
        if (id !== runId) return null;
        if (flow) return flowStep(1, 1);
        root.classList.add('is-f14'); return wait(f);
      }),
    ]);
    if (id !== runId) return;
    // 4. Character melts in after everything else
    await wait(CFG.character.delayAfterTitle);     if (id !== runId) return;
    await charStep(1, 1);
  }

  async function backward(id) {
    const f = CFG.reducedMotion.fade;
    if (reducedMotion) {
      root.classList.remove('is-char');            await wait(f); if (id !== runId) return;
      root.classList.remove('is-f14');             await wait(f); if (id !== runId) return;
      await setChrome(false, f);                   if (id !== runId) return;
      root.classList.remove('is-filled');          await wait(f);
      return;
    }
    // Exact mirror of forward(), reverseSpeed faster
    const s = CFG.reverseSpeed;
    // Character melts away first, then the rest mirrors forward()
    await charStep(-1, s);                         if (id !== runId) return;
    await wait(CFG.character.delayAfterTitle / s); if (id !== runId) return;
    const fillDur = fill.duration(s);
    const morphDur = flow ? CFG.flow.duration / s : f;
    const lead = Math.max(0, -CFG.flow.delayAfterFill) / s;          // fill overlapped the morph start
    const gap = Math.max(0, CFG.flow.delayAfterFill) / s;            // or there was a pause
    const fillAt = Math.max(0, morphDur - lead) + gap;                // columns start retracting
    const chromeAt = Math.max(0, fillAt - (CFG.chrome.delayAfterFill + CFG.chrome.duration) / s); // colours are back before the columns retract
    await Promise.all([
      flow ? flowStep(-1, s) : (root.classList.remove('is-f14'), wait(f)),
      wait(chromeAt).then(() => id === runId && setChrome(false, CFG.chrome.duration / s)),
      wait(fillAt).then(() => id === runId && fillStep(-1, s)),
    ]);
  }

  function goTo(target) {
    if (target === state || (target !== 0 && target !== 1)) return;
    const dir = target > state ? 1 : -1;
    state = target;
    root.dataset.state = state ? 'F14' : 'F12';
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

    // A gesture that already triggered cannot trigger again (inertia / big flicks).
    // It re-arms after the sequence when a fresh swipe starts (deltas rise again)
    // or the user keeps scrolling for a while.
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

  function applyModeClasses() {
    root.classList.toggle('is-reduced', reducedMotion);
    root.classList.toggle('is-fade', reducedMotion || !flow);
    root.style.setProperty('--fade', `${CFG.reducedMotion.fade}ms`);
  }

  function snapToState() {
    const end = state === 1;
    root.style.setProperty('--chrome-dur', '0ms');
    root.classList.remove('is-morphing');
    root.classList.toggle('is-filled', end);
    root.classList.toggle('is-chrome-f13', end);
    root.classList.toggle('is-f14', end);
    root.classList.toggle('is-char', end);
    root.classList.remove('is-char-morphing');
    root.querySelector('.scene--f13').style.clipPath = '';
  }

  function onReducedMotionChange(e) {
    reducedMotion = e.matches;
    cancelRunning();
    applyModeClasses();
    if (state >= 0) {
      for (const el of [text1, text2]) { el.style.transition = 'none'; el.style.transform = 'none'; el.style.opacity = '1'; }
      snapToState();
      busy = false;
      lockedUntil = 0;
    }
  }

  /* ---------- Boot ---------- */

  function fontsReady() {
    if (!document.fonts) return Promise.resolve();
    const loads = ['200px Boldonse', '500 16px Manrope', '400 16px Syne', '600 16px Syne']
      .map((f) => document.fonts.load(f).catch(() => {}));
    const img = charImg.decode ? charImg.decode().catch(() => {}) : Promise.resolve();
    return Promise.race([Promise.all([...loads, img]).then(() => document.fonts.ready), new Promise((r) => setTimeout(r, 4000))]);
  }

  function replayIntro() {
    cancelRunning();
    ready = false;
    busy = false;
    state = -1;
    root.dataset.state = 'intro';
    snapToState();
    setIntroStart();
    requestAnimationFrame(() => {
      const total = playIntro();
      state = 0;
      root.dataset.state = 'F12';
      setTimeout(() => { ready = true; }, total);
    });
  }

  function init() {
    applyModeClasses();
    layout();
    // hide the titles until the masks are measured with the real font
    text1.style.visibility = text2.style.visibility = 'hidden';

    window.addEventListener('resize', layout);
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    rmQuery.addEventListener('change', onReducedMotionChange);

    fontsReady().then(() => {
      sizeMasks();
      buildAll(); // textures need the real font and the decoded character image
      setIntroStart();
      text1.style.visibility = text2.style.visibility = '';
      replayIntro();
    });
  }

  /* Console helpers for tuning */
  window.DMB3 = {
    get state() { return state; },
    get ready() { return ready; },
    get busy() { return busy; },
    next: () => step(1),
    prev: () => step(-1),
    replayIntro,
    fill,
    flow,
    /* freeze the Title2 morph at progress t (0..1) on the F13 screen; DMB3.unfreeze() to exit */
    freeze(t) {
      if (!flow) return;
      root.style.setProperty('--chrome-dur', '0ms');
      root.classList.add('is-filled', 'is-chrome-f13', 'is-morphing');
      flow.build(stageScale);
      flow.renderAt(t);
    },
    /* freeze the Character melt-in at progress t (0..1) on the F14 screen */
    freezeCharacter(t) {
      if (!charFlow) return;
      root.style.setProperty('--chrome-dur', '0ms');
      root.classList.add('is-filled', 'is-chrome-f13', 'is-f14', 'is-char-morphing');
      charFlow.build(stageScale);
      charFlow.renderAt(t);
    },
    unfreeze() { root.classList.remove('is-morphing', 'is-char-morphing'); snapToState(); },
    charFlow,
    config: CFG,
  };

  init();
})();
