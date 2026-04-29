import { requireElement } from './dom.js';

/**
 * Handles the demo request form.
 *
 * The form strategy is intentionally simple today: prevent navigation and
 * provide immediate feedback. If this later posts to an API, the submit
 * strategy can be injected here without touching bootstrap code.
 */
export class DemoFormController {
  /**
   * @param {Object} options
   * @param {Document} [options.root=document] Document containing the form.
   */
  constructor({ root = document } = {}) {
    this.root = root;
  }

  /**
   * @returns {void}
   */
  setup() {
    const form = this.root.querySelector('form');
    if (!form) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const email = new this.root.defaultView.FormData(form).get('email');
      requireElement(this.root, 'form-status').textContent = email
        ? `Access request staged for ${email}.`
        : 'Enter an email to stage the request.';
    });
  }
}
