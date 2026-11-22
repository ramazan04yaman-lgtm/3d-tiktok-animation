// Prozeduraler 3D-Renderer für Szenario-Videos (keine Bild-/Video-KI, alles Code).
// Wird vom Renderer frame-genau über window.renderAt(t) gesteuert.
import * as THREE from 'three';

const W = 1080, H = 1920;
const TL = await (await fetch(new URLSearchParams(location.search).get('tl'))).json();
const SEG = TL.segments;
const IMPACT = TL.impact;

// ---------- Helpers ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
const lerp = (a, b, k) => a + (b - a) * k;
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

function hash3(x, y, z) { let h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return h - Math.floor(h); }
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const c = (a, b, d) => hash3(xi + a, yi + b, zi + d);
  const l = (a, b, k) => a + (b - a) * k;
  return l(l(l(c(0,0,0), c(1,0,0), u), l(c(0,1,0), c(1,1,0), u), v),
           l(l(c(0,0,1), c(1,0,1), u), l(c(0,1,1), c(1,1,1), u), v), w);
}
const fbm = (x, y, z, o = 5) => { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f, z * f); a *= .5; f *= 2.03; } return s; };

function sphereTex(w, h, fn) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'), img = g.createImageData(w, h);
  for (let j = 0; j < h; j++) {
    const lat = (0.5 - j / h) * Math.PI;
    for (let i = 0; i < w; i++) {
      const lon = (i / w) * Math.PI * 2;
      const x = Math.cos(lat) * Math.cos(lon), y = Math.sin(lat), z = Math.cos(lat) * Math.sin(lon);
      const [r, gg, b, a = 255] = fn(x, y, z, lat);
      const k = (j * w + i) * 4; img.data[k] = r; img.data[k + 1] = gg; img.data[k + 2] = b; img.data[k + 3] = a;
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

function glowTex(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, inner); gr.addColorStop(1, outer); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setPixelRatio(1);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('stage').appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 5000);

// ---------- Texturen ----------
seed = 11;
const craters = Array.from({ length: 70 }, () => {
  const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u);
  return [s * Math.cos(th), u, s * Math.sin(th), 0.04 + rnd() * rnd() * 0.25];
});
const moonTex = sphereTex(1024, 512, (x, y, z) => {
  let v = 0.55 + 0.35 * fbm(x * 4, y * 4, z * 4);
  const mare = fbm(x * 1.5 + 3, y * 1.5, z * 1.5, 3);
  if (mare > 0.55) v *= 0.72;
  for (const [cx, cy, cz, r] of craters) {
    const d = Math.hypot(x - cx, y - cy, z - cz) / r;
    if (d < 1) v *= 0.8 + 0.2 * d; else if (d < 1.2) v *= 1.12;
  }
  v = clamp(v) * 235; return [v, v * 0.98, v * 0.94];
});
const earthLand = (x, y, z) => fbm(x * 1.7 + 10, y * 1.7, z * 1.7, 6);
const earthTex = sphereTex(1024, 512, (x, y, z, lat) => {
  const h = earthLand(x, y, z), ice = Math.abs(lat) > 1.2 + 0.1 * vnoise(x * 6, y * 6, z * 6);
  if (ice) return [235, 242, 250];
  if (h > 0.52) {
    const d = fbm(x * 8, y * 8, z * 8, 3), dry = Math.abs(lat) < 0.5 && d > 0.5;
    return dry ? [196, 164, 110] : [lerp(40, 90, d), lerp(110, 130, d), lerp(45, 55, d)];
  }
  const deep = clamp((0.52 - h) * 5);
  return [lerp(30, 8, deep), lerp(105, 40, deep), lerp(170, 110, deep)];
});
const cloudTex = sphereTex(1024, 512, (x, y, z) => {
  const c = fbm(x * 3 + 5, y * 6, z * 3, 5); const a = clamp((c - 0.5) * 4) * 230; return [255, 255, 255, a];
});

