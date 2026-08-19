/**
 * Entry point for the dedicated service pages. They share the design system
 * and the booking flow, but not the hero engine — these pages are read, not
 * scrubbed.
 */

import '@fontsource/playfair-display/latin-ext-400.css';
import '@fontsource/playfair-display/latin-ext-500.css';
import '@fontsource-variable/inter/index.css';

import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/sections.css';

import { initNav } from './nav';
import { initReveal } from './lib/reveal';
import { initAbout } from './sections/about';
import { initEffectPreview } from './sections/effect-preview';
import { initBooking } from './booking/booking';

function boot(): void {
  initAbout();
  initEffectPreview();
  initNav();
  initBooking();
  initReveal();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
