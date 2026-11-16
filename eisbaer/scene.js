// "Was wäre, wenn ein Braunbär in die Arktis zieht" – komplett prozedurale 3D-Szene
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
// Startzeit eines Wortes (Präfix-Suche) in Satz i
function WT(i, pre, n = 0) {
  const ws = S[i].words; let c = 0;
  for (const w of ws) if (w.w.toLowerCase().replace(/[^a-zäöüß0-9]/g, '').startsWith(pre.toLowerCase())) { if (c++ === n) return w.s; }
  console.warn('word not found', i, pre); return S[i].start;
}

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Number(new URLSearchParams(location.search).get("pr") || 0.6)); renderer.setSize(W, H);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.localClippingEnabled = true;
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, W / H, 0.05, 900);

// ---------- Licht ----------
const hemi = new THREE.HemisphereLight(0xdbe9ff, 0x9fb2c8, 1.5); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff4e2, 2.6);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 80 });
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);
function sunAt(p) { sun.position.copy(p).add(V(-12, 22, 14)); sun.target.position.copy(p); }

// ---------- Texturen ----------
function canvasTex(w, h, draw, rep) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); } return t;
}
const snowTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#eef3f8'; g.fillRect(0, 0, w, h); const r = rng(3);
  for (let i = 0; i < 2600; i++) { const v = 220 + r() * 35 | 0; g.fillStyle = `rgba(${v - 12},${v - 4},${v},0.35)`; g.beginPath(); g.ellipse(r() * w, r() * h, 2 + r() * 14, 1 + r() * 5, 0.3, 0, 7); g.fill(); }
  for (let i = 0; i < 60; i++) { g.strokeStyle = 'rgba(170,190,215,0.18)'; g.lineWidth = 2 + r() * 4; g.beginPath(); const y = r() * h; g.moveTo(0, y); g.bezierCurveTo(w * .3, y + r() * 40 - 20, w * .6, y + r() * 40 - 20, w, y); g.stroke(); }
}, 60);
const bumpTex = canvasTex(256, 256, (g, w, h) => { const r = rng(9); g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { const v = 90 + r() * 90 | 0; g.fillStyle = `rgba(${v},${v},${v},0.4)`; g.beginPath(); g.arc(r() * w, r() * h, 2 + r() * 10, 0, 7); g.fill(); } }, 80);
const dotTex = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });

// ---------- Himmel / Boden ----------
const skyU = { top: { value: new THREE.Color(0x7fa7d1) }, hor: { value: new THREE.Color(0xe4ecf4) } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
  vertexShader: 'varying vec3 p; void main(){p=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: 'uniform vec3 top,hor; varying vec3 p; void main(){float h=clamp(normalize(p).y*2.2,0.,1.); gl_FragColor=vec4(mix(hor,top,pow(h,0.7)),1.);}'
}));
scene.add(sky);
scene.fog = new THREE.FogExp2(0xe4ecf4, 0.012);

const groundClip = new THREE.Plane(V(0, 0, -1), 0); // aktiv nur im Schnee-Querschnitt
const groundMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: snowTex, bumpMap: bumpTex, bumpScale: 1.2, roughness: 0.92 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900, 1, 1), groundMat);
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const lowGround = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x5d7f9f, roughness: 0.25 }));
lowGround.rotation.x = -Math.PI / 2; lowGround.position.set(-80, -2.6, 0); lowGround.receiveShadow = true; lowGround.visible = false; scene.add(lowGround);

// Eisberge / Presseisrücken am Horizont
const world = new THREE.Group(); scene.add(world);
{
  const r = rng(42); const mat = new THREE.MeshStandardMaterial({ color: 0xe9f3fb, roughness: 0.6, flatShading: true });
  const mat2 = new THREE.MeshStandardMaterial({ color: 0xbfd9ee, roughness: 0.4, flatShading: true });
  for (let i = 0; i < 70; i++) {
    const g = new THREE.IcosahedronGeometry(1, 1); const p = g.attributes.position;
    for (let j = 0; j < p.count; j++) p.setXYZ(j, p.getX(j) * (0.8 + r() * 0.4), Math.max(p.getY(j), -0.2) * (0.8 + r() * 0.5), p.getZ(j) * (0.8 + r() * 0.4));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, r() < 0.3 ? mat2 : mat); const a = r() * Math.PI * 2, d = 70 + r() * 160;
    const s = 2 + r() * 9; m.scale.set(s * (1 + r()), s * (0.4 + r() * 0.8), s); m.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); m.rotation.y = r() * 6;
    world.add(m);
  }
  // kleine Schneehügel / Eisbrocken nah
  for (let i = 0; i < 120; i++) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4 + r() * 0.8, 0), mat); m.position.set((r() - .5) * 200, -0.15, (r() - .5) * 200);
    if (Math.abs(m.position.x) < 6 && Math.abs(m.position.z) < 8) continue; m.scale.y = 0.4; m.receiveShadow = m.castShadow = true; world.add(m);
  }
}
// Atemloch / offenes Wasser für die Robbe
const waterMat = new THREE.MeshStandardMaterial({ color: 0x0e2f4a, roughness: 0.08, metalness: 0.2 });
const hole = new THREE.Mesh(new THREE.CircleGeometry(1.5, 48), waterMat); hole.rotation.x = -Math.PI / 2; hole.position.set(0.5, 0.015, -58); scene.add(hole);
const holeRim = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.18, 8, 40), new THREE.MeshStandardMaterial({ color: 0xd6e6f3, roughness: 0.4 }));
holeRim.rotation.x = -Math.PI / 2; holeRim.scale.z = 0.5; holeRim.position.copy(hole.position); scene.add(holeRim);

// dünnes Eis (Szene 8/9)
const THIN = V(40, 0, 0);
const thinIce = new THREE.Mesh(new THREE.CircleGeometry(9, 64), new THREE.MeshStandardMaterial({ color: 0x5f88a8, roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.92 }));
thinIce.rotation.x = -Math.PI / 2; thinIce.position.copy(THIN).setY(0.01); thinIce.receiveShadow = true; scene.add(thinIce);
const crackGroup = new THREE.Group(); scene.add(crackGroup);
const cracks = [];
{
  const r = rng(77); const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 });
  const mat2 = new THREE.MeshBasicMaterial({ color: 0x0b2236 });
  function branch(x, z, ang, len, t0, depth) {
    let px = x, pz = z; const n = 6;
    for (let i = 0; i < n; i++) {
      ang += (r() - .5) * 0.7; const l = len / n; const nx = px + Math.cos(ang) * l, nz = pz + Math.sin(ang) * l;
      const wdt = 0.05 * (1 - i / n) + 0.015;
      for (const [m, w, y] of [[mat, wdt * 2.2, 0.02], [mat2, wdt, 0.025]]) {
        const s = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m); s.rotation.x = -Math.PI / 2;
        s.position.set((px + nx) / 2, y, (pz + nz) / 2); s.rotation.z = -Math.atan2(nz - pz, nx - px); s.userData = { len: l, w, t: t0 + i / n * 0.5 * len / 3 };
        s.scale.set(l, w, 1); crackGroup.add(s); cracks.push(s);
      }
      if (depth < 2 && r() < 0.35) branch(nx, nz, ang + (r() < .5 ? 1 : -1) * (0.6 + r() * .6), len * 0.5, t0 + i / n * 0.5 * len / 3, depth + 1);
      px = nx; pz = nz;
    }
  }
  for (let k = 0; k < 9; k++) branch(0, 0, k / 9 * Math.PI * 2 + r() * 0.5, 2.5 + r() * 2.5, 0, 0);
}

