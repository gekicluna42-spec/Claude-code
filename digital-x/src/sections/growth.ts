/**
 * GROWTH PATH — one signal travelling Otkrivanje → Web → Interakcija →
 * Automatizacija → Konverzija.
 *
 * Three ways in, because three kinds of visitor arrive here: scrolling the
 * section scrubs the signal along the rail, hovering a stage jumps to it, and
 * clicking or tabbing to a stage selects it. On a phone the rail is hidden and
 * the stages are simply five cards you step through.
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { $, $$, clamp, isMobile, prefersReducedMotion } from '../lib/dom';

export function initGrowth(): void {
  const section = $('[data-growth]');
  if (!section) return;

  const stages = $$<HTMLElement>('[data-stage]', section);
  const buttons = $$<HTMLButtonElement>('[data-stage-btn]', section);
  const signal = $('[data-growth-signal]', section);
  const live = $<SVGPathElement>('[data-growth-live]', section);
  if (!stages.length) return;

  let current = 0;
  const last = stages.length - 1;

  const apply = (index: number): void => {
    current = clamp(Math.round(index), 0, last);
    stages.forEach((s, i) => s.classList.toggle('is-on', i === current));
    const ratio = last ? current / last : 0;
    if (signal) signal.style.left = `${2 + ratio * 96}%`;
    if (live) live.style.strokeDashoffset = String(1 - ratio);
  };

  for (const [i, button] of buttons.entries()) {
    button.addEventListener('click', () => apply(i));
    button.addEventListener('focus', () => apply(i));
    if (!isMobile()) button.addEventListener('pointerenter', () => apply(i));
  }

  apply(0);

  if (prefersReducedMotion() || isMobile()) {
    // Stepped, not scrubbed: every body is already visible in CSS, so there is
    // nothing to reveal and no scroll handler to run.
    return;
  }

  // Scrubbing the section moves the signal. `once: false` so it tracks in both
  // directions, matching the films.
  ScrollTrigger.create({
    trigger: section,
    start: 'top 72%',
    end: 'bottom 60%',
    onUpdate: (self) => {
      const next = Math.round(self.progress * last);
      if (next !== current) apply(next);
    },
  });

  if (live) {
    gsap.set(live, { strokeDasharray: 1, strokeDashoffset: 1 });
  }
}
