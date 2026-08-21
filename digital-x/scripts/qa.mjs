/**
 * The checklist this build has to pass before it can be called finished.
 *
 * Everything here is asserted against the running page in a real browser, and
 * the cinematic checks read the frame index the canvas actually painted rather
 * than the scroll position — so "the scrub works" means pixels changed, not
 * that a scrollbar moved.
 *
 *   npm run qa                      against the dev server
 *   DX_URL=http://localhost:4173/ npm run qa   against the production build
 */

import puppeteer from 'puppeteer-core';

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const URL = process.env.DX_URL ?? 'http://localhost:5173/';

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844, mobile: true },
  { name: 'tablet', width: 834, height: 1112, mobile: false },
  { name: 'desktop', width: 1440, height: 900, mobile: false },
];

/**
 * Strings read off digital-x-marketing.com that must survive into this page.
 * If a rewrite ever drops one of these, that is verified business information
 * lost — the single failure mode this project cannot ship with.
 */
const VERIFIED = [
  'Prisustvo', 'koje se pamti.', 'Web. Marketing. Inteligencija.',
  'Ne pravimo web stranice.', 'koja prodaju.',
  'Web & E-commerce', 'Aplikacije', 'SEO / GEO / AEO', 'Oglašavanje',
  'Sadržaj & Produkcija', 'AI Automatizacija',
  'Prva AEO agencija u BiH', 'Radnik koji ne spava',
  'od 199 KM', 'od 449 KM', 'od 2.490 KM', 'od 3.490 KM', 'od 249 KM',
  'od 490 KM', 'od 99 KM', 'od 29 KM', 'od 349 KM', 'od 899 KM/mj',
  '995 KM', '499 KM', 'Ušteda 496 KM', 'Smart Website Launch',
  'Eynna Hair', 'GrowthOS', 'AI Second Brain OS',
  'Demo koncept', 'Advokatska kancelarija', 'Stomatološka ordinacija',
  'Cinematic Watch', 'Cinematic Deepsea',
  'digital.x.agency.ba@gmail.com', '+387 64 438 3566',
  'Koliko košta web stranica u BiH u 2026?', 'Kako da vas ChatGPT preporuči',
  'Automation Starter', 'Digitalni partner',
  'Dijagnoza postojećeg stanja', 'bez skrivenih stavki',
];

/** Claims that must NOT appear — none of them could be verified. */
const FORBIDDEN = [
  /\b\d+\+?\s*(zadovoljnih\s+)?klijenata\b/i,
  /\bnagrad[au]\b/i,
  /\bcertific/i,
  /\bpreko\s+\d+\s+projekata\b/i,
  /\bROAS\b/i,
  /\b\d+%\s*(vi[sš]e|rasta|pove[cć]anj)/i,
];

let failures = 0;
let checks = 0;

const check = (name, ok, detail = '') => {
  checks++;
  if (ok) {
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Scroll, then wait for the picture to catch up.
 *
 * The director eases the rendered progress toward the scroll target rather than
 * snapping to it — that ease is what makes the scrub read as a camera. So a
 * fixed sleep either wastes time or, on a heavier frame, samples mid-glide and
 * reports a scrub that "did not reverse". Poll the painted frame indices until
 * they stop changing instead.
 */
async function scrollTo(page, top) {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top);
  let previous = null;
  let stable = 0;
  for (let i = 0; i < 40; i++) {
    await sleep(90);
    const now = String((await stateOf(page))?.frame ?? '');
    stable = now === previous ? stable + 1 : 0;
    previous = now;
    if (stable >= 3) return;
  }
}

const stateOf = (page) => page.evaluate(() => window.__dx?.state?.() ?? null);

async function openPage(browser, viewport, { reducedMotion = false } = {}) {
  const page = await browser.newPage();
  await page.setViewport({
    width: viewport.width,
    height: viewport.height,
    isMobile: viewport.mobile,
    hasTouch: viewport.mobile,
    deviceScaleFactor: 1,
  });
  if (reducedMotion) {
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  }
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('requestfailed', (r) => {
    // Fonts come from a third party; a blocked font is not a page defect.
    if (!/fonts\.(googleapis|gstatic)\.com/.test(r.url())) {
      errors.push(`request failed: ${r.url()} ${r.failure()?.errorText ?? ''}`);
    }
  });
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 90000 });
  await page.waitForFunction("document.documentElement.classList.contains('is-ready')", { timeout: 90000 });
  await sleep(1000);
  return { page, errors };
}

