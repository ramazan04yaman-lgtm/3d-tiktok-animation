// Klemmbaustein-Cabrio im Miami-Look: Voxel-Modell -> Steine -> Bau nach Bauteilen.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const W = 1080, H = 1920, BH = 1.2;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
const lerp = (a, b, k) => a + (b - a) * k;

const C = { white: 0xf6f6f6, belly: 0xcfd4dc, gold: 0xd4a017, glass: 0x1b2b3c, dark: 0x22252c, tire: 0x141414, intake: 0x3a3d44 };

// ---------- Form: eigener Privatjet (x = Länge, Nase bei +x; y = Höhe; z = Spannweite) ----------
let PART = null;
const P = (part, c) => { PART = part; return c; };
function fuse(x) { // Rumpf: [Mittelpunkt-Höhe, Radius]
  if (x > 12) return [5.5, 2.6 * Math.sqrt(Math.max(0, 1 - ((x - 12) / 8.4) ** 2))];
  if (x >= -14) return [5.5, 2.6];
  const u = (-14 - x) / 6; return [5.5 + u * 1.6, 2.6 * (1 - u * .75)];
}
function shape(x, y, z) {
  const az = Math.abs(z);
  // Fahrwerk
  if (az < .7 && Math.abs(x - 14) < .7 && y < 3.4) return P('gear', y < 1.5 ? C.tire : C.dark);
  if (Math.abs(az - 3.4) < .8 && Math.abs(x + 1) < 1.2 && y < 3.6) return P('gear', y < 1.6 ? C.tire : C.dark);
  // Rumpf
  if (x > -20 && x < 20.4) {
    const [cy, r] = fuse(x), d = Math.hypot(y - cy, z);
    if (d < r) {
      if (x > 12.5 && x < 15.5 && y > cy + .4 && az < 2.2) return P('fuselage', C.glass);           // Cockpit
      if (az > 1.6 && Math.abs(y - (cy + .7)) < .6 && x > -9 && x < 9 && Math.round(x) % 3 === 0) return P('fuselage', C.glass); // Fenster
      if (az > 1.4 && y > cy - .7 && y < cy - .1 && x > -14 && x < 15) return P('fuselage', C.gold); // Zierstreifen
      return P('fuselage', y < cy - 1.3 ? C.belly : C.white);
    }
  }
  // Flügel (gepfeilt) + Winglets
  if (az > 2 && az < 14.2) {
    const lead = 3 - (az - 2.6) * .55, chord = 6.2 - (az - 2.6) * .28;
    if (x <= lead && x >= lead - chord) {
      if (y > 3.6 && y < 4.8) return P('wings', az > 13.4 ? C.gold : C.white);
      if (az > 13.4 && y >= 4.8 && y < 7.6 && x > lead - 2) return P('wings', C.gold);
    }
  }
  // Triebwerke hinten am Rumpf
  for (const s of [1, -1]) {
    const ex = x, d = Math.hypot(y - 7.2, z - s * 4.2);
    if (ex > -13 && ex < -6.5 && d < 1.4) return P('engines', ex > -7.3 && d < 1 ? C.intake : (ex < -12.4 ? C.dark : C.white));
    if (ex > -11.5 && ex < -8.5 && Math.abs(y - 7) < .6 && az > 1.8 && az < 3) return P('engines', C.white);
  }
  // Seitenleitwerk + T-Höhenleitwerk
  if (az < .7 && y >= 7 && y < 14) {
    const lead = -14.5 - (y - 7) * .55, trail = -19.5 - (y - 7) * .1;
    if (x <= lead && x >= trail) return P('tail', y > 12.8 ? C.gold : C.white);
  }
  if (y >= 13.4 && y < 14.6 && az < 6 && x <= -17.8 + 0 - az * .2 + 1.2 && x >= -21 - az * .2) return P('tail', C.white);
  return null;
}

