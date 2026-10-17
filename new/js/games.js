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
  const mobileMq = window.matchMedia('(max-width: 767px)');
  const aboutEl = document.querySelector('.about');
  const pin = section.querySelector('.games-pin');
  const RL = () => (mobileMq.matches && G.mobileRevealLength ? G.mobileRevealLength : G.revealLength);   // reveal length in screens

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
  // touch screens scroll natively (finger + momentum): no automatic settling there
  const touchUI = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

  let probe = null;
  function lvhProbe() {
    if (!probe) {
      probe = document.createElement('div');
      probe.setAttribute('aria-hidden', 'true');
      probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:100vh;height:100lvh;visibility:hidden;pointer-events:none';
      document.body.appendChild(probe);
    }
    return probe;
  }

  function layout() {
    vh = window.innerHeight;
    // phones: the stage is 100lvh (stable while the address bar shows / hides) — measure that
    if (mobileMq.matches) vh = lvhProbe().offsetHeight || vh;
    const u = Math.min(window.innerWidth / 1920, vh / 1080);
    // + one extra screen at the end: TheBookwalkerSection stays pinned while DiscordSection
    // (pulled up by one screen in CSS) slides up over it
    if (mobileMq.matches) {
      // phones: only the intro + the first card are pinned (one screen + the reveal); the cards follow in the page
      section.style.height = '';
      if (pin) pin.style.height = `${vh * (1 + RL())}px`;
    } else {
      if (pin) pin.style.height = '';
      section.style.height = `${vh * (2 + RL() + 3 * G.stateLength)}px`;
    }
    top = section.getBoundingClientRect().top + window.scrollY;
    w0 = 302 * u; h0 = 302 * u;   // GamesNewImage: circle Ø604
    // phones (mobile layout): Games artwork starts as a 200 × 200 circle on a 390-px-wide screen (scales with the width)
    if (mobileMq.matches) { w0 = h0 = (stage.clientWidth || window.innerWidth) * 100 / 390; }
    vw = stage.clientWidth || window.innerWidth;
    measureChrome();
    lastE = -1; state = -1;
    update(window.scrollY);
  }

  /* document y for a given game state (1…3): the middle of its scroll range */
  function scrollYFor(k) {
    if (mobileMq.matches) {
      // phones: card 1 right after the reveal; cards 2 / 3 with their top 96 below the top of the screen
      if (k <= 1) return top + vh * RL() + 2;
      return top + blocks[k - 1].offsetTop - 96 * vw / 390;
    }
    return top + vh * (RL() + (k - 1) * G.stateLength + Math.min(0.35, G.stateLength * 0.35)) + 2;
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
      const off = mobileMq.matches ? (n === 1 && k < 1) : n !== k;   // phones: the cards in the page are always usable
      el.toggleAttribute('inert', off);
      el.setAttribute('aria-hidden', off ? 'true' : 'false');
    });
    segs.forEach((s, i) => s.classList.toggle('is-filled', i < k));
    if (aboutEl) aboutEl.classList.toggle('is-under', k >= 1);   // phones: About (riding along) is hidden under the opened circle
    progress.setAttribute('aria-valuenow', Math.max(1, k));
    if (window.DMBBuyMenu) window.DMBBuyMenu.closeAll();
  }

  function update(y) {
    const p = (y - top) / vh;                       // screens scrolled inside the section
    const k = Math.min(1, Math.max(0, p / RL()));
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
      videoBox.style.setProperty('--shade', smooth(0.6, 1, e).toFixed(3));   // phones: the Artwork shade comes in as the circle opens
    }
    const mobile = mobileMq.matches;
    if (mobile) {
      // phones: Games artwork stretches into the first card —
      // 96 from the top, 20 from the sides and from the visible bottom, corners 20
      // (Games artwork 146:2041 starts as a 140 × 250 rounded rectangle, corners 20, in the middle)
      const mu = vw / 390, sw = 140 * mu, sh = 250 * mu, vis = window.innerHeight;
      const lerp = (a, b) => a + (b - a) * e;
      const t = lerp((vh - sh) / 2, 96 * mu), sx = lerp((vw - sw) / 2, 20 * mu);
      const b = lerp((vh - sh) / 2, 20 * mu + Math.max(0, vh - vis)), rad = 20 * mu;
      videoBox.style.clipPath = `inset(${t.toFixed(1)}px ${sx.toFixed(1)}px ${b.toFixed(1)}px ${sx.toFixed(1)}px round ${rad.toFixed(1)}px)`;
      intro.style.opacity = (1 - smooth(0.55, 0.9, e)).toFixed(3);   // GAMES / label give way to the card
    } else if (videoBox.style.clipPath) { videoBox.style.clipPath = ''; intro.style.opacity = ''; }
    // phones: after the reveal nothing changes with the scroll any more (state stays 1)
    const s = p < RL() ? 0 : (mobile ? 1 : Math.min(3, 1 + Math.floor((p - RL()) / G.stateLength)));
    setState(s);
    if (mobile && (s === 1 || k >= G.gs1ContentAt)) cardIn(blocks[0]);
    else if (mobile) blocks[0].classList.remove('is-in');   // back before the reveal: it comes in (and glides) again next time
    // TheFinalStationSection's content comes in a little before the circle has fully opened
    section.classList.toggle('show-gs1', s === 1 || (s === 0 && k >= G.gs1ContentAt));
    // page colour theme (moyra.co-style): from arriving at GamesSection to the end of the
    // showcase, the page background — About above included — is lime
    // …through the extra screen where DiscordSection slides over the showcase, so the lime
    // background stays behind the scaled-back blocks the whole time
    const end = RL() + 3 * G.stateLength + 1.05;
    // phones (HomePageMobile): the page stays dark — no lime theme
    const lit = !mobileMq.matches && p > G.litAt && p < end;
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
    const cover = Math.min(1, Math.max(0, p - (RL() + 3 * G.stateLength)));
    const covering = !mobile && cover > 0 && !rm.matches;   // phones: no hand-over effect
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
    // touch screens (phones): the same settling, with no pause — the moment the finger lets go (or the
    // swipe's momentum carries the page into the hand-over), DiscordSection glides to the top of the
    // screen; scrolling back up returns to the game
    if (touchUI && !mobile && dir !== 0 && !touchSnapping) {
      touchDir = dir > 0 ? 1 : -1;
      if (!fingerDown) touchSnap();
    }
    if (S && S.enabled && !touchUI && !mobile && !S.tweening && cover > 0.002 && cover < 0.998 && dir !== 0) {
      const z0 = top + vh * (RL() + 3 * G.stateLength), z1 = z0 + vh;
      S.scrollTo(dir > 0 ? z1 : z0, { lock: true, duration: window.DMB_CONFIG.smooth.snapDuration });
    }
  }

  /* ---------- touch: DiscordSection settles at the top after a swipe ---------- */
  let fingerDown = false, touchDir = 1, touchSnapping = false, touchY0 = 0;
  const html = document.documentElement;
  function unlockAfterSnap() {
    touchSnapping = false;
    const busy = (window.DMBHero && window.DMBHero.locksPage) || (window.DMBGameModals && window.DMBGameModals.isOpen) || (window.DMBMobileMenu && window.DMBMobileMenu.isOpen);
    if (!busy) html.classList.remove('is-locked');
  }
  function touchSnap() {
    const S = window.SmoothScroll;
    if (fingerDown || touchSnapping || !S || mobileMq.matches) return;
    const z0 = top + vh * (RL() + 3 * G.stateLength), z1 = z0 + vh;
    const cover = (window.scrollY - z0) / vh;
    if (cover <= 0.002 || cover >= 0.998) return;
    touchSnapping = true;
    html.classList.add('is-locked');          // stops the swipe's momentum, so it can't fight the glide
    const to = touchDir > 0 ? z1 : z0;
    const ms = Math.max(280, (TOUCH_SNAP_MS * Math.abs(to - window.scrollY)) / vh);
    S.scrollTo(to, { duration: ms, done: unlockAfterSnap });
  }
  const TOUCH_SNAP_MS = 700;                  // a whole screen; shorter distances take proportionally less
  if (touchUI) {
    window.addEventListener('touchstart', (e) => {
      fingerDown = true;
      touchY0 = e.touches[0] ? e.touches[0].clientY : 0;
      // a new touch takes over from a settling scroll (no fighting the finger)
      if (touchSnapping && window.SmoothScroll) { window.SmoothScroll.stop(); unlockAfterSnap(); }
    }, { passive: true });
    let touchYLast = 0;
    window.addEventListener('touchmove', (e) => { if (e.touches[0]) touchYLast = e.touches[0].clientY; }, { passive: true });
    const up = () => {
      fingerDown = false;
      if (touchYLast && Math.abs(touchYLast - touchY0) > 4) touchDir = touchYLast < touchY0 ? 1 : -1;   // finger moved up = page down
      touchYLast = 0;
      touchSnap();
    };
    window.addEventListener('touchend', up, { passive: true });
    window.addEventListener('touchcancel', up, { passive: true });
  }

  /* ---------- phones: the cards come in as they scroll into view; their genre tags glide once ----------
     The tags line is wider than the card: once a card comes into view, after a moment the line glides
     slowly to its end, rests, and glides back to the start (once — no endless loop). */
  const TAG_SPEED = 18;                         // px per second
  function glideTags(block) {
    if (!mobileMq.matches || rm.matches) return;
    const ul = [...block.querySelectorAll('.game-tags')].find((el) => el.offsetParent !== null);
    if (!ul) return;
    const lis = [...ul.children];
    lis.forEach((li) => li.getAnimations().forEach((a) => a.cancel()));
    const over = ul.scrollWidth - ul.clientWidth;
    if (over < 2) return;
    const travel = (over / TAG_SPEED) * 1000, rest = 1400;
    const total = 700 + travel + rest + travel;
    const at = (ms) => ms / total;
    const frames = [
      { transform: 'translateX(0)', offset: 0 },
      { transform: 'translateX(0)', offset: at(700), easing: 'ease-in-out' },
      { transform: `translateX(${-over}px)`, offset: at(700 + travel) },
      { transform: `translateX(${-over}px)`, offset: at(700 + travel + rest), easing: 'ease-in-out' },
      { transform: 'translateX(0)', offset: 1 },
    ];
    lis.forEach((li) => li.animate(frames, { duration: total }));
  }
  function cardIn(block) {
    if (block.classList.contains('is-in')) return;
    block.classList.add('is-in');
    glideTags(block);
  }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (!mobileMq.matches) continue;
        if (en.isIntersecting) cardIn(en.target);
        else if (en.target !== blocks[0]) en.target.classList.remove('is-in');   // comes in again next time
      }
    }, { threshold: 0.12 });
    blocks.slice(1).forEach((b) => io.observe(b));
  } else blocks.forEach((b) => b.classList.add('is-in'));

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
