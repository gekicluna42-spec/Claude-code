import { prefersReducedMotion } from './dom';

/**
 * Marks elements in as they enter. Under reduced motion nothing is hidden in
 * the first place, so this exits before observing anything.
 */
export function initReveal(root: ParentNode = document): void {
  if (prefersReducedMotion()) return;
  const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
  if (!targets.length) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
  );
  for (const t of targets) io.observe(t);
}

/** Tags the elements that should animate in, so the templates stay clean. */
export function markReveals(root: ParentNode = document): void {
  if (prefersReducedMotion()) return;
  const selectors = [
    '.shead', '.disc__item', '.price', '.bundle', '.panel__copy', '.demo',
    '.showcase__item', '.shop__item', '.guide', '.process__step', '.chain__step',
    '.offer__card', '.offer__copy', '.audit__form', '.contact__form', '.contact__direct',
    '.positioning__body', '.split__media',
  ];
  root.querySelectorAll<HTMLElement>(selectors.join(',')).forEach((el, i) => {
    el.setAttribute('data-reveal', '');
    el.style.transitionDelay = `${Math.min(i % 4, 3) * 60}ms`;
  });
}
