/** Quick visual check: scroll to a set of positions and screenshot each. */
import puppeteer from 'puppeteer-core';

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const URL = process.env.DX_URL ?? 'http://localhost:5173/';
const width = Number(process.env.W ?? 1440);
const height = Number(process.env.H ?? 900);
const spots = (process.env.SPOTS ?? '0,600,1800,3200,5200,7000,9000').split(',').map(Number);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--force-device-scale-factor=1',
    // Headless has no GPU; SwiftShader gives a real WebGL context so the
    // Signal Engine can actually be looked at rather than skipped.
    '--use-gl=swiftshader',
    '--enable-unsafe-swiftshader',
  ],
});
const page = await browser.newPage();
await page.setViewport({ width, height, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
await page.waitForFunction("document.documentElement.classList.contains('is-ready')", { timeout: 60000 });
await new Promise((r) => setTimeout(r, 1200));

for (const [i, y] of spots.entries()) {
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
  await new Promise((r) => setTimeout(r, 1900));
  await page.screenshot({ path: `qa-shots/${process.env.TAG ?? 'desk'}-${String(i).padStart(2, '0')}-${y}.png` });
}

const height_ = await page.evaluate(() => document.documentElement.scrollHeight);
const state = await page.evaluate(() => window.__dx?.state?.() ?? null);
console.log('scrollHeight', height_, 'vh≈', Math.round(height_ / height * 100) / 100);
console.log('state', JSON.stringify(state));
console.log('errors', errors.length ? errors : 'none');
await browser.close();
