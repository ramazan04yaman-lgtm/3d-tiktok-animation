// "Wenn … du dir einen Pfau holst" – komplett prozedurale 3D-Szene (Three.js)
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
// ---------- Garten-Welt ----------
// Urzeit-Deko der Basis ausblenden, nur der Rasen bleibt
world.children.forEach(c => { if (c !== GRASS) c.visible = false; });
const G = {}; // alle Garten-Objekte
const garden = new THREE.Group(); scene.add(garden);
const M = (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.8 }, o));
const box = (w, h, d, m, x, y, z, parent = garden) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; parent.add(b); return b; };
const cyl = (r0, r1, h, m, x, y, z, seg = 16, parent = garden) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), m); c.position.set(x, y, z); c.castShadow = c.receiveShadow = true; parent.add(c); return c; };
const woodTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#8c4a2c'; g.fillRect(0, 0, w, h); const r = rng(5); for (let i = 0; i < 260; i++) { g.strokeStyle = `rgba(${60 + r() * 50},${25 + r() * 20},${15 + r() * 10},${0.25 + r() * 0.3})`; g.lineWidth = 1 + r() * 2; const x = r() * w; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (r() - .5) * 10, h / 3, x + (r() - .5) * 10, h * 2 / 3, x + (r() - .5) * 8, h); g.stroke(); } });
const woodM = M(0xffffff, { map: woodTex, roughness: 0.85 }); const woodLM = M(0xc9925c, { map: woodTex, roughness: 0.85 });
const stoneM = M(0xeee8dc, { roughness: 0.7 }); const darkM2 = M(0x1d1d1f, { roughness: 0.5 });
// Zaun rund um den Garten
{ const FX = 7.2, FZ0 = -7.2, FZ1 = 6.5, H = 1.9; const geo = new THREE.BoxGeometry(0.15, H, 0.035); const pos = [];
  const run = (x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(L / 0.16), a = Math.atan2(x1 - x0, z1 - z0); for (let i = 0; i <= n; i++) pos.push([lerp(x0, x1, i / n), lerp(z0, z1, i / n), a]);
    for (const y of [0.35, 1.5]) { const rl = box(0.05, 0.09, L, woodM, (x0 + x1) / 2, y, (z0 + z1) / 2); rl.rotation.y = a; rl.translateX(-0.04); } };
  run(-FX, FZ0, FX, FZ0); run(-FX, FZ0, -FX, FZ1); run(FX, FZ0, FX, FZ1); 
  const im = new THREE.InstancedMesh(geo, woodM, pos.length); const m4 = new THREE.Matrix4(); const r = rng(9); const col = new THREE.Color();
  pos.forEach(([x, z, a], i) => { m4.compose(V(x, H / 2, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, a + Math.PI / 2, 0)), V(1, 1 + (r() - .5) * 0.02, 1)); im.setMatrixAt(i, m4); col.setHSL(0.05, 0.45, 0.42 + r() * 0.12); im.setColorAt(i, col); });
  im.castShadow = im.receiveShadow = true; garden.add(im); G.fenceZ = FZ0; G.fenceH = H; }
// Nachbarhaus hinter dem Zaun mit Fenster (Licht + Silhouette)
{ const h = new THREE.Group(); h.position.set(-1.5, 0, -12.5); garden.add(h);
  const sidingTex = canvasTex(64, 256, (g, w, hh) => { g.fillStyle = '#c9c4bc'; g.fillRect(0, 0, w, hh); for (let y = 0; y < hh; y += 16) { g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, y + 13, w, 3); } }); sidingTex.repeat.set(10, 3);
  box(11, 6.5, 6, M(0xffffff, { map: sidingTex }), 0, 3.25, 0, h);
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 4.6, 2.6, 4, 1), M(0x4a4d55)); roof.rotation.y = Math.PI / 4; roof.scale.set(1.75, 1, 1); roof.position.y = 7.8; h.add(roof);
  box(2.3, 1.9, 0.18, M(0xf4f1ea), 0, 4.1, 3.02, h); // Rahmen
  const pane = box(2.0, 1.6, 0.05, new THREE.MeshStandardMaterial({ color: 0x2c3440, emissive: 0xffd88a, emissiveIntensity: 0, roughness: 0.2 }), 0, 4.1, 3.09, h); G.pane = pane;
  box(0.06, 1.6, 0.06, M(0xf4f1ea), 0, 4.1, 3.13, h);
  const silTex = (phone) => canvasTex(256, 256, (g, w, hh) => { g.clearRect(0, 0, w, hh); g.fillStyle = '#1a1210'; g.beginPath(); g.ellipse(128, 105, 46, 54, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(128, 270, 115, 110, 0, 0, 7); g.fill();
    if (phone) { g.save(); g.translate(178, 110); g.rotate(-0.3); g.fillRect(-12, -40, 24, 70); g.restore(); g.beginPath(); g.ellipse(186, 160, 22, 50, -0.4, 0, 7); g.fill(); }
    else { g.lineWidth = 9; g.strokeStyle = '#1a1210'; g.beginPath(); g.moveTo(80, 60); g.lineTo(115, 75); g.moveTo(176, 60); g.lineTo(141, 75); g.stroke(); } });
  G.sil = [false, true].map(ph => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), new THREE.MeshBasicMaterial({ map: silTex(ph), transparent: true, depthWrite: false })); m.position.set(0.1, 3.95, 3.13); m.visible = false; h.add(m); return m; });
  // Nebenhaus links
  const h2 = new THREE.Group(); h2.position.set(-14, 0, -2); garden.add(h2); box(6, 5.5, 10, M(0xd9cfbf), 0, 2.75, 0, h2); const rf = box(6.6, 0.3, 10.6, M(0x5a4a44), 0, 5.6, 0, h2);
  // Bäume außerhalb
  const trunk = M(0x5b4632, { roughness: 0.9 }); const leafMs = [M(0x3d6b2a), M(0x4f7d32), M(0x2f5a24)]; const r = rng(31);
  const tree = (x, z, s, parent = garden) => { const t = new THREE.Group(); t.position.set(x, 0, z); parent.add(t); cyl(0.12 * s, 0.2 * s, 3.2 * s, trunk, 0, 1.6 * s, 0, 8, t);
    for (let k = 0; k < 9; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry((0.9 + r() * 0.6) * s, 1), leafMs[k % 3]); b.position.set((r() - .5) * 2.2 * s, (3.2 + r() * 1.8) * s, (r() - .5) * 2.2 * s); b.castShadow = true; t.add(b); } return t; };
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + 0.3, d = 13 + r() * 9; tree(Math.cos(a) * d, Math.sin(a) * d * 0.9 - 1, 1 + r() * 0.6); }
  // Baum im Garten mit waagrechtem Ast auf 3 m (für den Sprung)
  const tg = new THREE.Group(); tg.position.set(-5.6, 0, 1.6); garden.add(tg); cyl(0.14, 0.24, 5, trunk, 0, 2.5, 0, 10, tg);
  const br = cyl(0.07, 0.09, 2.2, trunk, 1.0, 3.0, 0, 8, tg); br.rotation.z = Math.PI / 2;
  for (let k = 0; k < 10; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8 + r() * 0.5, 1), leafMs[k % 3]); b.position.set((r() - .3) * 2.6, 4.2 + r() * 1.6, (r() - .5) * 2.2); b.castShadow = true; tg.add(b); }
  G.branch = V(-5.6 + 1.5, 3.08, 1.6); }
