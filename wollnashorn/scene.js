// "Wenn … du in der Eiszeit lebst" – komplett prozedurale 3D-Szene (Three.js)
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
// ---------- Wollnashorn: Eiszeit-Steppe, Schnee, Höhle, Eisblock ----------
const G = {}; const P0 = V(0, 0, 0);
const snowTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#eef3f7'; g.fillRect(0, 0, w, h); const r = rng(6);
  for (let k = 0; k < 2500; k++) { g.globalAlpha = 0.08 + r() * 0.12; g.fillStyle = ['#dce6ee', '#ffffff', '#cfdbe6', '#e8eef4'][(r() * 4) | 0]; g.beginPath(); g.ellipse(r() * w, r() * h, 3 + r() * 14, 2 + r() * 6, r() * 3, 0, 7); g.fill(); } g.globalAlpha = 1; });
snowTex.wrapS = snowTex.wrapT = THREE.RepeatWrapping; snowTex.repeat.set(160, 160); snowTex.colorSpace = THREE.SRGBColorSpace;
const groundGrass = ground.material.map; ground.material.map = snowTex; ground.material.color.set(0xffffff); ground.material.needsUpdate = true;
function groundMode(snow) { ground.material.map = snow ? snowTex : groundGrass; ground.material.needsUpdate = true; }
const ice = new THREE.Group(); scene.add(ice); const snowM = new THREE.MeshStandardMaterial({ color: 0xf2f6fa, map: snowTex, roughness: 0.9 });
{ const r = rng(3); for (let i = 0; i < 70; i++) { const a = r() * 6.28, d = 14 + r() * 120; const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), snowM); m.scale.set(2 + r() * 10, 0.5 + r() * 2.5, 2 + r() * 8); m.position.set(Math.cos(a) * d, -0.1, Math.sin(a) * d); m.receiveShadow = true; ice.add(m); }
  const hm = new THREE.MeshStandardMaterial({ color: 0xc6d2dc, roughness: 1 }); for (let i = 0; i < 18; i++) { const a = r() * 6.28, d = 280 + r() * 150; const m = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 7), hm); m.scale.set(60 + r() * 60, 40 + r() * 60, 60 + r() * 60); m.position.set(Math.cos(a) * d, 15, Math.sin(a) * d); ice.add(m); }
  // trockene Grashalme, die aus dem Schnee ragen
  const bl = new THREE.BufferGeometry(); bl.setAttribute('position', new THREE.Float32BufferAttribute([-0.008, 0, 0, 0.008, 0, 0, 0, 0.3, 0.04], 3)); bl.computeVertexNormals(); const N = 2500; const im = new THREE.InstancedMesh(bl, new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 1 }), N); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  for (let i = 0; i < N; i++) { const a = r() * 6.28, d = 2 + Math.sqrt(r()) * 25; m4.compose(V(Math.cos(a) * d, 0, Math.sin(a) * d), q.setFromEuler(new THREE.Euler((r() - 0.5) * 0.6, r() * 6, (r() - 0.5) * 0.6)), V(1, 0.6 + r() * 1.2, 1)); im.setMatrixAt(i, m4); c.setHSL(0.1 + r() * 0.04, 0.4, 0.35 + r() * 0.2); im.setColorAt(i, c); } ice.add(im); }
// Grasfleck unter dem Schnee + Schneedecke (wird freigeschoben)
G.GP = V(0.2, 0, 2.3); { const pm = new THREE.MeshStandardMaterial({ color: 0xb8a868, roughness: 0.95 }); G.patch = new THREE.Mesh(new THREE.CircleGeometry(1.4, 40), pm); G.patch.rotation.x = -Math.PI / 2; G.patch.position.set(G.GP.x, 0.012, G.GP.z); scene.add(G.patch);
  G.cover = new THREE.Mesh(new THREE.RingGeometry(0.001, 1.5, 48), new THREE.MeshStandardMaterial({ color: 0xf4f8fb, map: snowTex, roughness: 0.9 })); G.cover.rotation.x = -Math.PI / 2; G.cover.position.set(G.GP.x, 0.03, G.GP.z); scene.add(G.cover); }
function coverSet(k) { G.cover.geometry.dispose(); G.cover.geometry = new THREE.RingGeometry(Math.max(0.001, 1.3 * k), 1.5, 48); }
// Schneefall / Schneespritzer
{ const n = 5000, r = rng(9), a = new Float32Array(n * 3); for (let i = 0; i < n * 3; i++) a[i] = r(); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); G.snowP = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.05, map: dotTex, transparent: true, depthWrite: false })); G.snowR = a; scene.add(G.snowP); }
function snowfall(c, T, k, wind = 1) { G.snowP.visible = k > 0; if (k <= 0) return; const p = G.snowP.geometry.attributes.position.array, a = G.snowR; const n = Math.floor(a.length / 3 * k);
  for (let i = 0; i < a.length / 3; i++) { if (i > n) { p[i * 3 + 1] = -99; continue; } p[i * 3] = c.x - 5 + ((a[i * 3] * 10 + T * 2.5 * wind) % 10); p[i * 3 + 1] = 4 - ((a[i * 3 + 1] * 5 + T * 1.2) % 5); p[i * 3 + 2] = c.z - 5 + a[i * 3 + 2] * 10; } G.snowP.geometry.attributes.position.needsUpdate = true; }
{ const n = 400, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); G.spray = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.07, map: dotTex, transparent: true, depthWrite: false })); G.spray.userData.n = n; scene.add(G.spray); }
function spray(o, T, dir, k = 1) { G.spray.visible = k > 0; if (k <= 0) return; const a = G.spray.geometry.attributes.position.array, r = rng(4); for (let i = 0; i < G.spray.userData.n; i++) { const ph = (T * 2 + r()) % 1; const vx = dir.x * (0.6 + r()) + (r() - 0.5) * 0.6, vz = dir.z * (0.6 + r()) + (r() - 0.5) * 0.6, vy = 1 + r();
    a[i * 3] = o.x + vx * ph; a[i * 3 + 1] = Math.max(0.02, o.y + vy * ph - 3 * ph * ph); a[i * 3 + 2] = o.z + vz * ph; } G.spray.geometry.attributes.position.needsUpdate = true; }
// Sand-/Grieskörner (Zahn-Szene)
{ const n = 300, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); G.grit = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xc8a060, size: 0.018 })); G.grit.userData.n = n; scene.add(G.grit); }
// Auto (Größenvergleich)
G.car = new THREE.Group(); scene.add(G.car); { const cm = new THREE.MeshStandardMaterial({ color: 0xd8323a, roughness: 0.35, metalness: 0.3 }), gm = new THREE.MeshStandardMaterial({ color: 0x9ac8e8, roughness: 0.1, metalness: 0.5 }), wm = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });
  const b = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.6, 4.2), cm); b.position.y = 0.6; G.car.add(b); const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 2.2), gm); cab.position.set(0, 1.15, -0.2); G.car.add(cab);
  for (const [x, z] of [[-0.85, 1.35], [0.85, 1.35], [-0.85, -1.35], [0.85, -1.35]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.25, 18), wm); w.rotation.z = Math.PI / 2; w.position.set(x, 0.33, z); G.car.add(w); } G.car.traverse(o => o.castShadow = true); }
