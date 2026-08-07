/* ============================================================
   Digital X — scroll-driven cinematic engine
   ------------------------------------------------------------
   Three ideas do all the work:

   1. Native scroll is never hijacked. The scroll position is read,
      not overridden, so trackpad momentum, keyboard, scrollbar
      dragging and screen readers all behave normally.

   2. The *scrub value* is smoothed, not the page. A critically
      damped follower chases the raw scroll progress with a
      frame-rate-independent coefficient, so the film glides where
      the wheel steps. This is what makes it feel expensive.

   3. Seeks are coalesced, never queued. A new currentTime is only
      issued once the previous one has actually presented a frame
      (requestVideoFrameCallback). Firing a seek per rAF is what
      makes naive scrub video stutter — the decoder falls behind
      and every seek lands late. Here the decoder is asked for one
      frame at a time, always the newest one wanted.
   ============================================================ */

(function () {
  'use strict';

  /* ------------------------------------------------ constants */
  var FPS = 24;
  var FRAME = 1 / FPS;
  var FALLBACK_DURATION = 15.5;

  /* follower stiffness — higher is tighter, lower is more languid.
     9 lands around a 110 ms time constant: silky, still obedient. */
  var EASE = 9;

  /* a device that cannot return a seeked frame this fast is not
     given the heavier master file */
  var UPGRADE_LATENCY_MS = 90;

  /* ------------------------------------------------ helpers */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function smoothstep(a, b, x) {
    if (b === a) return x < a ? 0 : 1;
    var t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function median(list) {
    if (!list.length) return Infinity;
    var s = list.slice().sort(function (x, y) { return x - y; });
    return s[Math.floor(s.length / 2)];
  }

  /* ------------------------------------------------ elements */
  var stage   = document.getElementById('stage');
  var cine    = document.getElementById('cine');
  var proxy   = document.getElementById('filmProxy');
  var hq      = document.getElementById('filmHQ');
  var hint    = document.getElementById('hint');
  var railFil = document.getElementById('railFill');
  var railAct = document.querySelectorAll('.rail__acts span');
  var tierTag = document.getElementById('tier');
  var scrim   = document.getElementById('scrim');
  var acts    = [].slice.call(document.querySelectorAll('.act'));
  var cards   = [].slice.call(document.querySelectorAll('.card'));

  if (!stage || !cine || !proxy) return;

  /* pre-read the act/card schedule so the loop never touches the DOM
     for anything but writes */
  var schedule = acts.map(function (el) {
    return {
      el: el,
      a: parseFloat(el.dataset.in),
      b: parseFloat(el.dataset.out),
      rise: parseFloat(el.dataset.rise || '24'),
      o: -1,
      hot: null
    };
  });
  var cardSchedule = cards.map(function (el) {
    return { el: el, at: parseFloat(el.dataset.at), o: -1 };
  });
  var railSchedule = [].slice.call(railAct).map(function (el) {
    return { el: el, at: parseFloat(el.dataset.at), on: false };
  });

  /* ------------------------------------------------ tier gate
     The decision was already made inline in the head, before first
     paint, so the layout never flashes the wrong tier. Here we only
     honour it and release the bytes we are not going to use. */
  if (document.documentElement.classList.contains('still')) {
    stage.classList.add('is-still');
    var why = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduced motion'
            : (navigator.connection || {}).saveData === true ? 'save-data'
            : 'no h264';
    if (tierTag) tierTag.textContent = 'still · ' + why;

    while (proxy.firstChild) proxy.removeChild(proxy.firstChild);
    proxy.removeAttribute('src');
    proxy.load();
    return;
  }

  /* ============================================================
     Scrubber — one decoder, one in-flight seek, always the newest
     frame the scroll has asked for.
     ============================================================ */
  function Scrubber(video) {
    this.v = video;
    this.want = 0;
    this.at = -1;
    this.busy = false;
    this.seq = 0;
    this.armed = false;
    this.samples = [];
    this.duration = FALLBACK_DURATION;

    var self = this;
    var arm = function () {
      if (self.armed) return;
      if (isFinite(video.duration) && video.duration > 0) self.duration = video.duration;
      self.armed = true;
      self.pump();
    };
    if (video.readyState >= 1) arm();
    video.addEventListener('loadedmetadata', arm);
  }

  Scrubber.prototype.push = function (p) {
    /* keep the last frame reachable without running past the end */
    this.want = clamp(p, 0, 1) * (this.duration - FRAME * 0.5);
    this.pump();
  };

  Scrubber.prototype.pump = function () {
    if (!this.armed || this.busy) return;

    var snap = Math.round(this.want * FPS) / FPS;
    if (Math.abs(snap - this.at) < FRAME * 0.5) return;   /* already showing it */

    this.at = snap;
    this.busy = true;

    var self = this;
    var mine = ++this.seq;
    var t0 = performance.now();

    var settle = function () {
      if (self.seq !== mine || !self.busy) return;        /* superseded */
      self.busy = false;
      self.samples.push(performance.now() - t0);
      if (self.samples.length > 30) self.samples.shift();
      self.pump();                                        /* chase the newest want */
    };

    if (this.v.requestVideoFrameCallback) this.v.requestVideoFrameCallback(settle);
    else this.v.addEventListener('seeked', settle, { once: true });
    setTimeout(settle, 400);                              /* watchdog, never wedge */

    try { this.v.currentTime = snap; } catch (e) { settle(); }
  };

  Scrubber.prototype.health = function () { return median(this.samples); };

  /* ------------------------------------------------ prime decoders */
  /* muted + playsinline is allowed to start without a gesture; a brief
     play/pause forces the pipeline to spin up so the first seek is not
     the thing that pays for decoder startup. */
  function prime(video) {
    var p = video.play();
    if (p && p.then) p.then(function () { video.pause(); }).catch(function () {});
    else { try { video.pause(); } catch (e) {} }
  }
  prime(proxy);

  var active = new Scrubber(proxy);
  var hqScrub = null;

  /* ============================================================
     Quality upgrade — the proxy carries first paint, the master
     takes over only once it is buffered end to end AND the device
     has proven it can return seeked frames quickly.
     ============================================================ */
  function upgrade() {
    if (hqScrub) return;

    var wide = window.matchMedia('(min-width: 861px)').matches;
    var src = wide ? 'assets/video/x-master-1280.mp4' : 'assets/video/x-master-960.mp4';

    hq.preload = 'auto';
    hq.src = src;
    hq.load();
    prime(hq);

    var check = function () {
      if (hqScrub) return;
      if (!isFinite(hq.duration) || hq.duration <= 0) return;
      if (!hq.buffered.length) return;
      if (hq.buffered.end(hq.buffered.length - 1) < hq.duration - 0.25) return;
      if (active.health() > UPGRADE_LATENCY_MS) return;   /* device is struggling — stay light */

      hq.removeEventListener('progress', check);
      hq.removeEventListener('canplaythrough', check);

      hqScrub = new Scrubber(hq);
      hqScrub.push(lastProgress);

      /* only reveal the master once it is actually showing the right frame */
      var reveal = function () {
        stage.classList.add('is-hq');
        active = hqScrub;
        if (tierTag) tierTag.textContent = (wide ? '1280' : '960') + ' · master';
      };
      if (hq.requestVideoFrameCallback) hq.requestVideoFrameCallback(reveal);
      else setTimeout(reveal, 200);
    };

    hq.addEventListener('progress', check);
    hq.addEventListener('canplaythrough', check);
    setInterval(check, 500);
  }

  /* don't compete with first paint */
  if (document.readyState === 'complete') setTimeout(upgrade, 600);
  else window.addEventListener('load', function () { setTimeout(upgrade, 600); });

  /* ============================================================
     Geometry — measured on resize, never inside the frame loop
     ============================================================ */
  var geo = { top: 0, span: 1 };
  function measure() {
    var r = cine.getBoundingClientRect();
    geo.top = r.top + window.pageYOffset;
    geo.span = Math.max(1, cine.offsetHeight - stage.offsetHeight);
  }
  measure();
  window.addEventListener('resize', measure);
  window.addEventListener('orientationchange', function () { setTimeout(measure, 250); });

  /* ============================================================
     The loop
     ============================================================ */
  var smooth = 0;
  var lastProgress = 0;
  var prevTime = performance.now();
  var inView = true;

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
    }, { rootMargin: '10% 0px' }).observe(cine);
  }

  function render(p, vel) {
    /* --- film ------------------------------------------------ */
    active.push(p);

    /* velocity gives the frame a little weight on fast flicks */
    stage.style.setProperty('--push', clamp(Math.abs(vel) * 0.55, 0, 1).toFixed(3));

    /* --- acts ------------------------------------------------ */
    var loudest = 0;
    for (var i = 0; i < schedule.length; i++) {
      var s = schedule[i];
      var f = (p - s.a) / (s.b - s.a);
      var o = 0;
      if (f > -0.2 && f < 1.2) {
        o = smoothstep(0, 0.16, f) * (1 - smoothstep(0.84, 1, f));
      }
      if (o > loudest) loudest = o;
      if (Math.abs(o - s.o) > 0.002) {
        s.o = o;
        var dir = f < 0.5 ? 1 : -1;
        s.el.style.setProperty('--o', o.toFixed(3));
        s.el.style.setProperty('--y', ((1 - o) * s.rise * dir).toFixed(2) + 'px');

        var hot = o > 0.35;
        if (hot !== s.hot) {
          s.hot = hot;
          s.el.style.pointerEvents = hot ? 'auto' : 'none';
          s.el.setAttribute('aria-hidden', hot ? 'false' : 'true');
        }
      }
    }

    /* the scrim only darkens the film while copy is actually on it */
    if (scrim) scrim.style.setProperty('--s', (loudest * 0.9).toFixed(3));

    /* --- act III cards land one at a time as panels fly in --- */
    for (var j = 0; j < cardSchedule.length; j++) {
      var c = cardSchedule[j];
      var co = smoothstep(c.at - 0.022, c.at + 0.030, p);
      if (Math.abs(co - c.o) > 0.002) {
        c.o = co;
        c.el.style.setProperty('--co', co.toFixed(3));
        c.el.style.setProperty('--cy', ((1 - co) * 16).toFixed(2) + 'px');
      }
    }

    /* --- chrome ---------------------------------------------- */
    if (railFil) railFil.style.setProperty('--p', p.toFixed(4));
    for (var k = 0; k < railSchedule.length; k++) {
      var r = railSchedule[k];
      var on = p >= r.at - 0.02;
      if (on !== r.on) { r.on = on; r.el.classList.toggle('on', on); }
    }
    if (hint) hint.style.setProperty('--ho', (1 - smoothstep(0.01, 0.06, p)).toFixed(3));
  }

  function frame(now) {
    var dt = Math.min((now - prevTime) / 1000, 0.05);
    prevTime = now;

    if (inView) {
      var target = clamp((window.pageYOffset - geo.top) / geo.span, 0, 1);
      var prev = smooth;

      /* frame-rate independent exponential follower: the same feel at
         60, 90 and 120 Hz, and it degrades gracefully on a slow frame */
      smooth += (target - smooth) * (1 - Math.exp(-EASE * dt));
      if (Math.abs(target - smooth) < 0.00015) smooth = target;

      var vel = (smooth - prev) / Math.max(dt, 0.001);
      lastProgress = smooth;
      render(smooth, vel);
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);

  /* first paint should not wait for a scroll event */
  render(0, 0);
  if (tierTag) tierTag.textContent = '480 · proxy';
})();
