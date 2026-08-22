/**
 * Mounting the Signal Engine onto the page that already exists.
 *
 * Nothing here creates content or moves layout. Each object attaches to a
 * section that is already in the DOM, reads its position every frame, and
 * draws behind it. Remove this module and the site is exactly what it was:
 * the copy, the links, the forms and the film are all still there.
 *
 * The whole layer is skipped when WebGL is unavailable or the visitor has
 * asked for reduced motion, and it never blocks the page becoming usable.
 */

import * as THREE from 'three';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { $, $$ } from '../lib/dom';
import { Renderer, type Layer } from './Renderer';
import { createWorld } from './World';
import { resolveQuality } from './quality';
import { createParticleX, type MorphLayer } from './objects/particle-x';
import { createAuthorityField } from './objects/authority-field';
import { createSignalObject } from './objects/signal-objects';
import { createAutomationMachine } from './objects/automation-machine';

export interface Engine {
  readonly ok: boolean;
  dispose(): void;
}

const DISABLED: Engine = { ok: false, dispose() {} };

export function mountEngine(): Engine {
  const quality = resolveQuality();
  if (quality.disabled) return DISABLED;

  const canvas = $<HTMLCanvasElement>('[data-engine-canvas]');
  if (!canvas) return DISABLED;

  const renderer = Renderer.create(canvas, quality);
  if (!renderer) return DISABLED;

  const wake = () => renderer.wake();
  const layers: Layer[] = [];
  const camera = renderer.camera;
  canvas.classList.add('is-live');

  // The persistent field. Present through the content, absent under the film,
  // where the reel is already the world.
  const world = createWorld(camera, quality, { wake });
  renderer.add(world);
  layers.push(world);

  const film = $('[data-film]');
  const updatePresence = () => {
    if (!film) {
      world.setPresence(1);
      return;
    }
    const rect = film.getBoundingClientRect();
    // Fade in across the last viewport of the film, so the hand-off from reel
    // to field happens under the hero rather than as a switch.
    const past = -rect.bottom + window.innerHeight * 2;
    world.setPresence(Math.max(0, Math.min(1, past / (window.innerHeight * 1.5))));
  };
  updatePresence();
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: () => {
      updatePresence();
      // Any scroll restarts a parked loop: a layer cannot notice it has come
      // into view while nothing is running.
      wake();
    },
    onRefresh: updatePresence,
  });

  if (quality.pointer) {
    window.addEventListener(
      'pointermove',
      (event) => {
        world.setPointer(
          (event.clientX / window.innerWidth) * 2 - 1,
          -((event.clientY / window.innerHeight) * 2 - 1),
        );
        wake();
      },
      { passive: true },
    );
  }

  /** Drives a layer from how far a section has been scrolled through. */
  const onScrollThrough = (
    element: HTMLElement,
    apply: (progress: number) => void,
    range: [string, string] = ['top 85%', 'bottom 40%'],
  ) => {
    apply(0);
    ScrollTrigger.create({
      trigger: element,
      start: range[0],
      end: range[1],
      onUpdate: (self) => apply(self.progress),
      onRefresh: (self) => apply(self.progress),
    });
  };

  // --- The interactive X, over the System Explorer's stage ------------------
  const explorerStage = $('.explorer__stage');
  if (explorerStage) {
    const x = createParticleX(explorerStage, camera, quality, { wake, sizeFactor: 0.44 });
    renderer.add(x);
    layers.push(x);
    // Scrolling through the section disperses and re-forms it once, so the
    // behaviour is discoverable without a pointer.
    onScrollThrough(explorerStage, (p) => x.setMorph(Math.sin(p * Math.PI) * 0.5));
  }

  // --- Signal Objects, one per verified discipline --------------------------
  for (const item of $$<HTMLElement>('.disc__item')) {
    const formId = item.id.replace('usluga-', '');
    const object = createSignalObject(item, formId, camera, quality, { wake });
    renderer.add(object);
    layers.push(object);
    item.addEventListener('pointerenter', () => object.setActive(true), { passive: true });
    item.addEventListener('pointerleave', () => object.setActive(false), { passive: true });
    item.addEventListener('focusin', () => object.setActive(true));
    item.addEventListener('focusout', () => object.setActive(false));
  }

  // --- The Authority Field --------------------------------------------------
  // Anchored to the empty box the layout reserves for it, not to the whole
  // section: the constellation belongs beside the copy, not behind it.
  const authoritySection = $('[data-authority]');
  const authorityBox = $('.authority__field');
  if (authoritySection && authorityBox) {
    const field = createAuthorityField(authorityBox, camera, quality, { wake });
    renderer.add(field);
    layers.push(field);
    onScrollThrough(authoritySection, (p) => field.setProgress(p), ['top 80%', 'bottom 55%']);
  }

  // --- The Automation Machine, under the verified five-step chain -----------
  const chain = $('[data-chain]');
  if (chain) {
    const steps = $$('[data-chain-step]', chain).length;
    if (steps) {
      const machine = createAutomationMachine(chain, steps, camera, quality, { wake });
      renderer.add(machine);
      layers.push(machine);
      onScrollThrough(
        chain,
        (p) => machine.setStep(Math.min(steps - 1, Math.floor(p * steps))),
        ['top 78%', 'bottom 60%'],
      );
    }
  }

  // --- The particle footer, which morphs on hover ---------------------------
  const footerMark = $('[data-foot-mark]');
  if (footerMark) {
    const cloud = createParticleX(footerMark, camera, quality, {
      wake,
      count: quality.footerParticles,
      sizeFactor: 0.5,
      pointSize: 1.5,
    });
    renderer.add(cloud);
    layers.push(cloud);
    const foot = footerMark.closest('.foot');
    foot?.addEventListener('pointerenter', () => (cloud as MorphLayer).setMorph(0.85), {
      passive: true,
    });
    foot?.addEventListener('pointerleave', () => (cloud as MorphLayer).setMorph(0), {
      passive: true,
    });
  }

  // Layout changes move every anchor, so a refresh has to repaint even if
  // nothing is animating.
  ScrollTrigger.addEventListener('refresh', wake);
  window.addEventListener('resize', wake, { passive: true });

  return {
    ok: true,
    dispose() {
      renderer.dispose();
      for (const layer of layers) layer.dispose();
    },
  };
}

/** Exposed for the QA harness. */
export function engineStatus(engine: Engine) {
  return { webgl: engine.ok, three: THREE.REVISION };
}
