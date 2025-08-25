import fs from 'fs-extra';
import path from 'node:path';
import { describe, it, expect, beforeEach } from 'vitest';

// dynamic import using the global path used in your project config
let preferences;

beforeEach(async () => {
  // Reset the module import for each test
  preferences = (await import(`../${globalThis.src_path}/preferences.js`)).default;
});

const prefs_fixture = { dir: '/123', prefs_version: '1.3.3' };

describe('src/preferences', () => {
  describe('directory', () => {
    it('returns the preferences directory depending on the platform', () => {
      let pref_dir;
      if (process.platform === 'darwin') {
        pref_dir = path.join(process.env.HOME, 'Library/Application Support/Championify/');
      } else {
        pref_dir = path.join(process.env.APPDATA, 'Championify');
      }
      expect(preferences.directory()).toBe(pref_dir);
    });
  });

  describe('file', () => {
    it('returns the preferences file depending on the platform', () => {
      let pref_file;
      if (process.platform === 'darwin') {
        pref_file = path.join(
          process.env.HOME,
          'Library/Application Support/Championify/prefs.json'
        );
      } else {
        pref_file = path.join(process.env.APPDATA, 'Championify/prefs.json');
      }
      expect(preferences.file()).toBe(pref_file);
    });
  });

  describe('save', () => {
    it('saves preferences fixture', async () => {
      await preferences.save(prefs_fixture);
      expect(fs.existsSync(preferences.file())).toBe(true);
    });
  });

  describe('load', () => {
    it('loads preferences fixture', () => {
      expect(preferences.load()).toEqual(prefs_fixture);
    });

    it('returns null when no preferences exist', async () => {
      await fs.remove(preferences.file());
      expect(preferences.load()).toBeNull();
    });
  });
});