// Wege + Springbrunnen
{ const pathM = M(0xe9e2d3, { roughness: 0.75 }); G.paths = new THREE.Group(); garden.add(G.paths);
  for (const [w, d, x, z] of [[12.5, 1.1, 0, 0], [1.1, 12.5, 0, -0.4]]) { const p = box(w, 0.04, d, pathM, x, 0.02, z, G.paths); p.castShadow = false; }
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.4, 2.3, 48), pathM); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.045; ring.receiveShadow = true; G.paths.add(ring);
  const f = new THREE.Group(); garden.add(f); G.fountain = f;
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.38, 0.5, 8, 1, true), stoneM); basin.position.y = 0.25; basin.castShadow = basin.receiveShadow = true; f.add(basin);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.09, 8, 8), stoneM); rim.rotation.x = Math.PI / 2; rim.rotation.z = Math.PI / 8; rim.position.y = 0.5; f.add(rim);
  const waterM = new THREE.MeshStandardMaterial({ color: 0x5fa8c8, roughness: 0.05, metalness: 0.2, emissive: 0x0d3a52, emissiveIntensity: 0.4 });
  const water = new THREE.Mesh(new THREE.CylinderGeometry(1.28, 1.28, 0.02, 8), waterM); water.position.y = 0.42; f.add(water);
  cyl(0.16, 0.22, 1.2, stoneM, 0, 0.9, 0, 12, f);
  const bowl = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.2, 0.02], [0.55, 0.12], [0.62, 0.2], [0.58, 0.22], [0.2, 0.12], [0, 0.12]].map(([x, y]) => new THREE.Vector2(x, y)), 24), stoneM); bowl.position.y = 1.45; bowl.castShadow = true; f.add(bowl);
  const w2 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.01, 20), waterM); w2.position.y = 1.62; f.add(w2); cyl(0.04, 0.06, 0.3, stoneM, 0, 1.75, 0, 8, f);
  const N = 500; const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3));
  G.spray = new THREE.Points(geo, new THREE.PointsMaterial({ map: dotTex, color: 0xd8f0ff, size: 0.05, transparent: true, opacity: 0.85, depthWrite: false })); f.add(G.spray); G.sprayN = N; }
function sprayAt(t) { const a = G.spray.geometry.attributes.position.array, r = rng(3); for (let i = 0; i < G.sprayN; i++) { const ph = (t * 0.9 + r()) % 1, ang = r() * 6.283, top = i % 3 === 0;
    if (top) { const v = 0.6 + r() * 0.2; a[i * 3] = Math.cos(ang) * 0.12 * ph; a[i * 3 + 1] = 1.9 + v * ph - 1.6 * ph * ph; a[i * 3 + 2] = Math.sin(ang) * 0.12 * ph; }
    else { const rr = 0.55 + 0.05 * ph; a[i * 3] = Math.cos(ang) * rr; a[i * 3 + 1] = 1.62 - ph * 1.2; a[i * 3 + 2] = Math.sin(ang) * rr; } }
  G.spray.geometry.attributes.position.needsUpdate = true; }
// Blumen + Büsche am Zaun
{ const r = rng(12); const fl = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.05, 0), M(0xffffff), 900); const m4 = new THREE.Matrix4(); const col = new THREE.Color(); let n = 0;
  const bushM = M(0x3f6e2c, { roughness: 0.9 });
  for (let k = 0; k < 22; k++) { const side = k % 3; const x = side === 0 ? lerp(-6.6, 6.6, r()) : side === 1 ? -6.7 : 6.7, z = side === 0 ? -6.7 : lerp(-6.4, 5.8, r()); if (Math.abs(x - 3.5) < 2 && z < -5) continue;
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45 + r() * 0.3, 1), bushM); b.position.set(x, 0.35, z); b.scale.y = 0.8; b.castShadow = true; garden.add(b);
    for (let j = 0; j < 30 && n < 900; j++, n++) { const a = r() * 6.28, d = 0.3 + r() * 0.35; m4.makeTranslation(x + Math.cos(a) * d, 0.3 + r() * 0.45, z + Math.sin(a) * d); fl.setMatrixAt(n, m4); col.set(r() < 0.6 ? 0xd8223a : r() < 0.5 ? 0xf06aa0 : 0xffffff); fl.setColorAt(n, col); } }
  fl.count = n; garden.add(fl); }
// Transportkiste
{ const c = new THREE.Group(); c.position.set(2.2, 0, 2.6); c.rotation.y = -0.6; garden.add(c); G.crate = c; const t = 0.05;
  box(1.1, t, 0.8, woodLM, 0, 0.03, 0, c); box(1.1, 1.0, t, woodLM, 0, 0.5, -0.4, c); box(t, 1.0, 0.8, woodLM, -0.55, 0.5, 0, c); box(t, 1.0, 0.8, woodLM, 0.55, 0.5, 0, c); box(1.1, t, 0.8, woodLM, 0, 1.0, 0, c);
  const door = new THREE.Group(); door.position.set(-0.55, 0, 0.4); c.add(door); for (let k = 0; k < 4; k++) box(0.24, 1.0, t, woodLM, 0.13 + k * 0.275, 0.5, 0, door); G.crateDoor = door; }
// Voliere mit Netz + Sitzstange + Nachthaus
const netTex = canvasTex(128, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(25,25,25,0.85)'; g.lineWidth = 2; for (let i = 0; i <= 128; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); } });
netTex.wrapS = netTex.wrapT = THREE.RepeatWrapping;
const netMat = (rx, ry, col = 0xffffff) => { const t = netTex.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return new THREE.MeshStandardMaterial({ map: t, color: col, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.9 }); };
{ const a = new THREE.Group(); a.position.set(-3.6, 0, -3.6); garden.add(a); G.aviary = a; const W2 = 1.9, H = 2.9; G.avPosts = [];
  for (const [x, z] of [[-W2, -W2], [W2, -W2], [-W2, W2], [W2, W2], [0, -W2], [0, W2], [-W2, 0], [W2, 0]]) { const p = box(0.1, H, 0.1, darkM2, x, H / 2, z, a); G.avPosts.push(p); }
  G.avBeams = []; for (const [x, z, w, d] of [[0, -W2, 2 * W2, 0.1], [0, W2, 2 * W2, 0.1], [-W2, 0, 0.1, 2 * W2], [W2, 0, 0.1, 2 * W2], [0, 0, 2 * W2, 0.08]]) G.avBeams.push(box(w, 0.1, d, darkM2, x, H, z, a));
  G.avNets = []; const nm = netMat(20, 15), nr = netMat(20, 20);
  for (const [x, z, ry] of [[0, -W2, 0], [0, W2, 0], [-W2, 0, Math.PI / 2], [W2, 0, Math.PI / 2]]) { const n = new THREE.Mesh(new THREE.PlaneGeometry(2 * W2, H), nm); n.position.set(x, H / 2, z); n.rotation.y = ry; a.add(n); G.avNets.push(n); }
  const roofN = new THREE.Mesh(new THREE.PlaneGeometry(2 * W2, 2 * W2), nr); roofN.rotation.x = -Math.PI / 2; roofN.position.y = H; a.add(roofN); G.avNets.push(roofN);
  G.perch = new THREE.Group(); a.add(G.perch); { const b = cyl(0.04, 0.04, 2.4, woodLM, 0.4, 1.35, 0.6, 10, G.perch); b.rotation.z = Math.PI / 2; for (const x of [-0.75, 1.55]) cyl(0.04, 0.05, 1.35, woodLM, x, 0.675, 0.6, 8, G.perch); }
  G.perchTop = V(-3.6 + 0.4, 1.39, -3.6 + 0.6);
  // Nachthaus (weiß, Rundbogentür), Decke 1.7 m, Stange direkt darunter
  const nh = new THREE.Group(); nh.position.set(-0.85, 0, -0.85); a.add(nh); G.night = nh; const plM = M(0xf2efe8, { roughness: 0.95, side: THREE.DoubleSide });
  const NW = 2.0, NH = 1.75, ND = 1.8;
  box(NW, NH, 0.06, plM, 0, NH / 2, -ND / 2, nh); box(0.06, NH, ND, plM, -NW / 2, NH / 2, 0, nh); box(0.06, NH, ND, plM, NW / 2, NH / 2, 0, nh); box(NW + 0.1, 0.07, ND + 0.1, plM, 0, NH, 0, nh);
  const fs = new THREE.Shape(); fs.moveTo(-NW / 2, 0); fs.lineTo(NW / 2, 0); fs.lineTo(NW / 2, NH); fs.lineTo(-NW / 2, NH); fs.lineTo(-NW / 2, 0); const hole = new THREE.Path(); hole.moveTo(-0.25, 0); hole.lineTo(0.25, 0); hole.lineTo(0.25, 0.75); hole.absarc(0, 0.75, 0.25, 0, Math.PI, false); hole.lineTo(-0.25, 0); fs.holes.push(hole);
  const front = new THREE.Mesh(new THREE.ExtrudeGeometry(fs, { depth: 0.06, bevelEnabled: false }), plM); front.position.set(0, 0, ND / 2 - 0.06); front.castShadow = front.receiveShadow = true; nh.add(front);
  const doorM = M(0x8a5a32); const ds = new THREE.Shape(); ds.moveTo(-0.25, 0); ds.lineTo(0.25, 0); ds.lineTo(0.25, 0.75); ds.absarc(0, 0.75, 0.25, 0, Math.PI, false); ds.lineTo(-0.25, 0);
  const dr = new THREE.Mesh(new THREE.ShapeGeometry(ds), doorM); dr.position.set(0, 0, ND / 2 + 0.005); nh.add(dr); G.nightDoor = dr;
  const ip = cyl(0.035, 0.035, NW - 0.08, woodLM, 0, NH - 0.78, -0.05, 8, nh); ip.rotation.z = Math.PI / 2; G.nightPerch = V(-3.6 - 0.85, NH - 0.78 + 0.035, -3.6 - 0.85 - 0.05); G.nightC = V(-3.6 - 0.85, 0, -3.6 - 0.85); G.nightCeil = NH;
  G.nightLamp = new THREE.PointLight(0x9fb2ff, 0, 4, 1.2); G.nightLamp.position.set(0.3, 1.2, 0.4); nh.add(G.nightLamp); }
// Auto (Lack spiegelt -> Rivale)
{ const c = new THREE.Group(); c.position.set(4.3, 0, 3.4); garden.add(c); G.car = c;
  const s = new THREE.Shape(); [[-2.1, 0.32], [2.1, 0.32], [2.15, 0.75], [1.9, 0.9], [0.9, 0.95], [0.45, 1.42], [-1.1, 1.45], [-1.65, 1.0], [-2.1, 0.92]].forEach(([x, y], i) => i ? s.lineTo(x, y) : s.moveTo(x, y));
  G.paint = new THREE.MeshPhysicalMaterial({ color: 0x5f7fa8, metalness: 0.55, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, opacity: 1 });
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 1.66, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 4 }), G.paint); body.position.z = -0.83; body.castShadow = true; c.add(body); G.carBody = body;
  const ws = new THREE.Shape(); [[0.35, 1.0], [0.8, 1.0], [0.4, 1.36], [-1.0, 1.39], [-1.5, 1.02]].forEach(([x, y], i) => i ? ws.lineTo(x, y) : ws.moveTo(x, y));
  const glass = new THREE.Mesh(new THREE.ExtrudeGeometry(ws, { depth: 1.86, bevelEnabled: false }), new THREE.MeshPhysicalMaterial({ color: 0x0b0e14, metalness: 0.2, roughness: 0.05, clearcoat: 1 })); glass.position.z = -0.93; c.add(glass);
  for (const [x, z] of [[-1.35, 0.86], [1.35, 0.86], [-1.35, -0.86], [1.35, -0.86]]) { const w = cyl(0.36, 0.36, 0.26, M(0x111111), x, 0.36, z, 20, c); w.rotation.x = Math.PI / 2; const hb = cyl(0.2, 0.2, 0.27, M(0xb8bcc2, { metalness: 0.8, roughness: 0.3 }), x, 0.36, z, 16, c); hb.rotation.x = Math.PI / 2; }
  // Plane (Abdeckung)
  const tarpG = new THREE.ExtrudeGeometry(s, { depth: 1.86, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.14, bevelSegments: 3, steps: 1 }); tarpG.translate(0, 0, -0.93);
  { const p = tarpG.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); p.setY(i, Math.max(0.05, y + 0.03 * Math.sin(x * 7 + z * 5))); } tarpG.computeVertexNormals(); }
  G.tarp = new THREE.Mesh(tarpG, M(0x7b8a7a, { roughness: 0.95, side: THREE.DoubleSide })); G.tarp.castShadow = true; G.tarp.scale.set(1.04, 1.03, 1.05); c.add(G.tarp); G.tarp.visible = false; }
