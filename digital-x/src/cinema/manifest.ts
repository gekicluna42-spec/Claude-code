/** Shape of public/media/frames/frames.json, written by scripts/frames.mjs. */
export interface LadderSpec {
  dir: string;
  width: number;
  webp: boolean;
  stride: number;
}

export interface ChapterFrames {
  id: string;
  source: { frames: number; fps: number; duration: number };
  /** Frame count per ladder — differs because xs is strided. */
  counts: Record<string, number>;
}

export interface FramesManifest {
  aspect: number;
  ladders: LadderSpec[];
  chapters: ChapterFrames[];
}

/**
 * In the single-file build every frame is already embedded as a data URI and
 * the manifest is inlined with them, so there is nothing to fetch.
 */
declare global {
  interface Window {
    __DX_FRAMES__?: FramesManifest;
    __DX_INLINE__?: Record<string, string[]>;
  }
}

let cached: Promise<FramesManifest> | null = null;

export function loadManifest(base = ''): Promise<FramesManifest> {
  if (window.__DX_FRAMES__) return Promise.resolve(window.__DX_FRAMES__);
  cached ??= fetch(`${base}/media/frames/frames.json`).then((r) => {
    if (!r.ok) throw new Error(`frames.json ${r.status}`);
    return r.json() as Promise<FramesManifest>;
  });
  return cached;
}
