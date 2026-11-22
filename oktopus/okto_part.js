// ---------- Oktopus: Meeresgrund, Riff, Oktopus, Hai, Krabbe ----------
const E = { bank: new THREE.Group() }; const WY = 0, BED = -1.5; // Wasseroberfläche / Flussgrund
const UTIME = { value: 0 };
const riverG = new THREE.Group(); scene.add(riverG);
// Schlamm-Textur
const mudTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#cbb68a'; g.fillRect(0, 0, w, h); const r = rng(31);
  for (let k = 0; k < 2600; k++) { g.globalAlpha = 0.08 + r() * 0.12; g.fillStyle = ['#b8a274', '#dcc89c', '#a8925f', '#e6d6b0'][(r() * 4) | 0]; g.beginPath(); g.ellipse(r() * w, r() * h, 3 + r() * 14, 2 + r() * 8, r() * 3, 0, 7); g.fill(); }
  g.globalAlpha = 0.18; g.strokeStyle = '#a08a5a'; g.lineWidth = 2; for (let y = 0; y < h; y += 22) { g.beginPath(); for (let x = 0; x <= w; x += 8) g.lineTo(x, y + 6 * Math.sin(x * 0.05 + y)); g.stroke(); } g.globalAlpha = 1; });
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
  E.motes = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xe8f6f4, size: 0.018, map: dotTex, transparent: true, opacity: 0.7, depthWrite: false })); scene.add(E.motes); }
// Wasserpflanzen, Steine, Laub
E.plantBase = [];
{ const blade = new THREE.BufferGeometry(); blade.setAttribute('position', new THREE.Float32BufferAttribute([-0.006, 0, 0, 0.006, 0, 0, -0.004, 0.14, 0.015, 0.004, 0.14, 0.015, 0, 0.3, 0.05], 3)); blade.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]); blade.computeVertexNormals();
  const N = 2200, r = rng(5); const im = new THREE.InstancedMesh(blade, new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.8 }), N); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
  for (let i = 0; i < N; i++) { let x, z; do { x = (r() - 0.5) * 12; z = (r() - 0.5) * 12 - 1; } while (Math.hypot(x, z + 0.3) < 1.0 && r() < 0.85); const cl = Math.floor(r() * 30); const ox = Math.cos(cl) * 4.5, oz = Math.sin(cl * 1.7) * 3.5;
    if (r() < 0.6) { x = ox + (r() - 0.5) * 1.2; z = oz + (r() - 0.5) * 1.2; } q.setFromEuler(new THREE.Euler((r() - 0.5) * 0.6, r() * 6.3, (r() - 0.5) * 0.6)); const s = 0.5 + r() * 0.9;
    m4.compose(V(x, bedY(x, z) - 0.02, z), q, V(s, s * (0.8 + r()), s)); im.setMatrixAt(i, m4); E.plantBase.push(m4.clone()); col.setHSL(0.28 + r() * 0.1, 0.5, 0.22 + r() * 0.14); im.setColorAt(i, col); } riverG.add(im); E.plants = im;
  const stoneM = new THREE.MeshStandardMaterial({ color: 0x6a6650, roughness: 0.9, bumpMap: scaleTex, bumpScale: 0.6 }); E.stones = [];
  const st = [[0.55, -0.55, 0.16], [-0.9, -0.9, 0.22], [1.6, 0.6, 0.3], [-2.0, -0.6, 0.35], [0.2, -1.8, 0.25], [-1.3, 1.0, 0.18], [2.4, -1.6, 0.4], [-0.3, 0.9, 0.12]];
  st.forEach(([x, z, s]) => { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 2), stoneM); m.scale.set(s * 1.3, s * 0.7, s); m.position.set(x, bedY(x, z) + s * 0.25, z); m.rotation.y = x * 3; m.castShadow = m.receiveShadow = true; riverG.add(m); E.stones.push(m); });
  const leaf = new THREE.CircleGeometry(0.03, 7); leaf.scale(1, 0.5, 1); leaf.rotateX(-Math.PI / 2); const NL = 700; const lm = new THREE.InstancedMesh(leaf, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, side: THREE.DoubleSide }), NL);
  for (let i = 0; i < NL; i++) { const x = (r() - 0.5) * 10, z = (r() - 0.5) * 10 - 1; m4.compose(V(x, bedY(x, z) + 0.012, z), q.setFromEuler(new THREE.Euler((r() - 0.5) * 0.4, r() * 6.3, 0)), V(1, 1, 1).multiplyScalar(0.7 + r())); lm.setMatrixAt(i, m4); col.setHSL(0.07 + r() * 0.04, 0.5, 0.18 + r() * 0.12); lm.setColorAt(i, col); } riverG.add(lm); }

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
function underwater(murk = 1) { scene.background = new THREE.Color(0x2a6a7c); scene.fog.color.set(0x2a6a7c); scene.fog.near = 0.1; scene.fog.far = lerp(7.5, 2.0, clamp(murk - 1)); if (murk < 1) scene.fog.far = 7.5;
  hemi.color.set(0xd2f0f4); hemi.groundColor.set(0x3a5a50); hemi.intensity = 1.7; sun.color.set(0xfff0c0); sun.intensity = 2.0; sun.position.set(-2, 12, 3); sun.target.position.set(0, BED, 0);
  E.surfM.color.set(0xc8f0f4); E.surfM.emissive.set(0x4a9aa8); E.surfM.opacity = 0.92; E.surfM.side = THREE.BackSide; riverG.visible = true; E.bank.visible = false; sky.visible = false; E.motes.visible = true; (E.caus || []).forEach(u => u.value = 1); }
