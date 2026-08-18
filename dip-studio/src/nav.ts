/** Sticky navigation, mobile menu and the sticky mobile CTA. */

import { qs, qsa } from './lib/dom';

export function initNav(): void {
  const nav = qs('#nav');
  const toggle = qs<HTMLButtonElement>('#nav-toggle');
  const links = qs('#nav-links');
  const sticky = qs('#sticky-cta');
  const hero = qs('#hero');

  if (nav) {
    const onScroll = (): void => {
      nav.classList.toggle('is-stuck', window.scrollY > 24);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  if (toggle && links) {
    const setOpen = (open: boolean): void => {
      toggle.setAttribute('aria-expanded', String(open));
      links.classList.toggle('is-open', open);
      document.documentElement.classList.toggle('lenis-stopped', open);
    };

    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    qsa('a', links).forEach((link) => link.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  // The mobile CTA appears once the visitor has left the hero, where the
  // primary buttons already are.
  if (sticky && hero && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      ([entry]) => sticky.classList.toggle('is-visible', !entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(hero);
  }
}
