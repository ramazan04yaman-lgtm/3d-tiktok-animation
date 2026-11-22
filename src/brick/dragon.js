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
let PART = null;
function shape(x, y, z) {
  const p = [x, y, z], az = Math.abs(z);
  // Augen
  if (ell(p, [14.2, 20.3, 1.7], [.6, .6, .6]) || ell(p, [14.2, 20.3, -1.7], [.6, .6, .6])) { PART = 'head'; return C.eye; }
  // Hörner
  for (const s of [1, -1]) if (tube(p, [[12, 21, 1.2 * s], [10, 23, 1.8 * s], [8.5, 24.5, 2.2 * s]], .7, .45) >= 0) { PART = 'head'; return C.horn; }
  // Kopf + Schnauze
  if (ell(p, [12.8, 19.6, 0], [2.8, 2.1, 2.2]) || ell(p, [15.6, 19, 0], [2.4, 1.3, 1.5])) { PART = 'head'; return y < 18.6 ? C.belly : C.body; }
  // Hals
  const n = tube(p, NECK, 2.3, 1.9); if (n >= 0) { PART = 'neck'; return (x - 0.8 * (y - 9) > 3.5 + n * 3 && y < 18) ? C.belly : C.body; }
  // Rückenstacheln
  if (az < .6 && ((y > 10.4 && y < 12.6 && ell(p, [0, 9.5, 0], [6, 4.6, 1])) && Math.round(x) % 3 === 0)) { PART = 'body'; return C.spike; }
  // Körper
  if (ell(p, [0, 7.5, 0], [7, 3.8, 4])) { PART = 'body'; return y < 6 ? C.belly : C.body; }
  // Schwanz
  const t = tube(p, TAIL, 2.4, .7); if (t >= 0) { PART = 'tail'; return C.body; }
  if (ell(p, [-18.6, 7.3, 12.2], [1.5, 1.5, .6])) { PART = 'tail'; return C.spike; }
  // Beine
  for (const [lx, lz] of [[4, 2.8], [4, -2.8], [-4, 2.8], [-4, -2.8]]) {
    if (y < 5 && Math.hypot(x - lx, z - lz) < 1.5) { PART = 'legs'; return C.body; }
    if (y < 1.2 && x > lx && x < lx + 3 && Math.abs(z - lz) < 1.5) { PART = 'legs'; return x > lx + 2 ? C.claw : C.body; }
  }
  // Flügel (V-förmig gespreizt)
  if (az > 3 && az < 17) {
    const s = (az - 3) / 14, ys = 11 + 7 * s, lead = 4 - 2 * s;
    const trail = lead - (9 * Math.pow(1 - s, .7) + 1.5) + 1.6 * Math.abs(Math.sin(s * Math.PI * 3));
    if (Math.abs(y - ys) < 1.1 && x <= lead && x >= trail) { PART = 'wings'; return (x > lead - 1.2 || Math.abs(Math.sin(s * Math.PI * 3)) < .12) ? C.wingBone : C.wing; }
  }
  return null;
}

// ---------- Voxelisieren (nur Oberfläche) + zu Steinen zusammenfassen ----------
const vox = new Map(), key = (i, j, k) => `${i},${j},${k}`;
const S = 1.6; // Maßstab: größer = mehr, feinere Steine
for (let j = 0; j < 36; j++) for (let i = -34; i <= 31; i++) for (let k = -29; k <= 29; k++) {
  const c = shape(i / S, (j + .5) * BH / S, k / S); if (c !== null) vox.set(key(i, j, k), c + '|' + PART);
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
  const [cc, part] = c.split('|'); bricks.push({ x: i + (L - 1) / 2, y: j * BH, z: k, L, c: +cc, part });
}
// Bau-Reihenfolge: nach Körperteil, dann Schicht für Schicht, innerhalb der Schicht von hinten nach vorne
const ORDER = ['legs', 'body', 'tail', 'neck', 'wings', 'head'];
bricks.sort((a, b) => ORDER.indexOf(a.part) - ORDER.indexOf(b.part) || a.y - b.y || (a.x + a.z) - (b.x + b.z));
window.PARTS = { N: bricks.length, order: ORDER, counts: Object.fromEntries(ORDER.map(p => [p, bricks.filter(b => b.part === p).length])) };

