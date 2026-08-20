/**
 * Bakes the whole site into ONE self-contained HTML file.
 *
 * This is the shareable preview: no server, no network, openable from a phone.
 * Everything is inlined — the script, the stylesheet, the fonts, the posters
 * and every frame of all four films.
 *
 * The films are the reason this is delicate. The `xs` ladder exists purely for
 * this build: 480px wide at 12fps, which is 384 frames instead of 768 and
 * roughly a tenth of the bytes. The trade is spatial detail and frame rate,
 * both of which the real site keeps.
 *
 *   npm run singlefile
 */

import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHAPTERS } from './chapters.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist-preview');
const publicDir = join(root, 'public');
const OUT_DIR = join(root, 'preview');
const OUT = join(OUT_DIR, 'digital-x-preview.html');
/**
 * The same page again, without the document wrapper.
 *
 * claude.ai artifacts supply their own <!doctype>/<html>/<head>/<body>, so the
 * shareable copy has to be a fragment: title first (only the first 8 KB is
 * scanned for it), then the styles, then the markup.
 */
const OUT_ARTIFACT = join(OUT_DIR, 'digital-x-artifact.html');

/** claude.ai renders artifacts up to 16 MB. Stay clear of the edge. */
const BUDGET = 15 * 1024 * 1024;
const LADDER = 'xs';

const MIME = {
  '.avif': 'image/avif',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

const dataUri = async (path) => {
  const ext = path.slice(path.lastIndexOf('.'));
  const buf = await readFile(path);
  return `data:${MIME[ext] ?? 'application/octet-stream'};base64,${buf.toString('base64')}`;
};

async function main() {
  const assets = await readdir(join(dist, 'assets'));
  const jsName = assets.find((f) => f.endsWith('.js'));
  const cssName = assets.find((f) => f.endsWith('.css'));
  if (!jsName || !cssName) throw new Error('run `vite build --config vite.preview.config.ts` first');

  const [html, js, css] = await Promise.all([
    readFile(join(dist, 'index.html'), 'utf8'),
    readFile(join(dist, 'assets', jsName), 'utf8'),
    readFile(join(dist, 'assets', cssName), 'utf8'),
  ]);

  // 1. Fonts and posters, referenced from the CSS and the markup.
  let styles = css;
  for (const font of await readdir(join(publicDir, 'fonts'))) {
    styles = styles.replaceAll(`/fonts/${font}`, await dataUri(join(publicDir, 'fonts', font)));
  }

  let page = html;
  for (const poster of await readdir(join(publicDir, 'media', 'poster'))) {
    if (!poster.endsWith('.avif') && !poster.endsWith('.jpg') && !poster.endsWith('.webp')) continue;
    const uri = await dataUri(join(publicDir, 'media', 'poster', poster));
    page = page.replaceAll(`/media/poster/${poster}`, uri);
  }
  page = page.replaceAll('/favicon.svg', await dataUri(join(publicDir, 'favicon.svg')));

  // 2. The films. The runtime reads window.__DX_INLINE__ instead of building
  //    URLs, and window.__DX_FRAMES__ instead of fetching the manifest.
  const manifest = JSON.parse(await readFile(join(publicDir, 'media', 'frames', 'frames.json'), 'utf8'));
  const inline = {};
  let frameBytes = 0;

  for (const chapter of CHAPTERS) {
    const dir = join(publicDir, 'media', 'frames', LADDER, chapter.id);
    const files = (await readdir(dir)).filter((f) => f.endsWith('.avif')).sort();
    const uris = [];
    for (const file of files) {
      frameBytes += (await stat(join(dir, file))).size;
      uris.push(await dataUri(join(dir, file)));
    }
    inline[`${LADDER}/${chapter.id}`] = uris;
    console.log(`${chapter.id}: ${files.length} frames inlined`);
  }

  // Only the xs ladder ships, so the runtime must not try to upgrade to lg or
  // fall back to sm — neither exists inside this file.
  const previewManifest = {
    ...manifest,
    ladders: manifest.ladders.filter((l) => l.dir === LADDER),
    chapters: manifest.chapters.map((c) => ({ ...c, counts: { [LADDER]: c.counts[LADDER] } })),
  };

  const bootstrap =
    `window.__DX_FRAMES__=${JSON.stringify(previewManifest)};` +
    `window.__DX_INLINE__=${JSON.stringify(inline)};`;

  // 3. Assemble. The <link> and <script src> are replaced with their contents.
  page = page
    .replace(/<link[^>]*\/fonts\/[^>]*>/g, '')
    .replace(/<link rel="modulepreload"[^>]*>/g, '')
    .replace(new RegExp(`<link[^>]*href="[^"]*${cssName}"[^>]*>`), `<style>${styles}</style>`)
    .replace(
      new RegExp(`<script[^>]*src="[^"]*${jsName}"[^>]*></script>`),
      `<script>${bootstrap}</script>\n<script type="module">${js}</script>`,
    );

  if (page.includes(cssName) || page.includes(jsName)) {
    throw new Error('stylesheet or script was not inlined — check the dist-preview markup');
  }

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT, page, 'utf8');

  // --- the artifact fragment ---------------------------------------------
  const between = (open, close, source) => {
    const a = source.indexOf(open);
    const b = source.indexOf(close);
    if (a < 0 || b < 0) throw new Error(`could not find ${open}…${close}`);
    return source.slice(a + open.length, b);
  };
  const head = between('<head>', '</head>', page);
  const body = between('<body>', '</body>', page);

  const titleTag = head.match(/<title>[\s\S]*?<\/title>/)?.[0] ?? '';
  /**
   * The shipped page keeps the live site's <title>, which is written for search
   * results. In a gallery of artifacts that string is a description, not a name
   * — so the shareable copy is named for what it is. The <meta> description
   * below still carries the full positioning.
   */
  const fragment = [
    '<title>Digital X Cinematic Homepage</title>',
    // The poster preload is pointless once the image is a data URI in the
    // markup, and putting a 1.5 MB href above the title would bury it.
    head
      .replace(titleTag, '')
      // The live title survives as the OG title, which is where it belongs.
      .replace(/<link[^>]*rel="preload"[^>]*>/g, '')
      .replace(/<link[^>]*rel="icon"[^>]*>/g, '')
      .replace(/<meta charset[^>]*>/g, '')
      .replace(/<meta name="viewport"[^>]*>/g, '')
      .trim(),
    body.trim(),
  ].join('\n');
  await writeFile(OUT_ARTIFACT, fragment, 'utf8');

  const size = Buffer.byteLength(page);
  const artifactSize = Buffer.byteLength(fragment);
  console.log(
    `\n${OUT}\n  ${(size / 1024 / 1024).toFixed(2)} MB ` +
      `(${(frameBytes / 1024 / 1024).toFixed(2)} MB of frames before base64)` +
      `\n${OUT_ARTIFACT}\n  ${(artifactSize / 1024 / 1024).toFixed(2)} MB`,
  );
  if (size > BUDGET) {
    throw new Error(
      `preview is ${(size / 1024 / 1024).toFixed(2)} MB, over the ${BUDGET / 1024 / 1024} MB budget — ` +
        `raise the xs ladder's stride in scripts/chapters.mjs and rebuild it with ` +
        `\`npm run frames -- --only=xs\``,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
