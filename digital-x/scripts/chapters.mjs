/**
 * The clips, and the ladders built from them.
 *
 * `signal-engine` is the intended hero: one continuous 16-second Seedance 2.5
 * master flight, sampled at 10fps to land on the 160-frame budget the scroll
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
    fps: 10,
    hero: true,
    ladders: true,
    /*
     * Midpoints of the five beats, in frames of the 160-frame reel. These
     * become the stills a reduced-motion visitor sees instead of the film, so
     * they have to be kept in step with SEGMENTS in src/cinema/timeline.ts.
     */
    beats: [15, 45, 80, 115, 150],
  },
  { id: 'signal', file: '01-signal.mp4', fps: 24, ladders: false },
  { id: 'reveal', file: '02-reveal.mp4', fps: 24, ladders: false },
  { id: 'system', file: '03-system.mp4', fps: 24, ladders: true },
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
 * `maxFrames` sets the stride instead of hardcoding one, so a clip extracted
 * at 10fps is not thinned a second time. The hero's 160 frames pass through
 * xs untouched; the 192-frame `system` clip halves, which is ample for the
 * ~50-frame arc the Explorer actually scrubs.
 */
export const LADDERS = [
  { dir: 'sm', width: 640, quality: 44, maxFrames: Infinity, webp: true },
  { dir: 'lg', width: 1280, quality: 46, maxFrames: Infinity, webp: false },
  { dir: 'xs', width: 480, quality: 32, maxFrames: 180, webp: false },
];

/** Frames kept per ladder for a clip that extracted to `count` frames. */
export const strideFor = (ladder, count) =>
  Math.max(1, Math.ceil(count / (ladder.maxFrames ?? Infinity)));
