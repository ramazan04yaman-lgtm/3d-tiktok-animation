// "Was wäre, wenn … du einen T-Rex baust" – komplett prozedurale 3D-Szene (Three.js)
import * as THREE from 'three';

const W = 1080, H = 1920;
const TL = await (await fetch('build/timeline.json')).json();
const S = TL.sentences;

// ---------- Helpers ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = k => { k = clamp(k); return k * k * (3 - 2 * k); };
const easeOut = k => 1 - Math.pow(1 - clamp(k), 3);
const back = k => { k = clamp(k); const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
function rng(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const norm = s => s.toLowerCase().replace(/[^a-zäöüß0-9]/g, '');
function WT(i, pre, n = 0) {
  let c = 0; for (const w of S[i].words) if (norm(w.w).startsWith(pre)) { if (c++ === n) return w.s; }
  console.warn('word not found', i, pre); return S[i].start;
}
const END = i => S[i].end;

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Number(new URLSearchParams(location.search).get('pr') || 0.6)); renderer.setSize(W, H);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, W / H, 0.05, 1200);

const hemi = new THREE.HemisphereLight(0xf0f4f7, 0x4a5a2c, 1.75); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2dc, 2.4);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 120 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; scene.add(sun, sun.target);
function sunAt(p) { sun.position.copy(p).add(V(-20, 34, 22)); sun.target.position.copy(p); }

// ---------- Texturen ----------
function canvasTex(w, h, draw, rep) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); } return t;
}
const grassTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#34491c'; g.fillRect(0, 0, w, h); const r = rng(3);
  for (let i = 0; i < 26000; i++) { const v = r(); g.strokeStyle = v < .3 ? '#26391a' : v < .6 ? '#4a6528' : v < .85 ? '#3c5420' : '#5d7a33'; g.lineWidth = 0.6 + r() * 1.2; const x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - .5) * 6, y - 4 - r() * 8); g.stroke(); }
  for (let i = 0; i < 25; i++) { g.fillStyle = 'rgba(70,60,35,0.18)'; g.beginPath(); g.ellipse(r() * w, r() * h, 10 + r() * 30, 6 + r() * 15, r() * 3, 0, 7); g.fill(); }
}, 90);
const [scaleTex, scaleColTex] = (() => {
  const S = 1024, cell = 64, G = S / cell; const r = rng(77); const pts = []; const grid = Array.from({ length: G * G }, () => []);
  const wrapD = d => d > S / 2 ? d - S : d < -S / 2 ? d + S : d;
  for (let k = 0; k < 80000 && pts.length < 2600; k++) {
    const x = r() * S, y = r() * S; const band = 0.5 + 0.5 * Math.sin(y / S * Math.PI * 4 + Math.sin(x / S * Math.PI * 2) * 1.5);
    const rad = 6 + band * 10 * r() + (r() < 0.06 ? 8 : 0); const gx = Math.floor(x / cell), gy = Math.floor(y / cell); let ok = true;
    for (let dx = -1; dx <= 1 && ok; dx++) for (let dy = -1; dy <= 1 && ok; dy++) for (const q of grid[((gy + dy + G) % G) * G + ((gx + dx + G) % G)]) {
      const ddx = wrapD(q[0] - x), ddy = wrapD(q[1] - y); if (ddx * ddx + ddy * ddy < Math.pow((q[2] + rad) * 0.85, 2)) { ok = false; break; } }
    if (!ok) continue; const q = [x, y, rad, r()]; pts.push(q); grid[gy * G + gx].push(q);
  }
  const hc = document.createElement('canvas'), cc = document.createElement('canvas'); hc.width = hc.height = cc.width = cc.height = S;
  const hi = hc.getContext('2d').createImageData(S, S), ci = cc.getContext('2d').createImageData(S, S); const H = hi.data, C = ci.data;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const gx = Math.floor(x / cell), gy = Math.floor(y / cell); let f1 = 1e9, f2 = 1e9, best = null, bd = 0;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const q of grid[((gy + dy + G) % G) * G + ((gx + dx + G) % G)]) {
      const ddx = wrapD(q[0] - x), ddy = wrapD(q[1] - y); const dist = Math.sqrt(ddx * ddx + ddy * ddy); const d = dist - q[2] * 0.6;
      if (d < f1) { f2 = f1; f1 = d; best = q; bd = dist; } else if (d < f2) f2 = d; }
    const groove = Math.min(1, (f2 - f1) / 3.2); const dome = Math.max(0, 1 - Math.pow(bd / (best[2] * 1.7), 2));
    const i = (y * S + x) * 4; const hv = 30 + 210 * groove * (0.5 + 0.5 * dome); H[i] = H[i + 1] = H[i + 2] = hv; H[i + 3] = 255;
    const L = (0.8 + 0.2 * best[3]) * (0.5 + 0.5 * groove) * (0.94 + 0.06 * dome) * 255; C[i] = L; C[i + 1] = L * 0.965; C[i + 2] = L * 0.92; C[i + 3] = 255;
  }
  hc.getContext('2d').putImageData(hi, 0, 0); cc.getContext('2d').putImageData(ci, 0, 0);
  const th = new THREE.CanvasTexture(hc), tc = new THREE.CanvasTexture(cc); tc.colorSpace = THREE.SRGBColorSpace;
  for (const t of [th, tc]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; } return [th, tc];
})();
const dotTex = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });

// ---------- Himmel / Landschaft ----------
const skyU = { top: { value: new THREE.Color(0xaebdcb) }, hor: { value: new THREE.Color(0xe9ecee) } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
  vertexShader: 'varying vec3 p; void main(){p=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: 'uniform vec3 top,hor; varying vec3 p; void main(){float h=clamp(normalize(p).y*2.0,0.,1.); gl_FragColor=vec4(mix(hor,top,pow(h,0.6)),1.);}'
})); scene.add(sky);
scene.fog = new THREE.Fog(0xdde3e6, 40, 320);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), new THREE.MeshStandardMaterial({ color: 0xffffff, map: grassTex, roughness: 0.95 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const world = new THREE.Group(); scene.add(world);
{
  const r = rng(42);
  // Grashalme (instanziert) um den Drehort
  const blade = new THREE.BufferGeometry(); blade.setAttribute('position', new THREE.Float32BufferAttribute([-0.03, 0, 0, 0.03, 0, 0, 0.0, 0.26, 0.02], 3)); blade.computeVertexNormals();
  const bm = new THREE.MeshStandardMaterial({ color: 0x4b6a26, side: THREE.DoubleSide, roughness: 0.85 });
  const N = 42000; const im = new THREE.InstancedMesh(blade, bm, N); const m4 = new THREE.Matrix4(); const q = new THREE.Quaternion(); const col = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 34; const x = Math.cos(a) * d, z = Math.sin(a) * d + 4;
    q.setFromEuler(new THREE.Euler((r() - .5) * 0.5, r() * 6.3, (r() - .5) * 0.5)); const s = 0.6 + r() * 1.1;
    m4.compose(V(x, 0, z), q, V(s, s * (0.7 + r() * 0.8), s)); im.setMatrixAt(i, m4);
    col.setHSL(0.23 + r() * 0.04, 0.42, 0.17 + r() * 0.13); im.setColorAt(i, col);
  }
  im.receiveShadow = true; world.add(im);
  // Araukarien (wie Etagenbäume)
  const trunkM = new THREE.MeshStandardMaterial({ color: 0x5b4632, roughness: 0.9 });
  const leafM = new THREE.MeshStandardMaterial({ color: 0x46613a, roughness: 0.8 });
  const leafM2 = new THREE.MeshStandardMaterial({ color: 0x55703f, roughness: 0.8 });
  const tree = (x, z, h) => {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * h / 10, 0.25 * h / 10, h, 7), trunkM); tr.position.y = h / 2; tr.castShadow = true; g.add(tr);
    const n = 4 + (r() * 4 | 0);
    for (let k = 0; k < n; k++) { const y = h * (0.45 + 0.55 * k / n); const rad = (1.6 - k / n) * h / 9; const l = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10), r() < .5 ? leafM : leafM2); l.scale.set(rad, rad * 0.28, rad); l.position.y = y; l.castShadow = true; g.add(l); }
    world.add(g);
  };
  for (let i = 0; i < 90; i++) { const a = r() * Math.PI * 2, d = 26 + r() * 150; tree(Math.cos(a) * d, Math.sin(a) * d, 9 + r() * 12); }
  // Büsche / Farne
  const frondTex = canvasTex(256, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#3d5a22'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 32); g.lineTo(250, 32); g.stroke();
    for (let x = 6; x < 246; x += 7) { const L = 28 * Math.sin(Math.PI * x / 256) + 3; for (const sg of [-1, 1]) { const gr = g.createLinearGradient(x, 32, x + 6, 32 + sg * L); gr.addColorStop(0, '#47672a'); gr.addColorStop(1, '#6f8f3c'); g.fillStyle = gr; g.beginPath(); g.moveTo(x, 32); g.quadraticCurveTo(x + 8, 32 + sg * L * 0.6, x + 4, 32 + sg * L); g.quadraticCurveTo(x + 1, 32 + sg * L * 0.5, x, 32); g.fill(); } } });
  const frondM = new THREE.MeshStandardMaterial({ map: frondTex, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.75 });
  const frondGeo = (len, arch) => { const g = new THREE.PlaneGeometry(1, 0.26, 10, 1); g.translate(0.5, 0, 0); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setXYZ(i, x * len, (arch * x - (arch + 0.35) * x * x) * len + Math.abs(y) * 0.15 * len, y * len); } g.computeVertexNormals(); return g; };
  const fg1 = frondGeo(1, 0.8), fg2 = frondGeo(1, 0.4);
  const fern = (x, z, sc) => { const gr = new THREE.Group(); gr.position.set(x, 0, z); const n = 7 + (r() * 4 | 0); for (let k = 0; k < n; k++) { const f = new THREE.Mesh(r() < .5 ? fg1 : fg2, frondM); f.rotation.y = k / n * Math.PI * 2 + r() * 0.4; f.scale.setScalar(sc * (0.75 + r() * 0.4)); f.castShadow = true; gr.add(f); } world.add(gr); };
  for (let i = 0; i < 140; i++) { const a = r() * Math.PI * 2, d = 11 + r() * 45; fern(Math.cos(a) * d, Math.sin(a) * d, 0.7 + r() * 0.9); }
  const palmTrunkM = new THREE.MeshStandardMaterial({ color: 0x6a553d, roughness: 0.9, bumpMap: scaleTex, bumpScale: 1.5 });
  const palm = (x, z, h) => { const gr = new THREE.Group(); gr.position.set(x, 0, z); const bend = (r() - .5) * 0.25; let top = V(0, 0, 0);
    for (let k = 0; k < 8; k++) { const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.21, h / 8 + 0.05, 10), palmTrunkM); const y = (k + 0.5) * h / 8; seg.position.set(bend * y * y / h, y, 0); seg.rotation.z = -bend * 2 * y / h; seg.castShadow = true; gr.add(seg); top = V(bend * h, h, 0); }
    for (let k = 0; k < 10; k++) { const f = new THREE.Mesh(fg2, frondM); f.position.copy(top); f.rotation.y = k / 10 * Math.PI * 2; f.scale.setScalar(3.2 + r()); f.castShadow = true; gr.add(f); } world.add(gr); };
  for (let i = 0; i < 18; i++) { const a = r() * Math.PI * 2, d = 24 + r() * 70; palm(Math.cos(a) * d, Math.sin(a) * d, 6 + r() * 5); }
  const logM = new THREE.MeshStandardMaterial({ color: 0x6b4f35, roughness: 0.95, bumpMap: scaleTex, bumpScale: 2 });
  for (let i = 0; i < 7; i++) { const a = r() * Math.PI * 2, d = 14 + r() * 30; const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.3 + r() * 0.15, 0.36 + r() * 0.15, 6 + r() * 5, 16), logM); lg.rotation.z = Math.PI / 2; lg.rotation.y = r() * 3; lg.position.set(Math.cos(a) * d, 0.32, Math.sin(a) * d); lg.castShadow = lg.receiveShadow = true; world.add(lg); }
  // Berge
  const mm = new THREE.MeshStandardMaterial({ color: 0x75866c, roughness: 1 });
  for (let i = 0; i < 26; i++) { const a = r() * Math.PI * 2, d = 330 + r() * 150; const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mm); m.scale.set(90 + r() * 90, 18 + r() * 30, 70 + r() * 60); m.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); world.add(m); }
  // See
  const lake = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshStandardMaterial({ color: 0x8aa3ae, roughness: 0.08, metalness: 0.35 })); lake.rotation.x = -Math.PI / 2; lake.position.set(-50, 0.03, 45); lake.scale.y = 0.6; world.add(lake); const lake2 = lake.clone(); lake2.position.set(10, 0.03, -70); lake2.scale.set(2.4, 1.0, 1); world.add(lake2);
  // Wolken
  const cm = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0xc4cbd1, transparent: true, opacity: 0.7, fog: false });
  for (let i = 0; i < 24; i++) { const g = new THREE.Group(); const a = r() * Math.PI * 2, d = 260 + r() * 200; g.position.set(Math.cos(a) * d, 70 + r() * 70, Math.sin(a) * d);
    for (let k = 0; k < 5; k++) { const c = new THREE.Mesh(new THREE.SphereGeometry(10 + r() * 12, 10, 8), cm); c.position.set((r() - .5) * 40, (r() - .5) * 5, (r() - .5) * 15); c.scale.y = 0.45; g.add(c); } world.add(g); }
  // Felsen
  const rockM = new THREE.MeshStandardMaterial({ color: 0x6f7a5c, roughness: 0.9, bumpMap: scaleTex, bumpScale: 0.6 });
  for (let i = 0; i < 25; i++) { const a = r() * Math.PI * 2, d = 14 + r() * 40; const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5 + r() * 1.2, 3), rockM); m.position.set(Math.cos(a) * d, 0.1, Math.sin(a) * d); m.castShadow = true; world.add(m); }
}

