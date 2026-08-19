/**
 * The hero's look is one fragment shader: a virtual camera over the frame
 * (crop + parallax + defocus), a film grade, and the effect layers that
 * stand in for DIP Studio's real services — low fog, light beams, a star
 * ceiling and bloom. Spark fountains are a separate particle system.
 */

export const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const fragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform sampler2D uTexture;
  uniform vec2  uTexSize;      // source frame, in pixels
  uniform vec2  uResolution;   // canvas, in pixels
  uniform float uTime;

  uniform vec3  uCrop;         // centre x, centre y, width (0-1)
  uniform float uYaw;
  uniform float uExposure;
  uniform float uContrast;
  uniform float uSaturation;
  uniform float uVignette;
  uniform float uDof;

  uniform float uFog;
  uniform float uBeams;
  uniform float uStars;
  uniform float uBloom;
  uniform float uGrain;
  uniform vec2  uPointer;      // -1 → 1, damped

  const vec3 EMBER = vec3(1.0, 0.72, 0.42);
  const vec3 CHAMPAGNE = vec3(0.92, 0.80, 0.62);

  // ---- noise ------------------------------------------------------------
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p *= 2.02;
      a *= 0.5;
    }
    return v;
  }

  // ---- camera -----------------------------------------------------------
  // Cover-fit the source frame, then apply the act's crop.
  vec2 frameUv(vec2 uv, float scale, vec2 offset) {
    float canvasAspect = uResolution.x / uResolution.y;
    float texAspect = uTexSize.x / uTexSize.y;

    vec2 cover = vec2(1.0);
    if (canvasAspect > texAspect) cover.y = texAspect / canvasAspect;
    else cover.x = canvasAspect / texAspect;

    vec2 centred = (uv - 0.5) * cover * scale + offset;
    return centred + vec2(uCrop.x, uCrop.y);
  }

  // Cheap depth stand-in: the floor is near, the ceiling is far, and the
  // centre of the room recedes. Enough to give the push-in real parallax.
  float depthAt(vec2 uv) {
    float vertical = smoothstep(0.05, 0.95, 1.0 - uv.y);
    float radial = 1.0 - smoothstep(0.0, 0.75, length((uv - vec2(0.5, 0.5)) * vec2(1.0, 1.35)));
    return clamp(mix(vertical, radial, 0.45), 0.0, 1.0);
  }

  vec3 sampleFrame(vec2 uv) {
    return texture2D(uTexture, clamp(uv, vec2(0.001), vec2(0.999))).rgb;
  }

  // Radial blur used for both defocus and the bloom pre-pass. TAPS is defined
  // per device tier by HeroStage.
  #ifndef TAPS
  #define TAPS 8
  #endif

  vec3 blurred(vec2 uv, float radius) {
    vec3 sum = vec3(0.0);
    float total = 0.0;
    const float step = 6.2831853 / float(TAPS);
    for (int i = 0; i < TAPS; i++) {
      float a = float(i) * step;
      vec2 o = vec2(cos(a), sin(a)) * radius;
      float w = 1.0 - float(i) * 0.04;
      sum += sampleFrame(uv + o) * w;
      total += w;
    }
    return sum / total;
  }

  vec3 grade(vec3 c) {
    c *= uExposure;
    c = (c - 0.5) * uContrast + 0.5;
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = mix(vec3(l), c, uSaturation);
    return c;
  }

  void main() {
    vec2 uv = vUv;

    // Camera: crop, act yaw, and a whisper of pointer parallax.
    vec2 drift = vec2(uYaw + uPointer.x * 0.006, uPointer.y * 0.004);
    vec2 fuv = frameUv(uv, uCrop.z, drift);

    // Parallax by depth — the room opens up as the camera moves in.
    float depth = depthAt(uv);
    fuv += drift * depth * 0.35;

    // Chromatic aberration grows towards the edges of frame.
    float edge = length(uv - 0.5);
    vec2 ca = (uv - 0.5) * edge * 0.0035 * uCrop.z;

    vec3 col;
    col.r = sampleFrame(fuv + ca).r;
    col.g = sampleFrame(fuv).g;
    col.b = sampleFrame(fuv - ca).b;

    // Defocus everything but the centre of frame.
    float focus = smoothstep(0.12, 0.72, edge) * uDof;
    if (focus > 0.001) {
      col = mix(col, blurred(fuv, 0.004 + focus * 0.012), focus);
    }

    col = grade(col);

    // ---- low fog (niski dim) --------------------------------------------
    if (uFog > 0.001) {
      float band = smoothstep(0.16, 0.62, uv.y);          // hugs the floor
      float roll = fbm(vec2(uv.x * 3.2 - uTime * 0.045, uv.y * 5.5 + uTime * 0.02));
      float roll2 = fbm(vec2(uv.x * 6.0 + uTime * 0.03, uv.y * 8.0 - uTime * 0.015));
      float density = smoothstep(0.35, 0.85, roll * 0.65 + roll2 * 0.45);
      float fog = band * density * uFog;
      vec3 fogCol = mix(vec3(0.78, 0.76, 0.73), CHAMPAGNE, 0.35);
      col = mix(col, fogCol, clamp(fog * 0.78, 0.0, 0.92));
    }

    // ---- light beams (ambijentalna rasvjeta / magični laser) -------------
    if (uBeams > 0.001) {
      vec2 p = uv - vec2(0.5, 0.14);
      float ang = atan(p.y, p.x);
      float beam = 0.0;
      for (int i = 0; i < 4; i++) {
        float k = float(i);
        float base = 0.72 + k * 0.42 + sin(uTime * 0.18 + k * 1.7) * 0.06;
        beam += smoothstep(0.035, 0.0, abs(ang - base));
      }
      float falloff = smoothstep(1.0, 0.05, length(p));
      col += CHAMPAGNE * beam * falloff * 0.1 * uBeams;
    }

    // ---- star ceiling (zvjezdano nebo) -----------------------------------
    if (uStars > 0.001) {
      float ceiling = smoothstep(0.42, 0.0, uv.y);
      vec2 gridUv = uv * vec2(120.0, 70.0);
      vec2 cell = floor(gridUv);
      float rnd = hash(cell);
      float twinkle = 0.5 + 0.5 * sin(uTime * (1.2 + rnd * 2.4) + rnd * 40.0);
      float star = step(0.972, rnd) * twinkle;
      float dotShape = 1.0 - smoothstep(0.0, 0.42, length(fract(gridUv) - 0.5));
      col += CHAMPAGNE * star * dotShape * ceiling * uStars * 0.9;
    }

    // ---- bloom -----------------------------------------------------------
    if (uBloom > 0.001) {
      vec3 wide = blurred(fuv, 0.02);
      vec3 bright = max(wide - 0.55, vec3(0.0));
      col += bright * uBloom * 0.9 * mix(vec3(1.0), EMBER, 0.35);
    }

    // ---- vignette + grain ------------------------------------------------
    float vig = 1.0 - smoothstep(0.34, 0.95, edge) * uVignette;
    col *= vig;

    float g = hash(uv * uResolution + fract(uTime) * 91.7) - 0.5;
    col += g * uGrain;

    col = max(col, vec3(0.0));
    gl_FragColor = vec4(col, 1.0);
  }
