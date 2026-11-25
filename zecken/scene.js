// "Wenn … du einen zeckensicheren Garten baust" – komplett prozedurale 3D-Szene (Three.js)
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
// ---------- Zeckengarten: Garten, Waldrand, Zecke, Mäuse, Hund, Kind ----------
world.children.forEach(c => { if (c !== GRASS) c.visible = false; });
const G = {}; const garden = new THREE.Group(); scene.add(garden);
const M = (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.8 }, o));
const box = (w, h, d, m, x, y, z, parent = garden) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; parent.add(b); return b; };
const cyl = (r0, r1, h, m, x, y, z, seg = 12, parent = garden) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), m); c.position.set(x, y, z); c.castShadow = c.receiveShadow = true; parent.add(c); return c; };
const woodTex = (base) => canvasTex(256, 256, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); const r = rng(5); for (let i = 0; i < 240; i++) { g.strokeStyle = `rgba(60,35,15,${0.12 + r() * 0.2})`; g.lineWidth = 1 + r() * 2; const x = r() * w; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (r() - .5) * 10, h / 3, x + (r() - .5) * 10, h * 2 / 3, x + (r() - .5) * 8, h); g.stroke(); } });
const woodM = M(0xffffff, { map: woodTex('#c79a62'), roughness: 0.85 }); const woodDM = M(0xffffff, { map: woodTex('#8a5a34'), roughness: 0.85 });
const roofM = M(0x4c5a3a, { roughness: 0.75 });
const gridTex = canvasTex(128, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#c4c9ce'; g.lineWidth = 2.2; for (let i = 2; i < 128; i += 21.33) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); } }); gridTex.wrapS = gridTex.wrapT = THREE.RepeatWrapping;
const meshMat = (rx, ry) => { const t = gridTex.clone(); t.repeat.set(rx, ry); t.needsUpdate = true; return new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.35, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.45 }); };
// Garten drumherum: Holzzaun, Haus, Apfelbaum, Beet
{ const FXg = 6.5, FZa = -6.0, FZb = 7.0, H = 1.6; const pos = []; const run = (x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(L / 0.16), a = Math.atan2(x1 - x0, z1 - z0); for (let i = 0; i <= n; i++) pos.push([lerp(x0, x1, i / n), lerp(z0, z1, i / n), a]); };
  run(-FXg, FZa, -0.7, FZa); run(0.7, FZa, FXg, FZa); run(-FXg, FZa, -FXg, FZb); run(FXg, FZa, FXg, FZb);
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.15, H, 0.03), woodDM, pos.length); const m4 = new THREE.Matrix4(); const r = rng(9); const col = new THREE.Color();
  pos.forEach(([x, z, a], i) => { m4.compose(V(x, H / 2, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, a + Math.PI / 2, 0)), V(1, 1, 1)); im.setMatrixAt(i, m4); col.setHSL(0.07, 0.35, 0.55 + r() * 0.12); im.setColorAt(i, col); });
  im.castShadow = im.receiveShadow = true; garden.add(im);
  const sidingTex = canvasTex(64, 256, (g, w, hh) => { g.fillStyle = '#e9e4da'; g.fillRect(0, 0, w, hh); for (let y = 0; y < hh; y += 16) { g.fillStyle = 'rgba(0,0,0,0.14)'; g.fillRect(0, y + 13, w, 3); } }); sidingTex.repeat.set(10, 3);
  const hs = new THREE.Group(); hs.position.set(-1, 0, 12); hs.rotation.y = Math.PI; garden.add(hs); G.house = hs; box(12, 6, 6, M(0xffffff, { map: sidingTex }), 0, 3, 0, hs);
  const rf = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 4.6, 2.4, 4, 1), M(0x7a3b2e)); rf.rotation.y = Math.PI / 4; rf.scale.set(1.9, 1, 1); rf.position.y = 7.2; hs.add(rf);
  for (const x of [-3.5, 0, 3.5]) { box(1.6, 1.4, 0.12, M(0xf7f5f0), x, 3.8, 3.02, hs); box(1.35, 1.15, 0.05, M(0x5d7891, { roughness: 0.15, metalness: 0.3 }), x, 3.8, 3.08, hs); }
  const trunk = M(0x5b4632, { roughness: 0.9 }); const leafMs = [M(0x3d6b2a), M(0x4f7d32), M(0x2f5a24)];
  const tree = (x, z, s) => { const t = new THREE.Group(); t.position.set(x, 0, z); garden.add(t); cyl(0.12 * s, 0.2 * s, 3.2 * s, trunk, 0, 1.6 * s, 0, 8, t);
    for (let k = 0; k < 9; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry((0.9 + r() * 0.6) * s, 1), leafMs[k % 3]); b.position.set((r() - .5) * 2.2 * s, (3.2 + r() * 1.8) * s, (r() - .5) * 2.2 * s); b.castShadow = true; t.add(b); } return t; };
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + 0.2, d = 12 + r() * 8; tree(Math.cos(a) * d, Math.sin(a) * d - 2, 1 + r() * 0.5); }
  for (let i = 0; i < 46; i++) tree((r() - 0.5) * 30, -7.5 - r() * 10, 1 + r() * 0.6); // Wald hinter dem Zaun
  G.tree = tree;
  // Apfelbaum rechts hinter dem Auslauf
  const at = new THREE.Group(); at.position.set(3.4, 0, -2.6); garden.add(at); G.apple = at; cyl(0.11, 0.17, 1.9, trunk, 0, 0.95, 0, 9, at);
  const appleM = M(0xc8231d, { roughness: 0.45 });
  for (let k = 0; k < 9; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75 + r() * 0.35, 1), leafMs[k % 3]); b.position.set((r() - .5) * 1.8, 2.1 + r() * 1.1, (r() - .5) * 1.8); b.castShadow = true; at.add(b);
    for (let j = 0; j < 4; j++) { const a = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), appleM); const d = V(r() - .5, r() - .6, r() - .5).normalize().multiplyScalar(0.78); a.position.copy(b.position).add(d); at.add(a); } }
  // Beet mit Tomaten links
  const bed = new THREE.Group(); bed.position.set(-3.6, 0, -2.4); garden.add(bed); box(1.4, 0.25, 2.6, woodDM, 0, 0.125, 0, bed); box(1.3, 0.04, 2.5, M(0x3b2a1e, { roughness: 1 }), 0, 0.24, 0, bed);
  const tm = M(0xd8301f, { roughness: 0.4 }); for (let k = 0; k < 6; k++) { const px = (k % 2 - 0.5) * 0.6, pz = (Math.floor(k / 2) - 1) * 0.8; cyl(0.012, 0.012, 1.1, M(0x8a6a44), px, 0.8, pz, 5, bed);
    for (let j = 0; j < 5; j++) { const l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), leafMs[j % 3]); l.position.set(px + (r() - .5) * 0.25, 0.45 + j * 0.16, pz + (r() - .5) * 0.25); bed.add(l); const t2 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), tm); t2.position.set(px + (r() - .5) * 0.3, 0.45 + j * 0.15, pz + 0.12); bed.add(t2); } } }
