/**
 * Backend Bridge Module
 * Connects the frontend UI (src/ui.js) with backend logic (backend/src/)
 */

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import getUnicodeFlagIcon from 'country-flag-icons/unicode';

// Internal state
let _importUnlistener = null;

function isTauriContext() {
  try {
    return typeof globalThis !== 'undefined' && !!globalThis.isTauri;
  } catch {
    return false;
  }
}

function maybeInvoke(command, args) {
  if (!isTauriContext()) {
    return Promise.reject(
      new Error(`[BackendBridge] Tauri runtime not available (cannot invoke "${command}").`)
    );
  }

  return invoke(command, args);
}

export const tauriApi = {
  // Preferences
  loadPreferences: () => (isTauriContext() ? invoke('load_preferences') : Promise.resolve(null)),
  savePreferences: prefs =>
    isTauriContext() ? invoke('save_preferences', { preferences: prefs }) : Promise.resolve(null),
  getOsLocale: () => {
    if (isTauriContext()) return invoke('get_os_locale');
    if (typeof navigator !== 'undefined' && navigator.language) {
      return Promise.resolve(navigator.language);
    }
    return Promise.resolve(null);
  },

  // Paths
  findLolInstallation: () => maybeInvoke('find_lol_installation'),
  getItemSetsPath: lolPath => maybeInvoke('get_item_sets_path', { lol_path: lolPath }),

  // Import
  importBuilds: (sources, options, path) =>
    maybeInvoke('import_builds', { payload: { sources, options, path } }),

  // Build Management
  deleteBuilds: lolPath => maybeInvoke('delete_builds', { lol_path: lolPath }),
  countExistingBuilds: lolPath => maybeInvoke('count_existing_builds', { lol_path: lolPath }),

  // Info
  getAvailableSources: () => maybeInvoke('get_available_sources'),
  getVersion: () => maybeInvoke('get_version'),
  getLolVersion: () => maybeInvoke('get_lol_version'),
  getLolVersionFromPath: path => maybeInvoke('get_lol_version_from_path', { path }),
  // Scraper registry / health
  getScraperStatuses: () => maybeInvoke('get_scraper_statuses'),
};

/**
 * Initialize backend connection and listeners
 */
async function initBackend() {
  console.log('[BackendBridge] Initializing...');

  if (!isTauriContext()) {
    console.warn('[BackendBridge] Skipping backend init (not in Tauri context).');
    return;
  }

  // Setup import progress listener
  if (_importUnlistener) {
    _importUnlistener();
  }

  _importUnlistener = await listen('import-progress', event => {
    const { source, status, count } = event.payload;
    updateProgress(source, status, count);
  });

  // Load initial data
  await loadInitialState();
}

/**
 * Load initial state (versions, preferences)
 */
async function loadInitialState() {
  try {
    // Load preferences
    const prefs = await tauriApi.loadPreferences();
    if (prefs) {
      applyPreferences(prefs);
      syncLocale(prefs.locale);
    }

    // Load app version
    const appVersion = await tauriApi.getVersion();
    updateElementText('local_version', appVersion);

    // Load LoL patch version from API (more reliable)
    try {
      const lolVersion = await tauriApi.getLolVersion();
      updateElementText('lol_version', lolVersion);
    } catch (e) {
      console.warn('[BackendBridge] Failed to get LoL version:', e);
      updateElementText('lol_version', 'Unknown');
    }

    // Get install path input element
    const installPathInput = document.getElementById('install_path');

    // Determine LoL path: from input, preferences, or auto-discover
    let lolPath = installPathInput?.value || prefs?.install_path || null;

    // Auto-discover if no path is set
    if (!lolPath) {
      try {
        lolPath = await tauriApi.findLolInstallation();
        if (lolPath && installPathInput) {
          installPathInput.value = lolPath;
          setPathStatus('Found League of Legends!', 'green');
        }
      } catch (e) {
        console.warn('[BackendBridge] Failed to auto-discover LoL path:', e);
        setPathStatus('League of Legends not found', 'red');
      }
    }
  } catch (error) {
    console.error('[BackendBridge] Failed to load initial state:', error);
    setPathStatus('Unable to load preferences', 'red');
  }
}

