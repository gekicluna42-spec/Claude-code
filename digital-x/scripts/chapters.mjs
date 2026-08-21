/**
 * The clips, and the ladders built from them.
 *
 * `signal-engine` is the intended hero: one continuous 16-second Seedance 2.5
 * master flight, sampled at 10fps to land on the 160-frame budget the scroll
 * is designed around. The other four are the earlier 8-second clips at 24fps;
 * `system` is also what the System Explorer scrubs so that selecting a
 * discipline turns the real structure.
 *
 * `build` marks which clips get frame ladders. Everything keeps its source mp4
 * and its posters either way.
 */
/*
 * `signal-engine` is generated and paid for but its bytes are not here yet:
 * Higgsfield serves results from a CDN this session's egress policy denies.
 * It stays listed with build:false so the switch is two flags, and the site
 * keeps running on the four-clip reel until the file lands in media-src/.
 */
export const CHAPTERS = [
  { id: 'signal-engine', file: 'signal-engine.mp4', fps: 10, hero: true, build: false },
  { id: 'signal', file: '01-signal.mp4', fps: 24, build: true },
  { id: 'reveal', file: '02-reveal.mp4', fps: 24, build: true },
  { id: 'system', file: '03-system.mp4', fps: 24, build: true },
  { id: 'inside', file: '04-inside-x.mp4', fps: 24, build: true },
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