// ---------- Outline-Material ----------
function outlineMat(color, o = 0.06) {
  const u = { uO: { value: o }, uA: { value: 0 } };
  const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide, transparent: true, depthWrite: false });
  m.onBeforeCompile = sh => { sh.uniforms.uO = u.uO; sh.uniforms.uA = u.uA; sh.vertexShader = 'uniform float uO;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed += normal*uO;');
    sh.fragmentShader = 'uniform float uA;\n' + sh.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( diffuse, uA );'); };
  m.userData.u = u; return m;
}

// ---------- Haut ----------
const BACK = new THREE.Color(0x8c5426), BELLY = new THREE.Color(0xe3c896), STRIPE = new THREE.Color(0x5a3216);
function skinColor(ny, z, c, x = 0, y = 0) {
  const k = clamp((ny + 0.25) / 0.9); c.copy(BELLY).lerp(BACK, k);
  if (ny > 0.15 && Math.sin(z * 2.6 + Math.sin(z * 0.7) * 1.2) > 0.55) c.lerp(STRIPE, 0.5 * clamp((ny - 0.15) * 3));
  const n = Math.sin(x * 7.1 + z * 3.3) * Math.sin(y * 5.7 - z * 4.1) + 0.5 * Math.sin(x * 13 + y * 11 + z * 9);
  c.multiplyScalar(0.93 + 0.07 * n); if (ny > 0.3 && n > 0.95) c.lerp(STRIPE, 0.22);
  return c;
}
function colorize(geo, zOff = 0, us = 1.3, vs = 0.8) {
  geo.computeVertexNormals(); const p = geo.attributes.position, n = geo.attributes.normal; const cols = new Float32Array(p.count * 3); const c = new THREE.Color();
  if (geo.attributes.uv && (us !== 1 || vs !== 1)) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * us, uv.getY(i) * vs); }
  for (let i = 0; i < p.count; i++) { skinColor(n.getY(i), p.getZ(i) + zOff, c, p.getX(i), p.getY(i)); cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); return geo;
}
function colorFlat(geo, ny = 0.75) { colorize(geo); const col = geo.attributes.color, p = geo.attributes.position; const c = new THREE.Color(); for (let i = 0; i < col.count; i++) { skinColor(ny, 4 + p.getZ(i), c, p.getX(i), p.getY(i)); col.setXYZ(i, c.r, c.g, c.b); } return geo; }
const skinM = new THREE.MeshStandardMaterial({ vertexColors: true, map: scaleColTex, roughness: 0.48, bumpMap: scaleTex, bumpScale: 2.6 });
const cheekM = skinM.clone(); cheekM.side = THREE.DoubleSide;
const scuteM = new THREE.MeshStandardMaterial({ color: 0x5f3f25, roughness: 0.6, bumpMap: scaleTex, bumpScale: 1.0 });
const clawM = new THREE.MeshStandardMaterial({ color: 0x2b2520, roughness: 0.35 });
const toothM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3 });
const pinkM = new THREE.MeshStandardMaterial({ color: 0x7c2f37, roughness: 0.55 });
const tongueM = new THREE.MeshStandardMaterial({ color: 0xa0434c, roughness: 0.45, bumpMap: scaleTex, bumpScale: 0.3 });
const throatM = new THREE.MeshStandardMaterial({ color: 0x2a0b0e, roughness: 0.9 });
const boneM = new THREE.MeshStandardMaterial({ color: 0xf1e9d6, roughness: 0.55 });
const skullBoneM = new THREE.MeshStandardMaterial({ color: 0xf1e9d6, roughness: 0.5, transparent: true, opacity: 0.9 }); // Röntgen: Zahnwurzeln sichtbar
const holeM = new THREE.MeshBasicMaterial({ color: 0x15100c });
const muscleM = new THREE.MeshStandardMaterial({ color: 0xc8202c, roughness: 0.45, emissive: 0x3a0005 });
const darkM = new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.3 });

// Loft entlang einer Wirbelsäule: keys [z, y, rx, ry]
const KEYS = [[-7.6, 2.15, 0.025, 0.03], [-6.6, 2.32, 0.08, 0.1], [-5.5, 2.5, 0.15, 0.2], [-4.3, 2.68, 0.25, 0.33], [-3.0, 2.86, 0.38, 0.49], [-1.8, 3.0, 0.54, 0.67], [-0.6, 3.08, 0.72, 0.88],
  [0.4, 3.02, 0.84, 1.04], [1.3, 2.9, 0.86, 1.08], [2.1, 3.0, 0.72, 0.92], [2.75, 3.28, 0.61, 0.75], [3.2, 3.58, 0.53, 0.64], [3.55, 3.82, 0.47, 0.57]];
function cr(p0, p1, p2, p3, t) { const t2 = t * t, t3 = t2 * t; return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); }
function sampleKeys(u) { const n = KEYS.length - 1; const f = u * n; const i = Math.min(n - 1, Math.floor(f)); const t = f - i;
  const k = j => KEYS[Math.max(0, Math.min(n, j))]; return [0, 1, 2, 3].map(c => cr(k(i - 1)[c], k(i)[c], k(i + 1)[c], k(i + 2)[c], t)); }
const RINGS = 90, SIDES = 28;
function makeLoft() {
  const g = new THREE.BufferGeometry(); const pos = new Float32Array(RINGS * SIDES * 3), uv = new Float32Array(RINGS * SIDES * 2); const idx = [];
  for (let i = 0; i < RINGS - 1; i++) for (let j = 0; j < SIDES; j++) { const a = i * SIDES + j, b = i * SIDES + (j + 1) % SIDES, c = a + SIDES, d = b + SIDES; idx.push(a, c, b, b, c, d); }
  for (let i = 0; i < RINGS; i++) for (let j = 0; j < SIDES; j++) { uv[(i * SIDES + j) * 2] = i / RINGS * 5.5; uv[(i * SIDES + j) * 2 + 1] = j / SIDES * 1.7; }
  g.setIndex(idx); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(RINGS * SIDES * 3), 3)); return g;
}
function updateLoft(g, { tail = 1, sway = 0, droop = 0, t = 0, breath = 0 }) {
  const pos = g.attributes.position.array; const cs = [];
  for (let i = 0; i < RINGS; i++) { let [z, y, rx, ry] = sampleKeys(i / (RINGS - 1)); let x = 0;
    const bf = 1 + breath * 0.028 * Math.sin(t * 1.6) * Math.exp(-Math.pow((z - 1.0) / 0.9, 2)); rx *= bf; ry *= bf; // Atmung: Brustkorb hebt sich
    if (z < 0) { const d = -z * tail; z = -d; x = sway * Math.pow(d / 7, 1.8) * 1.2 + 0.14 * Math.sin(t * 1.9 - d * 0.55) * Math.pow(d / 7, 1.5); y -= droop * Math.pow(d / 7, 2) * 0.8 - 0.05 * Math.sin(t * 1.4 - d * 0.5) * d / 7; rx *= lerp(1, 1.12, clamp((tail - 1) * 3)); ry *= lerp(1, 1.12, clamp((tail - 1) * 3)); }
    cs.push([V(x, y, z), rx, ry]); }
  const up = V(0, 1, 0); const n = g.attributes.color.array; const c = new THREE.Color();
  for (let i = 0; i < RINGS; i++) {
    const [p, rx, ry] = cs[i]; const tg = cs[Math.min(RINGS - 1, i + 1)][0].clone().sub(cs[Math.max(0, i - 1)][0]).normalize();
    const side = tg.clone().cross(up).normalize(); const u2 = side.clone().cross(tg).normalize();
    for (let j = 0; j < SIDES; j++) { const a = j / SIDES * Math.PI * 2; const ca = Math.cos(a), sa = Math.sin(a);
      const zz = p.z; const nf = Math.exp(-Math.pow((zz - 2.75) / 0.55, 2)) * 0.028 * Math.pow(0.5 + 0.5 * Math.sin(zz * 34 + ca * 2), 2); // Halsfalten
      const bf2 = sa < -0.45 && zz > -1.2 && zz < 2.2 ? 0.016 * (-sa - 0.45) * 1.8 * Math.max(0, Math.sin(zz * 21)) : 0; // Bauchschuppen-Rillen
      const mult = 1 + nf + bf2;
      const yy = sa < 0 ? sa * 1.0 : sa; const q = p.clone().addScaledVector(side, ca * rx * mult).addScaledVector(u2, yy * ry * mult); const k = (i * SIDES + j) * 3;
      pos[k] = q.x; pos[k + 1] = q.y; pos[k + 2] = q.z; skinColor(sa * 0.95, q.z, c); n[k] = c.r; n[k + 1] = c.g; n[k + 2] = c.b; }
  }
  g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere();
  const sc = g.userData.scutes; if (sc) { // Rückenschuppen-Reihen (echte 3D-Höcker) folgen dem Körper
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), P = V(0, 0, 0); let n = 0;
    for (let i = 6; i < RINGS - 10; i++) for (const dj of [0, -3, 3]) { if (dj && i % 2) continue; const j = SIDES / 4 + dj; const k = (i * SIDES + j) * 3; P.set(pos[k], pos[k + 1], pos[k + 2]);
      const ry = cs[i][2]; const sz = (dj ? 0.035 : 0.06) * Math.min(1, 0.25 + ry) * (0.85 + 0.3 * Math.abs(Math.sin(i * 12.9898)));
      const tg = cs[Math.min(RINGS - 1, i + 1)][0].clone().sub(cs[Math.max(0, i - 1)][0]).normalize(); q.setFromUnitVectors(V(0, 0, 1), tg);
      m4.compose(P, q, V(sz * 0.8, sz * 0.55, sz * 1.3)); sc.setMatrixAt(n++, m4); }
    sc.count = n; sc.instanceMatrix.needsUpdate = true; }
}
// ---------- Kopf: Loft mit Superellipsen-Querschnitten (exakte Oberflächenfunktion) ----------
const SE = 2.6; // Superellipsen-Exponent: etwas kantiger, knöcherner Querschnitt
const sgnPow = (v, p) => Math.sign(v) * Math.pow(Math.abs(v), p);
function headProf(upper, t) {
  let z, w, top, bot;
  if (upper) {
    z = lerp(-0.18, 1.62, t);
    w = t < 0.3 ? lerp(0.53, 0.41, t / 0.3) : t < 0.55 ? lerp(0.41, 0.31, (t - 0.3) / 0.25) : lerp(0.31, 0.275, (t - 0.55) / 0.45);
    top = t < 0.25 ? lerp(0.63, 0.5, t / 0.25) : lerp(0.5, 0.33, Math.pow((t - 0.25) / 0.75, 0.9));
    if (t > 0.42 && t < 0.9) top += 0.022 * Math.max(0, Math.sin((t - 0.42) * 42)); // raue Nasenknochen
    bot = 0.075;
  } else {
    z = lerp(-0.1, 1.67, t);
    w = lerp(0.48, 0.26, Math.pow(t, 0.9));
    top = 0.06;
    bot = t < 0.2 ? lerp(0.33, 0.41, t / 0.2) : lerp(0.41, 0.23, (t - 0.2) / 0.8); // massiver, tiefer Unterkiefer
  }
  const eb = t < 0.13 ? Math.sqrt(1 - Math.pow((0.13 - t) / 0.13, 2)) : 1;
  const ef = t > 0.86 ? Math.pow(Math.max(0, 1 - Math.pow((t - 0.86) / 0.14, 2)), 0.3) : 1; // stumpfe, kräftige Schnauze
  const e = eb * ef; return { z, w: w * e, top: top * e, bot: bot * e };
}
function headSurf(upper, t, phi, k = 1) {
  const p = headProf(upper, t); const c = Math.cos(phi), s = Math.sin(phi);
  return V(p.w * sgnPow(c, 2 / SE) * k, (s > 0 ? p.top : p.bot) * sgnPow(s, 2 / SE) * k, p.z);
}
function headNormal(upper, t, phi) { const p = headProf(upper, t); const q = headSurf(upper, t, phi); const h = q.y > 0 ? p.top : p.bot;
  return V(q.x / Math.max(1e-3, p.w * p.w), q.y / Math.max(1e-3, h * h), 0).normalize(); }