/* ---- 1. The film: one continuous reel ----------------------------------- */

async function checkFilm(page, viewport) {
  const geometry = await page.evaluate(() => {
    const film = document.querySelector('[data-film]');
    if (!film) return null;
    return { top: film.offsetTop, height: film.offsetHeight };
  });
  check('the film is a single section', Boolean(geometry));
  if (!geometry) return;

  check('there is exactly one film canvas',
    (await page.$$('[data-film] canvas')).length === 1);

  const span = geometry.height - viewport.height;
  /** Scroll to a given progress through the film. */
  const seek = async (progress) => {
    await scrollTo(page, Math.round(geometry.top + span * progress));
    return stateOf(page);
  };

  // Everything below is measured against the film's own configuration, read
  // from the page, so retiming the film retunes the checks with it.
  const film = await page.evaluate(() => window.__dx?.film?.() ?? null);
  check('the film exposes its configuration', Boolean(film?.keys?.length));
  if (!film) return;

  const total = (await stateOf(page))?.frames ?? 0;
  const nominal = film.keys[film.keys.length - 1].frame + 1;
  check('the reel carries the whole film', total >= nominal * 0.5 && total <= nominal,
    `${total} of a nominal ${nominal}`);

  // The brief asks for 140-180 frames over 400-550vh. Assert the band rather
  // than a number, so the film can be retimed inside it but not out of it.
  check('the hero is 140-180 frames', nominal >= 140 && nominal <= 180, `${nominal} frames`);
  const vh = viewport.width <= 860 ? film.scrollVhMobile : film.scrollVh;
  check('the film runs 400-550vh on desktop',
    viewport.width <= 860 || (film.scrollVh >= 400 && film.scrollVh <= 550),
    `${film.scrollVh}vh`);
  check('the film section matches its configured length',
    Math.abs(geometry.height / viewport.height - vh / 100) < 0.35,
    `${(geometry.height / viewport.height).toFixed(1)} viewports, configured ${vh}vh`);

  const a = (await seek(0.03)).frame;
  const b = (await seek(0.2)).frame;
  const c = (await seek(0.7)).frame;
  const d = (await seek(Math.min(0.99, film.filmEnd + 0.03))).frame;
  const back = (await seek(0.2)).frame;

  check('the film scrubs forward across its whole length',
    a >= 0 && b > a && c > b && d > c, `frames ${a} → ${b} → ${c} → ${d}`);
  check('the film scrubs in reverse', Math.abs(back - b) <= 4, `${d} → ${back} (want ≈${b})`);
  check('the film reaches its final frame', d >= total - 6, `${d} of ${total - 1}`);

  // The hold: two consecutive keys carrying the same frame. Find it in the
  // film's own timeline rather than assuming where it is.
  const holdAt = film.keys.findIndex(
    (k, i) => i > 0 && k.frame === film.keys[i - 1].frame && k.at < film.filmEnd,
  );
  check('the film has a hold', holdAt > 0);
  if (holdAt > 0) {
    const from = film.keys[holdAt - 1].at;
    const to = film.keys[holdAt].at;
    const inset = (to - from) * 0.12;
    const before = (await seek(Math.max(0, from - (to - from) * 1.2))).frame;
    const holdStart = (await seek(from + inset)).frame;
    const holdMid = (await seek((from + to) / 2)).frame;
    const holdEnd = (await seek(to - inset)).frame;
    const after = (await seek(Math.min(film.filmEnd, to + (to - from)))).frame;
    check('the film reaches the held moment', holdStart > before + 2, `${before} → ${holdStart}`);
    check('it HOLDS while scroll continues',
      Math.abs(holdMid - holdStart) <= 2 && Math.abs(holdEnd - holdStart) <= 2,
      `frames ${holdStart} / ${holdMid} / ${holdEnd}`);
    check('the film resumes after the hold', after > holdEnd + 2, `${holdEnd} → ${after}`);
  }

  // The single-file preview ships one ladder on purpose, so only assert the
  // upgrade where a wider one exists to upgrade to.
  const ladders = await page.evaluate(() =>
    (window.__DX_FRAMES__?.ladders ?? []).map((l) => l.dir));
  if (!viewport.mobile && (!ladders.length || ladders.includes('lg'))) {
    await seek(0.5);
    check('the film upgrades to the wide frame ladder',
      (await stateOf(page))?.ladder === 'lg', String((await stateOf(page))?.ladder));
  }

  // Preloading: by the time the visitor is a third of the way in, the rest of
  // the reel should be arriving rather than being fetched frame by frame.
  await seek(0.34);
  await sleep(2500);
  const buffered = (await stateOf(page))?.buffered ?? 0;
  check('the rest of the film preloads behind the visitor', buffered > 0.9,
    `${Math.round(buffered * 100)}% buffered`);
}

