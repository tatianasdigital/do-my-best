# DO MY BEST — first screen, Liquid Flow "black hole" (F12 → F14)

This is a separate version. `burn/`, `burn1/`, `burn2/`, `flow/` and the earlier prototypes are unchanged.

## Run

```
cd E:\gamestudio\do-my-best
python -m http.server 8000
```

Open http://localhost:8000/burn3/. Use the local server: YouTube refuses embeds on `file://` pages. `burn3-preview.gif` shows the whole transition.

## What happens

- **Load:** the F12 titles slide out of their masks, as in the other versions.
- **Scroll ↓ (2.6 s):** a hole opens in the centre of the screen, and F12 twists into a funnel around it. The letters, menu, logo and background are pulled inwards along a spiral, stretch into liquid streaks and are swallowed. Near the edge of the hole the screen darkens, which gives the funnel depth. The hole grows until it covers the whole screen and reveals F14 with its video. At about 85 % revealed, the F14 titles slide out of their masks.
- **Scroll ↑ (≈ 1.9 s):** F12 spirals back out of the hole and re-forms. The last frame is pixel-identical to the original F12.

One gesture triggers one transition. With `prefers-reduced-motion`, or without WebGL, F12 crossfades into F14.

## Tuning: `config.js`

`hole` (timing):

| Parameter | Default | Effect |
|---|---|---|
| `duration` | 2600 ms | the whole swallow |
| `easing` | `'collapse'` | the pull builds up, the screen collapses, the corners go softly (`'inOutCubic'`, `'inOutQuart'` and `'inOutSine'` also work) |
| `center` | [0.5, 0.5] | where the hole opens, or `'cursor'` to open it under the mouse pointer |
| `reverseSpeed` | 1.4 | how much faster the backwards transition plays |

`burn` (the vortex itself, Liquid Flow v1.3):

| Parameter | Default | Effect |
|---|---|---|
| `vortex` | 1 | strength of the swirl: 0 = a plain burn, as in `burn/` |
| `vortexTwist` | 2.6 | radians of rotation right at the edge of the hole |
| `vortexSpin` | 1.4 | extra radians per second, so the funnel keeps turning |
| `vortexPull` | 110 | px the content is dragged inwards at the edge |
| `vortexWidth` | 240 | px reach of the swirl beyond the hole (it also grows with the hole) |
| `funnelShade` | 0.4 | darkening towards the edge of the hole |
| `spread`, `swapAt`, `displacement`, `smear`, … | | the liquid edge itself, as in `burn/` |

Console helpers:

```js
DMB4.config.burn.vortexTwist = 4     // stronger twist
DMB4.config.hole.center = 'cursor'
DMB4.next(); DMB4.prev()
DMB4.freeze(0.4); DMB4.unfreeze()    // freeze at burn progress 0.4
```

## Files

| File | Purpose |
|---|---|
| `index.html`, `styles.css` | F14 underneath (video, titles, chrome), F12 on top, the WebGL canvas. Same layout as `burn2/`. |
| `config.js` | Timings and the vortex parameters. |
| `main.js` | The black-hole transition, F14 title timing, input handling, reduced motion. |
| `liquid-flow.js` | Liquid Flow **v1.3**: adds the vortex parameters, which work with `sweep: 'radial'` and `'spiral'`. With `vortex: 0` the output is the same as v1.2. |
| `raster.js`, `video.js` | The F12 snapshot for the shader, and the YouTube background video. |