function above() { scene.background = null; sky.visible = true; skyU.top.value.set(0x8ab0cf); skyU.hor.value.set(0xeae4cc); scene.fog.color.set(0xd6d8c4); scene.fog.near = 12; scene.fog.far = 70;
  hemi.color.set(0xf3ede2); hemi.groundColor.set(0x4a5a2c); hemi.intensity = 1.5; sun.color.set(0xffdcaa); sun.intensity = 3.0; sun.position.set(-14, 14, 12); sun.target.position.set(0, 0, 0);
  E.surfM.color.set(0x6e6c42); E.surfM.emissive.set(0x1a1a0c); E.surfM.opacity = 0.9; E.surfM.side = THREE.FrontSide; riverG.visible = true; E.bank.visible = true; E.motes.visible = false; shaftsUpdate(0, 0); }
function plantHide() { const c = camera.position, Z = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < E.plantBase.length; i++) { const e = E.plantBase[i].elements; const dx = e[12] - c.x, dz = e[14] - c.z; E.plants.setMatrixAt(i, dx * dx + dz * dz < 0.9 ? Z : E.plantBase[i]); } E.plants.instanceMatrix.needsUpdate = true; }
// ---------- Riff mit Spalte ----------
const G = {}; G.REEF = V(-1.4, 0, -1.6); const rockM = new THREE.MeshStandardMaterial({ color: 0x7a7468, roughness: 0.9, bumpMap: scaleTex, bumpScale: 2 });
{ const r = rng(71); const rock = (x, z, sx, sy, sz, seed) => { const g = new THREE.DodecahedronGeometry(1, 2); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const v = V(p.getX(i), p.getY(i), p.getZ(i)); v.multiplyScalar(1 + 0.18 * (fbm(v.x * 2 + seed, v.y * 2, v.z * 2, 2) - 0.5)); p.setXYZ(i, v.x, v.y, v.z); } g.computeVertexNormals();
    const m = new THREE.Mesh(g, rockM); m.scale.set(sx, sy, sz); m.position.set(x, bedY(x, z) + sy * 0.45, z); m.castShadow = m.receiveShadow = true; riverG.add(m); return m; };
  const R = G.REEF; G.rockA = rock(R.x - 0.6, R.z, 0.55, 0.6, 0.7, 1); G.rockB = rock(R.x + 0.6, R.z, 0.55, 0.55, 0.7, 2); // Spalte bei x = R.x
  for (let i = 0; i < 9; i++) rock(R.x + (r() - 0.5) * 4, R.z - 1.2 - r() * 1.5, 0.3 + r() * 0.5, 0.3 + r() * 0.5, 0.3 + r() * 0.5, i + 5);
  // Korallen / Schwämme
  const cm = [0xe8704a, 0xd84a7a, 0xf2b84a, 0x9a5ad8].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 }));
  for (let i = 0; i < 30; i++) { const x = R.x + (r() - 0.5) * 5, z = R.z - 0.5 - r() * 2.5; const g = new THREE.Group(); g.position.set(x, bedY(x, z), z); const m = cm[(r() * 4) | 0];
    for (let k = 0; k < 5; k++) { const h = 0.1 + r() * 0.25; const c = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, h, 7), m); c.position.set((r() - 0.5) * 0.12, h / 2, (r() - 0.5) * 0.12); c.rotation.set((r() - 0.5) * 0.6, 0, (r() - 0.5) * 0.6); g.add(c); const t = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), m); t.position.copy(c.position).add(V(0, h / 2, 0)); g.add(t); } riverG.add(g); } }
