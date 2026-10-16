/*
 * DO MY BEST — GamesSection: GamesNewImage window reveal, GameSection1 → 2 → 3
 *
 * One pinned stage (position: sticky). Layer order, bottom → top:
 *   games-intro    "Released games" + GAMES GAMES GAMES
 *   game-block 1   TheFinalStationSection: its background image seen through a window
 *                  (GamesNewImage 109:1542, a circle Ø604 at the stage centre) that grows with the
 *                  scroll until it fills the screen + Shadow + content
 *   game-block 2   TheOnlyTraitorSection: own background image + Shadow + content
 *   game-block 3   TheBookwalkerSection:  own background image + Shadow + content
 *   small-progress three segments
 * Each block is one layer: the next block slides up over the current one, and the
 * current block — background included — shrinks, darkens and moves back.
 *
 * Scroll inside the section (in viewport heights, config.games):
 *   0 … revealLength        the GamesNewImage window grows (eased) until it covers the viewport
 *   then stateLength each   GameSection1, GameSection2, GameSection3
 * The window size is scrubbed with the scroll position; the game states switch at
 * fixed thresholds and animate with CSS transitions (the previous state shrinks,
 * darkens and moves back, the next one rises above it). Everything is a pure function
 * of window.scrollY, so scrolling up reverses it exactly.
 */
