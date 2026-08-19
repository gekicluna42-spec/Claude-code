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
  /** Called every frame with 0–1 progress; image sources ignore it. */
  update(progress: number): void;
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

  const width = large?.width ?? 1280;
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

  /** Best image available per frame index; upgraded in place by the loader. */
  const frames: (HTMLImageElement | undefined)[] = new Array(manifest.count);
  const quality: ('sm' | 'lg')[] = new Array(manifest.count).fill('sm');
  let drawn = -1;
  let drawnQuality: 'sm' | 'lg' | null = null;
  let ready = 0;

  const frameUrl = (dir: string, index: number): string =>
    `${base}${dir}/${String(index).padStart(4, '0')}.${ext}`;

  const load = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Frame failed: ${url}`));
      img.src = url;
    });

  // The first frame is needed before anything can render.
  frames[0] = await load(frameUrl(small?.dir ?? 'sm', 0));
  ready = 1;

  const loadLadder = async (dir: string, tier: 'sm' | 'lg'): Promise<void> => {
    // Sequential on purpose: the browser keeps the connection warm and the
    // scroll thread stays free.
    for (let i = 0; i < manifest.count; i++) {
      if (quality[i] === 'lg' && tier === 'sm') continue;
      try {
        const img = await load(frameUrl(dir, i));
        frames[i] = img;
        quality[i] = tier;
        if (tier === 'sm') onProgress?.(++ready, manifest.count);
        // Redraw if the visible frame just improved.
        if (i === drawn && tier !== drawnQuality) drawn = -1;
      } catch {
        /* A missing frame falls back to the nearest one already loaded. */
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
    update(progress: number) {
      const index = Math.min(
        manifest.count - 1,
        Math.max(0, Math.round(progress * (manifest.count - 1))),
      );
      if (index === drawn && quality[index] === drawnQuality) return;

      const img = frames[index] ?? nearest(index);
      if (!img || !ctx) return;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      texture.needsUpdate = true;
      drawn = index;
      drawnQuality = quality[index];
    },
    dispose() {
      texture.dispose();
      frames.length = 0;
    },
  };
}
