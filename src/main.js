/**
 * @module src/main
 * @description
 * Legacy immersive WebGL flight scene for the original Polish commerce demo.
 * This module is side-effect driven: importing it creates a Three.js scene,
 * binds scroll/cursor/resize listeners, and starts the render loop for
 * `#webgl`. The current HTML entrypoint uses `src/app.js`; keep this module
 * as a reference implementation for the full Three.js experience.
 *
 * @example
 * <canvas id="webgl" aria-label="Trojwymiarowa scena lotu"></canvas>
 * <script type="module" src="/src/main.js"></script>
 */
import './styles.css';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const canvas = document.querySelector('#webgl');
const progressBar = document.querySelector('.progress span');
const sceneButtons = document.querySelectorAll('.scene-button');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#07070a');
scene.fog = new THREE.FogExp2('#07070a', 0.018);

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(sizes.width, sizes.height);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.9;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.1).texture;

const camera = new THREE.PerspectiveCamera(58, sizes.width / sizes.height, 0.1, 180);
scene.add(camera);

const composer = new EffectComposer(renderer);
composer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(sizes.width, sizes.height), 0.34, 0.38, 0.84);
composer.addPass(bloomPass);

const flightPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-1.1, 2.25, 20),
  new THREE.Vector3(3.8, 1.7, 10),
  new THREE.Vector3(-4.6, 3.25, -2),
  new THREE.Vector3(4.2, 1.85, -15),
  new THREE.Vector3(-3.2, 3.45, -29),
  new THREE.Vector3(2.8, 2.15, -43),
  new THREE.Vector3(0, 2.8, -61),
]);

const lookPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0.8, 1.35, 9),
  new THREE.Vector3(-1.4, 2.2, 0),
  new THREE.Vector3(1.7, 1.55, -11),
  new THREE.Vector3(-1.8, 2.4, -23),
  new THREE.Vector3(1.2, 1.75, -36),
  new THREE.Vector3(0, 2.05, -49),
  new THREE.Vector3(0, 2.1, -66),
]);

const orderFlightPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 2.7, 18),
  new THREE.Vector3(-2.8, 2.4, 8),
  new THREE.Vector3(2.9, 2.1, -4),
  new THREE.Vector3(-3.1, 2.8, -17),
  new THREE.Vector3(3.2, 2.3, -31),
  new THREE.Vector3(-2.1, 2.7, -45),
  new THREE.Vector3(0, 2.4, -59),
]);

const orderLookPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 1.3, 9),
  new THREE.Vector3(1.5, 1.5, 0),
  new THREE.Vector3(-1.8, 1.4, -12),
  new THREE.Vector3(2.1, 1.6, -25),
  new THREE.Vector3(-1.8, 1.6, -39),
  new THREE.Vector3(0, 1.5, -54),
  new THREE.Vector3(0, 1.6, -66),
]);

const cursor = new THREE.Vector2();
const targetCursor = new THREE.Vector2();
const clock = new THREE.Clock();
const scrollState = { progress: 0 };
const currentScene = { id: 'corridor' };
document.body.dataset.scene = currentScene.id;

const ambientLight = new THREE.AmbientLight('#c6f6ff', 0.55);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight('#ffcf8a', 2.5);
keyLight.position.set(-8, 8, 10);
scene.add(keyLight);

const magentaLight = new THREE.PointLight('#ff4f9a', 18, 34);
magentaLight.position.set(4, 2, -8);
scene.add(magentaLight);

const cyanLight = new THREE.PointLight('#36e0ff', 20, 38);
cyanLight.position.set(-5, 4, -24);
scene.add(cyanLight);

const amberLight = new THREE.PointLight('#ffb84d', 14, 30);
amberLight.position.set(3, 1, -36);
scene.add(amberLight);

const letterGroup = new THREE.Group();
const orderGroup = new THREE.Group();
const structureGroup = new THREE.Group();
const particleGroup = new THREE.Group();
const mapGroup = new THREE.Group();
scene.add(letterGroup, orderGroup, structureGroup, particleGroup, mapGroup);

const cardboardMaterial = new THREE.MeshStandardMaterial({
  color: '#b77a41',
  emissive: '#301608',
  emissiveIntensity: 0.16,
  roughness: 0.7,
});
const tapeMaterial = new THREE.MeshStandardMaterial({
  color: '#f3c36d',
  emissive: '#5d3606',
  emissiveIntensity: 0.22,
  roughness: 0.42,
});
const glassMaterial = new THREE.MeshPhysicalMaterial({
  color: '#dff8ff',
  emissive: '#265b77',
  emissiveIntensity: 0.28,
  metalness: 0.1,
  roughness: 0.08,
  transmission: 0.18,
  transparent: true,
  opacity: 0.78,
});
const skinMaterial = new THREE.MeshStandardMaterial({ color: '#d8b08a', roughness: 0.6 });
const productAccentMaterials = [
  new THREE.MeshStandardMaterial({ color: '#4ee7ff', emissive: '#096070', emissiveIntensity: 0.55, roughness: 0.35 }),
  new THREE.MeshStandardMaterial({ color: '#ffc36b', emissive: '#7a3f08', emissiveIntensity: 0.42, roughness: 0.38 }),
  new THREE.MeshStandardMaterial({ color: '#ff6f9e', emissive: '#6c1231', emissiveIntensity: 0.44, roughness: 0.38 }),
  new THREE.MeshStandardMaterial({ color: '#79f0a1', emissive: '#0f5124', emissiveIntensity: 0.4, roughness: 0.4 }),
];
const furnitureTextureLoader = new THREE.TextureLoader();
const maxTextureAnisotropy = renderer.capabilities.getMaxAnisotropy();

function loadFurnitureTexture(path, { color = true, repeat = [1, 1] } = {}) {
  const texture = furnitureTextureLoader.load(path);
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxTextureAnisotropy;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  return texture;
}

