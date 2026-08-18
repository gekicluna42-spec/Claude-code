/**
 * Builds every image the site serves from the master cinematic frame.
 *
 * The master is upscaled once (lanczos3) so the tighter act crops still have
 * pixels to spend, then each region is cut and encoded to AVIF, WebP and JPEG
 * at three widths. Re-run after replacing or adding source frames:
 *
 *   npm run media
 */

import { mkdir, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mediaDir = join(root, 'public', 'media');
const MASTER = join(root, 'media-src', 'master-hero.png');

/** Regions of the master frame, as fractions: [x, y, width, height]. */
const CROPS = {
  'crop-couple-close': [0.4, 0.34, 0.21, 0.42],
  'crop-couple-wide': [0.31, 0.26, 0.38, 0.6],
  'crop-fog-floor': [0.26, 0.54, 0.48, 0.33],
  'crop-spark-left': [0.11, 0.04, 0.21, 0.74],
  'crop-spark-right': [0.68, 0.04, 0.21, 0.74],
  'crop-spark-corridor': [0.15, 0.1, 0.7, 0.62],
  'crop-ceiling-stars': [0.2, 0.0, 0.6, 0.29],
  'crop-beams-wide': [0.22, 0.2, 0.56, 0.4],
  'crop-tables-guests': [0.02, 0.42, 0.3, 0.33],
  'crop-floral-arch': [0.78, 0.08, 0.21, 0.72],
  'crop-entrance-arch': [0.36, 0.16, 0.28, 0.42],
  'crop-floor-reflection': [0.1, 0.66, 0.5, 0.31],
};

const HERO_WIDTHS = [1024, 1600, 2200];
const CROP_WIDTHS = [480, 800, 1200];

const ENCODERS = [
  ['avif', (p) => p.avif({ quality: 52, effort: 4 })],
  ['webp', (p) => p.webp({ quality: 76 })],
  ['jpg', (p) => p.jpeg({ quality: 82, mozjpeg: true, progressive: true })],
];

async function emit(input, base, widths) {
  const written = [];
  for (const width of widths) {
    for (const [ext, encode] of ENCODERS) {
      const out = join(mediaDir, `${base}-${width}.${ext}`);
      const pipeline = sharp(input).resize({ width, withoutEnlargement: false, kernel: 'lanczos3' });
      await encode(pipeline).toFile(out);
      written.push(`${base}-${width}.${ext}`);
    }
  }
  return written;
}

async function main() {
  await mkdir(mediaDir, { recursive: true });

  try {
    await access(MASTER);
  } catch {
    console.error(`Master frame missing: ${MASTER}`);
    process.exit(1);
  }

  const meta = await sharp(MASTER).metadata();
  const { width: mw = 0, height: mh = 0 } = meta;
  console.log(`master ${mw}×${mh}`);

  // One high-quality upscale, reused by every crop below.
  const upscaled = await sharp(MASTER)
    .resize({ width: mw * 2, kernel: 'lanczos3' })
    .png()
    .toBuffer();

  let count = 0;
  count += (await emit(upscaled, 'hero-master', HERO_WIDTHS)).length;

  for (const [name, [x, y, w, h]] of Object.entries(CROPS)) {
    const region = {
      left: Math.round(x * mw * 2),
      top: Math.round(y * mh * 2),
      width: Math.round(w * mw * 2),
      height: Math.round(h * mh * 2),
    };
    const cropped = await sharp(upscaled).extract(region).png().toBuffer();
    count += (await emit(cropped, name, CROP_WIDTHS)).length;
  }

  // Social card: the payoff frame, cropped to 1.91:1.
  await sharp(upscaled)
    .resize({ width: 1200, height: 630, fit: 'cover', position: 'centre' })
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(join(mediaDir, 'og-cover.jpg'));
  count += 1;

  console.log(`wrote ${count} files to public/media`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
