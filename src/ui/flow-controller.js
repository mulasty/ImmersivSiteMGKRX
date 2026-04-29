import { notes } from './data.js';
import { requireElement } from './dom.js';

/**
 * Handles fulfilment-flow step state.
 *
 * The controller keeps button state and copy updates together, while callers
 * only provide the chosen step. This removes duplicated class toggling from
 * event handlers and leaves the note catalog injectable for tests or variants.
 */
export class FlowController {
  /**
   * @param {Object} options
   * @param {Document} [options.root=document] Document containing `.flow-step` buttons.
   * @param {string[]} [options.messages=notes] Operator note messages.
   */
  constructor({ root = document, messages = notes } = {}) {
    this.root = root;
    this.messages = messages;
  }

  /**
   * @param {number} index Index into the injected messages list.
   * @param {Element} activeStep Step button that should become active.
   * @returns {void}
   * @throws {Error} When `index` does not map to a configured message.
   */
  activate(index, activeStep) {
    const message = this.messages[index];
    if (!message) {
      throw new Error(`Unknown flow step: ${index}`);
    }

    requireElement(this.root, 'operator-note').textContent = message;
    this.root.querySelectorAll('.flow-step').forEach((button) => {
      const active = button === activeStep;
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('border-aqua/[0.35]', active);
      button.classList.toggle('bg-aqua/10', active);
      button.classList.toggle('border-white/10', !active);
      button.classList.toggle('bg-white/[0.04]', !active);
    });
  }
}
