/**
 * Cinematic hero.
 *
 * Tier 1: a video is configured        -> scroll position scrubs currentTime
 * Tier 2: WebGL2 available             -> scroll-driven 3D strand field
 * Tier 3: no WebGL2                    -> 2D canvas strand animation
 * Tier 4: reduced motion or narrow vp  -> static poster / single frame
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
  var gl3d = document.getElementById("eynna-hero-gl");
  var poster = document.getElementById("eynna-hero-poster");

  /**
   * Scroll progress through the hero, 0..1.
   *
   * @return {number}
   */
  function heroProgress() {
    var rect = hero.getBoundingClientRect();
    var scrollable = hero.offsetHeight - window.innerHeight;
    if (scrollable <= 0) {
      // Hero is not taller than the viewport: drive off page scroll instead so
      // the effect still responds rather than sitting frozen at 0.
      var docScroll = window.innerHeight * 1.2;
      return Math.min(1, Math.max(0, window.scrollY / docScroll));
    }
    return Math.min(1, Math.max(0, -rect.top / scrollable));
  }

  // Canvas state, shared by the animated and single-frame paths.
  var ctx = null;
  var W = 0;
  var H = 0;
  var STRAND_COUNT = 46;
  var strands = [];
  var frames = 0;

  /* ---------- Tier 4: static ---------- */
  if (staticOnly) {
    if (poster) {
      poster.classList.add("is-visible");
      if (video) video.style.display = "none";
      if (canvas) canvas.style.display = "none";
      if (gl3d) gl3d.style.display = "none";
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

    // One still frame so the hero has texture instead of sitting flat black.
    // Prefer the 3D field; fall back to the 2D canvas.
    if (gl3d && window.EynnaHero3D) {
      var still = window.EynnaHero3D.start(gl3d, {
        strands: 150,
        getScroll: function () { return 0.12; },
        animate: false
      });
      if (still) {
        if (canvas) canvas.style.display = "none";
        window.__eynna3d = still;
        return;
      }
      gl3d.style.display = "none";
    }

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

  /* ---------- Tier 2: scroll-driven 3D strand field ---------- */
  if (gl3d && window.EynnaHero3D) {
    // Smooth the scroll value so the camera glides instead of snapping to
    // each wheel tick — the same lerp idea as the video scrub.
    var target3d = heroProgress();
    var eased3d = target3d;

    window.addEventListener(
      "scroll",
      function () { target3d = heroProgress(); },
      { passive: true }
    );
    window.addEventListener("resize", function () { target3d = heroProgress(); });

    // As the camera pushes into the field the strands get dense enough to
    // fight the headline, so the copy recedes on the way down — which is also
    // the right cinematic beat, handing off to the section below.
    var heroContent = hero.querySelector(".hero__content");
    var scrollHint = hero.querySelector(".hero__scrollhint");

    var handle = window.EynnaHero3D.start(gl3d, {
      getScroll: function () {
        eased3d += (target3d - eased3d) * 0.09;

        if (heroContent) {
          var fade = 1 - Math.min(1, Math.max(0, (eased3d - 0.3) / 0.4));
          heroContent.style.opacity = String(fade);
          heroContent.style.transform =
            "translate(-50%, calc(-50% - " + (eased3d * 60).toFixed(1) + "px))";
        }
        if (scrollHint) {
          scrollHint.style.opacity = String(1 - Math.min(1, eased3d / 0.25));
        }

        return eased3d;
      }
    });

    if (handle) {
      if (canvas) canvas.style.display = "none";
      // Pins the hero and gives it scroll distance for the camera to travel.
      hero.classList.add("is-3d");
      target3d = heroProgress();
      eased3d = target3d;
      window.__eynna3d = handle;
      return;
    }

    // WebGL2 advertised but unusable — drop to the 2D canvas.
    gl3d.style.display = "none";
  }

  /* ---------- Tier 3: 2D canvas strands ---------- */
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
