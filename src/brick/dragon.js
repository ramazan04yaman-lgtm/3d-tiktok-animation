// Klemmbaustein-Drache: Voxel-Modell -> Steine (1x1 bis 1x4) -> Bau-Reihenfolge Schicht für Schicht.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const W = 1080, H = 1920, BH = 1.2; // Steinhöhe relativ zum Noppenraster
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };

// ---------- Farben ----------
const C = { body: 0x2f7d32, belly: 0x9ccc65, spike: 0xffc107, wingBone: 0x1b4d1e, wing: 0xd84315, horn: 0xf5f0e1, eye: 0xffee00, claw: 0x222222 };

// ---------- Form des Drachen (Weltkoordinaten) ----------
const ell = (p, c, r) => ((p[0] - c[0]) / r[0]) ** 2 + ((p[1] - c[1]) / r[1]) ** 2 + ((p[2] - c[2]) / r[2]) ** 2 <= 1;
function tube(p, pts, r0, r1) { // Kette von Kugeln entlang Punkten
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], ab = b.map((v, k) => v - a[k]), ap = p.map((v, k) => v - a[k]);
    const t = clamp((ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / (ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2));
    const q = a.map((v, k) => v + ab[k] * t), u = (i + t) / (pts.length - 1), r = r0 + (r1 - r0) * u;
    if (Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) <= r) return u;
  }
  return -1;
}
const NECK = [[5, 9, 0], [8, 12.5, 0], [10, 16, 0], [11.5, 19, 0]];
const TAIL = [[-6, 7, 0], [-10, 5.5, 1.5], [-14, 4, 4], [-17, 4, 8], [-18, 6, 11]];
function shape(x, y, z) {
  const p = [x, y, z], az = Math.abs(z);
  // Augen
  if (ell(p, [14.2, 20.3, 1.7], [.6, .6, .6]) || ell(p, [14.2, 20.3, -1.7], [.6, .6, .6])) return C.eye;
  // Hörner
  for (const s of [1, -1]) if (tube(p, [[12, 21, 1.2 * s], [10, 23, 1.8 * s], [8.5, 24.5, 2.2 * s]], .7, .45) >= 0) return C.horn;
  // Kopf + Schnauze
  if (ell(p, [12.8, 19.6, 0], [2.8, 2.1, 2.2]) || ell(p, [15.6, 19, 0], [2.4, 1.3, 1.5])) return y < 18.6 ? C.belly : C.body;
  // Hals
  const n = tube(p, NECK, 2.3, 1.9); if (n >= 0) return (x - 0.8 * (y - 9) > 3.5 + n * 3 && y < 18) ? C.belly : C.body;
  // Rückenstacheln
  if (az < .6 && ((y > 10.4 && y < 12.6 && ell(p, [0, 9.5, 0], [6, 4.6, 1])) && Math.round(x) % 3 === 0)) return C.spike;
  // Körper
  if (ell(p, [0, 7.5, 0], [7, 3.8, 4])) return y < 6 ? C.belly : C.body;
  // Schwanz
  const t = tube(p, TAIL, 2.4, .7); if (t >= 0) return C.body;
  if (ell(p, [-18.6, 7.3, 12.2], [1.5, 1.5, .6])) return C.spike;
  // Beine
  for (const [lx, lz] of [[4, 2.8], [4, -2.8], [-4, 2.8], [-4, -2.8]]) {
    if (y < 5 && Math.hypot(x - lx, z - lz) < 1.5) return C.body;
    if (y < 1.2 && x > lx && x < lx + 3 && Math.abs(z - lz) < 1.5) return x > lx + 2 ? C.claw : C.body;
  }
  // Flügel (V-förmig gespreizt)
  if (az > 3 && az < 17) {
    const s = (az - 3) / 14, ys = 11 + 7 * s, lead = 4 - 2 * s;
    const trail = lead - (9 * Math.pow(1 - s, .7) + 1.5) + 1.6 * Math.abs(Math.sin(s * Math.PI * 3));
    if (Math.abs(y - ys) < 1.1 && x <= lead && x >= trail) return (x > lead - 1.2 || Math.abs(Math.sin(s * Math.PI * 3)) < .12) ? C.wingBone : C.wing;
  }
  return null;
}

// ---------- Voxelisieren (nur Oberfläche) + zu Steinen zusammenfassen ----------
const vox = new Map(), key = (i, j, k) => `${i},${j},${k}`;
const S = 1.6; // Maßstab: größer = mehr, feinere Steine
for (let j = 0; j < 36; j++) for (let i = -34; i <= 31; i++) for (let k = -29; k <= 29; k++) {
  const c = shape(i / S, (j + .5) * BH / S, k / S); if (c !== null) vox.set(key(i, j, k), c);
}
const surf = new Map();
for (const [kk, c] of vox) { const [i, j, k] = kk.split(',').map(Number);
  if ([[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]].some(([a, b, d]) => !vox.has(key(i + a, j + b, k + d)))) surf.set(kk, c); }
const bricks = []; const used = new Set();
const sorted = [...surf.keys()].map(s => s.split(',').map(Number)).sort((a, b) => a[1] - b[1] || a[2] - b[2] || a[0] - b[0]);
for (const [i, j, k] of sorted) {
  if (used.has(key(i, j, k))) continue;
  const c = surf.get(key(i, j, k)); let L = 1;
  while (L < 4 && surf.get(key(i + L, j, k)) === c && !used.has(key(i + L, j, k))) L++;
  for (let a = 0; a < L; a++) used.add(key(i + a, j, k));
  bricks.push({ x: i + (L - 1) / 2, y: j * BH, z: k, L, c });
}
// Bau-Reihenfolge: Schicht für Schicht, innerhalb der Schicht von hinten nach vorne
bricks.sort((a, b) => a.y - b.y || (a.x + a.z) - (b.x + b.z));
window.BRICKS = bricks.length;

