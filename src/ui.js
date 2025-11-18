/**
 * UI Interactions Module
 * Handles all interactive elements: dropdowns, modals, tooltips
 */

/**
 * Initialize all UI interactions
 */
export function initUI() {
  initDropdowns();
  initModals();
  initTooltips();
  initDefaultValues();
  initBackendConnections();
  console.log('UI interactions initialized');
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
        browseBtn.addEventListener('click', async () => {
          await bridge.browseInstallPath();
        });
      }

      // Import button
      const importBtn = document.getElementById('import_btn');
      if (importBtn) {
        importBtn.addEventListener('click', async () => {
          await bridge.importItemSets();
        });
      }

      // Delete confirmation event (already set up in initModals)
      document.addEventListener('deleteConfirmed', async () => {
        await bridge.deleteItemSets();
      });

      // Locale change event (already set up in initDropdowns)
      document.addEventListener('localeChange', async e => {
        // Save preference when locale changes
        await bridge.saveCurrentPreferences();
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
          checkbox.addEventListener('change', async () => {
            await bridge.saveCurrentPreferences();
          });
        }
      });
    })
    .catch(err => {
      console.error('Failed to connect backend:', err);
    });
}

/**
 * Initialize default values on page load
 */
function initDefaultValues() {
  // Set default locale flag to English
  const localeFlag = document.querySelector('#locale_flag');
  const defaultItem = document.querySelector('#locals_select .item[data-value="en"]');

  if (localeFlag && defaultItem) {
    const flagIcon = defaultItem.querySelector('.flag');
    if (flagIcon) {
      localeFlag.className = flagIcon.className;
    }
    defaultItem.classList.add('active');
  }

  // Set default sources button text
  const sourcesButton = document.querySelector('.rift_source button .default.text');
  if (sourcesButton) {
    sourcesButton.dataset.default = sourcesButton.textContent;
  }
}

/**
 * Dropdown Management
 * Handles language selector, sources, and position dropdowns
 */
function initDropdowns() {
  // Close all dropdowns when clicking outside
  document.addEventListener('click', e => {
    if (!e.target.closest('.relative')) {
      closeAllDropdowns();
    }
  });

  // Language selector dropdown
  const localeButton = document.querySelector('#locals_select button');
  const localeMenu = document.querySelector('#locals_select .menu');
  const localeFlag = document.querySelector('#locale_flag');
  const localeInput = document.querySelector('#locals_select input[name="locale"]');

  if (localeButton && localeMenu) {
    localeButton.addEventListener('click', e => {
      e.stopPropagation();
      toggleDropdown(localeMenu);
    });

    // Handle language selection
    const localeItems = localeMenu.querySelectorAll('.item');
    localeItems.forEach(item => {
      item.addEventListener('click', e => {
        e.stopPropagation();
        const value = item.dataset.value;
        const flagIcon = item.querySelector('.flag');

        // Update selected locale
        if (localeInput) localeInput.value = value;
        if (localeFlag && flagIcon) {
          localeFlag.className = flagIcon.className;
        }

        // Update active state
        localeItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        // Close dropdown
        closeDropdown(localeMenu);

        // Emit custom event for language change
        document.dispatchEvent(new CustomEvent('localeChange', { detail: { locale: value } }));
      });
    });
  }

  // Sources dropdown (Summoner's Rift)
  const sourcesButton = document.querySelector('.rift_source button');
  const sourcesMenu = document.querySelector('.rift_source .menu');
  const sourcesInput = document.querySelector('#options_sr_source');

  if (sourcesButton && sourcesMenu) {
    sourcesButton.addEventListener('click', e => {
      e.stopPropagation();
      toggleDropdown(sourcesMenu);
    });

    // Handle source selection (multi-select)
    const sourceItems = sourcesMenu.querySelectorAll('.item');
    sourceItems.forEach(item => {
      item.addEventListener('click', e => {
        e.stopPropagation();
        const value = item.dataset.value;

        // Toggle active state
        item.classList.toggle('active');

        // Update hidden input with selected values
        const selectedSources = Array.from(sourcesMenu.querySelectorAll('.item.active')).map(
          i => i.dataset.value
        );

        if (sourcesInput) {
          sourcesInput.value = selectedSources.join(',');
        }

        // Update button text
        const buttonText = sourcesButton.querySelector('.default.text');
        if (buttonText) {
          if (selectedSources.length === 0) {
            buttonText.textContent = buttonText.dataset.default || 'Select sources';
          } else {
            buttonText.textContent = `${selectedSources.length} source(s) selected`;
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
      button.addEventListener('click', e => {
        e.stopPropagation();
        toggleDropdown(menu);
      });

      // Handle position selection
      const items = menu.querySelectorAll('.item');
      items.forEach(item => {
        item.addEventListener('click', e => {
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
    deleteButton.addEventListener('click', () => {
      showModal(modal);
    });
  }

  // Hide modal on cancel
  if (cancelButton && modal) {
    cancelButton.addEventListener('click', () => {
      hideModal(modal);
    });
  }

  // Hide modal on backdrop click
  if (modalBackdrop && modal) {
    modalBackdrop.addEventListener('click', () => {
      hideModal(modal);
    });
  }

  // Confirm delete
  if (confirmButton) {
    confirmButton.addEventListener('click', () => {
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
    tooltip.addEventListener('mouseenter', e => {
      const content = tooltip.dataset.content;
      if (!content) return;

      // Create tooltip element
      const tooltipEl = document.createElement('div');
      tooltipEl.className =
        'absolute z-50 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl border border-white/10 max-w-xs whitespace-normal';
      tooltipEl.textContent = content;
      tooltipEl.id = 'active-tooltip';

      // Position tooltip
      document.body.appendChild(tooltipEl);

      const rect = tooltip.getBoundingClientRect();
      tooltipEl.style.position = 'fixed';
      tooltipEl.style.left = rect.left + 'px';
      tooltipEl.style.top = rect.bottom + 8 + 'px';
    });

    tooltip.addEventListener('mouseleave', () => {
      const tooltipEl = document.getElementById('active-tooltip');
      if (tooltipEl) {
        tooltipEl.remove();
      }
    });
  });
}

/**
 * Export event listener helpers
 */
export function onLocaleChange(callback) {
  document.addEventListener('localeChange', e => callback(e.detail.locale));
}

export function onDeleteConfirmed(callback) {
  document.addEventListener('deleteConfirmed', callback);
}
