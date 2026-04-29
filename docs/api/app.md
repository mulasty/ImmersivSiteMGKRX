# `src/app.js`

Browser UI controller for the active Commerce Flight page. Importing this module in a browser automatically calls `setupApp()` once `document` is available.

## Data Exports

### `scenes`

Scene definitions consumed by `renderScene(name, root)`.

Type:

```js
Record<string, {
  kicker: string,
  title: string,
  health: string,
  status: string,
  throughput: string,
  percent: string,
  value: string,
  copy: string,
  nodes: Array<[string, number, number, 'aqua' | 'mint' | 'amber' | 'rose']>,
  route: string[]
}>
```

Side effects: none.

Example:

```js
import { scenes } from './src/app.js';

console.log(Object.keys(scenes));
```

Output:

```text
['integrations', 'orders', 'map']
```

### `notes`

Operator notes displayed by `setFlowStep(index, activeStep, root)`.

Side effects: none.

### `colorMap`

Named color tokens used by orbit nodes and links.

Side effects: none.

## Functions

### `progressRatio(scrollHeight, innerHeight, scrollY)`

Calculates scroll progress.

Parameters:

| Name | Type | Description |
| --- | --- | --- |
| `scrollHeight` | `number` | Total document height in pixels. |
| `innerHeight` | `number` | Viewport height in pixels. |
| `scrollY` | `number` | Current vertical scroll offset in pixels. |

Returns: `number`. Returns `0` when the page is not scrollable.

Side effects: none.

Example:

```js
import { progressRatio } from './src/app.js';

console.log(progressRatio(1200, 800, 200));
```

Output:

```text
0.5
```

### `renderScene(name, root = document)`

Renders one commerce scene into the dashboard panel.

Parameters:

| Name | Type | Description |
| --- | --- | --- |
| `name` | `string` | Scene key: `integrations`, `orders` or `map`. |
| `root` | `Document` | Document containing the required page markup. |

Returns: `void`.

Throws: `Error` for unknown scene names or missing required markup.

Side effects: mutates DOM text, route list items, orbit nodes, orbit links, inline styles, tab classes and `aria-pressed` state.

Example:

```js
import { renderScene } from './src/app.js';

renderScene('orders');
```

### `setFlowStep(index, activeStep, root = document)`

Activates a fulfilment flow button and updates the operator note.

Parameters:

| Name | Type | Description |
| --- | --- | --- |
| `index` | `number` | Index into `notes`. |
| `activeStep` | `Element` | Button element that should become active. |
| `root` | `Document` | Document containing `.flow-step` controls. |

Returns: `void`.

Throws: `Error` when the note index is unknown.

Side effects: mutates note text, button classes and `aria-pressed` attributes.

### `updateProgress(root = document, win = window)`

Updates the fixed top progress bar.

Parameters:

| Name | Type | Description |
| --- | --- | --- |
| `root` | `Document` | Document containing `#progress`. |
| `win` | `Window` | Window supplying `innerHeight` and `scrollY`. |

Returns: `number`, the applied progress ratio.

Throws: `Error` when `#progress` is missing.

Side effects: writes `style.transform` on `#progress`.

### `setupSceneTabs(root = document)`

Registers click listeners on `.scene-tab` controls.

Returns: `void`.

Side effects: adds DOM event listeners; tab clicks call `renderScene`.

### `setupFlowSteps(root = document)`

Registers click listeners on `.flow-step` controls.

Returns: `void`.

Side effects: adds DOM event listeners; step clicks call `setFlowStep`.

### `setupDemoForm(root = document)`

Registers submit feedback for the demo request form.

Returns: `void`.

Side effects: prevents default form submission and writes feedback into `#form-status`.

### `setupRevealObserver(root = document, win = window)`

Reveals `.reveal` elements when they enter the viewport.

Returns: `IntersectionObserver | null`.

Side effects: registers an observer and toggles `is-visible`. If `IntersectionObserver` is unavailable, all reveal items are made visible immediately.

### `setupNavObserver(root = document, win = window)`

Tracks the active nav link as sections enter the viewport.

Returns: `IntersectionObserver | null`.

Side effects: registers an observer and toggles `is-active` on `.nav-link` elements.

### `createCanvasField(root = document, win = window)`

Creates the decorative canvas particle field.

Returns:

```js
{
  drawField: () => void,
  resizeCanvas: () => void,
  getParticles: () => Array<object>
} | null
```

Throws: `Error` when `#field` is missing.

Side effects: sizes the canvas, draws particles, registers a resize listener and may schedule animation frames.

### `setupApp({ root = document, win = window } = {})`

Bootstraps all interactive page behavior.

Parameters:

| Name | Type | Description |
| --- | --- | --- |
| `root` | `Document` | Document containing the app markup. |
| `win` | `Window` | Window associated with the document. |

Returns:

```js
{
  canvasField: CanvasFieldController | null,
  navObserver: IntersectionObserver | null,
  revealObserver: IntersectionObserver | null
}
```

Side effects: registers event listeners and observers, renders the default scene, updates scroll progress and starts the canvas field.

Example:

```js
import { setupApp } from './src/app.js';

const app = setupApp();
app.navObserver?.disconnect();
app.revealObserver?.disconnect();
```
