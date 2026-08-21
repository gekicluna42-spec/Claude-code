/**
 * The hero film.
 *
 * TWO CONFIGURATIONS live here, and exactly one is active. The Seedance master
 * is generated and paid for, but Higgsfield serves results from a CDN this
 * session's egress policy denies, so its bytes are not in media-src/ yet. Until
 * they are, the four-clip reel below stays the hero and the site keeps working.
 * Swapping is: drop signal-engine.mp4 in, flip the `build` flags in
 * scripts/chapters.mjs, run `npm run frames`, and move ACTIVE to SIGNAL_ENGINE.
 *
 * Pacing lives in KEYS: a list of (scroll progress, frame) pairs the runtime
 * interpolates. Expressing it this way makes two things true that a duration
 * cannot:
 *
 *   - a HOLD is just two keys with the same frame, so the camera can stop at
 *     the threshold of the X while the visitor keeps scrolling, and scrolling
 *     back up runs it in reverse — it is a position, never a timed animation;
 *   - pacing is readable. The gap between two keys is what that stretch of
 *     film costs in scroll, so slowing a beat down is one number.
 */

interface FilmConfig {
  /** Clips played as one reel, in order. */
  clips: readonly string[];
  /** Frames the KEYS below are numbered in. */
  totalFrames: number;
  /** Beats of the flight. These name the HUD marker and nothing else — no copy
   *  is ever drawn over the picture. */
  segments: readonly { id: string; numeral: string; title: string; from: number; to: number }[];
  keys: readonly { at: number; frame: number }[];
  filmEnd: number;
  scrollVh: number;
  scrollVhMobile: number;
}

/**
 * The Seedance master: one 16-second flight, 160 frames, 520vh.
 *
 * About 2.8vh of scroll per frame, roughly a third the speed of a conventional
 * scroll-scrub. The threshold hold costs 35vh and no frames at all: the camera
 * sits at the mouth of the X before going in.
 */
const SIGNAL_ENGINE: FilmConfig = {
  clips: ['signal-engine'],
  totalFrames: 160,
  segments: [
    { id: 'signal', numeral: '01', title: 'Signal', from: 0, to: 29 },
    { id: 'core', numeral: '02', title: 'X Core', from: 30, to: 59 },
    { id: 'intelligence', numeral: '03', title: 'Intelligence', from: 60, to: 99 },
    { id: 'authority', numeral: '04', title: 'Authority', from: 100, to: 129 },
    { id: 'demand', numeral: '05', title: 'Demand', from: 130, to: 159 },
  ],
  keys: [
    { at: 0.0, frame: 0 },
    { at: 0.163, frame: 29 }, // 01 signals organise and converge
    { at: 0.317, frame: 55 }, // 02 the X Core resolves; camera at the threshold
    { at: 0.385, frame: 55 }, //    HOLD: 35vh of scroll, zero frames
    { at: 0.606, frame: 99 }, // 03 inside — chaos becomes structured intelligence
    { at: 0.763, frame: 129 }, // 04 the authority constellation opens out
    { at: 0.92, frame: 159 }, // 05 particles rebuild the completed X
    { at: 1.0, frame: 159 }, //    the film is over; the title arrives
  ],
  filmEnd: 0.92,
  scrollVh: 520,
  scrollVhMobile: 380,
};

/** The four 8-second clips played as one 768-frame reel. Active today. */
const FOUR_CLIP_REEL: FilmConfig = {
  clips: ['signal', 'reveal', 'system', 'inside'],
  totalFrames: 768,
  segments: [
    { id: 'signal', numeral: 'I', title: 'The Signal', from: 0, to: 191 },
    { id: 'reveal', numeral: 'II', title: 'The Reveal', from: 192, to: 383 },
    { id: 'system', numeral: 'III', title: 'The System', from: 384, to: 575 },
    { id: 'inside', numeral: 'IV', title: 'Inside the X', from: 576, to: 767 },
  ],
  keys: [
    { at: 0.0, frame: 0 },
    { at: 0.225, frame: 191 },
    { at: 0.36, frame: 299 }, // the blast expands to its widest
    { at: 0.43, frame: 299 }, // HOLD
    { at: 0.55, frame: 383 },
    { at: 0.75, frame: 575 },
    { at: 0.94, frame: 767 },
    { at: 1.0, frame: 767 },
  ],
  filmEnd: 0.94,
  scrollVh: 1900,
  scrollVhMobile: 1200,
};

const ACTIVE: FilmConfig = FOUR_CLIP_REEL;

export const SEGMENTS = ACTIVE.segments;
export const TOTAL_FRAMES = ACTIVE.totalFrames;
export const HERO_CLIPS = ACTIVE.clips;
export const KEYS = ACTIVE.keys;
export const FILM_END = ACTIVE.filmEnd;
export const SCROLL_VH = ACTIVE.scrollVh;
export const SCROLL_VH_MOBILE = ACTIVE.scrollVhMobile;

/** Referenced so the pending configuration cannot silently rot. */
export const PENDING_FILM = SIGNAL_ENGINE;

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

/** The reverse, used by the chapter choreography and by the QA harness. */
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

/** Which beat a frame belongs to. */
export function segmentOf(frame: number) {
  for (const segment of SEGMENTS) {
    if (frame <= segment.to) return segment;
  }
  return SEGMENTS[SEGMENTS.length - 1]!;
}

/**
 * The stretch of the older `system` clip in which the X is whole and centred,
 * in that clip's own frame numbers. The System Explorer scrubs inside this
 * range, so selecting a discipline rotates the real structure.
 */
export const EXPLORER_RANGE: [number, number] = [20, 72];