/* ---- 2. Nothing speaks until the film is over ---------------------------- */

async function checkGate(page, viewport) {
  const geometry = await page.evaluate(() => {
    const film = document.querySelector('[data-film]');
    return film ? { top: film.offsetTop, height: film.offsetHeight } : null;
  });
  if (!geometry) return;
  const span = geometry.height - viewport.height;

  const visible = () =>
    page.evaluate(() => {
      // Opacity and visibility do not inherit as computed values, so a link
      // inside a faded container still reports opacity 1. Walk the ancestors.
      const seen = (el) => {
        for (let node = el; node && node !== document.documentElement; node = node.parentElement) {
          const style = getComputedStyle(node);
          if (Number(style.opacity) < 0.05) return false;
          if (style.visibility === 'hidden' || style.display === 'none') return false;
        }
        const box = el.getBoundingClientRect();
        return box.bottom > 0 && box.top < window.innerHeight && box.width > 0;
      };
      const inViewport = Array.from(document.querySelectorAll('h1, h2, h3, p, li, a[href]'))
        .filter((el) => !el.closest('.boot'))
        .filter(seen)
        // The HUD, the brand mark and the way out are not content.
        .filter((el) => !el.closest('.film__hud, .film__scroll, .film__skip, .nav__brand'))
        .map((el) => (el.textContent || '').trim().slice(0, 40))
        .filter(Boolean);
      return {
        content: inViewport,
        heroVisible: Number(getComputedStyle(document.querySelector('.film__hero')).opacity) > 0.9,
        gate: document.documentElement.classList.contains('film-running'),
      };
    });

  const focusable = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.nav__links a, .nav__cta, [data-nav-toggle]'))
      .filter((el) => el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden').length);
  check('the film does not leave hidden controls in the tab order', focusable === 0,
    `${focusable} still focusable`);

  for (const at of [0.0, 0.25, 0.55, 0.85]) {
    await scrollTo(page, Math.round(geometry.top + span * at));
    const now = await visible();
    check(`nothing speaks at ${Math.round(at * 100)}% of the film`,
      now.content.length === 0 && !now.heroVisible && now.gate,
      now.content.slice(0, 3).join(' | '));
  }

  await scrollTo(page, Math.round(geometry.top + span * 0.995));
  await sleep(1500);
  const end = await visible();
  check('the hero lands once the film is over', end.heroVisible && !end.gate);
  check('the navigation returns once the film is over', await page.evaluate(() =>
    Number(getComputedStyle(document.querySelector('.nav__links')).opacity) > 0.9 ||
    Number(getComputedStyle(document.querySelector('[data-nav-toggle]')).opacity) > 0.9));

  // The skip control must genuinely leave the film.
  await scrollTo(page, geometry.top + span * 0.1);
  await page.evaluate(() => document.querySelector('[data-film-skip]').click());
  await sleep(2200);
  const past = await page.evaluate(() => {
    const film = document.querySelector('[data-film]');
    return window.scrollY >= film.offsetTop + film.offsetHeight - window.innerHeight * 1.5;
  });
  check('the skip control leaves the film', past);
}

/* ---- 2b. The Signal Engine ----------------------------------------------- */

async function checkEngine(page) {
  const engine = await page.evaluate(() => window.__dx?.engine?.() ?? null);
  check('the Signal Engine reports its state', engine !== null);
  check('the Signal Engine mounted', engine?.ok === true, JSON.stringify(engine));
  if (!engine?.ok) return;

  check('the engine canvas is present, decorative and inert', await page.evaluate(() => {
    const c = document.querySelector('[data-engine-canvas]');
    if (!c) return false;
    const style = getComputedStyle(c);
    return (
      c.getAttribute('aria-hidden') === 'true' &&
      style.pointerEvents === 'none' &&
      style.position === 'fixed' &&
      c.classList.contains('is-live')
    );
  }));

  // One context for the whole page, not one per section.
  check('there is exactly one WebGL canvas',
    (await page.$$('canvas[data-engine-canvas]')).length === 1);

  // Each object's DOM anchor has to exist and have a box, or the object is
  // drawing somewhere nobody is looking.
  const anchors = await page.evaluate(() => {
    const box = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    };
    return {
      explorer: box('.explorer__stage'),
      authority: box('.authority__field'),
      chain: box('[data-chain]'),
      footer: box('[data-foot-mark]'),
      disciplines: document.querySelectorAll('.disc__item').length,
    };
  });
  for (const [name, value] of Object.entries(anchors)) {
    if (name === 'disciplines') continue;
    check(`${name} anchor has a box`, Boolean(value && value.w > 40 && value.h > 40),
      JSON.stringify(value));
  }
  check('every verified discipline has a Signal Object anchor', anchors.disciplines === 6,
    String(anchors.disciplines));

  // The renderer must park itself when nothing is on screen, or the world
  // burns a GPU for the whole visit.
  await scrollTo(page, 0);
  await sleep(1600);
  const parked = await page.evaluate(
    () => new Promise((resolve) => {
      let frames = 0;
      const start = performance.now();
      const tick = () => {
        frames++;
        if (performance.now() - start > 600) resolve(frames);
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }),
  );
  check('the page still animates smoothly with the world parked', parked > 20, `${parked} frames`);
}

/* ---- 2c. No WebGL at all -------------------------------------------------- */

async function checkWithoutWebgl() {
  const blind = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-webgl', '--disable-webgl2'],
  });
  try {
    const { page, errors } = await openPage(blind, VIEWPORTS[2]);
    const result = await page.evaluate(() => ({
      engine: window.__dx?.engine?.() ?? null,
      ready: document.documentElement.classList.contains('is-ready'),
      canvasLive: document.querySelector('[data-engine-canvas]')?.classList.contains('is-live'),
      headings: document.querySelectorAll('h1, h2').length,
      tabs: document.querySelectorAll('[role="tab"]').length,
    }));
    check('no WebGL: the page still becomes ready', result.ready);
    check('no WebGL: the engine declines rather than throwing', result.engine?.ok === false,
      JSON.stringify(result.engine));
    check('no WebGL: the canvas stays invisible', result.canvasLive === false);
    check('no WebGL: all the content is still there',
      result.headings >= 12 && result.tabs === 6,
      `${result.headings} headings, ${result.tabs} tabs`);
    check('no WebGL: the film still scrubs', await page.evaluate(async () => {
      window.scrollTo({ top: 2000, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 1200));
      return (window.__dx?.state?.()?.frame ?? -1) > 0;
    }));
    check('no WebGL: no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
    await page.close();
  } finally {
    await blind.close();
  }
}

