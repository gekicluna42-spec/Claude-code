/**
 * Wires the four chapters to the scrollbar.
 *
 * Each chapter is a tall <section> containing a sticky 100vh stage. Scroll
 * position drives a target film progress; a per-frame ease chases it. The ease
 * is the difference between a slider and a camera — without it every scroll
 * tick reads as a jolt, with too much of it the picture lags the thumb.
 *
 * Nothing here autoplays. Film time is a function of scroll position, so
 * stopping stops the film and scrolling back runs it backwards.
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CHAPTERS, type ChapterDef } from './chapters';
import { ChapterPlayer } from './ChapterPlayer';
import { FrameLadder, chooseLadders } from './ladder';
import { loadManifest, type FramesManifest } from './manifest';

gsap.registerPlugin(ScrollTrigger);

export interface DirectorOptions {
  root: ParentNode;
  base: string;
  tier: 'high' | 'low';
  reducedMotion: boolean;
  onBootProgress?: (ratio: number) => void;
}

interface Mounted {
  def: ChapterDef;
  section: HTMLElement;
  stage: HTMLElement;
  player: ChapterPlayer;
  base: FrameLadder;
  /** Scroll progress, 0..1 across the section. */
  target: number;
  eased: number;
  active: boolean;
  cues: { el: HTMLElement; at: [number, number] }[];
  upgraded: boolean;
  /** False until this chapter has rendered once, so the first pass always runs. */
  primed: boolean;
}

export class Director {
  private mounted: Mounted[] = [];
  private manifest!: FramesManifest;
  private ladderChoice!: { first: string; best: string; ext: 'avif' | 'webp' };
  private ticking = false;

  constructor(private options: DirectorOptions) {}

  /** Frame index each chapter last painted — the QA harness reads this. */
  get state() {
    return this.mounted.map((m) => ({
      id: m.def.id,
      progress: m.eased,
      frame: m.player.drawn,
      frames: m.player.frames,
      active: m.active,
      ladder: m.player.upgrade?.dir ?? m.base.dir,
    }));
  }

  async boot(): Promise<void> {
    const { root, base, tier, reducedMotion, onBootProgress } = this.options;
    this.manifest = await loadManifest(base);
    this.ladderChoice = await chooseLadders(this.manifest, tier);

    const sections = Array.from(root.querySelectorAll<HTMLElement>('[data-chapter]'));
    for (const section of sections) {
      const def = CHAPTERS.find((c) => c.id === section.dataset.chapter);
      if (!def) continue;
      const stage = section.querySelector<HTMLElement>('.chapter__stage');
      const canvas = section.querySelector<HTMLCanvasElement>('canvas');
      if (!stage || !canvas) continue;

      // Reduced motion keeps the posters that are already in the HTML and
      // never creates a canvas context, a ladder or a ScrollTrigger.
      if (reducedMotion) {
        section.classList.add('chapter--still');
        continue;
      }

      const counts = this.manifest.chapters.find((c) => c.id === def.id)?.counts;
      const count = counts?.[this.ladderChoice.first];
      if (!count) continue;

      const ladder = new FrameLadder({
        chapterId: def.id,
        dir: this.ladderChoice.first,
        count,
        ext: this.ladderChoice.ext,
        base,
        window: tier === 'low' ? 14 : 26,
      });
      const player = new ChapterPlayer({ canvas, ladder, maxDpr: tier === 'low' ? 1.5 : 2 });

      this.mounted.push({
        def,
        section,
        stage,
        player,
        base: ladder,
        target: 0,
        eased: 0,
        active: false,
        upgraded: false,
        primed: false,
        cues: def.cues
          .map((c) => ({ el: section.querySelector<HTMLElement>(`[data-cue="${c.id}"]`)!, at: c.at }))
          .filter((c) => c.el),
      });
    }

    if (reducedMotion || !this.mounted.length) {
      onBootProgress?.(1);
      document.documentElement.classList.add('is-ready');
      return;
    }

    this.applyScrollLengths();

    // The opening chapter loads in full before the curtain lifts. Everything
    // after it streams in around the playhead, so this is the only wait.
    const first = this.mounted[0]!;
    await first.base.loadAll(onBootProgress);
    first.player.render(0, true);

    for (const m of this.mounted) this.attach(m);
    // One forced pass before the curtain lifts: every chapter paints its
    // opening frame and lights its first cue, so nothing is mid-transition
    // when the page becomes visible.
    this.tick();
    this.startTicker();
    document.documentElement.classList.add('is-ready');
    ScrollTrigger.refresh();

    // Second chapter's opening frames, once the browser is otherwise idle —
    // the visitor is still reading the hero at this point.
    this.idle(() => this.mounted[1]?.base.ensure(0, 1));
  }

