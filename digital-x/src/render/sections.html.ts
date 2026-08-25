/**
 * Everything after the films.
 *
 * All of it is real markup with real text — the cinematic layer sits on top of
 * a page that reads correctly with JavaScript switched off.
 */

import {
  APPS, AUDIT, AUTOMATION, BRIEF_NEEDS, CONTACT, DEMOS, DISCIPLINES, GROWTH_PATH,
  GUIDES, OFFER, POSITIONING, PRICING, PROCESS, PROJECTS, SHOP, SHOWCASE, VANTA,
} from '../data/content';
import { LIVE, OFFER_ACTIVE, UNRESOLVED } from '../data/site.config';
import { esc, join, lines, map, poster, xMark } from './html';

/** A section head: kicker, display headline, optional standfirst. */
const head = (kicker: string, title: readonly string[], body?: string, cls = ''): string =>
  `<header class="shead ${cls}">
    <p class="kicker">${xMark('kicker__x')}<span>${esc(kicker)}</span></p>
    ${lines(title as string[], 'shead__title', 'h2')}
    ${body ? `<p class="shead__body">${esc(body)}</p>` : ''}
  </header>`;

/**
 * Resolves a CTA whose real destination is unknown. An empty config value
 * falls back to a section on this page instead of shipping a dead link.
 */
const href = (configured: string, fallback: string): string => configured || fallback;

const positioning = (): string => `
<section class="section section--positioning" id="pristup">
  <div class="wrap">
    ${head(POSITIONING.kicker, POSITIONING.title, undefined, 'shead--wide')}
    <p class="positioning__body">${esc(POSITIONING.body)}</p>
  </div>
</section>`;

const offer = (): string =>
  !OFFER_ACTIVE
    ? ''
    : `
<section class="section section--offer" id="ponuda">
  <div class="wrap offer">
    <div class="offer__copy">
      <p class="kicker kicker--accent">${xMark('kicker__x')}<span>${esc(OFFER.kicker)}</span></p>
      ${lines(OFFER.title as unknown as string[], 'offer__title', 'h2')}
      <p class="offer__body">${esc(OFFER.body)}</p>
      <p class="offer__limit">${esc(OFFER.limit)}</p>
    </div>
    <div class="offer__card">
      <p class="offer__name">${esc(OFFER.name)}</p>
      <p class="offer__price">
        <s>${esc(OFFER.priceWas)}</s>
        <strong>${esc(OFFER.priceNow)}</strong>
        <span class="offer__saving">${esc(OFFER.saving)}</span>
      </p>
      <ul class="offer__list">${map(OFFER.includes, (i) => `<li>${esc(i)}</li>`)}</ul>
      <a class="btn btn--primary btn--block" href="${esc(href(UNRESOLVED.offerPage, '#kontakt'))}">${esc(OFFER.cta)}</a>
    </div>
  </div>
</section>`;

const disciplines = (): string => `
<section class="section section--disciplines" id="usluge">
  <div class="wrap">
    ${head('Anatomija rasta', ['Šest disciplina.', 'Jedan tim.'])}
    <ol class="disc">
      ${map(DISCIPLINES, (d) => `
      <li class="disc__item" id="usluga-${d.id}">
        <p class="disc__numeral" aria-hidden="true">${esc(d.numeral)}</p>
        <h3 class="disc__name">${esc(d.name)}</h3>
        <p class="disc__tagline">${esc(d.tagline)}</p>
        <p class="disc__detail">${esc(d.detail)}</p>
        <ul class="disc__points">${map(d.points, (p) => `<li>${esc(p)}</li>`)}</ul>
        <p class="disc__from">${esc(d.from)}</p>
      </li>`)}
    </ol>
  </div>
</section>`;

/**
 * THE DIGITAL X SYSTEM.
 *
 * The X in the middle is not an illustration of the X in the films — it IS the
 * film. Chapter three orbits the completed structure, so selecting a discipline
 * scrubs that ladder to the angle where the structure faces it, and the X
 * physically turns. The markup below is a real tablist, so it works with the
 * keyboard and reads correctly without any of that.
 */
