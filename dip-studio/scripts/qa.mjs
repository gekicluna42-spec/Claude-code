/**
 * End-to-end QA for the built site.
 *
 * Boots `vite preview`, then drives a real browser through the journey a
 * prospective couple takes: the scrubbed hero, the effect library, the
 * builder, the booking form, the service pages — at phone, tablet and
 * desktop widths.
 *
 *   npm run build && npm run qa
 */

import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shots = join(root, 'qa-shots');
const BASE = 'http://localhost:4173';

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844, isMobile: true },
  { name: 'tablet', width: 768, height: 1024, isMobile: false },
  { name: 'desktop', width: 1440, height: 900, isMobile: false },
];

const results = [];
const record = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {}
    await sleep(300);
  }
  throw new Error(`preview server did not start: ${url}`);
}

async function scrollTo(page, fraction) {
  await page.evaluate((f) => {
    const hero = document.querySelector('#hero');
    const total = hero.offsetHeight - window.innerHeight;
    window.scrollTo(0, Math.round(total * f));
  }, fraction);
  await sleep(700);
}

async function main() {
  await mkdir(shots, { recursive: true });

  const server = spawn('npx', ['vite', 'preview', '--port', '4173'], {
    cwd: root,
    stdio: 'ignore',
    detached: true,
  });

  try {
    await waitForServer(BASE);

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--enable-unsafe-swiftshader',
        '--use-gl=angle',
        '--use-angle=swiftshader',
      ],
    });

    for (const vp of VIEWPORTS) {
      const page = await browser.newPage();
      await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.isMobile, hasTouch: vp.isMobile });

      const consoleErrors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', (err) => consoleErrors.push(String(err)));

      await page.goto(BASE, { waitUntil: 'networkidle2' });
      await sleep(900);

      // ---- no horizontal overflow ----
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        inner: window.innerWidth,
        offender: (() => {
          const w = document.documentElement.clientWidth;
          for (const el of document.querySelectorAll('*')) {
            const r = el.getBoundingClientRect();
            if (r.right > w + 2 && r.width > 0 && getComputedStyle(el).position !== 'fixed') {
              return `${el.tagName}.${el.className}`.slice(0, 80);
            }
          }
          return '';
        })(),
      }));
      record(
        `[${vp.name}] no horizontal overflow`,
        overflow.scrollWidth <= overflow.inner + 1,
        overflow.offender,
      );

      // ---- the mobile menu must stay off-screen until it is opened ----
      if (vp.isMobile) {
        const leak = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('#nav-links a'));
          return links.filter((a) => {
            const r = a.getBoundingClientRect();
            return r.bottom > 0 && r.top < window.innerHeight && r.width > 0;
          }).length;
        });
        record(`[${vp.name}] closed mobile menu is off-screen`, leak === 0, `${leak} link(s) visible`);

        const opens = await page.evaluate(async () => {
          document.querySelector('#nav-toggle').click();
          await new Promise((r) => setTimeout(r, 800));
          const link = document.querySelector('#nav-links a');
          const r = link.getBoundingClientRect();
          const visible = r.top >= 0 && r.bottom <= window.innerHeight;
          document.querySelector('#nav-toggle').click();
          return visible;
        });
        record(`[${vp.name}] mobile menu opens`, opens);
        await sleep(400);
      }

      // ---- hero engine ----
      const heroLive = await page.evaluate(
        () => document.querySelector('#hero-canvas')?.classList.contains('is-live') ?? false,
      );
      record(`[${vp.name}] hero WebGL stage live`, heroLive);

      await page.screenshot({ path: join(shots, `${vp.name}-01-hero.png`) });

      // ---- scrub through the acts, then rewind ----
      const seen = [];
      for (const f of [0.1, 0.35, 0.6, 0.82, 0.99]) {
        await scrollTo(page, f);
        seen.push(
          await page.evaluate(() => ({
            act: document.querySelector('#hero')?.dataset.act ?? '',
            current: Array.from(document.querySelectorAll('.acts__item')).findIndex(
              (el) => el.getAttribute('aria-current') === 'true',
            ),
          })),
        );
      }
      await page.screenshot({ path: join(shots, `${vp.name}-02-spectacle.png`) });

      const frames = await page.evaluate(() => ({
        manifest: Boolean(window.performance.getEntriesByType('resource').find((r) => r.name.includes('frames.json'))),
        loaded: window.performance.getEntriesByType('resource').filter((r) => r.name.includes('/media/frames/')).length,
      }));
      record(
        `[${vp.name}] hero loads the frame sequence`,
        frames.manifest && frames.loaded > 10,
        `${frames.loaded} frame requests`,
      );

      const order = seen.map((s) => s.current);
      const ascending = order.every((v, i) => i === 0 || v >= order[i - 1]);
      record(
        `[${vp.name}] scrub advances through acts`,
        ascending && order[order.length - 1] === 4 && seen[0].act === 'anticipation',
        `acts seen: ${seen.map((s) => s.act).join(' → ')}`,
      );

      await scrollTo(page, 0.1);
      const rewound = await page.evaluate(() => document.querySelector('#hero')?.dataset.act ?? '');
      record(`[${vp.name}] scrolling up rewinds the moment`, rewound === seen[0].act, rewound);

      // ---- effect library tabs ----
      await page.evaluate(() => document.querySelector('#efekti')?.scrollIntoView());
      await sleep(400);
      const libraryFirst = await page.$$eval('#library-grid .card__title', (els) => els.map((e) => e.textContent));
      await page.click('#tab-party');
      await sleep(300);
      const libraryParty = await page.$$eval('#library-grid .card__title', (els) => els.map((e) => e.textContent));
      record(
        `[${vp.name}] effect library switches by moment`,
        libraryFirst.length > 0 && libraryParty.length > 0 && libraryFirst[0] !== libraryParty[0],
        `${libraryFirst[0]} → ${libraryParty[0]}`,
      );

      // ---- builder → summary ----
      await page.evaluate(() => {
        document.querySelector('#builder-moment input')?.click();
        document.querySelector('#builder-effects input')?.click();
      });
      await sleep(200);
      const summary = await page.$eval('[data-summary="moment"]', (el) => el.textContent?.trim());
      record(`[${vp.name}] builder updates the summary`, Boolean(summary) && summary !== 'Još niste odabrali', summary);

      // ---- effect preview ----
      const livePreview = await page.evaluate(async () => {
        document.querySelector('#tab-prvi-ples')?.click();
        await new Promise((r) => setTimeout(r, 400));
        const card = document.querySelector('[data-effect-preview="niski-dim"]');
        const id = card?.dataset.effectPreview;
        card?.click();
        await new Promise((r) => setTimeout(r, 2600));
        const root = document.querySelector('#effect-preview');
        const canvas = document.querySelector('#preview-canvas');
        return {
          id,
          open: Boolean(root) && !root.hidden,
          canvasShown: Boolean(canvas) && !canvas.hidden,
          title: document.querySelector('#effect-preview-title')?.textContent ?? '',
          note: document.querySelector('#preview-note')?.textContent ?? '',
        };
      });
      record(
        `[${vp.name}] effect preview plays the footage for a depictable effect`,
        livePreview.open && livePreview.canvasShown && livePreview.note.includes('Kinematografski prikaz'),
        `${livePreview.id}: ${livePreview.title}`,
      );
      await page.screenshot({ path: join(shots, `${vp.name}-05-preview.png`) });

      await page.keyboard.press('Escape');
      await sleep(500);
      const previewClosed = await page.evaluate(() => document.querySelector('#effect-preview').hidden);
      record(`[${vp.name}] Escape closes the effect preview`, previewClosed);

      // A service the footage does not show must get a still, never fake motion.
      const stillPreview = await page.evaluate(async () => {
        document.querySelector('#tab-uspomena')?.click();
        await new Promise((r) => setTimeout(r, 400));
        const card = document.querySelector('[data-effect-preview="audioguestbook"]');
        const id = card?.dataset.effectPreview;
        card?.click();
        await new Promise((r) => setTimeout(r, 1200));
        return {
          id,
          canvasShown: !document.querySelector('#preview-canvas').hidden,
          stillShown: !document.querySelector('#preview-still').hidden,
        };
      });
      record(
        `[${vp.name}] non-depictable service shows a still, not invented motion`,
        !stillPreview.canvasShown && stillPreview.stillShown,
        stillPreview.id,
      );
      await page.keyboard.press('Escape');
      await sleep(500);

      // ---- the full clip player is lazy ----
      const clip = await page.evaluate(async () => {
        document.querySelector('[data-play-clip]')?.click();
        await new Promise((r) => setTimeout(r, 900));
        const video = document.querySelector('#preview-video');
        return {
          shown: Boolean(video) && !video.hidden,
          preload: video?.getAttribute('preload'),
          poster: Boolean(video?.getAttribute('poster')),
          sources: video?.querySelectorAll('source').length ?? 0,
          muted: video?.muted === true,
        };
      });
      record(
        `[${vp.name}] clip player opens, lazy and muted`,
        clip.shown && clip.preload === 'none' && clip.poster && clip.sources === 1 && clip.muted,
        `preload=${clip.preload} sources=${clip.sources}`,
      );
      await page.keyboard.press('Escape');
      await sleep(500);

      // ---- booking modal ----
      await page.evaluate(() => document.querySelector('[data-open-booking]')?.click());
      await sleep(400);
      const modalOpen = await page.evaluate(() => !document.querySelector('#booking').hidden);
      const focusInside = await page.evaluate(() => document.activeElement?.id === 'bf-name');
      record(`[${vp.name}] booking modal opens and takes focus`, modalOpen && focusInside);

      await page.click('#booking-submit');
      await sleep(250);
      const validation = await page.evaluate(() => ({
        nameErr: document.querySelector('#bf-name-err')?.textContent ?? '',
        status: document.querySelector('#booking-status')?.textContent ?? '',
      }));
      record(
        `[${vp.name}] booking form validates`,
        validation.nameErr.length > 0 && validation.status.length > 0,
        validation.nameErr,
      );
      await page.screenshot({ path: join(shots, `${vp.name}-03-booking.png`) });

      await page.keyboard.press('Escape');
      await sleep(450);
      const modalClosed = await page.evaluate(() => document.querySelector('#booking').hidden);
      record(`[${vp.name}] Escape closes the modal`, modalClosed);

      // ---- catalog ----
      const catalogWorks = await page.evaluate(() => {
        const trigger = document.querySelector('.catalog__trigger');
        trigger?.click();
        const panel = document.getElementById(trigger?.getAttribute('aria-controls') ?? '');
        return trigger?.getAttribute('aria-expanded') === 'true' && panel?.dataset.open === 'true';
      });
      record(`[${vp.name}] service catalog expands`, catalogWorks);

      // ---- no console errors ----
      record(`[${vp.name}] no console errors`, consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '));

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await sleep(500);
      await page.screenshot({ path: join(shots, `${vp.name}-04-finale.png`) });

      await page.close();
    }

    // ---- scroll smoothness ----
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });
      await page.goto(`${BASE}/?qa=1`, { waitUntil: 'networkidle2' });
      await sleep(3500);

      // Frame pacing across a scripted scroll through the hero. Rendering here
      // is SwiftShader on a shared CPU, so the bar is "no stalls", not 60fps.
      const timing = await page.evaluate(async () => {
        const deltas = [];
        let last = performance.now();
        let handle = 0;
        const tick = (t) => {
          deltas.push(t - last);
          last = t;
          handle = requestAnimationFrame(tick);
        };
        handle = requestAnimationFrame(tick);

        const hero = document.querySelector('#hero');
        const total = hero.offsetHeight - window.innerHeight;
        for (let i = 0; i <= 60; i++) {
          window.scrollTo(0, Math.round((total * i) / 60));
          await new Promise((r) => setTimeout(r, 33));
        }
        cancelAnimationFrame(handle);

        const sorted = deltas.slice(2).sort((a, b) => a - b);
        return {
          frames: sorted.length,
          p95: Math.round(sorted[Math.floor(sorted.length * 0.95)] ?? 0),
          max: Math.round(sorted[sorted.length - 1] ?? 0),
        };
      });
      // Software rendering here is 10-50x slower than any real GPU, so this
      // asserts the loop keeps running rather than a frame rate.
      record(
        '[scroll] render loop keeps up while scrubbing',
        timing.frames > 0 && timing.max < 1500,
        `p95 ${timing.p95}ms, max ${timing.max}ms over ${timing.frames} frames (software rendering)`,
      );

      // The glide must settle, not drift: after a jump the rendered progress
      // has to converge on the target quickly.
      const glide = await page.evaluate(async () => {
        const hero = document.querySelector('#hero');
        const api = window.__DIP_HERO__;
        if (!api) return { available: false };

        const total = hero.offsetHeight - window.innerHeight;
        window.scrollTo(0, 0);
        await new Promise((r) => setTimeout(r, 600));

        window.scrollTo(0, Math.round(total * 0.6));
        const started = performance.now();
        let lagged = false;
        let settledAt = -1;

        while (performance.now() - started < 3000) {
          const gap = Math.abs(api.target() - api.rendered());
          if (gap > 0.02) lagged = true;
          if (lagged && gap < 0.005) {
            settledAt = performance.now() - started;
            break;
          }
          await new Promise((r) => requestAnimationFrame(r));
        }
        return { available: true, lagged, settledAt: Math.round(settledAt) };
      });
      // The glide needs a handful of frames to converge, so the budget scales
      // with how slow this machine's frames actually are.
      const budget = Math.max(500, timing.p95 * 6);
      record(
        '[scroll] damped scrub glides and then settles',
        glide.available && glide.lagged && glide.settledAt > 0 && glide.settledAt < budget,
        glide.available
          ? `settled in ${glide.settledAt}ms (budget ${Math.round(budget)}ms)`
          : 'hook unavailable',
      );

      await page.close();
    }

    // ---- reduced motion ----
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });
      await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto(BASE, { waitUntil: 'networkidle2' });
      await sleep(800);
      const state = await page.evaluate(() => {
        const boxes = Array.from(document.querySelectorAll('.hero__beat')).map((el) =>
          el.getBoundingClientRect(),
        );
        let overlaps = 0;
        for (let i = 0; i < boxes.length; i++) {
          for (let j = i + 1; j < boxes.length; j++) {
            const a = boxes[i];
            const b = boxes[j];
            const hit = a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
            if (hit) overlaps++;
          }
        }
        const stage = document.querySelector('.hero__stage');
        const content = document.querySelector('.hero__content');
        return {
          canvasLive: document.querySelector('#hero-canvas')?.classList.contains('is-live') ?? false,
          heroVisible: Boolean(document.querySelector('.hero__fallback')?.offsetHeight),
          revealed: document.querySelectorAll('[data-reveal].is-revealed').length,
          total: document.querySelectorAll('[data-reveal]').length,
          overlaps,
          contentFits: content.getBoundingClientRect().bottom <= stage.getBoundingClientRect().bottom + 2,
        };
      });
      record(
        '[reduced-motion] static hero, no WebGL, content visible',
        !state.canvasLive && state.heroVisible && state.revealed === state.total && errors.length === 0,
        `${state.revealed}/${state.total} revealed`,
      );
      record(
        '[reduced-motion] hero beats stack without overlapping',
        state.overlaps === 0 && state.contentFits,
        `${state.overlaps} overlap(s), content fits: ${state.contentFits}`,
      );
      await page.screenshot({ path: join(shots, 'reduced-motion.png') });
      await page.close();
    }

    // ---- keyboard pass + service pages + links ----
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });
      await page.goto(BASE, { waitUntil: 'networkidle2' });

      const firstStops = [];
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press('Tab');
        firstStops.push(await page.evaluate(() => {
          const el = document.activeElement;
          const style = el ? getComputedStyle(el) : null;
          return { tag: el?.tagName, text: el?.textContent?.trim().slice(0, 24), outline: style?.outlineStyle };
        }));
      }
      record(
        '[a11y] keyboard reaches skip link and nav',
        firstStops[0]?.text?.includes('Preskoči') === true,
        firstStops.map((s) => s.text).join(' → '),
      );

      const links = await page.$$eval('a[href]', (els) =>
        els.map((e) => e.getAttribute('href')).filter((h) => h && !h.startsWith('#') && !h.startsWith('http')),
      );
      const broken = [];
      for (const href of [...new Set(links)]) {
        const res = await fetch(new URL(href, BASE));
        if (!res.ok) broken.push(`${href} → ${res.status}`);
      }
      record('[links] internal links resolve', broken.length === 0, broken.join(', '));

      for (const slug of ['niski-dim', 'prskalice', 'photobooth-360-booth', 'ambijentalna-rasvjeta']) {
        const errors = [];
        page.on('pageerror', (e) => errors.push(String(e)));
        await page.goto(`${BASE}/usluge/${slug}/`, { waitUntil: 'networkidle2' });
        await sleep(400);
        const ok = await page.evaluate(() => ({
          h1: document.querySelectorAll('h1').length,
          title: document.title,
          overflow: document.documentElement.scrollWidth <= window.innerWidth + 1,
          booking: Boolean(document.querySelector('#booking')),
        }));
        record(
          `[page] /usluge/${slug}/`,
          ok.h1 === 1 && ok.overflow && ok.booking && errors.length === 0,
          ok.title,
        );
      }
      await page.screenshot({ path: join(shots, 'service-page.png') });
      await page.close();
    }

    await browser.close();
  } finally {
    try { process.kill(-server.pid); } catch {}
  }

  const failed = results.filter((r) => !r.pass);
  await writeFile(join(shots, 'report.json'), JSON.stringify(results, null, 2));

  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log('Failures:');
    failed.forEach((f) => console.log(`  - ${f.name}: ${f.detail}`));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
