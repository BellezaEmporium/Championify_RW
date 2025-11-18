import { default_schema } from '../shared/index.js';
import { cl, trinksCon } from '../helpers/index.js';
import ChampionifyErrors from '../errors.js';
import T from '../translate.js';
import progressbar from '../progressbar.js';
import store from '../store.js';

class WebLogger {
  error(...a) { console.error('[Championify]', ...a); }
  info(...a) { console.info('[Championify]', ...a); }
  warn(...a) { console.warn('[Championify]', ...a); }
}
const logger = new WebLogger();

export const source_info = {
  name: 'ProBuilds',
  id: 'probuilds',
};

async function getChamps() {
  const res = await fetch(
    `https://blitz-cdn-plain.blitz.gg/blitz/ddragon/${await getVersion()}/data/en_US/champions.json`
  );
  const data = await res.json();
  const champions = data?.champions || [];
  return champions.map(champ => {
    const id = champ.key;
    const name = champ.name;
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
      position,
    });
    throw new ChampionifyErrors.Error('ProBuilds : ' + _error);
  }

  const variables = {
    championId: champion.id,
    queue: 'RANKED_SOLO_5X5',
    role: position,
  };

  try {
    const response = await fetch('https://datalake.v2.iesdev.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
        variables,
      }),
    });

    const json = await response.json();
    const dataArray = json?.data?.executeDatabricksQuery?.payload?.result?.dataArray;
    if (!dataArray) throw new Error('No builds data found');

    const itemBuildsJson = dataArray?.[0]?.[8];
    let itemBuilds = [];
    if (itemBuildsJson) {
      try {
        itemBuilds = JSON.parse(itemBuildsJson);
      } catch (e) {
        logger.warn(`Failed to parse item builds for ${champion.id}: ${e}`);
      }
    }

    const blocks = itemBuilds.map(build => ({
      items: build.itemIds.split(',').map(id => ({ id, count: 1 })),
      type: 'Most Popular',
    }));

    const riot_json = {
      ...default_schema,
      champion: champion.id,
      title: `ProBuilds ${dataArray?.[0]?.[0] ?? ''}`,
      blocks: trinksCon(blocks),
    };

    progressbar.incrChamp();
    return {
      champ: champion,
      file_prefix: 'all',
      riot_json,
      source: source_info.id,
    };
  } catch (err) {
    logger.error(err);
    store.push('undefined_builds', {
      source: source_info.name,
      champ: champion,
      position: 'All',
    });
  }
}

export async function getSr() {
  const positions = ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'];
  const champions = await getChamps();
  const promises = [];
  for (const champion of champions) {
    for (const position of positions) {
      promises.push(getItems(champion, position));
    }
  }
  const results = await Promise.all(promises);
  const data = results.filter(v => v != null);
  store.push('sr_itemsets', data);
}

export async function getVersion() {
  try {
    const r = await fetch('https://utils.iesdev.com/static/json/lol/riot/versions', {
      headers: { 'Content-Type': 'application/json' },
    }).then(res => res.json());
    return r?.[0] || '';
  } catch (err) {
    logger.error(err);
    return '';
  }
}
