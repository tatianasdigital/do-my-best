/*
 * DO MY BEST — black fill in vertical columns
 *
 * The F13 scene (black background + #E3F14A titles) is revealed through a
 * clip-path polygon shaped like a staircase of N vertical columns. Each column
 * grows from the top edge down to the bottom, starting `stagger` ms after its
 * neighbour (order configurable). Columns share edges, so there are no seams,
 * and once every column reaches the bottom the clip is removed — the final
 * state is a plain, clean black background.
 * Reverse (scroll up) plays the same motion backwards: columns retract upward.
 *
 * Tuning: config.js → fill.
 */
(function () {
  'use strict';

  const EASE = {
    linear: (t) => t,
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    inOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
    outQuart: (t) => 1 - Math.pow(1 - t, 4),
    outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  };

  function ranks(n, order) {
    const idx = Array.from({ length: n }, (_, i) => i);
    const mid = (n - 1) / 2;
    switch (order) {
      case 'right-to-left': return idx.map((i) => n - 1 - i);
      case 'center-out':    return idx.map((i) => Math.floor(Math.abs(i - mid)));
      case 'edges-in':      return idx.map((i) => Math.floor(mid - Math.abs(i - mid) + 0.5));
      case 'random': {
        const shuffled = idx.slice().sort(() => Math.random() - 0.5);
        const r = new Array(n);
        shuffled.forEach((col, k) => { r[col] = k; });
        return r;
      }
      default: return idx; // left-to-right
    }
  }

  window.DMB3Fill = function (root, cfg) {
    const F = cfg.fill;
    const scene = root.querySelector('.scene--f13');
    let vw = window.innerWidth;
    let vh = window.innerHeight;
    let raf = 0;
    let running = false;

    function polygon(heights) {
      const n = heights.length;
      const pts = ['0px 0px'];
      for (let i = 0; i < n; i++) {
        const x0 = (vw * i) / n;
        const x1 = (vw * (i + 1)) / n;
        const h = heights[i].toFixed(2);
        pts.push(`${x0.toFixed(2)}px ${h}px`, `${x1.toFixed(2)}px ${h}px`);
      }
      pts.push(`${vw}px 0px`);
      return `polygon(${pts.join(', ')})`;
    }

    /* direction 1: fill down, -1: retract up. Returns duration in ms. */
    function play(direction, speed, onDone) {
      stop();
      const n = Math.max(1, F.columns | 0);
      const r = ranks(n, F.order);
      const maxRank = Math.max(...r);
      const ease = EASE[F.easing] || EASE.inOutQuart;
      const total = maxRank * F.stagger + F.columnDuration;

      const heightsAt = (t) => r.map((rank) => {
        const p = Math.max(0, Math.min(1, (t - rank * F.stagger) / F.columnDuration));
        return ease(p) * vh;
      });

      root.classList.remove('is-filled');
      scene.style.clipPath = polygon(heightsAt(direction > 0 ? 0 : total));
      running = true;
      const t0 = performance.now();
      const tick = (now) => {
        const e = (now - t0) * speed;
        if (e >= total) {
          running = false;
          scene.style.clipPath = '';
          root.classList.toggle('is-filled', direction > 0);
          if (onDone) onDone();
          return;
        }
        scene.style.clipPath = polygon(heightsAt(direction > 0 ? e : total - e));
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return total / speed;
    }

    /* total duration of a fill at the given speed (ms) */
    function duration(speed = 1) {
      const n = Math.max(1, F.columns | 0);
      const maxRank = Math.max(...ranks(n, F.order));
      return (maxRank * F.stagger + F.columnDuration) / speed;
    }

    function stop() { cancelAnimationFrame(raf); running = false; }

    return {
      play,
      duration,
      stop,
      get running() { return running; },
      relayout(w, h) { vw = w; vh = h; },
    };
  };
})();
