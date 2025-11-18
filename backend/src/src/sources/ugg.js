import * as R from 'ramda';
import default_schema from '../../../../shared/data/default.json' with { type: 'json' };

import { cl, trinksCon } from '../helpers/index.js';
import { Logger } from 'electron-winston/main';
import T from '../translate.js';
import progressbar from '../progressbar.js';
import store from '../store.js';

const logger = new Logger();

const UGG_BUILD_MODES = ['recommended', 'on-hit', 'crit', 'lethality', 'ad', 'ap', 'tank', 'armor', 'magic-resistance'];
const UGG_VERSION_URL = 'https://static.bigbrain.gg/assets/lol/riot_patch_update/prod/ugg/ugg-api-versions.json';

export const source_info = {
  name: 'u.gg',
  id: 'ugg'
};

export async function getVersion() {
  // They got the wonderful idea NOT to sort patches, so it's a bit of a mess.
  // Get Riot Version from the store, get the first 2 patches lines (eg. 15.12.1 => 15.12)
  // and replace the dot by an underline, to get the proper key.
  const riot_version = store.get('riot_ver')?.split('.').slice(0, 2).join('_');
  return fetch(UGG_VERSION_URL)
    .then(res => res.json())
    .then(data => {
      const v = data[riot_version]?.builds;
      if (v) {
        store.set('ugg_ver', v);
        return v;
      }
      logger.warn('Could not extract version from UGG response, using fallback');
      store.set('ugg_ver', '1.5.0');
      return '1.5.0';
    })
    .catch(err => {
      logger.warn('Error fetching UGG version, using fallback', err);
      store.set('ugg_ver', '1.5.0');
      return '1.5.0';
    });
}

export async function getSr(gameType = 'ranked_solo_5x5') {
  // Ensure version is known
  return (store.get('ugg_ver') ? Promise.resolve(store.get('ugg_ver')) : getVersion())
    .then(async version => {
      const overviewUrl = `https://stats2.u.gg/lol/1.5/overview/world/${version}/${gameType}/emerald_plus//${version}.json`;
      const res = await fetch(overviewUrl, { headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      return ({ version, data });
    })
    .then(({ version, data }) => {
      if (!data || !Array.isArray(data.champions)) throw new Error('Invalid UGG champions response');

      const champions = data.champions
        .map(c => (c && typeof c.name === 'string' ? c.name : null))
        .filter(Boolean)
        .sort();

      return Promise.map(champions, async champ => {
        try {
          cl(`${T.t('processing')} UGG: ${champ}`);
        } catch {
          // ignore translation errors
        }
        progressbar.incrChamp();

        const url = `https://stats2.u.gg/lol/1.5/${UGG_BUILD_MODES[0]}/${getRiotPatch(version)}/${gameType}/${encodeURIComponent(champ)}/${version}.json`;
        return fetch(url, { headers: { 'Content-Type': 'application/json' } })
          .then(res => res.json())
          .then(riotJson => {
            if (!riotJson || !Array.isArray(riotJson.blocks)) {
              logger.warn(`No blocks found or invalid blocks for ${champ}`);
              return;
            }

            // Apply trinkets/consumables helper used by the project
            const blocks = trinksCon(Array.isArray(riotJson.blocks) ? riotJson.blocks.slice() : []);

            const riot_json = R.mergeRight(R.clone(default_schema, true), {
              champion: champ,
              title: `UGG ${champ} ${version}`,
              blocks
            });

            return { champ, file_prefix: 'all', riot_json, source: 'ugg' };
          })
          .catch(err => {
            logger.error(err);
            store.push('undefined_builds', { source: source_info.name, champ, position: 'All' });
          });
      }, { concurrency: 3 })
        .then(R.reject(R.isNil))
        .then(data => store.push('sr_itemsets', data));
    });
}