// ---------- Geometrie ----------
const stud = new THREE.CylinderGeometry(.3, .3, .2, 20);
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
scene.background = new THREE.Color(0x14161f);
scene.fog = new THREE.Fog(0x14161f, 140, 260);
const key1 = new THREE.DirectionalLight(0xfff1dd, 2.4); key1.position.set(45, 80, 40); key1.castShadow = true;
key1.shadow.mapSize.set(2048, 2048); Object.assign(key1.shadow.camera, { left: -55, right: 55, top: 55, bottom: -55 }); scene.add(key1);
const rim = new THREE.DirectionalLight(0x6fa8ff, 1.6); rim.position.set(-30, 20, -30); scene.add(rim);
// Grundplatte
const plate = new THREE.Group(); scene.add(plate);
const pm = new THREE.MeshStandardMaterial({ color: 0x6d7682, roughness: .45 });
const base = new THREE.Mesh(new THREE.BoxGeometry(80, .4, 64), pm); base.position.y = -.2; base.receiveShadow = true; plate.add(base);
const studs = new THREE.InstancedMesh(stud, pm, 80 * 64); let si = 0; const m4 = new THREE.Matrix4();
for (let a = 0; a < 80; a++) for (let b = 0; b < 64; b++) studs.setMatrixAt(si++, m4.makeTranslation(a - 39.5, .1, b - 31.5));
studs.receiveShadow = true; plate.add(studs);
// Steine (InstancedMesh pro Länge)
const mat = new THREE.MeshStandardMaterial({ roughness: .28, metalness: 0 });
const meshes = {}; for (let L = 1; L <= 4; L++) {
  const n = bricks.filter(b => b.L === L).length;
  meshes[L] = new THREE.InstancedMesh(brickGeo(L), mat, Math.max(1, n)); meshes[L].castShadow = meshes[L].receiveShadow = true;
  meshes[L].instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(meshes[L]);
}
const col = new THREE.Color();
bricks.forEach(b => { b.mesh = meshes[b.L]; b.idx = b.mesh.userData.n = (b.mesh.userData.n ?? -1) + 1; b.mesh.setColorAt(b.idx, col.set(b.c)); });
const eyeMat = new THREE.MeshStandardMaterial({ color: C.eye, emissive: C.eye, emissiveIntensity: 0 });
const eyes = bricks.filter(b => b.c === C.eye);
const eyeMesh = new THREE.InstancedMesh(brickGeo(1), eyeMat, eyes.length); scene.add(eyeMesh);
// Feuer aus losen Steinen
const fireMesh = new THREE.InstancedMesh(brickGeo(1), new THREE.MeshStandardMaterial({ color: 0xff6a00, emissive: 0xff4500, emissiveIntensity: 2.5 }), 160); scene.add(fireMesh);
const fireLight = new THREE.PointLight(0xff7a20, 0, 80); fireLight.position.set(32, 30, 0); scene.add(fireLight);

const camera = new THREE.PerspectiveCamera(42, W / H, .1, 500);
const $ = id => document.getElementById(id);

// state: { p: Bau-Fortschritt 0..1, t: Zeit für fallende Steine, cam: [x,y,z,tx,ty,tz], fire: 0..1, label, cap }
window.shot = (s) => {
  const N = bricks.length, placed = s.p * N; const q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), pos = new THREE.Vector3();
  bricks.forEach((b, n) => {
    const f = clamp(placed - n + 1, 0, 1); // 0 = unsichtbar, 0..1 = fällt, 1 = steht
    const drop = f >= 1 ? 0 : 1 - ease(f);
    pos.set(b.x, b.y + drop * 22, b.z);
    sc.setScalar(f > 0 ? 1 : 0);
    const isEye = b.c === C.eye && s.p >= 1;
    if (isEye) sc.setScalar(0);
    b.mesh.setMatrixAt(b.idx, m4.compose(pos, q, sc));
  });
  eyes.forEach((b, n) => eyeMesh.setMatrixAt(n, m4.compose(pos.set(b.x, b.y, b.z), q, sc.setScalar(s.p >= 1 ? 1 : 0))));
  eyeMat.emissiveIntensity = s.p >= 1 ? 1 + 3 * (s.glow ?? 0) : 0;
  for (const L in meshes) { meshes[L].instanceMatrix.needsUpdate = true; meshes[L].instanceColor.needsUpdate = true; }
  eyeMesh.instanceMatrix.needsUpdate = true;
  // Feuer
  const fire = s.fire ?? 0; fireLight.intensity = fire * 900;
  for (let n = 0; n < 160; n++) {
    const u = ((n * 0.618) % 1), d = u * 26 * fire, spread = u * 4.5, a = n * 2.4;
    pos.set(28 + d * 1.6, 30.5 - u * 5 + Math.sin(a) * spread, Math.cos(a) * spread * 1.6);
    q.setFromEuler(new THREE.Euler(a, a * .7, a * .3));
    fireMesh.setMatrixAt(n, m4.compose(pos, q, sc.setScalar(fire > 0 && u < fire ? (1 - u * .6) : 0)));
  }
  fireMesh.instanceMatrix.needsUpdate = true; q.identity();
  const [cx, cy, cz, tx, ty, tz] = s.cam; camera.position.set(cx, cy, cz); camera.lookAt(tx, ty, tz);
  renderer.render(scene, camera);
  $('label').textContent = s.label; $('cap').innerHTML = s.cap;
  $('bar').style.opacity = s.bar === false ? 0 : 1; $('bar').firstChild.style.width = (s.p * 100) + '%';
};
await document.fonts.load('900 50px M');
window.READY = true;
