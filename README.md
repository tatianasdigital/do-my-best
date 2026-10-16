# DO MY BEST — first-screen animation prototype

Desktop-only prototype of the first screen and its scroll-driven sequence (Figma frames 01–04, file `78XlrFPw66iWdkqGPpQ2ua`, page "Page 2").

## Run

No build step and no dependencies. From this folder:

```
python3 -m http.server 8000
```

then open http://localhost:8000. (Any static server works; opening `index.html` directly also works.)

Scroll with the mouse wheel / trackpad, or use ↓ / ↑, Page Down / Page Up, Space / Shift+Space.
Console helpers for tuning: `DMB.goTo(3)`, `DMB.snapTo(5)`, `DMB.stage`, `DMB.config`.

## Files

| File | What it holds |
|---|---|
| `index.html` | Layer markup. Every layer from the brief is its own element (`data-layer` = Figma name). |
| `styles.css` | Static layout in Figma pixels on a 1920×1080 `.stage` that is scaled to fit the viewport; smoke keyframes. |
| `config.js` | **All timings, delays, easings, offsets and input thresholds.** |
| `main.js` | Stage machine, per-layer states, input handling, scaling, reduced motion. |
| `shatter.js` | Stage 6 glass shatter: builds the shards and runs their 3D fall / reassembly (Web Animations API). Tuned via `config.shatter`. |
| `assets/` | Assets exported from Figma (see below). |

## How the sequence works

The experience is a list of discrete stages. One scroll gesture moves exactly one stage forward or back; the page itself never scrolls.

| Stage | What happens |
|---|---|
| intro | Title1 pops in, then Title2 (only automatic animation) |
| 1 | First the black background fills top → bottom (the wipe turns the titles and chrome into their Frame 02 colours as it passes). Then Title2 "BUILDERS." slides down out of its slot and "DESTROYERS." slides in from above. Scrolling back reverses in mirrored order. |
| 2 | GlassEffect1 appears |
| 3 | GlassEffect2 appears |
| 4 | GlassEffect4 appears |
| 5 | GlassEffect3 appears (all four visible) |
| 6 | The glass shatters: ~100 radial shards break away from the impact point (centre first), pop slightly toward the viewer and fall out of the viewport tumbling in 3D; the title fades out. Scrolling back reassembles the glass. |
| 7 | Headline → StudioLabels → Character → Smoke; smoke then drifts upward continuously |

`stateFor(layer, stage)` in `main.js` describes how each layer looks at each stage; moving between stages applies the new state with CSS transitions using the timing for that boundary from `config.js`. Scrolling up applies the previous stage's state (faster, no delays — `config.reverse`).

Gesture handling: a gesture can trigger only one step; it re-arms after the transition finishes **and** either a new swipe begins (deltas rise again — inertia only decays), the wheel pauses (`idleMs`), or the user keeps scrolling longer than `maxExtraLockMs`. This stops trackpad inertia and fast spins from skipping stages.

## Reduced motion

With `prefers-reduced-motion`, movement becomes short fades: the black reveal and title swap crossfade, the glass fades out instead of shattering, and the smoke stays still.

## Assets

- Titles (`f01-title1/2.svg`, `f01-title2-period.svg`, `f02-title1/2.svg`), social icons, logo, Character and Smoke are the original Figma assets.
- `assets/figma-export/glass-effect-*.png` are Figma's renders of the GlassEffect1–4 frames. Figma exports them opaque on `#0e0f0e`, which would hide the title. `assets/glass-effect-*.png` are the same pixels made transparent (lighten-equivalent alpha), with the two opaque shard polygons from Figma (Vector 17 / Vector 18) kept solid so the displaced lettering covers the title exactly as in Frame 03.
- `f01-title2-white.svg` / `f01-title2-period-white.svg` are the Frame 01 Title2 vectors recoloured white, so "BUILDERS." stays visible on black while it slides out (Figma only has it in black).
- The Frame 01 period after "BUILDERS." is a separate vector in Figma (outside the Title2 frame); it is grouped with Title2 so it leaves with it.
- `glass-composite.png` is the four glass layers combined in Figma stacking order; the shards are cut from it.
- Fonts (Syne 400/600/800, Manrope 500) load from Google Fonts.
