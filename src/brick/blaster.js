// Eigener Sci-Fi-Blaster aus Klemmbausteinen (Fantasy-Design, keine reale Waffe).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const W = 1080, H = 1920, BH = 1.2;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
const lerp = (a, b, k) => a + (b - a) * k;

const C = { white: 0xf2f2f2, orange: 0xff7a1a, dark: 0x2b2f3a, mid: 0x6b7280, cyan: 0x00e5ff, stand: 0x3a3f4b };

// ---------- Form (x = Länge, Mündung bei +x; y = Höhe; z = Breite) ----------
let PART = null;
const P = (part, c) => { PART = part; return c; };
function shape(x, y, z) {
  const az = Math.abs(z);
  // Ständer
  for (const sx of [-9, 11]) {
    if (y < 1.2 && Math.abs(x - sx) < 3 && az < 3) return P('stand', C.stand);
    if (y < 8.4 && Math.abs(x - sx) < 1 && az < 1) return P('stand', C.stand);
  }
  // Griff (schräg)
  const gx = 1 + (11 - y) * 0.35;
  if (y > 7.2 && y < 11 && x > gx - 1.6 && x < gx + 1.6 && az < 1.6) return P('grip', C.dark);
  // Energiezelle mit Leuchtfenster
  if (y > 6 && y < 11 && x > 6 && x < 10.5 && az < 1.6) return P('grip', az > 1 && y > 7.2 && y < 9.6 && x > 7 && x < 9.6 ? C.cyan : C.orange);
  // Schaft mit Aussparung
  if (x > -21 && x <= -6) {
    const u = (x + 21) / 15, top = 15.4 - (1 - u) * 1.2, bot = 9.6 + (1 - u) * 0.6;
    if (y > bot && y < top && az < 1.6) {
      if (x > -17 && x < -9 && y > 11.2 && y < 13.6) return null;
      return P('stock', x < -19.6 ? C.dark : C.white);
    }
  }
  // Gehäuse
  if (x > -6 && x < 15 && y > 10.2 && y < 16.8 && az < 2.6) {
    if (az > 2 && y > 12.8 && y < 13.6 && x > -5 && x < 13) return P('body', C.cyan);
    if (y < 11.4 || (x > 11 && y > 15.4)) return P('body', C.dark);
    if (x > 2 && x < 9 && az > 2 && y > 14) return P('body', C.orange);
    return P('body', C.white);
  }
  // Lauf + Emitter
  if (x >= 15 && x < 31) {
    const r = Math.hypot(y - 13.4, z);
    if (x > 27 && r < 2.2) return P('barrel', x > 30 ? (r < 1 ? C.cyan : C.orange) : C.orange);
    if (r < 1.3) return P('barrel', (Math.round(x) % 4 === 0) ? C.mid : C.dark);
    if (x < 23 && y > 13.4 && y < 15.6 && az < 1.6) return P('barrel', C.white);
  }
  // Visier oben
  if (x > 0 && x < 11 && y >= 16.8 && y < 19.6 && az < 1.4) return P('sight', x > 10 ? C.cyan : C.dark);
  if (x > 2 && x < 9 && y >= 16.8 && y < 17.6 && az < 1.8) return P('sight', C.dark);
  return null;
}

// ---------- Voxelisieren + Steine ----------
const S = 1.8, vox = new Map(), key = (i, j, k) => `${i},${j},${k}`;
for (let j = 0; j < 30; j++) for (let i = -39; i <= 58; i++) for (let k = -6; k <= 6; k++) {
  PART = null; const c = shape(i / S, (j + .5) * BH / S, k / S); if (c !== null) vox.set(key(i, j, k), c + '|' + PART);
}
const surf = new Map();
for (const [kk, c] of vox) { const [i, j, k] = kk.split(',').map(Number);
  if ([[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]].some(([a, b, d]) => !vox.has(key(i + a, j + b, k + d)))) surf.set(kk, c); }
