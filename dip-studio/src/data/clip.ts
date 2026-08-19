/**
 * Where the hero clip lives.
 *
 * Normally it is a file under /media. The single-file build has no /media to
 * fetch from, so it sets `window.__DIP_CLIP__` to an inlined data URI — once,
 * rather than embedding the same 3 MB at every reference.
 */

declare global {
  interface Window {
    __DIP_CLIP__?: string;
  }
}

export const clipUrl = (): string => window.__DIP_CLIP__ ?? '/media/hero-clip.mp4';

export const CLIP_POSTER = '/media/clip-poster.jpg';
