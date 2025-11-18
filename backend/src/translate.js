/**
 * translate.js - Backend Translation Utilities & Lokalise Integration
 *
 * ⚠️ BACKEND ONLY - DO NOT USE IN FRONTEND/UI CODE
 *
 * This module provides:
 * 1. Translate class for Node.js backend scripts (sources, helpers, etc.)
 * 2. Lokalise API integration for translation management
 * 3. Development tasks: lokaliseUpload(), lokaliseReview()
 *
 * For frontend/UI translations, use src/i18n.js (i18next) instead.
 *
 * Used in:
 * - backend/src/sources/*.js (ugg, opgg, probuilds, koreanbuilds)
 * - backend/src/helpers/index.js
 * - backend/src/preferences.js, path_manager.js, errors.js, championify.js
 *
 * @see TRANSLATION_SYSTEM.md for full documentation
 */

import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import pino from 'pino';

import ChampionifyErrors from './errors.js';
const logger = pino({ name: 'Championify' });

// Localization / Lokalise helpers (moved from tasks/translations.js)
import chalk from 'chalk';
import * as readline from 'node:readline';
import * as glob from 'glob';
import { LokaliseApi } from '@lokalise/node-api';

const { LOKALISE_API_TOKEN } = import.meta.env || {};
const lokaliseApi = LOKALISE_API_TOKEN ? new LokaliseApi({ apiKey: LOKALISE_API_TOKEN }) : null;
const LOKALIZE_PROJECT_ID = '7042227968a09aa9567573.10393880';

/**
 * @type {string[] | PromiseLike<string[]> | null}
 */
let _supported_languages = null;

/**
 * Fetches supported languages from Lokalise. Caches the result.
 * @returns {Promise<string[]>} A promise that resolves to an array of language codes.
 */
export async function getSupportedLanguages() {
  if (_supported_languages) return _supported_languages;
  if (!lokaliseApi) return [];

  try {
    const res = await lokaliseApi.languages().list({ project_id: LOKALIZE_PROJECT_ID });
    const langs = res.items.map(i => i.lang_iso).filter(Boolean);
    _supported_languages = [...new Set(langs)];
    return _supported_languages;
  } catch (err) {
    logger.warn('Could not fetch languages from Lokalise.', err);
    return [];
  }
}

// Ingame locales are locals that LoL does not support, and instead default to English.
const ingame_locals = ['ar', 'ja'];

/**
 * @class Translate
 * @classdesc Global translation methods to get and set translations throughout the app. Default locale is English.
 */
class Translate {
  /**
   * @param {string} locale
   */
  constructor(locale) {
    this.locale = locale;
    this.phrases = {};
    this.english_phrases = {};
    this.loadPhrases(locale);
  }

  /**
   * Loads locales from file in to context
   * @param {String} locale
   **/
  async loadPhrases(locale) {
    this.locale = locale;
    // If we're running in Node (main process / scripts), read files synchronously so translations
    // are available immediately to the rest of the code. Otherwise (renderer/browser) use fetch.
    const isNode =
      typeof window === 'undefined' || !!(process && process.versions && process.versions.node);
    const translationsBaseFs = path.join(process.cwd(), 'static', 'translations');

    try {
      if (isNode) {
        const localePath = path.join(translationsBaseFs, `${locale}.json`);
        const enPath = path.join(translationsBaseFs, 'en.json');
        if (!fs.existsSync(localePath)) {
          throw new ChampionifyErrors.OperationalError(
            `${locale} does not exist in translations folder`
          );
        }
        this.phrases = JSON.parse(fs.readFileSync(localePath, 'utf8'));
        if (fs.existsSync(enPath)) {
          this.english_phrases = JSON.parse(fs.readFileSync(enPath, 'utf8'));
        } else {
          logger.error(
            new ChampionifyErrors.TranslationError('Could not load english translations (en.json)')
          );
          this.english_phrases = {};
        }
        return;
      }

      // Browser/renderer fallback: use fetch and import.meta.url based path
      const translationsBase = new URL('../../../static/translations', import.meta.url);
      const [localeRes, enRes] = await Promise.all([
        fetch(`${translationsBase}/${locale}.json`),
        fetch(`${translationsBase}/en.json`),
      ]);

      if (!localeRes.ok) {
        throw new ChampionifyErrors.OperationalError(
          `${locale} does not exist in translations folder`
        );
      }
      this.phrases = await localeRes.json();

      if (!enRes.ok) {
        logger.error(
          new ChampionifyErrors.TranslationError('Could not load english translations (en.json)')
        );
        this.english_phrases = {};
      } else {
        this.english_phrases = await enRes.json();
      }
    } catch (error) {
      logger.error('Failed to load phrases:', error);
      if (error instanceof ChampionifyErrors.OperationalError) throw error;
    }
  }