function furGeo(r, amp, seed) { const g = new THREE.IcosahedronGeometry(r, 4); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const v = V(p.getX(i), p.getY(i), p.getZ(i)); const n = fbm(v.x * 9 + seed, v.y * 9, v.z * 9, 3); v.multiplyScalar(1 + amp * (n - 0.45)); p.setXYZ(i, v.x, v.y, v.z); } g.computeVertexNormals(); return g; }
function makeQuad(o) {
  const q = { root: new THREE.Group(), body: new THREE.Group(), o }; scene.add(q.root); q.root.add(q.body);
  const { H = 0.6, L = 0.8, R = 0.2, col = 0xffffff, col2 = col, fur = 0.15, ears = 'prick', tail = 'bushy', horns = false, beard = false, snout = 0.14 } = o;
  const m1 = new THREE.MeshStandardMaterial({ color: col, roughness: 0.95 }), m2 = new THREE.MeshStandardMaterial({ color: col2, roughness: 0.95 }); const noseM = M(0x1a1716, { roughness: 0.4 }); q.mats = [m1, m2];
  const sp = (g, m, x, y, z, sx = 1, sy = 1, sz = 1, parent = q.body) => { const s = new THREE.Mesh(g, m); s.position.set(x, y, z); s.scale.set(sx, sy, sz); s.castShadow = true; parent.add(s); return s; };
  q.torso = sp(furGeo(R, fur, o.seed || 1), m1, 0, H + R * 0.25, 0, 1, 1, L / (2 * R)); sp(furGeo(R * 0.95, fur, 3), m1, 0, H + R * 0.35, L * 0.36, 1.02, 1.05, 1.0); sp(furGeo(R * 0.9, fur, 5), m2, 0, H + R * 0.3, -L * 0.36, 1, 1, 1);
  // Hals + Kopf
  q.neckP = new THREE.Group(); q.neckP.position.set(0, H + R * 0.6, L * 0.42); q.body.add(q.neckP);
  sp(furGeo(R * 0.62, fur, 7), m1, 0, R * 0.45, R * 0.25, 1, 1.5, 1, q.neckP);
  q.head = new THREE.Group(); q.head.position.set(0, R * 1.15, R * 0.6); q.neckP.add(q.head);
  sp(furGeo(R * 0.6, fur * 0.7, 9), m1, 0, 0, 0, 0.95, 0.9, 1.05, q.head);
  const sn = sp(new THREE.CylinderGeometry(R * 0.26, R * 0.36, snout * 1.6, 12), o.snoutCol ? M(o.snoutCol) : m1, 0, -R * 0.15, R * 0.45 + snout * 0.5, 1, 1, 1, q.head); sn.rotation.x = Math.PI / 2 + 0.1;
  sp(new THREE.SphereGeometry(R * 0.14, 10, 8), noseM, 0, -R * 0.06, R * 0.45 + snout * 1.3, 1.3, 0.9, 1, q.head);
  q.jaw = new THREE.Group(); q.jaw.position.set(0, -R * 0.33, R * 0.4); q.head.add(q.jaw); const jw = sp(new THREE.BoxGeometry(R * 0.38, R * 0.1, snout * 1.4), M(0x2a1416), 0, 0, snout * 0.7, 1, 1, 1, q.jaw);
  for (const s of [-1, 1]) { sp(new THREE.SphereGeometry(R * 0.075 * (o.eyeR || 1), 10, 8), noseM, s * R * 0.3, R * 0.14, R * 0.42, 1, 1, 0.7, q.head);
    const ear = new THREE.Mesh(ears === 'goat' ? new THREE.SphereGeometry(R * 0.25, 10, 8) : new THREE.ConeGeometry(R * 0.2, R * 0.5, 8), o.earCol ? M(o.earCol, { roughness: 0.95 }) : ears === 'floppy' ? m1 : m2);
    if (ears === 'prick') { ear.position.set(s * R * 0.3, R * 0.55, -R * 0.05); ear.rotation.z = -s * 0.2; }
    else if (ears === 'floppy') { ear.position.set(s * R * 0.5, R * 0.05, -R * 0.02); ear.rotation.z = s * 2.6; ear.scale.set(1.2, 1, 0.45); }
    else { ear.position.set(s * R * 0.62, R * 0.15, -R * 0.1); ear.scale.set(1.5, 0.45, 0.6); ear.rotation.z = -s * 0.3; }
    ear.castShadow = true; q.head.add(ear);
    if (horns) { const hn = new THREE.Mesh(new THREE.TorusGeometry(R * 0.35, R * 0.07, 6, 12, 2.2), M(0x8c7a5c)); hn.position.set(s * R * 0.2, R * 0.45, -R * 0.35); hn.rotation.set(0, Math.PI / 2, 0.6); q.head.add(hn); } }
  if (beard) sp(new THREE.ConeGeometry(R * 0.1, R * 0.4, 6), m2, 0, -R * 0.6, R * 0.75, 1, 1, 1, q.head).rotation.x = Math.PI;
  // Beine: Hüfte -> Knie
  q.legs = []; for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { const hip = new THREE.Group(); hip.position.set(x * R * 0.55, H + R * 0.1, z * L * 0.36); q.body.add(hip);
    sp(furGeo(R * 0.32, fur, x + z * 3), z > 0 ? m1 : m2, 0, -H * 0.22, 0, 1, 1.9, 1, hip); const knee = new THREE.Group(); knee.position.y = -H * 0.5; hip.add(knee);
    sp(new THREE.CylinderGeometry(R * 0.14, R * 0.12, H * 0.5, 8), o.legCol ? M(o.legCol) : m1, 0, -H * 0.25, 0, 1, 1, 1, knee); sp(new THREE.SphereGeometry(R * 0.17, 8, 6), o.legCol ? M(o.legCol) : m1, 0, -H * 0.5 + R * 0.06, R * 0.06, 1, 0.6, 1.3, knee);
    q.legs.push({ hip, knee, front: z > 0, side: x }); }
  // Schwanz
  q.tail = new THREE.Group(); q.tail.position.set(0, H + R * 0.6, -L * 0.48); q.body.add(q.tail);
  const tl = tail === 'goat' ? sp(new THREE.ConeGeometry(R * 0.12, R * 0.4, 6), m2, 0, R * 0.15, -R * 0.05, 1, 1, 1, q.tail) : sp(furGeo(R * 0.28, fur * 1.3, 11), m2, 0, -R * 0.6, -R * 0.15, 1, 2.6, 1, q.tail);
  return q;
}
// o: pos, yaw, gait (Phase), run 0..1, walk 0..1, lie 0..1, headY, headP, mouth, wag, dig, jump (Beine angezogen), scale, sleep
function poseQ(q, o = {}) {
  const { pos = V(0, 0, 0), yaw = 0, gait = 0, walk = 0, run = 0, lie = 0, headY = 0, headP = 0, mouth = 0, wag = 0, dig = 0, jump = 0, scale = 1, T = 0, vis = true, crouch = 0 } = o; const { H = 0.6, R = 0.2 } = q.o;
  q.root.visible = vis; if (!vis) return; q.root.position.copy(pos); q.root.rotation.set(0, yaw, 0); q.root.scale.setScalar(scale);
  const amp = walk * 0.45 + run * 0.9; const lieY = -(H * 0.85) * lie;
  q.body.position.y = lieY - crouch * H * 0.25 + run * Math.abs(Math.sin(gait)) * 0.06 + walk * Math.abs(Math.sin(gait * 2)) * 0.015; q.body.rotation.x = dig * 0.25 - jump * 0.25 + run * 0.05 * Math.sin(gait * 2) - crouch * 0.1;
  q.legs.forEach((l, i) => { const ph = run > 0.5 ? gait + (l.front ? 0 : Math.PI * 0.6) + (l.side > 0 ? 0.35 : 0) : gait + ((l.front === (l.side < 0)) ? 0 : Math.PI);
    let hx = amp * 0.6 * Math.sin(ph), kx = -amp * 0.7 * Math.max(0, Math.cos(ph));
    if (lie > 0) { hx = lerp(hx, l.front ? -1.45 : 1.3, lie); kx = lerp(kx, l.front ? 1.2 : -2.0, lie); }
    if (dig > 0 && l.front) { hx = lerp(hx, -0.6 + 0.6 * Math.sin(T * 18 + (l.side > 0 ? Math.PI : 0)), dig); kx = lerp(kx, 0.9, dig); }
    if (jump > 0) { hx = lerp(hx, l.front ? -1.0 : 0.9, jump); kx = lerp(kx, l.front ? 1.5 : -1.4, jump); }
    l.hip.rotation.x = hx; l.knee.rotation.x = kx; });
  const sleep = o.sleep || 0; q.neckP.rotation.x = headP * 0.5 + dig * 0.6 + lie * 0.25 + sleep * 0.5; q.head.rotation.set(headP * 0.6 + sleep * 0.4, headY, 0); q.jaw.rotation.x = mouth * 0.5;
  q.tail.rotation.set(q.o.tail === 'curl' ? -0.6 - wag * 0.2 : 0.25 + run * 0.6, 0, Math.sin(T * 12) * 0.4 * wag);
}
// ---------- Rasen mit Zonen (mähbar, Waldrand-Streifen, Zaun-Streifen) ----------
const LN = 30000, LP = [];
{ const blade = new THREE.BufferGeometry(); blade.setAttribute('position', new THREE.Float32BufferAttribute([-0.01, 0, 0, 0.01, 0, 0, -0.006, 0.12, 0.012, 0.006, 0.12, 0.012, 0, 0.25, 0.04], 3)); blade.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]); blade.computeVertexNormals();
  const im = new THREE.InstancedMesh(blade, M(0xffffff, { side: THREE.DoubleSide, roughness: 0.85 }), LN); const r = rng(77), col = new THREE.Color();
  for (let i = 0; i < LN; i++) { const x = (r() - 0.5) * 12.8, z = -5.9 + r() * 12.6; const edge = z < -4.3 ? 'wood' : x > 5.0 ? 'fence' : 'lawn'; LP.push({ x, z, ry: r() * 6.3, tx: (r() - .5) * 0.5, s: 0.8 + r() * 0.6, h: 0.9 + r() * 0.9, edge }); col.setHSL(0.22 + r() * 0.06, 0.45, 0.2 + r() * 0.16); im.setColorAt(i, col); }
  im.receiveShadow = true; garden.add(im); G.lawn = im; }
