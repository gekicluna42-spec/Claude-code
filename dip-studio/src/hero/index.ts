/**
 * Binds the stage to the page: scroll drives progress, progress drives the
 * frame, the copy beats and the act indicator. Nothing here runs when the
 * visitor asked for reduced motion, or when WebGL is unavailable — the
 * static hero image is already in the DOM and simply stays.
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HeroStage } from './HeroStage';
import {
  createFrameSequenceSource,
  createImageSource,
  createVideoSource,
  type HeroSource,
} from './sources';
import { acts, actProgress } from './timeline';

gsap.registerPlugin(ScrollTrigger);

export interface HeroConfig {
  /** Still used when nothing better loads — also the DOM fallback image. */
  imageUrl: string;
  /**
   * Frame-sequence manifest. This is the default: scrubbing decoded frames
   * is smooth everywhere, where seeking a video under scroll is not.
   */
  framesUrl?: string;
  /** A video to scrub instead. Used by the single-file preview build. */
  videoUrl?: string;
}

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl')),
    );
  } catch {
    return false;
  }
}

export async function mountHero(config: HeroConfig): Promise<void> {
  const hero = document.querySelector<HTMLElement>('#hero');
  const canvas = document.querySelector<HTMLCanvasElement>('#hero-canvas');
  const hint = document.querySelector<HTMLElement>('.hero__hint');
  const indicator = document.querySelector<HTMLElement>('.acts');
  const beats = Array.from(document.querySelectorAll<HTMLElement>('.hero__beat'));
  const items = Array.from(document.querySelectorAll<HTMLElement>('.acts__item'));

  if (!hero || !canvas || !hasWebGL()) return;

  const quality: 'high' | 'low' =
    window.matchMedia('(max-width: 900px)').matches || navigator.hardwareConcurrency <= 4
      ? 'low'
      : 'high';

  let source: HeroSource;
  try {
    if (config.videoUrl) source = await createVideoSource(config.videoUrl);
    else if (config.framesUrl) source = await createFrameSequenceSource(config.framesUrl);
    else source = await createImageSource(config.imageUrl);
  } catch {
    // Losing the sequence must never take the page down: fall back to the
    // still, and if even that fails, leave the DOM hero image in place.
    try {
      source = await createImageSource(config.imageUrl);
    } catch {
      return;
    }
  }

  const stage = new HeroStage({
    canvas,
    source,
    quality,
    // Touch reads lag more harshly than a wheel does, so phones glide less.
    smoothing: quality === 'low' ? 0.05 : 0.07,
  });
  canvas.classList.add('is-live');

  // Render — and show the act rail — only while the hero is on screen.
  const visibility = new IntersectionObserver(
    ([entry]) => {
      indicator?.classList.toggle('is-visible', entry.isIntersecting);
      if (entry.isIntersecting) stage.start();
      else stage.stop();
    },
    { threshold: 0 },
  );
  visibility.observe(hero);

  let activeBeat = -1;

  const applyProgress = (p: number, snap = false): void => {
    if (snap) stage.snapProgress(p);
    else stage.setProgress(p);

    const { index, local } = actProgress(p);

    if (index !== activeBeat) {
      activeBeat = index;
      beats.forEach((beat, i) => beat.classList.toggle('is-active', i === index));
      items.forEach((item, i) => {
        item.setAttribute('aria-current', String(i === index));
        if (i < index) item.style.setProperty('--act-progress', '1');
        if (i > index) item.style.setProperty('--act-progress', '0');
      });
      hero.dataset.act = acts[index].id;
    }

    items[index]?.style.setProperty('--act-progress', local.toFixed(3));
    hint?.classList.toggle('is-hidden', p > 0.04);
  };

  ScrollTrigger.create({
    trigger: hero,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => applyProgress(self.progress),
    // A refresh is a jump, not a move: land on it rather than gliding there.
    onRefresh: (self) => applyProgress(self.progress, true),
  });

  applyProgress(0, true);

  // Measurement hook for scripts/qa.mjs — only when explicitly asked for, so
  // nothing is exposed on the live site.
  if (new URLSearchParams(window.location.search).has('qa')) {
    (window as unknown as { __DIP_HERO__?: unknown }).__DIP_HERO__ = {
      rendered: () => stage.renderedProgress,
      target: () => stage.targetProgress,
    };
  }
}
