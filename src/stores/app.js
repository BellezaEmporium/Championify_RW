import { writable, derived } from 'svelte/store';

/**
 * Preferences structure matching Rust backend PreferencesUI
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

// Core application state - preferences
export const locale = writable('en');
export const installPath = writable('');
export const selectedSources = writable([]);
export const aram = writable(false);
export const splititems = writable(false);
export const skillsformat = writable(false);
export const consumables = writable(true);
export const consumablesPosition = writable('beginning');
export const trinkets = writable(true);
export const trinketsPosition = writable('beginning');
export const locksr = writable(false);
export const dontdeleteold = writable(false);

// Core application state - runtime
export const browseTitle = writable('');
export const sourcesInfo = writable([]);
export const lolVersion = writable('');
export const sourceVersions = writable({});
export const importProgress = writable(0);
export const statusLogs = writable([]);
export const undefinedBuilds = writable([]);
export const isImporting = writable(false);
export const platform = writable('');
export const errorMessage = writable('');

// Derived stores
export const selectedSourcesArray = derived(selectedSources, $selectedSources =>
  Array.isArray($selectedSources) ? $selectedSources : []
);

/**
 * Load preferences into store
 * @param {PreferencesUI} prefs
 */
export function loadPreferencesIntoStore(prefs) {
  if (!prefs) return;

  locale.set(prefs.locale || 'en');
  installPath.set(prefs.install_path || '');
  selectedSources.set(Array.isArray(prefs.sr_source) ? prefs.sr_source : []);
  aram.set(!!prefs.aram);
  splititems.set(!!prefs.splititems);
  skillsformat.set(!!prefs.skillsformat);
  consumables.set(!!prefs.consumables);
  consumablesPosition.set(prefs.consumables_position || 'beginning');
  trinkets.set(!!prefs.trinkets);
  trinketsPosition.set(prefs.trinkets_position || 'beginning');
  locksr.set(!!prefs.locksr);
  dontdeleteold.set(!!prefs.dontdeleteold);
}

/**
 * Get current preferences from store
 * @returns {PreferencesUI}
 */
export function getPreferencesFromStore() {
  let result = {};

  locale.subscribe(v => (result.locale = v))();
  installPath.subscribe(v => (result.install_path = v))();
  selectedSources.subscribe(v => (result.sr_source = v))();
  aram.subscribe(v => (result.aram = v))();
  splititems.subscribe(v => (result.splititems = v))();
  skillsformat.subscribe(v => (result.skillsformat = v))();
  consumables.subscribe(v => (result.consumables = v))();
  consumablesPosition.subscribe(v => (result.consumables_position = v))();
  trinkets.subscribe(v => (result.trinkets = v))();
  trinketsPosition.subscribe(v => (result.trinkets_position = v))();
  locksr.subscribe(v => (result.locksr = v))();
  dontdeleteold.subscribe(v => (result.dontdeleteold = v))();

  return result;
}

// Initialize browse title based on platform
export function initBrowseTitle(platformName) {
  const title =
    platformName === 'darwin'
      ? 'Select League of Legends.app'
      : 'Select League of Legends directory';
  browseTitle.set(title);
  platform.set(platformName);
}

// Helper functions to update store
export function updateSourceVersion(sourceId, version) {
  sourceVersions.update(versions => ({
    ...versions,
    [sourceId]: version,
  }));
}

export function setSelectedSources(sources) {
  if (Array.isArray(sources)) {
    selectedSources.set(sources.filter(Boolean));
  } else if (typeof sources === 'string') {
    selectedSources.set(sources.split(',').filter(Boolean));
  }
}

// Reset functions for view transitions
export function resetMainView() {
  importProgress.set(0);
  statusLogs.set([]);
  isImporting.set(false);
}

export function resetCompleteView() {
  // Sort and format undefined builds for display
  undefinedBuilds.update(builds => builds.sort((a, b) => a.source.localeCompare(b.source)));
}
