// "Wenn … du eine Anakonda baust" – komplett prozedurale 3D-Szene (Three.js)
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const W = 1080, H = 1920;
const TL = await (await fetch('build/timeline.json')).json();
const S = TL.sentences;

// ---------- Helpers ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = k => { k = clamp(k); return k * k * (3 - 2 * k); };
const easeOut = k => 1 - Math.pow(1 - clamp(k), 3);
const back = k => { k = clamp(k); const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
function vnoise(x, y, z) { const h = (i, j, k) => { let n = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453; return n - Math.floor(n); }; const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z); const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf); const L = (a, b, t) => a + (b - a) * t;
  return L(L(L(h(xi, yi, zi), h(xi + 1, yi, zi), u), L(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u), v), L(L(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u), L(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u), v), w); }
function fbm(x, y, z, o = 4) { let a = 0.5, f = 1, t = 0; for (let i = 0; i < o; i++) { t += a * vnoise(x * f, y * f, z * f); a *= 0.5; f *= 2.03; } return t; }
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
// Umgebungsverschattung: dunklere Falten, Achseln, Maulinneres -> mehr Tiefe
const composer = new EffectComposer(renderer); composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const gtao = new GTAOPass(scene, camera, W, H); gtao.blendIntensity = 0.9;
gtao.updateGtaoMaterial({ radius: 0.7, distanceExponent: 1.6, thickness: 1.2, scale: 1.25, samples: 12 });
gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
composer.addPass(gtao);
// Tiefenunschärfe für Nahaufnahmen (Fokus folgt dem Blickpunkt der Kamera)
const bokeh = new BokehPass(scene, camera, { focus: 5, aperture: 0.00022, maxblur: 0.0065 }); composer.addPass(bokeh);
composer.addPass(new OutputPass());
// Color Grading: mehr Kontrast, warme Lichter, kühlere Schatten, Vignette
const grade = new ShaderPass({ uniforms: { tDiffuse: { value: null }, uVig: { value: 1 } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uVig; varying vec2 vUv;
  void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; float l = dot(c, vec3(0.299, 0.587, 0.114));
    c = mix(c, c * vec3(0.96, 0.99, 1.05), smoothstep(0.5, 0.0, l)); c = mix(c, c * vec3(1.05, 1.0, 0.93), smoothstep(0.45, 1.0, l));
    c = (c - 0.5) * 1.09 + 0.5; l = dot(c, vec3(0.299, 0.587, 0.114)); c = mix(vec3(l), c, 1.1);
    vec2 d = vUv - 0.5; d.x *= 0.5625; float v = smoothstep(0.75, 0.3, length(d) * 1.3); c *= mix(1.0, mix(0.84, 1.0, v), uVig);
    gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0); }` }); composer.addPass(grade);

const hemi = new THREE.HemisphereLight(0xf3ede2, 0x4a5a2c, 1.5); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffd9a6, 3.1); // warme, tief stehende Sonne
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 120 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; scene.add(sun, sun.target);
function sunAt(p) { sun.position.copy(p).add(V(-26, 21, 24)); sun.target.position.copy(p); }

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
const skyU = { top: { value: new THREE.Color(0x9fb7cf) }, hor: { value: new THREE.Color(0xf2e3cc) } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
  vertexShader: 'varying vec3 p; void main(){p=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: 'uniform vec3 top,hor; varying vec3 p; void main(){float h=clamp(normalize(p).y*2.0,0.,1.); gl_FragColor=vec4(mix(hor,top,pow(h,0.6)),1.);}'
})); scene.add(sky);
scene.fog = new THREE.Fog(0xe9e0cf, 40, 320);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), new THREE.MeshStandardMaterial({ color: 0xffffff, map: grassTex, roughness: 0.95 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const world = new THREE.Group(); scene.add(world);
let GRASS = null; const GRASS_BASE = []; let grassHidden = new Set();
function hideNearGrass() { // Halme direkt vor der Linse ausblenden (sonst wirken sie wie riesige Stacheln)
  if (!GRASS || !GRASS.visible) return; const c = camera.position, P = new THREE.Vector3(), Z = new THREE.Matrix4().makeScale(0, 0, 0); const now = new Set();
  if (c.y < 3) for (let i = 0; i < GRASS_BASE.length; i++) { const e = GRASS_BASE[i].elements; const dx = e[12] - c.x, dz = e[14] - c.z; if (dx * dx + dz * dz < 4.0) now.add(i); }
  for (const i of grassHidden) if (!now.has(i)) GRASS.setMatrixAt(i, GRASS_BASE[i]); for (const i of now) GRASS.setMatrixAt(i, Z);
  grassHidden = now; GRASS.instanceMatrix.needsUpdate = true; }
{
  const r = rng(42);
  // Grashalme (instanziert) um den Drehort
  const blade = new THREE.BufferGeometry(); blade.setAttribute('position', new THREE.Float32BufferAttribute([-0.018, 0, 0, 0.018, 0, 0, -0.012, 0.13, 0.025, 0.012, 0.13, 0.025, 0.0, 0.27, 0.07], 3)); blade.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]); blade.computeVertexNormals();
  const bm = new THREE.MeshStandardMaterial({ color: 0x4b6a26, side: THREE.DoubleSide, roughness: 0.85 });
  const N = 42000; const im = new THREE.InstancedMesh(blade, bm, N); const m4 = new THREE.Matrix4(); const q = new THREE.Quaternion(); const col = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 34; const x = Math.cos(a) * d, z = Math.sin(a) * d + 4;
    q.setFromEuler(new THREE.Euler((r() - .5) * 0.5, r() * 6.3, (r() - .5) * 0.5)); const s = 0.6 + r() * 1.1;
    m4.compose(V(x, 0, z), q, V(s, s * (0.7 + r() * 0.8), s)); im.setMatrixAt(i, m4);
    col.setHSL(0.22 + r() * 0.05, 0.4, 0.2 + r() * 0.15); im.setColorAt(i, col); GRASS_BASE.push(m4.clone());
  }
  im.receiveShadow = true; world.add(im); GRASS = im;
  // Araukarien (wie Etagenbäume)
  const trunkM = new THREE.MeshStandardMaterial({ color: 0x5b4632, roughness: 0.9 });
  const leafM = new THREE.MeshStandardMaterial({ color: 0x46613a, roughness: 0.8 });
  const leafM2 = new THREE.MeshStandardMaterial({ color: 0x55703f, roughness: 0.8 });
  // Nadelbäume: Stamm + dunkler Kern + viele hängende Nadelzweige (instanziert)
  const needleTex = canvasTex(256, 128, (g, w, h) => { g.clearRect(0, 0, w, h); const rr = rng(11); g.strokeStyle = '#3b2e20'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 64); g.lineTo(250, 64); g.stroke();
    for (let x = 4; x < 250; x += 2.2) { const W = 58 * Math.pow(Math.sin(Math.PI * Math.min(1, x / 240) * 0.5 + 0.2), 1.2) * (1 - x / 300); for (const sg of [-1, 1]) for (let k = 0; k < 2; k++) {
      const L = W * (0.55 + rr() * 0.45); g.strokeStyle = ['#203a1c', '#2c4a22', '#36592a', '#476b33'][(rr() * 4) | 0]; g.lineWidth = 1.2 + rr() * 1.3; g.beginPath(); g.moveTo(x, 64); g.lineTo(x + 6 + rr() * 8, 64 + sg * L); g.stroke(); } } });
  const needleM = new THREE.MeshStandardMaterial({ map: needleTex, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.85 });
  const coreM = new THREE.MeshStandardMaterial({ color: 0x23361e, roughness: 0.95 });
  const branchG = new THREE.PlaneGeometry(1, 0.5, 6, 1); branchG.translate(0.5, 0, 0); branchG.rotateX(-Math.PI / 2); { const p = branchG.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setY(i, -0.35 * x * x); } branchG.computeVertexNormals(); }
  const branchMs = []; const r2 = rng(4242);
  const tree = (x, z, h) => {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * h / 10, 0.3 * h / 10, h, 9), trunkM); tr.position.y = h / 2; tr.castShadow = true; g.add(tr);
    const core = new THREE.Mesh(new THREE.ConeGeometry(h / 11, h * 0.72, 10), coreM); core.position.y = h * 0.62; core.castShadow = true; g.add(core);
    { const n0 = 4 + (r() * 4 | 0); for (let k = 0; k < n0; k++) r(); } // alte Zufallsfolge beibehalten (Farne/Stämme bleiben an ihrem Platz)
    const tiers = 11 + (r2() * 4 | 0);
    for (let k = 0; k < tiers; k++) { const f = k / tiers; const y = h * (0.28 + 0.72 * f); const len = (1 - f) * h / 4.2 + 0.5; const nb = 6 + (r2() * 3 | 0);
      for (let j = 0; j < nb; j++) { const yaw = j / nb * Math.PI * 2 + r2() * 0.6 + k; const droop = 0.15 + r2() * 0.35;
        const m4 = new THREE.Matrix4().compose(V(x, y + (r2() - .5) * 0.3, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, -droop, 'YXZ')), V(len * (0.8 + r2() * 0.4), 1, len * 0.5)); branchMs.push(m4); } }
    world.add(g);
  };
  for (let i = 0; i < 90; i++) { const a = r() * Math.PI * 2, d = 26 + r() * 150; tree(Math.cos(a) * d, Math.sin(a) * d, 9 + r() * 12); }
  { const im = new THREE.InstancedMesh(branchG, needleM, branchMs.length); branchMs.forEach((m, i) => im.setMatrixAt(i, m)); im.castShadow = true; im.receiveShadow = true; world.add(im); }
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
const BACK = new THREE.Color(0xae8a60), BELLY = new THREE.Color(0xeadbbb), STRIPE = new THREE.Color(0x7d5a3a);
function skinColor(ny, z, c, x = 0, y = 0) {
  const k = clamp((ny + 0.25) / 0.9); c.copy(BELLY).lerp(BACK, k);
  if (ny > 0.15 && Math.sin(z * 2.6 + Math.sin(z * 0.7) * 1.2) > 0.55) c.lerp(STRIPE, 0.22 * clamp((ny - 0.15) * 3));
  const n = Math.sin(x * 7.1 + z * 3.3) * Math.sin(y * 5.7 - z * 4.1) + 0.5 * Math.sin(x * 13 + y * 11 + z * 9);
  c.multiplyScalar(0.93 + 0.07 * n); if (ny > 0.3 && n > 0.95) c.lerp(STRIPE, 0.22);
  return c;
}
let COLB = 0; function colorize(geo, zOff = 0, us = 1.3, vs = 0.8) {
  geo.computeVertexNormals(); const p = geo.attributes.position, n = geo.attributes.normal; const cols = new Float32Array(p.count * 3); const c = new THREE.Color();
  if (geo.attributes.uv && (us !== 1 || vs !== 1)) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * us, uv.getY(i) * vs); }
  for (let i = 0; i < p.count; i++) { skinColor(Math.min(1, n.getY(i) * (1 - COLB * 0.5) + COLB), p.getZ(i) + zOff, c, p.getX(i), p.getY(i)); cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); return geo;
}
function colorFlat(geo, ny = 0.75) { colorize(geo); const col = geo.attributes.color, p = geo.attributes.position; const c = new THREE.Color(); for (let i = 0; i < col.count; i++) { skinColor(ny, 4 + p.getZ(i), c, p.getX(i), p.getY(i)); col.setXYZ(i, c.r, c.g, c.b); } return geo; }
const skinM = new THREE.MeshStandardMaterial({ vertexColors: true, map: scaleColTex, roughness: 0.48, bumpMap: scaleTex, bumpScale: 2.6 });
const skinVar = sh => { sh.fragmentShader = sh.fragmentShader
  .replace('#include <bumpmap_pars_fragment>', 'float gFine = 0.0;\nvec4 scaleSample(sampler2D t, vec2 uv) { vec4 a = texture2D(t, uv), b = texture2D(t, uv * 2.6 + vec2(0.37, 0.11)), c = texture2D(t, uv * 1.6 + vec2(0.71, 0.29)); return gFine < 0.5 ? mix(a, c, gFine * 2.0) : mix(c, b, gFine * 2.0 - 1.0); }\n' + THREE.ShaderChunk.bumpmap_pars_fragment.replaceAll('texture2D( bumpMap,', 'scaleSample( bumpMap,'))
  .replace('#include <map_fragment>', THREE.ShaderChunk.map_fragment.replace('texture2D( map,', 'scaleSample( map,'))
  .replace('void main() {', 'void main() {\n  gFine = smoothstep(0.30, 0.70, dot(vColor.rgb, vec3(0.333)));'); };
skinM.onBeforeCompile = skinVar; skinM.customProgramCacheKey = () => 'skinVar';
const cheekM = skinM.clone(); cheekM.side = THREE.DoubleSide; cheekM.onBeforeCompile = skinVar; cheekM.customProgramCacheKey = () => 'skinVar2';
const scuteM = new THREE.MeshStandardMaterial({ color: 0x5f3f25, roughness: 0.6, bumpMap: scaleTex, bumpScale: 1.0 });
const clawM = new THREE.MeshStandardMaterial({ color: 0x2b2520, roughness: 0.35 });
const toothM = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.38, clearcoat: 0.7, clearcoatRoughness: 0.22, sheen: 0.3, sheenColor: new THREE.Color(0xfff2d8) }); // Zahnschmelz-Glanz
const pinkM = new THREE.MeshStandardMaterial({ color: 0xc4566a, roughness: 0.5 });
const tongueM = new THREE.MeshStandardMaterial({ color: 0xd06a78, roughness: 0.45, bumpMap: scaleTex, bumpScale: 0.3 });
const throatM = new THREE.MeshStandardMaterial({ color: 0x2a0b0e, roughness: 0.9 });
const boneM = new THREE.MeshStandardMaterial({ color: 0xf1e9d6, roughness: 0.55 });
const skullBoneM = new THREE.MeshStandardMaterial({ color: 0xf1e9d6, roughness: 0.5, transparent: true, opacity: 0.9 }); // Röntgen: Zahnwurzeln sichtbar
const holeM = new THREE.MeshBasicMaterial({ color: 0x15100c });
const muscleTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#8f1f22'; g.fillRect(0, 0, w, h); const r = rng(9);
  for (let i = 0; i < 900; i++) { const x = r() * w; g.strokeStyle = r() < 0.5 ? 'rgba(60,8,12,0.55)' : 'rgba(205,85,80,0.45)'; g.lineWidth = 0.8 + r() * 2.2; g.beginPath(); g.moveTo(x, -5); g.bezierCurveTo(x + (r() - .5) * 14, h * 0.33, x + (r() - .5) * 14, h * 0.66, x + (r() - .5) * 10, h + 5); g.stroke(); }
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(235,215,200,0.85)'); gr.addColorStop(0.1, 'rgba(235,215,200,0)'); gr.addColorStop(0.9, 'rgba(235,215,200,0)'); gr.addColorStop(1, 'rgba(235,215,200,0.85)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const muscleM = new THREE.MeshPhysicalMaterial({ map: muscleTex, bumpMap: muscleTex, bumpScale: 2.2, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.3, emissive: 0x1a0003 }); // Muskelfasern + Sehnen an den Enden
const darkM = new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.3 });

// Loft entlang einer Wirbelsäule: keys [z, y, rx, ry]
const KEYS = [[-7.6, 2.15, 0.025, 0.03], [-6.6, 2.32, 0.08, 0.1], [-5.5, 2.5, 0.15, 0.2], [-4.3, 2.68, 0.25, 0.33], [-3.0, 2.86, 0.38, 0.49], [-1.8, 3.0, 0.54, 0.67], [-0.6, 3.08, 0.72, 0.88],
  [0.4, 3.0, 0.92, 1.14], [1.3, 2.88, 0.95, 1.2], [2.1, 3.02, 0.84, 1.06], [2.75, 3.3, 0.72, 0.9], [3.2, 3.6, 0.62, 0.78], [3.55, 3.84, 0.55, 0.68]];
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
const SE = 2.15; // Superellipsen-Exponent: etwas kantiger, knöcherner Querschnitt
const sgnPow = (v, p) => Math.sign(v) * Math.pow(Math.abs(v), p);
function headProf(upper, t) {
  let z, w, top, bot;
  if (upper) {
    z = lerp(-0.18, 1.62, t);
    w = t < 0.3 ? lerp(0.56, 0.44, t / 0.3) : t < 0.55 ? lerp(0.44, 0.35, (t - 0.3) / 0.25) : lerp(0.35, 0.31, (t - 0.55) / 0.45);
    top = t < 0.25 ? lerp(0.72, 0.6, t / 0.25) : lerp(0.6, 0.4, Math.pow((t - 0.25) / 0.75, 0.8));
    if (t > 0.42 && t < 0.9) top += 0.01 * Math.max(0, Math.sin((t - 0.42) * 42)); // raue Nasenknochen
    bot = 0.075;
  } else {
    z = lerp(-0.1, 1.67, t);
    w = lerp(0.52, 0.3, Math.pow(t, 0.9));
    top = 0.06;
    bot = t < 0.2 ? lerp(0.38, 0.46, t / 0.2) : lerp(0.46, 0.27, (t - 0.2) / 0.8); // massiver, tiefer Unterkiefer
  }
  const eb = t < 0.13 ? Math.sqrt(1 - Math.pow((0.13 - t) / 0.13, 2)) : 1;
  const ef = t > 0.84 ? Math.pow(Math.max(0, 1 - Math.pow((t - 0.84) / 0.16, 2)), 0.42) : 1; // stumpfe, kräftige Schnauze
  const e = eb * ef; return { z, w: w * e, top: top * e, bot: bot * e };
}
function headSurf(upper, t, phi, k = 1) {
  const p = headProf(upper, t); const c = Math.cos(phi), s = Math.sin(phi);
  return V(p.w * sgnPow(c, 2 / SE) * k, (s > 0 ? p.top : p.bot) * sgnPow(s, 2 / SE) * k, p.z);
}
function headNormal(upper, t, phi) { const p = headProf(upper, t); const q = headSurf(upper, t, phi); const h = q.y > 0 ? p.top : p.bot;
  return V(q.x / Math.max(1e-3, p.w * p.w), q.y / Math.max(1e-3, h * h), 0).normalize(); }
const MOUTH = new THREE.Color(0xb34e60), HEADTOP = new THREE.Color(0x7a5537);
function headGeo(upper) {
  const R = 56, SD = 40; const pos = [], idx = [], uv = [];
  for (let i = 0; i < R; i++) { const t = i / (R - 1); for (let j = 0; j < SD; j++) { const q = headSurf(upper, t, j / SD * Math.PI * 2); pos.push(q.x, q.y, q.z); uv.push(t * 1.1, j / SD * 1.1); } }
  for (let i = 0; i < R - 1; i++) for (let j = 0; j < SD; j++) { const a = i * SD + j, b = i * SD + (j + 1) % SD, c = a + SD, d = b + SD; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  colorize(g, 4, 1, 1); const n = g.attributes.normal, col = g.attributes.color; const c = new THREE.Color();
  for (let i = 0; i < n.count; i++) { const ny = n.getY(i); const m = upper ? clamp((-ny - 0.55) * 4) : clamp((ny - 0.55) * 4);
    if (m > 0) { c.setRGB(col.getX(i), col.getY(i), col.getZ(i)).lerp(MOUTH, m); col.setXYZ(i, c.r, c.g, c.b); }
    if (upper && ny > 0.5) { c.setRGB(col.getX(i), col.getY(i), col.getZ(i)).lerp(HEADTOP, clamp((ny - 0.5) * 2.5) * 0.55); col.setXYZ(i, c.r, c.g, c.b); } }
  return g;
}
// ---------- Zähne: dick, D-förmig, nach hinten gebogen, mit gezackten Schneidkanten ----------
function toothGeo(r) {
  // t=0: Wurzelende, t=0.3: Zahnfleischlinie, t=1: Spitze. Kräftig, D-förmig, bananenförmig nach hinten gebogen, gezackte Kanten
  const R = 36, SD = 18, curv = 0.3 + r() * 0.16, fat = 0.95 + r() * 0.25, dens = 13 + r() * 5; const pos = [], idx = [], col = [];
  const tint = new THREE.Color(0xd9c08a).lerp(new THREE.Color(0xf0e6cc), r()); const crown = new THREE.Color(0xf4ecd8).lerp(tint, 0.25), neck = new THREE.Color(0xcfae6c).lerp(tint, 0.3), rootC = new THREE.Color(0x9c7646), tipC = new THREE.Color(0xfbf8ef); const c = new THREE.Color();
  for (let i = 0; i < R; i++) { const t = i / (R - 1); const tp = clamp((t - 0.3) / 0.7), tr = clamp(t / 0.3); const y = 0.42 - 1.42 * t;
    let a, b; if (t < 0.3) { const k = Math.sin(tr * Math.PI / 2); a = 0.2 * fat * (0.5 + 0.5 * k); b = 0.15 * fat * (0.5 + 0.5 * k); }
    else { a = 0.27 * fat * Math.pow(1 - tp, 0.68) * (1 + 0.1 * Math.sin(tp * Math.PI)); b = 0.185 * fat * Math.pow(1 - tp, 0.8); }
    const zc = -curv * Math.pow(tp, 1.5) + 0.05 * Math.sin(tp * Math.PI);
    if (t < 0.3) c.copy(rootC).lerp(neck, tr); else { c.copy(neck).lerp(crown, clamp(tp * 1.6)); if (tp > 0.8) c.lerp(tipC, (tp - 0.8) * 3); }
    if (t >= 0.3 && tp < 0.12) c.multiplyScalar(0.86 + tp * 1.1);
    for (let j = 0; j < SD; j++) { const ph = j / SD * Math.PI * 2; const cw = Math.pow(Math.abs(Math.cos(ph)), 14);
      const saw = tp > 0.04 && tp < 0.93 ? Math.pow(0.5 + 0.5 * Math.sin(tp * Math.PI * 2 * dens), 3) : 0; const serr = 0.012 * cw * saw * (1 - tp * 0.5) + 0.006 * Math.cos(ph * 6) * (1 - tp);
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
const gumM = new THREE.MeshPhysicalMaterial({ color: 0xcf6c7e, roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.35, bumpMap: scaleTex, bumpScale: 0.25 });
function surfPlace(parent, mesh, upper, t, phi, k, sx, sy, thick) {
  const p = headSurf(upper, t, phi, k); const n = headNormal(upper, t, phi); mesh.position.copy(p); mesh.lookAt(p.clone().add(n)); mesh.scale.set(sx, sy, thick); parent.add(mesh); return mesh;
}

// ---------- T-Rex ----------
let EYE = null;
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
  const skullUp = new THREE.Mesh(upG, skullBoneM), skullLo = new THREE.Mesh(loG, skullBoneM); skull.add(skullUp); jawSkull.add(skullLo);
  // Mundraum
  const palate = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14), pinkM); palate.scale.set(0.3, 0.04, 0.75); palate.position.set(0, -0.06, 0.7); headG.add(palate);
  for (let k = 0; k < 8; k++) { const rg = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.3 - k * 0.018, 4, 8), pinkM); rg.rotation.z = Math.PI / 2; rg.position.set(0, -0.098, 0.3 + k * 0.11); headG.add(rg); } // Gaumenfalten
  const throat = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), throatM); throat.scale.set(0.3, 0.2, 0.34); throat.position.set(0, -0.14, 0.02); headG.add(throat); // dunkle, tiefe Mundhöhle
  const tongueG = new THREE.SphereGeometry(1, 28, 16); { const tp = tongueG.attributes.position; for (let i = 0; i < tp.count; i++) { const x = tp.getX(i), y = tp.getY(i), z = tp.getZ(i); tp.setXYZ(i, x * (0.75 + 0.25 * (1 - z) / 2), y + (y > 0 ? -0.35 * Math.exp(-x * x * 40) : 0), z); } tongueG.computeVertexNormals(); }
  const tongue = new THREE.Mesh(tongueG, tongueM); tongue.scale.set(0.25, 0.07, 0.62); tongue.position.set(0, 0.03, 0.82); jaw.add(tongue);
  const cheeks = [-1, 1].map(s => { const g = makeCheek(s); updateCheek(g, 0.05); const m = new THREE.Mesh(g, cheekM); m.castShadow = true; skin.add(m); return g; });
  const neckBlend = new THREE.Mesh(colorize(new THREE.SphereGeometry(1, 28, 20)), skinM); neckBlend.scale.set(0.56, 0.64, 0.5); neckBlend.position.set(0, -0.1, -0.22); skin.add(neckBlend); // Übergang Hals -> Kopf
  // Zähne + Zahnfleisch
  const r = rng(321); const geos = Array.from({ length: 8 }, () => toothGeo(r)); const teeth = [];
  const addTooth = (parent, x, y, z, size, lower, s) => { const m = new THREE.Mesh(geos[(r() * geos.length) | 0], toothM); m.position.set(x, y, z);
    m.rotation.set((r() - .5) * 0.14, (r() - .5) * 0.3, (lower ? Math.PI : 0) + s * (0.07 + r() * 0.06) * (lower ? -1 : 1)); m.userData.base = size * (0.78 + r() * 0.42); m.castShadow = true; parent.add(m); teeth.push(m);
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
    const mkGum = (pts, parent) => { const tg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.032, 10); const p = tg.attributes.position, n = tg.attributes.normal;
      for (let i = 0; i <= 120; i++) for (let j = 0; j <= 10; j++) { const id = i * 11 + j; const bump = 0.011 * Math.pow(0.5 + 0.5 * Math.sin(i / 120 * pts.length * Math.PI * 2), 1.5) + 0.003 * Math.sin(i * 1.7 + j); p.setXYZ(id, p.getX(id) + n.getX(id) * bump, p.getY(id) + n.getY(id) * bump, p.getZ(id) + n.getZ(id) * bump); }
      tg.computeVertexNormals(); const g = new THREE.Mesh(tg, gumM); g.scale.set(1, 0.85, 1); parent.add(g); }; // durchgehender, gewellter Zahnfleischwulst
    mkGum(gumUp, skin); mkGum(gumLo, jawSkin);  gumBulbsUp.length = 0; gumBulbsLo.length = 0;
  }
  // Augen: tief in der Augenhöhle, abgeflacht, Iris mit Schlitzpupille, Ober-/Unterlid, glänzende Hornhaut
  const irisTex = canvasTex(256, 256, (g) => { g.fillStyle = '#0b0703'; g.fillRect(0, 0, 256, 256); const gr = g.createRadialGradient(128, 128, 30, 128, 128, 112); gr.addColorStop(0, '#fff07a'); gr.addColorStop(0.55, '#ffd21f'); gr.addColorStop(0.9, '#e09a00'); gr.addColorStop(1, '#5a3300');
    g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 112, 0, 7); g.fill(); g.strokeStyle = 'rgba(150,90,0,0.35)'; for (let k = 0; k < 60; k++) { g.beginPath(); g.moveTo(128 + 40 * Math.cos(k / 60 * 6.283), 128 + 40 * Math.sin(k / 60 * 6.283)); g.lineTo(128 + 108 * Math.cos(k / 60 * 6.283), 128 + 108 * Math.sin(k / 60 * 6.283)); g.stroke(); }
    g.fillStyle = '#050302'; g.beginPath(); g.arc(128, 128, 44, 0, 7); g.fill(); });
  const irisM = new THREE.MeshStandardMaterial({ map: irisTex, roughness: 0.25 });
  const eyeBallM = new THREE.MeshStandardMaterial({ color: 0x1d1006, roughness: 0.4 });
  const corneaM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.02, metalness: 0.1, transparent: true, opacity: 0.2 });
  const socketM = new THREE.MeshStandardMaterial({ color: 0x24150c, roughness: 0.85 }); EYE = { irisM, eyeBallM, corneaM, socketM };
  const eyeGs = [];
  for (const s of [-1, 1]) {
    const P = a => s > 0 ? a : Math.PI - a; const phi = P(0.8), t = 0.2;
    const sock = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), socketM); surfPlace(skin, sock, true, t, phi, 0.975, 0.078, 0.062, 0.03);
    const ep = headSurf(true, t, phi, 0.975); const en = headNormal(true, t, phi); const eg = new THREE.Group(); eg.position.copy(ep); eg.lookAt(ep.clone().add(en.clone().add(V(0, 0.1, 0.25)).normalize())); eg.position.addScaledVector(en, 0.012); eg.scale.setScalar(1.45); headG.add(eg); eyeGs.push(eg);
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
    const mu = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), muscleM); surfPlace(skull, mu, true, 0.06, P(0.5), 1.0, 0.085, 0.3, 0.065); mu.rotateZ(s * 0.35); muscles.push(mu);
    const mu2 = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), muscleM); surfPlace(jawSkull, mu2, false, 0.1, s > 0 ? -0.35 : Math.PI + 0.35, 1.0, 0.08, 0.2, 0.06); mu2.rotateZ(-s * 0.3); muscles.push(mu2);
  }
  holes.push(...lowerHoles);
  // Öffnungen werden per Shader tatsächlich aus dem Knochen geschnitten (Blick ins Innere auf Zahnwurzeln und Muskeln)
  const holeData = list => { const out = []; for (const g of list) { g.updateMatrix(); const q = g.quaternion; const N = V(0, 0, 1).applyQuaternion(q), X = V(1, 0, 0).applyQuaternion(q);
      g.children.forEach(ch => { ch.visible = false; out.push({ c: ch.position.clone().applyQuaternion(q).add(g.position), n: N, x: X, s: new THREE.Vector2(ch.scale.x, ch.scale.y) }); }); } return out; };
  const holeK = [];
  const cutMat = list => { const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, side: THREE.DoubleSide, bumpMap: scaleTex, bumpScale: 0.15 }); const M = 12; const pad = a => { while (a.length < M) a.push(a[0]); return a; };
    const U = { uC: { value: pad(list.map(h => h.c)) }, uN: { value: pad(list.map(h => h.n)) }, uT: { value: pad(list.map(h => h.x)) }, uS: { value: pad(list.map(h => h.s)) }, uK: { value: 0 }, uCount: { value: list.length } }; holeK.push(U.uK);
    m.onBeforeCompile = sh => { Object.assign(sh.uniforms, U);
      sh.vertexShader = 'varying vec3 vObj;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vObj = transformed;');
      sh.fragmentShader = 'uniform vec3 uC[12]; uniform vec3 uN[12]; uniform vec3 uT[12]; uniform vec2 uS[12]; uniform float uK; uniform int uCount; varying vec3 vObj;\n' + sh.fragmentShader
        .replace('void main() {', 'void main() {\n for (int i = 0; i < 12; i++) { if (i >= uCount) break; vec3 d = vObj - uC[i]; float dn = dot(d, uN[i]); if (abs(dn) < 0.2) { vec3 ty = cross(uN[i], uT[i]); float a = dot(d, uT[i]) / (uS[i].x * uK + 1e-4); float b = dot(d, ty) / (uS[i].y * uK + 1e-4); if (a * a + b * b < 1.0) discard; } }')
        .replace('vec4 diffuseColor = vec4( diffuse, opacity );', `float hN = fract(sin(dot(floor(vObj * 55.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453);
          float hB = sin(vObj.x * 13.0 + vObj.y * 7.0) * sin(vObj.z * 9.0 - vObj.y * 11.0);
          vec3 bc = mix(vec3(0.80, 0.70, 0.52), vec3(0.95, 0.90, 0.78), smoothstep(-0.25, 0.35, vObj.y) * 0.7 + 0.3 * hB * 0.5 + 0.15) * (0.94 + 0.06 * hN);
          float sut = 1.0 - 0.55 * smoothstep(0.012, 0.0, abs(vObj.z - 0.05 + 0.025 * sin(vObj.y * 70.0) + 0.012 * sin(vObj.x * 130.0))) * step(0.05, vObj.y)
                         - 0.45 * smoothstep(0.01, 0.0, abs(vObj.z - 0.75 + 0.02 * sin(vObj.x * 90.0 + vObj.y * 40.0))) * step(0.0, vObj.y);
          vec4 diffuseColor = vec4( bc * sut * (gl_FrontFacing ? 1.0 : 0.38), opacity );`); };
    m.customProgramCacheKey = () => 'cut' + list.length; return m; };
  skullUp.material = cutMat(holeData(holes.slice(0, 8))); skullLo.material = cutMat(holeData(lowerHoles));
  const mouthMark = new THREE.Object3D(); mouthMark.position.set(0, -0.03, 0.9); headG.add(mouthMark);
  // Hinterbeine: massiver Oberschenkel mit Muskelgruppen, weicher Übergang zum Rumpf, Wadenmuskel, segmentierte Zehen mit Ballen + Afterkralle
  const legs = [];
  const loftL = (path, rad, us, vs, rings = 36, segs = 30) => { const curve = new THREE.CatmullRomCurve3(path); const pos = [], uv = [], idx = []; for (let i = 0; i <= rings; i++) { const u = i / rings; const p = curve.getPoint(u), T = curve.getTangent(u); const sd = V(1, 0, 0).addScaledVector(T, -T.x).normalize(), f = sd.clone().cross(T).normalize(); const [rx, rz] = rad(u); for (let j = 0; j <= segs; j++) { const a = j / segs * Math.PI * 2; const q = p.clone().addScaledVector(sd, Math.cos(a) * rx).addScaledVector(f, Math.sin(a) * rz); pos.push(q.x, q.y, q.z); uv.push(j / segs, u); } } for (let i = 0; i < rings; i++) for (let j = 0; j < segs; j++) { const a = i * (segs + 1) + j, b = a + 1, c = a + segs + 1, d = c + 1; idx.push(a, c, b, b, c, d); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return colorize(g, 0, us, vs); }; const capsG = (rad, len) => { const g = colorize(new THREE.CapsuleGeometry(rad, len, 6, 14)); g.translate(0, -len / 2, 0); return g; };
  const withOl = (parent, mesh) => { parent.add(mesh); const o = new THREE.Mesh(mesh.geometry, ol); o.position.copy(mesh.position); o.rotation.copy(mesh.rotation); o.scale.copy(mesh.scale); parent.add(o); return mesh; };
  const ell3 = (sx, sy, sz, seg = 28) => { const m = new THREE.Mesh(colorize(new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7))), skinM); m.scale.set(sx, sy, sz); m.castShadow = true; return m; };
  const toeClawG = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, 0, 0), V(0, -0.015, 0.06), V(0, -0.06, 0.1)]), 10, 0.024, 7);
  for (const s of [-1, 1]) { COLB = 0.45;
    const hb = ell3(0.5, 0.78, 0.98); hb.position.set(s * 0.46, -0.12, 0.02); withOl(torso, hb); // Hüftmuskulatur (Übergang)
    const hip = new THREE.Group(); hip.position.set(s * 0.62, 3.0, 0.1); root.add(hip);
    const thigh = new THREE.Mesh(colorize(new THREE.SphereGeometry(1, 40, 28), 0, 4.5, 3), skinM); thigh.scale.set(0.6, 1.1, 0.9); thigh.position.set(0, -0.6, 0.1); thigh.rotation.x = -0.3; thigh.castShadow = true; withOl(hip, thigh); const thighL = new THREE.Mesh(loftL([V(0, -0.45, 0.08), V(s * 0.02, -0.95, 0.3), V(0, -1.32, 0.45)], u => [lerp(0.5, 0.3, Math.pow(u, 0.8)), lerp(0.62, 0.33, Math.pow(u, 0.8))], 3, 1.2, 20, 30), skinM); thighL.castShadow = true; withOl(hip, thighL); // Oberschenkel-Muskelkeule + glatter Übergang zum Knie
    const quad = ell3(0.34, 0.6, 0.36); quad.position.set(s * 0.05, -0.78, 0.36); quad.rotation.x = -0.55; hip.add(quad); // Oberschenkelstrecker
    const knee = new THREE.Group(); knee.position.set(0, -1.3, 0.45); hip.add(knee);
    const kj = ell3(0.31, 0.3, 0.33, 20); knee.add(kj);
    const shinG = new THREE.Group(); shinG.rotation.x = 0.45; knee.add(shinG);
    const shinGeo = loftL([V(0, 0.08, 0), V(0, -0.4, -0.03), V(0, -0.85, -0.02), V(0, -1.2, 0)], u => [lerp(0.3, 0.17, u), lerp(0.32, 0.18, u) + 0.07 * Math.exp(-Math.pow((u - 0.3) / 0.2, 2))], 2.6, 1.8); const shin = new THREE.Mesh(shinGeo, skinM); shin.castShadow = true; withOl(shinG, shin);
    const calf = ell3(0.22, 0.5, 0.25); calf.position.set(0, -0.36, -0.1); withOl(shinG, calf); // Wadenmuskel
    const ankle = new THREE.Group(); ankle.position.set(0, -1.12, -0.55); knee.add(ankle);
    const aj = ell3(0.2, 0.18, 0.2, 18); ankle.add(aj);
    const metG = loftL([V(0, 0.06, 0), V(0, -0.45, 0.01), V(0, -0.97, 0)], u => [lerp(0.19, 0.15, u), lerp(0.17, 0.12, u) * (1 + 0.12 * Math.sin(u * Math.PI))], 1.8, 1.4, 20, 22);
    const met = new THREE.Mesh(metG, skinM); met.rotation.x = -0.35; met.castShadow = true; ankle.add(met);
    const foot = new THREE.Group(); foot.position.set(0, -0.88, 0.32); ankle.add(foot);
    const pad = ell3(0.26, 0.1, 0.25, 18); pad.position.set(0, -0.03, -0.02); foot.add(pad);
    for (const [ang, len] of [[-0.32, 0.85], [0, 1], [0.32, 0.85]]) {
      const toe = new THREE.Group(); toe.rotation.y = ang; foot.add(toe); let z = 0.04;
      [[0.1, 0.17], [0.088, 0.14], [0.075, 0.11]].forEach(([rad, l], k) => { const seg = new THREE.Mesh(capsG(rad, l * len), skinM); seg.rotation.x = -Math.PI / 2 - 0.08 * k; seg.position.set(0, -0.02 - k * 0.012, z); seg.castShadow = true; toe.add(seg);
        const tp = ell3(rad * 0.95, rad * 0.45, l * len * 0.45, 12); tp.position.set(0, -0.065 - k * 0.01, z + l * len * 0.5); toe.add(tp); z += l * len + 0.02; });
      const cl = new THREE.Mesh(toeClawG, clawM); cl.scale.setScalar(1.45); cl.position.set(0, -0.05, z - 0.03); cl.castShadow = true; toe.add(cl);
    }
    const dew = new THREE.Group(); dew.position.set(-s * 0.1, 0.16, -0.06); dew.rotation.y = -s * 1.2; foot.add(dew); const dt = new THREE.Mesh(capsG(0.035, 0.08), skinM); dt.rotation.x = -Math.PI / 2 - 0.4; dew.add(dt);
    const dc = new THREE.Mesh(toeClawG, clawM); dc.scale.setScalar(0.6); dc.position.set(0, -0.03, 0.1); dew.add(dc);
    legs.push({ hip, knee, ankle, s }); COLB = 0;
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
  return { root, torso, body, loftG, headG, jaw, skin, skull, jawSkin, jawSkull, eyeGs, teeth, holes, muscles, legs, arms, mouthMark, ol, palate, tongue, cheeks, holeK };
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
  r.teeth.forEach(m => { const b = m.userData.base; const L = Math.max(0.001, teeth * b) * TOOTH_L0; const th = Math.max(0.001, b * lerp(0.8, 1.5, clamp((teeth - 0.8) / 1.5))) * TOOTH_L0; m.scale.set(th, L, th); });
  r.skin.visible = r.jawSkin.visible = skull < 0.5; r.skull.visible = r.jawSkull.visible = skull >= 0.5; r.eyeGs.forEach(e => e.visible = skull < 0.5);
  r.holes.forEach(h => { h.visible = holes > 0; }); r.holeK.forEach(u => u.value = holes > 0 ? Math.max(0, back(holes * 1.3)) : 0);
  r.muscles.forEach((m, i) => { const k = back(muscles * 1.3 - i * 0.08); m.visible = muscles > 0; m.scale.set(...(m.userData.s ?? (m.userData.s = m.scale.toArray())).map(v => v * Math.max(0.001, k))); });
}
const rex = makeRex(); scene.add(rex.root);
// Maul auf Ziel ausrichten
function alignMouth(target) { rex.root.updateMatrixWorld(true); const p = rex.mouthMark.getWorldPosition(V(0, 0, 0)); rex.root.position.add(target.clone().sub(p)); rex.root.updateMatrixWorld(true); }
// ---------- Anakonda + Capybara ----------
const AR0 = 0.2, ALEN = 8.0; // Körperradius, Länge
// Fleckenmuster (u: entlang 4.8 Einheiten, v: Umfang; v=0.25 oben, 0.75 Bauch)
const snakeTex = canvasTex(2048, 512, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); [[0, '#5e5d30'], [0.08, '#73713f'], [0.14, '#a9a796'], [0.25, '#bcbcb0'], [0.36, '#a9a796'], [0.42, '#73713f'], [0.5, '#5e5d30'], [0.65, '#545429'], [0.75, '#4c4c25'], [0.85, '#545429'], [1, '#5e5d30']].forEach(([s, c]) => gr.addColorStop(s, c));
  g.fillStyle = gr; g.fillRect(0, 0, w, h); const r = rng(21);
  const blob = (x, y, rx, ry, col, a = 0) => { for (const dx of [-w, 0, w]) { g.beginPath(); g.ellipse(x + dx, y, rx, ry, a, 0, 7); g.fillStyle = col; g.fill(); } };
  g.globalAlpha = 0.1; for (let k = 0; k < 900; k++) { const y = 256 + (r() - 0.5) * 330; blob(r() * w, y, 10 + r() * 30, 6 + r() * 14, r() < 0.6 ? '#2e2f14' : '#9a9660', r() * 3); } // dezente Marmorierung
  g.globalAlpha = 0.12; for (let k = 0; k < 5000; k++) { g.fillStyle = r() < 0.5 ? '#000' : '#fff'; g.fillRect(r() * w, r() * h, 2, 2); } g.globalAlpha = 1; });
snakeTex.wrapS = snakeTex.wrapT = THREE.RepeatWrapping;
// Schuppen-Shader: Schuppen überlappen; bei Dehnung (aStretch) öffnen sich Lücken mit heller Zwischenhaut, optional Risse / Falten
const snakeU = { uTear: { value: 0 }, uFold: { value: 0 }, uGapK: { value: 0.35 }, uScaleN: { value: new THREE.Vector2(124, 66) } };
function snakeShader(sh) {
  Object.assign(sh.uniforms, snakeU);
  sh.vertexShader = 'attribute float aStretch; varying float vStretch;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vStretch = aStretch;');
  const fn = `uniform float uTear, uFold, uGapK; uniform vec2 uScaleN; varying float vStretch;
  float hsh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  vec4 scl(vec2 uv) { // x: Höhe, y: innen (0/1), z: Rand, w: Zellzufall
    vec2 p = uv * uScaleN; float row = floor(p.y); p.x += mod(row, 2.0) * 0.5; vec2 id = floor(p); vec2 f = fract(p) - 0.5;
    float belly = smoothstep(0.12, 0.2, fract(uv.y)) * (1.0 - smoothstep(0.3, 0.38, fract(uv.y)));
    float st = vStretch * uGapK; float r = 0.62 / (1.0 + 0.22 * st);
    vec2 q = f; q.y *= mix(1.0, 0.45, belly); float d = abs(q.x) * 0.72 + abs(q.y) * 0.95 + 0.12 * length(q);
    float ins = 1.0 - smoothstep(r - 0.06, r, d); float dome = ins * (0.55 + 0.45 * sqrt(max(0.0, 1.0 - d * d / (r * r)))) * (0.75 + 0.25 * (f.x + 0.5));
    return vec4(dome, ins, smoothstep(r - 0.16, r, d), hsh(id)); }
  float snakeH(vec2 uv) { vec4 s = scl(uv); float gap = 1.0 - s.y; float fold = gap * uFold * (0.5 + 0.5 * sin(uv.x * uScaleN.x * 6.2831 * 2.5)); return s.x * 0.9 + fold * 0.6; }\n`;
  sh.fragmentShader = sh.fragmentShader.replace('#include <bumpmap_pars_fragment>', fn + THREE.ShaderChunk.bumpmap_pars_fragment.replaceAll('texture2D( bumpMap, vBumpMapUv ).x', 'snakeH( vBumpMapUv )').replace('texture2D( bumpMap, vBumpMapUv + dSTdx ).x', 'snakeH( vBumpMapUv + dSTdx )').replace('texture2D( bumpMap, vBumpMapUv + dSTdy ).x', 'snakeH( vBumpMapUv + dSTdy )'))
    .replace('#include <map_fragment>', `#include <map_fragment>
    { vec4 s = scl(vMapUv); float gap = 1.0 - s.y; diffuseColor.rgb *= mix(1.0, 0.72, s.z * s.y) * (0.92 + 0.16 * s.w);
      vec3 skin = mix(vec3(0.16, 0.14, 0.12), vec3(0.42, 0.36, 0.31), uFold); float fo = uFold * (0.5 + 0.5 * sin(vMapUv.x * uScaleN.x * 6.2831 * 2.5)); skin *= 1.0 - 0.35 * fo;
      float tear = uTear * smoothstep(0.25, 0.6, vStretch) * step(0.68, hsh(floor(vMapUv * uScaleN * vec2(1.0, 0.5)))) ;
      diffuseColor.rgb = mix(diffuseColor.rgb, mix(skin, vec3(0.55, 0.04, 0.05), tear), gap * smoothstep(0.02, 0.15, vStretch * uGapK + uFold * 0.3)); }`);
}
const snakeM = new THREE.MeshStandardMaterial({ map: snakeTex, bumpMap: snakeTex, bumpScale: 1.6, roughness: 0.72, metalness: 0.0 });
snakeM.onBeforeCompile = snakeShader; snakeM.customProgramCacheKey = () => 'snake';
const headSkinM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, bumpMap: scaleTex, bumpScale: 1.2 });
const liningM = new THREE.MeshPhysicalMaterial({ color: 0xd98a8f, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.25, side: THREE.DoubleSide, bumpMap: muscleTex, bumpScale: 0.4 });
const ligM = new THREE.MeshPhysicalMaterial({ color: 0xe8909a, roughness: 0.3, clearcoat: 0.8, emissive: 0x2a0508 });
const aBoneM = new THREE.MeshStandardMaterial({ color: 0xf2ead8, roughness: 0.45, emissive: 0x2a2620 });
const fangM = new THREE.MeshPhysicalMaterial({ color: 0xf6f1e4, roughness: 0.25, clearcoat: 0.8 });
const trachM = new THREE.MeshPhysicalMaterial({ color: 0xe6a5aa, roughness: 0.35, clearcoat: 0.6 });
// ---- Kopf ----
const HL = 0.34; // halbe Kopflänge
const SACK_FLIP = true; const UPCUT = true; const UPH = V(0, -0.01, -0.26); // Drehpunkt Oberkiefer
const rotU = (P, ang) => { if (!ang) return P; const y = P.y - UPH.y, z = P.z - UPH.z, c = Math.cos(ang), s = Math.sin(ang); P.y = UPH.y + y * c + z * s; P.z = UPH.z - y * s + z * c; return P; };
const sackR = w => Math.max(0.08, w.r * 1.1 + 0.035);
const skullW = z => 0.14 * (1 - 0.42 * Math.pow(clamp((z + HL) / (2 * HL)), 1.6)); // halbe Breite entlang z
function headColor(x, y, z, ny, c) { // glattes Oliv, heller Lippen-/Kehlbereich
  c.set(0x5a592d); if (y > 0.06) c.lerp(new THREE.Color(0x52522a), 0.6); if (ny < -0.2 || y < 0.006) c.set(0xb0ad98); else if (y < 0.03 && Math.abs(x) > skullW(z) * 0.7) c.set(0x9c9872);
  c.multiplyScalar(0.92 + 0.16 * fbm(x * 14, y * 14, z * 14, 2)); return c; }
function colGeo(geo, fn) { geo.computeVertexNormals(); const p = geo.attributes.position, n = geo.attributes.normal, cols = [], c = new THREE.Color(); for (let i = 0; i < p.count; i++) { fn(p.getX(i), p.getY(i), p.getZ(i), n.getY(i), c); cols.push(c.r, c.g, c.b); } geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); return geo; }
function makeAna() {
  const root = new THREE.Group(); const ol = outlineMat(0xffe27a, 0.03);
  // Körper-Schlauch (dynamisch)
  const RINGS = 300, RS = 44; const bg = new THREE.BufferGeometry(); const n = (RINGS + 1) * (RS + 1);
  const pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), str = new Float32Array(n); const idx = [];
  for (let i = 0; i < RINGS; i++) for (let j = 0; j < RS; j++) { const a = i * (RS + 1) + j, b = a + 1, c = a + RS + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
  bg.setIndex(idx); bg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); bg.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); bg.setAttribute('aStretch', new THREE.BufferAttribute(str, 1));
  const body = new THREE.Mesh(bg, snakeM); body.castShadow = body.receiveShadow = true; body.frustumCulled = false; root.add(body); const bodyOl = new THREE.Mesh(bg, ol); bodyOl.frustumCulled = false; root.add(bodyOl);
  // Kopf
  const head = new THREE.Group(); root.add(head);
  const sg = new THREE.SphereGeometry(1, 56, 36); sg.rotateX(Math.PI / 2); { const p = sg.attributes.position; for (let i = 0; i < p.count; i++) { const X = p.getX(i), Y = p.getY(i), Z = p.getZ(i); const z = Z * HL; const f = clamp((z + HL) / (2 * HL));
    const w = skullW(z) * (Z > 0.92 ? Math.sqrt(Math.max(0.05, (1 - Z) / 0.08)) * 0.85 + 0.15 : 1); const top = 0.128 * (1 - 0.42 * Math.pow(f, 1.3));
    const yy = Y > 0 ? Math.pow(Y, 0.62) * top : Y * 0.04; p.setXYZ(i, Math.sign(X) * Math.pow(Math.abs(X), 0.75) * w, yy, z + (Y > 0 ? 0 : -0.01)); } }
  const skull = new THREE.Mesh(colGeo(sg, headColor), headSkinM); skull.castShadow = true; head.add(skull); skull.add(new THREE.Mesh(sg, ol));
  for (const s of [-1, 1]) { // Augen oben seitlich, Nasenlöcher oben auf der Schnauze
    const eg = new THREE.Group(); eg.position.set(s * 0.097, 0.06, 0.06); head.add(eg);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 18, 14), new THREE.MeshPhysicalMaterial({ color: 0xa8782a, roughness: 0.05, clearcoat: 1 })); eg.add(eye);
    const pup = new THREE.Mesh(new THREE.SphereGeometry(0.0225, 18, 14, 0, Math.PI * 2, 0, 0.5), new THREE.MeshBasicMaterial({ color: 0x050403 })); pup.rotation.x = -Math.PI / 2 - 0.2; pup.rotation.z = s * 0.6; pup.scale.set(0.35, 1, 1); eg.add(pup);
    const lid = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.009, 8, 20), headSkinM); colGeo(lid.geometry, (x, y, z, ny, c) => c.set(0x6a6836)); lid.rotation.set(Math.PI / 2 - 0.4, s * 0.5, 0); lid.position.y = 0.004; eg.add(lid);
    const nos = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), new THREE.MeshBasicMaterial({ color: 0x0b0b06 })); nos.position.set(s * 0.03, 0.036, 0.27); nos.scale.set(1, 0.6, 1.3); head.add(nos); }
  // ---- Zähne: kurz, kräftig an der Basis, nach hinten gebogen (Widerhaken) ----
  const fangG = (() => { const c = new THREE.CatmullRomCurve3([V(0, 0.25, 0.02), V(0, -0.45, -0.04), V(0, -0.85, -0.3), V(0, -1.0, -0.62)]); const SEG = 12, RAD = 8; const g = new THREE.TubeGeometry(c, SEG, 1, RAD, false); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const k = Math.floor(i / (RAD + 1)) / SEG; const cp = c.getPoint(k); const r = 0.24 * Math.pow(1 - k, 0.85) + 0.004; p.setXYZ(i, cp.x + (p.getX(i) - cp.x) * r * 0.8, cp.y + (p.getY(i) - cp.y) * r, cp.z + (p.getZ(i) - cp.z) * r); }
    g.computeVertexNormals(); const col = []; for (let i = 0; i < p.count; i++) { const k = Math.floor(i / (RAD + 1)) / SEG; const cc = new THREE.Color(0xe9dcc0).lerp(new THREE.Color(0xfffcf2), clamp(k * 1.4)); col.push(cc.r, cc.g, cc.b); } g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return g; })();
  const toothM = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.15, sheen: 0.3 });
  const gumM = new THREE.MeshPhysicalMaterial({ color: 0xb8606a, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2, bumpMap: muscleTex, bumpScale: 0.25 });
  const tRnd = rng(77); const upTeeth = [], gums = [];
  const palY = (u, z) => { const rho2 = Math.max(0, 1 - (z / HL) ** 2); const X = Math.pow(Math.min(1, Math.abs(u)), 4 / 3); return -0.035 * Math.sqrt(Math.max(0, rho2 - X * X)) - 0.003; }; // Gaumen direkt unter dem Schädel
  for (const s of [-1, 1]) {
    const gp = []; for (let k = 0; k <= 16; k++) { const z = lerp(-0.27, 0.3, k / 16); gp.push(V(s * skullW(z) * (0.9 - 0.25 * clamp((z - 0.22) / 0.1)), -0.006, z)); }
    const gum = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(gp), 60, 0.008, 8, false), gumM); head.add(gum); gums.push(gum);
    const pp = []; for (let k = 0; k <= 10; k++) { const z = lerp(-0.25, 0.16, k / 10); pp.push(V(s * skullW(z) * 0.5, palY(0.5 / 0.95, z) - 0.002, z)); }
    { const gm = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pp), 40, 0.005, 6, false), gumM); head.add(gm); gums.push(gm); }
    for (let k = 0; k < 15; k++) { const z = lerp(-0.25, 0.27, k / 14); const m = new THREE.Mesh(fangG, toothM); const xf = 0.9 - 0.25 * clamp((z - 0.22) / 0.1); m.position.set(s * skullW(z) * xf, -0.008, z); m.rotation.set(0, 0, s * 0.12); m.userData.s = 0.026 * (0.8 + 0.35 * clamp((z + 0.25) / 0.35)) * (0.85 + 0.3 * tRnd()); head.add(m); upTeeth.push(m); }
    for (let k = 0; k < 9; k++) { const z = lerp(-0.23, 0.15, k / 8); const m = new THREE.Mesh(fangG, toothM); m.position.set(s * skullW(z) * 0.5, palY(0.5 / 0.95, z) - 0.006, z); m.userData.s = 0.022 * (0.85 + 0.3 * tRnd()); head.add(m); upTeeth.push(m); }
  }
  const upper = new THREE.Group(); upper.position.copy(UPH); [...head.children].forEach(ch => { ch.position.sub(UPH); upper.add(ch); }); head.add(upper); // Oberkiefer-Gruppe, Drehpunkt = Kiefergelenk
  // ---- Unterkieferhälften: flache Knochenspange mit Lippenschuppen außen, Zahnfleisch oben ----
  const mandibles = []; const JL = 0.6;
  for (const s of [-1, 1]) {
    const mg = new THREE.Group(); mg.position.set(s * 0.125, 0.0, -0.3); head.add(mg);
    const path = [V(0, 0, 0), V(-s * 0.02, -0.01, 0.2), V(-s * 0.06, -0.015, 0.42), V(-s * 0.105, -0.012, JL)];
    const curve = new THREE.CatmullRomCurve3(path); const NS = 48, NR = 20; const mpos = [], muv = [], mcol = [], midx = []; const c = new THREE.Color();
    for (let i = 0; i <= NS; i++) { const k = i / NS; const cp = curve.getPoint(k); const T = curve.getTangent(k); const B = T.clone().cross(V(0, 1, 0)).normalize(); if (B.x * s < 0) B.negate(); const N = B.clone().cross(T).normalize(); if (N.y < 0) N.negate();
      const hh = lerp(0.025, 0.014, Math.pow(k, 0.8)) * (k > 0.93 ? Math.sqrt(1 - (k - 0.93) / 0.075 * 0.6) : 1), ww = lerp(0.017, 0.011, k) * (k < 0.05 ? 0.6 + 8 * k : 1);
      for (let j = 0; j <= NR; j++) { const an = j / NR * Math.PI * 2; const ca = Math.cos(an), sa = Math.sin(an); const ex = Math.sign(ca) * Math.pow(Math.abs(ca), 0.8), ey = Math.sign(sa) * Math.pow(Math.abs(sa), 0.8);
        const P = cp.clone().addScaledVector(N, -hh + ey * hh).addScaledVector(B, ex * ww); mpos.push(P.x, P.y, P.z); muv.push(k * 5, j / NR);
        if (sa > 0.75 && ca < 0.2) c.set(0xd59a9a); else if (sa > 0.75) c.set(0x9c9872); // Zahnfleisch oben
        else if (ca < -0.3) c.set(sa > 0.1 ? 0xc98d8f : 0xb3ae86); // Innenseite
        else if (sa > -0.35) { if (sa > 0.55) { c.set(0x9c9872); if ((k * 13 + 0.3) % 1 < 0.08 && k < 0.95) c.set(0x8d8960); } else c.set(0x5a592d); } // Lippenschuppen
        else c.set(sa < -0.8 ? 0xb0ad98 : 0x6e6c3e);
        c.multiplyScalar(0.88 + 0.24 * fbm(P.x * 40, P.y * 40, P.z * 40, 2)); mcol.push(c.r, c.g, c.b); } }
    for (let i = 0; i < NS; i++) for (let j = 0; j < NR; j++) { const a = i * (NR + 1) + j, b = a + 1, cc = a + NR + 1, d = cc + 1; midx.push(a, cc, b, b, cc, d); }
    const jg = new THREE.BufferGeometry(); jg.setIndex(midx); jg.setAttribute('position', new THREE.Float32BufferAttribute(mpos, 3)); jg.setAttribute('uv', new THREE.Float32BufferAttribute(muv, 2)); jg.setAttribute('color', new THREE.Float32BufferAttribute(mcol, 3)); jg.computeVertexNormals();
    const jaw = new THREE.Mesh(jg, headSkinM); jaw.castShadow = true; mg.add(jaw); const jol = new THREE.Mesh(jg, ol); mg.add(jol);
    const bone = new THREE.Mesh(jg, aBoneM); bone.visible = false; mg.add(bone);
    const teeth = []; for (let k = 0; k < 15; k++) { const u = 0.07 + k * 0.061; const p = curve.getPoint(u); const m = new THREE.Mesh(fangG, toothM); m.position.copy(p).add(V(0, 0.004, 0)); m.rotation.set(0, 0, Math.PI - s * 0.15); m.userData.s = 0.024 * (1.15 - 0.35 * u) * (0.85 + 0.3 * tRnd()); mg.add(m); teeth.push(m); }
    mandibles.push({ g: mg, s, jaw, jol, bone, teeth, curve });
  }
  const chin = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1, 10), aBoneM); chin.rotation.z = Math.PI / 2; chin.visible = false; head.add(chin); // verwachsenes Kinn (Röntgen)
  const lig = new THREE.Mesh(new THREE.BufferGeometry(), ligM); lig.frustumCulled = false; head.add(lig); // dehnbares Band
  // ---- Mundraum: Gaumen -> Rachen -> Mundboden (innen rosa, außen Kehlhaut) + Mundwinkel-Häute ----
  const mkSheet = (NU, NV, flip, su = 1.5, sv = 3) => { const g = new THREE.BufferGeometry(); const n = (NU + 1) * (NV + 1); const idx = [];
    for (let i = 0; i < NV; i++) for (let j = 0; j < NU; j++) { const a = i * (NU + 1) + j, b = a + 1, c2 = a + NU + 1, d = c2 + 1; if (flip) idx.push(a, c2, b, b, c2, d); else idx.push(a, b, c2, b, d, c2); }
    g.setIndex(idx); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); const uvs = new Float32Array(n * 2);
    for (let i = 0; i <= NV; i++) for (let j = 0; j <= NU; j++) { const k = i * (NU + 1) + j; uvs[k * 2] = i / NV * sv; uvs[k * 2 + 1] = j / NU * su; } g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2)); g.setAttribute('aStretch', new THREE.BufferAttribute(new Float32Array(n).fill(0.75), 1)); return g; };
  const innerM = new THREE.MeshPhysicalMaterial({ vertexColors: true, emissive: 0x3a0c10, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.22, bumpMap: muscleTex, bumpScale: 0.35, side: THREE.FrontSide });
  const outerM = snakeM.clone(); outerM.side = THREE.BackSide; outerM.onBeforeCompile = snakeShader; outerM.customProgramCacheKey = () => 'snakeB';
  const MU = 26, MV = 70; const lg = mkSheet(MU, MV, true, 0.8, 0.3); const lining = new THREE.Group(); head.add(lining);
  lining.add(new THREE.Mesh(lg, innerM)); var lgo = new THREE.Mesh(lg, outerM); lgo.castShadow = true; lining.add(lgo);
  const cornM = innerM.clone(); cornM.side = THREE.BackSide; // Mundwinkel: beidseitig rosa Schleimhaut, keine grüne Haut
  const corners = [-1, 1].map(s => { const g = mkSheet(12, 24, s < 0, 0.45, 0.13); const mi = new THREE.Mesh(g, innerM); lining.add(mi); const o = new THREE.Mesh(g, cornM); lining.add(o); return { s, g, mi, o }; });
  // Gedehnter Hautsack um die Beute (eine durchgehende Fläche vom Hals bis zu den Kieferspitzen)
  const SU = 64, SV = 44; const sackG = mkSheet(SU, SV, SACK_FLIP, 1, 1); const sinM = innerM.clone(); sinM.side = THREE.BackSide;
  const sack = new THREE.Group(); head.add(sack); const sko = new THREE.Mesh(sackG, snakeM); sko.castShadow = true; sack.add(sko); sack.add(new THREE.Mesh(sackG, sinM)); sack.visible = false; const lipM = new THREE.MeshPhysicalMaterial({ color: 0xd88a90, emissive: 0x3a0c10, roughness: 0.35, clearcoat: 0.6 }); const lips = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.BufferGeometry(), lipM); sack.add(m); return m; }); const cfill = [0, 1].map(() => { const g = mkSheet(8, 12, false, 0.3, 0.3); const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ vertexColors: true, emissive: 0x3a0c10, roughness: 0.3, clearcoat: 0.8, side: THREE.DoubleSide })); sack.add(m); return m; });
  // Luftröhre (Glottis) – Schnorchel mit Knorpelringen
  const trach = new THREE.Group(); head.add(trach); const tt = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.034, 1, 16, 1, true), trachM); tt.rotation.x = Math.PI / 2; trach.add(tt);
  const rings = []; for (let k = 0; k < 12; k++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.007, 6, 18), aBoneM); trach.add(r); rings.push(r); }
  const trTip = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.01, 8, 18), trachM); trach.add(trTip); trach.visible = false;
  root.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
  return { root, body, bodyOl, bg, RINGS, RS, head, skull, mandibles, upTeeth, gums, chin, lig, lining, lg, MU, MV, corners, lgo, sack, lips, cfill, upper, sg: sackG, SU, SV, palY, trach, tt, rings, trTip, ol, JL };
}
const ana = makeAna(); scene.add(ana.root);
// ---- Capybara ----
const furTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); const r = rng(33); for (let i = 0; i < 9000; i++) { const x = r() * w, y = r() * h; g.strokeStyle = r() < 0.5 ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.3)'; g.lineWidth = 1 + r(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 3, y + 6 + r() * 6); g.stroke(); } }, 1);
furTex.wrapS = furTex.wrapT = THREE.RepeatWrapping;
const furM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, bumpMap: furTex, bumpScale: 3.2, map: furTex });
furM.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', 'vec4 fT = texture2D(map, vMapUv); diffuseColor.rgb *= 0.82 + 0.36 * fT.r;'); };
function capyColor(x, y, z, ny, c) { c.set(0x7d5e40).lerp(new THREE.Color(0x5e4430), clamp(ny * 1.2)).lerp(new THREE.Color(0x96754f), clamp(-ny * 1.3)); c.multiplyScalar(0.9 + 0.2 * fbm(x * 4, y * 4, z * 4, 3)); return c; }
function makeCapy() {
  const root = new THREE.Group(); const g = new THREE.Group(); g.rotation.y = -Math.PI / 2; root.add(g); const ol = outlineMat(0xffe27a, 0.03);
  const ell = (geoFn, uvs = [3, 2]) => { const geo = geoFn; const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * uvs[0], uv.getY(i) * uvs[1]); return colGeo(geo, capyColor); };
  const add = (geo, p, s, rot = [0, 0, 0], parent = g) => { const m = new THREE.Mesh(geo, furM); m.position.set(...p); m.scale.set(...s); m.rotation.set(...rot); m.castShadow = true; parent.add(m); return m; };
  // Rumpf: tonnenförmig, hinten rund, Rücken leicht gewölbt
  const bgeo = new THREE.SphereGeometry(1, 48, 32); { const p = bgeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); p.setXYZ(i, x * 0.42 * (1 - 0.08 * z), y * 0.4 * (1 + 0.06 * (y > 0 ? 1 - z * z : 0)), z * 0.66); } }
  const body = add(ell(bgeo, [4, 3]), [0, 0.55, 0], [1, 1, 1]);
  // Kopf: groß, kastenförmig, stumpfe Schnauze
  const head = new THREE.Group(); head.position.set(0, 0.66, 0.6); g.add(head);
  const hgeo = new THREE.SphereGeometry(1, 40, 28); { const p = hgeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const f = (z + 1) / 2;
    const yy = Math.sign(y) * Math.pow(Math.abs(y), 0.7) * 0.2 * (1 - 0.12 * f) - 0.03 * f; p.setXYZ(i, Math.sign(x) * Math.pow(Math.abs(x), 0.7) * 0.165 * (1 - 0.1 * f), yy, z * 0.36 * (z > 0.85 ? 1 - (z - 0.85) * 0.6 : 1) + 0.12); } }
  add(ell(hgeo), [0, 0, 0], [1, 1, 1], [0.15, 0, 0], head);
  const mouthL = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.006, 6, 20, Math.PI), new THREE.MeshBasicMaterial({ color: 0x2a1c14 })); mouthL.position.set(0, -0.11, 0.43); mouthL.rotation.set(0.3, 0, Math.PI); head.add(mouthL);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), new THREE.MeshPhysicalMaterial({ color: 0x120c08, roughness: 0.05, clearcoat: 1 })); eye.position.set(s * 0.145, 0.1, 0.12); head.add(eye);
    const ear = add(colGeo(new THREE.SphereGeometry(1, 16, 12), (x, y, z, ny, c) => c.set(0x5a3a22)), [s * 0.1, 0.19, -0.1], [0.04, 0.045, 0.022], [0, s * 0.4, 0], head);
    const ns = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), new THREE.MeshBasicMaterial({ color: 0x150d08 })); ns.scale.set(0.6, 1, 0.5); ns.rotation.z = s * 0.4; ns.position.set(s * 0.045, 0.03, 0.465); head.add(ns); }
  // Beine
  const legs = []; for (const [x, z] of [[-0.22, 0.38], [0.22, 0.38], [-0.24, -0.38], [0.24, -0.38]]) { const l = new THREE.Group(); l.position.set(x, 0.42, z); g.add(l); legs.push(l);
    add(ell(new THREE.CylinderGeometry(0.1, 0.055, 0.44, 16), [2, 1]), [0, -0.18, 0], [1, 1, 1], [0, 0, 0], l); const ft = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ color: 0x2f2218, roughness: 0.7 })); ft.position.set(0, -0.4, 0.03); ft.scale.set(0.07, 0.035, 0.09); l.add(ft); }
  root.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
  return { root, g, head, legs, ol, body };
}
const capy = makeCapy(); scene.add(capy.root);
// Querschnittsradius des Capybaras entlang seiner Längsachse (lokal: +z = Kopf)
const CAPY_CY = 0.55;
function capyR(z) { const b = z > -0.66 && z < 0.66 ? 0.43 * Math.sqrt(1 - Math.pow(z / 0.66, 2)) : 0; const h = z > 0.34 && z < 1.1 ? 0.26 * Math.pow(Math.max(0, 1 - Math.pow((z - 0.72) / 0.38, 2)), 0.4) : 0; return Math.max(b, h); }
function capyY(z) { const b = z > -0.66 && z < 0.66 ? 0.43 * Math.sqrt(1 - Math.pow(z / 0.66, 2)) : 0; const h = z > 0.34 && z < 1.1 ? 0.26 * Math.pow(Math.max(0, 1 - Math.pow((z - 0.72) / 0.38, 2)), 0.4) : 0; return h > b ? CAPY_CY + 0.1 : CAPY_CY + 0.1 * clamp((z - 0.3) / 0.3); }
// ---- Pose ----
// opt: head (Vector3, Weltposition Kopfmitte), dir (Blickrichtung), trail(d) -> Kurs-Winkel, gape, spread, slide [L,R], teeth, xray, lig, trach, prey {x0 (Welt-x der Capybara-Nase), cy}, bulge (0..1 Radiuszuschlag), stretchK
function poseAna(a, o) {
  const { headPos, heading = 0, curve = d => 0, gape = 0.05, spread = 0, slide = [0, 0], teeth = 1, xray = 0, chinK = -1, lig = 0, trach = 0, trachAir = 0, trachX = 0, trachY = 0, jawJ = null, jawTW = null, floorSag = 0, trachSide = -1, wrap = null, jawK = 1, upLift = 0, preyX0 = null, cy = CAPY_CY, t = 0, quad = 0, pitch = 0, rest = false, bulgeScale = 1 } = o;
  // Kopf ausrichten
  const fwd = V(Math.cos(heading) * Math.cos(pitch), Math.sin(pitch), -Math.sin(heading) * Math.cos(pitch)); // heading 0 -> +x
  a.head.position.copy(headPos); a.head.quaternion.setFromUnitVectors(V(0, 0, 1), fwd);
  // Körper: vom Hinterkopf rückwärts integrieren
  const NK = HL * (wrap ? lerp(0.45, 0.85, jawK) : 0.45); a.NK = NK; const back0 = headPos.clone().addScaledVector(fwd, -NK); const pos = a.bg.attributes.position.array, uvA = a.bg.attributes.uv.array, stA = a.bg.attributes.aStretch.array;
  const step = ALEN / a.RINGS; let p = back0.clone(); let hd = heading; const pts = [], rads = [], strs = [], bfs = [];
  for (let i = 0; i <= a.RINGS; i++) { const d = i * step;
    // Radius: Hals -> Körper -> Schwanzspitze
    let r = AR0 * (d < 0.6 ? lerp(0.62, 1, ease(d / 0.6)) : d > ALEN - 2.6 ? Math.pow(Math.max(0.004, (ALEN - d) / 2.6), 0.85) : 1) * (1 + 0.08 * Math.sin(clamp((d - 0.3) / (ALEN - 3)) * Math.PI));
    let rb = r, y;
    let cyA = cy; if (preyX0 !== null) { const lz = (p.x - preyX0); const cz = 1.06 - lz; const pr = cz > -0.7 && cz < 1.12 ? capyR(cz) * 1.08 * bulgeScale : 0; if (pr > r) r = pr; cyA = capyY(cz); } // Beule (Capybara-Koordinate, Nase = +1.06)
    const inPrey = preyX0 !== null && r > rb * 1.05; y = inPrey && !rest ? cyA : r * 0.92;
    if (d < 1.3 && !inPrey) y = Math.max(y, lerp(back0.y, y, ease(d / 1.3)));
    let bfK = 1; if (wrap && d < 0.8) { const zl = -NK - d; const w = wrap(zl); const e = ease(clamp(d / 0.7)); bfK = e; const rS = lerp(sackR(w) * 1.012, r, e); if (rS > r) r = rS; y = lerp(headPos.y + w.cy + zl * Math.sin(pitch), y, e); }
    pts.push(V(p.x, y, p.z)); bfs.push(bfK); rads.push(r); strs.push(clamp((r / rb - 1) / 1.3));
    hd = heading + curve(d); const dir = V(-Math.cos(hd), 0, Math.sin(hd)); p.addScaledVector(dir, step); }
  // Höhe glätten (sanfte Übergänge an der Beule)
  for (let it = 0; it < 6; it++) for (let i = 1; i < pts.length - 1; i++) pts[i].y = Math.max(rads[i] * 0.92, (pts[i - 1].y + pts[i].y * 2 + pts[i + 1].y) / 4);
  a.spine = pts; a.rads = rads;
  for (let i = 0; i <= a.RINGS; i++) { const P = pts[i]; const T = (i < a.RINGS ? pts[i + 1].clone().sub(P) : P.clone().sub(pts[i - 1])).normalize().negate(); const side = T.clone().cross(V(0, 1, 0)).normalize(); const up = side.clone().cross(T).normalize();
    const r = rads[i]; for (let j = 0; j <= a.RS; j++) { const an = j / a.RS * Math.PI * 2; const ca = Math.cos(an), sa = Math.sin(an); const k = i * (a.RS + 1) + j;
      const bf = sa < 0 ? lerp(1, 0.85, bfs[i]) : 1; // Bauch etwas flacher
      pos[k * 3] = P.x + side.x * ca * r + up.x * sa * r * bf; pos[k * 3 + 1] = P.y + side.y * ca * r + up.y * sa * r * bf; pos[k * 3 + 2] = P.z + side.z * ca * r + up.z * sa * r * bf;
      uvA[k * 2] = i * step / 4.8; uvA[k * 2 + 1] = j / a.RS; stA[k] = strs[i]; } }
  a.bg.attributes.position.needsUpdate = a.bg.attributes.uv.needsUpdate = a.bg.attributes.aStretch.needsUpdate = true; a.bg.computeVertexNormals();
  // Unterkiefer
  const tOpen = xray ? 1 : clamp((Math.max(gape, spread * 1.5) - 0.09) / 0.2);
  a.mandibles.forEach((m, i) => { const s = m.s; m.g.position.set(s * (0.125 + spread * 0.25 * 0), -quad * 0.12, -0.3 + (slide[i] || 0)); m.g.rotation.set(gape, s * spread, 0);
    if (jawTW) { const p0 = m.g.position.clone(), q0 = m.g.quaternion.clone(); m.g.position.copy(jawJ[i]).add(V(0, 0, slide[i] || 0)); const tl = jawTW[i].clone().add(V(0, 0, slide[i] || 0)).sub(m.g.position).normalize(); m.g.quaternion.setFromUnitVectors(m.curve.getPoint(1).normalize(), tl);
      if (jawK < 1) { m.g.position.lerpVectors(p0, m.g.position, jawK); m.g.quaternion.slerpQuaternions(q0, m.g.quaternion.clone(), jawK); } }
    m.jaw.visible = m.jol.visible = !xray; m.bone.visible = !!xray; m.teeth.forEach(tm => tm.scale.setScalar(Math.max(0.0001, tm.userData.s * teeth * tOpen))); });
  a.upTeeth.forEach(tm => tm.scale.setScalar(Math.max(0.0001, tm.userData.s * teeth * tOpen))); a.gums.forEach(gm => gm.visible = tOpen > 0.02);
  a.upper.rotation.x = -upLift;
  a.head.updateMatrixWorld(true);
  // Kinnspitzen (Kopf-lokal)
  const tip = m => m.curve.getPoint(1).clone().applyMatrix4(m.g.matrix); const tL = tip(a.mandibles[0]), tR = tip(a.mandibles[1]);
  a.tips = [tL, tR];
  // verwachsenes Kinn / Bruch
  a.chin.visible = chinK >= 0; if (chinK >= 0) { const mid = tL.clone().add(tR).multiplyScalar(0.5); const len = tL.distanceTo(tR) + 0.04; a.chin.position.copy(mid); a.chin.scale.set(1, Math.max(0.05, len * (chinK > 0 ? 0.5 : 1)), 1); a.chin.rotation.set(0, 0, Math.PI / 2); }
  // Band
  a.lig.visible = lig > 0.01; if (a.lig.visible) { const mid = tL.clone().add(tR).multiplyScalar(0.5).add(V(0, -0.02 - 0.03 * clamp(tL.distanceTo(tR) * 3), 0.0)); const c = new THREE.CatmullRomCurve3([tL, mid, tR]); const th = 0.026 / Math.sqrt(1 + tL.distanceTo(tR) * 6); a.lig.geometry.dispose(); a.lig.geometry = new THREE.TubeGeometry(c, 20, th * lig, 10, false); }
  // Mundraum
  a.lining.visible = gape > 0.06 || spread > 0.02; if (a.lining.visible) {
    const M = a.mandibles.map(m => m.g.matrix); const mp = (i, k, out) => { const m = a.mandibles[i]; const p = m.curve.getPoint(clamp(k)).applyMatrix4(M[i]); return p; };
    const sepAt = k => mp(0, k).distanceTo(mp(1, k));
    const pal = (u, z) => { const w = skullW(z) * 0.93 * (1 - 0.25 * clamp((z - 0.22) / 0.1)); return rotU(V(u * w, a.palY(u, z) - 0.004, z), upLift); };
    const flo = (u, k) => { const L = mp(0, k), R = mp(1, k); const mid = L.clone().add(R).multiplyScalar(0.5); const inL = mid.clone().sub(L).normalize(); L.addScaledVector(inL, 0.012); R.addScaledVector(inL, -0.012); L.y -= 0.012; R.y -= 0.012;
      if (wrap) { const z = (L.z + R.z) / 2, w = wrap(z); const f = (u + 1) / 2; let tL = Math.atan2(L.y - w.cy, L.x), tR = Math.atan2(R.y - w.cy, R.x); if (tL > 0) tL -= Math.PI * 2; if (tR > Math.PI / 2) tR -= Math.PI * 2;
        let rad = lerp(Math.hypot(L.x, L.y - w.cy), Math.hypot(R.x, R.y - w.cy), f); rad += Math.max(0, w.r * 1.06 + 0.01 - rad) * Math.pow(Math.sin(Math.PI * f), 0.35); const an = lerp(tL, tR, f); return V(rad * Math.cos(an), w.cy + rad * Math.sin(an), lerp(L.z, R.z, f)); }
      const sep = L.distanceTo(R); const sag = Math.max(floorSag * (1 - 0.75 * clamp((k - 0.35) / 0.5)), Math.min(0.13, 0.012 + 0.2 * sep * sep)); const f = (u + 1) / 2; const P = L.lerp(R, f); P.y -= sag * (1 - u * u) - 0.007 * Math.exp(-((u / 0.18) ** 2)) * clamp((k - 0.3) / 0.2) * clamp((0.85 - k) / 0.1); return P; };
    const KF0 = 0.08, KF1 = 0.92, Z0 = -0.22;
    const pos = a.lg.attributes.position.array, col = a.lg.attributes.color.array; const cP = new THREE.Color(0xe8a0a4), cF = new THREE.Color(0xe39399), cT = new THREE.Color(0x3a090e), cS = new THREE.Color(0xc4ad58), cO = new THREE.Color(0x4f5424), c = new THREE.Color();
    for (let i = 0; i <= a.MV; i++) { const v = i / a.MV; for (let j = 0; j <= a.MU; j++) { const u = j / a.MU * 2 - 1; let P;
        if (v < 0.4) P = pal(u, lerp(0.29, Z0, v / 0.4));
        else if (v > 0.6) P = flo(u, lerp(KF0, KF1, (v - 0.6) / 0.4));
        else { const t = (v - 0.4) / 0.2; const P0 = pal(u, Z0), P2 = flo(u, KF0); const C = P0.clone().add(P2).multiplyScalar(0.5).add(V(0, 0, -0.16)); C.x *= 0.7;
          P = P0.multiplyScalar((1 - t) ** 2).addScaledVector(C, 2 * t * (1 - t)).addScaledVector(P2, t * t); }
        const k = i * (a.MU + 1) + j; pos[k * 3] = P.x; pos[k * 3 + 1] = P.y; pos[k * 3 + 2] = P.z;
        const dk = Math.exp(-(((v - 0.5) / 0.13) ** 2)); c.copy(v < 0.5 ? cP : cF).lerp(cT, dk * 0.92); c.multiplyScalar((1 - 0.22 * clamp((Math.abs(u) - 0.7) / 0.3)) * (v > 0.6 ? (0.86 + 0.14 * Math.cos(u * 22)) * (1 - 0.25 * Math.exp(-((u / 0.25) ** 2))) * (0.8 + 0.2 * clamp((v - 0.6) / 0.3)) : 1)); col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b; } }
    a.lg.attributes.position.needsUpdate = a.lg.attributes.color.needsUpdate = true; a.lg.computeVertexNormals();
    a.corners.forEach(({ s, g }) => { const i = s < 0 ? 0 : 1; const Ub = V(s * skullW(-0.27) * 0.92, -0.008, -0.27), Uf = V(s * skullW(-0.1) * 0.92, -0.008, -0.1); const Lb = mp(i, 0.03), Lf = mp(i, 0.32); Lb.y -= 0.01; Lf.y -= 0.01;
      const A = Ub.clone().add(Lb).multiplyScalar(0.5); const p = g.attributes.position.array, cc = g.attributes.color.array;
      const jz = mp(i, 0).z, tz = mp(i, 1).z;
      for (let ii = 0; ii <= 24; ii++) { const b = ii / 24; for (let j = 0; j <= 12; j++) { const t = j / 12; let P;
          if (wrap) { const z = lerp(-0.37, 0.29, b); const U = V(s * skullW(z) * 0.9, -0.01, z); const Lm = mp(i, clamp((z - jz) / (tz - jz), 0.01, 0.99)); Lm.y -= 0.012; const w = wrap(z); const C = V(0, w.cy, z);
            const dU = Math.hypot(U.x, U.y - w.cy), dL = Math.hypot(Lm.x, Lm.y - w.cy); const aU = Math.atan2(U.y - w.cy, Math.abs(U.x)), aL = Math.atan2(Lm.y - w.cy, Math.abs(Lm.x));
            let rad = lerp(dU, dL, t); rad += Math.max(0, w.r * 1.1 + 0.045 - rad) * Math.pow(Math.sin(Math.PI * t), 0.35); const an = lerp(aU, aL, t); P = V(s * rad * Math.cos(an), w.cy + rad * Math.sin(an), lerp(U.z, Lm.z, t)); }
          else { const S = Ub.clone().lerp(Lb, t); const mid = Uf.clone().add(Lf).multiplyScalar(0.5).lerp(A, 0.55);
          const E = Uf.clone().multiplyScalar((1 - t) ** 2).addScaledVector(mid, 2 * t * (1 - t)).addScaledVector(Lf, t * t); P = S.lerp(E, b); P.x += s * 0.012 * Math.sin(Math.PI * t) * Math.sin(Math.PI * b * 0.8); }
          const k = ii * 13 + j; p[k * 3] = P.x; p[k * 3 + 1] = P.y; p[k * 3 + 2] = P.z; c.copy(cF).lerp(cT, wrap ? 0.2 : 0.35 * (1 - b)); cc[k * 3] = c.r; cc[k * 3 + 1] = c.g; cc[k * 3 + 2] = c.b; } }
      g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = true; g.computeVertexNormals(); }); }
  const sk = !!wrap && a.lining.visible; a.sack.visible = sk; a.lgo.visible = !sk; a.corners.forEach(c => { c.mi.visible = c.o.visible = !sk; });
  if (sk) { const M = a.mandibles.map(m => m.g.matrix); const mp = (i, k) => a.mandibles[i].curve.getPoint(clamp(k)).applyMatrix4(M[i]); const jz = [0, 1].map(i => [mp(i, 0).z, mp(i, 1).z]);
    const pos = a.sg.attributes.position.array, uvA = a.sg.attributes.uv.array, col = a.sg.attributes.color.array, stS = a.sg.attributes.aStretch.array; const cI = new THREE.Color(0xd98a8f), cD = new THREE.Color(0x5a1418), c = new THREE.Color(); const Z0s = -a.NK - 0.012, Z1s = 0.3;
    const zh = (jz[0][0] + jz[1][0]) / 2 + 0.02; const kRow = []; const SU = a.SU, SA = 16; // Seitenbereiche j<=SA und j>=SU-SA; dazwischen Boden zwischen den Kieferhälften
    for (let i = 0; i <= a.SV; i++) { const z = lerp(Z0s, Z1s, i / a.SV); const w = wrap(z); const R = sackR(w); const gapK = clamp((z + 0.26) / 0.1); const sw = skullW(clamp(z, -HL, HL)) * 0.9;
      const aU = Math.atan2(-0.012 - w.cy, sw), dU = Math.hypot(sw, -0.012 - w.cy); const ph0 = lerp(Math.PI / 2, aU, gapK), ph1 = -Math.PI - ph0;
      // Seiten offen: vor dem Kiefergelenk keine Haut zwischen Ober- und Unterkiefer (nur schmale Lippen)
      const kO = ease(clamp((z - zh) / 0.07)); /* Mundwinkel direkt am Kiefergelenk */ kRow.push(kO); const lipQ = lerp(1, 0.04, kO); const rm = s => s <= 0.5 ? s * lipQ : 1 - (1 - s) * lipQ;
      const jw = [0, 1].map(s => { const kk = (z - jz[s][0]) / (jz[s][1] - jz[s][0]); const L = mp(s, clamp(kk)); let aJ = Math.atan2(L.y - w.cy, L.x); if (aJ > ph0) aJ -= Math.PI * 2; return kk < -0.05 || kk > 1.05 ? [aJ, null] : [aJ, Math.hypot(L.x, L.y - w.cy)]; });
      const aR = jw[1][0], aL = jw[0][0];
      for (let j = 0; j <= SU; j++) { let ph, e = 0;
        if (j <= SA) { const sp = rm(j / SA); ph = lerp(ph0, aR, sp); e = 1 - clamp(sp / 0.55); }
        else if (j >= SU - SA) { const sp = rm((SU - j) / SA); ph = lerp(ph1, aL, sp); e = 1 - clamp(sp / 0.55); }
        else ph = lerp(aR, aL, (j - SA) / (SU - 2 * SA));
        e = e * e * (3 - 2 * e); let rad = Math.max(lerp(R, dU, e * gapK), w.r * 1.06 + 0.014);
        for (const J of jw) if (J[1] !== null) { const wg = Math.exp(-(((ph - J[0]) / 0.32) ** 2)); rad -= Math.max(0, rad - (J[1] - 0.014)) * wg; }
        const k = i * (SU + 1) + j; const Pv = V(rad * Math.cos(ph), w.cy + rad * Math.sin(ph), z); if (upLift && (j <= SA / 2 || j >= SU - SA / 2)) rotU(Pv, upLift * clamp((z - zh + 0.06) / 0.12)); pos[k * 3] = Pv.x; pos[k * 3 + 1] = Pv.y; pos[k * 3 + 2] = Pv.z;
        uvA[k * 2] = (-a.NK - z) / 4.8; uvA[k * 2 + 1] = 0.5 - ph / (Math.PI * 2); stS[k] = clamp((rad / (AR0 * 0.62) - 1) / 1.3); c.copy(cI).lerp(cD, 0.5 * clamp((0.3 - z) / 0.5)); col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b; } }
    { const idx = [], cut = [SA / 2, SU - SA / 2 - 1]; for (let i = 0; i < a.SV; i++) for (let j = 0; j < SU; j++) { if ((kRow[i] > 0.001 || kRow[i + 1] > 0.001) && (cut.includes(j) || (UPCUT && (j < SA / 2 || j >= SU - SA / 2)))) continue; /* oberer Seitenstreifen neben dem Schädel weg */
        const A = i * (SU + 1) + j, B = A + 1, C = A + SU + 1, D = C + 1; if (SACK_FLIP) idx.push(A, C, B, B, C, D); else idx.push(A, B, C, B, D, C); } a.sg.setIndex(idx); }
    // rosa Lippensaum entlang der offenen Seitenränder (oben -> Mundwinkel -> unten)
    a.lips.forEach((lm, n) => { const cU = n ? SU - SA / 2 : SA / 2, cL = n ? cU - 1 : cU + 1; const P = k => V(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]); const pts = []; let i0 = kRow.findIndex(k => k > 0.001);
      if (i0 > 0) { if (!UPCUT) for (let i = a.SV; i >= i0; i--) pts.push(P(i * (SU + 1) + cU)); pts.push(P((i0 - 1) * (SU + 1) + cU).lerp(P((i0 - 1) * (SU + 1) + cL), 0.5)); for (let i = i0; i <= a.SV; i++) pts.push(P(i * (SU + 1) + cL)); }
      lm.visible = pts.length > 3; if (lm.visible) { lm.geometry.dispose(); lm.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, 0.009, 8, false); } });
    // Mundwinkel: fleischige rosa Falte zwischen Ober- und Unterlippe, nach innen eingezogen
    a.cfill.forEach((m, n) => { const cU = n ? SU - SA / 2 : SA / 2, cL = n ? cU - 1 : cU + 1; const i0 = kRow.findIndex(k => k > 0.001); m.visible = i0 > 0; if (!m.visible) return;
      let i1 = i0; while (i1 < a.SV && lerp(Z0s, Z1s, i1 / a.SV) < zh + 0.12) i1++; const g = m.geometry, gp = g.attributes.position.array, gc = g.attributes.color.array; const cA = new THREE.Color(0xd98a8f), cB = new THREE.Color(0x6a1a20), cc = new THREE.Color();
      const P = k => V(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]);
      for (let r = 0; r <= 12; r++) { const fi = lerp(i0 - 1, i1, r / 12), ia = Math.floor(fi), ib = Math.min(a.SV, ia + 1), ft = fi - ia;
        const U = P(ia * (SU + 1) + cU).lerp(P(ib * (SU + 1) + cU), ft), L = P(ia * (SU + 1) + cL).lerp(P(ib * (SU + 1) + cL), ft); const zz = U.z; const w = wrap(zz);
        const dep = 0.05 + 0.12 * (r / 12); // Falte zieht sich zur Mitte hin ein
        for (let q = 0; q <= 8; q++) { const t = q / 8; const X = U.clone().lerp(L, t); const toC = V(-X.x, w.cy - X.y, 0); const dl = toC.length(); if (dl > 1e-4) X.addScaledVector(toC, Math.min(dep * Math.pow(Math.sin(Math.PI * t), 0.6), dl * 0.6) / dl); X.z -= 0.03 * Math.sin(Math.PI * t) * (1 - r / 12);
          const k = r * 9 + q; gp[k * 3] = X.x; gp[k * 3 + 1] = X.y; gp[k * 3 + 2] = X.z; cc.copy(cA).lerp(cB, 0.55 * Math.sin(Math.PI * t) * (1 - r / 12)); gc[k * 3] = cc.r; gc[k * 3 + 1] = cc.g; gc[k * 3 + 2] = cc.b; } }
      g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = true; g.computeVertexNormals(); });
    a.sg.attributes.position.needsUpdate = a.sg.attributes.aStretch.needsUpdate = a.sg.attributes.uv.needsUpdate = a.sg.attributes.color.needsUpdate = true; a.sg.computeVertexNormals(); }
  // Luftröhre: schiebt sich am Mundboden nach vorn
  a.trach.visible = trach > 0.01; if (a.trach.visible) { const mid = tL.clone().add(tR).multiplyScalar(0.5); let base = V(0, mid.y * 0.5 + 0.01, -0.12); let tipP = V(trachX * trach, mid.y + 0.02 + trachY * trach, lerp(0.0, 0.42, trach) + mid.z * 0.4);
    if (trachSide === 9) { if (wrap) { const w = wrap(0.12); base.set(0, w.cy - w.r * 1.06 + 0.035, 0.12); tipP = base.clone().addScaledVector(V(0, 0.55, 1).normalize(), 0.06 + 0.42 * trach); } /* unten am Mundboden unter der Beute nach vorn */ else { base.set(0, -0.045, 0.06); tipP = base.clone().addScaledVector(V(0, 0.32, 1).normalize(), 0.06 + 0.46 * trach); } }
    if (trachSide >= 0 && trachSide < 9) { const m = a.mandibles[trachSide]; base.copy(m.curve.getPoint(0.4).applyMatrix4(m.g.matrix)).add(V(-m.s * 0.03, 0.03, 0)); tipP = base.clone().addScaledVector(V(m.s * 0.85, 0.45, 0.3).normalize(), 0.03 + 0.4 * trach); } const len = base.distanceTo(tipP);
    a.trach.position.copy(base).lerp(tipP, 0.5); a.trach.quaternion.setFromUnitVectors(V(0, 0, 1), tipP.clone().sub(base).normalize()); a.tt.scale.set(1, len, 1);
    a.rings.forEach((r, k) => { const f = (k + 0.5) / a.rings.length - 0.5; r.position.set(0, 0, f * len); r.visible = true; }); a.trTip.position.set(0, 0, len / 2); }
}
// ---- Effekte ----
function aParticles(n, size, color, seed) { const p = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ map: dotTex, size, color, transparent: true, depthWrite: false }));
  p.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); const r = rng(seed); p.userData.v = Array.from({ length: n }, () => [r() - .5, r() - .5, r() - .5, r()]); p.frustumCulled = false; scene.add(p); return p; }
const boneChips = aParticles(40, 0.03, 0xf4ecd8, 5), airP = aParticles(60, 0.035, 0xdff4ff, 7), redP = aParticles(30, 0.03, 0xa01010, 11);
function burstA(p, o, t, spread = 0.6, life = 0.8) { const a = p.geometry.attributes.position.array; p.visible = t > 0 && t < life; p.userData.v.forEach((v, i) => { const tt = clamp(t, 0, life); a[i * 3] = o.x + v[0] * spread * tt * 2; a[i * 3 + 1] = o.y + v[1] * spread * tt * 2 + 0.6 * tt - 2.5 * tt * tt; a[i * 3 + 2] = o.z + v[2] * spread * tt * 2; }); p.geometry.attributes.position.needsUpdate = true; p.material.opacity = 1 - clamp(t / life); }
function airFlow(p, from, to, t) { const a = p.geometry.attributes.position.array; p.visible = true; p.material.opacity = 0.85; p.userData.v.forEach((v, i) => { const k = (t * 0.9 + v[3]) % 1; const q = from.clone().lerp(to, k); a[i * 3] = q.x + v[0] * 0.06 * (1 - k); a[i * 3 + 1] = q.y + v[1] * 0.06 * (1 - k); a[i * 3 + 2] = q.z + v[2] * 0.06 * (1 - k); }); p.geometry.attributes.position.needsUpdate = true; }
// ---------- UI ----------
const $ = id => document.getElementById(id);
const capEl = $('cap'), labEl = $('labels'), svgEl = $('svg'), badge = $('badge'), cta = $('cta');
let ui = [], svg = [];
function proj(p) { const v = p.clone().project(camera); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; }
function pill(text, x, y, k, color = '#f3c63f') { return; if (k <= 0) return; ui.push(`<div class="pill" style="left:${x}px;top:${y}px;border-color:${color};transform:translate(-50%,-50%) scale(${back(k)})">${text}</div>`); }
function label3(text, p, k, dx = 0, dy = -140) { if (k <= 0) return; const [x, y] = proj(p); const half = text.length * 13 + 20; const lx = clamp(x + dx, half + 30, W - half - 30), ly = clamp(y + dy, 120, H - 120);
  const ex = lerp(lx, x, ease(k)), ey = lerp(ly + 6, y, ease(k)); const ang = Math.atan2(ey - (ly + 6), ex - lx); const ah = (a, r) => `${ex - Math.cos(ang + a) * r},${ey - Math.sin(ang + a) * r}`;
  svg.push(`<g opacity="${clamp(k * 2)}"><line x1="${lx}" y1="${ly + 6}" x2="${ex}" y2="${ey}" stroke="#3a3a3a" stroke-width="7" stroke-linecap="round"/><line x1="${lx}" y1="${ly + 6}" x2="${ex}" y2="${ey}" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
    <polygon points="${ex},${ey} ${ah(0.45, 22)} ${ah(-0.45, 22)}" fill="#fff" stroke="#3a3a3a" stroke-width="3"/></g>`);
  ui.push(`<div class="lab" style="left:${lx}px;top:${ly}px;transform:translate(-50%,-100%) scale(${back(k)})">${text}</div>`); }
function gauge(x, y, val, k, text, col) {
  if (k <= 0) return; const R = 150; const arc = (a0, a1, c) => { const p0 = [x + R * Math.cos(Math.PI + a0 * Math.PI), y + R * Math.sin(Math.PI + a0 * Math.PI)], p1 = [x + R * Math.cos(Math.PI + a1 * Math.PI), y + R * Math.sin(Math.PI + a1 * Math.PI)]; return `<path d="M${p0[0]} ${p0[1]} A${R} ${R} 0 0 1 ${p1[0]} ${p1[1]}" stroke="${c}" stroke-width="34" fill="none"/>`; };
  const ang = Math.PI + clamp(val) * Math.PI; const nx = x + (R - 30) * Math.cos(ang), ny = y + (R - 30) * Math.sin(ang);
  svg.push(`<g transform="translate(${x},${y}) scale(${back(k) * 0.78}) translate(${-x},${-y})">
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

// ---------- Uferstelle: sandiger Platz am Wasser ----------
{ const sandTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#b39a72'; g.fillRect(0, 0, w, h); const r = rng(8); for (let i = 0; i < 14000; i++) { const v = r(); g.fillStyle = v < .4 ? 'rgba(90,70,45,0.25)' : v < .8 ? 'rgba(220,200,160,0.25)' : 'rgba(60,50,35,0.35)'; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); } }, 6);
  const sand = new THREE.Mesh(new THREE.CircleGeometry(9.5, 96), new THREE.MeshStandardMaterial({ map: sandTex, roughness: 0.95, bumpMap: sandTex, bumpScale: 1.5, transparent: false }));
  { const p = sand.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); const a = Math.atan2(y, x); const rr = 1 + 0.18 * Math.sin(a * 5) + 0.1 * Math.sin(a * 11); p.setXY(i, x * rr, y * rr); } }
  ground.geometry.dispose(); ground.geometry = new THREE.PlaneGeometry(1400, 1400, 280, 280); ground.position.y = -0.02;
  ground.material.polygonOffset = true; ground.material.polygonOffsetFactor = 2; ground.material.polygonOffsetUnits = 8; // Gras nie über den Sand flackern lassen
  sand.rotation.x = -Math.PI / 2; sand.position.set(0.5, 0.012, -0.5); sand.receiveShadow = true; world.add(sand);
  const river = new THREE.Mesh(new THREE.PlaneGeometry(80, 9), new THREE.MeshStandardMaterial({ color: 0x6f8f86, roughness: 0.06, metalness: 0.3 })); river.rotation.x = -Math.PI / 2; river.position.set(0, 0.025, -9.5); world.add(river);
  const mud = new THREE.Mesh(new THREE.PlaneGeometry(80, 1.6), new THREE.MeshStandardMaterial({ color: 0x5e4c36, roughness: 0.5 })); mud.rotation.x = -Math.PI / 2; mud.position.set(0, 0.02, -4.6); world.add(mud);
  const Z0 = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < GRASS_BASE.length; i++) { const e = GRASS_BASE[i].elements; const dx = e[12] - 0.5, dz = e[14] + 0.5; if (dx * dx + dz * dz < 81 || e[14] < -4) { GRASS_BASE[i] = Z0.clone(); GRASS.setMatrixAt(i, Z0); } } GRASS.instanceMatrix.needsUpdate = true;
  // ein paar Grasbüschel am Rand der Sandfläche
  const tuftM = new THREE.MeshStandardMaterial({ color: 0x5d7a2e, side: THREE.DoubleSide, roughness: 0.8 }); const r = rng(77);
  for (let k = 0; k < 26; k++) { const a = r() * Math.PI * 2, d = 8.6 + r() * 2.2; const tf = new THREE.Group(); tf.position.set(0.5 + Math.cos(a) * d, 0, -0.5 + Math.sin(a) * d); if (tf.position.z < -3.6) continue;
    for (let j = 0; j < 9; j++) { const b = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.45 + r() * 0.35, 3), tuftM); b.position.set((r() - .5) * 0.25, 0.25, (r() - .5) * 0.25); b.rotation.set((r() - .5) * 0.6, r() * 3, (r() - .5) * 0.6); tf.add(b); } world.add(tf); } }

