/**
 * 05 — Build your moment. Three questions, a live summary, and a handoff
 * into the booking form. Effects listed here are only DIP Studio services.
 */

import { services } from '../data/services';
import { esc, qs, qsa } from '../lib/dom';

export interface BuilderSelection {
  moment: string;
  feeling: string;
  effects: string[];
}

const MOMENTS = ['Prvi ples', 'Ulazak', 'Torta', 'Party', 'Odlazak mladenaca', 'Nešto drugo'];
const FEELINGS = ['Romantično', 'Elegantno', 'Dramatično', 'Energično', 'Luksuzno', 'Zabavno'];
const EFFECT_IDS = [
  'niski-dim', 'prskalice', 'ambijentalna-rasvjeta', 'magicni-laser',
  'photobooth-360-booth', 'audioguestbook', 'vatrometi', 'neonski-natpisi',
];

const selection: BuilderSelection = { moment: '', feeling: '', effects: [] };

export const getSelection = (): BuilderSelection => ({ ...selection, effects: [...selection.effects] });

const chip = (name: string, value: string, type: 'radio' | 'checkbox'): string => `
  <label class="chip">
    <input type="${type}" name="${name}" value="${esc(value)}" />
    <span>${esc(value)}</span>
  </label>
`;

function renderSummary(): void {
  const set = (key: string, value: string): void => {
    const el = qs(`[data-summary="${key}"]`);
    if (!el) return;
    const empty = value.length === 0;
    el.textContent = empty ? 'Još niste odabrali' : value;
    el.classList.toggle('summary__v--empty', empty);
  };

  set('moment', selection.moment);
  set('feeling', selection.feeling);
  set('effects', selection.effects.join(' + '));
}

export function initBuilder(): void {
  const momentRoot = qs('#builder-moment');
  const feelingRoot = qs('#builder-feeling');
  const effectsRoot = qs('#builder-effects');
  if (!momentRoot || !feelingRoot || !effectsRoot) return;

  momentRoot.innerHTML = MOMENTS.map((m) => chip('builder-moment', m, 'radio')).join('');
  feelingRoot.innerHTML = FEELINGS.map((f) => chip('builder-feeling', f, 'radio')).join('');
  effectsRoot.innerHTML = EFFECT_IDS
    .map((id) => services.find((s) => s.id === id))
    .filter((s): s is (typeof services)[number] => Boolean(s))
    .map((s) => chip('builder-effects', s.name, 'checkbox'))
    .join('');

  qsa<HTMLInputElement>('input', momentRoot).forEach((input) =>
    input.addEventListener('change', () => {
      selection.moment = input.value;
      renderSummary();
    }),
  );

  qsa<HTMLInputElement>('input', feelingRoot).forEach((input) =>
    input.addEventListener('change', () => {
      selection.feeling = input.value;
      renderSummary();
    }),
  );

  qsa<HTMLInputElement>('input', effectsRoot).forEach((input) =>
    input.addEventListener('change', () => {
      selection.effects = qsa<HTMLInputElement>('input:checked', effectsRoot).map((i) => i.value);
      renderSummary();
    }),
  );

  renderSummary();
}
