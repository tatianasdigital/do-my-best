# Liquid Flow (v1.2)

A WebGL morph for text and images. The content melts into marbled, fibrous liquid and re-forms as something else: one word turning into another, or an image melting in from nothing or out to nothing.

It was built for the DO MY BEST first screen (Title2 "BUILDERS." → "DESTROYERS." and the Character melt-in), modelled on the "FLOW" kinetic-typography reference.

- `liquid-flow.js` is the library. It is one file with no dependencies.
- `demo.html` is a working example (text morph plus image melt-in). Run it from a local server, e.g. `python -m http.server`, and click the page.

## Quick start

```html
<div class="stage" style="position:relative">
  <p class="word" id="a">Builders.</p>                       <!-- absolutely positioned, single line -->
  <p class="word" id="b" style="visibility:hidden">Destroyers.</p>
  <canvas id="fx"></canvas>                                  <!-- same parent as the sources -->
</div>
<script src="liquid-flow.js"></script>
<script>
  const canvas = document.getElementById('fx');
  const fx = LiquidFlow.create(canvas, { mode: 'text', from: a, to: b });
  canvas.style.visibility = 'hidden';
  document.fonts.ready.then(() => fx.build());
  // later:
  fx.play({
    direction: 1,                       // -1 plays it backwards (TO → FROM)
    onStart() { a.style.visibility = b.style.visibility = 'hidden'; canvas.style.visibility = 'visible'; },
    onDone()  { b.style.visibility = 'visible'; canvas.style.visibility = 'hidden'; },
  });
</script>
```

To melt an image in from nothing:

```js
LiquidFlow.create(canvas, {
  mode: 'image',
  from: null,
  to: { image: imgEl, box: { left, top, width, height, imgX: 0, imgY: 0, imgW, imgH } },
});
```

## API

`LiquidFlow.create(canvas, options)` returns an effect object, or **null if WebGL is unavailable**. In that case, use a crossfade instead.

| Option | Meaning |
|---|---|
| `mode` | `'text'` (one colour, taken from the text's CSS colour or from `color: '#hex'`) or `'image'` (full colour). |
| `from`, `to` | A single-line text element, `{ image, box }`, or `null` (empty). |
| `region` | `{x, y, w, h}` or a function returning it: the canvas area in the parent's px. The default is the sources plus `padding`. |
| `params` | Overrides on top of the mode's preset: an object, or a function that returns one, so live tweaks apply. |
| `scale` | `() => number`: the on-screen scale of the parent if it is CSS-transformed, used to keep textures sharp. |

The effect object has these methods:

| Method | What it does |
|---|---|
| `build(scale?)` | Draws the sources into textures. Call it after fonts and images are ready, and again after a resize. |
| `play({ direction, speed, onStart, onDone })` | Runs the morph and returns its duration in ms. |
| `renderAt(t, timeSec?)` | Freezes the effect at progress `t` (0..1), for tuning. |
| `stop()` | Stops a running morph. |
| `destroy()` | Stops the effect and releases its WebGL context. |
| `running`, `params` | Read-only state. |

`LiquidFlow.DEFAULTS` and `LiquidFlow.PRESETS.text` / `.image` / `.burn` hold the tuned values. Choose a preset with the `preset` option (the default is the mode's preset).

### Screen burn (v1.1)

This turns one screen into another. Put the target screen underneath in the DOM, rasterise the top screen into a canvas, and burn it away radially:

```js
LiquidFlow.create(canvas, {
  mode: 'image', preset: 'burn',
  from: { image: topScreenCanvas, box: { left: 0, top: 0, width: innerWidth, height: innerHeight } },
  to: null,
  region: () => ({ x: 0, y: 0, w: innerWidth, h: innerHeight }),
});
```

The `burn` preset uses: 1400 ms, `sweep: 'radial'`, `spread` 2.4 (a ring-shaped liquid front), `swapAt` 0.45, `displacement` 120, `noiseScale` 170. See `../burn/` for a full example, including `raster.js`, which snapshots a DOM screen. `LiquidFlow.supported()` reports whether WebGL is available.

## Parameters

| Parameter | Default (text / image) | Effect |
|---|---|---|
| `duration` | 2200 / 1900 | ms from the first ripple to the clean result |
| `direction` | 1 | sweep direction: 1 = right → left, −1 = left → right (radial: 1 = centre outwards) |
| `sweep` | `'horizontal'` | `'radial'` burns from `center` outwards; `'spiral'` burns along growing, rotating spiral arms |
| `center` | [0.5, 0.5] | radial or spiral centre as a fraction of the canvas region |
| `spiralArms`, `spiralTwist`, `spiralDepth`, `spiralSpin`, `spiralCore` | 2, 1.8, 0.55, 0.9, 0.15 | `sweep: 'spiral'` (v1.2): curled arms that rotate while they grow; a clean circle inside `spiralCore` |
| `spread` | 0.35 / 0.3 | 0 = everything at once; higher = a stronger sweep |
| `attack`, `release` | 0.22, 0.30 | share of each pixel's time spent dissolving and re-forming (the rest is fully liquid) |
| `swapAt` | 0.5 / 0.3 | when FROM becomes TO; use earlier for melt-ins, so more of the liquid image is visible |
| `displacement` | 170 / 130 | px the flow drags the content |
| `vertical` | 0.4 / 0.9 | vertical share of the flow; keep it low for text with a line above or below |
| `noiseScale` | 150 / 140 | px size of the swirls |
| `warp` | 4.2 | turbulence and marbling |
| `flowSpeed` | 0.55 | how fast the swirl moves |
| `smear` | 70 / 60 | px length of the fibrous streaks |
| `holeAmount` | 1.5 / 1.3 | lace: holes eaten into the content |
| `contours`, `contourDensity` | 1.0, 10 | thin marbled strands |
| `threshold` | 0.5 | hardness of the liquid edges |
| `padding` | 150 / 140 | canvas margin for the spill |
| `maxPixelRatio` | 1.5 | caps the WebGL resolution on hi-DPI screens |

Scale `displacement`, `noiseScale`, `smear` and `padding` with the content size. The defaults suit 200 px text and an image about 600×800 px.

## Rules for a seamless result

1. **One parent.** The canvas and the source elements must share one positioned parent, and the text must be a single line.
2. **Call `build()` only once the real font is loaded and the image is decoded.**
3. **Hide the DOM in the callbacks.** In `onStart`, hide both DOM versions and show the canvas. In `onDone`, show the TO version and hide the canvas. The first and last frames are pixel-identical to the plain source, so the swap is invisible.
4. **Fallbacks.** Respect `prefers-reduced-motion`, and handle a `null` result from `create()`, with a short crossfade.
