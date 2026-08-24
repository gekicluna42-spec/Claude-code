import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const dist = new URL('../dist/', import.meta.url).pathname;
const indexPath = join(dist, 'index.html');
if (!existsSync(indexPath)) throw new Error('dist/index.html missing; run vite build first');

const tmp = mkdtempSync(join(tmpdir(), 'dx-cinematic-'));
const archive = join(tmp, 'legacy.tar.gz');
const archiveUrl = 'https://github.com/cipiforrest-create/digital-x/archive/refs/heads/recovery/cinematic-runtime-20260824.tar.gz';

try {
  execFileSync('curl', ['-L', '--fail', '--silent', '--show-error', archiveUrl, '-o', archive], { stdio: 'inherit' });
  execFileSync('tar', ['-xzf', archive, '-C', tmp], { stdio: 'inherit' });

  const extracted = readdirSync(tmp).find((name) => name !== 'legacy.tar.gz');
  if (!extracted) throw new Error('Legacy cinematic archive did not extract');
  const site = join(tmp, extracted, 'site');

  const copyDir = (name) => {
    const src = join(site, name);
    if (existsSync(src)) cpSync(src, join(dist, name), { recursive: true, force: true });
  };

  for (const name of [
    'cinematic-hotel',
    'cinematic-watch',
    'cinematic-penthouse',
    'cinematic-clothes',
    'cinematic-dentist',
    'cinematic-deepsea',
    'cinematic-digiritalx',
  ]) copyDir(name);

  for (const media of ['media/live', 'media/poster']) {
    const src = join(site, media);
    if (existsSync(src)) cpSync(src, join(dist, media), { recursive: true, force: true });
  }

  let html = readFileSync(indexPath, 'utf8');

  const marks = `<p class="film__marks">
        <span class="film__mark" data-mark data-from="0" data-to="0.08111363636363637"><em>01</em>Signal</span>
        <span class="film__mark" data-mark data-from="0.083" data-to="0.1831764705882353"><em>02</em>X Core</span>
        <span class="film__mark" data-mark data-from="0.18588235294117647" data-to="0.343"><em>03</em>Intelligence</span>
        <span class="film__mark" data-mark data-from="0.3450444444444445" data-to="0.435"><em>04</em>Authority</span>
        <span class="film__mark" data-mark data-from="0.43669565217391304" data-to="0.513"><em>05</em>Demand</span>
        <span class="film__mark" data-mark data-from="0.5141858407079646" data-to="0.6458141592920355"><em>06</em>Expansion</span>
        <span class="film__mark" data-mark data-from="0.647" data-to="0.7817857142857143"><em>07</em>Momentum</span>
        <span class="film__mark" data-mark data-from="0.783" data-to="1"><em>08</em>Horizon</span>
      </p>`;
  html = html.replace(/<p class="film__marks">[\s\S]*?<\/p>/, marks);

  const shots = [
    ['1', 'Signal'], ['2', 'X Core'], ['3', 'Intelligence'], ['4', 'Authority'],
    ['5', 'Demand'], ['6', 'Expansion'], ['7', 'Momentum'], ['8', 'Horizon'],
  ].map(([n, label], i) => `<li class="strip__shot">
      <picture class="strip__poster"><source type="image/avif" srcset="/media/poster/signal-engine-beat-${n}.avif"><source type="image/webp" srcset="/media/poster/signal-engine-beat-${n}.webp"><img src="/media/poster/signal-engine-beat-${n}.jpg" alt="${label} — kadar iz Digital X filma." width="1600" height="900" loading="${i === 0 ? 'eager' : 'lazy'}" decoding="async"></picture>
      <p class="strip__label"><span>0${n}</span>${label}</p>
    </li>`).join('\n');
  const strip = `<div class="film__strip"><ol class="strip" aria-label="Kadrovi iz Digital X filma">${shots}</ol></div>`;
  html = html.replace(/<div class="film__strip">[\s\S]*?<\/div>\s*<\/section>/, `${strip}\n</section>`);

  const items = [
    ['cinematic-hotel', 'cinematic-hotel.jpg', 'Hospitality', 'Cinematic Hotel', 'Luxury hospitality storytelling, filmski obilazak i imerzivno iskustvo rezervacije.'],
    ['cinematic-watch', 'cinematic-watch.webp', 'Luxury', 'Cinematic Watch', 'Macro video, precision storytelling, premium UI za watch brendove.'],
    ['cinematic-penthouse', 'cinematic-penthouse.jpg', 'Real Estate', 'Cinematic Penthouse', 'Virtual tours, panoramski snimci, premium storytelling za nekretnine.'],
    ['cinematic-clothes', 'cinematic-clothes.jpg', 'Fashion', 'Cinematic Clothes', 'Runway-style video, product storytelling, elegantan e-commerce UI.'],
    ['cinematic-dentist', 'cinematic-dentist.jpg', 'Healthcare', 'Cinematic Dentist', 'Before/after galerije, pacijent priče, trust-building dizajn za ordinacije.'],
    ['cinematic-deepsea', 'cinematic-deepsea-submarine.jpg', 'Ocean', 'Cinematic Deepsea', '360° virtual dives, underwater storytelling, WebGL 3D doživljaj.'],
  ];
  const cards = items.map(([slug, image, category, name, body]) => `<li class="showcase__item">
        <a class="showcase__link" href="/${slug}/">
          <figure class="showcase__media"><img class="showcase__image" src="/media/live/${image}" alt="${name}" width="1920" height="1080" loading="lazy" decoding="async"><span class="showcase__open" aria-hidden="true">Otvori cinematic <i>↗</i></span></figure>
          <div class="showcase__copy"><p class="showcase__category">${category}</p><h3 class="showcase__name">${name}</h3><p class="showcase__body">${body}</p></div>
        </a>
      </li>`).join('\n');
  const showcase = `<section class="section section--showcase" id="cinematic">
  <div class="wrap">
    <header class="shead"><p class="kicker"><span>Cinematic showcase</span></p><h2 class="shead__title"><span class="line"><span>Brandovi</span></span><span class="line"><span>koje gledate.</span></span></h2><p class="shead__body">Demo koncepti premium web doživljaja po branšama — svaki sa vlastitom filmskom pričom.</p></header>
    <ul class="showcase">${cards}</ul>
  </div>
</section>`;
  html = html.replace(/<section class="section section--showcase" id="cinematic">[\s\S]*?<\/section>/, showcase);

  const css = `<style id="cinematic-merge-styles">
.showcase__link{display:block;color:inherit;text-decoration:none}.showcase__media{position:relative;overflow:hidden;margin:0 0 1.1rem;border-radius:18px;background:#0b0b0d;aspect-ratio:16/9}.showcase__image{width:100%;height:100%;object-fit:cover;display:block;transition:transform .55s ease,filter .55s ease}.showcase__open{position:absolute;right:1rem;bottom:1rem;padding:.55rem .8rem;border:1px solid rgba(255,255,255,.28);background:rgba(0,0,0,.48);backdrop-filter:blur(10px);font-size:.78rem;letter-spacing:.05em;text-transform:uppercase}.showcase__link:hover .showcase__image{transform:scale(1.025);filter:brightness(1.08)}.showcase__copy{padding:0 .1rem}.showcase{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:2rem 1.4rem}@media(max-width:760px){.showcase{grid-template-columns:1fr;gap:1.5rem}.showcase__media{border-radius:14px}}
</style>`;
  html = html.replace('</head>', `${css}\n</head>`);

  writeFileSync(indexPath, html);
  console.log('Merged full cinematic chapters, showcase and legacy cinematic routes.');
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
