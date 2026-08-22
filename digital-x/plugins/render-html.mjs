/**
 * Renders the page's markup into index.html at build time — and on every
 * reload in dev.
 *
 * The cinematic layer must not cost this site its crawlability, so the copy
 * cannot be injected by the bundle after paint. But keeping the copy in a
 * hand-written index.html would mean maintaining it in two places. So the
 * templates live in TypeScript next to the content they read, and this plugin
 * runs them in Node and pastes the result in. One source of truth, fully
 * static output.
 */

import { build } from 'esbuild';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ENTRY = resolve('src/render/page.ts');

async function renderMarkup() {
  const dir = await mkdtemp(join(tmpdir(), 'dx-render-'));
  const out = join(dir, `page.${Date.now()}.mjs`);
  try {
    const result = await build({
      entryPoints: [ENTRY],
      bundle: true,
      format: 'esm',
      platform: 'node',
      target: 'node18',
      write: false,
      logLevel: 'silent',
    });
    await writeFile(out, result.outputFiles[0].text, 'utf8');
    const mod = await import(pathToFileURL(out).href);
    return mod.renderPage();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export default function renderHtml() {
  return {
    name: 'dx-render-html',
    enforce: 'pre',
    async transformIndexHtml(html) {
      const { body, head } = await renderMarkup();
      return html.replace('<!--HEAD-->', head).replace('<!--APP-->', body);
    },
    configureServer(server) {
      // Editing a template or the content file should reload the page, since
      // the markup is produced at transform time rather than by the bundle.
      server.watcher.add(resolve('src/render'));
      server.watcher.add(resolve('src/data'));
      server.watcher.on('change', (file) => {
        if (file.includes('/src/render/') || file.includes('/src/data/')) {
          server.ws.send({ type: 'full-reload' });
        }
      });
    },
  };
}
