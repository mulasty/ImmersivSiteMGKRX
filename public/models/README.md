# Cinematic 3D Models

This prototype now renders the main corridor as procedural 3D letter panels:

```text
KRX PRODUCE & MULAG ROUP HIGH PREMIUM
```

The `public/models` folder is reserved for future custom `.glb` assets if you
want to replace the procedural letter panels with modeled typography or branded
objects later.

Furniture assets added for the order scene:

- `CoffeeTable_01_4k`
- `WoodenChair_01_4k`
- `painted_wooden_stool_4k`
- `painted_wooden_cabinet_4k`

Environment/detail assets:

- `grass_medium_01_4k`

These downloads contain Blender source files (`.blend`) and 4K texture maps.
The current browser scene uses lightweight Three.js geometry with the extracted
diffuse/roughness textures. To render the original mesh shapes directly in the
browser, export each `.blend` file from Blender to `.glb` and place the exported
files beside the source folders.

Recommended export settings:

- Format: `.glb`
- Textures: 2K or 4K PBR maps when needed
- Materials: base color, roughness, metallic/specular, normal, ambient occlusion
- Geometry: optimized for web; keep repeated objects lightweight
- Compression: Draco or Meshopt for production delivery

Good asset sources:

- Poly Haven: https://polyhaven.com/
- ambientCG: https://ambientcg.com/
- TextureCan models: https://www.texturecan.com/models/
