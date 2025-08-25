import * as R from 'ramda';
import prebuilts from '../../../../shared/data/prebuilts.json' with { type: 'json' };

import ChampionifyErrors from '../errors.js';
import { Logger } from 'electron-winston/main';
import T from '../translate.js';
import store from '../store.js';

const logger = new Logger();

/**
 * Function if error exists, enable error view and log error ending the session.
 * @param {Object} Error instance
 */

export function EndSession(c_error) {
  logger.error(c_error);
  window.error_message = c_error.message || c_error.rootCause.message;
  window.viewManager.error();
  return false;
}

/**
 * Re-executes Championify with elevated privileges, closing the current process if successful. Throws an error if user declines. Only works on Windows.
 * @param {Array} Command line parameters
 * @returns {Promise.Boolean|ChampionifyErrors.ElevateError}
 */
export function elevate(params = []) {
  const platform = process.platform;

  if (platform !== 'win32' && platform !== 'darwin') {
    return Promise.reject(new Error('Elevation not supported on this platform'));
  }

  return new Promise((resolve, reject) => {
    const browser_window = window.electronAPI.getCurrentWindow();
    browser_window.hide();

    let child;
    const execPath = process.execPath;
    const args = ['--runned-as-admin'].concat(params);

    // Use remote.require to obtain child_process at runtime in the renderer
    let child_process;
    try {
      child_process = window.electronAPI.remote.require && window.electronAPI.remote.require('child_process');
    } catch {
      // fallback: try global require if available
      try { child_process = require('child_process'); } catch { child_process = null; }
    }

    if (!child_process) {
      browser_window.show();
      return reject(new ChampionifyErrors.ElevateError('child_process not available in renderer'));
    }

    if (platform === 'win32') {
      const powershellArgs = [
        '-Command',
        `Start-Process -FilePath "${execPath}" -ArgumentList "${args.join(' ')}" -Verb runAs`
      ];
      child = child_process.spawn('powershell.exe', powershellArgs, {
        windowsHide: true,
        stdio: 'ignore'
      });
    } else if (platform === 'darwin') {
      const script = `do shell script "${execPath} ${args.join(' ')}" with administrator privileges`;
      child = child_process.spawn('osascript', ['-e', script], {
        stdio: 'ignore'
      });
    }

    child.on('error', (error) => {
      browser_window.show();
      reject(new ChampionifyErrors.ElevateError(`Failed to elevate: ${error.message}`));
    });

    child.on('close', (code) => {
      if (code === 0) {
        window.electronAPI.app.quit();
      } else {
        browser_window.show();
        if (code === 1 && platform === 'darwin') {
          reject(new ChampionifyErrors.ElevateError('User refused to elevate permissions'));
        } else {
          reject(new ChampionifyErrors.ElevateError(`Process exited with code ${code}`));
        }
      }
    });
  });
}

/**
 * Splice version number to two.
 * @param {String} Version number
 * @returns {String} Two digit version number
 */
export function cl(text, level = 'info') {
  logger[level](text);
  // Only touch the DOM when running in a renderer/browser context.
  if (typeof document === 'undefined') return;

  try {
    const progressElement = document.getElementById && document.getElementById('cl_progress');
    if (progressElement) {
      const span = document.createElement('span');
      span.textContent = text;
      progressElement.insertAdjacentHTML('afterbegin', `${span.outerHTML}<br />`);
    }
  } catch (err) {
    // If any DOM operation fails, log a warning but don't crash the main process.
    logger.warn(`cl(): DOM update skipped (${err.message})`);
  }
}

/**
 * Capitalizes first letter of string
 * @param {String} String
 */
export { capitalize, spliceVersion, shorthandSkills, arrayToBuilds } from '../../../common/formatters.js';

/**
 * Reusable function for generating Trinkets and Consumables on build blocks.
 * @param {Array} Array of blocks for item sets
 * @param {Object} Formatted skill priorities
 * @returns Array of block item sets with added trinkets and consumables
 */

export function trinksCon(builds, skills = {}) {
  if (store.get('settings').consumables) {
    let consumables_title = T.t('consumables', true);
    if (skills.most_freq) consumables_title += ` | ${T.t('frequent', true)}: ${skills.most_freq}`;

    const consumables_block = {
      items: prebuilts.consumables,
      type: consumables_title
    };
    if (store.get('settings').consumables_position === 'beginning') {
      builds.unshift(consumables_block);
    } else {
      builds.push(consumables_block);
    }
  }

  if (store.get('settings').trinkets) {
    let trinkets_title = T.t('trinkets', true);
    if (skills.highest_win) trinkets_title += ` | ${T.t('wins', true)}: ${skills.highest_win}`;

    const trinkets_block = {
      items: prebuilts.trinket_upgrades,
      type: trinkets_title
    };
    if (store.get('settings').trinkets_position === 'beginning') {
      builds.unshift(trinkets_block);
    } else {
      builds.push(trinkets_block);
    }
  }
  return builds;
}

/**
 * Converts an array of skills to a shortanded representation
 * @param {Array} Array of skills (as letters)
 * @returns String Shorthand representation
 */
// shorthandSkills is re-exported from '../../../common/formatters.js'

/**
 * Converts an array of IDs to item blocks with the correct counts
 * @param {Array} Array of ids
 * @returns Array of block item
 */
// arrayToBuilds is re-exported from '../../../common/formatters.js'
