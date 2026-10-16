/*
 * DO MY BEST — first screen, Liquid Flow two-step CIRCLE burn F12 → F14   (burn4)
 * ----------------------------------------------------------------------
 * All timings and effect parameters. Times in ms, distances in Figma px
 * (1920×1080 frame space). Tune live from the console, e.g.
 *   DMB4.config.steps.growDuration = 2600      (applies on the next scroll)
 *
 * Page load    : Title1 slides out of a mask from the left, Title2 from the right (F12).
 * 1st scroll ↓ : a small liquid circle opens in the centre and holds (edge keeps swirling).
 * 2nd scroll ↓ : the circle spreads out to all sides until F14 is fully visible —
 *                smooth acceleration, then deceleration; F14 titles slide in at ~85 %.
 * Scroll ↑     : the same steps backwards.
 */
window.DMB4_CONFIG = {
  frame: { width: 1920, height: 1080 },

  /* ---------- Page load: titles slide out of their masks ---------- */
  intro: {
    title1Delay: 300,
    title1Duration: 800,
    title2Delay: 220,     // after the START of the Title1 entrance
    title2Duration: 800,
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    maskMargin: 12,       // px of room inside each mask so glyph edges are never clipped
  },

  /* ---------- Two-step timeline ---------- */
  steps: {
    circleRadius: 0.1,    // 1st scroll: radius of the centre circle (fraction of centre→corner distance)
    openDuration: 750,    // 1st scroll: circle opening
    openEasing: 'outCubic',
    growDuration: 2200,   // 2nd scroll: the circle spreads to full screen
    growEasing: 'inOutCubic', // smooth acceleration, then deceleration ('inOutQuint' = more dramatic, 'inOutSine' = softer)
    reverseSpeed: 1.4,    // scrolling back up runs the steps this much faster
  },

  /* ---------- Scroll: Liquid Flow, preset "burn" ---------- */
  /* Any Liquid Flow parameter can be set here (see liquid-flow.js → DEFAULTS / PRESETS.burn).
     Distances are in Figma px and are scaled with the window automatically. */
  burn: {
    sweep: 'radial',      // a plain circle growing from `center` (burn1 uses 'spiral')
    center: [0.5, 0.5],   // where the burn starts (fraction of the window)
    spread: 2.4,          // ring width: higher = thinner liquid ring, lower = wider
    swapAt: 0.45,         // how long F12 stays visible as liquid before it burns away
    attack: 0.25,
    displacement: 120,
    noiseScale: 170,
    smear: 60,
    holeAmount: 1.4,
    vertical: 1.0,
  },

  /* ---------- F14 titles: same entrance as F12, once most of F14 is revealed ---------- */
  titles: {
    revealAt: 0.85,       // share of the screen already burned through when Title1 starts (0..1)
    // the slide itself uses the `intro` timings above (duration, Title2 delay, easing)
    hideDuration: 140,    // ms — quick fade out when scrolling back up (before F12 re-forms)
  },

  /* ---------- F14 background video ---------- */
  video: {
    youtubeId: 'dzINr5cWFfM',  // "The Bookwalker: Thief of Tales — Official Launch Trailer" (IGN)
    start: 25,            // seconds — the video starts (and loops back) here
    end: null,            // seconds to loop at, or null = the end of the video
    zoom: 1.2,            // > 1 crops YouTube's title / logo overlays off the edges
    restartOnReveal: true,// jump back to `start` every time the burn reveals F14
    shade: 0.15,          // black layer over the video (0 = none, 1 = solid black)
  },

  /* ---------- Scroll / input ---------- */
  input: {
    wheelThreshold: 24,
    touchThreshold: 40,
    idleMs: 180,
    reaccelerationRatio: 1.6,
    maxExtraLockMs: 1400,
  },

  /* prefers-reduced-motion (and the fallback when WebGL is unavailable) */
  reducedMotion: { fade: 300 },
};
