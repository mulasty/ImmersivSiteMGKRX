/**
 * @module src/app
 * @description
 * Compatibility facade for the Commerce Flight UI.
 *
 * Refactor rationale:
 * - The previous module mixed static data, scene rendering, form behavior,
 *   observers, scroll progress, canvas animation and bootstrap side effects.
 * - The new implementation applies a Facade over smaller components, with
 *   Factory (`RouteItemFactory`), Strategy-friendly injection (`SceneRenderer`)
 *   and Observer controllers (`RevealObserverController`, `NavObserverController`).
 * - Existing exports remain available so migration can be incremental.
 */

import { AppController } from './ui/app-controller.js';
import { CanvasField } from './ui/canvas-field.js';
import { progressRatio } from './ui/dom.js';
import { DemoFormController } from './ui/form-controller.js';
import { FlowController } from './ui/flow-controller.js';
import { NavObserverController, RevealObserverController } from './ui/observer-controllers.js';
import { ProgressController } from './ui/progress-controller.js';
import { RouteItemFactory, SceneRenderer } from './ui/scene-renderer.js';

export { AppController } from './ui/app-controller.js';
export { CanvasField } from './ui/canvas-field.js';
export { colorMap, notes, scenes } from './ui/data.js';
export { progressRatio } from './ui/dom.js';
export { DemoFormController } from './ui/form-controller.js';
export { FlowController } from './ui/flow-controller.js';
export { NavObserverController, RevealObserverController } from './ui/observer-controllers.js';
export { ProgressController } from './ui/progress-controller.js';
export { RouteItemFactory, SceneRenderer } from './ui/scene-renderer.js';

/**
 * Render a commerce scene with the new SceneRenderer component.
 *
 * @param {string} name Scene key.
 * @param {Document} [root=document] Document containing app markup.
 * @returns {void}
 */
export function renderScene(name, root = document) {
  new SceneRenderer({ root }).render(name);
}

/**
 * Activate a fulfilment flow step with the new FlowController component.
 *
 * @param {number} index Step index.
 * @param {Element} activeStep Active button element.
 * @param {Document} [root=document] Document containing flow markup.
 * @returns {void}
 */
export function setFlowStep(index, activeStep, root = document) {
  new FlowController({ root }).activate(index, activeStep);
}

/**
 * Update the scroll progress bar.
 *
 * @param {Document} [root=document] Document containing `#progress`.
 * @param {Window} [win=window] Window containing scroll state.
 * @returns {number} Applied progress ratio.
 */
export function updateProgress(root = document, win = window) {
  return new ProgressController({ root, win }).update();
}

/**
 * Attach scene tab listeners.
 *
 * @param {Document} [root=document] Document containing `.scene-tab` controls.
 * @returns {void}
 */
export function setupSceneTabs(root = document) {
  const renderer = new SceneRenderer({ root });
  root.querySelectorAll('.scene-tab').forEach((tab) => {
    tab.addEventListener('click', () => renderer.render(tab.dataset.scene));
  });
}

/**
 * Attach fulfilment flow listeners.
 *
 * @param {Document} [root=document] Document containing `.flow-step` controls.
 * @returns {void}
 */
export function setupFlowSteps(root = document) {
  const controller = new FlowController({ root });
  root.querySelectorAll('.flow-step').forEach((step) => {
    step.addEventListener('click', () => {
      controller.activate(Number(step.dataset.step), step);
    });
  });
}

/**
 * Attach demo form feedback behavior.
 *
 * @param {Document} [root=document] Document containing the form.
 * @returns {void}
 */
export function setupDemoForm(root = document) {
  new DemoFormController({ root }).setup();
}

/**
 * Configure reveal observer behavior.
 *
 * @param {Document} [root=document] Document containing `.reveal` elements.
 * @param {Window} [win=window] Window that may provide IntersectionObserver.
 * @returns {IntersectionObserver | null}
 */
export function setupRevealObserver(root = document, win = window) {
  return new RevealObserverController({ root, win }).setup();
}

/**
 * Configure active-navigation observer behavior.
 *
 * @param {Document} [root=document] Document containing sections and nav links.
 * @param {Window} [win=window] Window that may provide IntersectionObserver.
 * @returns {IntersectionObserver | null}
 */
export function setupNavObserver(root = document, win = window) {
  return new NavObserverController({ root, win }).setup();
}

/**
 * Create and start the decorative canvas field.
 *
 * @param {Document} [root=document] Document containing `#field`.
 * @param {Window} [win=window] Window used for dimensions and animation.
 * @returns {CanvasField | null}
 */
export function createCanvasField(root = document, win = window) {
  return new CanvasField({ root, win }).setup();
}

/**
 * Bootstrap the entire UI.
 *
 * @param {Object} [options] Dependency injection options.
 * @param {Document} [options.root=document] Document containing app markup.
 * @param {Window} [options.win=window] Window associated with the document.
 * @returns {{ canvasField: CanvasField | null, navObserver: IntersectionObserver | null, revealObserver: IntersectionObserver | null }}
 */
export function setupApp({ root = document, win = window } = {}) {
  return new AppController({ root, win }).setup();
}

if (typeof document !== 'undefined') {
  const start = () => setupApp();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
}
