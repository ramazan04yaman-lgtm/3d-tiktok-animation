// "Wenn … du im Amazonas lebst" – komplett prozedurale 3D-Szene (Three.js)
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
// ---------- Zitteraal: Fluss (unter Wasser), Zitteraal, Fische, Kaiman, Schaumnest ----------
const E = {}; const WY = 0, BED = -1.5; // Wasseroberfläche / Flussgrund
const UTIME = { value: 0 };
const riverG = new THREE.Group(); scene.add(riverG);
// Schlamm-Textur
const mudTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#6e6440'; g.fillRect(0, 0, w, h); const r = rng(31);
  for (let k = 0; k < 2600; k++) { g.globalAlpha = 0.08 + r() * 0.12; g.fillStyle = ['#585034', '#857a50', '#4d4630', '#9a8e60'][(r() * 4) | 0]; g.beginPath(); g.ellipse(r() * w, r() * h, 3 + r() * 14, 2 + r() * 8, r() * 3, 0, 7); g.fill(); }
  g.globalAlpha = 0.18; g.strokeStyle = '#3f3a26'; g.lineWidth = 2; for (let y = 0; y < h; y += 22) { g.beginPath(); for (let x = 0; x <= w; x += 8) g.lineTo(x, y + 6 * Math.sin(x * 0.05 + y)); g.stroke(); } g.globalAlpha = 1; });