// ---------- Oktopus ----------
const mottle = canvasTex(256, 256, (g, w, h) => { const im = g.createImageData(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = 150 + 105 * (fbm(x / 18, y / 18, 1, 4) - 0.5) * 2.2; const i = (y * w + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = clamp(v, 0, 255); im.data[i + 3] = 255; } g.putImageData(im, 0, 0); });
mottle.wrapS = mottle.wrapT = THREE.RepeatWrapping; mottle.repeat.set(2, 2);
const papT = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); const r = rng(8); for (let k = 0; k < 260; k++) { const x = r() * w, y = r() * h, rr = 2 + r() * 7; const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, '#fff'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); } });
papT.wrapS = papT.wrapT = THREE.RepeatWrapping; papT.repeat.set(3, 3);
const oktM = new THREE.MeshPhysicalMaterial({ color: 0xe8703c, map: mottle, bumpMap: papT, bumpScale: 0.6, roughness: 0.45, clearcoat: 0.4, side: THREE.DoubleSide });
function makeOkto() { const o = { root: new THREE.Group() }; scene.add(o.root);
  o.mantle = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 22), oktM); o.mantle.castShadow = true; o.root.add(o.mantle);
  o.headG = new THREE.Group(); o.root.add(o.headG); const hd = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), oktM); hd.scale.set(0.12, 0.1, 0.11); o.headG.add(hd);
  o.eyes = [-1, 1].map(s => { const g = new THREE.Group(); g.position.set(s * 0.1, 0.04, 0.03); o.headG.add(g); const ball = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), new THREE.MeshPhysicalMaterial({ color: 0xf0e6a8, roughness: 0.1, clearcoat: 1 })); g.add(ball);
    const pup = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.012, 0.045), new THREE.MeshBasicMaterial({ color: 0x050505 })); pup.position.x = s * 0.03; pup.rotation.y = Math.PI / 2; pup.scale.set(1, 1, 1); g.add(pup); const lid = new THREE.Mesh(new THREE.SphereGeometry(0.038, 16, 8, 0, Math.PI * 2, 0, 1.2), oktM); g.add(lid); return g; });
  o.beak = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.05, 8), new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.3 })); o.beak.rotation.x = Math.PI; o.beak.position.set(0, -0.08, 0.0); o.headG.add(o.beak);
  o.arms = []; for (let k = 0; k < 8; k++) { const m = new THREE.Mesh(new THREE.BufferGeometry(), oktM); m.castShadow = true; m.frustumCulled = false; o.root.add(m); o.arms.push(m); }
  o.NS = 8 * 16; o.suck = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: 0xf2d2c0, roughness: 0.6 }), o.NS); o.suck.frustumCulled = false; o.root.add(o.suck);
  // Röntgen: drei Herzen + blaue Adern
  o.hearts = [0, 1, 2].map(k => { const h = new THREE.Mesh(new THREE.SphereGeometry(k === 0 ? 0.04 : 0.026, 16, 12), new THREE.MeshStandardMaterial({ color: 0xd2202c, emissive: 0x500008, roughness: 0.35 })); o.root.add(h); return h; });
  o.veins = []; for (let k = 0; k < 8; k++) { const m = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ color: 0x2a6aff, emissive: 0x0a2a8a, roughness: 0.4 })); m.frustumCulled = false; o.root.add(m); o.veins.push(m); }
  o.NBD = 80; o.blood = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0x4a9aff }), o.NBD); o.blood.frustumCulled = false; o.root.add(o.blood);
  o.curves = []; return o; }
