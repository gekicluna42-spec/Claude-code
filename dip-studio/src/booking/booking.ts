/**
 * The booking flow — the site's primary conversion.
 *
 * It never claims a date is available: it collects an inquiry and says so.
 * Where it sends that inquiry depends on site.config; nothing is hard-coded
 * and nothing is invented.
 */

import { services } from '../data/services';
import { site, has } from '../data/site.config';
import { esc, qs, qsa } from '../lib/dom';
import { getSelection } from '../sections/builder';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface FieldRule {
  id: string;
  required?: boolean;
  type?: 'email' | 'number' | 'date';
  message: string;
}

const RULES: FieldRule[] = [
  { id: 'bf-name', required: true, message: 'Molimo unesite ime i prezime.' },
  { id: 'bf-email', required: true, type: 'email', message: 'Molimo unesite ispravnu e-mail adresu.' },
  { id: 'bf-guests', type: 'number', message: 'Broj gostiju mora biti između 1 i 2000.' },
  { id: 'bf-date', type: 'date', message: 'Odaberite datum u budućnosti.' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function setError(input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, message: string): void {
  const field = input.closest<HTMLElement>('.field');
  const error = field?.querySelector<HTMLElement>('.field__error');
  if (field) field.dataset.invalid = message ? 'true' : 'false';
  if (error) error.textContent = message;
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
}

function validate(form: HTMLFormElement): boolean {
  let firstInvalid: HTMLElement | null = null;

  for (const rule of RULES) {
    const input = qs<HTMLInputElement>(`#${rule.id}`, form);
    if (!input) continue;

    const value = input.value.trim();
    let message = '';

    if (rule.required && !value) message = rule.message;
    else if (value && rule.type === 'email' && !EMAIL_RE.test(value)) message = rule.message;
    else if (value && rule.type === 'number') {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 1 || n > 2000) message = rule.message;
    } else if (value && rule.type === 'date') {
      const chosen = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (Number.isNaN(chosen.getTime()) || chosen < today) message = rule.message;
    }

    setError(input, message);
    if (message && !firstInvalid) firstInvalid = input;
  }

  if (firstInvalid) {
    firstInvalid.focus();
    return false;
  }
  return true;
}

function buildPayload(form: HTMLFormElement): Record<string, string> {
  const data = new FormData(form);
  const payload: Record<string, string> = {};
  data.forEach((value, key) => {
    payload[key] = String(value);
  });

  const selection = getSelection();
  if (selection.moment) payload.builderMoment = selection.moment;
  if (selection.feeling) payload.builderFeeling = selection.feeling;
  if (selection.effects.length) payload.builderEffects = selection.effects.join(', ');

  return payload;
}

function mailtoHref(payload: Record<string, string>): string {
  const lines = Object.entries(payload)
    .filter(([, value]) => value.trim().length > 0)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
  const subject = `Upit za rezervaciju — ${payload.name || 'DIP Studio'}`;
  return `mailto:${site.contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines)}`;
}

export function initBooking(): void {
  const modal = qs('#booking');
  const panel = qs('.modal__panel', modal ?? document);
  const form = qs<HTMLFormElement>('#booking-form');
  const status = qs('#booking-status');
  const note = qs('#booking-note');
  const select = qs<HTMLSelectElement>('#bf-service');
  const submit = qs<HTMLButtonElement>('#booking-submit');
  if (!modal || !panel || !form || !status || !note || !select || !submit) return;

  select.insertAdjacentHTML(
    'beforeend',
    services.map((s) => `<option value="${esc(s.name)}">${esc(s.name)}</option>`).join(''),
  );

  note.textContent = has(site.formEndpoint) || has(site.contact.email)
    ? 'Upit ne rezerviše termin automatski — javljamo se s potvrdom.'
    : '';

  let lastFocused: HTMLElement | null = null;

  const open = (trigger?: HTMLElement): void => {
    lastFocused = (trigger ?? document.activeElement) as HTMLElement;
    modal.hidden = false;
    document.documentElement.classList.add('lenis-stopped');
    requestAnimationFrame(() => {
      modal.classList.add('is-open');
      requestAnimationFrame(() => qs<HTMLInputElement>('#bf-name', form)?.focus());
    });

    const serviceId = trigger?.dataset.service;
    if (serviceId) {
      const service = services.find((s) => s.id === serviceId);
      if (service) select.value = service.name;
    }

    if (trigger?.hasAttribute('data-from-builder')) {
      const selection = getSelection();
      if (selection.effects.length) {
        const match = services.find((s) => s.name === selection.effects[0]);
        if (match) select.value = match.name;
      }
      const message = qs<HTMLTextAreaElement>('#bf-message', form);
      if (message && !message.value) {
        const parts = [
          selection.moment && `Trenutak: ${selection.moment}`,
          selection.feeling && `Osjećaj: ${selection.feeling}`,
          selection.effects.length && `Efekti: ${selection.effects.join(', ')}`,
        ].filter(Boolean);
        if (parts.length) message.value = parts.join('\n');
      }
    }
  };

  const close = (): void => {
    modal.classList.remove('is-open');
    document.documentElement.classList.remove('lenis-stopped');
    window.setTimeout(() => {
      modal.hidden = true;
    }, 320);
    lastFocused?.focus();
  };

  qsa('[data-open-booking]').forEach((trigger) =>
    trigger.addEventListener('click', () => open(trigger as HTMLElement)),
  );
  qsa('[data-close-booking]', modal).forEach((btn) => btn.addEventListener('click', close));

  document.addEventListener('keydown', (event) => {
    if (modal.hidden) return;
    if (event.key === 'Escape') {
      close();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = qsa<HTMLElement>(FOCUSABLE, panel).filter((el) => el.offsetParent !== null);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      last.focus();
      event.preventDefault();
    } else if (!event.shiftKey && document.activeElement === last) {
      first.focus();
      event.preventDefault();
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.textContent = '';
    status.removeAttribute('data-tone');

    if (!validate(form)) {
      status.dataset.tone = 'error';
      status.textContent = 'Provjerite označena polja.';
      return;
    }

    const payload = buildPayload(form);

    if (has(site.formEndpoint)) {
      submit.disabled = true;
      status.textContent = 'Šaljemo upit…';
      try {
        const response = await fetch(site.formEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error(String(response.status));
        status.dataset.tone = 'ok';
        status.textContent = 'Hvala — upit je poslan. Javljamo se u najkraćem roku.';
        form.reset();
      } catch {
        status.dataset.tone = 'error';
        status.textContent = 'Slanje nije uspjelo. Pokušajte ponovo za koji trenutak.';
      } finally {
        submit.disabled = false;
      }
      return;
    }

    if (has(site.contact.email)) {
      window.location.href = mailtoHref(payload);
      status.dataset.tone = 'ok';
      status.textContent = 'Otvaramo vaš e-mail program s popunjenim upitom.';
      return;
    }

    // Neither channel configured yet — say so instead of pretending it sent.
    status.dataset.tone = 'error';
    status.textContent = 'Slanje upita trenutno nije dostupno. Molimo pokušajte ponovo kasnije.';
    console.warn(
      '[DIP Studio] Nije podešen ni formEndpoint ni contact.email u src/data/site.config.ts — upiti se ne mogu poslati.',
    );
  });
}
