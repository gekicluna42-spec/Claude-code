/**
 * 04 — The before/after slider. A range input does the work, so it is
 * keyboard-operable and announced correctly without extra ARIA plumbing.
 */

import { qs } from '../lib/dom';

export function initCompare(): void {
  const root = qs('#compare');
  const input = qs<HTMLInputElement>('#compare-input');
  if (!root || !input) return;

  const apply = (): void => {
    root.style.setProperty('--compare-pos', `${input.value}%`);
  };

  input.addEventListener('input', apply);
  apply();
}
