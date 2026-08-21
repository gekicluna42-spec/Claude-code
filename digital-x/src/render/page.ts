/**
 * Assembles index.html. Run in Node at build time by plugins/render-html.mjs,
 * never in the browser — which is the point: the whole page exists as markup
 * before a single byte of the bundle runs.
 */

import { CONTACT, DISCIPLINES, HERO, META, PRICING } from '../data/content';
import { LIVE, ORIGIN, UNRESOLVED } from '../data/site.config';
import { esc, join, map, xMark } from './html';
import { renderFilm } from './film.html';
import { partOne, partTwo } from './sections.html';

const NAV = [
  { href: '#usluge', label: 'Usluge' },
  { href: '#sistem', label: 'Sistem' },
  { href: '#autoritet', label: 'Autoritet' },
  { href: '#cjenovnik', label: 'Cjenovnik' },
  { href: '#radovi', label: 'Radovi' },
  { href: '#analiza', label: 'Analiza' },
];

const nav = (): string => `
<header class="nav" data-nav>
  <a class="nav__brand" href="#top" aria-label="${esc(META.brand)} — početak">
    ${xMark('nav__x')}<span class="nav__word">DIGITAL<em>X</em></span>
  </a>
  <nav class="nav__links" aria-label="Glavna navigacija">
    ${map(NAV, (n) => `<a href="${n.href}">${esc(n.label)}</a>`)}
  </nav>
  <a class="btn btn--primary btn--sm nav__cta" href="#kontakt">${esc(HERO.primaryCta)}</a>
  <button class="nav__toggle" type="button" data-nav-toggle aria-expanded="false" aria-controls="nav-sheet">
    <span class="sr-only">Otvori meni</span><span aria-hidden="true"></span>
  </button>
</header>
<div class="nav__sheet" id="nav-sheet" data-nav-sheet hidden>
  ${map(NAV, (n) => `<a href="${n.href}">${esc(n.label)}</a>`)}
  <a href="#kontakt">${esc(HERO.primaryCta)}</a>
</div>`;

/**
 * The curtain. It shows a real percentage because the opening chapter really
 * is loading behind it — 192 frames have to be resident before the first scrub
 * can be smooth, and a fake progress bar over a real wait is a lie the visitor
 * can feel.
 */
const boot = (): string => `
<div class="boot" data-boot>
  <div class="boot__mark" aria-hidden="true">${xMark('boot__x')}</div>
  <p class="boot__label">Učitavanje cinematic sistema</p>
  <div class="boot__bar" aria-hidden="true"><i data-boot-bar></i></div>
  <p class="boot__pct" data-boot-pct aria-live="polite">0%</p>
  <button class="boot__skip" type="button" data-boot-skip>Preskoči</button>
</div>`;

/**
 * A hairline at the top of the viewport showing how much of the film has been
 * fetched. It exists because the film is long and silent: without it, a slow
 * connection is indistinguishable from a broken page.
 */
const buffer = (): string =>
  `<div class="buffer" data-buffer aria-hidden="true"><i data-buffer-bar></i></div>`;

