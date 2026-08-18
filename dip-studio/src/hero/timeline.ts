/**
 * The five acts of one wedding moment.
 *
 * Everything the hero renders is a pure function of scroll progress (0 → 1).
 * Nothing accumulates, which is why scrolling back up rewinds the moment
 * exactly instead of drifting.
 *
 * The camera never cuts: it starts tight and dark on the couple and pulls
 * back continuously until the whole production is in frame.
 */

export interface ActState {
  /**
   * Normalised crop of the source frame: centre x/y and width (0–1).
   * cropY is measured from the BOTTOM of the frame (texture UV origin), so
   * larger values look further up the room and smaller ones drop to the floor.
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
  /** Effect layers — these map 1:1 to real DIP Studio services. */
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
    label: 'Anticipation',
    at: 0,
    state: {
      cropX: 0.5, cropY: 0.6, cropW: 0.42, yaw: -0.012,
      exposure: 0.6, contrast: 1.12, saturation: 0.74, vignette: 1.0, dof: 0.55,
      fog: 0.0, sparks: 0.0, beams: 0.0, stars: 0.0, bloom: 0.12,
    },
  },
  {
    id: 'first-dance',
    index: 2,
    label: 'Prvi ples',
    at: 0.2,
    state: {
      cropX: 0.5, cropY: 0.56, cropW: 0.52, yaw: 0.014,
      exposure: 0.8, contrast: 1.09, saturation: 0.88, vignette: 0.84, dof: 0.34,
      fog: 0.06, sparks: 0.0, beams: 0.1, stars: 0.0, bloom: 0.22,
    },
  },
  {
    id: 'cloud',
    index: 3,
    label: 'Oblak',
    at: 0.42,
    state: {
      cropX: 0.5, cropY: 0.44, cropW: 0.64, yaw: -0.008,
      exposure: 0.88, contrast: 1.06, saturation: 0.92, vignette: 0.7, dof: 0.28,
      fog: 1.0, sparks: 0.0, beams: 0.22, stars: 0.05, bloom: 0.34,
    },
  },
  {
    id: 'spark',
    index: 4,
    label: 'Prskalice',
    at: 0.64,
    state: {
      cropX: 0.5, cropY: 0.48, cropW: 0.82, yaw: 0.01,
      exposure: 1.0, contrast: 1.04, saturation: 1.0, vignette: 0.55, dof: 0.12,
      fog: 0.82, sparks: 1.0, beams: 0.45, stars: 0.35, bloom: 0.55,
    },
  },
  {
    id: 'spectacle',
    index: 5,
    label: 'Spektakl',
    at: 0.84,
    state: {
      cropX: 0.5, cropY: 0.5, cropW: 1.0, yaw: 0,
      exposure: 1.06, contrast: 1.02, saturation: 1.04, vignette: 0.42, dof: 0.0,
      fog: 0.7, sparks: 0.85, beams: 0.9, stars: 1.0, bloom: 0.8,
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
