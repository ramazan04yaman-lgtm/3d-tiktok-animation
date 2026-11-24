// Follower-Villa (eigenes Design, Miami Art déco). Gesetzte Steine massiv, fehlende als Glas-Vorschau.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const W = 1080, H = 1920, BH = 1.2;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);

const C = { white: 0xf5f5f2, stone: 0xe4ddd0, glass: 0x7fc8dc, frame: 0x22262e, wood: 0x8a5a33, water: 0x5fdde6,
  deck: 0xf0ede6, trunk: 0x8d5a2b, leaf: 0x2e9d3a, leaf2: 0x56c271, rail: 0xbfeaf5, dark: 0x3a3f4b };

// ---------- Form: moderne Villa (eigenes Design) ----------
let PART = null;
const P = (part, c) => { PART = part; return c; };
const segDist = (p, a, b) => { const ab = b.map((v, k) => v - a[k]), ap = p.map((v, k) => v - a[k]);
  const t = clamp((ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / (ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2));
  return Math.hypot(...p.map((v, k) => v - (a[k] + ab[k] * t))); };
const PALMS = [[-32, 12, 26, 1], [33, 14, 24, -1], [34, -8, 30, -1], [-33, -10, 22, 1]];
const glassFace = (u, y, y0, y1) => (Math.round(u) % 6 === 0 || y < y0 + BH * .5 || y > y1 - BH * .5) ? C.frame : C.glass;
function shape(x, y, z) {
  const p = [x, y, z];
  for (const [px, pz, h, lean] of PALMS) {
    const top = [px + lean * 3, h, pz];
    if (y < h && Math.hypot(x - (px + lean * 3 * (y / h) ** 2), z - pz) < 1) return P('palms', C.trunk);
    for (let f = 0; f < 6; f++) { const a = f / 6 * Math.PI * 2;
      if (segDist(p, top, [top[0] + Math.cos(a) * 8, h - 2.5, top[2] + Math.sin(a) * 8]) < .75) return P('palms', f % 2 ? C.leaf : C.leaf2); }
  }
  // Pool + Terrasse
  if (y < 1.2 && x >= -24 && x <= 26 && z >= 5 && z <= 24) {
    if (z >= 9 && z <= 22 && x >= -14 && x <= 24) return P('pool', (z > 9.5 && z < 21.5 && x > -13.5 && x < 23.5) ? C.water : C.deck);
    if (z < 9) return P('pool', C.deck);
  }
  // Erdgeschoss
  if (x >= -22 && x <= 22 && z >= -12 && z <= 4 && y < 8.4) {
    if (y < 1.2) return P('ground', C.stone);
    if (z > 3 && x > -17) return P('ground', glassFace(x, y, 1.2, 8.4));
    if (x > 21 && z > -10) return P('ground', glassFace(z, y, 1.2, 8.4));
    return P('ground', x < -17 && z > 3 ? C.stone : C.white);
  }
  // Decke EG mit Überstand
  if (x >= -24 && x <= 22 && z >= -12 && z <= 7 && y >= 8.4 && y < 9.6) return P('slab', z > 4 ? C.white : C.white);
  // Glasgeländer Balkon
  if (x >= -10 && x <= 22 && z > 6 && z <= 7 && y >= 9.6 && y < 10.8) return P('upper', C.rail);
  // Linker Turm (weißer Rahmen mit Glas)
  if (x >= -24 && x <= -11 && z >= -12 && z <= 3 && y >= 9.6 && y < 20.4) {
    if (z > 2 && x > -22.5 && x < -12.5 && y > 10.4 && y < 19.4) return P('tower', glassFace(x + 1, y, 10.4, 19.4));
    return P('tower', C.white);
  }
  // Obergeschoss
  if (x >= -10 && x <= 24 && z >= -12 && z <= 5 && y >= 9.6 && y < 16.8) {
    if (z > 4 && x > -9 && x < 23) return P('upper', glassFace(x, y, 9.6, 16.8));
    if (x > 23 && z > -10 && z < 4) return P('upper', glassFace(z, y, 9.6, 16.8));
    return P('upper', x > 9 && x < 13 ? C.stone : C.white);
  }
  // Dach mit Holz-Unterseite
  if (x >= -12 && x <= 26 && z >= -13 && z <= 8 && y >= 16.8 && y < 19.2) return P('roof', y < 18 && (z > 5 || x > 24) ? C.wood : C.white);
  return null;
}

// ---------- Voxelisieren + Steine ----------
const vox = new Map(), key = (i, j, k) => `${i},${j},${k}`;
for (let j = 0; j < 30; j++) for (let i = -42; i <= 42; i++) for (let k = -22; k <= 26; k++) {
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
const ORDER = ['ground', 'slab', 'tower', 'upper', 'roof', 'pool', 'palms'];
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
    vec3 hor = vec3(.82, .93, 1.), mid = vec3(.45, .72, 1.), top = vec3(.12, .4, .9);
    gl_FragColor = vec4(h < .12 ? mix(hor, mid, h/.12) : mix(mid, top, clamp((h-.12)/.5, 0., 1.)), 1.); }` })));
const key1 = new THREE.DirectionalLight(0xfff4e0, 2.8); key1.position.set(-40, 70, 60); key1.castShadow = true;
key1.shadow.mapSize.set(2048, 2048); Object.assign(key1.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60 }); scene.add(key1);
scene.add(new THREE.HemisphereLight(0xbfe0ff, 0x4a6a3a, 1.2));
const front = new THREE.DirectionalLight(0xffffff, .9); front.position.set(40, 30, 70); scene.add(front);
const m4 = new THREE.Matrix4();
{ const m = new THREE.MeshStandardMaterial({ color: 0x7fbf5a, roughness: .7 }), w = 90, d = 70;
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, .4, d), m); b.position.set(0, -.2, -3); b.receiveShadow = true; scene.add(b);
  const s = new THREE.InstancedMesh(stud, m, w * d); let n = 0;
  for (let a = 0; a < w; a++) for (let c = 0; c < d; c++) s.setMatrixAt(n++, m4.makeTranslation(a - w / 2 + .5, .1, c - d / 2 + .5 - 3));
  s.receiveShadow = true; scene.add(s); }
const land = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshStandardMaterial({ color: 0xd8c9a0, roughness: 1 }));
land.rotation.x = -Math.PI / 2; land.position.y = -.42; scene.add(land);
scene.fog = new THREE.Fog(0xcfe8ff, 180, 460);
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
// ================= Video-Modus (Timeline) =================
const ease = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const lerp = (a, b, k) => a + (b - a) * k;
const canvas = renderer.domElement; canvas.style.transformOrigin = '50% 45%';
const tlUrl = new URLSearchParams(location.search).get('tl');
const TL = tlUrl ? await (await fetch(tlUrl)).json() : null;
let PREVIEW = Infinity, TARGET = 0;
if (TL) {
  const K = TL.keyframes; TARGET = K[K.length - 1][1];
  bricks.forEach((b, i) => {
    const target = i + 1; b.land = Infinity;
    for (let k = 1; k < K.length; k++) if (K[k][1] >= target) { const [t0, n0] = K[k - 1], [t1, n1] = K[k]; b.land = n1 === n0 ? t1 : t0 + (t1 - t0) * (target - n0) / (n1 - n0); break; }
  });
  PREVIEW = TL.segments[TL.segments.length - 1].end + 0.5;
}
const CAM = {
  intro:   [[110, 70, 150], [80, 50, 124], [2, 8, 0], [2, 8, 0]],
  rules:   [[80, 50, 124], [34, 46, 122], [2, 8, 0], [2, 8, 0]],
  project: [[-64, 42, 112], [-24, 34, 114], [0, 8, 0], [0, 8, 0]],
  count:   [[78, 40, 108], [66, 34, 100], [2, 6, 2], [2, 6, 2]],
  status:  [[56, 28, 90], [70, 32, 98], [2, 6, 2], [2, 7, 2]],
  outro:   [[74, 40, 112], [96, 50, 128], [2, 9, 2], [2, 10, 2]],
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
window.renderAt = (t) => {
  const SEG = TL.segments, i = SEG.findIndex((s, j) => t < (SEG[j + 1] ? SEG[j + 1].start : Infinity));
  const s = SEG[i], st = i === 0 ? 0 : s.start, en = SEG[i + 1] ? SEG[i + 1].start : TL.duration, lt = t - st, ld = en - st;
  const zero = new THREE.Matrix4().makeScale(0, 0, 0), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(1, 1, 1), pos = new THREE.Vector3();
  const prev = t >= PREVIEW;
  let placed = 0;
  bricks.forEach(b => {
    const f = clamp(1 - (b.land - t) / 0.4);
    if (f > 0 && f >= 1) placed++;
    if (prev || f > 0) {
      const k = prev && !(f > 0) ? 1 : easeOut(f);
      pos.set(b.x, b.y + 14 * (1 - k), b.z); q.setFromEuler(e.set(0, 1 - k, 0));
      solid[b.L].setMatrixAt(b.idx, m4.compose(pos, q, sc)); ghost[b.L].setMatrixAt(b.idx, zero);
    } else { solid[b.L].setMatrixAt(b.idx, zero); ghost[b.L].setMatrixAt(b.idx, m4.makeTranslation(b.x, b.y, b.z)); }
  });
  for (const L in solid) { solid[L].instanceMatrix.needsUpdate = ghost[L].instanceMatrix.needsUpdate = true; solid[L].instanceColor.needsUpdate = ghost[L].instanceColor.needsUpdate = true; }
  const [c0, c1, t0, t1] = CAM[s.scene], k = ease(lt / ld);
  camera.position.set(...c0.map((v, j) => lerp(v, c1[j], k)));
  const tg = t0.map((v, j) => lerp(v, t1[j], k)); camera.lookAt(tg[0], tg[1], tg[2]); camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  const cutK = i === 0 ? 1 : clamp(lt / 0.3);
  canvas.style.transform = `scale(${1 + 0.07 * (1 - easeOut(cutK))})`;
  $('flash').style.opacity = Math.max(i === 0 ? 0 : (1 - clamp(lt / 0.12)) * 0.35, prev ? Math.max(0, 1 - (t - PREVIEW) / .4) * .8 : 0);
  let lab, bar = false;
  if (prev) lab = 'SO WIRD SIE FERTIG';
  else if (s.scene === 'intro') lab = 'FOLLOWER-STADT';
  else if (s.scene === 'rules') lab = t >= TL.rK ? '1 KOMMENTAR = 5 STEINE' : t >= TL.rL ? '1 LIKE = 1 STEIN' : t >= TL.rF ? '1 FOLLOWER = 10 STEINE' : 'DIE REGELN';
  else if (s.scene === 'project') lab = 'PROJEKT 1: VILLA';
  else { lab = `VILLA: ${fmt(placed)} / ${fmt(bricks.length)} STEINE`; bar = true; }
  $('label').textContent = lab;
  $('label').style.background = prev ? '#00a8c0' : '#e8222c';
  $('bar').style.opacity = bar ? 1 : 0; $('bar').firstChild.style.width = (placed / bricks.length * 100) + '%';
  if (prev) $('cap').innerHTML = `<span>NOCH</span> <span style="color:#ffe02e">${fmt(bricks.length - TARGET)}</span> <span>STEINE</span>`; else setCaption(t);
};
await document.fonts.load('900 50px M');
window.READY = true;