const footer = (): string => {
  const legal = join([
    UNRESOLVED.privacyPolicy && `<a href="${esc(UNRESOLVED.privacyPolicy)}">Politika privatnosti</a>`,
    UNRESOLVED.termsOfService && `<a href="${esc(UNRESOLVED.termsOfService)}">Uslovi korištenja</a>`,
  ]);
  const social = join([
    UNRESOLVED.instagram && `<a href="${esc(UNRESOLVED.instagram)}" rel="noopener">Instagram</a>`,
    UNRESOLVED.facebook && `<a href="${esc(UNRESOLVED.facebook)}" rel="noopener">Facebook</a>`,
    UNRESOLVED.linkedin && `<a href="${esc(UNRESOLVED.linkedin)}" rel="noopener">LinkedIn</a>`,
  ]);
  return `
<footer class="foot">
  <div class="wrap foot__grid">
    <div class="foot__brand">
      <span class="foot__mark" data-foot-mark>${xMark('foot__x')}</span>
      <p class="foot__word">DIGITAL<em>X</em></p>
      <p class="foot__line">${esc(HERO.lede)}</p>
    </div>
    <nav class="foot__col" aria-label="Usluge">
      <h2 class="foot__title">Discipline</h2>
      ${map(DISCIPLINES, (d) => `<a href="#usluga-${d.id}">${esc(d.name)}</a>`)}
    </nav>
    <nav class="foot__col" aria-label="Stranice">
      <h2 class="foot__title">Stranice</h2>
      <a href="${esc(LIVE.projekti)}">Projekti</a>
      <a href="${esc(LIVE.blog)}">Blog</a>
      <a href="${esc(LIVE.shop)}">Shop</a>
      <a href="#analiza">Analiza sajta</a>
    </nav>
    <div class="foot__col">
      <h2 class="foot__title">Kontakt</h2>
      <a href="mailto:${esc(CONTACT.email)}">${esc(CONTACT.email)}</a>
      <a href="tel:${esc(CONTACT.phoneHref)}">${esc(CONTACT.phoneLabel)}</a>
      <a href="https://wa.me/${esc(CONTACT.phoneHref.replace('+', ''))}" rel="noopener">WhatsApp</a>
      ${social}
    </div>
  </div>
  <div class="wrap foot__base">
    <p>© ${new Date().getFullYear()} ${esc(META.siteName)}</p>
    ${legal ? `<div class="foot__legal">${legal}</div>` : ''}
  </div>
</footer>`;
};

/**
 * Schema.org. Only fields that were verified on the live site go in — the
 * offers list is the published "od" pricing and nothing else, and there is no
 * aggregateRating because there are no verified reviews to aggregate.
 */
const schema = (): string => {
  const offers = PRICING.groups
    .flatMap((g) => g.items)
    .filter((i) => i.price.startsWith('od '))
    .map((i) => ({
      '@type': 'Offer',
      name: i.name,
      priceCurrency: 'BAM',
      price: i.price.replace('od ', '').replace(' KM', '').replace('.', ''),
      priceSpecification: {
        '@type': 'PriceSpecification',
        priceCurrency: 'BAM',
        minPrice: i.price.replace('od ', '').replace(' KM', '').replace('.', ''),
      },
      description: i.note || i.points.join(' · '),
    }));

  const data = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': `${ORIGIN}/#organization`,
    name: META.siteName,
    alternateName: META.brand,
    url: `${ORIGIN}/`,
    email: CONTACT.email,
    telephone: CONTACT.phoneHref,
    description: META.description,
    slogan: HERO.title.join(' '),
    areaServed: { '@type': 'Country', name: 'Bosna i Hercegovina' },
    knowsLanguage: ['bs', 'hr', 'sr'],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Digital X discipline',
      itemListElement: DISCIPLINES.map((d) => ({
        '@type': 'OfferCatalog',
        name: d.name,
        description: d.tagline,
      })),
    },
    makesOffer: offers,
  };
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
};

const headTags = (): string =>
  join([
    `<title>${esc(META.title)}</title>`,
    `<meta name="description" content="${esc(META.description)}">`,
    `<link rel="canonical" href="${ORIGIN}/">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${esc(META.siteName)}">`,
    `<meta property="og:locale" content="${META.locale}">`,
    `<meta property="og:title" content="${esc(META.title)}">`,
    `<meta property="og:description" content="${esc(META.description)}">`,
    `<meta property="og:url" content="${ORIGIN}/">`,
    `<meta property="og:image" content="${ORIGIN}/media/poster/signal-engine-close.jpg">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(META.title)}">`,
    `<meta name="twitter:description" content="${esc(META.description)}">`,
    `<meta name="twitter:image" content="${ORIGIN}/media/poster/signal-engine-close.jpg">`,
    `<meta name="theme-color" content="#070708">`,
    schema(),
  ]);

export function renderPage(): { head: string; body: string } {
  return {
    head: headTags(),
    body: join([
      `<a class="skip" href="#main">Preskoči na sadržaj</a>`,
      // One WebGL surface for the entire page. Purely presentational: it sits
      // behind the document and is removed from the accessibility tree.
      `<canvas class="engine" data-engine-canvas aria-hidden="true"></canvas>`,
      boot(),
      buffer(),
      nav(),
      `<main id="main" data-main>`,
      `<div id="top"></div>`,
      renderFilm(),
      partOne(),
      partTwo(),
      `</main>`,
      footer(),
    ]),
  };
}
