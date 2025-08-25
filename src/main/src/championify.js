import * as R from 'ramda';
import fs from 'fs';

import { cl, elevate } from './helpers/index.js';
import { spliceVersion } from '../../common/formatters.js';

import ChampionifyErrors from './errors.js';
import { Logger } from 'electron-winston/main';
import optionsParser from './options_parser.js';
import preferences from './preferences.js';
import permissions from './permissions.js';
import progressbar from './progressbar.js';
import store from './store.js';
import sources from './sources/index.js';
import T from './translate.js';
import * as glob from 'glob';
import path from 'path';

// Create a new logger
const logger = new Logger();

// Minimal saveSettings stub — real implementation lives elsewhere in the app
function saveSettings() {
  return Promise.resolve();
}

/**
 * Saves settings/options from the frontend.
 * @returns {Promise}
 */
function setWindowsPermissions() {
  if (global.process.platform === 'win32' && optionsParser.runnedAsAdmin()) {
    cl(T.t('resetting_file_permission'));
    const champ_files = glob.sync(path.join(store.get('itemset_path'), '**'));
    return permissions.setWindowsPermissions(champ_files);
  }
}

/**
 * Gets the latest Riot Version.
 * @returns {Promise.<String| ChampionifyErrors.RequestError>} Riot version.
 */
async function getRiotVer() {
  if (store.get('importing')) cl(`${T.t('lol_version')}`);
  try {
    const version = await fetch('https://ddragon.leagueoflegends.com/realms/na.json')
    .then(res => res.json());

    if (!version || typeof version.v !== 'string') {
      throw new ChampionifyErrors.RequestError('Invalid Riot version response');
    }

    store.set('riot_ver', version.v);
    return version.v;
  } catch (err) {
    throw new ChampionifyErrors.RequestError("Can't get Riot Version").causedBy(err);
  }
}

/**
 * Downloads all available champs from Riot.
 * @returns {Promise.<Array|ChampionifyErrors.RequestError>} Array of Champions in Riot's data schema.
 */
async function getChampions() {
  cl(`${T.t('downloading_champs')}`);

  await getRiotVer();

  return fetch(`http://ddragon.leagueoflegends.com/cdn/${store.get(
      'riot_ver'
    )}/data/${T.riotLocale()}/champion.json`)
    .then(res => res.json())
    .then(data => {
      if (!data) throw new ChampionifyErrors.RequestError("Can't get Champs");
      let translations = R.zipObj(R.keys(data), R.pluck('name')(R.values(data)));
      translations = R.zipObj(
        R.map(key => key.toLowerCase().replace(/ /g, ''), R.keys(translations)),
        R.values(translations)
      );
      translations.wukong = translations.monkeyking;
      T.merge(translations);

      const champ_ids = R.fromPairs(
        R.map(champ_data => {
          return [champ_data.id.toLowerCase(), champ_data.key];
        }, R.values(data))
      );
      store.set('champs', R.keys(data).sort());
      store.set('champ_ids', champ_ids);
      return data;
    })
    .catch(err => {
      if (err instanceof ChampionifyErrors.ChampionifyError) throw err;
      throw new ChampionifyErrors.RequestError("Can't get Champs").causedBy(err);
    });
}

// TODO: Write tests and docs

/**
 * Gets special items (legendary items) from the store or fetches them from the API.
 * @returns {Promise<Object>} A list of Special items.
 */
function getSpecialItems() {
  if (store.get('special_items')) return Promise.resolve(store.get('special_items'));

  return fetch(`http://ddragon.leagueoflegends.com/cdn/${store.get('riot_ver')}/data/en_US/item.json`)
    .then(res => res.json())
    .then(items => {
      return R.keys(items).map(id => {
        const data = items[id];
        if (data.specialRecipe) return [id, String(data.specialRecipe)];
        if (data.requiredAlly) return [id, data.from[0]];
      });
    })
    .filter(R.identity)
    .then(R.fromPairs)
    .then(items => store.set('special_items', items));
}

/**
 * Deletes all previous Championify builds from client.
 * @param {Boolean} [false]
 * @returns {Promise}
 */

async function deleteOldBuilds(deletebtn) {
  if (store.get('settings') && store.get('settings').dontdeleteold) return Promise.resolve();

  cl(T.t('deleting_old_builds'));
  const globbed = [
    glob.sync(`${store.get('itemset_path')}**/CIFY_*.json`),
  ];

  return Promise.resolve(R.flatten(globbed))
    .each(f => fs.unlinkAsync(f))
    .catch(err => logger.warn(err))
    .then(() => {
      if (deletebtn !== true) progressbar.incr(2.5);
    });
}