const furnitureMaterials = {
  coffeeTable: new THREE.MeshStandardMaterial({
    map: loadFurnitureTexture('/models/CoffeeTable_01_4k/textures/CoffeeTable_01_diff_4k.jpg', { repeat: [1.2, 1.2] }),
    roughnessMap: loadFurnitureTexture('/models/CoffeeTable_01_4k/textures/CoffeeTable_01_roughness_4k.jpg', { color: false }),
    roughness: 0.62,
    metalness: 0.02,
    envMapIntensity: 0.85,
  }),
  chair: new THREE.MeshStandardMaterial({
    map: loadFurnitureTexture('/models/WoodenChair_01_4k/textures/WoodenChair_01_diff_4k.jpg', { repeat: [1.1, 1.1] }),
    roughnessMap: loadFurnitureTexture('/models/WoodenChair_01_4k/textures/WoodenChair_01_roughness_4k.jpg', { color: false }),
    roughness: 0.66,
    metalness: 0.02,
    envMapIntensity: 0.82,
  }),
  stool: new THREE.MeshStandardMaterial({
    map: loadFurnitureTexture('/models/painted_wooden_stool_4k/textures/painted_wooden_stool_diff_4k.jpg', { repeat: [1.05, 1.05] }),
    roughness: 0.72,
    metalness: 0.01,
    envMapIntensity: 0.76,
  }),
  cabinet: new THREE.MeshStandardMaterial({
    map: loadFurnitureTexture('/models/painted_wooden_cabinet_4k/textures/painted_wooden_cabinet_diff_4k.jpg', { repeat: [1.05, 1.05] }),
    roughness: 0.68,
    metalness: 0.02,
    envMapIntensity: 0.78,
  }),
};
const furnitureDarkMaterial = new THREE.MeshStandardMaterial({
  color: '#1a1713',
  roughness: 0.5,
  metalness: 0.16,
  envMapIntensity: 0.9,
});

function createTextTexture(label, background = '#101725', foreground = '#f7fbff') {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = 512;
  textureCanvas.height = 256;
  const context = textureCanvas.getContext('2d');

  context.fillStyle = background;
  context.fillRect(0, 0, textureCanvas.width, textureCanvas.height);
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(20, 22, 472, 212);
  context.fillStyle = foreground;
  let fontSize = 64;
  context.font = `800 ${fontSize}px Inter, Arial, sans-serif`;
  while (context.measureText(label).width > 430 && fontSize > 30) {
    fontSize -= 3;
    context.font = `800 ${fontSize}px Inter, Arial, sans-serif`;
  }
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label, 256, 128);

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createLabelPlane(label, width = 0.9, height = 0.45, background = '#101725') {
  const material = new THREE.MeshBasicMaterial({
    map: createTextTexture(label, background),
    transparent: true,
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
}

function createHologramTexture(title, meta, tint = '#4ee7ff') {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = 1024;
  textureCanvas.height = 512;
  const context = textureCanvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 1024, 512);

  gradient.addColorStop(0, 'rgba(8, 12, 20, 0.96)');
  gradient.addColorStop(0.58, 'rgba(11, 20, 28, 0.9)');
  gradient.addColorStop(1, 'rgba(30, 16, 35, 0.92)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1024, 512);

  context.strokeStyle = 'rgba(255,255,255,0.08)';
  context.lineWidth = 2;
  for (let x = 64; x < 1024; x += 64) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x - 180, 512);
    context.stroke();
  }

  context.strokeStyle = tint;
  context.lineWidth = 8;
  context.beginPath();
  context.roundRect(38, 38, 948, 436, 34);
  context.stroke();

  context.fillStyle = 'rgba(255,255,255,0.92)';
  context.font = '900 96px Inter, Arial, sans-serif';
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.shadowColor = tint;
  context.shadowBlur = 22;
  context.fillText(title, 82, 194);

  context.shadowBlur = 0;
  context.fillStyle = 'rgba(219, 244, 255, 0.78)';
  context.font = '700 42px Inter, Arial, sans-serif';
  context.fillText(meta, 86, 282);

  context.fillStyle = tint;
  context.font = '800 30px Inter, Arial, sans-serif';
  context.fillText('LIVE SYNC', 86, 382);

  for (let i = 0; i < 18; i += 1) {
    const barHeight = 24 + Math.sin(i * 0.75) * 18;
    context.fillStyle = i % 3 === 0 ? tint : 'rgba(255,255,255,0.45)';
    context.fillRect(650 + i * 16, 375 - barHeight, 7, barHeight);
  }

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxTextureAnisotropy;
  return texture;
}

function createIntegrationNode(platform, index) {
  const node = new THREE.Group();
  const tintMaterial = productAccentMaterials[index % productAccentMaterials.length];
  const texture = createHologramTexture(platform.title, platform.meta, platform.color);
  const card = new THREE.Mesh(
    new THREE.PlaneGeometry(1.9, 0.96),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.94, depthWrite: false }),
  );
  const glassBack = new THREE.Mesh(
    new THREE.BoxGeometry(2.06, 1.08, 0.055),
    new THREE.MeshPhysicalMaterial({
      color: '#dff8ff',
      emissive: platform.color,
      emissiveIntensity: 0.18,
      metalness: 0.22,
      roughness: 0.12,
      transmission: 0.12,
      transparent: true,
      opacity: 0.52,
    }),
  );
  const orbit = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.014, 10, 96), tintMaterial);
  const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), tintMaterial);

  card.position.z = 0.06;
  orbit.rotation.z = Math.PI / 2;
  diamond.position.set(-1.22, 0.53, 0.1);
  node.add(glassBack, card, orbit, diamond);
  node.userData.kind = 'integrationNode';
  node.userData.spin = 0.003 + index * 0.00016;
  node.userData.floatOffset = index * 0.7;
  node.userData.orbit = orbit;
  node.userData.diamond = diamond;
  return node;
}

