/**
 * The free analysis.
 *
 * It behaves like a product — you type a URL, the three axes sweep while the
 * request goes out — but it is scrupulous about what it claims: the sweep is a
 * progress indicator, not a measurement, and the note under the button says
 * the analysis comes back from Digital X. No score is ever rendered that this
 * page did not actually measure, and this page measures nothing.
 *
 * PAGESPEED_API_KEY in site.config.ts is where a real measurement would plug
 * in; until it is set, this stays an enquiry.
 */

import { AUDIT } from '../data/content';
import { CONTACT } from '../data/content';
import { $, $$, prefersReducedMotion } from '../lib/dom';
import { wireForm } from '../lib/forms';

const sweep = (axes: HTMLElement[]): Promise<void> =>
  new Promise((resolve) => {
    if (prefersReducedMotion() || !axes.length) {
      for (const axis of axes) axis.classList.add('is-scanning');
      resolve();
      return;
    }
    axes.forEach((axis, i) => {
      window.setTimeout(() => axis.classList.add('is-scanning'), i * 260);
    });
    window.setTimeout(resolve, axes.length * 260 + 500);
  });

export function initAudit(): void {
  const form = $<HTMLFormElement>('[data-audit]');
  if (!form) return;
  const axes = $$<HTMLElement>('[data-axis]');

  // A bare domain is what people type; make it a URL rather than rejecting it.
  const url = $<HTMLInputElement>('input[name="url"]', form);
  url?.addEventListener('blur', () => {
    const value = url.value.trim();
    if (value && !/^https?:\/\//i.test(value)) url.value = `https://${value.replace(/^\/+/, '')}`;
  });

  wireForm(form, {
    subject: `Besplatna analiza — ${AUDIT.axes.map((a) => a.name).join(' / ')}`,
    before: () => sweep(axes),
    sentMessage: `Primili smo zahtjev. Analizu šaljemo na vaš email — ${CONTACT.reply}.`,
    fallbackMessage:
      `Otvaramo pripremljeni email na ${CONTACT.email}. Pošaljite ga i analiza stiže — ${CONTACT.reply}.`,
  });
}