// Höhlenwand mit Malerei
G.CAVE = V(300, 0, 0); G.cave = new THREE.Group(); G.cave.position.copy(G.CAVE); scene.add(G.cave);
{ const wt = canvasTex(1024, 1024, (g, w, h) => { g.fillStyle = '#8a7058'; g.fillRect(0, 0, w, h); const r = rng(12); for (let k = 0; k < 4000; k++) { g.globalAlpha = 0.1 + r() * 0.15; g.fillStyle = ['#7a604a', '#9a8068', '#6a5240', '#a88e74'][(r() * 4) | 0]; g.beginPath(); g.ellipse(r() * w, r() * h, 4 + r() * 30, 3 + r() * 16, r() * 3, 0, 7); g.fill(); }
    g.globalAlpha = 0.9; g.lineCap = 'round'; g.lineJoin = 'round'; const draw = (ox, oy, s, col) => { g.save(); g.translate(ox, oy); g.scale(s, s); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 9;
      g.beginPath(); g.moveTo(-170, 10); g.bezierCurveTo(-160, -70, -60, -110, 40, -90); g.bezierCurveTo(90, -120, 120, -80, 130, -40); g.bezierCurveTo(170, -30, 200, 0, 205, 30); g.bezierCurveTo(190, 50, 150, 55, 120, 50); g.lineTo(110, 70); g.bezierCurveTo(40, 80, -100, 80, -170, 40); g.closePath(); g.globalAlpha = 0.35; g.fill(); g.globalAlpha = 0.9; g.stroke();
      g.beginPath(); g.moveTo(190, 20); g.quadraticCurveTo(250, -40, 265, -120); g.quadraticCurveTo(235, -40, 200, 0); g.fill(); g.beginPath(); g.moveTo(150, -30); g.quadraticCurveTo(170, -70, 168, -95); g.lineWidth = 8; g.stroke();
      for (const x of [-130, -80, 40, 90]) { g.beginPath(); g.moveTo(x, 60); g.lineTo(x + 5, 140); g.stroke(); } g.beginPath(); g.moveTo(-170, 10); g.lineTo(-200, 60); g.stroke(); g.restore(); };
    draw(512, 420, 1.3, '#2a1a12'); draw(330, 720, 0.7, '#9a3a1a'); draw(730, 760, 0.6, '#2a1a12'); g.globalAlpha = 1; });
  wt.colorSpace = THREE.SRGBColorSpace; const wall = new THREE.Mesh(new THREE.PlaneGeometry(6, 6, 60, 60), new THREE.MeshStandardMaterial({ map: wt, roughness: 1, bumpMap: scaleTex, bumpScale: 2 }));
  { const p = wall.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, (fbm(p.getX(i), p.getY(i), 1, 3) - 0.5) * 0.4); wall.geometry.computeVertexNormals(); } wall.position.set(0, 2, -1); G.cave.add(wall);
  G.torch = new THREE.PointLight(0xff9a4a, 30, 12, 1.2); G.torch.position.set(1.2, 1.6, 1.2); G.cave.add(G.torch); }
