# DIP Studio — cinematic homepage

A scroll-driven redesign of [dipstudio.ba](https://www.dipstudio.ba/): one
wedding moment that transforms as you scroll, from the quiet before the first
dance to the full DIP Studio production.

**Anticipation → First dance → Cloud → Spark → Spectacle.**

## Running it

```bash
npm install
npm run media     # regenerate images from media-src/master-hero.png
npm run dev       # http://localhost:5173
npm run build
npm run qa        # 42 automated checks across mobile / tablet / desktop
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

`src/hero/` renders the five acts from a single master frame:

- `timeline.ts` — the acts. Scene state is a **pure function of scroll
  progress**, which is why scrolling up rewinds the moment exactly.
- `shaders.ts` — a virtual camera (crop, parallax by depth, defocus), a film
  grade, and the effect layers: low fog, light beams, star ceiling, bloom.
- `sparks.ts` — cold spark fountains as additive GPU particles.
- `sources.ts` — `createImageSource` today, `createVideoSource` for when the
  generated clip lands. Same interface, so swapping is a one-line change.

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
