/*
 * DO MY BEST — cursor trail
 *
 * One fixed <canvas> (no DOM elements per point). The normal pointer stays; a lime
 * (#E3F14A) short, blurred ribbon with a soft glow and a little grain follows it with a little delay (the head eases
 * towards the pointer) and fades from the brand colour to transparent along its length.
 * Over the two yellow screens (FirstScreen1 and the footer) lime would be invisible, so
 * there the ribbon turns dark (config.trail.darkColor), blending smoothly between both.
 * It fades out over buttons, links and other controls, and comes back when the pointer leaves them.
 * The canvas ignores pointer events. The animation frame runs only while the trail is
 * moving or fading, and stops by itself when everything has faded out.
 * Off for prefers-reduced-motion and for touch / coarse pointers.
 */
(function () {
  'use strict';

  const C = window.DMB_CONFIG.trail;
  const canvas = document.querySelector('.cursor-trail');
  const rm = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fine = window.matchMedia('(pointer: fine)');
  if (!canvas) return;
  const g = canvas.getContext('2d');
  const off = document.createElement('canvas');   // offscreen ribbon, blurred when composited
  off.width = off.height = 256;
  const o = off.getContext('2d');

  let dpr = 1, w = 0, h = 0;
  let mouse = null;          // last pointer position
  let head = null;           // eased trail head
  const pts = [];            // recent head positions, newest first
  let raf = 0, lastMove = 0, last = 0;
  let mix = 0, mixTarget = 0;  // 0 = lime, 1 = dark (over yellow)
  const hero = document.querySelector('.hero');
  /* buttons, links and other controls: the trail fades out while the pointer is over them */
  const CONTROLS = 'a, button, [role="button"], input, select, textarea, label, summary, .buy__menu, .nav-overlay__panel, .game-modal__panel';
  let offControl = false;
  function overYellow(el) {
    if (!el) return false;
    if (el.closest('.footer')) return true;
    if (document.documentElement.classList.contains('theme-lime') &&
        (el.closest('.about') || el.classList.contains('games__stage') || el.closest('.games-intro'))) return true;
    return !!el.closest('.hero') && hero.dataset.state !== 'F2';   // FirstScreen1 (incl. the small-circle step)
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function frame(now) {
    const dt = Math.min(48, now - (last || now)); last = now;
    const k = 1 - Math.pow(1 - C.follow, dt / 16.7);       // frame-rate independent follow
    head.x += (mouse.x - head.x) * k;
    head.y += (mouse.y - head.y) * k;
    pts.unshift({ x: head.x, y: head.y });
    if (pts.length > C.points) pts.length = C.points;
    // after the pointer stops, the tail catches up and shrinks away
    const idle = now - lastMove;
    if (idle > 60) pts.length = Math.max(0, pts.length - 2);

    mix += (mixTarget - mix) * Math.min(1, dt / 120);
    const c = C.color.map((v, i) => Math.round(v + (C.darkColor[i] - v) * mix));
    const col = (a) => `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;
    g.clearRect(0, 0, w, h);
    // 1) the sharp ribbon goes into a small offscreen canvas (bounding box of the trail only)
    const pad = C.width * 2 + C.glow * 2;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const q of pts) { if (q.x < x0) x0 = q.x; if (q.y < y0) y0 = q.y; if (q.x > x1) x1 = q.x; if (q.y > y1) y1 = q.y; }
    x0 = Math.floor(x0 - pad); y0 = Math.floor(y0 - pad);
    const bw = Math.ceil(x1 - x0 + pad), bh = Math.ceil(y1 - y0 + pad);
    if (off.width < bw || off.height < bh) { off.width = Math.max(off.width, bw); off.height = Math.max(off.height, bh); }
    o.setTransform(1, 0, 0, 1, 0, 0);
    o.clearRect(0, 0, bw, bh);
    o.lineCap = 'round';
    o.lineJoin = 'round';
    for (let i = 1; i < pts.length; i++) {
      const t = 1 - i / C.points;                          // 1 at the head → 0 at the tail
      o.strokeStyle = col(C.alpha * Math.pow(t, 1.15));
      o.lineWidth = Math.max(0.6, C.width * (0.25 + 0.75 * t));
      o.beginPath();
      o.moveTo(pts[i - 1].x - x0, pts[i - 1].y - y0);
      o.lineTo(pts[i].x - x0, pts[i].y - y0);
      o.stroke();
    }
    // 2) composite it twice with a blur filter: a wide soft glow, then the blurred ribbon
    if (C.glow) { g.globalAlpha = 0.45; g.filter = `blur(${C.glow / 2}px)`; g.drawImage(off, 0, 0, bw, bh, x0, y0, bw, bh); }
    g.globalAlpha = 1;
    g.filter = C.blur ? `blur(${C.blur}px)` : 'none';
    g.drawImage(off, 0, 0, bw, bh, x0, y0, bw, bh);
    g.filter = 'none';
    // grain: fresh random specks around the trail every frame (a subtle flicker)
    if (C.noise > 0) {
      for (let i = 0; i < pts.length; i++) {
        const t = 1 - i / C.points;
        const n = Math.round(C.noise * 10 * t);
        const spread = C.width * (0.6 + 1.4 * (1 - t));
        for (let j = 0; j < n; j++) {
          const ang = Math.random() * Math.PI * 2, rad = spread * Math.sqrt(Math.random());
          const sz = C.noiseSize * (0.5 + Math.random());
          g.fillStyle = col(C.alpha * t * (0.35 + 0.65 * Math.random()));
          g.fillRect(pts[i].x + Math.cos(ang) * rad, pts[i].y + Math.sin(ang) * rad, sz, sz);
        }
      }
    }
    // keep running while the pointer moves or the tail is still fading out
    if (pts.length > 1 || idle < 120) raf = requestAnimationFrame(frame);
    else { raf = 0; last = 0; g.clearRect(0, 0, w, h); pts.length = 0; }
  }

  function onMove(e) {
    if (rm.matches || !fine.matches) return;
    mouse = { x: e.clientX, y: e.clientY };
    const el = document.elementFromPoint(mouse.x, mouse.y);
    const onControl = !!(el && el.closest(CONTROLS));
    if (onControl !== offControl) {
      offControl = onControl;
      canvas.classList.toggle('is-off', onControl);
      if (!onControl) { pts.length = 0; head = null; }   // restart from the pointer, no streak out of the button
    }
    mixTarget = overYellow(el) ? 1 : 0;
    if (!head || !raf) head = { x: mouse.x, y: mouse.y };
    lastMove = performance.now();
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function onLeave() { lastMove = 0; }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerleave', onLeave);
  rm.addEventListener('change', () => { if (rm.matches) { cancelAnimationFrame(raf); raf = 0; pts.length = 0; g.clearRect(0, 0, w, h); } });

  window.DMBTrail = {
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
    },
  };
})();