// Pose: armFn(k, u) liefert lokale Punkte; Standard = Arme sternförmig am Boden
function poseOkto(o, { pos = V(0, 0, 0), yaw = 0, T = 0, mode = 'sit', squeeze = 0, camo = 0, xray = 0, flow = 0, armLen = null, targets = null, eye = 1, vis = true, wob = 0, mantleP = null } = {}) {
  o.root.visible = vis; if (!vis) return; o.root.position.copy(pos); o.root.rotation.set(0, yaw, 0);
  oktM.color.set(0xe8703c).lerp(new THREE.Color(0xb8a888), camo); oktM.bumpScale = lerp(0.6, 6, camo); oktM.map.repeat.set(lerp(2, 5, camo), lerp(2, 5, camo));
  const sq = lerp(1, 0.32, squeeze), wb = 1 + wob * 0.08 * Math.sin(T * 9);
  const jet = mode === 'jet'; const hy = jet ? 0.12 : 0.13;
  o.headG.position.set(0, hy, jet ? 0.05 : 0.04); o.headG.scale.set(sq, 1, 1);
  if (jet) { o.mantle.position.set(0, hy + 0.02, 0.24); o.mantle.rotation.set(Math.PI / 2, 0, 0); o.mantle.scale.set(0.13 * sq, 0.25, 0.12); }
  else { o.mantle.position.set(0, hy + 0.14, -0.1); o.mantle.rotation.set(mantleP === null ? -0.6 : mantleP, 0, 0); o.mantle.scale.set(0.14 * sq * wb, 0.2 / wb, 0.15 * sq); }
  oktM.transparent = xray > 0; oktM.opacity = 1 - 0.7 * xray; oktM.depthWrite = xray < 0.5;
  o.eyes.forEach((e, s) => { e.children[2].scale.y = 1; e.children[2].rotation.x = lerp(-1.6, 0, 1 - eye) - 0.2; });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), Z = new THREE.Matrix4().makeScale(0, 0, 0); o.curves = [];
  for (let k = 0; k < 8; k++) { const a = (k + 0.5) / 8 * Math.PI * 2; const ca = Math.cos(a), sa = Math.sin(a); const L = (armLen && armLen[k] !== undefined ? armLen[k] : 1) * 0.75; const pts = [];
    for (let j = 0; j <= 8; j++) { const u = j / 8; let p;
      if (targets && targets[k]) { const b = V(ca * 0.08, hy - 0.06, sa * 0.08); const t = targets[k].clone().sub(pos).applyAxisAngle(V(0, 1, 0), -yaw); p = b.clone().lerp(t, u); p.y += Math.sin(u * Math.PI) * 0.12; p.x += Math.sin(u * 7 + T * 3 + k) * 0.015; }
      else if (jet) { const sp = 0.06 + u * 0.12; p = V(ca * sp * sq, hy - 0.02 + sa * sp * 0.6, -u * L * 1.2 - 0.02); p.x += Math.sin(u * 6 - T * 8 + k) * 0.02 * u; }
      else { const r = 0.08 + u * L * sq; const curl = u > 0.75 ? (u - 0.75) * 4 : 0; p = V(ca * r * (1 - 0.25 * curl), (hy - 0.08) * (1 - u) * (1 - u) + 0.015 + curl * 0.06 * (0.5 + 0.5 * Math.sin(T * 2 + k)), sa * r * (1 - 0.25 * curl)); p.x += -sa * Math.sin(u * 5 + T * 1.6 + k) * 0.04 * u; p.z += ca * Math.sin(u * 5 + T * 1.6 + k) * 0.04 * u; }
      pts.push(p); }
    const c = new THREE.CatmullRomCurve3(pts); o.curves.push(c); const g = new THREE.TubeGeometry(c, 40, 1, 8, false); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const kk = Math.floor(i / 9) / 40; const cp = c.getPoint(kk); const rr = lerp(0.032, 0.004, Math.pow(kk, 0.8)) * (kk < 0.02 && L < 0.3 ? 0.9 : 1); p.setXYZ(i, cp.x + (p.getX(i) - cp.x) * rr, cp.y + (p.getY(i) - cp.y) * rr, cp.z + (p.getZ(i) - cp.z) * rr); }
    g.computeVertexNormals(); o.arms[k].geometry.dispose(); o.arms[k].geometry = g;
    for (let j = 0; j < 16; j++) { const u = 0.1 + j / 16 * 0.85; const cp = c.getPoint(u); const s = lerp(0.012, 0.003, u); m4.compose(cp.clone().add(V(0, -0.012 * (1 - u), 0)), q, V(s, s * 0.5, s)); o.suck.setMatrixAt(k * 16 + j, m4); } }
  o.suck.instanceMatrix.needsUpdate = true;
  const show = xray > 0.01; o.hearts.forEach(h => h.visible = show); o.veins.forEach(v => v.visible = show); o.blood.visible = show && flow > 0;
  if (show) { const mc = o.mantle.position; o.hearts[0].position.copy(mc).add(V(0, -0.02, 0.0)); o.hearts[1].position.copy(mc).add(V(-0.07, -0.05, 0.03)); o.hearts[2].position.copy(mc).add(V(0.07, -0.05, 0.03)); o.hearts.forEach((h, k) => h.scale.setScalar(1 + 0.18 * Math.max(0, Math.sin(T * 7 + k * 1.3))));
    for (let k = 0; k < 8; k++) { const pts = [mc.clone(), ...o.curves[k].getPoints(6).slice(1, 6)]; o.veins[k].geometry.dispose(); o.veins[k].geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.008, 5, false); }
    for (let i = 0; i < o.NBD; i++) { const k = i % 8; const u = ((i / o.NBD) * 3 + T * 0.5) % 1; const pts = [mc.clone(), ...o.curves[k].getPoints(6).slice(1, 6)]; const c = new THREE.CatmullRomCurve3(pts); m4.compose(c.getPoint(u), q, V(0.012, 0.012, 0.012)); o.blood.setMatrixAt(i, m4); } o.blood.instanceMatrix.needsUpdate = true; } }