  /**
   * Returns translate text for key
   * @param {String} phrase key
   * @param {Boolean} [false] If this is an ingame translation, it checks whether the locale is an accept League of Legends language
   */
  t(phrase, ingame = false) {
    const lowerCasePhrase = phrase.toLowerCase();
    let translated_phrase = this.phrases[lowerCasePhrase];

    if (ingame && ingame_locals.includes(this.locale)) {
      translated_phrase = this.english_phrases[lowerCasePhrase];
    }

    if (translated_phrase === undefined) {
      logger.error(
        new ChampionifyErrors.TranslationError(
          `Phrase does not exist for ${this.locale}: ${phrase}`
        )
      );
      // Fallback to english translation if present, otherwise return the original phrase for clarity
      const fallback = this.english_phrases[lowerCasePhrase];
      return fallback !== undefined ? fallback : phrase;
    }
    return translated_phrase;
  }

  /**
   * Merges translations with current translations in context. Used for getting translated Champion names from riot.
   * @param {Object} translations Translations to merge
   */
  merge(translations) {
    this.phrases = { ...this.phrases, ...translations };
  }

  /**
   * Returns the flag locale to be used with Semantic
   */
  flag() {
    const flags = {
      'pt-BR': 'br',
      'zh-CN': 'cn',
      'zh-TW': 'tw',
      ar: 'eg',
      bs: 'ba',
      ca: 'es',
      cs: 'cz',
      da: 'dk',
      el: 'gr',
      en: 'gb',
      he: 'il',
      hi: 'in',
      ja: 'jp',
      ka: 'ge',
      km: 'kh',
      ko: 'kr',
      ms: 'my',
      sl: 'si',
      sr: 'rs',
      sv: 'se',
      vi: 'vn',
    };
    return flags[this.locale] || this.locale;
  }

  /**
   * Returns the riot locale to be used when querying Riot's api.
   */
  riotLocale() {
    const riot_locales = {
      cs: 'cs_CZ',
      de: 'de_DE',
      el: 'el_GR',
      en: 'en_US',
      es: 'es_ES',
      fr: 'fr_FR',
      hu: 'hu_HU',
      id: 'id_ID',
      it: 'it_IT',
      ja: 'ja_JP',
      ko: 'ko_KR',
      ms: 'ms_MY',
      pl: 'pl_PL',
      pt: 'pt_BR',
      'pt-BR': 'pt_BR',
      ro: 'ro_RO',
      ru: 'ru_RU',
      th: 'th_TH',
      tr: 'tr_TR',
      vi: 'vn_VN',
      'zh-CN': 'zh_CN',
      'zh-TW': 'zh_TW',
    };
    return riot_locales[this.locale] || 'en_US';
  }
}

// Default export: Translate instance for backend scripts
// Used in: sources/*.js, helpers/index.js, preferences.js, etc.
const translate = new Translate('en');
export default translate;

// -----------------------------------------------------------------------------
// LOKALISE DEV TASKS (NODE.JS ENVIRONMENT ONLY)
// -----------------------------------------------------------------------------
// These functions are for developer use only to manage translations with Lokalise.
// They are NOT used in the normal application flow.
//
// Usage:
//   import { lokaliseUpload, lokaliseReview } from './backend/src/translate.js';
//   await lokaliseUpload();  // Upload translations to Lokalise
//   await lokaliseReview();  // Review and merge translations from Lokalise
// -----------------------------------------------------------------------------

