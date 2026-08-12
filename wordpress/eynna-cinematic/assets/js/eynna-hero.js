/**
 * Cinematic hero.
 *
 * Tier 1: a video is configured        -> scroll position scrubs currentTime
 * Tier 2: no video                     -> canvas strand animation
 * Tier 3: reduced motion or narrow vp  -> static poster, nothing animates
 *
 * iOS handles programmatic video seeking poorly, so scrubbing is never used
 * below the mobile breakpoint.
 */
(function () {
  "use strict";

  var hero = document.getElementById("hero");
  if (!hero) return;

  var MOBILE_BREAKPOINT = 768;
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isNarrow = window.innerWidth < MOBILE_BREAKPOINT;
  var staticOnly = reducedMotion || isNarrow;

  var video = document.getElementById("eynna-hero-video");
  var canvas = document.getElementById("eynna-hero-canvas");
  var poster = document.getElementById("eynna-hero-poster");

  // Canvas state, shared by the animated and single-frame paths.
  var ctx = null;
  var W = 0;
  var H = 0;
  var STRAND_COUNT = 46;
  var strands = [];
  var frames = 0;

  /* ---------- Tier 3: static ---------- */
  if (staticOnly) {
    if (poster) {
      poster.classList.add("is-visible");
      if (video) video.style.display = "none";
      if (canvas) canvas.style.display = "none";
      return;
    }

    if (video) {
      // No poster uploaded: park the video on its first frame.
      video.addEventListener("loadeddata", function () {
        try {
          video.currentTime = 0.01;
        } catch (e) {}
      });
      return;
    }

    // Canvas with no poster: paint a single frame so the hero still has
    // texture instead of sitting flat black.
    if (canvas) {
      setupCanvas();
      draw(1200);
    }
    return;
  }

  /* ---------- Tier 1: scroll-scrubbed video ---------- */
  if (video) {
    var ready = false;
    var target = 0;
    var current = 0;

    video.addEventListener("loadedmetadata", function () {
      ready = true;
      updateTarget();
    });

    video.addEventListener("loadeddata", function () {
      try {
        video.currentTime = 0.01;
      } catch (e) {}
      // Once a real frame exists the poster is redundant.
      if (poster) poster.classList.remove("is-visible");
    });

    function updateTarget() {
      if (!ready || !video.duration || !isFinite(video.duration)) return;

      var rect = hero.getBoundingClientRect();
      var scrollable = hero.offsetHeight - window.innerHeight;
      if (scrollable <= 0) return;

      var progress = Math.min(1, Math.max(0, -rect.top / scrollable));
      target = progress * (video.duration - 0.05);
    }

    // Lerp toward the target so scrubbing glides instead of snapping.
    function loop() {
      if (ready && video.duration && isFinite(video.duration)) {
        current += (target - current) * 0.12;
        if (Math.abs(target - current) > 0.001) {
          try {
            video.currentTime = current;
          } catch (e) {}
        }
      }
      requestAnimationFrame(loop);
    }

    window.addEventListener("scroll", updateTarget, { passive: true });
    window.addEventListener("resize", updateTarget);
    updateTarget();
    requestAnimationFrame(loop);
    return;
  }

  /* ---------- Tier 2: canvas strands ---------- */
  if (!canvas) return;

  setupCanvas();

  function animate(time) {
    draw(time);
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);

  // Lets the test harness confirm the canvas is actually running.
  window.__eynna = { getFrames: function () { return frames; } };

  /* ---------- Canvas internals ---------- */

  function setupCanvas() {
    ctx = canvas.getContext("2d");
    resize();
    window.addEventListener("resize", resize);

    for (var i = 0; i < STRAND_COUNT; i++) {
      var t = i / (STRAND_COUNT - 1);
      strands.push({
        baseY: 0.18 + t * 0.66,
        amp: 26 + Math.random() * 60,
        freq: 0.55 + Math.random() * 0.9,
        speed: 0.12 + Math.random() * 0.22,
        phase: Math.random() * Math.PI * 2,
        width: 0.5 + Math.random() * 1.4,
        hue: 36 + Math.random() * 10,
        sat: 42 + Math.random() * 26,
        lit: 28 + Math.random() * 34,
        alpha: 0.05 + Math.random() * 0.16,
        drift: (Math.random() - 0.5) * 0.05
      });
    }
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(time) {
    ctx.clearRect(0, 0, W, H);

    var bg = ctx.createRadialGradient(W * 0.5, H * 0.42, H * 0.08, W * 0.5, H * 0.5, H * 0.85);
    bg.addColorStop(0, "rgba(46, 32, 20, 0.55)");
    bg.addColorStop(1, "rgba(15, 11, 9, 0)");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    var t = time * 0.001;
    var SEGS = 26;

    for (var s = 0; s < strands.length; s++) {
      var st = strands[s];
      var cy = (st.baseY + Math.sin(t * st.drift * 4 + st.phase) * 0.02) * H;

      ctx.beginPath();
      for (var j = 0; j <= SEGS; j++) {
        var x = (j / SEGS) * W;
        var wave =
          Math.sin((j / SEGS) * Math.PI * 2 * st.freq + t * st.speed * 2 + st.phase) * st.amp +
          Math.sin((j / SEGS) * Math.PI * 4.3 * st.freq + t * st.speed * 1.3 + st.phase * 1.7) *
            st.amp *
            0.35;
        var y = cy + wave;
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "hsla(" + st.hue + ", " + st.sat + "%, " + st.lit + "%, " + st.alpha + ")";
      ctx.lineWidth = st.width;
      ctx.stroke();
    }

    frames++;
  }
})();
