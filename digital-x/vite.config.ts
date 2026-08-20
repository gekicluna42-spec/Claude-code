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
        manualChunks: { motion: ['gsap', 'gsap/ScrollTrigger', 'lenis'] },
      },
    },
  },
  server: { port: 5173, host: true },
  preview: { port: 4173, host: true },
});