let lawnKey = '';
// mow: Rasen kurz (0..1), mx: gemäht bis x (Mäher-Fortschritt), chips: Häckselstreifen (0..1), tallFence: Gras am Zaun hoch
function lawnSet(mow = 0, chips = 0, mx = 99) { const key = [mow, chips, mx].map(v => v.toFixed(2)).join('|'); if (key === lawnKey) return; lawnKey = key; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  LP.forEach((p, i) => { let h = p.h * (p.edge === 'lawn' ? 0.9 : 1.6); if (p.edge === 'lawn' && p.x < mx) h = lerp(h, 0.22, mow); if (p.edge === 'wood' && p.z > -5.7 && p.x > lerp(7, -7, chips)) h = 0; let s = p.s; if (h === 0) s = 0;
    e.set(p.tx, p.ry, 0); q.setFromEuler(e); m4.compose(V(p.x, 0, p.z), q, V(s, s * h, s)); G.lawn.setMatrixAt(i, m4); }); G.lawn.instanceMatrix.needsUpdate = true; }
{ const Z = new THREE.Matrix4().makeScale(0, 0, 0), P = V(0, 0, 0); for (let i = 0; i < GRASS_BASE.length; i++) { P.setFromMatrixPosition(GRASS_BASE[i]); if (Math.abs(P.x) < 7 && P.z > -6.2 && P.z < 8) { GRASS_BASE[i] = Z.clone(); GRASS.setMatrixAt(i, Z); } } GRASS.instanceMatrix.needsUpdate = true; }
// Büsche am Waldrand (hinter dem Zaun)
{ const r = rng(15); const bm = [M(0x2f5a24), M(0x3d6b2a), M(0x4f7d32)]; for (let i = 0; i < 40; i++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4 + r() * 0.5, 1), bm[i % 3]); b.position.set((r() - 0.5) * 14, 0.3, -6.4 - r() * 1.4); b.scale.y = 0.8; b.castShadow = true; garden.add(b); } }
// Holzhäcksel-Streifen
const chipTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#8a6440'; g.fillRect(0, 0, w, h); const r = rng(4); for (let k = 0; k < 900; k++) { g.fillStyle = ['#b98a58', '#d8ae78', '#6e4c2e', '#a07448'][(r() * 4) | 0]; g.save(); g.translate(r() * w, r() * h); g.rotate(r() * 3); g.fillRect(-6, -2, 10 + r() * 8, 3 + r() * 3); g.restore(); } });
chipTex.wrapS = chipTex.wrapT = THREE.RepeatWrapping; chipTex.repeat.set(12, 1.2); chipTex.colorSpace = THREE.SRGBColorSpace;
G.chips = new THREE.Mesh(new THREE.BoxGeometry(12.8, 0.05, 1.3), M(0xffffff, { map: chipTex, roughness: 1 })); G.chips.geometry.translate(-6.4, 0, 0); G.chips.position.set(6.4, 0.025, -5.05); G.chips.receiveShadow = true; garden.add(G.chips);
// Laubhaufen
G.LPOS = V(-5.1, 0, -3.5); { const NL = 900, r = rng(21); const lg = new THREE.CircleGeometry(0.06, 6); lg.scale(1, 0.6, 1); G.leaves = new THREE.InstancedMesh(lg, M(0xffffff, { side: THREE.DoubleSide, roughness: 1 }), NL); G.leafB = []; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  for (let i = 0; i < NL; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * 1.0; const y = 0.55 * Math.sqrt(Math.max(0, 1 - d * d)) * r(); const p = V(Math.cos(a) * d, y + 0.02, Math.sin(a) * d * 0.8); q.setFromEuler(new THREE.Euler(r() * 3, r() * 3, r() * 3)); m4.compose(p, q, V(1, 1, 1).multiplyScalar(0.8 + r() * 0.7)); G.leafB.push({ p, q: q.clone(), s: 0.8 + r() * 0.7 }); G.leaves.setMatrixAt(i, m4); c.setHSL(0.04 + r() * 0.08, 0.7, 0.3 + r() * 0.15); G.leaves.setColorAt(i, c); }
  G.leaves.position.copy(G.LPOS); garden.add(G.leaves); }
