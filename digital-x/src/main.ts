/**
 * Entry point.
 *
 * Order matters here. The page is already complete markup by the time this
 * runs — the bundle's job is to add the cinematic layer on top, and to add
 * nothing at all when the visitor has asked for reduced motion.
 */

import './styles/index.css';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

import { Director } from './cinema/director';
import { $, deviceTier, prefersReducedMotion } from './lib/dom';
import { initReveal, markReveals } from './lib/reveal';
import { initAudit } from './sections/audit';
import { initChain } from './sections/chain';
import { initCompare } from './sections/compare';
import { initContact } from './sections/contact';
import { initExplorer } from './sections/explorer';
import { initGrowth } from './sections/growth';
import { initNav } from './sections/nav';

gsap.registerPlugin(ScrollTrigger);

const reduced = prefersReducedMotion();
const tier = deviceTier();
/** '' in the normal build; the single-file build serves everything inline. */
const BASE = '';

function startLenis(): Lenis | null {
  if (reduced) return null;
  const lenis = new Lenis({
    // Long enough to feel like a dolly, short enough that the picture never
    // trails the thumb. Paired with the director's own 0.16 ease.
    lerp: 0.09,
    wheelMultiplier: 0.9,
    touchMultiplier: 1.5,
    smoothWheel: true,
  });
  // One clock for both: Lenis on GSAP's ticker means ScrollTrigger reads a
  // scroll position that has already been updated this frame.
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

/**
 * The curtain can always be dismissed. A visitor who does not want to wait for
 * 192 frames should not have to — the posters are already behind it.
 */
function bootUi(): void {
  $('[data-boot-skip]')?.addEventListener('click', () => {
    document.documentElement.classList.add('is-ready');
  });
}

function onBootProgress(ratio: number): void {
  const bar = $('[data-boot-bar]');
  const pct = $('[data-boot-pct]');
  const value = Math.min(100, Math.round(ratio * 100));
  if (bar) bar.style.width = `${value}%`;
  if (pct) pct.textContent = `${value}%`;
}

async function main(): Promise<void> {
  bootUi();
  markReveals();

  const lenis = startLenis();
  initNav(lenis);
  initCompare();
  initGrowth();
  initChain();
  initAudit();
  initContact();
  initReveal();

  const director = new Director({
    root: document,
    base: BASE,
    tier,
    reducedMotion: reduced,
    onBootProgress,
  });

  // Exposed for the QA harness, which asserts on real painted frame indices
  // rather than on scroll position.
  (window as unknown as { __dx?: unknown }).__dx = {
    state: () => director.state,
    reduced,
    tier,
  };

  try {
    await director.boot();
  } catch (error) {
    // A failed film must never take the page with it. Reveal the content and
    // leave the posters in place.
    console.warn('[digital-x] cinematic layer unavailable:', error);
    document.documentElement.classList.add('is-ready');
  }

  void initExplorer({ base: BASE, tier });

  let last = window.innerWidth;
  window.addEventListener('resize', () => {
    if (Math.abs(window.innerWidth - last) < 60) return;
    last = window.innerWidth;
    director.refresh();
  });
}

void main();
