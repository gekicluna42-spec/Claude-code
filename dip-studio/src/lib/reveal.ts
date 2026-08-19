/**
 * Scroll reveal. One observer for the whole page, unobserving as it goes —
 * cheaper than a ScrollTrigger per element and immune to layout thrash.
 */

import { prefersReducedMotion, qsa } from './dom';

export function initReveal(): void {
  const targets = qsa('[data-reveal]');

  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-revealed'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
  );

  targets.forEach((el) => observer.observe(el));
}

/** Reveal freshly injected nodes (library cards, gallery items). */
export function revealNow(root: ParentNode): void {
  qsa('[data-reveal]', root).forEach((el, i) => {
    el.style.setProperty('--reveal-delay', `${Math.min(i * 60, 360)}ms`);
    requestAnimationFrame(() => el.classList.add('is-revealed'));
  });
}