const integrationPlatforms = [
  { title: 'BASELINKER', meta: 'orders / stock / labels', color: '#4ee7ff' },
  { title: 'SHOPIFY', meta: 'storefront pulse', color: '#79f0a1' },
  { title: 'ALLEGRO', meta: 'marketplace stream', color: '#ffc36b' },
  { title: 'AMAZON', meta: 'fulfillment grid', color: '#ff6f9e' },
  { title: 'ERP', meta: 'finance + inventory', color: '#a7f3ff' },
  { title: 'WMS', meta: 'warehouse routing', color: '#f7d774' },
  { title: 'PAYMENTS', meta: 'risk + settlement', color: '#b892ff' },
  { title: 'AI OPS', meta: 'pricing + automation', color: '#5dffb4' },
  { title: 'CRM', meta: 'loyalty + support', color: '#ff9bbd' },
  { title: 'ANALYTICS', meta: 'margin intelligence', color: '#92e5ff' },
];

integrationPlatforms.forEach((platform, index) => {
  const node = createIntegrationNode(platform, index);
  const angle = index * 1.42 + 0.35;
  const radius = 3.15 + Math.sin(index * 0.9) * 0.78;
  node.position.set(
    Math.cos(angle) * radius,
    1.25 + Math.sin(index * 0.72) * 1.18,
    12 - index * 6.05,
  );
  node.rotation.set(Math.sin(index) * 0.08, -angle + Math.PI * 0.44, Math.cos(index * 0.5) * 0.12);
  node.scale.setScalar(0.84 + (index % 3) * 0.05);
  letterGroup.add(node);
});

async function assetExists(path) {
  try {
    const response = await fetch(path, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

async function loadOptionalCinematicAssets() {
  const hdrPath = '/hdr/studio-4k.hdr';
  if (await assetExists(hdrPath)) {
    new RGBELoader().load(hdrPath, (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      const environment = pmremGenerator.fromEquirectangular(texture).texture;
      scene.environment = environment;
      texture.dispose();
    });
  }

}

loadOptionalCinematicAssets();

const monolithMaterial = new THREE.MeshPhysicalMaterial({
  color: '#b9f8ff',
  emissive: '#0d4355',
  emissiveIntensity: 0.35,
  metalness: 0.7,
  roughness: 0.16,
  transmission: 0.08,
  transparent: true,
  opacity: 0.48,
});
const obsidianMaterial = new THREE.MeshStandardMaterial({
  color: '#080912',
  emissive: '#13091f',
  emissiveIntensity: 0.32,
  metalness: 0.78,
  roughness: 0.28,
});

for (let i = 0; i < 54; i += 1) {
  const side = i % 2 === 0 ? -1 : 1;
  const angle = i * 0.72;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 1.7 + (i % 5) * 0.28, 0.05 + (i % 4) * 0.04),
    i % 4 === 0 ? obsidianMaterial : monolithMaterial,
  );
  mesh.position.set(
    side * (4.5 + Math.sin(angle) * 1.15),
    0.55 + Math.cos(angle * 0.8) * 1.75,
    14 - i * 1.25,
  );
  mesh.rotation.set(0.18 * Math.sin(angle), -side * 0.72, 0.28 * Math.cos(angle));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  structureGroup.add(mesh);
}

function createDataRibbon(color, phase, radius = 2.8) {
  const points = [];
  for (let i = 0; i < 18; i += 1) {
    const z = 16 - i * 4.45;
    const angle = phase + i * 0.64;
    const wave = radius + Math.sin(i * 0.55 + phase) * 0.75;
    points.push(new THREE.Vector3(
      Math.cos(angle) * wave,
      1.55 + Math.sin(i * 0.72 + phase) * 1.55,
      z,
    ));
  }

  const curve = new THREE.CatmullRomCurve3(points);
  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 220, 0.018, 8, false),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.72 }),
  );
  tube.userData.kind = 'dataRibbon';
  tube.userData.phase = phase;
  structureGroup.add(tube);
  return tube;
}

const dataRibbons = [
  createDataRibbon('#4ee7ff', 0.15, 2.65),
  createDataRibbon('#ffc36b', 1.85, 3.05),
  createDataRibbon('#ff6f9e', 3.25, 2.85),
  createDataRibbon('#79f0a1', 4.8, 3.25),
];

const particleCount = 1400;
const positions = new Float32Array(particleCount * 3);
const colors = new Float32Array(particleCount * 3);
const palette = [new THREE.Color('#36e0ff'), new THREE.Color('#ffcf8a'), new THREE.Color('#ff4f9a'), new THREE.Color('#effffb')];

for (let i = 0; i < particleCount; i += 1) {
  const i3 = i * 3;
  const radius = 1.6 + Math.random() * 9.5;
  const angle = Math.random() * Math.PI * 2;
  const z = 18 - Math.random() * 76;
  positions[i3] = Math.cos(angle + z * 0.035) * radius;
  positions[i3 + 1] = -1.65 + Math.random() * 7.2;
  positions[i3 + 2] = z;

  const color = palette[Math.floor(Math.random() * palette.length)];
  colors[i3] = color.r;
  colors[i3 + 1] = color.g;
  colors[i3 + 2] = color.b;
}

const particleGeometry = new THREE.BufferGeometry();
particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const particleMaterial = new THREE.PointsMaterial({
  size: 0.045,
  vertexColors: true,
  transparent: true,
  opacity: 0.78,
  depthWrite: false,
});
particleGroup.add(new THREE.Points(particleGeometry, particleMaterial));

