# Digital X — Scroll-Driven 3D Cinematic Website

**Target:** digital-x-marketing.com → Awwwards SOTD / FWA-tier scroll experience
**Constraint:** must stay faster than the agency's own public promise (`ispod dvije sekunde`)
**Audit date:** 2026-08-05

---

## 1. What is actually on the site today

Measured, not assumed.

| Thing | Finding |
|---|---|
| Host | Vercel, `x-vercel-cache: HIT`, HTTP/2, static HTML |
| Document | 32.7 KB HTML, single page + subpages (`/audit.html`, `/shop/`, `/blog/`, `/second-brain-os.html`) |
| CSS | `/css/style.css` 41.6 KB (uncompressed), `/css/fonts.css` 1.5 KB |
| JS | `/js/main.js` 18 KB, `/js/cinema.js` 10.6 KB, Lenis 1.1.14 from **jsDelivr CDN** |
| Type | Cormorant Garamond (self-hosted woff2, subset, `font-display: optional`) + system sans |
| Palette | `--bg:#05080c` · `--a1:#5fc9ff` · `--a2:#d9f2ff` · `--muted:#9eb1c3` |
| Cinematic | Canvas **2D**, sprite-atlas of `0`/`1` glyphs on a cylinder, 3-act camera (yaw / dolly / explode) |
| Scroll zone | `#cine-zone` = `#s1` 210vh + `#s2` 210vh + `#s3` 280vh |
| Smooth scroll | Lenis, `lerp .055`, initialised **500 ms after load** |
| Images | `service-*.webp` ~73 KB each, `growthos-dashboard.jpg` 89 KB |

The creative direction is already right — restrained, dark, serif, "quiet luxury tech". **Nothing about the concept needs replacing.** What needs replacing is the *renderer*, the *choreography resolution*, and a handful of real defects.

### 1.1 Defects found (fix these regardless of the rest of the plan)

1. **`vh` units break the choreography on mobile.** `min-height:210vh` and `.pin{min-height:100vh}` re-measure when the iOS/Chrome URL bar hides, so the scroll progress function jumps mid-scrub. → `svh` for pins, `dvh`/`svh` for section heights.
2. **CSP has no `media-src`.** The policy is `default-src 'self'` with `script-src`, `style-src`, `font-src`, `img-src`, `connect-src`, `frame-src` declared — but **not** `media-src` or `worker-src`. Consequences:
   - Any `<video>` from Mux / Cloudflare Stream / Bunny / S3 will be **blocked**.
   - A `blob:` Web Worker (which is how most WebCodecs demuxers bootstrap) will be **blocked**.
   → Add `media-src 'self'` and `worker-src 'self' blob:` before shipping any media pipeline.
3. **Stylesheets are requested twice.** Both `style.css` and `fonts.css` appear once with the `media="print" onload="this.media='all'"` async trick *and* again as a plain blocking `<link>`. The second copy defeats the first.
4. **`font-display: optional` can silently drop the brand serif.** On a slow first visit the H1 renders in the system sans — for a typography-led brand that is a visual failure. → `swap` + a `size-adjust` metric-matched fallback, and `<link rel=preload>` the latin subset.
5. **The animation hard-freezes forever.** `cinema.js` sets `frozen = true` after 5 slow frames and never recovers. One GC pause during a scroll burst kills the hero for the rest of the session. → degrade (drop DPR, drop column count), never freeze.
6. **Lenis boots 500 ms late** and from a third-party CDN. The first half-second of scroll is native, then snaps into smoothing. → self-host (also satisfies `default-src 'self'`), init on first input.
7. **Act III cannot work on a phone.** `.callouts` is `repeat(3,1fr)`; six cards collapsed to one column cannot fit inside a 100vh pin. Mobile needs a *different* Act III, not a squeezed one.

---

## 2. The core decision: video, or real-time?

This is the question that decides the whole build, so it gets a real answer rather than a preference.

### 2.1 The three candidate techniques

| | Payload | Scrub quality | Sharpness | Reacts to input |
|---|---|---|---|---|
| **Scroll-scrubbed `<video>`** (`currentTime = f(scroll)`) | ~1–2 MB | **Poor on Android, unreliable on iOS** — seeking is async and snaps to keyframes | fixed res | no |
| **Image sequence** (`ImageBitmap` → canvas) | **4–20 MB** | Excellent | fixed res | no |
| **Real-time WebGL** | **~20 KB of code, 0 media bytes** | Perfect (nothing to decode) | resolution-independent | **yes** |