function leavesSet(k) { const m4 = new THREE.Matrix4(); G.leafB.forEach((l, i) => { const s = l.s * (1 - clamp(k * 1.4 - (i % 50) / 50 * 0.4)); m4.compose(l.p.clone().multiplyScalar(lerp(1, 0.3, k)), l.q, V(s, s, s).addScalar(1e-4)); G.leaves.setMatrixAt(i, m4); }); G.leaves.instanceMatrix.needsUpdate = true; }
G.bag = box(0.55, 0.8, 0.45, M(0x2f4a2a, { roughness: 0.6 }), 0, 0.4, 0); garden.add(G.bag);
// Spielplatz: Schaukel + Sandkasten, Terrasse am Haus
G.play = new THREE.Group(); G.play.position.set(1.8, 0, 0.6); garden.add(G.play); { const pm = M(0x3a6ab8, { roughness: 0.5 }); for (const x of [-1, 1]) for (const z of [-0.5, 0.5]) { const p = cyl(0.04, 0.04, 2.1, pm, x * 1.0, 1.0, z * 0.5, 8, G.play); p.rotation.x = -z * 0.45; }
  const bar = cyl(0.04, 0.04, 2.1, pm, 0, 1.95, 0, 8, G.play); bar.rotation.z = Math.PI / 2; for (const x of [-0.45, 0.45]) { for (const s of [-0.12, 0.12]) cyl(0.006, 0.006, 1.45, M(0x777777), x + s, 1.22, 0, 4, G.play); box(0.35, 0.04, 0.16, M(0xe8483b), x, 0.5, 0, G.play); }
  box(1.4, 0.2, 1.4, woodM, -2.6, 0.1, 0.4, G.play); box(1.25, 0.05, 1.25, M(0xe8d098, { roughness: 1 }), -2.6, 0.19, 0.4, G.play); }
G.deck = box(5, 0.15, 2.2, woodM, -1, 0.075, 7.8);
// Holzstapel
G.wood = new THREE.Group(); garden.add(G.wood); { const lm = M(0x9a6a3e, { roughness: 0.9 }), em = M(0xd8b07a, { roughness: 0.9 }); for (let row = 0; row < 4; row++) for (let k = 0; k < 6 - (row % 2); k++) { const l = cyl(0.1, 0.1, 1.1, lm, (k - 2.5 + (row % 2) * 0.5) * 0.21, 0.1 + row * 0.19, 0, 10, G.wood); l.rotation.x = Math.PI / 2; } }
// ---------- Zecke ----------
function makeTick() { const t = { root: new THREE.Group() }; scene.add(t.root); const bm = M(0x5a1e12, { roughness: 0.35, metalness: 0.1 }), sm = M(0x2a0e08, { roughness: 0.3 }), lm = M(0x3a1a10, { roughness: 0.6 });
  t.bodyM = bm; const b = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), bm); b.scale.set(0.55, 0.3, 0.75); t.root.add(b); t.body = b; const sh = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), sm); sh.scale.set(0.42, 0.25, 0.4); sh.position.set(0, 0.08, 0.38); t.root.add(sh);
  const hd = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 8), sm); hd.rotation.x = Math.PI / 2; hd.position.set(0, 0, 0.95); t.root.add(hd); t.legs = [];
  for (const s of [-1, 1]) for (let k = 0; k < 4; k++) { const g = new THREE.Group(); g.position.set(s * 0.4, 0, 0.45 - k * 0.22); t.root.add(g); const u = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.6, 6), lm); u.rotation.z = s * 1.1; u.position.set(s * 0.25, 0.12, 0); g.add(u);
    const lo = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.02, 0.6, 6), lm); lo.position.set(s * 0.62, -0.08, 0); lo.rotation.z = -s * 0.5; g.add(lo); g.userData = { s, k }; t.legs.push(g); } return t; }
function poseTick(t, { pos, yaw = 0, pitch = 0, s = 0.04, quest = 0, T = 0, vis = true, dry = 0 }) { t.root.visible = vis; if (!vis) return; t.root.position.copy(pos); t.root.rotation.set(pitch, yaw, 0, 'YXZ'); t.root.scale.setScalar(s * (1 - 0.35 * dry));
  t.bodyM.color.set(0x5a1e12).lerp(new THREE.Color(0xb09078), dry); t.legs.forEach(g => { const { s: sd, k } = g.userData; g.rotation.set(k === 0 ? -quest * (1.1 + 0.4 * Math.sin(T * 6 + sd)) : 0.15 * Math.sin(T * 4 + k), k === 0 ? -sd * quest * 0.6 : 0, 0); }); }
const tick = makeTick();
// Zecken-Punkte (instanziert): auf Grasspitzen, Mäusen, Hund, Kleidung
const NT = 140; G.dots = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), M(0x2a0e08, { roughness: 0.4 }), NT); G.dots.frustumCulled = false; scene.add(G.dots);
function dotsSet(list) { const m4 = new THREE.Matrix4(), Z = new THREE.Matrix4().makeScale(0, 0, 0), q = new THREE.Quaternion(); for (let i = 0; i < NT; i++) { const d = list[i]; if (!d) { G.dots.setMatrixAt(i, Z); continue; } m4.compose(d.p, q, V(d.s || 0.02, (d.s || 0.02) * 0.7, (d.s || 0.02) * 1.3)); G.dots.setMatrixAt(i, m4); } G.dots.instanceMatrix.needsUpdate = true; G.dots.visible = list.length > 0; }
// ---------- Mäuse ----------
function makeMouse() { const m = { root: new THREE.Group() }; scene.add(m.root); const fm = M(0x8a8078, { roughness: 0.9 }); const b = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), fm); b.scale.set(0.035, 0.03, 0.06); b.position.y = 0.03; m.root.add(b);
  const h = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 8), fm); h.position.set(0, 0.04, 0.065); h.scale.z = 1.4; m.root.add(h); for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 6), M(0xd8a8a0)); e.position.set(s * 0.018, 0.065, 0.055); e.scale.z = 0.3; m.root.add(e); }
  const t = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.002, 0.1, 4), M(0xc8a098)); t.rotation.x = Math.PI / 2 + 0.3; t.position.set(0, 0.03, -0.1); m.root.add(t); return m; }