const okto = makeOkto(); const armTip = (k) => { okto.root.updateMatrixWorld(true); return okto.curves[k].getPoint(1).applyMatrix4(okto.root.matrixWorld); };
const oktoHead = () => { okto.root.updateMatrixWorld(true); return okto.headG.getWorldPosition(V(0, 0, 0)); };
// ---------- Hai ----------
function makeShark() { const s = { root: new THREE.Group() }; scene.add(s.root); const m = new THREE.MeshStandardMaterial({ color: 0x6a7a86, roughness: 0.5 }), bm = new THREE.MeshStandardMaterial({ color: 0xe4e6e2, roughness: 0.6 });
  const g = new THREE.SphereGeometry(1, 32, 20); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i); const t = (z + 1) / 2; const k = Math.sin(Math.PI * Math.pow(t, 0.8)) * (t > 0.85 ? 1 : 1); p.setX(i, p.getX(i) * (0.35 + 0.65 * k)); p.setY(i, p.getY(i) * (0.4 + 0.6 * k)); } g.computeVertexNormals();
  const body = new THREE.Mesh(g, m); body.scale.set(0.28, 0.32, 1.1); body.castShadow = true; s.root.add(body); const bel = new THREE.Mesh(g, bm); bel.scale.set(0.27, 0.3, 1.08); bel.position.y = -0.03; s.root.add(bel);
  const fin = (w, h, x, y, z, rx, rz) => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(w, 0); sh.quadraticCurveTo(w * 0.2, h * 0.3, -w * 0.3, h); sh.lineTo(0, 0); const f = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshStandardMaterial({ color: 0x5e6e7a, side: THREE.DoubleSide, roughness: 0.5 })); f.position.set(x, y, z); f.rotation.set(rx, Math.PI / 2, rz); s.root.add(f); return f; };
  fin(0.4, 0.42, 0, 0.26, 0.15, 0, 0); s.pecs = [fin(0.35, 0.4, 0.22, -0.12, 0.35, Math.PI / 2 + 0.5, 0), fin(0.35, 0.4, -0.22, -0.12, 0.35, Math.PI / 2 - 0.5, Math.PI)];
  s.tail = new THREE.Group(); s.tail.position.z = -1.05; s.root.add(s.tail); const tf = new THREE.Shape(); tf.moveTo(0, 0); tf.lineTo(-0.15, 0.5); tf.lineTo(-0.05, 0.05); tf.lineTo(-0.1, -0.3); tf.lineTo(0, 0); const t = new THREE.Mesh(new THREE.ShapeGeometry(tf), new THREE.MeshStandardMaterial({ color: 0x5e6e7a, side: THREE.DoubleSide })); t.rotation.y = Math.PI / 2; t.scale.setScalar(1.4); s.tail.add(t);
  for (const sg of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshBasicMaterial({ color: 0x050505 })); e.position.set(sg * 0.16, 0.06, 0.78); s.root.add(e); }
  return s; }
