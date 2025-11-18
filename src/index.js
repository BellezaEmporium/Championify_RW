/**
 * Main Application Entry Point
 *
 * Translation System:
 * - Uses i18next (src/i18n.js) as the primary translation system
 * - Initializes i18next before mounting the Marko app
 * - Passes i18next.t function to all Marko components via input.t
 *
 * @see TRANSLATION_SYSTEM.md for documentation
 */

import './styles/app.css';
import Index from './components/index.marko';
import { initI18n } from './i18n.js';
import { initUI } from './ui.js';

// Import frontend-safe sources metadata
import sources_info from './sources.js';
// import version
import appVersion from './version.js';

// Async function to wait for i18n and then mount the app
async function startApp() {
  try {
    // Wait for i18n to be fully initialized
    const i18next = await initI18n();

    // Préparer les inputs nécessaires pour l'app
    const platform =
      window?.process?.platform ||
      (navigator.userAgent.includes('Windows')
        ? 'win32'
        : navigator.userAgent.includes('Mac')
          ? 'darwin'
          : 'linux');
    const viewKey = 'main';

    // Create a proper translation function bound to i18next
    const t = (key, options) => {
      if (!i18next || typeof i18next.t !== 'function') {
        console.warn('i18next not available, returning key:', key);
        return key;
      }
      return i18next.t(key, options);
    };

    const version = appVersion || 'dev';
    const donateUrl = 'https://github.com/BellezaEmporium/Championify_RW#donate';
    const githubUrl = 'https://github.com/BellezaEmporium';
    const sources = sources_info;

    // Mount the app avec les inputs nécessaires
    const app = Index.mount(
      {
        platform,
        view: viewKey,
        t,
        version,
        donateUrl,
        githubUrl,
        sources,
      },
      document.body,
      'afterbegin'
    );

    console.log('App mounted with i18n ready');

    // Initialize UI interactions and backend after DOM is ready
    setTimeout(async () => {
      initUI();
      const { default: backendBridge } = await import('./backend-bridge.js');
      await backendBridge.initBackend();
    }, 100);

    return app;
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
}

// Start the app
startApp();

export default null;
