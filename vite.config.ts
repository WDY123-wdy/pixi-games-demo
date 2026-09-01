import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  // 开发环境用根路径，生产部署到GitHub Pages用子路径
  base: mode === 'production' ? '/pixi-games-demo/' : '/',
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
}));