// ---------- Reset ----------
const PREY_X0 = 0.3; // Welt-x der Capybara-Nase (Capybara schaut nach -x, zur Schlange)
function resetWorld() {
  rex.root.visible = false; ana.root.visible = true; capy.root.visible = true; ana.ol.userData.u.uA.value = 0; capy.ol.userData.u.uA.value = 0;
  capy.root.position.set(PREY_X0 + 1.06, 0, 0); capy.root.rotation.set(0, 0, 0); capy.legs.forEach(l => { l.scale.setScalar(1); l.rotation.set(0, 0, 0); }); capy.head.rotation.set(0, 0, 0);
  snakeU.uTear.value = 0; snakeU.uFold.value = 0; snakeU.uGapK.value = 0.35;
  [boneChips, airP, redP].forEach(p => p.visible = false);
  ground.visible = world.visible = sky.visible = true; scene.background = null; scene.fog.near = 40; scene.fog.far = 320;
  ui = []; svg = []; badge.style.display = 'none'; cta.style.display = 'none';
}
const restCurve = d => 0.75 * Math.sin((d - 1.6) * 0.75) * clamp((d - 1.2) / 1.2); // S-Kurve hinter der Beute
// Kopf über der Beute: Fortschritt p (0 = Nase berührt, 1 = ganz verschluckt)
function engulf(p, T, extra = {}) {
  const hx = lerp(PREY_X0 - 0.3, PREY_X0 + 2.12, p); const kIn = ease(clamp((p + 0.12) / 0.14)); const openK = extra.openK === undefined ? 1 : extra.openK; delete extra.openK;
  const hc = lerp(PREY_X0 - 0.3, PREY_X0 + 2.12, Math.max(p, 0.06)); const cz = 1.06 - (hc - PREY_X0), cMouth = 1.06 - (hc + 0.2 - PREY_X0);
  const rc = Math.max(capyR(cz), capyR(cMouth), capyR(cz - 0.2)); const cyH = capyY(cz); const jl = 0.6;
  const hy = lerp(lerp(0.14, 0.4, openK), cyH + rc * 1.05 + 0.04, kIn); const gape = lerp(lerp(0.05, 0.85, openK), Math.asin(clamp(rc * 1.5 / jl, 0, 0.98)), kIn); const spread = lerp(0.2 * openK, Math.atan(rc * 1.15 / jl), kIn);
  for (const k in extra) if (extra[k] === undefined) delete extra[k];
  const o = Object.assign({ headPos: V(hx, hy, 0), heading: 0, curve: restCurve, gape, spread, preyX0: PREY_X0, t: T, quad: kIn * clamp(rc * 1.2), pitch: lerp(0.1 * openK, -0.08, kIn) }, extra);
  if (p > 0.02) { const pt = o.pitch || 0; o.wrap = z => { const czr = 1.06 - (hx + z - PREY_X0), cz3 = Math.min(czr, 1.0); const rP = Math.max(capyR(cz3), rc * 0.85); return { cy: capyY(cz3) - hy - z * Math.sin(pt), r: czr > 1.0 ? lerp(rP, AR0 * 0.5, ease(clamp((czr - 1.0) / 0.3))) : rP }; }; // hinter der Beute: Hals wieder schlank
    const th = 0.35, at = (z, s) => { const w = o.wrap(z), R = sackR(w) + 0.016; return V(s * R * Math.cos(th), w.cy - R * Math.sin(th), z); };
    o.jawJ = [at(-0.26, -1), at(-0.26, 1)]; o.jawTW = [at(0.3, -1), at(0.3, 1)]; o.jawK = ease(clamp((p - 0.02) / 0.06)); o.upLift = (o.lift ?? 0.5) * o.jawK; } // Oberkiefer nach oben angewinkelt
  poseAna(ana, o);
  // Beine des Capybaras verschwinden, sobald sie im Schlangenkörper stecken
  capy.legs.forEach((l, i) => { const lzW = PREY_X0 + 1.06 - (i < 2 ? 0.38 : -0.38) * 1; const insideL = hx + 0.28 > lzW && p > 0.05; l.scale.setScalar(insideL ? 0.0001 : 1); });
  return { hx, hy, rc };
}
const headW = () => { ana.head.updateMatrixWorld(true); return ana.head.getWorldPosition(V(0, 0, 0)); };
const hl = (x, y, z) => { ana.head.updateMatrixWorld(true); return V(x, y, z).applyMatrix4(ana.head.matrixWorld); };
// Kamera relativ zum Kopf: vor dem Maul (f), darüber (u), seitlich (s)
function headCam(f, u, s, T, fov = 36, lf = 0.12, lu = -0.06) { ana.head.updateMatrixWorld(true); const m = ana.head.matrixWorld; const o = headW(); const F = V(0, 0, 1).transformDirection(m), U = V(0, 1, 0).transformDirection(m), Sd = V(1, 0, 0).transformDirection(m);
  cam(o.clone().addScaledVector(F, f).addScaledVector(U, u).addScaledVector(Sd, s), o.clone().addScaledVector(F, lf).addScaledVector(U, lu), fov, T, 0.003); }
