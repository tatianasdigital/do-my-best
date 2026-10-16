# DO MY BEST — first screen (F12 → F13 → F14 + Character)

The earlier prototypes (the project root and `alt-glitch/`) are unchanged.

Figma file `78XlrFPw66iWdkqGPpQ2ua`, Page 3:
- **F12** (`30:515`) is the first screen: yellow background, dark "WORLD / BUILDERS.", dark menu and icons.
- **F13** (`30:631`) is the screen after the black fill: titles in #E3F14A, yellow menu and icons.
- **F14** (`30:573`) is the final screen, the same as F13 but with Title2 "DESTROYERS." and the **Character** illustration over the titles.

## Run

There's no build step and nothing to install. Start a static server from the **project root**, because the page loads the logo and the dark icon from `../assets/`:

```
cd E:\gamestudio\do-my-best
python -m http.server 8000
```

Then open http://localhost:8000/flow/.

To run the sequence, scroll down (wheel or trackpad), or press ↓, Page Down or Space. To reverse it, scroll up or press ↑ or Page Up. `flow-preview.gif` shows the whole sequence.

## Sequence

| Step | What happens | Default timing |
|---|---|---|
| **Load** | Everything except the titles appears straight away. Each title sits in an invisible narrow mask as wide as its own text. **Title1** slides out of the mask's left edge and **Title2** out of its right edge, as if the letters emerge from a slit. Fast start, smooth stop, no overshoot. | 300 ms delay; 800 ms each; Title2 starts 220 ms after Title1 |
| **Scroll ↓ 1. Black fill** | 8 vertical columns drop from the top to the bottom, left to right, 60 ms apart. Inside the black, the titles appear in #E3F14A (F13). The columns share edges, so there are no seams, and the final background is solid black. | ≈ 980 ms |
| **2. Title2 morph** | Starts 100 ms before the columns finish (Title2 is already covered by then). "BUILDERS." melts into marbled, fibrous liquid, starting at the right edge, and re-forms as "DESTROYERS." (F14). This is the same WebGL shader as before. | 2.2 s |
| **3. Chrome** | In parallel with the morph, Navigation, Social links and Scroll hint switch to their F13 colours: yellow menu with dark text and bars, yellow icons. | 60 ms after the fill, 260 ms |
| **4. Character** | After everything else, the F14 Character melts in with the same shader. It rises out of a marbled liquid made of its own paint colours and sets into the sharp illustration, right side first. | 150 ms after the morph, 1.9 s |
| **Scroll ↑** | The exact mirror: the Character melts away, the morph plays back, the colours return, and the columns retract upward. It runs 1.4× faster. | ≈ 3.7 s |

One gesture runs the whole sequence once. Input is locked until it finishes, and trackpad inertia or a big flick can't trigger it again. The sequence can be repeated as many times as you like without reloading.

## Tuning

**Every value is in `config.js`**, grouped by step:
- `intro` — delays, durations, easing, mask margin
- `fill` — column count, column duration, stagger, order (`left-to-right`, `right-to-left`, `center-out`, `edges-in`, `random`), easing
- `chrome` — delay, duration
- `flow` — `delayAfterFill`: when the morph starts relative to the end of the fill (negative = overlap, default −100 ms); duration; and the liquid look: sweep, displacement, swirl size, warp, smear, holes, strands
- `character` — `delayAfterTitle`, duration, and any `flow` parameter overridden for the Character (e.g. `swapAt`, `vertical`, `displacement`)
- `reverseSpeed`, `input`, `reducedMotion`

Console helpers (changes apply on the next scroll, no reload):

```js
DMB3.config.fill.order = 'center-out'
DMB3.config.flow.duration = 3000
DMB3.next(); DMB3.prev()     // run the sequence without scrolling
DMB3.replayIntro()           // replay the title entrance
DMB3.freeze(0.5)             // hold the Title2 morph at 50 % on the F13 screen
DMB3.freezeCharacter(0.5)    // hold the Character melt-in at 50 %
DMB3.unfreeze()
```

## Files

| File | Purpose |
|---|---|
| `index.html` | Layers: the F12 scene (titles in their entrance masks), the F13/F14 scene (yellow titles, Character and the two effect canvases, revealed by the columns), the chrome layer. |
| `styles.css` | Layout in Figma pixels on a 1920×1080 stage that scales to fit the window; F12 and F13 chrome colours and their transitions; reduced-motion crossfades. |
| `config.js` | All timings and parameters. |
| `main.js` | Scaling, title entrance, the sequence (fill → chrome → morph and back), input handling, reduced motion. |
| `fill.js` | Black fill in vertical columns (an animated `clip-path`). |
| `flow.js` | The WebGL liquid-flow effect, used for the Title2 morph (text) and the Character (image). |
| `assets/f13-social-icon.svg` | The yellow social icon from F13/F14. It is the original Figma export. |
| `flow-preview.gif` | Preview of the full sequence. |

## Fidelity

- **Text and fonts:** the titles are live text in **Boldonse** (200 px, line-height 1.4). The studio label is in **Manrope Medium**, and the menu and scroll hint are in **Syne**. All three load from Google Fonts.
- **Pixel check:** F12, F13 and F14 were compared with the Figma exports at 1920×1080. Only anti-aliased edges differ.
- **Seamless handover:** the first and last frames of both effects are identical to the live text and to the Character image.
- **Assets:** the logo (`../assets/logo.png`), the dark F12 icon (`../assets/f01-social-icon.svg`) and the Character (`../assets/f04-character.png`) are byte-identical to the Figma exports. The Character uses Figma's crop: a 592×811 box at (625, 126), image 243.96 % wide.

## Notes

- **Two Figma quirks are kept as designed:**
  - The visible "( Scroll )" layer is **white in F12 as well**, so it is faint on the yellow background.
  - The studio label is **black in F13/F14**, so it is almost invisible on black.
- **Trailing spaces:** Figma's title text has trailing spaces ("World ", "destroyers. ") that it ignores when centring. They are left out.
- **Hidden and empty layers:** crack/glass textures, a duplicate nav and social row, and the empty "logo 2" aren't visible in the frames and aren't rendered.
- **Reduced motion:** with `prefers-reduced-motion`, the titles fade in and each scroll step is a short crossfade. Without WebGL, the Title2 morph and the Character become crossfades.
- Desktop only.
