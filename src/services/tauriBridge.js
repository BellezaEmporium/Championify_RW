import { invoke } from '@tauri-apps/api/core';
import { getVersion } from '@tauri-apps/api/app';
import { listen } from '@tauri-apps/api/event';

/**
 * Preferences structure compatible with Rust backend
 * @typedef {Object} PreferencesUI
 * @property {string} locale
 * @property {string|null} install_path
 * @property {string[]} sr_source
 * @property {boolean} aram
 * @property {boolean} splititems
 * @property {boolean} skillsformat
 * @property {boolean} consumables
 * @property {string} consumables_position
 * @property {boolean} trinkets
 * @property {string} trinkets_position
 * @property {boolean} locksr
 * @property {boolean} dontdeleteold
 */

/**
 * Import payload structure
 * @typedef {Object} ImportPayload
 * @property {string[]} sources
 * @property {Record<string, any>} options
 * @property {string|null} path
 */

// Bridge Tauri (remplace l'ancien bridge Electron)
class TauriBridge {
  isTauri = true;
  isElectron = false;

  _progressListeners = [];
  _importUnlistener = null;

  async initialize() {
    log.info('[TauriBridge] Initializing');

    // Setup import progress event listener
    try {
      this._importUnlistener = await listen('import-progress', event => {
        this._progressListeners.forEach(callback => callback(event.payload));
      });
    } catch (error) {
      console.warn('[TauriBridge] Failed to setup progress listener:', error);
    }

    return true;
  }

  onImportProgress(callback) {
    this._progressListeners.push(callback);
  }

  async loadPreferences() {
    try {
      const prefs = await invoke('load_preferences');
      log.info('[TauriBridge] Loaded preferences', prefs);
      return prefs;
    } catch (error) {
      console.warn('[TauriBridge] Failed to load preferences:', error);
      return null;
    }
  }

  /**
   * Save preferences to backend
   * @param {PreferencesUI} preferences
   */
  async savePreferences(preferences) {
    try {
      // Ensure sr_source is an array
      const payload = {
        ...preferences,
        sr_source: Array.isArray(preferences.sr_source)
          ? preferences.sr_source
          : (preferences.sr_source || '').split(',').filter(Boolean),
      };

      await invoke('save_preferences', { preferences: payload });
      log.info('[TauriBridge] Saved preferences');
      return true;
    } catch (error) {
      console.error('[TauriBridge] Failed to save preferences:', error);
      return false;
    }
  }

  /**
   * Get LoL version from installation path
   * @param {string} path
   */
  async getLolVersionFromPath(path) {
    try {
      const version = await invoke('get_lol_version_from_path', { path });
      log.info('[TauriBridge] Got LoL version:', version);
      return version;
    } catch (error) {
      console.warn('[TauriBridge] Failed to get LoL version:', error);
      return 'dev';
    }
  }

  async findLolInstallation() {
    try {
      const path = await invoke('find_lol_installation');
      log.info('[TauriBridge] Found LoL installation:', path);
      return path;
    } catch (error) {
      console.error('[TauriBridge] Failed to find LoL installation:', error);
      return null;
    }
  }

  async getAvailableSources() {
    try {
      const sources = await invoke('get_available_sources');
      log.info('[TauriBridge] Got available sources:', sources);
      return sources;
    } catch (error) {
      console.error('[TauriBridge] Failed to get sources:', error);
      return [];
    }
  }

  async selectDirectory() {
    try {
      // Utilise le plugin dialog de Tauri
      const { open } = await import('@tauri-apps/plugin-dialog');
      const result = await open({
        directory: true,
        multiple: false,
      });
      log.info('[TauriBridge] Directory selected:', result);
      return result;
    } catch (error) {
      console.error('[TauriBridge] Failed to open directory dialog:', error);
      return null;
    }
  }

  /**
   * Start import process
   * @param {ImportPayload} payload
   */
  async startImport(payload) {
    try {
      log.info('[TauriBridge] Starting import:', payload);
      const result = await invoke('import_builds', {
        payload: {
          ...payload,
          sources: Array.isArray(payload.sources) ? payload.sources : [],
        },
      });
      log.info('[TauriBridge] Import result:', result);
      return result;
    } catch (error) {
      console.error('[TauriBridge] Failed to start import:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  async deleteAllBuilds(path) {
    try {
      const result = await invoke('delete_builds', { lol_path: path });
      log.info('[TauriBridge] Delete result:', result);
      return result;
    } catch (error) {
      console.error('[TauriBridge] Failed to delete builds:', error);
      return { success: false, error: error.message };
    }
  }

  async countExistingBuilds(path) {
    try {
      const result = await invoke('count_existing_builds', { lol_path: path });
      log.info('[TauriBridge] Count result:', result);
      return result.count;
    } catch (error) {
      console.warn('[TauriBridge] Failed to count builds:', error);
      return 0;
    }
  }

  async openLog() {
    try {
      const { open } = await import('@tauri-apps/plugin-shell');
      // Log file is typically in app config directory
      await open('https://github.com/BellezaEmporium/Championify_RW');
      log.info('[TauriBridge] Opened logs');
    } catch (error) {
      console.error('[TauriBridge] Failed to open log:', error);
    }
  }

  async startLeague() {
    try {
      const { Command: _Command } = await import('@tauri-apps/plugin-shell');
      // This would need proper implementation based on OS
      console.info('[TauriBridge] Starting League (mock)');
    } catch (error) {
      console.error('[TauriBridge] Failed to start League:', error);
    }
  }

  async checkForUpdates() {
    // Would integrate with tauri updater plugin
    return { updateAvailable: false };
  }

  async openReleaseNotes() {
    try {
      const { open } = await import('@tauri-apps/plugin-shell');
      await open('https://github.com/BellezaEmporium/Championify_RW/releases');
    } catch (_error) {
      // Fallback navigateur
      window.open('https://github.com/BellezaEmporium/Championify_RW/releases', '_blank');
    }
  }

  /**
   * Show error dialog
   * @param {string} title
   * @param {string} message
   */
  async showError(title, message) {
    try {
      const { ask } = await import('@tauri-apps/plugin-dialog');
      await ask(message, { title });
    } catch (error) {
      console.error('[TauriBridge] Failed to show error dialog', title, message, error);
      alert(`${title}: ${message}`);
    }
  }

  async getAppVersion() {
    try {
      return await getVersion();
    } catch (_error) {
      return 'dev';
    }
  }

  cleanup() {
    if (this._importUnlistener) {
      this._importUnlistener();
    }
  }
}

// Simple logging (would use actual i18n/translate in real app)
const log = {
  info: (...args) => console.log('[Championify]', ...args),
  warn: (...args) => console.warn('[Championify]', ...args),
  error: (...args) => console.error('[Championify]', ...args),
};

export default new TauriBridge();