// Gemüsebeete mit Grünkohl + Netze
{ const bd = new THREE.Group(); bd.position.set(3.6, 0, -4.2); garden.add(bd); G.beds = bd; G.kale = []; G.bedNets = []; const soilM = M(0x3b2a1e, { roughness: 1 });
  const leafG = (() => { const g = new THREE.PlaneGeometry(0.16, 0.34, 6, 8); g.translate(0, 0.17, 0); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, 0.025 * Math.sin(y * 60 + x * 30) + 0.12 * (y / 0.34) ** 2); p.setX(i, x * Math.sin(Math.PI * Math.min(1, y / 0.34 * 0.85 + 0.15))); } g.computeVertexNormals(); return g; })();
  const kaleM = M(0x2f5c3e, { side: THREE.DoubleSide, roughness: 0.6 }); const kaleM2 = M(0x3b6e48, { side: THREE.DoubleSide, roughness: 0.6 }); const r = rng(55);
  for (const z of [-0.65, 0.65]) { box(2.6, 0.4, 0.06, woodLM, 0, 0.2, z - 0.45, bd); box(2.6, 0.4, 0.06, woodLM, 0, 0.2, z + 0.45, bd); box(0.06, 0.4, 0.9, woodLM, -1.3, 0.2, z, bd); box(0.06, 0.4, 0.9, woodLM, 1.3, 0.2, z, bd); box(2.55, 0.05, 0.85, soilM, 0, 0.36, z, bd);
    for (let k = 0; k < 5; k++) { const pl = new THREE.Group(); pl.position.set(-1.0 + k * 0.5, 0.38, z); bd.add(pl); const leaves = [];
      for (let j = 0; j < 9; j++) { const l = new THREE.Mesh(leafG, j % 2 ? kaleM : kaleM2); l.rotation.set(-0.35 - 0.5 * (j / 9), j * 2.4, 0, 'YXZ'); l.scale.setScalar(0.9 + r() * 0.4); l.castShadow = true; pl.add(l); leaves.push(l); }
      G.kale.push(leaves); }
    const net = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 2.7, 16, 1, true, -Math.PI / 2, Math.PI), netMat(40, 12, 0x2e8a3a)); net.rotation.z = Math.PI / 2; net.position.set(0, 0.4, z); net.scale.set(1, 1, 1.15); bd.add(net); G.bedNets.push(net); }
  // Haufen Grünzeug
  G.pile = []; for (let k = 0; k < 26; k++) { const l = new THREE.Mesh(leafG, k % 2 ? kaleM : kaleM2); l.castShadow = true; garden.add(l); G.pile.push({ m: l, a: r() * 6.28, d: r() * 0.25, s: 0.8 + r() * 0.5, h: 2 + r() * 1.5, dl: r() * 0.6, rx: r() * 6 }); } }
// Maßband
G.tape = new THREE.Mesh(new THREE.BoxGeometry(1, 0.012, 0.05), new THREE.MeshStandardMaterial({ map: canvasTex(512, 16, (g, w, h) => { g.fillStyle = '#f2cf2a'; g.fillRect(0, 0, w, h); g.fillStyle = '#222'; for (let i = 0; i < 100; i++) g.fillRect(i * w / 100, 0, 1.5, i % 10 ? 5 : 11); }), roughness: 0.5 })); G.tape.castShadow = true; scene.add(G.tape);

// ---------- Pfau ----------
const featherTex = canvasTex(128, 512, (g, w, h) => { g.clearRect(0, 0, w, h); const r = rng(17);
  // Fahne: lockere Äste, oben dichter, Auge an der Spitze (y klein = Spitze)
  for (let y = 4; y < h - 6; y += 2) { const f = y / h; const half = (f < 0.32 ? 46 * Math.sin(Math.PI * Math.min(1, (f + 0.02) / 0.34)) : 22 * (1 - (f - 0.32) / 0.68) + 4) * (0.85 + r() * 0.3);
    for (const s of [-1, 1]) { g.strokeStyle = f < 0.32 ? `rgba(${90 + r() * 40},${130 + r() * 40},${40 + r() * 30},0.95)` : `rgba(${120 + r() * 50},${120 + r() * 40},${50 + r() * 30},${0.75 - 0.3 * f})`; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(64, y); g.quadraticCurveTo(64 + s * half * 0.6, y - 4, 64 + s * half, y - 10 - f * 8); g.stroke(); } }
  const eye = (rx, ry, col) => { g.beginPath(); g.ellipse(64, 70, rx, ry, 0, 0, 7); g.fillStyle = col; g.fill(); };
  eye(46, 62, '#8a8a2a'); eye(40, 54, '#c58a2c'); eye(33, 44, '#1f9a86'); eye(24, 33, '#1c3fa5'); eye(15, 20, '#0b1640');
  g.strokeStyle = '#6a6a3c'; g.lineWidth = 3; g.beginPath(); g.moveTo(64, 0); g.lineTo(64, h); g.stroke(); });