const explorer = (): string => `
<section class="section section--explorer" id="sistem" data-explorer>
  <div class="wrap">
    ${head('The Digital X system', ['Odaberite disciplinu.', 'X se okreće prema njoj.'],
      'Šest povezanih sistema, jedna struktura. Svaki je dio istog Digital X iskustva.')}
  </div>
  <div class="explorer">
    <div class="explorer__stage">
      ${poster('system-open', 'Monumentalni X sa šest povezanih digitalnih sistema.', 'explorer__poster')}
      <canvas class="explorer__canvas" data-explorer-canvas aria-hidden="true"></canvas>
      <div class="explorer__grade" aria-hidden="true"></div>
    </div>
    <div class="explorer__ui wrap">
      <div class="explorer__orbit" aria-hidden="true">
        <span class="explorer__orbit-rail"></span>
        <span class="explorer__orbit-fill" data-orbit-fill></span>
        ${map(DISCIPLINES, (_, i) => `<span class="explorer__dot" data-dot="${i}"></span>`)}
      </div>
      <div class="explorer__tabs" role="tablist" aria-label="Digital X discipline" data-explorer-tabs>
        ${map(DISCIPLINES, (d, i) => `
        <button class="explorer__tab" role="tab" type="button"
          id="tab-${d.id}" aria-controls="panel-${d.id}"
          aria-selected="${i === 0 ? 'true' : 'false'}" tabindex="${i === 0 ? '0' : '-1'}"
          data-index="${i}" data-orbit="${d.orbit}">
          <span class="explorer__tab-index">${esc(d.index)}</span>
          <span class="explorer__tab-name">${esc(d.name)}</span>
        </button>`)}
      </div>
      <div class="explorer__panels">
        ${map(DISCIPLINES, (d, i) => `
        <div class="explorer__panel" role="tabpanel" id="panel-${d.id}"
          aria-labelledby="tab-${d.id}" ${i === 0 ? '' : 'hidden'} data-panel="${i}">
          <p class="explorer__panel-index" aria-hidden="true">${esc(d.index)}</p>
          <h3 class="explorer__panel-name">${esc(d.name)}</h3>
          <p class="explorer__panel-tagline">${esc(d.tagline)}</p>
          <p class="explorer__panel-detail">${esc(d.detail)}</p>
          <ul class="explorer__panel-points">${map(d.points, (p) => `<li>${esc(p)}</li>`)}</ul>
          <p class="explorer__panel-from">${esc(d.from)}</p>
          <div class="explorer__panel-actions">
            <a class="btn btn--primary btn--sm" href="#kontakt">Zatražite procjenu</a>
            <a class="btn btn--ghost btn--sm" href="${esc(LIVE.shop)}">Vidi u Shopu</a>
          </div>
        </div>`)}
      </div>
    </div>
  </div>
</section>`;

/**
 * THE AUTHORITY FIELD.
 *
 * A new section, but not new claims: every line is the verified SEO/GEO/AEO
 * discipline in the brand's own words. The constellation behind it is drawn by
 * the WebGL layer and carries no information the text does not.
 */
const authority = (): string => {
  const seo = DISCIPLINES.find((d) => d.id === 'seo')!;
  return `
<section class="section section--authority" id="autoritet" data-authority>
  <div class="wrap authority">
    <div class="authority__copy">
      ${head('03 Authority', ['Vidljivost nije cilj.', 'Autoritet jeste.'], seo.detail, 'shead--accent')}
      <p class="authority__lead">${esc(seo.tagline)}</p>
      <ul class="ticks">${map(seo.points, (p) => `<li>${esc(p)}</li>`)}</ul>
      <p class="authority__from">${esc(seo.from)}</p>
      <div class="authority__actions">
        <a class="btn btn--primary btn--sm" href="#analiza">${esc(AUDIT.cta)}</a>
        <a class="btn btn--ghost btn--sm" href="#usluga-seo">Vidi disciplinu</a>
      </div>
    </div>
    <div class="authority__field" aria-hidden="true"></div>
  </div>
</section>`;
};

