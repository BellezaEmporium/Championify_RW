import * as R from 'ramda';
import fs from 'fs-extra';
import path from 'path';
import { afterAll } from 'vitest';
import T from '../backend/src/translate.js';
import '../backend/src/store.js';
import { describe, it, expect } from 'vitest';

if (typeof globalThis.window === 'undefined') globalThis.window = globalThis;
// Minimal stub for $('#cl_progress')
globalThis.$ = sel => ({ prepend: () => {} });

// import fixture JSON
import championsJson from './fixtures/all_champions.json';
const champions = championsJson.data;

// build translations and merge into your translate module
let translations = R.zipObj(R.keys(champions), R.pluck('name')(R.values(champions)));
translations = R.zipObj(
  R.map(key => key.toLowerCase().replace(/ /g, ''), R.keys(translations)),
  R.values(translations)
);
translations.wukong = translations.monkeyking;
T.merge(translations);

// write coverage after all tests
afterAll(() => {
  if (globalThis.window && globalThis.window.__coverage__) {
    console.log('Found coverage report, writing to coverage/coverage.json');
    const file_path = path.resolve(process.cwd(), 'coverage/coverage.json');
    fs.ensureDirSync(path.dirname(file_path));
    fs.writeFileSync(file_path, JSON.stringify(globalThis.window.__coverage__));
  }
});

describe('bootstrap', () => {
  it('loads translations', () => {
    expect(typeof T.t).toBe('function');
  });
});
