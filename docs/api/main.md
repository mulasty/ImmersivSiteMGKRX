# `src/main.js`

Legacy immersive WebGL flight scene for the original Polish commerce demo.

This module is side-effect driven. It does not export public functions or classes. Importing it in a browser creates a Three.js scene, configures lighting/post-processing, binds scroll and pointer listeners, and starts the animation loop for a `<canvas id="webgl">`.

## Public API

No exported API.

## Required Markup

```html
<canvas id="webgl" aria-label="Trojwymiarowa scena lotu"></canvas>
<div class="progress" aria-hidden="true"><span></span></div>
<button class="scene-button" type="button" data-scene="corridor">Integracje</button>
```

## Usage

```html
<script type="module" src="/src/main.js"></script>
```

## Side Effects

- Imports `src/styles.css`.
- Creates and mutates Three.js scene objects.
- Loads textures from `/models/...`.
- Registers scroll, pointer, resize and scene-button listeners.
- Starts a continuous render loop.
- Mutates body scene state and progress indicator styles.

## Notes

The active page currently uses `src/app.js`. Keep `src/main.js` if you want to restore or reference the fuller Three.js/WebGL experience.
