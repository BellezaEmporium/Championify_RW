/**
 * Common formatters utilities for Championify
 * Shared between frontend and backend
 */

/**
 * Capitalizes first letter of string
 * @param {String} str String to capitalize
 * @returns {String} Capitalized string
 */
export function capitalize(str) {
  if (!str || typeof str !== 'string') return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Splice version number to two digits
 * @param {String} version Version number (e.g. "1.2.3")
 * @returns {String} Two digit version number (e.g. "1.2")
 */
export function spliceVersion(version) {
  if (!version || typeof version !== 'string') return version;
  const parts = version.split('.');
  return parts.slice(0, 2).join('.');
}

/**
 * Converts an array of skills to a shorthand representation
 * @param {Array<String>} skills Array of skills (as letters: Q, W, E, R)
 * @returns {String} Shorthand representation (e.g. "Q>W>E")
 */
export function shorthandSkills(skills) {
  if (!Array.isArray(skills) || skills.length === 0) return '';

  // Count occurrences of each skill
  const counts = {};
  const order = [];

  for (const skill of skills) {
    if (!counts[skill]) {
      counts[skill] = 0;
      order.push(skill);
    }
    counts[skill]++;
  }

  // Sort by count (descending)
  order.sort((a, b) => counts[b] - counts[a]);

  return order.join('>');
}

/**
 * Converts an array of item IDs to item blocks with the correct counts
 * @param {Array<Number|String>} items Array of item IDs
 * @returns {Array<Object>} Array of block items with id and count
 */
export function arrayToBuilds(items) {
  if (!Array.isArray(items)) return [];

  const builds = [];
  const counts = {};

  // Count occurrences of each item
  for (const item of items) {
    if (item && item !== '0' && item !== 0) {
      counts[item] = (counts[item] || 0) + 1;
    }
  }

  // Create build blocks
  for (const [id, count] of Object.entries(counts)) {
    builds.push({
      id: String(id),
      count: count,
    });
  }

  return builds;
}

/**
 * Pick winrate from data
 * @param {Object} data Data object with win/games properties
 * @returns {Number} Winrate percentage
 */
export function pickWinrate(data) {
  if (!data || typeof data !== 'object') return 0;

  if (data.winrate !== undefined) {
    return parseFloat(data.winrate);
  }

  if (data.win !== undefined && data.games !== undefined) {
    const games = parseFloat(data.games) || 1;
    const wins = parseFloat(data.win) || 0;
    return (wins / games) * 100;
  }

  return 0;
}

/**
 * Pick pickrate from data
 * @param {Object} data Data object with pick/games properties
 * @returns {Number} Pickrate percentage
 */
export function pickPickrate(data) {
  if (!data || typeof data !== 'object') return 0;

  if (data.pickrate !== undefined) {
    return parseFloat(data.pickrate);
  }

  if (data.pick !== undefined && data.total !== undefined) {
    const total = parseFloat(data.total) || 1;
    const picks = parseFloat(data.pick) || 0;
    return (picks / total) * 100;
  }

  return 0;
}
