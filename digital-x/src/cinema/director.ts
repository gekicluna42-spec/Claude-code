/**
 * Wires the film to the scrollbar.
 *
 * One section, one sticky stage, one canvas, one continuous 768-frame reel.
 * Scroll position drives film time through the pure curve in timeline.ts; a
 * per-frame ease chases it, which is the difference between a slider and a
 * camera. Nothing autoplays — stop scrolling and the film stops, scroll back
 * and it runs in reverse.
 *
 * The director also owns the rule that the rest of the page does not exist
 * until the film is over: it holds `film-running` on <html> until the last
 * frame has played, and everything else keys off that one class.
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { FilmPlayer } from './FilmPlayer';
import { chooseLadders } from './ladder';
import { loadManifest, type FramesManifest } from './manifest';
import { fillInBackground } from './preloader';
import { FilmReel } from './reel';
import {
  FILM_END,
  HERO_CLIPS,
  SCROLL_VH,
  SCROLL_VH_MOBILE,
  SEGMENTS,
  TOTAL_FRAMES,
  frameAt,
  progressAtFrame,
} from './timeline';

gsap.registerPlugin(ScrollTrigger);

/**
 * How much of the film the curtain waits for.
 *
 * Thirteen frames is the first frame plus roughly 35vh of scroll at this
 * film's pace — enough that the visitor cannot outrun the loader before
 * STAGE 2 has caught up, and short enough that the wait is a moment rather
 * than a download.
 */
const CRITICAL_FRAMES = 13;

export interface DirectorOptions {
  root: ParentNode;
  base: string;
  tier: 'high' | 'low';
  reducedMotion: boolean;
  /** 0..1 while the opening clip loads behind the curtain. */
  onBootProgress?: (ratio: number) => void;
  /** 0..1 as the rest of the film fills in behind the visitor. */
  onBufferProgress?: (ratio: number) => void;
}

export class Director {
  private section: HTMLElement | null = null;
  private player: FilmPlayer | null = null;
  private reel: FilmReel | null = null;
  private hi: FilmReel | null = null;
  private manifest!: FramesManifest;
  private choice!: { first: string; best: string; ext: 'avif' | 'webp' };
  private marks: { el: HTMLElement; at: [number, number] }[] = [];
  private rail: HTMLElement | null = null;
  private target = 0;
  private eased = 0;
  private ticking = false;
  private ended = false;
  private stopFiller: (() => void) | null = null;

  constructor(private options: DirectorOptions) {}

  /** Read by the QA harness, which asserts on painted frames, not scroll. */
  get state() {
    return {
      progress: this.eased,
      frame: this.player?.drawn ?? -1,
      frames: this.player?.frames ?? 0,
      ladder: this.player?.upgrade?.dir ?? this.reel?.dir ?? '',
      buffered: this.reel?.loaded ?? 0,
      ended: this.ended,
    };
  }

  async boot(): Promise<void> {
    const { root, base, tier, reducedMotion, onBootProgress, onBufferProgress } = this.options;
    this.section = root.querySelector<HTMLElement>('[data-film]');
    if (!this.section) {
      this.finish();
      return;
    }

    // Reduced motion never creates a canvas, a reel or a ScrollTrigger. The
    // stills already in the markup are the whole experience, and the page's
    // content is visible immediately rather than gated behind a film that is
    // not going to play.
    if (reducedMotion) {
      this.section.classList.add('film--still');
      this.finish();
      return;
    }

    const canvas = this.section.querySelector<HTMLCanvasElement>('[data-film-canvas]');
    if (!canvas) {
      this.finish();
      return;
    }

    this.manifest = await loadManifest(base);
    this.choice = await chooseLadders(this.manifest, tier);

    this.reel = new FilmReel(this.manifest, this.choice.first, this.choice.ext, base, {
      clips: HERO_CLIPS,
      window: tier === 'low' ? 24 : 40,
      // Hold the whole narrow reel. At 160 frames it is a couple of megabytes,
      // and holding it means scrolling back up through 520vh never re-fetches.
      retain: 'all',
    });
    if (!this.reel.count) {
      this.finish();
      return;
    }

    this.player = new FilmPlayer({
      canvas,
      ladder: this.reel,
      maxDpr: tier === 'low' ? 1.5 : 2,
    });

    this.marks = Array.from(this.section.querySelectorAll<HTMLElement>('[data-mark]')).map((el) => ({
      el,
      at: [Number(el.dataset.from ?? 0), Number(el.dataset.to ?? 1)],
    }));
    this.rail = this.section.querySelector<HTMLElement>('[data-film-rail]');

    this.applyScrollLength();

    // STAGE 1. Only what the opening viewport needs: the first frame and the
    // dozen behind it. The visitor is in before the rest of the reel exists.
    const opening = this.reel.clips[0];
    if (opening) await opening.loadCritical(CRITICAL_FRAMES, onBootProgress);
    else onBootProgress?.(1);
    this.player.render(0, true);

    this.attach();
    this.tick();
    this.startTicker();
    document.documentElement.classList.add('is-ready', 'film-running');
    ScrollTrigger.refresh();

    // Phase 2: the rest of the film, in order, at low priority, yielding
    // whenever the playhead has requests of its own outstanding.
    this.stopFiller = fillInBackground(this.reel, {
      skip: 1,
      busy: () => (this.reel?.clips.some((c) => c.inflight > 0) ?? false) && this.moving,
      onProgress: onBufferProgress,
    });

    this.upgrade();
  }

