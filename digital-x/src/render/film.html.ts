/**
 * The film.
 *
 * One section, one sticky stage, four clips played as one reel. Nothing else
 * is on screen while it runs: no headings, no body copy, no navigation links.
 * The only things over the picture are a segment marker, a progress rail and
 * a way out — none of which are content.
 *
 * The hero is inside this section rather than after it, and it is the payoff:
 * it lands on the final frame once the film has played its last, which is the
 * first moment anything on this page is allowed to speak.
 *
 * The <h1> is in the markup from the start, so a crawler and a reader with
 * JavaScript off both get it immediately — it is the film that hides it, and
 * only while the film is running.
 */

import { HERO } from '../data/content';
import { SEGMENTS } from '../cinema/timeline';
import { esc, join, lines, map, poster, xMark } from './html';

/**
 * Where each clip sits on the film's scroll, matching timeline.ts. Only used
 * to light the marker, so approximate boundaries are fine.
 */
const MARKS: { id: string; from: number; to: number }[] = [
  { id: 'signal', from: 0, to: 0.225 },
  { id: 'reveal', from: 0.225, to: 0.55 },
  { id: 'system', from: 0.55, to: 0.75 },
  { id: 'inside', from: 0.75, to: 1 },
];

/** The four stills, shown stacked when the film cannot or should not play. */
const filmstrip = (): string =>
  `<ol class="strip" aria-label="Kadrovi iz Digital X filma">
    ${map(SEGMENTS, (segment, i) => {
      const still = i === 0 ? 'signal-open' : `${segment.id}-close`;
      return `<li class="strip__shot">
        ${poster(still, `${segment.title} — kadar iz Digital X filma.`, 'strip__poster', i === 0)}
        <p class="strip__label"><span>${esc(segment.numeral)}</span>${esc(segment.title)}</p>
      </li>`;
    })}
  </ol>`;

export const renderFilm = (): string => `
<section class="film" id="film" data-film aria-label="Digital X cinematic">
  <div class="film__stage">
    ${poster('signal-open', 'Razdvojeni digitalni sistemi u tamnom prostoru, sa X-oblikom u daljini.', 'film__poster', true)}
    <canvas class="film__canvas" data-film-canvas aria-hidden="true"></canvas>
    <div class="film__grade" aria-hidden="true"></div>
    <div class="film__vignette" aria-hidden="true"></div>

    <div class="film__hud" aria-hidden="true">
      <p class="film__marks">
        ${map(MARKS, (mark, i) => {
          const segment = SEGMENTS[i]!;
          return `<span class="film__mark" data-mark data-from="${mark.from}" data-to="${mark.to}">
            <em>${esc(segment.numeral)}</em>${esc(segment.title)}
          </span>`;
        })}
      </p>
      <div class="film__rail"><i data-film-rail></i></div>
    </div>

    <p class="film__scroll" aria-hidden="true"><span>${esc(HERO.scrollHint)}</span></p>
    <button class="film__skip" type="button" data-film-skip>Preskoči film</button>

    <div class="film__hero">
      <p class="film__eyebrow">${xMark('film__eyebrow-x')}<span>${esc(HERO.eyebrow)}</span></p>
      ${lines(HERO.title as unknown as string[], 'film__title', 'h1')}
      <p class="film__lede">${esc(HERO.lede)}</p>
      <p class="film__support">${esc(HERO.support)}</p>
      <div class="film__actions">
        <a class="btn btn--primary" href="#kontakt">${esc(HERO.primaryCta)}</a>
        <a class="btn btn--ghost" href="#analiza">${esc(HERO.secondaryCta)}</a>
      </div>
    </div>
  </div>

  ${join([`<div class="film__strip">`, filmstrip(), `</div>`])}
</section>`;
