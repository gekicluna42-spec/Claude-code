/**
 * Keeping the film ahead of the visitor.
 *
 * There is nothing else on screen during the film — no copy, no headings, no
 * navigation — so a stall is not a small blemish, it is the entire experience
 * breaking. Three mechanisms, in order of when they matter:
 *
 *   1. BLOCKING. The opening clip is loaded in full behind the curtain, with a
 *      real percentage, because the first scrub has to be smooth from the very
 *      first pixel of movement.
 *   2. BACKGROUND FILL. The remaining three clips are then fetched in order at
 *      low priority while the visitor is still watching the first. At roughly
 *      2.2vh of scroll per frame there is a lot of time to work with, and the
 *      whole narrow ladder is only about 12 MB.
 *   3. WINDOW. The director keeps warming frames around the playhead, which
 *      outranks the filler because those requests go out at high priority.
 *
 * The filler yields whenever the playhead has outstanding requests, so it can
 * never be the reason a frame the visitor is looking at arrives late.
 */

import type { FilmReel } from './reel';

export interface FillerOptions {
  /** Clips already loaded by the blocking phase, by index. */
  skip: number;
  /** Returns true while the playhead is waiting on frames of its own. */
  busy: () => boolean;
  onProgress?: (ratio: number) => void;
}

/**
 * Walks the reel clip by clip, queueing each at low priority and waiting for
 * it to settle before starting the next. Sequential rather than all-at-once so
 * the clip the visitor reaches first is also the one that finishes first.
 */
export function fillInBackground(reel: FilmReel, options: FillerOptions): () => void {
  let cancelled = false;
  const clips = reel.clips;

  const idle = (fn: () => void, timeout = 400) => {
    const ric = (window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void;
    }).requestIdleCallback;
    if (ric) ric(fn, { timeout });
    else window.setTimeout(fn, 120);
  };

  const step = (index: number) => {
    if (cancelled || index >= clips.length) {
      options.onProgress?.(1);
      return;
    }
    const clip = clips[index]!;
    if (index < options.skip || clip.settled()) {
      step(index + 1);
      return;
    }

    // Queue in slices rather than all at once: a thousand simultaneous image
    // requests starve the ones the playhead asks for a moment later.
    const SLICE = 24;
    let cursor = 0;

    const pump = () => {
      if (cancelled) return;
      if (options.busy() || clip.inflight > SLICE) {
        idle(pump, 200);
        return;
      }
      if (cursor < clip.count) {
        clip.prefetch(cursor, cursor + SLICE - 1);
        cursor += SLICE;
        options.onProgress?.(reel.loaded);
        idle(pump);
        return;
      }
      if (!clip.settled()) {
        idle(pump, 300);
        return;
      }
      options.onProgress?.(reel.loaded);
      step(index + 1);
    };

    idle(pump);
  };

  idle(() => step(0), 800);
  return () => {
    cancelled = true;
  };
}
