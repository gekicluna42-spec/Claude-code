/**
 * 06 — Real moments.
 *
 * When DIP Studio supplies real event photography in site.config, that is
 * what renders, with only the fields that are actually known. Until then the
 * gallery shows this site's cinematic renders and says so plainly, rather
 * than passing a render off as a wedding we shot.
 */

import { site } from '../data/site.config';
import { imageMarkup, entry } from '../data/media';
import { esc, qs } from '../lib/dom';

const RENDER_KEYS = [
  'act-04-spark-c', 'act-02-first-dance-a', 'act-03-cloud-b', 'act-05-spectacle-a',
  'act-01-anticipation-c', 'act-05-spectacle-c', 'act-04-spark-a', 'act-01-anticipation-b',
  'act-05-spectacle-b',
];

export function initGallery(): void {
  const root = qs('#gallery');
  const note = qs('#gallery-note');
  if (!root || !note) return;

  if (site.realProjects.length > 0) {
    root.innerHTML = site.realProjects
      .map((project) => {
        const meta = [
          project.event ? `<span>${esc(project.event)}</span>` : '',
          project.location ? `<span>${esc(project.location)}</span>` : '',
          project.effects?.length ? `<span>${esc(project.effects.join(' · '))}</span>` : '',
        ].join('');
        return `
          <figure class="gallery__item">
            <img src="${esc(project.image)}" alt="${esc(project.alt)}" loading="lazy" decoding="async" />
            <figcaption class="gallery__overlay">
              ${meta}
              <span class="gallery__cta">Pogledaj trenutak <span aria-hidden="true">→</span></span>
            </figcaption>
          </figure>
        `;
      })
      .join('');
    note.textContent = '';
    return;
  }

  root.innerHTML = RENDER_KEYS.map((key) => {
    const item = entry(key);
    return `
      <figure class="gallery__item">
        ${imageMarkup(key, { sizes: '(max-width: 600px) 92vw, (max-width: 900px) 45vw, 30vw' })}
        <figcaption class="gallery__overlay">
          <span>${esc(item.alt)}</span>
          <span class="gallery__cta">Prikaz scene</span>
        </figcaption>
      </figure>
    `;
  }).join('');

  note.textContent =
    'Prikazane scene su kinematografski prikazi izrađeni za ovu stranicu, a ne fotografije stvarnih događaja. Galerija stvarnih događaja slijedi.';
}
