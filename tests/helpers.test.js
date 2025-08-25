import { describe, it, expect } from 'vitest';
import * as hlp from '../src/main/src/helpers/index.js';

describe('src/helpers', () => {
  describe('spliceVersion', () => {
    it('returns a two digit version number', () => {
      expect(hlp.spliceVersion('1.2.3')).toBe('1.2');
    });
  });
});