/* ---- 3. System Explorer ------------------------------------------------- */

async function checkExplorer(page) {
  const section = await page.$('[data-explorer]');
  check('System Explorer present', Boolean(section));
  if (!section) return;

  await page.evaluate(() => document.querySelector('[data-explorer]').scrollIntoView({ block: 'center' }));
  await sleep(2500);

  const tabs = await page.$$('[data-explorer] [role="tab"]');
  check('System Explorer has six disciplines', tabs.length === 6, `found ${tabs.length}`);

  const frames = [];
  for (const [i, tab] of tabs.entries()) {
    await tab.click();
    await sleep(1100);
    const result = await page.evaluate((index) => {
      const root = document.querySelector('[data-explorer]');
      const tabs = Array.from(root.querySelectorAll('[role="tab"]'));
      const panels = Array.from(root.querySelectorAll('[role="tabpanel"]'));
      const canvas = root.querySelector('[data-explorer-canvas]');
      const ctx = canvas?.getContext('2d');
      let signature = 0;
      if (ctx && canvas.width) {
        const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        for (let p = 0; p < d.length; p += 4001) signature += d[p];
      }
      return {
        selected: tabs[index].getAttribute('aria-selected') === 'true',
        panelShown: !panels[index].hidden,
        othersHidden: panels.every((p, j) => (j === index ? !p.hidden : p.hidden)),
        text: panels[index].textContent.trim().length,
        signature,
      };
    }, i);
    check(`explorer tab ${i + 1}: selects and reveals its panel`,
      result.selected && result.panelShown && result.othersHidden && result.text > 60);
    frames.push(result.signature);
  }
  const distinct = new Set(frames.filter((f) => f > 0));
  check('the X actually rotates between disciplines', distinct.size >= 4,
    `${distinct.size} distinct renders across 6 selections`);

  // Keyboard. Roving tabindex means focus belongs to whichever tab is selected,
  // so select the first one, then walk right and back with the arrow keys.
  await tabs[0].click();
  await sleep(300);
  await tabs[0].focus();
  await page.keyboard.press('ArrowRight');
  await sleep(300);
  const right = await page.evaluate(() =>
    document.querySelectorAll('[data-explorer] [role="tab"]')[1].getAttribute('aria-selected') === 'true');
  await page.keyboard.press('End');
  await sleep(300);
  const end = await page.evaluate(() =>
    document.querySelectorAll('[data-explorer] [role="tab"]')[5].getAttribute('aria-selected') === 'true');
  check('explorer is keyboard navigable', right && end, `arrow:${right} end:${end}`);
}

