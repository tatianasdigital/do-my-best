/*
 * DO MY BEST — first screen, Liquid Flow "lens + burst" F12 → F14   (burn2)
 * ------------------------------------------------------------------------
 * All timings and effect parameters. Times in ms, distances in Figma px
 * (1920×1080 frame space). Tune live from the console, e.g.
 *   DMB4.config.lens.burstDuration = 1600      (applies on the next scroll)
 *
 * Page load    : Title1 slides out of a mask from the left, Title2 from the right (F12).
 * 1st scroll ↓ : a liquid lens opens under the cursor and follows it with inertia.
 * 2nd scroll ↓ : the lens opens up smoothly to full screen from the cursor point
 *                (ease-in-out); F14 titles slide in at ~85 % revealed.
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

  /* ---------- Lens (follows the cursor) + smooth reveal ---------- */
  lens: {
    radius: 150,          // px (Figma) — lens radius after the 1st scroll
    openDuration: 650,
    openEasing: 'outCubic',
    followLag: 140,       // ms — how softly the lens trails the cursor (higher = lazier)
    breathe: 0.05,        // ±5 % slow "breathing" of the lens while it waits
    burstDuration: 2000,  // 2nd scroll: lens → full screen
    burstEasing: 'inOutCubic', // smooth acceleration, then deceleration ('inOutSine' = softer, 'inOutQuint' = punchier)
    burstBoil: 0.35,      // how much the liquid edge livens up during the reveal (0 = not at all)
    boilDisplacement: 1.6,// …at the peak: ×displacement
    boilSpeed: 1.8,       // …and ×flowSpeed
    inhaleScale: 1,       // optional anticipation before the reveal: < 1 contracts the lens first (off)
    inhaleDuration: 0,
    reverseSpeed: 1.4,
  },

  /* ---------- Scroll: Liquid Flow, preset "burn" ---------- */
  /* Any Liquid Flow parameter can be set here (see liquid-flow.js → DEFAULTS / PRESETS.burn).
     Distances are in Figma px and are scaled with the window automatically. */
  burn: {
    sweep: 'radial',      // the burst is a circle from wherever the lens is (centre set by the lens)
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
