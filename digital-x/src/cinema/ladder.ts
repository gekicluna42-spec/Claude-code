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
}

export class FrameLadder {
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

  private request(i: number): void {
    if (this.images.has(i) || this.pending.has(i) || this.failed.has(i)) return;
    if (i < 0 || i >= this.options.count) return;
    const src = this.url(i);
    if (!src) return;
    const img = new Image();
    img.decoding = 'async';
    this.pending.set(i, img);
    const settle = (ok: boolean) => {
      this.pending.delete(i);
      if (ok) this.images.set(i, img);
      else this.failed.add(i);
    };
    img.onload = () => settle(true);
    img.onerror = () => settle(false);
    img.src = src;
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

    if (this.images.size > (hi - lo) * 1.6 + 8) {
      for (const key of this.images.keys()) {
        if (key < lo || key > hi) this.images.delete(key);
      }
    }
  }

  /** Loads the whole ladder. Used for the opening chapter and nothing else. */
  async loadAll(onProgress?: (ratio: number) => void): Promise<void> {
    const { count } = this.options;
    let done = 0;
    const step = () => onProgress?.(++done / count);
    // Six at a time: enough to saturate the connection, few enough that the
    // first frames — the ones needed first — are not queued behind the last.
    const lanes = Array.from({ length: 6 }, async (_, lane) => {
      for (let i = lane; i < count; i += 6) {
        await this.load(i);
        step();
      }
    });
    await Promise.all(lanes);
  }

  private load(i: number): Promise<void> {
    if (this.images.has(i) || this.failed.has(i)) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        this.images.set(i, img);
        resolve();
      };
      img.onerror = () => {
        this.failed.add(i);
        resolve();
      };
      img.src = this.url(i);
    });
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
