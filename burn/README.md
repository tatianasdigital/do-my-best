# DO MY BEST — first screen, Liquid Flow burn (F12 → F14)

This prototype is a separate version. `flow/` (columns → morph → Character) and the earlier prototypes are unchanged.

Figma file `78XlrFPw66iWdkqGPpQ2ua`, Page 3:
- **F12** (`30:515`) is the first screen: yellow background, dark "WORLD / BUILDERS.", dark menu and icons.
- **F14** (`30:573`) is the screen after scrolling: "WORLD / DESTROYERS." in #E3F14A over a **full-screen background video**, yellow menu and icons. The Character was removed on request.

## Run

```
cd E:\gamestudio\do-my-best
python -m http.server 8000
```

Then open http://localhost:8000/burn/. Use the local server, not a double-clicked file: YouTube refuses embeds on `file://` pages (Error 153). To run the transition, scroll down (or press ↓, Page Down or Space). To go back, scroll up (or press ↑ or Page Up). `burn-preview.gif` shows the whole thing.

## How it works

- **Layers.** F14 is built as a complete screen *underneath* F12, and F12 is a complete screen on top.
- **Load.** The F12 titles slide out of their masks: Title1 from the left edge of its line, Title2 from the right edge.
- **Scroll ↓ (1.4 s).** A snapshot of F12 is handed to **Liquid Flow** with the `burn` preset, and the real F12 is hidden. The shader burns the snapshot away radially from the centre of the screen: a small liquid hole opens, grows into a circle with a marbled, burnt edge, and reveals F14 until the whole screen is gone. Because the snapshot is pixel-identical to the screen, the handover is invisible.
- **F14 titles.** When about **85 %** of F14 has been burned through (≈ 1 s into the burn), the F14 titles enter exactly like the F12 titles on page load: Title1 slides out of an invisible mask from the left edge of its line, and Title2 from the right edge 220 ms later. The moment is calculated from the burn geometry (`titles.revealAt`); the slide uses the `intro` timings.
- **Scroll ↑ (≈ 1.1 s).** The F14 titles fade out quickly, then the burn plays backwards: F12 re-forms from the edges towards the centre.

One gesture triggers one transition. Input is locked while it runs, and trackpad inertia or a big flick can't trigger it twice.

## Background video (F14)

F14's flat black fill is replaced by a YouTube video: IGN's "The Bookwalker: Thief of Tales — Official Launch Trailer" (`dzINr5cWFfM`).
- **Playback:** it's muted, with no controls, and the pointer passes through it. It starts at **0:25** and loops back to 0:25.
- **Fill:** it **fills the whole window** like `background-size: cover`, zoomed ×1.2 so YouTube's title and logo overlays fall outside the window.
- **Timing:** it plays muted underneath F12 from page load and jumps back to 0:25 as the burn reveals F14. It is never paused, because pausing makes YouTube draw its pause icon. The player is only visible while it is actually playing, so YouTube's play, pause and loading overlays never show.
- **Shade:** a black layer at **15 % opacity** sits over the video (`video.shade`).
- **Fallback:** if YouTube is unreachable or refuses the embed, the black fill stays.

Settings are in `config.js` → `video`: `youtubeId`, `start`, `end` (loop point), `zoom`, `restartOnReveal`, `shade`.

Note: the trailer belongs to its publisher. Embedding it through YouTube's own player is fine for a prototype; for production, use your own footage (or a licensed MP4) as a `<video>` file.

## Tuning: `config.js` → `burn`

| Parameter | Default | Effect |
|---|---|---|
| `duration` | 1400 ms | full burn |
| `center` | [0.5, 0.5] | where the burn starts, as a fraction of the window |
| `spread` | 2.4 | ring width: higher gives a thinner liquid ring, lower a wider one |
| `swapAt` | 0.45 | how long F12 stays visible as liquid before it burns away |
| `displacement`, `noiseScale`, `smear`, `holeAmount` | 120, 170, 60, 1.4 | character of the liquid edge |
| `reverseSpeed` | 1.3 | speed of the backwards burn |
| `titles.revealAt` | 0.85 | share of the screen revealed when the F14 titles start sliding in |

Every other Liquid Flow parameter can be added here too. Distances are in Figma px and scale with the window.

Console helpers:

```js
DMB4.config.burn.duration = 1100
DMB4.config.burn.center = [0.5, 0.6]
DMB4.next(); DMB4.prev()
DMB4.freeze(0.4); DMB4.unfreeze()
```

## Files

| File | Purpose |
|---|---|
| `index.html` | F14 scene (underneath, with the background video), F12 scene (on top), the burn canvas. |
| `video.js` | The F14 background video (YouTube IFrame API): cover sizing, start/loop at 0:25, play/pause with the burn. |
| `styles.css` | Layout in Figma px on a 1920×1080 stage that scales to fit the window. |
| `config.js` | Timings and burn parameters. |
| `main.js` | Scaling, title entrance, the F12 ⇄ F14 burn, input handling, reduced motion. |
| `raster.js` | Draws a pixel-accurate snapshot of the F12 screen for the shader. |
| `liquid-flow.js` | Liquid Flow v1.1 (adds `sweep: 'radial'` and the `burn` preset). |

## Fidelity

- **Figma match:** F12 matches the Figma export at 1920×1080 apart from anti-aliased edges. F14 title positions match Figma within 1 px. The differences from Figma were all requested: the Character is removed, a video replaces the black fill, and the studio label is white.
- **Seamless handover:** the last frame of the burn and the final state are pixel-identical to F14. The first frame differs from the live F12 only by sub-pixel anti-aliasing.
- **Assets:** all assets are the original Figma exports: the logo, and the dark and yellow social icons.

## Notes

- **Reduced motion and no WebGL:** with `prefers-reduced-motion`, or without WebGL, F12 crossfades into F14 in 300 ms.
- **Changed from Figma on request:** the F14 studio label is **white** (black in Figma).
- **Kept from Figma as designed:** "( Scroll )" is white in F12.
- Desktop only.
