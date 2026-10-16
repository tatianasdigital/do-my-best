/*
 * DO MY BEST — liquid "flow" morph (WebGL), used for Title2 and for the Character
 *
 * Two sources are drawn into textures exactly as the page shows them: for Title2
 * the F13 "BUILDERS." and F14 "DESTROYERS." text (same font, size, centring);
 * for the Character "nothing" and the F14 illustration (same crop). A fragment
 * shader then drags the letters through a domain-warped noise field (a
 * marbled, swirling flow), smears them along the flow into fibrous streaks,
 * eats liquid holes into them and adds thin contour strands — the look of the
 * kinetic-type reference. The distortion sweeps across the word from right to
 * left: each pixel dissolves, stays liquid, swaps from the old to the new text
 * while unreadable, and re-forms into crisp letters. At t = 0 and t = 1 the
 * shader outputs the plain source, so handing over to the DOM is seamless.
 * Text is drawn in one colour (uColor); images keep their own colours (uImage).
 *
 * Tuning: config.js → flow (Title2) and character (Character).
 */
(function () {
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
uniform vec2  uExtent;    // x range (frame px) of the text, for the right→left sweep
uniform vec3  uColor;
uniform float uImage;     // 1 = full-colour image source, 0 = one-colour text
uniform float uT;         // morph progress 0..1
uniform float uTime;      // seconds, keeps the swirl moving
uniform float uSpread, uAttack, uRelease, uSwap;
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

  // Per-pixel timeline: the right end of the word starts (and finishes) first
  float xn = clamp((px.x - uExtent.x) / (uExtent.y - uExtent.x), 0.0, 1.0);
  float p = uT * (1.0 + uSpread) - (1.0 - xn) * uSpread;
  if (p > 0.0 && p < 1.0) p += (noise(q * 1.7 + 3.1) - 0.5) * 0.12; // organic, uneven front
  p = clamp(p, 0.0, 1.0);
  float amt = smoothstep(0.0, uAttack, p) * (1.0 - smoothstep(1.0 - uRelease, 1.0, p));

  if (amt < 0.002) { // clean text — identical to the DOM version
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
  dir.y *= uVertical;                      // keep the flow mostly sideways so it doesn't flood Title1
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

  function hexToRgb(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  /**
   * @param canvas   the <canvas> that shows the effect (placed in the same .stage)
   * @param params   () => parameter object (read on every frame, so console tweaks apply live)
   * @param sources  { old, new } — each a DOM text element, { image: <img>, box } or null (= empty)
   * @param region   () => { x, y, w, h } — the canvas area in frame px
   * @param mode     'text' (one colour, taken from the text's CSS colour) | 'image'
   */
  window.DMB3Flow = function (canvas, params, sources, region, mode = 'text') {
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
      console.warn('[flow] WebGL unavailable, falling back to a crossfade:', e.message);
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
    ['uOld', 'uNew', 'uSize', 'uExtent', 'uColor', 'uImage', 'uT', 'uTime', 'uSpread', 'uAttack', 'uRelease', 'uSwap',
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
    const texOld = makeTex(0);
    const texNew = makeTex(1);
    gl.uniform1i(U.uOld, 0);
    gl.uniform1i(U.uNew, 1);

    let R = { x: 0, y: 0, w: 1920, h: 1080 };   // canvas area, frame px
    let extent = [0, 1920];
    let colorRgb = [1, 1, 1];

    function blank(k) {
      const c = document.createElement('canvas');
      c.width = Math.round(R.w * k);
      c.height = Math.round(R.h * k);
      const g = c.getContext('2d');
      g.scale(k, k);
      g.translate(-R.x, -R.y);              // draw in frame coordinates
      return { c, g };
    }

    /* A DOM text element, laid out exactly as the browser does it */
    function drawText(el, k) {
      const { c, g } = blank(k);
      const cs = getComputedStyle(el);
      g.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      g.fillStyle = '#fff';
      g.textBaseline = 'alphabetic';
      let text = el.textContent;
      if (cs.textTransform === 'uppercase') text = text.toUpperCase();
      const m = g.measureText(text);
      const left = parseFloat(cs.left), width = parseFloat(cs.width), lineH = parseFloat(cs.lineHeight);
      const x = left + (width - m.width) / 2;                     // text-align: center
      const asc = m.fontBoundingBoxAscent, desc = m.fontBoundingBoxDescent;
      const y = parseFloat(cs.top) + (lineH - (asc + desc)) / 2 + asc; // CSS half-leading → baseline
      g.fillText(text, x, y);
      return { canvas: c, x0: x - m.actualBoundingBoxLeft, x1: x + m.actualBoundingBoxRight };
    }

    /* An image cropped into its box: box = { left, top, width, height, imgW, imgH } (frame px) */
    function drawImage(src, k) {
      const { c, g } = blank(k);
      const b = src.box;
      g.save();
      g.beginPath();
      g.rect(b.left, b.top, b.width, b.height);
      g.clip();
      g.drawImage(src.image, b.left, b.top, b.imgW, b.imgH);
      g.restore();
      return { canvas: c, x0: b.left, x1: b.left + b.width };
    }

    function drawSource(src, k) {
      if (!src) return { canvas: blank(k).c, x0: Infinity, x1: -Infinity };
      if (src.image) return drawImage(src, k);
      return drawText(src, k);
    }

    /* (Re)build textures for the current on-screen scale */
    function build(stageScale) {
      const P = params();
      const dpr = Math.min(window.devicePixelRatio || 1, P.maxPixelRatio || 1.5);
      const k = stageScale * dpr;
      R = region();
      Object.assign(canvas.style, { left: `${R.x}px`, top: `${R.y}px`, width: `${R.w}px`, height: `${R.h}px` });
      canvas.width = Math.round(R.w * k);
      canvas.height = Math.round(R.h * k);
      gl.viewport(0, 0, canvas.width, canvas.height);

      const a = drawSource(sources.old, k);
      const b = drawSource(sources.new, k);
      extent = [Math.min(a.x0, b.x0) - R.x, Math.max(a.x1, b.x1) - R.x];
      const textEl = [sources.old, sources.new].find((x) => x && !x.image);
      if (textEl) colorRgb = hexToRgb(rgbToHex(getComputedStyle(textEl).color));

      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texOld);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, a.canvas);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texNew);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, b.canvas);
    }

    function rgbToHex(rgb) {
      const m = rgb.match(/\d+/g).map(Number);
      return '#' + m.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('');
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

    /* direction 1: old → new, -1: back. Returns duration (ms). */
    function play(direction, speed, onStart, onDone) {
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
        if (e >= 1) {
          draw(to, (now - t0) / 1000);
          running = false;
          if (onDone) onDone();
          return;
        }
        draw(from + (to - from) * e, (now - t0) / 1000);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return dur;
    }

    function stop() { cancelAnimationFrame(raf); running = false; }

    return {
      build,
      play,
      stop,
      get running() { return running; },
      /* tuning helper: freeze the effect at progress t (0..1) */
      renderAt: (t, timeSec = 1) => draw(t, timeSec),
    };
  };
})();