`;

/** Spark fountains: additive points on ballistic arcs, warm and short-lived. */
export const sparkVertex = /* glsl */ `
  attribute float aSeed;
  attribute float aColumn;
  attribute float aSpeed;

  uniform float uTime;
  uniform float uIntensity;
  uniform vec2  uResolution;
  uniform float uSpread;   // how far the columns sit from centre (crop-aware)
  uniform float uLift;

  varying float vLife;
  varying float vSeed;

  void main() {
    // Each particle loops on its own phase so the fountains never pulse in sync.
    float life = fract(uTime * aSpeed * 0.28 + aSeed);
    vLife = life;
    vSeed = aSeed;

    float rise = life;
    float gravity = rise * rise * 0.85;

    float x = aColumn * uSpread + (aSeed - 0.5) * 0.045 * rise;
    float y = -0.62 + (rise * 1.35 - gravity) * uLift;

    vec4 mv = vec4(x, y, 0.0, 1.0);
    gl_Position = mv;

    float size = mix(1.4, 3.4, aSeed) * (uResolution.y / 900.0);
    gl_PointSize = size * (1.0 - life * 0.55) * step(0.001, uIntensity);
  }
`;

export const sparkFragment = /* glsl */ `
  // Must match the vertex stage: shared uniforms need identical precision.
  precision highp float;

  uniform float uIntensity;
  varying float vLife;
  varying float vSeed;

  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float r = length(d);
    if (r > 0.5) discard;

    float core = 1.0 - smoothstep(0.0, 0.5, r);
    float fade = smoothstep(1.0, 0.55, vLife) * smoothstep(0.0, 0.12, vLife);

    vec3 warm = mix(vec3(1.0, 0.85, 0.55), vec3(1.0, 0.62, 0.28), vSeed);
    gl_FragColor = vec4(warm * core * fade * uIntensity, core * fade * uIntensity);
  }
`;
