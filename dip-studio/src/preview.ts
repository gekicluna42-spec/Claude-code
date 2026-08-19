/**
 * Single-file preview entry.
 *
 * Identical behaviour to main.ts, but every import is static so the whole
 * experience can be inlined into one self-contained HTML file for sharing.
 * The production entry stays code-split — see main.ts.
 */

import '@fontsource/playfair-display/latin-ext-400.css';
import '@fontsource/playfair-display/latin-ext-500.css';
import '@fontsource-variable/inter/index.css';

import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/hero.css';
import './styles/sections.css';

import Lenis from 'lenis';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { clipUrl, CLIP_POSTER } from './data/clip';
import { initNav } from './nav';
import { initReveal } from './lib/reveal';
import { prefersReducedMotion } from './lib/dom';
import { initLibrary } from './sections/library';
import { initCatalog } from './sections/catalog';
import { initBuilder } from './sections/builder';
import { initCompare } from './sections/compare';
import { initGallery } from './sections/gallery';
import { initSocial } from './sections/social';
import { initAbout } from './sections/about';
import { initEffectPreview } from './sections/effect-preview';
import { initBooking } from './booking/booking';
import { mountHero } from './hero';

function boot(): void {
  initAbout();
  initLibrary();
  initCatalog();
  initBuilder();
  initGallery();
  initSocial();
  initEffectPreview();

  initNav();
  initCompare();
  initBooking();
  initReveal();

  if (prefersReducedMotion()) return;

  const lenis = new Lenis({ duration: 1.05, smoothWheel: true });
  const raf = (time: number): void => {
    lenis.raf(time);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
  lenis.on('scroll', ScrollTrigger.update);

  // One file cannot carry 120 frames, so the shareable build scrubs the clip.
  void mountHero({ videoUrl: clipUrl(), imageUrl: CLIP_POSTER }).then(() => ScrollTrigger.refresh());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