// Eisblock (Sibirien)
G.ICE = V(300, 0, 40); G.iceBox = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.2, 2.4), new THREE.MeshPhysicalMaterial({ color: 0xa8d8f0, roughness: 0.15, transparent: true, opacity: 0.45, clearcoat: 1, depthWrite: false })); G.iceBox.position.copy(G.ICE).add(V(0, 1.1, 0)); scene.add(G.iceBox);
const headW = q => { q.root.updateMatrixWorld(true); return q.head.getWorldPosition(V(0, 0, 0)); };
// ---------- Vierbeiner-Baukasten ----------
function makeQuad(o) { const q = { o, root: new THREE.Group() }; scene.add(q.root);
  q.bodyM = o.bodyMat; q.neckM = o.neckMat || o.bodyMat; q.mats = [o.bodyMat, q.neckM, o.legMat, o.headMat || o.bodyMat];
  q.body = new THREE.Group(); q.root.add(q.body);
  const bm = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 22), o.bodyMat); bm.scale.set(o.bodyW, o.bodyH, o.bodyL / 2); bm.castShadow = true; q.body.add(bm); q.bodyMesh = bm;
  if (o.belly) { const b = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), new THREE.MeshStandardMaterial({ color: o.belly, roughness: 0.85 })); b.scale.set(o.bodyW * 1.01, o.bodyH * 1.01, o.bodyL / 2 * 0.98); q.body.add(b); }
  // Beine
  q.legs = []; const seg = (o.legL + 0.3 * o.bodyH) / 2; q.seg = seg;
  for (const [sx, fz, front] of [[-1, 0.36, 1], [1, 0.36, 1], [-1, -0.36, 0], [1, -0.36, 0]]) { const hip = new THREE.Group(); hip.position.set(sx * o.bodyW * 0.55, -o.bodyH * 0.2, fz * o.bodyL); q.body.add(hip);
    const up = new THREE.Mesh(new THREE.CylinderGeometry(o.legR * 1.35, o.legR, seg, 10), o.legMat); up.position.y = -seg / 2; up.castShadow = true; hip.add(up);
    const knee = new THREE.Group(); knee.position.y = -seg; hip.add(knee); const lo = new THREE.Mesh(new THREE.CylinderGeometry(o.legR * 0.85, o.legR * 0.7, seg, 10), o.lowMat || o.legMat); lo.position.y = -seg / 2; lo.castShadow = true; knee.add(lo);
    const kn = new THREE.Mesh(new THREE.SphereGeometry(o.legR * 1.05, 10, 8), o.lowMat || o.legMat); knee.add(kn);
    let hoof; if (o.paw) { hoof = new THREE.Mesh(new THREE.SphereGeometry(o.legR * 1.5, 14, 10), o.lowMat || o.legMat); hoof.scale.set(1, 0.6, 1.35); hoof.position.set(0, -seg + o.legR * 0.3, o.legR * 0.5); knee.add(hoof);
      const padM = new THREE.MeshStandardMaterial({ color: 0x3a2a2a, roughness: 0.9 }); const pad = new THREE.Mesh(new THREE.SphereGeometry(o.legR * 0.7, 10, 8), padM); pad.scale.set(1.3, 0.35, 1); pad.position.set(0, -o.legR * 0.8, -0.1 * o.legR); hoof.add(pad);
      for (let k = 0; k < 4; k++) { const tp = new THREE.Mesh(new THREE.SphereGeometry(o.legR * 0.32, 8, 6), padM); tp.scale.y = 0.4; tp.position.set((k - 1.5) * o.legR * 0.5, -o.legR * 0.8, o.legR * 0.95); hoof.add(tp); }
      if (front) { const cg = new THREE.Group(); hoof.add(cg); for (let k = 0; k < 4; k++) { const c = new THREE.Mesh(new THREE.ConeGeometry(o.legR * 0.13, o.legR * 0.9, 6), new THREE.MeshStandardMaterial({ color: 0xf0ead8, roughness: 0.3 })); c.position.set((k - 1.5) * o.legR * 0.48, -o.legR * 0.2, o.legR * 1.25); c.rotation.x = 1.9; cg.add(c); } (q.claws = q.claws || []).push(cg); } }
    else { hoof = new THREE.Mesh(new THREE.CylinderGeometry(o.legR * 0.8, o.legR * 1.05, o.legR * 1.6, 10), new THREE.MeshStandardMaterial({ color: o.hoof || 0x2a2018, roughness: 0.6 })); hoof.position.y = -seg; knee.add(hoof); }
    q.legs.push({ hip, knee, sx, front, paw: hoof }); }
  // Schwanz
  { const c = new THREE.CatmullRomCurve3([V(0, 0.1, 0), V(0, -0.2, -0.1), V(0, -o.tailL, -0.12)]); const t = new THREE.Mesh(new THREE.TubeGeometry(c, 12, o.legR * 0.35, 6), o.legMat); const tg = new THREE.Group(); tg.position.set(0, o.bodyH * 0.35, -o.bodyL / 2 * 0.95); tg.add(t);
    const tuft = new THREE.Mesh(new THREE.SphereGeometry(o.legR * 1.1, 10, 8), new THREE.MeshStandardMaterial({ color: 0x1e1610, roughness: 1 })); tuft.position.set(0, -o.tailL, -0.12); tuft.scale.set(0.7, 1.8, 0.7); tg.add(tuft); q.body.add(tg); q.tail = tg; }
  // Hals (pro Frame neu)
  q.neck = new THREE.Mesh(new THREE.BufferGeometry(), q.neckM); q.neck.castShadow = true; q.body.add(q.neck);
  if (o.mane === 'giraffe') { q.maneM = new THREE.MeshStandardMaterial({ color: 0x5a3418, roughness: 1 }); q.maneMesh = new THREE.Mesh(new THREE.BufferGeometry(), q.maneM); q.body.add(q.maneMesh); }
  // Kopf
  q.head = new THREE.Group(); q.body.add(q.head); const hm = o.headMat || o.bodyMat;
  { const g = new THREE.SphereGeometry(1, 28, 18); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i); const t = clamp((z + 1) / 2); const s = 1 - o.snout * Math.pow(t, 1.3); p.setXYZ(i, p.getX(i) * s, p.getY(i) * s * (p.getY(i) < 0 ? 0.9 : 1), z); } g.computeVertexNormals();
    const m = new THREE.Mesh(g, hm); m.scale.set(o.headW, o.headH, o.headL / 2); m.position.z = o.headL * 0.35; m.castShadow = true; q.head.add(m); }
  const muz = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshStandardMaterial({ color: o.muzzle || 0x6a5038, roughness: 0.8 })); muz.scale.set(o.headW * 0.62, o.headH * 0.62, o.headL * 0.18); muz.position.set(0, -o.headH * 0.12, o.headL * 0.72); q.head.add(muz);
  q.eyes = []; for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(o.headH * 0.17, 12, 10), new THREE.MeshPhysicalMaterial({ color: 0x120c08, roughness: 0.05, clearcoat: 1 })); e.position.set(s * o.headW * 0.82, o.headH * 0.3, o.headL * 0.25); q.head.add(e); q.eyes.push(e);
    const ear = new THREE.Mesh(o.roundEar ? new THREE.SphereGeometry(o.headH * 0.32, 12, 8) : new THREE.ConeGeometry(o.headH * 0.28, o.headH * 0.9, 8), o.earMat || hm); ear.position.set(s * o.headW * (o.roundEar ? 0.7 : 0.95), o.headH * (o.roundEar ? 0.85 : 0.75), o.headL * 0.05); ear.rotation.set(-0.3, 0, o.roundEar ? -s * 0.3 : -s * 1.15); ear.scale.z = o.roundEar ? 0.35 : 0.5; q.head.add(ear); (q.ears = q.ears || []).push(ear); ear.userData.s = ear.scale.clone();
    if (o.earSpot) { const sp = new THREE.Mesh(new THREE.CircleGeometry(o.headH * 0.17, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x505050, roughness: 0.6, side: THREE.DoubleSide })); sp.position.set(0, 0.02 * o.headH, -1.02 * o.headH * 0.32 * 0.35 / 0.35 * 1.0); sp.rotation.y = Math.PI; ear.add(sp); sp.position.z = -o.headH * 0.33; (q.spots = q.spots || []).push(sp); }
    if (o.antlers) { const am = new THREE.MeshStandardMaterial({ color: 0x8a7458, roughness: 0.7 }); const main = new THREE.CatmullRomCurve3([V(0, 0, 0), V(s * 0.12, 0.25, -0.05), V(s * 0.2, 0.5, 0.02), V(s * 0.18, 0.7, 0.1)]); const ag = new THREE.Group(); ag.position.set(s * 0.05, o.headH * 0.85, o.headL * 0.02); q.head.add(ag); ag.add(new THREE.Mesh(new THREE.TubeGeometry(main, 16, 0.016, 6), am));
      for (const u of [0.3, 0.55, 0.8]) { const p = main.getPoint(u); ag.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([p, p.clone().add(V(s * 0.02, 0.1, 0.1)), p.clone().add(V(s * 0.01, 0.18, 0.15))]), 8, 0.01, 5), am)); } }
    if (o.ossi) { const os = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.2, 8), hm); os.position.set(s * 0.06, o.headH + 0.06, -o.headL * 0.02); os.rotation.set(-0.25, 0, -s * 0.15); q.head.add(os); const tip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshStandardMaterial({ color: 0x1e1610, roughness: 1 })); tip.position.set(0, 0.1, 0); os.add(tip); }
    if (o.horns) { const c = new THREE.CatmullRomCurve3([V(0, 0, 0), V(s * 0.05, 0.15, -0.08), V(s * 0.02, 0.32, -0.12), V(s * 0.07, 0.45, -0.04)]); const hr = new THREE.Mesh(new THREE.TubeGeometry(c, 16, 0.016, 6), new THREE.MeshStandardMaterial({ color: 0x2e2620, roughness: 0.6 })); hr.position.set(s * 0.05, o.headH * 0.8, o.headL * 0.05); q.head.add(hr); } }
  if (o.mane === 'lion') { const g = new THREE.IcosahedronGeometry(1, 3); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const v = V(p.getX(i), p.getY(i), p.getZ(i)); v.multiplyScalar(1 + 0.25 * fbm(v.x * 3, v.y * 3, v.z * 3, 2)); p.setXYZ(i, v.x, v.y, v.z); } g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x6a3e1c, roughness: 1, flatShading: true })); m.scale.set(o.headW * 1.9, o.headH * 1.9, o.headL * 0.55); m.position.set(0, 0.02, -o.headL * 0.02); m.castShadow = true; q.head.add(m); }
  // Röntgen: Herz, Ader, Blutstropfen, Ventile
  if (o.xray) { q.heart = new THREE.Group(); const hM = new THREE.MeshStandardMaterial({ color: 0xc8202c, emissive: 0x5a0008, roughness: 0.35 }); for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 14), hM); l.position.set(s * 0.09, 0.05, 0); q.heart.add(l); } const tip = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.3, 18), hM); tip.rotation.x = Math.PI; tip.position.y = -0.17; q.heart.add(tip);
    q.heart.position.set(0, -o.bodyH * 0.2, o.bodyL * 0.3); q.body.add(q.heart); q.vessel = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ color: 0xb01826, emissive: 0x400006, roughness: 0.4, transparent: true, opacity: 0.85 })); q.body.add(q.vessel);
    q.NB = 60; q.blood = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3040 }), q.NB); q.blood.frustumCulled = false; q.body.add(q.blood);
    q.valves = []; for (let k = 0; k < 5; k++) { const v = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.022, 8, 20), new THREE.MeshStandardMaterial({ color: 0xffd24a, emissive: 0x6a4a00, roughness: 0.3 })); q.body.add(v); q.valves.push(v); } }
  if (o.jaw) { q.jaw = new THREE.Group(); q.jaw.position.set(0, -o.headH * 0.35, o.headL * 0.3); q.head.add(q.jaw); const jw = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), o.lowMat || hm); jw.scale.set(o.headW * 0.6, o.headH * 0.22, o.headL * 0.34); jw.position.z = o.headL * 0.22; q.jaw.add(jw);
    const mo = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshStandardMaterial({ color: 0x5a1414, roughness: 0.6 })); mo.scale.set(o.headW * 0.5, o.headH * 0.3, o.headL * 0.3); mo.position.set(0, -o.headH * 0.3, o.headL * 0.5); q.head.add(mo); q.mouth = mo;
    const fm = new THREE.MeshStandardMaterial({ color: 0xf4eedc, roughness: 0.3 }); for (const s of [-1, 1]) { const f = new THREE.Mesh(new THREE.ConeGeometry(o.headW * 0.07, o.headH * 0.35, 6), fm); f.rotation.x = Math.PI; f.position.set(s * o.headW * 0.25, -o.headH * 0.35, o.headL * 0.68); q.head.add(f); } }
  if (o.hump) { q.hump = new THREE.Group(); q.hump.position.set(0, o.bodyH * 0.72, o.bodyL * (o.humpZ === undefined ? -0.04 : o.humpZ)); q.body.add(q.hump); const hm2 = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), o.bodyMat.clone()); hm2.scale.set(o.bodyW * 0.75, o.bodyH * 0.85, o.bodyL * 0.26); hm2.castShadow = true; q.hump.add(hm2); q.humpMesh = hm2;
    q.fat = new THREE.Mesh(new THREE.SphereGeometry(1, 22, 14), new THREE.MeshStandardMaterial({ color: 0xffd23a, emissive: 0x6a4a00, roughness: 0.4 })); q.fat.scale.set(o.bodyW * 0.6, o.bodyH * 0.7, o.bodyL * 0.21); q.fat.position.y = -o.bodyH * 0.05; q.hump.add(q.fat); }
  if (o.pads) { const pm = new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 0.95, bumpMap: scaleTex, bumpScale: 1.5 }); q.pads = [];
    const cp = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), pm); cp.scale.set(o.bodyW * 0.45, o.bodyH * 0.18, o.bodyL * 0.14); cp.position.set(0, -o.bodyH * 0.93, o.bodyL * 0.26); q.body.add(cp); q.pads.push(cp);
    q.legs.forEach(L => { const kp = new THREE.Mesh(new THREE.SphereGeometry(o.legR * 1.35, 12, 10), pm); kp.scale.z = 0.6; kp.position.z = (L.front ? 1 : -1) * o.legR * 0.9; L.knee.add(kp); q.pads.push(kp); }); }
  if (o.wideFoot) { q.feet = []; q.legs.forEach(L => { const f = new THREE.Group(); f.position.y = -q.seg - o.legR * 0.2; L.knee.add(f); const fm = new THREE.MeshStandardMaterial({ color: 0x9a7650, roughness: 0.9 });
      for (const s of [-1, 1]) { const toe = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), fm); toe.scale.set(o.legR * 1.05, o.legR * 0.45, o.legR * 1.9); toe.position.set(s * o.legR * 0.95, 0, o.legR * 0.7); f.add(toe); const nail = new THREE.Mesh(new THREE.SphereGeometry(o.legR * 0.3, 8, 6), new THREE.MeshStandardMaterial({ color: 0x2a2018 })); nail.position.set(s * o.legR * 0.95, o.legR * 0.15, o.legR * 2.4); f.add(nail); } q.feet.push(f); L.paw.visible = false; }); }
  if (o.lashes) { q.lashes = []; q.eyes.forEach((e, k) => { const s = k ? 1 : -1; const lg = new THREE.Group(); lg.position.copy(e.position).add(V(s * 0.005, o.headH * 0.13, 0)); q.head.add(lg); const lm = new THREE.MeshBasicMaterial({ color: 0x1a120c });
      for (let r = 0; r < 2; r++) for (let j = 0; j < 7; j++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.0035, 0.05 + r * 0.02, 4), lm); const a = (j / 6 - 0.5) * 1.4; c.position.set(s * 0.004, 0.006 * r, Math.sin(a) * o.headH * 0.17); c.rotation.set(-a * 0.8, 0, s * (0.9 + r * 0.25)); c.translateY(0.025); lg.add(c); } q.lashes.push(lg); });
    q.nostrils = [-1, 1].map(s => { const n = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: 0x140c08 })); n.scale.set(o.headW * 0.12, o.headH * 0.06, o.headH * 0.2); n.position.set(s * o.headW * 0.28, o.headH * 0.18, o.headL * 0.8); n.rotation.y = s * 0.5; q.head.add(n); return n; }); }
  if (o.rhino) { const hornM = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.6, bumpMap: scaleTex, bumpScale: 0.6 }); q.horn = new THREE.Group(); q.horn.position.set(0, o.headH * 0.55, o.headL * 0.62); q.head.add(q.horn);
    const hb = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.95, 16), hornM); hb.scale.set(0.38, 1, 1); hb.position.y = 0.45; q.horn.add(hb); q.horn.rotation.x = 0.55; q.hornMesh = hb;
    const h2 = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.28, 12), hornM); h2.position.set(0, o.headH * 0.75, o.headL * 0.25); h2.rotation.x = 0.3; q.head.add(h2); q.horn2 = h2;
    // Fellsträhnen
    const NS = 5200, r = rng(41); q.fur = new THREE.InstancedMesh(new THREE.ConeGeometry(0.014, 1, 4), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }), NS); q.fur.frustumCulled = false; q.furBase = []; const m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), c = new THREE.Color();
    for (let i = 0; i < NS; i++) { let n, p; const onHump = i % 4 === 0; const u = r() * 2 - 1, a = r() * 6.28; n = V(Math.sqrt(1 - u * u) * Math.cos(a), u, Math.sqrt(1 - u * u) * Math.sin(a));
      if (onHump) { if (n.y < 0) n.y = -n.y; p = V(n.x * o.bodyW * 0.75, n.y * o.bodyH * 0.85, n.z * o.bodyL * 0.26).add(V(0, o.bodyH * 0.72, o.bodyL * o.humpZ)); } else p = V(n.x * o.bodyW, n.y * o.bodyH, n.z * o.bodyL / 2);
      const dir = V(n.x, n.y, n.z * 0.4).normalize().multiplyScalar(0.35).add(V(0, -1, -0.15)).normalize(); qq.setFromUnitVectors(V(0, 1, 0), dir); const L = (0.07 + r() * 0.07) * (n.y < -0.3 ? 2.2 : n.y < 0.2 ? 1.4 : 1);
      m4.compose(p.clone().multiplyScalar(0.97).addScaledVector(dir, L * 0.45), qq, V(1, L, 1)); q.furBase.push({ p, dir, L, q: qq.clone() }); q.fur.setMatrixAt(i, m4); c.setHSL(0.07 + r() * 0.03, 0.45, 0.17 + r() * 0.14); q.fur.setColorAt(i, c); } q.body.add(q.fur);
    // Backenzähne (Röntgen)
    q.molars = new THREE.Group(); q.head.add(q.molars); q.mol = []; for (let k = 0; k < 5; k++) { const t = new THREE.Mesh(new THREE.BoxGeometry(o.headW * 0.5, 1, o.headL * 0.09), new THREE.MeshStandardMaterial({ color: 0xf6efdc, emissive: 0x3a3428, roughness: 0.4 })); t.position.set(0, -o.headH * 0.55, o.headL * (0.05 + k * 0.1)); q.molars.add(t); q.mol.push(t); } }
  q.tongue = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshPhysicalMaterial({ color: 0x2a2440, roughness: 0.35, clearcoat: 0.6 })); q.tongue.castShadow = true; scene.add(q.tongue);
  return q; }