// ---------- Voxelisieren + Steine ----------
const vox = new Map(), key = (i, j, k) => `${i},${j},${k}`;
const S = 2.1;
for (let j = 0; j < 28; j++) for (let i = -46; i <= 44; i++) for (let k = -31; k <= 31; k++) {
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
const ORDER = ['gear', 'fuselage', 'wings', 'engines', 'tail'];
bricks.sort((a, b) => ORDER.indexOf(a.part) - ORDER.indexOf(b.part) || a.y - b.y || (a.x + a.z) - (b.x + b.z));
window.PARTS = { N: bricks.length, order: ORDER, counts: Object.fromEntries(ORDER.map(p => [p, bricks.filter(b => b.part === p).length])) };

// ---------- Szene ----------
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
scene.environmentIntensity = .6;
// Sonnenuntergangs-Himmel
const skyU = { night: { value: 0 } };
scene.add(new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
  vertexShader: `varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform float night; varying vec3 vp; void main(){
    float h = clamp(vp.y, -.1, 1.);
    vec3 hor = vec3(1., .62, .28), mid = vec3(1., .33, .55), top = vec3(.22, .12, .45);
    vec3 c = h < .12 ? mix(hor, mid, h/.12) : mix(mid, top, clamp((h-.12)/.5, 0., 1.));
    vec3 n = mix(vec3(.25,.08,.35), vec3(.02,.02,.08), clamp(h*2., 0., 1.));
    gl_FragColor = vec4(mix(c, n, night), 1.); }` })));
