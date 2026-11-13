/** Charakter-Galerie: zeigt den verbindlichen Figurenstil (zum Prüfen und Vergleichen). */
import * as THREE from 'three';
import { RUHE, createCharacter, lookFor } from './earth/characters.ts';
import { Mascot } from './earth/mascot.ts';

const canvas = document.querySelector<HTMLCanvasElement>('#c')!;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#8fd0ff');
const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
cam.position.set(0, 2.2, 9.5);
cam.lookAt(0, 1.0, 0);
scene.add(new THREE.HemisphereLight('#dff2ff', '#6b8f4a', 1.1));
const sun = new THREE.DirectionalLight('#fff4e0', 2.2);
sun.position.set(-4, 7, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 });
sun.shadow.radius = 4;
scene.add(sun);
const ground = new THREE.Mesh(new THREE.CircleGeometry(12, 64), new THREE.MeshStandardMaterial({ color: '#7fcf55', roughness: 0.9 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
scene.add(ground);
const hash = (i: number) => { let x = (i + 0x9e3779b9) | 0; x = Math.imul(x ^ (x >>> 16), 0x85ebca6b); x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
const posen = [
  { ...RUHE },
  { ...RUHE, legL: 0.5, legR: -0.5, armL: -0.4, armR: 0.4, bodyLean: 0.05 },
  { ...RUHE, drink: 1, headTilt: 0.3 },
  { ...RUHE, liftL: 0.9 },
  { ...RUHE, liftL: 0.5, liftR: 0.5 },
  { ...RUHE, drink: 0.6, headTilt: 0.15, liftL: 0.3 },
];
posen.forEach((p, k) => {
  const ch = createCharacter(lookFor(k + 3, hash));
  ch.setPose(p);
  ch.root.position.set((k - 2.5) * 1.15, 0, k % 2 ? -0.6 : 0.4);
  ch.root.rotation.y = (k - 2.5) * -0.12;
  ch.root.scale.setScalar(1.35);
  scene.add(ch.root);
});
const m = new Mascot();
m.root.position.set(0, 0, -2.4);
m.update(1.2);
scene.add(m.root);
function size() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
}
size(); addEventListener('resize', size);
renderer.render(scene, cam);
Object.assign(window, { __galerieFertig: true });
