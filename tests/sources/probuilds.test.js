import fs from 'fs';
import * as glob from 'glob';
import path from 'path';
import * as R from 'ramda';
import { describe, it, beforeAll, afterAll, beforeEach, afterEach, expect, vi } from 'vitest';

let probuilds, store;

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const RESPONSES_FIXTURES = {};
R.forEach(fixture => {
  if (fixture.indexOf('json') > -1) {
    RESPONSES_FIXTURES[path.basename(fixture).replace('.json', '')] = require(fixture);
  } else {
    RESPONSES_FIXTURES[path.basename(fixture).replace('.html', '')] = fs.readFileSync(
      fixture,
      'utf8'
    );
  }
}, glob.sync(path.join(__dirname, 'fixtures/probuilds/responses/*')));

const RESULTS_FIXTURES = {};
R.forEach(fixture => {
  RESULTS_FIXTURES[path.basename(fixture).replace('.json', '')] = require(fixture);
}, glob.sync(path.join(__dirname, 'fixtures/probuilds/results/*.json')));

async function testWithFixture(fixture) {
  await probuilds.getSr();
  const results = store.get('sr_itemsets');
  if (process.env.BUILD_FIXTURES === 'true') {
    fs.writeFileSync(
      path.join(__dirname, `fixtures/probuilds/results/${fixture}.json`),
      JSON.stringify(results, null, 2),
      'utf8'
    );
  }
  expect(results).toBeDefined();
  expect(results).toEqual(RESULTS_FIXTURES[fixture]);
  return results;
}

describe('src/sources/probuilds', () => {
  beforeAll(() => {
    // Mock fetch globally
    global.fetch = vi.fn();

    // ensure module cache is reset so mocks take effect
    vi.resetModules();

    probuilds = require('../../src/main/src/sources/probuilds').default;
    store = require('../../src/renderer/store').default;

    // Stable translation seed for tests
    const T = require(`../../${global.src_path}/translate`).default;
    const champions = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures/all_champions.json'), 'utf8')
    ).data;

    // Map normalized champion keys (e.g., "ahri", "missfortune") to display names
    const byKey = R.mapObjIndexed(c => c.name, champions);
    const translations = {};
    Object.keys(byKey).forEach(k => {
      const norm = k.toLowerCase().replace(/\s+/g, '').replace(/[.'-]/g, '');
      translations[norm] = byKey[k];
    });

    // Known aliases
    if (translations.monkeyking && !translations.wukong) {
      translations.wukong = translations.monkeyking;
    }

    T.merge(translations);

    store.set('champ_ids', { ahri: '103' });
  });

  afterAll(() => {
    vi.resetModules();
    delete global.fetch;
  });

  beforeEach(() => {
    store.remove('sr_itemsets');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('version', () => {
    it('should get the stubbed probuilds version', async () => {
      const version = await probuilds.getVersion();
      expect(version).toEqual('2016-11-27');
    });
  });

  describe('requestChamps', () => {
    describe('Ahri middle', () => {
      beforeEach(() => {
        store.set('settings', {});

        // Mock fetch responses
        global.fetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(RESPONSES_FIXTURES.champions),
          })
          .mockResolvedValueOnce({
            ok: true,
            text: () => Promise.resolve(RESPONSES_FIXTURES.ahri),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(RESPONSES_FIXTURES.champ_builds),
          });
      });
      it('should default item sets', async () => {
        const results = await testWithFixture('ahri_result_default');
        expect(results).toBeDefined();
      });
      it('should split item sets', async () => {
        store.set('settings', { splititems: true });
        const results = await testWithFixture('ahri_result_splititems');
        expect(results).toBeDefined();
      });
      it('should with item sets locked to Summoners Rift map', async () => {
        store.set('settings', { locksr: true });
        const results = await testWithFixture('ahri_result_locksr');
        expect(results).toBeDefined();
      });
      it('should with shorthanded skills', async () => {
        store.set('settings', {
          consumables: true,
          consumables_position: 'beginning',
          skillsformat: true,
        });
        const results = await testWithFixture('ahri_result_shorthand');
        expect(results).toBeDefined();
      });
      it('should with consumables enabled and at the beginning', async () => {
        store.set('settings', {
          consumables: true,
          consumables_position: 'beginning',
        });
        const results = await testWithFixture('ahri_result_consumables_beginning');
        expect(results).toBeDefined();
      });
      it('should with consumables enabled and at the end', async () => {
        store.set('settings', {
          consumables: true,
          consumables_position: 'end',
        });
        const results = await testWithFixture('ahri_result_consumables_end');
        expect(results).toBeDefined();
      });
      it('should with trinkets enabled and at the beginning', async () => {
        store.set('settings', {
          trinkets: true,
          trinkets_position: 'beginning',
        });
        const results = await testWithFixture('ahri_result_trinkets_beginning');
        expect(results).toBeDefined();
      });
      it('should with trinkets enabled and at the end', async () => {
        store.set('settings', {
          trinkets: true,
          trinkets_position: 'end',
        });
        const results = await testWithFixture('ahri_result_trinkets_end');
        expect(results).toBeDefined();
      });
      it('should with consumables enabled and split item sets', async () => {
        store.set('settings', {
          splititems: true,
          consumables: true,
          consumables_position: 'beginning',
        });
        const results = await testWithFixture('ahri_result_splititems_consumables');
        expect(results).toBeDefined();
      });
      it('should with trinkets enabled and split item sets', async () => {
        store.set('settings', {
          splititems: true,
          trinkets: true,
          trinkets_position: 'beginning',
        });
        const results = await testWithFixture('ahri_result_splititems_trinkets');
        expect(results).toBeDefined();
      });
    });
  });
});
