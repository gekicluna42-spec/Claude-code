# Digital X — cinematic homepage

A scroll-driven rebuild of the [digital-x-marketing.com](https://www.digital-x-marketing.com/)
homepage. It opens on a single continuous film — 768 frames, four clips played
as one reel — that the visitor scrubs rather than watches. **Nothing else is on
screen while it runs.** No headings, no copy, no navigation. The page begins
speaking only once the film has played its last frame.

**Fragmentation → Intelligence → X → System → Growth.**

```
I    THE SIGNAL     a dolly through disconnected digital systems
II   THE REVEAL     the detonation blooms, HOLDS, then reverses into the X
III  THE SYSTEM     the X assembles and six disciplines unfold from it
IV   INSIDE THE X   through the core and out into one growth system
                    ↓
                    the title lands on the final frame
```

The four clips were generated as a chain — each starts on the previous one's
final frame — so there is no cut to hide and no reason to present them as four
chapters.

## Running it

```bash
npm install
npm run frames      # frame ladders, posters and player copies from media-src/
npm run dev         # http://localhost:5173
npm run build
npm run qa          # 139 checks across mobile / tablet / desktop / reduced motion
npm run singlefile  # one self-contained HTML file for sharing
```

`npm run frames` takes about five minutes and needs no system ffmpeg — the binary
comes from `@ffmpeg-installer/ffmpeg`. Run it once; the output lands in
`public/media/` and is committed.

## How the cinematic layer works

One tall section with a sticky 100vh stage — 1900vh on desktop, 1200vh on a
phone. Scroll position drives a **pure function** from scroll progress to frame
(`src/cinema/timeline.ts`), and a per-frame ease chases it. Nothing autoplays:
stop scrolling and the film stops; scroll up and it runs backwards.

Pacing lives in one list of (progress, frame) keys, which the runtime
interpolates. That is roughly **2.2vh of scroll per frame** — about half the
speed of a conventional scroll-scrub — and it makes the hold trivial to express:
two keys with the same frame.

| scroll | film |
| --- | --- |
| 0.000 – 0.225 | I — the dolly through disconnected systems |
| 0.225 – 0.360 | II — the blast expands to its widest |
| 0.360 – 0.430 | **HOLD** — 133vh of scroll, zero frames |
| 0.430 – 0.550 | the reversal, slower than the bloom |
| 0.550 – 0.750 | III — the X assembles, six systems unfold |
| 0.750 – 0.940 | IV — through the core and out the other side |
| 0.940 – 1.000 | the film is over; the title arrives |

Because the hold is a position rather than a timed animation, scrolling back up
runs the whole thing in reverse through it.

The film scrubs a **frame sequence**, never a `<video>`. Seeking H.264 under
scroll lands on keyframes and stalls, worst on iOS. Three ladders are built:

| ladder | width | fps | used by |
| --- | --- | --- | --- |
| `sm` | 640 | 24 | first paint, phones (also carries a WebP copy) |
| `lg` | 1280 | 24 | desktop — streams in behind `sm`, swaps frame by frame |
| `xs` | 480 | 12 | the single-file preview only |

`FilmReel` stitches the four per-clip ladders into one 0..767 index, warming
across each seam so the joins are invisible in both directions.

The System Explorer borrows THE SYSTEM's ladder: that clip orbits the finished
X, so selecting a discipline scrubs to that angle and **the X really turns** —
same materials, same lighting, no second model to keep in sync.

## Keeping the film ahead of the visitor

There is nothing else on screen during the film, so a stall is not a blemish —
it is the whole experience breaking. Three mechanisms, in the order they matter:

1. **Blocking.** The opening clip loads in full behind the curtain, with a real
   percentage. The first scrub has to be smooth from the first pixel of movement.
2. **Background fill.** The remaining three clips are fetched in order at low
   priority while the visitor watches the first, yielding whenever the playhead
   has requests of its own outstanding. A hairline at the top of the viewport
   shows how much has arrived — without it, a slow connection is
   indistinguishable from a broken page.
3. **Window.** The director keeps warming frames around the playhead at high
   priority, so it always outranks the filler.

The narrow ladder is retained in full rather than evicted: about 12 MB of
encoded AVIF across the whole film, which means scrolling back up through
1900vh never re-fetches a frame. The wide ladder stays windowed, where the same
retention would mean much heavier decodes.

If frames do fall behind, the reel falls back to the nearest resident frame
rather than blanking — a scrub that is briefly coarse, never a hole.

## The content gate

`film-running` sits on `<html>` until the last frame has played. While it is
there the nav's links and CTA are `visibility: hidden` as well as faded, so a
keyboard or screen-reader visitor is not handed a menu nobody can see. Only the
brand mark, a segment marker, a progress rail and **Preskoči film** remain.

No page content is hidden by this — the sections below are untouched and fully
in the DOM. The `<h1>` is in the markup from the start, so a crawler and a
reader with JavaScript off both get it immediately; it is the film that hides
it, and only while the film is running. A watchdog lifts the gate if the film
never finishes, so a failed reel can never trap the visitor on a page with no
way out.

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

`prefers-reduced-motion: reduce` removes the pin, the scrub, the smooth scroller
and the 1900vh of scroll entirely. The film becomes its four stills as a
filmstrip, the hero is shown immediately rather than gated behind a film that is
never going to play, and every interactive section still works. All content is real HTML —
the canvases are `aria-hidden` decoration — so the cinematic layer costs the
page nothing in SEO or accessibility. The System Explorer is a real tablist
with arrow-key, Home and End navigation.

Mobile is composed deliberately rather than scaled down: a shorter film run
(1200vh), the hero anchored to the bottom under a vertical scrim, the explorer
as a snap-scrolling rail over a fixed X, and the growth path stepped by tap
instead of scrubbed.

## Layout

```
src/data/content.ts       every word on the page, with its source
src/data/site.config.ts   the blanks above
src/cinema/timeline.ts    the film's pacing: (progress, frame) keys, incl. the hold
src/cinema/reel.ts        four clip ladders stitched into one 0..767 index
src/cinema/preloader.ts   background fill, so the film stays ahead of the visitor
src/cinema/director.ts    scroll → film time, and the content gate
src/render/               build-time templates → static, crawlable index.html
src/sections/             explorer, growth path, audit, forms, nav
scripts/frames.mjs        the ladder pipeline
scripts/qa.mjs            the checklist
scripts/singlefile.mjs    the shareable build
```

The page's markup is generated in Node at build time by `plugins/render-html.mjs`,
so the copy has one home (`content.ts`) and the output is still fully static.
