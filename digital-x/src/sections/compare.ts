/**
 * The before/after sliders on the demo concepts.
 *
 * The control is a real <input type="range"> laid over the frame: it is
 * draggable with a pointer, steppable with the keyboard, and announced to a
 * screen reader — none of which a bare div with a drag handler would be.
 */

import { $, $$ } from '../lib/dom';

export function initCompare(root: ParentNode = document): void {
  for (const frame of $$<HTMLElement>('[data-compare]', root)) {
    const input = $<HTMLInputElement>('[data-compare-input]', frame);
    if (!input) continue;
    const paint = () => frame.style.setProperty('--split', `${input.value}%`);
    input.addEventListener('input', paint);
    paint();
  }
}
