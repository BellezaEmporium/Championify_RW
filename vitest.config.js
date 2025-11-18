import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/lib'),
      '@backend': resolve(__dirname, 'backend/src'),
      '@shared': resolve(__dirname, 'shared/data'),
      'fs-extra': resolve(__dirname, 'tests/mocks/fs-extra.js'),
    },
    extensions: ['.ts', '.js', '.mjs', '.json', '.marko', '.html'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.{js,ts}'],
    exclude: [
      'tests/index.js',
      'tests/setup-vitest.js',
      'tests/mocks/**',
      'tests/i18n.test.js',
      'node_modules/**',
      'build/**',
      'dist/**',
    ],
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
        'build/**',
        'dist/**',
        'node_modules/**',
        '**/*.test.js',
        '**/*.spec.js',
        '**/tests/**',
        '**/fixtures/**',
        '**/setup-vitest.js',
      ],
    },
    env: { NODE_ENV: 'test' },
  },
});