/**
 * Browse for LoL installation path
 */
async function browseInstallPath() {
  try {
    const selected = await open({
      directory: true,
      multiple: false,
      title: 'Select League of Legends Installation Directory',
    });

    if (selected) {
      const installPathInput = document.getElementById('install_path');
      if (installPathInput) {
        installPathInput.value = selected;
        // Trigger change event or update version manually
        const lolVersion = await tauriApi.getLolVersionFromPath(selected);
        updateElementText('lol_version', lolVersion);
        saveCurrentPreferences();
        setPathStatus('Found League of Legends!', 'green');
      }
    }
  } catch (error) {
    console.error('[BackendBridge] Failed to browse path:', error);
    setPathStatus('Unable to read that directory', 'red');
  }
}

/**
 * Import item sets
 */
async function importItemSets() {
  const importBtn = document.getElementById('import_btn');
  const processLog = document.getElementById('process_log');
  const progressBar = document.getElementById('itemsets_progress_bar');
  const progressText = progressBar?.querySelector('.progress');
  const logContainer = document.getElementById('cl_progress');
  const mainView = document.getElementById('main_view');
  const statusView = document.getElementById('status_view');
  const doneView = document.getElementById('done_view');

  if (importBtn) importBtn.classList.add('loading', 'disabled');
  if (processLog) processLog.classList.remove('hidden');
  if (mainView) mainView.classList.add('hidden');
  if (statusView) statusView.classList.remove('hidden');
  if (doneView) doneView.classList.add('hidden');

  // Reset log
  if (logContainer) logContainer.innerHTML = '';
  if (progressBar) progressBar.dataset.percent = 0;
  if (progressText) progressText.textContent = '0%';

  try {
    const sources = getSelectedSources();
    const options = getOptions();
    const path = document.getElementById('install_path')?.value;

    if (!path) {
      throw new Error('League of Legends path not selected');
    }

    if (sources.length === 0) {
      throw new Error('No sources selected');
    }

    addToLog('Starting import...', 'info');

    const result = await tauriApi.importBuilds(sources, options, path);

    if (result.success) {
      addToLog(`Import complete! ${result.builds_imported} builds imported.`, 'success');
      if (statusView) statusView.classList.add('hidden');
      if (doneView) doneView.classList.remove('hidden');
    } else {
      addToLog(`Import failed: ${result.error}`, 'error');
      if (mainView) mainView.classList.remove('hidden');
      if (statusView) statusView.classList.add('hidden');
    }
  } catch (error) {
    addToLog(`Error: ${error.message || error}`, 'error');
    if (mainView) mainView.classList.remove('hidden');
    if (statusView) statusView.classList.add('hidden');
  } finally {
    if (importBtn) importBtn.classList.remove('loading', 'disabled');
  }
}

/**
 * Delete item sets
 */
async function deleteItemSets() {
  const deleteBtn = document.getElementById('delete_btn');
  if (deleteBtn) deleteBtn.classList.add('loading', 'disabled');

  try {
    const path = document.getElementById('install_path')?.value;
    if (!path) throw new Error('League of Legends path not selected');

    const result = await tauriApi.deleteBuilds(path);

    if (result.success) {
      alert(`Deleted ${result.builds_deleted} builds.`);
    } else {
      alert(`Failed to delete builds: ${result.error}`);
    }
  } catch (error) {
    alert(`Error: ${error.message || error}`);
  } finally {
    if (deleteBtn) deleteBtn.classList.remove('loading', 'disabled');
  }
}

/**
 * Save current UI preferences to backend
 */
async function saveCurrentPreferences() {
  const prefs = {
    install_path: document.getElementById('install_path')?.value || '',
    sr_source: getSelectedSources(),
    aram: document.getElementById('options_aram')?.checked || false,
    splititems: document.getElementById('options_splititems')?.checked || false,
    skillsformat: document.getElementById('options_skillsformat')?.checked || false,
    consumables: document.getElementById('options_consumables')?.checked || false,
    consumables_position: getDropdownValue('options_consumables_position') || 'beginning',
    trinkets: document.getElementById('options_trinkets')?.checked || false,
    trinkets_position: getDropdownValue('options_trinkets_position') || 'beginning',
    locksr: document.getElementById('options_locksr')?.checked || false,
    dontdeleteold: document.getElementById('options_dontdeleteold')?.checked || false,
    locale: document.querySelector('#locals_select input[name="locale"]')?.value || 'en',
  };

  try {
    await tauriApi.savePreferences(prefs);
    console.log('[BackendBridge] Preferences saved');
  } catch (error) {
    console.error('[BackendBridge] Failed to save preferences:', error);
  }
}

