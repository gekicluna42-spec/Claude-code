/**
 * VANTA HYPERCAR — a scroll-scrubbed cinematic film, built as a self-contained
 * companion to the hero.
 *
 * It scrubs the same way the hero does — a decoded FRAME SEQUENCE blitted into
 * a canvas rather than a seeked <video> — but it owns none of the hero's
 * machinery: no boot curtain, no `film-running` gate on <html>, no timeline
 * keys. It is one tall section with a sticky 100vh stage; scroll position
 * inside the section maps linearly to a frame, and a per-frame ease chases it
 * so the picture reads as a camera rather than a slider.
 *
 * Nothing here is required for the page to work. With JavaScript off, or under
 * reduced motion, the markup already shows the film as its stills and every
 * caption is real text — this layer only upgrades that to a moving picture.
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { FilmPlayer } from '../cinema/FilmPlayer';
import { FrameLadder, chooseLadders } from '../cinema/ladder';
import { $, clamp, prefersReducedMotion } from '../lib/dom';

gsap.registerPlugin(ScrollTrigger);

/** Shape of public/media/frames/vanta.json, written by scripts/vanta.mjs. */
interface VantaManifest {
  id: string;
  aspect: number;
  source: { frames: number; fps: number };
  ladders: { dir: string; width: number; webp: boolean; count: number }[];
}

export interface VantaOptions {
  base: string;
  tier: 'high' | 'low';
}

let cached: Promise<VantaManifest> | null = null;
function loadVanta(base: string): Promise<VantaManifest> {
  cached ??= fetch(`${base}/media/frames/vanta.json`).then((r) => {
    if (!r.ok) throw new Error(`vanta.json ${r.status}`);
    return r.json() as Promise<VantaManifest>;
  });
  return cached;
}

export async function initVanta(options: VantaOptions): Promise<void> {
  const section = $('[data-vanta]');
  if (!section) return;

  // Reduced motion keeps the stills that are already in the markup. There is
  // no canvas, no reel and no ScrollTrigger — the picture is the filmstrip.
  if (prefersReducedMotion()) return;

  const canvas = $<HTMLCanvasElement>('[data-vanta-canvas]', section);
  const stage = $('[data-vanta-stage]', section);
  const rail = $('[data-vanta-rail]', section);
  const marks = Array.from(section.querySelectorAll<HTMLElement>('[data-vanta-mark]'));
  if (!canvas || !stage) return;

  // Nothing is fetched until the section is near the viewport — no reason to
  // spend a phone's data on the hypercar while the visitor is still up top.
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      void start(section, canvas, stage, rail, marks, options);
    },
    { rootMargin: '80% 0px' },
  );
  io.observe(section);
}

async function start(
  section: HTMLElement,
  canvas: HTMLCanvasElement,
  stage: HTMLElement,
  rail: HTMLElement | null,
  marks: HTMLElement[],
  options: VantaOptions,
): Promise<void> {
  let manifest: VantaManifest;
  try {
    manifest = await loadVanta(options.base);
  } catch (error) {
    // A missing reel must never break the page — the stills stay.
    console.warn('[vanta] frames unavailable:', error);
    return;
  }

  // The wide ladder is only worth its weight on a capable device; a phone
  // scrubs the narrow one it already downloaded for first paint.
  const choice = await chooseLadders(
    { aspect: manifest.aspect, ladders: manifest.ladders, chapters: [] } as never,
    options.tier,
  );
  const firstSpec =
    manifest.ladders.find((l) => l.dir === choice.first) ?? manifest.ladders[0]!;
  const count = firstSpec.count;
  if (!count) return;

  const ladder = new FrameLadder({
    chapterId: 'vanta',
    dir: firstSpec.dir,
    count,
    ext: choice.ext,
    base: options.base,
    // The whole reel is small, so keep every frame once decoded — scrolling
    // back up through the section then never re-fetches.
    window: Math.ceil(count / 2),
    retain: 'all',
  });
  const player = new FilmPlayer({
    canvas,
    ladder,
    maxDpr: options.tier === 'low' ? 1.5 : 2,
    fit: 'cover',
  });

  // Optionally sharpen with the wide ladder, frame by frame, behind the narrow.
  if (choice.best !== choice.first) {
    const bestSpec = manifest.ladders.find((l) => l.dir === choice.best);
    if (bestSpec?.count) {
      const hi = new FrameLadder({
        chapterId: 'vanta',
        dir: bestSpec.dir,
        count: bestSpec.count,
        ext: choice.ext,
        base: options.base,
        window: options.tier === 'low' ? 16 : 28,
      });
      player.setUpgrade(hi);
    }
  }

  const target = { p: 0 };
  const eased = { p: -1 };

  const draw = (): void => {
    const frame = eased.p * (count - 1);
    const direction = target.p >= eased.p ? 1 : -1;
    ladder.ensure(frame, direction * 0.6);
    player.upgrade?.ensure(frame, direction * 0.4);
    const painted = player.render(frame);
    if (painted >= 0) stage.classList.add('is-live');
    if (rail) rail.style.transform = `scaleX(${clamp(eased.p, 0, 1)})`;
    for (const mark of marks) {
      const from = Number(mark.dataset.from ?? 0);
      const to = Number(mark.dataset.to ?? 1);
      mark.classList.toggle('is-on', eased.p >= from && eased.p <= to);
    }
    section.classList.toggle('has-moved', eased.p > 0.01);
  };

  // Warm the head of the reel and paint the first frame as soon as it lands.
  ladder.ensure(0, 1);
  const poll = window.setInterval(() => {
    if (player.render(0) >= 0) {
      stage.classList.add('is-live');
      draw();
      window.clearInterval(poll);
    }
  }, 120);
  window.setTimeout(() => window.clearInterval(poll), 15000);

  // A per-frame ease chases the scroll target — the difference between a
  // slider and a camera. Runs only while there is a gap to close.
  let running = false;
  const tick = (): void => {
    if (eased.p < 0) eased.p = target.p;
    eased.p += (target.p - eased.p) * 0.16;
    if (Math.abs(target.p - eased.p) < 0.0004) {
      eased.p = target.p;
      running = false;
      gsap.ticker.remove(tick);
    }
    draw();
  };
  const kick = (): void => {
    if (running) return;
    running = true;
    gsap.ticker.add(tick);
  };

  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      target.p = clamp(self.progress, 0, 1);
      kick();
    },
  });

  // Paint the correct frame immediately if the section is already in view.
  ScrollTrigger.refresh();
  kick();
}

