/**
 * "Pogledaj efekat" — the panel that finally shows the effect.
 *
 * Four services are visible in the hero footage and get a live scene played
 * over the segment of the clip where that effect actually happens: low fog,
 * cold sparks, ambient light with the star ceiling, and laser beams. The
 * other ten services are NOT in the footage, so they open the same panel with
 * their still and their own copy — no invented motion for a 360 booth or a
 * neon sign.
 *
 * The engine loads on first open, one WebGL context stays alive at a time,
 * and the frame source is cached so reopening costs nothing.
 */

import { serviceById } from '../data/services';
import { clipUrl, CLIP_POSTER } from '../data/clip';
import { imageMarkup } from '../data/media';
import { prefersReducedMotion, qs } from '../lib/dom';
import { createModal, type ModalController } from '../lib/modal';
import type { ActState } from '../hero/timeline';
import type { HeroStage } from '../hero/HeroStage';
import type { HeroSource } from '../hero/sources';

/**
 * Segments of the hero clip, as scroll-progress ranges, where each effect is
 * genuinely on screen. Anything not listed here has no live preview.
 */
const SEGMENTS: Record<string, [number, number]> = {
  'niski-dim': [0.02, 0.2],
  prskalice: [0.3, 0.55],
  'ambijentalna-rasvjeta': [0.8, 1],
  'magicni-laser': [0.62, 0.88],
};

/** A neutral grade: the footage is the subject, the shader only presents it. */
const PREVIEW_STATE: ActState = {
  cropX: 0.5, cropY: 0.5, cropW: 1, yaw: 0,
  exposure: 1.02, contrast: 1.04, saturation: 1.0, vignette: 0.5, dof: 0,
  fog: 0, sparks: 0, beams: 0, stars: 0, bloom: 0.34,
};

const NOTE = 'Kinematografski prikaz — nije snimak stvarnog događaja.';

const PANEL = `
<div class="modal" id="effect-preview" role="dialog" aria-modal="true" aria-labelledby="effect-preview-title" hidden>
  <div class="modal__scrim" data-close-preview></div>
  <div class="modal__panel preview">
    <button class="modal__close" data-close-preview aria-label="Zatvori">✕</button>
    <div class="preview__stage">
      <canvas class="preview__canvas" id="preview-canvas" aria-hidden="true" hidden></canvas>
      <div class="preview__still" id="preview-still"></div>
      <video class="preview__video" id="preview-video" playsinline muted controls preload="none" hidden></video>
    </div>
    <p class="eyebrow" id="preview-eyebrow"></p>
    <h2 class="modal__title" id="effect-preview-title"></h2>
    <p class="lead" id="preview-tagline"></p>
    <p id="preview-editorial"></p>
    <p class="media-note" id="preview-note">${NOTE}</p>
    <div class="preview__actions">
      <button class="btn btn--primary" data-open-booking data-service="" id="preview-book">Rezerviši datum</button>
      <a class="btn btn--ghost" id="preview-page" hidden>Više o usluzi</a>
    </div>
  </div>
</div>`;

interface Engine {
  stage: HeroStage;
  source: HeroSource;
}

let engine: Engine | null = null;
let loading: Promise<Engine | null> | null = null;
let raf = 0;

async function loadEngine(canvas: HTMLCanvasElement): Promise<Engine | null> {
  if (engine) return engine;
  if (loading) return loading;

  loading = (async () => {
    try {
      const [{ HeroStage }, { createFrameSequenceSource, createVideoSource }] = await Promise.all([
        import('../hero/HeroStage'),
        import('../hero/sources'),
      ]);
      // Frames where they exist; the single-file build has only the clip.
      const source = await createFrameSequenceSource('/media/frames/frames.json').catch(() =>
        createVideoSource(clipUrl()),
      );
      const stage = new HeroStage({
        canvas,
        source,
        quality: 'low',
        stateProvider: () => PREVIEW_STATE,
        // The source is cached across openings, so the stage must not own it.
        disposeSource: false,
      });
      engine = { stage, source };
      return engine;
    } catch {
      return null;
    } finally {
      loading = null;
    }
  })();

  return loading;
}