/* ---- 4. Growth path ----------------------------------------------------- */

async function checkGrowth(page) {
  const stages = await page.$$('[data-growth] [data-stage]');
  check('Growth Path has five stages', stages.length === 5, `found ${stages.length}`);
  if (!stages.length) return;

  await page.evaluate(() => document.querySelector('[data-growth]').scrollIntoView({ block: 'center' }));
  await sleep(600);

  let reached = 0;
  for (let i = 0; i < stages.length; i++) {
    await page.evaluate((index) => {
      document.querySelectorAll('[data-growth] [data-stage-btn]')[index].click();
    }, i);
    await sleep(220);
    const on = await page.evaluate((index) =>
      document.querySelectorAll('[data-growth] [data-stage]')[index].classList.contains('is-on'), i);
    if (on) reached++;
  }
  check('every Growth Path stage can be selected', reached === 5, `${reached}/5`);
}

/* ---- 5. Links ----------------------------------------------------------- */

async function checkLinks(page) {
  const report = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href]'));
    const empty = [];
    const brokenAnchor = [];
    const external = [];
    for (const a of links) {
      const href = a.getAttribute('href');
      if (!href || href === '#') { empty.push(a.textContent.trim().slice(0, 40)); continue; }
      if (href.startsWith('#')) {
        if (!document.querySelector(href)) brokenAnchor.push(href);
      } else if (/^https?:/.test(href)) {
        external.push(href);
      }
    }
    return { total: links.length, empty, brokenAnchor, external: [...new Set(external)] };
  });
  check('no empty or placeholder links', report.empty.length === 0, report.empty.join(', '));
  check('every in-page anchor resolves', report.brokenAnchor.length === 0, report.brokenAnchor.join(', '));
  check('external links point at the live Digital X site',
    report.external.every((u) => /digital-x-marketing\.com|wa\.me/.test(u)),
    report.external.filter((u) => !/digital-x-marketing\.com|wa\.me/.test(u)).join(', '));
  check('contact channels are wired', await page.evaluate(() =>
    Boolean(document.querySelector('a[href^="mailto:"]')) &&
    Boolean(document.querySelector('a[href^="tel:"]')) &&
    Boolean(document.querySelector('a[href*="wa.me"]'))));
}

