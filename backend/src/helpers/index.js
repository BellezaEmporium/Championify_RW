import { prebuilts } from '../shared/index.js';

import ChampionifyErrors from '../errors.js';
import pino from 'pino';
import T from '../translate.js';
import store from '../store.js';

const logger = pino({ name: 'Championify' });

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
  const platform = typeof navigator !== 'undefined' ? navigator.platform || '' : 'web';

  if (platform !== 'win32' && platform !== 'darwin') {
    return Promise.reject(new Error('Elevation not supported on this platform'));
  }

  return new Promise((resolve, reject) => {
    return reject(
      new ChampionifyErrors.ElevateError('Elevation not supported in web/PWA environment')
    );
  });
}

/**
 * Splice version number to two.
 * @param {String} Version number
 * @returns {String} Two digit version number
 */
export function cl(text, level = 'info') {
  const normalizedLevel = level === 'log' ? 'info' : level;
  logger[normalizedLevel](text);
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
export {
  capitalize,
  spliceVersion,
  shorthandSkills,
  arrayToBuilds,
} from '../../../src/common/formatters.js';

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
      type: consumables_title,
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
      type: trinkets_title,
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