const mice = [0, 1, 2, 3].map(() => makeMouse());
function poseMouse(m, { pos, yaw = 0, T = 0, vis = true, s = 2.2 }) { m.root.visible = vis; if (!vis) return; m.root.position.copy(pos).add(V(0, Math.abs(Math.sin(T * 20)) * 0.01, 0)); m.root.rotation.y = yaw; m.root.scale.setScalar(s); }
// ---------- Hund (aus dem Hunde-Video) ----------
const dog = makeQuad({ H: 0.66, L: 1.0, R: 0.26, col: 0xc9965a, col2: 0xf0e4d0, fur: 0.16, ears: 'floppy', earCol: 0x8a5a30, tail: 'curl', snout: 0.22, seed: 21, snoutCol: 0xf1ebe0, eyeR: 1.5 });
dog.collar = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 8, 24), M(0xe8323c, { roughness: 0.4 })); dog.collar.rotation.x = Math.PI / 2 - 0.4; dog.collar.position.set(0, 0.1, 0.05); dog.neckP.add(dog.collar);
dog.tickPts = []; { const r = rng(12); for (let i = 0; i < 14; i++) { const a = r() * 6.28, b = (r() - 0.3) * 1.4; dog.tickPts.push(V(Math.cos(a) * Math.cos(b) * 0.27, 0.66 + 0.07 + Math.sin(b) * 0.27, (r() - 0.5) * 0.85)); } }
const dogTicks = (k) => { dog.root.updateMatrixWorld(true); return dog.tickPts.slice(0, Math.round(k * dog.tickPts.length)).map(p => ({ p: p.clone().applyMatrix4(dog.body.matrixWorld), s: 0.022 })); };
// ---------- Kind ----------
function makeKid() { const k = { root: new THREE.Group() }; scene.add(k.root); const skin = M(0xf0c8a0, { roughness: 0.7 }); k.shirtM = M(0xe8483b); k.pantsM = M(0x3a5a9a); k.sleeveM = M(0xf0c8a0); k.legLowM = M(0xf0c8a0);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.28, 6, 12), k.shirtM); torso.position.y = 0.78; k.root.add(torso); k.torso = torso;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 14), skin); head.position.y = 1.12; k.root.add(head); k.head = head; const hair = new THREE.Mesh(new THREE.SphereGeometry(0.137, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), M(0x6a4428)); hair.position.copy(head.position); hair.rotation.x = -0.25; k.root.add(hair);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), M(0x1a1410)); e.position.set(s * 0.045, 1.13, 0.115); k.root.add(e); }
  k.limbs = []; for (const [s, arm] of [[-1, 1], [1, 1], [-1, 0], [1, 0]]) { const g = new THREE.Group(); g.position.set(s * (arm ? 0.17 : 0.07), arm ? 0.98 : 0.6, 0); k.root.add(g); const L = arm ? 0.42 : 0.58;
    const up = new THREE.Mesh(new THREE.CylinderGeometry(arm ? 0.04 : 0.055, arm ? 0.035 : 0.05, L * 0.5, 8), arm ? k.shirtM : k.pantsM); up.position.y = -L * 0.25; g.add(up); const lo = new THREE.Mesh(new THREE.CylinderGeometry(arm ? 0.035 : 0.05, arm ? 0.03 : 0.045, L * 0.5, 8), arm ? k.sleeveM : k.legLowM); lo.position.y = -L * 0.75; g.add(lo);
    if (!arm) { const sh = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.16), M(0xffffff)); sh.position.set(0, -L, 0.03); g.add(sh); } k.limbs.push({ g, s, arm }); }
  k.tickPts = [V(0.06, 0.84, 0.13), V(-0.08, 0.7, 0.13), V(0.07, 0.3, 0.05), V(-0.07, 0.18, 0.05), V(0.17, 0.62, 0.04), V(-0.06, 0.42, 0.06)]; return k; }
const kids = [makeKid(), makeKid()]; kids[1].shirtM.color.set(0x2fbf5b);
function poseKid(k, { pos, yaw = 0, run = 0, T = 0, vis = true, light = 0, scale = 1 }) { k.root.visible = vis; if (!vis) return; k.root.position.copy(pos).add(V(0, run * Math.abs(Math.sin(T * 9)) * 0.04, 0)); k.root.rotation.y = yaw; k.root.scale.setScalar(scale);
  k.limbs.forEach(l => l.g.rotation.x = Math.sin(T * 9 + (l.s > 0 ? 0 : Math.PI) + (l.arm ? Math.PI : 0)) * 0.6 * run);
  if (light > 0.5) { k.shirtM.color.set(0xf4f2ec); k.pantsM.color.set(0xe8e4da); k.sleeveM.color.set(0xf4f2ec); k.legLowM.color.set(0xe8e4da); } else { k.pantsM.color.set(0x3a5a9a); k.sleeveM.color.set(0xf0c8a0); k.legLowM.color.set(0xf0c8a0); } }
const kidTicks = (k, n) => { k.root.updateMatrixWorld(true); return k.tickPts.slice(0, n).map(p => ({ p: p.clone().applyMatrix4(k.root.matrixWorld), s: 0.016 })); };
// Rasenmäher
G.mower = new THREE.Group(); scene.add(G.mower); { box(0.5, 0.22, 0.6, M(0xd8323a, { roughness: 0.4 }), 0, 0.2, 0, G.mower); for (const [x, z] of [[-0.25, 0.22], [0.25, 0.22], [-0.25, -0.22], [0.25, -0.22]]) { const w = cyl(0.08, 0.08, 0.05, M(0x1a1a1a), x, 0.08, z, 12, G.mower); w.rotation.z = Math.PI / 2; }
  const hdl = cyl(0.015, 0.015, 1.0, M(0x333333), 0, 0.6, -0.55, 6, G.mower); hdl.rotation.x = -0.9; }
