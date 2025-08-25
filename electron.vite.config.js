import { defineConfig } from 'electron-vite';
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import tailwindcss from '@tailwindcss/vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  main: {
    build: {
      lib: {
        entry: resolve(__dirname, 'src/main/electron.js'),
      },
      outDir: resolve(__dirname, 'dist/main'),
    },
  },
  preload: {
    build: {
      lib: {
        entry: resolve(__dirname, 'src/preload/preload.js'),
      },
      outDir: resolve(__dirname, 'dist/preload'),
    },
  },
  renderer: {
    plugins: [
      svelte({
        preprocess: vitePreprocess({
          scss: {
            additionalData: `@use 'src/renderer/styles/variables' as *;`
          }
        }),
      }),
      tailwindcss(),
    ],
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/renderer/index.html'),
      },
      outDir: resolve(__dirname, 'dist/renderer'),
      emptyOutDir: true,
    },
    resolve: {
      extensions: ['.js', '.svelte', '.html'],
    }
  }
});