const MOUTH = new THREE.Color(0x4e1a20);
function headGeo(upper) {
  const R = 56, SD = 40; const pos = [], idx = [], uv = [];
  for (let i = 0; i < R; i++) { const t = i / (R - 1); for (let j = 0; j < SD; j++) { const q = headSurf(upper, t, j / SD * Math.PI * 2); pos.push(q.x, q.y, q.z); uv.push(t * 1.1, j / SD * 1.1); } }
  for (let i = 0; i < R - 1; i++) for (let j = 0; j < SD; j++) { const a = i * SD + j, b = i * SD + (j + 1) % SD, c = a + SD, d = b + SD; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  colorize(g, 4, 1, 1); const n = g.attributes.normal, col = g.attributes.color; const c = new THREE.Color();
  for (let i = 0; i < n.count; i++) { const ny = n.getY(i); const m = upper ? clamp((-ny - 0.55) * 4) : clamp((ny - 0.55) * 4);
    if (m > 0) { c.setRGB(col.getX(i), col.getY(i), col.getZ(i)).lerp(MOUTH, m); col.setXYZ(i, c.r, c.g, c.b); } }
  return g;
}
// ---------- Zähne: dick, D-förmig, nach hinten gebogen, mit gezackten Schneidkanten ----------
function toothGeo(r) {
  // t=0: Wurzelende, t=0.3: Zahnfleischlinie, t=1: Spitze. Kräftig, D-förmig, bananenförmig nach hinten gebogen, gezackte Kanten
  const R = 36, SD = 18, curv = 0.3 + r() * 0.16, fat = 0.95 + r() * 0.25, dens = 13 + r() * 5; const pos = [], idx = [], col = [];
  const crown = new THREE.Color(0xf6eedb), neck = new THREE.Color(0xe0cc98), rootC = new THREE.Color(0xa4814c); const c = new THREE.Color();
  for (let i = 0; i < R; i++) { const t = i / (R - 1); const tp = clamp((t - 0.3) / 0.7), tr = clamp(t / 0.3); const y = 0.42 - 1.42 * t;
    let a, b; if (t < 0.3) { const k = Math.sin(tr * Math.PI / 2); a = 0.2 * fat * (0.5 + 0.5 * k); b = 0.15 * fat * (0.5 + 0.5 * k); }
    else { a = 0.27 * fat * Math.pow(1 - tp, 0.68) * (1 + 0.1 * Math.sin(tp * Math.PI)); b = 0.185 * fat * Math.pow(1 - tp, 0.8); }
    const zc = -curv * Math.pow(tp, 1.5) + 0.05 * Math.sin(tp * Math.PI);
    if (t < 0.3) c.copy(rootC).lerp(neck, tr); else c.copy(neck).lerp(crown, clamp(tp * 2.5));
    for (let j = 0; j < SD; j++) { const ph = j / SD * Math.PI * 2; const cw = Math.pow(Math.abs(Math.cos(ph)), 14);
      const saw = tp > 0.04 && tp < 0.93 ? Math.pow(0.5 + 0.5 * Math.sin(tp * Math.PI * 2 * dens), 3) : 0; const serr = 0.024 * cw * saw * (1 - tp * 0.5);
      pos.push(b * Math.sin(ph), y, (a + serr) * Math.cos(ph) + zc); col.push(c.r, c.g, c.b); } }
  for (let i = 0; i < R - 1; i++) for (let j = 0; j < SD; j++) { const a = i * SD + j, b = i * SD + (j + 1) % SD, c2 = a + SD, d = b + SD; idx.push(a, c2, b, b, c2, d); }
  const pole = pos.length / 3; pos.push(0, 0.45, 0); col.push(rootC.r, rootC.g, rootC.b); for (let j = 0; j < SD; j++) idx.push(pole, j, (j + 1) % SD);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
// Wangenhaut / Mundwinkel: verbindet Ober- und Unterkiefer und dehnt sich beim Öffnen
function makeCheek(s) { const K = 12, M = 7; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(K * M * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(K * M * 3), 3));
  const uv = []; for (let k = 0; k < K; k++) for (let m = 0; m < M; m++) uv.push(k / K * 2, m / M * 0.6); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const idx = []; for (let k = 0; k < K - 1; k++) for (let m = 0; m < M - 1; m++) { const a = k * M + m, b = a + 1, c = a + M, d = c + 1; idx.push(a, c, b, b, c, d); } g.setIndex(idx); g.userData = { K, M, s }; return g; }
function updateCheek(g, ang) { const { K, M, s } = g.userData; const pos = g.attributes.position.array, col = g.attributes.color.array; const c = new THREE.Color(); const ca = Math.cos(ang), sa = Math.sin(ang);
  for (let k = 0; k < K; k++) { const w = k / (K - 1); const z = lerp(-0.12, 0.42, w); const pu = headProf(true, (z + 0.18) / 1.8); const U = V(s * pu.w * 0.97, -0.045, z);
    const zl = z + 0.15; const pl = headProf(false, clamp((zl + 0.1) / 1.77)); const Ll = V(s * pl.w * 0.97, 0.03, zl);
    const L = V(Ll.x, Ll.y * ca - Ll.z * sa, Ll.y * sa + Ll.z * ca).add(V(0, -0.05, -0.15)).lerp(U, Math.pow(w, 1.7));
    for (let m = 0; m < M; m++) { const v = m / (M - 1); const p = U.clone().lerp(L, v); p.x += s * Math.sin(Math.PI * v) * (0.03 * (1 - w) - 0.05 * clamp(ang * 1.5) * (1 - w));
      const i = (k * M + m) * 3; pos[i] = p.x; pos[i + 1] = p.y; pos[i + 2] = p.z; skinColor(0.15 - v * 0.7, z + 4, c, p.x, p.y); col[i] = c.r; col[i + 1] = c.g; col[i + 2] = c.b; } }
  g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true; g.computeVertexNormals(); }
const TOOTH_L0 = 0.12;
const gumM = new THREE.MeshStandardMaterial({ color: 0x93383d, roughness: 0.5, bumpMap: scaleTex, bumpScale: 0.4 });
function surfPlace(parent, mesh, upper, t, phi, k, sx, sy, thick) {
  const p = headSurf(upper, t, phi, k); const n = headNormal(upper, t, phi); mesh.position.copy(p); mesh.lookAt(p.clone().add(n)); mesh.scale.set(sx, sy, thick); parent.add(mesh); return mesh;
}

// ---------- T-Rex ----------
function makeRex() {
  const root = new THREE.Group(); const torso = new THREE.Group(); torso.position.set(0, 3.0, 0); root.add(torso);
  const ol = outlineMat(0xffe27a, 0.07);
  const loftG = makeLoft();
  const scutes = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), scuteM, RINGS * 3); scutes.castShadow = true; loftG.userData.scutes = scutes; updateLoft(loftG, {});
  const body = new THREE.Mesh(loftG, skinM); body.position.set(0, -3.0, 0); body.castShadow = true; body.receiveShadow = true; torso.add(body); body.add(scutes);
  const bodyOl = new THREE.Mesh(loftG, ol); bodyOl.position.copy(body.position); torso.add(bodyOl);
  // Kopf
  const headG = new THREE.Group(); headG.position.set(0, 0.85, 3.5); torso.add(headG);
  const skin = new THREE.Group(), skull = new THREE.Group(); headG.add(skin, skull);
  const upG = headGeo(true), loG = headGeo(false);
  const up = new THREE.Mesh(upG, skinM); up.castShadow = true; skin.add(up); skin.add(new THREE.Mesh(upG, ol));
  const jaw = new THREE.Group(); jaw.position.set(0, -0.05, -0.15); headG.add(jaw); // Gelenk hinten am Schädel
  const jawSkin = new THREE.Group(), jawSkull = new THREE.Group(); jaw.add(jawSkin, jawSkull);
  const lo = new THREE.Mesh(loG, skinM); lo.castShadow = true; jawSkin.add(lo); jawSkin.add(new THREE.Mesh(loG, ol));
  skull.add(new THREE.Mesh(upG, skullBoneM)); jawSkull.add(new THREE.Mesh(loG, skullBoneM));
  // Mundraum
  const palate = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14), pinkM); palate.scale.set(0.3, 0.04, 0.75); palate.position.set(0, -0.06, 0.7); headG.add(palate);
  for (let k = 0; k < 8; k++) { const rg = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.3 - k * 0.018, 4, 8), pinkM); rg.rotation.z = Math.PI / 2; rg.position.set(0, -0.098, 0.3 + k * 0.11); headG.add(rg); } // Gaumenfalten
  const throat = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), throatM); throat.scale.set(0.3, 0.2, 0.34); throat.position.set(0, -0.14, 0.02); headG.add(throat); // dunkle, tiefe Mundhöhle
  const tongueG = new THREE.SphereGeometry(1, 28, 16); { const tp = tongueG.attributes.position; for (let i = 0; i < tp.count; i++) { const x = tp.getX(i), y = tp.getY(i), z = tp.getZ(i); tp.setXYZ(i, x * (0.75 + 0.25 * (1 - z) / 2), y + (y > 0 ? -0.35 * Math.exp(-x * x * 40) : 0), z); } tongueG.computeVertexNormals(); }
  const tongue = new THREE.Mesh(tongueG, tongueM); tongue.scale.set(0.25, 0.07, 0.62); tongue.position.set(0, 0.03, 0.82); jaw.add(tongue);
  const cheeks = [-1, 1].map(s => { const g = makeCheek(s); updateCheek(g, 0.05); const m = new THREE.Mesh(g, cheekM); m.castShadow = true; skin.add(m); return g; });
  const neckBlend = new THREE.Mesh(colorize(new THREE.SphereGeometry(1, 28, 20)), skinM); neckBlend.scale.set(0.47, 0.5, 0.42); neckBlend.position.set(0, -0.1, -0.22); skin.add(neckBlend); // Übergang Hals -> Kopf
  // Zähne + Zahnfleisch
  const r = rng(321); const geos = Array.from({ length: 8 }, () => toothGeo(r)); const teeth = [];
  const addTooth = (parent, x, y, z, size, lower, s) => { const m = new THREE.Mesh(geos[(r() * geos.length) | 0], toothM); m.position.set(x, y, z);
    m.rotation.set((r() - .5) * 0.14, (r() - .5) * 0.3, (lower ? Math.PI : 0) + s * (0.07 + r() * 0.06) * (lower ? -1 : 1)); m.userData.base = size * (0.88 + r() * 0.24); m.castShadow = true; parent.add(m); teeth.push(m);
    const gb = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), gumM); gb.position.set(x, y + (lower ? -0.005 : 0.005), z); gb.scale.set(0.05, 0.03, 0.06); gb.userData.tooth = m; (lower ? gumBulbsLo : gumBulbsUp).push(gb); return m; };
  const gumBulbsUp = [], gumBulbsLo = [];
  for (const s of [-1, 1]) {
    const upZ = []; const gumUp = [], gumLo = [];
    // Zwischenkiefer: kleine, dicht stehende Schneidezähne vorne
    for (let k = 0; k < 4; k++) { const t = 0.955 - k * 0.022; const p = headProf(true, t); const x = s * p.w * 0.78, z = p.z - 0.01; addTooth(headG, x, -0.045, z, 0.55, false, s); upZ.push(z); gumUp.push(V(x, -0.03, z)); }
    // Oberkiefer: 12 Zähne, größte im vorderen Drittel, unregelmäßige Abstände
    let t = 0.86;
    for (let k = 0; k < 12; k++) { const p = headProf(true, t); const x = s * p.w * 0.84, z = p.z; const size = 0.5 + 0.65 * Math.exp(-Math.pow((k - 3) / 3.4, 2)); addTooth(headG, x, -0.05, z, size, false, s); upZ.push(z); gumUp.push(V(x, -0.035, z)); t -= 0.05 + (r() - .5) * 0.018; }
    gumUp.sort((a, b) => a.z - b.z); upZ.sort((a, b) => a - b);
    // Unterkiefer: Zähne stehen innen und versetzt zwischen den oberen (Verzahnung)
    for (let k = 0; k < upZ.length - 1; k++) { const zAbs = (upZ[k] + upZ[k + 1]) / 2 + (r() - .5) * 0.02; const zl = zAbs + 0.15; const tl = (zl + 0.1) / 1.77; if (tl < 0.25 || tl > 0.96) continue;
      const p = headProf(false, tl); const x = s * p.w * 0.74; const kk = (0.96 - tl) / 0.7 * 12; const size = 0.45 + 0.6 * Math.exp(-Math.pow((kk - 2.5) / 3.6, 2));
      addTooth(jaw, x, 0.045, zl, size, true, s); gumLo.push(V(x, 0.035, zl)); }
    gumLo.sort((a, b) => a.z - b.z);
    const mkGum = (pts, parent) => { const g = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.026, 8), gumM); g.scale.set(1, 0.8, 1); parent.add(g); };
    mkGum(gumUp, skin); mkGum(gumLo, jawSkin); gumBulbsUp.forEach(g => skin.add(g)); gumBulbsLo.forEach(g => jawSkin.add(g)); gumBulbsUp.length = 0; gumBulbsLo.length = 0;
  }
  // Augen: tief in der Augenhöhle, abgeflacht, Iris mit Schlitzpupille, Ober-/Unterlid, glänzende Hornhaut
  const irisTex = canvasTex(256, 256, (g) => { g.fillStyle = '#0b0703'; g.fillRect(0, 0, 256, 256); const gr = g.createRadialGradient(128, 128, 30, 128, 128, 112); gr.addColorStop(0, '#fff07a'); gr.addColorStop(0.55, '#ffd21f'); gr.addColorStop(0.9, '#e09a00'); gr.addColorStop(1, '#5a3300');
    g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 112, 0, 7); g.fill(); g.strokeStyle = 'rgba(150,90,0,0.35)'; for (let k = 0; k < 60; k++) { g.beginPath(); g.moveTo(128 + 40 * Math.cos(k / 60 * 6.283), 128 + 40 * Math.sin(k / 60 * 6.283)); g.lineTo(128 + 108 * Math.cos(k / 60 * 6.283), 128 + 108 * Math.sin(k / 60 * 6.283)); g.stroke(); }
    g.fillStyle = '#050302'; g.beginPath(); g.arc(128, 128, 44, 0, 7); g.fill(); });
  const irisM = new THREE.MeshStandardMaterial({ map: irisTex, roughness: 0.25 });
  const eyeBallM = new THREE.MeshStandardMaterial({ color: 0x1d1006, roughness: 0.4 });
  const corneaM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.02, metalness: 0.1, transparent: true, opacity: 0.2 });
  const socketM = new THREE.MeshStandardMaterial({ color: 0x24150c, roughness: 0.85 });
  for (const s of [-1, 1]) {
    const P = a => s > 0 ? a : Math.PI - a; const phi = P(0.8), t = 0.2;
    const sock = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), socketM); surfPlace(skin, sock, true, t, phi, 0.975, 0.078, 0.062, 0.03);
    const ep = headSurf(true, t, phi, 0.975); const en = headNormal(true, t, phi); const eg = new THREE.Group(); eg.position.copy(ep); eg.lookAt(ep.clone().add(en.clone().add(V(0, 0.1, 0.25)).normalize())); eg.position.addScaledVector(en, 0.012); eg.scale.setScalar(1.45); headG.add(eg);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), eyeBallM); ball.scale.set(0.054, 0.05, 0.022); eg.add(ball);
    const iris = new THREE.Mesh(new THREE.CircleGeometry(1, 32), irisM); iris.scale.set(0.05, 0.047, 1); iris.position.z = 0.021; eg.add(iris);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); glint.position.set(-0.016 * s, 0.016, 0.03); eg.add(glint); // Lichtreflex
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.28, 10, 28), socketM); ring.scale.set(0.058, 0.048, 0.05); ring.position.z = -0.004; eg.add(ring); // tiefe Augenhöhle
    const cornea = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), corneaM); cornea.rotation.x = Math.PI / 2; cornea.scale.set(0.05, 0.022, 0.041); cornea.position.z = 0.006; eg.add(cornea);
    const lidU = new THREE.Mesh(colorFlat(new THREE.SphereGeometry(1, 20, 12)), skinM); lidU.scale.set(0.074, 0.026, 0.034); lidU.position.set(0, 0.05, 0.0); eg.add(lidU);
    const lidL = new THREE.Mesh(colorFlat(new THREE.SphereGeometry(1, 20, 12)), skinM); lidL.scale.set(0.066, 0.02, 0.028); lidL.position.set(0, -0.05, -0.002); eg.add(lidL);
    const brow = new THREE.Mesh(colorFlat(new THREE.SphereGeometry(1, 18, 12)), skinM); surfPlace(skin, brow, true, 0.18, P(1.05), 0.985, 0.13, 0.06, 0.06); brow.rotateZ(-s * 0.25);
    const lac = new THREE.Mesh(colorFlat(new THREE.SphereGeometry(1, 16, 10)), skinM); surfPlace(skin, lac, true, 0.3, P(1.2), 0.975, 0.07, 0.035, 0.035);
    const rim = new THREE.Mesh(colorFlat(new THREE.TorusGeometry(1, 0.38, 10, 20)), skinM); surfPlace(skin, rim, true, 0.93, P(0.98), 0.995, 0.064, 0.042, 0.035);
    const nos = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), throatM); surfPlace(skin, nos, true, 0.93, P(0.98), 0.985, 0.05, 0.028, 0.015);
  }
  // Schädelfenster: Antorbital-, Augen-, Schläfenfenster, Nasenloch (+ Unterkieferfenster)
  const holes = [], muscles = [];
  const holeShape = (parent, upper, t, phi, sx, sy) => { const g = new THREE.Group(); const p = headSurf(upper, t, phi, 0.99); const n = headNormal(upper, t, phi); g.position.copy(p); g.lookAt(p.clone().add(n)); parent.add(g);
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14), holeM); m.scale.set(sx, sy, 0.03); g.add(m); return g; };
  const lowerHoles = [];
  for (const s of [-1, 1]) {
    const P = a => s > 0 ? a : Math.PI - a;
    holes.push(holeShape(skull, true, 0.52, P(0.42), 0.2, 0.095));
    const orb = holeShape(skull, true, 0.2, P(0.8), 0.07, 0.1); const ok = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), holeM); ok.scale.set(0.035, 0.07, 0.03); ok.position.set(0, -0.11, 0); orb.add(ok); holes.push(orb); // Schlüsselloch-Form
    holes.push(holeShape(skull, true, 0.05, P(0.45), 0.075, 0.15));
    holes.push(holeShape(skull, true, 0.935, P(0.95), 0.06, 0.035));
    lowerHoles.push(holeShape(jawSkull, false, 0.22, s > 0 ? -0.55 : Math.PI + 0.55, 0.13, 0.06));
    const mu = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), muscleM); surfPlace(skull, mu, true, 0.06, P(0.5), 1.0, 0.13, 0.2, 0.09); muscles.push(mu);
    const mu2 = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), muscleM); surfPlace(jawSkull, mu2, false, 0.1, s > 0 ? -0.35 : Math.PI + 0.35, 1.0, 0.12, 0.13, 0.08); muscles.push(mu2);
  }
  holes.push(...lowerHoles);
  const mouthMark = new THREE.Object3D(); mouthMark.position.set(0, -0.03, 0.9); headG.add(mouthMark);
  // Hinterbeine: massiver Oberschenkel mit Muskelgruppen, weicher Übergang zum Rumpf, Wadenmuskel, segmentierte Zehen mit Ballen + Afterkralle
  const legs = [];
  const capsG = (rad, len) => { const g = colorize(new THREE.CapsuleGeometry(rad, len, 6, 14)); g.translate(0, -len / 2, 0); return g; };
  const withOl = (parent, mesh) => { parent.add(mesh); const o = new THREE.Mesh(mesh.geometry, ol); o.position.copy(mesh.position); o.rotation.copy(mesh.rotation); o.scale.copy(mesh.scale); parent.add(o); return mesh; };
  const ell3 = (sx, sy, sz, seg = 28) => { const m = new THREE.Mesh(colorize(new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7))), skinM); m.scale.set(sx, sy, sz); m.castShadow = true; return m; };
  const toeClawG = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, 0, 0), V(0, -0.015, 0.06), V(0, -0.06, 0.1)]), 10, 0.024, 7);
  for (const s of [-1, 1]) {
    const hb = ell3(0.5, 0.78, 0.98); hb.position.set(s * 0.46, -0.12, 0.02); withOl(torso, hb); // Hüftmuskulatur (Übergang)
    const hip = new THREE.Group(); hip.position.set(s * 0.62, 3.0, 0.1); root.add(hip);
    const thigh = ell3(0.5, 1.05, 0.78); thigh.position.set(0, -0.6, 0.1); thigh.rotation.x = -0.3; withOl(hip, thigh);
    const quad = ell3(0.36, 0.72, 0.42); quad.position.set(s * 0.05, -0.85, 0.4); quad.rotation.x = -0.55; hip.add(quad); // Oberschenkelstrecker
    const knee = new THREE.Group(); knee.position.set(0, -1.3, 0.45); hip.add(knee);
    const kj = ell3(0.25, 0.25, 0.27, 20); knee.add(kj);
    const shinG = new THREE.Group(); shinG.rotation.x = 0.45; knee.add(shinG);
    const shinGeo = colorize(new THREE.CylinderGeometry(0.21, 0.13, 1.2, 18)); shinGeo.translate(0, -0.6, 0); const shin = new THREE.Mesh(shinGeo, skinM); shin.castShadow = true; withOl(shinG, shin);
    const calf = ell3(0.2, 0.46, 0.24); calf.position.set(0, -0.36, -0.13); withOl(shinG, calf); // Wadenmuskel
    const ankle = new THREE.Group(); ankle.position.set(0, -1.12, -0.55); knee.add(ankle);
    const aj = ell3(0.15, 0.14, 0.15, 18); ankle.add(aj);
    const metG = colorize(new THREE.CylinderGeometry(0.13, 0.1, 0.95, 14)); metG.translate(0, -0.47, 0);
    const met = new THREE.Mesh(metG, skinM); met.rotation.x = -0.35; met.castShadow = true; ankle.add(met);
    const foot = new THREE.Group(); foot.position.set(0, -0.88, 0.32); ankle.add(foot);
    const pad = ell3(0.2, 0.08, 0.2, 18); pad.position.set(0, -0.03, -0.02); foot.add(pad);
    for (const [ang, len] of [[-0.32, 0.85], [0, 1], [0.32, 0.85]]) {
      const toe = new THREE.Group(); toe.rotation.y = ang; foot.add(toe); let z = 0.04;
      [[0.078, 0.16], [0.068, 0.13], [0.058, 0.1]].forEach(([rad, l], k) => { const seg = new THREE.Mesh(capsG(rad, l * len), skinM); seg.rotation.x = -Math.PI / 2 - 0.08 * k; seg.position.set(0, -0.02 - k * 0.012, z); seg.castShadow = true; toe.add(seg);
        const tp = ell3(rad * 0.95, rad * 0.45, l * len * 0.45, 12); tp.position.set(0, -0.065 - k * 0.01, z + l * len * 0.5); toe.add(tp); z += l * len + 0.02; });
      const cl = new THREE.Mesh(toeClawG, clawM); cl.position.set(0, -0.04, z - 0.02); cl.castShadow = true; toe.add(cl);
    }
    const dew = new THREE.Group(); dew.position.set(-s * 0.1, 0.16, -0.06); dew.rotation.y = -s * 1.2; foot.add(dew); const dt = new THREE.Mesh(capsG(0.035, 0.08), skinM); dt.rotation.x = -Math.PI / 2 - 0.4; dew.add(dt);
    const dc = new THREE.Mesh(toeClawG, clawM); dc.scale.setScalar(0.6); dc.position.set(0, -0.03, 0.1); dew.add(dc);
    legs.push({ hip, knee, ankle, s });
  }
  // Arme: kurz und kräftig, Oberarm + Unterarm, Hand mit zwei Krallenfingern (+ verkümmerter dritter Mittelhandknochen)
  const arms = [];
  const clawG = (() => { const c = new THREE.CatmullRomCurve3([V(0, 0, 0), V(0, -0.03, 0.04), V(0, -0.08, 0.05)]); return new THREE.TubeGeometry(c, 10, 0.012, 6); })();
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 0.54, -0.42, 1.62); torso.add(sh);
    const delt = new THREE.Mesh(colorize(new THREE.SphereGeometry(1, 16, 12)), skinM); delt.scale.set(0.12, 0.15, 0.14); sh.add(delt);
    const ua = new THREE.Mesh(capsG(0.085, 0.3), skinM); ua.rotation.x = 0.55; ua.castShadow = true; sh.add(ua);
    const el = new THREE.Group(); el.position.set(0, -0.27, 0.16); sh.add(el);
    const fa = new THREE.Mesh(capsG(0.065, 0.2), skinM); fa.rotation.x = -0.85; el.add(fa);
    const hand = new THREE.Group(); hand.position.set(0, -0.15, 0.2); hand.rotation.y = -s * 0.35; el.add(hand);
    const palm = new THREE.Mesh(colorize(new THREE.SphereGeometry(1, 12, 8)), skinM); palm.scale.set(0.05, 0.035, 0.065); hand.add(palm);
    for (const fx of [-0.028, 0.028]) {
      const f1 = new THREE.Group(); f1.position.set(fx, -0.01, 0.05); f1.rotation.x = 0.5; hand.add(f1);
      f1.add(new THREE.Mesh(capsG(0.022, 0.07), skinM));
      const f2 = new THREE.Group(); f2.position.y = -0.09; f2.rotation.x = 0.5; f1.add(f2); f2.add(new THREE.Mesh(capsG(0.019, 0.05), skinM));
      const cl = new THREE.Mesh(clawG, clawM); cl.position.y = -0.07; cl.rotation.x = 0.3; f2.add(cl);
    }
    const vest = new THREE.Mesh(capsG(0.012, 0.03), skinM); vest.position.set(s * 0.05, -0.01, 0.02); vest.rotation.z = s * 0.8; hand.add(vest);
    arms.push(sh);
  }
  root.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
  return { root, torso, body, loftG, headG, jaw, skin, skull, jawSkin, jawSkull, teeth, holes, muscles, legs, arms, mouthMark, ol, palate, tongue, cheeks };
}
function poseRex(r, { phase = 0, amp = 0, head = 0, jaw = 0.05, t = 0, breathe = 1, pitch = 0, tail = 1, sway = null, arm = 1, teeth = 1, skull = 0, holes = 0, muscles = 0, droop = 0 } = {}) {
  for (const l of r.legs) {
    const ph = phase + (l.s > 0 ? Math.PI : 0); const sn = Math.sin(ph), cs = Math.cos(ph);
    const swing = Math.pow(Math.max(0, cs), 1.3), stance = Math.max(0, -cs); // Schwungphase: Bein angehoben und nach vorne / Standphase: Fuß am Boden
    l.hip.rotation.x = (-sn * 0.44 - swing * 0.18) * amp;
    l.knee.rotation.x = (swing * 0.78 + stance * 0.06) * amp;
    l.ankle.rotation.x = (-swing * 0.5 + stance * 0.22 * Math.max(0, sn)) * amp; // Abrollen über die Zehen
  }
  const bob = Math.cos(phase * 2) * 0.055 * amp; // zwei Auf-/Ab-Bewegungen pro Doppelschritt
  r.torso.position.y = 3.0 + bob + Math.sin(t * 1.6) * 0.02 * breathe - 0.05 * amp;
  r.torso.rotation.x = pitch + Math.sin(phase * 2 + 0.6) * 0.012 * amp; r.torso.rotation.z = Math.sin(phase) * 0.03 * amp; r.torso.rotation.y = Math.sin(phase) * 0.045 * amp;
  // Kopf: Blick bleibt stabil (gleicht Körperbewegung aus) + leichte, natürliche Suchbewegungen
  r.headG.rotation.x = head - jaw * 0.12 - bob * 0.5 + Math.sin(t * 1.6 + 0.6) * 0.012 * breathe + Math.sin(t * 0.37) * 0.015;
  r.headG.rotation.y = -Math.sin(phase) * 0.04 * amp + (Math.sin(t * 0.6) * 0.05 + Math.sin(t * 1.7 + 1) * 0.015) * breathe; r.headG.rotation.z = Math.sin(t * 0.45) * 0.025 * breathe - Math.sin(phase) * 0.02 * amp;
  const ja = jaw + Math.max(0, Math.sin(t * 1.6)) * 0.012 * breathe; r.jaw.rotation.x = ja; r.cheeks.forEach(g => updateCheek(g, ja));
  updateLoft(r.loftG, { tail, sway: sway === null ? Math.sin(t * 1.3) * 0.22 * (1 - amp * 0.5) + Math.sin(phase - 0.8) * 0.38 * amp : sway, droop: droop - bob * 0.6, t, breath: breathe });
  r.arms.forEach(a => { a.scale.setScalar(arm); a.rotation.x = Math.sin(t * 2 + a.position.x) * 0.1; });
  r.teeth.forEach(m => { const b = m.userData.base; const L = Math.max(0.001, teeth * b) * TOOTH_L0; const th = Math.max(0.001, b * lerp(0.8, 2.15, clamp((teeth - 0.8) / 1.5))) * TOOTH_L0; m.scale.set(th, L, th); });
  r.skin.visible = r.jawSkin.visible = skull < 0.5; r.skull.visible = r.jawSkull.visible = skull >= 0.5;
  r.holes.forEach((h, i) => { h.visible = holes > 0; h.scale.setScalar(Math.max(0.001, back(holes * 1.4 - (i % 4) * 0.12))); });
  r.muscles.forEach((m, i) => { const k = back(muscles * 1.3 - i * 0.08); m.visible = muscles > 0; m.scale.set(...(m.userData.s ?? (m.userData.s = m.scale.toArray())).map(v => v * Math.max(0.001, k))); });
}
const rex = makeRex(); scene.add(rex.root);
// Maul auf Ziel ausrichten
function alignMouth(target) { rex.root.updateMatrixWorld(true); const p = rex.mouthMark.getWorldPosition(V(0, 0, 0)); rex.root.position.add(target.clone().sub(p)); rex.root.updateMatrixWorld(true); }

