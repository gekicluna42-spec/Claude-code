/**
 * The automation chain: upit → kvalifikacija → CRM → termin → follow-up.
 *
 * The steps light in sequence as the section arrives, so the eye is walked
 * along the flow once rather than being handed five lit boxes at the same time.
 */

import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { $, $$, prefersReducedMotion } from '../lib/dom';

export function initChain(): void {
  const chain = $('[data-chain]');
  if (!chain) return;
  const steps = $$<HTMLElement>('[data-chain-step]', chain);
  if (!steps.length) return;

  if (prefersReducedMotion()) {
    for (const step of steps) step.classList.add('is-on');
    return;
  }

  ScrollTrigger.create({
    trigger: chain,
    start: 'top 78%',
    end: 'bottom 65%',
    onUpdate: (self) => {
      const lit = Math.ceil(self.progress * steps.length);
      steps.forEach((step, i) => step.classList.toggle('is-on', i < lit));
    },
  });
}
