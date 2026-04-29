
function getFlags() {
  if (typeof window === 'undefined') return [];
  const url = new URL(window.location.href);
  const flags = new Set();
  for (const [k, v] of url.searchParams.entries()) {
    if (v === '' || v === 'true') flags.add(`--${k}`);
    // flags=--import,--delete
    if (k === 'flags') {
      v.split(',').forEach(f => flags.add(f.trim()));
    }
  }
  // hash style #--import;--delete
  if (url.hash) {
    url.hash
      .replace('#', '')
      .split(/[;,]/)
      .forEach(seg => {
        const s = seg.trim();
        if (s.startsWith('--')) flags.add(s);
      });
  }
  return Array.from(flags);
}

function _processArgs(arg) {
  return getFlags().includes(arg);
}

export default {
  /**
   * Checks if '--import' is in process arguments
   * @returns {Boolean}
   */
  import: function () {
    return _processArgs('--import');
  },
  /**
   * Checks if '--delete' is in process arguments
   * @returns {Boolean}
   */
  delete: function () {
    return _processArgs('--delete');
  },
  /**
   * Checks if '--close' is in process arguments
   * @returns {Boolean}
   */
  close: function () {
    return _processArgs('--close');
  },
  /**
   * Checks if '--autorun' is in process arguments
   * @returns {Boolean}
   */
  autorun: function () {
    return _processArgs('--autorun');
  },
  /**
   * Checks if '--start-league' is in process arguments
   * @returns {Boolean}
   */
  startLeague: function () {
    return _processArgs('--start-league');
  },
  /**
   * Checks if '--runned-as-admin' is in process arguments
   * @returns {Boolean}
   */
  runnedAsAdmin: function () {
    return _processArgs('--runned-as-admin');
  },
  /**
   * Checks if '--update' is in process arguments
   * @returns {Boolean}
   */
  update: function () {
    return _processArgs('--update');
  },
};