/* ---- 6. Forms ----------------------------------------------------------- */

async function checkForms(page) {
  for (const [selector, label] of [['[data-audit]', 'audit'], ['[data-contact]', 'contact']]) {
    const exists = await page.$(selector);
    check(`${label} form present`, Boolean(exists));
    if (!exists) continue;

    // Empty submit must be refused and say so, not silently do nothing.
    const refused = await page.evaluate((sel) => {
      const form = document.querySelector(sel);
      form.querySelector('button[type="submit"]').click();
      return new Promise((resolve) =>
        setTimeout(() => {
          const status = form.querySelector('[data-form-status]');
          resolve({
            message: status?.textContent.trim() ?? '',
            invalid: form.querySelectorAll('[aria-invalid="true"]').length,
          });
        }, 250),
      );
    }, selector);
    check(`${label} form rejects an empty submit`, refused.invalid > 0 && refused.message.length > 0,
      JSON.stringify(refused));
  }

  // The audit's URL field should accept a bare domain and normalise it.
  const normalised = await page.evaluate(() => {
    const input = document.querySelector('[data-audit] input[name="url"]');
    input.value = 'primjer.ba';
    input.dispatchEvent(new Event('blur'));
    return input.value;
  });
  check('audit accepts a bare domain', normalised === 'https://primjer.ba', normalised);
}

/* ---- 7. Before/after sliders -------------------------------------------- */

async function checkCompare(page) {
  const moved = await page.evaluate(() => {
    const frames = Array.from(document.querySelectorAll('[data-compare]'));
    if (!frames.length) return null;
    return frames.map((frame) => {
      const input = frame.querySelector('[data-compare-input]');
      input.value = '20';
      input.dispatchEvent(new Event('input'));
      return frame.style.getPropertyValue('--split');
    });
  });
  check('before/after sliders respond', Array.isArray(moved) && moved.every((v) => v === '20%'),
    JSON.stringify(moved));
}

/* ---- 8. Content audit ---------------------------------------------------- */

