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
  /**
   * Resolves once enough of the sequence is decoded to scrub the opening
   * without gaps. The hero waits on this before revealing itself, so the
   * descent never starts on frames that have not arrived.
   */
  readonly ready?: Promise<void>;
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

/**
 * The single-file build has no /media to fetch from, so it embeds the whole
 * ladder as data URIs and hands it over on the window. Same scrubbing path as
 * the site — seeking a video under scroll is what made the shared preview jump
 * between keyframes.
 */
export interface EmbeddedFrames {
  manifest: FrameManifest;
  urls: string[];
}

declare global {
  interface Window {
    __DIP_FRAMES__?: EmbeddedFrames;
  }
}

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
  const embedded = window.__DIP_FRAMES__;

  let manifest: FrameManifest;
  if (embedded) {
    manifest = embedded.manifest;
  } else {
    const response = await fetch(manifestUrl);
    if (!response.ok) throw new Error(`Frame manifest missing: ${manifestUrl}`);
    manifest = (await response.json()) as FrameManifest;
  }

  const base = manifestUrl.replace(/frames\.json$/, '');
  const ext = (await supportsAvif()) ? 'avif' : 'webp';
  const [small, large] = manifest.ladders;

  // Phones and low-core machines draw into a smaller canvas: every scrubbed
  // frame is a texture upload, and upload cost scales with pixels.
  const lowTier =
    window.matchMedia('(max-width: 900px)').matches || navigator.hardwareConcurrency <= 4;
  const sourceWidth = large?.width ?? small?.width ?? 1280;
  const width = Math.min(sourceWidth, lowTier ? 960 : 1600);
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
  let lastPairTier: Tier | undefined;
  /** Where the scrub currently is, so the loader can work outward from it. */
  let playhead = 0;

  const frameUrl = (dir: string, index: number): string =>
    embedded
      ? embedded.urls[index]
      : `${base}${dir}/${String(index).padStart(4, '0')}.${ext}`;

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
   * How much of the descent must be decoded before the hero is shown. Enough
   * that an immediate scroll runs on real frames rather than held ones.
   */
  const PRELOAD_COUNT = Math.min(manifest.count, Math.round(manifest.count * 0.45));
  let markReady: () => void = () => {};
  const readyPromise = new Promise<void>((resolve) => {
    markReady = resolve;
  });
  const checkReady = (): void => {
    let contiguous = 0;
    while (contiguous < manifest.count && frames[contiguous]) contiguous += 1;
    if (contiguous >= PRELOAD_COUNT) markReady();
  };

  /**
   * Coarse to fine: every 8th frame, then 4th, 2nd, then the rest — so the
   * whole timeline is covered early, at low temporal resolution, and fills in
   * from there.
   */
  const STRIDES = [8, 4, 2, 1];

  const fetchFrame = async (dir: string, tier: Tier, i: number): Promise<void> => {
    if (i < 0 || i >= manifest.count) return;
    if (tiers[i] === tier || (tier === 'sm' && tiers[i] === 'lg')) return;
    try {
      const img = await load(frameUrl(dir, i));
      frames[i] = img;
      tiers[i] = tier;
      if (tier === 'sm') {
        onProgress?.(++ready, PRELOAD_COUNT);
        checkReady();
      }
      // Force a redraw when the frame on screen just improved.
      if (Math.abs(lastExact - i) < 1.5) lastExact = -1;
    } catch {
      /* A gap is held over, never jumped over — see nearby(). */
    }
  };

  /**
   * Whatever the visitor is looking at loads first. A slow scroll then always
   * has its immediate neighbourhood present, which is where stepping would
   * otherwise show.
   */
  const PRIORITY_RADIUS = 6;

  const loadAroundPlayhead = async (dir: string, tier: Tier): Promise<void> => {
    const centre = Math.round(playhead * (manifest.count - 1));
    for (let d = 0; d <= PRIORITY_RADIUS; d++) {
      await fetchFrame(dir, tier, centre + d);
      if (d > 0) await fetchFrame(dir, tier, centre - d);
    }
  };

  const loadLadder = async (dir: string, tier: Tier): Promise<void> => {
    if (tier === 'sm') {
      // Frame by frame from the top: the opening of the descent has to be
      // gapless before anything is shown.
      for (let i = 0; i < PRELOAD_COUNT; i++) await fetchFrame(dir, tier, i);
    }
    await loadAroundPlayhead(dir, tier);
    for (const stride of STRIDES) {
      for (let i = 0; i < manifest.count; i += stride) {
        // Re-check the playhead between frames: the visitor may have moved on.
        if (Math.abs(i - playhead * (manifest.count - 1)) > PRIORITY_RADIUS * 4) {
          await loadAroundPlayhead(dir, tier);
        }
        await fetchFrame(dir, tier, i);
      }
    }
  };

  void (async () => {
    if (small) await loadLadder(small.dir, 'sm');
    // The large ladder is AVIF-only; WebP browsers keep the small one.
    if (large && (ext === 'avif' || large.webp)) await loadLadder(large.dir, 'lg');
  })();

  /**
   * Only a close neighbour may stand in for a missing frame. Reaching further
   * would cut to a moment half a second away, which is precisely the jump this
   * whole approach exists to avoid — better to hold what is already drawn.
   */
  const NEIGHBOUR_LIMIT = 3;

  const nearby = (index: number): HTMLImageElement | undefined => {
    for (let d = 0; d <= NEIGHBOUR_LIMIT; d++) {
      if (frames[index - d]) return frames[index - d];
      if (frames[index + d]) return frames[index + d];
    }
    return undefined;
  };

  return {
    texture,
    size: new THREE.Vector2(width, height),
    ready: readyPromise,

    update(progress: number) {
      if (!ctx) return;

      const last = manifest.count - 1;
      const exact = Math.min(last, Math.max(0, progress * last));
      playhead = progress;

      const index = Math.floor(exact);
      const frac = exact - index;

      const current = frames[index];
      const next = frames[index + 1];

      // A pair must come from one ladder: mixing a 480px frame with a 1152px
      // one makes sharpness flicker mid-blend while the ladders fill in.
      const pairTier: Tier | undefined =
        current && next && tiers[index] === tiers[index + 1] ? tiers[index] : undefined;

      if (Math.abs(exact - lastExact) < 0.004 && pairTier === lastPairTier) return;

      const base = current ?? nearby(index);
      // Nothing close enough: hold whatever is on screen rather than cut away.
      if (!base) return;

      ctx.globalAlpha = 1;
      ctx.drawImage(base, 0, 0, canvas.width, canvas.height);

      // Always cross-fade. The fractional position is the whole point of a
      // scrubbed sequence; snapping to whole frames is what makes it step.
      if (pairTier && next && frac > 0.004) {
        ctx.globalAlpha = frac;
        ctx.drawImage(next, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
      }

      texture.needsUpdate = true;
      lastExact = exact;
      lastPairTier = pairTier;
    },

    dispose() {
      texture.dispose();
      frames.length = 0;
    },
  };
}