/** GROWTH PATH — one signal, five stages, scrubbable and hoverable. */
const growth = (): string => `
<section class="section section--growth" id="rast" data-growth>
  <div class="wrap">
    ${head(GROWTH_PATH.kicker, GROWTH_PATH.title, GROWTH_PATH.body)}
    <div class="growth">
      <div class="growth__track" aria-hidden="true">
        <svg class="growth__svg" viewBox="0 0 1000 120" preserveAspectRatio="none">
          <path class="growth__rail" d="M20 60 H980" />
          <path class="growth__live" data-growth-live d="M20 60 H980" />
        </svg>
        <span class="growth__signal" data-growth-signal></span>
      </div>
      <ol class="growth__stages" data-growth-stages>
        ${map(GROWTH_PATH.stages, (s, i) => `
        <li class="growth__stage${i === 0 ? ' is-on' : ''}" data-stage="${i}">
          <button class="growth__btn" type="button" data-stage-btn="${i}" aria-describedby="stage-body-${i}">
            <span class="growth__index">${esc(s.index)}</span>
            <span class="growth__name">${esc(s.name)}</span>
            <span class="growth__en">${esc(s.en)}</span>
          </button>
          <p class="growth__body" id="stage-body-${i}">${esc(s.body)}</p>
        </li>`)}
      </ol>
      <p class="growth__hint">
        <span class="growth__hint--wide">Skrolajte ili pređite mišem kroz korake.</span>
        <span class="growth__hint--narrow">Dodirnite korak za detalje.</span>
      </p>
    </div>
  </div>
</section>`;

const apps = (): string => `
<section class="section section--split" id="aplikacije">
  <div class="wrap split">
    <div class="split__copy">
      ${head(APPS.kicker, APPS.title, APPS.body)}
      <ul class="ticks">${map(APPS.points, (p) => `<li>${esc(p)}</li>`)}</ul>
      <a class="btn btn--ghost" href="${esc(LIVE.projekti)}">Pogledajte projekte</a>
    </div>
    <div class="split__media">
      ${poster('system-close', 'Digitalni sistemi povezani na strukturu X-a.', 'split__poster')}
    </div>
  </div>
</section>`;

/** The enquiry → qualification → CRM → scheduling → follow-up chain. */
const automation = (): string => `
<section class="section section--automation" id="automatizacija">
  <div class="wrap">
    ${head(AUTOMATION.kicker, AUTOMATION.title, AUTOMATION.body)}
    <ol class="chain" data-chain>
      ${map(AUTOMATION.chain, (c, i) => `
      <li class="chain__step" data-chain-step="${i}">
        <span class="chain__dot" aria-hidden="true"></span>
        <h3 class="chain__name">${esc(c.name)}</h3>
        <p class="chain__body">${esc(c.body)}</p>
      </li>`)}
    </ol>
    <ul class="ticks ticks--row">${map(AUTOMATION.points, (p) => `<li>${esc(p)}</li>`)}</ul>
  </div>
</section>`;

const process = (): string => `
<section class="section section--process" id="proces">
  <div class="wrap">
    ${head(PROCESS.kicker, PROCESS.title, PROCESS.body)}
    <ol class="process">
      ${map(PROCESS.steps, (s) => `
      <li class="process__step">
        <p class="process__index" aria-hidden="true">${esc(s.index)}</p>
        <h3 class="process__name">${esc(s.name)}</h3>
        <p class="process__body">${esc(s.body)}</p>
      </li>`)}
    </ol>
    <div class="process__actions">
      <a class="btn btn--primary" href="#kontakt">Zakaži konzultacije</a>
      <a class="btn btn--ghost" href="#analiza">Besplatna analiza</a>
    </div>
  </div>
</section>`;

export const partOne = (): string =>
  join([
    positioning(),
    offer(),
    disciplines(),
    explorer(),
    authority(),
    growth(),
    apps(),
    automation(),
    process(),
  ]);

const pricing = (): string => `
<section class="section section--pricing" id="cjenovnik">
  <div class="wrap">
    ${head(PRICING.kicker, PRICING.title, PRICING.body)}
    ${map(PRICING.groups, (g) => `
    <div class="pricing__group">
      <h3 class="pricing__group-name">${esc(g.name)}</h3>
      <div class="pricing__grid">
        ${map(g.items, (it) => `
        <article class="price${it.badge ? ' price--flagged' : ''}">
          ${it.badge ? `<p class="price__badge">${esc(it.badge)}</p>` : ''}
          <h4 class="price__name">${esc(it.name)}</h4>
          ${it.note ? `<p class="price__note">${esc(it.note)}</p>` : ''}
          <p class="price__amount"><strong>${esc(it.price)}</strong> <span>${esc(it.cadence)}</span></p>
          <ul class="price__points">${map(it.points, (p) => `<li>${esc(p)}</li>`)}</ul>
          <a class="price__cta" href="#kontakt">Upit<span aria-hidden="true"> →</span></a>
        </article>`)}
      </div>
    </div>`)}
    <aside class="bundle">
      <p class="bundle__badge">${esc(PRICING.bundle.badge)}</p>
      <h3 class="bundle__name">${esc(PRICING.bundle.name)}</h3>
      <p class="bundle__body">${esc(PRICING.bundle.body)}</p>
      <p class="bundle__price">${esc(PRICING.bundle.price)}</p>
      <p class="bundle__note">${esc(PRICING.bundle.note)}</p>
      <a class="btn btn--primary" href="#kontakt">${esc(PRICING.bundle.cta)}</a>
    </aside>
  </div>
</section>`;

