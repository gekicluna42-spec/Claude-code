import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const page = (...segments: string[]) => resolve(__dirname, ...segments);

export default defineConfig({
  appType: 'mpa',
  build: {
    target: 'es2020',
    cssTarget: 'chrome100',
    assetsInlineLimit: 2048,
    rollupOptions: {
      input: {
        home: page('index.html'),
        niskiDim: page('usluge/niski-dim/index.html'),
        prskalice: page('usluge/prskalice/index.html'),
        photobooth: page('usluge/photobooth-360-booth/index.html'),
        rasvjeta: page('usluge/ambijentalna-rasvjeta/index.html'),
      },
      output: {
        manualChunks: {
          three: ['three'],
          motion: ['gsap', 'gsap/ScrollTrigger', 'lenis'],
        },
      },
    },
  },
  server: { port: 5173, host: true },
  preview: { port: 4173, host: true },
});