// ---------- Triceratops ----------
function makeTri() {
  const g = new THREE.Group(); const body = new THREE.Group(); g.add(body);
  const triCol = (geo) => { geo.computeVertexNormals(); const p = geo.attributes.position, n = geo.attributes.normal; const cols = []; const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) { c.set(0xb7a07a).lerp(new THREE.Color(0x6e5a44), clamp((n.getY(i) + 0.2))); if (n.getY(i) > 0.2 && Math.sin(p.getZ(i) * 5) > 0.5) c.lerp(new THREE.Color(0x4a3a2c), 0.4); cols.push(c.r, c.g, c.b); }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); return geo; };
  const ol = outlineMat(0xff3b30, 0.06);
  const add = (geo, x, y, z, sx, sy, sz, parent = body, rx = 0) => { const gg = triCol(geo); const m = new THREE.Mesh(gg, skinM); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.x = rx; m.castShadow = true; parent.add(m); const o = new THREE.Mesh(gg, ol); o.position.copy(m.position); o.scale.copy(m.scale); o.rotation.copy(m.rotation); parent.add(o); return m; };
  add(new THREE.SphereGeometry(1, 32, 24), 0, 1.75, 0, 1.15, 1.05, 2.3);
  add(new THREE.SphereGeometry(1, 20, 14), 0, 1.5, -2.4, 0.4, 0.4, 1.1);
  const head = new THREE.Group(); head.position.set(0, 1.6, 2.2); body.add(head);
  add(new THREE.SphereGeometry(1, 24, 18), 0, 0, 0.6, 0.55, 0.6, 0.9, head);
  add(new THREE.ConeGeometry(0.3, 0.6, 12), 0, -0.2, 1.55, 1, 1, 1, head, Math.PI / 2 + 0.4);
  const frillG = new THREE.CylinderGeometry(0.95, 0.95, 0.12, 36, 1); const frill = add(frillG, 0, 0.55, -0.05, 1, 1, 1, head, -1.25);
  const hornM = new THREE.MeshStandardMaterial({ color: 0xe9dcc0, roughness: 0.4 });
  for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.ConeGeometry(0.11, 1.1, 10), hornM); h.position.set(s * 0.28, 0.45, 1.1); h.rotation.x = 1.0; h.castShadow = true; head.add(h);
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), darkM); e.position.set(s * 0.45, 0.2, 0.85); head.add(e); }
  const nh = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.4, 8), hornM); nh.position.set(0, 0.25, 1.45); nh.rotation.x = 0.6; head.add(nh);
  const legs = [];
  for (const [x, z] of [[-0.75, 1.3], [0.75, 1.3], [-0.75, -1.3], [0.75, -1.3]]) { const l = new THREE.Group(); l.position.set(x, 1.4, z); body.add(l); const m = new THREE.Mesh(triCol(new THREE.CylinderGeometry(0.28, 0.24, 1.4, 12)), skinM); m.position.y = -0.7; m.castShadow = true; l.add(m); legs.push(l); }
  g.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
  return { root: g, head, frill, legs, ol, body };
}
function poseTri(tr, { phase = 0, amp = 0, t = 0 }) { tr.legs.forEach((l, i) => l.rotation.x = Math.sin(phase + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.35 * amp); tr.body.position.y = Math.abs(Math.sin(phase)) * 0.05 * amp; tr.head.rotation.x = Math.sin(t * 0.8) * 0.05; }
const tri = makeTri(); scene.add(tri.root);

// ---------- Requisiten ----------
const bone = new THREE.Group(); scene.add(bone);
const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1, 4), new THREE.MeshStandardMaterial({ color: 0x6f7c5e, roughness: 0.85, bumpMap: scaleTex, bumpScale: 0.5 })); rock.scale.set(1.2, 0.75, 1); rock.castShadow = rock.receiveShadow = true; scene.add(rock);
const boneHalves = [];
for (const s of [-1, 1]) { const h = new THREE.Group(); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.6, 14), boneM); c.rotation.z = Math.PI / 2; c.position.x = s * 0.3; h.add(c);
  for (const dz of [-0.09, 0.09]) { const k = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10), boneM); k.position.set(s * 0.62, 0, dz); h.add(k); } h.traverse(o => o.castShadow = true); bone.add(h); boneHalves.push(h); }
