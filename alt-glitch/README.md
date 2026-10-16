# DO MY BEST — alternative first screen (glitch + column fill)

This is a second motion concept for the first screen, built to compare against the original prototype in the parent folder. That prototype is unchanged.

Figma file `78XlrFPw66iWdkqGPpQ2ua`, Page 3:
- **F7** (`17:195`) is the initial state: yellow background, "WORLD / BUILDERS."
- **F8** (`17:239`) is the destination: black background, "WORLD / DESTROYERS."

## Run

There's no build step and nothing to install. Start a static server from the **project root** (`do-my-best/`, not this folder), because the page loads the shared Figma assets from `../assets/`:

```
cd E:\gamestudio\do-my-best
python -m http.server 8000
```

Then open:
- http://localhost:8000/alt-glitch/ for this concept
- http://localhost:8000/ for the original prototype

To trigger the transition, scroll down with the wheel or trackpad, or press ↓, Page Down or Space. To go back, scroll up or press ↑ or Page Up.

## Sequence

| Step | What happens | Default timing |
|---|---|---|
| Load | Everything except the titles shows right away. Each title has an invisible mask exactly as wide as its own line. Title1 slides out from the start of its line (left edge). 200 ms after Title1 starts, Title2 slides out from the end of its line (right edge). Fast start, smooth stop, no overshoot. | 250 ms delay, 620 ms each |
| Scroll down: 1. Title2 glitch | Only Title2 glitches. It is cut into 7 strips, and each strip shows "BUILDERS." or "DESTROYERS.", shifted sideways, with a white offset ghost, and sometimes blanked for one frame. It settles into the F8 Title2 "DESTROYERS.", still **#0E0F0E** on yellow. | 480 ms |
| 2. Black fill | The background fills black in **8 vertical columns**. Each column drops from the top to the bottom, left to right, 60 ms apart. Inside the black, the titles appear in **#E3F14A**. Columns share edges, so there are no seams, and the final background is solid black. | 120 ms pause, then ≈ 980 ms |
| 3. Chrome | Navigation, Social links and Scroll hint transition to their F8 colours: yellow menu with a dark label and bars, white icons, white "( Scroll )". | 60 ms pause, then 260 ms |
| Scroll up | Steps 3 → 2 → 1 play in reverse: chrome colours go back, the columns retract upward, and Title2 glitches back to "BUILDERS." It all runs 1.4× faster. | ≈ 1.4 s |

One gesture triggers at most one transition. Input is locked until the whole sequence has finished, and trackpad inertia or a big flick can't trigger it again. The sequence can be repeated as many times as you like without reloading.

## Timing and tuning

**Every value is in `config.js`**, grouped by step:
- `intro` — the title entrance
- `titleGlitch` — duration, frame rhythm, strips, offsets, ghost, flicker, `seed`
- `fill` — column count, column duration, stagger, order (`left-to-right`, `right-to-left`, `center-out`, `edges-in`, `random`), easing
- `chrome` — delay and duration of the colour change
- `reverseSpeed`, `input`, `reducedMotion`

Console helpers (changes apply on the next scroll, no reload):

```js
DMB2.config.fill.order = 'center-out'
DMB2.config.fill.columns = 12
DMB2.next(); DMB2.prev()               // trigger without scrolling
DMB2.replayIntro()                     // replay the title entrance
f = DMB2.glitch.preview()              // generate glitch frames…
DMB2.glitch.showFrame(f[4])            // …freeze on one;  DMB2.glitch.stop() to exit
```

## Reduced motion

With `prefers-reduced-motion`, the titles fade in place. Each step of the transition (title swap → black → chrome) becomes a short 220 ms crossfade, in the same order.

## Files

| File | Purpose |
|---|---|
| `index.html` | Layers: the F7 scene, the F8 scene (revealed by the columns), the Title2 glitch layer, the chrome layer; plus the template for one glitch strip. |
| `styles.css` | Static layout in Figma pixels on a 1920×1080 stage that scales to fit the window; F7/F8 chrome colours and their transitions; reduced-motion crossfades. |
| `config.js` | All timings and parameters. |
| `main.js` | Layout, title entrance, sequence (glitch → fill → chrome and back), input handling, reduced motion. |
| `glitch.js` | Title2 glitch frames. |
| `fill.js` | Vertical-column black fill (animated `clip-path` staircase). |
| `assets/` | Copies of the Figma title vectors with only the fill changed. `f08-title2-dark.svg` is F8 Title2 in #0E0F0E. `f08-title1-yellow.svg` and `f08-title2-yellow.svg` are the titles in #E3F14A on black. `f07-title2-yellow.svg` and `f07-title2-period-yellow.svg` are left over from the previous version and no longer used, so they can be deleted. |

## Assets

- Shared assets come from `../assets/`. The F8 files (`f02-*`) and `logo.png` were checked against fresh Figma exports and are byte-identical. The F7 title vectors are the same paths Figma exports for F7.
- The white ghost uses `f01-title2-white.svg` / `f01-title2-period-white.svg` and `f02-title2.svg`.
- Fonts (Syne 400/600) load from Google Fonts.

## Notes and limitations

- **Title position:** the title block stays on the F7 lines (Title1 y 415.6, Title2 y 527.46) for the whole sequence. In Figma F8 it sits 23 px lower. Moving it inside the column fill would make the text visibly jump or double up where a column edge crosses it, so it isn't moved.
- **Title colours:** the F8 titles are #E3F14A as requested; Figma F8 still shows them in white.
- **Chrome during the fill:** while the columns pass, the chrome still has its F7 colours (dark menu and icons), so for a moment it is dark on black. It switches to the F8 colours right after the fill, as specified.
- **Empty or hidden Figma layers:** F7's "Title background" rectangles are invisible (same yellow as the background) and aren't rendered. F8's "logo 2" (`17:241`) is empty in Figma. F8's hidden layers (duplicate nav and social row, glass/crack textures) are left out.
- The Pinterest glitch reference couldn't be opened from the build environment, so the glitch follows the written brief.
- Desktop only, as scoped.
