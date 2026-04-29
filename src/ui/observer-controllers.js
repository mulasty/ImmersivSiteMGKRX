/**
 * Viewport observer controllers.
 *
 * These components apply the observer pattern explicitly: browser
 * IntersectionObserver events update UI state, while bootstrap only wires the
 * controllers and does not know the details of each state transition.
 */

export class RevealObserverController {
  /**
   * @param {Object} options
   * @param {Document} [options.root=document] Document containing `.reveal` items.
   * @param {Window} [options.win=window] Window that may provide IntersectionObserver.
   */
  constructor({ root = document, win = window } = {}) {
    this.root = root;
    this.win = win;
  }

  /**
   * @returns {IntersectionObserver | null}
   */
  setup() {
    const revealItems = this.root.querySelectorAll('.reveal');
    if (!this.win.IntersectionObserver) {
      revealItems.forEach((item) => item.classList.add('is-visible'));
      return null;
    }

    const observer = new this.win.IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16 },
    );

    revealItems.forEach((item) => observer.observe(item));
    return observer;
  }
}

export class NavObserverController {
  /**
   * @param {Object} options
   * @param {Document} [options.root=document] Document containing sections and nav links.
   * @param {Window} [options.win=window] Window that may provide IntersectionObserver.
   */
  constructor({ root = document, win = window } = {}) {
    this.root = root;
    this.win = win;
  }

  /**
   * @returns {IntersectionObserver | null}
   */
  setup() {
    const sections = this.root.querySelectorAll('main section[id]');
    const navLinks = this.root.querySelectorAll('.nav-link');
    if (!this.win.IntersectionObserver) return null;

    const observer = new this.win.IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((link) => {
            link.classList.toggle('is-active', link.getAttribute('href') === `#${entry.target.id}`);
          });
        });
      },
      { rootMargin: '-35% 0px -55% 0px' },
    );

    sections.forEach((section) => observer.observe(section));
    return observer;
  }
}
