# Cinematic media — generation sheet

Everything on the site currently renders from **one master frame**
(`media-src/master-hero.png`, 1672×941). The hero engine builds all five acts
from it with a virtual camera, so the site is complete without any further
generation.

This document exists so the next pass — real act keyframes and the payoff
clip — can be run exactly, without re-deriving anything.

---

## Status

| Step | State |
| --- | --- |
| Master frame uploaded to Higgsfield | done — `media_id 00335862-481c-4c49-a9b7-48da02f52dbb` |
| Consistency test (Act 01, Seedream 5 Pro, 2K) | generated, **3 credits spent** — job `6aa4ff25-a93f-4926-b517-aec674c0ab89` |
| Remaining 14 keyframes | **not run** |
| Payoff clip | **not run** |

### Why the pass stopped

Generated assets are served from `d8j0ntlcm91z4.cloudfront.net` (and inputs
from `d2ol7oe51mr4n9.cloudfront.net`). Both hosts are **denied by this
environment's egress policy**, so nothing generated can be downloaded into the
repository:

```
gateway answered 403 to CONNECT — host d8j0ntlcm91z4.cloudfront.net:443
```

Spending the remaining credits would produce assets that cannot be retrieved.
Unblock by allowlisting those two hosts for the environment (or by downloading
the results manually into `public/media/`), then run the sheet below.

---

## Costs (preflighted live, Seedance 2.5, 16:9, no audio)

| Configuration | Credits |
| --- | --- |
| 1080p / 8s | 72 |
| 720p / 8s | 52 |
| 720p / 5s | 32.5 |
| 480p / 8s | 20 |
| Seedream 5 Pro image, 2K | 3 |
| Seedream 4.5 image | 1 |

Note: **Seedance 2.0 is not in the catalog** — 2.5 is the current model.

---

## Keyframes — 15 frames, 3 per act

Model `seedream_v5_pro`, `resolution: "2k"`, `aspect_ratio: "16:9"`,
`medias: [{ role: "image_references", value: "<master media_id>" }]`.

Every prompt must open with the consistency clause so the venue, the couple,
their clothing, the floor and the floral styling hold across the sequence:

> Photorealistic cinematic still of the SAME wedding venue and the SAME couple
> as the reference image — identical architecture, identical dark polished
> stone floor, identical ivory floral arrangements, identical wardrobe (groom
> in a dark suit, bride in a full ivory gown), identical warm lighting
> language. 35mm anamorphic look, cinematic grade, fine film grain, no text,
> no logos, no watermarks.

Then append the shot description:

| # | Key | Shot |
| --- | --- | --- |
| 01a | `act-01-anticipation-a` | Empty, perfectly prepared dance floor. No couple, no fog, no sparks, no beams. Tables glow softly. Quiet anticipation. |
| 01b | `act-01-anticipation-b` | Same room, guests arriving in the distance, still no effects. Camera at the edge of the floor. |
| 01c | `act-01-anticipation-c` | The couple steps into the centre of the empty floor. Warm low-key light only. |
| 02a | `act-02-first-dance-a` | The couple in hold, beginning the first dance. Medium shot. Light still restrained. |
| 02b | `act-02-first-dance-b` | Same dance, camera orbited ~25° left, lighting slightly more dramatic. |
| 02c | `act-02-first-dance-c` | Orbit ~50°, the couple pausing at the centre of the floor. |
| 03a | `act-03-cloud-a` | Low fog begins to spread across the floor around them. Physically believable, ground-hugging. |
| 03b | `act-03-cloud-b` | Fog covers the floor, camera lower, the bride's gown moving through it. |
| 03c | `act-03-cloud-c` | The floor has disappeared; the couple appears to dance above a cloud layer. |
| 04a | `act-04-spark-a` | Two cold spark fountains ignite symmetrically at the edges of the floor. |
| 04b | `act-04-spark-b` | Four fountains, controlled cinematic orbit, the couple still the emotional centre. |
| 04c | `act-04-spark-c` | Full symmetrical spark corridor — the framing of the master image. |
| 05a | `act-05-spectacle-a` | Ambient lighting activates, a star ceiling appears overhead. |
| 05b | `act-05-spectacle-b` | Subtle laser beams move through the space, guests reacting naturally. |
| 05c | `act-05-spectacle-c` | Final wide pull-back on the complete production. (The master image already serves this frame.) |

Depict only effects that correspond to real DIP Studio services: low fog,
sparklers, fireworks, lasers, ambient lighting and the star ceiling. No
impossible or unsafe pyrotechnic behaviour.

Cost: 14 × 3 = **42 credits** (01a is already generated).

## Payoff clip

```
model            seedance_2_5
mode             omni_reference
start_image      act-05-spectacle-b keyframe
resolution       720p          (1080p = 72 credits if the budget allows)
duration         8
aspect_ratio     16:9
generate_audio   false
```

Prompt: *the camera pulls slowly backwards across the transformed venue —
low fog on the floor, spark fountains settling, star ceiling and beams alive,
guests reacting — ending on an extraordinary wide cinematic frame that holds.*

Cost: **52 credits** at 720p.

---

## Wiring the results in

1. Drop the downloaded frames into `media-src/` and add them to the `CROPS` /
   source list in `scripts/media.mjs` (or copy them straight into
   `public/media/` as `<key>-{480,800,1200}.{avif,webp,jpg}`).
2. Repoint the manifest — `src/data/media.ts` — one line per key:
   `'act-03-cloud-b': { base: 'act-03-cloud-b', alt: '…', ratio: 16 / 9 }`.
3. For the clip, pass it to the hero: in `src/main.ts`,
   `mountHero({ imageUrl: '/media/hero-master-2200.jpg', videoUrl: '/media/act-05.mp4' })`.
   `createVideoSource` already scrubs it by scroll — no other change is needed.
4. `npm run media && npm run build && npm run qa`.
