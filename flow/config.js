/*
 * DO MY BEST — first screen F12 → F13 → F14
 * ------------------------------------------
 * All timings and effect parameters. Times in ms, distances in Figma px
 * (1920×1080 frame space). Tune live from the console, e.g.
 *   DMB3.config.flow.duration = 2600     (applies on the next scroll)
 *
 * Page load : Title1 slides out of a mask from the left, Title2 from the right.
 * Scroll    : 1. fill   — black fills the screen in vertical columns, top → bottom
 *             2. chrome — Navigation, Social links, Scroll hint switch to F13 colours
 *             3. flow   — Title2 "BUILDERS." morphs into "DESTROYERS." (WebGL);
 *                         starts right as the fill ends and runs alongside the chrome change
 *             4. character — the F14 Character melts in with the same shader
 * Scroll up : the same steps in reverse order, `reverseSpeed` faster.
 */
window.DMB3_CONFIG = {
  frame: { width: 1920, height: 1080 },

  /* ---------- Page load: titles slide out of their masks ---------- */
  intro: {
    title1Delay: 300,     // after fonts are ready
    title1Duration: 800,
    title2Delay: 220,     // after the START of the Title1 entrance
    title2Duration: 800,
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)', // fast start, long smooth stop, no overshoot
    maskMargin: 12,       // px of breathing room inside each mask so glyph edges are never clipped
  },

  /* ---------- 1. Black fill in vertical columns ---------- */
  fill: {
    columns: 8,           // across the full window width
    columnDuration: 560,  // each column, top → bottom
    stagger: 60,          // start offset between neighbouring columns
    order: 'left-to-right', // 'left-to-right' | 'right-to-left' | 'center-out' | 'edges-in' | 'random'
    easing: 'inOutQuart',   // 'linear' | 'inOutCubic' | 'inOutQuart' | 'outQuart' | 'outExpo'
  },

  /* ---------- 2. Navigation / Social links / Scroll hint → F13 colours ---------- */
  chrome: {
    delayAfterFill: 60,
    duration: 260,
    easing: 'ease',
  },

  /* ---------- 3. Title2 morph: "BUILDERS." (F13) → "DESTROYERS." (F14) ---------- */
  flow: {
    delayAfterFill: -100, // ms relative to the END of the black fill; negative = starts while the
                          // last columns are finishing (Title2 is already covered by then).
                          // The chrome colour change runs in parallel with the morph.
    duration: 2200,       // whole morph, first ripple → clean title

    // The distortion travels across the word from right to left, like the reference:
    // the right edge melts first and also settles first.
    spread: 0.35,         // 0 = whole word at once, 1 = strong right→left sweep
    attack: 0.22,         // share of each pixel's timeline spent dissolving
    release: 0.30,        // share spent re-forming (rest is the fully-liquid plateau)
    swapAt: 0.5,          // where (in each pixel's timeline) old text becomes new text

    // Liquid look
    displacement: 170,    // px — how far the flow field drags the letters at peak
    vertical: 0.4,        // vertical share of the flow (low = mostly sideways, keeps it off Title1)
    noiseScale: 150,      // px — size of the swirls (bigger = broader, softer flow)
    warp: 4.2,            // domain-warp strength (higher = more marbled / turbulent)
    flowSpeed: 0.55,      // how fast the swirl itself moves while distorted
    smear: 70,            // px — streak length along the flow (fibrous trails)
    threshold: 0.5,       // alpha cut-off → hard, liquid edges
    holeAmount: 1.5,      // how much the noise eats holes into the letters at peak (lacier)
    contours: 1.0,        // brightness of the thin marbled outline strands (0 = off)
    contourDensity: 10.0, // number of strands across the noise range

    padding: 150,         // px canvas margin above/below the title so the flow can spill out
    maxPixelRatio: 1.5,   // caps the WebGL resolution on hi-DPI screens (performance)
  },

  /* ---------- 4. Character (F14) melts in after everything else ---------- */
  /* Same shader as Title2: any `flow` parameter can be overridden here. The source
     is "nothing", so the Character appears from the liquid after `swapAt`. */
  character: {
    delayAfterTitle: 150, // ms after the Title2 morph has finished
    duration: 1900,
    swapAt: 0.3,          // early swap → more of the timeline shows the liquid character
    spread: 0.3,          // right → left sweep across the figure
    displacement: 130,
    vertical: 0.9,        // the figure is tall, so let the flow move vertically too
    noiseScale: 140,
    smear: 60,
    holeAmount: 1.3,
    padding: 140,         // px canvas margin around the 592×811 box for the spill
  },

  /* Scrolling back up: all steps in reverse order, this much faster */
  reverseSpeed: 1.4,

  /* ---------- Scroll / input ---------- */
  input: {
    wheelThreshold: 24,       // accumulated deltaY (px) needed to trigger
    touchThreshold: 40,
    idleMs: 180,              // wheel pause that starts a new gesture
    reaccelerationRatio: 1.6, // deltas rising by this factor = a new swipe (inertia only decays)
    maxExtraLockMs: 1400,     // continuous scrolling re-arms after transition + this
  },

  /* prefers-reduced-motion (and the morph fallback when WebGL is unavailable) */
  reducedMotion: { fade: 260 },
};