const featherGeo = (() => { const g = new THREE.PlaneGeometry(0.17, 1, 1, 6); g.translate(0, 0.5, 0); return g; })(); // Basis bei y=0, Spitze bei y=1 (UV oben = Spitze)
const featherM = new THREE.MeshStandardMaterial({ map: featherTex, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.45, metalness: 0.15 });
const NF = 150;
function makePeacock(seed = 1) {
  const p = { root: new THREE.Group(), body: new THREE.Group() }; scene.add(p.root); p.root.add(p.body);
  const blueM = new THREE.MeshPhysicalMaterial({ color: 0x1640b8, roughness: 0.35, metalness: 0.25, clearcoat: 0.6, sheen: 1, sheenColor: new THREE.Color(0x30c0ff) });
  const greenM = new THREE.MeshPhysicalMaterial({ color: 0x3a6a2c, roughness: 0.4, metalness: 0.3, clearcoat: 0.4, sheen: 1, sheenColor: new THREE.Color(0xc8b040) });
  const wingTex = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#b78b5c'; g.fillRect(0, 0, w, h); g.strokeStyle = '#3a2a1c'; g.lineWidth = 4; for (let y = 6; y < h; y += 12) { g.beginPath(); for (let x = 0; x <= w; x += 8) g.lineTo(x, y + 3 * Math.sin(x * 0.3)); g.stroke(); } });
  const wingM = new THREE.MeshStandardMaterial({ map: wingTex, roughness: 0.8, side: THREE.DoubleSide }); const chestM = M(0xa0562a, { side: THREE.DoubleSide });
  const legM = M(0x8d8476, { roughness: 0.6 }); p.fM = featherM.clone(); p.mats = [blueM, greenM, wingM, chestM, legM, p.fM];
  const sph = (r, m, x, y, z, sx = 1, sy = 1, sz = 1, parent = p.body) => { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), m); s.position.set(x, y, z); s.scale.set(sx, sy, sz); s.castShadow = true; parent.add(s); return s; };
  sph(0.17, greenM, 0, 0.62, -0.05, 1, 1.05, 1.75); sph(0.13, blueM, 0, 0.7, 0.14, 1.05, 1.25, 1.1);
  // Flügel (Schulter-Gelenk): gefaltet an der Seite, ausgebreitet zum Fliegen
  p.wings = [-1, 1].map(s => { const piv = new THREE.Group(); piv.position.set(s * 0.13, 0.72, 0.08); p.body.add(piv);
    const fold = sph(0.16, wingM, 0, -0.06, -0.12, 0.45, 0.75, 1.7, piv);
    const sh = new THREE.Shape(); sh.moveTo(0, 0.08); sh.bezierCurveTo(0.3, 0.12, 0.6, 0.06, 0.75, -0.06); sh.lineTo(0.62, -0.2); sh.lineTo(0.45, -0.3); sh.bezierCurveTo(0.3, -0.36, 0.1, -0.34, 0, -0.18); sh.lineTo(0, 0.08);
    const wg = new THREE.ShapeGeometry(sh, 12); wg.rotateX(-Math.PI / 2); const sp = new THREE.Mesh(wg, wingM); const tip = new THREE.Mesh(wg, chestM); tip.scale.set(1.0, 1, 1.0); tip.position.set(0.02, -0.005, -0.02); sp.add(tip);
    sp.scale.x = s; sp.castShadow = true; piv.add(sp); return { piv, fold, sp, s }; });
  // Hals (Kugelkette) + Kopf
  p.neck = []; for (let k = 0; k < 9; k++) p.neck.push(sph(0.07 - k * 0.0045, blueM, 0, 0, 0));
  p.head = new THREE.Group(); p.body.add(p.head); sph(0.045, blueM, 0, 0, 0, 0.95, 1, 1.25, p.head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.07, 10), M(0xb8ab98)); beak.rotation.x = Math.PI / 2; beak.position.set(0, -0.006, 0.075); p.head.add(beak); p.beak = beak;
  const lowB = new THREE.Mesh(new THREE.ConeGeometry(0.013, 0.055, 10), M(0xa89a86)); lowB.rotation.x = Math.PI / 2; lowB.position.set(0, -0.016, 0.065); p.head.add(lowB); p.lowBeak = lowB;
  for (const s of [-1, 1]) { sph(0.011, M(0x111111, { roughness: 0.2 }), s * 0.038, 0.01, 0.02, 1, 1, 1, p.head); sph(0.012, M(0xffffff), s * 0.04, 0.026, 0.012, 0.4, 0.5, 2.0, p.head); sph(0.012, M(0xffffff), s * 0.04, -0.008, 0.008, 0.4, 0.5, 2.2, p.head); }
  for (let k = 0; k < 16; k++) { const a = (k / 15 - 0.5) * 0.7; const st = new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0018, 0.09, 4), M(0x2a3a3a)); st.position.set(Math.sin(a) * 0.03, 0.08, -0.005 - 0.02 * Math.cos(a * 2)); st.rotation.z = -a * 1.2; st.rotation.x = -0.25; p.head.add(st);
    const tp = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), blueM); tp.position.set(Math.sin(a) * 0.075, 0.125, -0.016); tp.scale.set(0.8, 1.4, 0.5); p.head.add(tp); }
  // Beine
  p.legs = [-1, 1].map(s => { const hip = new THREE.Group(); hip.position.set(s * 0.07, 0.5, -0.02); p.body.add(hip);
    const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.014, 0.5, 8), legM); shank.position.y = -0.25; hip.add(shank); shank.castShadow = true;
    const foot = new THREE.Group(); foot.position.y = -0.5; hip.add(foot);
    for (const [a, l] of [[-0.45, 0.09], [0, 0.11], [0.45, 0.09], [Math.PI, 0.06]]) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, l, 6), legM); t.rotation.x = Math.PI / 2; t.position.set(Math.sin(a) * l / 2, 0.006, Math.cos(a) * l / 2); t.rotation.y = a; foot.add(t); }
    return { hip, foot }; });
  // Schleppe (instanziert)
  p.train = new THREE.InstancedMesh(featherGeo, p.fM, NF); p.train.castShadow = true; p.train.frustumCulled = false; p.body.add(p.train); const r = rng(seed * 7);
  p.F = []; for (let i = 0; i < NF; i++) { const a = (i % 50) / 49 * 2 - 1, l = (i / 50) | 0; const jit = (r() - .5) * 0.04;
    p.F.push({ a: a + jit, l, L: 1.5 * (1 - 0.38 * Math.pow(Math.abs(a), 1.6)) * [1, 0.86, 0.7][l], ord: r() }); }
  // kurze braune Steuerfedern unter der Schleppe
  { const tl = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 8), wingM); tl.rotation.x = -Math.PI / 2 - 0.5; tl.position.set(0, 0.56, -0.38); tl.scale.z = 0.3; p.body.add(tl); p.tail = tl; }
  return p;
}
const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), m4 = new THREE.Matrix4(), mB = new THREE.Matrix4();
function basisQ(dir, face, q) { const y = dir.clone().normalize(); const z = face.clone().sub(y.clone().multiplyScalar(face.dot(y))).normalize(); const x = y.clone().cross(z); mB.makeBasis(x, y, z); return q.setFromRotationMatrix(mB); }
// o: pos, yaw, walk (Phase, 0 = steht), stepK, wheel 0..1, shed 0..1 (Anteil ausgefallen), grow 0..1 (Länge), head: Vektor lokal, pitch, beak 0..1, wings 0..1 (ausgebreitet), flap (Phase), bodyPitch, sit 0..1, shake
function posePea(p, o = {}) {
  const { pos = V(0, 0, 0), yaw = 0, walk = 0, stepK = 0, wheel = 0, shed = 0, grow = 1, head = null, pitch = 0, beak = 0, wings = 0, flap = 0, bodyPitch = 0, sit = 0, shake = 0, T = 0, vis = true, opacity = 1, floor = 0, mirror = false } = o;
  p.root.visible = vis; if (!vis) return; p.root.position.copy(pos); p.root.rotation.set(0, yaw, 0); p.root.scale.set(1, 1, mirror ? -1 : 1);
  const bob = stepK * Math.abs(Math.sin(walk)) * 0.025; p.body.position.set(0, bob - sit * 0.28, 0); p.body.rotation.set(bodyPitch + wheel * 0.12, 0, shake * Math.sin(T * 40) * 0.02);
  p.legs.forEach((L, i) => { const ph = walk + i * Math.PI; L.hip.rotation.x = stepK * 0.45 * Math.sin(ph) - sit * 0.9 + wings * 0.9; L.foot.rotation.x = -L.hip.rotation.x + stepK * 0.3 * Math.max(0, Math.sin(ph)); });
  // Hals: Bezier von Brust zum Kopf
  const H = head ? head.clone() : V(0, 1.06 + 0.012 * Math.sin(T * 2), 0.3 + stepK * 0.03 * Math.sin(walk * 2)); const B0 = V(0, 0.76, 0.17); const C = V(0, lerp(B0.y, H.y, 0.75), lerp(B0.z, H.z, 0.2) - 0.02);
  p.neck.forEach((s, k) => { const t = k / (p.neck.length - 1) * 0.95; const a = B0.clone().multiplyScalar((1 - t) ** 2).add(C.clone().multiplyScalar(2 * t * (1 - t))).add(H.clone().multiplyScalar(t * t)); s.position.copy(a); });
  p.head.position.copy(H); p.head.rotation.set(pitch, 0, 0); p.beak.rotation.x = Math.PI / 2 - beak * 0.25; p.lowBeak.rotation.x = Math.PI / 2 + beak * 0.5;
  p.wings.forEach(w => { const sp = wings; w.fold.visible = sp < 0.3; w.sp.visible = sp >= 0.3; const fl = Math.sin(flap) * 0.9 * sp;
    w.piv.rotation.set(0, 0, w.s * (lerp(-1.3, 0.15, sp) + fl)); w.sp.rotation.set(0, w.s * lerp(1.2, 0.15, sp), 0); });
  // Schleppe
  let k = 0; const dR = V(0, 0, 0), dW = V(0, 0, 0), fR = V(0, 1, 0), fW = V(0, 0, 1), root = V(0, 0.6, -0.22);
  for (let i = 0; i < NF; i++) { const F = p.F[i]; const gone = F.ord < shed; if (gone) { m4.makeScale(0, 0, 0); p.train.setMatrixAt(i, m4); continue; }
    const Ls = F.L * grow; const hR = pos.y - floor + 0.58 - sit * 0.28; const sinkA = Math.asin(clamp(hR / Math.max(0.3, Ls) * 0.97)), cA = Math.cos(sinkA);
    dR.set(Math.sin(F.a * 0.22) * 0.6 * Math.max(0.25, cA), -Math.sin(sinkA) - 0.03 * F.l, -Math.max(0.08, cA)).normalize();
    const th = F.a * 1.5; dW.set(Math.sin(th), Math.cos(th) * 0.95, -0.28 - 0.06 * F.l).normalize();
    basisQ(dR, fR, qa); basisQ(dW, fW, qb); const wk = ease(clamp(wheel * 1.25 - Math.abs(F.a) * 0.25)); qa.slerp(qb, wk);
    const off = V(0, 0.015 * F.l, -0.02 * F.l + wk * 0.04 * F.l); m4.compose(root.clone().add(off), qa, V(1 - 0.12 * F.l, Ls, 1)); p.train.setMatrixAt(i, m4); k++; }
  p.train.instanceMatrix.needsUpdate = true; p.tail.visible = true;
  p.mats.forEach(m => { m.transparent = opacity < 1; m.opacity = opacity; m.depthWrite = opacity >= 1; });
}
const pea = makePeacock(1), rival = makePeacock(1);
// gefallene Federn auf dem Rasen + Federn in der Vase
G.fallen = new THREE.InstancedMesh(featherGeo, featherM, NF); G.fallen.castShadow = true; G.fallen.frustumCulled = false; scene.add(G.fallen); { const r = rng(77); G.fallenP = []; for (let i = 0; i < NF; i++) G.fallenP.push({ x: (r() - .5) * 1.6, z: -0.4 - r() * 1.4, a: r() * 6.28, d: r() * 0.6 }); }
G.vase = new THREE.Group(); scene.add(G.vase); { const v = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.16, 0], [0.2, 0.15], [0.17, 0.4], [0.11, 0.55], [0.13, 0.6], [0, 0.6]].map(([x, y]) => new THREE.Vector2(x, y)), 24), new THREE.MeshPhysicalMaterial({ color: 0x2b5f8a, roughness: 0.2, clearcoat: 1 })); v.castShadow = true; G.vase.add(v);
  G.vaseF = new THREE.InstancedMesh(featherGeo, featherM, 40); G.vaseF.frustumCulled = false; G.vase.add(G.vaseF); }
