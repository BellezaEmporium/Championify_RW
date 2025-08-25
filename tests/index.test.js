import * as R from 'ramda';
import fs from 'fs-extra';
import path from 'path';
import sinon from 'sinon';
import { afterAll } from 'vitest';

// set src path like before
globalThis.src_path = process.env.COVERAGE ? 'src-cov' : 'src';

// import your modules (top-level await allowed in Vitest setup files)
// adjust paths/extensions if needed
const T = (await import(`../${globalThis.src_path}/translate`)).default;
await import(`../${globalThis.src_path}/store`);

// provide a window/$ shim (Vitest uses jsdom by default)
if (typeof globalThis.window === 'undefined') globalThis.window = globalThis;
globalThis.$ = sinon.stub();
globalThis.$.withArgs('#cl_progress').returns({ prepend: () => {} });

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
