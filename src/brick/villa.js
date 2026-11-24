// Follower-Villa (eigenes Design, Miami Art déco). Gesetzte Steine massiv, fehlende als Glas-Vorschau.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const W = 1080, H = 1920, BH = 1.2;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);

const C = { white: 0xf4f1ea, cream: 0xf3e3c3, teal: 0x00bfae, pink: 0xff6fb5, glass: 0x9fe3ff, dark: 0x2b2f3a,
  water: 0x1fb7d6, rim: 0xe8e4da, trunk: 0x8d5a2b, leaf: 0x2e9d3a, leaf2: 0x56c271, gdoor: 0xff3c9e, roof: 0xd9d4c7 };

// ---------- Form ----------
let PART = null;
const P = (part, c) => { PART = part; return c; };
const segDist = (p, a, b) => { const ab = b.map((v, k) => v - a[k]), ap = p.map((v, k) => v - a[k]);
  const t = clamp((ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / (ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2));
  return Math.hypot(...p.map((v, k) => v - (a[k] + ab[k] * t))); };
const PALMS = [[-30, 14, 26, 1], [24, 18, 22, -1], [-26, -20, 30, 1]];
const FL = [1.2, 8.4, 15.6, 22.8]; // Geschossgrenzen
function shape(x, y, z) {
  const p = [x, y, z];
  // Palmen
  for (const [px, pz, h, lean] of PALMS) {
    const top = [px + lean * 3, h, pz];
    if (y < h && Math.hypot(x - (px + lean * 3 * (y / h) ** 2), z - pz) < 1) return P('palms', C.trunk);
    for (let f = 0; f < 6; f++) { const a = f / 6 * Math.PI * 2;
      if (segDist(p, top, [top[0] + Math.cos(a) * 8, h - 2.5, top[2] + Math.sin(a) * 8]) < .75) return P('palms', f % 2 ? C.leaf : C.leaf2); }
  }
  // Pool vorne
  if (x >= -8 && x <= 14 && z >= 11 && z <= 21 && y < 1.2) return P('pool', (x > -7 && x < 13 && z > 12 && z < 20) ? C.water : C.rim);
  // Fundament
  // Garage rechts
  if (x > 20 && x <= 31 && z >= -8 && z <= 6 && y < 8.4) {
    if (z > 5 && x > 22 && x < 30 && y < 6.6) return P('garage', C.gdoor);
    if (y > 7.2) return P('garage', C.teal);
    return P('garage', C.white);
  }
  // Turm links
  if (x >= -21 && x <= -12 && z >= -8 && z <= 7 && y < 32) {
    if (y >= 30.8) return P('tower', C.teal);
    const face = z > 6 || x < -20;
    if (face && y > 23.4 && (Math.round(y / BH) % 3 !== 0) && (z > 6 ? Math.abs(x + 16.5) < 2 : Math.abs(z) < 2)) return P('tower', C.glass);
    if (z > 6 && x > -17.5 && x < -15.5) return P('tower', C.pink); // Art-déco-Finne
    return P('tower', C.white);
  }
  // Haupthaus 3 Geschosse
  if (x >= -20 && x <= 20 && z >= -14 && z <= 6 && y < 24) {
    if (y >= 22.8) return P('roof', (x + z) % 2 ? C.roof : C.white);
    const fl = Math.max(0, FL.findIndex((v, k) => y >= v && y < (FL[k + 1] ?? 99)));
    const ly = y < FL[0] ? -1 : y - FL[fl];
    if (ly < 0) return P('floor0', C.white); // Sockel
    if (ly < BH) return P('floor' + fl, C.teal); // Gesims-Band
    const front = z > 5, back = z < -13, side = x > 19 || x < -19;
    if (fl === 0 && front && Math.abs(x) < 2.5 && ly < 6) return P('floor0', C.dark); // Tür
    const wx = front || back ? x : z;
    if ((front || back || side) && ly > 1.6 && ly < 5.8 && ((wx + 40) % 4) >= 1 && ((wx + 40) % 4) < 3) return P('floor' + fl, C.glass);
    return P('floor' + fl, fl === 1 ? C.cream : C.white);
  }
  // Dachterrassen-Brüstung + Schirm
  if (x >= -20 && x <= 20 && z >= -14 && z <= 6 && y >= 24 && y < 25.2 && (x === -20 || x === 20 || z === -14 || z === 6)) return P('roof', C.white);
  if (y >= 24 && y < 29 && Math.hypot(x - 8, z + 4) < .8) return P('roof', C.dark);
  if (y >= 28.6 && y < 30 && Math.hypot(x - 8, z + 4) < 4.5) return P('roof', C.pink);
  return null;
}

// ---------- Voxelisieren + Steine ----------
const vox = new Map(), key = (i, j, k) => `${i},${j},${k}`;
for (let j = 0; j < 30; j++) for (let i = -40; i <= 36; i++) for (let k = -30; k <= 24; k++) {
  PART = null; const c = shape(i, (j + .5) * BH, k); if (c !== null) vox.set(key(i, j, k), c + '|' + PART);
}
const surf = new Map();
for (const [kk, c] of vox) { const [i, j, k] = kk.split(',').map(Number);
  if ([[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]].some(([a, b, d]) => !vox.has(key(i + a, j + b, k + d)))) surf.set(kk, c); }
const bricks = [], used = new Set();
const sorted = [...surf.keys()].map(s => s.split(',').map(Number)).sort((a, b) => a[1] - b[1] || a[2] - b[2] || a[0] - b[0]);
for (const [i, j, k] of sorted) {
  if (used.has(key(i, j, k))) continue;
  const c = surf.get(key(i, j, k)); let L = 1;
  while (L < 2 && surf.get(key(i + L, j, k)) === c && !used.has(key(i + L, j, k))) L++;
  for (let a = 0; a < L; a++) used.add(key(i + a, j, k));
  const [cc, part] = c.split('|'); bricks.push({ x: i + (L - 1) / 2, y: j * BH, z: k, L, c: +cc, part });
}
const ORDER = ['floor0', 'garage', 'floor1', 'floor2', 'tower', 'roof', 'pool', 'palms'];
bricks.sort((a, b) => ORDER.indexOf(a.part) - ORDER.indexOf(b.part) || a.y - b.y || (a.x + a.z) - (b.x + b.z));
window.PARTS = { N: bricks.length, order: ORDER, counts: Object.fromEntries(ORDER.map(p => [p, bricks.filter(b => b.part === p).length])) };

// ---------- Szene (Miami-Sonnenuntergang) ----------
const stud = new THREE.CylinderGeometry(.3, .3, .2, 14);
function brickGeo(L) {
  const parts = [new THREE.BoxGeometry(L - .04, BH - .02, .96).translate(0, BH / 2, 0)];
  for (let a = 0; a < L; a++) parts.push(stud.clone().translate(a - (L - 1) / 2, BH + .1, 0));
  return mergeGeometries(parts);
}
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setPixelRatio(1);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
scene.environmentIntensity = .6;
scene.add(new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: `varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `varying vec3 vp; void main(){ float h = clamp(vp.y, -.1, 1.);
    vec3 hor = vec3(1., .62, .28), mid = vec3(1., .33, .55), top = vec3(.22, .12, .45);
    gl_FragColor = vec4(h < .12 ? mix(hor, mid, h/.12) : mix(mid, top, clamp((h-.12)/.5, 0., 1.)), 1.); }` })));
const key1 = new THREE.DirectionalLight(0xffc090, 2.4); key1.position.set(-50, 45, 60); key1.castShadow = true;
key1.shadow.mapSize.set(2048, 2048); Object.assign(key1.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60 }); scene.add(key1);
scene.add(new THREE.HemisphereLight(0xff9ad0, 0x3a2050, 1.2));
const front = new THREE.DirectionalLight(0xffe0f0, 1.0); front.position.set(40, 30, 70); scene.add(front);
const m4 = new THREE.Matrix4();
{ const m = new THREE.MeshStandardMaterial({ color: 0x7fbf5a, roughness: .7 }), w = 90, d = 70;
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, .4, d), m); b.position.set(0, -.2, -3); b.receiveShadow = true; scene.add(b);
  const s = new THREE.InstancedMesh(stud, m, w * d); let n = 0;
  for (let a = 0; a < w; a++) for (let c = 0; c < d; c++) s.setMatrixAt(n++, m4.makeTranslation(a - w / 2 + .5, .1, c - d / 2 + .5 - 3));
  s.receiveShadow = true; scene.add(s); }
const land = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshStandardMaterial({ color: 0xd8c9a0, roughness: 1 }));
land.rotation.x = -Math.PI / 2; land.position.y = -.42; scene.add(land);
scene.fog = new THREE.Fog(0xff9aa8, 160, 420);
// Steine: massiv + Glas-Vorschau
const solidMat = new THREE.MeshStandardMaterial({ roughness: .25 });
const ghostMat = new THREE.MeshStandardMaterial({ roughness: .1, transparent: true, opacity: .24, depthWrite: false });
const solid = {}, ghost = {};
for (let L = 1; L <= 2; L++) {
  const n = Math.max(1, bricks.filter(b => b.L === L).length);
  solid[L] = new THREE.InstancedMesh(brickGeo(L), solidMat, n); solid[L].castShadow = solid[L].receiveShadow = true; scene.add(solid[L]);
  ghost[L] = new THREE.InstancedMesh(brickGeo(L), ghostMat, n); ghost[L].renderOrder = 2; scene.add(ghost[L]);
  solid[L].userData.n = 0;
}
const col = new THREE.Color();
bricks.forEach(b => { b.idx = solid[b.L].userData.n++; col.set(b.c); solid[b.L].setColorAt(b.idx, col); ghost[b.L].setColorAt(b.idx, col.clone().lerp(new THREE.Color(0xffffff), .35)); });
const camera = new THREE.PerspectiveCamera(42, W / H, .1, 1500);
const $ = id => document.getElementById(id);
const fmt = n => n.toLocaleString('de-DE');

// Standbild: { placed, falling (Anzahl Steine, die gerade fallen), cam, label, cap }
window.shot = (s) => {
  const zero = new THREE.Matrix4().makeScale(0, 0, 0), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(1, 1, 1), pos = new THREE.Vector3();
  const placed = s.placed, fall = s.falling || 0;
  bricks.forEach((b, n) => {
    if (n < placed) {
      const f = fall && n >= placed - fall ? (n - (placed - fall)) / fall : 0, k = easeOut(1 - f);
      pos.set(b.x, b.y + 14 * (1 - k), b.z); q.setFromEuler(e.set(0, (1 - k), 0));
      solid[b.L].setMatrixAt(b.idx, m4.compose(pos, q, sc)); ghost[b.L].setMatrixAt(b.idx, zero);
    } else { solid[b.L].setMatrixAt(b.idx, zero); ghost[b.L].setMatrixAt(b.idx, m4.makeTranslation(b.x, b.y, b.z)); }
  });
  for (const L in solid) { solid[L].instanceMatrix.needsUpdate = ghost[L].instanceMatrix.needsUpdate = true; solid[L].instanceColor.needsUpdate = ghost[L].instanceColor.needsUpdate = true; }
  const [cx, cy, cz, tx, ty, tz] = s.cam; camera.position.set(cx, cy, cz); camera.lookAt(tx, ty, tz); camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  $('label').textContent = s.label ?? `VILLA: ${fmt(placed)} / ${fmt(bricks.length)} STEINE`;
  $('cap').innerHTML = s.cap || '';
  $('bar').firstChild.style.width = (placed / bricks.length * 100) + '%';
};
await document.fonts.load('900 50px M');
window.READY = true;
