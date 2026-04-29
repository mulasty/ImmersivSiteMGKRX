import { progressRatio, requireElement } from './dom.js';

/**
 * Owns scroll progress updates.
 *
 * Injecting the window/document pair makes the class easy to test and avoids
 * tight coupling to browser globals.
 */
export class ProgressController {
  /**
   * @param {Object} options
   * @param {Document} [options.root=document] Document containing `#progress`.
   * @param {Window} [options.win=window] Window used for scroll metrics.
   */
  constructor({ root = document, win = window } = {}) {
    this.root = root;
    this.win = win;
  }

  /**
   * @returns {number} Applied progress ratio.
   */
  update() {
    const value = progressRatio(this.root.documentElement.scrollHeight, this.win.innerHeight, this.win.scrollY);
    requireElement(this.root, 'progress').style.transform = `scaleX(${value})`;
    return value;
  }
}
