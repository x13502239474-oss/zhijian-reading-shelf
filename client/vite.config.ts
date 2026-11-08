import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 开发环境：Vite (5173) 把 /api 代理到 Express (3001)。
// 生产环境：Express 同时托管 client/dist 与 /api，单端口即可访问。
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    sourcemap: false,
  },
});
