# Digital X — cinematic homepage

A scroll-driven rebuild of the [digital-x-marketing.com](https://www.digital-x-marketing.com/)
homepage, built around four films that the visitor scrubs rather than watches.

**Fragmentation → Intelligence → X → System → Growth.**

```
I    THE SIGNAL     a dolly through disconnected digital systems
II   THE REVEAL     the detonation blooms, HOLDS, then reverses into the X
III  THE SYSTEM     the X assembles and six disciplines unfold from it
IV   INSIDE THE X   through the core and out into one growth system
```

## Running it

```bash
npm install
npm run frames      # frame ladders, posters and player copies from media-src/
npm run dev         # http://localhost:5173
npm run build
npm run qa          # 117 checks across mobile / tablet / desktop / reduced motion
npm run singlefile  # one self-contained HTML file for sharing
```

`npm run frames` takes about five minutes and needs no system ffmpeg — the binary
comes from `@ffmpeg-installer/ffmpeg`. Run it once; the output lands in
`public/media/` and is committed.

## How the cinematic layer works

Each chapter is a tall section with a sticky 100vh stage. Scroll position drives
a **pure function** from scroll progress to film progress
(`src/cinema/chapters.ts`), and a per-frame ease chases it. Nothing autoplays:
stop scrolling and the film stops; scroll up and it runs backwards.

THE REVEAL's curve is the reason the sequence lands:

| scroll | film |
| --- | --- |
| 0.00 – 0.42 | the blast expands outward |
| 0.42 – 0.58 | **hold** — film time stops while ~67vh of scroll passes |
| 0.58 – 1.00 | the reversal, every fragment curving back into the X |

Chapters scrub a **frame sequence**, never a `<video>`. Seeking H.264 under
scroll lands on keyframes and stalls, worst on iOS. Three ladders are built:

| ladder | width | fps | used by |
| --- | --- | --- | --- |
| `sm` | 640 | 24 | first paint, phones (also carries a WebP copy) |
| `lg` | 1280 | 24 | desktop — streams in behind `sm`, swaps frame by frame |
| `xs` | 480 | 12 | the single-file preview only |

Only a window around the playhead is ever resident. The System Explorer borrows
THE SYSTEM's ladder: chapter three orbits the finished X, so selecting a
discipline scrubs to that angle and **the X really turns** — same materials,
same lighting, no second model to keep in sync.

## What is verified, and what is deliberately blank

Every factual claim on this page was read off the live site on 2026-08-20 and
lives in `src/data/content.ts` with its source noted. There are **no**
testimonials, awards, certifications, client counts, team sizes, office
addresses, revenue figures or performance statistics anywhere, because none
could be verified.

`npm run qa` enforces both directions: it fails if a verified string goes
missing, and it fails if an unverifiable claim appears.

### URLs Digital X needs to fill in

All of these are in **`src/data/site.config.ts`**, empty by default. Empty never
ships a dead link — each one falls back to something real.

| Field | While empty |
| --- | --- |
| `UNRESOLVED.auditPage` | "Analiza sajta" scrolls to the on-page audit flow |
| `UNRESOLVED.offerPage` | the Smart Website Launch CTA scrolls to the contact form |
| `UNRESOLVED.eynnaCaseStudy`, `.eynnaApp` | the Eynna Hair panel links to `/projekti` |
| `UNRESOLVED.secondBrainOs`, `.growthOs` | those panels link to `/projekti` |
| `UNRESOLVED.bookingUrl` | consultation CTAs use the on-page form |
| `UNRESOLVED.privacyPolicy`, `.termsOfService` | the footer legal links are not rendered |
| `UNRESOLVED.instagram`, `.facebook`, `.linkedin` | not rendered |
| `FORM_ENDPOINT` | both forms open a pre-filled e-mail and **say so** rather than pretending to send |
| `PAGESPEED_API_KEY` | the audit collects the URL and submits it as an enquiry |
| `OFFER_ACTIVE` | `true`. Set it to `false` the day the five-project promotion ends and the whole block disappears. |

The audit never renders a score this page did not measure, and this page
measures nothing — it collects the request and says the analysis comes back
from Digital X.

## Accessibility and reduced motion

`prefers-reduced-motion: reduce` removes the pins, the scrub and the smooth
scroller entirely. Each chapter becomes its poster still with all of its copy
visible, and every interactive section still works. All content is real HTML —
the canvases are `aria-hidden` decoration — so the cinematic layer costs the
page nothing in SEO or accessibility. The System Explorer is a real tablist
with arrow-key, Home and End navigation.

Mobile is composed deliberately rather than scaled down: shorter chapter runs,
the explorer as a snap-scrolling rail over a fixed X, and the growth path
stepped by tap instead of scrubbed.

## Layout

```
src/data/content.ts       every word on the page, with its source
src/data/site.config.ts   the blanks above
src/cinema/               ladder loading, canvas blitter, scroll director
src/render/               build-time templates → static, crawlable index.html
src/sections/             explorer, growth path, audit, forms, nav
scripts/frames.mjs        the ladder pipeline
scripts/qa.mjs            the checklist
scripts/singlefile.mjs    the shareable build
```

The page's markup is generated in Node at build time by `plugins/render-html.mjs`,
so the copy has one home (`content.ts`) and the output is still fully static.