/**
 * Real client work and internal products are kept visibly apart from demo
 * concepts, exactly as digital-x-marketing.com keeps them apart. The labels
 * are the live site's own.
 */
const portfolio = (): string => `
<section class="section section--work" id="radovi">
  <div class="wrap">
    ${head('Radovi', ['Projekti koje možete', 'otvoriti i koristiti.'],
      'Završeni klijentski rad i Digital X proizvodi — na jednom mjestu.')}
  </div>
  <div class="panels">
    ${map(PROJECTS, (p, i) => `
    <article class="panel panel--${p.kind}" data-panel-reveal>
      <div class="panel__media">${poster(p.still, `${p.name} — vizual iz Digital X cinematic sistema.`, 'panel__poster')}</div>
      <div class="panel__copy">
        <p class="panel__label">${esc(p.label)}</p>
        <h3 class="panel__name">${esc(p.name)}</h3>
        <p class="panel__meta">${esc(p.meta)}</p>
        <p class="panel__body">${esc(p.body)}</p>
        <ul class="panel__points">${map(p.points, (pt) => `<li>${esc(pt)}</li>`)}</ul>
        <div class="panel__actions">
          ${i === 0
            ? `<a class="btn btn--primary btn--sm" href="${esc(href(UNRESOLVED.eynnaCaseStudy, LIVE.projekti))}">Pogledaj case study</a>
               <a class="btn btn--ghost btn--sm" href="${esc(href(UNRESOLVED.eynnaApp, LIVE.projekti))}">Isprobaj aplikaciju</a>`
            : `<a class="btn btn--ghost btn--sm" href="${esc(href(p.name.includes('Second Brain') ? UNRESOLVED.secondBrainOs : UNRESOLVED.growthOs, LIVE.projekti))}">Pogledaj na /projekti</a>`}
        </div>
      </div>
    </article>`)}
  </div>
  <div class="wrap">
    <a class="btn btn--ghost" href="${esc(LIVE.projekti)}">Pogledaj sve projekte</a>
  </div>
</section>`;

/**
 * Demo concepts. Each carries the live site's own "Demo koncept" label and the
 * slider is explicitly a concept, not a measured result.
 */
const demos = (): string => `
<section class="section section--demos" id="koncepti">
  <div class="wrap">
    ${head('Demo koncepti', ['Vizualni koncepti', 'transformacija.'],
      'Prikaz mogućnosti po branšama — povucite klizač. Ovo su demonstracije, ne završeni klijentski projekti.')}
    <div class="demos">
      ${map(DEMOS, (d, i) => `
      <article class="demo">
        <div class="demo__frame" data-compare>
          <div class="demo__before" aria-hidden="true"><span>PRIJE</span></div>
          <div class="demo__after" data-compare-after><span>POSLIJE</span></div>
          <span class="demo__handle" data-compare-handle aria-hidden="true"></span>
          <label class="demo__label" for="compare-${i}">Klizač prije/poslije — ${esc(d.name)}</label>
          <input class="demo__range" id="compare-${i}" data-compare-input type="range"
            min="0" max="100" value="50" aria-label="Klizač prije i poslije za ${esc(d.name)}">
        </div>
        <p class="demo__tag">${esc(d.label)}</p>
        <h3 class="demo__name">${esc(d.name)}</h3>
        <p class="demo__body">${esc(d.body)}</p>
        <p class="demo__detail">${esc(d.detail)}</p>
      </article>`)}
    </div>
  </div>
</section>`;

