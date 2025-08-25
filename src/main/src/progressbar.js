import store from './store.js';

class ProgressBar {
  constructor() {
    this.percentage = 0;
  }

  reset() {
    this.percentage = 0;
  }

  incrUI(id, incr = this.percentage) {
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

  incrChamp(divisiable = 1) {
    if (import.meta.env.NODE_ENV === 'test') return;

    const settings = store.get('settings');
    const champs = store.get('champs').length;
    let sources = settings.sr_source.length;
    if (settings.aram) sources++;

    this.incr(100 / champs / sources / divisiable);
  }
}

const progressbar = new ProgressBar();
export default progressbar;
