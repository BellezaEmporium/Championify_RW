/**
 * UI Interactions Module
 * Handles all interactive elements: dropdowns, modals, tooltips, window controls
 */

const cleanupFns = [];
let activeTooltip = null;
const fallbackTranslator = key => key;

/**
 * Initialize all UI interactions
 */
export function initUI({ t, onLocaleChange, locale } = {}) {
  teardownUI();

  const translator = typeof t === 'function' ? t : fallbackTranslator;
  const currentLocale = locale || 'en';

  initWindowControls();
  initDropdowns(translator, onLocaleChange, currentLocale);
  initModals();
  initTooltips();
  initDefaultValues(translator, currentLocale);
  initBackendConnections();
  console.log('UI interactions initialized');
}

export function teardownUI() {
  while (cleanupFns.length) {
    const fn = cleanupFns.pop();
    try {
      fn();
    } catch (err) {
      console.warn('[UI] Failed to clean up listener', err);
    }
  }

  if (activeTooltip) {
    activeTooltip.remove();
    activeTooltip = null;
  }
}

function addListener(target, event, handler, options) {
  if (!target || typeof target.addEventListener !== 'function') return;
  target.addEventListener(event, handler, options);
  cleanupFns.push(() => {
    try {
      target.removeEventListener(event, handler, options);
    } catch (err) {
      console.warn('[UI] Failed to remove listener', err);
    }
  });
}

/**
 * Initialize Tauri window controls (minimize, maximize, close)
 */
async function initWindowControls() {
  if (typeof globalThis !== 'undefined' && !globalThis.isTauri) {
    return;
  }

  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const appWindow = getCurrentWindow();

    // Minimize button
    const minimizeBtn = document.getElementById('titlebar-minimize');
    if (minimizeBtn) {
      addListener(minimizeBtn, 'click', e => {
        e.preventDefault();
        e.stopPropagation();
        appWindow.minimize();
      });
    }

    // Maximize/Restore button
    const maximizeBtn = document.getElementById('titlebar-maximize');
    if (maximizeBtn) {
      addListener(maximizeBtn, 'click', async e => {
        e.preventDefault();
        e.stopPropagation();
        const isMaximized = await appWindow.isMaximized();
        if (isMaximized) {
          appWindow.unmaximize();
        } else {
          appWindow.maximize();
        }
      });
    }

    // Close button
    const closeBtn = document.getElementById('titlebar-close');
    if (closeBtn) {
      addListener(closeBtn, 'click', e => {
        e.preventDefault();
        e.stopPropagation();
        appWindow.close();
      });
    }

    console.log('[UI] Window controls initialized');
  } catch (error) {
    console.warn('[UI] Failed to initialize window controls (not in Tauri context?):', error);
  }
}

/**
 * Connect UI events to backend functions
 */
function initBackendConnections() {
  // Import backend bridge dynamically to avoid circular dependencies
  import('./backend-bridge.js')
    .then(({ default: bridge }) => {
      // Browse button
      const browseBtn = document.getElementById('browse');
      if (browseBtn) {
        addListener(browseBtn, 'click', async () => {
          await bridge.browseInstallPath();
        });
      }

      // Import button
      const importBtn = document.getElementById('import_btn');
      if (importBtn) {
        addListener(importBtn, 'click', async () => {
          await bridge.importItemSets();
        });
      }

      // Delete confirmation event (already set up in initModals)
      addListener(document, 'deleteConfirmed', async () => {
        await bridge.deleteItemSets();
      });

      // Save preferences when checkboxes change
      const checkboxIds = [
        'options_aram',
        'options_splititems',
        'options_skillsformat',
        'options_consumables',
        'options_trinkets',
        'options_locksr',
        'options_dontdeleteold',
      ];

      checkboxIds.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
          addListener(checkbox, 'change', async () => {
            await bridge.saveCurrentPreferences();
          });
        }
      });

      const backBtn = document.getElementById('back_btn');
      if (backBtn) {
        addListener(backBtn, 'click', () => {
          const mainView = document.getElementById('main_view');
          const statusView = document.getElementById('status_view');
          const doneView = document.getElementById('done_view');
          if (mainView) mainView.classList.remove('hidden');
          if (statusView) statusView.classList.add('hidden');
          if (doneView) doneView.classList.add('hidden');
        });
      }

      const startLolBtn = document.getElementById('start_lol_btn');
      if (startLolBtn) {
        addListener(startLolBtn, 'click', () => {
          // Placeholder hook: could be wired to tauri shell launch
          const mainView = document.getElementById('main_view');
          const doneView = document.getElementById('done_view');
          if (mainView) mainView.classList.remove('hidden');
          if (doneView) doneView.classList.add('hidden');
        });
      }
    })
    .catch(err => {
      console.error('Failed to connect backend:', err);
    });
}