// ---------- Gemeinsam: Sterne ----------
function makeStars(n, r) {
  const g = new THREE.BufferGeometry(), p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    p.set([s * Math.cos(th) * r, Math.abs(u) * r * (i % 5 ? 1 : -1), s * Math.sin(th) * r], i * 3);
  }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ size: 3, sizeAttenuation: false, color: 0xffffff, transparent: true, depthWrite: false }));
}

// ================= SZENE A: Stadt bei Nacht (Hook, Dunkel, Outro) =================
const city = new THREE.Scene();
city.fog = new THREE.FogExp2(0x0a1030, 0.0016);
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false,
  uniforms: { bright: { value: 1 } },
  vertexShader: `varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform float bright; varying vec3 vp; void main(){
    float h = clamp(vp.y,0.,1.);
    vec3 top = vec3(.01,.02,.07), hor = vec3(.10,.14,.32)*bright + vec3(.02,.02,.05);
    vec3 glow = vec3(.25,.12,.18)*pow(1.-h,8.);
    gl_FragColor = vec4(mix(hor, top, pow(h,.5)) + glow, 1.); }`,
});
city.add(new THREE.Mesh(new THREE.SphereGeometry(2000, 32, 16), skyMat));
const cityStars = makeStars(2500, 1500); city.add(cityStars);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshStandardMaterial({ color: 0x0b0d16, roughness: 1 }));
ground.rotation.x = -Math.PI / 2; city.add(ground);
const cityAmb = new THREE.AmbientLight(0x4050a0, 0.5); city.add(cityAmb);
const moonLight = new THREE.DirectionalLight(0xbfd4ff, 2.2); moonLight.position.set(-200, 400, -600); city.add(moonLight);

function windowTex() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 64, 128);
  for (let y = 4; y < 128; y += 8) for (let x = 4; x < 64; x += 8)
    if (rnd() < 0.35) { g.fillStyle = rnd() < .8 ? '#ffc979' : '#9fd0ff'; g.fillRect(x, y, 4, 5); }
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return t;
}
seed = 3;
const winTexs = Array.from({ length: 6 }, windowTex);
const buildings = new THREE.Group(); city.add(buildings);
for (let i = 0; i < 160; i++) {
  const w = 20 + rnd() * 30, d = 20 + rnd() * 30, h = 40 + Math.pow(rnd(), 2) * 240;
  let x = (rnd() - .5) * 900, z = -100 - rnd() * 700;
  if (Math.abs(x) < 40 && z > -250) x += Math.sign(x || 1) * 60;  // Straße frei lassen
  const tex = winTexs[i % 6].clone(); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(Math.round(w / 12), Math.round(h / 20)); tex.needsUpdate = true;
  const m = new THREE.MeshStandardMaterial({ color: 0x141826, roughness: .9, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.1 });
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, h / 2, z); buildings.add(b);
}
// Mond
const moonGroup = new THREE.Group(); city.add(moonGroup);
const moonPos = new THREE.Vector3(60, 520, -1200);
moonGroup.position.copy(moonPos);
const moon = new THREE.Mesh(new THREE.SphereGeometry(150, 64, 32), new THREE.MeshBasicMaterial({ map: moonTex, color: 0xffffff, fog: false }));
moonGroup.add(moon);
const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('rgba(200,220,255,.9)', 'rgba(120,150,255,0)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
moonGlow.scale.set(700, 700, 1); moonGroup.add(moonGlow);
const shock = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 96), new THREE.MeshBasicMaterial({ color: 0xbfe0ff, transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, fog: false }));
shock.position.copy(moonPos); city.add(shock);
const ghost = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 80 }, (_, i) => new THREE.Vector3(Math.cos(i / 80 * 6.283) * 150, Math.sin(i / 80 * 6.283) * 150, 0))),
  new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 14, gapSize: 10, transparent: true, fog: false }));
ghost.computeLineDistances(); ghost.position.copy(moonPos); city.add(ghost);

