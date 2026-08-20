/**
 * The four cinematic chapters.
 *
 * Each is a tall section with a sticky stage inside it. The canvas is the
 * scrubbed picture; the <picture> behind it is the poster, which is what a
 * reduced-motion visitor, a crawler and anyone whose frames have not arrived
 * yet actually sees. The copy is real text on top, never baked into a frame.
 */

import { HERO } from '../data/content';
import { esc, join, lines, map, poster, xMark } from './html';

interface Cue {
  id: string;
  kicker?: string;
  title: string[];
  body?: string;
  /** Rendered smaller — used for the beats that are a caption, not a headline. */
  small?: boolean;
  /** The one real <h1> on the page. Only the hero cue sets it. */
  h1?: boolean;
}

/**
 * `is-on` is baked into the first cue of every chapter. The director takes the
 * class over the moment it runs, but with JavaScript unavailable the headline
 * of each chapter is still on screen rather than sitting at opacity 0.
 */
const cue = (c: Cue, i: number): string =>
  `<div class="cue${c.small ? ' cue--small' : ''}${i === 0 ? ' is-on' : ''}" data-cue="${c.id}">` +
  join([
    c.kicker && `<p class="cue__kicker">${esc(c.kicker)}</p>`,
    lines(c.title, c.small ? 'cue__title cue__title--small' : 'cue__title', c.h1 ? 'h1' : 'p'),
    c.body && `<p class="cue__body">${esc(c.body)}</p>`,
  ]) +
  `</div>`;

const chapter = (opts: {
  id: string;
  numeral: string;
  title: string;
  posterBase: string;
  alt: string;
  cues: Cue[];
  eager?: boolean;
  extra?: string;
}): string =>
  `<section class="chapter" id="chapter-${opts.id}" data-chapter="${opts.id}" aria-label="${esc(opts.title)}">
  <div class="chapter__stage">
    ${poster(opts.posterBase, opts.alt, 'chapter__poster', opts.eager)}
    <canvas class="chapter__canvas" aria-hidden="true"></canvas>
    <div class="chapter__grade" aria-hidden="true"></div>
    <div class="chapter__vignette" aria-hidden="true"></div>
    <div class="chapter__inner">
      <p class="chapter__marker" aria-hidden="true">${xMark('chapter__x')}<span>${esc(opts.numeral)}</span><span class="chapter__name">${esc(opts.title)}</span></p>
      <div class="chapter__cues">${map(opts.cues, cue)}</div>
      ${opts.extra ?? ''}
    </div>
  </div>
</section>`;

export const renderChapters = (): string =>
  join([
    chapter({
      id: 'signal',
      numeral: 'I',
      title: 'The Signal',
      posterBase: 'signal-open',
      alt: 'Razdvojeni digitalni sistemi u tamnom prostoru, sa X-oblikom u daljini.',
      eager: true,
      cues: [
        {
          id: 'signal-a',
          kicker: HERO.eyebrow,
          title: HERO.title as unknown as string[],
          body: HERO.lede,
          h1: true,
        },
        {
          id: 'signal-b',
          title: ['Sve je tu.', 'Ništa nije povezano.'],
          body: HERO.support,
          small: true,
        },
      ],
      extra: `<div class="chapter__hero-actions">
        <a class="btn btn--primary" href="#kontakt">${esc(HERO.primaryCta)}</a>
        <a class="btn btn--ghost" href="#analiza">${esc(HERO.secondaryCta)}</a>
      </div>
      <p class="chapter__scroll" aria-hidden="true"><span>${esc(HERO.scrollHint)}</span></p>`,
    }),
    chapter({
      id: 'reveal',
      numeral: 'II',
      title: 'The Reveal',
      posterBase: 'reveal-close',
      alt: 'Monumentalni trodimenzionalni X sastavljen od fragmenata digitalnih interfejsa.',
      cues: [
        { id: 'reveal-a', kicker: 'II — Detonacija', title: ['Razdvojeno', 'se raspada.'], small: true },
        { id: 'reveal-b', title: ['Zadržite', 'ovaj trenutak.'], body: 'Nastavite skrolati.' },
        { id: 'reveal-c', kicker: 'Obrnuto', title: ['Svaki fragment', 'nalazi svoje mjesto.'], small: true },
      ],
    }),
    chapter({
      id: 'system',
      numeral: 'III',
      title: 'The System',
      posterBase: 'system-open',
      alt: 'Šest povezanih digitalnih sistema koji se otvaraju iz strukture X-a.',
      cues: [
        { id: 'system-a', kicker: 'III — Sistem', title: ['Šest disciplina.', 'Jedna struktura.'], small: true },
        { id: 'system-b', title: ['Web. Aplikacije.', 'Vidljivost. Oglasi.', 'Sadržaj. Automatizacija.'], small: true },
        { id: 'system-c', kicker: 'Povezano', title: ['Sve fizički', 'spojeno na X.'], small: true },
      ],
    }),
    chapter({
      id: 'inside',
      numeral: 'IV',
      title: 'Inside the X',
      posterBase: 'inside-close',
      alt: 'Pogled kroz središnji otvor X-a u osvijetljenu unutrašnju mrežu.',
      cues: [
        { id: 'inside-a', kicker: 'IV — Unutar X-a', title: ['Jedan signal', 'ulazi.'], small: true },
        { id: 'inside-b', title: ['Otkrivanje. Iskustvo.', 'Interakcija.', 'Automatizacija.'], small: true },
        { id: 'inside-c', title: ['Jedan inteligentan', 'sistem rasta.'] },
      ],
    }),
  ]);
