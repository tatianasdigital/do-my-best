/*
 * DO MY BEST — first screen, Liquid Flow burn F12 → F14
 * ------------------------------------------------------
 * All timings and effect parameters. Times in ms, distances in Figma px
 * (1920×1080 frame space). Tune live from the console, e.g.
 *   DMB4.config.burn.duration = 1200      (applies on the next scroll)
 *
 * Page load : Title1 slides out of a mask from the left, Title2 from the right (F12).
 * Scroll ↓  : Liquid Flow burns F12 away radially from the centre, revealing F14
 *             (background video from 0:25); at ~85 % revealed, the F14 titles slide out
 *             of their masks exactly like the F12 titles do on page load.
 * Scroll ↑  : the burn plays backwards — F12 re-forms from the edges to the centre.
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

  /* ---------- Scroll: Liquid Flow, preset "burn" ---------- */
  /* Any Liquid Flow parameter can be set here (see liquid-flow.js → DEFAULTS / PRESETS.burn).
     Distances are in Figma px and are scaled with the window automatically. */
  burn: {
    duration: 1400,       // whole burn, first hole in the centre → F12 fully gone
    center: [0.5, 0.5],   // where the burn starts (fraction of the window)
    spread: 2.4,          // ring width: higher = thinner liquid ring, lower = wider
    swapAt: 0.45,         // how long F12 stays visible as liquid before it burns away
    attack: 0.25,
    displacement: 120,
    noiseScale: 170,
    smear: 60,
    holeAmount: 1.4,
    vertical: 1.0,
    reverseSpeed: 1.3,    // scrolling back up plays the burn backwards, this much faster
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