function updateCity(t, mode, lt, ld) {
  // Mond-Status
  let ms = 1, flash = 0, dark = 0;
  if (mode === 'hook') {
    const k = (t - IMPACT) / 0.28;
    ms = k < 0 ? 1 + 0.06 * clamp((t - IMPACT + 0.5) / 0.5) : Math.max(0, 1 - easeOut(k));
    flash = t > IMPACT ? Math.max(0, 1 - (t - IMPACT) / 0.35) : 0;
    shock.visible = t > IMPACT; const sk = clamp((t - IMPACT) / 1.2);
    shock.scale.setScalar(150 + sk * 900); shock.material.opacity = (1 - sk) * 0.9;
    shock.lookAt(camera.position);
    dark = clamp((t - IMPACT) / 1.2) * 0.4;
  } else { ms = 0; shock.visible = false; dark = mode === 'dark' ? 0.4 + 0.6 * ease(lt / 2.5) : 1; }
  moon.scale.setScalar(Math.max(ms, 1e-3)); moonGlow.material.opacity = ms;
  moonGlow.scale.setScalar(700 * (0.5 + 0.5 * ms) + (mode === 'hook' && t > IMPACT ? flash * 1200 : 0));
  moonGlow.material.opacity = Math.max(ms, flash);
  moonGroup.visible = ms > 0.002 || flash > 0;
  moonLight.intensity = 2.2 * (1 - dark) + 0.05;
  cityAmb.intensity = 0.5 * (1 - dark * 0.7) + 0.08;
  skyMat.uniforms.bright.value = 1 - dark * 0.85;
  cityStars.material.opacity = 0.25 + dark * 0.75;
  ghost.visible = mode === 'outro'; ghost.material.opacity = 0.7 * clamp(lt / 0.8);
  ghost.lookAt(camera.position);
  // Kamera
  if (mode === 'hook') {
    const k = t / 3;
    camera.position.set(lerp(-10, 0, k), lerp(14, 18, k), lerp(160, 90, k));
    camera.fov = lerp(52, 44, ease(k));
    camera.lookAt(moonPos.x * .9, lerp(360, 420, k), moonPos.z);
  } else if (mode === 'dark') {
    const k = ease(lt / ld);
    camera.position.set(lerp(-60, 40, k), lerp(140, 70, k), lerp(160, 120, k));
    camera.fov = 55; camera.lookAt(lerp(0, 20, k), lerp(380, 120, k), -500);
  } else {
    const k = ease(lt / ld);
    camera.position.set(0, lerp(12, 30, k), lerp(60, 220, k));
    camera.fov = lerp(42, 56, k); camera.lookAt(moonPos.x * .8, lerp(430, 360, k), moonPos.z);
  }
  camera.updateProjectionMatrix();
  return flash;
}

