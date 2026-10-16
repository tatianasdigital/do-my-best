/*
 * DO MY BEST — Title2 glitch ("BUILDERS." → "DESTROYERS.", both #0E0F0E)
 *
 * A glitch is a pre-generated list of short, irregular frames (stepped, not
 * tweened — that is what makes it read as a digital fault). In each frame
 * Title2 is cut into horizontal strips; every strip shows the old or the new
 * title, displaced sideways, with an optional white "chromatic" ghost, or is
 * blanked for one frame. The share of new-title strips rises over the
 * sequence; displacement peaks mid-way and drops to zero, so it resolves into
 * a clean, stable title. Playing backwards runs the same frames in reverse.
 *
 * Tuning: config.js → titleGlitch.
 */
(function () {
  'use strict';

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const smooth = (t) => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;

  /* Random partition of [0, total] into n pieces (mix of thin and thick), each ≥ min */
  function partition(rng, total, n, min) {
    const w = Array.from({ length: n }, () => (rng() < 0.35 ? 0.15 + rng() * 0.5 : 0.8 + rng() * 3.2));
    const sum = w.reduce((a, b) => a + b, 0);
    const free = Math.max(0, total - min * n);
    const out = [];
    let y = 0;
    for (const v of w) { const s = min + (v / sum) * free; out.push([y, y + s]); y += s; }
    out[out.length - 1][1] = total;
    return out;
  }

  function generate(G, regionH) {
    const rng = mulberry32(G.seed == null ? (Math.random() * 2 ** 31) | 0 : G.seed);

    const holds = [];
    let total = 0;
    while (total < G.duration - G.frameMs * 0.5) {
      const h = Math.max(16, G.frameMs * (1 + (rng() * 2 - 1) * G.frameJitter));
      holds.push(h);
      total += h;
    }
    const fit = G.duration / total;

    const frames = [];
    let t = 0;
    holds.forEach((raw, k) => {
      const hold = raw * fit;
      const last = k === holds.length - 1;
      const q = clamp01((t + hold / 2) / G.duration);
      let strips;
      if (last) {
        strips = null; // clean new title
      } else {
        const amp = Math.max(k === 0 ? 0.55 : 0, Math.pow(Math.sin(Math.PI * q), 0.5));
        const pNew = Math.pow(smooth(q), G.swapBias);
        strips = partition(rng, regionH, G.strips, 4).map(([y0, y1]) => ({
          y0, y1,
          isNew: rng() < pNew,
          offset: (rng() * 2 - 1) * G.maxOffset * amp * (rng() < 0.65 ? 1 : 0.2),
          ghost: amp > 0.15 && rng() < G.ghostChance
            ? (rng() < 0.5 ? -1 : 1) * lerp(G.ghostOffset[0], G.ghostOffset[1], rng()) * amp
            : 0,
          drop: rng() < G.dropChance * amp,
        }));
      }
      frames.push({ start: t, hold, strips });
      t += hold;
    });
    return frames;
  }

  window.DMB2Glitch = function (root, cfg) {
    const G = cfg.titleGlitch;
    const stripsRoot = root.querySelector('.title2-strips');
    const REGION_H = 140; // .title2-strips height (styles.css)

    const tpl = document.getElementById('title2-strip');
    const strips = [];
    for (let i = 0; i < G.strips; i++) {
      const node = tpl.content.firstElementChild.cloneNode(true);
      stripsRoot.appendChild(node);
      strips.push({
        el: node,
        inner: node.querySelector('.t2-strip__inner'),
        oldGhost: node.querySelector('.t2--old.t2--ghost'),
        oldMain: node.querySelector('.t2--old.t2--main'),
        newGhost: node.querySelector('.t2--new.t2--ghost'),
        newMain: node.querySelector('.t2--new.t2--main'),
      });
    }
    const on = (el, v) => el.classList.toggle('is-on', v);

    function render(frame, cleanVersion) {
      if (!frame.strips) {
        // one clean, undisplaced strip showing the resolved title
        strips.forEach((s, i) => {
          s.el.style.display = i === 0 ? '' : 'none';
          s.el.style.clipPath = 'none';
          s.inner.style.transform = '';
          on(s.oldGhost, false); on(s.newGhost, false);
          on(s.oldMain, i === 0 && cleanVersion === 'old');
          on(s.newMain, i === 0 && cleanVersion === 'new');
        });
        return;
      }
      frame.strips.forEach((st, i) => {
        const s = strips[i];
        s.el.style.display = '';
        s.el.style.clipPath = `inset(${st.y0.toFixed(2)}px 0px ${(REGION_H - st.y1).toFixed(2)}px 0px)`;
        s.inner.style.transform = `translate3d(${st.offset.toFixed(2)}px,0,0)`;
        const show = !st.drop;
        on(s.oldMain, show && !st.isNew);
        on(s.newMain, show && st.isNew);
        const ghost = st.isNew ? s.newGhost : s.oldGhost;
        on(st.isNew ? s.oldGhost : s.newGhost, false);
        on(ghost, show && st.ghost !== 0);
        if (st.ghost) {
          ghost.style.transform = `translate3d(${st.ghost.toFixed(2)}px,0,0)`;
          ghost.style.opacity = String(G.ghostOpacity);
        }
      });
    }

    let raf = 0;
    let running = false;
    let doneCb = null;

    /* direction 1: old → new, -1: new → old (same frames reversed).
       Returns duration in ms; onDone fires when the clean title is in place. */
    function play(direction, speed, onDone) {
      stop();
      let frames = generate(G, REGION_H);
      if (direction < 0) {
        // reversed: start from the corrupted end, finish on the old title
        frames = frames.slice().reverse();
        const lastFrame = frames.shift();      // the clean "new" frame isn't needed at the start
        frames.push({ ...lastFrame, strips: null });
        let t = 0;
        frames.forEach((f) => { f.start = t; t += f.hold; });
      }
      const clean = direction > 0 ? 'new' : 'old';
      const end = frames[frames.length - 1].start + frames[frames.length - 1].hold;

      render(frames[0], clean);
      root.classList.add('is-glitching');
      running = true;
      doneCb = onDone;
      const t0 = performance.now();
      let shown = 0;
      const tick = (now) => {
        const elapsed = (now - t0) * speed;
        if (elapsed >= end) { finish(); return; }
        let idx = shown;
        while (idx < frames.length - 1 && elapsed >= frames[idx + 1].start) idx++;
        if (idx !== shown) { shown = idx; render(frames[idx], clean); }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return end / speed;
    }

    function finish() {
      cancelAnimationFrame(raf);
      running = false;
      root.classList.remove('is-glitching');
      const cb = doneCb; doneCb = null;
      if (cb) cb();
    }

    function stop() { cancelAnimationFrame(raf); running = false; doneCb = null; root.classList.remove('is-glitching'); }

    return {
      play,
      stop,
      get running() { return running; },
      /* tuning helpers: f = preview(); showFrame(f[3]); stop() */
      preview: () => generate(G, REGION_H),
      showFrame(frame) { cancelAnimationFrame(raf); root.classList.add('is-glitching'); render(frame, 'new'); },
    };
  };
})();
