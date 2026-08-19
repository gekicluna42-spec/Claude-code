/**
 * Where the hero's frames come from.
 *
 * Today the sequence is rendered from a single master frame (ImageSource).
 * When DIP Studio's generated clips are available, VideoSource scrubs a real
 * video with the identical uniform interface — the stage does not change.
 */

import * as THREE from 'three';

export interface HeroSource {
  readonly texture: THREE.Texture;
  readonly size: THREE.Vector2;
  /**
   * Called every frame with 0–1 progress; image sources ignore it.
   * `blend` (0–1) is how much cross-fade to apply between adjacent frames:
   * the stage feeds it scroll speed, so motion blurs and rest stays crisp.
   */
  update(progress: number, blend?: number): void;
  dispose(): void;
}

export async function createImageSource(url: string): Promise<HeroSource> {
  const texture = await new THREE.TextureLoader().loadAsync(url);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = false;

  const img = texture.image as HTMLImageElement;
  const size = new THREE.Vector2(img.naturalWidth || 1672, img.naturalHeight || 941);

  return {
    texture,
    size,
    update() {},
    dispose() { texture.dispose(); },
  };
}

/**
 * Scrubs a silent, muted, inline video by scroll position. Seeking is
 * throttled to whole frames so a long scroll does not queue up seeks the
 * decoder cannot service.
 */
export async function createVideoSource(url: string, fps = 24): Promise<HeroSource> {
  const video = document.createElement('video');
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.crossOrigin = 'anonymous';

  await new Promise<void>((resolve, reject) => {
    video.addEventListener('loadedmetadata', () => resolve(), { once: true });
    video.addEventListener('error', () => reject(new Error(`Video failed: ${url}`)), { once: true });
  });

  const texture = new THREE.VideoTexture(video);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const size = new THREE.Vector2(video.videoWidth || 1280, video.videoHeight || 720);
  const step = 1 / fps;
  let lastFrame = -1;

  return {
    texture,
    size,
    update(progress: number) {
      const duration = video.duration || 0;
      if (!duration) return;
      const frame = Math.round((progress * duration) / step);
      if (frame === lastFrame) return;
      lastFrame = frame;
      if (video.seeking) return;
      video.currentTime = Math.min(duration - 0.001, Math.max(0, frame * step));
    },
    dispose() {
      texture.dispose();
      video.removeAttribute('src');
      video.load();
    },
  };
}

/**
 * Scrubs a frame sequence — the hero's default source.
 *
 * Two ladders load in order: the small one first, so scrubbing responds
 * almost immediately, then the large one frame by frame behind it. Frames are
 * drawn into a canvas that backs the texture, so no decode happens on the
 * scroll path and nothing ever seeks.
 */

export interface FrameManifest {
  count: number;
  stride: number;
  sourceFps: number;
  duration: number;
  aspect: number;
  ladders: { dir: string; width: number; webp?: boolean }[];
  poster: string;
  payoff: string;
}

const supportsAvif = (): Promise<boolean> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.width > 0);
    img.onerror = () => resolve(false);
    img.src =
      'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=';
  });

/**
 * The hero and the effect previews both scrub the same sequence, so it is
 * built once and shared. Every caller gets its own handle; the frames are
 * released only when the last handle is disposed.
 */
const sequenceCache = new Map<string, { source: Promise<HeroSource>; holders: number }>();

export function createFrameSequenceSource(
  manifestUrl: string,
  onProgress?: (loaded: number, total: number) => void,
): Promise<HeroSource> {
  let entry = sequenceCache.get(manifestUrl);
  if (!entry) {
    entry = { source: buildFrameSequenceSource(manifestUrl, onProgress), holders: 0 };
    sequenceCache.set(manifestUrl, entry);
  }
  entry.holders += 1;

  return entry.source.then((source) => {
    let released = false;
    return {
      ...source,
      dispose() {
        if (released) return;
        released = true;
        const record = sequenceCache.get(manifestUrl);
        if (!record) return;
        record.holders -= 1;
        if (record.holders > 0) return;
        sequenceCache.delete(manifestUrl);
        source.dispose();
      },
    };
  });
}

