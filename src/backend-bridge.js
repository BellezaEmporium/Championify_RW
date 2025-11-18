/**
 * Backend Bridge Module
 * Connects the frontend UI (src/ui.js) with backend logic (backend/src/)
 *
 * This module serves as an adapter layer between the modern Marko/Tailwind frontend
 * and the existing Node.js backend that handles:
 * - Item set downloads
 * - File operations
 * - API calls to sources (ProBuilds, u.gg, OP.GG, etc.)
 * - Preferences management
 */

import championify from '../backend/src/championify.js';
import preferences from '../backend/src/preferences.js';
import store from '../backend/src/store.js';
import T from '../backend/src/translate.js';
import pathManager from '../backend/src/path_manager.js';

/**
 * Initialize backend with user preferences
 */
export async function initBackend() {
  try {
    // Load saved preferences
    const prefs = preferences.load();
    if (prefs) {
      console.log('Loaded preferences:', prefs);
      // Apply preferences to the UI
      applyPreferencesToUI(prefs);
    }

    // Load versions
    await loadVersions();

    console.log('Backend initialized');
  } catch (error) {
    console.error('Failed to initialize backend:', error);
  }
}

/**
 * Apply saved preferences to UI elements
 */
function applyPreferencesToUI(prefs) {
  // Install path
  if (prefs.install_path) {
    const pathInput = document.getElementById('install_path');
    if (pathInput) pathInput.value = prefs.install_path;
  }

  // Locale
  if (prefs.locale) {
    document.dispatchEvent(
      new CustomEvent('localeChange', {
        detail: { locale: prefs.locale },
      })
    );
  }

  // Options checkboxes
  const checkboxOptions = [
    'aram',
    'splititems',
    'skillsformat',
    'consumables',
    'trinkets',
    'locksr',
    'dontdeleteold',
  ];

  checkboxOptions.forEach(option => {
    const checkbox = document.getElementById(`options_${option}`);
    if (checkbox && typeof prefs[option] !== 'undefined') {
      checkbox.checked = prefs[option];
    }
  });

  // Selected sources
  if (prefs.sr_source) {
    const sourcesInput = document.getElementById('options_sr_source');
    if (sourcesInput) sourcesInput.value = prefs.sr_source;

    // Update UI to show selected sources
    const sourceItems = document.querySelectorAll('.rift_source .item');
    sourceItems.forEach(item => {
      const value = item.dataset.value;
      if (prefs.sr_source.includes(value)) {
        item.classList.add('active');
      }
    });
  }

  // Positions
  if (prefs.consumables_position) {
    const position = prefs.consumables_position;
    const items = document.querySelectorAll('#options_consumables_position .item');
    items.forEach(item => {
      if (item.classList.contains(position)) {
        item.classList.add('active');
      }
    });
  }

  if (prefs.trinkets_position) {
    const position = prefs.trinkets_position;
    const items = document.querySelectorAll('#options_trinkets_position .item');
    items.forEach(item => {
      if (item.classList.contains(position)) {
        item.classList.add('active');
      }
    });
  }
}

/**
 * Browse for LoL installation directory
 */
export async function browseInstallPath() {
  try {
    // Use pathManager to find LoL path
    const lolPath = await pathManager.findInstallPath();

    if (lolPath) {
      const pathInput = document.getElementById('install_path');
      if (pathInput) pathInput.value = lolPath;

      // Update message
      updatePathMessage('green', T.t('sure_thats_league'));

      // Save preference
      await saveCurrentPreferences();

      return lolPath;
    }
  } catch (error) {
    console.error('Browse path error:', error);
    updatePathMessage('red', T.t('invalid_path'));
  }
}

/**
 * Update path input message
 */
function updatePathMessage(color, message) {
  const msgElement = document.getElementById('input_msg');
  if (msgElement) {
    msgElement.className = color;
    msgElement.textContent = message;
  }
}

/**
 * Load all versions (Riot, sources)
 */
export async function loadVersions() {
  try {
    // Get Riot version
    const riotVersion = await championify.getVersion();
    updateVersionDisplay('lol_version', riotVersion);

    // Get local version
    const localVersion = await getLocalVersion();
    updateVersionDisplay('local_version', localVersion || T.t('unknown'));

    // Get source versions (if sources are selected)
    // This would require calling each source's version endpoint
    // For now, mark as loading
    const sources = ['probuilds', 'ugg', 'opgg', 'koreanbuilds', 'trackergg'];
    sources.forEach(source => {
      updateVersionDisplay(`${source}_version`, T.t('loading'));
    });
  } catch (error) {
    console.error('Failed to load versions:', error);
  }
}

/**
 * Get local item sets version
 */
async function getLocalVersion() {
  // Implementation would check the local item sets for version info
  // This is a placeholder
  return store.get('local_version') || null;
}

/**
 * Update version display in UI
 */
function updateVersionDisplay(elementId, version) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = version;
  }
}