The scrub-vs-payload tradeoff is the classic trap: video is small but scrubs badly, frames scrub well but are huge. There is a third option that resolves it — **decode the video yourself with WebCodecs `VideoDecoder` and paint frames to canvas**. You get image-sequence scrub reliability at video payload size. `VideoDecoder` is available in Chrome/Edge 94+, Firefox 130+, and Safari 16.4+ (Safari 16.4–18.7 shipped the *video* interfaces only — which is exactly and only what we need; Safari 26 completes the API).

### 2.2 The recommendation

> **Hero cinematic = real-time WebGL. Video is used only where the content is photoreal/organic and cannot be generated procedurally.**

The reasoning is specific to this site, not general taste:

- **The hero content is procedural.** It is glowing `0`/`1` glyphs, particles, haze and light. That is exactly the class of imagery a shader generates better than a codec stores. Encoding it to video makes it *bigger, blurrier and less interactive*, and gains nothing — there is no photography in it.
- **Their own copy forbids a heavy hero.** The page sells "stranice koje se učitavaju ispod dvije sekunde". A 6–20 MB frame-sequence hero would make the homepage the slowest page the agency has ever shipped, on the exact claim they are selling. That is a credibility problem, not just a Lighthouse problem.
- **The audience is mid-range Android on 4G** (Bosnian SMB market). Video scrubbing is measurably worst on exactly that hardware.
- **WebGL scales up, video scales down.** On a 4K desktop the shader renders at native DPR; a 1280×720 video would be visibly soft behind a Cormorant Garamond H1.
- **Awards reward interactivity.** The 2026 jury pattern is scroll-*driven narrative* + pointer reactivity + custom GLSL, not a video wearing a scroll bar. Scroll-driven 3D narratives score meaningfully higher than static 3D showcases.

Video absolutely still earns its place — just not in the hero. It goes where the content is real: the six service bands, the portfolio before/after, the Second Brain band, the closing frame.

### 2.3 The render ladder (what each visitor actually gets)

Detected once at boot, in this order:

| Tier | Condition | Hero renderer | Media bytes above the fold |
|---|---|---|---|
| **A** | `prefers-reduced-motion: reduce`, or `navigator.connection.saveData`, or `effectiveType` ∈ {`slow-2g`,`2g`} | Static AVIF poster + CSS opacity/transform reveals. No canvas, no rAF. | **~40 KB** |
| **B** | WebGL2 context acquires, `deviceMemory ≥ 4` (or unknown), passes a 20-frame boot probe | **Real-time WebGL** — full 3-act choreography, pointer parallax | **0 KB** |
| **C** | WebGL2 unavailable / context lost / probe fails | **WebCodecs scrub** of the 10 s master render → canvas | ~900 KB, lazy |
| **D** | No `VideoDecoder` (Safari < 16.4, some Android WebViews) | Plain `<video autoplay muted loop playsinline>` short loop, copy fades over it | ~350 KB, lazy |

Tier B is the default and will serve the large majority. Tiers C and D exist so the experience degrades *in kind* rather than disappearing — and they reuse the **same master render**, so there is one visual language, not four.

Tier C/D also gives you the fallback asset for free: the same 10 s master is your OG/social preview video and your paid-ads creative.

---

## 3. How long should the cinematic last?

Not a taste call — derive it from the scroll geometry that already exists.

`cinema.js` measures progress as `-rect.top / (rect.height - viewportHeight)`. So the **scrub travel** of each act is `height − 100vh`:

| Act | Section height | Scrub travel |
|---|---|---|
| I — *Prisustvo koje se pamti* | 210vh | 110vh |
| II — *Ne pravimo web stranice* | 210vh | 110vh |
| III — *Šest disciplina* | 280vh | 180vh |
| **Total** | 700vh | **400vh** |

At a 900 px desktop viewport, 400vh = **3 600 px of scroll**.

**Frame density is what makes a scrub feel smooth.** Below ~10 px of scroll per frame it feels like film; above ~25 px it visibly steps.

```
frames = 3600 px ÷ 12 px-per-frame = 300 frames
300 frames ÷ 30 fps = 10.0 s
```

### → **The master cinematic is 10.0 seconds at 30 fps (300 frames), 1280×720.**

Everything else follows from that one number:

- **Mobile** uses the same master, **decimated to every 2nd frame = 150 frames.** At a ~740 px viewport and a shortened 260vh travel (see §5.3) that is ~13 px/frame — identical smoothness, half the decode work, one render to produce.
- **Do not exceed ~500vh of total scrub travel.** Past that, a pinned hero reads as a trap and bounce climbs. 400vh is the sweet spot and it is already what the site has.
- On **Tier B (WebGL)** the "duration" is notional — the shader is a pure function of scroll progress, so there is no fixed frame count and no ceiling on smoothness. The 10 s figure governs the *offline render* used by Tiers C/D and by social.

