/**
 * VANTA Hypercar — the scroll-scrubbed cinematic film for the Cinematic
 * showcase tab.
 *
 * Same principle as scripts/frames.mjs: the section scrubs a decoded FRAME
 * SEQUENCE rather than seeking a <video>, because seeking H.264 under scroll
 * lands on keyframes and stalls (worst on iOS) while decoded AVIF frames
 * blitted into a canvas are smooth everywhere.
 *
 *   npm run vanta                 both ladders, posters, manifest
 *
 * Output lands in public/media/frames/{sm,lg}/vanta and public/media/poster,
 * plus public/media/frames/vanta.json, and is committed — the Vercel build
 * never runs ffmpeg, it only serves what this produced.
 *
 * ffmpeg comes from @ffmpeg-installer where that binary runs; on hosts where
 * it will not (some Windows shells reject it with EFTYPE) it falls back to an
 * ffmpeg on PATH. Either way sharp does every encode.
 */

import { execFile } from 'node:child_process';
import { mkdir, readdir, rm, writeFile, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { cpus } from 'node:os';
import sharp from 'sharp';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

const run = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcFile = join(root, 'media-src', 'vanta.mp4');
const mediaDir = join(root, 'public', 'media');
const framesDir = join(mediaDir, 'frames');
const posterDir = join(mediaDir, 'poster');
const tmpDir = join(root, '.vanta-tmp');

const CHAPTER = 'vanta';
const FPS = 24;

/**
 * Two ladders, exactly as the hero uses. sm carries a WebP copy so a browser
 * without AVIF has something to scrub; lg streams in behind sm on desktop.
 * maxFrames sets the stride so a beat never costs more than ~5vh of scroll.
 */
const LADDERS = [
  { dir: 'sm', width: 768, quality: 52, maxFrames: 200, webp: true },
  { dir: 'lg', width: 1280, quality: 62, maxFrames: 200, webp: false },
];

/** Beats, as fractions of the film — the stills a reduced-motion visitor sees. */
const BEAT_FRACTIONS = [0.1, 0.4, 0.66, 0.92];

sharp.concurrency(2);
const POOL = Math.max(2, Math.min(4, cpus().length - 1));

/** Picks an ffmpeg that actually runs here. */
async function resolveFfmpeg() {
  const candidates = [ffmpegInstaller?.path, 'ffmpeg'].filter(Boolean);
  for (const bin of candidates) {
    try {
      await run(bin, ['-version'], { maxBuffer: 1024 * 1024 });
      return bin;
    } catch {
      /* try the next candidate */
    }
  }
  throw new Error('no working ffmpeg found (tried @ffmpeg-installer and PATH)');
}

async function pooled(items, worker) {
  let next = 0;
  const lanes = Array.from({ length: POOL }, async () => {
    while (next < items.length) {
      const i = next++;
      await worker(items[i], i);
    }
  });
  await Promise.all(lanes);
}

async function bytesIn(dir) {
  let total = 0;
  for (const file of await readdir(dir)) total += (await stat(join(dir, file))).size;
  return total;
}

async function main() {
  const ffmpeg = await resolveFfmpeg();
  console.log(`ffmpeg: ${ffmpeg}`);

  await rm(tmpDir, { recursive: true, force: true });
  await mkdir(tmpDir, { recursive: true });
  await mkdir(posterDir, { recursive: true });

  // 1. Every frame of the master to PNG, once. The ladders sample from these.
  console.log('extracting frames…');
  await run(
    ffmpeg,
    ['-hide_banner', '-loglevel', 'error', '-y', '-i', srcFile, '-vf', `fps=${FPS}`, join(tmpDir, '%04d.png')],
    { maxBuffer: 1024 * 1024 * 64 },
  );

  const sources = (await readdir(tmpDir)).filter((f) => f.endsWith('.png')).sort();
  const total = sources.length;
  if (!total) throw new Error('ffmpeg produced no frames');

  const probe = await sharp(join(tmpDir, sources[0])).metadata();
  const aspect = (probe.width ?? 1280) / (probe.height ?? 720);
  console.log(`${total} frames, aspect ${aspect.toFixed(4)}`);

  const posterOf = (src, base) =>
    Promise.all([
      sharp(src).resize({ width: 1600 }).avif({ quality: 52, effort: 3 }).toFile(join(posterDir, `${base}.avif`)),
      sharp(src).resize({ width: 1600 }).webp({ quality: 74 }).toFile(join(posterDir, `${base}.webp`)),
      sharp(src).resize({ width: 1600 }).jpeg({ quality: 80, mozjpeg: true }).toFile(join(posterDir, `${base}.jpg`)),
    ]);

  // 2. Posters: the still a reduced-motion visitor and the <noscript> path see.
  await posterOf(join(tmpDir, sources[0]), `${CHAPTER}-open`);
  await posterOf(join(tmpDir, sources[total - 1]), `${CHAPTER}-close`);
  for (const [i, frac] of BEAT_FRACTIONS.entries()) {
    const idx = Math.min(total - 1, Math.round(frac * (total - 1)));
    await posterOf(join(tmpDir, sources[idx]), `${CHAPTER}-beat-${i + 1}`);
  }

  // 3. The ladders.
  const counts = {};
  for (const ladder of LADDERS) {
    const outDir = join(framesDir, ladder.dir, CHAPTER);
    await rm(outDir, { recursive: true, force: true });
    await mkdir(outDir, { recursive: true });

    const stride = Math.max(1, Math.ceil(total / (ladder.maxFrames ?? Infinity)));
    const picks = [];
    for (let i = 0; i * stride < total; i++) picks.push(sources[i * stride]);

    await pooled(picks, async (file, i) => {
      const name = String(i).padStart(4, '0');
      const pipeline = () => sharp(join(tmpDir, file)).resize({ width: ladder.width, kernel: 'lanczos3' });
      await pipeline().avif({ quality: ladder.quality, effort: 3 }).toFile(join(outDir, `${name}.avif`));
      if (ladder.webp) {
        await pipeline().webp({ quality: ladder.quality + 20 }).toFile(join(outDir, `${name}.webp`));
      }
    });

    counts[ladder.dir] = picks.length;
    console.log(
      `${ladder.dir}: ${picks.length} frames (stride ${stride}), ` +
        `${((await bytesIn(outDir)) / 1024 / 1024).toFixed(2)} MB`,
    );
  }

  // 4. A tiny manifest of its own, so the VANTA runtime never depends on the
  //    hero film's frames.json.
  const manifest = {
    id: CHAPTER,
    aspect,
    source: { frames: total, fps: FPS },
    ladders: LADDERS.map((l) => ({ dir: l.dir, width: l.width, webp: l.webp, count: counts[l.dir] })),
  };
  await writeFile(join(framesDir, `${CHAPTER}.json`), `${JSON.stringify(manifest, null, 2)}\n`);
  await rm(tmpDir, { recursive: true, force: true });
  console.log('vanta.json written');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