const bricks = [], used = new Set();
const sorted = [...surf.keys()].map(s => s.split(',').map(Number)).sort((a, b) => a[1] - b[1] || a[2] - b[2] || a[0] - b[0]);
for (const [i, j, k] of sorted) {
  if (used.has(key(i, j, k))) continue;
  const c = surf.get(key(i, j, k)); let L = 1;
  while (L < 4 && surf.get(key(i + L, j, k)) === c && !used.has(key(i + L, j, k))) L++;
  for (let a = 0; a < L; a++) used.add(key(i + a, j, k));
  const [cc, part] = c.split('|'); bricks.push({ x: i + (L - 1) / 2, y: j * BH, z: k, L, c: +cc, part });
}
const ORDER = ['stand', 'grip', 'stock', 'body', 'barrel', 'sight'];
bricks.sort((a, b) => ORDER.indexOf(a.part) - ORDER.indexOf(b.part) || a.y - b.y || (a.x + a.z) - (b.x + b.z));
window.PARTS = { N: bricks.length, order: ORDER, counts: Object.fromEntries(ORDER.map(p => [p, bricks.filter(b => b.part === p).length])) };

// ---------- Szene: dunkles Studio ----------
const stud = new THREE.CylinderGeometry(.3, .3, .2, 16);
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
scene.background = new THREE.Color(0x0d1018); scene.fog = new THREE.Fog(0x0d1018, 150, 300);
const key1 = new THREE.DirectionalLight(0xffffff, 2.2); key1.position.set(40, 90, 60); key1.castShadow = true;
key1.shadow.mapSize.set(2048, 2048); Object.assign(key1.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70 }); scene.add(key1);
const rimC = new THREE.DirectionalLight(0x00e5ff, 1.6); rimC.position.set(-40, 20, -30); scene.add(rimC);
const rimO = new THREE.DirectionalLight(0xff7a1a, 1.0); rimO.position.set(50, 10, -40); scene.add(rimO);
const m4 = new THREE.Matrix4();
const pm = new THREE.MeshStandardMaterial({ color: 0x3a3f4b, roughness: .5 });
const base = new THREE.Mesh(new THREE.BoxGeometry(110, .4, 44), pm); base.position.set(9, -.2, 0); base.receiveShadow = true; scene.add(base);
const studs = new THREE.InstancedMesh(stud, pm, 110 * 44); let si = 0;
for (let a = 0; a < 110; a++) for (let b = 0; b < 44; b++) studs.setMatrixAt(si++, m4.makeTranslation(a - 54.5 + 9, .1, b - 21.5));
studs.receiveShadow = true; scene.add(studs);
const mat = new THREE.MeshStandardMaterial({ roughness: .25, metalness: 0 });
const meshes = {};
for (let L = 1; L <= 4; L++) {
  meshes[L] = new THREE.InstancedMesh(brickGeo(L), mat, Math.max(1, bricks.filter(b => b.L === L && b.c !== C.cyan).length));
  meshes[L].castShadow = meshes[L].receiveShadow = true; meshes[L].userData.n = 0; scene.add(meshes[L]);
}
// Leuchtende Steine separat (Emission für das Aufladen)
const glowMat = new THREE.MeshStandardMaterial({ color: C.cyan, emissive: C.cyan, emissiveIntensity: .15, roughness: .3 });
const glowB = bricks.filter(b => b.c === C.cyan);
const glowMeshes = {};
for (let L = 1; L <= 4; L++) { glowMeshes[L] = new THREE.InstancedMesh(brickGeo(L), glowMat, Math.max(1, glowB.filter(b => b.L === L).length)); glowMeshes[L].userData.n = 0; scene.add(glowMeshes[L]); }
const col = new THREE.Color();
bricks.forEach(b => {
  if (b.c === C.cyan) { b.mesh = glowMeshes[b.L]; b.idx = b.mesh.userData.n++; return; }
  b.mesh = meshes[b.L]; b.idx = b.mesh.userData.n++; b.mesh.setColorAt(b.idx, col.set(b.c));
});
const glowLight = new THREE.PointLight(0x00e5ff, 0, 60); glowLight.position.set(14, 25, 0); scene.add(glowLight);
const muzzle = new THREE.Sprite(new THREE.SpriteMaterial({ map: (() => { const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(220,255,255,1)'); gr.addColorStop(.3, 'rgba(0,229,255,.8)'); gr.addColorStop(1, 'rgba(0,229,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
muzzle.position.set(57.5, 24.2, 0); muzzle.scale.setScalar(14); scene.add(muzzle);
const camera = new THREE.PerspectiveCamera(42, W / H, .1, 1000);
const $ = id => document.getElementById(id);

// Standbild: { p, cam:[x,y,z,tx,ty,tz], charge 0..1, label, cap, bar }
window.shot = (s) => {
  const N = bricks.length, placed = s.p * N, q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  bricks.forEach((b, n) => {
    const f = clamp(placed - n + 1, 0, 1), k = easeOut(f);
    pos.set(b.x, b.y + 16 * (1 - k), b.z); q.setFromEuler(e.set(0, (1 - k) * 1.2, 0)); sc.setScalar(f > 0 ? 1 : 0);
    b.mesh.setMatrixAt(b.idx, m4.compose(pos, q, sc));
  });
  for (const L in meshes) { meshes[L].instanceMatrix.needsUpdate = true; meshes[L].instanceColor.needsUpdate = true; glowMeshes[L].instanceMatrix.needsUpdate = true; }
  const ch = s.charge || 0;
  glowMat.emissiveIntensity = .15 + 3.5 * ch; glowLight.intensity = 1500 * ch; muzzle.material.opacity = ch; muzzle.scale.setScalar(6 + 16 * ch);
  key1.intensity = 2.2 * (1 - .5 * ch);
  const [cx, cy, cz, tx, ty, tz] = s.cam; camera.position.set(cx, cy, cz); camera.lookAt(tx, ty, tz); camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  $('label').textContent = s.label; $('cap').innerHTML = s.cap;
  $('bar').style.opacity = s.bar === false ? 0 : 1; $('bar').firstChild.style.width = (s.p * 100) + '%';
};
// ================= Video-Modus (Timeline) =================
const tlUrl = new URLSearchParams(location.search).get('tl');
const TL = tlUrl ? await (await fetch(tlUrl)).json() : null;
if (TL) {
  const K = TL.keyframes;
  bricks.forEach((b, i) => {
    const target = i + 1; let t = K[K.length - 1][0];
    for (let k = 1; k < K.length; k++) if (K[k][1] >= target) { const [t0, n0] = K[k - 1], [t1, n1] = K[k]; t = n1 === n0 ? t1 : t0 + (t1 - t0) * (target - n0) / (n1 - n0); break; }
    b.land = t;
  });
}
const CAM = {
  hook:   [[70, 34, 96], [64, 30, 90], [9, 6, 0], [9, 6, 0]],
  stand:  [[52, 22, 62], [42, 20, 68], [9, 5, 0], [9, 6, 0]],
  grip:   [[62, 30, 80], [44, 36, 92], [9, 12, 0], [9, 15, 0]],
  stock:  [[-64, 50, 92], [-36, 58, 104], [-12, 18, 0], [-8, 19, 0]],
  body:   [[118, 84, 104], [100, 80, 112], [8, 20, 0], [8, 21, 0]],
  barrel: [[124, 50, 70], [112, 46, 88], [30, 22, 0], [28, 22, 0]],
  sight:  [[60, 96, 70], [76, 90, 78], [12, 28, 0], [12, 27, 0]],
  done:   [[160, 54, 104], [168, 48, 100], [17, 19, 0], [17, 19, 0]],
  charge: [[156, 40, 62], [134, 34, 50], [26, 22, 0], [28, 23, 0]],
  outro:  [[150, 60, 110], [172, 70, 124], [13, 18, 0], [13, 18, 0]],
};
const chunks = [];
if (TL) for (const s of TL.segments) {
  let cur = [];
  s.words.forEach((w, i) => { cur.push(w);
    if (/[.,!?]$/.test(w.w) || cur.length === 3 || (cur.length === 2 && w.w.length > 9) || i === s.words.length - 1) { chunks.push(cur); cur = []; } });
}
function setCaption(t) {
  const c = chunks.find((c, i) => t >= c[0].s && t < (chunks[i + 1] && chunks[i + 1][0].s - c[c.length - 1].e < .3 ? chunks[i + 1][0].s : c[c.length - 1].e + .25));
  const cap = $('cap'); if (!c) { cap.innerHTML = ''; return; }
  cap.style.transform = `scale(${0.75 + 0.25 * easeOut((t - c[0].s) / 0.12)})`;
  cap.innerHTML = c.map(w => `<span style="${t >= w.s && t < w.e + .05 ? 'color:#ffe02e' : ''}">${(w.show || w.w).replace(/[.,]$/, '')}</span>`).join(' ');
}
const fmt = n => n.toLocaleString('de-DE'), BUILD = ['hook', 'stand', 'grip', 'stock', 'body', 'barrel', 'sight', 'done'];
function chargeAt(t) {
  if (!TL || t < TL.chargeT) return 0;
  const P = [[TL.chargeT, 0], [TL.c10, .1], [TL.c50, .5], [TL.c100, 1]];
  for (let k = 1; k < P.length; k++) if (t < P[k][0]) { const [a, va] = P[k - 1], [b, vb] = P[k]; return lerp(va, vb, ease((t - a) / (b - a))); }
  return 1;
}
window.renderAt = (t) => {
  const SEG = TL.segments, i = SEG.findIndex((s, j) => t < (SEG[j + 1] ? SEG[j + 1].start : Infinity));
  const s = SEG[i], st = i === 0 ? 0 : s.start, en = SEG[i + 1] ? SEG[i + 1].start : TL.duration, lt = t - st, ld = en - st;
  const q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  const ch = chargeAt(t), full = t >= TL.c100, pulse = full ? .85 + .15 * Math.sin(t * 9) : 1;
  const shake = full && t - TL.c100 < .8 ? Math.sin(t * 70) * .25 * (1 - (t - TL.c100) / .8) : 0;
  bricks.forEach(b => {
    const f = clamp(1 - (b.land - t) / 0.4), k = easeOut(f);
    pos.set(b.x, b.y + 16 * (1 - k) + (b.part !== 'stand' ? shake : 0), b.z); q.setFromEuler(e.set(0, (1 - k) * 1.2, 0)); sc.setScalar(f > 0 ? 1 : 0);
    b.mesh.setMatrixAt(b.idx, m4.compose(pos, q, sc));
  });
  for (const L in meshes) { meshes[L].instanceMatrix.needsUpdate = true; meshes[L].instanceColor.needsUpdate = true; glowMeshes[L].instanceMatrix.needsUpdate = true; }
  glowMat.emissiveIntensity = .15 + 3.5 * ch * pulse; glowLight.intensity = 1500 * ch * pulse;
  muzzle.material.opacity = Math.min(1, ch * 1.2); muzzle.scale.setScalar((6 + 16 * ch) * pulse + (full ? Math.max(0, 1 - (t - TL.c100) / .5) * 20 : 0));
  key1.intensity = 2.2 * (1 - .5 * ch);
  const [c0, c1, t0, t1] = CAM[s.scene], k = ease(lt / ld);
  camera.position.set(...c0.map((v, j) => lerp(v, c1[j], k)));
  if (shake) { camera.position.x += Math.sin(t * 57) * .8; camera.position.y += Math.cos(t * 43) * .8; }
  const tg = t0.map((v, j) => lerp(v, t1[j], k)); camera.lookAt(tg[0], tg[1], tg[2]); camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  const cutK = i === 0 ? 1 : clamp(lt / 0.3);
  canvas.style.transform = `scale(${1 + 0.07 * (1 - easeOut(cutK))})`;
  $('flash').style.background = full ? '#bff8ff' : '#fff';
  $('flash').style.opacity = Math.max(i === 0 ? 0 : (1 - clamp(lt / 0.12)) * 0.35, full ? Math.max(0, 1 - (t - TL.c100) / .35) * .7 : 0);
  const placed = bricks.reduce((a, b) => a + (b.land <= t ? 1 : 0), 0), building = BUILD.includes(s.scene);
  $('label').textContent = building ? `STEIN ${fmt(placed)} / ${fmt(bricks.length)}` : s.scene === 'charge' ? `ENERGIE ${Math.round(ch * 100)}%` : 'TEIL 2?';
  $('label').style.background = building ? '#e8222c' : '#00a8c0';
  $('bar').style.opacity = building || s.scene === 'charge' ? 1 : 0;
  $('bar').firstChild.style.width = (s.scene === 'charge' ? ch * 100 : placed / bricks.length * 100) + '%';
  $('bar').firstChild.style.background = s.scene === 'charge' ? 'linear-gradient(90deg,#00e5ff,#bff8ff)' : '';
  setCaption(t);
};
await document.fonts.load('900 50px M');
window.READY = true;