### 3.1 Duration for every other piece

| ID | Asset | Duration | Loop? | Delivered as |
|---|---|---|---|---|
| **V1** | Hero master cinematic (Tier C/D + OG + ads) | **10.0 s** @30fps | no | AV1 + H.264, 1280×720 |
| **V1m** | Hero mobile master | **10.0 s** @15fps (150 frames) | no | AV1 + H.264, 720×1280 |
| **V2** | AI Second Brain — node galaxy band | **8 s** | **yes** | AV1 + H.264, 1600×900 |
| **V3–V8** | Six discipline micro-loops | **4 s** each | **yes** | AV1 + H.264, 960×720 |
| **V9** | Portfolio before → after light wipe | **5 s** | no | AV1 + H.264, 1600×900 |
| **V10** | Closing / contact atmosphere | **6 s** | **yes** | AV1 + H.264, 1600×900 |

**Why 4 s for the service loops:** long enough to read as a shot rather than a GIF, short enough that six of them total under 900 KB, and short enough that the loop point is hard to catch. **Why 8 s for the galaxy:** slow parallax needs room before it repeats, and 8 s is the point where a viewer stops tracking the cycle.

**Total video budget across the whole site: ≤ 3.2 MB, all lazy, none above the fold.**

---

## 4. Scroll choreography — the storyboard

The existing three acts and all existing Bosnian copy are kept. What changes is what the camera and the scene actually do.

### Act I — `Prisustvo koje se pamti.` (0 → 110vh)

*Current: slow turntable orbit + slight dolly-in.*

**Upgrade.** The void resolves out of pure black over the first 8% of travel. The camera rests inside a cathedral-scale cylinder of slowly rotating binary glyphs. Add:
- A single **volumetric light shaft** from behind and above the H1, so the glyphs catch a rim light.
- **Depth of field** — nearest glyphs bokeh out, mid-plane crisp.
- Subtle **chromatic aberration** at the frame edge only (ice-blue/warm split, ≤ 1.5 px).
- The radial vignette that currently sits behind `.pin-inner` becomes a *hole punched in the fog* rather than a CSS gradient — the copy reads as lit from within the scene.

Ends on: camera has drifted 0.9 rad and 40 units closer. Nothing has "happened" yet. That restraint is the point.

### Act II — `Ne pravimo web stranice. Gradimo digitalna prisustva koja prodaju.` (110 → 220vh)

*Current: flight through the wall of code with roll + lateral sway.*

