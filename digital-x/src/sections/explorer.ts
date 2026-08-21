/**
 * THE DIGITAL X SYSTEM.
 *
 * The X at the centre of this section is the film. Chapter three orbits the
 * completed structure, so each discipline is given a position in that orbit and
 * selecting one scrubs the ladder there — the X turns because the camera
 * turned, with the same materials, the same lighting and no second model to
 * keep in sync with the films.
 *
 * The control is a real tablist: arrow keys, Home/End, aria-selected. With
 * JavaScript off the first panel is already open and all six are in the markup.
 */

import gsap from 'gsap';
import { EXPLORER_RANGE } from '../cinema/timeline';
import { FilmPlayer } from '../cinema/FilmPlayer';
import { FrameLadder, chooseLadders } from '../cinema/ladder';
import { loadManifest } from '../cinema/manifest';
import { $, $$, prefersReducedMotion } from '../lib/dom';

export interface ExplorerOptions {
  base: string;
  tier: 'high' | 'low';
}

export async function initExplorer(options: ExplorerOptions): Promise<void> {
  const section = $('[data-explorer]');
  if (!section) return;

  const tabs = $$<HTMLButtonElement>('[role="tab"]', section);
  const panels = $$<HTMLElement>('[role="tabpanel"]', section);
  const dots = $$<HTMLElement>('[data-dot]', section);
  const orbitFill = $('[data-orbit-fill]', section);
  const explorer = $('.explorer', section);
  if (!tabs.length) return;

  let selected = 0;
  let scrub: ((orbit: number) => void) | null = null;

  const select = (index: number, focus = false): void => {
    selected = (index + tabs.length) % tabs.length;
    tabs.forEach((tab, i) => {
      const on = i === selected;
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;
      if (on && focus) tab.focus();
    });
    panels.forEach((panel, i) => {
      panel.hidden = i !== selected;
    });
    // The turn takes a second and a half. Restarting the panel's entrance
    // alongside it stops the copy from landing before the picture has moved —
    // without the class the swap reads as a jump cut whatever the camera does.
    const panel = panels[selected];
    if (panel && !prefersReducedMotion()) {
      panel.classList.remove('is-entering');
      void panel.offsetWidth; // reflow, so the animation restarts
      panel.classList.add('is-entering');
    }
    dots.forEach((dot, i) => dot.classList.toggle('is-on', i === selected));
    if (orbitFill) {
      orbitFill.style.width = tabs.length > 1 ? `${(selected / (tabs.length - 1)) * 100}%` : '0';
    }
    const orbit = Number(tabs[selected]!.dataset.orbit ?? 0);
    scrub?.(orbit);
  };

  for (const [i, tab] of tabs.entries()) {
    tab.addEventListener('click', () => select(i));
    tab.addEventListener('keydown', (event) => {
      const map: Record<string, number> = {
        ArrowRight: selected + 1,
        ArrowDown: selected + 1,
        ArrowLeft: selected - 1,
        ArrowUp: selected - 1,
        Home: 0,
        End: tabs.length - 1,
      };
      const next = map[event.key];
      if (next === undefined) return;
      event.preventDefault();
      select(next, true);
    });
  }

  if (prefersReducedMotion()) return;

  // The picture only comes up once the section is near the viewport — there is
  // no reason to spend a phone's data on it while the visitor is still in the
  // films.
  const canvas = $<HTMLCanvasElement>('[data-explorer-canvas]', section);
  if (!canvas || !explorer) return;

  const start = async (): Promise<void> => {
    const manifest = await loadManifest(options.base);
    const choice = await chooseLadders(manifest, options.tier);
    const chapter = manifest.chapters.find((c) => c.id === 'system');
    const count = chapter?.counts[choice.first];
    if (!count) return;

    // The manifest counts frames per ladder; the explorer's range is expressed
    // in source frames, so it is rescaled to whichever ladder is in use.
    const scale = count / (chapter!.source.frames || count);
    const lo = Math.round(EXPLORER_RANGE[0] * scale);
    const hi = Math.min(count - 1, Math.round(EXPLORER_RANGE[1] * scale));

    const ladder = new FrameLadder({
      chapterId: 'system',
      dir: choice.first,
      count,
      ext: choice.ext,
      base: options.base,
      window: hi - lo + 2,
    });
    const player = new FilmPlayer({
      canvas,
      ladder,
      maxDpr: options.tier === 'low' ? 1.5 : 2,
      fit: 'contain',
      fitScale: 0.9,
    });

    // Only the orbit slice is fetched, not the whole chapter.
    ladder.ensure((lo + hi) / 2, 0);

    const at = { frame: lo + (hi - lo) * Number(tabs[0]!.dataset.orbit ?? 0) };
    const draw = () => player.render(at.frame);

    /*
     * The turn. Duration scales with how far the camera has to travel, so
     * stepping to the neighbouring discipline is quick and jumping from the
     * first to the last is a real move rather than the same 0.9s blur — which
     * is what made every selection feel identical. power2.inOut over
     * power3.inOut keeps the middle of the move readable instead of spending
     * most of the time easing.
     */
    const span = hi - lo || 1;
    scrub = (orbit: number) => {
      const target = lo + span * orbit;
      const travel = Math.abs(target - at.frame) / span;
      gsap.to(at, {
        frame: target,
        duration: 0.85 + travel * 1.15,
        ease: 'power2.inOut',
        overwrite: true,
        onUpdate: draw,
      });
    };

    // Paint as soon as any frame in the slice has arrived.
    const poll = window.setInterval(() => {
      if (player.render(at.frame) >= 0) {
        explorer.classList.add('is-live');
        window.clearInterval(poll);
      }
    }, 120);
    window.setTimeout(() => window.clearInterval(poll), 15000);
  };

  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      void start();
    },
    { rootMargin: '60% 0px' },
  );
  io.observe(section);
}