// Helpers

function getSelectedSources() {
  const input = document.getElementById('options_sr_source');
  return input && input.value ? input.value.split(',') : [];
}

function getOptions() {
  return {
    aram: document.getElementById('options_aram')?.checked,
    splititems: document.getElementById('options_splititems')?.checked,
    skillsformat: document.getElementById('options_skillsformat')?.checked,
    consumables: document.getElementById('options_consumables')?.checked,
    consumables_position: getDropdownValue('options_consumables_position'),
    trinkets: document.getElementById('options_trinkets')?.checked,
    trinkets_position: getDropdownValue('options_trinkets_position'),
    locksr: document.getElementById('options_locksr')?.checked,
    dontdeleteold: document.getElementById('options_dontdeleteold')?.checked,
  };
}

function getDropdownValue(id) {
  const menu = document.getElementById(id);
  if (!menu) return null;
  const activeItem = menu.querySelector('.item.active');
  if (activeItem) {
    return activeItem.classList.contains('beginning') ? 'beginning' : 'end';
  }
  return null;
}

function updateElementText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setPathStatus(message, tone = 'info') {
  const el = document.getElementById('input_msg');
  if (!el) return;
  el.textContent = message;
  el.className = '';
  el.classList.add(tone);
}

function applyPreferences(prefs) {
  if (prefs.install_path) {
    const el = document.getElementById('install_path');
    if (el) el.value = prefs.install_path;
  }

  const checkboxMap = {
    options_aram: prefs.aram,
    options_splititems: prefs.splititems,
    options_skillsformat: prefs.skillsformat,
    options_consumables: prefs.consumables,
    options_trinkets: prefs.trinkets,
    options_locksr: prefs.locksr,
    options_dontdeleteold: prefs.dontdeleteold,
  };

  Object.entries(checkboxMap).forEach(([id, value]) => {
    const checkbox = document.getElementById(id);
    if (checkbox) checkbox.checked = Boolean(value);
  });

  if (prefs.consumables_position) {
    const menu = document.getElementById('options_consumables_position');
    if (menu) {
      menu.querySelectorAll('.item').forEach(item => {
        item.classList.toggle(
          'active',
          item.classList.contains(prefs.consumables_position === 'end' ? 'end' : 'beginning')
        );
      });
    }
  }

  if (prefs.trinkets_position) {
    const menu = document.getElementById('options_trinkets_position');
    if (menu) {
      menu.querySelectorAll('.item').forEach(item => {
        item.classList.toggle(
          'active',
          item.classList.contains(prefs.trinkets_position === 'end' ? 'end' : 'beginning')
        );
      });
    }
  }

  if (Array.isArray(prefs.sr_source)) {
    const sourcesInput = document.getElementById('options_sr_source');
    if (sourcesInput) {
      sourcesInput.value = prefs.sr_source.join(',');
    }
    const sourcesMenu = document.querySelector('.rift_source .menu');
    const triggerText = document.querySelector('.rift_source button .default.text');
    if (sourcesMenu) {
      const selectedNames = [];
      sourcesMenu.querySelectorAll('.item').forEach(item => {
        const isActive = prefs.sr_source.includes(item.dataset.value);
        item.classList.toggle('active', isActive);
        if (isActive) {
          selectedNames.push(item.dataset.name || item.dataset.value);
        }
      });
      if (triggerText) {
        if (selectedNames.length === 0) {
          triggerText.textContent = triggerText.dataset.default || triggerText.textContent;
        } else if (selectedNames.length <= 3) {
          triggerText.textContent = selectedNames.join(', ');
        } else {
          triggerText.textContent = `${selectedNames.length}x`;
        }
      }
    }
  }
}

