/*
 * DO MY BEST — background video from Vimeo (HeroWorldDestroyers)
 *
 * Same behaviour as the YouTube background player (lib/youtube-video.js):
 * - Vimeo "background" mode: muted, autoplay, endless loop, no controls / title / logo,
 *   ignores the pointer.
 * - Sized like `object-fit: cover` (16:9 frame scaled to fill the box, centred).
 * - The iframe is shown only once it is actually playing; until then the poster image
 *   underneath is visible (no black flash, no spinner).
 * - setActive(false) pauses it while it is off screen, setActive(true) resumes; it also
 *   pauses with DMBYouTube.suspendAll() (a BuyNow / WatchTrailer modal is open) and plays
 *   on with resumeAll().
 * - Starts at opts.start seconds, and the loop comes back to that point too.
 * Uses the Vimeo Player API (https://player.vimeo.com/api/player.js), loaded once.
 */
(function () {
  'use strict';

  const players = new Set();
  let suspended = false;

  let apiPromise = null;
  function loadApi() {
    if (apiPromise) return apiPromise;
    apiPromise = new Promise((resolve, reject) => {
      if (window.Vimeo && window.Vimeo.Player) { resolve(); return; }
      const s = document.createElement('script');
      s.src = 'https://player.vimeo.com/api/player.js';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return apiPromise;
  }

  window.DMBVimeo = function (box, opts) {
    const O = Object.assign({ zoom: 1, ratio: 16 / 9, start: 0 }, opts);
    let player = null, ready = false, active = O.active !== false;
    const wants = () => active && !suspended;

    const iframe = document.createElement('iframe');
    iframe.src = `https://player.vimeo.com/video/${O.vimeoId}?background=1&autoplay=1&muted=1&loop=1&autopause=0&dnt=1&playsinline=1${O.start ? `#t=${O.start}s` : ''}`;
    iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    iframe.setAttribute('tabindex', '-1');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.title = O.title || 'Background video';
    box.textContent = '';
    box.appendChild(iframe);

    function size() {
      const vw = box.clientWidth || window.innerWidth, vh = box.clientHeight || window.innerHeight;
      let w = Math.max(vw, vh * O.ratio), h = w / O.ratio;
      w *= O.zoom; h *= O.zoom;
      iframe.style.width = `${Math.ceil(w)}px`;
      iframe.style.height = `${Math.ceil(h)}px`;
    }
    size();
    window.addEventListener('resize', size);

    function sync() {
      if (!ready) return;
      if (wants()) player.play().catch(() => {});
      else player.pause().catch(() => {});
    }

    loadApi().then(() => {
      player = new window.Vimeo.Player(iframe);
      player.setVolume(0).catch(() => {});
      player.setLoop(true).catch(() => {});
      // start at O.start (also every time the loop comes round); the frame is shown only once
      // the video is there, so the beginning of the clip is never seen
      let seeking = false;
      const toStart = () => { seeking = true; player.setCurrentTime(O.start).catch(() => {}).then(() => { seeking = false; }); };
      player.on('timeupdate', (d) => {
        const t = d.seconds;
        if (O.start && !seeking && t < O.start - 0.5) { box.classList.remove('is-ready'); toStart(); return; }
        box.classList.add('is-ready');
      });
      player.on('loaded', () => { if (O.start) toStart(); });
      player.on('pause', () => { if (wants()) player.play().catch(() => {}); });   // e.g. the browser paused a background tab
      player.ready().then(() => { ready = true; sync(); });
    }).catch(() => console.warn('[video] Vimeo player API failed to load'));

    const api = {
      _sync: sync,
      resize: size,
      setActive(v) {
        if (v === active) return;
        active = v;
        sync();
      },
      get ready() { return ready; },
      get player() { return player; },
    };
    players.add(api);
    return api;
  };

  /* hook into the page-wide suspend / resume used by the modals */
  function hook() {
    const Y = window.DMBYouTube;
    if (!Y || Y._vimeoHooked) return;
    const s = Y.suspendAll, r = Y.resumeAll;
    Y.suspendAll = () => { s(); suspended = true; players.forEach((p) => p._sync()); };
    Y.resumeAll = () => { r(); suspended = false; players.forEach((p) => p._sync()); };
    Y._vimeoHooked = true;
  }
  hook();
})();
