/**
 * 03 — The effect library. Services grouped by the moment they belong to.
 * Every card is one of the 14 services DIP Studio actually lists.
 */

import { momentGroups, serviceById, type Service } from '../data/services';
import { imageMarkup } from '../data/media';
import { esc, qs, qsa } from '../lib/dom';
import { revealNow } from '../lib/reveal';
import { hasLivePreview } from './effect-preview';

const card = (service: Service): string => `
  <article class="card" data-reveal>
    <div class="card__media">
      ${imageMarkup(service.media, { sizes: '(max-width: 700px) 78vw, (max-width: 1100px) 45vw, 22vw' })}
    </div>
    <div class="card__body">
      <h3 class="card__title">${esc(service.name)}</h3>
      <p class="card__tagline">${esc(service.tagline)}</p>
      <button class="link-underline" data-effect-preview="${esc(service.id)}">
        Pogledaj efekat
        <span aria-hidden="true">${hasLivePreview(service.id) ? '▶' : '→'}</span>
      </button>
    </div>
  </article>
`;

export function initLibrary(): void {
  const grid = qs('#library-grid');
  const intro = qs('#library-intro');
  const tabs = qsa<HTMLButtonElement>('.library__tab');
  const panel = qs('#library-panel');
  if (!grid || !intro || !panel || tabs.length === 0) return;

  const render = (groupId: string): void => {
    const group = momentGroups.find((g) => g.id === groupId) ?? momentGroups[0];

    intro.innerHTML = `
      <h3>${esc(group.headline)}</h3>
      <p class="lead">${esc(group.copy)}</p>
    `;

    grid.innerHTML = group.serviceIds
      .map((id) => serviceById(id))
      .filter((s): s is Service => Boolean(s))
      .map(card)
      .join('');

    panel.setAttribute('aria-labelledby', `tab-${group.id}`);
    revealNow(grid);
  };

  const select = (index: number, focus = false): void => {
    tabs.forEach((tab, i) => {
      const active = i === index;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active && focus) tab.focus();
    });
    render(tabs[index].dataset.group ?? momentGroups[0].id);
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(i));
    tab.addEventListener('keydown', (event) => {
      const last = tabs.length - 1;
      if (event.key === 'ArrowRight') select(i === last ? 0 : i + 1, true);
      else if (event.key === 'ArrowLeft') select(i === 0 ? last : i - 1, true);
      else if (event.key === 'Home') select(0, true);
      else if (event.key === 'End') select(last, true);
      else return;
      event.preventDefault();
    });
  });

  select(0);
}