export function initEffectPreview(): void {
  if (qs('#effect-preview')) return;
  document.body.insertAdjacentHTML('beforeend', PANEL);

  const root = qs('#effect-preview');
  const canvas = qs<HTMLCanvasElement>('#preview-canvas');
  const still = qs('#preview-still');
  const video = qs<HTMLVideoElement>('#preview-video');
  const eyebrow = qs('#preview-eyebrow');
  const title = qs('#effect-preview-title');
  const tagline = qs('#preview-tagline');
  const editorial = qs('#preview-editorial');
  const note = qs('#preview-note');
  const book = qs<HTMLButtonElement>('#preview-book');
  const page = qs<HTMLAnchorElement>('#preview-page');
  if (!root || !canvas || !still || !video || !eyebrow || !title || !tagline || !editorial || !note || !book || !page) return;

  const stopScene = (): void => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    engine?.stage.stop();
  };

  const modal: ModalController = createModal(root, {
    closeSelector: '[data-close-preview]',
    onOpened: () => modal.focusFirst(book),
    onClosed: () => {
      stopScene();
      video.pause();
    },
  });

  /** Plays one segment of the clip on a slow ping-pong. */
  const playSegment = async ([from, to]: [number, number]): Promise<void> => {
    const loaded = await loadEngine(canvas);
    if (!loaded) return;

    canvas.hidden = false;
    still.hidden = true;
    loaded.stage.start();

    const started = performance.now();
    const span = 5200; // one pass across the segment, in ms

    const tick = (now: number): void => {
      const cycle = ((now - started) % (span * 2)) / span;
      const t = cycle <= 1 ? cycle : 2 - cycle;
      loaded.stage.setProgress(from + (to - from) * t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  };

  const openService = (id: string, trigger?: HTMLElement): void => {
    const service = serviceById(id);
    if (!service) return;

    const segment = SEGMENTS[id];
    const live = Boolean(segment) && !prefersReducedMotion();

    eyebrow.textContent = live ? 'Prikaz efekta' : 'Efekat';
    title.textContent = service.name;
    tagline.textContent = service.tagline;
    editorial.textContent = service.editorial;
    note.textContent = live
      ? NOTE
      : `${NOTE} Za ovu uslugu prikazujemo fotografiju scene.`;

    book.dataset.service = service.id;
    if (service.page) {
      page.href = service.page;
      page.hidden = false;
    } else {
      page.hidden = true;
    }

    video.hidden = true;
    video.pause();
    stopScene();

    still.innerHTML = imageMarkup(service.media, { sizes: '(max-width: 700px) 90vw, 46rem', eager: true });
    still.hidden = false;
    canvas.hidden = true;

    modal.open(trigger);
    if (live && segment) void playSegment(segment);
  };

  /** The full 10-second clip, loaded only when asked for. */
  const openClip = (trigger?: HTMLElement): void => {
    stopScene();
    canvas.hidden = true;
    still.hidden = true;

    if (!video.dataset.ready) {
      video.poster = CLIP_POSTER;
      video.innerHTML = `<source src="${clipUrl()}" type="video/mp4" />`;
      video.dataset.ready = 'true';
    }
    video.hidden = false;

    eyebrow.textContent = 'Scena';
    title.textContent = 'Jedan trenutak, pet scena';
    tagline.textContent = 'Niski dim, prskalice, ambijentalna rasvjeta i zvjezdano nebo — u jednoj sceni.';
    editorial.textContent =
      'Ista scena koju vidite na vrhu stranice, u punoj dužini. Zvuk je isključen jer je scena vizuelna.';
    note.textContent = NOTE;
    book.dataset.service = '';
    page.hidden = true;

    modal.open(trigger);
    if (!prefersReducedMotion()) void video.play().catch(() => undefined);
  };

  // Delegated on purpose: the effect library re-renders its cards on every
  // tab switch, so listeners bound to the original buttons would be lost.
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;

    const previewTrigger = target?.closest<HTMLElement>('[data-effect-preview]');
    if (previewTrigger) {
      openService(previewTrigger.dataset.effectPreview ?? '', previewTrigger);
      return;
    }

    const clipTrigger = target?.closest<HTMLElement>('[data-play-clip]');
    if (clipTrigger) openClip(clipTrigger);
  });

  // Handing over to the booking dialog: close this one first, and leave focus
  // to the form rather than snapping it back to the card.
  book.addEventListener(
    'click',
    () => modal.close({ restoreFocus: false }),
    { capture: true },
  );
}

/** Services whose effect the footage genuinely shows. */
export const hasLivePreview = (id: string): boolean => id in SEGMENTS;
