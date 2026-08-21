/**
 * One chapter's frames, at one width.
 *
 * The chapters scrub decoded images rather than seeking a video, so the only
 * thing that matters here is that the frame under the playhead is already in
 * memory by the time the visitor scrolls onto it. Three behaviours do that:
 *
 *   - a WINDOW around the playhead is kept resident and everything outside it
 *     is dropped, so a 192-frame chapter never costs 192 frames of memory;
 *   - loads are issued outward from the playhead, nearest first, so the frame
 *     you are about to need beats the one twenty frames away;
 *   - a miss falls back to the nearest resident frame instead of blanking. A
 *     scrub that is one frame stale is invisible; a white flash is not.
 */

import type { FramesManifest } from './manifest';

/**
 * Decided once, by decoding a real 1x1 AVIF.
 *
 * This has to be an image the browser can actually decode — a probe that fails
 * to parse reports "no AVIF support" on every browser alive, which silently
 * pins the whole site to the fallback ladder. The bytes below were produced by
 * the same encoder that produced the frames.
 */
let avifSupport: Promise<boolean> | null = null;
export function supportsAvif(): Promise<boolean> {
  avifSupport ??= new Promise<boolean>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.width === 1 && img.height === 1);
    img.onerror = () => resolve(false);
    img.src =
      'data:image/avif;base64,AAAAHGZ0eXBhdmlmAAAAAG1pZjFhdmlmbWlhZgAAANZtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAAA5waXRtAAAAAAABAAAAImlsb2MAAAAAREAAAQABAAAAAAD6AAEAAAAAAAAAFwAAACNpaW5mAAAAAAABAAAAFWluZmUCAAAAAAEAAGF2MDEAAAAAVmlwcnAAAAA4aXBjbwAAAAxhdjFDgSACAAAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAABZpcG1hAAAAAAAAAAEAAQOBAgMAAAAfbWRhdBIACgc4AAYQENBpMgofkD///8QAAK/u';
  });
  return avifSupport;
}

/**
 * Anything the player can draw from. Implemented by a single clip's ladder and
 * by the reel that stitches four of them into one continuous film.
 */
export interface FrameSource {
  readonly count: number;
  readonly dir: string;
  ensure(center: number, ahead?: number): void;
  nearest(i: number): HTMLImageElement | null;
  has(i: number): boolean;
  dispose(): void;
}

export interface LadderOptions {
  chapterId: string;
  /** Ladder directory name from the manifest: 'sm' | 'lg' | 'xs'. */
  dir: string;
  /** Frames in this ladder for this chapter. */
  count: number;
  ext: 'avif' | 'webp';
  base: string;
  /** Frames kept resident either side of the playhead. */
  window: number;
  /**
   * 'all' keeps every frame it has ever loaded.
   *
   * Worth it for the narrow ladder: the whole film is about 12 MB of encoded
   * AVIF, the browser manages the decode cache itself, and holding it means
   * scrolling back up through 1900vh never re-fetches a single frame. The wide
   * ladder stays windowed, where the same retention would be 23 MB of much
   * heavier decodes.
   */
  retain?: 'all' | 'window';
}

export class FrameLadder implements FrameSource {
  private images = new Map<number, HTMLImageElement>();
  private pending = new Map<number, HTMLImageElement>();
  /** Frames that failed to load; never retried, so one 404 cannot loop. */
  private failed = new Set<number>();
  private inline: string[] | null;

  constructor(private options: LadderOptions) {
    this.inline = window.__DX_INLINE__?.[`${options.dir}/${options.chapterId}`] ?? null;
  }

  get count() {
    return this.options.count;
  }

  get dir() {
    return this.options.dir;
  }

  /** How much of this ladder is resident, 0..1 — drives the boot progress bar. */
  get loaded() {
    return this.images.size / this.options.count;
  }

  private url(i: number) {
    if (this.inline) return this.inline[i] ?? '';
    const { base, dir, chapterId, ext } = this.options;
    return `${base}/media/frames/${dir}/${chapterId}/${String(i).padStart(4, '0')}.${ext}`;
  }

