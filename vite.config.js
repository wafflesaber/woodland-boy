import { defineConfig } from 'vite';

export default defineConfig({
  base: '/woodland-boy/',
  server: { host: true, port: 3000 },
  build: { outDir: 'dist' }
});
