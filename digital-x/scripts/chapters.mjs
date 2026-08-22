/**
 * The clips, and the ladders built from them.
 *
 * `signal-engine` is the intended hero: one continuous 16-second Seedance 2.5
 * master flight, sampled at 15fps to land on the 240-frame budget the scroll
 * is designed around. The other four are the earlier 8-second clips at 24fps;
 * `system` is also what the System Explorer scrubs so that selecting a
 * discipline turns the real structure.
 *
 * Only the hero and `system` get frame ladders; the rest would be dead weight.
 * Every clip still gets posters, and the hero gets a fast-start copy.
 */
/*
 * `ladders` marks the clips something still scrubs. Posters are built for every
 * clip either way — the sections below the film still use them as stills.
 */
export const CHAPTERS = [
  {
    id: 'signal-engine',
    file: 'signal-engine.mp4',
    fps: 15,
    hero: true,
    ladders: true,
    /*
     * Midpoints of the five beats, in frames of the 240-frame reel. These
     * become the stills a reduced-motion visitor sees instead of the film, so
     * they have to be kept in step with SEGMENTS in src/cinema/timeline.ts.
     */
    beats: [22, 67, 120, 172, 225],
  },
  { id: 'signal', file: '01-signal.mp4', fps: 24, ladders: false },
  { id: 'reveal', file: '02-reveal.mp4', fps: 24, ladders: false },
  {
    id: 'system',
    file: '03-system.mp4',
    fps: 24,
    ladders: true,
    /*
     * The System Explorer only ever scrubs this arc of the orbit, so the
     * single-file build inlines that slice and leaves the rest out. In source
     * frame numbers; the baker rescales it to whichever ladder it is inlining.
     * Keep in step with EXPLORER_RANGE in src/cinema/timeline.ts.
     */
    inlineRange: [0, 95],
  },
  { id: 'inside', file: '04-inside-x.mp4', fps: 24, ladders: false },
];

export const HERO = CHAPTERS.find((c) => c.hero);

/**
 * Three ladders.
 *
 *   sm  first paint and phones — the only ladder a phone is ever asked for
 *   lg  desktop, streamed in behind sm and swapped in frame by frame
 *   xs  the shareable single-file build, where every frame is embedded as a
 *       data URI and the whole page has to stay under 16 MB
 *
 * QUALITY. The film is near-black with fine particle detail, which is the
 * worst case for a low-bitrate codec: the first thing to go is the gradient in
 * the haze, and it goes as banding you cannot un-see. These numbers are set
 * from measured per-frame averages across twenty samples of the master rather
 * than by feel — roughly 13 KB a frame at sm, 32 KB at lg.
 *
 * `maxFrames` sets the stride instead of hardcoding one, so a clip extracted
 * at 15fps is not thinned a second time. At 260 the hero's 241 frames pass
 * through every ladder whole — the budget has to clear the frame count with
 * room, because a stride of two is all it takes to halve the reel — and the
 * 192-frame `system` clip keeps every frame of the arc the Explorer scrubs.
 * Halving that arc was what made selecting a discipline look like nothing had
 * happened.
 */
export const LADDERS = [
  { dir: 'sm', width: 768, quality: 52, maxFrames: Infinity, webp: true },
  { dir: 'lg', width: 1280, quality: 62, maxFrames: Infinity, webp: false },
  { dir: 'xs', width: 860, quality: 52, maxFrames: 260, webp: false },
];

/** Frames kept per ladder for a clip that extracted to `count` frames. */
export const strideFor = (ladder, count) =>
  Math.max(1, Math.ceil(count / (ladder.maxFrames ?? Infinity)));
