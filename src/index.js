import './styles/app.css';
import Index from './components/index.marko';
import {
  createTranslator,
  detectInitialLocale,
  initI18n,
  persistLocalePreference,
  resolveLocale,
} from './i18n.js';
import { initUI, teardownUI } from './ui.js';
import sourcesInfo from './sources.js';
import appVersion from './version.js';
import backendBridge from './backend-bridge.js';

const donateUrl = 'https://github.com/BellezaEmporium/Championify_RW#donate';
const githubUrl = 'https://github.com/BellezaEmporium';
const viewKey = 'main';
const host = document.getElementById('app') || document.body;

let currentApp = null;
let currentLocale = null;
let currentI18n = null;
let renderPromise = null;

function detectPlatform() {
  if (typeof window === 'undefined') return 'linux';
  if (window?.process?.platform) return window.process.platform;
  if (navigator.userAgent.includes('Windows')) return 'win32';
  if (navigator.userAgent.includes('Mac')) return 'darwin';
  return 'linux';
}

async function renderApp(locale) {
  if (renderPromise) {
    await renderPromise;
  }

  renderPromise = (async () => {
    const i18n = await initI18n(locale);
    const translator = createTranslator(i18n);
    currentI18n = i18n;
    currentLocale = i18n.language;

    const input = {
      $global: { t: translator, i18n },
      platform: detectPlatform(),
      view: viewKey,
      version: appVersion || 'dev',
      donateUrl,
      githubUrl,
      sources: sourcesInfo,
      locale: currentLocale,
    };

    if (currentApp?.destroy) {
      currentApp.destroy();
    }

    host.innerHTML = '';
    currentApp = Index.mount(input, host, 'append');

    teardownUI();
    initUI({
      locale: currentLocale,
      t: translator,
      onLocaleChange: async nextLocale => {
        const resolved = resolveLocale({ preferredLocale: nextLocale });
        await persistLocalePreference(resolved);
        await renderApp(resolved);
      },
    });

    try {
      await backendBridge.initBackend();
    } catch (error) {
      console.warn('[BackendBridge] Failed to initialize backend:', error);
    }
  })();

  try {
    await renderPromise;
  } finally {
    renderPromise = null;
  }
}

async function startApp() {
  try {
    const initialLocale = await detectInitialLocale();
    await renderApp(initialLocale);
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
}

startApp();

export default null;
