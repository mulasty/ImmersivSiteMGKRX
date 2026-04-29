import { colorMap, sceneTabClasses, scenes } from './data.js';
import { requireElement } from './dom.js';

/**
 * Factory for route list items.
 *
 * The factory pattern isolates element construction from the renderer. That
 * keeps SceneRenderer focused on orchestration and makes route markup easier
 * to replace without changing scene-selection behavior.
 */
export class RouteItemFactory {
  /**
   * @param {Document} root Document used to create elements.
   */
  constructor(root) {
    this.root = root;
  }

  /**
   * @param {string} item Route step label.
   * @param {number} index Zero-based route position.
   * @returns {HTMLLIElement}
   */
  create(item, index) {
    const li = this.root.createElement('li');
    li.className = 'flex items-start gap-3';

    const number = this.root.createElement('span');
    number.className =
      'mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-md border border-aqua/[0.35] bg-aqua/10 font-mono text-xs text-aqua';
    number.textContent = String(index + 1).padStart(2, '0');

    const label = this.root.createElement('span');
    label.textContent = item;

    li.append(number, label);
    return li;
  }
}

/**
 * Renders configured commerce scenes into the page.
 *
 * This is a small Strategy-friendly component: the scene catalog, color map
 * and route item factory are injected instead of hard-coded, so callers can
 * swap scene definitions or markup strategy without rewriting the renderer.
 */
export class SceneRenderer {
  /**
   * @param {Object} options
   * @param {Document} [options.root=document] Document containing the app markup.
   * @param {Record<string, Object>} [options.sceneCatalog=scenes] Scene definitions.
   * @param {Record<string, string>} [options.colors=colorMap] Color token map.
   * @param {{ active: string, inactive: string }} [options.tabClasses=sceneTabClasses] Tab class presets.
   * @param {{ create: (item: string, index: number) => HTMLLIElement }} [options.routeItemFactory] Route item factory.
   */
  constructor({
    root = document,
    sceneCatalog = scenes,
    colors = colorMap,
    tabClasses = sceneTabClasses,
    routeItemFactory = new RouteItemFactory(root),
  } = {}) {
    this.root = root;
    this.sceneCatalog = sceneCatalog;
    this.colors = colors;
    this.tabClasses = tabClasses;
    this.routeItemFactory = routeItemFactory;
  }

  /**
   * @param {string} name Scene key.
   * @returns {void}
   * @throws {Error} When the scene or required markup is missing.
   */
  render(name) {
    const scene = this.getScene(name);
    const orbitNodes = requireElement(this.root, 'orbit-nodes');
    const orbitLinks = requireElement(this.root, 'orbit-links');
    const routeList = requireElement(this.root, 'route-list');

    requireElement(this.root, 'scene-kicker').textContent = scene.kicker;
    requireElement(this.root, 'scene-title').textContent = scene.title;
    requireElement(this.root, 'scene-health').textContent = scene.health;
    requireElement(this.root, 'orbit-status').textContent = scene.status;
    requireElement(this.root, 'throughput').textContent = scene.throughput;
    requireElement(this.root, 'metric-percent').textContent = scene.percent;
    this.root.querySelector('.metric-ring').style.setProperty('--value', scene.value);
    requireElement(this.root, 'scene-copy').textContent = scene.copy;

    orbitNodes.replaceChildren();
    orbitLinks.replaceChildren();
    routeList.replaceChildren();

    scene.nodes.forEach(([label, x, y, color]) => {
      orbitNodes.append(this.createNode(label, x, y, color));
      orbitLinks.append(this.createLink(x, y, color));
    });

    scene.route.forEach((item, index) => {
      routeList.append(this.routeItemFactory.create(item, index));
    });

    this.updateTabs(name);
  }

  /**
   * @private
   * @param {string} name
   * @returns {Object}
   */
  getScene(name) {
    const scene = this.sceneCatalog[name];
    if (!scene) {
      throw new Error(`Unknown scene: ${name}`);
    }
    return scene;
  }

  /**
   * @private
   * @param {string} label
   * @param {number} x
   * @param {number} y
   * @param {string} color
   * @returns {HTMLDivElement}
   */
  createNode(label, x, y, color) {
    const node = this.root.createElement('div');
    node.className = 'orbit-node absolute grid h-14 w-14 place-items-center rounded-lg border bg-ink/90 text-xs font-black text-white';
    node.style.left = `${x}%`;
    node.style.top = `${y}%`;
    node.style.borderColor = `${this.colors[color]}88`;
    node.style.color = this.colors[color];
    node.textContent = label;
    return node;
  }

  /**
   * @private
   * @param {number} x
   * @param {number} y
   * @param {string} color
   * @returns {HTMLSpanElement}
   */
  createLink(x, y, color) {
    const dx = 50 - x;
    const dy = 50 - y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const link = this.root.createElement('span');
    link.className = 'orbit-link absolute left-1/2 top-1/2 h-px';
    link.style.width = `${length}%`;
    link.style.background = `linear-gradient(90deg, ${this.colors[color]}99, transparent)`;
    link.style.transform = `rotate(${angle}deg)`;
    link.style.animation = 'pulse-line 2.8s ease-in-out infinite';
    return link;
  }

  /**
   * @private
   * @param {string} activeScene
   * @returns {void}
   */
  updateTabs(activeScene) {
    this.root.querySelectorAll('.scene-tab').forEach((tab) => {
      const active = tab.dataset.scene === activeScene;
      tab.setAttribute('aria-pressed', String(active));
      tab.className = active
        ? this.tabClasses.active
        : `scene-tab${tab.dataset.scene === 'map' ? ' hidden sm:inline-flex' : ''}${this.tabClasses.inactive}`;
    });
  }
}