  /** True while the rendered progress is still chasing the scroll target. */
  private get moving(): boolean {
    return Math.abs(this.target - this.eased) > 0.0008;
  }

  /**
   * The film's height. Long on purpose — roughly 2.2vh of scroll per frame,
   * which is about half the speed of a conventional scroll-scrub.
   */
  private applyScrollLength(): void {
    if (!this.section) return;
    const mobile = window.matchMedia('(max-width: 860px)').matches;
    this.section.style.setProperty('--film-scroll', `${mobile ? SCROLL_VH_MOBILE : SCROLL_VH}vh`);
  }

  private attach(): void {
    if (!this.section) return;
    ScrollTrigger.create({
      trigger: this.section,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        this.target = self.progress;
      },
    });

    const skip = this.section.querySelector<HTMLElement>('[data-film-skip]');
    skip?.addEventListener('click', () => {
      const after = this.section!.offsetTop + this.section!.offsetHeight;
      window.scrollTo({ top: after, behavior: 'smooth' });
    });
  }

  /**
   * The wide ladder, streamed in behind the narrow one. Each frame is taken
   * from it the moment that exact frame is resident, so the picture sharpens
   * progressively instead of popping when the whole reel finishes.
   */
  private upgrade(): void {
    if (!this.player || this.choice.best === this.choice.first) return;
    this.hi = new FilmReel(this.manifest, this.choice.best, this.choice.ext, this.options.base, {
      clips: HERO_CLIPS,
      window: this.options.tier === 'low' ? 16 : 28,
    });
    this.player.setUpgrade(this.hi);
  }

  private startTicker(): void {
    if (this.ticking) return;
    this.ticking = true;
    gsap.ticker.add(() => this.tick());
  }

  /** Cleared after the first pass, so the rest state is painted once. */
  private primed = false;

  private tick(): void {
    if (!this.player || !this.reel) return;
    if (this.primed && !this.moving && this.eased === this.target) return;
    this.primed = true;

    // ~0.16 closes most of the gap in three frames: enough to smooth a
    // trackpad's step quantisation, not enough to feel like lag.
    this.eased += (this.target - this.eased) * 0.16;
    if (Math.abs(this.target - this.eased) < 0.0004) this.eased = this.target;

    // The ladder in use may be strided, so map the timeline's nominal frame
    // numbers onto however many frames this ladder actually has.
    const scale = (this.player.frames - 1) / (TOTAL_FRAMES - 1);
    const frame = frameAt(this.eased) * scale;
    const direction = this.target > this.eased ? 1 : -1;

    this.reel.ensure(frame, direction * 0.6);
    this.hi?.ensure(frame, direction * 0.4);
    this.player.render(frame);

    for (const mark of this.marks) {
      mark.el.classList.toggle('is-on', this.eased >= mark.at[0] && this.eased <= mark.at[1]);
    }
    if (this.rail) {
      this.rail.style.transform = `scaleX(${Math.min(1, this.eased / FILM_END)})`;
    }
    // The scroll hint has done its job the moment the film actually moves.
    this.section?.classList.toggle('has-moved', this.eased > 0.006);

    // The film is over. Everything the page has to say begins here and not a
    // pixel of scroll earlier.
    const over = this.eased >= FILM_END;
    if (over !== this.ended) {
      this.ended = over;
      this.section?.classList.toggle('is-over', over);
      document.documentElement.classList.toggle('film-running', !over);
    }
  }

  /** Marks the page usable when there is no film to wait for. */
  private finish(): void {
    this.ended = true;
    this.options.onBootProgress?.(1);
    this.options.onBufferProgress?.(1);
    document.documentElement.classList.add('is-ready');
    document.documentElement.classList.remove('film-running');
  }

  /** Scroll offset at which a given clip begins — used by the QA harness. */
  segmentStarts(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const segment of SEGMENTS) out[segment.id] = progressAtFrame(segment.from);
    return out;
  }

  refresh(): void {
    this.applyScrollLength();
    ScrollTrigger.refresh();
  }

  dispose(): void {
    this.stopFiller?.();
    this.player?.dispose();
  }
}
