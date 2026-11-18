// "Wenn … du einen Ankylosaurus baust" – komplett prozedurale 3D-Szene (Three.js)
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
function colorize(geo, zOff = 0, us = 1.3, vs = 0.8) {
  geo.computeVertexNormals(); const p = geo.attributes.position, n = geo.attributes.normal; const cols = new Float32Array(p.count * 3); const c = new THREE.Color();
  if (geo.attributes.uv && (us !== 1 || vs !== 1)) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * us, uv.getY(i) * vs); }
  for (let i = 0; i < p.count; i++) { skinColor(n.getY(i), p.getZ(i) + zOff, c, p.getX(i), p.getY(i)); cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b; }
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
  const capsG = (rad, len) => { const g = colorize(new THREE.CapsuleGeometry(rad, len, 6, 14)); g.translate(0, -len / 2, 0); return g; };
  const withOl = (parent, mesh) => { parent.add(mesh); const o = new THREE.Mesh(mesh.geometry, ol); o.position.copy(mesh.position); o.rotation.copy(mesh.rotation); o.scale.copy(mesh.scale); parent.add(o); return mesh; };
  const ell3 = (sx, sy, sz, seg = 28) => { const m = new THREE.Mesh(colorize(new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7))), skinM); m.scale.set(sx, sy, sz); m.castShadow = true; return m; };
  const toeClawG = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, 0, 0), V(0, -0.015, 0.06), V(0, -0.06, 0.1)]), 10, 0.024, 7);
  for (const s of [-1, 1]) {
    const hb = ell3(0.5, 0.78, 0.98); hb.position.set(s * 0.46, -0.12, 0.02); withOl(torso, hb); // Hüftmuskulatur (Übergang)
    const hip = new THREE.Group(); hip.position.set(s * 0.62, 3.0, 0.1); root.add(hip);
    const thigh = ell3(0.6, 1.1, 0.9); thigh.position.set(0, -0.6, 0.1); thigh.rotation.x = -0.3; withOl(hip, thigh);
    const quad = ell3(0.44, 0.78, 0.5); quad.position.set(s * 0.05, -0.85, 0.4); quad.rotation.x = -0.55; hip.add(quad); // Oberschenkelstrecker
    const knee = new THREE.Group(); knee.position.set(0, -1.3, 0.45); hip.add(knee);
    const kj = ell3(0.31, 0.3, 0.33, 20); knee.add(kj);
    const shinG = new THREE.Group(); shinG.rotation.x = 0.45; knee.add(shinG);
    const shinGeo = colorize(new THREE.CylinderGeometry(0.31, 0.2, 1.2, 20)); shinGeo.translate(0, -0.6, 0); const shin = new THREE.Mesh(shinGeo, skinM); shin.castShadow = true; withOl(shinG, shin);
    const calf = ell3(0.27, 0.55, 0.31); calf.position.set(0, -0.36, -0.13); withOl(shinG, calf); // Wadenmuskel
    const ankle = new THREE.Group(); ankle.position.set(0, -1.12, -0.55); knee.add(ankle);
    const aj = ell3(0.2, 0.18, 0.2, 18); ankle.add(aj);
    const metG = colorize(new THREE.CylinderGeometry(0.2, 0.16, 0.95, 16)); metG.translate(0, -0.47, 0);
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

// ---------- Ankylosaurus ----------
const AK_SIDE = new THREE.Color(0x9b8f70), AK_BACK = new THREE.Color(0x6e6650), AK_BELLY = new THREE.Color(0xcbbd98), AK_DARK = new THREE.Color(0x4a4334);
function akColor(ny, x, y, z, c) {
  c.copy(AK_BELLY).lerp(AK_SIDE, clamp((ny + 0.55) / 0.6)).lerp(AK_BACK, clamp((ny - 0.25) / 0.6));
  const n = Math.sin(x * 6.1 + z * 2.3) * Math.sin(y * 4.7 - z * 3.9) + 0.5 * Math.sin(x * 13 + y * 11 + z * 9);
  c.multiplyScalar(0.92 + 0.07 * n); return c;
}
function akCol(geo, us = 1.3, vs = 0.8) {
  geo.computeVertexNormals(); const p = geo.attributes.position, n = geo.attributes.normal; const cols = new Float32Array(p.count * 3); const c = new THREE.Color();
  if (geo.attributes.uv && (us !== 1 || vs !== 1)) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * us, uv.getY(i) * vs); }
  for (let i = 0; i < p.count; i++) { akColor(n.getY(i), p.getX(i), p.getY(i), p.getZ(i), c); cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); return geo;
}
// Rumpf: breit, flach, Rücken leicht gewölbt (Einheitskugel -> Körper)
const AKB = { y: 1.5 };
function akBody(x, y, z) {
  const w = 1.32 * (1 - 0.16 * z * z) * (1 + 0.05 * z);
  const X = Math.sign(x) * Math.pow(Math.abs(x), 0.82) * w;
  const Y = y > 0 ? Math.pow(y, 0.75) * 0.74 * (1 - 0.1 * z * z) * (1 + 0.06 * (-z)) : y * 0.6;
  return V(X, AKB.y + Y, z * 2.35);
}
function akBodyN(x, y, z) { const e = 0.01; const p = akBody(x, y, z); const v = V(x, y, z);
  const t1 = V(-z, 0, x).normalize(); if (t1.lengthSq() < 1e-6) t1.set(1, 0, 0); const t2 = v.clone().cross(t1).normalize();
  const a = V(x, y, z).addScaledVector(t1, e).normalize(), b = V(x, y, z).addScaledVector(t2, e).normalize();
  const pa = akBody(a.x, a.y, a.z).sub(p), pb = akBody(b.x, b.y, b.z).sub(p); const n = pa.cross(pb).normalize(); if (n.dot(p.clone().sub(V(0, AKB.y, 0))) < 0) n.negate(); return n; }