// ---------- Geometrie / Szene ----------
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
const canvas = renderer.domElement; canvas.style.transformOrigin = '50% 45%';
const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
scene.background = new THREE.Color(0x14161f);
scene.fog = new THREE.Fog(0x14161f, 140, 260);
const key1 = new THREE.DirectionalLight(0xfff1dd, 2.4); key1.position.set(45, 80, 40); key1.castShadow = true;
key1.shadow.mapSize.set(2048, 2048); Object.assign(key1.shadow.camera, { left: -55, right: 55, top: 55, bottom: -55 }); scene.add(key1);
const rim = new THREE.DirectionalLight(0x6fa8ff, 1.6); rim.position.set(-30, 20, -30); scene.add(rim);
const pm = new THREE.MeshStandardMaterial({ color: 0x6d7682, roughness: .45 });
const base = new THREE.Mesh(new THREE.BoxGeometry(80, .4, 64), pm); base.position.y = -.2; base.receiveShadow = true; scene.add(base);
const m4 = new THREE.Matrix4();
const studs = new THREE.InstancedMesh(stud, pm, 80 * 64); let si = 0;
for (let a = 0; a < 80; a++) for (let b = 0; b < 64; b++) studs.setMatrixAt(si++, m4.makeTranslation(a - 39.5, .1, b - 31.5));
studs.receiveShadow = true; scene.add(studs);
const mat = new THREE.MeshStandardMaterial({ roughness: .28, metalness: 0 });
const meshes = {};
for (let L = 1; L <= 4; L++) {
  meshes[L] = new THREE.InstancedMesh(brickGeo(L), mat, Math.max(1, bricks.filter(b => b.L === L).length));
  meshes[L].castShadow = meshes[L].receiveShadow = true; meshes[L].userData.n = 0; scene.add(meshes[L]);
}
const col = new THREE.Color();
bricks.forEach(b => { b.mesh = meshes[b.L]; b.idx = b.mesh.userData.n++; b.mesh.setColorAt(b.idx, col.set(b.c)); });
const eyeMat = new THREE.MeshStandardMaterial({ color: C.eye, emissive: C.eye, emissiveIntensity: 0 });
const eyes = bricks.filter(b => b.c === C.eye);
const eyeMesh = new THREE.InstancedMesh(brickGeo(1), eyeMat, eyes.length); scene.add(eyeMesh);
const eyeLight = new THREE.PointLight(0xffee00, 0, 30); eyeLight.position.set(24, 33, 0); scene.add(eyeLight);
const FN = 420;
const fireMesh = new THREE.InstancedMesh(brickGeo(1), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveIntensity: 1, toneMapped: false }), FN);
fireMesh.material.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('vec3 totalEmissiveRadiance = emissive;', 'vec3 totalEmissiveRadiance = emissive * vColor;'); };
for (let n = 0; n < FN; n++) fireMesh.setColorAt(n, col.set(0xff6a00)); scene.add(fireMesh);
const fireLight = new THREE.PointLight(0xff7a20, 0, 120); fireLight.position.set(36, 30, 0); scene.add(fireLight);
const camera = new THREE.PerspectiveCamera(42, W / H, .1, 500);

// ---------- Timeline ----------
const tlUrl = new URLSearchParams(location.search).get('tl');
const TL = tlUrl ? await (await fetch(tlUrl)).json() : null;
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
const lerp = (a, b, k) => a + (b - a) * k;
if (TL) {
  // Landezeit je Stein aus Keyframes [t, n] (stückweise linear)
  const K = TL.keyframes;
  bricks.forEach((b, i) => {
    const target = i + 1; let t = K[K.length - 1][0];
    for (let k = 1; k < K.length; k++) if (K[k][1] >= target) { const [t0, n0] = K[k - 1], [t1, n1] = K[k]; t = n1 === n0 ? t1 : t0 + (t1 - t0) * (target - n0) / (n1 - n0); break; }
    b.land = t;
  });
}
const placedAt = t => bricks.reduce((s, b) => s + (b.land <= t ? 1 : 0), 0);