const showcase = (): string => `
<section class="section section--showcase" id="cinematic">
  <div class="wrap">
    ${head(SHOWCASE.kicker, SHOWCASE.title, SHOWCASE.body)}
    <ul class="showcase">
      ${map(SHOWCASE.items, (s) => `
      <li class="showcase__item">
        <p class="showcase__category">${esc(s.category)}</p>
        <h3 class="showcase__name">${esc(s.name)}</h3>
        <p class="showcase__body">${esc(s.body)}</p>
      </li>`)}
    </ul>
  </div>
</section>`;

/**
 * VANTA HYPERCAR — a scroll-scrubbed cinematic demo, the moving-picture proof
 * that sits under the Cinematic showcase.
 *
 * Built as real markup: the poster and the four beat stills are in the DOM from
 * the start, so a crawler, a reader with JavaScript off and a reduced-motion
 * visitor all get the film as a filmstrip. src/sections/vanta.ts upgrades that
 * to a canvas the visitor scrubs — it never gates anything, and its absence
 * costs the page nothing.
 */
const vanta = (): string => `
<section class="section section--vanta vanta" id="vanta" data-vanta
  aria-label="VANTA Hypercar — cinematic demo">
  <div class="wrap vanta__intro">
    <p class="kicker">${xMark('kicker__x')}<span>${esc(VANTA.kicker)}</span></p>
    ${lines(VANTA.title as unknown as string[], 'vanta__title', 'h2')}
    <p class="vanta__body">${esc(VANTA.body)}</p>
  </div>

  <div class="vanta__stage" data-vanta-stage>
    ${poster('vanta-open', 'VANTA Hypercar — filmski kadar u tamnom studiju.', 'vanta__poster', false)}
    <canvas class="vanta__canvas" data-vanta-canvas aria-hidden="true"></canvas>
    <div class="vanta__grade" aria-hidden="true"></div>

    <div class="vanta__hud" aria-hidden="true">
      <p class="vanta__marks">
        ${map(VANTA.beats, (b) => `<span class="vanta__mark" data-vanta-mark
          data-from="${b.from}" data-to="${b.to}"><em>${esc(b.numeral)}</em>${esc(b.title)}</span>`)}
      </p>
      <div class="vanta__rail"><i data-vanta-rail></i></div>
    </div>

    <p class="vanta__scroll" aria-hidden="true"><span>${esc(VANTA.scrollHint)}</span></p>
    <span class="vanta__tag" aria-hidden="true">${esc(VANTA.label)}</span>

    <div class="vanta__outro">
      <p class="vanta__eyebrow">${xMark('vanta__eyebrow-x')}<span>${esc(VANTA.outro.eyebrow)}</span></p>
      <p class="vanta__outro-line">${esc(VANTA.outro.line)}</p>
      <a class="btn btn--primary" href="#kontakt">${esc(VANTA.outro.cta)}</a>
    </div>
  </div>

  <div class="vanta__strip">
    <ol class="strip" aria-label="Kadrovi iz VANTA Hypercar filma">
      ${map(VANTA.beats, (b, i) => `<li class="strip__shot">
        ${poster(`vanta-beat-${i + 1}`, `${b.title} — kadar iz VANTA Hypercar filma.`, 'strip__poster', false)}
        <p class="strip__label"><span>${esc(b.numeral)}</span>${esc(b.title)}</p>
      </li>`)}
    </ol>
  </div>
</section>`;

const shop = (): string => `
<section class="section section--shop" id="shop">
  <div class="wrap">
    ${head(SHOP.kicker, SHOP.title, SHOP.body)}
    <ul class="shop">
      ${map(SHOP.items, (s) => `
      <li class="shop__item">
        <p class="shop__category">${esc(s.category)}</p>
        <h3 class="shop__name">${esc(s.name)}</h3>
        <p class="shop__price">${esc(s.price)}</p>
      </li>`)}
    </ul>
    <a class="btn btn--ghost" href="${esc(LIVE.shop)}">Otvori Digital X Shop</a>
  </div>
</section>`;

/**
 * The free analysis. It collects a URL and sends it as an enquiry — the stage
 * readout names what will be checked, and says plainly that the result comes
 * back from Digital X. It never renders a score it has not measured.
 */
