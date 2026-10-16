# DO MY BEST — desktop website (`new/`)

This is the full desktop site, built from the Figma file `78XlrFPw66iWdkqGPpQ2ua`, frame HomePageDesktop `75:1130`. It also uses three reference frames: the Navigation overlay `75:1539`, the BuyNowDropdown `74:539` and FAQRowOpen `74:541`.

It is plain HTML, CSS and JS with no framework and no dependencies. The earlier prototypes (`burn*/`, `flow/`, `alt-glitch/`, root) are untouched.

## Run

```
cd E:\gamestudio\do-my-best
python -m http.server 8000
```

Open http://localhost:8000/new/. Use the local server rather than double-clicking the file: YouTube refuses embeds on `file://` pages.

## Where to tune things

| What | Where |
|---|---|
| Every timing, easing, scroll length, threshold, link and FAQ text | `js/config.js` |
| Fluid layout scale and text minimums | `css/styles.css` → `:root` |

**Fluid layout:**
- `--u` is one Figma pixel at the current window size: `min(100vw/1920, 100svh/1080)`. Every Figma measurement is written as `N × var(--u)`.
- Each section anchors its content to the real viewport edges or centre. The whole page is never scaled as one picture.
- Small UI text never drops below 12 px (`--fs-16`) or 10 px (`--fs-13`).

## Files

| File | Purpose |
|---|---|
| `index.html` | All sections, using the Figma layer names (`data-name`), plus the inline icon sprite |
| `css/styles.css` | Layout, states and transitions |
| `js/config.js` | Central settings |
| `js/lib/liquid-flow.js`, `js/lib/raster.js` | The burn4 shader and DOM rasteriser, unchanged copies |
| `js/lib/youtube-video.js` | YouTube background players (each created once and never re-mounted), with a seamless loop and pause/resume off screen |
| `js/smooth-scroll.js` | Wheel smoothing over native scrolling |
| `js/hero.js` | FirstScreen1 → FirstScreen2, using the burn4 two-step circle burn |
| `js/chrome.js` | Theme and visibility of the fixed TopBar and Navigation |
| `js/about.js` | Splits AboutText into measured lines and drives the stage-synced ReadingProgressBar |
| `js/games.js` | Circular reveal, GameSection1 → 2 → 3 and the SmallProgressBar |
| `js/game-modals.js` | BuyNow modal (store links per game) and WatchTrailer modal (YouTube, scales with the window) |
| `games/…/index.html` | Placeholder pages: `/games/` and one page per game (Learn more) |
| `js/nav-overlay.js` | "Our games" overlay |
| `js/faq.js` | FAQ accordion |
| `js/cursor-trail.js` | Cursor trail |
| `js/main.js` | Boot, wheel and keyboard routing, links |

The `assets/` folder holds the Figma exports: logos, icon masks, covers, the character, badges, the shadow and the hero image.

## Behaviour

**First screen**
- The first scroll opens a liquid circle and the second spreads it to full screen (burn4). FirstScreen2's headline slides in at 85 %, and the TopBar and Navigation switch theme at the same moment.
- The page itself stays locked until FirstScreen2 is reached.
- A fresh upward scroll at the very top plays the steps backwards.

**About**
- The section is pinned, with one scroll stage per rendered line.
- At stage *k*, lines 1…*k* are #E3F14A and the bar shows *k*/lines. Both are computed from the same number, so they can't drift apart.
- The lines are re-measured on resize.

**Background videos** (`config.js` → `hero.video`, `games.videos`)
- FirstScreen2: `sSRzMIK6gE4` from 0:27, looping back to 0:27. The Figma image is its poster.
- TheFinalStationSection: `a6lkyU6LBAg`, revealed by the circle.
- TheOnlyTraitorSection: `kV6vAXe5190`.
- TheBookwalkerSection: `sSRzMIK6gE4`.
- Players that are off screen pause (they are hidden first, so YouTube's pause overlay never shows) and resume where they were.

**Games**
- GameSection1's video sits inside a circular `clip-path`. The circle grows with the scroll until it covers the screen, and then GameSection1 appears.
- Each game state is one whole block: background video, shadow and content. The next block slides up over the current one, and the current block, video included, shrinks, darkens and moves back.
- The SmallProgressBar has three segments with the Figma fill widths (140 / 296 / 600 of 600).

**Overlays**
- **Navigation:** blur and panel appear first, then Navigation becomes NavigationClose, then the Games covers rise in.
  - It closes with Escape, the close button or a click on the blurred page.
  - Scrolling is locked while it is open, focus is trapped inside it, and the scroll position and focus are restored on close.
  - A cover jumps to that game.
- **MainButton:** the store menu grows upwards out of the button. It closes with the ×, Escape or an outside click, and that outside click is swallowed so nothing behind it fires.

**Other sections**
- **DiscordButton:** on hover a lime fill sweeps from left to right, then reverses on leave. Nothing moves or resizes.
- **FAQ:** an accordion (one row open at a time) built from real buttons, with the exact supplied texts and "Discord" linked.
- **Over the footer:** the TopBar and Navigation fade out, because the footer has its own logo, links and socials in the same places.

**Global effects**
- **Smooth scrolling:** the wheel and the arrow / Page / Space keys move a target, and the page glides after it. It trails the input slightly and coasts on for a moment after you stop. Tune the feel with `smooth.lerp` (ms; higher is floatier) and `smooth.wheelMultiplier`.
- **Cursor trail:** a single canvas with a delayed lime ribbon and a soft glow that fades to transparent. It turns dark over the two yellow screens, ignores the pointer and only animates while it is moving. Tune it with `trail.width`, `trail.alpha`, `trail.glow` and `trail.points`.
- **Reduced motion:** smooth scrolling and the trail are off, the first screen crossfades, and transitions are instant.

## Limitations

- **YouTube:**
  - The embed hides controls, related videos, annotations and captions.
  - It is muted and never paused, and the iframe is shown only while it is actually playing; until then the Figma artwork is shown as a poster.
  - It is zoomed ×1.18 so edge overlays fall outside the frame.
  - YouTube can still show its own branding or a "watch on YouTube" overlay for a moment on some browsers and account states. That cannot be removed through the embed API.
  - For a guaranteed clean result, use a self-hosted MP4 in a `<video>` element.
- **Store links:** only the Steam developer URL was supplied, so it is used for STEAM and for LEARN MORE. The PS Store and Xbox buttons stay inert until `stores.playstation` and `stores.xbox` are filled in `config.js`.
- **Scrollbar:** the native scrollbar is hidden, as is usual for smooth-scroll sites. Wheel, keyboard and links scroll normally.
- **Scope:** desktop only. Touch is not specially handled.