// ================= SZENE B: Küste / Gezeiten =================
const coast = new THREE.Scene();
coast.background = new THREE.Color(0x10183a); coast.fog = new THREE.Fog(0x1a2250, 80, 700);
const coastSky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
  vertexShader: `varying vec3 vp; void main(){ vp=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `varying vec3 vp; void main(){ float h=clamp(vp.y,0.,1.); gl_FragColor=vec4(mix(vec3(.55,.28,.32),vec3(.05,.07,.2),pow(h,.35)),1.); }` }));
coast.add(coastSky); coast.add(makeStars(800, 1200));
coast.add(new THREE.HemisphereLight(0x8090ff, 0x302020, 1.1));
const coastSun = new THREE.DirectionalLight(0xffb080, 2.0); coastSun.position.set(-100, 60, -300); coast.add(coastSun);
const sand = new THREE.Mesh(new THREE.PlaneGeometry(800, 400, 60, 30), new THREE.MeshStandardMaterial({ color: 0xc9a46a, roughness: 1, flatShading: true }));
sand.rotation.x = -Math.PI / 2 - 0.12; sand.position.set(0, -6, 60);
{ const p = sand.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, (vnoise(p.getX(i) * .05, p.getY(i) * .05, 0) - .5) * 3); sand.geometry.computeVertexNormals(); }
coast.add(sand);
// Wet-sand Streifen (Flutlinie)
const wet = new THREE.Mesh(new THREE.PlaneGeometry(800, 26), new THREE.MeshStandardMaterial({ color: 0x7a5d3a, roughness: .4 }));
wet.rotation.x = -Math.PI / 2 - 0.12; coast.add(wet);
const WSEG = 120;
const water = new THREE.Mesh(new THREE.PlaneGeometry(1400, 900, WSEG, WSEG), new THREE.MeshStandardMaterial({ color: 0x1d4f7a, roughness: .15, metalness: .3, transparent: true, opacity: .93, flatShading: true }));
water.rotation.x = -Math.PI / 2; water.position.z = -300; coast.add(water);
const wBase = water.geometry.attributes.position.array.slice();
// Pegel-Messlatte
const gauge = new THREE.Group(); coast.add(gauge); gauge.position.set(28, 0, -20);
for (let i = 0; i < 14; i++) {
  const s = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 3), new THREE.MeshStandardMaterial({ color: i % 2 ? 0xffffff : 0xe8222c, emissive: i % 2 ? 0x333333 : 0x400000 }));
  s.position.y = -6 + i * 2 + 1; gauge.add(s);
}
const pier = new THREE.Group(); coast.add(pier);
for (let i = 0; i < 8; i++) for (const sx of [-1, 1]) {
  const post = new THREE.Mesh(new THREE.CylinderGeometry(.8, .8, 30, 8), new THREE.MeshStandardMaterial({ color: 0x3a2a1c }));
  post.position.set(-40 + sx * 5, 3, -i * 16); pier.add(post);
}
const deck = new THREE.Mesh(new THREE.BoxGeometry(14, 1.2, 130), new THREE.MeshStandardMaterial({ color: 0x5a4028 })); deck.position.set(-40, 17, -56); pier.add(deck);
const boat = new THREE.Group(); coast.add(boat); boat.position.set(-22, 0, -40);
{ const hull = new THREE.Mesh(new THREE.CylinderGeometry(4, 2.5, 18, 12, 1, false, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0xd8d8d8, side: THREE.DoubleSide }));
  hull.rotation.set(Math.PI / 2, 0, Math.PI); boat.add(hull);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, 16), new THREE.MeshStandardMaterial({ color: 0x222222 })); mast.position.y = 8; boat.add(mast); }

function updateCoast(lt, ld) {
  const k = ease((lt - 0.3) / (ld - 0.8));
  const level = lerp(10, 1.2, k), amp = lerp(1.6, 0.45, k);
  const p = water.geometry.attributes.position, tt = lt * 1.4;
  for (let i = 0; i < p.count; i++) {
    const x = wBase[i * 3], y = wBase[i * 3 + 1];
    p.setZ(i, amp * (Math.sin(x * .03 + tt * 1.8) * .6 + Math.sin(y * .05 - tt * 1.3) * .5 + Math.sin((x + y) * .09 + tt * 2.4) * .25));
  }
  p.needsUpdate = true; water.geometry.computeVertexNormals();
  water.position.y = level - 8;
  wet.position.set(0, -6 + 0.2 + level * 0.12 * 0, 60); wet.position.y = level - 8.6; wet.position.z = -80 + (10 - level) * 9;
  boat.position.y = level - 7 + Math.sin(lt * 2) * .4 * amp; boat.rotation.z = Math.sin(lt * 1.6) * .06 * amp;
  const c = ease(lt / ld);
  camera.position.set(lerp(70, 45, c), lerp(26, 18, c), lerp(70, 40, c)); camera.fov = 50;
  camera.lookAt(lerp(10, 18, c), lerp(4, 0, c), -60); camera.updateProjectionMatrix();
  return { tide: Math.round(lerp(100, 33, k)) };
}

// ================= SZENE C: Unterwasser / Riff =================
const reef = new THREE.Scene();
reef.background = new THREE.Color(0x042a44); reef.fog = new THREE.FogExp2(0x063a5a, 0.012);
reef.add(new THREE.HemisphereLight(0x7fd8ff, 0x0a2030, 1.4));
const reefSun = new THREE.DirectionalLight(0xbff0ff, 1.5); reefSun.position.set(30, 100, 20); reef.add(reefSun);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(600, 600, 80, 80), new THREE.MeshStandardMaterial({ color: 0xbfa77a, roughness: 1, flatShading: true }));
floor.rotation.x = -Math.PI / 2; { const p = floor.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, (fbm(p.getX(i) * .02, p.getY(i) * .02, 0, 3) - .5) * 10); floor.geometry.computeVertexNormals(); }
reef.add(floor);
seed = 21;
const coralCols = [0xff5a8a, 0xff8a3a, 0xb04aff, 0xffd23a, 0x3affc8, 0xff3a5a];
const corals = new THREE.Group(); reef.add(corals);
for (let i = 0; i < 140; i++) {
  const col = coralCols[i % coralCols.length], m = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: .25, roughness: .7, flatShading: true });
  const x = (rnd() - .5) * 160, z = -rnd() * 160 + 20, kind = i % 3, g = new THREE.Group();
  if (kind === 0) { for (let b = 0; b < 5; b++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.3, .7, 4 + rnd() * 5, 6), m); c.position.set((rnd() - .5) * 3, 2.5, (rnd() - .5) * 3); c.rotation.set((rnd() - .5) * .8, 0, (rnd() - .5) * .8); g.add(c); } }
  else if (kind === 1) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(2 + rnd() * 3, 1), m); c.scale.y = .6; g.add(c); }
  else { const c = new THREE.Mesh(new THREE.ConeGeometry(2, 6 + rnd() * 6, 7, 1, true), m); c.position.y = 3; g.add(c); }
  g.position.set(x, 0, z); corals.add(g);
}
// Schildkröte aus Primitiven
const turtle = new THREE.Group(); reef.add(turtle);
{ const shellM = new THREE.MeshStandardMaterial({ color: 0x5b7a3a, roughness: .6, flatShading: true }), skinM = new THREE.MeshStandardMaterial({ color: 0x9db36a, roughness: .8 });
  const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(4, 2), shellM); shell.scale.set(1, .38, 1.25); turtle.add(shell);
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.3, 16, 12), skinM); head.position.set(0, .2, 5.6); head.scale.z = 1.3; turtle.add(head);
  turtle.userData.fl = [];
  for (const [x, z, s] of [[-3.6, 2.4, 1], [3.6, 2.4, 1], [-2.8, -3.6, .6], [2.8, -3.6, .6]]) {
    const piv = new THREE.Group(); piv.position.set(x, 0, z);
    const f = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), skinM); f.scale.set(3 * s, .25, 1.2 * s); f.position.x = Math.sign(x) * 2.4 * s;
    piv.add(f); turtle.add(piv); turtle.userData.fl.push(piv);
  } }
// Fischschwarm
const fishes = new THREE.InstancedMesh(new THREE.ConeGeometry(.5, 2, 5).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xffc23a, emissive: 0x553300 }), 60);
reef.add(fishes); const fishOff = Array.from({ length: 60 }, () => [rnd() * 6.28, (rnd() - .5) * 10, (rnd() - .5) * 8, .8 + rnd() * .4]);
// Schwebeteilchen
const snow = makeStars(1500, 120); snow.material.size = 2.5; snow.material.color.set(0xcfefff); snow.material.opacity = .5; reef.add(snow);
const dummy = new THREE.Object3D();
function updateReef(lt, ld) {
  const k = lt / ld;
  turtle.position.set(lerp(-30, 25, k), 12 + Math.sin(lt * 1.3) * 1.2, lerp(-10, -30, k)); turtle.rotation.set(-.1, 1.25, Math.sin(lt) * .08);
  turtle.userData.fl.forEach((f, i) => { f.rotation.z = Math.sin(lt * 3.5 + (i % 2) * Math.PI) * .5 * (i % 2 ? 1 : -1); });
  fishOff.forEach(([ph, y, z, sp], i) => {
    const a = ph + lt * .7 * sp; dummy.position.set(Math.cos(a) * 22, 16 + y + Math.sin(a * 2) * 2, -40 + Math.sin(a) * 14 + z);
    dummy.lookAt(Math.cos(a + .1) * 22, 16 + y, -40 + Math.sin(a + .1) * 14 + z); dummy.updateMatrix(); fishes.setMatrixAt(i, dummy.matrix);
  }); fishes.instanceMatrix.needsUpdate = true;
  snow.rotation.y = lt * .03; snow.position.y = -lt * .8;
  camera.position.set(lerp(-8, 10, k), lerp(9, 13, k), lerp(32, 22, k)); camera.fov = 55;
  camera.lookAt(turtle.position.x * .6, 10, -20); camera.updateProjectionMatrix();
}

// ================= SZENE D: Erde im All (Achse taumelt) =================
const space = new THREE.Scene();
space.add(makeStars(4000, 1800));
const sunL = new THREE.DirectionalLight(0xffffff, 3.2); sunL.position.set(-500, 80, 200); space.add(sunL);
space.add(new THREE.AmbientLight(0x223355, 0.25));
const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('rgba(255,240,200,1)', 'rgba(255,170,60,0)'), blending: THREE.AdditiveBlending, depthWrite: false }));
sunSprite.position.set(-1400, 230, 560); sunSprite.scale.set(600, 600, 1); space.add(sunSprite);
const earthTilt = new THREE.Group(); space.add(earthTilt);
const earthSpin = new THREE.Group(); earthTilt.add(earthSpin);
const earth = new THREE.Mesh(new THREE.SphereGeometry(100, 96, 48), new THREE.MeshStandardMaterial({ map: earthTex, roughness: .75 })); earthSpin.add(earth);
const clouds = new THREE.Mesh(new THREE.SphereGeometry(101.5, 64, 32), new THREE.MeshStandardMaterial({ map: cloudTex, transparent: true, depthWrite: false })); earthSpin.add(clouds);
// Hitze (Nord) / Eis (Süd) Overlay
const climate = new THREE.Mesh(new THREE.SphereGeometry(102.2, 64, 32), new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, uniforms: { heat: { value: 0 }, ice: { value: 0 } },
  vertexShader: `varying vec3 lp; void main(){ lp = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform float heat, ice; varying vec3 lp; void main(){
    float n = smoothstep(.35,.85, lp.y) * heat; float s = smoothstep(-.1,-.6, lp.y) * ice;
    vec3 c = vec3(1.,.38,.05)*n + vec3(.85,.95,1.)*s; gl_FragColor = vec4(c, max(n*.5, s*.8)); }` }));
earthTilt.add(climate);
const atmo = new THREE.Mesh(new THREE.SphereGeometry(110, 64, 32), new THREE.ShaderMaterial({
  side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  vertexShader: `varying vec3 n; varying vec3 v; void main(){ n = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.); v = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
  fragmentShader: `varying vec3 n; varying vec3 v; void main(){ float f = pow(1. - abs(dot(n, v)), 3.); gl_FragColor = vec4(vec3(.35,.6,1.)*f*1.6, f); }` }));
