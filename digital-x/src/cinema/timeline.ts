/**
 * The hero film.
 *
 * TWO CONFIGURATIONS live here, and exactly one is ACTIVE. The four-clip reel
 * is kept because it is a complete, working alternative — swapping back is one
 * constant and `ladders: true` in scripts/chapters.mjs.
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
 * The Seedance master: one 16-second flight, 241 frames, 900vh.
 *
 * The film is sampled at 15fps rather than 10 and given 900vh rather than 520,
 * which are the two halves of the same decision. 900vh over 16 seconds of film
 * is about 56vh of scroll per second of picture — the camera moves a little
 * over half as fast as it did, so the particles organising, the network wiring
 * itself and the final rebuild all get long enough to be watched rather than
 * passed. Sampling denser is what keeps that legible: at 240 frames a beat
 * costs roughly 3.2vh per frame, close to what it cost before, so slowing the
 * camera down does not turn the scrub into a slideshow.
 *
 * NO STRETCH OF THE FILM EVER STOPS. The threshold at the mouth of the X used
 * to be a true hold — two keys on the same frame, 76vh of scroll buying zero
 * frames — on the theory that the camera pausing before it goes in is a beat.
 * In the hand it is not a beat, it is a bug: the visitor scrolls, the picture
 * does not move, and the page reads as frozen. It is now a DECELERATION. The
 * threshold is the slowest passage in the film at about 4.8vh per frame
 * against 3.2 either side, so the camera visibly eases off and then
 * accelerates in — and never once stops.
 *
 * The only key pair that shares a frame is the last one, where the film is
 * genuinely over and the hero title is arriving over the final frame.
 */
const SIGNAL_ENGINE: FilmConfig = {
  clips: ['signal-engine'],
  totalFrames: 241, // 16.07s at 15fps — the extractor's count, not a round one
  segments: [
    { id: 'signal', numeral: '01', title: 'Signal', from: 0, to: 43 },
    { id: 'core', numeral: '02', title: 'X Core', from: 44, to: 89 },
    { id: 'intelligence', numeral: '03', title: 'Intelligence', from: 90, to: 149 },
    { id: 'authority', numeral: '04', title: 'Authority', from: 150, to: 194 },
    { id: 'demand', numeral: '05', title: 'Demand', from: 195, to: 240 },
  ],
  keys: [
    // The trailing number is what the stretch ENDING at that key costs in
    // scroll per frame, at 900vh. Nothing is allowed above ~5: past that a
    // frame holds for most of a screen of scrolling and the film looks stuck.
    { at: 0.0, frame: 0 },
    { at: 0.15, frame: 44 }, //  01 signals organise and converge      3.1
    { at: 0.27, frame: 76 }, //  02 the X Core resolves                3.4
    { at: 0.36, frame: 93 }, //     the threshold — eases off, goes in 4.8
    { at: 0.62, frame: 149 }, // 03 chaos becomes structured intelligence 4.2
    { at: 0.79, frame: 194 }, // 04 the authority constellation opens out 3.4
    { at: 0.94, frame: 240 }, // 05 particles rebuild the completed X   2.9
    { at: 1.0, frame: 240 }, //     the film is over; the title arrives
  ],
  filmEnd: 0.94,
  scrollVh: 900,
  scrollVhMobile: 640,
};

/** The four 8-second clips played as one 768-frame reel. The earlier hero. */
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

const ACTIVE: FilmConfig = SIGNAL_ENGINE;

export const SEGMENTS = ACTIVE.segments;
export const TOTAL_FRAMES = ACTIVE.totalFrames;
export const HERO_CLIPS = ACTIVE.clips;
export const KEYS = ACTIVE.keys;
export const FILM_END = ACTIVE.filmEnd;
export const SCROLL_VH = ACTIVE.scrollVh;
export const SCROLL_VH_MOBILE = ACTIVE.scrollVhMobile;

/** Referenced so the inactive configuration cannot silently rot. */
export const ALTERNATE_FILM = FOUR_CLIP_REEL;

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
 *
 * The arc is the full 95 frames the structure stays readable for, not the 52
 * it used to be. The disciplines sit at orbit 0.06 … 0.86 (see
 * src/data/content.ts), so this range puts the first at frame 6 and the last
 * at 82 — the bare X at one end, the fully panelled system at the other, and
 * about fifteen frames of real rotation between neighbours instead of ten.
 */
export const EXPLORER_RANGE: [number, number] = [0, 95];