async function buildFrameSequenceSource(
  manifestUrl: string,
  onProgress?: (loaded: number, total: number) => void,
): Promise<HeroSource> {
  const response = await fetch(manifestUrl);
  if (!response.ok) throw new Error(`Frame manifest missing: ${manifestUrl}`);
  const manifest = (await response.json()) as FrameManifest;

  const base = manifestUrl.replace(/frames\.json$/, '');
  const ext = (await supportsAvif()) ? 'avif' : 'webp';
  const [small, large] = manifest.ladders;

  // Phones and low-core machines draw into a smaller canvas: every scrubbed
  // frame is a texture upload, and upload cost scales with pixels.
  const lowTier =
    window.matchMedia('(max-width: 900px)').matches || navigator.hardwareConcurrency <= 4;
  const width = Math.min(large?.width ?? 1280, lowTier ? 960 : 1600);
  const height = Math.round(width / manifest.aspect);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  type Tier = 'sm' | 'lg';

  const frames: (HTMLImageElement | undefined)[] = new Array(manifest.count);
  const tiers: (Tier | undefined)[] = new Array(manifest.count);
  let ready = 0;

  /** Fractional index last drawn, so tiny moves skip the redraw entirely. */
  let lastExact = -1;
  let lastTier: Tier | undefined;
  let lastBlend = -1;

  const frameUrl = (dir: string, index: number): string =>
    `${base}${dir}/${String(index).padStart(4, '0')}.${ext}`;

  const load = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        // Decode here, not on the first draw — a decode on the scroll thread
        // is exactly the stall this whole approach exists to avoid.
        img
          .decode()
          .catch(() => undefined)
          .then(() => resolve(img));
      };
      img.onerror = () => reject(new Error(`Frame failed: ${url}`));
      img.src = url;
    });

  frames[0] = await load(frameUrl(small?.dir ?? 'sm', 0));
  tiers[0] = 'sm';
  ready = 1;

  /**
   * Coarse to fine: every 8th frame, then 4th, 2nd, then the rest. The whole
   * timeline is covered within about fifteen images, so an early fast scroll
   * always lands near a real frame instead of reaching for a distant one.
   */
  const STRIDES = [8, 4, 2, 1];

  const loadLadder = async (dir: string, tier: Tier): Promise<void> => {
    for (const stride of STRIDES) {
      for (let i = 0; i < manifest.count; i += stride) {
        if (tiers[i] === tier || (tier === 'sm' && tiers[i] === 'lg')) continue;
        try {
          const img = await load(frameUrl(dir, i));
          frames[i] = img;
          tiers[i] = tier;
          if (tier === 'sm') onProgress?.(++ready, manifest.count);
          // Force a redraw when the frame on screen just improved.
          if (Math.round(lastExact) === i) lastExact = -1;
        } catch {
          /* A missing frame falls back to the nearest one already loaded. */
        }
      }
    }
  };

  void (async () => {
    if (small) await loadLadder(small.dir, 'sm');
    // The large ladder is AVIF-only; WebP browsers keep the small one.
    if (large && (ext === 'avif' || large.webp)) await loadLadder(large.dir, 'lg');
  })();

  const nearest = (index: number): HTMLImageElement | undefined => {
    for (let d = 0; d < manifest.count; d++) {
      if (frames[index - d]) return frames[index - d];
      if (frames[index + d]) return frames[index + d];
    }
    return undefined;
  };

  return {
    texture,
    size: new THREE.Vector2(width, height),

    update(progress: number, blend = 1) {
      if (!ctx) return;

      const last = manifest.count - 1;
      const exact = Math.min(last, Math.max(0, progress * last));
      const index = Math.floor(exact);
      const rawFrac = exact - index;

      // At rest the fraction rounds to a whole frame, so a settled hero is
      // crisp; while scrolling it keeps its true value and the cross-fade
      // reads as motion blur.
      const frac = blend * rawFrac + (1 - blend) * Math.round(rawFrac);

      const tier = tiers[index];
      if (Math.abs(exact - lastExact) < 0.01 && tier === lastTier && blend === lastBlend) return;

      const current = frames[index];
      const next = frames[index + 1];

      // Only genuinely adjacent frames may be blended. Mixing a loaded frame
      // with one several steps away — which happens while the ladder is still
      // filling in — produces a double image, not a blur.
      const canBlend = Boolean(current && next) && frac > 0.01 && frac < 0.99;
      const base = current ?? nearest(index);
      if (!base) return;

      ctx.globalAlpha = 1;
      ctx.drawImage(base, 0, 0, canvas.width, canvas.height);

      if (canBlend && next) {
        ctx.globalAlpha = frac;
        ctx.drawImage(next, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
      }

      texture.needsUpdate = true;
      lastExact = exact;
      lastTier = tier;
      lastBlend = blend;
    },

    dispose() {
      texture.dispose();
      frames.length = 0;
    },
  };
}