// pose: neckP = Halswinkel über der Waagerechten, headP = Kopfneigung (+ = Nase runter), walk = Gangphase, splay 0..1, lie 0..1, crouch 0..1
function poseQ(q, { pos = V(0, 0, 0), yaw = 0, neckP = 1.0, neckY = 0, neckL = null, headP = 0.4, walk = 0, walkK = 0, splay = 0, lie = 0, crouch = 0, eyes = 1, xray = 0, flow = 0, flowSpeed = 1, valves = 0, tongue = null, vis = true, T = 0, tilt = null, scale = 1, roll = 0, claws = 1, jaw = 0, belly = 1, tailUp = 0, hump = 1, fat = 0, foot = 1, nose = 1, padGlow = 0, fur = 1, ear = 1, tailS = 1, horn = 1, teeth = 0, toothH = 1, frost = 0 } = {}) {
  const o = q.o; q.root.visible = vis; q.tongue.visible = false; if (!vis) return; q.root.position.copy(pos); q.root.rotation.set(0, yaw, roll, 'YXZ'); q.root.scale.setScalar(scale); if (q.ears) q.ears.forEach(e => e.scale.copy(e.userData.s).multiplyScalar(Math.max(0.01, ear))); if (q.tail) q.tail.scale.setScalar(Math.max(0.01, tailS));
  if (q.fur) { q.fur.visible = fur > 0.01; const m4 = new THREE.Matrix4(); q.furBase.forEach((f, i) => { const L = f.L * fur; m4.compose(f.p.clone().multiplyScalar(0.97).addScaledVector(f.dir, L * 0.45), f.q, V(1, Math.max(1e-3, L), 1)); q.fur.setMatrixAt(i, m4); }); q.fur.instanceMatrix.needsUpdate = true;
    const sc = new THREE.Color(0x8c8884).lerp(new THREE.Color(0x5e4024), fur).lerp(new THREE.Color(0xdfeaf2), frost); q.mats.forEach(m => m.color.copy(sc)); if (q.humpMesh) q.humpMesh.material.color.copy(sc);
    q.horn.scale.setScalar(Math.max(0.01, horn)); q.molars.visible = teeth > 0.01; q.mol.forEach(t => { t.scale.y = q.o.headH * 0.5 * toothH; t.position.y = -q.o.headH * 0.4 - q.o.headH * 0.25 * toothH + q.o.headH * 0.0; }); } if (q.hump) { q.hump.scale.set(1, Math.max(0.05, hump), 1); q.fat.visible = fat > 0.01; q.humpMesh.material.transparent = fat > 0; q.humpMesh.material.opacity = 1 - 0.7 * fat; q.humpMesh.material.depthWrite = fat < 0.5; q.humpMesh.material.needsUpdate = true; }
  if (q.feet) q.feet.forEach(f => f.scale.set(lerp(0.4, 1, foot), 1, lerp(0.55, 1, foot))); if (q.nostrils) q.nostrils.forEach(n => n.scale.y = q.o.headH * 0.06 * Math.max(0.08, nose)); if (q.pads) q.pads.forEach(p => { p.material.emissive.setRGB(padGlow * 0.6, padGlow * 0.35, 0); }); if (q.claws) q.claws.forEach(c => c.scale.setScalar(Math.max(1e-3, claws))); if (q.jaw) { q.jaw.rotation.x = jaw * 0.7; q.mouth.scale.y = Math.max(0.01, jaw) * q.o.headH * 0.3; } q.bodyMesh.scale.x = q.o.bodyW * belly; q.bodyMesh.scale.y = q.o.bodyH * lerp(1, belly, 0.6);
  const stand = o.legL + o.bodyH * 0.1; let by = lerp(stand, o.bodyH * 0.92, ease(lie)) - crouch * o.legL * 0.3 - splay * o.legL * 0.22; q.body.position.y = by;
  q.body.rotation.x = (tilt === null ? o.tilt : tilt) + splay * 0.12 + Math.sin(walk * 2) * 0.01 * walkK;
  q.legs.forEach(L => { const ph = walk + (L.sx < 0 ? 0 : Math.PI) + (L.front ? 0 : Math.PI * 0.15); let ux = Math.sin(ph) * 0.35 * walkK, kx = Math.max(0, Math.sin(ph + 1.2)) * 0.7 * walkK * (L.front ? -1 : 1), uz = 0;
    if (L.front) { uz = -L.sx * 0.42 * splay; ux += 0.08 * splay; } ux += crouch * (L.front ? 0.5 : -0.6); kx += crouch * (L.front ? -1.0 : 1.1);
    ux = lerp(ux, L.front ? -1.4 : 1.5, ease(lie)); kx = lerp(kx, L.front ? 2.9 : -2.8, ease(lie)); L.hip.rotation.set(ux, 0, uz); L.knee.rotation.set(kx, 0, 0); });
  if (q.tail) q.tail.rotation.set(0.1 + (q.o.tailX || 0) - tailUp + 0.08 * Math.sin(T * 2.3), 0, 0.12 * Math.sin(T * 1.7));
  // Hals
  const nl = neckL === null ? o.neckL : neckL; const B = V(0, o.bodyH * 0.45, o.bodyL * 0.4); const d = V(Math.sin(neckY) * Math.cos(neckP), Math.sin(neckP), Math.cos(neckY) * Math.cos(neckP)); const side = V(0, 1, 0).cross(d).normalize(); const nrm = d.clone().cross(side).normalize();
  const E = B.clone().addScaledVector(d, nl); const curve = new THREE.CatmullRomCurve3([B.clone().addScaledVector(d, -0.15), B.clone().addScaledVector(d, nl * 0.5).addScaledVector(nrm, nl * 0.04), E]);
  const mk = (rad0, rad1, off = 0) => { const g = new THREE.TubeGeometry(curve, 26, 1, 12, false); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = Math.floor(i / 13) / 26; const cp = curve.getPoint(k); const r = lerp(rad0, rad1, k); const v = V(p.getX(i) - cp.x, p.getY(i) - cp.y, p.getZ(i) - cp.z); p.setXYZ(i, cp.x + v.x * r + nrm.x * off, cp.y + v.y * r + nrm.y * off, cp.z + v.z * r + nrm.z * off); } g.computeVertexNormals(); return g; };
  q.neck.geometry.dispose(); q.neck.geometry = mk(o.neckR0, o.neckR1);
  if (q.maneMesh) { q.maneMesh.geometry.dispose(); q.maneMesh.geometry = mk(0.03, 0.025, (o.neckR0 + o.neckR1) * 0.45); }
  q.head.position.copy(E); q.head.rotation.set(headP, neckY, 0, 'YXZ'); q.neckCurve = curve; q.neckE = E;
  q.eyes.forEach(e => e.scale.set(1, clamp(eyes, 0.12, 1), 1));
  // Röntgen
  q.mats.forEach(m => { const tr = xray > 0; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } m.opacity = 1 - 0.75 * xray; m.depthWrite = xray < 0.5; });
  if (q.heart) { const show = xray > 0.01; q.heart.visible = q.vessel.visible = q.blood.visible = show; q.valves.forEach(v => v.visible = show && valves > 0);
    if (show) { q.heart.scale.setScalar(1 + 0.12 * Math.max(0, Math.sin(T * 7))); const vc = new THREE.CatmullRomCurve3([q.heart.position.clone(), B.clone().add(V(0, -0.05, -0.05)), ...curve.points.slice(1)]); q.vesselC = vc;
      q.vessel.geometry.dispose(); q.vessel.geometry = new THREE.TubeGeometry(vc, 40, 0.035, 8, false);
      const m4 = new THREE.Matrix4(), Z = new THREE.Matrix4().makeScale(0, 0, 0), qq = new THREE.Quaternion(); for (let i = 0; i < q.NB; i++) { if (flow <= 0) { q.blood.setMatrixAt(i, Z); continue; } let u = ((i / q.NB) + T * 0.25 * flowSpeed) % 1; if (u < 0) u += 1; m4.compose(vc.getPoint(u), qq, V(1, 1, 1).multiplyScalar(0.045 * clamp(flow))); q.blood.setMatrixAt(i, m4); } q.blood.instanceMatrix.needsUpdate = true;
      q.valves.forEach((v, k) => { const u = 0.45 + k * 0.11; v.position.copy(vc.getPoint(u)); v.quaternion.setFromUnitVectors(V(0, 0, 1), vc.getTangent(u)); v.scale.setScalar(back(clamp(valves * 5 - k * 0.6)) + 1e-3); }); } }
  // Zunge: {len 0..1, target (Welt), wrap 0..1, col}
  if (tongue && tongue.len > 0) { q.root.updateMatrixWorld(true); const m0 = q.head.localToWorld(V(0, -o.headH * 0.25, o.headL * 0.85)); const dir = q.head.localToWorld(V(0, -o.headH * 0.25, o.headL * 2)).sub(m0).normalize();
    const pts = [m0]; if (tongue.target) { const tg = tongue.target; const reach = m0.clone().lerp(tg, clamp(tongue.len)); pts.push(m0.clone().lerp(reach, 0.5).addScaledVector(dir, 0.04), reach); const w = clamp(tongue.wrap || 0); if (w > 0) { for (let k = 1; k <= 8; k++) { const a = k / 8 * Math.PI * 2 * 1.2 * w; pts.push(tg.clone().add(V(Math.sin(a) * 0.05, Math.cos(a) * 0.05 - 0.0, -k * 0.012 * w))); } } }
    else { pts.push(m0.clone().addScaledVector(dir, 0.12 * tongue.len), m0.clone().addScaledVector(dir, 0.3 * tongue.len).add(V(0, -0.04 * tongue.len, 0))); }
    const c = new THREE.CatmullRomCurve3(pts); q.tongue.geometry.dispose(); q.tongue.geometry = new THREE.TubeGeometry(c, 40, 0.03, 8, false); q.tongue.visible = true; q.tongue.material.color.set(tongue.col || 0x2a2440); }
}
const rhM = new THREE.MeshStandardMaterial({ color: 0x5e4024, roughness: 0.95, bumpMap: scaleTex, bumpScale: 1.2 }), rhL = new THREE.MeshStandardMaterial({ color: 0x5e4024, roughness: 0.95, bumpMap: scaleTex, bumpScale: 1.2 }), rhH = new THREE.MeshStandardMaterial({ color: 0x5e4024, roughness: 0.9, bumpMap: scaleTex, bumpScale: 0.8 });
const RH = { legL: 0.55, legR: 0.11, bodyL: 2.6, bodyW: 0.62, bodyH: 0.66, neckL: 0.35, neckR0: 0.42, neckR1: 0.3, headL: 0.75, headW: 0.24, headH: 0.26, snout: 0.22, tilt: 0.04, tailL: 0.35, hump: true, humpZ: 0.28, rhino: true,
  bodyMat: rhM, neckMat: rhM, legMat: rhL, lowMat: rhL, headMat: rhH, muzzle: 0x3a2e26, hoof: 0x2a2018 };