/**
 * Import item sets
 */
export async function importItemSets() {
  try {
    // Verify settings first
    const settings = collectSettings();
    const valid = await championify.verifySettings(settings);

    if (!valid) {
      showError(T.t('select_folder'));
      return;
    }

    // Show progress section
    showProgressSection();

    // Start import
    store.set('importing', true);
    await championify.run(settings);

    // Show completion
    showCompletionView();
  } catch (error) {
    console.error('Import error:', error);
    showError(error.message || T.t('something_broke'));
  } finally {
    store.set('importing', false);
  }
}

/**
 * Delete old item sets
 */
export async function deleteItemSets() {
  try {
    // Get install path
    const installPath = document.getElementById('install_path')?.value;

    if (!installPath) {
      showError(T.t('select_folder'));
      return;
    }

    // Show delete progress modal
    const deleteModal = document.getElementById('delete_notification');
    if (deleteModal) {
      deleteModal.classList.remove('hidden');
    }

    // Perform deletion
    await championify.delete(installPath);

    // Hide modal
    if (deleteModal) {
      deleteModal.classList.add('hidden');
    }

    // Update local version
    updateVersionDisplay('local_version', T.t('unknown'));

    console.log('Item sets deleted successfully');
  } catch (error) {
    console.error('Delete error:', error);
    showError(error.message || T.t('something_broke'));
  }
}

/**
 * Collect current settings from UI
 */
function collectSettings() {
  const settings = {
    install_path: document.getElementById('install_path')?.value || '',
    locale: store.get('locale') || 'en',
    aram: document.getElementById('options_aram')?.checked || false,
    splititems: document.getElementById('options_splititems')?.checked || false,
    skillsformat: document.getElementById('options_skillsformat')?.checked || false,
    consumables: document.getElementById('options_consumables')?.checked || false,
    trinkets: document.getElementById('options_trinkets')?.checked || false,
    locksr: document.getElementById('options_locksr')?.checked || false,
    dontdeleteold: document.getElementById('options_dontdeleteold')?.checked || false,
    sr_source: document.getElementById('options_sr_source')?.value || '',
  };

  // Get positions
  const consumablesPos = document.querySelector('#options_consumables_position .item.active');
  if (consumablesPos) {
    settings.consumables_position = consumablesPos.classList.contains('beginning')
      ? 'beginning'
      : 'end';
  }

  const trinketsPos = document.querySelector('#options_trinkets_position .item.active');
  if (trinketsPos) {
    settings.trinkets_position = trinketsPos.classList.contains('beginning') ? 'beginning' : 'end';
  }

  return settings;
}

/**
 * Save current preferences
 */
export async function saveCurrentPreferences() {
  try {
    const settings = collectSettings();
    await preferences.save(settings);
    console.log('Preferences saved');
  } catch (error) {
    console.error('Failed to save preferences:', error);
  }
}

/**
 * Show progress section
 */
function showProgressSection() {
  const mainView = document.getElementById('btns_versions');
  const progressView = document.getElementById('process_log');

  if (mainView) mainView.classList.add('hidden');
  if (progressView) progressView.classList.remove('hidden');
}

/**
 * Show completion view
 */
function showCompletionView() {
  const viewContainer = document.getElementById('view');
  if (!viewContainer) return;

  // This would require loading the complete.marko component
  // For now, just show a simple message
  viewContainer.innerHTML = `
    <div class="text-center py-12">
      <div class="text-4xl font-bold text-white mb-4">${T.t('done')}</div>
      <div class="text-slate-300 mb-8">${T.t('start_league')}</div>
    </div>
  `;
}

/**
 * Show error view
 */
function showError(message) {
  const viewContainer = document.getElementById('view');
  if (!viewContainer) return;

  // Show error in a modal or alert
  alert(message);
}

/**
 * Update progress bar
 */
export function updateProgress(percent, message) {
  const progressBar = document.getElementById('itemsets_progress_bar');
  const progressBarInner = progressBar?.querySelector('.bar');
  const progressText = progressBar?.querySelector('.progress');
  const progressLog = document.getElementById('cl_progress');

  if (progressBar) {
    progressBar.dataset.percent = percent;
  }

  if (progressBarInner) {
    progressBarInner.style.width = `${percent}%`;
  }

  if (progressText) {
    progressText.textContent = `${percent}%`;
  }

  if (progressLog && message) {
    const logEntry = document.createElement('div');
    logEntry.textContent = message;
    logEntry.className = 'text-sm text-slate-300 mb-1';
    progressLog.appendChild(logEntry);

    // Auto-scroll to bottom
    progressLog.scrollTop = progressLog.scrollHeight;
  }
}

/**
 * Export all functions
 */
export default {
  initBackend,
  browseInstallPath,
  loadVersions,
  importItemSets,
  deleteItemSets,
  saveCurrentPreferences,
  updateProgress,
};