const CAM = { // [Kamera-Start, Kamera-Ende, Ziel-Start, Ziel-Ende]; Kamera als [Winkel, Radius, Höhe]
  hook:  [[.75, 30, 7], [.95, 46, 16], [0, 1, 0], [0, 3, 0]],
  legs:  [[.95, 46, 16], [1.45, 50, 20], [0, 3, 0], [0, 6, 0]],
  body:  [[1.45, 56, 26], [2.2, 60, 30], [0, 8, 0], [0, 11, 0]],
  neck:  [[2.4, 70, 30], [1.2, 72, 36], [-4, 14, 4], [4, 18, 0]],
  wings: [[1.9, 66, 66], [.9, 74, 62], [0, 18, 0], [0, 20, 0]],
  head:  [[.45, 62, 46], [.75, 56, 44], [16, 29, 0], [18, 30, 0]],
  done:  [[.6, 112, 28], [1.05, 106, 32], [0, 19, 0], [0, 20, 0]],
  glow:  [[.35, 62, 36], [.3, 50, 34], [22, 31, 0], [23, 31.5, 0]],
  fire:  [[-1.45, 118, 30], [-1.35, 110, 32], [27, 24, 0], [29, 25, 0]],
  outro: [[-.6, 100, 30], [.4, 128, 42], [12, 20, 0], [4, 20, 0]],
};

const $ = id => document.getElementById(id);
const chunks = [];
if (TL) for (const s of TL.segments) {
  let cur = [];
  s.words.forEach((w, i) => {
    cur.push(w);
    if (/[.,!?]$/.test(w.w) || cur.length === 3 || (cur.length === 2 && w.w.length > 9) || i === s.words.length - 1) { chunks.push(cur); cur = []; }
  });
}
function setCaption(t) {
  const c = chunks.find((c, i) => t >= c[0].s && t < (chunks[i + 1] && chunks[i + 1][0].s - c[c.length - 1].e < .3 ? chunks[i + 1][0].s : c[c.length - 1].e + .25));
  const cap = $('cap');
  if (!c) { cap.innerHTML = ''; return; }
  cap.style.transform = `scale(${0.75 + 0.25 * easeOut((t - c[0].s) / 0.12)})`;
  cap.innerHTML = c.map(w => `<span style="${t >= w.s && t < w.e + .05 ? 'color:#ffe02e' : ''}">${(w.show || w.w).replace(/[.,]$/, '')}</span>`).join(' ');
}
const fmt = n => n.toLocaleString('de-DE');