async function checkContent(page) {
  // textContent, not innerText: Chrome applies text-transform to innerText, so
  // an uppercase label would read as absent. What matters here is the DOM text
  // a crawler sees, which is exactly what textContent returns.
  const text = await page.evaluate(() => document.body.textContent.replace(/\s+/g, ' '));
  const missing = VERIFIED.filter((v) => !text.includes(v));
  check('every verified string from the live site is present', missing.length === 0,
    missing.slice(0, 8).join(' | '));

  const invented = FORBIDDEN.filter((re) => re.test(text));
  check('no unverifiable business claims', invented.length === 0, invented.map(String).join(' '));

  const seo = await page.evaluate(() => ({
    h1: Array.from(document.querySelectorAll('h1')).map((h) => h.textContent.trim()),
    h2: document.querySelectorAll('h2').length,
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content ?? '',
    canonical: document.querySelector('link[rel="canonical"]')?.href ?? '',
    lang: document.documentElement.lang,
    schema: document.querySelector('script[type="application/ld+json"]')?.textContent ?? '',
    og: Boolean(document.querySelector('meta[property="og:image"]')),
  }));
  check('exactly one h1, and it is the brand message', seo.h1.length === 1 && seo.h1[0].includes('Prisustvo'),
    JSON.stringify(seo.h1));
  check('section headings are real h2s', seo.h2 >= 12, String(seo.h2));
  check('title, description, canonical and OG are set',
    Boolean(seo.title && seo.description && seo.canonical && seo.og));
  check('page language is Bosnian', seo.lang === 'bs', seo.lang);
  try {
    const data = JSON.parse(seo.schema);
    check('schema is valid ProfessionalService with verified contact details',
      data['@type'] === 'ProfessionalService' &&
      data.email === 'digital.x.agency.ba@gmail.com' &&
      Array.isArray(data.makesOffer) && data.makesOffer.length > 0 &&
      !('aggregateRating' in data) && !('review' in data));
  } catch (error) {
    check('schema is valid JSON-LD', false, String(error));
  }
}

/* ---- 9. Mobile composition ---------------------------------------------- */

async function checkMobile(page) {
  const layout = await page.evaluate(() => {
    const style = (sel, prop) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el)[prop] : null;
    };
    const film = document.querySelector('[data-film]');
    const tabs = document.querySelector('.explorer__tabs');
    return {
      toggleShown: style('[data-nav-toggle]', 'display') !== 'none',
      linksHidden: style('.nav__links', 'display') === 'none',
      tabsScroll: tabs ? getComputedStyle(tabs).overflowX : null,
      railHidden: style('.growth__track', 'display') === 'none',
      filmViewports: film ? film.offsetHeight / window.innerHeight : 0,
      overflow: document.documentElement.scrollWidth <= window.innerWidth + 1,
    };
  });
  check('mobile: menu collapses to a sheet toggle', layout.toggleShown && layout.linksHidden);
  check('mobile: explorer becomes a scrollable rail', layout.tabsScroll === 'auto' || layout.tabsScroll === 'scroll',
    String(layout.tabsScroll));
  check('mobile: growth path is stepped, not scrubbed', layout.railHidden);
  // The phone gets a deliberately shorter run than the desktop, not the same
  // one squeezed. Compare the two configured lengths rather than a constant.
  const film = await page.evaluate(() => window.__dx?.film?.() ?? null);
  check('mobile: the film uses the shorter mobile run',
    Boolean(film) && film.scrollVhMobile < film.scrollVh &&
      Math.abs(layout.filmViewports - film.scrollVhMobile / 100) < 0.35,
    `${layout.filmViewports.toFixed(1)} viewports, configured ${film?.scrollVhMobile}vh`);
  check('mobile: no horizontal overflow', layout.overflow);

  // The sheet has to actually open and close.
  await page.click('[data-nav-toggle]');
  await sleep(300);
  const opened = await page.evaluate(() => !document.querySelector('[data-nav-sheet]').hasAttribute('hidden'));
  await page.keyboard.press('Escape');
  await sleep(300);
  const closed = await page.evaluate(() => document.querySelector('[data-nav-sheet]').hasAttribute('hidden'));
  check('mobile: menu sheet opens and closes', opened && closed);
}

/* ---- 10. Reduced motion -------------------------------------------------- */

