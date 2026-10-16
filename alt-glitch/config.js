/*
 * DO MY BEST — alternative first screen (F7 → F8, glitch concept)
 * -----------------------------------------------------------------
 * Every timing, delay, distance, easing and glitch parameter lives here.
 * Times in milliseconds, distances in Figma pixels (1920×1080 frame space).
 *
 * Tuning from the browser console:  DMB2.config.fill.stagger = 80
 * (changes apply to the next transition; no reload needed).
 *
 * Scroll-down sequence:
 *   1. titleGlitch : Title2 glitches "BUILDERS." → "DESTROYERS." (stays #0E0F0E)
 *   2. fill        : black fills the screen in vertical columns, top → bottom
 *                    (the titles appear in #E3F14A inside the black)
 *   3. chrome      : Navigation, Social links, Scroll hint switch to F8 colours
 * Scrolling up plays the same steps in reverse order.
 */
window.DMB2_CONFIG = {
  frame: { width: 1920, height: 1080 },

  /* ---------- Page load: Title1 from the left, then Title2 from the right ---------- */
  intro: {
    title1Delay: 250,     // after fonts/images are ready
    title1Duration: 620,
    title2Delay: 200,     // after the START of the Title1 entrance
    title2Duration: 620,
    // Fast start, long smooth stop, no overshoot (expo-out family)
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    // Each title is masked by an invisible box exactly as wide as its line.
    // It starts fully hidden just outside the mask (Title1 left of it, Title2
    // right of it) and travels its own width plus this extra distance (px).
    revealExtra: 0,
  },

  /* ---------- 1. Title2 glitch ---------- */
  titleGlitch: {
    duration: 480,
    frameMs: 42,          // average hold per glitch frame (digital, stepped look)
    frameJitter: 0.55,    // ±55% per-frame hold variation (irregular stutter)
    seed: null,           // null = new random pattern every run; a number = same pattern every time
    strips: 7,            // horizontal slices across the title
    maxOffset: 90,        // px horizontal slice displacement at peak
    ghostOffset: [6, 22], // px min/max offset of the white "chromatic" ghost
    ghostOpacity: 0.9,
    ghostChance: 0.75,    // chance a slice shows a ghost in a given frame
    dropChance: 0.12,     // chance a slice blanks out for one frame (flicker)
    swapBias: 1.6,        // >1 holds the old title longer before it corrupts into the new one
  },

  /* ---------- 2. Black fill in vertical columns ---------- */
  fill: {
    delayAfterGlitch: 120,
    columns: 8,           // across the full window width
    columnDuration: 560,  // each column, top → bottom
    stagger: 60,          // start offset between neighbouring columns
    order: 'left-to-right', // 'left-to-right' | 'right-to-left' | 'center-out' | 'edges-in' | 'random'
    easing: 'inOutQuart',   // 'linear' | 'inOutCubic' | 'inOutQuart' | 'outQuart' | 'outExpo'
  },

  /* ---------- 3. Navigation / Social links / Scroll hint → F8 colours ---------- */
  chrome: {
    delayAfterFill: 60,
    duration: 260,
    easing: 'ease',
  },

  /* Scrolling back up: same steps in reverse order, this much faster */
  reverseSpeed: 1.4,

  /* ---------- Scroll / input ---------- */
  input: {
    wheelThreshold: 24,       // accumulated deltaY (px) needed to trigger
    touchThreshold: 40,
    idleMs: 180,              // wheel pause that starts a new gesture
    reaccelerationRatio: 1.6, // deltas rising by this factor = a new swipe (inertia only decays)
    maxExtraLockMs: 1400,     // continuous scrolling re-arms after transition + this
  },

  /* ---------- prefers-reduced-motion ---------- */
  reducedMotion: {
    introFade: 250,       // titles fade in place
    stepFade: 220,        // each step becomes a short crossfade
  },
};
