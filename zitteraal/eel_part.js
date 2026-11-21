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
