/*
 * Glass shatter (Stage 6)
 *
 * The finished glass composition (GlassEffect1–4, all visible at Stage 5) is
 * cut into radial shards around the impact point. Each shard is a small box
 * showing its piece of `glass-composite.png` through a clip-path polygon. On
 * Stage 6 the real glass layers are hidden in the same frame the shards
 * appear, so the hand-over is invisible; the shards then pop slightly toward
 * the viewer and fall out of the viewport with 3D rotation. Scrolling back
 * plays the same animation in reverse, so the glass reassembles.
 *
 * All parameters: DMB_CONFIG.shatter (config.js).
 */
window.DMBShatter = function createShatter(stageEl, glassEl, cfg) {
  'use strict';

  const W = 1920;
  const H = 1080;

  /* deterministic random so the pattern is identical on every load */
  let seed = cfg.seed;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const between = (a, b) => a + (b - a) * rand();

  /* ---------- Build the radial shard pattern ---------- */

  function buildPolygons() {
    const [cx, cy] = cfg.impact;
    const spokes = cfg.spokes;
    const rings = cfg.rings; // radii from the impact point outward

    // vertex grid: grid[r][a]
    const baseAngles = [];
    for (let a = 0; a < spokes; a++) {
      baseAngles.push((a / spokes) * Math.PI * 2 + between(-0.5, 0.5) * (Math.PI * 2 / spokes) * cfg.angleJitter);
    }
    const grid = rings.map((radius, r) => baseAngles.map((ang) => {
      if (r === 0) return [cx, cy];
      const rr = radius * (1 + between(-cfg.radiusJitter, cfg.radiusJitter));
      const aa = ang + between(-0.06, 0.06);
      return [cx + Math.cos(aa) * rr, cy + Math.sin(aa) * rr];
    }));

    const polys = [];
    for (let r = 0; r < rings.length - 1; r++) {
      for (let a = 0; a < spokes; a++) {
        const b = (a + 1) % spokes;
        const p1 = grid[r][a], p2 = grid[r][b], q1 = grid[r + 1][a], q2 = grid[r + 1][b];
        if (r === 0) { polys.push([p1, q1, q2]); continue; }
        // split some cells diagonally for a less regular look
        if (rand() < cfg.splitChance) {
          if (rand() < 0.5) { polys.push([p1, q1, q2]); polys.push([p1, q2, p2]); }
          else { polys.push([p1, q1, p2]); polys.push([q1, q2, p2]); }
        } else {
          polys.push([p1, q1, q2, p2]);
        }
      }
    }
    return polys;
  }

  /* ---------- Create shard elements ---------- */

  // preload the shard image so the first break has no blank frame
  const preload = new Image();
  preload.src = cfg.image;
  if (preload.decode) preload.decode().catch(() => {});

  const layer = document.createElement('div');
  layer.style.setProperty('--shatter-perspective', `${cfg.perspective}px`);
  layer.style.perspectiveOrigin = `${cfg.impact[0]}px ${cfg.impact[1]}px`;
  layer.className = 'shards';
  layer.setAttribute('aria-hidden', 'true');
  stageEl.appendChild(layer);

  const [cx, cy] = cfg.impact;
  const maxDist = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy));

  const shards = buildPolygons().map((poly) => {
    // bounding box, clamped to the frame (pieces outside the frame are empty)
    const xs = poly.map((p) => p[0]);
    const ys = poly.map((p) => p[1]);
    const x0 = Math.max(0, Math.floor(Math.min(...xs)));
    const y0 = Math.max(0, Math.floor(Math.min(...ys)));
    const x1 = Math.min(W, Math.ceil(Math.max(...xs)));
    const y1 = Math.min(H, Math.ceil(Math.max(...ys)));
    if (x1 - x0 < 2 || y1 - y0 < 2) return null;

    const el = document.createElement('div');
    el.className = 'shard';
    Object.assign(el.style, {
      left: `${x0}px`,
      top: `${y0}px`,
      width: `${x1 - x0}px`,
      height: `${y1 - y0}px`,
      backgroundImage: `url(${cfg.image})`,
      backgroundSize: `${W}px ${H}px`,
      backgroundPosition: `${-x0}px ${-y0}px`,
      // 0.6px overlap via rounding keeps hairline seams from showing
      clipPath: `polygon(${poly.map(([x, y]) => `${(x - x0).toFixed(1)}px ${(y - y0).toFixed(1)}px`).join(', ')})`,
    });

    // centroid → rotation pivot and outward direction from the impact point
    const mx = xs.reduce((s, v) => s + v, 0) / xs.length;
    const my = ys.reduce((s, v) => s + v, 0) / ys.length;
    el.style.transformOrigin = `${mx - x0}px ${my - y0}px`;
    const dist = Math.hypot(mx - cx, my - cy);
    const dirX = dist ? (mx - cx) / dist : 0;
    const dirY = dist ? (my - cy) / dist : 0;

    layer.appendChild(el);
    return {
      el,
      top: y0,
      height: y1 - y0,
      size: Math.max(x1 - x0, y1 - y0),
      near: dist / maxDist,                       // 0 at impact, 1 at the far corner
      dirX,
      dirY,
      rx: between(-1, 1) * cfg.maxRotateX,
      ry: between(-1, 1) * cfg.maxRotateY,
      rz: between(-1, 1) * cfg.maxRotateZ,
      drift: dirX * cfg.drift + between(-1, 1) * cfg.drift * 0.4,
      z: between(0.3, 1) * cfg.popZ,
      durJitter: between(-1, 1),
      delayJitter: rand(),
    };
  }).filter(Boolean);

  /* ---------- Animation ---------- */

  let anims = [];
  let state = 'whole'; // 'whole' | 'falling' | 'fallen' | 'rising'
  let runId = 0; // ignores 'finished' callbacks from an interrupted run

  /* resolves when every shard animation has finished in its current direction */
  function whenDone(fn) {
    const id = ++runId;
    Promise.all(anims.map((a) => a.finished)).then(() => { if (id === runId) fn(); }).catch(() => {});
  }

  function exitDistance() {
    // --glass-exit: distance (stage px) from frame top to below the viewport bottom
    const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--glass-exit'));
    return Number.isFinite(v) ? v : H + 200;
  }

  function createAnimations() {
    const exit = exitDistance();
    anims = shards.map((s) => {
      const delay = s.near * cfg.stagger + s.delayJitter * cfg.delayJitter;
      const duration = cfg.fallDuration * (1 + s.durJitter * cfg.durationJitter);
      // fall far enough that even a rotated shard is fully below the viewport
      const fall = exit - s.top + s.size;
      const pop = cfg.popOut; // short outward kick before gravity takes over
      const kf = [
        { transform: 'translate3d(0,0,0) rotateX(0deg) rotateY(0deg) rotateZ(0deg)', offset: 0, easing: 'ease-out' },
        {
          transform: `translate3d(${s.dirX * pop}px, ${s.dirY * pop - cfg.lift}px, ${s.z}px) rotateX(${s.rx * 0.12}deg) rotateY(${s.ry * 0.12}deg) rotateZ(${s.rz * 0.08}deg)`,
          offset: cfg.popPhase,
          easing: cfg.fallEasing,
        },
        { transform: `translate3d(${s.drift}px, ${fall}px, ${s.z * 0.6}px) rotateX(${s.rx}deg) rotateY(${s.ry}deg) rotateZ(${s.rz}deg)`, offset: 1 },
      ];
      const a = s.el.animate(kf, { duration, delay, fill: 'both' });
      a.pause();
      return a;
    });
  }

  function showShards(on) {
    layer.style.visibility = on ? 'visible' : 'hidden';
    glassEl.style.visibility = on ? 'hidden' : 'visible';
  }

  /* Stage 5 → 6: break and fall. Returns the time (ms) until the last shard is gone. */
  function play() {
    if (!anims.length || state === 'whole') createAnimations();
    showShards(true);
    // remaining time if a reassembly was interrupted, full time otherwise
    const remaining = Math.max(...anims.map((a) => a.effect.getComputedTiming().endTime - (a.currentTime || 0)));
    anims.forEach((a) => { a.playbackRate = 1; a.play(); });
    state = 'falling';
    whenDone(() => { state = 'fallen'; layer.style.visibility = 'hidden'; });
    return remaining;
  }

  /* Stage 6 → 5: shards fly back up and reassemble. */
  function reverse() {
    if (state === 'whole' || !anims.length) return 0;
    layer.style.visibility = 'visible';
    const elapsed = Math.max(...anims.map((a) => a.currentTime || 0));
    anims.forEach((a) => { a.playbackRate = -cfg.reverseSpeed; a.play(); });
    state = 'rising';
    whenDone(() => { state = 'whole'; showShards(false); });
    return elapsed / cfg.reverseSpeed;
  }

  /* Jump without animation: broken (fallen) or whole. */
  function snap(broken) {
    runId++;
    anims.forEach((a) => a.cancel());
    anims = [];
    state = broken ? 'fallen' : 'whole';
    layer.style.visibility = 'hidden';
    glassEl.style.visibility = broken ? 'hidden' : 'visible';
    if (broken) {
      createAnimations();
      anims.forEach((a) => a.finish());
    }
  }

  /* Viewport size changed: rebuild fall distances next time. */
  function relayout() {
    if (state === 'whole') { anims.forEach((a) => a.cancel()); anims = []; }
  }

  function destroy() {
    runId++;
    anims.forEach((a) => a.cancel());
    layer.remove();
  }

  layer.style.visibility = 'hidden';
  return { play, reverse, snap, relayout, destroy, count: shards.length };
};
