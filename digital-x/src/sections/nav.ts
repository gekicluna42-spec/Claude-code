/**
 * The header: sticks after the first chapter, collapses to a full-screen sheet
 * below 860px, and hands anchor jumps to Lenis so the smooth scroller and the
 * browser never fight over the same scroll position.
 */

import type Lenis from 'lenis';
import { $, $$, prefersReducedMotion } from '../lib/dom';

export function initNav(lenis: Lenis | null): void {
  const nav = $('[data-nav]');
  const toggle = $<HTMLButtonElement>('[data-nav-toggle]');
  const sheet = $('[data-nav-sheet]');

  if (nav) {
    const onScroll = () => nav.classList.toggle('is-stuck', window.scrollY > window.innerHeight * 0.5);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  const closeSheet = () => {
    if (!sheet || !toggle) return;
    sheet.setAttribute('hidden', '');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };

  toggle?.addEventListener('click', () => {
    if (!sheet) return;
    const open = toggle.getAttribute('aria-expanded') === 'true';
    if (open) {
      closeSheet();
    } else {
      sheet.removeAttribute('hidden');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeSheet();
  });

  for (const link of $$<HTMLAnchorElement>('a[href^="#"]')) {
    link.addEventListener('click', (event) => {
      const id = link.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      event.preventDefault();
      closeSheet();
      if (lenis && !prefersReducedMotion()) {
        lenis.scrollTo(target as HTMLElement, { offset: -72, duration: 1.4 });
      } else {
        (target as HTMLElement).scrollIntoView({
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
          block: 'start',
        });
      }
      // Keep the deep link in the address bar without triggering a jump. Some
      // sandboxed embeddings refuse history writes; the scroll already happened.
      try {
        history.replaceState(null, '', id);
      } catch {
        /* ignore */
      }
    });
  }
}
