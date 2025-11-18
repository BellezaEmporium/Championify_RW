import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import marko from '@marko/vite';
import tailwind from '@tailwindcss/vite';
import staticAdapter from '@marko/run-adapter-static';

export default defineConfig({
  plugins: [
    marko({adapter: staticAdapter}), tailwind()],
  publicDir: 'static',
  resolve: {
    alias: {
      '@backend': resolve(__dirname, 'backend/src'),
      '@shared': resolve(__dirname, 'shared/data'),
    },
  },
  build: {
    outDir: 'build',
    // Prevent the client build from emptying the whole `build` folder
    // so the SSR build output (written to build/ssr) remains available
    // for the marko-vite post processing.
    emptyOutDir: false,
  },
});
