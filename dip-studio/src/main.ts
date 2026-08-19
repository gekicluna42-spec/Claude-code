/**
 * DIP Studio — entry point.
 *
 * Order matters: content first, then behaviour, then the WebGL hero, which
 * is code-split so it never blocks the first paint.
 */

import '@fontsource/playfair-display/latin-ext-400.css';
import '@fontsource/playfair-display/latin-ext-500.css';
import '@fontsource-variable/inter/index.css';

import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/hero.css';
import './styles/sections.css';

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

function boot(): void {
  // Content sections render before any listener is wired, so the booking
  // modal picks up every trigger they inject.
  initAbout();
  initLibrary();
  initCatalog();
  initBuilder();
  initGallery();
  initSocial();

  // After the sections (it binds their preview buttons) and before booking
  // (its panel contributes a booking trigger).
  initEffectPreview();

  initNav();
  initCompare();
  initBooking();
  initReveal();

  if (prefersReducedMotion()) return;

  void (async () => {
    const [{ default: Lenis }, { mountHero }, { default: gsap }] = await Promise.all([
      import('lenis'),
      import('./hero'),
      import('gsap'),
    ]);

    const lenis = new Lenis({
      // lerp is frame-rate independent in Lenis 1.3; lower glides longer.
      lerp: 0.085,
      smoothWheel: true,
      wheelMultiplier: 0.9,
      syncTouch: true,
    });

    const { ScrollTrigger } = await import('gsap/ScrollTrigger');

    // One clock: Lenis, then ScrollTrigger, then the render loop. A second
    // requestAnimationFrame here would reorder them unpredictably.
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    // GSAP otherwise swallows updates after a slow frame, which shows up as a
    // jump in a scrubbed sequence.
    gsap.ticker.lagSmoothing(0);
    lenis.on('scroll', ScrollTrigger.update);

    await mountHero({
      framesUrl: '/media/frames/frames.json',
      imageUrl: '/media/clip-poster.jpg',
    });
    ScrollTrigger.refresh();
  })();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