  /**
   * Section heights come from the chapter definitions rather than the
   * stylesheet, so the ratio between chapters — THE REVEAL being the longest —
   * is stated once, in the place the curves are stated.
   */
  private applyScrollLengths(): void {
    const mobile = window.matchMedia('(max-width: 860px)').matches;
    for (const m of this.mounted) {
      m.section.style.setProperty('--chapter-scroll', `${mobile ? m.def.scrollMobile : m.def.scroll}vh`);
    }
  }

  private attach(m: Mounted): void {
    ScrollTrigger.create({
      trigger: m.section,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        m.target = self.progress;
      },
      onToggle: (self) => {
        m.active = self.isActive;
        m.section.classList.toggle('is-live', self.isActive);
        if (self.isActive) this.onEnter(m);
      },
    });
  }

  private onEnter(m: Mounted): void {
    const index = this.mounted.indexOf(m);
    // Warm the next chapter's opening so the hand-off never shows a poster.
    this.mounted[index + 1]?.base.ensure(0, 1);
    if (m.upgraded || this.ladderChoice.best === this.ladderChoice.first) return;
    m.upgraded = true;
    const count = this.manifest.chapters.find((c) => c.id === m.def.id)?.counts[this.ladderChoice.best];
    if (!count) return;
    const hi = new FrameLadder({
      chapterId: m.def.id,
      dir: this.ladderChoice.best,
      count,
      ext: this.ladderChoice.ext,
      base: this.options.base,
      window: this.options.tier === 'low' ? 10 : 20,
    });
    m.player.setUpgrade(hi);
  }

  private startTicker(): void {
    if (this.ticking) return;
    this.ticking = true;
    gsap.ticker.add(() => this.tick());
  }

  private tick(): void {
    for (const m of this.mounted) {
      if (m.primed && !m.active && Math.abs(m.target - m.eased) < 0.0005) continue;
      m.primed = true;

      // ~0.16 closes most of the gap in three frames: enough to smooth a
      // trackpad's step quantisation, not enough to feel like lag.
      m.eased += (m.target - m.eased) * 0.16;
      if (Math.abs(m.target - m.eased) < 0.0004) m.eased = m.target;

      const film = m.def.curve(m.eased);
      const frame = film * (m.player.frames - 1);
      const direction = m.target > m.eased ? 1 : -1;

      m.base.ensure(frame, direction * 0.6);
      m.player.upgrade?.ensure(frame, direction * 0.4);
      m.player.render(frame);

      for (const cue of m.cues) {
        const [from, to] = cue.at;
        cue.el.classList.toggle('is-on', m.eased >= from && m.eased <= to);
      }
    }
  }

  private idle(fn: () => void): void {
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => void })
      .requestIdleCallback;
    if (ric) ric(fn);
    else window.setTimeout(fn, 1200);
  }

  /** Used by the System Explorer, which borrows THE SYSTEM's ladder. */
  ladderFor(chapterId: string): FrameLadder | null {
    return this.mounted.find((m) => m.def.id === chapterId)?.base ?? null;
  }

  refresh(): void {
    this.applyScrollLengths();
    ScrollTrigger.refresh();
  }
}