// Splitter / Zahnsplitter / Staub
function particles(n, size, color, seed) { const p = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ map: dotTex, size, color, transparent: true, depthWrite: false }));
  p.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); const r = rng(seed); p.userData.v = Array.from({ length: n }, () => [(r() - .5), r(), (r() - .5), r()]); p.frustumCulled = false; scene.add(p); return p; }
const crumbs = particles(120, 0.07, 0xf3ead7, 7), dust = particles(260, 0.9, 0xb8a27e, 9);
function burst(p, origin, t, { spread = 2, up = 3, g = 9.8, life = 1.5, ring = false } = {}) {
  const a = p.geometry.attributes.position.array; p.visible = t > 0 && t < life;
  p.userData.v.forEach((v, i) => { const tt = clamp(t, 0, life); if (ring) { const ang = v[0] * 20, sp = spread * (0.5 + v[3]); a[i * 3] = origin.x + Math.cos(ang) * sp * Math.sqrt(tt); a[i * 3 + 1] = origin.y + v[1] * up * tt * 0.4; a[i * 3 + 2] = origin.z + Math.sin(ang) * sp * Math.sqrt(tt); }
    else { a[i * 3] = origin.x + v[0] * spread * tt; a[i * 3 + 1] = Math.max(0.02, origin.y + (v[1] * up) * tt - 0.5 * g * tt * tt); a[i * 3 + 2] = origin.z + v[2] * spread * tt; } });
  p.geometry.attributes.position.needsUpdate = true; p.material.opacity = 1 - clamp(t / life);
}
// abgebrochene Zähne
const brokenTeeth = []; { const r = rng(15); for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.ConeGeometry(0.034, 0.12, 7), toothM); m.userData.v = [(r() - .5) * 2.5, 1 + r() * 2.5, (r() - .5) * 2.5, r() * 10]; m.castShadow = true; scene.add(m); brokenTeeth.push(m); } }
// Frill-Bruchstücke
const frillBits = []; { const r = rng(25); for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(new THREE.TetrahedronGeometry(0.12 + r() * 0.12), new THREE.MeshStandardMaterial({ color: 0xb7a07a, flatShading: true })); m.userData.v = [(r() - .5) * 3, 1 + r() * 3, (r() - .5) * 3, r() * 10]; scene.add(m); frillBits.push(m); } }