const rhino = makeQuad(RH);
const cl = new THREE.MeshStandardMaterial({ color: 0xc8aa7a, roughness: 0.85 }); const cavelion = makeQuad({ legL: 0.7, legR: 0.07, bodyL: 1.55, bodyW: 0.32, bodyH: 0.4, neckL: 0.32, neckR0: 0.2, neckR1: 0.17, headL: 0.42, headW: 0.17, headH: 0.18, snout: 0.25, tilt: 0, tailL: 0.75, bodyMat: cl, legMat: cl, lowMat: cl, muzzle: 0xe8d8b8, hoof: 0xb8884a });
const wm = new THREE.MeshStandardMaterial({ color: 0x7a7470, roughness: 0.9 }); const wolves = [0, 1, 2].map(() => makeQuad({ legL: 0.5, legR: 0.04, bodyL: 1.0, bodyW: 0.17, bodyH: 0.22, neckL: 0.25, neckR0: 0.12, neckR1: 0.1, headL: 0.3, headW: 0.1, headH: 0.1, snout: 0.45, tilt: 0.05, tailL: 0.45, bodyMat: wm, legMat: wm, lowMat: wm, muzzle: 0x2a2420, belly: 0xd8d0c4 }));
function mood(m) { const P = { snow: [0x9fb2c4, 0xe6ecf0, 0xfff4e6, 2.2, 1.7, 0xdfe6ec], blizzard: [0xb8c4ce, 0xdfe5ea, 0xf2f4f6, 1.2, 1.9, 0xd4dce2], warm: [0x7fb0de, 0xf2e6cf, 0xffe0b0, 3.2, 1.45, 0xd8e0c8], cave: [0x1a1410, 0x2a2018, 0xffa060, 0.3, 0.9, 0x1a1410], dusk: [0x7a86aa, 0xf0c4a8, 0xffc090, 2.2, 1.4, 0xe0d0c8] }[m];
  skyU.top.value.set(P[0]); skyU.hor.value.set(P[1]); sun.color.set(P[2]); sun.intensity = P[3]; hemi.intensity = P[4]; scene.fog.color.set(P[5]); }
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
function arrowDown(p, k, T) { if (k <= 0) return; const [x, y] = proj(p); const o = 12 * Math.sin(T * 6); svg.push(`<g transform="translate(${x},${y - 230 + o}) scale(${back(k)})"><path d="M-26 -90 H26 V0 H62 L0 80 L-62 0 H-26 Z" fill="#e8323c" stroke="#000" stroke-width="8"/></g>`); }
function camFix(pos, look, fov = 40) { LOOK = look.clone(); camera.position.copy(pos); camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(look); camera.updateMatrixWorld(true); }
const WP = (i, pre, n) => WT(i, pre, n);
const graze = (T, extra = {}) => poseQ(rhino, Object.assign({ pos: P0, yaw: 0, neckP: -0.45, headP: 0.75, T }, extra));
function grit(o, T, k) { G.grit.visible = k > 0; if (k <= 0) return; const a = G.grit.geometry.attributes.position.array, r = rng(2); for (let i = 0; i < G.grit.userData.n; i++) { const ph = (T * 0.8 + r()) % 1; a[i * 3] = o.x + (r() - 0.5) * 0.25; a[i * 3 + 1] = o.y + 0.25 - ph * 0.35; a[i * 3 + 2] = o.z + (r() - 0.5) * 0.4; } G.grit.geometry.attributes.position.needsUpdate = true; }