/**
 * Fixes common issues between sources generated item sets, then saves all compiled item sets to file, creating paths included.
 * @returns {Promise}
 */

function fixAndSaveToFile() {
  const special_items = store.get('special_items');

  return Promise.resolve([store.get('sr_itemsets'), store.get('aram_itemsets')])
    .then(R.flatten)
    .then(R.reject(R.isNil))
    .each(data => {
      const champ = data.champ.toLowerCase() === 'wukong' ? 'monkeyking' : data.champ;

      // Replaces special items that are not available in store. (e.g. Ornn items)
      data.riot_json.blocks.map(block => {
        block.items = block.items.map(item => {
          if (special_items[item.id]) item.id = special_items[item.id];
          return item;
        });
        return block;
      });

      const itemset_data = JSON.stringify(data.riot_json, null, 4);
      const folder_path = path.join(store.get('itemset_path'), champ, 'Recommended');
      const file_path = path.join(
        folder_path,
        `CIFY_${champ}_${data.source}_${data.file_prefix}.json`
      );

      return fs
        .mkdirsAsync(folder_path)
        .catch(err => logger.warn(err))
        .then(() => fs.writeFileAsync(file_path, itemset_data, 'utf8'))
        .catch(err => {
          throw new ChampionifyErrors.FileWriteError('Failed to write item set json file').causedBy(
            err
          );
        });
    });
}

/**
 * Resave preferences with new local version
 * @returns {Promise}
 */

async function resavePreferences() {
  const prefs = preferences.get();
  prefs.local_is_version = spliceVersion(store.get('riot_ver'));
  return await preferences.save(prefs);
}

/**
 * Verifies requires settings in order to importer.
 * @returns {Boolean}
 */

function verifySettings() {
  store.set('settings', preferences.get().options);
  if (!R.filter(R.identity, store.get('settings').sr_source).length) {
    const els = Array.from(document.querySelectorAll('.rift_source'));
    els.forEach(el => {
      el.classList.remove('jiggle');
      void el.offsetWidth;
      el.classList.add('jiggle');

      const onEnd = () => {
        el.classList.remove('jiggle');
        el.removeEventListener('animationend', onEnd);
      };

      el.addEventListener('animationend', onEnd, { once: true });
      // Fallback in case animationend doesn't fire
      setTimeout(() => el.classList.remove('jiggle'), 1000);
    });

    return false;
  }

  return true;
}

/**
 * Main function that starts up all the magic.
 * @returns {Promise}
 */

function downloadItemSets() {
  store.set('importing', true);
  store.remove('sr_itemsets');
  store.remove('aram_itemsets');
  store.remove('undefined_builds');
  progressbar.reset();

  const to_process = [];
  if (store.get('settings').aram)
    to_process.push({
      name: 'lolflavor',
      method: sources.lolflavor.getAram,
    });
  R.forEach(source => {
    if (sources[source])
      to_process.push({
        name: source,
        method: sources[source].getSr,
      });
  }, store.get('settings').sr_source);

  logger.info(`Locale: ${T.locale}`);

  return saveSettings()
    .then(permissions.championTest)
    .then(getRiotVer)
    .then(getChamps)
    .then(getSpecialItems)
    .then(() =>
      Promise.all(
        R.map(source => {
          return source.method().catch(err => {
            logger.error(err);
            store.push('undefined_builds', {
              champ: 'All',
              position: 'All',
              source: source.name,
            });

            return;
          });
        }, to_process)
      )
    )
    .then(deleteOldBuilds)
    .then(fixAndSaveToFile)
    .then(resavePreferences)
    .then(setWindowsPermissions)
    .then(() => {
      store.set('importing', false);
      progressbar.incr(100);
      return true;
    })
    .catch(err => {
      if (
        err instanceof ChampionifyErrors.FileWriteError &&
        process.platform === 'win32' &&
        !optionsParser.runnedAsAdmin()
      ) {
        logger.error(err);
        return elevate(['--import']);
      }

      // If not a file write error, end session.
      throw err;
    });
}

/**
 * Export.
 */
export default {
  run: downloadItemSets,
  delete: deleteOldBuilds,
  getVersion: getRiotVer,
  getChampions: getChampions,
  getSpecialItems,
  verifySettings,
};