function createIntegrationHub() {
  const hub = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.42, 4),
    new THREE.MeshPhysicalMaterial({
      color: '#060712',
      emissive: '#0d2b55',
      emissiveIntensity: 0.95,
      metalness: 0.65,
      roughness: 0.18,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      transparent: true,
      opacity: 0.95,
    }),
  );
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(1.72, 48, 32),
    new THREE.MeshBasicMaterial({
      color: '#4ee7ff',
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
    }),
  );
  const ringA = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.024, 12, 128), productAccentMaterials[0]);
  const ringB = new THREE.Mesh(new THREE.TorusGeometry(2.48, 0.018, 12, 128), productAccentMaterials[2]);
  const ringC = new THREE.Mesh(new THREE.TorusGeometry(2.82, 0.014, 12, 128), productAccentMaterials[1]);
  const label = createLabelPlane('LIVE COMMERCE OS', 2.1, 0.52, '#071421');

  ringA.rotation.x = Math.PI / 2;
  ringB.rotation.y = Math.PI / 2;
  ringC.rotation.set(Math.PI / 2, Math.PI / 4, 0);
  label.position.set(0, -2.2, 0.98);
  hub.add(halo, core, ringA, ringB, ringC, label);

  for (let i = 0; i < 14; i += 1) {
    const angle = i * 0.72;
    const satellite = new THREE.Mesh(new THREE.OctahedronGeometry(0.09 + (i % 3) * 0.025, 0), productAccentMaterials[i % productAccentMaterials.length]);
    satellite.position.set(Math.cos(angle) * (2.2 + (i % 4) * 0.18), Math.sin(i * 0.9) * 1.15, Math.sin(angle) * 2.2);
    satellite.userData.orbitSpeed = 0.006 + i * 0.0004;
    hub.add(satellite);
  }

  hub.userData.rings = [ringA, ringB, ringC];
  return hub;
}

const portal = createIntegrationHub();
portal.position.set(0, 2.05, -47);
scene.add(portal);

function createOrderPackage() {
  const parcel = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.62, 0.72), cardboardMaterial);
  const tapeA = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.035, 0.12), tapeMaterial);
  const tapeB = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.035, 0.75), tapeMaterial);
  const label = createLabelPlane('ORDER', 0.52, 0.24, '#f8fbff');

  tapeA.position.y = 0.33;
  tapeB.position.y = 0.335;
  label.position.set(0, 0.01, 0.37);
  parcel.add(box, tapeA, tapeB, label);
  return parcel;
}

function prepareProductModel(model) {
  model.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
  return model;
}

function addFurniturePart(group, geometry, material, position, rotation = new THREE.Euler()) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.rotation.copy(rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function createCoffeeTableModel() {
  const model = new THREE.Group();
  const wood = furnitureMaterials.coffeeTable;

  addFurniturePart(model, new THREE.BoxGeometry(1.72, 0.16, 1.02), wood, new THREE.Vector3(0, 0.72, 0));
  addFurniturePart(model, new THREE.BoxGeometry(1.48, 0.09, 0.82), wood, new THREE.Vector3(0, 0.34, 0));
  [[-0.7, -0.39], [0.7, -0.39], [-0.7, 0.39], [0.7, 0.39]].forEach(([x, z]) => {
    addFurniturePart(model, new THREE.CylinderGeometry(0.055, 0.075, 0.68, 18), wood, new THREE.Vector3(x, 0.34, z));
  });
  addFurniturePart(model, new THREE.BoxGeometry(1.82, 0.045, 0.08), furnitureDarkMaterial, new THREE.Vector3(0, 0.83, 0.51));
  addFurniturePart(model, new THREE.BoxGeometry(1.82, 0.045, 0.08), furnitureDarkMaterial, new THREE.Vector3(0, 0.83, -0.51));
  return prepareProductModel(model);
}

function createWoodenChairModel() {
  const model = new THREE.Group();
  const wood = furnitureMaterials.chair;

  addFurniturePart(model, new THREE.BoxGeometry(0.92, 0.15, 0.82), wood, new THREE.Vector3(0, 0.62, 0));
  addFurniturePart(model, new THREE.BoxGeometry(0.92, 0.86, 0.12), wood, new THREE.Vector3(0, 1.1, -0.42), new THREE.Euler(-0.12, 0, 0));
  addFurniturePart(model, new THREE.BoxGeometry(0.82, 0.08, 0.08), furnitureDarkMaterial, new THREE.Vector3(0, 1.44, -0.49), new THREE.Euler(-0.12, 0, 0));
  [[-0.36, -0.3], [0.36, -0.3], [-0.36, 0.3], [0.36, 0.3]].forEach(([x, z]) => {
    addFurniturePart(model, new THREE.CylinderGeometry(0.045, 0.055, 0.68, 16), wood, new THREE.Vector3(x, 0.28, z));
  });
  addFurniturePart(model, new THREE.CylinderGeometry(0.032, 0.032, 0.84, 14), wood, new THREE.Vector3(-0.44, 0.96, -0.48));
  addFurniturePart(model, new THREE.CylinderGeometry(0.032, 0.032, 0.84, 14), wood, new THREE.Vector3(0.44, 0.96, -0.48));
  return prepareProductModel(model);
}

function createWoodenStoolModel() {
  const model = new THREE.Group();
  const wood = furnitureMaterials.stool;

  addFurniturePart(model, new THREE.CylinderGeometry(0.54, 0.5, 0.17, 48), wood, new THREE.Vector3(0, 0.72, 0));
  [[-0.34, -0.34, -0.16], [0.34, -0.34, 0.16], [-0.34, 0.34, 0.16], [0.34, 0.34, -0.16]].forEach(([x, z, tilt]) => {
    addFurniturePart(model, new THREE.CylinderGeometry(0.045, 0.06, 0.72, 16), wood, new THREE.Vector3(x, 0.34, z), new THREE.Euler(tilt, 0, -tilt));
  });
  const brace = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.024, 10, 48), furnitureDarkMaterial);
  brace.position.y = 0.42;
  brace.rotation.x = Math.PI / 2;
  brace.castShadow = true;
  brace.receiveShadow = true;
  model.add(brace);
  return prepareProductModel(model);
}