const shark = makeShark(); function poseShark(s, { pos, yaw = 0, T = 0, vis = true, turn = 0 }) { s.root.visible = vis; if (!vis) return; s.root.position.copy(pos); s.root.rotation.set(0, yaw + Math.sin(T * 3) * 0.06, turn); s.tail.rotation.y = Math.sin(T * 6) * 0.4; }
// ---------- Krabbe ----------
function makeCrab() { const c = { root: new THREE.Group() }; scene.add(c.root); const m = new THREE.MeshStandardMaterial({ color: 0xc8402a, roughness: 0.45, bumpMap: scaleTex, bumpScale: 0.5 });
  const b = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14), m); b.scale.set(0.13, 0.05, 0.1); b.position.y = 0.07; b.castShadow = true; c.root.add(b); c.legs = [];
  for (const s of [-1, 1]) { for (let k = 0; k < 3; k++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.005, 0.15, 5), m); l.position.set(s * 0.14, 0.05, -0.04 + k * 0.04); l.rotation.set(0, 0, s * 1.0); c.root.add(l); c.legs.push(l); }
    const cl = new THREE.Group(); cl.position.set(s * 0.1, 0.07, 0.1); c.root.add(cl); const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.08, 6), m); arm.rotation.set(1.2, 0, s * 0.5); cl.add(arm); const pin = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), m); pin.scale.set(0.025, 0.02, 0.045); pin.position.set(s * 0.02, 0.01, 0.06); cl.add(pin);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.04, 4), m); st.position.set(s * 0.03, 0.12, 0.08); c.root.add(st); const ey = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 6), new THREE.MeshBasicMaterial({ color: 0x080808 })); ey.position.set(s * 0.03, 0.145, 0.08); c.root.add(ey); }
  return c; }
const crab = makeCrab(); function poseCrab(c, { pos, yaw = 0, T = 0, walk = 0, vis = true, roll = 0 }) { c.root.visible = vis; if (!vis) return; c.root.position.copy(pos); c.root.rotation.set(0, yaw, roll); c.legs.forEach((l, k) => l.rotation.x = Math.sin(T * 14 + k) * 0.4 * walk); }
// ---------- Tinte ----------
const NI = 260; E.ink = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshStandardMaterial({ color: 0x14121a, roughness: 1, transparent: true, opacity: 0.85 }), NI); E.ink.frustumCulled = false; scene.add(E.ink);
function inkSet(c, k, dir) { E.ink.visible = k > 0; if (k <= 0) return; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), r = rng(5); for (let i = 0; i < NI; i++) { const d = V(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(Math.pow(r(), 0.5) * 0.6 * k); const p = c.clone().add(d).addScaledVector(dir, k * 0.3 * r()); const s = (0.05 + r() * 0.12) * Math.min(1, k * 2.5); m4.compose(p, q, V(s, s, s)); E.ink.setMatrixAt(i, m4); } E.ink.instanceMatrix.needsUpdate = true; }
