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

/**
 * The single-file build embeds the frame ladder and skips the clip: the
 * descent already IS the clip there, and inlining both would double the page.
 * Where no clip is available, the "watch the scene" control is not offered.
 */
export const hasClip = (): boolean => Boolean(window.__DIP_CLIP__) || !window.__DIP_FRAMES__;

export const CLIP_POSTER = '/media/clip-poster.jpg';
