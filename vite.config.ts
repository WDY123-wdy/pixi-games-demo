import { defineConfig } from 'vite';

export default defineConfig({
  base: '/pixi-games-demo/',
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