/**
 * Initialize default values on page load
 */
function initDefaultValues(t, locale = 'en') {
  const translate = typeof t === 'function' ? t : fallbackTranslator;
  const normalized = locale || 'en';
  const defaultItem = document.querySelector(`#locals_select .item[data-value="${normalized}"]`);
  updateLocaleFlag(normalized);
  if (defaultItem) defaultItem.classList.add('active');

  const sourcesButton = document.querySelector('.rift_source button .default.text');
  if (sourcesButton) {
    const defaultLabel = sourcesButton.textContent || translate('select_sources');
    sourcesButton.dataset.default = defaultLabel;
    sourcesButton.textContent = defaultLabel;
  }
}

function updateLocaleFlag(value) {
  const localeFlag = document.querySelector('#locale_flag');
  if (!localeFlag) return;
  localeFlag.className = 'flag-icon';
  localeFlag.textContent = getFlagEmoji(value);
}

/**
 * Dropdown Management
 * Handles language selector, sources, and position dropdowns
 */
function initDropdowns(t, onLocaleChange, locale = 'en') {
  const translate = typeof t === 'function' ? t : fallbackTranslator;
  // Close all dropdowns when clicking outside
  addListener(document, 'click', e => {
    if (!e.target.closest('.relative')) {
      closeAllDropdowns();
    }
  });

  // Language selector dropdown
  const localeButton = document.querySelector('#locals_select button');
  const localeMenu = document.querySelector('#locals_select .menu');
  const localeInput = document.querySelector('#locals_select input[name="locale"]');
  const resolvedLocale = locale || localeInput?.value || 'en';

  if (localeInput) {
    localeInput.value = resolvedLocale;
  }
  updateLocaleFlag(resolvedLocale);

  if (localeButton && localeMenu) {
    addListener(localeButton, 'click', e => {
      e.stopPropagation();
      toggleDropdown(localeMenu);
    });

    // Handle language selection
    const localeItems = localeMenu.querySelectorAll('.item');
    localeItems.forEach(item => {
      if (item.dataset.value === resolvedLocale) {
        item.classList.add('active');
      }

      addListener(item, 'click', e => {
        e.stopPropagation();
        const value = item.dataset.value;
        // Update selected locale
        if (localeInput) localeInput.value = value;
        updateLocaleFlag(value);

        // Update active state
        localeItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        // Close dropdown
        closeDropdown(localeMenu);

        // Emit custom event for language change
        document.dispatchEvent(new CustomEvent('localeChange', { detail: { locale: value } }));
        if (onLocaleChange) {
          onLocaleChange(value);
        }
      });
    });
  }

  // Sources dropdown (Summoner's Rift)
  const sourcesButton = document.querySelector('.rift_source button');
  const sourcesMenu = document.querySelector('.rift_source .menu');
  const sourcesInput = document.querySelector('#options_sr_source');

  if (sourcesButton && sourcesMenu) {
    addListener(sourcesButton, 'click', e => {
      e.stopPropagation();
      toggleDropdown(sourcesMenu);
    });

    // Handle source selection (multi-select)
    const sourceItems = sourcesMenu.querySelectorAll('.item');
    sourceItems.forEach(item => {
      addListener(item, 'click', e => {
        e.stopPropagation();
        // value is tracked via active class on item

        // Toggle active state
        item.classList.toggle('active');

        // Update hidden input with selected values
        const selectedItems = Array.from(sourcesMenu.querySelectorAll('.item.active'));
        const selectedSources = selectedItems.map(i => i.dataset.value);
        const selectedNames = selectedItems.map(i => i.dataset.name || i.dataset.value);

        if (sourcesInput) {
          sourcesInput.value = selectedSources.join(',');
        }

        // Update button text
        const buttonText = sourcesButton.querySelector('.default.text');
        if (buttonText) {
          if (selectedSources.length === 0) {
            const fallbackText = translate('select_sources');
            const safeDefault =
              fallbackText && fallbackText !== 'select_sources' ? fallbackText : 'Select sources';
            buttonText.textContent = buttonText.dataset.default || safeDefault;
          } else if (selectedNames.length <= 3) {
            buttonText.textContent = selectedNames.join(', ');
          } else {
            const selectedLabel = translate('sources_selected', { count: selectedSources.length });
            buttonText.textContent =
              selectedLabel && selectedLabel !== 'sources_selected'
                ? selectedLabel
                : `${selectedSources.length} source(s) selected`;
          }
        }
      });
    });
  }

  // Position dropdowns (consumables & trinkets)
  const positionDropdowns = [
    {
      button: document.querySelector('#options_consumables_position')?.previousElementSibling,
      menu: document.querySelector('#options_consumables_position'),
    },
    {
      button: document.querySelector('#options_trinkets_position')?.previousElementSibling,
      menu: document.querySelector('#options_trinkets_position'),
    },
  ];

  positionDropdowns.forEach(({ button, menu }) => {
    if (button && menu) {
      addListener(button, 'click', e => {
        e.stopPropagation();
        toggleDropdown(menu);
      });

      // Handle position selection
      const items = menu.querySelectorAll('.item');
      items.forEach(item => {
        addListener(item, 'click', e => {
          e.stopPropagation();

          // Update active state
          items.forEach(i => i.classList.remove('active'));
          item.classList.add('active');

          // Close dropdown
          closeDropdown(menu);

          // Store selection (you can emit event or update data)
          const position = item.classList.contains('beginning') ? 'beginning' : 'end';
          console.log(`Position selected: ${position} for ${menu.id}`);
        });
      });
    }
  });
}