space.add(atmo);
const axis = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 320, 12), new THREE.MeshBasicMaterial({ color: 0xffe02e })); earthTilt.add(axis);
const axisTipN = new THREE.Mesh(new THREE.ConeGeometry(5, 14, 16), new THREE.MeshBasicMaterial({ color: 0xffe02e })); axisTipN.position.y = 166; earthTilt.add(axisTipN);
// Senkrechte Referenzlinie (gestrichelt)
const refLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -170, 0), new THREE.Vector3(0, 170, 0)]), new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 8, gapSize: 6, transparent: true, opacity: .6 }));
refLine.computeLineDistances(); space.add(refLine);
// Ehemalige Mondbahn (gestrichelt)
const orbit = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 200 }, (_, i) => new THREE.Vector3(Math.cos(i / 200 * 6.283) * 330, 0, Math.sin(i / 200 * 6.283) * 330))),
  new THREE.LineDashedMaterial({ color: 0x9fb8ff, dashSize: 10, gapSize: 10, transparent: true, opacity: .55 }));
orbit.computeLineDistances(); orbit.rotation.x = .12; space.add(orbit);

function updateSpace(mode, lt, ld) {
  let tiltDeg;
  if (mode === 'tilt') {
    const k = lt / ld; tiltDeg = 23.4 + Math.sin(lt * 4.5) * (2 + 10 * k * k) + 8 * ease(k);
  } else {
    const k = ease(lt / (ld * .55)); tiltDeg = lerp(30, 84, k) + Math.sin(lt * 3) * 4 * (1 - k * .5);
  }
  const prec = (mode === 'tilt' ? lt : 4 + lt) * 0.35;
  earthTilt.rotation.set(0, prec, THREE.MathUtils.degToRad(tiltDeg));
  earthSpin.rotation.y = (mode === 'tilt' ? lt : lt + 5) * 0.6; clouds.rotation.y = lt * .05;
  climate.material.uniforms.heat.value = mode === 'chaos' ? ease((lt - .6) / 2.2) : 0;
  climate.material.uniforms.ice.value = mode === 'chaos' ? ease((lt - 1.8) / 2.2) : 0;
  orbit.material.opacity = mode === 'tilt' ? .55 : .25;
  if (mode === 'tilt') {
    const k = ease(lt / ld);
    camera.position.set(lerp(150, 60, k), lerp(140, 40, k), lerp(560, 430, k));
  } else {
    const k = ease(lt / ld);
    camera.position.set(lerp(-40, 40, k), lerp(30, -10, k), lerp(380, 330, k));
  }
  camera.fov = 50; camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
  return { tilt: tiltDeg };
}

