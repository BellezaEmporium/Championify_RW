import { describe, it, expect, beforeEach } from 'vitest';

let optionsParser;

beforeEach(async () => {
  optionsParser = (await import(`../${globalThis.src_path}/options_parser.js`)).default;
});

describe('src/options_parser', () => {
  describe('import', () => {
    it('should false', () => {
      expect(optionsParser['import']()).toBe(false);
    });
  });
  describe('delete', () => {
    it('should false', () => {
      expect(optionsParser['delete']()).toBe(false);
    });
  });
  describe('close', () => {
    it('should false', () => {
      expect(optionsParser.close()).toBe(false);
    });
  });
  describe('autorun', () => {
    it('should false', () => {
      expect(optionsParser.autorun()).toBe(false);
    });
  });
  describe('runnedAsAdmin', () => {
    it('should false', () => {
      expect(optionsParser.runnedAsAdmin()).toBe(false);
    });
  });
  describe('startLeague', () => {
    it('should false', () => {
      expect(optionsParser.startLeague()).toBe(false);
    });
  });
});
