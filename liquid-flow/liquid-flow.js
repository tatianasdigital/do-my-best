/*!
 * Liquid Flow — WebGL text & image morph   v1.2
 * ------------------------------------------------------------------
 * Origin: DO MY BEST first-screen prototype (Title2 "BUILDERS." → "DESTROYERS."
 * and the Character melt-in). Inspired by the "FLOW" kinetic-typography reference.
 *
 * What it does
 *   Takes a FROM source and a TO source (a single-line text element, an image, or
 *   nothing) and morphs between them: the content is dragged through a
 *   domain-warped noise field (marbled swirl), smeared into fibrous streaks,
 *   cut into hard-edged liquid with holes and thin contour strands, swapped
 *   while unreadable, and re-formed. A sweep travels across the content
 *   (right → left by default, radially from a centre with sweep: 'radial', or along a
 *   growing, rotating spiral with sweep: 'spiral'). The first and last frames are pixel-identical
 *   to the plain source, so you hide the DOM element only while it plays.
 *
 *   mode 'text'  — one colour (taken from the text's CSS colour), FROM/TO are text
 *   mode 'image' — full colour, FROM/TO are images (null = empty → melt-in / melt-out)
 *
 * Usage
 *   <script src="liquid-flow.js"></script>
 *   const fx = LiquidFlow.create(canvas, {
 *     mode: 'text',                       // or 'image'
 *     from: document.querySelector('.old'),
 *     to:   document.querySelector('.new'),
 *     // optional:
 *     region: { x, y, w, h },             // canvas area (px, in the shared parent); default = sources + padding
 *     preset: 'burn',                     // optional: 'text' | 'image' | 'burn' (default = the mode's preset)
 *     params: { duration: 2200 },         // overrides on top of the preset (object or () => object)
 *     scale: () => stageScale,            // on-screen scale of the parent if it is CSS-transformed (default 1)
 *   });
 *   await document.fonts.ready;  fx.build();          // needs real fonts / decoded images
 *   fx.play({ direction: 1, onStart() { hide DOM }, onDone() { show TO in the DOM } });
 *
 *   Image source:  { image: <img>, box: { left, top, width, height,
 *                                         imgX = 0, imgY = 0, imgW = width, imgH = height } }
 *                  (box = where it sits in the parent; imgX/Y/W/H = how the bitmap is
 *                   placed inside the box, for object-fit / Figma-style crops)
 *   Text source:   any absolutely positioned single-line element (same parent as the canvas);
 *                  font, size, weight, letter-spacing, text-transform, text-align and
 *                  line-height are copied from its computed style.
 *
 * Requirements: the canvas and the source elements share one positioned parent;
 * text is a single line. Returns null from create() when WebGL is unavailable —
 * fall back to a crossfade.
 */
(function (global) {
  'use strict';

  const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5); // y down, like the texture rows
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

  const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uOld;
uniform sampler2D uNew;
uniform vec2  uSize;      // canvas size in frame px
uniform vec2  uExtent;    // x range (px) of the content, for the sweep
uniform vec3  uColor;
uniform float uImage;     // 1 = full-colour image source, 0 = one-colour text
uniform float uT;         // morph progress 0..1
uniform float uTime;      // seconds, keeps the swirl moving
uniform float uSpread, uAttack, uRelease, uSwap, uDirection;
uniform float uRadial;    // 1 = radial sweep from uCenter outwards (burn), 0 = horizontal
uniform float uSpiral;    // 1 = spiral sweep from uCenter (needs uRadial = 1)
uniform vec3  uSpiralP;   // x = arms, y = spin (turns over the timeline), z = core radius (a clean circle inside)
uniform vec2  uSpiralQ;   // x = twist (turns of arm curl from centre to corner), y = arm depth (fraction of the radius)
uniform vec2  uCenter;    // radial sweep centre (px)
uniform float uDisp, uScale, uWarp, uFlowSpeed, uSmear, uThresh, uHoles, uContours, uDensity, uVertical;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(17.1, 9.7); a *= 0.5; }
  return v;
}

