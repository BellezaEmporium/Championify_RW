import i18next from 'i18next';
import { tauriApi } from './backend-bridge.js';

const translationModules = import.meta.glob('./translations/*.json', {
  eager: true,
  import: 'default',
});

const DEFAULT_LOCALE = 'en';
const resources = {};
const localeLookup = new Map();

for (const [path, mod] of Object.entries(translationModules)) {
  const locale = path.match(/\.\/translations\/(.+)\.json$/)?.[1];
  if (!locale || locale.startsWith('_')) continue;
  const payload = mod && typeof mod === 'object' && 'default' in mod ? mod.default : mod;
  resources[locale] = { translation: payload };
  localeLookup.set(locale.toLowerCase(), locale);
}

const supportedLocales = Object.keys(resources);

function buildLocaleMap() {
  const map = new Map(localeLookup);
  for (const locale of supportedLocales) {
    const base = locale.toLowerCase().split('-')[0];
    if (!map.has(base)) {
      map.set(base, locale);
    }
  }
  return map;
}

const normalizedLocaleMap = buildLocaleMap();

export function getSupportedLocales() {
  return supportedLocales.slice();
}

export function normalizeLocale(locale) {
  if (!locale) return null;
  const cleaned = locale.toString().replace('_', '-').toLowerCase();
  if (normalizedLocaleMap.has(cleaned)) return normalizedLocaleMap.get(cleaned);
  const [base] = cleaned.split('-');
  if (normalizedLocaleMap.has(base)) return normalizedLocaleMap.get(base);
  return null;
}

export function resolveLocale({ preferredLocale, osLocale, fallbackLocale = DEFAULT_LOCALE } = {}) {
  return (
    normalizeLocale(preferredLocale) ||
    normalizeLocale(osLocale) ||
    normalizeLocale(fallbackLocale) ||
    DEFAULT_LOCALE
  );
}

export async function detectInitialLocale() {
  let persistedLocale = null;
  let systemLocale = null;

  try {
    const prefs = await tauriApi.loadPreferences();
    persistedLocale = prefs?.locale || null;
  } catch (error) {
    console.warn('[i18n] Unable to read persisted locale:', error);
  }

  try {
    systemLocale = await tauriApi.getOsLocale();
  } catch (error) {
    console.warn('[i18n] Unable to read OS locale:', error);
  }

  return resolveLocale({ preferredLocale: persistedLocale, osLocale: systemLocale });
}

export async function persistLocalePreference(locale) {
  const normalized = resolveLocale({ preferredLocale: locale });
  try {
    const prefs = (await tauriApi.loadPreferences()) || {};
    await tauriApi.savePreferences({
      ...prefs,
      locale: normalized,
    });
    return normalized;
  } catch (error) {
    console.warn('[i18n] Failed to persist locale preference:', error);
    return normalized;
  }
}

export async function initI18n(locale) {
  const targetLocale = resolveLocale({ preferredLocale: locale });
  const instance = i18next.createInstance();

  await instance.init({
    lng: targetLocale,
    fallbackLng: DEFAULT_LOCALE,
    resources,
    defaultNS: 'translation',
    ns: ['translation'],
    interpolation: { escapeValue: false },
    returnNull: false,
    returnEmptyString: false,
    cleanCode: true,
  });

  return instance;
}

export function createTranslator(instance) {
  return (key, options) => {
    if (!key) return '';
    if (!instance || typeof instance.t !== 'function') return key;
    const value = instance.t(key, options);
    return value == null || value === '' ? key : value;
  };
}

export { resources as i18nResources, DEFAULT_LOCALE };