**This is the money shot — invest here.**
- Camera **accelerates forward** through the glyph wall. Glyphs velocity-stretch into vertical light trails (per-instance motion blur in the vertex shader, stretched along the view-space velocity vector).
- **Roll to ~4°** and lateral sway (already in the code — keep the values, they're good).
- **FOV widens 50° → 75°** while the dolly pushes in: a controlled dolly-zoom. The walls appear to bend around the viewer.
- At ~80% of the act, hard **deceleration**. The trails snap back into readable glyphs. A single **shockwave ripple** propagates outward from the camera through the glyph field at the exact frame the statement copy reaches full opacity.

The deceleration *is* the punctuation for the sentence. Time it to the copy, not to the scroll midpoint.

### Act III — `Šest disciplina. Jedan tim.` (220 → 400vh)

*Current: radial explode + pull back, six callouts fade in on progress thresholds.*

**Upgrade from "explode" to "resolve".** The cylinder does not scatter randomly — it **separates into six distinct constellations**, one per discipline. Each constellation drifts to the screen position of its callout card. A hairline of light is drawn from each constellation to its card as the card materialises. Camera pulls back and up; the final wide shot shows six ordered systems where there was one undifferentiated mass.

That is the argument of the section, rendered: *six disciplines, one team.*

### Act IV — the handoff (new, 30vh)

Currently the canvas simply fades (`fadeT`) and `#visual-services` cuts in. That cut is the weakest moment on the page.

**Replace with object continuity:** the six constellations settle, compress, and become the six `service-*.webp` thumbnails of `#visual-services`. Same six objects, new form. This kind of cross-section continuity is disproportionately what juries reward, and it costs one shared `IntersectionObserver` plus a FLIP transform.

### Downstream bands (video-backed)

- **`#second-brain`** — V2 galaxy loop behind the copy, `mix-blend-mode: screen`, plus a real-time pointer field that *parts the nodes* under the cursor on desktop.
- **`#visual-services`** — each card swaps its static webp for its V3–V8 loop on hover (desktop) / on intersection, one at a time (touch).
- **`#portfolio`** — V9 light-wipe drives the before→after reveal, scrubbed by a short local scroll range.
- **`#growthos-showcase`** — dashboard assembles from parts on scroll (DOM + CSS transforms, no video needed).
- **`#kontakt`** — V10 closing atmosphere, very low opacity.

**Transparency note:** do **not** ship alpha video. VP9-alpha WebM and HEVC-alpha are a cross-browser mess. The page background is `#05080c` — near black — so render every loop on pure black and composite with `mix-blend-mode: screen`. Black becomes invisible, light adds. No alpha channel, half the bytes, works everywhere.

---

## 5. Speed & responsiveness architecture

### 5.1 Budgets

| Metric | Target | Note |
|---|---|---|
| LCP — mid Android, 4G | **< 1.4 s** | must beat their own "< 2 s" claim |
| First hero pixel | < 400 ms | canvas paints before the renderer module resolves |
| Hero renderer JS (gzip) | **≤ 20 KB** | hand-rolled GLSL; **do not import Three.js** for this scene |
| Above-the-fold media | **0 bytes** on Tier B | |
| CLS | **0** | `aspect-ratio` on every media box; canvas is `position:fixed` |
| INP | < 150 ms | scroll handlers are rAF-coalesced (already correct in `cinema.js`) |
| Initial transfer | ≤ 420 KB | |
| Lighthouse mobile perf | ≥ 92 | with the WebGL hero running |

### 5.2 Loading strategy

```
inline in <head>   critical CSS for the hero pin + a 1.2 KB base64 AVIF poster
                   → first meaningful paint with zero network round-trips
preload            cormorant-garamond-500-latin.woff2  (it renders the H1)
                   hero renderer module
defer / module     hero renderer → boots, probes, picks a tier
idle               Lenis (self-hosted), main.js
IntersectionObs.   every video below the fold, rootMargin 200px, one decode at a time
never              Three.js, GSAP, any 3D loader — the scene is procedural
```

- **Kill the duplicate stylesheet links** (defect #3). Inline the ~4 KB of hero-critical CSS, load the rest async once.
- **Self-host Lenis.** Removes a third-party DNS + TLS handshake on the critical path and lets you tighten CSP back to `script-src 'self'`.
- **`content-visibility: auto`** + `contain-intrinsic-size` on every section below `#cine-zone`. On this page that alone is a large rendering-work win because the DOM is long.
- **Vercel cache headers:** the CSS/JS currently serve `max-age=0, must-revalidate`. Move to hashed filenames + `max-age=31536000, immutable`. Video and fonts too.

### 5.3 Responsiveness — desktop vs mobile are different edits, not one edit scaled

This is the part most scroll sites get wrong.

**Units.** Replace every `vh` in the cinematic zone:
```css
.cine-sec       { min-height: 210svh; }   /* was 210vh */
.cine-sec .pin  { min-height: 100svh; }   /* was 100vh */
#s3             { min-height: 280svh; }
```
Size the canvas from `visualViewport.width/height`, not `innerWidth/innerHeight`, and re-measure on `visualViewport.resize` — that is the event that actually fires when the URL bar moves.

**Choreography, by breakpoint:**

| | Desktop ≥ 1024px | Tablet 640–1023px | Mobile < 640px |
|---|---|---|---|
| Total scrub travel | 400vh | 320vh | **260vh** |
| Act III layout | 3 × 2 grid, explode-to-grid | 2 × 3 grid | **stacked reveal** — camera pulls back slowly while cards enter one at a time; no explode-to-grid |
| Pointer parallax | yes | no | **no** (do not use `deviceorientation` — iOS needs a permission prompt) |
| DPR clamp | 1.5 | 1.25 | **1.0** |
| Glyph columns | 84 | 64 | **48** |
| Post FX | DOF + bloom + CA + grain | bloom + grain | **grain only** |
| Service card loops | on hover | on intersect | on intersect, **one at a time** |

Mobile users scroll faster and with less patience — 260vh of travel is roughly the same *time* on a phone as 400vh on a desktop. Compressing the distance is what keeps the pacing identical; keeping 400vh on mobile is what makes it feel endless.

**Touch specifics:**
- No `:hover`. Gate every hover behaviour behind `@media (hover: hover) and (pointer: fine)`.
- Never scrub on `touchmove`. Read `scrollY` inside rAF only.
- Lenis `touchMultiplier` — the current `1.2` is good; do **not** enable `smoothTouch`, it fights native momentum and is a common iOS jank source.
- Tap targets ≥ 44 px; the pinned CTAs must stay above the on-screen keyboard area.

**Accessibility (also an Awwwards scoring category):**
- Tier A honours `prefers-reduced-motion` — genuinely, with no rAF loop at all.
- `aria-hidden="true"` on `#cine` (it already has `pointer-events:none`).
- All copy stays real DOM text — never render marketing copy into the canvas. This matters doubly for an agency selling **AEO**: text inside a canvas is invisible to AI answer engines.
- Visible focus rings; pinned sections must not trap keyboard navigation.

### 5.4 CSP changes required before shipping

```
media-src  'self';
worker-src 'self' blob:;
script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://*.google-analytics.com blob:;
```
(`blob:` on `script-src`/`worker-src` is needed only if the WebCodecs demuxer bootstraps a blob worker — verify with the library you pick and drop it if not. Removing `https://cdn.jsdelivr.net` becomes possible once Lenis is self-hosted.)

---

## 6. Build phases

| Phase | Work | Ship risk |
|---|---|---|
| **0 — Fixes** | `svh` units, CSP `media-src`/`worker-src`, de-duplicate stylesheets, font-display, self-host Lenis, remove the hard-freeze | none — pure wins, ship immediately |
| **1 — Renderer swap** | Canvas 2D → WebGL2, same 3-act choreography, same copy. Tier detection + Tier A path. | medium — keep `cinema.js` behind a flag until parity is confirmed |
| **2 — Choreography** | Act II dolly-zoom + trails + shockwave; Act III constellation resolve; Act IV handoff | low — additive |
| **3 — Offline render** | Render the 10 s / 300-frame master out of the same WebGL scene → V1, V1m. Build Tiers C/D. | low |
| **4 — Video bands** | Generate V2–V10, wire IntersectionObserver playback, screen-blend compositing | low |
| **5 — Polish** | Perf pass on a real mid-range Android, Lighthouse, reduced-motion audit, submit | — |

Phase 3 is worth calling out: **render the fallback video out of the WebGL scene itself** (headless Chrome + `captureStream`, or step the uniform manually and read pixels). One scene definition, one visual language, and the fallback is guaranteed to match the real thing frame for frame. AI-generated video is for the *photoreal* bands (V2–V10), not for the hero.

---

## 7. Video generation prompts

→ **[`video-prompts.md`](./video-prompts.md)** — copy-paste prompt pack for V1–V10, with negative prompts, model notes, and the ffmpeg encode + seamless-loop recipes.

---

## 8. Summary of the recommendation

1. **Keep the concept and the copy.** They're already good.
2. **Hero is real-time WebGL, not video** — the content is procedural, video would be bigger, blurrier, less interactive, and would break the agency's own speed claim.
3. **The master cinematic is 10.0 s / 300 frames @ 30 fps**, derived from the 400vh of scrub travel already in the markup. Mobile decimates the same master to 150 frames over 260vh.
4. **Video is for the photoreal bands** — Second Brain galaxy (8 s loop), six service loops (4 s each), portfolio wipe (5 s), closing (6 s loop). Total ≤ 3.2 MB, all lazy, all black-background + `mix-blend-mode: screen`, no alpha channel.
5. **Four-tier render ladder** so the experience degrades in kind, never disappears — and all four tiers share one master render.
6. **Desktop and mobile get different choreography**, not the same choreography scaled: 400vh vs 260vh, explode-to-grid vs stacked reveal.
7. **Fix the seven defects in §1.1 first** — especially the `vh`→`svh` bug and the missing `media-src`, which will block the media pipeline outright.

---

### Sources

- [Why Are Immersive Experiences Dominating the 2026 Awwwards? — Digital Strategy Force](https://digitalstrategyforce.com/journal/why-are-immersive-experiences-dominating-the-2026-awwwards/)
- [Best Three.js Websites 2026: 8 Sites + Techniques — Utsubo](https://www.utsubo.com/blog/best-threejs-websites-2026)
- [Best WebGL Websites — Awwwards](https://www.awwwards.com/websites/webgl/)
- [WebCodecs: Browser Support, Features, Use Cases](https://www.testmuai.com/learning-hub/webcodecs-browser-support/)
- [A Tutorial: WebCodecs Video Scroll Synchronization — Keng Lim](https://lionkeng.medium.com/a-tutorial-webcodecs-video-scroll-synchronization-8b251e1a1708)
- [The secrets for an optimized scroll-based HTML5 video — Yoann Gueny](https://blog.yoanngueny.com/the-secrets-for-an-optimized-scroll-based-html5-video/)
- [Scrubbing videos using JavaScript — Muffin Man](https://muffinman.io/blog/scrubbing-videos-using-javascript/)