void main() {
  vec2 px = vUv * uSize;
  vec2 q = px / uScale;

  // Per-pixel timeline: the right end starts (and finishes) first; uDirection = -1 flips it
  float xn = clamp((px.x - uExtent.x) / (uExtent.y - uExtent.x), 0.0, 1.0);
  if (uDirection < 0.0) xn = 1.0 - xn;
  if (uRadial > 0.5) {     // radial: the centre goes first, the farthest corner last
    vec2 fc = max(uCenter, uSize - uCenter);
    float d = clamp(length(px - uCenter) / length(fc), 0.0, 1.0);
    if (uSpiral > 0.5) {   // curled spiral arms that rotate while they grow (seamless); a clean circle inside the core
      vec2 v = px - uCenter;
      float th = atan(v.y, v.x) / 6.2831853;
      float w = smoothstep(uSpiralP.z, uSpiralP.z * 2.0, d);
      float wave = 0.5 + 0.5 * sin(6.2831853 * (uSpiralP.x * th + uSpiralQ.x * d - uSpiralP.y * uT));
      d = clamp((d + uSpiralQ.y * w * wave) / (1.0 + uSpiralQ.y), 0.0, 1.0);
    }
    xn = 1.0 - d;
    if (uDirection < 0.0) xn = 1.0 - xn;
  }
  float p = uT * (1.0 + uSpread) - (1.0 - xn) * uSpread;
  if (p > 0.0 && p < 1.0) p += (noise(q * 1.7 + 3.1) - 0.5) * 0.12; // organic, uneven front
  p = clamp(p, 0.0, 1.0);
  float amt = smoothstep(0.0, uAttack, p) * (1.0 - smoothstep(1.0 - uRelease, 1.0, p));

  if (amt < 0.002) { // clean source — identical to the DOM version
    vec4 c0 = p < uSwap ? texture2D(uOld, vUv) : texture2D(uNew, vUv);   // premultiplied
    gl_FragColor = uImage > 0.5 ? c0 : vec4(uColor * c0.a, c0.a);
    return;
  }

  // Domain-warped flow field (marbled swirl)
  float t = uTime * uFlowSpeed;
  vec2 w1 = vec2(fbm(q + vec2(0.0, t)), fbm(q + vec2(5.2, 1.3 - t * 0.7)));
  vec2 w2 = vec2(fbm(q + uWarp * w1 + vec2(1.7, 9.2) + t * 0.3),
                 fbm(q + uWarp * w1 + vec2(8.3, 2.8) - t * 0.2));
  float field = fbm(q + uWarp * w2);
  vec2 dir = (w2 - 0.5) * 2.0;
  dir.y *= uVertical;                      // < 1 keeps the flow mostly sideways (e.g. off a line above)
  vec2 dirN = dir / (length(dir) + 1e-4);
  vec2 offPx = dir * uDisp * amt;
  float amt2 = amt * amt;                  // smear only once the letters are already liquid → no blur at the edges of the sweep

  // Old → new while the pixel is unreadable (noisy front so there is no straight seam)
  float mixNew = smoothstep(uSwap - 0.1, uSwap + 0.1, p + (field - 0.5) * 0.3);

  // Smear along the flow → fibrous streaks
  vec4 acc4 = vec4(0.0);
  for (int i = 0; i < 5; i++) {
    float f = float(i) / 4.0 - 0.5;
    vec2 uv = vUv + (offPx + dirN * uSmear * amt2 * f) / uSize;
    acc4 += mix(texture2D(uOld, uv), texture2D(uNew, uv), mixNew);
  }
  acc4 /= 5.0;
  float acc = acc4.a;

  // Finer marbling layer for lacy holes and thin strands
  float fine = fbm(q * 2.3 + uWarp * 1.3 * w2 + vec2(t * 0.4, 0.0));

  // Liquid edges + holes
  float a = acc - (mix(field, fine, 0.6) - 0.45) * uHoles * amt;
  float soft = mix(0.5, 0.03, smoothstep(0.0, 0.1, amt));   // edges turn hard almost immediately
  float blob = smoothstep(uThresh - soft, uThresh + soft, a);

  // Thin marbled strands around the letters
  float c = abs(fract(mix(field, fine, 0.5) * uDensity) - 0.5);
  float strand = (1.0 - smoothstep(0.025, 0.06, c)) * smoothstep(0.03, 0.3, acc) * uContours * amt;

  float outA = clamp(max(blob, strand), 0.0, 1.0);
  vec3 rgb = uImage > 0.5 ? acc4.rgb / max(acc4.a, 1e-3) : uColor;  // images keep their (smeared) colours
  gl_FragColor = vec4(rgb * outA, outA);
}`;

  /* ---------- Parameters ---------- */

  // Values tuned in the DO MY BEST project (text at 200px Boldonse, image 592×811).
  const DEFAULTS = {
    duration: 2200,       // ms, first ripple → clean result
    direction: 1,         // sweep: 1 = right → left, -1 = left → right
    spread: 0.35,         // 0 = everything at once, 1 = strong sweep
    attack: 0.22,         // share of each pixel's timeline spent dissolving
    release: 0.30,        // share spent re-forming (the rest is the fully liquid plateau)
    swapAt: 0.5,          // where FROM becomes TO in each pixel's timeline
    displacement: 170,    // px the flow drags the content at peak
    vertical: 0.4,        // vertical share of the flow (0..1)
    noiseScale: 150,      // px size of the swirls
    warp: 4.2,            // domain-warp strength (turbulence / marbling)
    flowSpeed: 0.55,      // how fast the swirl moves while liquid
    smear: 70,            // px streak length along the flow
    threshold: 0.5,       // alpha cut-off → hard liquid edges
    holeAmount: 1.5,      // holes eaten into the content at peak (lacy)
    contours: 1.0,        // brightness of the thin marbled strands (0 = off)
    contourDensity: 10.0, // strands across the noise range
    padding: 150,         // px canvas margin around the sources (auto region)
    sweep: 'horizontal',  // 'horizontal' | 'radial' (burn from `center` outwards) | 'spiral'
    spiralArms: 2,        // spiral: number of curled arms
    spiralTwist: 1.8,     // spiral: how much each arm curls from the centre to the corner (turns)
    spiralDepth: 0.55,    // spiral: how far the arms reach ahead of the gaps (fraction of the radius)
    spiralSpin: 0.9,      // spiral: how far the arms rotate over the whole timeline (turns)
    spiralCore: 0.15,     // spiral: inside this radius (fraction) the hole is a clean circle; full arms from 2× this
    center: [0.5, 0.5],   // radial centre as a fraction of the canvas region
    maxPixelRatio: 1.5,   // caps WebGL resolution on hi-DPI screens
  };

  const PRESETS = {
    text: {},             // = DEFAULTS
    image: {              // melt-in of a tall illustration (FROM = null)
      duration: 1900,
      swapAt: 0.3,        // early swap → more of the timeline shows the liquid image
      spread: 0.3,
      displacement: 130,
      vertical: 0.9,
      noiseScale: 140,
      smear: 60,
      holeAmount: 1.3,
      padding: 140,
    },
    burn: {               // whole-screen transition: FROM = the top screen, TO = null,
      duration: 1400,     // the screen underneath is the DOM. Burns radially from the centre.
      sweep: 'radial',
      spread: 2.4,        // > 1 → a ring-shaped liquid front instead of everything at once
      attack: 0.25,
      release: 0.3,
      swapAt: 0.45,
      displacement: 120,
      vertical: 1.0,
      noiseScale: 170,
      smear: 60,
      holeAmount: 1.4,
      padding: 0,
    },
  };

  function hexToRgb(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  function cssColorToRgb(c) {
    const m = c.match(/[\d.]+/g).map(Number);
    return [m[0] / 255, m[1] / 255, m[2] / 255];
  }

  function supported() {
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl') || c.getContext('experimental-webgl')); }
    catch (e) { return false; }
  }

  function create(canvas, options = {}) {
    const mode = options.mode === 'image' ? 'image' : 'text';
    const sources = { from: options.from || null, to: options.to || null };
    const userParams = options.params || {};
    const preset = PRESETS[options.preset] || PRESETS[mode];
    const params = () => ({ ...DEFAULTS, ...preset, ...(typeof userParams === 'function' ? userParams() : userParams) });
    const scaleOf = options.scale || (() => 1);

    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false })
      || canvas.getContext('experimental-webgl');
    if (!gl) return null;

    function compile(type, src) {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
      return sh;
    }
    const prog = gl.createProgram();
    try {
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    } catch (e) {
      console.warn('[LiquidFlow] WebGL unavailable:', e.message);
      return null;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const U = {};
    ['uOld', 'uNew', 'uSize', 'uExtent', 'uColor', 'uImage', 'uT', 'uTime', 'uSpread', 'uAttack', 'uRelease', 'uSwap', 'uDirection', 'uRadial', 'uCenter', 'uSpiral', 'uSpiralP', 'uSpiralQ',
      'uDisp', 'uScale', 'uWarp', 'uFlowSpeed', 'uSmear', 'uThresh', 'uHoles', 'uContours', 'uDensity', 'uVertical']
      .forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });

    function makeTex(unit) {
      const t = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    }
    const texFrom = makeTex(0);
    const texTo = makeTex(1);
    gl.uniform1i(U.uOld, 0);
    gl.uniform1i(U.uNew, 1);

    let R = { x: 0, y: 0, w: 1, h: 1 };
    let extent = [0, 1];
    let colorRgb = [1, 1, 1];

    /* ---- geometry of a source, in the shared parent's px ---- */
    function textLayout(el, g) {
      const cs = getComputedStyle(el);
      g.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      if ('letterSpacing' in g && cs.letterSpacing !== 'normal') g.letterSpacing = cs.letterSpacing;
      let text = el.textContent.replace(/\s+/g, ' ').trim();
      if (cs.textTransform === 'uppercase') text = text.toUpperCase();
      else if (cs.textTransform === 'lowercase') text = text.toLowerCase();
      const m = g.measureText(text);
      const padL = parseFloat(cs.paddingLeft) || 0, padR = parseFloat(cs.paddingRight) || 0, padT = parseFloat(cs.paddingTop) || 0;
      const innerW = el.clientWidth - padL - padR;
      const align = cs.textAlign;
      let x = el.offsetLeft + padL;
      if (align === 'center') x += (innerW - m.width) / 2;
      else if (align === 'right' || align === 'end') x += innerW - m.width;
      const asc = m.fontBoundingBoxAscent, desc = m.fontBoundingBoxDescent;
      const lineH = cs.lineHeight === 'normal' ? asc + desc : parseFloat(cs.lineHeight);
      const y = el.offsetTop + padT + (lineH - (asc + desc)) / 2 + asc;     // CSS half-leading → baseline
      return { text, x, y, x0: x - m.actualBoundingBoxLeft, x1: x + m.actualBoundingBoxRight,
               top: el.offsetTop, bottom: el.offsetTop + el.offsetHeight, color: cs.color };
    }
    function boxOf(src) {
      if (!src) return null;
      if (src.image) { const b = src.box; return { x0: b.left, x1: b.left + b.width, top: b.top, bottom: b.top + b.height }; }
      const g = document.createElement('canvas').getContext('2d');
      return textLayout(src, g);
    }

    function blank(k) {
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(R.w * k));
      c.height = Math.max(1, Math.round(R.h * k));
      const g = c.getContext('2d');
      g.scale(k, k);
      g.translate(-R.x, -R.y);
      return { c, g };
    }
    function drawSource(src, k) {
      const { c, g } = blank(k);
      if (!src) return { canvas: c, x0: Infinity, x1: -Infinity };
      if (src.image) {
        const b = src.box;
        g.save(); g.beginPath(); g.rect(b.left, b.top, b.width, b.height); g.clip();
        g.drawImage(src.image, b.left + (b.imgX || 0), b.top + (b.imgY || 0), b.imgW || b.width, b.imgH || b.height);
        g.restore();
        return { canvas: c, x0: b.left, x1: b.left + b.width };
      }
      const L = textLayout(src, g);
      g.fillStyle = '#fff';
      g.textBaseline = 'alphabetic';
      g.fillText(L.text, L.x, L.y);
      return { canvas: c, x0: L.x0, x1: L.x1 };
    }

    function autoRegion(P) {
      const boxes = [boxOf(sources.from), boxOf(sources.to)].filter(Boolean);
      const x0 = Math.min(...boxes.map((b) => b.x0)), x1 = Math.max(...boxes.map((b) => b.x1));
      const t = Math.min(...boxes.map((b) => b.top)), btm = Math.max(...boxes.map((b) => b.bottom));
      const pad = P.padding;
      const x = Math.max(0, x0 - pad), y = Math.max(0, t - pad);
      return { x, y, w: x1 + pad - x, h: btm + pad - y };
    }

    /* (Re)build textures — call after fonts/images are ready and whenever the on-screen size changes */
    function build(scale) {
      const P = params();
      const s = scale != null ? scale : scaleOf();
      const k = s * Math.min(global.devicePixelRatio || 1, P.maxPixelRatio);
      R = options.region ? (typeof options.region === 'function' ? options.region() : options.region) : autoRegion(P);
      Object.assign(canvas.style, { position: 'absolute', left: `${R.x}px`, top: `${R.y}px`, width: `${R.w}px`, height: `${R.h}px`, pointerEvents: 'none' });
      canvas.width = Math.max(1, Math.round(R.w * k));
      canvas.height = Math.max(1, Math.round(R.h * k));
      gl.viewport(0, 0, canvas.width, canvas.height);

      const a = drawSource(sources.from, k);
      const b = drawSource(sources.to, k);
      extent = [Math.min(a.x0, b.x0) - R.x, Math.max(a.x1, b.x1) - R.x];
      const textEl = [sources.from, sources.to].find((x) => x && !x.image);
      if (textEl) colorRgb = options.color ? hexToRgb(options.color) : cssColorToRgb(getComputedStyle(textEl).color);

      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texFrom);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, a.canvas);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texTo);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, b.canvas);
      draw(0, 0);
    }

    function draw(t, timeSec) {
      const P = params();
      gl.uniform2f(U.uSize, R.w, R.h);
      gl.uniform2f(U.uExtent, extent[0], extent[1]);
      gl.uniform3f(U.uColor, colorRgb[0], colorRgb[1], colorRgb[2]);
      gl.uniform1f(U.uImage, mode === 'image' ? 1 : 0);
      gl.uniform1f(U.uT, t);
      gl.uniform1f(U.uTime, timeSec);
      gl.uniform1f(U.uSpread, P.spread);
      gl.uniform1f(U.uAttack, P.attack);
      gl.uniform1f(U.uRelease, P.release);
      gl.uniform1f(U.uSwap, P.swapAt);
      gl.uniform1f(U.uDirection, P.direction);
      gl.uniform1f(U.uRadial, P.sweep === 'radial' || P.sweep === 'spiral' ? 1 : 0);
      gl.uniform1f(U.uSpiral, P.sweep === 'spiral' ? 1 : 0);
      gl.uniform3f(U.uSpiralP, P.spiralArms, P.spiralSpin, P.spiralCore);
      gl.uniform2f(U.uSpiralQ, P.spiralTwist, P.spiralDepth);
      gl.uniform2f(U.uCenter, P.center[0] * R.w, P.center[1] * R.h);
      gl.uniform1f(U.uDisp, P.displacement);
      gl.uniform1f(U.uScale, P.noiseScale);
      gl.uniform1f(U.uWarp, P.warp);
      gl.uniform1f(U.uFlowSpeed, P.flowSpeed);
      gl.uniform1f(U.uSmear, P.smear);
      gl.uniform1f(U.uThresh, P.threshold);
      gl.uniform1f(U.uHoles, P.holeAmount);
      gl.uniform1f(U.uContours, P.contours);
      gl.uniform1f(U.uDensity, P.contourDensity);
      gl.uniform1f(U.uVertical, P.vertical);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    let raf = 0;
    let running = false;

    /* Play FROM → TO (direction 1) or TO → FROM (direction -1). Returns the duration (ms). */
    function play({ direction = 1, speed = 1, onStart, onDone } = {}) {
      stop();
      const dur = params().duration / speed;
      const from = direction > 0 ? 0 : 1;
      const to = direction > 0 ? 1 : 0;
      const t0 = performance.now();
      draw(from, 0);
      running = true;
      if (onStart) onStart();
      const tick = (now) => {
        const e = (now - t0) / dur;
        if (e >= 1) { draw(to, (now - t0) / 1000); running = false; if (onDone) onDone(); return; }
        draw(from + (to - from) * e, (now - t0) / 1000);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return dur;
    }
    function stop() { cancelAnimationFrame(raf); running = false; }
    function destroy() { stop(); const ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); }

    return {
      build, play, stop, destroy,
      renderAt: (t, timeSec = 1) => draw(t, timeSec),     // freeze at progress t (0..1) — for tuning
      get running() { return running; },
      get params() { return params(); },
    };
  }

  global.LiquidFlow = { create, supported, DEFAULTS, PRESETS, version: '1.2' };
})(typeof window !== 'undefined' ? window : this);
