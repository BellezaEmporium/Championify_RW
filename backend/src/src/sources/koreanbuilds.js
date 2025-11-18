import * as R from 'ramda';
import default_schema from '../../../../shared/data/default.json' with { type: 'json' };

import { trinksCon } from '../helpers/index.js';
import { arrayToBuilds, shorthandSkills } from '../../../common/formatters.js';
import { Logger } from 'electron-winston/main';
import progressbar from '../progressbar.js';
import store from '../store.js';
import T from '../translate.js';

const api_key = 'QmFzaWMga2ItZnJvbnRlbmQgVDNNMWV3dUhqMlF3c1dC';

const headers = {
  'Authorization': api_key,
  'Accept': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
}

export const source_info = {
  name: 'KoreanBuilds',
  id: 'koreanbuilds'
};

const logger = new Logger();

export async function getVersion() {
  const i = await fetch('https://api.koreanbuilds.net/champions?patchid=-1', { headers: headers })
  .then(res => res.json());
  const version = i.patches[0].patchVersion;
  // store.set returns the store, but callers expect the version string — return it explicitly
  store.set('koreanbuilds_ver', version);
  return version;
}

export function getSr() {
  if (!store.get('koreanbuilds_ver')) return getVersion().then(getSr);

  return fetch('https://api.koreanbuilds.net/champions?patchid=-1', { headers: headers })
    .then(res => res.json())
    .then(i => i.champions)
    .then(champions => {
      return champions.map(champ => {
        const name = champ.name;
        const id = champ.id;
        if (!id) return;
        return {
          id,
          name,
          formatted_name: (name, store.get('champs')) || name
        };
      })
        .then(() => logger.info('koreanbuilds: Getting Roles'))
        .map(champ_data => {
        // Prefer any existing roles field
          if (Array.isArray(champ_data.usage) && champ_data.usage.length) return champ_data;

          // Read usage info from the champion data instead of making a request
          const numberOfGamesPerRole = champ_data.builds;
          const usage = champ_data.usage;

          let roles = [];

          if (Array.isArray(numberOfGamesPerRole)) {
          // usage might be an array of role strings or objects
            roles = numberOfGamesPerRole
              .map(u => typeof u === 'string' ? u : (u.role || u.position || u.name))
              .filter(Boolean);
          } else if (numberOfGamesPerRole && typeof numberOfGamesPerRole === 'object') {
          // builds is an object like {mid: number, support: number, top: number, jungle: number, bot: number}
          // only include roles with a positive build count
            roles = Object.keys(numberOfGamesPerRole)
              .filter(k => {
                const v = numberOfGamesPerRole[k];
                if (v == null) return false;
                if (typeof v === 'number') return v > 0; // 0 means no builds -> exclude
                if (typeof v === 'object' && typeof v.rawGames === 'number') return v.rawGames > 0;
                return Boolean(v);
              });
          } else if (Array.isArray(usage)) {
          // fallback to champ_data.usage array if present
            roles = usage.map(u => typeof u === 'string' ? u : (u.role || u.name)).filter(Boolean);
          } else if (typeof usage === 'string') {
          // fallback: comma separated string
            roles = usage.split(',').map(s => s.trim()).filter(Boolean);
          }

          champ_data.roles = roles;
          return champ_data;
        }, {concurrency: 3})
        .then(R.reverse)
        .map(champ_data => {
          logger.info(`${T.t('processing')} Koreanbuilds: ${T.t(champ_data.formatted_name.toLowerCase().replace(/[^a-z]/g, ''))}`);
          progressbar.incrChamp();

          // KoreanBuilds' API doesn't enforce any parameter related to roles, so all builds will go on one shot.
          // We'll need to manually filter by sorting the builds later on.
          return Promise.resolve(champ_data.roles)
            .map(role => fetch(`https://api.koreanbuilds.net/builds?chmpname=${champ_data.name}&patchid=-1`, { headers: headers })
              .then(c => c.json())
              .then(champ_build => {
                // Only get 5 builds with the highest confidence rate.
                let confident_builds = [];
                // Item sets
                if(champ_build.builds2 !== undefined) {
                  champ_build.builds2
                    .sort((a, b) => b.confidenceScore - a.confidenceScore)
                    .slice(0, 4)
                    .forEach(build => {
                      confident_builds.push(build.itemSets);
                    });
                } else if (champ_build.builds3 !== undefined) {
                  champ_build.builds3
                    .sort((a, b) => b.confidenceScore - a.confidenceScore)
                    .slice(0, 4)
                    .forEach(build => {
                      confident_builds.push(build.itemSets);
                    });
                }

                confident_builds.forEach(build => {
                  const items = build.itemSets[0];
                  const early_items = build.strItemSets[0];

                  // Parse skillOrder like "1321141313433224" into a readable skill string/array
                  const skillOrderRaw = build.skillSets && (Array.isArray(build.skillSets.skillOrder) ? build.skillSets.skillOrder[0] : build.skillSets.skillOrder);
                  const _skillMap = { '1': 'Q', '2': 'W', '3': 'E', '4': 'R' };
                  let parsedSkillOrder = '';

                  if (typeof skillOrderRaw === 'string') {
                    const mapped = skillOrderRaw.split('').map(d => _skillMap[d]).filter(Boolean);
                    // respect user setting for shorthand vs dotted format
                    if (store.get('settings').skillsformat) {
                      parsedSkillOrder = shorthandSkills(mapped);
                    } else {
                      parsedSkillOrder = mapped.join('.');
                    }
                  }

                  // attach to the build so it can be inspected/used later if needed
                  build.parsedSkillOrder = parsedSkillOrder;

                  const games_played = build.games;
                  const stats = build.playStyle;

                  const block = [
                    {
                      items: arrayToBuilds(early_items),
                      type: `${T.t('starter', true)} - ${stats} - ${games_played} ${T.t('games_played', true)}`
                    },
                    {
                      items: arrayToBuilds(items),
                      type: T.t('core_items', true)
                    }
                  ];

                  const riot_json = R.mergeRight(R.clone(default_schema, true), {
                    champion: champ_data.formatted_name,
                    title: `KRB ${role} ${store.get('koreanbuilds_ver')}`,
                    blocks: trinksCon(block, {highest_win: parsedSkillOrder, most_freq: parsedSkillOrder})
                  });

                  return {
                    champ: champ_data.formatted_name,
                    file_prefix: role,
                    riot_json,
                    source: 'koreanbuilds'
                  };
                });
              })
            )
            .catch(err => {
              logger.warn(err);
              store.push('undefined_builds', {champ: champ_data.formatted_name, position: champ_data.roles, source: source_info.name});
            });
        }, {concurrency: 3})
        .then(R.flatten)
        .then(R.reject(R.isNil))
        .then(data => store.push('sr_itemsets', data));
    });
};