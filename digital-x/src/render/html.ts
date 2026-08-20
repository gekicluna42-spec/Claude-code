/** Tiny helpers for the build-time templates. No framework, no runtime cost. */

export const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Joins template pieces, dropping empty ones so conditionals read cleanly. */
export const join = (parts: (string | false | null | undefined)[]): string =>
  parts.filter(Boolean).join('\n');

export const map = <T>(items: readonly T[], fn: (item: T, i: number) => string): string =>
  items.map(fn).join('\n');

/**
 * A headline split across lines. Each line is its own span so the type can be
 * animated and tracked per line without the browser re-wrapping mid-animation.
 */
export const lines = (parts: readonly string[], cls = 'display', tag = 'span'): string =>
  `<${tag} class="${cls}">${parts
    .map((l) => `<span class="line"><span>${esc(l)}</span></span>`)
    .join('')}</${tag}>`;

/** The X mark, used as the logo, the section rule and the scroll marker. */
export const xMark = (cls = 'xmark'): string =>
  `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">` +
  `<path d="M3 3 L21 21 M21 3 L3 21" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="square"/></svg>`;

/** A responsive still from public/media/poster. */
export const poster = (base: string, alt: string, cls: string, eager = false): string =>
  `<picture class="${cls}">` +
  `<source type="image/avif" srcset="/media/poster/${base}.avif">` +
  `<source type="image/webp" srcset="/media/poster/${base}.webp">` +
  `<img src="/media/poster/${base}.jpg" alt="${esc(alt)}" width="1600" height="900" ` +
  `loading="${eager ? 'eager' : 'lazy'}" decoding="async" ${eager ? 'fetchpriority="high"' : ''}>` +
  `</picture>`;
