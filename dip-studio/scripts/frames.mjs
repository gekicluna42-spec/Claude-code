/**
 * Turns the hero clip into everything the site needs from it.
 *
 * The hero scrubs a FRAME SEQUENCE rather than seeking a video: seeking
 * H.264 under scroll lands on keyframes and stalls (worst on iOS), while
 * decoded frames drawn into a texture are smooth everywhere.
 *
 * Two ladders are produced. The 480-wide one loads first so scrubbing works
 * almost immediately; the 1280-wide one streams in behind it and takes over
 * frame by frame.
 *
 *   npm run frames
 */

import { execFile } from 'node:child_process';
import { mkdir, readdir, rm, writeFile, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import sharp from 'sharp';
import ffmpeg from '@ffmpeg-installer/ffmpeg';

const run = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLIP = join(root, 'media-src', 'hero-clip.mp4');
const mediaDir = join(root, 'public', 'media');
const framesDir = join(mediaDir, 'frames');
const tmpDir = join(root, '.frames-tmp');

/**
 * Every source frame. At 12 fps the gap between neighbours was large enough
 * for a fast camera move to read as a jump, and cross-fading cannot invent
 * the motion in between — so the ladder runs at the clip's own 24 fps.
 */
const STRIDE = 1;
const LADDERS = [
  // WebP is emitted only for the small ladder: browsers without AVIF get the
  // 480-wide set rather than a second full-size ladder nobody else downloads.
  { width: 480, dir: 'sm', quality: 42, webp: true },
  // 1152 rather than 1280: twice the frames at a slightly smaller width costs
  // about 2 MB, and this frame sits behind text under grain and bloom.
  { width: 1152, dir: 'lg', quality: 46, webp: false },
];

async function ffmpegRun(args) {
  await run(ffmpeg.path, ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
    maxBuffer: 1024 * 1024 * 64,
  });
}

async function bytesIn(dir) {
  const files = await readdir(dir);
  let total = 0;
  for (const file of files) total += (await stat(join(dir, file))).size;
  return total;
}

async function main() {
  await rm(tmpDir, { recursive: true, force: true });
  await mkdir(tmpDir, { recursive: true });
  await mkdir(framesDir, { recursive: true });

  // 1. Decode to PNG once; sharp does the encoding so the output matches the
  //    rest of the site's images.
  console.log('decoding frames…');
  await ffmpegRun([
    '-i', CLIP,
    '-vf', `select='not(mod(n\\,${STRIDE}))'`,
    '-vsync', '0',
    join(tmpDir, 'src-%04d.png'),
  ]);

  const sources = (await readdir(tmpDir)).filter((f) => f.endsWith('.png')).sort();
  const count = sources.length;
  console.log(`extracted ${count} frames`);

  // 2. Encode both ladders, AVIF with a WebP fallback.
  for (const ladder of LADDERS) {
    const outDir = join(framesDir, ladder.dir);
    await rm(outDir, { recursive: true, force: true });
    await mkdir(outDir, { recursive: true });

    for (let i = 0; i < count; i++) {
      const input = join(tmpDir, sources[i]);
      const name = String(i).padStart(4, '0');
      const pipeline = () => sharp(input).resize({ width: ladder.width, kernel: 'lanczos3' });
      await pipeline().avif({ quality: ladder.quality, effort: 4 }).toFile(join(outDir, `${name}.avif`));
      if (ladder.webp) {
        await pipeline().webp({ quality: ladder.quality + 20 }).toFile(join(outDir, `${name}.webp`));
      }
    }
    console.log(`${ladder.dir}: ${(await bytesIn(outDir) / 1024 / 1024).toFixed(2)} MB`);
  }

  // 3. Posters: the opening frame (hero fallback, LCP) and the payoff frame.
  const poster = (src, base) =>
    Promise.all([
      sharp(src).resize({ width: 1600 }).avif({ quality: 55, effort: 4 }).toFile(join(mediaDir, `${base}.avif`)),
      sharp(src).resize({ width: 1600 }).webp({ quality: 74 }).toFile(join(mediaDir, `${base}.webp`)),
      sharp(src).resize({ width: 1600 }).jpeg({ quality: 82, mozjpeg: true }).toFile(join(mediaDir, `${base}.jpg`)),
    ]);

  await poster(join(tmpDir, sources[0]), 'clip-poster');
  await poster(join(tmpDir, sources[count - 1]), 'clip-payoff');

  // 4. A muted, fast-start copy of the clip for the in-page player. The hero
  //    never loads this — only the "Pogledaj scenu" control does.
  console.log('encoding player copies…');
  await ffmpegRun([
    '-i', CLIP, '-an',
    '-c:v', 'libx264', '-crf', '24', '-preset', 'slow', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    join(mediaDir, 'hero-clip.mp4'),
  ]);
  // 5. The manifest — the runtime reads counts and widths from here so no
  //    frame total is ever hardcoded in the app.
  const probe = await sharp(join(tmpDir, sources[0])).metadata();
  const manifest = {
    count,
    stride: STRIDE,
    sourceFps: 24,
    duration: 10.006,
    aspect: (probe.width ?? 1280) / (probe.height ?? 720),
    ladders: LADDERS.map((l) => ({ dir: l.dir, width: l.width, webp: l.webp })),
    poster: 'clip-poster',
    payoff: 'clip-payoff',
  };
  await writeFile(join(framesDir, 'frames.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  await rm(tmpDir, { recursive: true, force: true });
  console.log(`frames.json written — ${count} frames`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
