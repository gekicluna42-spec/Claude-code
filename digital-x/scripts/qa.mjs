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
    const now = JSON.stringify((await stateOf(page)).map((c) => c.frame));
    stable = now === previous ? stable + 1 : 0;
    previous = now;
    if (stable >= 3) return;
  }
}

const stateOf = (page) => page.evaluate(() => window.__dx?.state?.() ?? []);
const frameOf = (state, id) => state.find((c) => c.id === id)?.frame ?? -1;

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

/* ---- 1-2. The four scrubs, and THE REVEAL's length and hold ------------- */

async function checkChapters(page, viewport) {
  const geometry = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-chapter]')).map((el) => ({
      id: el.dataset.chapter,
      top: el.offsetTop,
      height: el.offsetHeight,
    })),
  );
  check('four chapters present', geometry.length === 4, `found ${geometry.length}`);

  const reveal = geometry.find((g) => g.id === 'reveal');
  const others = geometry.filter((g) => g.id !== 'reveal');
  check(
    'THE REVEAL has the longest scroll run',
    reveal && others.every((o) => reveal.height > o.height),
    geometry.map((g) => `${g.id}:${g.height}`).join(' '),
  );

  /**
   * Scroll to a given *trigger* progress inside a chapter.
   *
   * The chapter's ScrollTrigger runs 'top top' → 'bottom bottom', so progress 1
   * is reached one viewport before the section ends. Scrolling to a plain
   * fraction of the section height overshoots, which is exactly how a hold band
   * gets missed.
   */
  const seek = async (chapter, progress) => {
    const span = chapter.height - viewport.height;
    await scrollTo(page, Math.round(chapter.top + span * progress));
    return frameOf(await stateOf(page), chapter.id);
  };

  for (const chapter of geometry) {
    const at = (progress) => seek(chapter, progress);
    const a = await at(0.05);
    const b = await at(0.35);
    const c = await at(0.95);
    const back = await at(0.35);

    check(
      `${chapter.id}: scrub advances with scroll`,
      a >= 0 && b > a && c > b,
      `frames ${a} → ${b} → ${c}`,
    );
    check(`${chapter.id}: scrub reverses on scroll up`, Math.abs(back - b) <= 6, `${c} → ${back} (want ≈${b})`);
  }

  // The ladder upgrade. A broken AVIF feature-probe once pinned every visitor
  // to the fallback ladder without failing a single other check, so assert the
  // desktop actually reaches the wide one.
  // The single-file preview ships one ladder on purpose, so only assert this
  // where a wider one exists to upgrade to.
  const ladders = await page.evaluate(() =>
    (window.__DX_FRAMES__?.ladders ?? []).map((l) => l.dir));
  if (!ladders.length || ladders.includes('lg')) {
    const upgraded = await page.evaluate(() =>
      (window.__dx?.state?.() ?? []).some((c) => c.ladder === 'lg'));
    check('desktop upgrades to the wide frame ladder', upgraded);
  }

  // The hold: film time must stop while scroll continues. The curve freezes
  // between 0.42 and 0.58 of THE REVEAL.
  if (reveal) {
    const at = (progress) => seek(reveal, progress);
    const before = await at(0.30);
    const holdStart = await at(0.44);
    const holdMid = await at(0.5);
    const holdEnd = await at(0.56);
    const after = await at(0.75);
    check('THE REVEAL reaches the peak before the hold', holdStart > before + 4,
      `${before} → ${holdStart}`);
    check(
      'THE REVEAL holds at the peak while scroll continues',
      Math.abs(holdMid - holdStart) <= 2 && Math.abs(holdEnd - holdStart) <= 2,
      `frames ${holdStart} / ${holdMid} / ${holdEnd}`,
    );
    check('THE REVEAL resumes after the hold', after > holdEnd + 4, `${holdEnd} → ${after}`);
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
    const chapters = Array.from(document.querySelectorAll('[data-chapter]')).map((el) => el.offsetHeight);
    const tabs = document.querySelector('.explorer__tabs');
    return {
      toggleShown: style('[data-nav-toggle]', 'display') !== 'none',
      linksHidden: style('.nav__links', 'display') === 'none',
      tabsScroll: tabs ? getComputedStyle(tabs).overflowX : null,
      railHidden: style('.growth__track', 'display') === 'none',
      chapters,
      overflow: document.documentElement.scrollWidth <= window.innerWidth + 1,
    };
  });
  check('mobile: menu collapses to a sheet toggle', layout.toggleShown && layout.linksHidden);
  check('mobile: explorer becomes a scrollable rail', layout.tabsScroll === 'auto' || layout.tabsScroll === 'scroll',
    String(layout.tabsScroll));
  check('mobile: growth path is stepped, not scrubbed', layout.railHidden);
  check('mobile: chapters use the shorter mobile runs',
    layout.chapters.every((h) => h > 0) && layout.chapters[1] > layout.chapters[0],
    layout.chapters.join(' '));
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
    const chapters = Array.from(document.querySelectorAll('[data-chapter]'));
    const cues = Array.from(document.querySelectorAll('.cue'));
    return {
      stills: chapters.every((c) => c.classList.contains('chapter--still')),
      firstPoster: (() => {
        const img = chapters[0]?.querySelector('.chapter__poster img');
        return Boolean(img && img.complete && img.naturalWidth > 0);
      })(),
      // The rest are lazy on purpose; what matters is that each has a real src.
      postersWired: chapters.every((c) => {
        const img = c.querySelector('.chapter__poster img');
        return Boolean(img && img.getAttribute('src') && img.alt);
      }),
      cuesVisible: cues.every((c) => Number(getComputedStyle(c).opacity) === 1),
      canvasesHidden: chapters.every((c) => getComputedStyle(c.querySelector('canvas')).display === 'none'),
      height: document.documentElement.scrollHeight,
      state: window.__dx?.reduced,
      tabs: document.querySelectorAll('[role="tab"]').length,
    };
  });
  check('reduced motion: chapters become stills', result.stills && result.canvasesHidden);
  check('reduced motion: the opening still is painted and the rest are wired',
    result.firstPoster && result.postersWired);
  check('reduced motion: all chapter copy is visible', result.cuesVisible);
  check('reduced motion: the cinematic scroll runs are gone',
    result.height < motionHeight * 0.8,
    `${result.height} vs ${motionHeight} with motion`);
  check('reduced motion: interactive sections still present', result.tabs === 6);
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

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

let motionHeight = 0;

for (const viewport of VIEWPORTS) {
  console.log(`\n── ${viewport.name} (${viewport.width}×${viewport.height}) ──`);
  const { page, errors } = await openPage(browser, viewport);

  if (viewport.name === 'desktop') {
    motionHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    await checkChapters(page, viewport);
  }
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

console.log('\n── reduced motion ──');
await checkReducedMotion(browser, motionHeight);

await browser.close();
console.log(`\n${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