// Zahn-Makro (Bananen-Vergleich + Sägekante)
const MAC = V(2000, 0, 0); const macro = new THREE.Group(); macro.position.copy(MAC); scene.add(macro);
{
  const toothG = new THREE.LatheGeometry(Array.from({ length: 24 }, (_, i) => { const t = i / 23; return new THREE.Vector2(0.42 * Math.pow(1 - t, 0.75) + 0.001, t * 2.6); }), 40);
  toothG.scale(1, 1, 0.62); const tooth = new THREE.Mesh(toothG, new THREE.MeshStandardMaterial({ color: 0xf1e6c8, roughness: 0.3 }));
  const rootM = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.3, 1.2, 40), new THREE.MeshStandardMaterial({ color: 0xc9b48a, roughness: 0.6 })); rootM.scale.z = 0.62; rootM.position.y = -0.6;
  const tg = new THREE.Group(); tg.add(tooth, rootM); tg.rotation.z = -0.15; tg.position.set(-0.55, -1.0, 0); macro.add(tg);
  const dentM = new THREE.MeshStandardMaterial({ color: 0xe6d6ae, roughness: 0.3 });
  const dents = [];
  for (const s of [-1, 1]) for (let i = 0; i < 22; i++) { const t = 0.05 + i / 22 * 0.88; const r = 0.42 * Math.pow(1 - t, 0.75) * 0.62; const d = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.09, 4), dentM); d.position.set(0, t * 2.6, s * (r + 0.02)); d.rotation.x = s * Math.PI / 2; d.rotation.z = 0.0; tg.add(d); dents.push(d); }
  macro.userData.dents = dents; macro.userData.tooth = tg;
  // Banane
  const curve = new THREE.CatmullRomCurve3([V(0, 0, 0), V(0.25, 0.9, 0), V(0.3, 1.8, 0), V(0.05, 2.7, 0)]);
  const banG = new THREE.TubeGeometry(curve, 40, 0.26, 16); const pp = banG.attributes.position;
  const ban = new THREE.Mesh(banG, new THREE.MeshStandardMaterial({ color: 0xf5d132, roughness: 0.5 })); ban.position.set(0.85, -1.4, -0.3); ban.rotation.z = 0.1; macro.add(ban);
  for (const p of [V(0, 0, 0), V(0.05, 2.7, 0)]) { const tip = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), new THREE.MeshStandardMaterial({ color: 0x5a4320 })); tip.position.copy(p); ban.add(tip); }
  macro.userData.ban = ban;
}
// Wippe
const seesaw = new THREE.Group(); scene.add(seesaw);
{ const m = new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true });
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 13), m); bar.renderOrder = 20; seesaw.add(bar);
  const tr = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.8, 3), m); tr.position.y = -0.44; tr.renderOrder = 20; seesaw.add(tr);
  const wHead = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), new THREE.MeshBasicMaterial({ color: 0xff4d4d, depthTest: false })); wHead.position.z = 6; wHead.renderOrder = 21; seesaw.add(wHead);
  const wTail = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), new THREE.MeshBasicMaterial({ color: 0x4dc3ff, depthTest: false })); wTail.position.z = -6; wTail.renderOrder = 21; seesaw.add(wTail);
  seesaw.userData = { m, wHead, wTail };
}

// ---------- UI ----------
const $ = id => document.getElementById(id);
const capEl = $('cap'), labEl = $('labels'), svgEl = $('svg'), badge = $('badge'), cta = $('cta');
let ui = [], svg = [];
function proj(p) { const v = p.clone().project(camera); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; }
function pill(text, x, y, k, color = '#f3c63f') { if (k <= 0) return; ui.push(`<div class="pill" style="left:${x}px;top:${y}px;border-color:${color};transform:translate(-50%,-50%) scale(${back(k)})">${text}</div>`); }
function label3(text, p, k, dx = 0, dy = -140) { if (k <= 0) return; const [x, y] = proj(p); const lx = x + dx, ly = y + dy;
  svg.push(`<g opacity="${clamp(k * 2)}"><line x1="${x}" y1="${y}" x2="${lerp(x, lx, ease(k))}" y2="${lerp(y, ly + 8, ease(k))}" stroke="#000" stroke-width="10" stroke-linecap="round"/><line x1="${x}" y1="${y}" x2="${lerp(x, lx, ease(k))}" y2="${lerp(y, ly + 8, ease(k))}" stroke="#fff" stroke-width="5" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="9" fill="#fff" stroke="#000" stroke-width="4"/></g>`);
  ui.push(`<div class="lab" style="left:${lx}px;top:${ly}px;transform:translate(-50%,-100%) scale(${back(k)})">${text}</div>`); }
function gauge(x, y, val, k, text, col) {
  if (k <= 0) return; const R = 150; const arc = (a0, a1, c) => { const p0 = [x + R * Math.cos(Math.PI + a0 * Math.PI), y + R * Math.sin(Math.PI + a0 * Math.PI)], p1 = [x + R * Math.cos(Math.PI + a1 * Math.PI), y + R * Math.sin(Math.PI + a1 * Math.PI)]; return `<path d="M${p0[0]} ${p0[1]} A${R} ${R} 0 0 1 ${p1[0]} ${p1[1]}" stroke="${c}" stroke-width="34" fill="none"/>`; };
  const ang = Math.PI + clamp(val) * Math.PI; const nx = x + (R - 30) * Math.cos(ang), ny = y + (R - 30) * Math.sin(ang);
  svg.push(`<g transform="translate(${x},${y}) scale(${back(k)}) translate(${-x},${-y})">
    <path d="M${x - R - 30} ${y + 10} A${R + 30} ${R + 30} 0 0 1 ${x + R + 30} ${y + 10} Z" fill="#fff" stroke="#000" stroke-width="8"/>
    ${arc(0.02, 0.33, '#e8483b')}${arc(0.34, 0.66, '#f3c63f')}${arc(0.67, 0.98, '#3ddc84')}
    <text x="${x}" y="${y - 62}" text-anchor="middle" font-family="M" font-weight="900" font-size="30" fill="#111">BEISSKRAFT</text>
    <line x1="${x}" y1="${y}" x2="${nx}" y2="${ny}" stroke="#111" stroke-width="12" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="16" fill="#111"/>
    <text x="${x}" y="${y + 92}" text-anchor="middle" font-family="M" font-weight="900" font-size="64" fill="${col}" stroke="#000" stroke-width="12" paint-order="stroke">${text}</text></g>`);
}

