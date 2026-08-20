/**
 * Turns the four films into everything the site scrubs.
 *
 * The chapters scrub a FRAME SEQUENCE rather than seeking a video. Seeking
 * H.264 under scroll lands on keyframes and stalls — worst on iOS — while
 * decoded frames blitted into a canvas are smooth everywhere. That is the one
 * decision the whole cinematic layer rests on.
 *
 *   npm run frames                 all ladders, all chapters
 *   npm run frames -- --only=xs    one ladder (a rebuild, not a first run)
 */

import { execFile } from 'node:child_process';
import { mkdir, readdir, rm, writeFile, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { cpus } from 'node:os';
import sharp from 'sharp';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import { CHAPTERS, LADDERS } from './chapters.mjs';

const run = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'media-src');
const mediaDir = join(root, 'public', 'media');
const framesDir = join(mediaDir, 'frames');
const filmDir = join(mediaDir, 'film');
const posterDir = join(mediaDir, 'poster');
const tmpRoot = join(root, '.frames-tmp');

// libvips already threads inside a single encode; running more than a couple
// of encodes on top of that just thrashes. Two at a time measured fastest.
sharp.concurrency(2);
const POOL = Math.max(2, Math.min(4, cpus().length - 1));

async function ffmpegRun(args) {
  await run(ffmpeg.path, ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
    maxBuffer: 1024 * 1024 * 64,
  });
}

async function bytesIn(dir) {
  let total = 0;
  for (const file of await readdir(dir)) total += (await stat(join(dir, file))).size;
  return total;
}

/** Runs `worker` over `items` with at most POOL in flight. */
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

async function main() {
  const onlyArg = process.argv.find((a) => a.startsWith('--only='));
  const only = onlyArg ? onlyArg.slice('--only='.length) : null;
  const ladders = only ? LADDERS.filter((l) => l.dir === only) : LADDERS;
  if (!ladders.length) throw new Error(`no ladder named "${only}"`);

  await rm(tmpRoot, { recursive: true, force: true });
  for (const dir of [framesDir, filmDir, posterDir]) await mkdir(dir, { recursive: true });

  const manifestChapters = [];
  let aspect = 16 / 9;

  for (const chapter of CHAPTERS) {
    const tmp = join(tmpRoot, chapter.id);
    await mkdir(tmp, { recursive: true });

    // 1. Decode once at full resolution; sharp does every encode from here so
    //    the output matches the rest of the site's images.
    console.log(`[${chapter.id}] decoding…`);
    await ffmpegRun(['-i', join(srcDir, chapter.file), '-vsync', '0', join(tmp, 'src-%04d.png')]);
    const sources = (await readdir(tmp)).filter((f) => f.endsWith('.png')).sort();
    const total = sources.length;
    const probe = await sharp(join(tmp, sources[0])).metadata();
    aspect = (probe.width ?? 1280) / (probe.height ?? 720);

    const counts = {};
    for (const ladder of ladders) {
      const outDir = join(framesDir, ladder.dir, chapter.id);
      await rm(outDir, { recursive: true, force: true });
      await mkdir(outDir, { recursive: true });

      // Frame n of the ladder is source frame n*stride, so a ladder index maps
      // to a time in the film without the runtime knowing the stride.
      const picks = [];
      for (let i = 0; i * ladder.stride < total; i++) picks.push(sources[i * ladder.stride]);

      await pooled(picks, async (file, i) => {
        const name = String(i).padStart(4, '0');
        const pipeline = () =>
          sharp(join(tmp, file)).resize({ width: ladder.width, kernel: 'lanczos3' });
        await pipeline()
          .avif({ quality: ladder.quality, effort: 3 })
          .toFile(join(outDir, `${name}.avif`));
        if (ladder.webp) {
          await pipeline()
            .webp({ quality: ladder.quality + 20 })
            .toFile(join(outDir, `${name}.webp`));
        }
      });

      counts[ladder.dir] = picks.length;
      console.log(
        `[${chapter.id}] ${ladder.dir}: ${picks.length} frames, ` +
          `${((await bytesIn(outDir)) / 1024 / 1024).toFixed(2)} MB`,
      );
    }

    if (!only) {
      // 2. Posters. `open` is the still a reduced-motion visitor and the
      //    <noscript> path see; `close` is the payoff the next section
      //    inherits, and for chapter 3 it is also the System Explorer's X.
      const poster = (src, base) =>
        Promise.all([
          sharp(src).resize({ width: 1600 }).avif({ quality: 52, effort: 3 }).toFile(join(posterDir, `${base}.avif`)),
          sharp(src).resize({ width: 1600 }).webp({ quality: 74 }).toFile(join(posterDir, `${base}.webp`)),
          sharp(src).resize({ width: 1600 }).jpeg({ quality: 80, mozjpeg: true }).toFile(join(posterDir, `${base}.jpg`)),
        ]);
      await poster(join(tmp, sources[0]), `${chapter.id}-open`);
      await poster(join(tmp, sources[total - 1]), `${chapter.id}-close`);

      // 3. A muted fast-start copy for the "pokreni film" player. Nothing
      //    scrubs this; it exists so the films can be watched straight through.
      await ffmpegRun([
        '-i', join(srcDir, chapter.file), '-an',
        '-c:v', 'libx264', '-crf', '25', '-preset', 'slow', '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        join(filmDir, `${chapter.id}.mp4`),
      ]);
    }

    manifestChapters.push({ id: chapter.id, source: { frames: total, fps: 24, duration: total / 24 }, counts });
    await rm(tmp, { recursive: true, force: true });
  }

  if (only) {
    await rm(tmpRoot, { recursive: true, force: true });
    console.log(`only "${only}" rebuilt — manifest, posters and film copies left untouched`);
    return;
  }

  // 4. The manifest. The runtime reads every count and width from here, so no
  //    frame total is ever hardcoded in the app.
  const manifest = {
    aspect,
    ladders: LADDERS.map((l) => ({ dir: l.dir, width: l.width, webp: l.webp, stride: l.stride })),
    chapters: manifestChapters,
  };
  await writeFile(join(framesDir, 'frames.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await rm(tmpRoot, { recursive: true, force: true });
  console.log('frames.json written');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
