# DO MY BEST — first screen, Liquid Flow **spiral** burn (F12 → F14) · `burn1`

This page is a full copy of `burn/` with a different Liquid Flow effect. `burn/` (the one-step radial burn) is unchanged.

## Run

```
cd E:\gamestudio\do-my-best
python -m http.server 8000
```

Then open **http://localhost:8000/burn1/**, using the local server rather than a double-clicked file (the YouTube video needs it). `burn1-preview.gif` shows the sequence.

## Sequence

| Step | What happens | Default timing |
|---|---|---|
| Load | The F12 titles slide out of their masks (same as `burn/`). | |
| **1st scroll ↓** | A **small liquid circle** opens in the centre of F12, with F14 and its video visible inside. It **stays there**, and its liquid edge keeps swirling until the next scroll. | 750 ms, ease-out |
| **2nd scroll ↓** | The circle **grows along two curled spiral arms** that rotate as they spread, until F12 is completely burned away. The motion **accelerates smoothly, then slows to a soft stop** (ease-in-out). At about 85 % revealed, the F14 titles slide out of their masks. | 2.2 s, ease-in-out |
| Scroll ↑ | Steps run backwards: the spiral winds back into the circle, then the circle closes and F12 returns. Both run 1.4× faster. | |

One gesture is one step. Input is locked while a step runs, and trackpad inertia or a big flick can't skip a step. With `prefers-reduced-motion`, or without WebGL, a single scroll crossfades F12 ↔ F14.

## Tuning: `config.js`

`spiral` sets the two-step timeline:

| Parameter | Default | Effect |
|---|---|---|
| `circleRadius` | 0.1 | size of the circle after the 1st scroll (fraction of the centre-to-corner distance) |
| `openDuration`, `openEasing` | 750, `outCubic` | 1st scroll |
| `growDuration`, `growEasing` | 2200, `inOutCubic` | 2nd scroll. `inOutQuint` gives a more dramatic acceleration and stop; `inOutSine` is softer |
| `reverseSpeed` | 1.4 | speed when scrolling back up |

`burn` sets the shape of the spiral (Liquid Flow v1.2, `sweep: 'spiral'`):

| Parameter | Default | Effect |
|---|---|---|
| `spiralArms` | 2 | number of arms (2 = classic galaxy spiral, 1 = a single arm, 3 = triple swirl) |
| `spiralTwist` | 1.8 | how much the arms curl from the centre to the corner (turns) |
| `spiralDepth` | 0.55 | how far the arms reach ahead of the gaps (higher = more pronounced spiral) |
| `spiralSpin` | 0.9 | how far the spiral rotates while it grows (turns) |
| `spiralCore` | 0.15 | inside this radius the hole is a clean circle; keep it ≥ `circleRadius` |
| `spread`, `swapAt`, `displacement`, `noiseScale`, `smear`, `holeAmount` | as in `burn/` | the liquid edge |

Console helpers:

```js
DMB4.config.burn.spiralArms = 3
DMB4.config.spiral.growEasing = 'inOutQuint'
DMB4.next(); DMB4.prev()
DMB4.freeze(0.5); DMB4.unfreeze()
```

## Everything else

The video, the 15 % shade, the white studio label, the F14 title entrance and the fidelity notes are identical to `burn/`; see its README.

## Files

These are the same files as `burn/`. The differences:
- **`main.js`** adds the three states (F12 → circle → F14) and a render loop that keeps the circle's edge alive while it holds.
- **`config.js`** adds the `spiral` section and the spiral shape parameters.
- **`liquid-flow.js`** is v1.2, which adds `sweep: 'spiral'`. The text, image and radial looks are unchanged.
