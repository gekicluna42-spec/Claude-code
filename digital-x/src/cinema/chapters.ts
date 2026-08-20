/**
 * The four chapters, in order, with the two things that make each one feel
 * different: how much scroll it takes, and how that scroll maps onto film time.
 *
 * `curve` is a pure function from scroll progress (0..1) to film progress
 * (0..1). Keeping it pure is what makes THE REVEAL's freeze real: the frame
 * index simply stops changing while the visitor keeps scrolling, and scrolling
 * back up runs the whole thing in reverse, because nothing is animating on a
 * clock of its own.
 */

export type Curve = (p: number) => number;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Maps `v` from [a,b] onto [c,d]. */
const remap = (v: number, a: number, b: number, c: number, d: number) =>
  c + ((clamp01((v - a) / (b - a)) * (d - c)));

const easeInOut = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

export interface CueCopy {
  /** Scroll progress at which this cue is fully on screen. */
  at: [number, number];
  id: string;
}

export interface ChapterDef {
  id: string;
  /** Roman numeral shown in the chapter marker. */
  numeral: string;
  title: string;
  /** Section height in vh — desktop, then the deliberate mobile value. */
  scroll: number;
  scrollMobile: number;
  curve: Curve;
  /** Copy cues, keyed to elements already present in the HTML. */
  cues: CueCopy[];
}

export const CHAPTERS: ChapterDef[] = [
  {
    id: 'signal',
    numeral: 'I',
    title: 'The Signal',
    scroll: 240,
    scrollMobile: 190,
    // A straight dolly. Nothing clever — the shot is already the effect.
    curve: (p) => p,
    cues: [
      { at: [0, 0.55], id: 'signal-a' },
      { at: [0.55, 1], id: 'signal-b' },
    ],
  },
  {
    id: 'reveal',
    numeral: 'II',
    title: 'The Reveal',
    // The longest run on the page by a wide margin. The detonation needs room
    // to bloom, and the reversal only lands if the peak was allowed to hang.
    scroll: 420,
    scrollMobile: 300,
    curve: (p) => {
      // 0.00 – 0.42  the blast expands outward
      if (p < 0.42) return remap(p, 0, 0.42, 0, PEAK);
      // 0.42 – 0.58  HOLD. Film time stops; roughly 67vh of scroll passes with
      //              the frame index constant, so the explosion hangs in the
      //              air while the visitor keeps moving.
      if (p < 0.58) return PEAK;
      // 0.58 – 1.00  the reversal: every fragment curves back into the X
      return remap(p, 0.58, 1, PEAK, 1);
    },
    cues: [
      { at: [0, 0.4], id: 'reveal-a' },
      { at: [0.42, 0.58], id: 'reveal-b' },
      { at: [0.62, 1], id: 'reveal-c' },
    ],
  },
  {
    id: 'system',
    numeral: 'III',
    title: 'The System',
    scroll: 300,
    scrollMobile: 220,
    // Eased at both ends so the orbit settles rather than stopping dead.
    curve: easeInOut,
    cues: [
      { at: [0, 0.34], id: 'system-a' },
      { at: [0.36, 0.7], id: 'system-b' },
      { at: [0.72, 1], id: 'system-c' },
    ],
  },
  {
    id: 'inside',
    numeral: 'IV',
    title: 'Inside the X',
    scroll: 280,
    scrollMobile: 210,
    // Linear through the opening, then easing out as it emerges, so the last
    // beat rests on the completed X instead of arriving at speed.
    curve: (p) => (p < 0.72 ? p : 0.72 + (1 - 0.72) * easeInOut((p - 0.72) / (1 - 0.72))),
    cues: [
      { at: [0, 0.42], id: 'inside-a' },
      { at: [0.44, 0.78], id: 'inside-b' },
      { at: [0.8, 1], id: 'inside-c' },
    ],
  },
];

/**
 * Where in the film the detonation is at its widest. Measured off the clip,
 * not guessed: frames either side of ~0.56 are already contracting.
 */
const PEAK = 0.56;

/**
 * The stretch of THE SYSTEM in which the X is whole and centred, before the
 * camera pushes into the core. The System Explorer scrubs inside this range —
 * so selecting a discipline rotates the real structure rather than a facsimile.
 */
export const EXPLORER_RANGE: [number, number] = [20, 72];

export const byId = (id: string): ChapterDef => {
  const found = CHAPTERS.find((c) => c.id === id);
  if (!found) throw new Error(`unknown chapter ${id}`);
  return found;
};
