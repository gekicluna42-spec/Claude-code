export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T | null =>
  root.querySelector<T>(sel);

export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T[] =>
  Array.from(root.querySelectorAll<T>(sel));

export const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const isMobile = (): boolean => window.matchMedia('(max-width: 860px)').matches;

/**
 * Device tier. Frame ladders are the expensive part of this page, so a phone
 * or a low-core machine gets the narrow ladder, a smaller resident window and
 * a capped pixel ratio rather than a stuttering version of the desktop build.
 */
export const deviceTier = (): 'high' | 'low' => {
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 4;
  const save = (navigator as unknown as { connection?: { saveData?: boolean } }).connection?.saveData;
  if (save) return 'low';
  if (isMobile() && cores <= 6) return 'low';
  return cores >= 4 && memory >= 4 ? 'high' : 'low';
};

export const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
