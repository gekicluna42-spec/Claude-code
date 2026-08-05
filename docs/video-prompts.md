# Digital X — Video Generation Prompt Pack

Companion to [`digital-x-cinematic-plan.md`](./digital-x-cinematic-plan.md).

---

## How to use this pack

**Models.** These are written for Veo 3 / Sora 2 / Kling 2.x / Runway Gen-4. All of them respond well to *cinematography* language (lens, stop, move, grade) and badly to abstract adjectives. Every prompt below leads with the shot, then the move, then the light, then the grade.

**Hard rules baked into every prompt — do not remove them:**

| Rule | Why |
|---|---|
| **No text, letters, words, logos, UI or watermarks** (except `0` and `1` in V1) | Generative models render garbled type. All real copy is live DOM text on top. |
| **Locked palette:** `#05080c` near-black navy · `#5fc9ff` ice blue · `#d9f2ff` pale ice white. No other hues. | Matches `--bg` / `--a1` / `--a2`. One stray magenta gradient and the band stops looking like the site. |
| **Pure black background, no alpha** | Composited with `mix-blend-mode: screen`. Black disappears, light adds. Avoids the VP9-alpha / HEVC-alpha cross-browser mess. |
| **No people, no faces, no hands** | Keeps the bands abstract, avoids uncanny artifacts, and sidesteps likeness issues. |
| **Slow, weighted camera. No shake, no whip pans, no strobing.** | The brand is Cormorant Garamond, not TikTok. |

**Generate longer than you need.** Ask for 1.5× the target duration and cut the best window — models drift near the end of a clip. For loops this is mandatory (see §Loop recipe).

**Shared negative prompt** — append to every generation:

```
text, letters, words, numbers other than 0 and 1, typography, captions, subtitles,
logos, watermarks, signatures, UI, interface, buttons, charts,
people, faces, hands, bodies, animals,
purple, magenta, pink, orange, red, green, yellow, rainbow, multicolour,
neon cyberpunk signage, Blade Runner city, Matrix green,
camera shake, handheld, whip pan, zoom punch, strobing, flicker, glitch artifacts,
lens dirt, heavy vignette, oversaturated, HDR halo, cartoon, anime, illustration, 3D render look,
low resolution, blurry, compression artifacts, banding, watermark
```

---

## V1 — Hero master cinematic

**Use:** Tier C/D fallback, OG/social preview, paid-ads creative
**Duration:** 10.0 s · 30 fps · 300 frames · 1280×720 · 16:9 · no loop
**Generate at:** 15 s, cut the best 10 s

> Cinematic shot from inside an infinite black void. Thousands of faintly glowing monospace digits — only the characters 0 and 1 — float suspended in a vast cylindrical cathedral of data that surrounds the camera on all sides. The digits glow ice blue with pale white-blue highlights, soft volumetric bloom around each one, thick atmospheric haze between the layers so distant digits fade into darkness.
>
> The camera performs three continuous movements with no cuts. First: a slow, heavy turntable orbit, drifting almost imperceptibly closer. Second: it accelerates forward and flies straight through the wall of digits — the digits stretch into long vertical streaks of light with heavy motion blur, the frame rolls gently four degrees, the field of view widens so the walls appear to bend around the viewer. Third: the camera decelerates hard, the streaks resolve back into crisp individual characters, and the whole formation separates outward into six distinct slowly rotating clusters that drift apart and settle.
>
> Single off-screen key light from above and behind, throwing soft volumetric god-rays through the haze. Shallow depth of field, the nearest digits melting into round bokeh. Faint anamorphic lens flare, fine 35mm film grain, deep true blacks.
>
> Colour strictly limited to near-black navy background, ice blue, and pale ice white. Shot on 35mm anamorphic, T1.4. Slow, confident, expensive. No camera shake.

**Frame-density check:** at 30 fps over 400vh of scroll travel this lands at ~12 px of scroll per frame — film-smooth. Do not deliver fewer than 240 frames.

---

## V1m — Hero master, mobile

**Use:** Tier C/D on phones
**Duration:** 10.0 s · 15 fps · 150 frames · 720×1280 · **9:16 vertical** · no loop

Same prompt as V1 with these substitutions:

- Open with: *"Vertical 9:16 composition. Cinematic shot from inside an infinite black void…"*
- Replace the third movement with: *"Third: the camera decelerates and pulls back and upward, the formation separating into six clusters stacked vertically up the frame, each drifting slowly into place."*
- Add: *"Keep the centre third of the frame comparatively empty and dark — headline typography is composited there."*

Do **not** simply crop V1 to 9:16. The Act III explode reads as a horizontal grid; on a phone it has to read vertically. This is a separate render.

---

## V2 — AI Second Brain, node galaxy

