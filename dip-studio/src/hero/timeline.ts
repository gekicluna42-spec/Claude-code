/**
 * The five acts of one wedding moment.
 *
 * The hero now scrubs real footage (media-src/hero-clip.mp4), so these acts
 * are the narrative overlay on top of it: each one names a beat of the clip
 * and sets how the virtual camera and the grade treat that stretch.
 *
 * Act order follows what the footage actually shows — fog and the star
 * ceiling first, fountains igniting, the couple in the corridor, then the
 * full production with lasers — rather than an order the clip does not have.
 *
 * The procedural fog / spark / star / beam layers stay at zero here: the
 * footage already contains those effects and doubling them would read as
 * fake. They remain available for the effect previews, which run the same
 * shader over single frames.
 *
 * Everything the hero renders is a pure function of scroll progress (0 → 1),
 * which is why scrolling back up rewinds the moment exactly.
 */

export interface ActState {
  /**
   * Normalised crop of the source frame: centre x/y and width (0–1).
   * cropY is measured from the BOTTOM of the frame (texture UV origin).
   * Values stay near 1 because the clip is already composed and moving —
   * the camera here only adds a slow push and a little parallax.
   */
  cropX: number;
  cropY: number;
  cropW: number;
  /** Lateral drift, in crop units — reads as a slow orbit. */
  yaw: number;
  exposure: number;
  contrast: number;
  saturation: number;
  vignette: number;
  /** Defocus applied to everything but the centre of frame. */
  dof: number;
  /** Effect layers — kept at 0 for footage; used by the effect previews. */
  fog: number;
  sparks: number;
  beams: number;
  stars: number;
  bloom: number;
}

export interface Act {
  id: string;
  index: number;
  label: string;
  /** Progress at which this act begins; its state is reached by the next act's start. */
  at: number;
  state: ActState;
}

export const acts: readonly Act[] = [
  {
    id: 'anticipation',
    index: 1,
    label: 'Iščekivanje',
    at: 0,
    state: {
      cropX: 0.5, cropY: 0.5, cropW: 0.9, yaw: -0.006,
      exposure: 0.72, contrast: 1.12, saturation: 0.82, vignette: 0.92, dof: 0.24,
      fog: 0, sparks: 0, beams: 0, stars: 0, bloom: 0.14,
    },
  },
  {
    id: 'cloud',
    index: 2,
    label: 'Oblak',
    at: 0.16,
    state: {
      cropX: 0.5, cropY: 0.5, cropW: 0.94, yaw: 0.005,
      exposure: 0.86, contrast: 1.09, saturation: 0.9, vignette: 0.8, dof: 0.14,
      fog: 0, sparks: 0, beams: 0, stars: 0, bloom: 0.2,
    },
  },
  {
    id: 'spark',
    index: 3,
    label: 'Prskalice',
    at: 0.34,
    state: {
      cropX: 0.5, cropY: 0.5, cropW: 0.97, yaw: -0.004,
      exposure: 0.97, contrast: 1.06, saturation: 0.97, vignette: 0.66, dof: 0.06,
      fog: 0, sparks: 0, beams: 0, stars: 0, bloom: 0.32,
    },
  },
  {
    id: 'first-dance',
    index: 4,
    label: 'Prvi ples',
    at: 0.58,
    state: {
      cropX: 0.5, cropY: 0.5, cropW: 0.99, yaw: 0.004,
      exposure: 1.0, contrast: 1.04, saturation: 1.0, vignette: 0.56, dof: 0.02,
      fog: 0, sparks: 0, beams: 0, stars: 0, bloom: 0.38,
    },
  },
  {
    id: 'spectacle',
    index: 5,
    label: 'Spektakl',
    at: 0.82,
    state: {
      cropX: 0.5, cropY: 0.5, cropW: 1.0, yaw: 0,
      exposure: 1.05, contrast: 1.02, saturation: 1.04, vignette: 0.46, dof: 0,
      fog: 0, sparks: 0, beams: 0, stars: 0, bloom: 0.46,
    },
  },
];

/** Copy beats keyed to the act they belong to (see index.html). */
export const beatForProgress = (p: number): number => {
  for (let i = acts.length - 1; i >= 0; i--) {
    if (p >= acts[i].at - 0.001) return i;
  }
  return 0;
};

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Smoothstep keeps the camera from arriving at each act with a jolt. */
const ease = (t: number): number => t * t * (3 - 2 * t);

const KEYS = [
  'cropX', 'cropY', 'cropW', 'yaw', 'exposure', 'contrast', 'saturation',
  'vignette', 'dof', 'fog', 'sparks', 'beams', 'stars', 'bloom',
] as const;

/**
 * Interpolate the scene state at any point in the scroll. Progress outside
 * 0–1 clamps to the first or last act.
 */
export function stateAt(progress: number): ActState {
  const p = Math.min(1, Math.max(0, progress));

  const last = acts[acts.length - 1];

  // Past the final act's start the scene holds — that hold is the payoff.
  if (p >= last.at) return { ...last.state };

  let lower = acts[0];
  let upper = last;

  for (let i = 0; i < acts.length - 1; i++) {
    if (p >= acts[i].at && p <= acts[i + 1].at) {
      lower = acts[i];
      upper = acts[i + 1];
      break;
    }
  }

  const span = upper.at - lower.at;
  const t = span <= 0 ? 0 : ease((p - lower.at) / span);

  const out = {} as ActState;
  for (const key of KEYS) out[key] = lerp(lower.state[key], upper.state[key], t);
  return out;
}

/** Progress within the current act, for the indicator's fill bar. */
export function actProgress(progress: number): { index: number; local: number } {
  const p = Math.min(1, Math.max(0, progress));
  const index = beatForProgress(p);
  const start = acts[index].at;
  const end = index < acts.length - 1 ? acts[index + 1].at : 1;
  const local = end > start ? (p - start) / (end - start) : 1;
  return { index, local: Math.min(1, Math.max(0, local)) };
}

/**
 * Paces the footage against the scroll.
 *
 * Linear scrubbing plays the clip at a constant rate, which reads as
 * playback. Easing within each act instead makes the moment settle on that
 * act's peak — the fog spreading, the fountains at full — and move quicker
 * through the transitions between them. Edited, rather than played.
 *
 * Applied to the frame index only. The acts, copy beats and indicator stay on
 * the raw progress so the narrative still tracks the scrollbar.
 */
export function pace(progress: number): number {
  const p = Math.min(1, Math.max(0, progress));

  for (let i = 0; i < acts.length - 1; i++) {
    const start = acts[i].at;
    const end = acts[i + 1].at;
    if (p < start || p > end) continue;

    const span = end - start;
    if (span <= 0) return p;

    const t = (p - start) / span;
    // Light touch. Holding harder near an act boundary stretches the same
    // frames over more scroll, which is exactly where stepping shows.
    const eased = t + (ease(t) - t) * 0.25;
    return start + eased * span;
  }

  return p;
}
