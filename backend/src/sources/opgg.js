import * as R from 'ramda';
import { default_schema, prebuilts } from '../shared/index.js';

import { cl, trinksCon } from '../helpers/index.js';
import { arrayToBuilds, pickWinrate, pickPickrate } from '../../../src/common/formatters.js';
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

const templates = {
  combindedStart: (pickrate, winrate) =>
    `${T.t('frequent', true)}/${T.t(
      'highest_start',
      true
    )} - Winrate: ${winrate}, Pickrate: ${pickrate}%`,
  combinedCore: (pickrate, winrate) =>
    `${T.t('frequent', true)}/${T.t(
      'highest_core',
      true
    )} - Winrate: ${winrate}%, Pickrate: ${pickrate}%`,
  combinedItems: (pickrate, winrate) =>
    `${T.t('frequent', true)}/${T.t(
      'highest_items',
      true
    )} - Winrate: ${winrate}%, Pickrate: ${pickrate}%`,
  pickStart: pickrate => `${T.t('mf_starters', true)} - Pickrate: ${pickrate}%`,
  pickCore: pickrate => `${T.t('mf_core', true)} - Pickrate: ${pickrate}%`,
  pickItems: pickrate => `${T.t('mf_items', true)} - Pickrate: ${pickrate}%`,
  winStart: winrate => `${T.t('hw_starters', true)} - Winrate: ${winrate}%`,
  winCore: winrate => `${T.t('hw_core', true)} - Winrate: ${winrate}%`,
  winItems: winrate => `${T.t('hw_items', true)} - Winrate: ${winrate}%`,
};

/**
 * Export
 */
export const source_info = {
  name: 'op.gg',
  id: 'opgg',
};

// pickWinrate and pickPickrate imported from common/formatters.js

function createBlock(templateFunc, rate_type, items, appended_items = []) {
  const entry = R.last(R.sortBy(R.prop(rate_type), items));
  items = entry.items.concat(appended_items);
  return {
    items: arrayToBuilds(items),
    type: templateFunc(entry[rate_type]),
    rate: entry[rate_type],
  };
}

function createSituationalItemsBlock(templateFunc, rate_type, items) {
  const sorted = R.reverse(R.sortBy(R.prop(rate_type), items));
  const rate = `${sorted[0][rate_type]}-${sorted[5][rate_type]}`;
  return {
    items: arrayToBuilds(R.pluck('items', sorted).slice(0, 6)),
    type: templateFunc(rate),
    rate,
  };
}

function mergeBlocks(templateFunc, pickrate, winrate) {
  if (R.equals(pickrate, winrate))
    return {
      items: pickrate.items,
      type: templateFunc(pickrate.rate, winrate.rate),
    };

  return [pickrate, winrate];
}

function formatForStore(champ, position, skills, set_type, file_prefix, blocks) {
  let title = T.t(position, true);
  if (set_type) title += ` ${set_type}`;
  const riot_json = R.mergeRight(default_schema, {
    champion: champ,
    title: `OPGG ${title} ${store.get('opgg_ver')}`,
    blocks: trinksCon(R.map(R.omit(['rate']), blocks), skills),
  });

  if (store.get('settings').locksr) riot_json.map = 'SR';
  return { champ, file_prefix, riot_json, source: 'opgg' };
}

const headers = {
  'Accept-Language': 'en-US,en;q=0.8,fr;q=0.6,es;q=0.4',
  Cookie: 'customLocale=en_US',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.98 Safari/537.36',
  'X-Requested-With': 'XMLHttpRequest',
};

export async function getVersion() {
  const data = await fetch('https://lol-api-champion.op.gg/api/meta/champions', {
    headers: headers,
  }).then(resp => resp.json());
  const version = data['meta']['version'];
  if (!version) {
    logger.error('Version not found in response');
    return;
  } else {
    // persist and return the version string so callers receive it
    store.set('opgg_ver', version);
    return version;
  }
}

export function getSr() {
  if (!store.get('opgg_ver')) return getVersion().then(getSr);

  return fetch('https://lol-api-champion.op.gg/api/euw/champions/ranked', { headers: headers })
    .then(resp => resp.json())
    .then(data => {
      const champs = data['data'].map(champ => {
        return {
          id: champ['id'],
          name: champ['name'],
          positions: champ['positions'],
        };
      });

      return (async () => {
        const results = [];

        for (const champ_data of champs) {
          cl(`${T.t('processing')} op.gg: ${T.t(champ_data.name)}`);

          for (const position of champ_data.positions) {
            try {
              const [_itemResponse, skillResponse] = await Promise.all([
                fetch(
                  `https://lol-api-champion.op.gg/api/euw/champions/ranked/${champ_data.id}/${position}/item`,
                  { headers: headers }
                ),
                fetch(
                  `https://lol-api-champion.op.gg/api/euw/champions/ranked/${champ_data.id}/${position}/skill`,
                  { headers: headers }
                ),
              ]);

              const skillData = await skillResponse.json();
              const skills = skillData.pageProps.data.skills;
              const starter = skillData.pageProps.data.starter_items;
              const core = skillData.pageProps.data.core_items;
              const items = skillData.pageProps.data.items;
              let boots = skillData.pageProps.data.boots;
              // Snakes don't wear boots
              if (!boots.length) boots = [{ items: [], winrate: 0, pickrate: 0 }];

              const winrate = [
                createBlock(
                  templates.winStart,
                  'winrate',
                  starter,
                  R.pluck('id', prebuilts.trinkets)
                ),
                createBlock(templates.winCore, 'winrate', core, pickWinrate(boots).items),
                createSituationalItemsBlock(templates.winItems, 'winrate', items),
              ];
              const pickrate = [
                createBlock(
                  templates.pickStart,
                  'pickrate',
                  starter,
                  R.pluck('id', prebuilts.trinkets)
                ),
                createBlock(templates.pickCore, 'pickrate', core, pickPickrate(boots).items),
                createSituationalItemsBlock(templates.pickItems, 'pickrate', items),
              ];

              if (store.get('settings').splititems) {
                results.push(
                  formatForStore(
                    champ_data.name,
                    position,
                    skills,
                    T.t('most_freq', true),
                    `${position}_mostfreq`,
                    pickrate
                  ),
                  formatForStore(
                    champ_data.name,
                    position,
                    skills,
                    T.t('highest_win', true),
                    `${position}_highwin`,
                    winrate
                  )
                );
              } else {
                const merged_blocks = R.flatten([
                  mergeBlocks(templates.combindedStart, pickrate[0], winrate[0]),
                  mergeBlocks(templates.combindedStart, pickrate[1], winrate[1]),
                  mergeBlocks(templates.combindedStart, pickrate[2], winrate[2]),
                ]);

                results.push(
                  formatForStore(champ_data.name, position, skills, null, position, merged_blocks)
                );
              }
            } catch (err) {
              logger.error(err);
              store.push('undefined_builds', {
                source: source_info.name,
                champ: champ_data.name,
                position: champ_data.positions,
              });
            }
          }

          progressbar.incrChamp();
        }

        return results;
      })();
    })
    .then(R.flatten)
    .then(R.reject(R.isNil))
    .then(data => store.push('sr_itemsets', data));
}
