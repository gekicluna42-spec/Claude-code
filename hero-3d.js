/**
 * Eynna — scroll-driven 3D hero.
 *
 * A volumetric field of hair strands rendered in WebGL2. Each strand is a line
 * strip whose vertices are displaced entirely in the vertex shader, so the CPU
 * only uploads a static buffer once and then updates a handful of uniforms.
 *
 * Scroll drives four things at once, which is what makes it read as a camera
 * move rather than a looping decoration:
 *   1. the camera dollies forward through the field
 *   2. the strands' flow phase advances, so they stream past
 *   3. a gold rim-light sweep rakes across them
 *   4. fog closes in toward the end of the section
 *
 * Exposes window.__eynna3d for the test harness.
 */
(function (global) {
  "use strict";

  var VERT = [
    "#version 300 es",
    "precision highp float;",

    // Per-vertex: which strand, and how far along it (0..1).
    "in float aStrand;",
    "in float aT;",

    "uniform float uTime;",
    "uniform float uScroll;",
    "uniform float uAspect;",
    "uniform float uCount;",
    "uniform float uPerLock;",

    "out float vT;",
    "out float vDepth;",
    "out float vSheen;",
    "out float vSeed;",

    // Cheap deterministic hash — keeps strand layout stable across resizes
    // without shipping a per-strand attribute buffer.
    "float hash(float n) { return fract(sin(n * 127.1) * 43758.5453123); }",

    "void main() {",
    "  float id = aStrand;",

    // Hair reads as hair only when neighbouring strands move together, so
    // strands are grouped into locks that share their wave; each strand then
    // jitters slightly around its lock instead of being independent.
    "  float lock = floor(id / uPerLock);",
    "  float within = mod(id, uPerLock) / uPerLock;",

    "  float L1 = hash(lock);",
    "  float L2 = hash(lock + 91.7);",
    "  float L3 = hash(lock + 233.3);",
    "  float L4 = hash(lock + 517.1);",
    "  float L5 = hash(lock + 733.9);",
    "  float j1 = hash(id + 1301.7);",
    "  float j2 = hash(id + 1777.3);",

    "  float ox = mix(-7.0, 7.0, L1);",
    "  float oy = mix(-4.6, 4.6, L2) + (within - 0.5) * 0.85;",
    "  float oz = mix(-26.0, 1.5, L3) + (j2 - 0.5) * 0.5;",

    "  float len   = mix(11.0, 20.0, L4);",
    "  float amp   = mix(0.55, 1.7, L5);",
    "  float freq  = mix(0.5, 1.15, L2);",
    // Small per-strand phase offset fans the lock out into separate hairs.
    "  float phase = L3 * 6.2831853 + (within - 0.5) * 0.55 + j1 * 0.09;",
    "  float speed = mix(0.10, 0.26, L4);",

    // Strands stream toward the viewer as the page scrolls, wrapping so the
    // field never empties out.
    "  float flow = uTime * speed + uScroll * 6.0;",
    "  oz = mod(oz + flow + 26.0, 27.5) - 26.0;",

    "  float t = aT;",
    "  float centered = t - 0.5;",

    // Two summed sines give a curl that reads as hair rather than a wave.
    "  float wave =",
    "      sin(t * freq * 6.2831853 + phase + uTime * speed * 1.6) * amp",
    "    + sin(t * freq * 2.4 * 6.2831853 + phase * 1.6 + uTime * speed * 1.1) * amp * 0.3;",

    "  float waveZ =",
    "      cos(t * freq * 3.2 * 6.2831853 + phase * 0.7 + uTime * speed) * amp * 0.45;",

    // Taper: hair narrows and drifts wider toward the tips.
    "  float taper = 0.45 + t * 0.75;",

    "  vec3 p;",
    "  p.x = ox + centered * len;",
    "  p.y = oy + wave * taper;",
    "  p.z = oz + waveZ * taper;",

    // Camera dollies forward through the slab.
    "  float camZ = 7.0 - uScroll * 24.0;",
    "  vec3 v = vec3(p.x, p.y, p.z - camZ);",

    // Perspective projection, hand-rolled — no matrix upload needed.
    "  float fov = 1.0 / tan(0.62);",
    "  float near = 0.1;",
    "  float far = 60.0;",
    "  float depth = -v.z;",

    "  gl_Position = vec4(",
    "    v.x * fov / uAspect,",
    "    v.y * fov,",
    "    (far + near) / (far - near) * v.z + (2.0 * far * near) / (far - near),",
    "    -v.z",
    "  );",

    // A light sweep that rotates as the page scrolls.
    "  float sweep = uScroll * 3.4 + uTime * 0.12;",
    "  vSheen = pow(max(0.0, sin(t * 3.14159 + sweep + phase * 0.4)), 6.0);",

    "  vT = t;",
    "  vDepth = depth;",
    "  vSeed = L5;",
    "}"
  ].join("\n");

  var FRAG = [
    "#version 300 es",
    "precision highp float;",

    "in float vT;",
    "in float vDepth;",
    "in float vSheen;",
    "in float vSeed;",

    "uniform float uFog;",
    "uniform vec3 uGold;",
    "uniform float uAlpha;",

    "out vec4 fragColor;",

    "void main() {",
    // Fade the strand out at both ends so nothing terminates in a hard stub.
    "  float ends = smoothstep(0.0, 0.16, vT) * smoothstep(1.0, 0.84, vT);",

    // Exponential distance fog dissolves the far field into the page ground.
    "  float fog = exp(-max(vDepth - 2.0, 0.0) * uFog);",

    // Warmer and brighter where the sweep catches the strand.
    "  vec3 base = uGold * mix(0.42, 1.15, vSeed);",
    "  vec3 col = base + uGold * vSheen * 1.5;",

    "  float a = uAlpha * ends * fog * (0.30 + vSheen * 1.05);",
    "  if (a < 0.002) discard;",

    "  fragColor = vec4(col * a, a);",
    "}"
  ].join("\n");

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      var log = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      throw new Error("shader compile failed: " + log);
    }
    return s;
  }

  function program(gl, vsrc, fsrc) {
    var p = gl.createProgram();
    var vs = compile(gl, gl.VERTEX_SHADER, vsrc);
    var fs = compile(gl, gl.FRAGMENT_SHADER, fsrc);
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      var log = gl.getProgramInfoLog(p);
      gl.deleteProgram(p);
      throw new Error("program link failed: " + log);
    }
    return p;
  }

  /**
   * Start the 3D hero on a canvas.
   *
   * @param {HTMLCanvasElement} canvas Target canvas.
   * @param {Object} opts { strands, segments, getScroll, animate }
   * @return {Object|null} Handle, or null when WebGL2 is unavailable.
   */
  function start(canvas, opts) {
    opts = opts || {};

    var gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: true,
      depth: false,
      premultipliedAlpha: true,
      powerPreference: "low-power"
    });
    if (!gl) return null;

    var STRANDS = opts.strands || 900;
    var SEGMENTS = opts.segments || 48;
    var PER_LOCK = opts.perLock || 14;
    var getScroll = opts.getScroll || function () { return 0; };
    var animate = opts.animate !== false;

    var prog;
    try {
      prog = program(gl, VERT, FRAG);
    } catch (e) {
      // A driver that advertises WebGL2 but fails to compile is not worth
      // fighting; the caller falls back to the 2D canvas.
      if (global.console && console.warn) console.warn("[eynna] " + e.message);
      return null;
    }

    // Static geometry: strand id + position along strand, uploaded once.
    var vertCount = STRANDS * SEGMENTS;
    var strandArr = new Float32Array(vertCount);
    var tArr = new Float32Array(vertCount);
    for (var s = 0; s < STRANDS; s++) {
      for (var j = 0; j < SEGMENTS; j++) {
        var idx = s * SEGMENTS + j;
        strandArr[idx] = s;
        tArr[idx] = j / (SEGMENTS - 1);
      }
    }

    // Line segments as index pairs — one draw call for the whole field.
    var idxCount = STRANDS * (SEGMENTS - 1) * 2;
    var IndexArray = vertCount > 65535 ? Uint32Array : Uint16Array;
    var indices = new IndexArray(idxCount);
    var k = 0;
    for (var s2 = 0; s2 < STRANDS; s2++) {
      for (var j2 = 0; j2 < SEGMENTS - 1; j2++) {
        var b = s2 * SEGMENTS + j2;
        indices[k++] = b;
        indices[k++] = b + 1;
      }
    }
    var indexType = IndexArray === Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;

    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    function attrib(name, data, size) {
      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(prog, name);
      if (loc >= 0) {
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
      }
      return buf;
    }

    attrib("aStrand", strandArr, 1);
    attrib("aT", tArr, 1);

    var ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    gl.bindVertexArray(null);

    var u = {};
    ["uTime", "uScroll", "uAspect", "uCount", "uPerLock", "uFog", "uGold", "uAlpha"].forEach(function (n) {
      u[n] = gl.getUniformLocation(prog, n);
    });

    // Additive blending on premultiplied colour gives the highlight bloom.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);

    var W = 0;
    var H = 0;
    var aspect = 1;

    function resize() {
      var dpr = Math.min(global.devicePixelRatio || 1, 2);
      var w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      var h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (w === W && h === H) return;
      W = canvas.width = w;
      H = canvas.height = h;
      aspect = w / h;
      gl.viewport(0, 0, W, H);
    }
    resize();

    var frames = 0;
    var scroll = 0;
    var running = true;
    var raf = 0;
    var lost = false;

    function draw(timeMs) {
      resize();

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      var t = timeMs * 0.001;
      scroll = getScroll();

      gl.useProgram(prog);
      gl.bindVertexArray(vao);

      gl.uniform1f(u.uTime, t);
      gl.uniform1f(u.uScroll, scroll);
      gl.uniform1f(u.uAspect, aspect);
      gl.uniform1f(u.uCount, STRANDS);
      gl.uniform1f(u.uPerLock, PER_LOCK);
      // Fog tightens as the reader descends, closing the scene down.
      gl.uniform1f(u.uFog, 0.055 + scroll * 0.05);
      gl.uniform3f(u.uGold, 0.851, 0.722, 0.471);
      gl.uniform1f(u.uAlpha, 0.82);

      gl.drawElements(gl.LINES, idxCount, indexType, 0);
      gl.bindVertexArray(null);

      frames++;
    }

    function loop(timeMs) {
      if (!running || lost) return;
      draw(timeMs);
      raf = global.requestAnimationFrame(loop);
    }

    canvas.addEventListener("webglcontextlost", function (e) {
      e.preventDefault();
      lost = true;
      global.cancelAnimationFrame(raf);
    });

    // Pause in background tabs rather than burning the visitor's battery.
    function onVisibility() {
      if (document.hidden) {
        running = false;
        global.cancelAnimationFrame(raf);
      } else if (!lost && animate) {
        running = true;
        raf = global.requestAnimationFrame(loop);
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    global.addEventListener("resize", resize);

    if (animate) {
      raf = global.requestAnimationFrame(loop);
    } else {
      draw(1400); // single representative frame
    }

    return {
      getFrames: function () { return frames; },
      getScroll: function () { return scroll; },
      redraw: draw,
      strands: STRANDS
    };
  }

  global.EynnaHero3D = { start: start };
})(window);
