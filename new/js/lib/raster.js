/*
 * DO MY BEST — rasterise a scene (the F12 screen) into a canvas
 *
 * Liquid Flow needs the top screen as a bitmap. This draws the scene the way the
 * browser shows it, covering what this page uses: the scene background (whole
 * viewport), element background colours with border-radius, <img> elements
 * (incl. object-fit: cover for square crops), single-line text (font, colour,
 * text-transform, line-height) and overflow:hidden clipping.
 * Positions come from getBoundingClientRect, so CSS transforms (stage scale,
 * translateX(-50%)) are included. Elements with opacity 0 on the scene itself are
 * still drawn (the scene is hidden with opacity during the burn).
 */
(function () {
  'use strict';

  const transparent = (c) => !c || c === 'transparent' || /rgba\(.*,\s*0\)$/.test(c);

  function roundRect(g, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  /**
   * @param scene  the .scene element (its background fills the whole viewport)
   * @param k      device pixels per CSS pixel for the bitmap
   * @returns      a canvas of viewport size × k
   */
  window.DMBRasterize = function (scene, k) {
    const vw = window.innerWidth, vh = window.innerHeight;
    const c = document.createElement('canvas');
    c.width = Math.round(vw * k);
    c.height = Math.round(vh * k);
    const g = c.getContext('2d');
    g.scale(k, k);

    const sceneCs = getComputedStyle(scene);
    g.fillStyle = sceneCs.backgroundColor;
    g.fillRect(0, 0, vw, vh);

    function drawText(el, cs, r) {
      const node = [...el.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
      if (!node) return;
      let text = node.textContent.replace(/\s+/g, ' ').trim();
      if (cs.textTransform === 'uppercase') text = text.toUpperCase();
      // element scale on screen (stage transform) = rendered width / layout width
      const s = el.offsetWidth ? r.width / el.offsetWidth : 1;
      const size = parseFloat(cs.fontSize) * s;
      g.font = `${cs.fontStyle} ${cs.fontWeight} ${size}px ${cs.fontFamily}`;
      g.fillStyle = cs.color;
      g.textBaseline = 'alphabetic';
      const m = g.measureText(text);
      const asc = m.fontBoundingBoxAscent, desc = m.fontBoundingBoxDescent;
      const lineH = (cs.lineHeight === 'normal' ? (asc + desc) / s : parseFloat(cs.lineHeight)) * s;
      const padL = (parseFloat(cs.paddingLeft) || 0) * s, padT = (parseFloat(cs.paddingTop) || 0) * s;
      let x = r.left + padL;
      if (cs.textAlign === 'center') x = r.left + (r.width - m.width) / 2;
      const y = r.top + padT + (lineH - (asc + desc)) / 2 + asc;
      g.fillText(text, x, y);
    }

    function walk(el) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      const r = el.getBoundingClientRect();
      g.save();

      if (!transparent(cs.backgroundColor) && el !== scene) {
        const s = el.offsetWidth ? r.width / el.offsetWidth : 1;
        roundRect(g, r.left, r.top, r.width, r.height, (parseFloat(cs.borderTopLeftRadius) || 0) * s);
        g.fillStyle = cs.backgroundColor;
        g.fill();
      }
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth) {
        if (cs.objectFit === 'cover') {
          const ir = el.naturalWidth / el.naturalHeight, br = r.width / r.height;
          let sw = el.naturalWidth, sh = el.naturalHeight, sx = 0, sy = 0;
          if (ir > br) { sw = sh * br; sx = (el.naturalWidth - sw) / 2; } else { sh = sw / br; sy = (el.naturalHeight - sh) / 2; }
          g.drawImage(el, sx, sy, sw, sh, r.left, r.top, r.width, r.height);
        } else {
          g.drawImage(el, r.left, r.top, r.width, r.height);
        }
      }
      if (cs.overflow === 'hidden' || cs.overflowX === 'hidden') {
        g.beginPath();
        g.rect(r.left, r.top, r.width, r.height);
        g.clip();
      }
      drawText(el, cs, r);
      for (const child of el.children) walk(child);
      g.restore();
    }

    walk(scene);
    return c;
  };
})();