const sun = new THREE.Mesh(new THREE.CircleGeometry(28, 48), new THREE.MeshBasicMaterial({ color: 0xffe07a, fog: false }));
sun.position.set(-120, 12, -330); sun.lookAt(0, 12, 0); scene.add(sun);
const key1 = new THREE.DirectionalLight(0xffb070, 2.6); key1.position.set(-40, 30, -60); key1.castShadow = true;
key1.shadow.mapSize.set(2048, 2048); Object.assign(key1.shadow.camera, { left: -50, right: 50, top: 50, bottom: -50 }); scene.add(key1);
const fill = new THREE.HemisphereLight(0xff8ac8, 0x3a2050, 1.1); scene.add(fill);
const front = new THREE.DirectionalLight(0xffd0e8, 1.2); front.position.set(40, 30, 50); scene.add(front);
// Boden: Straße (Bauplatte), Sand, Meer
const m4 = new THREE.Matrix4();
function plate(w, d, x, z, color) {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color, roughness: .6 });
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, .4, d), m); b.position.y = -.2; b.receiveShadow = true; g.add(b);
  const s = new THREE.InstancedMesh(stud, m, w * d); let n = 0;
  for (let a = 0; a < w; a++) for (let c = 0; c < d; c++) s.setMatrixAt(n++, m4.makeTranslation(a - w / 2 + .5, .1, c - d / 2 + .5));
  s.receiveShadow = true; g.add(s); g.position.set(x, 0, z); scene.add(g); return g;
}
plate(90, 38, 0, 1, 0x3b3f4a);
plate(90, 16, 0, -26, 0xe8c98f);
plate(90, 10, 0, 25, 0xbfc3cc);
// Mittellinie
const dash = new THREE.InstancedMesh(new THREE.BoxGeometry(3.9, .3, .9), new THREE.MeshStandardMaterial({ color: 0xfff3b0 }), 10);
for (let n = 0; n < 10; n++) dash.setMatrixAt(n, m4.makeTranslation(-40 + n * 9, .15, 16.5)); scene.add(dash);
const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 400), new THREE.MeshStandardMaterial({ color: 0x1590b5, roughness: .3, metalness: .1 }));
sea.rotation.x = -Math.PI / 2; sea.position.set(0, -.5, -234); scene.add(sea);
const land = new THREE.Mesh(new THREE.PlaneGeometry(1000, 534), new THREE.MeshStandardMaterial({ color: 0x8e939e, roughness: .9 }));
land.rotation.x = -Math.PI / 2; land.position.set(0, -.42, 233); land.receiveShadow = true; scene.add(land);
// Palmen (statisch, aus 1x1-Steinen)
const palmBricks = [];
function palm(px, pz, h, lean) {
  for (let j = 0; j < h; j++) { const u = j / h; palmBricks.push([Math.round(px + lean * u * u * 5), j * BH, pz, j % 2 ? 0x8d5a2b : 0x6e4420]); }
  const tx = Math.round(px + lean * 5), ty = h * BH;
  for (let f = 0; f < 7; f++) { const a = f / 7 * Math.PI * 2 + .3;
    for (let s = 1; s < 10; s++) palmBricks.push([Math.round(tx + Math.cos(a) * s), ty + Math.round((-.06 * s * s + .4 * s)) * BH, Math.round(pz + Math.sin(a) * s), s % 2 ? 0x2e9d3a : 0x56c271]); }
  palmBricks.push([tx, ty - BH, pz + 1, 0x5a3a1a], [tx + 1, ty - BH, pz, 0x5a3a1a]);
}
palm(-30, -25, 24, 1); palm(-16, -29, 18, -1); palm(26, -24, 26, -1); palm(38, -30, 17, 1);
const pm = new THREE.InstancedMesh(brickGeo(1), new THREE.MeshStandardMaterial({ roughness: .4 }), palmBricks.length);
palmBricks.forEach(([x, y, z, c], n) => { pm.setMatrixAt(n, m4.makeTranslation(x, y, z)); pm.setColorAt(n, new THREE.Color(c)); });
pm.castShadow = true; scene.add(pm);
scene.fog = new THREE.Fog(0xff8a9a, 120, 380);
// Auto-Steine
const mat = new THREE.MeshStandardMaterial({ roughness: .22, metalness: 0 });
const meshes = {};
for (let L = 1; L <= 4; L++) {
  meshes[L] = new THREE.InstancedMesh(brickGeo(L), mat, Math.max(1, bricks.filter(b => b.L === L).length));
  meshes[L].castShadow = meshes[L].receiveShadow = true; meshes[L].userData.n = 0; scene.add(meshes[L]);
}
const col = new THREE.Color();
bricks.forEach(b => { b.mesh = meshes[b.L]; b.idx = b.mesh.userData.n++; b.mesh.setColorAt(b.idx, col.set(b.c)); });
// Finale: Neon-Unterboden + Scheinwerfer
const neon = new THREE.Mesh(new THREE.PlaneGeometry(50, 24), new THREE.MeshBasicMaterial({ color: 0x00ffe1, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
neon.rotation.x = -Math.PI / 2; neon.position.y = .35; scene.add(neon);
const neonLight = new THREE.PointLight(0x00ffe1, 0, 60); neonLight.position.set(0, 1.2, 0); scene.add(neonLight);
const beams = [];
for (const s of [1, -1]) {
  const cone = new THREE.Mesh(new THREE.ConeGeometry(8, 55, 24, 1, true).translate(0, -27.5, 0).rotateZ(Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xfff1c0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  cone.position.set(25, 7, s * 7.2); scene.add(cone); beams.push(cone);
}
const headLight = new THREE.SpotLight(0xfff1c0, 0, 80, .5, .6); headLight.position.set(26, 7, 0); headLight.target.position.set(70, 0, 0); scene.add(headLight, headLight.target);
const camera = new THREE.PerspectiveCamera(42, W / H, .1, 1000);
const $ = id => document.getElementById(id);

// Standbild: { p, cam:[x,y,z,tx,ty,tz], night, neon, drive, label, cap, bar }
window.shot = (s) => {
  const N = bricks.length, placed = s.p * N, q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  const dx = s.drive || 0;
  bricks.forEach((b, n) => {
    const f = clamp(placed - n + 1, 0, 1), k = easeOut(f);
    pos.set(b.x + dx, b.y + 16 * (1 - k), b.z); q.setFromEuler(e.set(0, (1 - k) * 1.2, 0)); sc.setScalar(f > 0 ? 1 : 0);
    b.mesh.setMatrixAt(b.idx, m4.compose(pos, q, sc));
  });
  for (const L in meshes) { meshes[L].instanceMatrix.needsUpdate = true; meshes[L].instanceColor.needsUpdate = true; }
  const night = s.night || 0, nn = s.neon || 0;
  skyU.night.value = night; sun.visible = night < .5;
  key1.intensity = 2.6 * (1 - night * .85); fill.intensity = 1.1 * (1 - night * .6); front.intensity = 1.2 * (1 - night * .7);
  scene.fog.color.set(night > .5 ? 0x1a0a2a : 0xff8a9a);
  neon.material.opacity = .55 * nn; neon.position.x = dx; neonLight.intensity = 2500 * nn; neonLight.position.x = dx;
  beams.forEach(b => { b.material.opacity = .05 * nn; b.position.x = 25 + dx; }); headLight.intensity = 900 * nn; headLight.position.x = 26 + dx;
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
const WR = 3 * 1.6, WY = 3 * 1.6 + 0, WX = 10 * 1.6; // Radradius/-mitte
bricks.forEach(b => { if (b.part === 'wheels') b.wc = [b.x > 0 ? WX : -WX, WY]; });
// Qualm + Bremsspuren
const SMN = 160, smoke = new THREE.InstancedMesh(brickGeo(1), new THREE.MeshStandardMaterial({ color: 0xe6e0ea, transparent: true, opacity: .75, roughness: 1 }), SMN);
scene.add(smoke);
const skidM = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, transparent: true, opacity: 0, roughness: 1 });
const skids = [1, -1].map(sg => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, .12, 2.6), skidM); m.position.set(0, .26, sg * 11.2); scene.add(m); return m; });
const CAM = {
  hook:     [[60, 16, 74], [72, 22, 86], [2, 3, 0], [2, 5, 0]],
  wheels:   [[72, 22, 86], [40, 20, 92], [0, 4, 0], [0, 4, 0]],
  chassis:  [[86, 30, 50], [70, 40, 70], [0, 4, 0], [0, 4, 0]],
  body:     [[90, 38, 68], [30, 34, 96], [2, 6, 0], [2, 6, 0]],
  interior: [[-30, 80, 62], [-10, 82, 50], [-2, 5, 0], [-2, 5, 0]],
  details:  [[80, 26, -60], [96, 22, 24], [2, 6, 0], [2, 6, 0]],
  done:     [[90, 24, 84], [70, 18, 90], [2, 7, 0], [2, 7, 0]],
  night:    [[70, 18, 90], [62, 12, 70], [2, 6, 0], [2, 6, 0]],
  neon:     [[92, 14, 96], [98, 12, 88], [4, 5, 0], [10, 5, 0]],
  outro:    [[30, 40, 92], [20, 52, 104], [18, 2, 0], [18, 2, 0]],
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
  cap.innerHTML = c.map(w => `<span style="${t >= w.s && t < w.e + .05 ? 'color:#ffe02e' : ''}">${w.w.replace(/[.,]$/, '')}</span>`).join(' ');
}
const fmt = n => n.toLocaleString('de-DE'), BUILD = ['hook', 'wheels', 'chassis', 'body', 'interior', 'details', 'done'];
window.renderAt = (t) => {
  const SEG = TL.segments, i = SEG.findIndex((s, j) => t < (SEG[j + 1] ? SEG[j + 1].start : Infinity));
  const s = SEG[i], st = i === 0 ? 0 : s.start, en = SEG[i + 1] ? SEG[i + 1].start : TL.duration, lt = t - st, ld = en - st;
  const q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  // Fahren: 0,7 s Burnout auf der Stelle, dann Beschleunigung
  const td = t - TL.driveT, burn = td > 0 ? 1 : 0, mv = Math.max(0, td - .7), dx = 26 * mv * mv;
  const spin = td > 0 ? (td < .7 ? td * 30 : .7 * 30 + dx / WR + mv * 20) : 0;
  const shake = td > 0 && td < .9 ? Math.sin(t * 70) * .15 : 0;
  bricks.forEach(b => {
    const f = clamp(1 - (b.land - t) / 0.4), k = easeOut(f);
    let x = b.x, y = b.y, rot = (1 - k) * 1.2, rz = 0;
    if (b.wc && spin) { const ox = b.x - b.wc[0], oy = b.y + BH / 2 - b.wc[1], c = Math.cos(-spin), si = Math.sin(-spin);
      x = b.wc[0] + ox * c - oy * si; y = b.wc[1] + ox * si + oy * c - BH / 2; rz = -spin; }
    else if (!b.wc) y += shake;
    pos.set(x + dx, y + 16 * (1 - k), b.z); q.setFromEuler(e.set(0, rot, rz)); sc.setScalar(f > 0 ? 1 : 0);
    b.mesh.setMatrixAt(b.idx, m4.compose(pos, q, sc));
  });
  for (const L in meshes) { meshes[L].instanceMatrix.needsUpdate = true; meshes[L].instanceColor.needsUpdate = true; }
  // Qualm
  for (let n = 0; n < SMN; n++) {
    const born = (n / SMN) * 1.4, age = td - born, side = n % 2 ? 1 : -1;
    const vis = age > 0 && age < 2.2;
    const a = n * 2.4;
    pos.set(-WX - 2 - age * 6 + Math.cos(a) * age * 3 + (born > .7 ? 26 * (born - .7) ** 2 : 0), .6 + age * 3.2 + Math.sin(a) * age, side * (11 + Math.sin(a * 1.7) * age * 3));
    q.setFromEuler(e.set(a, a * .5, age)); smoke.setMatrixAt(n, m4.compose(pos, q, sc.setScalar(vis ? 1 + age * 2.2 : 0)));
  }
  smoke.instanceMatrix.needsUpdate = true; smoke.material.opacity = .7;
  skids.forEach(m => { const L = Math.max(.01, Math.min(dx + 3, 70)); m.scale.x = L; m.position.x = -WX + L / 2; });
  skidM.opacity = td > 0 ? .75 : 0;
  // Nacht / Neon
  const night = TL.nightT && t > TL.nightT ? ease((t - TL.nightT) / 1.6) : 0;
  const nOn = t > TL.neonT ? clamp((t - TL.neonT) / .25) * (t - TL.neonT < .5 ? (Math.sin(t * 80) > -.2 ? 1 : .2) : 1) : 0;
  skyU.night.value = night; sun.visible = night < .5;
  key1.intensity = 2.6 * (1 - night * .85); fill.intensity = 1.1 * (1 - night * .6); front.intensity = 1.2 * (1 - night * .7);
  scene.fog.color.set(night > .5 ? 0x1a0a2a : 0xff8a9a);
  neon.material.opacity = .55 * nOn; neon.position.x = dx; neonLight.intensity = 2500 * nOn; neonLight.position.x = dx;
  beams.forEach(b => { b.material.opacity = .05 * nOn; b.position.x = 25 + dx; }); headLight.intensity = 900 * nOn; headLight.position.x = 26 + dx; headLight.target.position.x = 70 + dx;
  // Kamera
  const [c0, c1, t0, t1] = CAM[s.scene], k = ease(lt / ld);
  camera.position.set(...c0.map((v, j) => lerp(v, c1[j], k)));
  if (td > 0 && td < 1.2) { camera.position.x += Math.sin(t * 57) * .4; camera.position.y += Math.cos(t * 43) * .4; }
  const tg = t0.map((v, j) => lerp(v, t1[j], k)); camera.lookAt(tg[0], tg[1], tg[2]); camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  const cutK = i === 0 ? 1 : clamp(lt / 0.3);
  canvas.style.transform = `scale(${1 + 0.07 * (1 - easeOut(cutK))})`;
  $('flash').style.opacity = i === 0 ? 0 : (1 - clamp(lt / 0.12)) * 0.35;
  const placed = bricks.reduce((a, b) => a + (b.land <= t ? 1 : 0), 0), building = BUILD.includes(s.scene);
  $('label').textContent = building ? `STEIN ${fmt(placed)} / ${fmt(bricks.length)}` : s.scene === 'night' ? 'WARTE…' : s.scene === 'neon' ? 'NACHTS IN MIAMI' : 'TEIL 2?';
  $('label').style.background = building ? '#e8222c' : '#ff2d95';
  $('bar').style.opacity = building ? 1 : 0; $('bar').firstChild.style.width = (placed / bricks.length * 100) + '%';
  setCaption(t);
};
await document.fonts.load('900 50px M');
window.READY = true;
