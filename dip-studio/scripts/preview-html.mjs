/**
 * Regenerates preview.html from index.html.
 *
 * The single-file build needs its own entry (static imports, so everything
 * bundles into one chunk). Keeping it as a checked-in copy meant it silently
 * went stale whenever the homepage changed — so it is generated instead.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const html = await readFile(join(root, 'index.html'), 'utf8');
const preview = html.replace('/src/main.ts', '/src/preview.ts');

if (preview === html) {
  console.error('preview-html: entry script not found in index.html');
  process.exit(1);
}

await writeFile(join(root, 'preview.html'), preview, 'utf8');
console.log('preview.html regenerated from index.html');
