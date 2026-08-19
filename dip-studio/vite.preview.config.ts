import { resolve } from 'node:path';
import { defineConfig } from 'vite';

/** Build used to produce the shareable single-file preview. */
export default defineConfig({
  build: {
    target: 'es2020',
    outDir: 'dist-preview',
    cssCodeSplit: false,
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    rollupOptions: {
      input: resolve(__dirname, 'preview.html'),
      output: { inlineDynamicImports: true },
    },
  },
});
