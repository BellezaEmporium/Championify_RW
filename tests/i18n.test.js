import fs from 'fs';
import * as glob from 'glob';
import path from 'path';
import { describe, it, expect } from 'vitest';
const translationsDir = path.resolve(process.cwd(), 'public', 'translations');

function isPR() {
  return (
    (process.env.TRAVIS_PULL_REQUEST && process.env.TRAVIS_PULL_REQUEST !== 'false') ||
    !!process.env.APPVEYOR_PULL_REQUEST_NUMBER
  );
}

if (!isPR()) {
  describe('i18n', () => {
    const sourcePath = path.join(translationsDir, '_source.json');
    const sourceContent = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    const sourceKeys = Object.keys(sourceContent);

    const localeFiles = glob
      .sync(path.join(translationsDir, '*.json'))
      .filter(file => path.basename(file) !== '_source.json');

    describe.each(localeFiles)('Locale: %s', (localePath) => {
      const localeContent = JSON.parse(fs.readFileSync(localePath, 'utf8'));
      const localeKeys = Object.keys(localeContent);

      it('should have the same number of keys as _source.json', () => {
        expect(localeKeys.length).toBe(sourceKeys.length);
      });

      it('should contain all keys from _source.json', () => {
        const missingKeys = sourceKeys.filter(key => !Object.prototype.hasOwnProperty.call(localeContent, key));
        expect(missingKeys, `Missing keys: ${missingKeys.join(', ')}`).toEqual([]);
      });

      it('should not have extra keys not present in _source.json', () => {
        const extraKeys = localeKeys.filter(key => !Object.prototype.hasOwnProperty.call(sourceContent, key));
        expect(extraKeys, `Extra keys: ${extraKeys.join(', ')}`).toEqual([]);
      });
    });
  });
}
