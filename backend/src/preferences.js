import * as R from 'ramda';
import fs from 'fs-extra';
import path from 'path';
import semver from 'semver';

import ChampionifyErrors from './errors.js';
class WebLogger {
  error(...a) {
    console.error('[Championify]', ...a);
  }
  info(...a) {
    console.info('[Championify]', ...a);
  }
  warn(...a) {
    console.warn('[Championify]', ...a);
  }
}
import T from './translate.js';
import pathManager from './path_manager.js';
import store from './store.js';

import pkg from './helpers/pkg.js';

const logger = new WebLogger();

class Preferences {
  /**
   * Get preference directory
   * @returns {String} Preference directory path
   */

  directory() {
    // Prefer Electron's app.getPath when available, then environment variables,
    // then import.meta.env values (for dev), finally fallback to cwd.
    const platform = (typeof process !== 'undefined' && process.platform) || 'web';
    if (platform === 'darwin') {
      const home = process.env.HOME || import.meta.env.HOME || process.cwd();
      return path.join(home, 'Library', 'Application Support', 'Championify');
    }
    const appData = process.env.APPDATA || import.meta.env.APPDATA || process.cwd();
    return path.join(appData, 'Championify');
  }

  /**
   * Get preference file path
   * @returns {String} Preference file path
   */

  file() {
    return path.join(this.directory(), 'prefs.json');
  }

  /**
   * Gets preferences file
   * @returns {String|Null} JSON object of preferences, or null
   */

  load() {
    const preference_file = this.file();
    if (fs.existsSync(preference_file)) {
      let prefs = {};
      const rawprefs = fs.readFileSync(preference_file);
      try {
        prefs = JSON.parse(rawprefs);
      } catch (err) {
        logger.warn('Unable to parse preferences');
        logger.warn(rawprefs);
        logger.warn(err);
      }

      if (!prefs.prefs_version || semver.lt(prefs.prefs_version, '1.3.3')) return null;
      return prefs;
    }

    return null;
  }

  // Helper: get element by id
  _el(id) {
    if (!id) return null;
    return document.getElementById(id) || null;
  }

  // Helper: set textContent safely
  _setText(id, text) {
    const el = this._el(id);
    if (el) el.textContent = text;
  }

  // Helper: get textContent safely
  _getText(id) {
    const el = this._el(id);
    return el ? el.textContent : '';
  }

  // Helper: set option element (checkbox or position groups)
  _applyOption(key, val) {
    const id = `options_${key}`;
    const el = this._el(id);
    if (!el) return;

    if (key.indexOf('position') > -1) {
      // find child with class equal to val and add classes
      const target = el.querySelector(`.${val}`);
      if (target && target.classList) {
        target.classList.add('active', 'selected');
      }
    } else {
      // If element itself is an input/checkbox
      if ('checked' in el) {
        el.checked = !!val;
      } else {
        // try to find an input inside container
        const input = el.querySelector('input[type="checkbox"], input[type="radio"]');
        if (input) input.checked = !!val;
      }
    }
  }

  /**
   * Applies preferences to UI
   * @param {Object} Preferences object
   */

  set(preferences) {
    if (!preferences) return pathManager.findInstallPath();

    this._setText('local_version', preferences.local_is_version || T.t('unknown'));

    pathManager.checkInstallPath(preferences.install_path, function (err) {
      if (err) {
        pathManager.findInstallPath();
      } else {
        pathManager.checkInstallPath(preferences.install_path, pathManager.setInstallPath);
      }
    });

    if (!preferences.options) return;

    // Use R.forEachObjIndexed instead of R.forEach with R.toPairs
    R.forEachObjIndexed((val, key) => {
      this._applyOption(key, val);
    }, preferences.options);
  }

  /**
   * Gets all preferences from UI
   * @returns {Object} Preferences object
   */

  get() {
    const consumablesEl = this._el('options_consumables_position');
    const consumables_beginning = consumablesEl ? consumablesEl.querySelector('.beginning') : null;
    const consumables_position =
      consumables_beginning && consumables_beginning.classList.contains('selected')
        ? 'beginning'
        : 'end';

    const trinketsEl = this._el('options_trinkets_position');
    const trinkets_beginning = trinketsEl ? trinketsEl.querySelector('.beginning') : null;
    const trinkets_position =
      trinkets_beginning && trinkets_beginning.classList.contains('selected') ? 'beginning' : 'end';

    const getChecked = id => {
      const el = this._el(id);
      if (!el) return false;
      if ('checked' in el) return !!el.checked;
      const input = el.querySelector('input[type="checkbox"], input[type="radio"]');
      return input ? !!input.checked : false;
    };

    const getValue = id => {
      const el = this._el(id);
      if (!el) return '';
      if ('value' in el) return el.value;
      const input = el.querySelector('input, select, textarea');
      return input ? input.value : '';
    };

    return {
      prefs_version: pkg.version,
      locale: T.locale,
      install_path: store.get('lol_install_path'),
      champ_path: store.get('lol_champ_path'),
      local_is_version: this._getText('local_version'),
      options: {
        splititems: getChecked('options_splititems'),
        skillsformat: getChecked('options_skillsformat'),
        consumables: getChecked('options_consumables'),
        consumables_position: consumables_position,
        trinkets: getChecked('options_trinkets'),
        trinkets_position: trinkets_position,
        locksr: getChecked('options_locksr'),
        sr_source: (getValue('options_sr_source') || '').split(','),
        dontdeleteold: getChecked('options_dontdeleteold'),
        aram: getChecked('options_aram'),
      },
    };
  }

  /**
   * Saves preference file
   * @param {Object} [this.get()] Preferences object
   * @returns {Promise}
   */

  async save(preferences) {
    preferences = preferences || this.get();
    if (!preferences)
      throw new ChampionifyErrors.OperationalError('Preferences object does not exist');
    const preference_file = this.file();
    fs.mkdirsSync(this.directory());
    return fs
      .writeFileAsync(preference_file, JSON.stringify(preferences, null, 2), 'utf8')
      .then(() => logger.info(`Saved preference file to ${preference_file}`))
      .catch(err => logger.error(err));
  }
}

const prefs = new Preferences();
export default prefs;
