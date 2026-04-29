import { CanvasField } from './canvas-field.js';
import { DemoFormController } from './form-controller.js';
import { FlowController } from './flow-controller.js';
import { NavObserverController, RevealObserverController } from './observer-controllers.js';
import { ProgressController } from './progress-controller.js';
import { SceneRenderer } from './scene-renderer.js';

/**
 * Application composition root.
 *
 * This class applies dependency injection: callers can provide alternate
 * controller implementations in tests or future product variants. The old
 * module-level API delegates here through `src/app.js`.
 */
export class AppController {
  /**
   * @param {Object} options
   * @param {Document} [options.root=document] Document containing the app markup.
   * @param {Window} [options.win=window] Window associated with `root`.
   * @param {SceneRenderer} [options.sceneRenderer] Scene renderer strategy.
   * @param {FlowController} [options.flowController] Flow controller.
   * @param {DemoFormController} [options.formController] Form controller.
   * @param {ProgressController} [options.progressController] Progress controller.
   * @param {RevealObserverController} [options.revealObserverController] Reveal observer.
   * @param {NavObserverController} [options.navObserverController] Nav observer.
   * @param {CanvasField} [options.canvasField] Canvas field instance.
   */
  constructor({ root = document, win = window, ...overrides } = {}) {
    this.root = root;
    this.win = win;
    this.sceneRenderer = overrides.sceneRenderer ?? new SceneRenderer({ root });
    this.flowController = overrides.flowController ?? new FlowController({ root });
    this.formController = overrides.formController ?? new DemoFormController({ root });
    this.progressController = overrides.progressController ?? new ProgressController({ root, win });
    this.revealObserverController = overrides.revealObserverController ?? new RevealObserverController({ root, win });
    this.navObserverController = overrides.navObserverController ?? new NavObserverController({ root, win });
    this.canvasField = overrides.canvasField ?? new CanvasField({ root, win });
  }

  /**
   * @returns {{ canvasField: CanvasField | null, navObserver: IntersectionObserver | null, revealObserver: IntersectionObserver | null }}
   */
  setup() {
    this.setupSceneTabs();
    this.setupFlowSteps();
    this.formController.setup();
    const revealObserver = this.revealObserverController.setup();
    const navObserver = this.navObserverController.setup();

    this.win.addEventListener('scroll', () => this.progressController.update(), { passive: true });
    this.progressController.update();
    this.sceneRenderer.render('integrations');
    const canvasField = this.canvasField.setup();

    return {
      canvasField,
      navObserver,
      revealObserver,
    };
  }

  /**
   * @returns {void}
   */
  setupSceneTabs() {
    this.root.querySelectorAll('.scene-tab').forEach((tab) => {
      tab.addEventListener('click', () => this.sceneRenderer.render(tab.dataset.scene));
    });
  }

  /**
   * @returns {void}
   */
  setupFlowSteps() {
    this.root.querySelectorAll('.flow-step').forEach((step) => {
      step.addEventListener('click', () => {
        this.flowController.activate(Number(step.dataset.step), step);
      });
    });
  }
}
