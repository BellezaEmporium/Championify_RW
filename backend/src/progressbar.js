import store from './store.js';

class ProgressBar {
  constructor() {
    this.percentage = 0;
  }

  reset() {
    this.percentage = 0;
  }

  incrUI(id, incr = this.percentage) {
    // If running in a non-renderer context (main process / node) there's no document.
    if (typeof document === 'undefined') return null;

    let floored = Math.floor(incr);
    if (floored > 100) floored = 100;

    const barContainer = document.getElementById(id);
    if (!barContainer) return;
    barContainer.setAttribute('data-percent', floored);

    const bar = barContainer.querySelector('.bar');
    if (bar) {
      bar.style.width = `${floored}%`;
    }

    const progress = barContainer.querySelector('.progress');
    if (progress) {
      progress.textContent = `${floored}%`;
    }
    return progress;
  }

  /**
   * Updates the progress bar on the interface.
   * @param {Number} Increment progress bar.
   */

  incr(incr) {
    if (import.meta.env.NODE_ENV === 'test') return;

    this.percentage += incr;
    this.incrUI('itemsets_progress_bar', this.percentage);
    // Don't attempt to update native taskbar progress if not running in renderer
    if (
      typeof window === 'undefined' ||
      !window.electronAPI ||
      !window.electronAPI.getCurrentWindow
    )
      return;

    if (this.percentage >= 100) {
      window.electronAPI.getCurrentWindow().setProgressBar(-1);
    } else {
      window.electronAPI.getCurrentWindow().setProgressBar(this.percentage / 100);
    }
  }

  /**
   * Increment for when processing champs and calculates the precentage.
   * @param {Number} [1] The amount of times to be called before it's considered an increase (see Lolflavor)
   */

  incrChamp(divisable = 1) {
    if (import.meta.env.NODE_ENV === 'test') return;

    const settings = store.get('settings');
    const champsArr = store.get('champs') || [];
    const champs = Math.max(1, champsArr.length);

    // Determine selected sources safely. settings or sr_source may be undefined.
    let sources = 1;
    if (settings && Array.isArray(settings.sr_source)) {
      // Count only truthy entries (filters out empty strings)
      sources = settings.sr_source.filter(Boolean).length;
    }
    if (sources === 0) sources = 1; // avoid division by zero
    if (settings && settings.aram) sources++;

    this.incr(100 / champs / sources / divisable);
  }
}

const progressbar = new ProgressBar();
export default progressbar;