// ---------- Kamera ----------
let LOOK = V(0, 0, 0), CUT = 0, GT = 0, GI = 0;
function cam(pos, look, fov = 40, t = 0, shake = 0.03) {
  LOOK = look.clone();
  camera.position.copy(pos).add(V(Math.sin(t * 1.1) * shake, Math.sin(t * 1.7 + 1) * shake, Math.cos(t * 0.9) * shake));
  camera.fov = fov;
  // sanfte Kreisfahrt um den Blickpunkt (keine starren Standbilder) + kurzer Zoom-Push nach jedem Schnitt
  const u = GT - Math.max(S[GI].start, CUT); const off = camera.position.clone().sub(look).applyAxisAngle(V(0, 1, 0), 0.05 * u * (GI % 2 ? 1 : -1));
  if (GT > 0.3 && u < 0.35) { const k = easeOut(u / 0.35); off.multiplyScalar(1 + (1 - k) * 0.12); camera.fov += (1 - k) * 7; }
  camera.position.copy(look).add(off);
  camera.updateProjectionMatrix(); camera.lookAt(look); camera.updateMatrixWorld(true);
}

// ---------- Reset ----------
function resetWorld() {
  rex.root.visible = true; rex.root.position.set(0, 0, 0); rex.root.rotation.set(0, 0, 0); rex.ol.userData.u.uA.value = 0;
  tri.root.visible = false; tri.root.position.set(0, 0, 0); tri.root.rotation.set(0, 0, 0); tri.ol.userData.u.uA.value = 0; tri.frill.scale.set(1, 1, 1);
  bone.visible = false; rock.visible = false; boneHalves.forEach(h => { h.position.set(0, 0, 0); h.rotation.set(0, 0, 0); });
  crumbs.visible = dust.visible = false; brokenTeeth.forEach(m => m.visible = false); frillBits.forEach(m => m.visible = false);
  macro.visible = false; seesaw.visible = false; ground.visible = world.visible = sky.visible = true;
  scene.background = null; scene.fog.near = 40; scene.fog.far = 320;
  ui = []; svg = []; badge.style.display = 'none'; cta.style.display = 'none';
}