// Licht-Stimmungen
function mood(m) { const P = { day: [0x9fb7cf, 0xf2e3cc, 0xffd9a6, 3.1, 1.5, 0xe9e0cf], dawn: [0x6a6fa6, 0xf6b48a, 0xffa868, 3.0, 1.2, 0xd9b09a], late: [0xa7b8c4, 0xf4cf96, 0xffc070, 3.0, 1.3, 0xe8d2a8], night: [0x1a2550, 0x3a4878, 0x9fb4ff, 1.4, 0.75, 0x253060] }[m];
  skyU.top.value.set(P[0]); skyU.hor.value.set(P[1]); sun.color.set(P[2]); sun.intensity = P[3]; hemi.intensity = P[4]; scene.fog.color.set(P[5]); }

// Rasen kurz mähen + Halme auf Wegen, Brunnen, Beeten, Auto entfernen
{ const Z = new THREE.Matrix4().makeScale(0, 0, 0), P = new THREE.Vector3(), Q = new THREE.Quaternion(), Sc = new THREE.Vector3();
  for (let i = 0; i < GRASS_BASE.length; i++) { const m = GRASS_BASE[i]; m.decompose(P, Q, Sc); const x = P.x, z = P.z; const inG = Math.abs(x) < 7.3 && z > -7.3 && z < 7;
    const off = (Math.abs(z) < 0.62 && Math.abs(x) < 6.4) || (Math.abs(x) < 0.62 && z > -6.8 && z < 6) || Math.hypot(x, z) < 2.4 || (x > 2.1 && x < 5.1 && z > -5.4 && z < -3.0) || (x > 1.9 && x < 6.7 && z > 2.2 && z < 4.6) || Math.abs(Math.abs(x) - 7.2) < 0.25 || Math.abs(z + 7.2) < 0.25;
    if (off) GRASS_BASE[i] = Z.clone(); else if (inG) { Sc.y *= 0.42; Sc.x *= 0.8; GRASS_BASE[i] = new THREE.Matrix4().compose(P, Q, Sc); }
    GRASS.setMatrixAt(i, GRASS_BASE[i]); } GRASS.instanceMatrix.needsUpdate = true; }
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
function waves(p, k, T, dir = 1) { if (k <= 0) return; const [x, y] = proj(p); for (let i = 0; i < 3; i++) { const ph = (T * 2.2 + i / 3) % 1; const r = 40 + ph * 120; const op = k * (1 - ph);
    svg.push(`<path d="M${x + dir * r * 0.5} ${y - r * 0.8} A${r} ${r} 0 0 ${dir > 0 ? 1 : 0} ${x + dir * r * 0.5} ${y + r * 0.8}" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity="${op.toFixed(2)}" transform="translate(${dir * 30},-20)"/>`); } }
