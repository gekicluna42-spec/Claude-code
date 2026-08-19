# DIP Studio — cinematic homepage

A scroll-driven redesign of [dipstudio.ba](https://www.dipstudio.ba/): one
wedding moment that transforms as you scroll, from the quiet before the first
dance to the full DIP Studio production.

**Anticipation → First dance → Cloud → Spark → Spectacle.**

## Running it

```bash
npm install
npm run frames    # frame ladders + player copies from media-src/hero-clip.mp4
npm run media     # crops and posters from media-src/master-hero.png
npm run dev       # http://localhost:5173
npm run build
npm run qa        # 58 automated checks across mobile / tablet / desktop
```

## What DIP Studio needs to fill in

Everything factual on this site comes from dipstudio.ba. Four things could not
be retrieved and are deliberately left blank rather than invented — all in one
file, `src/data/site.config.ts`:

| Field | Effect while empty |
| --- | --- |
| `contact.phone`, `contact.email` | not rendered in the footer |
| `contact.instagramHandle` | the whole Instagram section is hidden |
| `contact.facebookUrl`, `contact.tiktokUrl` | not rendered |
| `formEndpoint` | the booking form falls back to a pre-filled e-mail, and tells the visitor plainly if neither channel is set |
| `realProjects` | the gallery shows this site's cinematic renders, labelled as renders |

Set `formEndpoint` to any endpoint that accepts a JSON POST (Formspree,
Netlify Forms, your own handler). The payload keys are the form field names
plus `builderMoment` / `builderFeeling` / `builderEffects` from the moment
builder.

**The site never claims a date is available.** The booking flow collects an
inquiry and says so; do not add availability language without a real calendar
behind it.

## How the hero works

The hero scrubs **real footage** — `media-src/hero-clip.mp4` (1280×720, 10 s,
24 fps) — as a frame sequence rather than by seeking a video, because seeking
under scroll stalls on keyframes (worst on iOS). `npm run frames` produces two
ladders: a 480-wide one that loads first so scrubbing responds immediately, and
a 1280-wide one that streams in behind it, plus muted MP4/WebM copies for the
in-page player and the poster frames.

`src/hero/` then treats the footage as the subject:

- `timeline.ts` — the five acts, in the order the footage actually shows them:
  iščekivanje → oblak → prskalice → prvi ples → spektakl. Scene state is a
  **pure function of scroll progress**, which is why scrolling up rewinds the
  moment exactly. The procedural fog / spark / star / beam layers sit at zero
  here — the footage already contains those effects, and doubling them would
  read as fake.
- `shaders.ts` — a virtual camera (crop, parallax, defocus), a film grade,
  bloom, vignette and grain over the footage.
- `sources.ts` — `createFrameSequenceSource` (the default, shared between the
  hero and the effect previews via a ref-counted cache), plus
  `createVideoSource` and `createImageSource` behind the same interface.

## Effect previews

"Pogledaj efekat" opens a panel that plays the segment of the clip where that
effect actually happens — low fog, cold sparks, ambient light with the star
ceiling, laser beams. The other ten services are **not** in the footage, so
they open the same panel with a still and their own copy; nothing invents
motion for a 360 booth or a neon sign. Every panel says so:
*"Kinematografski prikaz — nije snimak stvarnog događaja."*

It never initialises under `prefers-reduced-motion` or without WebGL — the
static hero image is already in the DOM and simply stays. On phones it runs a
shorter sequence with fewer particles and a lower pixel-ratio cap.

See `docs/generation.md` for the media generation sheet and the current
blocker on downloading generated assets.

## Structure

```
index.html                  homepage — 10 sections
usluge/*/index.html         four SEO service pages
src/data/                   all factual content (services, config, media manifest)
src/hero/                   the scroll-scrubbed cinematic engine
src/sections/               library, builder, compare, gallery, social, about, catalog
src/booking/                the booking / inquiry flow
scripts/media.mjs           image derivatives (AVIF + WebP + JPEG, 3 widths)
scripts/qa.mjs              puppeteer QA across three viewports
```

## Content rules

Nothing on this site states a price, a review, a client count, an award, a
certification, an equipment specification, availability, a safety claim or a
piece of business history that DIP Studio has not published. Service names and
their one-line descriptions are verbatim from dipstudio.ba. Cinematic imagery
is labelled as a render wherever it appears in a gallery context.

## Shareable single-file preview

```bash
npx vite build --config vite.preview.config.ts
node scripts/singlefile.mjs      # → preview/dip-studio-preview.html
```

Bakes the homepage into one self-contained HTML file — script, stylesheet,
latin/latin-ext fonts and every image inlined as data URIs — for sharing where
a static host is not available. The service pages do not exist inside a single
file, so their links point at the on-page service catalog instead.