// ================= HUD / Text =================
const $ = id => document.getElementById(id);
const hud = $('hud'), cap = $('cap'), label = $('label'), flashEl = $('flash'), stage = $('stage'), endEl = $('end');
const phaseSVG = p => { // p: 0..7 Mondphase
  const k = Math.cos(p / 8 * 2 * Math.PI), r = 40, sweep = p < 4 ? 1 : 0;
  return `<svg viewBox="-45 -45 90 90"><circle r="${r}" fill="#1b2233" stroke="#fff" stroke-width="3"/>
    <path d="M0,${-r} A${r},${r} 0 0 ${sweep} 0,${r} A${Math.abs(k * r)},${r} 0 0 ${k > 0 ? 1 - sweep : sweep} 0,${-r}" fill="#f3efdf"/></svg>`;
};
const X = `<svg class="x" viewBox="0 0 100 100"><path d="M15 15L85 85M85 15L15 85" stroke="#e8222c" stroke-width="13" stroke-linecap="round"/></svg>`;

let lastHud = '';
function setHud(kind, data, lt) {
  let html = '';
  if (kind === 'dark') html = `<div class="meter"><div class="row"><span>MONDLICHT</span><span class="val">${data}%</span></div><div class="bar"><i style="width:${data}%"></i></div></div>`;
  if (kind === 'tide') html = `<div class="meter"><div class="row"><span>GEZEITEN</span><span class="val">${data}%</span></div><div class="bar"><i style="width:${data}%"></i></div></div>`;
  if (kind === 'tilt' || kind === 'chaos') html = `<div class="meter"><div class="row"><span>ACHSNEIGUNG</span><span class="val">${data.toFixed(1).replace('.', ',')}°</span></div><div class="bar"><i style="width:${data / 90 * 100}%;background:linear-gradient(90deg,#ffe02e,#e8222c)"></i></div></div>`;
  if (kind === 'rhythm') html = `<div class="meter"><div class="row"><span>MONDKALENDER</span><span class="val">${data}/8</span></div><div id="phases">${[0,1,2,3,4,5,6,7].map(p => `<div>${phaseSVG(p)}${X}</div>`).join('')}</div></div>`;
  if (html !== lastHud) { hud.innerHTML = html; lastHud = html; }
  if (kind === 'rhythm') hud.querySelectorAll('.x').forEach((x, i) => { const v = clamp((lt - 0.6 - i * 0.45) / 0.15); x.style.opacity = v; x.style.transform = `scale(${1.6 - .6 * v})`; });
}