window.renderAt = (t) => {
  const SEG = TL.segments, i = SEG.findIndex((s, j) => t < (SEG[j + 1] ? SEG[j + 1].start : Infinity));
  const s = SEG[i], st = i === 0 ? 0 : s.start, en = SEG[i + 1] ? SEG[i + 1].start : TL.duration, lt = t - st, ld = en - st;
  const q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  // Steine
  const glowOn = t >= TL.glowT;
  bricks.forEach(b => {
    const f = clamp(1 - (b.land - t) / 0.4);
    const k = easeOut(f), hideEye = b.c === C.eye && glowOn;
    pos.set(b.x, b.y + 16 * (1 - k) + (f >= 1 ? 0 : Math.sin(f * Math.PI) * 0), b.z);
    q.setFromEuler(e.set(0, (1 - k) * 1.2, (1 - k) * .4)); sc.setScalar(f > 0 && !hideEye ? 1 : 0);
    b.mesh.setMatrixAt(b.idx, m4.compose(pos, q, sc));
  });
  for (const L in meshes) { meshes[L].instanceMatrix.needsUpdate = true; meshes[L].instanceColor.needsUpdate = true; }
  q.identity();
  eyes.forEach((b, n) => eyeMesh.setMatrixAt(n, m4.compose(pos.set(b.x, b.y, b.z), q, sc.setScalar(glowOn ? 1 : 0))));
  eyeMesh.instanceMatrix.needsUpdate = true;
  const g = glowOn ? clamp((t - TL.glowT) / 1.2) : 0, flick = 0.85 + 0.15 * Math.sin(t * 23) * Math.sin(t * 7);
  eyeMat.emissiveIntensity = 0.3 + 5 * g * flick; eyeLight.intensity = 300 * g * flick;
  // Feuer
  const fireAmt = t < TL.fireT ? 0 : clamp((t - TL.fireT) / 0.35) * (1 - clamp((t - TL.fireEnd) / 0.8));
  fireLight.intensity = fireAmt * 1400 * (0.8 + 0.2 * Math.sin(t * 31));
  for (let n = 0; n < FN; n++) {
    const ph = (n * 0.6180339 + t * 1.6) % 1, a = n * 2.39996 + t * 2, spread = ph * 15 + 0.8;
    pos.set(29 + ph * 48, 30 - ph * 8 + Math.sin(a) * spread * Math.sqrt((n % 7 + 1) / 7), Math.cos(a) * spread * Math.sqrt((n % 5 + 1) / 5));
    q.setFromEuler(e.set(a + t * 4, a * .7, t * 3));
    const vis = fireAmt > 0 && ph < fireAmt;
    fireMesh.setMatrixAt(n, m4.compose(pos, q, sc.setScalar(vis ? (1.6 + ph * .6) : 0)));
    fireMesh.setColorAt(n, col.setHSL(lerp(.09, .0, ph) + (n % 3) * .012, 1, lerp(.55, .4, ph)));
  }
  fireMesh.instanceMatrix.needsUpdate = true; fireMesh.instanceColor.needsUpdate = true; q.identity();
  // Kamera
  const [c0, c1, t0, t1] = CAM[s.scene], k = ease(lt / ld);
  const ang = lerp(c0[0], c1[0], k), R = lerp(c0[1], c1[1], k), hh = lerp(c0[2], c1[2], k);
  camera.position.set(Math.cos(ang) * R, hh, Math.sin(ang) * R);
  const tg = t0.map((v, j) => lerp(v, t1[j], k));
  if (fireAmt > 0) { camera.position.x += Math.sin(t * 61) * .5 * fireAmt; camera.position.y += Math.cos(t * 47) * .5 * fireAmt; }
  camera.lookAt(tg[0], tg[1], tg[2]); camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  // Schnitt-Punch
  const cutK = i === 0 ? 1 : clamp(lt / 0.3);
  canvas.style.transform = `scale(${1 + 0.07 * (1 - easeOut(cutK))})`;
  $('flash').style.opacity = Math.max(i === 0 ? 0 : (1 - clamp(lt / 0.12)) * 0.35, fireAmt > 0 ? (1 - clamp((t - TL.fireT) / 0.3)) * 0.6 : 0);
  // Label + Balken
  const placed = placedAt(t), building = ['hook', 'legs', 'body', 'neck', 'wings', 'head', 'done'].includes(s.scene);
  const lab = building ? `STEIN ${fmt(placed)} / ${fmt(bricks.length)}` : s.scene === 'glow' ? 'MOMENT MAL…' : s.scene === 'fire' ? 'ER LEBT!' : 'TEIL 2?';
  $('label').textContent = lab;
  $('label').style.background = building ? '#e8222c' : '#ff7a1a';
  $('bar').style.opacity = building ? 1 : 0; $('bar').firstChild.style.width = (placed / bricks.length * 100) + '%';
  setCaption(t);
};
await document.fonts.load('900 50px M');
window.READY = true;
