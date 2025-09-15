import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@logseq/file-core': fileURLToPath(new URL('../../packages/file-core/src/index.ts', import.meta.url)),
      '@logseq/model': fileURLToPath(new URL('../../packages/model/src/index.ts', import.meta.url)),
      '@logseq/fs-adapter': fileURLToPath(new URL('../../packages/fs-adapter/src/types.ts', import.meta.url))
    }
  },
  server: {
    port: 1420,
    strictPort: true,
    host: true
  },
  preview: {
    port: 1420,
    strictPort: true,
    host: true
  },
  build: {
    outDir: 'dist',
    target: 'esnext'
  }
});