// ---------- Fell-Shader (Shell-Texturing) ----------
const furU = {
  uColA: { value: new THREE.Color(0x5a3a22) }, uColB: { value: new THREE.Color(0xf4efe2) },
  uWipe: { value: -99 }, uSkin: { value: new THREE.Color(0x3b2a20) },
  uHoleC: { value: V(0, -99, 0) }, uHoleR: { value: 0 }, uGlow: { value: 0 },
};
const SHELLS = 14;
const furMats = [];
for (let k = 0; k <= SHELLS; k++) {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.95, color: 0xffffff });
  m.userData.k = k;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, furU, { uK: { value: k / SHELLS }, uLen: { value: 1 } });
    m.userData.sh = sh;
    sh.vertexShader = 'uniform float uK; uniform float uLen; uniform float uFurLen; varying vec2 vFuv; varying vec3 vWPos;\n' + sh.vertexShader
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed += normal * uK * 0.075 * uLen; transformed.y -= uK*uK*0.012*uLen; vFuv = uv;')
      .replace('#include <project_vertex>', '#include <project_vertex>\n vWPos = (modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader = `uniform float uK, uWipe, uHoleR, uGlow; uniform vec3 uColA, uColB, uSkin, uHoleC; varying vec2 vFuv; varying vec3 vWPos;
      float hsh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\n` + sh.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );', `
      vec2 g = vFuv*vec2(260.,130.); vec2 c = floor(g); vec2 f = fract(g)-0.5;
      float h = hsh(c); float h2 = hsh(c+7.3);
      float dh = distance(vWPos, uHoleC);
      float inHole = 1.0 - smoothstep(uHoleR*0.85, uHoleR*1.15+0.0001, dh);
      if (uK > 0.0) {
        if (length(f) > (1.0-uK)*0.55 + 0.05 || h < uK*0.95) discard;
        if (dh < uHoleR*(1.0+uK*0.6)) discard;
      }
      float wipe = smoothstep(uWipe-0.08, uWipe+0.08, vWPos.z);
      vec3 col = mix(uColA, uColB, wipe) * (0.82 + 0.3*h2);
      col *= mix(0.45, 1.08, uK);
      if (uK == 0.0) col = mix(col, uSkin, inHole);
      col += vec3(1.0,0.95,0.7) * uGlow * exp(-pow((vWPos.z-uWipe)*6.0,2.0)) * 1.5;
      vec4 diffuseColor = vec4(col, 1.0);`);
  };
  m.customProgramCacheKey = () => 'fur' + k;
  furMats.push(m);
}
function outlineMat(color) {
  const u = { uO: { value: 0.12 }, uA: { value: 0 } };
  const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide, transparent: true, depthWrite: false });
  m.onBeforeCompile = sh => { sh.uniforms.uO = u.uO; sh.uniforms.uA = u.uA; sh.vertexShader = 'uniform float uO;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed += normal*uO;');
    sh.fragmentShader = 'uniform float uA;\n' + sh.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( diffuse, uA );'); };
  m.userData.u = u; return m;
}
function furMesh(geo, parent, len = 1, outline) {
  const grp = new THREE.Group(); parent.add(grp);
  for (let k = 0; k <= SHELLS; k++) {
    const m = new THREE.Mesh(geo, furMats[k]); if (k === 0) { m.castShadow = true; m.receiveShadow = true; }
    m.onBeforeRender = () => { const sh = furMats[k].userData.sh; if (sh) sh.uniforms.uLen.value = len; };
    grp.add(m);
  }
  if (outline) grp.add(new THREE.Mesh(geo, outline));
  return grp;
}
function ell(rx, ry, rz, seg = 40) { const g = new THREE.SphereGeometry(1, seg, seg * 0.75 | 0); g.scale(rx, ry, rz); return g; }
function caps(r, l) { const g = new THREE.CapsuleGeometry(r, l, 10, 24); g.translate(0, -l / 2, 0); return g; }

// ---------- Bär ----------
function makeBear() {
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  const ol = outlineMat(0xfff3b0); ol.userData.u.uO.value = 0.11;
  const dark = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.35 });
  furMesh(ell(0.62, 0.6, 1.05), body, 1, ol).position.set(0, 1.05, -0.05);
  furMesh(ell(0.58, 0.58, 0.6), body, 1, ol).position.set(0, 1.0, -0.62);
  const chest = furMesh(ell(0.56, 0.64, 0.6), body, 1, ol); chest.position.set(0, 1.12, 0.5);
  const hump = furMesh(ell(0.36, 0.3, 0.4), body, 1, ol); hump.position.set(0, 1.55, 0.45);
  const neckG = new THREE.Group(); neckG.position.set(0, 1.2, 0.85); body.add(neckG);
  const neck = furMesh(ell(0.36, 0.38, 0.5), neckG, 1, ol); neck.position.set(0, 0.04, 0.25); neck.rotation.x = -0.25;
  const headG = new THREE.Group(); headG.position.set(0, 0.1, 0.62); neckG.add(headG);
  furMesh(ell(0.3, 0.27, 0.34), headG, 0.8, ol);
  const snout = furMesh(ell(0.16, 0.14, 0.24), headG, 0.4, ol); snout.position.set(0, -0.06, 0.3);
  const nose = new THREE.Mesh(ell(0.075, 0.055, 0.05, 16), dark); nose.position.set(0, -0.0, 0.53); headG.add(nose);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.034, 12, 8), dark); eye.position.set(0.13 * s, 0.08, 0.22); headG.add(eye);
    const ear = furMesh(ell(0.085, 0.085, 0.045, 16), headG, 0.4, ol); ear.position.set(0.19 * s, 0.22, 0.02);
  }
  furMesh(ell(0.1, 0.1, 0.1, 16), body, 0.7, ol).position.set(0, 1.1, -1.2);
  const legs = []; const paws = [];
  for (const [x, y, z, front] of [[-0.33, 1.05, 0.55, 1], [0.33, 1.05, 0.55, 1], [-0.33, 1.0, -0.66, 0], [0.33, 1.0, -0.66, 0]]) {
    const hip = new THREE.Group(); hip.position.set(x, y, z); body.add(hip);
    const L1 = (y - 0.12) * 0.52, L2 = (y - 0.12) * 0.48;
    furMesh(caps(front ? 0.19 : 0.21, L1), hip, 0.6, ol);
    const knee = new THREE.Group(); knee.position.y = -L1; hip.add(knee);
    furMesh(caps(0.15, L2), knee, 0.5, ol);
    const pawG = new THREE.Group(); pawG.position.set(0, -L2 - 0.02, 0.07); knee.add(pawG);
    furMesh(ell(0.17, 0.08, 0.24, 24), pawG, 0.5, ol);
    legs.push({ hip, knee, front, ph: (front ? 0 : Math.PI) + (x > 0 ? Math.PI : 0) * 1 + (front ? 0 : 0.6) });
    paws.push(pawG);
  }
  root.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
  return { root, body, neckG, headG, legs, paws, hump, ol, nose };
}
function poseBear(b, { phase = 0, amp = 0, head = 0, breathe = 0, t = 0 } = {}) {
  for (const l of b.legs) {
    const s = Math.sin(phase + l.ph);
    l.hip.rotation.x = s * 0.42 * amp;
    l.knee.rotation.x = (l.front ? 1 : -1) * Math.max(0, Math.cos(phase + l.ph)) * 0.55 * amp;
  }
  b.body.position.y = Math.abs(Math.sin(phase)) * 0.05 * amp + Math.sin(t * 2.2) * 0.01 * breathe;
  b.body.rotation.z = Math.sin(phase) * 0.03 * amp;
  b.neckG.rotation.x = head + Math.sin(phase * 2) * 0.04 * amp;
  b.headG.rotation.y = Math.sin(t * 0.7) * 0.08 * breathe;
}
const bear = makeBear(); scene.add(bear.root);

// ---------- Robbe ----------
function makeSeal() {
  const g = new THREE.Group();
  const spot = canvasTex(256, 128, (c, w, h) => { c.fillStyle = '#8d949a'; c.fillRect(0, 0, w, h); const r = rng(5); for (let i = 0; i < 160; i++) { c.fillStyle = `rgba(40,45,52,${0.3 + r() * 0.4})`; c.beginPath(); c.ellipse(r() * w, r() * h, 2 + r() * 7, 2 + r() * 5, r() * 3, 0, 7); c.fill(); } });
  const m = new THREE.MeshStandardMaterial({ map: spot, roughness: 0.45 });
  const ol = outlineMat(0xff3b30); ol.userData.u.uO.value = 0.06;
  const bodyG = ell(0.34, 0.27, 0.78); const b = new THREE.Mesh(bodyG, m); b.position.y = 0.27; g.add(b, new THREE.Mesh(bodyG, ol)); g.children[1].position.y = 0.27;
  const headG = ell(0.2, 0.19, 0.22); const h = new THREE.Mesh(headG, m); h.position.set(0, 0.38, 0.78); g.add(h); const ho = new THREE.Mesh(headG, ol); ho.position.copy(h.position); g.add(ho);
  const dark = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.2 });
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), dark); e.position.set(0.1 * s, 0.45, 0.94); g.add(e);
    const f = new THREE.Mesh(ell(0.06, 0.03, 0.16, 12), m); f.position.set(0.34 * s, 0.12, 0.3); f.rotation.y = 0.6 * s; g.add(f);
    const r = new THREE.Mesh(ell(0.12, 0.03, 0.2, 12), m); r.position.set(0.1 * s, 0.18, -0.85); r.rotation.y = 0.4 * s; g.add(r);
  }
  const n = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), dark); n.position.set(0, 0.38, 1.0); g.add(n);
  g.traverse(o => { if (o.isMesh && o.material !== ol) { o.castShadow = true; o.receiveShadow = true; } });
  g.userData.ol = ol; return g;
}
const seal = makeSeal(); scene.add(seal);
const seal2 = makeSeal(); scene.add(seal2);

// ---------- Haar-Makro (Szene 4) ----------
const MAC = V(1000, 0, 0);
const macro = new THREE.Group(); macro.position.copy(MAC); scene.add(macro);
const rays = [];
{
  const tubeM = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.32, roughness: 0.15, depthWrite: false, side: THREE.DoubleSide });
  const coreM = new THREE.MeshStandardMaterial({ color: 0x9ec9ff, transparent: true, opacity: 0.25, depthWrite: false, emissive: 0x16304c });
  const capM = new THREE.MeshStandardMaterial({ color: 0xf6fbff, roughness: 0.3 });
  const holeM = new THREE.MeshBasicMaterial({ color: 0x0a1626 });
  const r = rng(11);
  const pos = [[0, 0, 0], [-1.1, -0.4, -0.8], [1.15, -0.3, -0.6], [-0.4, -0.6, -2], [0.7, -0.2, -2.4], [-1.9, -0.5, -2.5], [2, -0.7, -2.2]];
  pos.forEach(([x, y, z], i) => {
    const hg = new THREE.Group(); hg.position.set(x, y, z); hg.rotation.z = (r() - .5) * 0.35; hg.rotation.x = (r() - .5) * 0.25; macro.add(hg);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 6, 40, 1, true), tubeM); t.position.y = -2; hg.add(t);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, 6, 24, 1, true), coreM); c.position.y = -2; hg.add(c);
    const cap = new THREE.Mesh(new THREE.RingGeometry(0.13, 0.3, 40), capM); cap.rotation.x = -Math.PI / 2; cap.position.y = 1.0; hg.add(cap);
    const ho = new THREE.Mesh(new THREE.CircleGeometry(0.13, 30), holeM); ho.rotation.x = -Math.PI / 2; ho.position.y = 0.96; hg.add(ho);
    if (i === 0) macro.userData.hair0 = hg;
  });
  // Lichtstrahlen: Polylinien, die eintreten und gestreut werden
  const rm = new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.95, depthWrite: false });
  for (let k = 0; k < 9; k++) {
    let p = V(-3.2 + r() * 1.5, 3 + r() * 1.5, -0.5 + r() * 0.8); let d = V(0, 0, 0).sub(V(-2.5, 3, 0)).normalize();
    p = V(-1.6 + k * 0.42 - 1.5, 3.2, -0.6 + r());
    const pts = [p.clone()]; let q = V(p.x + 1.8, 0.4 - r() * 0.8, p.z + (r() - .5));
    pts.push(q.clone());
    for (let b = 0; b < 3; b++) { q = q.clone().add(V((r() - .5) * 3, (r() - .2) * 2.5, (r() - .5) * 2)); pts.push(q.clone()); }
    const segs = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1]; const len = a.distanceTo(b);
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 6), rm); s.geometry.translate(0, 0.5, 0);
      s.position.copy(a); s.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()); s.userData.len = len; macro.add(s); segs.push(s);
    }
    rays.push({ segs, delay: k * 0.12 });
  }
}

// ---------- Fell-Querschnitt (Szene 7) ----------
const core = new THREE.Group(); scene.add(core);
{
  const mk = (w, c, x, extra = {}) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...extra })); m.position.x = x; m.castShadow = true; core.add(m); return m; };
  mk(0.3, 0xa8333a, 0.15); // Muskel
  const fat = mk(0.38, 0xf1c64b, 0.49, { roughness: 0.35 }); // Fett
  mk(0.04, 0x0b0b0b, 0.70); // schwarze Haut
  const r = rng(4); const fm = new THREE.MeshStandardMaterial({ color: 0xf6f3ea, roughness: 0.8 });
  for (let i = 0; i < 70; i++) { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.26 + r() * 0.06, 5), fm); h.rotation.z = Math.PI / 2 + (r() - .5) * 0.3; h.position.set(0.85, (r() - .5) * 0.48, (r() - .5) * 0.48); core.add(h); }
  core.userData.fat = fat;
}

// ---------- Pfotensohle (Szene 10) ----------
const SOLE = V(1000, 0, 40);
const sole = new THREE.Group(); sole.position.copy(SOLE); scene.add(sole);
const bumps = [];
{
  const padM = new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.75 });
  const bumpM = new THREE.MeshStandardMaterial({ color: 0x2c2c30, roughness: 0.55 });
  const furBase = new THREE.Group(); sole.add(furBase);
  const fg = furMesh(ell(1.35, 1.6, 0.5, 48), furBase, 2.2); fg.position.z = -0.25;
  const r = rng(21);
  const pads = [[0, -0.35, 0.68, 0.55], [-0.95, 0.65, 0.27, 0.3], [-0.42, 1.0, 0.27, 0.3], [0.2, 1.08, 0.27, 0.3], [0.8, 0.82, 0.27, 0.3]];
  for (const [x, y, rx, ry] of pads) {
    const p = new THREE.Mesh(ell(rx, ry, 0.18, 32), padM); p.position.set(x, y, 0.34); sole.add(p);
    const n = Math.round(rx * ry * 260);
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.88; const bx = Math.cos(a) * d * rx, by = Math.sin(a) * d * ry;
      const zz = 0.34 + 0.18 * Math.sqrt(Math.max(0, 1 - d * d));
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), bumpM); b.position.set(x + bx, y + by, zz); b.scale.setScalar(0.001);
      b.userData.t = r() * 0.6 + d * 0.4; sole.add(b); bumps.push(b);
    }
  }
}

// ---------- Schnee-Querschnitt (Szene 11/12) ----------
const DIO = V(-80, 0, 0);
const dio = new THREE.Group(); dio.position.copy(DIO); scene.add(dio);
const smellRings = [];
{
  const BW = 60, BH = 2.6; // Breite, Höhe; Vorderseite bei z=0 (lokal)
  const cav = { x: 1.6, y: -1.75, rx: 1.25, ry: 0.62 };
  const faceTex = canvasTex(2048, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.08, '#dbe9f6'); gr.addColorStop(1, '#7fa3c8'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const r = rng(8); for (let i = 0; i < 14; i++) { g.strokeStyle = `rgba(90,125,170,${0.3 + r() * 0.3})`; g.lineWidth = 2 + r() * 5; g.beginPath(); const y = 20 + r() * (h - 30); g.moveTo(0, y); for (let x = 0; x <= w; x += 64) g.lineTo(x, y + Math.sin(x * 0.01 + i) * 4); g.stroke(); }
    // Höhle ausschneiden
    const cx = (cav.x + BW / 2) / BW * w, cy = (-cav.y) / BH * h; g.globalCompositeOperation = 'destination-out';
    g.beginPath(); g.ellipse(cx, cy, cav.rx / BW * w, cav.ry / BH * h, 0, 0, 7); g.fill();
  });
  const faceM = new THREE.MeshStandardMaterial({ map: faceTex, transparent: true, alphaTest: 0.5, roughness: 0.9 });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(BW, BH), faceM); face.position.set(0, -BH / 2, 0.001); dio.add(face);
  const inner = new THREE.Mesh(ell(cav.rx, cav.ry, 0.9, 32), new THREE.MeshStandardMaterial({ color: 0x8fb3d6, side: THREE.BackSide, roughness: 0.9 }));
  inner.position.set(cav.x, cav.y, -0.9); dio.add(inner);
  // Rückseite verdecken
  const back = new THREE.Mesh(new THREE.PlaneGeometry(BW, BH), new THREE.MeshStandardMaterial({ color: 0x9fbbd6 })); back.position.set(0, -BH / 2, -1.9); dio.add(back);
  dio.userData.cav = cav;
  const ringM = new THREE.MeshBasicMaterial({ color: 0xb6ff5a, transparent: true, opacity: 0.8, depthTest: false, depthWrite: false });
  for (let i = 0; i < 6; i++) { const rg = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 8, 40), ringM.clone()); rg.rotation.x = Math.PI / 2; rg.renderOrder = 10; dio.add(rg); smellRings.push(rg); }
}

// ---------- Pfeile / Effekte ----------
function arrow(color) {
  const g = new THREE.Group(); const m = new THREE.MeshBasicMaterial({ color, transparent: true, depthTest: false });
  const s = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 10), m); s.position.y = 0.5;
  const h = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.35, 16), m); h.position.y = 1.15; g.add(s, h); g.renderOrder = 9;
  g.traverse(o => { if (o.isMesh) o.renderOrder = 9; }); scene.add(g); g.userData.m = m; return g;
}
const sunArrows = [0, 1, 2].map(() => arrow(0xffd23f));
const weightArrow = arrow(0xff3b30);
const spreadRings = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 64), new THREE.MeshBasicMaterial({ color: 0x5ad1ff, transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2; scene.add(m); return m; });

// Spritzer
const splash = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ map: dotTex, size: 0.12, transparent: true, depthWrite: false, color: 0xd8ecff }));
{ const n = 200, p = new Float32Array(n * 3); splash.geometry.setAttribute('position', new THREE.BufferAttribute(p, 3)); const r = rng(6); splash.userData.v = Array.from({ length: n }, () => [(r() - .5) * 3, 2 + r() * 4, (r() - .5) * 3]); scene.add(splash); }

// Schneefall
const SN = 6000;
const snow = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ map: dotTex, size: 0.06, transparent: true, depthWrite: false, color: 0xffffff, fog: false }));
const snowBase = new Float32Array(SN * 4);
{ const r = rng(13); for (let i = 0; i < SN; i++) { snowBase[i * 4] = r(); snowBase[i * 4 + 1] = r(); snowBase[i * 4 + 2] = r(); snowBase[i * 4 + 3] = 0.6 + r() * 0.8; }
  snow.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SN * 3), 3)); snow.frustumCulled = false; scene.add(snow); }
function updateSnow(t, amount, wind) {
  const p = snow.geometry.attributes.position.array; const c = camera.position; const B = 14; const n = Math.floor(SN * amount);
  for (let i = 0; i < SN; i++) {
    if (i >= n) { p[i * 3 + 1] = -999; continue; }
    const sp = snowBase[i * 4 + 3];
    const x = snowBase[i * 4] * B + t * wind * sp + Math.sin(t * 1.3 + i) * 0.15, y = snowBase[i * 4 + 1] * B - t * (1.0 + wind * 0.25) * sp, z = snowBase[i * 4 + 2] * B;
    p[i * 3] = c.x - B / 2 + ((x % B) + B) % B; p[i * 3 + 1] = c.y - B / 2 + ((y % B) + B) % B; p[i * 3 + 2] = c.z - B / 2 + ((z % B) + B) % B;
  }
  snow.geometry.attributes.position.needsUpdate = true;
  snow.material.size = 0.05 + wind * 0.008;
}

// ---------- UI ----------
const $ = id => document.getElementById(id);
const capEl = $('cap'), labEl = $('labels'), svgEl = $('svg'), badge = $('badge');
let ui = [];
function proj(p) { const v = p.clone().project(camera); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; }
function pill(text, x, y, k, color = '#f3c63f') { if (k <= 0) return; ui.push(`<div class="pill" style="left:${x}px;top:${y}px;border-color:${color};transform:translate(-50%,-50%) scale(${back(k * 1.0)})">${text}</div>`); }
function label3(text, p, k, dy = -30) { if (k <= 0) return; const [x, y] = proj(p); ui.push(`<div class="dot" style="left:${x}px;top:${y}px;opacity:${k}"></div><div class="lab" style="left:${x}px;top:${y + dy}px;transform:translate(-50%,-100%) scale(${back(k)})">${text}</div>`); }
let svg = [];
function thermo(x, y, level, k, label = 'KÖRPERWÄRME') {
  if (k <= 0) return; const col = level < 0.35 ? '#4fb3ff' : level < 0.6 ? '#ffb347' : '#ff5a3c';
  const hT = 300, top = y - hT;
  svg.push(`<g opacity="${k}" transform="translate(${x},${y}) scale(${back(k)}) translate(${-x},${-y})">
   <rect x="${x - 22}" y="${top}" width="44" height="${hT}" rx="22" fill="#fff" stroke="#000" stroke-width="6"/>
   <circle cx="${x}" cy="${y + 20}" r="40" fill="${col}" stroke="#000" stroke-width="6"/>
   <rect x="${x - 12}" y="${top + 12 + (hT - 12) * (1 - level)}" width="24" height="${(hT - 12) * level + 20}" fill="${col}"/>
   <circle cx="${x}" cy="${y + 20}" r="34" fill="${col}"/>
   <text x="${x - 40}" y="${top - 6}" text-anchor="end" font-family="M" font-weight="900" font-size="40" fill="#fff" stroke="#000" stroke-width="9" paint-order="stroke">${label}</text></g>`);
}
function bracket(a, b, text, k) {
  if (k <= 0) return; const [x1, y1] = proj(a), [x2, y2] = proj(b); const yb = lerp(y1, y2, ease(k));
  svg.push(`<g stroke="#fff" stroke-width="8" stroke-linecap="round"><line x1="${x1 - 25}" y1="${y1}" x2="${x1 + 25}" y2="${y1}" stroke="#000" stroke-width="16"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${yb}" stroke="#000" stroke-width="16"/>
   <line x1="${x1 - 25}" y1="${y1}" x2="${x1 + 25}" y2="${y1}"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${yb}"/>${k > 0.95 ? `<line x1="${x2 - 25}" y1="${y2}" x2="${x2 + 25}" y2="${y2}" stroke="#000" stroke-width="16"/><line x1="${x2 - 25}" y1="${y2}" x2="${x2 + 25}" y2="${y2}"/>` : ''}</g>`);
  ui.push(`<div class="lab" style="left:${x1 + 40}px;top:${(y1 + y2) / 2 + 26}px;transform:translate(0,-50%) scale(${back(k)});font-size:56px">${text}</div>`);
}