  /**
   * Starts one frame loading.
   *
   * A frame counts as resident only once it is DECODED, not merely downloaded.
   * `drawImage` on an undecoded image decodes it synchronously on the thread
   * that is trying to paint, which is exactly the stall a scroll-scrub cannot
   * afford — so `decode()` moves that work off the critical path and the frame
   * is published only when painting it is guaranteed to be cheap.
   */
  private request(i: number, priority: 'high' | 'low' = 'high'): void {
    if (this.images.has(i) || this.pending.has(i) || this.failed.has(i)) return;
    if (i < 0 || i >= this.options.count) return;
    const src = this.url(i);
    if (!src) return;

    const img = new Image();
    img.decoding = 'async';
    // The background filler must never outrank the frames under the playhead.
    (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = priority;
    this.pending.set(i, img);

    const settle = (ok: boolean) => {
      if (this.pending.get(i) !== img) return;
      this.pending.delete(i);
      if (ok) this.images.set(i, img);
      else this.failed.add(i);
      this.waiters.get(i)?.forEach((resolve) => resolve());
      this.waiters.delete(i);
    };

    img.src = src;
    if (typeof img.decode === 'function') {
      img.decode().then(
        () => settle(true),
        // A rejected decode is a real failure — a corrupt file, or a format
        // this browser cannot read. Either way, never retry it.
        () => settle(false),
      );
    } else {
      img.onload = () => settle(true);
      img.onerror = () => settle(false);
    }
  }

  /** Resolvers waiting on specific frames, used by the critical-stage load. */
  private waiters = new Map<number, (() => void)[]>();

  /** Resolves once frame `i` is resident or known to have failed. */
  private whenSettled(i: number): Promise<void> {
    if (this.images.has(i) || this.failed.has(i)) return Promise.resolve();
    return new Promise((resolve) => {
      const list = this.waiters.get(i) ?? [];
      list.push(resolve);
      this.waiters.set(i, list);
    });
  }

  /**
   * STAGE 1. Loads just enough of the opening to render the first viewport
   * without a blank frame, and resolves. Everything else streams in behind it.
   *
   * This is the only load anything ever waits on.
   */
  async loadCritical(count: number, onProgress?: (ratio: number) => void): Promise<void> {
    const last = Math.min(count, this.options.count) - 1;
    let done = 0;
    const waits: Promise<void>[] = [];
    for (let i = 0; i <= last; i++) {
      this.request(i, 'high');
      waits.push(
        this.whenSettled(i).then(() => {
          onProgress?.(++done / (last + 1));
        }),
      );
    }
    await Promise.all(waits);
  }

  /**
   * Keeps a window around `center` resident, issuing loads nearest-first and
   * evicting everything outside it. `ahead` biases the window in the scroll
   * direction, so scrolling forward preloads forward.
   */
  ensure(center: number, ahead = 0): void {
    const { window: w, count } = this.options;
    const lo = Math.max(0, Math.round(center - w + Math.min(0, ahead) * w));
    const hi = Math.min(count - 1, Math.round(center + w + Math.max(0, ahead) * w));

    this.request(Math.round(center));
    for (let d = 1; d <= hi - lo; d++) {
      const f = Math.round(center) + d;
      const b = Math.round(center) - d;
      if (f <= hi) this.request(f);
      if (b >= lo) this.request(b);
    }

    if (this.options.retain === 'all') return;
    if (this.images.size > (hi - lo) * 1.6 + 8) {
      for (const key of this.images.keys()) {
        if (key < lo || key > hi) this.images.delete(key);
      }
    }
  }

  /**
   * Queues a stretch of frames at low priority. This is how the film is filled
   * in behind the visitor while they watch the part that is already there.
   */
  prefetch(from: number, to: number): void {
    for (let i = Math.max(0, from); i <= Math.min(this.options.count - 1, to); i++) {
      this.request(i, 'low');
    }
  }

  /** Frames still outstanding — the filler waits on this before moving on. */
  get inflight(): number {
    return this.pending.size;
  }

  /** True once every frame in the range is resident or known to be missing. */
  settled(from = 0, to = this.options.count - 1): boolean {
    for (let i = from; i <= to; i++) {
      if (!this.images.has(i) && !this.failed.has(i)) return false;
    }
    return true;
  }

  /**
   * The frame to draw for index `i`: the exact one when it is resident,
   * otherwise the nearest resident neighbour, otherwise null.
   */
  nearest(i: number): HTMLImageElement | null {
    const exact = this.images.get(i);
    if (exact) return exact;
    for (let d = 1; d < this.options.count; d++) {
      const a = this.images.get(i - d);
      if (a) return a;
      const b = this.images.get(i + d);
      if (b) return b;
    }
    return null;
  }

  has(i: number): boolean {
    return this.images.has(i);
  }

  dispose(): void {
    for (const img of this.pending.values()) img.src = '';
    this.pending.clear();
    this.images.clear();
  }
}

/** Picks the ladder a device should start on, and the one it should end on. */
export async function chooseLadders(
  manifest: FramesManifest,
  tier: 'high' | 'low',
): Promise<{ first: string; best: string; ext: 'avif' | 'webp' }> {
  const avif = await supportsAvif();
  const has = (dir: string) => manifest.ladders.some((l) => l.dir === dir);
  if (!avif) {
    // Only sm carries a WebP copy, so a browser without AVIF stays on sm
    // rather than downloading a second full-size ladder nobody else needs.
    return { first: 'sm', best: 'sm', ext: 'webp' };
  }
  const first = has('sm') ? 'sm' : manifest.ladders[0]!.dir;
  const best = tier === 'low' ? first : has('lg') ? 'lg' : first;
  return { first, best, ext: 'avif' };
}