function camFix(pos, look, fov = 40) { LOOK = look.clone(); camera.position.copy(pos); camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(look); camera.updateMatrixWorld(true); }
const headP = (p = pea) => { p.root.updateMatrixWorld(true); return p.head.getWorldPosition(V(0, 0, 0)); };
const ptW = (p, x, y, z) => { p.root.updateMatrixWorld(true); return V(x, y, z).applyMatrix4(p.body.matrixWorld); };
const fwd = yaw => V(Math.sin(yaw), 0, Math.cos(yaw));
const WP = (i, pre, n) => WT(i, pre, n); // Kurzform
const arc = (a, b, h, k) => a.clone().lerp(b, k).add(V(0, 4 * h * k * (1 - k), 0));
function fallenAt(c, yaw, n, T, t0 = -1) { const q = new THREE.Quaternion(); G.fallen.visible = n > 0; for (let i = 0; i < NF; i++) { const P = G.fallenP[i];
    if (i >= n) { m4.makeScale(0, 0, 0); G.fallen.setMatrixAt(i, m4); continue; }
    const d = V(Math.cos(P.a) * 0.3, 0, -1).applyAxisAngle(V(0, 1, 0), yaw).normalize(); basisQ(d, V(0, 1, 0), q); const off = V(P.x, 0.012 + i * 0.0001, P.z).applyAxisAngle(V(0, 1, 0), yaw);
    m4.compose(c.clone().add(off), q, V(1, pea.F[i].L * 0.9, 1)); G.fallen.setMatrixAt(i, m4); }
  G.fallen.instanceMatrix.needsUpdate = true; }
function vaseFill(n) { const q = new THREE.Quaternion(); for (let i = 0; i < 40; i++) { if (i >= n) { m4.makeScale(0, 0, 0); G.vaseF.setMatrixAt(i, m4); continue; } const a = i * 2.4, s = 0.25 + (i % 5) * 0.06;
    basisQ(V(Math.cos(a) * s, 1, Math.sin(a) * s), V(Math.cos(a), 0, Math.sin(a)), q); m4.compose(V(0, 0.25, 0), q, V(1, 1.1 + (i % 3) * 0.12, 1)); G.vaseF.setMatrixAt(i, m4); } G.vaseF.instanceMatrix.needsUpdate = true; }

// ---------- Reset ----------
function resetWorld() {
  rex.root.visible = false; ui = []; svg = []; badge.style.display = 'none'; cta.style.display = 'none'; }
function stage(i, T) { // Ausbaustufe des Gartens je Szene
  mood('day'); sunAt(V(0, 0, 0)); G.nightLamp.intensity = 0;
  ground.visible = world.visible = sky.visible = true; scene.background = null; scene.fog.near = 40; scene.fog.far = 320;
  G.paths.visible = G.fountain.visible = i !== 3 || true; G.paths.scale.set(1, 1, 1); G.fountain.scale.set(1, 1, 1);
  G.crate.visible = i === 2 || i === 3; G.crateDoor.rotation.y = 0;
  G.aviary.visible = i >= 4; G.avPosts.concat(G.avBeams, G.avNets).forEach(o => { o.scale.set(1, 1, 1); o.visible = true; }); G.perch.visible = true; G.night.visible = i >= 6; G.night.scale.set(1, 1, 1);
  G.car.visible = i >= 7; G.paint.opacity = 1; G.paint.depthWrite = true; G.tarp.visible = i >= 9; G.tarp.position.set(0, 0, 0);
  G.beds.visible = true; G.bedNets.forEach(n => { n.visible = i >= 11; n.scale.set(1, 1, 1.15); }); G.kale.forEach(l => l.forEach(m => m.visible = true));
  G.pile.forEach(o => o.m.visible = i >= 11); for (const o of G.pile) { o.m.position.set(1.6 + Math.cos(o.a) * o.d, 0.03 + o.d * 0.1, -2.4 + Math.sin(o.a) * o.d); o.m.rotation.set(-1.3, o.a, o.rx * 0.2); o.m.scale.setScalar(o.s * (i >= 11 ? 0.0001 : 1)); }
  G.tape.visible = false; G.fallen.visible = false; G.vase.visible = i >= 12; vaseFill(i >= 13 ? 40 : 0); G.vase.position.set(-1.9, 0, 3.8);
  G.pane.material.emissiveIntensity = 0; G.sil.forEach(m => m.visible = false); sprayAt(T);
  posePea(rival, { vis: false }); posePea(pea, { pos: V(0, 0, 2.6), T });
}
function neighbor(phone, T, t0) { G.pane.material.emissiveIntensity = 1.4; G.sil[phone ? 1 : 0].visible = true; G.sil[phone ? 1 : 0].position.x = 0.1 + 0.03 * Math.sin(T * 3);
  cam(V(-0.6, 2.4, -4.6), V(-1.5, 3.9, -9.5), 36, T, 0.01); }

