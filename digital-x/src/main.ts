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
import type { Engine } from './engine';
import { FILM_END, KEYS, SCROLL_VH, SCROLL_VH_MOBILE, SEGMENTS } from './cinema/timeline';
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

/**
 * A safety valve. The film gates every heading, link and CTA on the page, so if
 * the reel never reaches its final frame — a failed fetch, an unsupported
 * codec — the visitor would be left with a picture and no way out. If the gate
 * is still up well after boot and the visitor has scrolled past the film,
 * lift it.
 */
function watchGate(): void {
  const film = $('[data-film]');
  if (!film) return;
  window.setInterval(() => {
    if (!document.documentElement.classList.contains('film-running')) return;
    const past = window.scrollY > film.offsetTop + film.offsetHeight - window.innerHeight * 1.2;
    if (past) document.documentElement.classList.remove('film-running');
  }, 1000);
}

/** The curtain's counter: the opening clip, which really is blocking. */
function onBootProgress(ratio: number): void {
  const bar = $('[data-boot-bar]');
  const pct = $('[data-boot-pct]');
  const value = Math.min(100, Math.round(ratio * 100));
  if (bar) bar.style.width = `${value}%`;
  if (pct) pct.textContent = `${value}%`;
}

/**
 * The hairline at the top of the viewport: how much of the rest of the film has
 * arrived. The film is long and has no copy on it, so without this a slow
 * connection looks the same as a broken page.
 */
function onBufferProgress(ratio: number): void {
  const bar = $('[data-buffer-bar]');
  if (bar) bar.style.width = `${Math.min(100, Math.round(ratio * 100))}%`;
}

async function main(): Promise<void> {
  bootUi();
  watchGate();
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
    onBufferProgress,
  });

  // Exposed for the QA harness, which asserts on real painted frame indices
  // rather than on scroll position.
  // Exposed for the QA harness. It asserts against the film's real
  // configuration rather than numbers copied into the test, so retiming the
  // film cannot leave the checks quietly measuring the wrong thing.
  (window as unknown as { __dx?: unknown }).__dx = {
    state: () => director.state,
    segments: () => director.segmentStarts(),
    film: () => ({
      keys: KEYS,
      filmEnd: FILM_END,
      scrollVh: SCROLL_VH,
      scrollVhMobile: SCROLL_VH_MOBILE,
      beats: SEGMENTS.length,
    }),
    reduced,
    tier,
  };

  try {
    await director.boot();
  } catch (error) {
    // A failed film must never take the page with it. Reveal the content and
    // leave the posters in place.
    console.warn('[digital-x] cinematic layer unavailable:', error);
    // Never let a failed film hold the page hostage: drop the gate so the
    // content below is reachable, and leave the posters in place.
    document.documentElement.classList.add('is-ready');
    document.documentElement.classList.remove('film-running');
  }

  void initExplorer({ base: BASE, tier });

  // The Signal Engine goes on last, is loaded separately, and is allowed to
  // fail. Three.js is ~150 KB gzipped — asking the visitor to download it
  // before the film can start would trade the thing they came for against the
  // thing behind it. So it arrives after, on its own, and a refused GL
  // context, an old driver or a device that simply cannot are all fine: the
  // page is already complete without it.
  let engine: Engine | null = null;
  (window as unknown as { __dx?: Record<string, unknown> }).__dx!.engine = () => ({
    ok: Boolean(engine?.ok),
    loaded: engine !== null,
  });

  if (!reduced) {
    void import('./engine')
      .then((module) => {
        engine = module.mountEngine();
      })
      .catch((error) => {
        console.warn('[digital-x] signal engine unavailable:', error);
      });
  }

  let last = window.innerWidth;
  window.addEventListener('resize', () => {
    if (Math.abs(window.innerWidth - last) < 60) return;
    last = window.innerWidth;
    director.refresh();
  });
}

void main();