// ---------- Shots ----------
const TRI_POS = V(0, 0, 0);
const shots = [
  // 0: Hook – Biss in den Triceratops, Zähne brechen ab
  (T) => {
    const u = T - S[0].start; badge.style.display = T < 3.0 ? 'block' : 'none';
    tri.root.visible = true; tri.root.position.copy(TRI_POS); tri.root.rotation.y = Math.PI / 2; poseTri(tri, { t: T });
    const tBite = WT(0, 'beiß') - 0.1, tBreak = WT(0, 'brechen') - 0.05;
    const bite = ease((T - tBite) / 0.3); const jaw = lerp(0.65, 0.12, bite) + (T > tBreak ? 0.25 * ease((T - tBreak) / 0.3) : 0);
    rex.root.rotation.y = 0.15; poseRex(rex, { t: T, jaw, head: 0.35, pitch: 0.18, teeth: 1 });
    alignMouth(V(0.3, 2.85 - 0.25 * bite, -0.2 - 0.2 * bite)); sunAt(V(0, 0, 0));
    // abgebrochene Zähne
    const tb = T - tBreak; if (tb > 0) { const top = V(0.3, 2.8, -0.2); brokenTeeth.forEach((m, i) => { const v = m.userData.v; m.visible = tb < 2; m.position.set(top.x + v[0] * tb * 0.6, Math.max(0.05, top.y + v[1] * tb - 4.9 * tb * tb), top.z + v[2] * tb * 0.6); m.rotation.set(v[3] + tb * 8, tb * 5, 0); });
      rex.teeth.forEach((m, i) => { if (i % 3 === 0) m.scale.y *= 0.3; }); burst(crumbs, top, tb, { spread: 1.5, up: 3 }); }
    const camP = V(5.8, 3.6, -0.6);
    cam(camP.clone().add(V(-u * 0.12, 0, u * 0.1)), V(0.2, 2.8, -1.4), 42, T, tb > 0 ? 0.03 + 0.15 * Math.exp(-tb * 4) : 0.03);
    label3('DINOSAURIER', rex.headG.getWorldPosition(V(0, 0, 0)).add(V(0, 0.5, 0)), clamp((T - WT(0, 'dinos')) * 3), -60, -160);
    label3('TRICERATOPS', V(0, 2.4, -1.5), clamp((T - WT(0, 'triceratops')) * 3), 120, 260);
    pill('🦷 ZÄHNE BRECHEN AB', W / 2, 520, clamp((T - WT(0, 'knochen')) * 3), '#ff4d4d');
  },
  // 1: Zähne so groß wie Bananen, Sägekante
  (T) => {
    const u = T - S[1].start; const tG = WT(1, 'gezack') - 0.3;
    if (T < tG) {
      rex.root.rotation.y = -Math.PI / 2; const g = ease((T - WT(1, 'zähne') + 0.1) / 0.9); poseRex(rex, { t: T, jaw: 0.6, head: 0.1, teeth: lerp(0.8, 2.3, g) });
      sunAt(V(0, 0, 0)); const hp = rex.headG.getWorldPosition(V(0, 0, 0)); const mp = rex.mouthMark.getWorldPosition(V(0, 0, 0));
      cam(mp.clone().add(V(-0.35, 0.05, 3.7 - u * 0.15)), mp.clone().add(V(0, -0.1, 0)), 38, T, 0.015);
      pill('🍌 SO GROSS WIE BANANEN', W / 2, 520, clamp((T - WT(1, 'banan')) * 3));
      label3('BIS 30 CM', mp.clone().add(V(0.1, -0.35, 0.3)), clamp((T - WT(1, 'groß')) * 3), 200, 240);
    } else {
      CUT = tG; const v = T - tG; macro.visible = true; rex.root.visible = false; ground.visible = world.visible = sky.visible = false; scene.background = new THREE.Color(0x1e2f3d);
      sunAt(MAC); macro.userData.dents.forEach((d, i) => { d.scale.setScalar(Math.max(0.001, back((v - 0.2) * 3 - (i % 22) * 0.03))); });
      macro.userData.ban.visible = true;
      cam(MAC.clone().add(V(Math.sin(v * 0.3) * 1.2, 0.4, 4.8)), MAC.clone().add(V(0, 0.2, 0)), 42, T, 0.01);
      pill('🍌 SO GROSS WIE BANANEN', W / 2, 520, 1);
      label3('SÄGEKANTE', MAC.clone().add(V(-0.25, 0.6, 0.3)), clamp((T - WT(1, 'säge')) * 3), -180, -220);
    }
  },
  // 2: durch Knochen – aber Biss zu schwach
  (T) => {
    const u = T - S[2].start; const tA = WT(2, 'aber');
    bone.visible = true; rock.visible = true; rock.position.set(0, 0.6, 4.4); bone.position.set(0, 1.55, 4.4); bone.rotation.y = 0.2; sunAt(V(0, 0, 3));
    let jaw, head;
    if (T < tA) { const b = ease((u - 0.2) / 0.5); jaw = lerp(0.6, 0.1, b); head = 0.95; }
    else { CUT = tA; const s = (T - tA); jaw = 0.32 + Math.sin(s * 22) * 0.04 * clamp(s * 2); head = 0.95; }
    poseRex(rex, { t: T, jaw, head: 0.3, pitch: 0.22, teeth: 2.3 });
    alignMouth(V(0.0, 1.72, 4.4));
    if (T < tA) cam(V(4.4, 2.4, 6.2 - u * 0.1), V(0, 1.9, 3.9), 44, T, 0.02); else { const v = T - tA; cam(V(2.3 - v * 0.08, 1.95, 5.6 - v * 0.05), V(0, 1.72, 4.25), 40, T, 0.015); } // Detail: Zähne im Knochen
    const kk = clamp((T - WT(2, 'biss') + 0.2) * 3);
    gauge(W / 2, 430, lerp(0, 0.18, ease((T - WT(2, 'biss')) / 0.8)) + Math.sin(T * 20) * 0.01, kk, 'SCHWACH', '#ff4d4d');
    if (T < tA) pill('✅ DURCH KNOCHEN', W / 2, 1460, clamp((u - 0.4) * 3), '#3ddc84');
  },
  // 3: Schädel voller Löcher + Kiefermuskeln
  (T) => {
    const u = T - S[3].start; rex.root.rotation.y = -Math.PI / 2; sunAt(V(0, 0, 0));
    const sk = T > WT(3, 'schädel') - 0.15 ? 1 : 0;
    poseRex(rex, { t: T, jaw: 0.25, head: 0.05, teeth: 2.3, skull: sk, holes: clamp((T - WT(3, 'löcher') + 0.1) / 0.6), muscles: clamp((T - WT(3, 'kiefer') + 0.1) / 0.7) });
    rex.headG.updateMatrixWorld(true); { const d3 = END(3) - S[3].start; const zz = lerp(1.25, 0.35, ease(u / d3)); cam(rex.headG.localToWorld(V(3.6, 0.3, zz)), rex.headG.localToWorld(V(0, 0.0, zz)), 40, T, 0.015); }
    const h0 = rex.holes[4].getWorldPosition(V(0, 0, 0)); label3('LÖCHER', h0, clamp((T - WT(3, 'löcher')) * 3), -60, -260);
    const m0 = rex.muscles[2].getWorldPosition(V(0, 0, 0)); label3('MUSKELN', m0, clamp((T - WT(3, 'kiefer')) * 3), 160, 300);
    pill(sk ? '💀 LEICHTER SCHÄDEL' : '', W / 2, 520, sk ? clamp((T - WT(3, 'löcher')) * 3) : 0);
  },
  // 4: stärkster Biss – fast 6 Tonnen
  (T) => {
    const u = T - S[4].start; rex.root.rotation.y = -Math.PI / 2 + 0.5; sunAt(V(0, 0, 0));
    const snap = WT(4, 'biss') - 0.1; const jaw = T < snap ? lerp(0.25, 0.7, ease(u / 0.5)) : lerp(0.7, 0.0, clamp((T - snap) / 0.12));
    poseRex(rex, { t: T, jaw, head: 0.05, teeth: 2.3, skull: 1, holes: 1, muscles: 1 + (T > snap ? 0.15 * Math.exp(-(T - snap) * 3) : 0) });
    rex.headG.updateMatrixWorld(true);
    const sh = T > snap ? 0.12 * Math.exp(-(T - snap) * 5) : 0;
    cam(rex.headG.localToWorld(V(3.2, -0.15, 3.4)), rex.headG.localToWorld(V(0, -0.35, 0.7)), 42, T * 7, 0.01 + sh);
    const v = ease((T - snap) / 1.6); const tons = T > WT(4, 'sechs') - 0.1 ? 'FAST 6 TONNEN' : (v * 5.8).toFixed(1).replace('.', ',') + ' T';
    gauge(W / 2, 430, 0.18 + v * 0.8, 1, T < snap ? 'SCHWACH' : tons, T < snap ? '#ff4d4d' : '#3ddc84');
    pill('🏆 STÄRKSTER BISS ALLER LANDTIERE', W / 2, 1460, clamp((T - WT(4, 'stärk')) * 3));
  },
  // 5: Knochen wie Keks – aber Kopf kippt nach vorne
  (T) => {
    const u = T - S[5].start; const tA = WT(5, 'aber') - 0.1;
    if (T < tA) {
      bone.visible = true; rock.visible = true; rock.position.set(0, 0.6, 4.4); bone.position.set(0, 1.55, 4.4); bone.rotation.y = 0.2; sunAt(V(0, 0, 3));
      const tc = WT(5, 'knack') - 0.05; const jaw = T < tc ? 0.55 : lerp(0.55, 0.05, clamp((T - tc) / 0.1)) + (T > tc + 0.5 ? 0.3 * ease((T - tc - 0.5) / 0.3) : 0);
      poseRex(rex, { t: T, jaw, head: 0.3, pitch: 0.22, teeth: 2.3 }); alignMouth(V(0.0, 1.72, 4.4));
      const bt = T - tc - 0.05; if (bt > 0) { boneHalves.forEach((h, i) => { const s = i ? 1 : -1; h.position.set(s * bt * 1.4, Math.max(-1.45, bt * 2.5 - 4.9 * bt * bt), 0); h.rotation.z = s * bt * 3; }); burst(crumbs, V(0, 1.6, 4.4), bt, { spread: 2.2, up: 3.5 }); }
      cam(V(4.4, 2.4, 6.2), V(0, 1.9, 3.9), 44, T * 6, 0.02 + (bt > 0 ? 0.12 * Math.exp(-bt * 4) : 0));
      pill('🍪 WIE EINEN KEKS', W / 2, 520, clamp((T - WT(5, 'keks')) * 3));
    } else {
      CUT = tA; const v = T - tA; const tF = WT(5, 'gesicht') - 0.55; const f = ease((T - tF) / 0.45);
      rex.root.rotation.y = -Math.PI / 2; poseRex(rex, { t: T, jaw: 0.1, head: 0.1 + 0.4 * f, tail: 0.55, arm: 2.4, teeth: 2.3, pitch: 0 });
      rex.root.rotation.x = 0; rex.root.rotation.z = 0;
      // Kippen nach vorne um die Füße (Bär läuft entlang -x, vorne = -x)
      const tilt = lerp(0.04, 0.62, f) + (v < 0.6 ? Math.sin(v * 9) * 0.03 : 0); rex.root.rotation.set(0, -Math.PI / 2, 0); rex.root.rotateX(tilt);
      sunAt(V(0, 0, 0));
      const tp = T - (tF + 0.45); if (tp > 0) burst(dust, V(-5.4, 0.3, 0), tp, { spread: 2.5, up: 2, ring: true, life: 2 });
      cam(V(-6, 3.6, 18 - v * 0.3), V(-0.8, 2.4, 0), 44, T * 8, 0.02 + (tp > 0 ? 0.15 * Math.exp(-tp * 4) : 0));
      label3('SCHWERER KOPF', rex.headG.getWorldPosition(V(0, 0, 0)), clamp((T - WT(5, 'kopf')) * 3), 80, -260);
      pill('⚠️ KOPFLASTIG', W / 2, 520, clamp((T - WT(5, 'kippt')) * 3), '#ff4d4d');
    }
  },
  // 6: winzige Arme + langer Schwanz = Wippe
  (T) => {
    const u = T - S[6].start; const tArm = WT(6, 'arme'), tTail = WT(6, 'schwanz'), tBal = WT(6, 'ausbal');
    const arm = lerp(2.4, 1, ease((T - tArm) / 1.0)); const tail = lerp(0.55, 1.12, ease((T - tTail + 0.2) / 1.2));
    const tilt = lerp(0.62, 0.0, ease((T - tTail) / 1.6));
    poseRex(rex, { t: T, jaw: 0.1, head: 0.5 * (tilt / 0.62) + 0.05, tail, arm, teeth: 2.3 });
    rex.root.rotation.set(0, -Math.PI / 2, 0); rex.root.rotateX(tilt); sunAt(V(0, 0, 0));
    const armView = T < tTail - 0.3;
    if (armView) { const sp = rex.arms[1].getWorldPosition(V(0, 0, 0)); rex.torso.updateMatrixWorld(true); cam(sp.clone().add(V(-3.2, 0.2, 4.6)), sp.clone().add(V(0, -0.15, 0)), 30, T, 0.01);
      label3('WINZIGE ARME', sp.clone().add(V(-0.2, -0.4, 0)), clamp((T - WT(6, 'stummel') + 0.1) * 3), 120, 300); }
    else { CUT = tTail - 0.3; cam(V(-6.5, 4.0, 21.5), V(0, 2.8, 0), 46, T, 0.02);
      const k = clamp((T - WT(6, 'wippe') + 0.6) * 2.5); seesaw.visible = k > 0; seesaw.userData.m.opacity = k;
      seesaw.position.set(0, 3.1, 0.1); seesaw.rotation.set(0, -Math.PI / 2, 0); seesaw.rotateX(tilt * 0.9); seesaw.rotateX(0); seesaw.scale.set(1, 1, lerp(0.7, 1, k));
      label3('LANGER SCHWANZ', V(6.2, 2.4, 0), clamp((T - tTail) * 3), -60, -250);
      pill('⚖️ WIE EINE WIPPE', W / 2, 520, clamp((T - WT(6, 'wippe')) * 3)); }
  },
  // 7: sicher auf zwei Beinen
  (T) => {
    const u = T - S[7].start; rex.root.rotation.y = -Math.PI / 2; rex.root.position.set(4 - u * 1.6, 0, 0);
    poseRex(rex, { phase: T * 3.2, amp: 1, t: T, jaw: 0.08, head: 0.04, tail: 1.12, teeth: 2.3 }); sunAt(rex.root.position);
    const bp = rex.root.position; cam(V(bp.x - 5.5, 1.2, 14), V(bp.x - 0.5, 2.6, 0), 46, T, 0.04);
    const ph = (T * 3.2) % Math.PI; burst(dust, V(bp.x - 0.4, 0.1, 0.6), ph / 3.2 * 1.2, { spread: 1, up: 1, ring: true, life: 0.9 });
    pill('✅ PERFEKT AUSBALANCIERT', W / 2, 520, clamp((u - 0.2) * 3), '#3ddc84');
  },
  // 8: Triceratops läuft vorbei – Angriff
  (T) => {
    const u = T - S[8].start; tri.root.visible = true; const tL = WT(8, 'stürzt') - 0.1, tBite = WT(8, 'beißt') - 0.05;
    const triX = lerp(6, -1.5, clamp(u / (tBite - S[8].start + 0.2))); tri.root.position.set(triX, 0, 0); tri.root.rotation.y = -Math.PI / 2; poseTri(tri, { phase: T * 4, amp: T < tBite + 0.2 ? 1 : 0, t: T });
    tri.ol.userData.u.uA.value = clamp((T - WT(8, 'tricer')) * 4) * (1 - clamp((T - WT(8, 'tricer') - 1.2) * 3)) * 0.9;
    tri.root.updateMatrixWorld(true); const frillP = tri.frill.getWorldPosition(V(0, 0, 0)).add(V(0, 0.7, 0));
    const lunge = ease((T - tL) / (tBite - tL)); const bite = clamp((T - tBite) / 0.12);
    poseRex(rex, { phase: T * 3, amp: 1 - lunge, t: T, jaw: T < tBite ? lerp(0.1, 0.75, lunge) : lerp(0.75, 0.15, bite), head: lerp(0.05, 0.25, lunge), pitch: lerp(0, 0.2, lunge), tail: 1.12, teeth: 2.3 });
    const idle = V(triX - 1.5, 3.4, -6.0); const aim = frillP.clone().add(V(0, 0.2, -0.3)); rex.root.rotation.y = lerp(0.2, 0.25, lunge);
    alignMouth(idle.clone().lerp(aim, lunge)); sunAt(V(0, 0, 0));
    const bt = T - tBite; if (bt > 0) { tri.frill.scale.set(1, 1, 1); frillBits.forEach(m => { const v = m.userData.v; m.visible = bt < 2; m.position.set(frillP.x + v[0] * bt * 0.6, Math.max(0.05, frillP.y + v[1] * bt - 4.9 * bt * bt), frillP.z + v[2] * bt * 0.6); m.rotation.set(v[3] + bt * 6, bt * 4, 0); }); burst(crumbs, frillP, bt, { spread: 2, up: 3 }); }
    cam(V(triX + 1.5 - u * 0.1, 2.8, 14), V(triX - 0.5, 2.3, -1), 46, T * 8, 0.03 + (bt > 0 ? 0.18 * Math.exp(-bt * 4) : 0));
    label3('TRICERATOPS', V(triX + 0.5, 3.2, 0), clamp((T - WT(8, 'tricer')) * 3), 80, -220);
    pill('💥 DURCH DEN NACKENSCHILD', W / 2, 520, clamp((T - WT(8, 'nacken')) * 3), '#ff4d4d');
  },
  // 9: Glückwunsch – T-Rex
  (T) => {
    const u = T - S[9].start; const roar = ease((T - WT(9, 'trex') + 0.2) / 0.4);
    poseRex(rex, { t: T, jaw: lerp(0.08, 0.8, roar), head: lerp(0.05, -0.35, roar), tail: 1.12, teeth: 2.3, pitch: -0.05 * roar });
    rex.ol.userData.u.uA.value = clamp((T - WT(9, 'trex')) * 4) * 0.9; sunAt(V(0, 0, 0));
    const a = 0.7 + u * 0.12; const k9 = ease(u / 1.6); const hp = rex.headG.getWorldPosition(V(0, 0, 0)).add(V(0, 0, 0.6)); const R9 = lerp(5, 14, k9); cam(V(Math.sin(a) * R9, lerp(4.0, 1.3, k9), Math.cos(a) * R9 + lerp(3.2, 0, k9)), hp.clone().lerp(V(0, 3.0, 0.8), k9), 46, T, 0.02 + roar * 0.02);
    pill('🦖 T-REX', W / 2, 520, clamp((T - WT(9, 'trex')) * 3));
    cta.style.display = T > WT(9, 'trex') + 0.3 ? 'block' : 'none';
  },
];

// ---------- Untertitel ----------
function caption(T) {
  let cur = null;
  for (const s of S) for (let i = 0; i < s.words.length; i++) { const w = s.words[i]; const nx = s.words[i + 1] ? s.words[i + 1].s : s.end + 0.12; if (T >= w.s - 0.03 && T < nx) cur = w; }
  if (!cur) { capEl.textContent = ''; return; }
  capEl.textContent = cur.w.replace(/[.,!?;:]/g, '').toUpperCase();
  const k = clamp((T - cur.s + 0.03) / 0.09); capEl.style.transform = `scale(${lerp(1.18, 1, k)})`;
}
window.renderAt = (T) => {
  resetWorld(); let i = 0; for (let k = 0; k < S.length; k++) if (T >= S[k].start - 0.05) i = k;
  CUT = 0; GT = T; GI = i; scene.updateMatrixWorld(true); shots[i](T); scene.updateMatrixWorld(true);
  { const u = T - Math.max(S[i].start, CUT); renderer.domElement.style.filter = T > 0.3 && u < 0.12 ? `blur(${((1 - u / 0.12) * 7).toFixed(1)}px)` : 'none'; }
  renderer.render(scene, camera); labEl.innerHTML = ui.join(''); svgEl.innerHTML = svg.join(''); caption(T); return i;
};
await document.fonts.load('900 50px M'); await document.fonts.load('50px "Noto Color Emoji"');
window.renderAt(0.5); window.READY = true;
window.STATS = () => { let tris = 0, verts = 0, meshes = 0; const seen = new Set(); rex.root.traverse(o => { if (o.isMesh && !(o.material && o.material.side === THREE.BackSide)) { meshes++; const g = o.geometry; const n = g.index ? g.index.count / 3 : g.attributes.position.count / 3; tris += n * (o.isInstancedMesh ? o.count : 1); if (!seen.has(g)) { seen.add(g); verts += g.attributes.position.count * (o.isInstancedMesh ? o.count : 1); } } }); return { meshes, tris: Math.round(tris), verts }; };
