import globals from 'globals';
import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import vitest from '@vitest/eslint-plugin';
import i18next from 'eslint-plugin-i18next';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores([
    'build/**',
    'node_modules/**',
    'src-tauri/**',
    'static/**',
    'dist/**',
    '.svelte-kit/**',
    'src/**/*.marko',
  ]),
  js.configs.recommended,
  vitest.configs.recommended,
  i18next.configs['flat/recommended'],
  {
    plugins: {
      '@stylistic': stylistic,
      vitest,
    },

    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.mocha,
      },

      ecmaVersion: 'latest',
      sourceType: 'module',
    },

    rules: {
      'no-case-declarations': 'off',
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      indent: [
        'error',
        2,
        {
          SwitchCase: 1,
        },
      ],

      '@stylistic/linebreak-style': ['error', 'windows'],
      quotes: ['error', 'single'],
      semi: ['error', 'always'],
    },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
]);