const shots = [
  // 0: Pfau im Garten – schönster Vogel – Nachbarn hassen ihn
  (T) => { const tA = WP(0, 'aber'); badge.style.display = T < 3 ? 'block' : 'none';
    if (T < tA) { const u = T - S[0].start; posePea(pea, { pos: V(0, 0, 2.6), yaw: 0, wheel: 1, shake: T > 2.8 && T < 3.6 ? 1 : 0, T, head: V(0, 1.06, 0.3 + 0.02 * Math.sin(T * 3)) });
      cam(V(Math.sin(u * 0.12) * 1.2, lerp(0.7, 1.0, ease(u / 4)), lerp(7.5, 6.0, ease(u / 4))), V(0, 1.05, 2.4), 40, T, 0.004);
      label3('PFAU', headP(), clamp((T - WP(0, 'pfau')) / 0.3) * clamp((2.6 - T) / 0.3), 160, -180); }
    else { posePea(pea, { pos: V(-1.0, 1.9, -7.2), yaw: Math.PI, T }); neighbor(false, T); chip('😡 NACHBARN', 540, 520, clamp((T - WP(0, 'nachbarn')) / 0.3)); icon(false, 540, 1340, clamp((T - WP(0, 'hassen')) / 0.25)); }
  },
  // 1: 200 Federn, 1,5 m lang – springt trotzdem 3 m hoch
  (T) => { const tR = WP(1, 'trotzdem'), tJ = WP(1, 'springt');
    if (T < tR) { const P0 = V(3.6, 0, 1.6); posePea(pea, { pos: P0, yaw: Math.PI / 2, T, head: V(0, 1.04, 0.3) });
      cam(V(3.2, 1.25, 6.6), V(3.25, 0.55, 1.6), 40, T, 0.004);
      const tF = WP(1, 'zweihundert'); const n = Math.round(200 * ease((T - tF) / 0.9)); chip(`🪶 ${n} FEDERN`, 540, 470, clamp((T - tF + 0.1) / 0.3));
      const tM = WP(1, 'anderthalb'); if (T > tM - 0.2) { const k = ease((T - tM + 0.2) / 0.8); G.tape.visible = true; G.tape.scale.set(1.5 * k + 0.001, 1, 1); G.tape.position.set(P0.x - 0.22 - 0.75 * k, 0.03, P0.z + 0.32); chip('📏 1,5 METER', 540, 1330, clamp((T - tM) / 0.3), '#f2cf2a'); } }
    else { const B = G.branch, P0 = V(B.x, 0, B.z + 0.05); const k = ease((T - tJ - 0.15) / 0.75); const crouch = clamp((T - tJ + 0.4) / 0.4) * (1 - clamp((T - tJ - 0.15) / 0.1));
      posePea(pea, { pos: V(P0.x, B.y * k, P0.z), yaw: Math.PI / 2, T, wings: k > 0 && k < 1 ? 1 : 0, flap: T * 18, sit: crouch * 0.4, bodyPitch: k > 0 && k < 1 ? -0.3 : 0 });
      cam(V(B.x + 2.0, 1.9, B.z + 7.6), V(B.x + 0.4, 2.1, B.z), 40, T, 0.006);
      G.tape.visible = true; const hk = ease((T - tJ) / 0.8); G.tape.scale.set(3 * hk + 0.001, 1, 1); G.tape.rotation.set(0, 0, Math.PI / 2); G.tape.position.set(B.x + 0.75, 1.5 * hk, B.z + 0.3);
      chip('⬆️ 3 METER', 540, 470, clamp((T - WP(1, 'drei')) / 0.3), '#f2cf2a'); }
  },
  // 2: Garten mit Springbrunnen – Pfau zieht ein
  (T) => { const tG = WP(2, 'garten'), tS = WP(2, 'springbrunnen'), tH = WP(2, 'holst');
    G.paths.scale.set(ease((T - tG + 0.3) / 0.6) + 0.001, 1, ease((T - tG + 0.3) / 0.6) + 0.001); G.fountain.scale.set(1, back((T - tS + 0.1) / 0.6) + 0.001, 1);
    if (T < tH) { posePea(pea, { vis: false }); const u = T - S[2].start; cam(V(Math.sin(u * 0.1) * 2, 10, 10.5), V(0, 0, 0.6), 40, T, 0.01); }
    else { const k = ease((T - tH) / 0.5); G.crateDoor.rotation.y = -2.1 * k; const w = clamp((T - tH - 0.3) / 1.0);
      const P = V(0, 0, lerp(0.1, 1.6, w)).applyAxisAngle(V(0, 1, 0), G.crate.rotation.y).add(G.crate.position); posePea(pea, { pos: P, yaw: G.crate.rotation.y, walk: T * 7, stepK: w > 0 && w < 1 ? 1 : 0, T });
      cam(V(4.6, 1.4, 6.0), V(2.0, 0.7, 3.2), 40, T, 0.005); }
  },
  // 3: Am nächsten Morgen weg – fliegt über den Zaun
  (T) => { const tD = WP(3, 'denn'), tF = WP(3, 'fliegen'); G.crateDoor.rotation.y = -2.1;
    if (T < tD) { posePea(pea, { vis: false }); const c = G.crate; const look = V(0, 0.5, 0).applyAxisAngle(V(0, 1, 0), c.rotation.y).add(c.position); const cp = V(0, 1.1, 2.6).applyAxisAngle(V(0, 1, 0), c.rotation.y).add(c.position);
      cam(cp, look, 40, T, 0.005); icon(false, 540, 760, clamp((T - WP(3, 'weg')) / 0.25)); chip('🌅 NÄCHSTER MORGEN', 540, 470, clamp((T - S[3].start) / 0.3)); }
    else { const A = V(1.5, 0, -4.6), B = V(1.2, 0, -10.5); const k = clamp((T - tF + 0.1) / 1.6); const P = arc(A, B, 2.8, ease(k)); if (k <= 0) P.copy(A);
      posePea(pea, { pos: P, yaw: Math.PI, T, floor: k > 0 ? P.y + 0.35 : 0, wings: k > 0.02 && k < 0.98 ? 1 : 0, flap: T * 16, bodyPitch: k > 0 && k < 1 ? -0.15 : 0, walk: T * 8, stepK: k <= 0 ? 1 : 0 });
      cam(V(3.2, 1.3, -0.4), V(1.4, 1.7, -7.0), 40, T, 0.006); label3('ZAUN', V(-0.5, G.fenceH, G.fenceZ), clamp((T - WP(3, 'zaun')) / 0.3), -120, -200); }
  },
  // 4: Voliere mit Netzdach – ein paar Monate drin – hier zu Hause
  (T) => { const tB = WP(4, 'baust'), tN = WP(4, 'netzdach'), tL = WP(4, 'lässt'), tM = WP(4, 'monate'), tZ = WP(4, 'hause');
    G.avPosts.forEach((p, i) => p.scale.set(1, ease((T - tB - i * 0.07) / 0.5) + 0.001, 1)); G.avBeams.forEach((b, i) => b.scale.set(ease((T - tB - 0.5 - i * 0.08) / 0.4) + 0.001, 1, ease((T - tB - 0.5 - i * 0.08) / 0.4) + 0.001));
    G.avNets.forEach((n, i) => { const k = ease((T - tN + 0.6 - i * 0.12) / 0.5); n.visible = k > 0.01; n.scale.set(1, k + 0.001, 1); });
    const a = G.aviary.position; const ph = (T - S[4].start) * 0.35; const P = V(a.x + Math.cos(ph) * 0.8, 0, a.z + 0.3 + Math.sin(ph) * 0.8);
    posePea(pea, { pos: P, yaw: ph + Math.PI, walk: T * 7, stepK: 1, T });
    if (T < tL) cam(V(0.6, 2.8, 2.4), V(-3.6, 1.1, -3.6), 40, T, 0.006); else cam(V(-0.2, 1.7, 0.4), V(-3.4, 0.8, -3.2), 40, T, 0.005);
    if (T > tM - 0.2) { const mo = 1 + Math.min(2, Math.floor((T - tM) / 0.45)); chip(`📅 ${mo} MONAT${mo > 1 ? 'E' : ''}`, 540, 470, clamp((T - tM + 0.2) / 0.3)); }
    icon(true, 540, 1330, clamp((T - tZ) / 0.25)); chip('🏡 ZUHAUSE', 540, 600, clamp((T - tZ) / 0.3), '#2fbf5b');
  },
  // 5: Sonnenaufgang – schreit – Nachbarn beschweren sich
  (T) => { mood('dawn'); const tS = WP(5, 'fängt'), tN = WP(5, 'deine');
    if (T < tN) { const P = G.perchTop.clone(); const scream = ease((T - tS) / 0.35) * (T < tN - 0.1 ? 1 : 0);
      posePea(pea, { pos: P, yaw: 0, T, floor: 0, head: V(0, lerp(1.06, 1.32, scream), lerp(0.3, 0.2, scream)), pitch: -0.5 * scream, beak: scream * (0.6 + 0.4 * Math.sin(T * 20)) });
      sunAt(V(-3.6, 0, -3.6)); { const L = G.perchTop.clone().add(V(0, 0.7, 0)); camFix(V(-1.85, 1.75, -1.85), L, 55); } waves(headP(), scream, T, 1); chip('🌄 SONNENAUFGANG', 540, 470, clamp((T - WP(5, 'sonnenaufgang')) / 0.3)); }
    else { posePea(pea, { vis: false }); neighbor(true, T); chip('BESCHWERDE BEI DER STADT', 540, 520, clamp((T - WP(5, 'beschweren')) / 0.3)); icon(false, 540, 1340, clamp((T - WP(5, 'stadt')) / 0.25)); }
  },
  // 6: Dunkles Nachthaus, Stange direkt unter der Decke – Hals kann sich nicht strecken
  (T) => { mood('night'); const tH = WP(6, 'nachthaus'), tS = WP(6, 'stange'), tX = WP(6, 'strecken'), tK = WP(6, 'kann');
    G.night.scale.setScalar(back((T - tH + 0.2) / 0.6) + 0.001);
    if (T < tS) { posePea(pea, { vis: false }); cam(V(-1.0, 1.8, -0.9), V(-4.6, 0.9, -4.3), 40, T, 0.005); G.nightLamp.intensity = 0; }
    else { G.nightLamp.intensity = 7; hemi.intensity = 0.3; sun.intensity = 0.05; const P = G.nightPerch.clone(); const push = T > tX - 0.3 ? Math.max(0, Math.sin((T - tX + 0.3) * 7)) * clamp((tK + 0.6 - T) / 0.3) : 0;
      posePea(pea, { pos: P, yaw: Math.PI / 2, T, floor: 0, sit: 0.5, head: V(0, 0.8 + push * 0.05, 0.27), pitch: 0.25 - push * 0.2, shake: push });
      { const C = G.nightC; camFix(V(C.x + 0.85, 1.15, C.z + 0.78), V(C.x - 0.15, 1.3, C.z - 0.1), 70); } label3('DECKE', V(G.nightC.x - 0.3, G.nightCeil - 0.02, G.nightC.z - 0.4), clamp((T - WP(6, 'decke')) / 0.3), 120, 200);
      chip('🔇 KEIN SCHREI', 540, 470, clamp((T - WP(6, 'nicht')) / 0.3), '#2fbf5b'); icon(true, 540, 1330, clamp((T - WP(6, 'schreien')) / 0.25)); }
  },
  // 7: Greift das Auto an – Spiegelbild
  (T) => { const tA = WP(7, 'greift'); const carS = G.car.position.z - 0.91; const P = V(3.9, 0, carS - 0.75); const peck = T > tA ? Math.max(0, Math.sin((T - tA) * 9)) : 0;
    const o = { yaw: 0, T, head: V(0, lerp(1.0, 0.86, peck), lerp(0.3, 0.5, peck)), pitch: 0.4 * peck, wings: 0.25 * (T > tA ? 1 : 0), wheel: 0.25 * clamp((T - tA) / 0.5) };
    posePea(pea, Object.assign({ pos: P }, o)); posePea(rival, Object.assign({ pos: V(P.x, 0, carS - 0.03), mirror: true, opacity: 0.7 }, o)); rival.root.scale.z = -0.08; // flaches Spiegelbild auf dem Lack
    cam(V(1.2, 1.5, carS - 4.0), V(3.95, 0.8, carS), 40, T, 0.006);
    label3('SPIEGELBILD', headP(rival), clamp((T - WP(7, 'spiegelbild')) / 0.3), 160, -230); chip('😡 RIVALE?', 540, 470, clamp((T - WP(7, 'fremden')) / 0.3));
  },
  // 8: Plane über das Auto – Rivale verschwunden
  (T) => { const tP = WP(8, 'plane'), tV = WP(8, 'verschwunden'); const carS = G.car.position.z - 0.91; const P = V(3.9, 0, carS - 0.75);
    const k = ease((T - tP) / 0.6); G.tarp.visible = k > 0; G.tarp.position.y = (1 - k) * 2.4; G.tarp.scale.set(1.04, lerp(0.4, 1.03, k), 1.05);
    posePea(pea, { pos: P, yaw: -0.3, T, head: V(0, 1.06, 0.3) }); const ro = clamp(1 - (T - tP - 0.4) / 0.3); posePea(rival, { pos: V(P.x, 0, carS - 0.03), yaw: -0.3, mirror: true, T, vis: ro > 0.02, opacity: 0.7 * ro }); rival.root.scale.z = -0.08;
    cam(V(0.8, 1.9, carS - 3.4), V(4.1, 0.8, carS + 0.3), 40, T, 0.006); icon(true, 540, 1330, clamp((T - tV) / 0.25)); chip('🙈 RIVALE WEG', 540, 470, clamp((T - tV) / 0.3), '#2fbf5b');
  },
  // 9: Fliegt ins Gemüsebeet – frisst jedes Grünkohlblatt
  (T) => { const tF = WP(9, 'fliegt'), tE = WP(9, 'frisst'); const A = V(0.6, 0, -1.0), B = V(3.6, 0, -4.2); const k = clamp((T - tF) / 0.9); const P = arc(A, B, 1.4, ease(k)); if (k <= 0) P.copy(A); const fl = k > 0 && k < 1;
    const eatK = clamp((T - tE) / (S[9].end - tE + 0.2)); const peck = T > tE ? Math.max(0, Math.sin((T - tE) * 10)) : 0;
    posePea(pea, { pos: P, yaw: k < 1 ? Math.atan2(B.x - A.x, B.z - A.z) : 0, T, floor: fl ? P.y + 0.35 : 0, wings: k > 0 && k < 1 ? 1 : 0, flap: T * 16, head: V(0, lerp(1.06, 0.5, peck), lerp(0.3, 0.55, peck)), pitch: 0.9 * peck });
    let c = 0; G.kale.forEach((l, pi) => l.forEach((m, j) => { m.visible = (c++ / 90) >= eatK; }));
    cam(V(-0.4, 2.7, 1.4), V(3.2, 0.5, -3.8), 40, T, 0.006); icon(false, 540, 1330, clamp((T - WP(9, 'grünkohlblatt')) / 0.25)); chip('🥬 GRÜNKOHL WEG', 540, 470, clamp((T - WP(9, 'jedes')) / 0.3));
  },
  // 10: Netze über die Beete – eigener Haufen Grünzeug
  (T) => { const tN = WP(10, 'netze'), tW = WP(10, 'wirfst');
    G.bedNets.forEach((n, i) => { const k = back((T - tN + 0.2 - i * 0.2) / 0.5); n.visible = k > 0.01; n.scale.set(1, 1, 1.15 * k + 0.001); });
    G.pile.forEach(o => { o.m.visible = true; const k = clamp((T - tW - o.dl) / 0.5); o.m.scale.setScalar(k > 0 ? o.s : 0.0001); o.m.position.y = 0.03 + o.d * 0.1 + (1 - ease(k)) * o.h; o.m.rotation.x = -1.3 + (1 - k) * o.rx; });
    const w = clamp((T - tW - 0.5) / 1.0); const A = V(2.0, 0, -1.4), B = V(1.6, 0, -1.65); const P = A.clone().lerp(B, ease(w)); const peck = T > tW + 1.5 ? Math.max(0, Math.sin((T - tW) * 9)) : 0;
    posePea(pea, { pos: P, yaw: Math.PI + 0.3, walk: T * 7, stepK: w > 0 && w < 1 ? 1 : 0, T, head: V(0, lerp(1.06, 0.45, peck), lerp(0.3, 0.55, peck)), pitch: 0.9 * peck });
    cam(V(-0.9, 1.4, -1.2), V(1.7, 0.45, -2.1), 40, T, 0.006); chip('🥬 EIGENES FUTTER', 540, 470, clamp((T - WP(10, 'haufen')) / 0.3), '#2fbf5b'); icon(true, 540, 1330, clamp((T - WP(10, 'grünzeug')) / 0.25));
  },
  // 11: Spätsommer – alle Schwanzfedern fallen aus
  (T) => { mood('late'); const tF = WP(11, 'fallen'), tA = WP(11, 'aus'); const shed = clamp((T - tF) / (tA - tF + 0.3)); const P = V(-0.6, 0, 2.6), yaw = Math.PI / 2;
    posePea(pea, { pos: P, yaw, T, shed, head: V(0, lerp(1.06, 0.92, clamp((T - WP(11, 'denkst')) / 0.4)), 0.32), pitch: 0.3 * clamp((T - WP(11, 'denkst')) / 0.4) });
    fallenAt(V(P.x - 0.2, 0, P.z), yaw, Math.round(NF * shed), T); cam(V(-0.9, 1.15, 6.6), V(-0.9, 0.5, 2.6), 40, T, 0.004);
    chip('🍂 SPÄTSOMMER', 540, 470, clamp((T - WP(11, 'spätsommer')) / 0.3)); chip('🤒 KRANK?', 540, 1330, clamp((T - WP(11, 'krank')) / 0.3), '#e8483b');
  },
  // 12: Jedes Jahr – 200 Federn gratis – wächst bis zum Frühling nach
  (T) => { const tJ = WP(12, 'jahr'), tS = WP(12, 'sammelst'), tF = WP(12, 'frühling'); const P = V(-0.6, 0, 2.6), yaw = Math.PI / 2;
    if (T < tF - 0.3) { mood('late'); const kc = clamp((T - tS) / 1.6); fallenAt(V(P.x - 0.2, 0, P.z), yaw, Math.round(NF * (1 - kc)), T); vaseFill(Math.round(40 * kc));
      posePea(pea, { pos: P, yaw, T, shed: 1 }); cam(V(-2.0, 1.25, 5.6), V(-1.6, 0.5, 2.4), 40, T, 0.004);
      chip('📅 JEDES JAHR', 540, 470, clamp((T - tJ) / 0.3)); const tZ = WP(12, 'zweihundert'); chip(`🪶 ${Math.round(200 * ease((T - tZ) / 0.9))} FEDERN GRATIS`, 540, 1330, clamp((T - tZ + 0.1) / 0.3), '#2fbf5b'); }
    else { mood('day'); vaseFill(40); const g = ease((T - tF + 0.1) / 1.3); posePea(pea, { pos: P, yaw, T, shed: 1 - g, grow: lerp(0.35, 1, g) }); cam(V(-0.9, 1.15, 6.6), V(-0.9, 0.5, 2.6), 40, T, 0.004);
      chip('🌸 FRÜHLING', 540, 470, clamp((T - tF + 0.2) / 0.3), '#f06aa0'); }
  },
  // 13: Jeden Morgen schlägt er vor dem Springbrunnen sein Rad
  (T) => { mood('late'); const tR = WP(13, 'schlägt'); const w = ease((T - tR) / 0.8); const u = T - S[13].start;
    posePea(pea, { pos: V(0, 0, 2.6), yaw: 0, wheel: w, shake: w > 0.95 && T < tR + 1.6 ? 1 : 0, T }); cam(V(-1.2 + u * 0.3, 0.75, 6.6), V(0, 1.0, 2.4), 40, T, 0.004);
  },
  // 14: Glückwunsch – Pfauen-Paradies
  (T) => { const u = T - S[14].start; posePea(pea, { pos: V(0, 0, 2.6), yaw: 0, wheel: 1, T }); const a = 0.35 + u * 0.12;
    cam(V(Math.sin(a) * 9.5, lerp(7.5, 9.5, ease(u / 2.5)), Math.cos(a) * 9.5 + 0.5), V(0, 0.3, -0.8), 42, T, 0.004); cta.style.display = 'block';
  },
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
window.__ = { camera, LOOK, pea, rival, G, V, ui, svg, scene, posePea };