const AK_NV = 22, AK_LEN = 5.2, AK_L = AK_LEN / AK_NV, AK_FUSE = 14, AK_BREAK = 18, AK_T0 = V(0, 1.62, -1.9);
const akR = u => u < 0.66 ? 0.17 + 0.5 * Math.pow(1 - u / 0.66, 1.5) : 0.17;
const armorM = new THREE.MeshStandardMaterial({ color: 0x5e5644, roughness: 0.55, bumpMap: scaleTex, bumpScale: 0.6 });
const spikeM = new THREE.MeshStandardMaterial({ color: 0x8a7f66, roughness: 0.45 });
const clubM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, bumpMap: scaleTex, bumpScale: 1.4 });
const fleshM = new THREE.MeshPhysicalMaterial({ color: 0xa3262a, roughness: 0.38, clearcoat: 0.55, clearcoatRoughness: 0.3, side: THREE.BackSide, map: muscleTex, emissive: 0x1a0003 });
const vertM = new THREE.MeshStandardMaterial({ color: 0xf2ead8, roughness: 0.45, emissive: 0x2a2620 });
const tendonM = new THREE.MeshStandardMaterial({ color: 0xe0cfa6, roughness: 0.4, emissive: 0x1c170e });
const crackM = new THREE.MeshBasicMaterial({ color: 0x1a0606 });
function makeAnky() {
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  const ol = outlineMat(0xffe27a, 0.05);
  const addM = (geo, parent, mat = skinM, outline = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; parent.add(m); if (outline) m.add(new THREE.Mesh(geo, ol)); return m; };
  // Rumpf
  const bg = new THREE.SphereGeometry(1, 72, 44); { const p = bg.attributes.position; for (let i = 0; i < p.count; i++) { const q = akBody(p.getX(i), p.getY(i), p.getZ(i)); p.setXYZ(i, q.x, q.y, q.z); } }
  addM(akCol(bg, 2.2, 1.2), body);
  // Hüft- und Schultermuskeln (weicher Übergang zu den Beinen)
  for (const [x, y, z, sx, sy, sz] of [[0.95, 1.2, 1.35, 0.42, 0.5, 0.5], [1.0, 1.25, -1.3, 0.5, 0.6, 0.62]]) for (const s of [-1, 1]) { const m = addM(akCol(new THREE.SphereGeometry(1, 28, 20)), body); m.position.set(s * x, y, z); m.scale.set(sx, sy, sz); }
  // Hals + Kopf
  const neck = addM(akCol(new THREE.SphereGeometry(1, 32, 22)), body); neck.position.set(0, 1.5, 2.3); neck.scale.set(0.72, 0.52, 0.62);
  const head = new THREE.Group(); head.position.set(0, 1.42, 2.95); head.scale.setScalar(1.3); body.add(head);
  const hg = new THREE.SphereGeometry(1, 48, 32); { const p = hg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const f = (z + 1) / 2;
    const w = 0.66 * (1 - 0.42 * Math.pow(f, 1.3)); const Y = y > 0 ? Math.pow(y, 0.7) * 0.36 * (1 - 0.3 * f) : y * 0.3 * (1 - 0.25 * f); p.setXYZ(i, Math.sign(x) * Math.pow(Math.abs(x), 0.8) * w, Y, z * 0.62); } }
  addM(akCol(hg), head);
  const beak = addM(akCol(new THREE.SphereGeometry(1, 24, 16)), head); beak.position.set(0, -0.07, 0.6); beak.scale.set(0.24, 0.15, 0.14); beak.material = new THREE.MeshStandardMaterial({ color: 0x6b5d45, roughness: 0.4 });
  for (const s of [-1, 1]) {
    const hornS = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.38, 10), spikeM); hornS.position.set(s * 0.52, 0.14, -0.38); hornS.rotation.set(-1.9, 0, s * 0.9); hornS.castShadow = true; head.add(hornS); // Schuppenhorn hinten
    const hornQ = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.3, 10), spikeM); hornQ.position.set(s * 0.5, -0.17, -0.15); hornQ.rotation.set(-2.5, 0, s * 2.2); hornQ.castShadow = true; head.add(hornQ); // Wangenhorn
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), new THREE.MeshStandardMaterial({ color: 0x1a0e05, roughness: 0.15 })); eye.position.set(s * 0.44, 0.1, 0.12); head.add(eye);
    const iris = new THREE.Mesh(new THREE.CircleGeometry(0.04, 20), new THREE.MeshStandardMaterial({ color: 0xc89a22, roughness: 0.25 })); iris.position.set(s * 0.494, 0.1, 0.12); iris.rotation.y = s * Math.PI / 2; head.add(iris);
    const pup = new THREE.Mesh(new THREE.CircleGeometry(0.02, 16), new THREE.MeshBasicMaterial({ color: 0x050302 })); pup.position.set(s * 0.496, 0.1, 0.12); pup.rotation.y = s * Math.PI / 2; head.add(pup);
    const brow = addM(akCol(new THREE.SphereGeometry(1, 16, 12)), head, skinM, false); brow.position.set(s * 0.43, 0.2, 0.1); brow.scale.set(0.1, 0.06, 0.14);
    const nos = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), new THREE.MeshStandardMaterial({ color: 0x1d140c })); nos.position.set(s * 0.17, 0.06, 0.6); nos.scale.set(1, 0.6, 1); head.add(nos);
  }
  // Kopfplatten (Panzer auf dem Schädel)
  { const r = rng(55); for (let k = 0; k < 14; k++) { const x = (r() - 0.5) * 0.8, z = -0.4 + r() * 0.8; const f = (z / 0.62 + 1) / 2; const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.09 + r() * 0.05, 0.11 + r() * 0.05, 0.05, 6), armorM); pl.position.set(x * (1 - 0.42 * f), 0.34 * (1 - 0.3 * f) - 0.02, z); pl.rotation.set((r() - .5) * 0.2, r() * 3, (r() - .5) * 0.2); pl.castShadow = true; head.add(pl); } }
  // Beine: kurze, kräftige Säulen mit Elefantenfüßen
  const legs = [];
  for (const [x, z, front] of [[-0.98, 1.4, 1], [0.98, 1.4, 1], [-1.02, -1.3, 0], [1.02, -1.3, 0]]) {
    const l = new THREE.Group(); l.position.set(x, 1.2, z); body.add(l); l.userData.front = front;
    const up = addM(akCol(new THREE.CylinderGeometry(0.27, front ? 0.34 : 0.4, 0.7, 18)), l); up.position.set(x * 0.04, -0.3, 0);
    const kn = addM(akCol(new THREE.SphereGeometry(1, 18, 12)), l, skinM, false); kn.position.set(x * 0.05, -0.66, front ? 0.04 : -0.04); kn.scale.set(0.27, 0.22, 0.27);
    const lo = addM(akCol(new THREE.CylinderGeometry(0.25, 0.25, 0.55, 18)), l); lo.position.set(x * 0.06, -0.92, 0.02);
    const foot = addM(akCol(new THREE.CylinderGeometry(0.26, 0.32, 0.18, 20)), l); foot.position.set(x * 0.06, -1.12, 0.06);
    for (let k = 0; k < (front ? 5 : 4); k++) { const nl = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 8), new THREE.MeshStandardMaterial({ color: 0x3a3226, roughness: 0.4 })); const a = -0.7 + k * (front ? 0.35 : 0.47); nl.scale.set(1, 0.7, 1.3); nl.position.set(x * 0.06 + Math.sin(a) * 0.3, -1.17, 0.06 + Math.cos(a) * 0.3); l.add(nl); }
    legs.push(l);
  }
  // Panzer: Reihen gekielter Knochenplatten + seitliche Stacheln + Nacken-Halbringe
  const osteoG = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2); { const p = osteoG.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setY(i, y * (0.45 + 0.75 * Math.exp(-x * x * 9))); } osteoG.computeVertexNormals(); }
  const plates = []; // [pos, normal, sx, sy, sz, delay]
  const basis = (n, fwd) => { const t = fwd.clone().addScaledVector(n, -fwd.dot(n)).normalize(); const b = n.clone().cross(t).normalize(); return new THREE.Matrix4().makeBasis(b, n, t); };
  for (let zi = -0.9; zi <= 0.86; zi += 0.1) { const rowW = Math.sqrt(Math.max(0, 1 - zi * zi)); const nAcross = Math.max(3, Math.round(rowW * 9)) | 1;
    for (let k = 0; k < nAcross; k++) { const ph = (k / (nAcross - 1) - 0.5) * 2.3; const x = Math.sin(ph) * rowW, y = Math.cos(ph) * rowW; if (y < 0.12) continue; const n0 = V(x, y, zi).normalize();
      const p = akBody(n0.x, n0.y, n0.z), n = akBodyN(n0.x, n0.y, n0.z); const big = 1 - 0.35 * Math.abs(ph) / 1.15; const s = 0.13 * big * (0.9 + 0.2 * Math.abs(Math.sin(k * 7.3 + zi * 13)));
      plates.push([p, n, s * 1.05, s * 0.9, s * 1.35, (zi + 1) / 2]); } }
  const spikes = []; for (let zi = -0.82; zi <= 0.8; zi += 0.13) for (const s of [-1, 1]) { const rowW = Math.sqrt(1 - zi * zi); const n0 = V(s * rowW * 0.97, 0.22, zi).normalize(); const p = akBody(n0.x, n0.y, n0.z); const n = akBodyN(n0.x, n0.y, n0.z);
    const dir = n.clone().multiplyScalar(1).add(V(0, 0.05, -0.35)).normalize(); const L = 0.26 + 0.2 * clamp((zi + 0.2) * 1.2); spikes.push([p, dir, L, (zi + 1) / 2]); }
  for (const zn of [2.05, 2.45]) for (let k = 0; k < 6; k++) { const a = (k / 5 - 0.5) * 2.4; const n = V(Math.sin(a), Math.cos(a), 0.15).normalize(); const p = V(Math.sin(a) * 0.72, 1.5 + Math.cos(a) * 0.53, zn); plates.push([p, n, 0.17, 0.17, 0.2, 1.05]); }
  for (const s of [-1, 1]) for (const zn of [2.1, 2.5]) { const p = V(s * 0.72, 1.55, zn); spikes.push([p, V(s, 0.35, -0.2).normalize(), 0.42, 1.05]); }
  const plateIM = new THREE.InstancedMesh(osteoG, armorM, plates.length); plateIM.castShadow = true; body.add(plateIM);
  const spikeG = new THREE.ConeGeometry(0.11, 1, 10); spikeG.translate(0, 0.5, 0); spikeG.scale(1, 1, 0.55);
  const spikeIM = new THREE.InstancedMesh(spikeG, spikeM, spikes.length); spikeIM.castShadow = true; body.add(spikeIM);
  const setArmor = k => { const m4 = new THREE.Matrix4(), sc = new THREE.Matrix4();
    plates.forEach(([p, n, sx, sy, sz, d], i) => { const kk = Math.max(0.0001, back(clamp(k * 1.6 - d * 0.6))); m4.copy(basis(n, V(0, 0, 1))).multiply(sc.makeScale(sx * kk, sy * kk, sz * kk)); m4.setPosition(p.clone().addScaledVector(n, -0.03)); plateIM.setMatrixAt(i, m4); });
    spikes.forEach(([p, dir, L, d], i) => { const kk = Math.max(0.0001, back(clamp(k * 1.6 - d * 0.6))); const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir); m4.compose(p.clone().addScaledVector(dir, -0.05), q, V(1.1 * kk, L * kk, 1.1 * kk)); spikeIM.setMatrixAt(i, m4); });
    plateIM.instanceMatrix.needsUpdate = spikeIM.instanceMatrix.needsUpdate = true; plateIM.visible = spikeIM.visible = k > 0.001; };
  setArmor(1);
  // ---- Schwanz: Haut-Schlauch entlang einer beweglichen Wirbelkette ----
  const SUB = 3, ROWS = AK_NV * SUB + 1, RS = 26;
  const tg = new THREE.BufferGeometry(); const tpos = new Float32Array(ROWS * RS * 3), tuv = new Float32Array(ROWS * RS * 2), tcut = new Float32Array(ROWS * RS * 2), tcol = new Float32Array(ROWS * RS * 3); const tidx = [];
  for (let i = 0; i < ROWS - 1; i++) for (let j = 0; j < RS; j++) { const a = i * RS + j, b = i * RS + (j + 1) % RS, c = a + RS, d = b + RS; tidx.push(a, c, b, b, c, d); }
  for (let i = 0; i < ROWS; i++) for (let j = 0; j < RS; j++) { const k = i * RS + j; tuv[k * 2] = i / ROWS * 9; tuv[k * 2 + 1] = j / RS * 1.6; tcut[k * 2] = i / (ROWS - 1); tcut[k * 2 + 1] = j / RS * Math.PI * 2; }
  tg.setIndex(tidx); tg.setAttribute('position', new THREE.BufferAttribute(tpos, 3)); tg.setAttribute('uv', new THREE.BufferAttribute(tuv, 2)); tg.setAttribute('aCut', new THREE.BufferAttribute(tcut, 2)); tg.setAttribute('color', new THREE.BufferAttribute(tcol, 3));
  const cutU = { uX: { value: 0 }, uU0: { value: 0.3 }, uU1: { value: 0.9 }, uA: { value: Math.PI / 2 }, uW: { value: 0.95 } };
  const tailM = skinM.clone(); tailM.side = THREE.FrontSide;
  tailM.onBeforeCompile = sh => { skinVar(sh); Object.assign(sh.uniforms, cutU);
    sh.vertexShader = 'attribute vec2 aCut; varying vec2 vCut;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vCut = aCut;');
    sh.fragmentShader = 'uniform float uX, uU0, uU1, uA, uW; varying vec2 vCut;\n' + sh.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
      float dA = abs(mod(vCut.y - uA + 3.14159265, 6.2831853) - 3.14159265); float du = min(vCut.x - uU0, uU1 - vCut.x);
      float inWin = uX > 0.0 ? min(du * 9.0, (uW - dA) * 2.2) : -1.0; if (inWin > 0.12) discard;`)
      .replace('#include <color_fragment>', '#include <color_fragment>\n if (inWin > -0.02) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.78, 0.36, 0.36), 0.85);'); };
  tailM.customProgramCacheKey = () => 'akTail';
  const tail = new THREE.Mesh(tg, tailM); tail.castShadow = true; tail.receiveShadow = true; tail.frustumCulled = false; body.add(tail);
  const tailOl = new THREE.Mesh(tg, ol); tailOl.frustumCulled = false; body.add(tailOl);
  const flesh = new THREE.Mesh(tg, fleshM); flesh.frustumCulled = false; body.add(flesh);
  // Keule: breite Knochenkeule mit zwei großen Seitenknollen, höckrige Osteoderm-Oberfläche
  const cg = new THREE.SphereGeometry(1, 64, 44); { const p = cg.attributes.position; const cols = []; const c = new THREE.Color(), a = new THREE.Color(0x7b7158), b = new THREE.Color(0x4f4839);
    for (let i = 0; i < p.count; i++) { const v = V(p.getX(i), p.getY(i), p.getZ(i)); const lob = Math.exp(-Math.pow((Math.abs(v.x) - 0.82), 2) * 6) * Math.exp(-v.y * v.y * 3);
      const bump = 0.07 * (fbm(v.x * 4 + 3, v.y * 4, v.z * 4, 3) - 0.5) + 0.05 * Math.pow(Math.abs(Math.sin(v.x * 9) * Math.sin(v.z * 8 + v.y * 5)), 3);
      const r = 1 + bump; p.setXYZ(i, v.x * (0.42 + 0.3 * lob) * r, v.y * (0.27 + 0.06 * lob) * r, (v.z * 0.44 + 0.08 * v.z * lob) * r);
      c.copy(a).lerp(b, clamp(0.4 + (fbm(v.x * 6, v.y * 6, v.z * 6, 2) - 0.5) * 2)); cols.push(c.r, c.g, c.b); }
    cg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); cg.computeVertexNormals(); }
  const club = new THREE.Group(); body.add(club); const clubMesh = new THREE.Mesh(cg, clubM); clubMesh.castShadow = true; clubMesh.position.z = 0.3; club.add(clubMesh); clubMesh.add(new THREE.Mesh(cg, ol));
  // Wirbel (Röntgenblick)
  const vertGeo = (() => { const parts = []; const cen = new THREE.CylinderGeometry(1, 1, 1, 14); cen.rotateX(Math.PI / 2); parts.push(cen); return parts; })();
  const verts = []; for (let i = 0; i < AK_NV; i++) { const g = new THREE.Group(); const cen = new THREE.Mesh(vertGeo[0], vertM); g.add(cen);
    const nsG = new THREE.BoxGeometry(0.3, 1, 0.45); nsG.translate(0, 0.5, 0); const ns = new THREE.Mesh(nsG, vertM); ns.position.y = 0.6; g.add(ns); // Dornfortsatz
    const tps = [-1, 1].map(s => { const tg2 = new THREE.BoxGeometry(1, 0.25, 0.4); tg2.translate(s * 0.5, 0, 0); const tp = new THREE.Mesh(tg2, vertM); tp.position.x = s * 0.7; g.add(tp); return tp; }); // Querfortsätze
    const chG = new THREE.BoxGeometry(0.26, 0.9, 0.35); chG.translate(0, -0.45, 0); const ch = new THREE.Mesh(chG, vertM); ch.position.y = -0.6; g.add(ch); // Hämalbogen
    g.userData = { cen, ns, ch, tps }; g.visible = false; body.add(g); verts.push(g); }
  // verwachsener Knochenstiel (2 Hälften für den Bruch) + Bruchkante
  const bar1 = new THREE.Mesh(new THREE.BufferGeometry(), vertM), bar2 = new THREE.Mesh(new THREE.BufferGeometry(), vertM); body.add(bar1, bar2); bar1.visible = bar2.visible = false;
  const crack = new THREE.Group(); body.add(crack); { const r = rng(91); for (let k = 0; k < 9; k++) { const sh = new THREE.Mesh(new THREE.TetrahedronGeometry(0.035 + r() * 0.03), crackM); const a = k / 9 * Math.PI * 2; sh.position.set(Math.cos(a) * 0.07, Math.sin(a) * 0.07, (r() - .5) * 0.04); crack.add(sh); }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.016, 6, 18), crackM); crack.add(ring); } crack.visible = false;
  const tendons = Array.from({ length: 8 }, () => { const m = new THREE.Mesh(new THREE.BufferGeometry(), tendonM); m.visible = false; m.castShadow = true; body.add(m); return m; });
  root.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
  return { root, body, head, neck, legs, ol, setArmor, tail, tailOl, flesh, tg, cutU, club, clubMesh, verts, bar1, bar2, crack, tendons, SUB, ROWS, RS, plateIM, spikeIM };
}
const anky = makeAnky(); scene.add(anky.root); anky.root.scale.setScalar(0.85);

// Schwanz-Pose: yaw/pitch je Gelenk -> Wirbelkette, Haut, Keule, Wirbel, Stiel, Sehnen
function tailChain(yaw, pitch) {
  const P = [AK_T0.clone()]; const D = []; let dir = V(0, -0.08, -1).normalize();
  for (let i = 0; i < AK_NV; i++) { dir.applyAxisAngle(V(0, 1, 0), yaw[i]); const ax = dir.clone().cross(V(0, 1, 0)).normalize(); dir.applyAxisAngle(ax, pitch[i]); D.push(dir.clone()); P.push(P[i].clone().addScaledVector(dir, AK_L)); }
  return { P, D };
}
function poseAnky(a, { yaw, pitch, xray = 0, win = [0.3, 0.92], winA = Math.PI / 2, winW = 0.95, fuse = 0, fused = false, crackK = 0, tendon = 0, armor = 1, phase = 0, amp = 0, t = 0, gapK = 0 }) {
  const { P, D } = tailChain(yaw, pitch); a.chain = { P, D };
  const curve = new THREE.CatmullRomCurve3(P, false, 'centripetal'); const pos = a.tg.attributes.position.array, col = a.tg.attributes.color.array; const c = new THREE.Color();
  for (let i = 0; i < a.ROWS; i++) { const u = i / (a.ROWS - 1); const p = curve.getPoint(u), T = curve.getTangent(u); const side = T.clone().cross(V(0, 1, 0)).normalize(), up = side.clone().cross(T).normalize();
    const r = akR(u) * (1 + 0.05 * Math.sin(u * 60) * (u < 0.66 ? 1 : 0.3));
    for (let j = 0; j < a.RS; j++) { const an = j / a.RS * Math.PI * 2; const ca = Math.cos(an), sa = Math.sin(an); const k = (i * a.RS + j) * 3;
      const q = p.clone().addScaledVector(side, ca * r * 1.12).addScaledVector(up, sa * r * (sa > 0 ? 0.9 : 0.8)); pos[k] = q.x; pos[k + 1] = q.y; pos[k + 2] = q.z;
      akColor(sa * 0.95, q.x, q.y, q.z, c); col[k] = c.r; col[k + 1] = c.g; col[k + 2] = c.b; } }
  a.tg.attributes.position.needsUpdate = a.tg.attributes.color.needsUpdate = true; a.tg.computeVertexNormals();
  const end = P[AK_NV], dEnd = D[AK_NV - 1]; a.club.position.copy(end); a.club.quaternion.setFromUnitVectors(V(0, 0, 1), dEnd);
  a.cutU.uX.value = xray; a.cutU.uU0.value = win[0]; a.cutU.uU1.value = win[1]; a.cutU.uA.value = winA; a.cutU.uW.value = winW; a.flesh.visible = xray > 0;
  // Wirbel
  a.verts.forEach((g, i) => { const u = (i + 0.5) / AK_NV; g.visible = xray > 0 && !(fused && i >= AK_FUSE); if (!g.visible) return; const r = akR(u);
    g.position.copy(P[i]).lerp(P[i + 1], 0.5); g.quaternion.setFromUnitVectors(V(0, 0, 1), D[i]); const fz = i >= AK_FUSE ? fuse : 0; const len = AK_L * lerp(lerp(0.74, 0.55, gapK), 1.04, fz);
    g.scale.set(r * 0.3, r * 0.3, len); g.userData.ns.scale.y = lerp(1, 0.3, fz); g.userData.ch.scale.y = lerp(1, 0.3, fz); g.userData.tps.forEach(m => m.scale.x = lerp(1, 0.4, fz)); });
  // verwachsener Stiel
  const barOn = xray > 0 && fused; a.bar1.visible = a.bar2.visible = barOn; a.crack.visible = barOn && crackK > 0;
  if (barOn) { const rb = 0.17 * 0.32; const mk = (i0, i1, gap0, gap1) => { const pts = []; for (let i = i0; i <= i1; i++) pts.push(P[i].clone()); const d0 = D[i0], d1 = D[i1 - 1];
      pts[0].addScaledVector(d0, gap0); pts[pts.length - 1].addScaledVector(d1, -gap1); const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, rb, 14, false);
      { const p = g.attributes.position; const nn = g.attributes.normal; for (let k = 0; k < p.count; k++) { const s = Math.floor(k / 15) / 40; const bump = 0.12 * Math.pow(Math.max(0, Math.sin(s * (i1 - i0) * Math.PI)), 8); p.setXYZ(k, p.getX(k) + nn.getX(k) * rb * bump, p.getY(k) + nn.getY(k) * rb * bump, p.getZ(k) + nn.getZ(k) * rb * bump); } g.computeVertexNormals(); }
      return g; };
    const g0 = crackK > 0 ? 0.02 * crackK : 0; a.bar1.geometry.dispose(); a.bar1.geometry = mk(AK_FUSE, AK_BREAK, 0.03, g0); a.bar2.geometry.dispose(); a.bar2.geometry = mk(AK_BREAK, AK_NV, g0, -0.1);
    if (crackK > 0) { a.crack.position.copy(P[AK_BREAK]); a.crack.quaternion.setFromUnitVectors(V(0, 0, 1), D[AK_BREAK]); a.crack.scale.setScalar(0.75 + 0.5 * crackK); } }
  // verknöcherte Sehnen: geflochtene Stränge um den Stiel
  a.tendons.forEach((m, j) => { m.visible = xray > 0 && tendon > 0.001; if (!m.visible) return; const i0 = AK_FUSE - 1, n = 70; const pts = []; const tw = (j % 2 ? 1 : -1); const a0 = j / a.tendons.length * Math.PI * 2;
    for (let k = 0; k <= n; k++) { const s = k / n; const f = i0 + s * (AK_NV - i0); const i = Math.min(AK_NV - 1, Math.floor(f)); const fr = f - i; const p = P[i].clone().lerp(P[i + 1], fr); const T = D[i];
      const side = T.clone().cross(V(0, 1, 0)).normalize(), up = side.clone().cross(T).normalize(); const ang = a0 + tw * s * Math.PI * 2.6; const rr = 0.17 * 0.32 * (1.7 + 0.35 * Math.sin(ang * 3 + j));
      pts.push(p.addScaledVector(side, Math.cos(ang) * rr).addScaledVector(up, Math.sin(ang) * rr)); }
    const kk = clamp(tendon * 1.25 - j * 0.03); const cnt = Math.max(2, Math.round(kk * n)); const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.slice(0, cnt + 1)), Math.max(4, cnt * 2), 0.018, 6, false);
    m.geometry.dispose(); m.geometry = g; });
  a.setArmor(armor);
  a.legs.forEach((l, i) => { l.rotation.x = Math.sin(phase + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.3 * amp; });
  a.body.position.y = Math.abs(Math.sin(phase)) * 0.04 * amp + Math.sin(t * 1.5) * 0.008; a.head.rotation.x = Math.sin(t * 0.8) * 0.05; a.head.rotation.y = Math.sin(t * 0.5) * 0.08;
}
// Gelenkwinkel-Generatoren
const Z22 = () => new Array(AK_NV).fill(0);
function restPitch() { const p = Z22(); for (let i = 0; i < AK_NV; i++) p[i] = i < 4 ? -0.01 : 0.02; return p; } // Schwanz waagerecht über dem Boden
// weicher Schwanz: Peitschenwelle mit Verzögerung entlang der Kette
function softYaw(sw, t, lag = 0.045) { const y = Z22(); for (let i = 0; i < AK_NV; i++) y[i] = sw(t - i * lag) * (i < 8 ? 0.085 : 0.05); return y; }
// steifer Stiel: nur die Gelenke an der Hüfte bewegen sich
function hingeYaw(ang, nHinge = 7, wob = 0) { const y = Z22(); for (let i = 0; i < nHinge; i++) y[i] = ang / nHinge; for (let i = nHinge; i < AK_FUSE; i++) y[i] = wob * (i - nHinge) * 0.01; return y; }
function clubWorld() { anky.root.updateMatrixWorld(true); return anky.clubMesh.getWorldPosition(V(0, 0, 0)); }

// ---------- Requisiten / Effekte ----------
function particles(n, size, color, seed) { const p = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ map: dotTex, size, color, transparent: true, depthWrite: false }));
  p.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); const r = rng(seed); p.userData.v = Array.from({ length: n }, () => [(r() - .5), r(), (r() - .5), r()]); p.frustumCulled = false; scene.add(p); return p; }
function burst(p, origin, t, { spread = 2, up = 3, g = 9.8, life = 1.5 } = {}) {
  const a = p.geometry.attributes.position.array; p.visible = t > 0 && t < life;
  p.userData.v.forEach((v, i) => { const tt = clamp(t, 0, life); a[i * 3] = origin.x + v[0] * spread * tt; a[i * 3 + 1] = Math.max(0.02, origin.y + (v[1] * up) * tt - 0.5 * g * tt * tt); a[i * 3 + 2] = origin.z + v[2] * spread * tt; });
  p.geometry.attributes.position.needsUpdate = true; p.material.opacity = 1 - clamp(t / life);
}
const dust = particles(220, 0.9, 0xb8a27e, 9), dust2 = particles(160, 0.7, 0xa58c68, 19), blood = particles(90, 0.1, 0x9a1512, 29), sparks = particles(70, 0.12, 0xfff1c0, 39), boneBits = particles(80, 0.09, 0xf1e9d6, 49);
const shards = []; { const r = rng(61); for (let k = 0; k < 12; k++) { const m = new THREE.Mesh(new THREE.TetrahedronGeometry(0.05 + r() * 0.06), k % 3 ? vertM : new THREE.MeshStandardMaterial({ color: 0x8a2420, roughness: 0.4 })); m.userData.v = [(r() - .5) * 3, 1 + r() * 2.5, (r() - .5) * 3, r() * 10]; m.castShadow = true; m.visible = false; scene.add(m); shards.push(m); } }
function flyShards(o, t, life = 1.4) { shards.forEach(m => { const v = m.userData.v; m.visible = t > 0 && t < life; if (!m.visible) return; m.position.set(o.x + v[0] * t, Math.max(0.04, o.y + v[1] * t - 4.9 * t * t), o.z + v[2] * t); m.rotation.set(v[3] + t * 7, t * 5, 0); }); }
// Rex an die Keule bringen: Knöchel eines Beins auf Trefferpunkt ausrichten
function rexAnkle(i = 0) { rex.root.updateMatrixWorld(true); return rex.legs[i].ankle.getWorldPosition(V(0, 0, 0)); }
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


// ---------- Reset ----------
function resetWorld() {
  rex.root.visible = true; rex.root.position.set(0, 0, 0); rex.root.rotation.set(0, 0, 0); rex.root.scale.setScalar(0.9); rex.ol.userData.u.uA.value = 0;
  anky.root.visible = true; anky.root.position.set(0, 0, 0); anky.root.rotation.set(0, 0, 0); anky.ol.userData.u.uA.value = 0;
  [dust, dust2, blood, sparks, boneBits].forEach(p => p.visible = false); shards.forEach(m => m.visible = false);
  ground.visible = world.visible = sky.visible = true; scene.background = null; scene.fog.near = 40; scene.fog.far = 320;
  ui = []; svg = []; badge.style.display = 'none'; cta.style.display = 'none';
}
// Schwung-Profil: Ausholen -> Peitschen -> Treffer -> Zurückfedern
function swingAng(t, tHit, A = 0.8, hold = false) {
  const d = t - tHit;
  if (d < -0.75) return 0;
  if (d < -0.28) return -0.5 * ease((d + 0.75) / 0.47);
  if (d < 0) { const k = (d + 0.28) / 0.28; return lerp(-0.5, A, k * k); }
  if (hold) return A * (1 - 0.12 * Math.sin(clamp(d / 0.25) * Math.PI));
  return lerp(A, A * 0.55, easeOut(d / 0.35)) * (1 - ease((d - 0.6) / 1.4));
}
const REST_P = restPitch();
const tailMid = () => { anky.root.updateMatrixWorld(true); const P = anky.chain.P; return P[Math.round(AK_NV * 0.6)].clone().applyMatrix4(anky.body.matrixWorld); };
const tailPt = i => { anky.root.updateMatrixWorld(true); return anky.chain.P[i].clone().applyMatrix4(anky.body.matrixWorld); };
// Rex so hinstellen, dass die Keule beim Treffer genau seinen Knöchel trifft
function placeRexForHit(hitPose, leg = 1, extra = {}) {
  poseAnky(anky, hitPose); const cp = clubWorld();
  const a = rexAnkle(leg); rex.root.position.add(V(cp.x - a.x - 0.55, 0, cp.z - a.z + (extra.dz || 0))); rex.root.updateMatrixWorld(true); return cp;
}
const idleRex = (T, o = {}) => poseRex(rex, Object.assign({ t: T, jaw: 0.12, head: 0.12, tail: 1.12, teeth: 2.3 }, o));

const shots = [
  // 0: Hook – weicher Schwanz knickt beim Schlag ab
  (T) => {
    badge.style.display = T < 3.0 ? 'block' : 'none'; sunAt(V(0, 0, -2));
    const tW = WT(0, 'weich'), tHit = WT(0, 'schlägt') + 0.12, tSnap = WT(0, 'knickt') - 0.05;
    const A = 0.8; const sw = s => swingAng(s, tHit, A) / 1.38;
    idleRex(T); const hitPose = { yaw: softYaw(sw, tHit), pitch: REST_P, armor: 0, t: T };
    const cp = placeRexForHit(hitPose, 1);
    const yaw = softYaw(sw, Math.min(T, tSnap + 0.02)); const pitch = REST_P.slice();
    const sk = T > tSnap ? easeOut((T - tSnap) / 0.35) : 0;
    if (sk > 0) { yaw[13] -= 1.25 * sk; yaw[14] -= 0.25 * sk; pitch[13] -= 0.55 * sk; pitch[14] -= 0.2 * sk; for (let i = 0; i < 13; i++) yaw[i] *= lerp(1, 0.6, ease((T - tSnap) / 1.2)); }
    const xr = T > tW - 0.1 ? 1 : 0;
    poseAnky(anky, { yaw, pitch, armor: 0, t: T, xray: xr, win: [0.22, 0.97], winW: 1.0, gapK: sk });
    const hd = T - tHit; if (hd > 0) { burst(dust, V(cp.x - 0.3, 0.3, cp.z), hd, { spread: 2.5, up: 2, g: 2, life: 1.4 }); }
    const sd = T - tSnap; if (sd > 0) { const sp = tailPt(14); burst(blood, sp, sd, { spread: 1.4, up: 2.5, life: 1.0 }); burst(boneBits, sp, sd, { spread: 1.2, up: 2.2, life: 1.0 }); }
    if (T < tW - 0.1) { // Totale: Ankylosaurus + T-Rex
      cam(V(7.5, 3.6, 4.5), V(-1.3, 2.0, -2.5), 50, T, 0.03);
      label3('KNOCHENKEULE', clubWorld(), clamp((T - WT(0, 'knochenkeule')) * 3), 140, -260);
    } else if (T < tHit - 0.8) { CUT = tW - 0.1; const m = tailMid(); cam(m.clone().add(V(2.6, 4.4, -1.8)), m.clone().add(V(-0.1, 0, 0.2)), 44, T, 0.02);
      label3('WEICHER SCHWANZ', tailPt(9), clamp((T - tW) * 3), 120, -320);
    } else { CUT = tHit - 0.8; const m = tailPt(8); cam(m.clone().add(V(3.4, 8.2, 1.2)), m.clone().add(V(-1.2, -0.6, -1.0)), 50, T * 6, 0.02 + (hd > 0 ? 0.18 * Math.exp(-hd * 5) : 0) + (sd > 0 ? 0.12 * Math.exp(-sd * 5) : 0));
      label3('KNICKT AB!', tailPt(14), clamp((T - tSnap) * 3), 160, -300);
    }
  },
  // 1: Wirbel verwachsen zum Knochenstiel
  (T) => {
    sunAt(V(0, 0, -3)); rex.root.visible = false;
    const tF = WT(1, 'verwachs'); const fk = ease((T - tF) / 1.5);
    const yaw = hingeYaw(0.12 * Math.sin(T * 1.3)); poseAnky(anky, { yaw, pitch: REST_P, armor: 0, t: T, xray: 1, win: [0.5, 0.985], winW: 1.05, fuse: fk, fused: fk >= 0.999 });
    const m = tailPt(17); cam(m.clone().add(V(1.7, 3.0, 0.6)), m.clone().add(V(0, -0.1, -0.2)), 42, T, 0.015);
    label3('WIRBEL', tailPt(16), clamp((T - WT(1, 'wirbel')) * 3) * (1 - clamp((T - tF - 1.2) * 3)), -150, -300);
    label3('VERWACHSEN', tailPt(18), clamp((T - tF - 0.6) * 3), 120, -320);
    label3('KNOCHENSTIEL', tailPt(19), clamp((T - WT(1, 'knochenstiel')) * 3), -120, 330);
  },
  // 2: steif – aber bricht beim Aufprall
  (T) => {
    sunAt(V(0, 0, -3)); const tA = WT(2, 'aber'), tHit = WT(2, 'kracht') + 0.05, tBr = WT(2, 'bricht') - 0.05;
    idleRex(T);
    if (T < tA - 0.05) { rex.root.visible = false; const yaw = hingeYaw(0.55 * Math.sin((T - S[2].start) * 3.2)); poseAnky(anky, { yaw, pitch: REST_P, armor: 0, t: T, xray: 1, win: [0.5, 0.985], winW: 1.05, fuse: 1, fused: true });
      const m = tailPt(15); cam(m.clone().add(V(0.6, 6.5, 1.8)), m.clone().add(V(0, 0, -0.6)), 46, T, 0.015);
      label3('STEIF', tailPt(19), clamp((T - WT(2, 'nichts')) * 3), -140, -280); return; }
    CUT = tA - 0.05; const A = 0.8;
    const hitPose = { yaw: hingeYaw(A), pitch: REST_P, armor: 0, t: T, fuse: 1, fused: true }; const cp = placeRexForHit(hitPose, 1);
    const yaw = hingeYaw(swingAng(T, tHit, A, true)); const pitch = REST_P.slice(); const ck = T > tBr ? easeOut((T - tBr) / 0.3) : 0;
    yaw[AK_BREAK] -= 0.42 * ck; pitch[AK_BREAK] -= 0.3 * ck;
    poseAnky(anky, { yaw, pitch, armor: 0, t: T, xray: 1, win: [0.5, 0.985], winW: 1.1, fuse: 1, fused: true, crackK: ck });
    const hd = T - tHit; if (hd > 0) burst(dust, V(cp.x - 0.3, 0.3, cp.z), hd, { spread: 2.5, up: 2, g: 2, life: 1.4 });
    const bd = T - tBr; if (bd > 0) { const bp = tailPt(AK_BREAK); burst(boneBits, bp, bd, { spread: 1.0, up: 2, life: 1.0 }); burst(blood, bp, bd, { spread: 1.2, up: 2.2, life: 0.9 }); }
    const bp = tailPt(AK_BREAK); const zk = ease((T - tBr + 0.2) / 0.6);
    cam(bp.clone().add(V(lerp(3.6, 1.6, zk), lerp(4.8, 2.6, zk), lerp(-3.4, -0.9, zk))), bp.clone().add(V(lerp(-1.2, 0, zk), lerp(-0.3, 0, zk), lerp(-0.6, 0, zk))), 48, T * 6, 0.02 + (hd > 0 ? 0.2 * Math.exp(-hd * 5) : 0));
    label3('T-REX-BEIN', rexAnkle(1).add(V(0, 0.8, 0)), clamp((T - WT(2, 'trex')) * 3) * (1 - clamp((T - tBr) * 4)), -160, -260);
    label3('BRICHT DURCH!', bp, clamp((T - tBr) * 3), 150, -300);
  },
  // 3: verknöcherte Sehnen umwickeln den Stiel
  (T) => {
    sunAt(V(0, 0, -3)); rex.root.visible = false; const tS = WT(3, 'wickeln') - 0.15, tE = WT(3, 'stahl') + 0.3; const k = clamp((T - tS) / (tE - tS));
    const yaw = hingeYaw(0.1 * Math.sin(T * 1.1)); poseAnky(anky, { yaw, pitch: REST_P, armor: 0, t: T, xray: 1, win: [0.5, 0.985], winW: 1.25, fuse: 1, fused: true, tendon: k });
    const m = tailPt(18); const a = 0.6 - (T - S[3].start) * 0.18; cam(m.clone().add(V(Math.sin(a) * 2.2, 1.9, -Math.cos(a) * 2.2 + 0.3)), m, 38, T, 0.012);
    label3('VERKNÖCHERTE SEHNEN', tailPt(17), clamp((T - WT(3, 'sehnen')) * 3), 0, -330);
    label3('WIE STAHLSEILE', tailPt(20), clamp((T - WT(3, 'stahl')) * 3), 0, 330);
  },
  // 4: hält jeden Schlag aus – aber zu steif zum Schwingen
  (T) => {
    sunAt(V(0, 0, -3)); const tA = WT(4, 'aber'), tHit = WT(4, 'schlag') + 0.05; idleRex(T);
    if (T < tA - 0.05) { const A = 0.8; const hitPose = { yaw: hingeYaw(A), pitch: REST_P, armor: 0, t: T, fuse: 1, fused: true, tendon: 1 }; const cp = placeRexForHit(hitPose, 1);
      const hd = T - tHit; if (hd > 0) { const rk = Math.exp(-hd * 4) * Math.sin(hd * 30) * 0.05; rex.root.rotation.z = rk; burst(sparks, cp.clone().add(V(-0.3, 0.2, 0)), hd, { spread: 2.2, up: 2.5, life: 0.8 }); burst(dust, V(cp.x - 0.3, 0.3, cp.z), hd, { spread: 2.5, up: 2, g: 2, life: 1.4 }); }
      poseAnky(anky, { yaw: hingeYaw(swingAng(T, tHit, A, true)), pitch: REST_P, armor: 0, t: T, xray: 1, win: [0.5, 0.985], winW: 1.1, fuse: 1, fused: true, tendon: 1 });
      const m = tailPt(16); cam(m.clone().add(V(3.4, 4.6, -3.6)), m.clone().add(V(-1.0, -0.4, -1.0)), 50, T * 6, 0.02 + (hd > 0 ? 0.2 * Math.exp(-hd * 5) : 0));
      label3('HÄLT!', clubWorld(), clamp((T - WT(4, 'aus')) * 3), 150, -300); return; }
    CUT = tA - 0.05; rex.root.visible = false;
    const tr = T - tA; const strain = Math.sin(tr * 3.0) * 0.06 * ease(tr / 0.4); const yaw = Z22(); for (let i = 0; i < 3; i++) yaw[i] = strain / 3 + Math.sin(T * 40) * 0.002;
    anky.root.rotation.y = -strain * 1.6; poseAnky(anky, { yaw, pitch: REST_P, armor: 0, t: T, xray: 0, fuse: 1, fused: true, tendon: 1 });
    cam(V(0, 7.5, -10.5), V(0, 0.8, -3.2), 46, T, 0.03 + 0.015 * Math.abs(Math.sin(T * 25)) * ease(tr / 0.4));
    label3('ZU STEIF!', tailPt(16), clamp((T - WT(4, 'steif')) * 3), 0, -330);
  },
  // 5: Scharnier an der Hüfte – Keule peitscht links/rechts
  (T) => {
    sunAt(V(0, 0, -3)); rex.root.visible = false; const u = T - S[5].start; const tP = WT(5, 'peitscht');
    const amp = lerp(0.35, 0.95, ease((T - tP + 0.3) / 0.5)); const fr = lerp(1.6, 3.4, ease((T - tP + 0.3) / 0.5)); const ang = amp * Math.sin(u * fr);
    const yaw = hingeYaw(ang, 7); for (let i = 0; i < 7; i++) yaw[i] *= 1 + 0.25 * Math.sin(u * fr - i * 0.35);
    poseAnky(anky, { yaw, pitch: REST_P, armor: 0, t: T, xray: 1, win: [0.0, 0.42], winW: 1.15, fuse: 1, fused: true, tendon: 1, gapK: 1 });
    if (T < tP - 0.3) { const m = tailPt(4); cam(m.clone().add(V(1.6, 4.0, 1.4)), m.clone().add(V(0, -0.2, -0.3)), 44, T, 0.015);
      label3('LOCKERE WIRBEL', tailPt(3), clamp((T - WT(5, 'locker')) * 3), 0, -330); label3('SCHARNIER', tailPt(6), clamp((T - WT(5, 'scharnier')) * 3), 0, 330); }
    else { CUT = tP - 0.3; cam(V(0, 10.5, -6.5), V(0, 0.5, -3.6), 50, T, 0.02); label3('LINKS', V(-1.9, 1, -5.0), clamp((T - WT(5, 'links')) * 3), -60, -200); label3('RECHTS', V(1.9, 1, -5.0), clamp((T - WT(5, 'rechts')) * 3), 60, -200); }
  },
  // 6: Panzer aus Knochenplatten mit Stacheln
  (T) => {
    sunAt(V(0, 0, 0)); const tP = WT(6, 'panzer') - 0.3, tS = WT(6, 'stacheln') + 0.5; const ak = clamp((T - tP) / (tS - tP)); const tB = S[6].end - 0.25;
    poseAnky(anky, { yaw: hingeYaw(0.15 * Math.sin(T * 1.2)), pitch: REST_P, armor: ak, t: T, fuse: 1, fused: true });
    const bt = T - tB; const lunge = ease((T - (tB - 0.6)) / 0.6) * (1 - ease((T - tB - 0.15) / 0.5));
    poseRex(rex, { t: T, jaw: bt < 0 ? lerp(0.25, 0.75, lunge) : lerp(0.75, 0.2, ease(bt / 0.15)), head: lerp(0.15, 0.55, lunge), pitch: lerp(0.05, 0.3, lunge), tail: 1.12, teeth: 2.3 });
    const bk = V(-0.45, 2.15, 0.2); rex.root.rotation.y = Math.PI / 2 - 0.25; alignMouth(bk.clone().add(V(-2.4, 1.4, -0.6)).lerp(bk, lunge));
    if (bt > 0) burst(sparks, bk.clone().add(V(0, 0.2, 0)), bt, { spread: 2.4, up: 3, life: 0.8 });
    cam(V(6.5, 3.6, 3.5), V(-0.3, 1.9, 0.2), 46, T * (bt > 0 ? 6 : 1), 0.02 + (bt > 0 ? 0.15 * Math.exp(-bt * 5) : 0));
    label3('KNOCHENPLATTEN', V(0.3, 2.15, -0.6), clamp((T - WT(6, 'knochenplatten')) * 3), 120, -360);
    label3('STACHELN', V(0.95, 1.65, 1.0), clamp((T - WT(6, 'stacheln')) * 3), 160, 300);
  },
  // 7: ein Schlag zertrümmert den Knöchel
  (T) => {
    sunAt(V(-1, 0, -3)); const tHit = WT(7, 'schlag') + 0.05; const A = 0.85;
    const hitPose = { yaw: hingeYaw(A), pitch: REST_P, armor: 1, t: T, fuse: 1, fused: true, tendon: 1 };
    const walk = clamp((T - S[7].start) / (tHit - 0.35 - S[7].start)); const hd = T - tHit;
    poseRex(rex, { phase: T * 4.2, amp: 1 - ease((T - tHit + 0.5) / 0.4), t: T, jaw: hd > 0 ? lerp(0.15, 0.85, ease(hd / 0.3)) : 0.15, head: hd > 0 ? -0.2 * ease(hd / 0.3) : 0.12, tail: 1.12, teeth: 2.3 });
    const cp = placeRexForHit(hitPose, 1); rex.root.position.x -= (1 - ease(walk)) * 7.5;
    if (hd > 0) { const fk = ease((hd - 0.25) / 1.1); rex.legs[1].knee.rotation.x += 0.9 * ease(hd / 0.25); rex.legs[1].ankle.rotation.x -= 0.6 * ease(hd / 0.2); rex.root.rotation.z = 1.35 * fk; rex.root.position.y += 0.7 * Math.sin(fk * 1.35); rex.root.position.x -= 0.6 * fk; }
    poseAnky(anky, { yaw: hingeYaw(swingAng(T, tHit, A, true)), pitch: REST_P, armor: 1, t: T, fuse: 1, fused: true, tendon: 1 });
    if (hd > 0) { const o = cp.clone().add(V(-0.45, 0.1, 0)); burst(boneBits, o, hd, { spread: 2, up: 2.6, life: 1.2 }); burst(blood, o, hd, { spread: 1.8, up: 2.4, life: 1.1 }); flyShards(o, hd); }
    if (T < tHit - 0.9) cam(V(4.8, 4.2, -13.0), V(-1.8, 1.6, -4.0), 50, T, 0.03);
    else { CUT = tHit - 0.9; cam(cp.clone().add(V(5.6, 0.9, -2.6)), cp.clone().add(V(-0.8, 1.3, 0.4)), 50, T * 7, 0.02 + (hd > 0 ? 0.25 * Math.exp(-hd * 4) : 0)); }
    label3('KNÖCHEL', rexAnkle(1), clamp((T - WT(7, 'knöchel')) * 3), -120, -320);
  },
  // 8: Glückwunsch – Ankylosaurus
  (T) => {
    sunAt(V(0, 0, 0)); const u = T - S[8].start; const tA = WT(8, 'ankylo');
    poseAnky(anky, { yaw: hingeYaw(0.35 * Math.sin(T * 1.4)), pitch: REST_P, armor: 1, t: T, fuse: 1, fused: true, tendon: 1 });
    anky.ol.userData.u.uA.value = clamp((T - tA) * 4) * 0.9;
    rex.root.visible = false;
    const a = 0.9 - u * 0.15; const k = ease(u / 2.5); const R = lerp(9.0, 10.5, k); cam(V(Math.sin(a) * R, lerp(2.6, 3.4, k), Math.cos(a) * R - 1.6), V(0, 1.0, -1.6), 48, T, 0.02);
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
  CUT = 0; GT = T; GI = i; scene.updateMatrixWorld(true); shots[i](T); scene.updateMatrixWorld(true);
  { const u = T - Math.max(S[i].start, CUT); renderer.domElement.style.filter = T > 0.3 && u < 0.12 ? `blur(${((1 - u / 0.12) * 7).toFixed(1)}px)` : 'none'; }
  { const fd = camera.position.distanceTo(LOOK); bokeh.enabled = fd < 11 && scene.background === null; bokeh.uniforms.focus.value = fd; bokeh.uniforms.aperture.value = 0.00022 * clamp((11 - fd) / 5); }
  hideNearGrass(); composer.render(); labEl.innerHTML = ui.join(''); svgEl.innerHTML = svg.join(''); caption(T); return i;
};
await document.fonts.load('900 50px M'); await document.fonts.load('50px "Noto Color Emoji"');
window.renderAt(0.5); window.READY = true;
window.STATS = () => { let tris = 0, verts = 0, meshes = 0; const seen = new Set(); rex.root.traverse(o => { if (o.isMesh && !(o.material && o.material.side === THREE.BackSide)) { meshes++; const g = o.geometry; const n = g.index ? g.index.count / 3 : g.attributes.position.count / 3; tris += n * (o.isInstancedMesh ? o.count : 1); if (!seen.has(g)) { seen.add(g); verts += g.attributes.position.count * (o.isInstancedMesh ? o.count : 1); } } }); return { meshes, tris: Math.round(tris), verts }; };
