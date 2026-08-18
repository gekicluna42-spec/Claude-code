/**
 * 09 — The full service directory. All 14 services, expandable, with the
 * exact wording DIP Studio uses plus an editorial line written for this site.
 */

import { services } from '../data/services';
import { imageMarkup } from '../data/media';
import { esc, qs, qsa } from '../lib/dom';

export function initCatalog(): void {
  const root = qs('#catalog');
  if (!root) return;

  root.innerHTML = services
    .map((service, i) => {
      const n = String(i + 1).padStart(2, '0');
      const panelId = `catalog-panel-${service.id}`;
      const triggerId = `catalog-trigger-${service.id}`;
      return `
        <div class="catalog__item">
          <h3>
            <button class="catalog__trigger" id="${triggerId}" aria-expanded="false" aria-controls="${panelId}">
              <span class="catalog__n">${n}</span>
              <span class="catalog__name">${esc(service.name)}</span>
              <span class="catalog__sign" aria-hidden="true"></span>
            </button>
          </h3>
          <div class="catalog__panel" id="${panelId}" role="region" aria-labelledby="${triggerId}" data-open="false">
            <div>
              <div class="catalog__body">
                ${imageMarkup(service.media, { sizes: '(max-width: 760px) 90vw, 40vw' })}
                <div class="catalog__copy">
                  <p class="lead">${esc(service.tagline)}</p>
                  <p>${esc(service.editorial)}</p>
                  <div style="display:flex;gap:.75rem;flex-wrap:wrap">
                    <button class="btn" data-open-booking data-service="${esc(service.id)}">Zatraži ponudu</button>
                    ${service.page ? `<a class="btn btn--ghost" href="${service.page}">Više o usluzi</a>` : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  qsa<HTMLButtonElement>('.catalog__trigger', root).forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const panel = document.getElementById(trigger.getAttribute('aria-controls') ?? '');
      if (!panel) return;
      const open = trigger.getAttribute('aria-expanded') === 'true';
      trigger.setAttribute('aria-expanded', String(!open));
      panel.dataset.open = String(!open);
    });
  });
}