const flash = (k, col = '255,40,30') => { if (k > 0) svg.push(`<rect x="0" y="0" width="1080" height="1920" fill="rgba(${col},${(0.35 * k).toFixed(3)})"/>`); };
function chip(text, x, y, k, col = '#f3c63f') { if (k <= 0) return; ui.push(`<div class="pill" style="left:${x}px;top:${y}px;border-color:${col};transform:translate(-50%,-50%) scale(${back(k)})">${text}</div>`); }

const shots = [
  // 0: Wenn … Capybara 3× breiter … Unterkiefer bricht am Kinn
  (T) => {
    badge.style.display = T < 3.0 ? 'block' : 'none'; sunAt(V(0, 0, 0));
    const t3 = WT(0, 'dreimal') - 0.25, tU = WT(0, 'bricht') - 1.1, tB = WT(0, 'bricht') + 0.15;
    if (T < t3) { // Annäherung: Schlange gleitet über den Sand
      const k = (T - S[0].start) / (t3 - S[0].start); const hx = lerp(PREY_X0 - 3.2, PREY_X0 - 1.0, ease(k));
      poseAna(ana, { headPos: V(hx, 0.13, 0), heading: 0.12 * Math.sin(T * 2.2), curve: d => 0.55 * Math.sin(d * 1.3 - T * 3.4) * clamp(d / 0.8), gape: 0.05, t: T });
      cam(V(hx - 2.2, 1.05, 2.4), V(hx + 0.6, 0.25, 0), 42, T);
    } else if (T < tU) { // Größenvergleich
      poseAna(ana, { headPos: V(PREY_X0 - 0.95, 0.13, 0), heading: 0, curve: d => 0.4 * Math.sin(d * 1.3 - t3 * 3.4) * clamp(d / 0.8), gape: 0.05, t: T });
      cam(V(PREY_X0 - 2.6, 0.75, 0.35), V(PREY_X0 + 0.0, 0.42, 0), 36, T, 0.01);
      const kL = clamp((T - t3) / 0.3); label3('DEIN KOPF', hl(0, 0.12, 0), kL, -60, -260); label3('3× SO BREIT', V(PREY_X0 + 0.5, CAPY_CY + 0.42, 0), clamp((T - t3 - 0.5) / 0.3), 120, -330);
    } else { // Röntgen: starrer Unterkiefer, Kinn verwachsen -> bricht
      const kO = ease((T - tU) / (tB - tU)); const broke = T > tB; const g0 = lerp(0.05, 0.5, kO);
      poseAna(ana, { headPos: V(PREY_X0 - 0.95, 0.42, 0), pitch: 0.35, heading: 0, curve: d => 0.4 * Math.sin(d * 1.3 - t3 * 3.4) * clamp(d / 0.8), gape: broke ? 0.62 : g0, spread: broke ? 0.32 * easeOut((T - tB) / 0.15) * (1 - 0.15 * Math.sin((T - tB) * 20) * Math.exp(-(T - tB) * 5)) : 0.0, xray: 1, chinK: broke ? -1 : 0, t: T, teeth: 0.6 });
      headCam(1.25, 0.22, 0.45, T);
      label3('UNTERKIEFER', hl(0.1, -0.15, 0.1), clamp((T - tU - 0.2) / 0.3) * (broke ? clamp(1 - (T - tB) / 0.2) : 1), -40, 240);
      if (broke) { const tp = ana.tips[0].clone().add(ana.tips[1]).multiplyScalar(0.5).applyMatrix4(ana.head.matrixWorld); burstA(boneChips, tp, T - tB, 0.25); label3('KINN BRICHT!', tp, clamp((T - tB) / 0.2), 0, -300); flash(clamp(1 - (T - tB) / 0.35)); }
    }
  },
  // 1: Also: zwei Hälften + dehnbares Band
  (T) => {
    sunAt(V(0, 0, 0)); const u = T - S[1].start; const tH = WT(1, 'hälften'), tB = WT(1, 'band');
    const sp = 0.06 + 0.3 * ease((T - tH + 0.3) / 0.6) * (0.75 + 0.25 * Math.sin((T - tH) * 3.0));
    poseAna(ana, { headPos: V(PREY_X0 - 0.95, 0.5, 0), pitch: 0.55, heading: 0, curve: d => 0.4 * Math.sin(d * 1.3) * clamp(d / 0.8), gape: 0.5, spread: sp, xray: 1, lig: clamp((T - tH + 0.3) / 0.3), t: T, teeth: 0.6 });
    const u2 = u; headCam(1.15, 0.28, 0.3 + 0.12 * Math.sin(u2 * 0.6), T);
    label3('2 HÄLFTEN', hl(-0.16, -0.25, 0.1), clamp((T - tH) / 0.3), -120, -330);
    const lm = ana.tips[0].clone().add(ana.tips[1]).multiplyScalar(0.5).add(V(0, -0.03, 0)).applyMatrix4(ana.head.matrixWorld); label3('DEHNBARES BAND', lm, clamp((T - tB + 0.3) / 0.3), 60, 280);
  },
  // 2: Maul klappt riesig auf – aber ohne Arme rutscht das Capybara wieder raus
  (T) => {
    sunAt(V(0, 0, 0)); const tA = WT(2, 'aber'), tR = WT(2, 'rutscht');
    let p; if (T < tA) p = lerp(-0.16, 0.22, ease((T - S[2].start - 0.1) / (tA - S[2].start - 0.3))); else if (T < tR) p = 0.22 + 0.015 * Math.sin((T - tA) * 9); else p = lerp(0.22, -0.14, ease((T - tR) / 1.0));
    const openK = Math.min(ease((T - S[2].start) / 0.45), T > tR + 1.0 ? 1 - ease((T - tR - 1.0) / 0.5) : 1);
    engulf(p, T, { openK });
    const hp = headW(); cam(V(PREY_X0 - 0.6, 1.05, 2.5), V(PREY_X0 + 0.15, 0.5, 0), 38, T, 0.006);
    if (T > tR - 0.1) capy.root.position.x += 0.0;
    label3('KEINE ARME 🙅', hp.clone().add(V(0, 0.15, 0)), clamp((T - WT(2, 'arme') + 0.1) / 0.3) * clamp(1 - (T - tR - 0.2) / 0.3), -80, -300);
    label3('RUTSCHT RAUS', V(PREY_X0 + 0.6, CAPY_CY + 0.45, 0), clamp((T - tR) / 0.3), 100, -300);
  },
  // 3: Also: Zähne wie Widerhaken
  (T) => {
    sunAt(V(0, 0, 0)); const u = T - S[3].start; const tZ = WT(3, 'zähne'), tW = WT(3, 'widerhaken');
    poseAna(ana, { headPos: V(PREY_X0 - 0.95, 0.5, 0), pitch: 0.5, heading: 0, curve: d => 0.4 * Math.sin(d * 1.3) * clamp(d / 0.8), gape: 0.6, spread: 0.2, lig: 1, teeth: lerp(0.0, 1.35, back((T - tZ + 0.1) / 0.6)), t: T });
    headCam(0.62, 0.08, 0.62, T, 36, 0.05, -0.05);
    label3('WIDERHAKEN', hl(0.12, -0.08, 0.05), clamp((T - tW) / 0.3), 60, -320);
  },
  // 4: Links/rechts vorschieben, festhaken, über die Beute ziehen
  (T) => {
    sunAt(V(0, 0, 0)); const u = (T - S[4].start) / (S[4].end - S[4].start); const ph = (T - S[4].start) * 4.2; const NS = (S[4].end - S[4].start) * 4.2 / Math.PI, xs = ph / Math.PI; const p = lerp(0.18, 0.55, clamp((Math.floor(xs) + ease(xs % 1)) / NS)); // Stück für Stück: pro Kieferschub ein Ruck
    const sl = 0.07 * Math.sin(ph); const r = engulf(p, T, { slide: [sl, -sl], heading: 0.05 * Math.sin(ph) }); ana.gums.forEach(g => g.visible = false); /* kein rosa Zahnfleisch-Streifen neben dem Schädel in der Draufsicht */
    const hp = headW(); cam(hp.clone().add(V(-0.45, 2.3, 0.9)), hp.clone().add(V(0.2, 0, 0)), 40, T, 0.004);
    const tL = WT(4, 'linke'), tRr = WT(4, 'rechte'); const side = Math.sin(ph) > 0;
    const pL = hl(-0.3, -0.1, 0.2), pR = hl(0.3, -0.1, 0.2);
    if (T > tL - 0.2) { label3('LINKS', pL, side ? 1 : 0.0001, -120, -200); label3('RECHTS', pR, !side && T > tRr - 0.2 ? 1 : 0.0001, 120, 260); }
  },
  // 5: Schlucken dauert Stunden – keine Luft
  (T) => {
    sunAt(V(0, 0, 0)); const u = (T - S[5].start) / (S[5].end - S[5].start); const p = lerp(0.55, 0.72, ease(u)); engulf(p, T, { slide: [0.03 * Math.sin(T * 2), -0.03 * Math.sin(T * 2)] });
    const hp = headW(); cam(V(hp.x - 0.4, 0.85, 2.3), V(hp.x - 0.2, 0.55, 0), 40, T, 0.006);
    const hrs = Math.min(5, 1 + Math.floor(clamp((T - WT(5, 'stunden') + 0.2) / 1.4) * 4.99)); chip(`⏱ ${hrs} STUNDE${hrs > 1 ? 'N' : ''}`, 540, 470, clamp((T - WT(5, 'stunden') + 0.2) / 0.3));
    const kL = clamp((T - WT(5, 'luft') + 0.4) / 0.3); if (kL > 0) { const lv = clamp(1 - (T - WT(5, 'luft') + 0.3) / 0.9); svg.push(`<g opacity="${kL}"><rect x="290" y="1240" width="500" height="64" rx="32" fill="#111c" stroke="#fff" stroke-width="6"/><rect x="300" y="1250" width="${480 * lv}" height="44" rx="22" fill="${lv > 0.3 ? '#3ddc84' : '#e8483b'}"/><text x="540" y="1216" text-anchor="middle" font-family="M" font-weight="900" font-size="48" fill="#fff" stroke="#000" stroke-width="10" paint-order="stroke">LUFT</text></g>`); }
  },
  // 6: Luftröhre schiebt sich nach vorn – wie ein Schnorchel
  (T) => {
    sunAt(V(0, 0, 0)); const tL = WT(6, 'luftröhre') - 0.2; const k = ease((T - tL) / 0.9); engulf(0.72, T, { trach: k, trachSide: 9, lift: 0.25 });
    const hp = headW(); cam(hp.clone().add(V(0.75, -0.1, 1.45)), hp.clone().add(V(0.3, -0.28, 0)), 40, T, 0.004);
    ana.trach.updateMatrixWorld(true); const tip = ana.trTip.getWorldPosition(V(0, 0, 0)), base = ana.trach.localToWorld(V(0, 0, -0.1));
    if (k > 0.8) airFlow(airP, tip.clone().add(V(0.25, 0.05, 0)), base, T);
    label3('LUFTRÖHRE', tip, clamp((T - tL - 0.4) / 0.3), 60, 260); label3('SCHNORCHEL 🤿', tip.clone().add(V(0.1, 0, 0)), clamp((T - WT(6, 'schnorchel')) / 0.3), -40, -380);
  },
  // 7: Haut reißt zwischen den Schuppen
  (T) => {
    sunAt(V(0, 0, 0)); capy.root.visible = false; const tE = WT(7, 'einreißt') - 0.1; const k = ease((T - S[7].start) / 1.2);
    engulf(1, T, { headPos: V(PREY_X0 + 2.25, 0.12, 0), gape: 0.05, spread: 0, rest: true, bulgeScale: lerp(0.9, 1.06, k) });
    snakeU.uGapK.value = lerp(0.4, 1.0, k); snakeU.uTear.value = ease((T - tE) / 0.5);
    const bp = V(PREY_X0 + 0.9, 0.5, 0); cam(V(bp.x + 0.3, 0.95, 1.35), V(bp.x, 0.42, 0), 38, T, 0.004);
    if (T > tE) burstA(redP, V(bp.x, 0.85, 0.2), (T - tE) % 0.9, 0.12, 0.9);
    label3('HAUT REISST', V(bp.x, 0.86, 0.15), clamp((T - tE) / 0.3), -60, -330);
  },
  // 8: Faltige, dehnbare Haut wie eine Ziehharmonika
  (T) => {
    sunAt(V(0, 0, 0)); capy.root.visible = false; const tW = WT(8, 'weich') - 0.2; const k = ease((T - tW) / 0.8); const acc = Math.sin((T - WT(8, 'dehnt')) * 4) * clamp((T - WT(8, 'dehnt') + 0.2) / 0.3);
    engulf(1, T, { headPos: V(PREY_X0 + 2.25, 0.12, 0), gape: 0.05, spread: 0, rest: true, bulgeScale: 1.06 + 0.06 * acc });
    snakeU.uGapK.value = 1.0 + 0.25 * acc; snakeU.uTear.value = 1 - k; snakeU.uFold.value = k;
    const bp = V(PREY_X0 + 0.9, 0.5, 0); const a = 1.4 + (T - S[8].start) * 0.06; cam(V(bp.x + Math.cos(a) * 0.2, 0.95, 1.3), V(bp.x, 0.45, 0), 38, T, 0.004);
    label3('DEHNBARE HAUT', V(bp.x - 0.1, 0.88, 0.15), clamp((T - tW - 0.4) / 0.3), -80, -330);
    label3('ZIEHHARMONIKA 🪗', V(bp.x + 0.25, 0.8, 0.3), clamp((T - WT(8, 'ziehharmonika')) / 0.3), 120, 300);
  },
  // 9: Eine Mahlzeit reicht für Wochen
  (T) => {
    sunAt(V(0, 0, 0)); capy.root.visible = false; const u = (T - S[9].start) / (S[9].end - S[9].start);
    engulf(1, T, { headPos: V(PREY_X0 + 2.25, 0.12, 0), gape: 0.05, spread: 0, rest: true, bulgeScale: lerp(1.0, 0.8, u) });
    snakeU.uGapK.value = 0.9; snakeU.uFold.value = 1;
    const a = -0.6 + u * 0.4; cam(V(PREY_X0 + 1 + Math.sin(a) * 3.6, 2.6, Math.cos(a) * 3.6), V(PREY_X0 + 0.6, 0.3, -0.3), 40, T);
    const wk = Math.min(4, 1 + Math.floor(clamp((T - WT(9, 'wochen') + 0.3) / 1.0) * 3.99)); chip(`📅 WOCHE ${wk}`, 540, 470, clamp((T - WT(9, 'wochen') + 0.3) / 0.3));
  },
  // 10: Glückwunsch – Anakonda
  (T) => {
    sunAt(V(0, 0, 0)); capy.root.visible = false; const u = T - S[10].start;
    engulf(1, T, { headPos: V(PREY_X0 + 2.25, 0.16, 0), heading: 0.05 * Math.sin(T), gape: 0.05, spread: 0, rest: true, bulgeScale: 0.85 });
    snakeU.uGapK.value = 0.8; snakeU.uFold.value = 0.7; ana.ol.userData.u.uA.value = clamp((T - WT(10, 'anakonda')) * 4) * 0.9;
    const a = 0.9 - u * 0.2; const R = lerp(2.4, 3.6, ease(u / 2)); const hp = headW(); cam(V(hp.x - 0.6 + Math.sin(a) * R, lerp(0.7, 1.6, ease(u / 2)), Math.cos(a) * R), V(hp.x - 0.9, 0.3, 0), 40, T);
    cta.style.display = 'block';
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
  CUT = 0; GT = T; GI = i; scene.updateMatrixWorld(true); shots[i](T); if (window.DBG) window.DBG(); scene.updateMatrixWorld(true);
  { const u = T - Math.max(S[i].start, CUT); renderer.domElement.style.filter = T > 0.3 && u < 0.12 ? `blur(${((1 - u / 0.12) * 7).toFixed(1)}px)` : 'none'; }
  { const fd = camera.position.distanceTo(LOOK); bokeh.enabled = fd < 11 && scene.background === null; bokeh.uniforms.focus.value = fd; bokeh.uniforms.aperture.value = 0.00022 * clamp((11 - fd) / 5); }
  hideNearGrass(); composer.render(); labEl.innerHTML = ui.join(''); svgEl.innerHTML = svg.join(''); caption(T); return i;
};
await document.fonts.load('900 50px M'); await document.fonts.load('50px "Noto Color Emoji"');
window.renderAt(0.5); window.READY = true;
window.STATS = () => { let tris = 0, verts = 0, meshes = 0; const seen = new Set(); rex.root.traverse(o => { if (o.isMesh && !(o.material && o.material.side === THREE.BackSide)) { meshes++; const g = o.geometry; const n = g.index ? g.index.count / 3 : g.attributes.position.count / 3; tris += n * (o.isInstancedMesh ? o.count : 1); if (!seen.has(g)) { seen.add(g); verts += g.attributes.position.count * (o.isInstancedMesh ? o.count : 1); } } }); return { meshes, tris: Math.round(tris), verts }; };
window.__ = { camera, LOOK, ana, capy, rex, V, ui, svg, scene, poseAna, restCurve };
