import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';
import { AppController, renderScene, setFlowStep } from '../src/app.js';
import { FlowController } from '../src/ui/flow-controller.js';
import { ProgressController } from '../src/ui/progress-controller.js';
import { RouteItemFactory, SceneRenderer } from '../src/ui/scene-renderer.js';

function createSceneDom() {
  return new JSDOM(`
    <main>
      <button class="scene-tab" data-scene="integrations" aria-pressed="true"></button>
      <button class="scene-tab" data-scene="orders" aria-pressed="false"></button>
      <button class="scene-tab" data-scene="map" aria-pressed="false"></button>
      <p id="scene-kicker"></p>
      <h2 id="scene-title"></h2>
      <p id="scene-health"></p>
      <p id="orbit-status"></p>
      <p id="throughput"></p>
      <p id="metric-percent"></p>
      <div class="metric-ring"></div>
      <p id="scene-copy"></p>
      <div id="orbit-nodes"></div>
      <div id="orbit-links"></div>
      <ol id="route-list"></ol>
      <p id="operator-note"></p>
      <button class="flow-step" data-step="0"></button>
      <button class="flow-step" data-step="1"></button>
      <span id="progress"></span>
    </main>
  `);
}

describe('refactored UI architecture', () => {
  it('keeps legacy facade scene rendering equivalent to the SceneRenderer component', () => {
    const legacyDom = createSceneDom();
    const componentDom = createSceneDom();

    renderScene('orders', legacyDom.window.document);
    new SceneRenderer({ root: componentDom.window.document }).render('orders');

    expect(legacyDom.window.document.getElementById('scene-title').textContent).toBe(
      componentDom.window.document.getElementById('scene-title').textContent,
    );
    expect(legacyDom.window.document.getElementById('route-list').textContent).toBe(
      componentDom.window.document.getElementById('route-list').textContent,
    );
    expect(legacyDom.window.document.querySelector('[data-scene="orders"]').getAttribute('aria-pressed')).toBe(
      componentDom.window.document.querySelector('[data-scene="orders"]').getAttribute('aria-pressed'),
    );

    legacyDom.window.close();
    componentDom.window.close();
  });

  it('keeps legacy flow facade equivalent to the FlowController component', () => {
    const legacyDom = createSceneDom();
    const componentDom = createSceneDom();
    const legacyStep = legacyDom.window.document.querySelector('[data-step="1"]');
    const componentStep = componentDom.window.document.querySelector('[data-step="1"]');

    setFlowStep(1, legacyStep, legacyDom.window.document);
    new FlowController({ root: componentDom.window.document }).activate(1, componentStep);

    expect(legacyDom.window.document.getElementById('operator-note').textContent).toBe(
      componentDom.window.document.getElementById('operator-note').textContent,
    );
    expect(legacyStep.getAttribute('aria-pressed')).toBe(componentStep.getAttribute('aria-pressed'));

    legacyDom.window.close();
    componentDom.window.close();
  });

  it('uses factory injection for alternate route item markup', () => {
    const dom = createSceneDom();
    const factory = new RouteItemFactory(dom.window.document);
    const spy = vi.spyOn(factory, 'create');

    new SceneRenderer({ root: dom.window.document, routeItemFactory: factory }).render('map');

    expect(spy).toHaveBeenCalledTimes(4);
    expect(dom.window.document.querySelectorAll('#route-list li')).toHaveLength(4);
    dom.window.close();
  });

  it('composes AppController with injected dependencies', () => {
    const dom = createSceneDom();
    Object.defineProperty(dom.window, 'scrollY', { configurable: true, value: 0 });
    Object.defineProperty(dom.window, 'innerHeight', { configurable: true, value: 800 });
    const sceneRenderer = { render: vi.fn() };
    const flowController = { activate: vi.fn() };
    const formController = { setup: vi.fn() };
    const revealObserverController = { setup: vi.fn(() => null) };
    const navObserverController = { setup: vi.fn(() => null) };
    const canvasField = { setup: vi.fn(() => null) };

    const app = new AppController({
      root: dom.window.document,
      win: dom.window,
      sceneRenderer,
      flowController,
      formController,
      progressController: new ProgressController({ root: dom.window.document, win: dom.window }),
      revealObserverController,
      navObserverController,
      canvasField,
    }).setup();

    expect(formController.setup).toHaveBeenCalled();
    expect(revealObserverController.setup).toHaveBeenCalled();
    expect(navObserverController.setup).toHaveBeenCalled();
    expect(sceneRenderer.render).toHaveBeenCalledWith('integrations');
    expect(app.canvasField).toBeNull();

    dom.window.close();
  });
});
