/*
 * DO MY BEST — persistent background video (YouTube IFrame Player API)
 * Adapted from burn/video.js.
 *
 * - Created ONCE and never removed, re-created or re-loaded: the same player keeps
 *   playing through the circular reveal and GameSection1 → 2 → 3.
 * - Muted, autoplay, no controls / keyboard / fullscreen / annotations / captions,
 *   ignores the pointer, sized like `object-fit: cover` (zoomed a little so YouTube's
 *   edge overlays fall outside the frame).
 * - Seamless loop: it seeks back to the start shortly BEFORE the end, so YouTube's
 *   end screen (related videos) is never reached.
 * - The iframe is only shown while it is actually PLAYING; otherwise the poster image
 *   underneath is visible, so there is no black flash and no YouTube spinner / play /
 *   pause button. setActive(false) pauses a player that is off screen (it is hidden
 *   first, so YouTube's pause overlay is never seen) and setActive(true) resumes it
 *   where it was — the player itself is never re-created.
 * - Must be served over http(s): on file:// YouTube refuses the embed (Error 153).
 */
(function () {
  'use strict';

  /* every background player on the page; suspendAll() pauses them all (e.g. while a
     BuyNow / WatchTrailer modal is open) and resumeAll() lets them play again */
  const players = new Set();
  let suspended = false;

  /* the IFrame API script is loaded once, however many players the page has */
  let apiPromise = null;
  function loadApi() {
    if (apiPromise) return apiPromise;
    apiPromise = new Promise((resolve) => {
      if (window.YT && window.YT.Player) { resolve(); return; }
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { if (prev) prev(); resolve(); };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      document.head.appendChild(s);
    });
    return apiPromise;
  }

  window.DMBYouTube = function (box, opts) {
    const O = Object.assign({ start: 0, zoom: 1.15, loopLead: 0.6 }, opts);
    let player = null;
    let ready = false;
    let loopTimer = 0;
    let active = O.active !== false;

    function size() {
      const iframe = box.querySelector('iframe');
      if (!iframe) return;
      // layout size (ignores CSS transforms such as a block that is scaled back)
      const vw = box.clientWidth || window.innerWidth, vh = box.clientHeight || window.innerHeight;
      let w = Math.max(vw, (vh * 16) / 9), h = (w * 9) / 16;
      w *= O.zoom; h *= O.zoom;
      iframe.style.width = `${Math.ceil(w)}px`;
      iframe.style.height = `${Math.ceil(h)}px`;
    }

    function watchLoop() {
      clearInterval(loopTimer);
      loopTimer = setInterval(() => {
        if (!player || !player.getDuration) return;
        const d = player.getDuration();
        if (d > 0 && player.getCurrentTime() >= d - O.loopLead) player.seekTo(O.start, true);
      }, 150);
    }

    function onReady() {
      ready = true;
      player.mute();
      size();
      if (wants()) player.playVideo(); else player.pauseVideo();
    }

    const wants = () => active && !suspended;
    function onState(e) {
      const S = window.YT.PlayerState;
      // suspended (modal open): keep the frozen frame visible behind the blur
      if (!(suspended && e.data === S.PAUSED)) box.classList.toggle('is-ready', e.data === S.PLAYING);
      if (e.data === S.PLAYING) watchLoop();
      if (e.data === S.PLAYING && !wants()) player.pauseVideo();
      if (e.data === S.PAUSED && wants()) player.playVideo();   // e.g. the browser paused a background tab
      if (e.data === S.ENDED) { player.seekTo(O.start, true); player.playVideo(); }
    }

    function create() {
      player = new window.YT.Player(box.querySelector('[id]'), {
        videoId: O.youtubeId,
        playerVars: {
          autoplay: 1, mute: 1, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3,
          modestbranding: 1, playsinline: 1, rel: 0, cc_load_policy: 0, start: O.start,
          origin: window.location.origin,
        },
        events: {
          onReady,
          onStateChange: onState,
          onError: (e) => { console.warn('[video] YouTube error', e.data); box.classList.remove('is-ready'); },
        },
      });
    }

    loadApi().then(create);

    window.addEventListener('resize', size);
    const api = {
      _sync() {                    // apply the global suspend / resume
        if (!ready) return;
        if (wants()) player.playVideo(); else player.pauseVideo();
      },
      resize: size,
      setActive(v) {
        if (v === active) return;
        active = v;
        if (!ready || suspended) return;
        if (v) player.playVideo();
        else { box.classList.remove('is-ready'); player.pauseVideo(); }
      },
      get ready() { return ready; },
      get player() { return player; },
    };
    players.add(api);
    return api;
  };

  window.DMBYouTube.suspendAll = () => { suspended = true; players.forEach((p) => p._sync()); };
  window.DMBYouTube.resumeAll = () => { suspended = false; players.forEach((p) => p._sync()); };
})();