// Großer Grashalm (Nahaufnahme)
G.blade = new THREE.Mesh((() => { const g = new THREE.PlaneGeometry(0.03, 0.6, 1, 12); g.translate(0, 0.3, 0); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) * (1 - y / 0.65)); p.setZ(i, 0.12 * (y / 0.6) ** 2); } g.computeVertexNormals(); return g; })(), M(0x5a8a2c, { side: THREE.DoubleSide })); scene.add(G.blade);
function mood(m) { const P = { day: [0x8fb4dc, 0xf2e6cf, 0xffe0b0, 3.2, 1.5, 0xe9e2cf], hot: [0x7fb0e8, 0xfff2d6, 0xfff0cc, 4.4, 1.7, 0xf6eed8], dusk: [0x5a5f9a, 0xf0a878, 0xffa060, 2.4, 1.15, 0xc9a08a] }[m];
  skyU.top.value.set(P[0]); skyU.hor.value.set(P[1]); sun.color.set(P[2]); sun.intensity = P[3]; hemi.intensity = P[4]; scene.fog.color.set(P[5]); }
const headW = q => { q.root.updateMatrixWorld(true); return q.head.getWorldPosition(V(0, 0, 0)); };
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
// ---------- Helfer ----------
const flash = (k, col = '255,40,30') => { if (k > 0) svg.push(`<rect x="0" y="0" width="1080" height="1920" fill="rgba(${col},${(0.35 * k).toFixed(3)})"/>`); };
function chip(text, x, y, k, col = '#f3c63f') { if (k <= 0) return; ui.push(`<div class="pill" style="left:${x}px;top:${y}px;border-color:${col};transform:translate(-50%,-50%) scale(${back(k)})">${text}</div>`); }
function icon(ok, x, y, k) { if (k <= 0) return; const s = back(k);
  svg.push(`<g transform="translate(${x},${y}) scale(${s})"><circle r="62" fill="${ok ? '#2fbf5b' : '#fff'}" stroke="#000" stroke-width="9"/>` + (ok ? '<path d="M-30 2 L-8 24 L32 -22" fill="none" stroke="#fff" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>' : '<path d="M-27 -27 L27 27 M27 -27 L-27 27" stroke="#e8323c" stroke-width="17" stroke-linecap="round"/>') + '</g>'); }
function ring(p, k, col = '#e8323c', r0 = 70) { if (k <= 0) return; const [x, y] = proj(p); svg.push(`<circle cx="${x}" cy="${y}" r="${(r0 * back(k)).toFixed(1)}" fill="none" stroke="${col}" stroke-width="9"/>`); }
function sunRays(k, T) { if (k <= 0) return; for (let i = 0; i < 6; i++) { const x = 140 + i * 170 + 30 * Math.sin(T + i); svg.push(`<line x1="${x + 260}" y1="0" x2="${x}" y2="900" stroke="#ffd84a" stroke-width="16" opacity="${(0.5 * k).toFixed(2)}" stroke-linecap="round"/>`); } }
function drops(p, k, T) { if (k <= 0) return; const [x, y] = proj(p); for (let i = 0; i < 4; i++) { const ph = (T * 0.6 + i / 4) % 1; const dx = x + (i - 1.5) * 80, dy = y - 140 - ph * 90;
    svg.push(`<path transform="translate(${dx},${dy.toFixed(1)}) scale(${k})" d="M0 -26 C14 -6 18 6 0 18 C-18 6 -14 -6 0 -26 Z" fill="#6ec3ff" stroke="#000" stroke-width="5" opacity="${(1 - ph).toFixed(2)}"/>`); } }
function lens(p, k) { if (k <= 0) return; const [x, y] = proj(p); svg.push(`<g transform="translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${back(k)})"><circle r="70" fill="rgba(255,255,255,0.18)" stroke="#111" stroke-width="14"/><circle r="70" fill="none" stroke="#fff" stroke-width="5"/><line x1="50" y1="50" x2="120" y2="120" stroke="#111" stroke-width="22" stroke-linecap="round"/></g>`); }
function camFix(pos, look, fov = 40) { LOOK = look.clone(); camera.position.copy(pos); camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(look); camera.updateMatrixWorld(true); }
const WP = (i, pre, n) => WT(i, pre, n);
const Q0 = V(0.6, 0, 3.2); const WOOD0 = V(3.6, 0, 0.4), WOOD1 = V(-5.3, 0, -4.9);
const woodTips = (n, seed = 3) => { const r = rng(seed), out = []; for (let i = 0; i < n; i++) { const x = (r() - 0.5) * 12, z = -5.0 - r() * 0.9; out.push({ p: V(x, 0.35 + r() * 0.12, z), s: 0.028 }); } return out; };

