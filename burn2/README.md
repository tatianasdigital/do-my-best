# DO MY BEST — first screen, Liquid Flow **lens + smooth reveal** (F12 → F14) · `burn2`

This page is a copy of `burn1` with a different way of revealing F14. The shader is the same Liquid Flow. `burn/` and `burn1/` are unchanged.

## Run

```
cd E:\gamestudio\do-my-best
python -m http.server 8000
```

Then open **http://localhost:8000/burn2/**, using the local server (the YouTube video needs it). `burn2-preview.gif` shows the sequence.

## Sequence

| Step | What happens | Default timing |
|---|---|---|
| Load | The F12 titles slide out of their masks. | |
| **1st scroll ↓** | A **liquid lens** opens right under the cursor, with F14 and its video inside. It **follows the mouse softly, with inertia**, while its edge keeps swirling and the lens slowly "breathes". | 650 ms to open |
| **2nd scroll ↓** | The lens **opens up smoothly to full screen** from where the cursor is. It accelerates gently and decelerates softly (ease-in-out), and the liquid edge livens up a little, then settles with the motion. At about 85 % revealed, the F14 titles slide in. | 2 s |
| Scroll ↑ | The reveal collapses back into the lens (which follows the cursor again), then the lens closes. Both run 1.4× faster. | |

On touch screens, where there's no cursor, the lens stays in the centre. With `prefers-reduced-motion`, or without WebGL, a single scroll crossfades F12 ↔ F14.

## Tuning: `config.js` → `lens`

| Parameter | Default | Effect |
|---|---|---|
| `radius` | 150 | lens radius in Figma px |
| `followLag` | 140 ms | how lazily the lens trails the cursor |
| `breathe` | 0.05 | ±5 % slow pulsing while it waits |
| `burstDuration`, `burstEasing` | 2000 ms, `inOutCubic` | the reveal; `inOutSine` is softer, `inOutQuint` punchier |
| `burstBoil`, `boilDisplacement`, `boilSpeed` | 0.35, 1.6, 1.8 | how much the liquid edge livens up during the reveal (one smooth bump; 0 = off) |
| `inhaleScale`, `inhaleDuration` | 1, 0 | optional anticipation: the lens contracts first (off by default) |
| `reverseSpeed` | 1.4 | speed when scrolling back up |

The liquid edge itself (`burn`: `spread`, `swapAt`, `displacement`, `noiseScale`, `smear`, `holeAmount`) is the same as in `burn/`.

Console: `DMB4.config.lens.radius = 220`, `DMB4.next()`, `DMB4.prev()`.

## Everything else

The video (from 0:25, never paused), the 15 % shade, the white studio label, the F14 title entrance and the fidelity notes are the same as `burn/`.
