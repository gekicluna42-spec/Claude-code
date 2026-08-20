/**
 * Both forms on this page.
 *
 * With FORM_ENDPOINT set they POST JSON. With it blank they do NOT pretend to
 * send — they open a pre-filled e-mail to the verified address and say so.
 * A form that silently swallows an enquiry is worse than no form.
 */

import { CONTACT } from '../data/content';
import { FORM_ENDPOINT } from '../data/site.config';
import { $, $$ } from './dom';

const setStatus = (form: HTMLFormElement, text: string, tone: 'ok' | 'error' = 'ok'): void => {
  const el = $('[data-form-status]', form);
  if (!el) return;
  el.textContent = text;
  el.setAttribute('data-tone', tone);
};

/** Native validity, surfaced through aria-invalid so it is announced. */
const validate = (form: HTMLFormElement): boolean => {
  let ok = true;
  for (const field of $$<HTMLInputElement>('input, textarea, select', form)) {
    if (!field.required) continue;
    const valid = field.checkValidity() && field.value.trim() !== '';
    field.setAttribute('aria-invalid', valid ? 'false' : 'true');
    if (!valid && ok) {
      field.focus();
      ok = false;
    }
  }
  return ok;
};

const payloadOf = (form: HTMLFormElement, extra: Record<string, string> = {}) => {
  const data = Object.fromEntries(new FormData(form).entries());
  return { ...data, ...extra } as Record<string, string>;
};

const mailtoFallback = (subject: string, payload: Record<string, string>): void => {
  const body = Object.entries(payload)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
  window.location.href =
    `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

export interface FormOptions {
  subject: string;
  /** Runs before submit; return false to abort (the audit uses it to scan). */
  before?: () => Promise<void> | void;
  sentMessage: string;
  fallbackMessage: string;
}

export function wireForm(form: HTMLFormElement, options: FormOptions): void {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!validate(form)) {
      setStatus(form, 'Provjerite označena polja.', 'error');
      return;
    }
    const button = $<HTMLButtonElement>('button[type="submit"]', form);
    if (button) button.disabled = true;
    setStatus(form, 'Šaljemo…');

    try {
      await options.before?.();
      const payload = payloadOf(form, { source: 'digital-x homepage' });

      if (!FORM_ENDPOINT) {
        setStatus(form, options.fallbackMessage);
        mailtoFallback(options.subject, payload);
        return;
      }

      const response = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(String(response.status));
      form.reset();
      setStatus(form, options.sentMessage);
    } catch {
      setStatus(
        form,
        `Slanje nije uspjelo. Pišite nam direktno na ${CONTACT.email} ili ${CONTACT.phoneLabel}.`,
        'error',
      );
    } finally {
      if (button) button.disabled = false;
    }
  });
}