function createWoodenCabinetModel() {
  const model = new THREE.Group();
  const wood = furnitureMaterials.cabinet;
  const knobMaterial = productAccentMaterials[1];

  addFurniturePart(model, new THREE.BoxGeometry(1.16, 1.28, 0.58), wood, new THREE.Vector3(0, 0.78, 0));
  addFurniturePart(model, new THREE.BoxGeometry(1.24, 0.08, 0.64), wood, new THREE.Vector3(0, 1.46, 0));
  addFurniturePart(model, new THREE.BoxGeometry(0.54, 0.9, 0.045), wood, new THREE.Vector3(-0.29, 0.74, 0.32));
  addFurniturePart(model, new THREE.BoxGeometry(0.54, 0.9, 0.045), wood, new THREE.Vector3(0.29, 0.74, 0.32));
  addFurniturePart(model, new THREE.BoxGeometry(1.04, 0.08, 0.05), furnitureDarkMaterial, new THREE.Vector3(0, 1.14, 0.35));
  [-0.17, 0.17].forEach((x) => {
    addFurniturePart(model, new THREE.SphereGeometry(0.045, 18, 12), knobMaterial, new THREE.Vector3(x, 0.72, 0.38));
  });
  [[-0.42, -0.2], [0.42, -0.2], [-0.42, 0.2], [0.42, 0.2]].forEach(([x, z]) => {
    addFurniturePart(model, new THREE.CylinderGeometry(0.04, 0.055, 0.22, 14), furnitureDarkMaterial, new THREE.Vector3(x, 0.05, z));
  });
  return prepareProductModel(model);
}

function createFurnitureProduct(type) {
  if (type === 'chair') return createWoodenChairModel();
  if (type === 'stool') return createWoodenStoolModel();
  if (type === 'cabinet') return createWoodenCabinetModel();
  return createCoffeeTableModel();
}

function createOrderStage(stage, index) {
  const group = new THREE.Group();
  const panel = createLabelPlane(stage.label, 1.75, 0.54, '#071421');
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.018, 10, 72), productAccentMaterials[index % productAccentMaterials.length]);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.72, 0.08, 40), glassMaterial);
  const product = createFurnitureProduct(stage.product);

  panel.position.set(0, 0.78, 0.08);
  ring.position.z = -0.05;
  product.position.y = -0.46;
  product.rotation.y = index % 2 === 0 ? -0.24 : 0.24;
  product.scale.setScalar(stage.productScale);
  base.position.y = -0.48;
  group.add(base, ring, product, panel);
  group.userData.ring = ring;
  group.userData.product = product;
  group.userData.floatOffset = index;
  return group;
}

const orderStages = [
  { label: '01 ZAMOWIENIE', product: 'coffeeTable', productScale: 0.68 },
  { label: '02 PAKOWANIE', product: 'chair', productScale: 0.58 },
  { label: '03 NADANIE', product: 'stool', productScale: 0.66 },
  { label: '04 WYSYLKA', product: 'cabinet', productScale: 0.46 },
  { label: '05 AUTOMATYZACJA', product: 'coffeeTable', productScale: 0.66 },
  { label: '06 DOSTAWA', product: 'chair', productScale: 0.58 },
  { label: '07 KLIENT', product: 'stool', productScale: 0.66 },
  { label: '08 OPINIA', product: 'cabinet', productScale: 0.46 },
  { label: '09 KOLEJNE ZAKUPY', product: 'coffeeTable', productScale: 0.68 },
];

const orderStagePositions = orderStages.map((stage, index) => new THREE.Vector3(
  (index % 2 === 0 ? 2.2 : -2.2) + Math.sin(index * 0.7) * 0.4,
  1.25 + Math.cos(index * 0.6) * 0.45,
  11 - index * 7,
));

orderStagePositions.forEach((position, index) => {
  const stage = createOrderStage(orderStages[index], index);
  stage.position.copy(position);
  stage.rotation.set(0.08 * Math.sin(index), index % 2 === 0 ? -0.22 : 0.22, 0.04 * index);
  orderGroup.add(stage);
});

const orderCurve = new THREE.CatmullRomCurve3(orderStagePositions);
const orderLine = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints(orderCurve.getPoints(240)),
  new THREE.LineBasicMaterial({ color: '#4ee7ff', transparent: true, opacity: 0.62 }),
);
const orderGlow = new THREE.Points(
  new THREE.BufferGeometry().setFromPoints(orderCurve.getPoints(100)),
  new THREE.PointsMaterial({
    color: '#ffc36b',
    size: 0.12,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  }),
);
const movingOrder = createOrderPackage();
movingOrder.scale.setScalar(0.82);
orderGroup.add(orderLine, orderGlow, movingOrder);

orderGroup.visible = false;

const mapFlightPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-8, 7.5, 20),
  new THREE.Vector3(-4, 5.2, 9),
  new THREE.Vector3(5.5, 3.8, -3),
  new THREE.Vector3(-6, 4.7, -16),
  new THREE.Vector3(3, 3.4, -29),
  new THREE.Vector3(0, 5.2, -44),
]);

const mapLookPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-2, 0, 9),
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(3, 0, -10),
  new THREE.Vector3(-2, 0, -22),
  new THREE.Vector3(2, 0, -34),
  new THREE.Vector3(0, 0, -50),
]);

