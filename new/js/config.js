/*
 * DO MY BEST — website configuration
 * ----------------------------------
 * ALL animation timings, easings, scroll lengths, thresholds and links live here.
 * Times in ms. Scroll lengths in viewport heights (1 = one screen of scrolling).
 * Distances for the shader are in Figma px (1920 × 1080 frame) and scale with the window.
 * Tune live from the console, e.g.  DMB.config.games.stateLength = 0.8; DMB.layout()
 */
window.DMB_CONFIG = {
  frame: { width: 1920, height: 1080 },

  links: {
    discord: 'https://discord.gg/4TpUCWARaW',
    x: 'https://x.com/domybest_games',
    steam: 'https://store.steampowered.com/developer/DO-MY-BEST',
    email: 'mailto:inbox@domybeststudio.com',
  },

  /* ---------- Games: BuyNow modal (stores), WatchTrailer modal (YouTube), Learn more page ---------- */
  gameInfo: {
    1: {
      name: 'The Final Station',
      title: 'THE FINAL STATIOn',
      cover: 'assets/buy-cover-final-station.jpg',
      page: 'games/the-final-station/',
      trailer: 'a6lkyU6LBAg',
      stores: {
        steam: 'https://store.steampowered.com/app/435530/The_Final_Station/',
        playstation: 'https://store.playstation.com/en-us/product/UP0097-CUSA06151_00-THEFINALSTATION0',
        xbox: 'https://www.xbox.com/en-US/games/store/the-final-station/bx8hv1b694pc',
      },
    },
    2: {
      name: 'The Final Station DLC: The Only Traitor',
      title: 'THE FINAL STATIOn DLC: The Only Traitor',
      cover: 'assets/buy-cover-only-traitor.jpg',
      page: 'games/the-final-station-dlc-the-only-traitor/',
      trailer: 'kV6vAXe5190',
      stores: {
        steam: 'https://store.steampowered.com/app/595290/The_Only_Traitor_DLC/',
        playstation: 'https://store.playstation.com/en-us/product/UP0097-CUSA06151_00-THEONLYTRAITOR00',
        xbox: 'https://www.xbox.com/en-US/games/store/the-only-traitor/bq8hx8k2fcvm',
      },
    },
    3: {
      name: 'The Bookwalker: Thief of Tales',
      title: 'The Bookwalker:<br>Thief of Tales',
      cover: 'assets/buy-cover-bookwalker.jpg',
      page: 'games/the-bookwalker-thief-of-tales/',
      trailer: 'dzINr5cWFfM',
      stores: {
        steam: 'https://store.steampowered.com/app/1432100/The_Bookwalker_Thief_of_Tales/',
        playstation: 'https://store.playstation.com/en-us/product/UP0097-PPSA10291_00-0094789907692300',
        xbox: 'https://www.xbox.com/en-CY/games/store/the-bookwalker-thief-of-tales/9NXGGWMFM446',
      },
    },
  },


  /* ---------- Smooth scrolling (wheel only; keyboard, scrollbar and links stay native) ---------- */
  smooth: {
    lerp: 210,            // ms time-constant of the glide: the page trails the wheel and keeps
                          // coasting a little after it stops (lower = snappier, higher = floatier)
    wheelMultiplier: 1.1, // wheel distance → scroll distance
    keyStep: 140,         // px per ↑ / ↓ key press (also glided); Page Up/Down and Space = 0.9 screen
    linkDuration: 1100,   // programmatic scrolls (links, "back to top")
    snapDuration: 900,    // ms — DiscordSection settles at the top by itself (and back to TheBookwalkerSection)
    snapIdleMs: 220,      // after a snap the wheel is ignored until it has been still this long
  },

  /* ---------- First screen: FirstScreen1 → FirstScreen2 (burn4 Liquid Flow circle burn) ---------- */
  hero: {
    intro: {                      // page load: headline slides out of its masks
      title1Delay: 300,
      title1Duration: 800,
      title2Delay: 220,           // after the START of Title1
      title2Duration: 800,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      maskMargin: 12,             // Figma px of room inside each mask
    },
    steps: {                      // one scroll: the burn starts at once and opens to full screen by itself
      revealDuration: 2600,       // ms — FirstScreen1 → FirstScreen2, whole burn
      revealEasing: 'inOutSine',  // gentle start (it begins straight away), smooth stop
      circleRadius: 0.1,          // fraction of the centre → corner distance
      openDuration: 750,
      openEasing: 'outCubic',
      growDuration: 2200,
      growEasing: 'inOutCubic',
      reverseSpeed: 1.4,
    },
    burn: {                       // Liquid Flow parameters (identical to burn4)
      sweep: 'radial',
      center: [0.5, 0.5],
      spread: 2.4,
      swapAt: 0.45,
      attack: 0.25,
      displacement: 120,
      noiseScale: 170,
      smear: 60,
      holeAmount: 1.4,
      vertical: 1.0,
    },
    titles: { revealAt: 0.85, hideDuration: 140 },   // FirstScreen2 titles slide in at 85 % revealed
    chromeAt: 0.85,               // TopBar / Navigation switch to the dark theme at 85 % revealed
    video: {                      // FirstScreen2 background (the Figma image stays as its poster until it plays)
      vimeoId: '1236507929',      // BookWalker CG trailer — muted, looping, fills the screen
      start: 27,                  // seconds — starts at 00:27, and the loop comes back to 00:27
      zoom: 1.0,                  // > 1 crops a little more off the edges
    },
    reducedMotionFade: 300,
  },

  /* ---------- Gesture handling (one gesture = one step on the first screen) ---------- */
  input: {
    wheelThreshold: 24,
    idleMs: 180,
    reaccelerationRatio: 1.6,
    maxExtraLockMs: 1400,
  },

  /* ---------- AboutSection: one scroll stage per rendered text line ---------- */
  about: {
    stageLength: 0.32,            // viewport heights of scrolling per line
    holdLength: 0.35,             // extra scrolling after the last line before the section moves on
    fillDuration: 1100,           // ms — a read line fills from left to right (ease-in-out)
  },

  /* ---------- GamesSection: circular reveal + GameSection1 → 2 → 3 ---------- */
  games: {
    marqueeDuration: 30,          // s — GamesTitle (GAMES GAMES GAMES) scrolls right → left, one loop
    litAt: -0.5,                  // the background turns #E3F14A (GamesTexts #0E0F0E) once the stage is this far in
                                  // (screens; -1 = its top just entered the viewport, 0 = it fills the viewport)
    litDuration: 800,             // ms colour change
    revealLength: 1.0,            // viewport heights of scrolling for the GamesNewImage window to fill the screen
    revealEasing: 'inOutCubic',
    stateLength: 1.0,             // viewport heights of scrolling per game state
    stateDuration: 1100,          // ms — block transition (GS1 → GS2 → GS3)
    behindScale: 0.9,             // the previous block (background included) shrinks to this…
    shadowOpacity: 0.5,           // GameBackground Shadow (dark gradient over each background) — 50 %
    behindDarkness: 0.35,         // …and darkens to this brightness as the next one slides over it
  },

  /* ---------- Navigation overlay (open order: blur + panel → NavigationClose → Games) ---------- */
  /* The BuyNow / WatchTrailer modals use the same blur and panel timings. */
  nav: {
    blurDuration: 380,
    panelDelay: 60,
    closeStateDelay: 200,
    gamesDelay: 360,
    closeDuration: 320,
  },

  /* ---------- DiscordButton / FooterButton hover: rounded fill sliding in left → right, ease-in-out ---------- */
  buttonHover: { duration: 700 },

  /* ---------- Cursor trail ---------- */
  trail: {
    color: [227, 241, 74],        // #E3F14A
    darkColor: [14, 15, 14],      // used over the yellow screens (lime would be invisible there)
    points: 16,                   // length of the trail (samples) — short
    follow: 0.3,                  // 0..1 — how quickly the trail head chases the pointer (lower = more delay)
    width: 14,                    // px at the head
    alpha: 0.95,                  // opacity at the head (fades to 0 at the tail)
    blur: 5,                      // px blur of the ribbon itself
    glow: 26,                     // px soft glow around the ribbon (0 = none)
    noise: 0,                     // 0..1 — amount of grain sprinkled along the trail (0 = none; was 0.6)
    noiseSize: 0.8,               // px — average grain size (was 1.6; specks are 0.4–1.2 px)
  },

  /* ---------- FAQ (texts exactly as supplied) ---------- */
  faq: [
    { q: 'I need help with a Do My Best game', a: 'Please visit our {Discord} server for help and support.' },
    { q: "I'd like to playtest your games", a: 'We occasionally organize playtests. Follow us on {Discord} for announcements and opportunities to participate.' },
    { q: "I'd like to join your team", a: "We don't have any open positions at the moment." },
    { q: 'I have a game idea for Do My Best', a: 'We focus exclusively on our own projects and are not accepting pitches for external games.' },
    { q: "Can I make Let's Play videos of your games?", a: "Yes! You're welcome to create Let's Play videos featuring our games. You don't need special permission from us to do so." },
  ],
};
