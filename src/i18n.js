/**
 * i18n.js - Primary Translation System for Frontend UI
 *
 * This is the DEFAULT translation system for all UI components.
 * Uses i18next for modern, asynchronous translation loading.
 *
 * Usage in Marko components:
 *   $!{input.t('translation_key')}
 *
 * Note: backend/src/translate.js is ONLY for backend Node.js scripts
 * and Lokalise API operations. Do NOT use it in frontend code.
 *
 * @see TRANSLATION_SYSTEM.md for full documentation
 */
import i18next from 'i18next';

// Locales supportées (fichiers présents dans `static/translations`)
const SUPPORTED_LOCALES = [
  'ar',
  'bg',
  'bs',
  'ca',
  'cs',
  'da',
  'de',
  'el',
  'en',
  'es',
  'fi',
  'fr',
  'he',
  'hi',
  'hr',
  'hu',
  'id',
  'it',
  'ja',
  'ka',
  'km',
  'ko',
  'lt',
  'lv',
  'ms',
  'nl',
  'no',
  'pl',
  'pt-BR',
  'pt',
  'ro',
  'ru',
  'sk',
  'sl',
  'sr',
  'sv',
  'th',
  'tr',
  'vi',
  'zh-CN',
  'zh-TW',
];

// Create a new i18next instance
const i18nInstance = i18next.createInstance();

// Function to dynamically load translations
async function loadTranslations() {
  const resources = {};
  for (const locale of SUPPORTED_LOCALES) {
    try {
      const translation = await import(`./translations/${locale}.json`);
      resources[locale] = { translation: translation.default };
    } catch (error) {
      console.warn(`Failed to load translations for ${locale}:`, error);
    }
  }
  return resources;
}

// Initialize i18next with translations
export async function initI18n() {
  const resources = await loadTranslations();

  await i18nInstance.init({
    lng: 'en', // Set initial locale
    fallbackLng: 'en',
    resources,
  });

  return i18nInstance;
}

export default i18nInstance;