// ---------- Reset ----------
function resetWorld() { rex.root.visible = false; ui = []; svg = []; badge.style.display = 'none'; cta.style.display = 'none'; }
function stage(i, T) {
  mood('day'); sunAt(V(0, 0, 0)); ground.visible = sky.visible = true; world.visible = true; GRASS.visible = true; garden.visible = true; scene.background = null; scene.fog.near = 40; scene.fog.far = 320;
  lawnSet(i >= 1 ? 1 : 0, i >= 4 ? 1 : 0); G.chips.visible = i >= 3; G.chips.scale.x = 1; leavesSet(i >= 6 ? 1 : 0); G.leaves.visible = i < 6; G.bag.visible = i === 5; G.bag.position.copy(G.LPOS).add(V(1.0, 0.4, 0.4)); G.bag.scale.setScalar(1);
  G.wood.position.copy(i >= 8 ? WOOD1 : WOOD0); G.wood.rotation.y = i >= 8 ? Math.PI / 2 : 0.3; G.mower.visible = false; G.blade.visible = false; dog.collar.visible = i >= 10;
  poseTick(tick, { vis: false }); dotsSet([]); mice.forEach(m => poseMouse(m, { vis: false })); poseQ(dog, { vis: false }); kids.forEach(k => poseKid(k, { vis: false }));
}
const shots = [
  // 0: Zecken fallen nicht von Bäumen – sie warten im hohen Gras
  (T) => { badge.style.display = T < 2.4 ? 'block' : 'none'; const tG = WP(0, 'gras'), tF = WP(0, 'falsch'); const A = G.apple.position;
    if (T < tG - 0.4) { const fk = clamp(T / 1.6); const tp = V(A.x + 0.6, lerp(2.0, 0.45, fk * fk), A.z + 1.3); poseTick(tick, { pos: tp, yaw: T * 3, pitch: T * 2, s: 0.09, T }); camFix(V(A.x + 0.9, 1.3, A.z + 3.6), V(A.x + 0.6, 1.25, A.z + 1.3), 44); ring(tp, clamp((T - 0.2) / 0.3), '#e8323c', 60);
      chip('🌳 ZECKE VOM BAUM?', 540, 470, clamp((T - 0.1) / 0.25), '#e8483b'); icon(false, 540, 1340, clamp((T - 0.3) / 0.25)); chip('❌ MYTHOS', 540, 1520, clamp((T - tF) / 0.3), '#e8483b'); }
    else { G.blade.visible = true; G.blade.position.copy(Q0); const tip = Q0.clone().add(V(0, 0.585, 0.1)); poseTick(tick, { pos: tip, yaw: 0.3, pitch: -0.5, s: 0.012, quest: 1, T }); camFix(tip.clone().add(V(0.12, 0.02, 0.2)), tip.clone().add(V(0, -0.03, 0)), 40);
      label3('ZECKE', tip, clamp((T - tG) / 0.3), 180, -260); chip('🌾 IM HOHEN GRAS', 540, 470, clamp((T - tG + 0.3) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - WP(0, 'dich')) / 0.25)); } },
  // 1: Rasen kurz mähen – in der Sonne trocknen Zecken aus
  (T) => { const t0 = S[1].start, tS = WP(1, 'sonne'); const mx = lerp(-7, 7, clamp((T - t0) / (tS - t0))); lawnSet(1, 0, mx); lawnKey = '';
    if (T < tS - 0.2) { G.mower.visible = true; G.mower.position.set(mx, 0, 1.6); G.mower.rotation.y = Math.PI / 2; camFix(V(mx - 1.0, 2.2, 5.6), V(mx - 0.8, 0.2, 1.2), 44); chip('✂️ RASEN KURZ', 540, 470, clamp((T - WP(1, 'rasen')) / 0.3), '#2fbf5b'); }
    else { mood('hot'); const P = V(0.3, 0.06, 2.4); poseTick(tick, { pos: P, yaw: 0.6, s: 0.03, dry: ease(clamp((T - WP(1, 'trocknen')) / 1.0)), T }); camFix(P.clone().add(V(0.2, 0.16, 0.3)), P, 40); sunRays(clamp((T - tS) / 0.3), T);
      chip('☀️ ZECKE TROCKNET AUS', 540, 470, clamp((T - tS) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - WP(1, 'aus')) / 0.25)); } },
  // 2: Am Waldrand wachsen Gras und Büsche hoch – dort lauern sie
  (T) => { lawnSet(1, 0); lawnKey = ''; const tL = WP(2, 'lauern'); dotsSet(clamp((T - WP(2, 'gras')) / 0.5) > 0 ? woodTips(40) : []); camFix(V(0.8, 1.2, -1.4), V(0.2, 0.3, -5.2), 44);
    label3('WALDRAND', V(-1.5, 0.6, -5.4), clamp((T - WP(2, 'waldrand')) / 0.3), 0, -200); ring(V(0.4, 0.4, -5.1), clamp((T - tL) / 0.3), '#e8323c', 120);
    chip('🌿 HOHES GRAS AM WALD', 540, 470, clamp((T - WP(2, 'waldrand')) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - tL) / 0.25)); },
  // 3: Breiter Streifen aus Holzhäckseln zwischen Wald und Rasen
  (T) => { const t0 = S[3].start, tH = WP(3, 'holzhäckseln'); const c = ease(clamp((T - tH + 0.3) / 1.6)); lawnSet(1, c); lawnKey = ''; G.chips.scale.x = Math.max(0.001, c);
    const tp = V(lerp(0.6, 0.6, 0), 0.03, lerp(-4.9, -4.95, 0)); const back = clamp((T - WP(3, 'ungern')) / 0.8); poseTick(tick, { pos: V(0.6, 0.03, -4.25 - 0.15 * Math.sin(back * Math.PI)), yaw: back > 0.5 ? 0 : Math.PI, s: 0.03, T, vis: T > WP(3, 'rasen') });
    camFix(V(1.4, 1.5, -1.6), V(0.3, 0.1, -4.9), 42); label3('HOLZHÄCKSEL', V(-1.0, 0.05, -5.0), clamp((T - tH) / 0.3), 0, -220);
    chip('🪵 HÄCKSEL-STREIFEN', 540, 470, clamp((T - WP(3, 'streifen')) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - WP(3, 'überqueren')) / 0.25)); },
  // 4: Laubhaufen bleibt feucht und kühl – ein Zeckenhotel
  (T) => { const L = G.LPOS; const r = rng(8), d = []; if (T > WP(4, 'feucht')) for (let i = 0; i < 18; i++) { const a = r() * 6.28, rr = Math.sqrt(r()) * 0.8; d.push({ p: L.clone().add(V(Math.cos(a) * rr, 0.5 * Math.sqrt(1 - rr * rr / 1.1) + 0.03, Math.sin(a) * rr * 0.8)), s: 0.025 }); } dotsSet(d);
    camFix(L.clone().add(V(-0.1, 1.5, 2.8)), L.clone().add(V(0, 0.25, 0)), 40); drops(L.clone().add(V(0, 0.6, 0)), clamp((T - WP(4, 'feucht')) / 0.3), T);
    chip('🏨 ZECKENHOTEL', 540, 470, clamp((T - WP(4, 'zeckenhotel')) / 0.3), '#e8483b'); chip('💧 FEUCHT & KÜHL', 540, 470, clamp((T - WP(4, 'feucht')) / 0.3) * clamp((WP(4, 'zeckenhotel') - T) / 0.2 + 1e-3), '#7fc4ff'); icon(false, 540, 1340, clamp((T - WP(4, 'zeckenhotel') - 0.3) / 0.25)); },
  // 5: Das Laub wegräumen – weit weg von Spielplatz und Terrasse
  (T) => { const t0 = S[5].start, tL = WP(5, 'laub'); const k = ease(clamp((T - tL) / 1.4)); leavesSet(k); G.bag.scale.setScalar(back(clamp((T - tL) / 0.4)) + 1e-3);
    if (T < WP(5, 'weit')) camFix(G.LPOS.clone().add(V(-0.1, 1.5, 2.8)), G.LPOS.clone().add(V(0.3, 0.25, 0.2)), 40); else camFix(V(-2.5, 2.2, 6.0), V(-1.2, 0.4, -0.5), 48);
    if (T > WP(5, 'spielplatz')) label3('SPIELPLATZ', G.play.position.clone().add(V(0, 1.9, 0)), clamp((T - WP(5, 'spielplatz')) / 0.3), 0, -200); if (T > WP(5, 'terrasse')) label3('TERRASSE', V(-1, 0.2, 7.0), clamp((T - WP(5, 'terrasse')) / 0.3), 0, -260);
    chip('🍂 LAUB WEG', 540, 470, clamp((T - tL) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - WP(5, 'terrasse')) / 0.25)); },
  // 6: Mäuse aus dem Holzstapel tragen neue Zecken in den Garten
  (T) => { const t0 = S[6].start; const W = WOOD0; const d = []; mice.forEach((m, k) => { const u = clamp((T - t0 - k * 0.4) / 2.6); const p = W.clone().add(V(-u * (1.6 + k * 0.4), 0, u * (1.0 + k * 0.5))); poseMouse(m, { pos: p, yaw: -1.0 + k * 0.2, T: T + k });
      if (T > WP(6, 'zecken')) d.push({ p: p.clone().add(V(0.02, 0.15, 0)), s: 0.022 }, { p: p.clone().add(V(-0.04, 0.13, -0.06)), s: 0.02 }); }); dotsSet(d);
    camFix(W.clone().add(V(-0.6, 1.3, 3.3)), W.clone().add(V(-1.0, 0.2, 0.6)), 42); label3('HOLZSTAPEL', W.clone().add(V(0, 0.8, 0)), clamp((T - WP(6, 'holzstapel')) / 0.3), 0, -200);
    chip('🐭 MÄUSE BRINGEN ZECKEN', 540, 470, clamp((T - WP(6, 'mäuse')) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - WP(6, 'garten')) / 0.25)); },
  // 7: Holz weit weg von Haus und Spielbereich lagern
  (T) => { const t0 = S[7].start; const k = ease(clamp((T - WP(7, 'holz')) / 1.6)); G.wood.position.copy(WOOD0).lerp(WOOD1, k); G.wood.position.y = Math.sin(k * Math.PI) * 0.8; G.wood.rotation.y = lerp(0.3, Math.PI / 2, k);
    camFix(V(0.5, 6.5, 6.0), V(-0.8, 0, -1.5), 50); label3('HOLZ', G.wood.position.clone().add(V(0, 0.8, 0)), clamp((T - WP(7, 'holz')) / 0.3), 0, -200); label3('SPIELPLATZ', G.play.position.clone().add(V(0, 2, 0)), clamp((T - WP(7, 'spielbereich')) / 0.3), 120, -160);
    chip('📦 HOLZ NACH HINTEN', 540, 470, clamp((T - WP(7, 'holz')) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - WP(7, 'spielbereich')) / 0.25)); },
  // 8: Der Hund bringt nach jedem Waldspaziergang Zecken mit
  (T) => { const t0 = S[8].start; const k = clamp((T - t0) / 2.6); const p = V(0, 0, lerp(-7.5, -1.5, ease(k))); poseQ(dog, { pos: p, yaw: 0, gait: T * 7, walk: 1 - clamp((k - 0.9) * 10), wag: 1, T });
    dotsSet(T > WP(8, 'zecken') ? dogTicks(clamp((T - WP(8, 'zecken')) / 0.8)) : []); camFix(V(p.x + 1.8, 1.2, p.z + 3.2), V(p.x, 0.6, p.z), 42);
    chip('🐕 ZECKEN IM FELL', 540, 470, clamp((T - WP(8, 'zecken')) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - WP(8, 'hause')) / 0.25)); },
  // 9: Zeckenschutz vom Tierarzt – nach jedem Spaziergang absuchen
  (T) => { const tZ = WP(9, 'zeckenschutz'), tS = WP(9, 'suchst'); const p = V(0, 0, -1.5); dog.collar.visible = T > tZ; dog.collar.scale.setScalar(back(clamp((T - tZ) / 0.4)) + 1e-3); poseQ(dog, { pos: p, yaw: 0.6, headP: 0.1, wag: 0.6, T });
    const left = T < tS ? 1 : 1 - clamp((T - tS) / 2.4); const tk = dogTicks(left); dotsSet(tk); camFix(V(p.x + 1.9, 1.1, p.z + 2.1), V(p.x + 0.1, 0.65, p.z), 40);
    if (T > tS && tk.length) lens(tk[tk.length - 1].p, 1); label3('ZECKENSCHUTZ', dog.collar.getWorldPosition(V(0, 0, 0)), clamp((T - tZ) / 0.3), -160, -230);
    chip(T < tS ? '🩺 VOM TIERARZT' : '🔍 ABSUCHEN', 540, 470, clamp((T - tZ) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - WP(9, 'spaziergang')) / 0.25)); },
  // 10: Kinder toben im hohen Gras hinten am Zaun
  (T) => { const t0 = S[10].start; kids.forEach((k, j) => poseKid(k, { pos: V(5.7 - j * 0.4, 0, lerp(-3.5, 2.5, ((T - t0) * 0.35 + j * 0.3) % 1)), yaw: 0.0, run: 1, T: T + j }));
    const d = T > WP(10, 'gras') ? [...kidTicks(kids[0], 3), ...kidTicks(kids[1], 3)].filter((x, i) => i % 3 !== 0) : []; dotsSet(d); camFix(V(3.0, 1.3, 2.2), V(5.6, 0.6, -0.6), 44);
    label3('HOHES GRAS', V(5.9, 0.5, -1.5), clamp((T - WP(10, 'gras')) / 0.3), -150, -260); chip('🌾 SPIELEN AM ZAUN', 540, 470, clamp((T - WP(10, 'kinder')) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - WP(10, 'zaun')) / 0.25)); },
  // 11: Helle, lange Kleidung – Zecken sofort sehen – abends absuchen
  (T) => { const tA = WP(11, 'abends'); const eve = T > tA - 0.2; if (eve) mood('dusk'); const P = V(1.0, 0, 3.0); poseKid(kids[0], { pos: P, yaw: 0.4, light: 1, T }); const tk = kidTicks(kids[0], 5); dotsSet(eve ? tk.slice(0, Math.max(0, 5 - Math.floor((T - tA) * 2.2))) : tk);
    camFix(P.clone().add(V(0.9, 1.0, 2.9)), P.clone().add(V(0, 0.68, 0)), 40); if (eve) lens(tk[Math.max(0, 4 - Math.floor((T - tA) * 2.2))].p, 1); else tk.forEach((t, i) => ring(t.p, clamp((T - WP(11, 'zecken') - i * 0.08) / 0.3), '#e8323c', 34));
    chip(eve ? '🌙 ABENDS ABSUCHEN' : '👕 HELLE KLEIDUNG', 540, 470, clamp((T - WP(11, 'helle')) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - WP(11, 'abgesucht')) / 0.25)); },
  // 12: Glückwunsch – zeckensicherer Garten
  (T) => { mood('dusk'); const u = T - S[12].start; poseQ(dog, { pos: V(-0.6, 0, 2.2), yaw: 0.8, wag: 1, T }); kids.forEach((k, j) => poseKid(k, { pos: V(1.4 + j * 0.6, 0, 2.6 - j * 0.3), yaw: -0.4, light: 1, T }));
    const a = 0.2 + u * 0.12; cam(V(Math.sin(a) * 8.5, lerp(4.5, 5.5, ease(u / 3)), Math.cos(a) * 8.5 + 1), V(0, 0.5, -0.5), 46, T, 0.004); cta.style.display = T > WP(12, 'gebaut') ? 'block' : 'none';
    chip('🏡 ZECKENSICHER', 540, 470, clamp((T - WP(12, 'garten')) / 0.3), '#2fbf5b'); },
];
shots.forEach((f, i) => { shots[i] = T => { stage(i, T); f(T); }; });
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
window.__ = { camera, LOOK, dog, kids, tick, G, V, ui, svg, scene };