async function checkReducedMotion(browser, motionHeight) {
  const { page, errors } = await openPage(browser, VIEWPORTS[2], { reducedMotion: true });
  const result = await page.evaluate(() => {
    const film = document.querySelector('[data-film]');
    const shots = Array.from(document.querySelectorAll('.strip__poster img'));
    return {
      still: film?.classList.contains('film--still') ?? false,
      canvasHidden: getComputedStyle(film.querySelector('canvas')).display === 'none',
      firstPoster: (() => {
        const img = film.querySelector('.film__poster img');
        return Boolean(img && img.complete && img.naturalWidth > 0);
      })(),
      // The rest are lazy on purpose; what matters is that each has a real src.
      shots: shots.length,
      stripWired: shots.length > 0 && shots.every((img) => img.getAttribute('src') && img.alt),
      heroVisible: Number(getComputedStyle(film.querySelector('.film__hero')).opacity) > 0.9,
      gate: document.documentElement.classList.contains('film-running'),
      height: document.documentElement.scrollHeight,
      filmViewports: film.offsetHeight / window.innerHeight,
      stagePosition: getComputedStyle(film.querySelector('.film__stage')).position,
      state: window.__dx?.reduced,
      tabs: document.querySelectorAll('[role="tab"]').length,
    };
  });
  check('reduced motion: the film becomes stills', result.still && result.canvasHidden);
  const beats = await page.evaluate(() => window.__dx?.film?.().beats ?? 0);
  check('reduced motion: the opening still is painted and the strip is wired',
    result.firstPoster && result.stripWired && result.shots === beats,
    `${result.shots} stills for ${beats} beats`);
  check('reduced motion: the hero is shown immediately, not gated',
    result.heroVisible && !result.gate);
  // The point is not that the page got shorter overall — it is that the film's
  // pinned scroll run no longer exists. The stage stops being sticky, and the
  // section collapses to its content instead of its configured scroll length.
  const configured = (await page.evaluate(() => window.__dx?.film?.().scrollVh)) ?? 0;
  check("reduced motion: the film's pinned scroll run is gone",
    result.stagePosition !== 'sticky' &&
      result.filmViewports * 100 < configured * 0.5 &&
      result.height < motionHeight,
    `stage ${result.stagePosition}, ${Math.round(result.filmViewports * 100)}vh of a configured ${configured}vh`);
  check('reduced motion: interactive sections still present', result.tabs === 6);
  const rmEngine = await page.evaluate(() => window.__dx?.engine?.() ?? null);
  check('reduced motion: the world is never built',
    rmEngine?.ok === false && rmEngine?.loaded === false, JSON.stringify(rmEngine));
  check('reduced motion: the engine canvas is display:none', await page.evaluate(() => {
    const c = document.querySelector('[data-engine-canvas]');
    return !c || getComputedStyle(c).display === 'none';
  }));
  check('reduced motion: no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));

  // The explorer must still work with no film behind it.
  await page.evaluate(() => document.querySelectorAll('[role="tab"]')[3].click());
  await sleep(200);
  const works = await page.evaluate(() =>
    document.querySelectorAll('[role="tabpanel"]')[3].hidden === false);
  check('reduced motion: explorer still selectable', works);
  await page.close();
}

/* ---- run ---------------------------------------------------------------- */

// SwiftShader gives headless a real WebGL context, so the Signal Engine is
// actually exercised rather than silently skipped in every run.
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--use-gl=swiftshader',
    '--enable-unsafe-swiftshader',
  ],
});

let motionHeight = 0;

for (const viewport of VIEWPORTS) {
  console.log(`\n── ${viewport.name} (${viewport.width}×${viewport.height}) ──`);
  const { page, errors } = await openPage(browser, viewport);

  if (viewport.name === 'desktop') {
    motionHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  }
  if (viewport.name === 'desktop') await checkFilm(page, viewport);
  await checkGate(page, viewport);
  if (viewport.name === 'desktop') await checkEngine(page);
  await checkExplorer(page);
  await checkGrowth(page);
  await checkCompare(page);
  await checkLinks(page);
  await checkForms(page);
  await checkContent(page);
  if (viewport.mobile) await checkMobile(page);

  check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await page.close();
}

console.log('\n── no WebGL ──');
await checkWithoutWebgl();

console.log('\n── reduced motion ──');
await checkReducedMotion(browser, motionHeight);

await browser.close();
console.log(`\n${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