function getFlagEmoji(code) {
  const map = {
    en: '\u{1F1EC}\u{1F1E7}',
    fr: '\u{1F1EB}\u{1F1F7}',
    de: '\u{1F1E9}\u{1F1EA}',
    es: '\u{1F1EA}\u{1F1F8}',
    it: '\u{1F1EE}\u{1F1F9}',
    pt: '\u{1F1F5}\u{1F1F9}',
    'pt-BR': '\u{1F1E7}\u{1F1F7}',
    ru: '\u{1F1F7}\u{1F1FA}',
    pl: '\u{1F1F5}\u{1F1F1}',
    tr: '\u{1F1F9}\u{1F1F7}',
    vi: '\u{1F1FB}\u{1F1F3}',
    zh: '\u{1F1E8}\u{1F1F3}',
    'zh-CN': '\u{1F1E8}\u{1F1F3}',
    'zh-TW': '\u{1F1F9}\u{1F1FC}',
    ko: '\u{1F1F0}\u{1F1F7}',
    ja: '\u{1F1EF}\u{1F1F5}',
    ar: '\u{1F1EA}\u{1F1EC}',
    id: '\u{1F1EE}\u{1F1E9}',
    ms: '\u{1F1F2}\u{1F1FE}',
    nl: '\u{1F1F3}\u{1F1F1}',
    sv: '\u{1F1F8}\u{1F1EA}',
    fi: '\u{1F1EB}\u{1F1EE}',
    no: '\u{1F1F3}\u{1F1F4}',
    da: '\u{1F1E9}\u{1F1F0}',
    cs: '\u{1F1E8}\u{1F1FF}',
    sk: '\u{1F1F8}\u{1F1F0}',
    sl: '\u{1F1F8}\u{1F1EE}',
    hr: '\u{1F1ED}\u{1F1F7}',
    sr: '\u{1F1F7}\u{1F1F8}',
    bg: '\u{1F1E7}\u{1F1EC}',
    hu: '\u{1F1ED}\u{1F1FA}',
    el: '\u{1F1EC}\u{1F1F7}',
    he: '\u{1F1EE}\u{1F1F1}',
    hi: '\u{1F1EE}\u{1F1F3}',
    th: '\u{1F1F9}\u{1F1ED}',
    bs: '\u{1F1E7}\u{1F1E6}',
    ca: '\u{1F1EA}\u{1F1F8}',
    ka: '\u{1F1EC}\u{1F1EA}',
    km: '\u{1F1F0}\u{1F1ED}',
    lt: '\u{1F1F1}\u{1F1F9}',
    lv: '\u{1F1F1}\u{1F1FB}',
    ro: '\u{1F1F7}\u{1F1F4}',
  };
  return map[code] || '\u{1F3F3}\uFE0F';
}