function updateProgress(source, status, count) {
  const logContainer = document.getElementById('cl_progress');
  if (!logContainer) return;

  let msg = '';
  if (status === 'fetching') {
    msg = `Fetching builds from ${source}...`;
  } else if (status === 'writing') {
    msg = `Writing builds for ${source} (${count})...`;
  } else if (status === 'complete') {
    msg = `Finished ${source} (${count} builds).`;
  }

  if (msg) addToLog(msg, 'info');
}

function addToLog(message, type) {
  const logContainer = document.getElementById('cl_progress');
  if (!logContainer) return;

  const div = document.createElement('div');
  div.className = `log-item ${type} text-sm mb-1 text-slate-200`;
  div.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;

  if (type === 'error') div.classList.add('text-red-400');
  if (type === 'success') div.classList.add('text-green-400');

  logContainer.appendChild(div);
  logContainer.scrollTop = logContainer.scrollHeight;
}

// Export default object for compatibility with dynamic import
export default {
  initBackend,
  browseInstallPath,
  importItemSets,
  deleteItemSets,
  saveCurrentPreferences,
};

// Locale syncing helper (front-only, to mirror saved preferences)
function syncLocale(locale) {
  if (!locale) return;
  const localeInput = document.querySelector('#locals_select input[name="locale"]');
  const localeFlag = document.querySelector('#locale_flag');
  const localeItems = document.querySelectorAll('#locals_select .item');

  if (localeInput) localeInput.value = locale;
  if (localeFlag) {
    localeFlag.className = 'flag-icon';
    localeFlag.textContent = getFlagEmoji(locale);
  }
  localeItems.forEach(item => {
    if (item.dataset.value === locale) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

function getFlagEmoji(code) {
  const map = {
    en: getUnicodeFlagIcon('GB'),
    fr: getUnicodeFlagIcon('FR'),
    de: getUnicodeFlagIcon('DE'),
    es: getUnicodeFlagIcon('ES'),
    it: getUnicodeFlagIcon('IT'),
    pt: getUnicodeFlagIcon('PT'),
    'pt-BR': getUnicodeFlagIcon('BR'),
    ru: getUnicodeFlagIcon('RU'),
    pl: getUnicodeFlagIcon('PL'),
    tr: getUnicodeFlagIcon('TR'),
    vi: getUnicodeFlagIcon('VN'),
    zh: getUnicodeFlagIcon('CN'),
    'zh-CN': getUnicodeFlagIcon('CN'),
    'zh-TW': getUnicodeFlagIcon('TW'),
    ko: getUnicodeFlagIcon('KR'),
    ja: getUnicodeFlagIcon('JP'),
    ar: getUnicodeFlagIcon('SA'),
    id: getUnicodeFlagIcon('ID'),
    ms: getUnicodeFlagIcon('MY'),
    nl: getUnicodeFlagIcon('NL'),
    sv: getUnicodeFlagIcon('SE'),
    fi: getUnicodeFlagIcon('FI'),
    no: getUnicodeFlagIcon('NO'),
    da: getUnicodeFlagIcon('DK'),
    cs: getUnicodeFlagIcon('CZ'),
    sk: getUnicodeFlagIcon('SK'),
    sl: getUnicodeFlagIcon('SI'),
    hr: getUnicodeFlagIcon('HR'),
    sr: getUnicodeFlagIcon('RS'),
    bg: getUnicodeFlagIcon('BG'),
    hu: getUnicodeFlagIcon('HU'),
    el: getUnicodeFlagIcon('GR'),
    he: getUnicodeFlagIcon('IL'),
    hi: getUnicodeFlagIcon('IN'),
    th: getUnicodeFlagIcon('TH'),
    bs: getUnicodeFlagIcon('BA'),
    ca: getUnicodeFlagIcon('ES'),
    ka: getUnicodeFlagIcon('GE'),
    km: getUnicodeFlagIcon('KH'),
    lt: getUnicodeFlagIcon('LT'),
    lv: getUnicodeFlagIcon('LV'),
    ro: getUnicodeFlagIcon('RO'),
  };
  return map[code] || '❓';
}