const audit = (): string => `
<section class="section section--audit" id="analiza">
  <div class="wrap audit">
    <div class="audit__copy">
      ${head(AUDIT.kicker, AUDIT.title, AUDIT.body, 'shead--accent')}
      <ul class="audit__axes">
        ${map(AUDIT.axes, (a) => `
        <li class="audit__axis" data-axis>
          <span class="audit__axis-name">${esc(a.name)}</span>
          <span class="audit__axis-body">${esc(a.body)}</span>
          <span class="audit__axis-bar" aria-hidden="true"><i></i></span>
        </li>`)}
      </ul>
    </div>
    <form class="audit__form" data-audit novalidate>
      <label class="field">
        <span class="field__label">Adresa vaše stranice</span>
        <input class="field__input" type="text" name="url" inputmode="url" required
          placeholder="${esc(AUDIT.placeholder)}" autocomplete="url">
      </label>
      <label class="field">
        <span class="field__label">Email za rezultat</span>
        <input class="field__input" type="email" name="email" required
          placeholder="vi@firma.ba" autocomplete="email">
      </label>
      <button class="btn btn--primary btn--block" type="submit">${esc(AUDIT.cta)}</button>
      <p class="audit__note" data-audit-note>
        Analizu radi Digital X i šalje je na vaš email. Ovdje ne prikazujemo ocjenu koju nismo izmjerili.
      </p>
      <p class="form__status" data-form-status role="status" aria-live="polite"></p>
    </form>
  </div>
</section>`;

const guides = (): string => `
<section class="section section--guides" id="vodici">
  <div class="wrap">
    ${head(GUIDES.kicker, GUIDES.title, GUIDES.body)}
    <ul class="guides">
      ${map(GUIDES.featured, (g) => `
      <li class="guide">
        <a class="guide__link" href="${esc(LIVE.blog)}">
          <p class="guide__meta">${esc(g.category)} · ${esc(g.read)}</p>
          <h3 class="guide__name">${esc(g.name)}</h3>
          <p class="guide__body">${esc(g.body)}</p>
        </a>
      </li>`)}
    </ul>
    <a class="btn btn--ghost" href="${esc(LIVE.blog)}">Svih ${GUIDES.total} vodiča</a>
  </div>
</section>`;

const contact = (): string => `
<section class="section section--contact" id="kontakt">
  <div class="wrap contact">
    <div class="contact__copy">
      ${head(CONTACT.kicker, CONTACT.title, CONTACT.body, 'shead--accent')}
      <ul class="contact__direct">
        <li><span>Email</span><a href="mailto:${esc(CONTACT.email)}">${esc(CONTACT.email)}</a></li>
        <li><span>Telefon</span><a href="tel:${esc(CONTACT.phoneHref)}">${esc(CONTACT.phoneLabel)}</a></li>
        <li><span>WhatsApp</span><a href="https://wa.me/${esc(CONTACT.phoneHref.replace('+', ''))}" rel="noopener">${esc(CONTACT.whatsappLabel)}</a></li>
      </ul>
      <p class="contact__reply">${esc(CONTACT.urgent)} Pišite ili zovite direktno — ${esc(CONTACT.reply)}.</p>
    </div>
    <form class="contact__form" data-contact novalidate>
      ${lines(CONTACT.briefTitle as unknown as string[], 'contact__form-title', 'h2')}
      <p class="contact__form-body">${esc(CONTACT.briefBody)}</p>
      <label class="field">
        <span class="field__label">Ime i firma</span>
        <input class="field__input" type="text" name="name" required autocomplete="organization">
      </label>
      <label class="field">
        <span class="field__label">Email</span>
        <input class="field__input" type="email" name="email" required autocomplete="email">
      </label>
      <label class="field">
        <span class="field__label">Glavna potreba</span>
        <select class="field__input" name="need">
          ${map(BRIEF_NEEDS, (n) => `<option>${esc(n)}</option>`)}
        </select>
      </label>
      <label class="field">
        <span class="field__label">Šta želite postići</span>
        <textarea class="field__input" name="message" rows="4" required></textarea>
      </label>
      <button class="btn btn--primary btn--block" type="submit">${esc(CONTACT.cta)}</button>
      <p class="form__status" data-form-status role="status" aria-live="polite"></p>
    </form>
  </div>
</section>`;

export const partTwo = (): string =>
  join([pricing(), portfolio(), demos(), showcase(), vanta(), shop(), audit(), guides(), contact()]);
