/* Headless verification for the scroll-driven cinematic.
   Drives real scroll at several depths and asserts that the film
   frame actually advances and the acts land where they should.

   Usage:  node site/verify.mjs
   Output: site/.verify/*.png  +  a PASS/FAIL table on stdout
*/
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname);
const OUT = join(ROOT, '.verify');
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.png': 'image/png'
};

/* a byte-range-capable static server — video scrubbing needs 206s */
const server = createServer(async (req, res) => {
  const path = join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  let body;
  try { body = await readFile(path); } catch { res.writeHead(404).end('nope'); return; }
  const type = MIME[extname(path)] || 'application/octet-stream';
  const range = req.headers.range;
  if (range && /^bytes=(\d*)-(\d*)$/.test(range)) {
    const [, s, e] = range.match(/^bytes=(\d*)-(\d*)$/);
    const start = s ? parseInt(s, 10) : 0;
    const end = e ? parseInt(e, 10) : body.length - 1;
    res.writeHead(206, {
      'Content-Type': type,
      'Content-Range': `bytes ${start}-${end}/${body.length}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1
    }).end(body.subarray(start, end + 1));
  } else {
    res.writeHead(200, { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': body.length }).end(body);
  }
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}/`;

const results = [];
const ok = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

/* real Chrome, not bundled Chromium — the bundled build ships without
   proprietary codecs, so it cannot decode the H.264 master at all */
const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox']
});

for (const view of [
  { tag: 'desktop', width: 1440, height: 900 },
  { tag: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }
]) {
  const ctx = await browser.newContext({
    viewport: { width: view.width, height: view.height },
    isMobile: view.isMobile, hasTouch: view.hasTouch,
    deviceScaleFactor: view.deviceScaleFactor || 1
  });
  const page = await ctx.newPage();
  const errors = [];
  const ignorable = (t) => /favicon/i.test(t);
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !ignorable(m.text())) errors.push(m.text()); });

  await page.goto(base, { waitUntil: 'load' });
  await page.waitForTimeout(1500);

  const codec = await page.evaluate(() =>
    document.createElement('video').canPlayType('video/mp4; codecs="avc1.640028"'));
  ok(`${view.tag}: h264 decodable`, codec !== '', `canPlayType="${codec || 'unsupported'}"`);

  const travel = await page.evaluate(() => {
    const c = document.getElementById('cine');
    return { cine: c.offsetHeight, stage: document.getElementById('stage').offsetHeight, doc: document.body.scrollHeight };
  });
  ok(`${view.tag}: stage pins with travel`, travel.cine - travel.stage > 600,
    `${travel.cine - travel.stage}px of scrub travel`);

  /* walk down the cinematic and sample the film time at each depth */
  const depths = [0, 0.25, 0.5, 0.75, 1];
  const samples = [];
  for (const d of depths) {
    await page.evaluate((dd) => {
      const c = document.getElementById('cine');
      const span = c.offsetHeight - document.getElementById('stage').offsetHeight;
      window.scrollTo(0, c.offsetTop + span * dd);
    }, d);
    await page.waitForTimeout(900);              /* let the follower settle */
    const s = await page.evaluate(() => {
      const el = document.getElementById('filmHQ');
      const px = document.getElementById('filmProxy');
      const live = getComputedStyle(el).opacity > 0.5 ? el : px;
      return {
        t: +live.currentTime.toFixed(3),
        which: live.id,
        acts: [...document.querySelectorAll('.act')].map((a) => +(a.style.getPropertyValue('--o') || 0)),
        cards: [...document.querySelectorAll('.card')].map((c) => +(c.style.getPropertyValue('--co') || 0)),
        tier: document.getElementById('tier').textContent
      };
    });
    samples.push({ d, ...s });
    await page.screenshot({ path: join(OUT, `${view.tag}-${String(d).replace('.', '_')}.png`) });
  }

  /* the film time must be monotonic and must actually span the master */
  const times = samples.map((s) => s.t);
  const monotonic = times.every((t, i) => i === 0 || t >= times[i - 1] - 0.001);
  ok(`${view.tag}: film time tracks scroll monotonically`, monotonic, times.join(' → '));
  ok(`${view.tag}: scrub spans the master`, times[times.length - 1] - times[0] > 12,
    `${(times[times.length - 1] - times[0]).toFixed(2)}s of ${15.5}s`);

  /* exactly one act should own each depth we sampled */
  const actLead = samples.map((s) => s.acts.findIndex((o) => o === Math.max(...s.acts)));
  ok(`${view.tag}: acts advance with the film`, actLead[0] === 0 && actLead[actLead.length - 1] === 3,
    `lead act per depth: ${actLead.join(',')}`);

  /* the landing view must already carry the headline — an act that
     fades in *from* scroll 0 leaves the hero wordless */
  ok(`${view.tag}: act I is readable at scroll 0`, samples[0].acts[0] > 0.9,
    `--o=${samples[0].acts[0]}`);

  /* act III cards must all have landed by the end of their run */
  const lastCards = samples[3].cards;
  ok(`${view.tag}: all six cards revealed by 75%`, lastCards.every((c) => c > 0.9),
    lastCards.map((c) => c.toFixed(2)).join(' '));

  ok(`${view.tag}: no page errors`, errors.length === 0, errors.slice(0, 2).join(' | '));

  /* reduced motion must flatten the whole thing */
  const ctxRM = await browser.newContext({
    viewport: { width: view.width, height: view.height }, reducedMotion: 'reduce'
  });
  const pRM = await ctxRM.newPage();
  await pRM.goto(base, { waitUntil: 'load' });
  await pRM.waitForTimeout(700);
  const rm = await pRM.evaluate(() => ({
    still: document.getElementById('stage').classList.contains('is-still'),
    sticky: getComputedStyle(document.getElementById('stage')).position,
    copyVisible: [...document.querySelectorAll('.act')].every((a) => +getComputedStyle(a).opacity > 0.99)
  }));
  ok(`${view.tag}: reduced-motion falls back to a still`, rm.still && rm.sticky === 'static' && rm.copyVisible,
    `still=${rm.still} position=${rm.sticky} copy=${rm.copyVisible}`);
  await pRM.screenshot({ path: join(OUT, `${view.tag}-reduced.png`), fullPage: false });
  await ctxRM.close();

  await ctx.close();
}

await browser.close();
server.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
