/*
 * DO MY BEST — F14 background video (YouTube IFrame Player API)
 *
 * The video replaces F14's flat black fill. It is muted, has no controls or
 * captions, ignores the pointer, covers the whole window like
 * `background-size: cover` (zoomed a little so YouTube's title/logo overlays fall
 * outside the window), starts at `start` seconds and loops back to `start`.
 * It is never paused (pausing makes YouTube draw its pause/play overlay): it plays
 * muted under F12 from page load, and when the burn reveals F14 it jumps back to
 * `start` (main.js calls play()). The player is only shown while it is actually
 * playing, so no YouTube overlay (play button, spinner, pause icon) is ever visible. If YouTube can't be reached
 * or refuses the embed, the black fill underneath simply stays.
 * Must be served over http(s) (python -m http.server) — opened as a file:// page,
 * YouTube rejects the embed (Error 153).
 *
 * Settings: config.js → video.
 */
(function () {
  'use strict';

  window.DMBVideo = function (container, V) {
    const box = container;                     // .bg-video
    let player = null;
    let ready = false;
    let wantPlaying = true;                    // the video always plays
    let loopTimer = 0;

    function size() {
      const iframe = box.querySelector('iframe');
      if (!iframe) return;
      const vw = window.innerWidth, vh = window.innerHeight;
      let w = Math.max(vw, (vh * 16) / 9), h = (w * 9) / 16;
      w *= V.zoom; h *= V.zoom;
      iframe.style.width = `${Math.ceil(w)}px`;
      iframe.style.height = `${Math.ceil(h)}px`;
    }

    function watchEnd() {
      clearInterval(loopTimer);
      if (V.end == null) return;
      loopTimer = setInterval(() => {
        if (player && player.getCurrentTime && player.getCurrentTime() >= V.end) player.seekTo(V.start, true);
      }, 200);
    }

    function onReady() {
      ready = true;
      player.mute();
      size();
      player.seekTo(V.start, true);
      player.playVideo();
    }

    function onState(e) {
      const S = window.YT.PlayerState;
      // visible only while frames are actually playing — never YouTube's paused / buffering UI
      box.classList.toggle('is-ready', e.data === S.PLAYING);
      if (e.data === S.PLAYING) watchEnd();
      if (e.data === S.PAUSED && wantPlaying) player.playVideo();   // e.g. the browser paused a background tab
      if (e.data === S.ENDED) {                // loop back to the start time, not to 0:00
        player.seekTo(V.start, true);
        player.playVideo();
      }
    }

    function create() {
      player = new window.YT.Player(box.querySelector('#bg-video-player'), {
        videoId: V.youtubeId,
        playerVars: {
          autoplay: 1, mute: 1, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3,
          modestbranding: 1, playsinline: 1, rel: 0, cc_load_policy: 0, start: V.start,
          origin: window.location.origin,
        },
        events: {
          onReady,
          onStateChange: onState,
          // e.g. embedding blocked / opened from file:// (Error 153): keep the black fill
          onError: (e) => { console.warn('[video] YouTube error', e.data); box.classList.remove('is-ready'); box.style.display = 'none'; },
        },
      });
    }

    // Load the YouTube IFrame API once
    if (window.YT && window.YT.Player) create();
    else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { if (prev) prev(); create(); };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      document.head.appendChild(s);
    }

    return {
      /* start (or resume) playback; restart = jump back to `start` first */
      play(restart) {
        wantPlaying = true;
        if (!ready) return;
        if (restart) player.seekTo(V.start, true);
        player.playVideo();
      },
      /* kept for compatibility: the video is intentionally never paused (see header) */
      pause() {},
      resize: size,
      get ready() { return ready; },
    };
  };
})();
