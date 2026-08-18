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
