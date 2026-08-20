/**
 * The film: four clips played as one continuous 768-frame sequence.
 *
 * They were generated as a chain — each clip starts on the previous one's final
 * frame — so there is no cut to hide. Treating them as one reel rather than
 * four chapters is what the material was always asking for.
 *
 * Pacing lives in KEYS: a list of (scroll progress, frame) pairs that the
 * runtime interpolates between. Expressing it this way makes two things true
 * that a per-clip duration cannot:
 *
 *   - a HOLD is just two keys with the same frame, so the detonation stops in
 *     the air while the visitor keeps scrolling, and scrolling back up runs it
 *     in reverse — it is a position, never a timed animation;
 *   - pacing is readable. The gap between two keys is how much scroll that
 *     stretch of film costs, so slowing a moment down is one number.
 */

/** Frames per clip, in order. All four are 192 frames at 24fps. */
export const SEGMENTS = [
  { id: 'signal', numeral: 'I', title: 'The Signal', from: 0, to: 191 },
  { id: 'reveal', numeral: 'II', title: 'The Reveal', from: 192, to: 383 },
  { id: 'system', numeral: 'III', title: 'The System', from: 384, to: 575 },
  { id: 'inside', numeral: 'IV', title: 'Inside the X', from: 576, to: 767 },
] as const;

export const TOTAL_FRAMES = 768;

/** The widest point of the detonation, measured off the clip: frame 107 of it. */
const PEAK = 192 + 107;

/**
 * Scroll progress → frame.
 *
 * Roughly 2.2vh of scroll per frame across the whole reel, which is about
 * twice as slow as a conventional scroll-scrub. The reversal is slower still,
 * and the hold costs 133vh of scroll for no frames at all.
 *
 * The last key pair is not film: once frame 767 is reached at 0.94, the final
 * shot holds while the hero title lands on it. Nothing on this page is allowed
 * to appear before that point.
 */
export const KEYS: { at: number; frame: number }[] = [
  { at: 0.0, frame: 0 },
  { at: 0.225, frame: 191 }, // I — the dolly through disconnected systems
  { at: 0.36, frame: PEAK }, // II — the blast expands to its widest
  { at: 0.43, frame: PEAK }, //      HOLD: 133vh of scroll, zero frames
  { at: 0.55, frame: 383 }, //       the reversal, slower than the bloom
  { at: 0.75, frame: 575 }, // III — the X assembles, six systems unfold
  { at: 0.94, frame: 767 }, // IV — through the core, out the other side
  { at: 1.0, frame: 767 }, //        the film is over; the title arrives
];

/** Progress at which the film has played its last frame. */
export const FILM_END = 0.94;

/** Total scroll the film occupies. Deliberately long — this is the experience. */
export const SCROLL_VH = 1900;
export const SCROLL_VH_MOBILE = 1200;

/** Interpolates KEYS. Pure: the same progress always yields the same frame. */
export function frameAt(progress: number): number {
  const p = progress < 0 ? 0 : progress > 1 ? 1 : progress;
  for (let i = 1; i < KEYS.length; i++) {
    const a = KEYS[i - 1]!;
    const b = KEYS[i]!;
    if (p > b.at) continue;
    const span = b.at - a.at;
    if (span <= 0) return b.frame;
    return a.frame + ((p - a.at) / span) * (b.frame - a.frame);
  }
  return KEYS[KEYS.length - 1]!.frame;
}

/** The reverse, used by the skip control and by the QA harness. */
export function progressAtFrame(frame: number): number {
  for (let i = 1; i < KEYS.length; i++) {
    const a = KEYS[i - 1]!;
    const b = KEYS[i]!;
    if (frame > b.frame) continue;
    const span = b.frame - a.frame;
    if (span <= 0) return a.at;
    return a.at + ((frame - a.frame) / span) * (b.at - a.at);
  }
  return 1;
}

/** Which clip a global frame index belongs to. */
export function segmentOf(frame: number) {
  for (const segment of SEGMENTS) {
    if (frame <= segment.to) return segment;
  }
  return SEGMENTS[SEGMENTS.length - 1]!;
}

/**
 * The stretch of THE SYSTEM in which the X is whole and centred, in that
 * clip's own frame numbers. The System Explorer scrubs inside this range, so
 * selecting a discipline rotates the real structure rather than a facsimile.
 */
export const EXPLORER_RANGE: [number, number] = [20, 72];
