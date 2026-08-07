# Digital X — scroll-driven cinematic

A scroll-scrubbed hero built from two supplied 3D renders of the Digital X
logo stage. `index.html` is self-contained: no CDN, no framework, no build
step. Open it over HTTP (byte-range requests are required for video seeking
— `file://` will not scrub).

```
node site/verify.mjs      # serves the page, drives real scroll, asserts 18 checks
```

## The film

The two source clips are the same set and cut together as one master:

| | source | role |
|---|---|---|
| 0.0 – 8.0 s | clip 18 | the build — logo resolves, splits, HUD panels fly in |
| 7.5 – 15.5 s | clip 21 | the hold — panel wall assembled, slow camera drift |

They are joined with a 0.5 s cross-dissolve at 7.5 s, giving **15.5 s /
372 frames at 24 fps**. Desktop spends 460 svh of scroll on it (≈ 8.7 px per
frame), mobile 380 svh.

## Asset ladder

| file | use | size |
|---|---|---|
| `x-proxy-480.mp4` | 480×270 — scrubbable within a few hundred ms of first paint | 816 KB |
| `x-master-960.mp4` | 960×540 — mobile master | 3.0 MB |
| `x-master-1280.mp4` | 1280×720 — desktop master | 6.1 MB |
| `x-poster.jpg` / `-sm` | still tier and `<video poster>` | 154 KB |

The proxy carries the first paint. A master is fetched after `load`, and
only swaps in once it is buffered end-to-end **and** the proxy's median seek
latency has stayed under 90 ms — a device that cannot seek quickly is never
handed the heavier file.

Encoded with a short GOP, which is what makes the scrub cheap:

```sh
ffmpeg -i master.mp4 -vf "scale=1280:720,hqdn3d=2:1.5:3:3" \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 30 \
  -g 6 -keyint_min 6 -sc_threshold 0 -bf 0 \
  -preset medium -movflags +faststart -an x-master-1280.mp4
```

`-g 6 -bf 0` means any seek decodes at most five frames from the nearest
keyframe. `hqdn3d` is worth ~20 % on this footage — the set is dark and
grainy, and the grain is what the encoder spends bits on. VP9 was measured
and rejected: at the same short GOP it came out at 15 MB against H.264's
6.1 MB, because VP9's efficiency depends on the alt-ref frames a short GOP
removes.

## Why it feels smooth

1. **Scroll is never hijacked.** The page reads `pageYOffset`; it does not
   override the scroller. Trackpad momentum, keyboard, scrollbar dragging
   and assistive tech all behave normally.

2. **The scrub value is smoothed, not the page.** A follower chases raw
   scroll progress with `s += (t - s) * (1 - exp(-9 * dt))` — frame-rate
   independent, so it feels identical at 60, 90 and 120 Hz and degrades
   gracefully across a dropped frame instead of lurching.

3. **Seeks are coalesced, never queued.** A new `currentTime` is issued only
   after the previous one has actually presented a frame
   (`requestVideoFrameCallback`, with a `seeked` fallback and a 400 ms
   watchdog). Firing a seek per animation frame is what makes naive scrub
   video stutter: the decoder falls behind and every seek lands late. Here
   the decoder is asked for one frame at a time, always the newest one the
   scroll has asked for.

## Tiers

The gate runs inline in `<head>`, before first paint, and flags
`<html class="js still">`:

- **still** — reduced motion, Save-Data, or no H.264. The pin is flattened,
  the poster shows, and every act is laid out as ordinary readable content.
- **no JS** — acts default to `opacity: 1`; only `html.js` allows the engine
  to hide them. A scripting failure degrades to the full text, never a blank
  pinned stage.

Both were regressions caught by `verify.mjs` rather than reasoned about:
the first draft left non-H.264 browsers with 460 svh of invisible copy.

## Mobile is a different edit

Portrait keeps the film's 16:9 composition in a band and puts the copy
underneath it, rather than cropping. The panel wall spans the full frame —
a 9:16 crop throws away the six panels that Act III is about. Act III also
becomes a compact stacked list instead of a 3 × 2 grid, because six
descriptive cards cannot fit a phone viewport at one column.

Every height in the cinematic resolves from `svh`, never `vh`: `vh`
re-measures when the mobile URL bar hides, which jumps the scrub mid-scroll.
