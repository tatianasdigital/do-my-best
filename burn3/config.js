/*
 * DO MY BEST — first screen, Liquid Flow "black hole" F12 → F14   (burn3)
 * ------------------------------------------------------------------------
 * All timings and effect parameters. Times in ms, distances in Figma px
 * (1920×1080 frame space). Tune live from the console, e.g.
 *   DMB4.config.hole.duration = 2000           (applies on the next scroll)
 *   DMB4.config.burn.vortexTwist = 4           (stronger twist)
 *
 * Page load : Title1 slides out of a mask from the left, Title2 from the right (F12).
 * Scroll ↓  : F12 twists into a funnel and is swallowed by a growing hole; F14 titles
 *             slide in at ~85 % revealed.
 * Scroll ↑  : F12 spirals back out and re-forms.
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

  /* ---------- Black hole: timing ---------- */
  hole: {
    duration: 2600,       // ms — whole swallow, scroll ↓
    easing: 'collapse',   // the pull builds up, the screen collapses, the corners go softly
                          // (or 'inOutCubic', 'inOutQuart', 'inOutSine')
    center: [0.5, 0.5],   // where the hole opens (fractions of the window), or 'cursor'
    reverseSpeed: 1.4,    // scroll ↑ plays this much faster
  },

  /* ---------- Scroll: Liquid Flow, preset "burn" ---------- */
  /* Any Liquid Flow parameter can be set here (see liquid-flow.js → DEFAULTS / PRESETS.burn).
     Distances are in Figma px and are scaled with the window automatically. */
  burn: {
    sweep: 'radial',      // the hole grows as a circle from hole.center
    spread: 2.4,          // ring width: higher = thinner liquid ring, lower = wider
    swapAt: 0.45,         // how long F12 stays visible as liquid before it burns away
    attack: 0.25,
    displacement: 120,
    noiseScale: 170,
    smear: 60,
    holeAmount: 1.4,
    vertical: 1.0,
    // the black hole itself (Liquid Flow v1.3):
    vortex: 1,            // 0 = plain burn (as in burn/), 1 = full swirl
    vortexTwist: 2.6,     // rad of rotation right at the edge of the hole (falls off outwards)
    vortexSpin: 1.4,      // extra rad per second, so the funnel keeps turning
    vortexPull: 110,      // px the content is dragged inwards at the edge
    vortexWidth: 240,     // px reach of the swirl beyond the hole (+60 % of the hole radius)
    funnelShade: 0.4,     // darkening towards the horizon (gives the funnel depth)
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