// ---------- Kamera ----------
function cam(pos, look, fov = 40, t = 0, shake = 0.02) {
  camera.position.copy(pos).add(V(Math.sin(t * 1.1) * shake, Math.sin(t * 1.7 + 1) * shake, Math.cos(t * 0.9) * shake));
  camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(look);
}
const vl = (a, b, k) => a.clone().lerp(b, k);

// ---------- Zustände zurücksetzen ----------
function resetWorld() {
  bear.root.visible = true; bear.root.position.set(0, 0, 0); bear.root.rotation.set(0, 0, 0); bear.root.scale.setScalar(1);
  bear.ol.userData.u.uA.value = 0; bear.hump.scale.setScalar(1); bear.paws.forEach(p => p.scale.setScalar(1));
  furU.uWipe.value = 99; furU.uColA.value.set(0x5a3a22); furU.uColB.value.set(0xf1ece0); furU.uSkin.value.set(0x0a0a0a); furU.uHoleR.value = 0; furU.uGlow.value = 0;
  seal.visible = false; seal2.visible = false; seal.userData.ol.userData.u.uA.value = 0; seal2.userData.ol.userData.u.uA.value = 0;
  macro.visible = false; sole.visible = false; dio.visible = false; core.visible = false; crackGroup.visible = false; thinIce.visible = false;
  splash.visible = false; [...sunArrows, weightArrow, ...spreadRings].forEach(a => a.visible = false);
  ground.visible = true; world.visible = true; sky.visible = true; lowGround.visible = false; groundMat.clippingPlanes = [];
  hole.visible = holeRim.visible = true;
  scene.background = null; scene.fog.density = 0.012; scene.fog.color.set(0xe4ecf4); skyU.top.value.set(0x7fa7d1); skyU.hor.value.set(0xe4ecf4);
  hemi.intensity = 1.5; sun.intensity = 2.6; sun.color.set(0xfff4e2); renderer.toneMappingExposure = 1.05;
  ui = []; svg = []; badge.style.display = 'none';
}
const POLAR = () => { furU.uWipe.value = -99; bear.hump.scale.setScalar(0.55); };