// Untertitel: 1–3 Wörter pro Einblendung
const chunks = [];
for (const s of SEG) {
  let cur = [];
  s.words.forEach((w, i) => {
    cur.push(w);
    const end = /[.,!?]$/.test(w.w) || cur.length === 3 || (cur.length === 2 && w.w.length > 9) || i === s.words.length - 1;
    if (end) { chunks.push(cur); cur = []; }
  });
}
function setCaption(t) {
  const c = chunks.find((c, i) => t >= c[0].s && t < (chunks[i + 1] && chunks[i + 1][0].s - c[c.length - 1].e < .3 ? chunks[i + 1][0].s : c[c.length - 1].e + .25));
  if (!c) { cap.innerHTML = ''; return; }
  const pop = easeOut((t - c[0].s) / 0.12);
  cap.style.transform = `scale(${0.75 + 0.25 * pop})`;
  cap.innerHTML = c.map(w => `<span class="${t >= w.s && t < w.e + .05 ? 'on' : ''}">${w.w.replace(/[.,]$/, '')}</span>`).join(' ');
}

// ================= Hauptfunktion =================
window.renderAt = (t) => {
  let i = SEG.findIndex((s, j) => t < (SEG[j + 1] ? SEG[j + 1].start : Infinity));
  const s = SEG[i], st = i === 0 ? 0 : s.start, en = SEG[i + 1] ? SEG[i + 1].start : TL.duration;
  const lt = t - st, ld = en - st, mode = s.scene;
  let scene, flash = 0, hudKind = null, hudData = null;
  if (mode === 'hook' || mode === 'dark' || mode === 'outro') {
    scene = city; flash = updateCity(t, mode, lt, ld);
    if (mode === 'dark') { hudKind = 'dark'; hudData = Math.round(100 * (1 - ease(lt / 2.5))); }
  } else if (mode === 'tide') { scene = coast; hudKind = 'tide'; hudData = updateCoast(lt, ld).tide; }
  else if (mode === 'rhythm') { scene = reef; updateReef(lt, ld); hudKind = 'rhythm'; hudData = Math.max(0, 8 - Math.floor(clamp((lt - .6) / .45, 0, 8))); }
  else { scene = space; hudKind = mode; hudData = updateSpace(mode, lt, ld).tilt; }

  // Kamera-Shake beim Impact
  if (mode === 'hook' && t > IMPACT) { const a = Math.max(0, 1 - (t - IMPACT) / 0.8) * 0.02; camera.rotation.z += Math.sin(t * 90) * a; camera.rotation.x += Math.cos(t * 77) * a; }
  renderer.render(scene, camera);

  // Schnitt-Punch + Blitz
  const cutK = i === 0 ? 1 : clamp(lt / 0.3);
  stage.style.transform = `scale(${1 + 0.08 * (1 - easeOut(cutK))})`;
  flashEl.style.opacity = Math.max(flash * 0.7, i === 0 ? 0 : (1 - clamp(lt / 0.12)) * 0.45);

  // Label
  label.innerHTML = `<span class="dot"></span>${s.label}`;
  const lk = easeOut(lt / 0.25);
  label.style.transform = `translateX(-50%) scale(${0.6 + 0.4 * lk})`; label.style.opacity = lk;
  label.querySelector('.dot').style.opacity = Math.floor(t * 2) % 2 ? .35 : 1;

  // HUD
  if (hudKind) { setHud(hudKind, hudData, lt); hud.style.opacity = clamp((lt - 0.15) / 0.3); hud.style.transform = `translateY(${(1 - easeOut((lt - .15) / .3)) * -30}px)`; }
  else hud.style.opacity = 0;

  setCaption(t);
  // End-Card
  const ek = mode === 'outro' ? clamp((t - s.end - 0.05) / 0.25) : 0;
  endEl.style.opacity = ek; endEl.style.transform = `scale(${0.7 + 0.3 * easeOut(ek)})`;
  if (ek > 0) cap.style.opacity = 1 - ek; else cap.style.opacity = 1;
};
await document.fonts.load('900 50px M'); await document.fonts.load('800 50px M');
window.READY = true;