/**
 * Uploads local i18n files to the Lokalise project.
 * @throws {ChampionifyErrors.OperationalError} If LOKALISE_API_TOKEN is not set.
 */
export async function lokaliseUpload() {
  if (!lokaliseApi) throw new ChampionifyErrors.OperationalError('LOKALISE_API_TOKEN is not set');

  const translationsPath = path.join(process.cwd(), 'static', 'translations');
  const files = glob.sync(`${translationsPath}/*(!(_source)).json`);

  for (const filePath of files) {
    const lang = path.basename(filePath, '.json');
    console.log(`Uploading: ${lang}`);
    try {
      const data = fs.readFileSync(filePath, 'base64');
      await lokaliseApi.files().upload(LOKALIZE_PROJECT_ID, {
        data,
        filename: `${lang}.json`,
        lang_iso: lang,
      });
      console.log(`Lokalise SDK upload finished for ${lang}`);
    } catch (err) {
      console.error(`Upload failed for ${lang}:`, err);
    }
  }
}

/**
 * Downloads a file from Lokalise for a given language.
 * @param {string} lang - The language iso code.
 * @returns {Promise<object>} The parsed JSON content of the translation file.
 */
async function downloadLokaliseFile(lang) {
  const { bundle_url } = await lokaliseApi.files().download(LOKALIZE_PROJECT_ID, {
    format: 'json',
    original_filenames: false,
    filter_langs: [lang],
  });
  const response = await fetch(bundle_url);
  const zipBuffer = await response.arrayBuffer();
  const AdmZip = (await import('adm-zip')).default;
  const zip = new AdmZip(Buffer.from(zipBuffer));
  const zipEntry = zip.getEntry(`${lang}.json`);
  if (zipEntry) {
    return JSON.parse(zipEntry.getData().toString('utf8'));
  }
  return {};
}

/**
 * Reviews translations from Lokalise, showing a diff and prompting to merge changes.
 */
export async function lokaliseReview() {
  if (!lokaliseApi) throw new ChampionifyErrors.OperationalError('LOKALISE_API_TOKEN is not set');

  const translationsPath = path.join(process.cwd(), 'static', 'translations');
  const localFiles = glob.sync(`${translationsPath}/*(!(_source|en)).json`);
  const _source = JSON.parse(fs.readFileSync(path.join(translationsPath, '_source.json'), 'utf8'));

  for (const filePath of localFiles) {
    const lang = path.basename(filePath, '.json');
    const localTranslations = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const remoteTranslations = await downloadLokaliseFile(lang);

    const toReview = {};
    for (const key in remoteTranslations) {
      if (localTranslations[key] !== remoteTranslations[key]) {
        toReview[key] = {
          new: remoteTranslations[key],
          old: localTranslations[key],
        };
      }
    }

    if (Object.keys(toReview).length === 0) {
      console.log(`No changes for ${lang}.`);
      continue;
    }

    console.log(`\n--- Reviewing changes for ${chalk.white.bold(lang)} ---`);
    for (const key in toReview) {
      const { old, new: newTrans } = toReview[key];
      console.log(`
  Key         | ${chalk.bold.red(key)}
  English     | ${chalk.bold.blue(_source[key]?.text || '!!!MISSING!!!')}
  Old Trans   | ${chalk.bold.yellow(old)}
  New Trans   | ${chalk.bold.magenta(newTrans)}`);
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const ask = question => new Promise(resolve => rl.question(question, resolve));

    let answer = await ask('Would you like to save these translations? [y/n] ');
    answer = answer.trim().toLowerCase();
    rl.close();

    if (answer === 'y') {
      const merged = { ...localTranslations, ...remoteTranslations };
      await fsPromises.writeFile(filePath, JSON.stringify(merged, null, 2), 'utf8');
      console.log(chalk.bold.green(`Saved translations for ${lang}.`));
    } else {
      console.log(chalk.bold.red(`Skipped saving translations for ${lang}.`));
    }
  }
  console.log('\nReview Done');
}
