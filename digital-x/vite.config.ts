import { defineConfig } from 'vite';
import renderHtml from './plugins/render-html.mjs';

export default defineConfig({
  plugins: [renderHtml()],
  build: {
    target: 'es2020',
    cssTarget: 'chrome100',
    assetsInlineLimit: 2048,
    rollupOptions: {
      output: {
        manualChunks: {
          motion: ['gsap', 'gsap/ScrollTrigger', 'lenis'],
          // Three lands in its own chunk behind the dynamic import, so the
          // film's critical path never waits on it.
          three: ['three'],
        },
      },
    },
  },
  server: { port: 5173, host: true },
  preview: { port: 4173, host: true },
});