// ---------- Reset ----------
function resetWorld() { rex.root.visible = false; ui = []; svg = []; badge.style.display = 'none'; cta.style.display = 'none'; }
function stage(i, T) {
  mood('snow'); sunAt(V(0, 0, 0)); groundMode(true); ground.visible = sky.visible = true; world.visible = false; GRASS.visible = false; ice.visible = true; scene.background = null; scene.fog.near = 15; scene.fog.far = 140;
  G.patch.visible = G.cover.visible = i <= 1; coverSet(i === 0 ? 0 : 1); snowfall(P0, T, 0); spray(P0, T, V(0, 0, 0), 0); grit(P0, T, 0); G.car.visible = false; G.cave.visible = i === 11; G.iceBox.visible = false;
  [rhino, cavelion, ...wolves].forEach(q => poseQ(q, { vis: false }));
}
const shots = [
  // 0: Eiszeit – Futter monatelang unter dicker Schneedecke
  (T) => { badge.style.display = T < 2.4 ? 'block' : 'none'; mood('blizzard'); scene.fog.near = 4; scene.fog.far = 45; snowfall(P0, T, 1, 1.5); const tS = WP(0, 'schneedecke');
    poseQ(rhino, { pos: V(lerp(-1.2, 0, ease(T / 4.5)), 0, 0), yaw: 0.2, neckP: -0.35, headP: 0.6, walk: T * 2.5, walkK: 1 - clamp(T / 4.5), horn: 0.3, T });
    camFix(V(4.2 - T * 0.1, 1.9, 6.4), V(0.2, 0.9, 1.0), 44); ring(G.GP.clone().add(V(0, 0.05, 0)), clamp((T - WP(0, 'futter')) / 0.3), '#e8323c', 120); label3('GRAS', G.GP, clamp((T - WP(0, 'futter')) / 0.3), 160, 220);
    chip('❄️ EISZEIT', 540, 470, clamp((T - 0.1) / 0.25), '#7fc4ff'); icon(false, 540, 1340, clamp((T - tS) / 0.25)); },
  // 1: Riesiges flaches Horn – Schnee zur Seite schieben
  (T) => { const tH = WP(1, 'horn'), tSch = WP(1, 'schnee'); const h = lerp(0.3, 1, ease(clamp((T - WP(1, 'riesiges')) / 1.0))); const sw = T > tSch - 0.3; const ny = sw ? Math.sin((T - tSch) * 4.5) * 0.45 : 0;
    graze(T, { horn: h, neckY: ny }); coverSet(sw ? ease(clamp((T - tSch + 0.3) / 2.0)) : 0); if (sw) { rhino.root.updateMatrixWorld(true); const hp = rhino.horn.getWorldPosition(V(0, 0, 0)); spray(V(hp.x, 0.05, hp.z), T, V(Math.sign(Math.cos((T - tSch) * 4.5)) || 1, 0, 0.3), 1); }
    camFix(V(3.4, 1.4, 5.0), V(0.2, 0.6, 1.6), 42); rhino.root.updateMatrixWorld(true); label3('FLACHES HORN', rhino.hornMesh.getWorldPosition(V(0, 0, 0)), clamp((T - tH) / 0.3), -150, -260);
    chip('🦏 SCHNEESCHIEBER', 540, 470, clamp((T - tSch) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - WP(1, 'schiebst')) / 0.25)); },
  // 2: Minus 30 Grad – Haut und Ohren frieren fast ab
  (T) => { mood('blizzard'); scene.fog.near = 4; scene.fog.far = 45; snowfall(P0, T, 1, 1.5); const fr = ease(clamp((T - WP(2, 'frieren')) / 1.2));
    poseQ(rhino, { pos: P0, yaw: 0.5, neckP: -0.1, headP: 0.35, fur: 0, ear: 2.4, tailS: 1.8, frost: 0.6 * fr, T }); camFix(V(3.6, 1.6, 4.6), V(0.4, 1.0, 0.4), 42);
    rhino.root.updateMatrixWorld(true); rhino.ears.forEach((e, k) => ring(e.getWorldPosition(V(0, 0, 0)), clamp((T - WP(2, 'ohren') - k * 0.1) / 0.3), '#7fc4ff', 50));
    chip('🥶 −30 °C', 540, 470, clamp((T - WP(2, 'minus')) / 0.3), '#7fc4ff'); icon(false, 540, 1340, clamp((T - WP(2, 'ab', 1)) / 0.25)); },
  // 3: Dichtes langes Fell – Ohren und Schwanz bleiben klein
  (T) => { mood('blizzard'); scene.fog.near = 4; scene.fog.far = 45; snowfall(P0, T, 1, 1.5); const f = ease(clamp((T - WP(3, 'dichtes') + 0.2) / 1.2)); const sm = ease(clamp((T - WP(3, 'ohren')) / 1.0));
    poseQ(rhino, { pos: P0, yaw: 0.5, neckP: -0.1, headP: 0.35, fur: f, ear: lerp(2.4, 0.8, sm), tailS: lerp(1.8, 0.6, sm), T }); camFix(V(3.6, 1.6, 4.6), V(0.4, 1.0, 0.4), 42);
    label3('KLEINE OHREN', rhino.ears[1].getWorldPosition(V(0, 0, 0)), clamp((T - WP(3, 'ohren') - 0.3) / 0.3), -100, -240);
    chip('🧥 LANGES FELL', 540, 470, clamp((T - WP(3, 'fell')) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - WP(3, 'klein')) / 0.25)); },
  // 4: Gefrorenes Steppengras voller Sand – schleift die Zähne ab
  (T) => { const tS = WP(4, 'sand'), tZ = WP(4, 'zähne'); graze(T, { xray: 0.75, teeth: 1, toothH: lerp(0.6, 0.12, ease(clamp((T - tZ + 0.3) / 1.3))), headP: 0.7 + 0.05 * Math.sin(T * 9) });
    const hw = headW(rhino); camFix(hw.clone().add(V(3.0, 0.35, 0.3)), hw.clone().add(V(0, -0.15, 0.3)), 38); grit(hw.clone().add(V(0, -0.2, 0.3)), T, clamp((T - tS) / 0.3));
    label3('ZÄHNE', rhino.mol[2].getWorldPosition(V(0, 0, 0)), clamp((T - tZ) / 0.3), 180, 260); chip('🪨 SAND IM GRAS', 540, 470, clamp((T - tS) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - WP(4, 'ab', 1)) / 0.25)); },
  // 5: Backenzähne extra hoch – immer genug zum Mahlen
  (T) => { const tB = WP(5, 'backenzähne'); graze(T, { xray: 0.75, teeth: 1, toothH: lerp(0.12, 1.5, ease(clamp((T - tB) / 1.2))), headP: 0.7 + 0.05 * Math.sin(T * 9) });
    const hw = headW(rhino); camFix(hw.clone().add(V(3.0, 0.35, 0.3)), hw.clone().add(V(0, -0.15, 0.3)), 38); grit(hw.clone().add(V(0, -0.2, 0.3)), T, 1);
    label3('HOHE ZÄHNE', rhino.mol[2].getWorldPosition(V(0, 0, 0)), clamp((T - WP(5, 'hoch')) / 0.3), 180, 260); chip('🦷 EXTRA HOCH', 540, 470, clamp((T - WP(5, 'hoch')) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - WP(5, 'übrig')) / 0.25)); },
  // 6: Der schwere Kopf hängt den ganzen Tag am Boden
  (T) => { const tK = WP(6, 'kopf'); graze(T, { hump: 0.15, neckP: -0.6 - 0.05 * Math.sin(T * 2), headP: 0.8 }); camFix(V(1.4, 1.3, 6.2), V(0.6, 0.8, 0.4), 42);
    arrowDown(headW(rhino), clamp((T - tK) / 0.3), T); chip('🏋️ SCHWERER KOPF', 540, 470, clamp((T - WP(6, 'schwerer')) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - WP(6, 'boden')) / 0.25)); },
  // 7: Dicker Muskelbuckel im Nacken trägt ihn mühelos
  (T) => { const tM = WP(7, 'muskelbuckel'); const h = ease(clamp((T - tM + 0.3) / 1.0)); graze(T, { hump: lerp(0.15, 1.15, h) }); camFix(V(1.4, 1.3, 6.2), V(0.6, 0.8, 0.4), 42);
    rhino.root.updateMatrixWorld(true); const hp = rhino.hump.getWorldPosition(V(0, 0, 0)).add(V(0, 0.4, 0)); ring(hp, clamp((T - tM) / 0.3), '#2fbf5b', 120); label3('MUSKELBUCKEL', hp, clamp((T - tM) / 0.3), 140, -230);
    chip('💪 MUSKELBUCKEL', 540, 470, clamp((T - tM) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - WP(7, 'trägt')) / 0.25)); },
  // 8: Höhlenlöwen und Wolfsrudel lauern
  (T) => { const t0 = S[8].start; const k = ease(clamp((T - t0) / 3.2)); graze(T, { neckP: -0.1, headP: 0.3, neckY: 0.4 });
    poseQ(cavelion, { pos: V(lerp(-3.0, -1.2, k), 0, lerp(4.2, 3.4, k)), yaw: 1.9, walk: T * 3.5, walkK: 0.6, crouch: 0.6, neckP: 0.1, headP: 0, T });
    wolves.forEach((w, j) => poseQ(w, { pos: V(lerp(2.6, 0.9, k) + j * 0.45, 0, lerp(4.2, 3.2, k) + j * 0.6), yaw: -2.0 - j * 0.15, walk: T * 6 + j, walkK: 0.9, neckP: 0.1, headP: 0.1, T }));
    camFix(V(-0.2, 2.4, 8.5), V(-0.3, 0.6, 1.8), 50); label3('HÖHLENLÖWE', headW(cavelion), clamp((T - WP(8, 'höhlenlöwen')) / 0.3), 0, -200); label3('WÖLFE', headW(wolves[0]), clamp((T - WP(8, 'wolfsrudel')) / 0.3), 0, -200);
    chip('⚠️ RAUBTIERE', 540, 470, clamp((T - WP(8, 'höhlenlöwen')) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - WP(8, 'tier')) / 0.25)); },
  // 9: So groß wie ein Auto, fast so schwer wie zwei – Horn als Waffe
  (T) => { const tA = WP(9, 'auto'), tH = WP(9, 'horn'); const charge = ease(clamp((T - tH + 0.2) / 0.9)); G.car.visible = T < tH - 0.1; G.car.position.set(-2.4, 0, 0.2); G.car.scale.setScalar(back(clamp((T - tA + 0.3) / 0.4)) + 1e-3);
    poseQ(rhino, { pos: V(lerp(0.4, -1.4, charge), 0, lerp(0, 1.2, charge)), yaw: lerp(0, -0.9, charge), neckP: lerp(-0.1, -0.35, charge), headP: 0.5, walk: T * 7, walkK: charge > 0 && charge < 1 ? 1 : 0, T });
    const lk = clamp((T - tH - 0.2) / 1.0); poseQ(cavelion, { pos: V(lerp(-3.4, -5.5, ease(lk)), 0, lerp(2.4, 3.8, ease(lk))), yaw: lk > 0 ? -1.2 + Math.PI : 1.9, walk: T * 9, walkK: lk > 0 ? 1 : 0, neckP: 0.1, headP: 0, T, vis: T > tH - 0.6 });
    camFix(V(0.6, 2.0, 8.6), V(-0.8, 0.9, 0.6), 46); chip(T < WP(9, 'schwer') ? '🚗 SO GROSS WIE EIN AUTO' : T < tH ? '⚖️ FAST 2 AUTOS SCHWER' : '⚔️ HORN = WAFFE', 540, 470, clamp((T - tA + 0.2) / 0.3), '#f3c63f'); icon(true, 540, 1340, clamp((T - WP(9, 'waffe')) / 0.25)); },
  // 10: Ende der Eiszeit – es wird warm, die Grassteppe verschwindet
  (T) => { const tW = WP(10, 'warm'), tV = WP(10, 'verschwindet'); const w = T > tW - 0.2; if (w) { mood('warm'); groundMode(false); ice.visible = false; world.visible = true; GRASS.visible = true; }
    poseQ(rhino, { pos: P0, yaw: 0.6, neckP: 0.0, headP: 0.3, neckY: Math.sin(T * 1.5) * 0.4, T }); camFix(V(3.8, 1.8, 5.6), V(0.2, 1.0, 0.0), 44);
    chip(w ? '🌲 WALD STATT STEPPE' : '🌡️ ES WIRD WARM', 540, 470, clamp((T - WP(10, 'eiszeit')) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - tV) / 0.25)); },
  // 11: Heute nur noch aus Höhlenmalereien und dem gefrorenen Boden Sibiriens
  (T) => { const tM = WP(11, 'höhlenmalereien'), tG = WP(11, 'gefrorenen'); const second = T > tG - 0.2;
    if (!second) { mood('cave'); scene.background = new THREE.Color(0x0e0a08); sky.visible = ground.visible = false; ice.visible = false; G.torch.intensity = 30 + 5 * Math.sin(T * 13) + 3 * Math.sin(T * 7.3);
      camFix(G.CAVE.clone().add(V(0.3 - (T - S[11].start) * 0.08, 2.0, 3.2)), G.CAVE.clone().add(V(0, 2.1, -1)), 46); chip('🎨 HÖHLENMALEREI', 540, 470, clamp((T - tM) / 0.3), '#f3c63f'); }
    else { mood('snow'); G.cave.visible = false; G.iceBox.visible = true; poseQ(rhino, { pos: G.ICE.clone().add(V(0, 0.15, 0)), yaw: Math.PI / 2, lie: 1, neckP: -0.1, headP: 0.3, frost: 0.55, eyes: 0, T });
      camFix(G.ICE.clone().add(V(0.8, 1.6, 5.4)), G.ICE.clone().add(V(0, 0.9, 0)), 44); chip('🧊 SIBIRIEN', 540, 470, clamp((T - tG) / 0.3), '#7fc4ff'); } },
  // 12: Glückwunsch – Wollnashorn
  (T) => { mood('dusk'); const u = T - S[12].start; snowfall(P0, T, 0.6, 1); graze(T, { neckY: Math.sin(T * 2) * 0.3 }); coverSet(1); const a = 0.5 + u * 0.14;
    cam(V(Math.sin(a) * 6.5, lerp(1.6, 2.3, ease(u / 3)), Math.cos(a) * 6.5), V(0, 0.9, 0.3), 44, T, 0.004); cta.style.display = T > WP(12, 'gebaut') ? 'block' : 'none';
    chip('🦏 WOLLNASHORN', 540, 470, clamp((T - WP(12, 'wollnashorn')) / 0.3), '#f3c63f'); },
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
window.__ = { camera, LOOK, rhino, G, V, ui, svg, scene, poseQ };