**Use:** `#second-brain` band background
**Duration:** 8 s · 30 fps · 1600×900 · 16:9 · **seamless loop**
**Generate at:** 12 s

> A vast, slowly rotating galaxy of interconnected glowing nodes suspended in absolute darkness — a neural network the scale of a solar system. Hundreds of small ice-blue points of light joined by hair-thin luminous filaments; faint pulses of brighter light travel along the filaments from node to node, continuously and irregularly. A denser, brighter core at the centre; sparse, drifting outer nodes scattered toward the edges of frame.
>
> The camera drifts slowly and continuously sideways with a gentle forward push, producing deep parallax between the near and far nodes. One unbroken move, no cuts, constant velocity.
>
> Volumetric haze, soft additive bloom, shallow depth of field with the nearest nodes softly out of focus. Pure black background, ice blue and pale ice-white light only. Calm, hypnotic, weightless, expensive.
>
> Shot on 35mm, T1.4, fine film grain, deep true blacks. Slow and steady — no shake, no acceleration.

---

## V3–V8 — The six disciplines

**Use:** `#visual-services` cards — hover on desktop, on-intersect on touch
**Duration:** 4 s each · 30 fps · 960×720 · 4:3 · **seamless loop**
**Generate at:** 6 s each

All six share this **preamble** — prepend it verbatim to each:

> Extreme macro cinematic shot in absolute darkness. Pure black background. All light is ice blue and pale ice white, no other colour. Single soft key light raking from the upper left. Volumetric haze, soft bloom, very shallow depth of field, fine 35mm film grain. The camera moves in one slow continuous push, no cuts, no shake.

### V3 — Web & E-commerce
> …Thin sheets of dark polished glass float and stack themselves into a layered architecture, edge-lit with ice blue light along every seam. Each pane slides silently into place, catching a bright specular highlight as it locks. The stack builds, holds, and the camera drifts past its edge.

### V4 — Aplikacije po mjeri
> …A slab of dark brushed metal rotates slowly in the void. Light spills from a seam running through its centre, ice blue and cold. Precision-machined chamfers catch travelling specular highlights as the slab turns. Hairline grooves in the surface glow faintly from within.

### V5 — SEO · GEO · AEO
> …A wireframe globe made of thin ice-blue latitude and longitude lines rotates slowly in darkness. Small bright points of light ignite one by one across its surface, each sending a soft ring of light rippling outward across the mesh. The globe is transparent — the far side's lines are visible through it, dimmer.

### V6 — Oglašavanje & rast
> …A perfectly flat field of tiny ice-blue points of light stretches to the horizon in darkness. A single impact at the centre sends a slow, clean shockwave rolling outward; each point rises, brightens, and settles as the wave passes through it. The camera drifts low and forward, just above the surface of the field.

### V7 — Sadržaj & Produkcija
> …The iris of a cinema lens opens slowly in absolute darkness. Precision-machined blades slide apart, each edge catching a bright ice-blue specular line. Behind the opening iris, soft volumetric light blooms outward and floods toward the camera. Anamorphic flare across the frame as it opens.

### V8 — AI Automatizacija
> …Three concentric rings of light rotate around a common centre in darkness, each at a different speed and on a different axis, like a gyroscope with no housing. The rings are thin, ice blue, machined and exact. Where they intersect, brief bright flares. It turns by itself, endlessly, with no visible mechanism driving it.

---

## V9 — Portfolio, before → after

**Use:** `#portfolio` before/after reveal, scrubbed over a short local scroll range
**Duration:** 5 s · 30 fps · 1600×900 · 16:9 · no loop

> Cinematic shot of a wide, dark, dull surface in near-total blackness — flat, matte, unlit, lifeless. A single soft blade of ice-blue light sweeps slowly across it from left to right. Everywhere the light has passed, the surface is transformed: polished, reflective, alive with fine luminous detail and specular highlights that were not there before. Everywhere it has not yet reached remains matte and dead.
>
> The wipe is slow, even and unbroken across the whole frame. The camera holds nearly still with only the faintest forward drift.
>
> Volumetric haze, soft bloom on the leading edge of the light blade, shallow depth of field. Pure black, ice blue, pale ice white only. Fine 35mm film grain, deep true blacks. Restrained and expensive.

**Wire it as:** `currentTime` mapped to the local scroll progress of the before/after component — 5 s over ~80vh is ~150 frames, comfortably smooth for a small component.

---

## V10 — Closing atmosphere

**Use:** `#kontakt` background, low opacity
**Duration:** 6 s · 30 fps · 1600×900 · 16:9 · **seamless loop**
**Generate at:** 9 s

