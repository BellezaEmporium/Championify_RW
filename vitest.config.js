import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer'),
      '~': resolve(__dirname, 'src'),
    },
    extensions: ['.js', '.mjs', '.json', '.svelte', '.html'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.js'],
    exclude: ['tests/index.js', 'tests/setup-vitest.js'],
    setupFiles: ['tests/setup-vitest.js'],
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 10000,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'coverage/**',
        'dist/**',
        'node_modules/**',
        '**/*.test.js',
        '**/*.spec.js',
        '**/tests/**',
        '**/fixtures/**',
        '**/setup-vitest.js',
      ],
    },
    env: {
      NODE_ENV: 'test',
    },
  },
});