/**
 * Toggle dropdown visibility
 */
function toggleDropdown(menu) {
  if (!menu) return;

  const isHidden = menu.classList.contains('hidden');

  // Close all other dropdowns first
  closeAllDropdowns();

  // Toggle this dropdown
  if (isHidden) {
    menu.classList.remove('hidden');
  } else {
    menu.classList.add('hidden');
  }
}

/**
 * Close a specific dropdown
 */
function closeDropdown(menu) {
  if (!menu) return;
  menu.classList.add('hidden');
}

/**
 * Close all open dropdowns
 */
function closeAllDropdowns() {
  const allMenus = document.querySelectorAll('.menu');
  allMenus.forEach(menu => {
    if (!menu.classList.contains('hidden')) {
      menu.classList.add('hidden');
    }
  });
}

/**
 * Modal Management
 * Handles show/hide for confirmation modals
 */
function initModals() {
  const modal = document.querySelector('#delete_confirmation_modal');
  const modalBackdrop = document.querySelector('.modal_backdrop');
  const cancelButton = document.querySelector('#cancel_delete');
  const confirmButton = document.querySelector('#confirm_delete');
  const deleteButton = document.querySelector('#delete_btn');

  // Show modal when delete button is clicked
  if (deleteButton && modal) {
    addListener(deleteButton, 'click', () => {
      showModal(modal);
    });
  }

  // Hide modal on cancel
  if (cancelButton && modal) {
    addListener(cancelButton, 'click', () => {
      hideModal(modal);
    });
  }

  // Hide modal on backdrop click
  if (modalBackdrop && modal) {
    addListener(modalBackdrop, 'click', () => {
      hideModal(modal);
    });
  }

  // Confirm delete
  if (confirmButton) {
    addListener(confirmButton, 'click', () => {
      // Emit custom event for delete confirmation
      document.dispatchEvent(new CustomEvent('deleteConfirmed'));
      hideModal(modal);
    });
  }
}

/**
 * Show modal
 */
function showModal(modal) {
  if (!modal) return;
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden'; // Prevent scrolling
}

/**
 * Hide modal
 */
function hideModal(modal) {
  if (!modal) return;
  modal.classList.add('hidden');
  document.body.style.overflow = ''; // Restore scrolling
}

/**
 * Tooltip Management
 * Simple hover tooltips for options
 */
function initTooltips() {
  const tooltips = document.querySelectorAll('.options_tooltip');

  tooltips.forEach(tooltip => {
    addListener(tooltip, 'mouseenter', _e => {
      const content = tooltip.dataset.content;
      if (!content) return;

      if (activeTooltip) {
        activeTooltip.remove();
        activeTooltip = null;
      }

      // Create tooltip element
      const tooltipEl = document.createElement('div');
      tooltipEl.className =
        'absolute z-50 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl border border-white/10 max-w-xs whitespace-normal';
      tooltipEl.textContent = content;
      tooltipEl.id = 'active-tooltip';

      // Position tooltip
      document.body.appendChild(tooltipEl);
      activeTooltip = tooltipEl;

      const rect = tooltip.getBoundingClientRect();
      tooltipEl.style.position = 'fixed';
      tooltipEl.style.left = rect.left + 'px';
      tooltipEl.style.top = rect.bottom + 8 + 'px';
    });

    addListener(tooltip, 'mouseleave', () => {
      if (activeTooltip) {
        activeTooltip.remove();
        activeTooltip = null;
      }
    });
  });
}

/**
 * Export event listener helpers
 */
export function onLocaleChange(callback) {
  addListener(document, 'localeChange', e => callback(e.detail.locale));
}

export function onDeleteConfirmed(callback) {
  addListener(document, 'deleteConfirmed', callback);
}
