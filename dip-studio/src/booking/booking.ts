/**
 * The booking flow — the site's primary conversion.
 *
 * It never claims a date is available: it collects an inquiry and says so.
 * Where it sends that inquiry depends on site.config; nothing is hard-coded
 * and nothing is invented.
 */

import { services } from '../data/services';
import { site, has } from '../data/site.config';
import { isSharedPreview } from '../data/clip';
import { esc, qs } from '../lib/dom';
import { createModal } from '../lib/modal';
import { getSelection } from '../sections/builder';

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
  const modalRoot = qs('#booking');
  const form = qs<HTMLFormElement>('#booking-form');
  const status = qs('#booking-status');
  const note = qs('#booking-note');
  const select = qs<HTMLSelectElement>('#bf-service');
  const submit = qs<HTMLButtonElement>('#booking-submit');
  if (!modalRoot || !form || !status || !note || !select || !submit) return;

  select.insertAdjacentHTML(
    'beforeend',
    services.map((s) => `<option value="${esc(s.name)}">${esc(s.name)}</option>`).join(''),
  );

  note.textContent = has(site.formEndpoint) || has(site.contact.email)
    ? 'Upit ne rezerviše termin automatski — javljamo se s potvrdom.'
    : '';

  const modal = createModal(modalRoot, {
    closeSelector: '[data-close-booking]',
    onOpened: () => modal.focusFirst(qs<HTMLInputElement>('#bf-name', form)),
  });

  const prefill = (trigger?: HTMLElement): void => {
    const serviceId = trigger?.dataset.service;
    if (serviceId) {
      const service = services.find((s) => s.id === serviceId);
      if (service) select.value = service.name;
    }

    if (!trigger?.hasAttribute('data-from-builder')) return;

    const selection = getSelection();
    if (selection.effects.length) {
      const match = services.find((s) => s.name === selection.effects[0]);
      if (match) select.value = match.name;
    }

    const message = qs<HTMLTextAreaElement>('#bf-message', form);
    if (!message || message.value) return;

    const parts = [
      selection.moment && `Trenutak: ${selection.moment}`,
      selection.feeling && `Osjećaj: ${selection.feeling}`,
      selection.effects.length && `Efekti: ${selection.effects.join(', ')}`,
    ].filter(Boolean);
    if (parts.length) message.value = parts.join('\n');
  };

  // Delegated: sections render their own booking triggers, and the effect
  // preview adds one that changes service between openings.
  document.addEventListener('click', (event) => {
    const trigger = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-open-booking]');
    if (!trigger) return;
    prefill(trigger);
    modal.open(trigger);
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

    // Neither channel configured yet. In a shared preview that is expected —
    // say what would happen instead of showing a client an error.
    if (isSharedPreview()) {
      status.dataset.tone = 'ok';
      status.textContent =
        'Ovo je prikaz stranice — upit se ne šalje. Na objavljenoj stranici ide direktno DIP Studiju.';
      return;
    }

    status.dataset.tone = 'error';
    status.textContent = 'Slanje upita trenutno nije dostupno. Molimo pokušajte ponovo kasnije.';
    console.warn(
      '[DIP Studio] Nije podešen ni formEndpoint ni contact.email u src/data/site.config.ts — upiti se ne mogu poslati.',
    );
  });
}