(function () {
  'use strict';

  const G = window.DMB_CONFIG.games;
  const section = document.querySelector('.games');
  const stage = section.querySelector('.games__stage');
  const videoBox = section.querySelector('.games-video');
  const intro = section.querySelector('.games-intro');
  const shadow = section.querySelector('.games-shadow--reveal');
  const blocks = [...section.querySelectorAll('.game-block')];
  const layers = [...section.querySelectorAll('.game-layer')];
  const segs = [...section.querySelectorAll('.small-progress__seg')];
  const progress = section.querySelector('.small-progress');
  const rm = window.matchMedia('(prefers-reduced-motion: reduce)');

  section.style.setProperty('--gs-ms', `${G.stateDuration}ms`);
  document.documentElement.style.setProperty('--theme-ms', `${G.litDuration}ms`);
  section.style.setProperty('--gs-behind-scale', G.behindScale);
  section.style.setProperty('--gs-behind-dark', G.behindDarkness);
  section.style.setProperty('--marquee-s', `${G.marqueeDuration}s`);   // GamesTitle loop

  const ease = {
    inOutCubic: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
    inOutSine: (k) => -(Math.cos(Math.PI * k) - 1) / 2,
    outCubic: (k) => 1 - Math.pow(1 - k, 3),
    linear: (k) => k,
  };
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  /* ---------- page colour theme, animated on ONE clock ----------
     The page background (--page-bg on About, Games, the stage and body) is set frame by frame
     from one clock, so all blocks change colour together and no seam shows between them. */
  const DARK = [14, 15, 14], LIME = [227, 241, 74];
  const easeCss = (k) => {                       // CSS 'ease' = cubic-bezier(0.25, 0.1, 0.25, 1)
    let lo = 0, hi = 1, t = k;
    for (let i = 0; i < 18; i++) {
      t = (lo + hi) / 2;
      const x = 3 * (1 - t) * (1 - t) * t * 0.25 + 3 * (1 - t) * t * t * 0.25 + t * t * t;
      if (x < k) lo = t; else hi = t;
    }
    return 3 * (1 - t) * (1 - t) * t * 0.1 + 3 * (1 - t) * t * t + t * t * t;
  };
  let litV = 0, litFrom = 0, litTo = 0, litStart = 0, litRaf = 0;
  function applyLit(v) {
    const c = DARK.map((d, i) => Math.round(d + (LIME[i] - d) * v));
    document.documentElement.style.setProperty('--page-bg', `rgb(${c[0]}, ${c[1]}, ${c[2]})`);
    chromeThemes();
    if (window.DMBChrome) window.DMBChrome.update();      // TopBar / Navigation follow the colour as it changes
  }
  function litStep(now) {
    const k = rm.matches ? 1 : Math.min(1, (now - litStart) / G.litDuration);
    litV = litFrom + (litTo - litFrom) * easeCss(k);
    applyLit(litV);
    litRaf = k < 1 ? requestAnimationFrame(litStep) : 0;
  }
  function setLit(on) {
    const to = on ? 1 : 0;
    if (to === litTo) return;
    litFrom = litV; litTo = to; litStart = performance.now();
    if (!litRaf) litRaf = requestAnimationFrame(litStep);
  }

  let top = 0, vh = 1, vw = 1, w0 = 302, h0 = 302;   // window half-size at the start (Figma circle Ø604)
  let brightChrome = false, brightTop = false, brightNav = false;
  let lastR = 0, navPt = null, topPt = null;
  const navEl = document.querySelector('.navigation'), topEl = document.querySelector('.topbar__logo');
  /* The fixed TopBar / Navigation use their dark-on-lime look while the page under THEM is lime:
     the page colour is more than half way to lime, and the growing circle (dark picture) has not
     reached the element yet. Each one is checked at its own position, so the switch happens the
     moment the picture slides under it. */
  function chromeThemes() {
    const limeNow = litV > 0.5;
    // the circle's edge has not yet passed the middle of the element
    // (the circle is centred on the stage, which may still be sliding into view)
    const cy = stage.getBoundingClientRect().top + vh / 2;
    const outside = (pt) => pt && Math.hypot(pt.x - vw / 2, pt.y - cy) > lastR;
    brightTop = limeNow && outside(topPt);
    brightNav = limeNow && outside(navPt);
    brightChrome = brightTop;
  }
  function measureChrome() {
    const pt = (el) => { const r = el.getBoundingClientRect(); return { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2, r: Math.hypot(r.width, r.height) / 2 }; };
    navPt = pt(navEl); topPt = pt(topEl);
  }
  applyLit(0);
  let state = -1;
  let lastE = -1;
  let lastY = window.scrollY;

  function layout() {
    vh = window.innerHeight;
    const u = Math.min(window.innerWidth / 1920, vh / 1080);
    // + one extra screen at the end: TheBookwalkerSection stays pinned while DiscordSection
    // (pulled up by one screen in CSS) slides up over it
    section.style.height = `${vh * (2 + G.revealLength + 3 * G.stateLength)}px`;
    top = section.getBoundingClientRect().top + window.scrollY;
    w0 = 302 * u; h0 = 302 * u;   // GamesNewImage: circle Ø604
    vw = stage.clientWidth || window.innerWidth;
    measureChrome();
    lastE = -1; state = -1;
    update(window.scrollY);
  }

  /* document y for a given game state (1…3): the middle of its scroll range */
  function scrollYFor(k) {
    return top + vh * (G.revealLength + (k - 1) * G.stateLength + Math.min(0.35, G.stateLength * 0.35)) + 2;
  }

  function setState(k) {
    if (k === state) return;
    state = k;
    section.dataset.state = k;
    section.classList.toggle('is-revealed', k >= 1);
    blocks.forEach((el, i) => {
      const n = i + 1;
      el.classList.toggle('is-current', n === k);
      el.classList.toggle('is-behind', n < k);
    });
    layers.forEach((el, i) => {
      const n = i + 1;
      el.toggleAttribute('inert', n !== k);
      el.setAttribute('aria-hidden', n === k ? 'false' : 'true');
    });
    segs.forEach((s, i) => s.classList.toggle('is-filled', i < k));
    progress.setAttribute('aria-valuenow', Math.max(1, k));
    if (window.DMBBuyMenu) window.DMBBuyMenu.closeAll();
  }

  function update(y) {
    const p = (y - top) / vh;                       // screens scrolled inside the section
    const k = Math.min(1, Math.max(0, p / G.revealLength));
    const e = rm.matches ? (k >= 0.5 ? 1 : 0) : (ease[G.revealEasing] || ease.inOutCubic)(k);
    if (Math.abs(e - lastE) > 0.0005) {
      lastE = e;
      // GamesNewImage: a round window onto TheFinalStationSection's background, centred, growing from
      // Ø604 (Figma) to the whole screen — the picture itself stays put, so the window
      // simply opens up into the section
      // a circle (Ø604 in Figma) growing until it reaches the far corners of the screen
      const rMax = Math.hypot(vw / 2, vh / 2) + 2;
      lastR = w0 + (rMax - w0) * e;
      videoBox.style.setProperty('--reveal-r', `${lastR.toFixed(2)}px`);
      shadow.style.opacity = (smooth(0.6, 1, e) * G.shadowOpacity).toFixed(3);
    }
    const s = p < G.revealLength ? 0 : Math.min(3, 1 + Math.floor((p - G.revealLength) / G.stateLength));
    setState(s);
    // TheFinalStationSection's content comes in a little before the circle has fully opened
    section.classList.toggle('show-gs1', s === 1 || (s === 0 && k >= G.gs1ContentAt));
    // page colour theme (moyra.co-style): from arriving at GamesSection to the end of the
    // showcase, the page background — About above included — is lime
    // …through the extra screen where DiscordSection slides over the showcase, so the lime
    // background stays behind the scaled-back blocks the whole time
    const end = G.revealLength + 3 * G.stateLength + 1.05;
    const lit = p > G.litAt && p < end;
    section.classList.toggle('is-lit', lit);
    document.documentElement.classList.toggle('theme-lime', lit);   // text colours (CSS transitions)
    setLit(lit);                                                     // background (one clock)
    // the fixed TopBar / Navigation use their dark-on-lime theme over the lime page,
    // until the window has grown over them
    // once the circle has opened fully (showcase) there is no lime under the chrome any more
    if (s >= 1) lastR = Infinity;
    chromeThemes();

    // DiscordSection slides over the pinned TheBookwalkerSection: 0 → 1 over the last screen.
    // The block underneath moves back like the game blocks do (scale, darken, rounded corners).
    const cover = Math.min(1, Math.max(0, p - (G.revealLength + 3 * G.stateLength)));
    const covering = cover > 0 && !rm.matches;
    section.classList.toggle('is-covering', covering);
    if (covering) {
      const sc = 1 - (1 - G.behindScale) * cover;
      section.style.setProperty('--cv-scale', sc.toFixed(4));
      section.style.setProperty('--cv-dark', (1 - (1 - G.behindDarkness) * cover).toFixed(4));
      section.style.setProperty('--cv-radius', `${(32 * cover / sc).toFixed(2)}px`);
    }

    // once the reader scrolls from TheBookwalkerSection into DiscordSection, the page settles by
    // itself with DiscordSection at the top (scrolling back up returns to TheBookwalkerSection);
    // SmoothScroll locks the wheel until the gesture is over, so it stays there until the next scroll
    const dir = y - lastY;
    lastY = y;
    const S = window.SmoothScroll;
    if (S && S.enabled && !S.tweening && cover > 0.002 && cover < 0.998 && dir !== 0) {
      const z0 = top + vh * (G.revealLength + 3 * G.stateLength), z1 = z0 + vh;
      S.scrollTo(dir > 0 ? z1 : z0, { lock: true, duration: window.DMB_CONFIG.smooth.snapDuration });
    }
  }

  window.DMBGames = {
    layout,
    update,
    scrollYFor,
    get brightChrome() { return brightChrome; },
    get brightTop() { return brightTop; },
    get brightNav() { return brightNav; },
    get state() { return state; },
    get top() { return top; },
  };
})();
