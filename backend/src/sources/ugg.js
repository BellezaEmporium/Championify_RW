import * as R from 'ramda';
import { default_schema } from '../shared/index.js';

import { cl, trinksCon } from '../helpers/index.js';
class WebLogger {
  error(...a) {
    console.error('[Championify]', ...a);
  }
  info(...a) {
    console.info('[Championify]', ...a);
  }
  warn(...a) {
    console.warn('[Championify]', ...a);
  }
}
import T from '../translate.js';
import progressbar from '../progressbar.js';
import store from '../store.js';

const logger = new WebLogger();

const UGG_BUILD_MODES = [
  'rankings',
  'overview',
  'ad-overview',
  'ap-overview',
  'tank-overview',
  'crit-overview',
  'lethality-overview',
  'onhit-overview',
];
const UGG_VERSION_URL =
  'https://static.bigbrain.gg/assets/lol/riot_patch_update/prod/ugg/ugg-api-versions.json';
const LINKS = [
  {ugg_name: '1', position: 'TOP' },
  {ugg_name: '2', position: 'JUNGLE' },
  {ugg_name: '3', position: 'MID' },
  {ugg_name: '4', position: 'BOT' },
  {ugg_name: '5', position: 'SUPPORT' },
];

export const source_info = {
  name: 'u.gg',
  id: 'ugg',
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

function extractBuildsFromUGG(riotJson, role) {
  const builds = [];
  const layers = Object.values(riotJson || {});

  for (const layer of layers) {
    if (typeof layer !== 'object') continue;
    for (const sub of Object.values(layer)) {
      if (!Array.isArray(sub)) continue;
      for (const build of sub) {
        if (build?.blocks && (!role || build.position === role)) {
          builds.push({ position: build.position, blocks: build.blocks });
        }
      }
    }
  }

  return builds;
}

function translateBlocks(blocks, itemDB) {
  return blocks.map(block => ({
    type: block.type,
    items: block.items.map(it => ({
      id: it.id.toString(),
      count: it.count,
      name: itemDB.data[it.id.toString()]?.name || 'Unknown',
    })),
  }));
}

export async function getSr(gameType = 'ranked_solo_5x5') {
  return (store.get('ugg_ver') ? Promise.resolve(store.get('ugg_ver')) : getVersion())
    .then(async version => {
      const riot_version = store.get('riot_ver');
      const overviewUrl = `https://static.bigbrain.gg/assets/lol/riot_static/${riot_version}/data/en_US/champion.json`;
      const res = await fetch(overviewUrl, { headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      return { version, data };
    })
    .then(({ version, data }) => {
      if (!data || !Object.keys(data.data || {}).length)
        throw new Error('Invalid UGG champions response');

      const champions = Object.keys(data.data)
        .map(key => {
          if (key && typeof key === 'string') {
            const champData = data.data[key];
            return { name: key, id: champData.key };
          }
          return null;
        })
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name));

      return Promise.all(
        champions.map(async champObj => {
          const { name: champ, id: champId } = champObj;
          try {
            cl(`${T.t('processing')} UGG: ${champ}`);
          } catch {}

          progressbar.incrChamp();

          const riot_version = store.get('riot_ver')?.split('.').slice(0, 2).join('_');
          const url = `https://stats2.u.gg/lol/1.5/${UGG_BUILD_MODES[1]}/${riot_version}/${gameType}/${champId}/${version}.json`;

          try {
            const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
            const riotJson = await res.json();

            if (!riotJson || typeof riotJson !== 'object') {
              logger.warn(`Invalid response for ${champ}`);
              return [];
            }

            // --- MIDDLEWARE TRANSLATOR ---
            const builds = extractBuildsFromUGG(riotJson, LINKS.ugg_name);
            if (!builds.length) {
              logger.warn(`No builds parsed for ${champ}`);
              return [];
            }

            const entries = builds.map(build => {
              // convert U.GG blocks → Riot-readable blocks
              const blocksProcessed = trinksCon(
                Array.isArray(build.blocks) ? build.blocks.slice() : []
              );

              const riot_json = R.mergeRight(R.clone(default_schema, true), {
                champion: champ,
                title: `UGG ${champ} ${version}${
                  build.position && build.position !== 'All' ? ` (${build.position})` : ''
                }`,
                blocks: blocksProcessed,
              });

              const file_prefix = (build.position || 'All').toString().toLowerCase();
              return { champ, file_prefix, riot_json, source: 'ugg' };
            });

            return entries;
          } catch (err) {
            logger.error(err);
            store.push('undefined_builds', { source: source_info.name, champ, position: 'All' });
            return [];
          }
        })
      )
        .then(results => results.flat().filter(Boolean))
        .then(data => store.push('sr_itemsets', data));
    });
}