const groundMaterial = new THREE.MeshStandardMaterial({
  color: '#10151b',
  metalness: 0.4,
  roughness: 0.62,
});
const ground = new THREE.Mesh(new THREE.PlaneGeometry(34, 78, 24, 48), groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.set(0, -1.55, -15);
mapGroup.add(ground);

const roadMaterial = new THREE.LineBasicMaterial({
  color: '#8ed8ff',
  transparent: true,
  opacity: 0.38,
});
const avenueMaterial = new THREE.LineBasicMaterial({
  color: '#ffd083',
  transparent: true,
  opacity: 0.48,
});

for (let x = -15; x <= 15; x += 3) {
  const material = x % 6 === 0 ? avenueMaterial : roadMaterial;
  const points = [
    new THREE.Vector3(x + Math.sin(x) * 0.4, -1.48, 22),
    new THREE.Vector3(x * 0.55, -1.48, -54),
  ];
  mapGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
}

for (let z = 19; z >= -51; z -= 4) {
  const material = z % 8 === 0 ? avenueMaterial : roadMaterial;
  const points = [
    new THREE.Vector3(-16, -1.47, z + Math.cos(z) * 0.25),
    new THREE.Vector3(16, -1.47, z - Math.sin(z) * 0.25),
  ];
  mapGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
}

const buildingMaterials = [
  new THREE.MeshStandardMaterial({
    color: '#1b2730',
    emissive: '#081a22',
    emissiveIntensity: 0.28,
    metalness: 0.65,
    roughness: 0.34,
  }),
  new THREE.MeshStandardMaterial({
    color: '#283136',
    emissive: '#251408',
    emissiveIntensity: 0.22,
    metalness: 0.55,
    roughness: 0.4,
  }),
  new THREE.MeshStandardMaterial({
    color: '#20243a',
    emissive: '#120d2c',
    emissiveIntensity: 0.3,
    metalness: 0.62,
    roughness: 0.36,
  }),
];

for (let i = 0; i < 130; i += 1) {
  const width = 0.35 + Math.random() * 0.8;
  const depth = 0.35 + Math.random() * 0.9;
  const height = 0.2 + Math.random() * 3.7;
  const building = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    buildingMaterials[i % buildingMaterials.length],
  );
  const laneOffset = Math.round((Math.random() - 0.5) * 9) * 3;
  building.position.set(
    laneOffset + (Math.random() - 0.5) * 1.5,
    -1.55 + height / 2,
    18 - Math.random() * 68,
  );
  building.rotation.y = (Math.random() - 0.5) * 0.16;
  mapGroup.add(building);
}

const routePoints = [
  new THREE.Vector3(-10, -1.12, 18),
  new THREE.Vector3(-6, -1.05, 11),
  new THREE.Vector3(4, -1, 2),
  new THREE.Vector3(7, -1.08, -8),
  new THREE.Vector3(-5, -1.04, -20),
  new THREE.Vector3(3, -1.02, -34),
  new THREE.Vector3(0, -1, -50),
];
const routeCurve = new THREE.CatmullRomCurve3(routePoints);
const routeLine = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints(routeCurve.getPoints(180)),
  new THREE.LineBasicMaterial({ color: '#ff6f9e', transparent: true, opacity: 0.95 }),
);
mapGroup.add(routeLine);

const routeGlow = new THREE.Points(
  new THREE.BufferGeometry().setFromPoints(routeCurve.getPoints(70)),
  new THREE.PointsMaterial({
    color: '#ffcf70',
    size: 0.11,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  }),
);
mapGroup.add(routeGlow);

const mapBeaconMaterial = new THREE.MeshStandardMaterial({
  color: '#f6fbff',
  emissive: '#4ee7ff',
  emissiveIntensity: 1.4,
  metalness: 0.2,
  roughness: 0.2,
});
routePoints.forEach((point, index) => {
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.18, 1.1 + index * 0.08, 16), mapBeaconMaterial);
  beacon.position.set(point.x, -0.55, point.z);
  mapGroup.add(beacon);
});

const pedestrianGroup = new THREE.Group();
mapGroup.add(pedestrianGroup);

const pedestrianMaterials = [
  new THREE.MeshStandardMaterial({ color: '#f2f7ff', emissive: '#77e4ff', emissiveIntensity: 0.55, roughness: 0.4 }),
  new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#8d4d08', emissiveIntensity: 0.48, roughness: 0.42 }),
  new THREE.MeshStandardMaterial({ color: '#ff7aa9', emissive: '#7c1236', emissiveIntensity: 0.45, roughness: 0.42 }),
  new THREE.MeshStandardMaterial({ color: '#7df1a0', emissive: '#0d5222', emissiveIntensity: 0.42, roughness: 0.44 }),
];
const shadowMaterial = new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.22, depthWrite: false });

function createPedestrian(material) {
  const person = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.26, 4, 8), material);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), skinMaterial);
  const leftLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.18, 3, 6), material);
  const rightLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.18, 3, 6), material);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.15, 18), shadowMaterial);

  body.position.y = 0.29;
  head.position.y = 0.52;
  leftLeg.position.set(-0.04, 0.09, 0);
  rightLeg.position.set(0.04, 0.09, 0);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  person.add(shadow, body, head, leftLeg, rightLeg);

  person.userData.leftLeg = leftLeg;
  person.userData.rightLeg = rightLeg;
  return person;
}

const pedestrianRoutes = [
  [new THREE.Vector3(-13, -1.42, 18), new THREE.Vector3(-10, -1.42, 6), new THREE.Vector3(-7, -1.42, -9), new THREE.Vector3(-4, -1.42, -24)],
  [new THREE.Vector3(13, -1.42, 16), new THREE.Vector3(9, -1.42, 4), new THREE.Vector3(5, -1.42, -14), new THREE.Vector3(2, -1.42, -32)],
  [new THREE.Vector3(-15, -1.42, 9), new THREE.Vector3(-4, -1.42, 7), new THREE.Vector3(5, -1.42, 4), new THREE.Vector3(15, -1.42, 2)],
  [new THREE.Vector3(14, -1.42, -7), new THREE.Vector3(5, -1.42, -9), new THREE.Vector3(-5, -1.42, -12), new THREE.Vector3(-15, -1.42, -15)],
  [new THREE.Vector3(-11, -1.42, -20), new THREE.Vector3(-2, -1.42, -22), new THREE.Vector3(7, -1.42, -25), new THREE.Vector3(14, -1.42, -28)],
  [new THREE.Vector3(10, -1.42, -38), new THREE.Vector3(1, -1.42, -36), new THREE.Vector3(-7, -1.42, -39), new THREE.Vector3(-13, -1.42, -46)],
];

