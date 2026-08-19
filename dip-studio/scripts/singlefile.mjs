/**
 * Bakes the homepage into ONE self-contained HTML file for sharing.
 *
 * Inlines the script, the stylesheet (fonts already inlined by the preview
 * build) and every image as a data URI, then rewrites the links to the
 * service pages — which do not exist inside a single file — to the on-page
 * service catalog so nothing 404s.
 *
 *   npx vite build --config vite.preview.config.ts && node scripts/singlefile.mjs
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist-preview');
const mediaDir = join(root, 'public', 'media');
const OUT = join(root, 'preview', 'dip-studio-preview.html');

const MIME = {
  '.avif': 'image/avif',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

/** One width per image keeps the file small; AVIF everywhere it exists. */
const pick = (base) => {
  if (base === 'hero-master') return `${base}-1024.avif`;
  // Posters are emitted without a width suffix.
  if (base.startsWith('clip-')) return `${base}.avif`;
  // 480 rather than 800: every card image is inlined, and the shared preview
  // has to stay small enough to pass claude.ai's public-sharing limit.
  return `${base}-480.avif`;
};

async function dataUri(fileName) {
  const buf = await readFile(join(mediaDir, fileName));
  const mime = MIME[extname(fileName)] ?? 'application/octet-stream';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

async function main() {
  const assets = await readdir(join(dist, 'assets'));
  const jsName = assets.find((f) => f.endsWith('.js'));
  const cssName = assets.find((f) => f.endsWith('.css'));

  const [html, js, css] = await Promise.all([
    readFile(join(dist, 'preview.html'), 'utf8'),
    readFile(join(dist, 'assets', jsName), 'utf8'),
    readFile(join(dist, 'assets', cssName), 'utf8'),
  ]);

  // Every distinct /media/<base>-<width>.<ext> reference collapses to one
  // data URI per base image.
  const bases = new Set();
  const collect = (text) => {
    for (const m of text.matchAll(/\/media\/([a-z0-9-]+)-\d+\.(?:avif|webp|jpg)/g)) bases.add(m[1]);
    for (const m of text.matchAll(/\/media\/(clip-[a-z]+)\.(?:avif|webp|jpg)/g)) bases.add(m[1]);
  };
  collect(html);
  collect(js);

  // The sections build image paths at runtime, so every manifest base needs an
  // embedded copy too — not just the ones spelled out in the markup.
  const manifest = await readFile(join(root, 'src', 'data', 'media.ts'), 'utf8');
  for (const match of manifest.matchAll(/base: '([a-z0-9-]+)'/g)) bases.add(match[1]);

  const uris = new Map();
  for (const base of bases) uris.set(base, await dataUri(pick(base)));

  const inlineMedia = (text) =>
    text
      .replace(/\/media\/([a-z0-9-]+)-\d+\.(?:avif|webp|jpg)/g, (whole, base) => uris.get(base) ?? whole)
      .replace(/\/media\/(clip-[a-z]+)\.(?:avif|webp|jpg)/g, (whole, base) => uris.get(base) ?? whole);

  // Bosnian needs latin + latin-ext only; the Cyrillic, Greek and Vietnamese
  // faces would otherwise carry ~150 kB of inlined woff2 for nothing.
  const trimFonts = (sheet) =>
    sheet.replace(/@font-face\s*{[^}]*}/g, (block) => {
      const range = /unicode-range:\s*([^;}]*)/i.exec(block);
      if (!range) return block;
      const wanted = /U\+0(0|1|2)/i.test(range[1]);
      return wanted ? block : '';
    });

  // The whole frame ladder travels inline. The shareable build scrubs the same
  // frame sequence the site does; seeking an inlined video under scroll snaps
  // to keyframes, which reads as jumping between scenes.
  const framesManifest = JSON.parse(await readFile(join(mediaDir, 'frames', 'frames.json'), 'utf8'));
  const ladder = framesManifest.ladders.find((l) => l.dir === 'md') ?? framesManifest.ladders[0];

  const frameUris = [];
  for (let i = 0; i < framesManifest.count; i++) {
    const name = `${String(i).padStart(4, '0')}.avif`;
    const buf = await readFile(join(mediaDir, 'frames', ladder.dir, name));
    frameUris.push(`data:image/avif;base64,${buf.toString('base64')}`);
  }

  const embeddedFrames = {
    // One ladder only: a second pass would re-decode the same data URIs.
    manifest: { ...framesManifest, ladders: [{ ...ladder, webp: false }] },
    urls: frameUris,
  };

  let out = html;

  // Drop the preload and the <source> variants: one data URI per image is
  // enough, and duplicate encodings would triple the file size.
  out = out.replace(/<link rel="preload"[\s\S]*?\/>/g, '');
  out = out.replace(/<source[^>]*>/g, '');
  out = out.replace(/\s+srcset="[^"]*"/g, '');
  out = out.replace(/\s+sizes="[^"]*"/g, '');

  out = inlineMedia(out);

  // The built page loads its script from <head>; the single file appends it
  // after the body content instead, so drop the tag here.
  out = out.replace(/<script type="module"[^>]*src="[^"]*"><\/script>/, '');
  out = out.replace(
    /<link rel="stylesheet"[^>]*href="[^"]*"[^>]*>/,
    `<style>\n${inlineMedia(trimFonts(css))}\n</style>`,
  );

  // Service pages do not exist inside a single file.
  out = out.replace(/href="\/usluge\/[a-z0-9-]+\/"/g, 'href="#usluge"');
  out = out.replace(/href="\/favicon\.svg"/g, 'href="#"');
  out = out.replace(/<link rel="canonical"[^>]*>/, '');

  // The Artifact host supplies the document skeleton, so hand it page content:
  // title, styles, body, script.
  const title = '<title>DIP Studio</title>';
  const style = out.slice(out.indexOf('<style>'), out.indexOf('</style>') + 8);
  const bodyInner = out.slice(out.indexOf('<body>') + 6, out.lastIndexOf('</body>'));
  const ld = out.slice(out.indexOf('<script type="application/ld+json">'), out.indexOf('</script>', out.indexOf('<script type="application/ld+json">')) + 9);

  const banner = `
<!--
  DIP Studio — single-file preview of the cinematic homepage.
  Built from dip-studio/ with: npx vite build --config vite.preview.config.ts
  Service pages (/usluge/*) exist in the real build; here their links point at
  the on-page service catalog.
-->`;

  const mediaMap = `<script>window.__DIP_MEDIA__ = ${JSON.stringify(Object.fromEntries(uris))};</script>`;
  // The clip is inlined exactly once and read through a global, so the three
  // places that reference it do not each carry a copy.
  const framesGlobal = `<script>window.__DIP_FRAMES__ = ${JSON.stringify(embeddedFrames)};</script>`;
  const script = `${mediaMap}\n${framesGlobal}\n<script type="module">\n${inlineMedia(js)}\n</script>`;
  const single = `${title}\n${banner}\n${style}\n${ld}\n${bodyInner}\n${script}\n`;

  await writeFile(OUT, single, 'utf8');
  const bytes = Buffer.byteLength(single);
  console.log(`wrote ${OUT} — ${(bytes / 1024 / 1024).toFixed(2)} MB`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