> A vast, still, dark horizon in deep space. A single hairline of ice-blue light runs across the lower third of the frame, glowing faintly, like the first edge of a dawn that has not arrived yet. Above it, slow drifting particles of pale ice-white light rise almost imperceptibly through thick atmospheric haze. Below it, absolute black.
>
> The camera is nearly static — the slowest possible push forward, barely perceptible over the whole shot.
>
> Deep true blacks, soft volumetric glow along the horizon line, fine 35mm film grain. Pure black, ice blue, pale ice white only. Silent, patient, unresolved.

---

## Post-processing

### Seamless loop (V2, V3–V8, V10)

Generative models almost never loop cleanly. Cross-fade the tail into the head. For a source `in.mp4` longer than the target, producing an 8.0 s loop with a 0.5 s cross-fade:

```bash
ffmpeg -i in.mp4 -filter_complex "\
[0:v]trim=start=0:end=0.5,setpts=PTS-STARTPTS[head];\
[0:v]trim=start=8.0:end=8.5,setpts=PTS-STARTPTS[tail];\
[tail][head]xfade=transition=fade:duration=0.5:offset=0[blend];\
[0:v]trim=start=0.5:end=8.0,setpts=PTS-STARTPTS[body];\
[blend][body]concat=n=2:v=1:a=0[out]" \
-map "[out]" -c:v libx264 -crf 18 -pix_fmt yuv420p loop8.mp4
```

The output starts at source t=8.0 (already blending toward t=0.5) and ends at source t=8.0 — so the wrap point is continuous. Adjust `8.0`/`8.5` for 4 s loops (`4.0`/`4.5`) and 6 s loops (`6.0`/`6.5`).

### Black-point clamp (required for `mix-blend-mode: screen`)

Generative output rarely has a true 0 black; a lifted black turns into a visible grey rectangle when screen-blended over `#05080c`.

```bash
ffmpeg -i loop8.mp4 -vf "curves=all='0/0 0.06/0 0.5/0.5 1/1',eq=saturation=0.9" \
  -c:v libx264 -crf 18 -pix_fmt yuv420p clamped.mp4
```

Verify with `ffmpeg -i clamped.mp4 -vf signalstats -f null -` — `YMIN` should read 16 (limited range) or 0 (full range).

### Encode — scrubbable master (V1, V1m)

Short GOP so any seek lands near a keyframe. This is what makes Tier D usable and what keeps the WebCodecs decoder in Tier C cheap.

```bash
# AV1 — primary
ffmpeg -i hero_master.mov -vf "scale=1280:720:flags=lanczos,fps=30" \
  -c:v libsvtav1 -preset 6 -crf 34 -g 5 \
  -pix_fmt yuv420p -an hero-720.av1.mp4

# H.264 — fallback
ffmpeg -i hero_master.mov -vf "scale=1280:720:flags=lanczos,fps=30" \
  -c:v libx264 -preset veryslow -crf 23 -g 5 -keyint_min 5 -sc_threshold 0 \
  -profile:v high -pix_fmt yuv420p -movflags +faststart -an hero-720.h264.mp4
```

`-g 5` inflates the file roughly 1.6× versus a default GOP, and it is the single change that makes scroll scrubbing viable on mid-range Android. Budget for it.

### Encode — autoplay loops (V2–V10)

These are never seeked, so use a normal GOP and squeeze harder.

```bash
ffmpeg -i clamped.mp4 -vf "scale=960:720:flags=lanczos,fps=30" \
  -c:v libsvtav1 -preset 6 -crf 40 -g 60 -pix_fmt yuv420p -an card.av1.mp4

ffmpeg -i clamped.mp4 -vf "scale=960:720:flags=lanczos,fps=30" \
  -c:v libx264 -preset veryslow -crf 28 -g 60 \
  -profile:v high -pix_fmt yuv420p -movflags +faststart -an card.h264.mp4
```

### Posters

Every video needs a poster so nothing pops in and CLS stays at 0:

```bash
ffmpeg -i loop8.mp4 -vf "select=eq(n\,0),scale=960:720" -frames:v 1 -q:v 2 poster.png
avifenc --min 30 --max 40 -s 4 poster.png poster.avif
```

---

## Delivery checklist

- [ ] Every clip renders on **pure black**, `YMIN` verified at 0/16
- [ ] Zero text, logos or watermarks in any frame
- [ ] Palette holds — no hue outside near-black / ice blue / pale ice white
- [ ] Loops wrap invisibly (watch each one cycle five times before accepting)
- [ ] AV1 **and** H.264 for every asset, `<source>` ordered AV1 first
- [ ] AVIF poster for every asset
- [ ] Hero master ≥ 240 frames; mobile master rendered 9:16, not cropped
- [ ] Total video across the site ≤ 3.2 MB
- [ ] All assets served **same-origin** — CSP has no `media-src`, so a CDN host will be blocked until it is added
