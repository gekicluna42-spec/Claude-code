/**
 * The four films, in narrative order. Shared by the frame builder and the
 * single-file baker so the chapter list exists in exactly one place.
 *
 * Every clip is 1280x720, 8.000s, 192 frames at 24fps — they were generated as
 * one continuous sequence, each starting on the previous one's final frame.
 */
export const CHAPTERS = [
  { id: 'signal', file: '01-signal.mp4' },
  { id: 'reveal', file: '02-reveal.mp4' },
  { id: 'system', file: '03-system.mp4' },
  { id: 'inside', file: '04-inside-x.mp4' },
];

/**
 * Three ladders, each a complete copy of all four films.
 *
 *   sm  first paint and phones — small enough to arrive before the visitor
 *       has finished reading the hero
 *   lg  desktop, streamed in behind sm and swapped in frame by frame
 *   xs  the shareable single-file build only, where every frame is embedded
 *       as a data URI and the whole page has to stay under 16 MB
 *
 * stride 2 halves the frame count to 12fps. The camera moves in these films
 * are slow and stabilised, so 12fps still reads as motion rather than a
 * slideshow — but only xs takes that trade, because the ladder the real site
 * ships is the one that has to feel like film.
 */
export const LADDERS = [
  { dir: 'sm', width: 640, quality: 44, stride: 1, webp: true },
  { dir: 'lg', width: 1280, quality: 46, stride: 1, webp: false },
  { dir: 'xs', width: 480, quality: 32, stride: 2, webp: false },
];
