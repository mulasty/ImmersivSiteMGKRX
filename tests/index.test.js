import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import fc from 'fast-check';
import { JSDOM, VirtualConsole } from 'jsdom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createCanvasField,
  progressRatio,
  renderScene,
  setFlowStep,
  setupApp,
  setupDemoForm,
  setupNavObserver,
  setupRevealObserver,
  updateProgress,
} from '../src/app.js';

const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
const openWindows = [];

function loadApp({ width = 1280, height = 800, reducedMotion = true } = {}) {
  const observerInstances = [];
  const canvasContext = {
    clearRect: vi.fn(),
    setTransform: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
  };
  const virtualConsole = new VirtualConsole();
  const scriptErrors = [];
  virtualConsole.on('jsdomError', (error) => {
    scriptErrors.push(error);
  });

  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'http://localhost/',
    virtualConsole,
    beforeParse(window) {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
      Object.defineProperty(window.HTMLCanvasElement.prototype, 'getContext', {
        configurable: true,
        value: vi.fn(() => canvasContext),
      });
      window.matchMedia = vi.fn(() => ({
        matches: reducedMotion,
        media: '(prefers-reduced-motion: reduce)',
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
      window.requestAnimationFrame = vi.fn((callback) => {
        if (!reducedMotion) return 1;
        callback(0);
        return 1;
      });
      window.cancelAnimationFrame = vi.fn();
      window.IntersectionObserver = class {
        constructor(callback, options) {
          this.callback = callback;
          this.options = options;
          this.observed = [];
          observerInstances.push(this);
        }

        observe(target) {
          this.observed.push(target);
          this.callback([{ isIntersecting: true, target }], this);
        }

        unobserve = vi.fn();
        disconnect = vi.fn();
      };
    },
  });

  openWindows.push(dom.window);
  if (scriptErrors.length > 0) {
    throw scriptErrors[0];
  }

  const app = setupApp({ root: dom.window.document, win: dom.window });
  return { app, dom, window: dom.window, document: dom.window.document, observerInstances, canvasContext };
}

function click(window, element) {
  element.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
}

function submit(window, form) {
  form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
}

afterEach(() => {
  while (openWindows.length > 0) {
    openWindows.pop().close();
  }
  vi.restoreAllMocks();
});

describe('Integration Singularity page', () => {
  it('renders the default integration scene with nodes, links, route steps and active tab state', () => {
    const { document } = loadApp();

    expect(document.getElementById('scene-kicker').textContent).toBe('Integration mesh');
    expect(document.getElementById('scene-title').textContent).toBe('All channels orbit one source of truth');
    expect(document.getElementById('scene-health').textContent).toBe('99.99');
    expect(document.getElementById('throughput').textContent).toBe('42k');
    expect(document.getElementById('metric-percent').textContent).toBe('86%');
    expect(document.querySelectorAll('#orbit-nodes .orbit-node')).toHaveLength(5);
    expect(document.querySelectorAll('#orbit-links .orbit-link')).toHaveLength(5);
    expect(document.querySelectorAll('#route-list li')).toHaveLength(4);
    expect(document.querySelector('[data-scene="integrations"]').getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('[data-scene="orders"]').getAttribute('aria-pressed')).toBe('false');
  });

  it('switches scene content, metrics, route text and aria-pressed state from tab clicks', () => {
    const { document, window } = loadApp();

    click(window, document.querySelector('[data-scene="orders"]'));

    expect(document.getElementById('scene-kicker').textContent).toBe('Order theatre');
    expect(document.getElementById('scene-title').textContent).toBe('Every order carries its own visible flight path');
    expect(document.getElementById('scene-health').textContent).toBe('98.74');
    expect(document.getElementById('throughput').textContent).toBe('9.6k');
    expect(document.getElementById('metric-percent').textContent).toBe('74%');
    expect([...document.querySelectorAll('#route-list li')].map((item) => item.textContent)).toEqual([
      '01Payment captured',
      '02Stock reserved',
      '03Label generated',
      '04Customer notified',
    ]);
    expect(document.querySelector('[data-scene="integrations"]').getAttribute('aria-pressed')).toBe('false');
    expect(document.querySelector('[data-scene="orders"]').getAttribute('aria-pressed')).toBe('true');

    click(window, document.querySelector('[data-scene="map"]'));

    expect(document.getElementById('scene-kicker').textContent).toBe('Logistics map');
    expect(document.getElementById('scene-title').textContent).toBe('Regional demand lights up before stock runs thin');
    expect(document.getElementById('orbit-status').textContent).toBe('Forecasting');
    expect(document.querySelector('[data-scene="map"]').getAttribute('aria-pressed')).toBe('true');
  });

  it('throws for an unknown scene name so invalid caller input is visible during development', () => {
    const { window } = loadApp();

    expect(() => renderScene('missing-scene', window.document)).toThrow();
  });

  it('updates flow-step note text and selected state when operators choose another pipeline step', () => {
    const { document, window } = loadApp();
    const steps = document.querySelectorAll('.flow-step');

    click(window, steps[1]);

    expect(document.getElementById('operator-note').textContent).toContain('Exceptions are grouped by root cause');
    expect(steps[0].getAttribute('aria-pressed')).toBe('false');
    expect(steps[1].getAttribute('aria-pressed')).toBe('true');
    expect(steps[1].className).toContain('border-aqua/[0.35]');

    click(window, steps[2]);

    expect(document.getElementById('operator-note').textContent).toContain('SLA pressure is low');
    expect(steps[1].getAttribute('aria-pressed')).toBe('false');
    expect(steps[2].getAttribute('aria-pressed')).toBe('true');
  });

  it('throws for an unknown flow step so broken control data does not fail silently', () => {
    const { document } = loadApp();

    expect(() => setFlowStep(99, document.querySelector('.flow-step'), document)).toThrow('Unknown flow step: 99');
  });

  it('handles demo-request form submissions for empty and populated email states', () => {
    const { document, window } = loadApp();
    const form = document.querySelector('form');
    const email = document.getElementById('email');
    const status = document.getElementById('form-status');

    submit(window, form);
    expect(status.textContent).toBe('Enter an email to stage the request.');

    email.value = 'ops@example.com';
    submit(window, form);
    expect(status.textContent).toBe('Access request staged for ops@example.com.');
  });

  it('uses zero progress when the page is not scrollable', () => {
    const { document, window } = loadApp();
    Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: 800 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 250 });

    updateProgress(document, window);

    expect(document.getElementById('progress').style.transform).toBe('scaleX(0)');
  });

  it('keeps the map scene available on mobile while preserving its responsive hidden class', () => {
    const { document, window } = loadApp({ width: 390, height: 844 });
    const mapTab = document.querySelector('[data-scene="map"]');

    expect(mapTab.className).toContain('hidden');

    click(window, mapTab);

    expect(document.getElementById('scene-kicker').textContent).toBe('Logistics map');
    expect(mapTab.getAttribute('aria-pressed')).toBe('true');
  });

  it('initializes observers and reveals observed content without requiring browser-only APIs', () => {
    const { document, observerInstances } = loadApp();

    expect(observerInstances).toHaveLength(2);
    expect([...document.querySelectorAll('.reveal')].every((node) => node.classList.contains('is-visible'))).toBe(true);
    expect(document.querySelector('.nav-link.is-active')).not.toBeNull();
  });

  it('initializes the canvas field and draws once in reduced-motion mode', () => {
    const { app, canvasContext, window } = loadApp({ reducedMotion: true });

    expect(window.HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith('2d');
    expect(canvasContext.setTransform).toHaveBeenCalled();
    expect(canvasContext.clearRect).toHaveBeenCalled();
    expect(app.canvasField.getParticles()).toHaveLength(76);
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('animates the canvas field when reduced motion is not requested', () => {
    const { app, window } = loadApp({ reducedMotion: false });

    expect(app.canvasField.getParticles()).toHaveLength(76);
    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });

  it('returns null when canvas rendering context is unavailable', () => {
    const dom = new JSDOM('<canvas id="field"></canvas>');
    Object.defineProperty(dom.window.HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: vi.fn(() => null),
    });

    expect(createCanvasField(dom.window.document, dom.window)).toBeNull();
    dom.window.close();
  });

  it('falls back gracefully when IntersectionObserver or form markup is absent', () => {
    const dom = new JSDOM(`
      <main>
        <section id="demo" class="reveal"></section>
        <section id="flow" class="reveal"></section>
        <a class="nav-link" href="#demo">Demo</a>
      </main>
    `);

    expect(setupRevealObserver(dom.window.document, dom.window)).toBeNull();
    expect(setupNavObserver(dom.window.document, dom.window)).toBeNull();
    expect(() => setupDemoForm(dom.window.document)).not.toThrow();
    expect([...dom.window.document.querySelectorAll('.reveal')].every((node) => node.classList.contains('is-visible'))).toBe(true);
    dom.window.close();
  });

  it('property: progress scale equals scrollY divided by available scroll distance', () => {
    fc.assert(
      fc.property(
        fc.record({
          scrollHeight: fc.integer({ min: 1, max: 100_000 }),
          innerHeight: fc.integer({ min: 1, max: 50_000 }),
        }).filter(({ scrollHeight, innerHeight }) => scrollHeight > innerHeight),
        fc.float({ min: 0, max: 1, noNaN: true }),
        ({ scrollHeight, innerHeight }, ratio) => {
          const max = scrollHeight - innerHeight;
          const scrollY = max * ratio;
          expect(progressRatio(scrollHeight, innerHeight, scrollY)).toBeCloseTo(scrollY / max, 10);
        },
      ),
      { numRuns: 50 },
    );
  });
});
