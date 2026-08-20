/**
 * Build used only by scripts/singlefile.mjs. Everything is inlined into one
 * chunk so the baker has a single script and a single stylesheet to embed.
 */
import { defineConfig } from 'vite';
import renderHtml from './plugins/render-html.mjs';

export default defineConfig({
  plugins: [renderHtml()],
  define: { __SINGLEFILE__: 'true' },
  build: {
    target: 'es2020',
    cssTarget: 'chrome100',
    outDir: 'dist-preview',
    assetsInlineLimit: 0,
    rollupOptions: { output: { manualChunks: undefined, inlineDynamicImports: true } },
  },
});