const pedestrians = [];
for (let i = 0; i < 42; i += 1) {
  const route = new THREE.CatmullRomCurve3(pedestrianRoutes[i % pedestrianRoutes.length]);
  const person = createPedestrian(pedestrianMaterials[i % pedestrianMaterials.length]);
  person.scale.setScalar(0.85 + Math.random() * 0.45);
  person.userData.route = route;
  person.userData.speed = 0.018 + Math.random() * 0.025;
  person.userData.offset = Math.random();
  person.userData.phase = Math.random() * Math.PI * 2;
  pedestrianGroup.add(person);
  pedestrians.push(person);
}

const cloudGroup = new THREE.Group();
mapGroup.add(cloudGroup);

const cloudMaterial = new THREE.MeshStandardMaterial({
  color: '#eef7ff',
  emissive: '#8ccaff',
  emissiveIntensity: 0.14,
  roughness: 0.82,
  transparent: true,
  opacity: 0.58,
  depthWrite: false,
});

function createCloud() {
  const cloud = new THREE.Group();
  const puffCount = 5 + Math.floor(Math.random() * 4);

  for (let i = 0; i < puffCount; i += 1) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), cloudMaterial);
    puff.position.set((Math.random() - 0.5) * 2.1, (Math.random() - 0.5) * 0.35, (Math.random() - 0.5) * 0.8);
    puff.scale.set(0.7 + Math.random() * 0.9, 0.24 + Math.random() * 0.22, 0.34 + Math.random() * 0.38);
    cloud.add(puff);
  }

  return cloud;
}

const clouds = [];
for (let i = 0; i < 9; i += 1) {
  const cloud = createCloud();
  cloud.position.set(-10 + Math.random() * 22, 7.2 + Math.random() * 3.5, 10 - Math.random() * 58);
  cloud.scale.setScalar(0.48 + Math.random() * 0.5);
  cloud.rotation.y = Math.random() * Math.PI;
  cloud.userData.baseX = cloud.position.x;
  cloud.userData.baseZ = cloud.position.z;
  cloud.userData.drift = 0.025 + Math.random() * 0.035;
  cloud.userData.phase = Math.random() * Math.PI * 2;
  cloudGroup.add(cloud);
  clouds.push(cloud);
}

mapGroup.visible = false;

function setSceneMode(id) {
  currentScene.id = id;
  document.body.dataset.scene = id;
  const isMap = id === 'map';
  const isOrder = id === 'order';
  letterGroup.visible = !isMap && !isOrder;
  orderGroup.visible = isOrder;
  structureGroup.visible = !isMap && !isOrder;
  portal.visible = !isMap && !isOrder;
  mapGroup.visible = isMap;
  scene.fog.density = isMap ? 0.012 : isOrder ? 0.014 : 0.018;
  scene.background.set(isMap ? '#07090d' : isOrder ? '#08090f' : '#07070a');

  gsap.to(camera, { fov: isMap ? 64 : isOrder ? 61 : 58, duration: 0.7, ease: 'power2.out', onUpdate: () => camera.updateProjectionMatrix() });
  sceneButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.scene === id);
  });
}

const requestedScene = new URLSearchParams(window.location.search).get('scene');
if (requestedScene === 'map' || window.location.hash === '#map') {
  setSceneMode('map');
} else if (requestedScene === 'order' || window.location.hash === '#order') {
  setSceneMode('order');
}

function updateCamera() {
  const progress = THREE.MathUtils.clamp(scrollState.progress, 0, 1);
  const activeFlightPath = currentScene.id === 'map' ? mapFlightPath : currentScene.id === 'order' ? orderFlightPath : flightPath;
  const activeLookPath = currentScene.id === 'map' ? mapLookPath : currentScene.id === 'order' ? orderLookPath : lookPath;
  const cursorStrength = currentScene.id === 'map' ? 0.32 : currentScene.id === 'order' ? 0.4 : 0.5;
  const position = new THREE.Vector3();
  const lookAt = new THREE.Vector3();
  let cinematicRoll = 0;

  if (currentScene.id === 'corridor') {
    const orbitStart = 0.58;
    const orbitTransition = 0.14;
    const hubTarget = portal.position.clone().add(new THREE.Vector3(0, 0.08, 0));

    if (progress < orbitStart) {
      const pathProgress = THREE.MathUtils.mapLinear(progress, 0, orbitStart, 0, 0.78);
      position.copy(flightPath.getPointAt(pathProgress));
      lookAt.copy(lookPath.getPointAt(Math.min(pathProgress + 0.04, 1)));
    } else {
      const rawOrbitProgress = THREE.MathUtils.clamp((progress - orbitStart) / (1 - orbitStart), 0, 1);
      const easedOrbit = THREE.MathUtils.smootherstep(rawOrbitProgress, 0, 1);
      const orbitTurns = 2;
      const orbitWave = easedOrbit * Math.PI * 2 * orbitTurns;
      const angle = Math.PI * 0.16 + orbitWave;
      const radius = THREE.MathUtils.lerp(6.6, 4.55, easedOrbit) + Math.sin(orbitWave) * 0.34;
      const orbitPosition = new THREE.Vector3(
        hubTarget.x + Math.cos(angle) * radius,
        hubTarget.y + 0.34 + Math.sin(orbitWave) * 0.62 + easedOrbit * 0.36,
        hubTarget.z + Math.sin(angle) * radius,
      );
      const entryPosition = flightPath.getPointAt(0.78);
      const entryLookAt = lookPath.getPointAt(0.82);
      const transitionMix = THREE.MathUtils.smootherstep(
        THREE.MathUtils.clamp(rawOrbitProgress / orbitTransition, 0, 1),
        0,
        1,
      );

      position.lerpVectors(entryPosition, orbitPosition, transitionMix);
      lookAt.lerpVectors(entryLookAt, hubTarget, transitionMix);
      cinematicRoll = Math.sin(orbitWave) * 0.18;
    }
  } else {
    position.copy(activeFlightPath.getPointAt(progress));
    lookAt.copy(activeLookPath.getPointAt(Math.min(progress + 0.025, 1)));
  }

  camera.position.copy(position);
  camera.position.x += cursor.x * cursorStrength;
  camera.position.y += cursor.y * (currentScene.id === 'map' ? 0.22 : currentScene.id === 'order' ? 0.28 : 0.35);
  camera.lookAt(lookAt.x + cursor.x * 0.6, lookAt.y + cursor.y * 0.25, lookAt.z);
  if (cinematicRoll) camera.rotateZ(cinematicRoll);
}