mudTex.wrapS = mudTex.wrapT = THREE.RepeatWrapping; mudTex.repeat.set(14, 14);
function causticMat(m, k = 1) { m.onBeforeCompile = sh => { sh.uniforms.uT = UTIME; sh.uniforms.uC = { value: k }; E.caus = E.caus || []; E.caus.push(sh.uniforms.uC);
  sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
  sh.fragmentShader = 'uniform float uT, uC; varying vec3 vWP;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
  { vec2 p = vWP.xz * 2.2; float a = 0.5 + 0.5 * sin(p.x * 3.1 + sin(p.y * 2.3 + uT * 1.3) * 1.7 + uT * 0.9); float b = 0.5 + 0.5 * sin(p.y * 3.4 + sin(p.x * 2.7 - uT * 1.1) * 1.6 - uT * 0.7);
    float c = pow(a * b, 4.0) * 2.2 + pow(1.0 - abs(a - b), 14.0) * 0.6; diffuseColor.rgb += c * uC * vec3(0.75, 0.78, 0.5) * smoothstep(-2.5, -0.3, vWP.y); }`); }; m.customProgramCacheKey = () => 'caus' + k; return m; }
{ // Flussgrund mit leichten Wellen / Mulden
  const g = new THREE.PlaneGeometry(70, 70, 180, 180); g.rotateX(-Math.PI / 2); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, BED + (fbm(x * 0.35, 0, z * 0.35, 4) - 0.5) * 0.55 + 0.03 * Math.sin(x * 4 + z * 1.3)); } g.computeVertexNormals();
  E.bed = new THREE.Mesh(g, causticMat(new THREE.MeshStandardMaterial({ map: mudTex, roughness: 0.95, bumpMap: mudTex, bumpScale: 1.2 }))); E.bed.receiveShadow = true; riverG.add(E.bed); }
const bedY = (x, z) => BED + (fbm(x * 0.35, 0, z * 0.35, 4) - 0.5) * 0.55 + 0.03 * Math.sin(x * 4 + z * 1.3);
// Wasseroberfläche
const waveTex = canvasTex(256, 256, (g, w, h) => { const im = g.createImageData(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = 128 + 120 * (fbm(x / 22, y / 22, 3, 3) - 0.5) * 2; const i = (y * w + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } g.putImageData(im, 0, 0); });
waveTex.wrapS = waveTex.wrapT = THREE.RepeatWrapping; waveTex.repeat.set(30, 30);
E.surfM = new THREE.MeshStandardMaterial({ color: 0x5a5a32, roughness: 0.12, metalness: 0.2, bumpMap: waveTex, bumpScale: 1.5, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
E.surf = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), E.surfM); E.surf.rotation.x = -Math.PI / 2; E.surf.position.y = WY; scene.add(E.surf);
// Lichtstrahlen von oben
const shaftTex = canvasTex(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,250,210,0.9)'); gr.addColorStop(0.6, 'rgba(255,250,210,0.25)'); gr.addColorStop(1, 'rgba(255,250,210,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const s = g.createLinearGradient(0, 0, w, 0); s.addColorStop(0, 'rgba(0,0,0,1)'); s.addColorStop(0.5, 'rgba(0,0,0,0)'); s.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = s; g.fillRect(0, 0, w, h); });
E.shafts = []; { const r = rng(9); for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.35 + r() * 0.5, 3.2), new THREE.MeshBasicMaterial({ map: shaftTex, transparent: true, opacity: 0.11, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
  m.geometry.translate(0, -1.6, 0); m.userData.p = V((r() - 0.5) * 7, WY, (r() - 0.5) * 6 - 1); m.userData.ph = r() * 6; scene.add(m); E.shafts.push(m); } }
function shaftsUpdate(T, k = 1) { E.shafts.forEach(m => { m.visible = false; m.position.copy(m.userData.p); m.lookAt(camera.position.x, m.position.y, camera.position.z); m.rotateZ(0.25); m.material.opacity = 0.1 * k * (0.7 + 0.3 * Math.sin(T * 0.9 + m.userData.ph)); }); }
// Schwebeteilchen
{ const n = 2600, r = rng(17), a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = (r() - 0.5) * 9; a[i * 3 + 1] = BED + r() * 1.6; a[i * 3 + 2] = (r() - 0.5) * 9 - 0.5; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3));
  E.motes = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xe2dba8, size: 0.018, map: dotTex, transparent: true, opacity: 0.7, depthWrite: false })); scene.add(E.motes); }
// Wurzeln aus dem überfluteten Wald
const barkM = new THREE.MeshStandardMaterial({ color: 0x4a3b2a, roughness: 0.95, bumpMap: scaleTex, bumpScale: 2 });
E.roots = new THREE.Group(); riverG.add(E.roots);
{ const r = rng(23); const cl = [[-1.6, -2.1], [1.9, -2.6], [-3.0, 0.4], [3.1, -0.2], [-0.4, -3.6], [0.9, 2.6]];
  cl.forEach(([cx, cz], ci) => { const n = 6 + (r() * 4 | 0); for (let k = 0; k < n; k++) { const a = r() * 6.28, d = 0.1 + r() * 0.5; const x0 = cx + Math.cos(a) * 0.15, z0 = cz + Math.sin(a) * 0.15, x1 = cx + Math.cos(a) * (d + 0.4), z1 = cz + Math.sin(a) * (d + 0.4);
    const c = new THREE.CatmullRomCurve3([V(x0, 0.8, z0), V(lerp(x0, x1, 0.3), 0.0, lerp(z0, z1, 0.3)), V(lerp(x0, x1, 0.75), -0.9, lerp(z0, z1, 0.75)), V(x1, bedY(x1, z1) - 0.05, z1)]);
    const m = new THREE.Mesh(new THREE.TubeGeometry(c, 24, 0.025 + r() * 0.035, 7, false), barkM); m.castShadow = true; E.roots.add(m); } }); }
// Wasserpflanzen, Steine, Laub
E.plantBase = [];
{ const blade = new THREE.BufferGeometry(); blade.setAttribute('position', new THREE.Float32BufferAttribute([-0.006, 0, 0, 0.006, 0, 0, -0.004, 0.14, 0.015, 0.004, 0.14, 0.015, 0, 0.3, 0.05], 3)); blade.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]); blade.computeVertexNormals();
  const N = 2200, r = rng(5); const im = new THREE.InstancedMesh(blade, new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.8 }), N); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
  for (let i = 0; i < N; i++) { let x, z; do { x = (r() - 0.5) * 12; z = (r() - 0.5) * 12 - 1; } while (Math.hypot(x, z + 0.3) < 1.0 && r() < 0.85); const cl = Math.floor(r() * 30); const ox = Math.cos(cl) * 4.5, oz = Math.sin(cl * 1.7) * 3.5;
    if (r() < 0.6) { x = ox + (r() - 0.5) * 1.2; z = oz + (r() - 0.5) * 1.2; } q.setFromEuler(new THREE.Euler((r() - 0.5) * 0.6, r() * 6.3, (r() - 0.5) * 0.6)); const s = 0.5 + r() * 0.9;
    m4.compose(V(x, bedY(x, z) - 0.02, z), q, V(s, s * (0.8 + r()), s)); im.setMatrixAt(i, m4); E.plantBase.push(m4.clone()); col.setHSL(0.2 + r() * 0.06, 0.45, 0.16 + r() * 0.12); im.setColorAt(i, col); } riverG.add(im); E.plants = im;
  const stoneM = new THREE.MeshStandardMaterial({ color: 0x6a6650, roughness: 0.9, bumpMap: scaleTex, bumpScale: 0.6 }); E.stones = [];
  const st = [[0.55, -0.55, 0.16], [-0.9, -0.9, 0.22], [1.6, 0.6, 0.3], [-2.0, -0.6, 0.35], [0.2, -1.8, 0.25], [-1.3, 1.0, 0.18], [2.4, -1.6, 0.4], [-0.3, 0.9, 0.12]];
  st.forEach(([x, z, s]) => { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 2), stoneM); m.scale.set(s * 1.3, s * 0.7, s); m.position.set(x, bedY(x, z) + s * 0.25, z); m.rotation.y = x * 3; m.castShadow = m.receiveShadow = true; riverG.add(m); E.stones.push(m); });
  const leaf = new THREE.CircleGeometry(0.03, 7); leaf.scale(1, 0.5, 1); leaf.rotateX(-Math.PI / 2); const NL = 700; const lm = new THREE.InstancedMesh(leaf, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, side: THREE.DoubleSide }), NL);
  for (let i = 0; i < NL; i++) { const x = (r() - 0.5) * 10, z = (r() - 0.5) * 10 - 1; m4.compose(V(x, bedY(x, z) + 0.012, z), q.setFromEuler(new THREE.Euler((r() - 0.5) * 0.4, r() * 6.3, 0)), V(1, 1, 1).multiplyScalar(0.7 + r())); lm.setMatrixAt(i, m4); col.setHSL(0.07 + r() * 0.04, 0.5, 0.18 + r() * 0.12); lm.setColorAt(i, col); } riverG.add(lm); }

// ---------- Ufer (für die Szenen über Wasser) ----------
E.bank = new THREE.Group(); scene.add(E.bank);
{ const r = rng(77); const g = new THREE.PlaneGeometry(60, 30, 120, 60); g.rotateX(-Math.PI / 2); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const d = z + 15; p.setY(i, -0.4 + clamp(d / 3) * 0.75 + (fbm(x * 0.3, 1, z * 0.3) - 0.5) * 0.5 * clamp(d / 3)); } g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x4a4a2a, map: grassTex, roughness: 0.95 })); m.position.set(0, 0, -21); E.bank.add(m);
  const leafM = [0x2f4a22, 0x3b5a28, 0x263d1d, 0x4a6a2e].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true }));
  const trunkM = new THREE.MeshStandardMaterial({ color: 0x4d3d2b, roughness: 0.95, bumpMap: scaleTex, bumpScale: 2 });
  for (let i = 0; i < 70; i++) { const x = (r() - 0.5) * 50, z = -9.5 - r() * 14; const h = 3 + r() * 7; const t = new THREE.Mesh(new THREE.CylinderGeometry(0.08 + r() * 0.1, 0.18 + r() * 0.15, h, 7), trunkM); t.position.set(x, h / 2, z); E.bank.add(t);
    for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2 + r() * 1.6, 1), leafM[(r() * 4) | 0]); b.position.set(x + (r() - 0.5) * 2, h + (r() - 0.3) * 1.5, z + (r() - 0.5) * 2); b.scale.y = 0.7; E.bank.add(b); } }
  for (let i = 0; i < 90; i++) { const x = (r() - 0.5) * 50, z = -8.8 - r() * 4; const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5 + r() * 0.9, 1), leafM[(r() * 4) | 0]); b.position.set(x, 0.2 + r() * 0.4, z); b.scale.y = 0.75; E.bank.add(b); }
  // Hängende Lianen / überhängende Äste
  for (let i = 0; i < 24; i++) { const x = (r() - 0.5) * 30, z = -8 - r() * 3; const c = new THREE.CatmullRomCurve3([V(x, 6 + r() * 2, z - 1), V(x + 0.3, 3, z + 0.3), V(x + (r() - 0.5), 0.6 + r(), z + 0.8)]); E.bank.add(new THREE.Mesh(new THREE.TubeGeometry(c, 16, 0.02, 5), trunkM)); } }

// ---------- Zitteraal ----------
const EL = 1.8, ENS = 150, ENR = 22; // Länge, Ringe, Segmente
const eRad = u => { const Rm = 0.068; if (u < 0.07) return Rm * (0.08 + 0.92 * Math.sqrt(u / 0.07)); if (u < 0.32) return Rm; return Rm * Math.pow(1 - (u - 0.32) / 0.68, 0.85) + 0.002; };
const eW = u => u < 0.1 ? lerp(1.22, 1.0, u / 0.1) : lerp(1.0, 0.55, clamp((u - 0.3) / 0.6)), eH = u => u < 0.1 ? lerp(0.78, 1.05, u / 0.1) : 1.05;
const cellM = new THREE.MeshBasicMaterial({ color: 0xffffff });
function makeEel(seed = 1, main = false) {
  const e = { root: new THREE.Group() }; scene.add(e.root);
  const n = (ENS + 1) * (ENR + 1), pos = new Float32Array(n * 3), col = new Float32Array(n * 3), idx = [];
  for (let i = 0; i < ENS; i++) for (let j = 0; j < ENR; j++) { const a = i * (ENR + 1) + j, b = a + 1, c = a + ENR + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const c = new THREE.Color(), top = new THREE.Color(0x2b2a22), side = new THREE.Color(0x4e4a3a), orange = new THREE.Color(0xd2662a), grey = new THREE.Color(0x5d564a), mouth = new THREE.Color(0x15110c);
  for (let i = 0; i <= ENS; i++) { const u = i / ENS; for (let j = 0; j <= ENR; j++) { const an = j / ENR * Math.PI * 2; const sy = Math.sin(an), cx = Math.cos(an);
    c.copy(side).lerp(top, clamp(sy * 1.4)); if (sy < -0.1) c.lerp(orange.clone().lerp(grey, clamp((u - 0.3) / 0.15)), clamp((-sy - 0.1) * 2.5));
    if (u > 0.08 && sy > -0.2) { const sp = fbm(u * 60 + seed, an * 3, seed, 2); if (sp > 0.62) c.lerp(new THREE.Color(0x7a735c), 0.5); }
    if (u < 0.055 && Math.abs(sy + 0.12) < 0.12) c.copy(mouth); c.multiplyScalar(0.9 + 0.2 * fbm(u * 40, an * 2, seed, 2));
    const k = (i * (ENR + 1) + j) * 3; col[k] = c.r; col[k + 1] = c.g; col[k + 2] = c.b; } }
  const g = new THREE.BufferGeometry(); g.setIndex(idx); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  e.mat = new THREE.MeshPhysicalMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.35, emissive: 0xfff2a0, emissiveIntensity: 0 });
  e.body = new THREE.Mesh(g, e.mat); e.body.frustumCulled = false; e.body.castShadow = true; e.root.add(e.body);
  // Afterflosse (Rudersaum) unter dem Bauch
  const FN = 110, fp = new Float32Array((FN + 1) * 2 * 3), fi = []; for (let i = 0; i < FN; i++) { const a = i * 2; fi.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const fg = new THREE.BufferGeometry(); fg.setIndex(fi); fg.setAttribute('position', new THREE.BufferAttribute(fp, 3));
  e.finM = new THREE.MeshStandardMaterial({ color: 0x5a4a38, roughness: 0.6, transparent: true, opacity: 0.8, side: THREE.DoubleSide, emissive: 0xfff2a0, emissiveIntensity: 0 });
  e.fin = new THREE.Mesh(fg, e.finM); e.fin.frustumCulled = false; e.root.add(e.fin);
  e.eyes = [-1, 1].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 8), new THREE.MeshPhysicalMaterial({ color: 0x0c0a08, roughness: 0.05, clearcoat: 1 })); e.root.add(m); return m; });
  if (main) { // Röntgen-Innenleben: Stromzellen + Organe vorne
    e.NC = 120; e.cells = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 18), cellM, e.NC); e.cells.frustumCulled = false; for (let i = 0; i < e.NC; i++) e.cells.setColorAt(i, new THREE.Color(0x8a6a2a)); e.root.add(e.cells);
    e.heart = new THREE.Mesh(new THREE.SphereGeometry(0.02, 16, 12), new THREE.MeshStandardMaterial({ color: 0xd0202c, emissive: 0x500000, roughness: 0.4 })); e.root.add(e.heart);
    e.gut = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshStandardMaterial({ color: 0x9a5a3a, emissive: 0x2a1000, roughness: 0.5 })); e.root.add(e.gut);
    e.brain = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 10), new THREE.MeshStandardMaterial({ color: 0xf0b0b8, emissive: 0x401020, roughness: 0.4 })); e.root.add(e.brain);
  }
  e.P = []; e.T = []; e.N = []; e.B = []; for (let i = 0; i <= ENS; i++) { e.P.push(V(0, 0, 0)); e.T.push(V(0, 0, 0)); e.N.push(V(0, 0, 0)); e.B.push(V(0, 0, 0)); }
  return e;
}
// path: u (0 Kopf … 1 Schwanz) -> Weltpunkt; ohne path: gerade ab pos in Richtung yaw/pitch. wave: Phase der Schlängelbewegung
function poseEel(e, { pos = V(0, -1, 0), yaw = 0, pitch = 0, path = null, wave = 0, amp = 0.05, up = V(0, 1, 0), scale = 1, glow = 0, xray = 0, lit = 0, vis = true, finWave = null, roll = 0 } = {}) {
  e.root.visible = vis; if (!vis) return; const L = EL * scale; const d = V(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  for (let i = 0; i <= ENS; i++) { const u = i / ENS; if (path) e.P[i].copy(path(u)); else e.P[i].copy(pos).addScaledVector(d, -u * L); }
  const tg = (i, out) => out.copy(e.P[Math.min(ENS, i + 1)]).sub(e.P[Math.max(0, i - 1)]).normalize().negate(); // Richtung Kopf
  for (let i = 0; i <= ENS; i++) tg(i, e.T[i]);
  // Schlängeln seitlich
  if (amp > 0) { const side = V(0, 0, 0); for (let i = 0; i <= ENS; i++) { const u = i / ENS; side.copy(e.T[i]).cross(up).normalize(); const a = amp * scale * Math.pow(0.12 + u, 1.25) * Math.sin(u * 9.5 - wave); e.P[i].addScaledVector(side, a); } for (let i = 0; i <= ENS; i++) tg(i, e.T[i]); }
  // Rahmen (parallel transport)
  e.B[0].copy(e.T[0]).cross(up); if (e.B[0].lengthSq() < 1e-6) e.B[0].set(1, 0, 0); e.B[0].normalize(); if (roll) e.B[0].applyAxisAngle(e.T[0], roll);
  for (let i = 1; i <= ENS; i++) { e.B[i].copy(e.B[i - 1]).addScaledVector(e.T[i], -e.B[i - 1].dot(e.T[i])).normalize(); }
  for (let i = 0; i <= ENS; i++) e.N[i].copy(e.B[i]).cross(e.T[i]).normalize(); // Rücken
  const p = e.body.geometry.attributes.position.array;
  for (let i = 0; i <= ENS; i++) { const u = i / ENS, r = eRad(u) * scale, w = eW(u), h = eH(u); const P = e.P[i], B = e.B[i], N = e.N[i];
    for (let j = 0; j <= ENR; j++) { const an = j / ENR * Math.PI * 2; let cx = Math.cos(an), sy = Math.sin(an); if (u < 0.1 && sy > 0) sy *= 0.85; // flacher Kopf oben
      const k = (i * (ENR + 1) + j) * 3; p[k] = P.x + B.x * cx * r * w + N.x * sy * r * h; p[k + 1] = P.y + B.y * cx * r * w + N.y * sy * r * h; p[k + 2] = P.z + B.z * cx * r * w + N.z * sy * r * h; } }
  if (e.P[0]) { const P = e.P[0], T = e.T[0]; const k0 = 0; for (let j = 0; j <= ENR; j++) { const k = j * 3; p[k] = P.x + T.x * 0.006 * scale; p[k + 1] = P.y + T.y * 0.006 * scale; p[k + 2] = P.z + T.z * 0.006 * scale; } }
  e.body.geometry.attributes.position.needsUpdate = true; e.body.geometry.computeVertexNormals();
  // Flosse
  const f = e.fin.geometry.attributes.position.array, FN = 110;
  for (let i = 0; i <= FN; i++) { const u = lerp(0.24, 0.985, i / FN), si = Math.round(u * ENS); const P = e.P[si], B = e.B[si], N = e.N[si], r = eRad(u) * scale * eH(u);
    const fh = 0.05 * scale * Math.pow(Math.sin(Math.PI * clamp((u - 0.24) / 0.75)), 0.6); const ph = (finWave === null ? wave * 1.6 : finWave) ; const rip = Math.sin(u * 46 - ph * 2.2) * 0.35;
    const a = P.clone().addScaledVector(N, -r * 0.92), b = a.clone().addScaledVector(N, -fh).addScaledVector(B, rip * fh);
    f.set([a.x, a.y, a.z], i * 6); f.set([b.x, b.y, b.z], i * 6 + 3); }
  e.fin.geometry.attributes.position.needsUpdate = true; e.fin.geometry.computeVertexNormals();
  // Augen
  { const si = Math.round(0.03 * ENS), P = e.P[si], B = e.B[si], N = e.N[si], r = eRad(0.03) * scale; e.eyes.forEach((m, s) => { const sg = s ? 1 : -1; m.position.copy(P).addScaledVector(B, sg * r * 1.05).addScaledVector(N, r * 0.35); m.scale.setScalar(scale); }); }
  // Glühen / Röntgen
  e.mat.emissiveIntensity = glow * 0.9; e.finM.emissiveIntensity = glow * 0.6; e.mat.transparent = xray > 0; e.mat.opacity = 1 - 0.78 * xray; e.mat.depthWrite = xray < 0.5;
  if (e.cells) { const show = xray > 0.01; e.cells.visible = e.heart.visible = e.gut.visible = e.brain.visible = show;
    if (show) { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
      for (let k = 0; k < e.NC; k++) { const u = lerp(0.2, 0.95, k / (e.NC - 1)), si = Math.round(u * ENS), r = eRad(u) * scale; q.setFromUnitVectors(V(0, 1, 0), e.T[si]);
        m4.compose(e.P[si], q, V(r * eW(u) * 0.78, 0.6 * EL * scale * 0.75 / e.NC, r * eH(u) * 0.78)); e.cells.setMatrixAt(k, m4);
        const on = clamp((lit * e.NC - k) / 3); c.set(0x7a5a22).lerp(new THREE.Color(0xfff07a), on); e.cells.setColorAt(k, c); }
      e.cells.instanceMatrix.needsUpdate = true; e.cells.instanceColor.needsUpdate = true; const so = clamp(xray * 1.5);
      const at = (u, dn) => { const si = Math.round(u * ENS); return e.P[si].clone().addScaledVector(e.N[si], -dn * eRad(u) * scale); };
      e.heart.position.copy(at(0.085, 0.45)); e.heart.scale.setScalar(so * scale * (1 + 0.12 * Math.sin(GT * 9))); e.brain.position.copy(at(0.035, -0.25)); e.brain.scale.setScalar(so * scale);
      e.gut.position.copy(at(0.14, 0.2)); e.gut.scale.set(0.035 * so * scale, 0.035 * so * scale, 0.08 * so * scale); e.gut.quaternion.setFromUnitVectors(V(0, 0, 1), e.T[Math.round(0.14 * ENS)]); } }
}
const eelPt = (e, u) => e.P[Math.round(clamp(u) * ENS)].clone();
const eel = makeEel(1, true); const pack = []; for (let k = 0; k < 7; k++) pack.push(makeEel(10 + k));

// ---------- Fische ----------
const fishBodyG = (() => { const g = new THREE.SphereGeometry(1, 14, 10); g.scale(0.07, 0.2, 0.45); return g; })();
const fishTailG = (() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.36, 0, 0.17, -0.62, 0, -0.17, -0.62], 3)); g.computeVertexNormals(); return g; })();
const fishM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.45 }), fishTM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, side: THREE.DoubleSide });
const NF = 260; E.fb = new THREE.InstancedMesh(fishBodyG, fishM, NF); E.ft = new THREE.InstancedMesh(fishTailG, fishTM, NF); E.fb.frustumCulled = E.ft.frustumCulled = false; scene.add(E.fb, E.ft);
{ const r = rng(3), c = new THREE.Color(); for (let i = 0; i < NF; i++) { c.setHSL(0.55 + r() * 0.08, 0.25, 0.62 + r() * 0.15); E.fb.setColorAt(i, c); c.setHSL(0.0, 0.7, 0.45 + r() * 0.1); E.ft.setColorAt(i, c); } }
// list: [{p, yaw, pitch, s, roll, tail}] – maximal NF
function fishSet(list) { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), Z = new THREE.Matrix4().makeScale(0, 0, 0), e = new THREE.Euler(), mt = new THREE.Matrix4(), tw = new THREE.Matrix4();
  for (let i = 0; i < NF; i++) { const f = list[i]; if (!f) { E.fb.setMatrixAt(i, Z); E.ft.setMatrixAt(i, Z); continue; } e.set(-(f.pitch || 0), f.yaw || 0, f.roll || 0, 'YXZ'); q.setFromEuler(e); const s = f.s || 0.12;
    m4.compose(f.p, q, V(s, s, s)); E.fb.setMatrixAt(i, m4); tw.makeTranslation(0, 0, -0.36).multiply(new THREE.Matrix4().makeRotationY(Math.sin(f.tail || 0) * 0.5)).multiply(new THREE.Matrix4().makeTranslation(0, 0, 0.36)); mt.multiplyMatrices(m4, tw); E.ft.setMatrixAt(i, mt); }
  E.fb.instanceMatrix.needsUpdate = E.ft.instanceMatrix.needsUpdate = true; E.fb.visible = E.ft.visible = list.length > 0; }
function makeFish(body, tail, s) { const g = new THREE.Group(); const b = new THREE.Mesh(fishBodyG, new THREE.MeshStandardMaterial({ color: body, roughness: 0.35, metalness: 0.3 })); const t = new THREE.Mesh(fishTailG, new THREE.MeshStandardMaterial({ color: tail, roughness: 0.5, side: THREE.DoubleSide }));
  const dor = new THREE.Mesh(fishTailG, t.material); dor.rotation.x = -Math.PI / 2 - 0.3; dor.scale.setScalar(0.55); dor.position.set(0, 0.25, 0.1);
  const eyeM = new THREE.MeshBasicMaterial({ color: 0x080808 }); for (const sg of [-1, 1]) { const ey = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), eyeM); ey.position.set(sg * 0.05, 0.05, 0.3); g.add(ey); }
  g.add(b, t, dor); g.scale.setScalar(s); scene.add(g); g.userData.tail = t; b.castShadow = true; return g; }
function poseFish(f, { pos, yaw = 0, pitch = 0, roll = 0, tail = 0, vis = true }) { f.visible = vis; if (!vis) return; f.position.copy(pos); f.rotation.set(-pitch, yaw, roll, 'YXZ'); f.userData.tail.rotation.y = Math.sin(tail) * 0.45; }
const prey = makeFish(0xb8b4a0, 0xc06a3a, 0.32), pred = makeFish(0x8a8a70, 0xa03a30, 0.45);

// ---------- Kaiman ----------
function makeCaiman() { const c = { root: new THREE.Group() }; scene.add(c.root); const skin = new THREE.MeshStandardMaterial({ color: 0x3f4428, roughness: 0.75, bumpMap: scaleTex, bumpScale: 3 }), belly = new THREE.MeshStandardMaterial({ color: 0xb0a985, roughness: 0.8, bumpMap: scaleTex, bumpScale: 1.5 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), skin); body.scale.set(0.34, 0.17, 0.75); body.castShadow = true; c.root.add(body);
  const bel = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), belly); bel.scale.set(0.335, 0.165, 0.74); bel.position.y = -0.005; c.root.add(bel);
  c.head = new THREE.Group(); c.head.position.set(0, 0.02, 0.72); c.root.add(c.head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), skin); skull.scale.set(0.19, 0.1, 0.22); skull.position.z = 0.08; c.head.add(skull);
  const snout = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), skin); snout.scale.set(0.12, 0.055, 0.36); snout.position.set(0, 0.0, 0.36); c.head.add(snout);
  c.jaw = new THREE.Group(); c.jaw.position.set(0, -0.03, 0.02); c.head.add(c.jaw); const jw = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), belly); jw.scale.set(0.15, 0.04, 0.5); jw.position.set(0, -0.005, 0.3); c.jaw.add(jw);
  const toothM = new THREE.MeshStandardMaterial({ color: 0xf2ecd8, roughness: 0.4 }); for (const s of [-1, 1]) for (let k = 0; k < 9; k++) { const t = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.03, 6), toothM); const z = 0.12 + k * 0.055; t.position.set(s * lerp(0.12, 0.07, k / 8), -0.035, z); t.rotation.x = Math.PI; c.head.add(t); }
  for (const s of [-1, 1]) { const bump = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 10), skin); bump.position.set(s * 0.085, 0.085, 0.06); c.head.add(bump);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 14, 10), new THREE.MeshPhysicalMaterial({ color: 0xd8b030, emissive: 0x3a2a00, roughness: 0.1, clearcoat: 1 })); eye.position.set(s * 0.1, 0.1, 0.075); c.head.add(eye);
    const pup = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.035, 0.01), new THREE.MeshBasicMaterial({ color: 0x050505 })); pup.position.set(s * 0.122, 0.105, 0.08); pup.rotation.y = s * 0.9; c.head.add(pup);
    const nos = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), skin); nos.position.set(s * 0.025, 0.045, 0.66); c.head.add(nos);
    for (const [z, fr] of [[0.45, 1], [-0.45, -1]]) { const leg = new THREE.Group(); leg.position.set(s * 0.3, -0.04, z); c.root.add(leg); const up = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.25, 10), skin); up.position.y = -0.12; leg.add(up); leg.rotation.set(0.5 * fr, 0, s * 0.8);
      const ft = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), skin); ft.scale.set(1, 0.4, 1.4); ft.position.y = -0.25; leg.add(ft); } }
  const tailC = new THREE.CatmullRomCurve3([V(0, 0, -0.55), V(0, 0, -1.1), V(0.15, 0, -1.6), V(0.35, 0, -2.0)]); const tg = new THREE.TubeGeometry(tailC, 40, 1, 12, false); { const p = tg.attributes.position; for (let i = 0; i < p.count; i++) { const k = Math.floor(i / 13) / 40; const cp = tailC.getPoint(k); const r = 0.16 * (1 - k) + 0.01; p.setXYZ(i, cp.x + (p.getX(i) - cp.x) * r * 0.65, cp.y + (p.getY(i) - cp.y) * r * 1.2, cp.z + (p.getZ(i) - cp.z) * r); } tg.computeVertexNormals(); }
  const tail = new THREE.Mesh(tg, skin); tail.castShadow = true; c.root.add(tail);
  const scM = new THREE.MeshStandardMaterial({ color: 0x33381f, roughness: 0.8 }); for (let k = 0; k < 26; k++) for (const s of [-1, 1]) { const z = 0.55 - k * 0.1; const sc = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.05, 4), scM); const tk = clamp((-z - 0.55) / 1.5);
    const tp = z < -0.55 ? tailC.getPoint(clamp((-0.55 - z) / 1.45)) : V(0, 0, z); sc.position.set(tp.x + s * (z > -0.55 ? 0.12 : 0.05 * (1 - tk)), z > -0.55 ? 0.16 * Math.sqrt(Math.max(0, 1 - (z / 0.75) ** 2)) + 0.01 : 0.17 * (1 - tk) * 1.2 * 0.6 + 0.01, tp.z); c.root.add(sc); }
  return c; }
const caiman = makeCaiman();
function poseCaiman(c, { pos, yaw = 0, jaw = 0, roll = 0, pitch = 0, vis = true }) { c.root.visible = vis; if (!vis) return; c.root.position.copy(pos); c.root.rotation.set(pitch, yaw, roll, 'YXZ'); c.jaw.rotation.x = jaw; }

// ---------- Blasen, Eier, Schaumnest ----------
const bubM = new THREE.MeshPhysicalMaterial({ color: 0xf4f6ec, roughness: 0.05, transmission: 0, transparent: true, opacity: 0.55, clearcoat: 1, emissive: 0x404438 });
const NB = 520; E.bub = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 9), bubM, NB); E.bub.frustumCulled = false; scene.add(E.bub);
function bubSet(list) { const m4 = new THREE.Matrix4(), Z = new THREE.Matrix4().makeScale(0, 0, 0), q = new THREE.Quaternion(); for (let i = 0; i < NB; i++) { const b = list[i]; if (!b) { E.bub.setMatrixAt(i, Z); continue; } m4.compose(b.p, q, V(b.r, b.r, b.r)); E.bub.setMatrixAt(i, m4); } E.bub.instanceMatrix.needsUpdate = true; E.bub.visible = list.length > 0; }
const NE = 90; E.eggs = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 9), new THREE.MeshPhysicalMaterial({ color: 0xf0a43a, roughness: 0.2, clearcoat: 1, emissive: 0x3a1800, transparent: true, opacity: 0.92 }), NE); E.eggs.frustumCulled = false; scene.add(E.eggs);
E.eggBase = []; { const r = rng(61); for (let i = 0; i < NE; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * 0.16; E.eggBase.push(V(Math.cos(a) * d, (r() - 0.5) * 0.05, Math.sin(a) * d * 0.8)); } }
function eggsSet(center, k = 1, eaten = 0) { const m4 = new THREE.Matrix4(), Z = new THREE.Matrix4().makeScale(0, 0, 0), q = new THREE.Quaternion(); E.eggs.visible = k > 0;
  for (let i = 0; i < NE; i++) { if (i < eaten * NE) { E.eggs.setMatrixAt(i, Z); continue; } const s = 0.011 * back(clamp(k * 1.5 - i / NE * 0.5)); m4.compose(center.clone().add(E.eggBase[i]), q, V(s, s, s)); E.eggs.setMatrixAt(i, m4); } E.eggs.instanceMatrix.needsUpdate = true; }
// Schaumnest: Blasen direkt unter der Oberfläche
E.foamBase = []; { const r = rng(88); for (let i = 0; i < 480; i++) { const a = r() * 6.28, d = Math.pow(r(), 0.6) * 0.42; const rr = 0.008 + r() * 0.022; E.foamBase.push({ p: V(Math.cos(a) * d, -rr - r() * 0.07 * (1 - d / 0.45), Math.sin(a) * d * 0.85), r: rr, t: r() }); } }

// ---------- Blitz-Licht ----------
E.zap = new THREE.PointLight(0xbfe8ff, 0, 4, 1.5); scene.add(E.zap);

// ---------- Stimmung ----------
function underwater(murk = 1) { scene.background = new THREE.Color(0x4f5a34); scene.fog.color.set(0x4f5a34); scene.fog.near = 0.1; scene.fog.far = lerp(7.5, 2.0, clamp(murk - 1)); if (murk < 1) scene.fog.far = 7.5;
  hemi.color.set(0xe2edb8); hemi.groundColor.set(0x3a3a20); hemi.intensity = 1.7; sun.color.set(0xfff0c0); sun.intensity = 2.0; sun.position.set(-2, 12, 3); sun.target.position.set(0, BED, 0);
  E.surfM.color.set(0xd9e0a8); E.surfM.emissive.set(0x8a9050); E.surfM.opacity = 0.92; E.surfM.side = THREE.BackSide; riverG.visible = true; E.bank.visible = false; sky.visible = false; E.motes.visible = true; (E.caus || []).forEach(u => u.value = 1); }
function above() { scene.background = null; sky.visible = true; skyU.top.value.set(0x8ab0cf); skyU.hor.value.set(0xeae4cc); scene.fog.color.set(0xd6d8c4); scene.fog.near = 12; scene.fog.far = 70;
  hemi.color.set(0xf3ede2); hemi.groundColor.set(0x4a5a2c); hemi.intensity = 1.5; sun.color.set(0xffdcaa); sun.intensity = 3.0; sun.position.set(-14, 14, 12); sun.target.position.set(0, 0, 0);
  E.surfM.color.set(0x6e6c42); E.surfM.emissive.set(0x1a1a0c); E.surfM.opacity = 0.9; E.surfM.side = THREE.FrontSide; riverG.visible = true; E.bank.visible = true; E.motes.visible = false; shaftsUpdate(0, 0); }
function plantHide() { const c = camera.position, Z = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < E.plantBase.length; i++) { const e = E.plantBase[i].elements; const dx = e[12] - c.x, dz = e[14] - c.z; E.plants.setMatrixAt(i, dx * dx + dz * dz < 0.9 ? Z : E.plantBase[i]); } E.plants.instanceMatrix.needsUpdate = true; }
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
function camFix(pos, look, fov = 40) { LOOK = look.clone(); camera.position.copy(pos); camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(look); camera.updateMatrixWorld(true); }
const WP = (i, pre, n) => WT(i, pre, n);
const inFront = p => p.clone().applyMatrix4(camera.matrixWorldInverse).z < -0.05;
// Blitz zwischen zwei Weltpunkten (SVG über dem Bild)
function bolt(a, b, k, seed, w = 1, col = '#9fe9ff') { if (k <= 0 || !inFront(a) || !inFront(b)) return; const [x0, y0] = proj(a), [x1, y1] = proj(b); const r = rng(seed * 7919 + 13); const n = 9; const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1; const nx = -dy / L, ny = dx / L;
  const pts = []; for (let i = 0; i <= n; i++) { const t = i / n, o = (i === 0 || i === n) ? 0 : (r() - 0.5) * L * 0.22; pts.push([x0 + dx * t + nx * o, y0 + dy * t + ny * o]); }
  const d = pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' '); const br = []; for (let i = 2; i < n - 1; i += 3) { const [px, py] = pts[i]; const a2 = r() * 6.28, l = L * (0.1 + r() * 0.12); br.push(`${px.toFixed(1)},${py.toFixed(1)} ${(px + Math.cos(a2) * l * 0.5 + (r() - 0.5) * 20).toFixed(1)},${(py + Math.sin(a2) * l * 0.5).toFixed(1)} ${(px + Math.cos(a2) * l).toFixed(1)},${(py + Math.sin(a2) * l).toFixed(1)}`); }
  const op = clamp(k).toFixed(2); svg.push(`<g opacity="${op}" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="${d}" stroke="${col}" stroke-width="${22 * w}" opacity="0.35"/>${br.map(q => `<polyline points="${q}" stroke="${col}" stroke-width="${6 * w}"/>`).join('')}<polyline points="${d}" stroke="${col}" stroke-width="${9 * w}"/><polyline points="${d}" stroke="#fff" stroke-width="${3.5 * w}"/></g>`); }
// Kleine Funken entlang des Körpers
function sparks(e, k, T, n = 6, reach = 0.12) { if (k <= 0) return; const q = Math.floor(T * 15); const r = rng(q * 31 + 7); for (let i = 0; i < n; i++) { const u = 0.15 + r() * 0.8; const p = eelPt(e, u); const o = V(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(reach * (0.6 + r())); bolt(p, p.clone().add(o), k * (r() < 0.75 ? 1 : 0), q * 11 + i, 0.45); } }
// Dipol-Feldlinien zwischen Kopf (+) und Schwanz (−)
function fieldLines(e, k, T, R = [0.32, 0.55], col = '#7fe3ff', op = 0.8) { if (k <= 0) return; const H = eelPt(e, 0.02), Tl = eelPt(e, 0.98); const C = H.clone().add(Tl).multiplyScalar(0.5), A = H.clone().sub(Tl); const half = A.length() / 2; A.normalize();
  const B = A.clone().cross(V(0, 1, 0)).normalize(), N = B.clone().cross(A).normalize();
  for (const rr of R) for (let f = 0; f < 6; f++) { const ph = f / 6 * Math.PI * 2 + 0.3; const dir = B.clone().multiplyScalar(Math.cos(ph)).addScaledVector(N, Math.sin(ph)); const pts = [];
    for (let i = 0; i <= 28; i++) { const th = lerp(0.06, Math.PI - 0.06, i / 28); const p = C.clone().addScaledVector(A, Math.cos(th) * half).addScaledVector(dir, Math.sin(th) * rr * k); if (!inFront(p)) { pts.length = 0; break; } pts.push(proj(p)); }
    if (pts.length) svg.push(`<polyline points="${pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="none" stroke="${col}" stroke-width="5" stroke-dasharray="18 14" stroke-dashoffset="${(-T * 90).toFixed(1)}" opacity="${(op * clamp(k)).toFixed(2)}"/>`); } }
function meter(label, val, k, col) { if (k <= 0) return; const s = back(k); const x = 540, y = 1340; svg.push(`<g transform="translate(${x},${y}) scale(${s})"><rect x="-230" y="-40" width="460" height="80" rx="22" fill="#111c" stroke="#000" stroke-width="7"/><rect x="-214" y="-24" width="${(428 * clamp(val)).toFixed(1)}" height="48" rx="12" fill="${col}"/>
  <text x="0" y="16" text-anchor="middle" font-family="M" font-weight="900" font-size="44" fill="#fff" stroke="#000" stroke-width="8" paint-order="stroke">${label}</text></g>`); }
const swimPath = (head, dir, wave, amp = 0.06) => u => head.clone().addScaledVector(dir, -u * EL);
function school(n, fn) { const L = []; for (let i = 0; i < n; i++) L.push(fn(i)); fishSet(L); }
const FR = rng(404); const FISHR = [...Array(NF)].map(() => [FR(), FR(), FR(), FR(), FR()]);

// ---------- Reset ----------
function resetWorld() { rex.root.visible = false; ui = []; svg = []; badge.style.display = 'none'; cta.style.display = 'none'; }
function stage(i, T) {
  UTIME.value = T; underwater(1); shaftsUpdate(T, 1); ground.visible = world.visible = false; GRASS.visible = false; E.zap.intensity = 0;
  E.motes.position.set(Math.sin(T * 0.2) * 0.1, Math.sin(T * 0.3) * 0.05, T * 0.02);
  [eel, ...pack].forEach(e => poseEel(e, { vis: false })); poseFish(prey, { vis: false }); poseFish(pred, { vis: false }); poseCaiman(caiman, { vis: false }); fishSet([]); bubSet([]); eggsSet(V(0, 0, 0), 0);
}
const shots = [
  // 0: Schlammiger Fluss im Amazonas – du siehst fast nichts
  (T) => { badge.style.display = T < 2.4 ? 'block' : 'none'; underwater(lerp(2, 1.6, clamp(T / 4))); shaftsUpdate(T, 0.6);
    const H = V(lerp(-0.45, 0.05, ease(T / 4.2)), -0.95, 0.1); poseEel(eel, { pos: H, yaw: Math.PI / 2, wave: T * 3, amp: 0.05, glow: T < 0.5 ? 0.6 : 0, T });
    camFix(V(0.5, -0.72, 0.9), V(H.x - 0.25, -0.8, 0.1), 40);
    if (T < 0.55) { const k = clamp((0.55 - T) / 0.3); E.zap.position.copy(eelPt(eel, 0.3)); E.zap.intensity = 6 * k; sparks(eel, k, T, 9, 0.2); }
    chip('🌫️ TRÜBES WASSER', 540, 470, clamp((T - 0.15) / 0.25), '#c9a14a'); label3('AMAZONAS', V(H.x - 0.6, -0.4, H.z - 1.4), clamp((T - WP(0, 'amazonas')) / 0.3) * clamp((WP(0, 'siehst') - T) / 0.2), 0, -60);
    icon(false, 540, 1340, clamp((T - WP(0, 'nichts')) / 0.25)); },
  // 1: Schwaches Stromfeld – du spürst jeden Stein und jeden Fisch
  (T) => { const t0 = S[1].start, tF = WP(1, 'stromfeld'), tSt = WP(1, 'stein'), tFi = WP(1, 'fisch'); const H = V(0.55, -1.0, -0.3);
    poseEel(eel, { pos: H, yaw: Math.PI / 2, wave: T * 2, amp: 0.035, T }); fieldLines(eel, clamp((T - tF + 0.2) / 0.5), T);
    const st = E.stones[0].position; ring(st, clamp((T - tSt) / 0.3), '#7fe3ff', 85); label3('STEIN', st, clamp((T - tSt) / 0.3), -120, 170);
    const fx = lerp(1.6, -0.4, clamp((T - tFi + 1.0) / 2.2)); const fp = V(fx, -0.72, 0.05); poseFish(prey, { pos: fp, yaw: -Math.PI / 2, tail: T * 14 });
    ring(fp, clamp((T - tFi) / 0.3), '#7fe3ff', 70); label3('FISCH', fp, clamp((T - tFi) / 0.3), 120, -170);
    cam(V(0.5, -0.5, 2.15), V(-0.05, -0.8, -0.3), 50, T, 0.004);
    chip('📡 STROMFELD', 540, 470, clamp((T - tF) / 0.3), '#7fe3ff'); icon(true, 540, 1500, clamp((T - WP(1, 'stört')) / 0.25)); },
  // 2: Zu wenig Sauerstoff – du würdest ersticken
  (T) => { const t0 = S[2].start, tS = WP(2, 'sauerstoff'), tE = WP(2, 'ersticken'); const H = V(0.3, -1.05, 0.1);
    poseEel(eel, { pos: H, yaw: 1.2, pitch: 0.12, wave: T * 1.2, amp: 0.025, T }); camFix(V(0.95 - (T - t0) * 0.04, -0.8, 0.75), V(0.15, -0.88, 0.0), 40);
    const L = []; for (let i = 0; i < 6; i++) { const ph = (T * 0.25 + i / 6) % 1; L.push({ p: V(0.4 + Math.sin(i * 3) * 0.3, lerp(-1.2, -0.3, ph), -0.2 + Math.cos(i * 2) * 0.3), r: 0.008 }); } bubSet(L);
    chip('O₂ 🔻 WENIG SAUERSTOFF', 540, 470, clamp((T - tS) / 0.3), '#e8483b'); meter('O₂', lerp(0.7, 0.12, clamp((T - tS) / 1.6)), clamp((T - tS) / 0.3), '#e8483b');
    icon(false, 540, 1520, clamp((T - tE) / 0.25)); },
  // 3: Alle paar Minuten nach oben – Luft schnappen wie wir
  (T) => { const t0 = S[3].start, tO = WP(3, 'oben'), tL = WP(3, 'schnappst'), tW = WP(3, 'wir'); underwater(0.5);
    const up = clamp((T - t0 + 0.1) / (tL - t0 + 0.1)); const hy = lerp(-1.0, -0.035, ease(up)); const H = V(lerp(0.4, 0.0, ease(up)), hy, lerp(0.2, -0.1, ease(up)));
    poseEel(eel, { pos: H, yaw: 0.9, pitch: lerp(0.15, 1.1, ease(up)), wave: T * 3, amp: 0.05, T });
    const g = clamp((T - tL) / 0.6); const L = []; if (T > tL) { for (let i = 0; i < 40; i++) { const ph = clamp((T - tL - i * 0.02) / 0.8); const a = i * 2.4; L.push({ p: H.clone().add(V(Math.cos(a) * 0.06 * ph, -0.04 + 0.03 * ph, Math.sin(a) * 0.06 * ph)), r: 0.006 + 0.01 * (1 - ph) }); }
      for (let i = 0; i < 18; i++) { const ph = (T * 0.7 + i / 18) % 1; const gp = eelPt(eel, 0.09); L.push({ p: gp.add(V(Math.sin(i) * 0.05, ph * 0.5, Math.cos(i * 1.3) * 0.05)), r: 0.007 + 0.006 * (i % 3) }); } } bubSet(L);
    camFix(V(0.75, -0.75, 1.25), V(0.05, -0.35, -0.1), 46); label3('LUFT', V(H.x, 0, H.z), clamp((T - tL) / 0.3), 140, -120);
    chip('🫁 LUFT SCHNAPPEN', 540, 470, clamp((T - tL) / 0.3), '#7fc4ff'); chip('🐟 = 🧍', 540, 1340, clamp((T - WP(3, 'genau')) / 0.3), '#2fbf5b'); icon(true, 540, 1520, clamp((T - tW) / 0.25)); },
  // 4: Mit schwachem Feld fängst du keinen Fisch
  (T) => { const t0 = S[4].start, tFe = WP(4, 'fängst'), tK = WP(4, 'keinen'); const lunge = clamp((T - tFe) / 0.35);
    const H = V(lerp(0.35, -0.05, easeOut(lunge)), -0.95, -0.2); poseEel(eel, { pos: H, yaw: -Math.PI / 2 + 0.25, wave: T * 3, amp: 0.05, T }); fieldLines(eel, 0.6, T, [0.25], '#7fe3ff', 0.35);
    const fp = V(lerp(-0.25, -0.35, clamp((T - t0) / 1.5)) - (T > tFe ? easeOut((T - tFe) / 0.5) * 1.4 : 0), -0.9 + (T > tFe ? easeOut((T - tFe) / 0.5) * 0.4 : 0), -0.12);
    poseFish(prey, { pos: fp, yaw: -Math.PI / 2 + (T > tFe ? -0.5 : 0), tail: T * (T > tFe ? 30 : 10) });
    if (T > tFe - 0.4 && T < tFe + 0.6) bolt(eelPt(eel, 0.01), fp, 0.45, Math.floor(T * 14), 0.35);
    cam(V(0.3, -0.62, 1.75), V(0.15, -0.78, -0.2), 46, T, 0.004);
    chip('⚡ ZU SCHWACH', 540, 470, clamp((T - WP(4, 'schwachen')) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - tK) / 0.25)); },
  // 5: Fast der ganze Körper wird zu Stromzellen – über 800 Volt
  (T) => { const t0 = S[5].start, tK = WP(5, 'körper'), tZ = WP(5, 'stromzellen'), tV = WP(5, 'volt'); const xr = clamp((T - t0 + 0.1) / 0.5); const lit = clamp((T - tZ) / (tV - tZ));
    const ph = T * 0.8; poseEel(eel, { path: u => V(0.22 - 0.3 * u + 0.2 * Math.sin(u * 6.28 + 0.4 + 0.15 * Math.sin(ph)), -0.15 - 1.25 * u, 0.12 * Math.sin(u * 3.14)), up: V(0, 0, 1), xray: xr, lit, glow: T > tV ? 0.4 + 0.3 * Math.sin(T * 30) : 0, amp: 0, T });
    camFix(V(0.1, -0.78, 2.3), V(0.0, -0.8, 0.0), 45); const n = Math.round(860 * ease(lit) / 10) * 10;
    if (T > tV) { E.zap.position.copy(eelPt(eel, 0.5)).add(V(0, 0, 0.3)); E.zap.intensity = 4 + 2 * Math.sin(T * 40); sparks(eel, 1, T, 10, 0.25); flash(clamp(1 - (T - tV) / 0.4), '200,240,255'); }
    label3('STROMZELLEN', eelPt(eel, 0.55), clamp((T - tZ) / 0.3), 200, 260); label3('ORGANE', eelPt(eel, 0.08), clamp((T - tK) / 0.3) * clamp((tZ + 0.8 - T) / 0.3), -230, -40);
    chip(`⚡ ${n} VOLT`, 540, 470, clamp((T - tZ) / 0.3), n > 600 ? '#f3c63f' : '#7fe3ff'); icon(true, 540, 1560, clamp((T - tV - 0.2) / 0.25)); },
  // 6: Ein Schwarm ist zu schnell für dich allein
  (T) => { const t0 = S[6].start, tS = WP(6, 'schnell'); const C = V(-0.2, -0.85, -0.4); const ln = clamp((T - tS + 0.3) / 0.6);
    const H = V(lerp(0.9, 0.15, easeOut(ln)), -0.88, lerp(0.3, -0.25, easeOut(ln))); poseEel(eel, { pos: H, yaw: -2.2, wave: T * 4, amp: 0.06, T });
    school(140, i => { const f = FISHR[i]; const a = f[0] * 6.28 + T * 0.6, b = (f[1] - 0.5) * 2.4; const R = 0.32 * Math.cbrt(f[2]); let p = C.clone().add(V(Math.cos(a) * Math.cos(b) * R, Math.sin(b) * R * 0.6, Math.sin(a) * Math.cos(b) * R));
      const away = p.clone().sub(H); const d = away.length(); const flee = ln * clamp(1.1 - d) * 0.9; p.addScaledVector(away.normalize(), flee); return { p, yaw: a + Math.PI / 2 + flee * 2, s: 0.075, tail: T * 20 + i }; });
    cam(V(0.5, -0.55, 1.55), V(-0.1, -0.88, -0.35), 46, T, 0.004);
    chip('🐟🐟🐟 ZU SCHNELL', 540, 470, clamp((T - WP(6, 'schwarm')) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - WP(6, 'allein')) / 0.25)); },
  // 7: Zu hundert jagen, Schwarm in die Enge treiben, alle gleichzeitig schocken
  (T) => { const t0 = S[7].start, tH = WP(7, 'hundert'), tE = WP(7, 'enge'), tS = WP(7, 'schockt'); const C = V(0, -0.85, -0.3); const R = lerp(1.25, 0.62, ease(clamp((T - tE + 0.5) / 1.0))); const shock = T > tS;
    [eel, ...pack].forEach((e, k) => { const a0 = k / 8 * Math.PI * 2 + T * 0.45 + (k % 2) * 0.3; const h = -0.85 + ((k * 37) % 5 - 2) * 0.09; const vis = k === 0 || T > tH - 0.6 + k * 0.08;
      poseEel(e, { path: u => { const a = a0 - u * EL / R; return V(C.x + Math.cos(a) * R, h + 0.04 * Math.sin(u * 9 - T * 4), C.z + Math.sin(a) * R); }, amp: 0, glow: shock ? 0.5 + 0.4 * Math.sin(T * 35 + k) : 0, vis, T }); });
    const stun = clamp((T - tS - 0.2) / 0.8); const rS = lerp(0.42, 0.27, ease(clamp((T - tE + 0.5) / 1.0)));
    school(150, i => { const f = FISHR[i]; const a = f[0] * 6.28 + T * (0.9 - stun * 0.9), b = (f[1] - 0.5) * 2.2; const r = rS * Math.cbrt(f[2]); const p = C.clone().add(V(Math.cos(a) * Math.cos(b) * r, Math.sin(b) * r * 0.7 + stun * (0.1 + f[3] * 0.25), Math.sin(a) * Math.cos(b) * r));
      return { p, yaw: a + Math.PI / 2, roll: stun * (2.5 + f[4]), s: 0.075, tail: T * 20 * (1 - stun) + i }; });
    if (shock) { const q = Math.floor(T * 14); [eel, ...pack].forEach((e, k) => bolt(eelPt(e, 0.02), C.clone().add(V(0, 0.05 * Math.sin(q + k), 0)), clamp(1.4 - (T - tS) / 1.5) * (rng(q * 9 + k)() < 0.8 ? 1 : 0), q * 17 + k, 0.7));
      E.zap.position.copy(C).add(V(0, 0.3, 0)); E.zap.intensity = 8 * clamp(1.4 - (T - tS) / 1.5); flash(clamp(1 - (T - tS) / 0.35), '200,240,255'); }
    cam(V(0.0, -0.12, 2.05), V(0, -0.88, -0.3), 50, T, 0.004);
    chip('👥 ZU HUNDERT', 540, 470, clamp((T - tH) / 0.3) * clamp((tS - T) / 0.2 + 1e-3), '#7fc4ff'); chip('⚡ ALLE GLEICHZEITIG', 540, 470, clamp((T - tS) / 0.3), '#f3c63f');
    icon(true, 540, 1520, clamp((T - WP(7, 'gleichzeitig')) / 0.25)); },
  // 8: Ein Kaiman hat es auf dich abgesehen (von unten gegen die Oberfläche)
  (T) => { const t0 = S[8].start, tK = WP(8, 'kaiman'); underwater(0.5); const cz = lerp(-1.6, -0.5, ease(clamp((T - t0) / 2.4)));
    poseCaiman(caiman, { pos: V(0.1, -0.07, cz), yaw: 0.15 }); poseEel(eel, { pos: V(0.45, -1.15, 0.55), yaw: -2.6, pitch: 0.1, wave: T * 2, amp: 0.04, T });
    camFix(V(1.5, -1.25, 1.3), V(0.1, -0.35, -0.7), 50); label3('KAIMAN', caiman.head.getWorldPosition(V(0, 0, 0)), clamp((T - tK) / 0.3), -60, 220);
    chip('🐊 KAIMAN', 540, 470, clamp((T - tK) / 0.3), '#e8483b'); icon(false, 540, 1520, clamp((T - WP(8, 'abgesehen')) / 0.25)); },
  // 9: Aus dem Wasser springen, an ihn drücken – Strom durch seinen Körper
  (T) => { const t0 = S[9].start, tSp = WP(9, 'springst'), tD = WP(9, 'drückst'), tS = WP(9, 'strom'); above(); shaftsUpdate(0, 0);
    const jolt = T > tS ? Math.sin(T * 47) * 0.06 * clamp(1.6 - (T - tS) / 2.5) : 0; const cP = V(0.4, -0.06, -0.3);
    poseCaiman(caiman, { pos: cP, yaw: -Math.PI / 2 + 0.3, jaw: T > tS ? 0.35 + 0.1 * Math.sin(T * 30) : 0.05, roll: jolt, pitch: -0.18 * ease(clamp((T - tSp) / 0.6)) + jolt * 0.5 });
    caiman.root.updateMatrixWorld(true); const C = V(0.13, 0.0, 0.86).applyMatrix4(caiman.root.matrixWorld); // Kontaktpunkt Kehle/Unterkiefer
    const k = ease(clamp((T - tSp + 0.2) / (tD - tSp + 0.2))); const H = V(C.x + 0.05, lerp(-0.8, C.y + 0.02, k), C.z + 0.12);
    poseEel(eel, { path: u => { const s = u * EL; const top = H.clone(); return V(top.x + 0.06 * Math.sin(s * 3) + s * 0.12, top.y - s * 0.75 + Math.max(0, s - 0.7) * 0.4, top.z + s * 0.35 - Math.max(0, s - 0.7) * 0.2); }, up: V(-1, 0, 0), glow: T > tS ? 0.6 + 0.3 * Math.sin(T * 40) : 0, amp: 0, vis: T > tSp - 0.3, T });
    if (T > tSp && T < tD + 0.3) { const L = []; for (let i = 0; i < 40; i++) { const ph = clamp((T - tSp) / 0.8); const a = i * 2.4; L.push({ p: V(H.x + Math.cos(a) * 0.25 * ph, 0.02 + Math.sin(i) * 0.1 * ph * (1 - ph) * 4, H.z + Math.sin(a) * 0.25 * ph), r: 0.015 * (1 - ph) + 0.004 }); } bubSet(L); }
    if (T > tS) { const q = Math.floor(T * 15); const tail = caiman.root.localToWorld(V(0.3, 0.05, -1.8)), mid = caiman.root.localToWorld(V(0, 0.18, -0.2)), leg = caiman.root.localToWorld(V(0.3, -0.25, 0.45));
      bolt(eelPt(eel, 0.01), mid, 1, q, 1.1); bolt(mid, tail, rng(q)() < 0.85 ? 1 : 0, q + 3, 0.9); bolt(mid, leg, 1, q + 5, 0.7); bolt(eelPt(eel, 0.01), caiman.head.getWorldPosition(V(0, 0, 0)), 1, q + 9, 0.8);
      E.zap.position.copy(mid).add(V(0, 0.5, 0.5)); E.zap.intensity = 10; flash(clamp(1 - (T - tS) / 0.4) + 0.15 * (q % 2), '200,240,255'); }
    cam(V(0.25, 0.85, 2.5), V(-0.3, 0.33, -0.2), 40, T, T > tS ? 0.02 : 0.004);
    chip('🦘 SPRUNG', 540, 470, clamp((T - tSp) / 0.3) * clamp((tS - T) / 0.2 + 1e-3), '#7fc4ff'); chip('⚡ VOLLER KONTAKT', 540, 470, clamp((T - tS) / 0.3), '#f3c63f'); icon(true, 540, 1340, clamp((T - WP(9, 'körper')) / 0.25)); },
  // 10: Eier im flachen Wasser – leichte Beute
  (T) => { const t0 = S[10].start, tEi = WP(10, 'eier'), tB = WP(10, 'beute'); const EC = V(-0.35, bedY(-0.35, 0.1) + 0.06, 0.1); eggsSet(EC, clamp((T - t0 + 0.4) / 0.6), clamp((T - tB + 0.6) / 1.4) * 0.7);
    const fp = V(lerp(-1.3, EC.x + 0.12, ease(clamp((T - t0) / (tB - t0 - 0.3)))), EC.y + 0.1 + 0.02 * Math.sin(T * 9), EC.z + 0.05); poseFish(pred, { pos: fp, yaw: Math.PI / 2 + 0.2, pitch: T > tB - 0.5 ? -0.4 : 0, tail: T * 14 });
    camFix(V(0.5, EC.y + 0.38, 1.3), V(-0.4, EC.y + 0.05, 0.05), 40);
    label3('EIER', EC, clamp((T - tEi) / 0.3), 160, -220); chip('🥚 LEICHTE BEUTE', 540, 470, clamp((T - WP(10, 'flachen')) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - tB) / 0.25)); },
  // 11: Schaumnest aus Spucke – bewachen mit voller Spannung
  (T) => { const t0 = S[11].start, tN = WP(11, 'schaumnest'), tSp = WP(11, 'spucke'), tBw = WP(11, 'bewachst'), tV = WP(11, 'spannung'); underwater(0.5);
    const F = V(-0.2, 0, -0.5); const grow = clamp((T - t0 + 0.2) / (tBw - t0)); const L = []; E.foamBase.forEach((b, i) => { if (b.t < grow) L.push({ p: F.clone().add(b.p), r: b.r * back(clamp((grow - b.t) * 6)) }); }); bubSet(L);
    eggsSet(F.clone().add(V(0, -0.05, 0)), clamp((T - tSp) / 0.6));
    const guard = T > tBw - 0.3; const a = T * 0.9; const H = guard ? V(F.x + Math.cos(a) * 0.5, -0.4, F.z + Math.sin(a) * 0.35) : V(F.x + 0.12, -0.08, F.z + 0.3);
    if (guard) poseEel(eel, { path: u => { const b = a - u * 2.6; return V(F.x + Math.cos(b) * (0.5 + u * 0.15), -0.4 - u * 0.25, F.z + Math.sin(b) * (0.35 + u * 0.2)); }, amp: 0, glow: T > tV ? 0.4 + 0.3 * Math.sin(T * 30) : 0.1, T });
    else poseEel(eel, { pos: H, yaw: Math.PI, pitch: 0.75, wave: T * 2, amp: 0.04, T });
    if (guard) sparks(eel, clamp((T - tBw) / 0.3), T, T > tV ? 12 : 5, 0.18);
    if (T > tBw) { const pk = clamp((T - tBw) / 1.0); const pp = V(lerp(1.4, 0.6, ease(pk)) + (T > tV ? easeOut((T - tV) / 0.6) * 1.5 : 0), -0.45, 0.1); poseFish(pred, { pos: pp, yaw: T > tV ? Math.PI / 2 : -Math.PI / 2, tail: T * 16 });
      if (T > tV && T < tV + 0.6) bolt(eelPt(eel, 0.02), pp, 1, Math.floor(T * 15), 0.9); }
    camFix(V(0.7, -0.95, 1.25), V(-0.15, -0.25, -0.45), 48); label3('SCHAUMNEST', F, clamp((T - tN) / 0.3), 220, 130);
    chip('🫧 SCHAUMNEST', 540, 470, clamp((T - tN) / 0.3) * clamp((tBw - T) / 0.2 + 1e-3), '#7fc4ff'); chip('⚡ BEWACHT', 540, 470, clamp((T - tBw) / 0.3), '#f3c63f'); icon(true, 540, 1340, clamp((T - tV) / 0.25)); },
  // 12: Gar kein Aal – ein Messerfisch
  (T) => { const t0 = S[12].start, tA = WP(12, 'aal'), tM = WP(12, 'messerfisch'); const H = V(-0.35 - (T - t0) * 0.08, -0.9, -0.35);
    poseEel(eel, { pos: H, yaw: -Math.PI / 2, wave: T * 1.5, amp: 0.02, finWave: T * 5, T }); camFix(V(0.35 - (T - t0) * 0.08, -0.62, 1.75), V(0.3 - (T - t0) * 0.08, -0.75, -0.35), 52);
    label3('FLOSSENSAUM', eelPt(eel, 0.55).add(V(0, -0.1, 0)), clamp((T - tM) / 0.3), 100, 240);
    chip('KEIN AAL', 540, 470, clamp((T - tA) / 0.3) * clamp((tM - T) / 0.2 + 1e-3), '#e8483b'); icon(false, 540, 1340, clamp((T - tA) / 0.25) * clamp((tM - T) / 0.2 + 1e-3));
    chip('🔪🐟 MESSERFISCH', 540, 470, clamp((T - tM) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - tM - 0.2) / 0.25)); },
  // 13: Glückwunsch – Zitteraal
  (T) => { const u = T - S[13].start; const H = V(0.45 + u * 0.06, -0.85, -0.2);
    poseEel(eel, { pos: H, yaw: Math.PI / 2 - 0.15, wave: T * 3, amp: 0.05, glow: 0.12 + 0.1 * Math.sin(T * 6), T }); sparks(eel, 0.8, T, 7, 0.15);
    E.zap.position.copy(H).add(V(-0.4, 0.3, 0.4)); E.zap.intensity = 3;
    cam(V(0.85 + u * 0.06, -0.5, 1.65), V(0.05 + u * 0.06, -0.72, -0.2), 46, T, 0.004); cta.style.display = T > WP(13, 'gebaut') ? 'block' : 'none';
    chip('⚡ ZITTERAAL', 540, 470, clamp((T - WP(13, 'zitteraal')) / 0.3), '#f3c63f'); },
];
shots.forEach((f, i) => { shots[i] = T => { stage(i, T); f(T); plantHide(); }; });
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
window.__ = { camera, LOOK, eel, pack, caiman, E, V, ui, svg, scene, poseEel };
