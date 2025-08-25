import globals from 'globals';
import path from 'node:path';
import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import vitest from '@vitest/eslint-plugin';
import { FlatCompat } from '@eslint/eslintrc';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

export default [
  ...compat.extends('eslint:recommended'),
  {
    plugins: {
      '@stylistic': stylistic,
      vitest
    },

    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.mocha,
        ...vitest.configs.recommended.rules,
        'vitest/max-nested-describe': ['error', { max: 3 }]
      },

      ecmaVersion: 'latest',
      sourceType: 'module'
    },

    rules: {
      'no-case-declarations': 'off',
      'no-unused-vars': ['error', { 
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_'
      }],

      indent: [
        'error',
        2,
        {
          SwitchCase: 1
        }
      ],

      '@stylistic/linebreak-style': ['error', 'windows'],
      quotes: ['error', 'single'],
      semi: ['error', 'always'],
    }
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...vitest.configs.recommended.rules
      }
    }
  }
];