ScrollTrigger.create({
  trigger: document.body,
  start: 'top top',
  end: 'bottom bottom',
  scrub: 1.15,
  onUpdate: (self) => {
    scrollState.progress = self.progress;
    progressBar.style.transform = `scaleY(${self.progress})`;
  },
});

window.addEventListener('pointermove', (event) => {
  targetCursor.x = (event.clientX / sizes.width - 0.5) * 2;
  targetCursor.y = -(event.clientY / sizes.height - 0.5) * 2;
});

window.addEventListener('resize', () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(sizes.width, sizes.height);
  composer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  composer.setSize(sizes.width, sizes.height);
  bloomPass.resolution.set(sizes.width, sizes.height);
});

sceneButtons.forEach((button) => {
  button.addEventListener('click', () => setSceneMode(button.dataset.scene));
});

function tick() {
  const elapsed = clock.getElapsedTime();
  cursor.lerp(targetCursor, 0.055);
  updateCamera();

  letterGroup.children.forEach((node, index) => {
    if (node.userData.kind !== 'integrationNode') return;
    node.lookAt(camera.position);
    node.rotation.z += Math.sin(elapsed * 0.55 + index) * 0.02;
    node.position.y += Math.sin(elapsed * 0.5 + node.userData.floatOffset) * 0.0012;
    node.userData.orbit.rotation.z += node.userData.spin;
    node.userData.diamond.rotation.y += 0.018 + index * 0.0008;
  });

  structureGroup.rotation.y = Math.sin(elapsed * 0.13) * 0.035;
  dataRibbons.forEach((ribbon, index) => {
    ribbon.material.opacity = 0.48 + Math.sin(elapsed * 1.7 + index) * 0.18;
  });
  particleGroup.rotation.y = elapsed * 0.012;
  orderGlow.material.size = 0.1 + Math.sin(elapsed * 2.2) * 0.025;
  movingOrder.position.copy(orderCurve.getPointAt((elapsed * 0.055) % 1));
  movingOrder.rotation.set(Math.sin(elapsed * 1.1) * 0.12, elapsed * 0.9, Math.cos(elapsed * 0.9) * 0.1);
  orderGroup.children.forEach((child, index) => {
    if (!child.userData.ring) return;
    child.userData.ring.rotation.z += 0.006 + index * 0.0004;
    child.userData.product.rotation.y += 0.004;
    child.position.y += Math.sin(elapsed * 0.5 + child.userData.floatOffset) * 0.0009;
  });
  mapGroup.position.y = Math.sin(elapsed * 0.45) * 0.025;
  routeGlow.material.size = 0.1 + Math.sin(elapsed * 2.4) * 0.025;
  pedestrians.forEach((person) => {
    const progress = (person.userData.offset + elapsed * person.userData.speed) % 1;
    const nextProgress = (progress + 0.01) % 1;
    const position = person.userData.route.getPointAt(progress);
    const nextPosition = person.userData.route.getPointAt(nextProgress);
    const direction = nextPosition.clone().sub(position);
    const stride = Math.sin(elapsed * 8.5 + person.userData.phase) * 0.45;

    person.position.copy(position);
    person.rotation.y = Math.atan2(direction.x, direction.z);
    person.userData.leftLeg.rotation.x = stride;
    person.userData.rightLeg.rotation.x = -stride;
  });
  clouds.forEach((cloud) => {
    cloud.position.x = cloud.userData.baseX + Math.sin(elapsed * cloud.userData.drift + cloud.userData.phase) * 1.4;
    cloud.position.z = cloud.userData.baseZ + Math.cos(elapsed * cloud.userData.drift * 0.8 + cloud.userData.phase) * 0.9;
    cloud.rotation.y += 0.00045;
  });
  portal.rotation.x = elapsed * 0.18;
  portal.rotation.y = elapsed * 0.27;
  portal.scale.setScalar(1 + Math.sin(elapsed * 1.8) * 0.045);
  portal.userData.rings?.forEach((ring, index) => {
    ring.rotation.z += 0.006 + index * 0.002;
  });

  composer.render();
  requestAnimationFrame(tick);
}

gsap.from('.site-header', { opacity: 0, y: -18, duration: 1, ease: 'power3.out' });
gsap.utils.toArray('.chapter').forEach((chapter) => {
  gsap.fromTo(
    chapter,
    { opacity: 0.25, y: 70 },
    {
      opacity: 1,
      y: 0,
      duration: 1,
      scrollTrigger: {
        trigger: chapter,
        start: 'top 72%',
        end: 'top 32%',
        scrub: true,
      },
    },
  );
});

updateCamera();
tick();