// ---------- Shots ----------
const shots = [
  // 0: Braunbär in der Arktis -> Robbe sieht ihn aus 1 km
  (T) => {
    const t0 = S[0].start, tR = WT(0, 'robbe');
    badge.style.display = T < 3.2 ? 'block' : 'none';
    if (T < tR) {
      const u = T - t0; bear.root.position.set(0, 0, u * 0.9 - 2); poseBear(bear, { phase: u * 4.2, amp: 1, t: T, head: 0.05 });
      sunAt(bear.root.position);
      const tb = WT(0, 'braunb'); bear.ol.userData.u.uA.value = clamp((T - tb) * 4) * (1 - clamp((T - tb - 1.1) * 3)) * 0.9;
      cam(V(3.6 - u * 0.3, 1.6, 6.5 - u * 0.15 + bear.root.position.z), bear.root.position.clone().add(V(0, 1.0, 0.4)), 42 - u * 1.5, T);
    } else {
      const u = T - tR; seal.visible = true; seal.position.set(0.5, 0, -55.5); seal.rotation.y = Math.PI;
      seal.rotation.y = Math.PI - ease(u * 2) * Math.PI * 0.95; // dreht den Kopf Richtung Bär
      bear.root.position.set(0, 0, 3); poseBear(bear, { phase: T * 4.2, amp: 1, t: T });
      sunAt(seal.position);
      seal.userData.ol.userData.u.uA.value = clamp(u * 4) * 0.9;
      cam(V(-1.2, 0.9, -59.5 + u * 0.4), V(0.2, 0.6, -40), 32 - u * 3, T, 0.015);
      const kk = clamp((T - WT(0, 'kilometer')) * 3);
      label3('1 KM', bear.root.position.clone().add(V(0, 2.2, 0)), kk);
      pill('👀 SOFORT ENTDECKT', W / 2, 760, clamp((T - WT(0, 'entfernung')) * 3), '#ff4d4d');
    }
  },
  // 1: Robbe taucht ab
  (T) => {
    const u = T - S[1].start; seal.visible = true; sunAt(hole.position);
    const k = ease(u / 0.9);
    seal.position.set(lerp(0.5, 0.5, k), lerp(0, -1.6, ease((u - 0.5) / 0.6)), lerp(-55.5, -57.8, k)); seal.rotation.set(lerp(0, 0.6, ease((u - 0.4) / 0.5)), Math.PI * 0.05 + Math.PI, 0);
    seal.rotation.y = Math.PI * 1.0 + 0.05; seal.rotation.x = -lerp(0, 0.8, ease((u - 0.4) / 0.5));
    bear.root.position.set(0, 0, 3);
    splash.visible = true; const ts = u - 0.75; const p = splash.geometry.attributes.position.array;
    splash.userData.v.forEach((v, i) => { const tt = clamp(ts, 0, 2); p[i * 3] = hole.position.x + v[0] * tt * 0.6; p[i * 3 + 1] = ts < 0 ? -9 : Math.max(0, v[1] * tt - 4.9 * tt * tt); p[i * 3 + 2] = hole.position.z + v[2] * tt * 0.6; });
    splash.geometry.attributes.position.needsUpdate = true; splash.material.opacity = 1 - clamp(ts / 1.2);
    cam(V(2.5, 1.5, -52.5), V(0.5, 0.2, -57.5), 38, T, 0.03);
    pill('🍽️ ABENDESSEN WEG', W / 2, 760, clamp((T - WT(1, 'abend')) * 3), '#ff4d4d');
  },
  // 2: Fell wird weiß
  (T) => {
    const u = T - S[2].start, d = S[2].end - S[2].start + 0.18; poseBear(bear, { t: T, breathe: 1 }); sunAt(V(0, 0, 0));
    const tw = WT(2, 'fell') - 0.15; const k = ease((T - tw) / 0.9);
    furU.uWipe.value = lerp(2.4, -1.6, k); furU.uGlow.value = k > 0 && k < 1 ? 1 : 0;
    bear.hump.scale.setScalar(lerp(1, 0.55, k));
    cam(V(4.6 - u * 0.25, 1.5, 1.4), V(0, 1.0, 0.2), 40, T);
    pill('✅ UNSICHTBAR IM SCHNEE', W / 2, 760, clamp((T - WT(2, 'weiß')) * 3 - 0.6), '#3ddc84');
  },
  // 3: Haare durchsichtig + hohl (Makro)
  (T) => {
    const u = T - S[3].start; bear.root.visible = false; macro.visible = true; ground.visible = false; world.visible = false; sky.visible = false;
    hole.visible = holeRim.visible = false; seal.visible = false;
    scene.background = new THREE.Color(0x0d2238); scene.fog.density = 0.0; sunAt(MAC); hemi.intensity = 1.2;
    const tl = WT(3, 'licht') - 0.3;
    rays.forEach(r => { let acc = 0; const tt = (T - tl - r.delay) * 9; r.segs.forEach(s => { const L = s.userData.len; const g = clamp((tt - acc) / L); s.visible = g > 0; s.scale.set(1, Math.max(0.001, g * L), 1); acc += L; }); });
    cam(V(MAC.x + 0.8 - u * 0.12, 2.6 - u * 0.1, 4.2 - u * 0.25), V(MAC.x, 0.4, 0), 44, T, 0.02);
    const h0 = macro.userData.hair0; const top = V(0, 1.0, 0).applyMatrix4(h0.matrixWorld);
    label3('DURCHSICHTIG', V(MAC.x + 0.3, -0.6, 0.3), clamp((T - WT(3, 'durch')) * 3));
    label3('HOHL', top, clamp((T - WT(3, 'hohl')) * 3));
    pill('❄️ WIE SCHNEE', W / 2, 760, clamp((T - WT(3, 'schnee')) * 3));
  },
  // 4: -40 Grad, Fell reicht nicht
  (T) => {
    const u = T - S[4].start; POLAR(); poseBear(bear, { t: T, breathe: 1, head: 0.1 }); sunAt(V(0, 0, 0));
    bear.root.rotation.z = Math.sin(T * 40) * 0.004 * clamp((T - WT(4, 'reicht')) * 2); // zittern
    scene.fog.density = 0.03; skyU.top.value.set(0x5d7894); sun.intensity = 1.2;
    cam(V(-2.8, 1.25, 4.4 - u * 0.3), V(0, 1.1, 0.3), 42, T, 0.04);
    const lvl = lerp(0.75, 0.15, ease((T - WT(4, 'minus')) / 1.5));
    thermo(880, 1000, lvl, clamp((T - S[4].start) * 4));
    pill('🥶 −40 °C', W / 2, 760, clamp((T - WT(4, 'minus')) * 3), '#4fb3ff');
  },
  // 5: schwarze Haut saugt Sonne auf
  (T) => {
    const u = T - S[5].start; POLAR(); poseBear(bear, { t: T, breathe: 1 }); sunAt(V(0, 0, 0));
    const hc = V(0.6, 1.25, 0.1); furU.uHoleC.value.copy(hc);
    furU.uHoleR.value = 0.24 * ease((T - WT(5, 'haut') + 0.1) / 0.6);
    const tSun = WT(5, 'sonnen') - 0.3;
    sunArrows.forEach((a, i) => { a.visible = T > tSun; const ph = ((T - tSun) * 0.9 + i / 3) % 1; const start = V(2.6, 3.4, 0.6); const end = hc.clone().add(V(0.12, 0.12, (i - 1) * 0.14));
      const dir = end.clone().sub(start); a.position.copy(start.clone().add(dir.clone().multiplyScalar(ph * 0.55))); a.quaternion.setFromUnitVectors(V(0, 1, 0), dir.clone().normalize()); a.scale.setScalar(1.1); a.userData.m.opacity = Math.sin(ph * Math.PI); });
    cam(V(3.6 - u * 0.15, 1.75, 1.6), hc.clone().add(V(0, -0.05, 0)), 40, T, 0.02);
    const lvl = lerp(0.15, 0.62, ease((T - tSun) / 1.6));
    thermo(880, 1000, lvl, 1);
    label3('SCHWARZE HAUT', hc, clamp((T - WT(5, 'pech')) * 3), -60);
  },
  // 6: 10 cm Fett wie Schlafsack
  (T) => {
    const u = T - S[6].start; POLAR(); poseBear(bear, { t: T, breathe: 1 }); sunAt(V(0, 0, 0));
    const hc = V(0.6, 1.25, 0.1); furU.uHoleC.value.copy(hc); furU.uHoleR.value = 0.24;
    core.visible = true; const k = easeOut(u / 0.8); core.position.set(lerp(0.1, 0.45, k), 1.25, 0.1); core.scale.setScalar(lerp(0.3, 0.62, k));
    core.userData.fat.scale.x = lerp(0.2, 1, ease((T - WT(6, 'zehn')) / 0.6)); core.userData.fat.position.x = 0.3 + 0.19 * core.userData.fat.scale.x;
    cam(V(3.3, 1.9, 2.6), V(0.75, 1.1, 0.1), 40, T, 0.015);
    core.updateMatrixWorld(true);
    const f = core.userData.fat; const a = V(f.position.x - 0.19 * f.scale.x, 0.32, 0.25).applyMatrix4(core.matrixWorld), b = V(f.position.x + 0.19 * f.scale.x, 0.32, 0.25).applyMatrix4(core.matrixWorld);
    const [ax, ay] = proj(a), [bx, by] = proj(b); const kk = clamp((T - WT(6, 'zentim')) * 3);
    if (kk > 0) { svg.push(`<g opacity="${kk}"><line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="#000" stroke-width="16" stroke-linecap="round"/><line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="#fff" stroke-width="8" stroke-linecap="round"/></g>`);
      ui.push(`<div class="lab" style="left:${(ax + bx) / 2}px;top:${(ay + by) / 2 - 20}px;font-size:60px;transform:translate(-50%,-100%) scale(${back(kk)})">10 CM</div>`); }
    pill('🛌 WIE EIN SCHLAFSACK', W / 2, 760, clamp((T - WT(6, 'schlaf')) * 3));
    thermo(880, 1000, lerp(0.62, 0.85, ease((T - WT(6, 'fett')) / 1)), 1);
  },
  // 7: dünnes Eis bricht
  (T) => {
    const u = T - S[7].start; POLAR(); thinIce.visible = true; crackGroup.visible = true; sunAt(THIN);
    const tB = WT(7, 'bricht') - 0.35; const walkK = clamp((tB - T) / 0.4);
    const x = THIN.x - 3.2 + Math.min(u, tB - S[7].start) * 1.0;
    bear.root.position.set(x, 0, 0); bear.root.rotation.y = Math.PI / 2; poseBear(bear, { phase: Math.min(T, tB) * 4.2, amp: walkK > 0 ? 1 : 0, t: T, breathe: 1 });
    const paw = bear.paws[0].getWorldPosition(V(0, 0, 0)); crackGroup.position.set(paw.x, 0, paw.z);
    const cu = (T - tB) * 2.2; cracks.forEach(c => { const g = clamp((cu - c.userData.t) * 3); c.visible = g > 0; c.scale.x = Math.max(0.001, c.userData.len * g); });
    const sh = T > tB ? 0.06 * Math.exp(-(T - tB) * 3) : 0;
    cam(V(x + 1.2, 1.3, 5.2), V(x + 0.8, 0.5, 0), 44, T * 9, 0.02 + sh);
    weightArrow.visible = T > WT(7, 'schwer') - 0.1; weightArrow.position.set(x + 0.3, 3.6, 0); weightArrow.rotation.z = Math.PI; weightArrow.scale.setScalar(1.3 * back((T - WT(7, 'schwer') + 0.1) * 3));
    pill('⚠️ DÜNNES EIS', W / 2, 760, clamp((T - WT(7, 'dünn')) * 3), '#ff4d4d');
  },
  // 8: Pfoten riesig wie Teller -> Schneeschuhe
  (T) => {
    const u = T - S[8].start; POLAR(); thinIce.visible = true; sunAt(THIN);
    bear.root.position.set(THIN.x - 0.5, 0, 0); bear.root.rotation.y = Math.PI / 2; poseBear(bear, { t: T, breathe: 1 });
    const g = back((T - WT(8, 'riesig') + 0.1) / 0.6); const sc = lerp(1, 1.55, clamp(g, 0, 1.2)); bear.paws.forEach(p => p.scale.set(sc, 1 + (sc - 1) * 0.4, sc));
    const paw = bear.paws[1].getWorldPosition(V(0, 0, 0));
    cam(V(paw.x + 1.0, 0.75, paw.z + 1.6), V(paw.x + 0.1, 0.12, paw.z), 40, T, 0.015);
    const tr = WT(8, 'verteil') - 0.1;
    spreadRings.forEach((r, i) => { r.visible = T > tr; const ph = ((T - tr) * 0.8 + i / 3) % 1; r.position.set(paw.x, 0.03, paw.z); r.scale.setScalar(0.3 + ph * 1.1); r.material.opacity = (1 - ph) * 0.9; });
    pill('🍽️ SO GROSS WIE EIN TELLER', W / 2, 760, clamp((T - WT(8, 'teller')) * 3));
    label3('SCHNEESCHUHE', V(paw.x + 0.2, 0.05, paw.z + 0.4), clamp((T - WT(8, 'schnee')) * 3), -40);
  },
  // 9: Noppen auf den Sohlen (Makro)
  (T) => {
    const u = T - S[9].start; bear.root.visible = false; sole.visible = true; ground.visible = false; world.visible = false; sky.visible = false; hole.visible = holeRim.visible = false;
    scene.background = new THREE.Color(0x9ec4e4); scene.fog.density = 0; sunAt(SOLE); POLAR();
    sole.rotation.set(0.15, -0.25 + u * 0.06, 0);
    const tn = WT(9, 'noppen') - 0.25; bumps.forEach(b => b.scale.setScalar(Math.max(0.001, back((T - tn - b.userData.t * 0.9) * 4))));
    cam(V(SOLE.x + 0.4, 0.1, SOLE.z + 7.6 - u * 0.35), V(SOLE.x, 0.35, SOLE.z), 42, T, 0.02);
    label3('NOPPEN', V(SOLE.x + 0.1, -0.35, SOLE.z + 0.7), clamp((T - tn - 0.4) * 3), -60);
    pill('✅ KEIN AUSRUTSCHEN', W / 2, 760, clamp((T - WT(9, 'ausrut')) * 3), '#3ddc84');
  },
  // 10: Robben unter dem Schnee (Querschnitt)
  (T) => diorama(T, 10),
  // 11: Nase riecht 1 Meter tief
  (T) => diorama(T, 11),
  // 12: Schneesturm, jagt weiter
  (T) => {
    const u = T - S[12].start; POLAR();
    scene.fog.density = 0.05; scene.fog.color.set(0xc9d6e3); skyU.top.value.set(0x8a9bb0); skyU.hor.value.set(0xc9d6e3); sun.intensity = 0.9; hemi.intensity = 1.7;
    bear.root.position.set(0, 0, -6 + u * 1.15); poseBear(bear, { phase: T * 4.4, amp: 1, t: T, head: 0.05 }); sunAt(bear.root.position);
    const bp = bear.root.position;
    cam(V(bp.x - 2.3, 0.8, bp.z + 6.6), bp.clone().add(V(0, 1.1, 0.5)), 44, T, 0.05);
    thermo(880, 1000, 0.8, clamp((T - WT(12, 'minus')) * 3), 'KÖRPERWÄRME');
    pill('🌨️ −40 °C? EGAL.', W / 2, 760, clamp((T - WT(12, 'gehst')) * 3), '#3ddc84');
  },
  // 13: Glückwunsch – Eisbär
  (T) => {
    const u = T - S[13].start; POLAR(); poseBear(bear, { t: T, breathe: 1, head: -0.08 });
    skyU.top.value.set(0x6f9bd0); sun.color.set(0xffe2b8); sunAt(V(0, 0, 0));
    const a = 0.9 + u * 0.18; cam(V(Math.sin(a) * 5.2, 1.3, Math.cos(a) * 5.2), V(0, 1.0, 0.2), 40, T, 0.01);
    bear.ol.userData.u.uA.value = clamp((T - WT(13, 'eisb')) * 4) * 0.9;
    pill('🐻‍❄️ EISBÄR', W / 2, 760, clamp((T - WT(13, 'eisb')) * 3));
  },
];
function diorama(T, i) {
  POLAR(); dio.visible = true; lowGround.visible = true; groundMat.clippingPlanes = [groundClip]; groundClip.constant = DIO.z; // Boden für z>0 weg
  hole.visible = holeRim.visible = false;
  const cav = dio.userData.cav; seal2.visible = true; seal2.position.set(DIO.x + cav.x, cav.y - cav.ry + 0.05, DIO.z - 0.85); seal2.rotation.y = Math.PI / 2 + 0.2; seal2.scale.setScalar(0.95);
  seal2.rotation.z = Math.sin(T * 1.5) * 0.03;
  const bx = DIO.x + cav.x - 1.0; bear.root.position.set(bx, 0, DIO.z - 1.1); bear.root.rotation.y = Math.PI / 2;
  sunAt(V(bx, 0, 0));
  if (i === 10) {
    const u = T - S[10].start; poseBear(bear, { phase: T * 4, amp: clamp(1 - u / 1.2), t: T, breathe: 1, head: 0.25 * ease(u / 1.5) });
    bear.root.position.x = bx - lerp(1.2, 0, ease(u / 1.2));
    cam(V(DIO.x + 0.8, 0.9, 8.5 - u * 0.4), V(DIO.x + 0.7, -0.5, -0.8), 46, T, 0.02);
    seal2.userData.ol.userData.u.uA.value = clamp((T - WT(10, 'robben')) * 3) * 0.9;
    label3('VERSTECKT', V(DIO.x + cav.x + 0.6, cav.y + 0.55, 0), clamp((T - WT(10, 'versteck')) * 3), -10);
  } else {
    const u = T - S[11].start; poseBear(bear, { t: T, breathe: 1, head: 0.42 + Math.sin(T * 9) * 0.03 });
    cam(V(DIO.x + 1.3, 0.7, 7.6 - u * 0.25), V(DIO.x + 1.1, -0.6, -0.8), 46, T, 0.02);
    seal2.userData.ol.userData.u.uA.value = 0.9;
    const nose = bear.nose.getWorldPosition(V(0, 0, 0)); const tgt = seal2.position.clone().add(V(0, 0.4, 0.8));
    const tn = WT(11, 'nase') - 0.2;
    smellRings.forEach((r, k) => { const ph = ((T - tn) * 0.55 + k / 6) % 1; r.visible = T > tn; r.position.copy(nose.clone().lerp(tgt, ph)).sub(DIO); r.scale.setScalar(0.5 + ph * 1.2); r.material.opacity = Math.sin(ph * Math.PI) * 0.9; });
    bracket(V(DIO.x + cav.x + 1.9, 0, DIO.z), V(DIO.x + cav.x + 1.9, cav.y + cav.ry - 0.12, DIO.z), '1 METER', clamp((T - WT(11, 'meter') + 0.3) * 2));
    pill('👃 RIECHT SIE TROTZDEM', W / 2, 760, clamp((T - WT(11, 'riech')) * 3), '#3ddc84');
  }
}

