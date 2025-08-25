import fs from 'fs';
import * as glob from 'glob';
import path from 'path';
import * as R from 'ramda';
import { describe, it, beforeAll, beforeEach, afterEach, afterAll, expect } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const koreanbuilds = require(`../../${global.src_path}/sources/koreanbuilds`);
const store = require(`../../${global.src_path}/store`).default;

const server = setupServer();

const RESPONSES_FIXTURES = {};
R.forEach(fixture => {
  RESPONSES_FIXTURES[path.basename(fixture).replace('.html', '')] = fs.readFileSync(fixture, 'utf8');
}, glob.sync(path.join(__dirname, 'fixtures/koreanbuilds/responses/*.html')));

const RESULTS_FIXTURES = {};
R.forEach(fixture => {
  RESULTS_FIXTURES[path.basename(fixture).replace('.json', '')] = require(fixture);
}, glob.sync(path.join(__dirname, 'fixtures/koreanbuilds/results/*.json')));

function mockSR() {
  server.use(
    http.get('http://koreanbuilds.net/', () => HttpResponse.text(RESPONSES_FIXTURES.index)),
    http.get('http://koreanbuilds.net/roles', () => HttpResponse.text(RESPONSES_FIXTURES.roles)),
    http.get('http://koreanbuilds.net/champion/Ahri/Mid/6.6/-1', () => HttpResponse.text(RESPONSES_FIXTURES.ahri))
  );
}

describe('src/sources/koreanbuilds', () => {
  beforeAll(() => {
    server.listen();
    store.set('koreanbuilds_ver', '6.6');
  });

  afterAll(() => {
    server.close();
  });

  describe('version', () => {
    it('should get the stubbed koreanbuilds version', async () => {
      server.use(http.get('http://koreanbuilds.net/', () => HttpResponse.text(RESPONSES_FIXTURES.index)));
      const version = await koreanbuilds.getVersion();
      expect(version).toBe('6.6');
    });
  });

  describe('summoners rift', () => {
    beforeEach(() => {
      store.remove('sr_itemsets');
    });

    afterEach(() => {
      server.resetHandlers();
    });

    it('should return items for ahri middle', async () => {
      mockSR();
      store.set('settings', { consumables: true });
      await koreanbuilds.getSr();
      const itemsets = R.flatten(store.get('sr_itemsets'));
      if (process.env.BUILD_FIXTURES === 'true') {
        fs.writeFileSync(path.join(__dirname, 'fixtures/koreanbuilds/results/ahri_normal.json'), JSON.stringify(itemsets, null, 2), 'utf8');
      }
      expect(itemsets).toEqual(RESULTS_FIXTURES.ahri_normal);
    });

    it('should return items for ahri middle with shorthand skills', async () => {
      mockSR();
      store.set('settings', { skillsformat: true, consumables: true });
      await koreanbuilds.getSr();
      const itemsets = R.flatten(store.get('sr_itemsets'));
      if (process.env.BUILD_FIXTURES === 'true') {
        fs.writeFileSync(path.join(__dirname, 'fixtures/koreanbuilds/results/ahri_shorthand.json'), JSON.stringify(itemsets, null, 2), 'utf8');
      }
      expect(itemsets).toEqual(RESULTS_FIXTURES.ahri_shorthand);
    });
  });
});
