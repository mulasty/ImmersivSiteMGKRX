# Refactor Migration Guide

## Code Smells Addressed

- **Mixed responsibilities:** one module owned scene rendering, form handling, scroll progress, observers, animation and bootstrap.
- **Tight browser coupling:** most functions reached directly for `document` and `window`, which made isolated tests harder.
- **Duplicated event wiring:** bootstrap and standalone setup helpers repeated controller setup logic.
- **Hard-coded construction:** route item markup, scene data and canvas randomness were embedded inside procedural functions.
- **Implicit architecture:** patterns were present informally, but responsibilities were not named or isolated.

## Patterns Applied

- **Facade:** `src/app.js` remains the compatibility API. Existing imports such as `renderScene()` and `setupApp()` continue to work.
- **Factory:** `RouteItemFactory` creates route list items so route markup can change independently from scene rendering.
- **Strategy and Dependency Injection:** `SceneRenderer`, `AppController` and `CanvasField` accept data, factories and dependencies through constructors.
- **Observer:** `RevealObserverController` and `NavObserverController` isolate `IntersectionObserver` behavior.
- **Controller Components:** focused classes now own scene rendering, flow state, form feedback, progress updates and canvas animation.

## API Changes

Existing facade imports still work:

```js
import { renderScene, setupApp, updateProgress } from './src/app.js';
```

New component imports are available for code that wants explicit ownership:

```js
import { AppController } from './src/ui/app-controller.js';
import { SceneRenderer } from './src/ui/scene-renderer.js';

const renderer = new SceneRenderer({ root: document });
renderer.render('orders');

const app = new AppController({ root: document, win: window });
app.setup();
```

## Migration Steps

1. Keep existing imports from `src/app.js` if you only need backwards-compatible behavior.
2. For new features, import component classes from `src/ui/*` and inject dependencies where useful.
3. To customize route markup, pass a custom `routeItemFactory` to `SceneRenderer`.
4. To test without browser globals, construct controllers with jsdom `root` and `win`.
5. Remove facade imports only after downstream callers have migrated.

## Verification

The refactor keeps behavior covered by the original test suite and adds architecture tests:

```bash
npm test
```

Current result:

```text
2 test files passed
18 tests passed
```
