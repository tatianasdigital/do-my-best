# DO MY BEST — first screen, Liquid Flow two-step **circle** burn (F12 → F14) · `burn4`

This is a copy of `burn1/` without the spiral: the hole is a plain circle that spreads out evenly to all sides. Everything else matches `burn1/`: the two scrolls, the timings, the video, the titles and the input handling. `burn1/` and the other versions are unchanged.

## Run

```
cd E:\gamestudio\do-my-best
python -m http.server 8000
```

Open http://localhost:8000/burn4/. `burn4-preview.gif` shows the whole sequence.

## Sequence

| Step | What happens | Timing |
|---|---|---|
| Load | The F12 titles slide out of their masks. | as in burn1 |
| **1st scroll ↓** | A small liquid circle opens in the centre and holds there. Its edge keeps swirling, and F14 with its video shows through it. | 0.75 s, ease-out |
| **2nd scroll ↓** | The circle **spreads out evenly to all sides** until F12 is completely burned away. It accelerates smoothly and slows to a soft stop just as it reaches the corners. At about 85 % revealed, the F14 titles slide out of their masks. | 2.2 s, ease-in-out |
| Scroll ↑ | The same steps run backwards, 1.4× faster: the burn shrinks back into the small circle, then the circle closes. | |

## Tuning: `config.js`

`steps` sets the two-step timeline:

| Parameter | Default | Effect |
|---|---|---|
| `circleRadius` | 0.1 | radius of the circle after the 1st scroll, as a fraction of the centre-to-corner distance |
| `openDuration`, `openEasing` | 750, `'outCubic'` | the 1st scroll |
| `growDuration`, `growEasing` | 2200, `'inOutCubic'` | the 2nd scroll (`'inOutQuint'` is more dramatic, `'inOutSine'` softer) |
| `reverseSpeed` | 1.4 | how much faster the steps run when scrolling back up |

`burn` sets the liquid edge, as in `burn/`:

| Parameter | Default | Effect |
|---|---|---|
| `sweep` | `'radial'` | the burn spreads as a circle (burn1 uses `'spiral'`) |
| `center` | [0.5, 0.5] | where the circle starts, as a fraction of the window |
| `spread`, `swapAt`, `displacement`, `noiseScale`, `smear`, `holeAmount` | | the character of the liquid edge |

Console helpers:

```js
DMB4.config.steps.growDuration = 1800
DMB4.next(); DMB4.prev()
DMB4.freeze(0.3); DMB4.unfreeze()
```

## Notes

- **Edits from burn1:**
  - `main.js` handles `sweep: 'radial'`, and the 2nd step eases out exactly where the far corners disappear, so no time is wasted after the screen is fully revealed.
  - `config.js` renames the `spiral` section to `steps` and drops the spiral shape parameters.
- **Fallback:** with `prefers-reduced-motion`, or without WebGL, F12 crossfades into F14.
- **Video:** YouTube needs the local server; it won't play from `file://`.