// ---------- Untertitel ----------
function caption(T) {
  let cur = null;
  for (const s of S) for (let i = 0; i < s.words.length; i++) {
    const w = s.words[i]; const nx = s.words[i + 1] ? s.words[i + 1].s : s.end + 0.12;
    if (T >= w.s - 0.03 && T < nx) cur = w;
  }
  if (!cur) { capEl.textContent = ''; return; }
  capEl.textContent = cur.w.replace(/[.,!?;:]/g, '').toUpperCase();
  const k = clamp((T - cur.s + 0.03) / 0.09); capEl.style.transform = `scale(${lerp(1.18, 1, k)})`;
}

// ---------- Haupt-Render ----------
let snowAmount = 0.5, wind = 1;
window.renderAt = (T) => {
  resetWorld();
  let i = 0; for (let k = 0; k < S.length; k++) if (T >= S[k].start - 0.05) i = k;
  scene.updateMatrixWorld(true);
  shots[i](T);
  scene.updateMatrixWorld(true);
  const amt = [0.35, 0.35, 0.35, 0, 0.9, 0.4, 0.4, 0.35, 0.35, 0, 0.45, 0.45, 1, 0.4][i];
  const wd = [1.2, 1, 1, 0, 6, 1.5, 1.2, 1, 1, 0, 1.5, 1.5, 9, 1.2][i];
  snow.visible = amt > 0; updateSnow(T, amt, wd);
  renderer.render(scene, camera);
  labEl.innerHTML = ui.join(''); svgEl.innerHTML = svg.join('');
  caption(T);
  return i;
};
await document.fonts.load('900 50px M'); await document.fonts.load('50px "Noto Color Emoji"');
window.renderAt(0.5);
window.READY = true;
