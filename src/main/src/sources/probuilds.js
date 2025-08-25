import * as R from 'ramda';
import default_schema from '../../../../shared/data/default.json' with { type: 'json' };

import { cl, trinksCon } from '../helpers/index.js';
import { arrayToBuilds } from '../../../common/formatters.js';
import ChampionifyErrors from '../errors.js';
import { Logger } from 'electron-winston/main';
import T from '../translate.js';
import progressbar from '../progressbar.js';
import store from '../store.js';

const logger = new Logger();

/**
 * Export
 */
export const source_info = {
  name: 'ProBuilds',
  id: 'probuilds'
};

function getChamps() {
  return fetch(`https://blitz-cdn-plain.blitz.gg/blitz/ddragon/${getVersion()}/data/en_US/champions.json`)
    .then(res => res.json())
    .then(R.prop('champions'))
    .map(champ => {
      const id = R.prop('key', champ);
      const name = R.prop('name', champ);
      store.set(`champ_ids.${id}`, id);
      return { id, name };
    });
}

async function getItems(champion, position) {
  try {
    cl(`${T.t('processing')} ProBuilds: ${T.t(champion.name)} - ${T.t(position)}`);
  } catch (_error) {
    store.push('undefined_builds', {
      source: source_info.name,
      champ: champion,
      position: position
    });
    console.log('ProBuilds : ' + _error);
    return;
  }

  const variables = {
    championId: champion.id,
    queue: "RANKED_SOLO_5X5",
    role: position
  };

  try {
    const response = await fetch('https://datalake.v2.iesdev.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: `
          query ChampionBuildsTagged($championId:String! $queue:String! $role:String) {
            executeDatabricksQuery(
              game: LEAGUE
              queryName: "prod_champion_builds_tags"
              params: [
                {name: "individual_position", value: $role}
                {name: "queue_id", value: $queue}
                {name: "champion_id", value: $championId}
              ]
            ) {
              payload
            }
          }
        `,
        variables
      })
    });

    // Extract dataArray from the response. Response's not made for reading, that's for sure :/
    const dataArray = R.path(['data', 'executeDatabricksQuery', 'payload', 'result', 'dataArray'], response);
    if (!dataArray) throw new Error('No builds data found');

    // The item builds are in column 8 (index 8) as a JSON string array of objects with itemIds
    // We'll parse the first row's item builds as an example (usually, you may want to aggregate or pick the most popular)
    const itemBuildsJson = dataArray[0]?.[8];
    let itemBuilds = [];
    try {
      itemBuilds = JSON.parse(itemBuildsJson);
    } catch (e) {
      logger.warn(`Failed to parse item builds for ${champ}: ${e}`);
    }

    // Convert itemIds string to array of item objects
    const blocks = itemBuilds.map(build => ({
      items: build.itemIds.split(',').map(id => ({ id, count: 1 })),
      type: 'Most Popular'
    }));

    const riot_json = R.mergeRight(default_schema, {
      champion: champion.id,
      title: `ProBuilds ${dataArray[0]?.[0]}`,
      blocks
    });

    riot_json.blocks = trinksCon(riot_json.blocks);
    progressbar.incrChamp();
    return { champ, file_prefix: 'all', riot_json, source: 'probuilds' };
  } catch (err) {
    logger.error(err);
    store.push('undefined_builds', {
      source: source_info.name,
      champ,
      position: 'All'
    });
  }
}

export function getSr() {
  const positions = ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'];
  return getChamps()
    .map(champion => {
      positions.forEach(position => getItems(champion, position), { concurrency: 3 });
    })
    .then(R.reject(R.isNil))
    .then(data => store.push('sr_itemsets', data));
}

export async function getVersion() {
  try {
    const r = await fetch('https://utils.iesdev.com/static/json/lol/riot/versions', { headers: { 'Content-Type': 'application/json' } })
      .then(res => res.json());
    const latestVersion = r[0];
    return await Promise.resolve(latestVersion);
  } catch (err) {
    logger.error(err);
    return await Promise.resolve('');
  }
}

