/**
 * One or more clips presented to the player as a single reel.
 *
 * The hero is a single 160-frame master, so today this usually wraps one
 * ladder — but the seam handling stays: it is what let four clips play as one
 * film before, and it costs nothing when there is only one. The player asks
 * for a global frame index and never learns how many ladders sit underneath.
 */

import { FrameLadder, type FrameSource } from './ladder';
import type { FramesManifest } from './manifest';

export class FilmReel implements FrameSource {
  private ladders: FrameLadder[] = [];
  /** First global frame index of each ladder, parallel to `ladders`. */
  private offsets: number[] = [];
  readonly count: number;

  constructor(
    manifest: FramesManifest,
    readonly dir: string,
    ext: 'avif' | 'webp',
    base: string,
    options: { window: number; retain?: 'all' | 'window'; clips: readonly string[] },
  ) {
    let offset = 0;
    for (const id of options.clips) {
      const count = manifest.chapters.find((c) => c.id === id)?.counts[dir];
      if (!count) continue;
      this.ladders.push(
        new FrameLadder({
          chapterId: id,
          dir,
          count,
          ext,
          base,
          window: options.window,
          retain: options.retain,
        }),
      );
      this.offsets.push(offset);
      offset += count;
    }
    // The manifest is the authority: a strided ladder carries fewer frames than
    // the timeline's nominal total, and the timeline is rescaled onto whatever
    // it actually reports.
    this.count = offset;
  }

  /** Ladder index containing global frame `i`, and the local index within it. */
  private locate(i: number): { at: number; local: number } | null {
    for (let at = this.ladders.length - 1; at >= 0; at--) {
      const offset = this.offsets[at]!;
      if (i >= offset) return { at, local: i - offset };
    }
    return this.ladders.length ? { at: 0, local: 0 } : null;
  }

  ensure(center: number, ahead = 0): void {
    const found = this.locate(Math.round(center));
    if (!found) return;
    const ladder = this.ladders[found.at]!;
    ladder.ensure(found.local, ahead);

    // Warm across the seam. Without this the first frames of the next clip are
    // requested only once the playhead is already standing on them, which on a
    // slow connection reads as the film stalling at the cut.
    const REACH = 40;
    if (found.local > ladder.count - REACH) {
      this.ladders[found.at + 1]?.ensure(0, 1);
    }
    if (found.local < REACH) {
      const previous = this.ladders[found.at - 1];
      if (previous) previous.ensure(previous.count - 1, -1);
    }
  }

  nearest(i: number): HTMLImageElement | null {
    const found = this.locate(i);
    if (!found) return null;
    const own = this.ladders[found.at]!.nearest(found.local);
    if (own) return own;
    // Nothing resident in this clip yet: show the closest frame of a
    // neighbouring one rather than a hole. Across a cut-free chain the
    // neighbour's edge frame is very nearly the right picture.
    for (let d = 1; d < this.ladders.length; d++) {
      const back = this.ladders[found.at - d];
      if (back) {
        const frame = back.nearest(back.count - 1);
        if (frame) return frame;
      }
      const forward = this.ladders[found.at + d];
      if (forward) {
        const frame = forward.nearest(0);
        if (frame) return frame;
      }
    }
    return null;
  }

  has(i: number): boolean {
    const found = this.locate(i);
    return found ? this.ladders[found.at]!.has(found.local) : false;
  }

  /** Per-clip access, used by the boot loader and the background filler. */
  get clips(): readonly FrameLadder[] {
    return this.ladders;
  }

  /** How much of the whole reel is resident, 0..1 — drives the boot counter. */
  get loaded(): number {
    if (!this.ladders.length) return 1;
    const total = this.ladders.reduce((sum, l) => sum + l.count, 0);
    const have = this.ladders.reduce((sum, l) => sum + l.loaded * l.count, 0);
    return total ? have / total : 1;
  }

  dispose(): void {
    for (const ladder of this.ladders) ladder.dispose();
  }
}
