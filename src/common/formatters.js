import * as R from 'ramda';

/**
 * Splice version number to two.
 * @param {String} Version number
 * @returns {String} Two digit version number
 */
export function spliceVersion(version) {
  return version.split('.').splice(0, 2).join('.');
}

/**
 * Capitalizes first letter of string
 * @param {String} String
 */
export function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Converts an array of skills to a shortanded representation
 * @param {Array} Array of skills (as letters)
 * @returns String Shorthand representation
 */
export function shorthandSkills(skills) {
  let skill_count = R.countBy(R.toLower, R.slice(0, 9, skills));
  delete skill_count.r;
  skill_count = R.invertObj(skill_count);
  const counts = R.keys(skill_count).sort().reverse();

  const skill_order = R.map(count_num => R.toUpper(skill_count[count_num]), counts);
  return `${skills.slice(0, 4).join('.')} - ${R.join('>', skill_order)}`;
}

/**
 * Converts an array of IDs to item blocks with the correct counts
 * @param {Array} Array of ids
 * @returns Array of block item
 */
export function arrayToBuilds(ids) {
  ids = R.map(id => {
    id = id.toString();
    if (id === '2010') id = '2003'; // Biscuits
    return id;
  }, ids);
  const counts = R.countBy(R.identity)(ids);
  return R.map(
    id => ({
      id,
      count: counts[id],
    }),
    R.uniq(ids)
  );
}

/**
 * Returns the item entry with highest winrate from an array
 * @param {Array} items
 */
export function pickWinrate(items) {
  return R.last(R.sortBy(R.prop('winrate'), items));
}

/**
 * Returns the item entry with highest pickrate from an array
 * @param {Array} items
 */
export function pickPickrate(items) {
  return R.last(R.sortBy(R.prop('pickrate'), items));
}
