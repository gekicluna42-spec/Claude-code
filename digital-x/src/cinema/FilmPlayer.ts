/**
 * The picture surface: one canvas, one job — draw the frame it is told to
 * draw, as cheaply as possible.
 *
 * It owns no scroll logic and no timeline. Everything it knows about where we
 * are in the film arrives as a frame index from the director.
 */

import type { FrameSource } from './ladder';

export interface PlayerOptions {
  canvas: HTMLCanvasElement;
  ladder: FrameSource;
  /** Caps devicePixelRatio. Phones gain nothing from 3x on a video frame. */
  maxDpr: number;
  /**
   * 'cover' for the chapters, which are full-bleed. 'contain' for the System
   * Explorer, where cropping the X's arms would defeat the point of it.
   */
  fit?: 'cover' | 'contain';
  /**
   * Shrinks a contained frame inside its box. The X fills its own frame edge
   * to edge, so it needs margin the film does not give it.
   */
  fitScale?: number;
}

export class FilmPlayer {
  private ctx: CanvasRenderingContext2D;
  private observer: ResizeObserver;
  private cssWidth = 0;
  private cssHeight = 0;
  private lastDrawn = -1;
  private ladder: FrameSource;

  constructor(private options: PlayerOptions) {
    this.ladder = options.ladder;
    const ctx = options.canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('2d context unavailable');
    this.ctx = ctx;
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(options.canvas);
    this.resize();
  }

  /**
   * A wider ladder streaming in behind the first one. Each frame is taken from
   * it the moment that exact frame is resident, so the picture sharpens frame
   * by frame instead of popping when the whole ladder finishes.
   */
  private hi: FrameSource | null = null;

  setUpgrade(ladder: FrameSource): void {
    this.hi = ladder;
    this.lastDrawn = -1;
  }

  get upgrade(): FrameSource | null {
    return this.hi;
  }

  get frames(): number {
    return this.ladder.count;
  }

  private resize(): void {
    const { canvas, maxDpr } = this.options;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    if (canvas.width === w && canvas.height === h) return;
    canvas.width = w;
    canvas.height = h;
    this.cssWidth = w;
    this.cssHeight = h;
    this.lastDrawn = -1;
  }

  /**
   * Draws frame `index`. Returns the index actually painted, which is what the
   * QA harness asserts against — it proves the scrub moved, not just the
   * scrollbar.
   */
  render(index: number, force = false): number {
    const i = Math.max(0, Math.min(this.ladder.count - 1, Math.round(index)));
    if (i === this.lastDrawn && !force) return i;
    const img = (this.hi?.has(i) ? this.hi.nearest(i) : null) ?? this.ladder.nearest(i);
    if (!img || !this.cssWidth) return this.lastDrawn;

    const cw = this.cssWidth;
    const ch = this.cssHeight;
    const scale =
      this.options.fit === 'contain'
        ? Math.min(cw / img.naturalWidth, ch / img.naturalHeight) * (this.options.fitScale ?? 1)
        : Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    // Contain leaves bars, so the ground has to be repainted each frame.
    if (this.options.fit === 'contain') {
      this.ctx.fillStyle = '#070708';
      this.ctx.fillRect(0, 0, cw, ch);
    }
    this.ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    this.lastDrawn = i;
    return i;
  }

  /** The last index painted. -1 before the first successful draw. */
  get drawn(): number {
    return this.lastDrawn;
  }

  dispose(): void {
    this.observer.disconnect();
    this.ladder.dispose();
    this.hi?.dispose();
  }
}
