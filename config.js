/*
 * DO MY BEST — first-screen animation prototype
 * ------------------------------------------------
 * Every timing, delay, offset and input threshold lives here.
 * Times are in milliseconds, distances in Figma pixels (1920×1080 frame space).
 */
window.DMB_CONFIG = {
  /* Design frame size (Figma frames 01–04) */
  frame: { width: 1920, height: 1080 },

  /* Initial load: Title1 then Title2 pop in (opacity 0 → 1, no movement) */
  intro: {
    title1Delay: 350,   // after fonts/images are ready
    title2Delay: 700,   // absolute, so the gap after Title1 is 350ms
    duration: 80,       // short = abrupt appearance
    easing: 'linear',
  },

  /* Scroll / input handling */
  input: {
    wheelThreshold: 24,   // accumulated deltaY (px) needed to trigger a step
    touchThreshold: 40,   // finger travel (px) needed to trigger a step
    idleMs: 180,          // a pause this long between wheel events starts a new gesture
    reaccelerationRatio: 1.6, // during a gesture, deltas rising by this factor = a new swipe (inertia only decays)
    maxExtraLockMs: 1400, // continuous scrolling advances at most one stage per transition + this
  },

  /* Title2 swap slot (Stage 1). Both Title2 blocks are clipped to this band. */
  title2Slot: {
    top: 527,      // y of the clip band (= top of Frame 01 Title2)
    height: 125,   // band height (covers Frame 02 Title2, bottom 645.8)
    travel: 128,   // how far each block moves (out downward / in from above)
  },

  /* Per-stage forward timings. Reverse scrolling uses `reverse` below. */
  stages: {
    1: { // first the black top-to-bottom fill, then the Title2 swap
      wipe:      { duration: 800, easing: 'cubic-bezier(0.77, 0, 0.18, 1)' },
      titleSwap: { delayAfterWipe: 120, duration: 750, easing: 'cubic-bezier(0.77, 0, 0.18, 1)' },
    },
    2: { duration: 70, easing: 'linear' }, // GlassEffect1
    3: { duration: 70, easing: 'linear' }, // GlassEffect2
    4: { duration: 70, easing: 'linear' }, // GlassEffect4
    5: { duration: 70, easing: 'linear' }, // GlassEffect3
    6: { // glass shatters and falls (see `shatter` below), title fades out
      glassDuration: 520,    // reduced-motion only: glass fade
      glassEasing: 'ease',
      titleFadeDuration: 380,
      titleFadeEasing: 'ease-out',
      exitOvershoot: 40, // extra px beyond the viewport bottom so no glass remains visible
    },
    7: { // Frame 04 reveal sequence
      headline:     { delay: 0,    duration: 160, easing: 'linear' },
      studioLabels: { delay: 260,  duration: 160, easing: 'linear' },
      character:    { delay: 520,  duration: 700, easing: 'ease-out' },
      smoke:        { delay: 1150, duration: 1000, easing: 'ease-out' },
    },
  },

  /* Stage 6 glass shatter: the glass breaks into shards that fall with 3D rotation */
  shatter: {
    image: 'assets/glass-composite.png', // GlassEffect1–4 combined (Figma stacking order)
    seed: 7,                 // change for a different (but repeatable) shard pattern
    impact: [925, 545],      // impact point in frame px — where the cracks converge in Frame 03
    spokes: 14,              // radial cuts around the impact point
    rings: [0, 85, 210, 380, 620, 900, 1300], // ring radii (px) from the impact point
    angleJitter: 0.7,        // 0 = even spokes, 1 = very irregular
    radiusJitter: 0.18,
    splitChance: 0.45,       // chance a cell is split into two triangles
    stagger: 260,            // ms: pieces near the impact fall first, far corners up to this much later
    delayJitter: 90,         // ms of random extra delay per shard
    fallDuration: 1050,      // ms per shard (before jitter)
    durationJitter: 0.25,    // ±25%
    fallEasing: 'cubic-bezier(0.45, 0, 0.9, 0.55)', // gravity: slow start, accelerating
    popPhase: 0.14,          // share of the animation spent on the initial outward "break"
    popOut: 14,              // px each shard moves away from the impact point when breaking
    lift: 6,                 // px small upward kick before falling
    popZ: 140,               // px toward the viewer (3D)
    drift: 90,               // px of sideways drift while falling
    maxRotateX: 75,          // deg (tumbling toward / away from the viewer)
    maxRotateY: 60,          // deg
    maxRotateZ: 40,          // deg (spin in the screen plane)
    perspective: 1400,       // px
    reverseSpeed: 1.6,       // scrolling back: shards reassemble this much faster
  },

  /* Scrolling back up: same changes, faster and without delays */
  reverse: {
    durationScale: 0.6,
    minDuration: 60,
  },

  /* Continuous smoke drift (starts once Stage 7 reveals the smoke) */
  smoke: {
    period: 7600,   // one rise cycle per plume copy (two copies, half a period apart)
    rise: 64,       // px the smoke drifts upward per cycle
    startOffset: 14,// px below the design position where a cycle starts
    sway: 6,        // px of gentle horizontal drift
    scale: 1.035,   // subtle growth over a cycle
    peakOpacity: 1,
  },

  /* prefers-reduced-motion: movement becomes short fades, smoke stays still */
  reducedMotion: {
    fadeDuration: 250,
  },
};
