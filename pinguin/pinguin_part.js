// ---------- Kaiserpinguin: Antarktis-Eis, Schneesturm, Kolonie, Ei, Küken ----------
const G = {}; world.visible = false; GRASS.visible = false;
const ice = new THREE.Group(); scene.add(ice);
const M = (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.7 }, o));
// Schnee-Boden
const snowTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#eef3f8'; g.fillRect(0, 0, w, h); const r = rng(9); for (let k = 0; k < 2500; k++) { g.globalAlpha = 0.08 + r() * 0.12; g.fillStyle = ['#c8d6e6', '#ffffff', '#b8c8dc', '#dde8f2'][(r() * 4) | 0]; g.beginPath(); g.ellipse(r() * w, r() * h, 3 + r() * 16, 1 + r() * 4, 0.3, 0, 7); g.fill(); } g.globalAlpha = 1; });
snowTex.wrapS = snowTex.wrapT = THREE.RepeatWrapping; snowTex.repeat.set(120, 120); snowTex.colorSpace = THREE.SRGBColorSpace;
const iceM = M(0xcfe4f4, { roughness: 0.35, metalness: 0.05, flatShading: true, emissive: 0x1a3048, emissiveIntensity: 0.25 });
// Schneewehen (flache Hügel)
{ const r = rng(5); for (let k = 0; k < 40; k++) { const d = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), M(0xeaf1f8, { roughness: 0.9 })); const a = r() * 6.28, R = 8 + r() * 40; d.position.set(Math.cos(a) * R, -0.2, Math.sin(a) * R - 5); d.scale.set(2 + r() * 5, 0.4 + r() * 0.5, 1 + r() * 2.5); d.rotation.y = r() * 3; d.receiveShadow = true; ice.add(d); } }
// Eisberge / Eisklippen im Hintergrund
function berg(x, z, s, seed) { const r = rng(seed); const g = new THREE.IcosahedronGeometry(1, 2); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const v = V(p.getX(i), p.getY(i), p.getZ(i)); const n = 0.75 + 0.5 * fbm(v.x * 1.3 + seed, v.y * 1.3, v.z * 1.3); v.multiplyScalar(n); if (v.y > 0.3) v.y = 0.3 + (v.y - 0.3) * 0.35; p.setXYZ(i, v.x, Math.max(-0.3, v.y), v.z); } g.computeVertexNormals();
  const m = new THREE.Mesh(g, iceM); m.position.set(x, s * 0.25, z); m.scale.set(s * (1.2 + r()), s * (0.9 + r() * 0.6), s * (0.8 + r() * 0.5)); m.rotation.y = r() * 6; ice.add(m); return m; }
[[-40, -70, 14], [-10, -90, 20], [25, -75, 12], [55, -95, 22], [-70, -50, 16], [70, -45, 10], [-30, 60, 14], [40, 70, 18], [0, 95, 20], [-85, 20, 18], [85, 15, 16]].forEach(([x, z, s], k) => berg(x, z, s, k + 3));
// offenes Meer (weit hinten, für Weg zum Fressen)
G.sea = new THREE.Mesh(new THREE.PlaneGeometry(400, 120), M(0x16324a, { roughness: 0.15, metalness: 0.3 })); G.sea.rotation.x = -Math.PI / 2; G.sea.position.set(0, 0.01, -110); ice.add(G.sea);
// Schneeflocken / Sturm
G.snow = (() => { const N = 4000, r = rng(11); const pos = new Float32Array(N * 3), base = []; for (let i = 0; i < N; i++) base.push([(r() - 0.5) * 24, r() * 8, (r() - 0.5) * 24, r()]); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ map: dotTex, size: 0.06, transparent: true, depthWrite: false, opacity: 0.9, color: 0xffffff })); pts.frustumCulled = false; scene.add(pts); pts.userData.base = base; return pts; })();
function snowAt(T, c, wind = 1, amt = 1) { const p = G.snow.geometry.attributes.position, b = G.snow.userData.base; G.snow.visible = amt > 0; G.snow.material.opacity = 0.9 * amt; G.snow.material.size = 0.05 + 0.03 * wind;
  for (let i = 0; i < b.length; i++) { const [x0, y0, z0, s] = b[i]; const x = ((x0 + T * (1.5 + 5 * wind) * (0.7 + s * 0.6) + 12) % 24 + 24) % 24 - 12; const y = ((y0 - T * (0.6 + s * 0.5)) % 8 + 8) % 8; p.setXYZ(i, c.x + x, y, c.z + z0 + Math.sin(T * 2 + s * 9) * 0.2 * wind); } p.needsUpdate = true; }
// ---------- Pinguin ----------
function vcol(g, f) { const p = g.attributes.position, n = p.count, c = new Float32Array(n * 3), col = new THREE.Color(); for (let i = 0; i < n; i++) { f(p.getX(i), p.getY(i), p.getZ(i), col); c.set([col.r, col.g, col.b], i * 3); } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); }
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const C = h => new THREE.Color(h);
const cBack = C(0x1e232d), cWhite = C(0xf6f6f2), cYel = C(0xf6dc8c), cOra = C(0xf2a028), cGrey = C(0xa8adb4), cDark = C(0x15171c);
const bodyG = (() => { const g = new THREE.SphereGeometry(1, 40, 28); const p = g.attributes.position; const cols = []; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const w = 1 + 0.18 * (-y) - 0.42 * Math.max(0, y) ** 2.2; const fz = z > 0 ? 1.12 : 1; p.setXYZ(i, x * 0.3 * w, y * 0.5, z * 0.27 * w * fz); }
  g.computeVertexNormals(); vcol(g, (x, y, z, c) => { const X = x / 0.3, Z = z / 0.3, Y = y / 0.5; const f = sm(-0.05, 0.3, Z - Math.abs(X) * 0.35); c.copy(cBack).lerp(cWhite, f); if (f > 0.2) c.lerp(cYel, sm(0.35, 0.85, Y) * f * 0.85); }); return g; })();
const headG = (() => { const g = new THREE.SphereGeometry(1, 28, 20); vcol(g, (x, y, z, c) => { c.copy(cDark); const ear = sm(0.45, 0.75, Math.abs(x)) * sm(0.5, -0.1, y) * sm(0.45, 0.0, z); c.lerp(cOra, ear); const thr = sm(-0.45, -0.85, y) * sm(0.0, 0.5, z); c.lerp(cYel, thr * 0.7); }); g.scale(0.15, 0.135, 0.16); return g; })();
const flipG = (() => { const g = new THREE.SphereGeometry(1, 16, 12); g.scale(0.032, 0.27, 0.085); g.translate(0, -0.25, 0); vcol(g, (x, y, z, c) => c.copy(cBack).lerp(cWhite, sm(-0.01, -0.03, x) * 0.0)); return g; })();
const penM = M(0xffffff, { vertexColors: true, roughness: 0.55 }), beakM = M(0x16161a, { roughness: 0.3 }), mandM = M(0xff8a4a, { roughness: 0.4, emissive: 0x6a2000, emissiveIntensity: 0.3 }), eyeM = M(0x050505, { roughness: 0.05 }), glM = M(0xffffff, { emissive: 0xffffff, emissiveIntensity: 1 }), footM = M(0x2a2a30, { roughness: 0.8 });
const eggM = M(0xf2ede0, { roughness: 0.6 }), pouchM = M(0xc9c4bc, { roughness: 0.9 });
function makePeng({ s = 1 } = {}) { const m = { root: new THREE.Group(), s }; scene.add(m.root);
  m.rock = new THREE.Group(); m.root.add(m.rock); m.bodyM = new THREE.Mesh(bodyG, penM); m.bodyM.position.y = 0.52; m.bodyM.castShadow = true; m.rock.add(m.bodyM);
  m.neck = new THREE.Group(); m.neck.position.set(0, 0.9, 0.06); m.rock.add(m.neck); m.head = new THREE.Group(); m.head.position.set(0, 0.15, 0.03); m.neck.add(m.head);
  const hd = new THREE.Mesh(headG, penM); hd.castShadow = true; m.head.add(hd);
  const bk = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.24, 12), beakM); bk.geometry.translate(0, 0.12, 0); bk.rotation.x = Math.PI / 2 + 0.25; bk.position.set(0, -0.01, 0.13); m.head.add(bk); m.beak = bk;
  const md = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.13, 10), mandM); md.geometry.translate(0, 0.065, 0); md.rotation.x = Math.PI / 2 + 0.38; md.position.set(0, -0.03, 0.125); m.head.add(md); m.mand = md;
  for (const sg of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.017, 10, 8), eyeM); e.position.set(sg * 0.09, 0.035, 0.1); m.head.add(e); const gl = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 6, 4), glM); gl.position.set(sg * 0.093, 0.042, 0.115); m.head.add(gl); }
  m.flips = [-1, 1].map(sg => { const f = new THREE.Group(); f.position.set(sg * 0.285, 0.8, -0.02); m.rock.add(f); const fm = new THREE.Mesh(flipG, M(0x1e232d, { roughness: 0.5 })); fm.castShadow = true; f.add(fm); f.userData.sg = sg; return f; });
  m.feet = [-1, 1].map(sg => { const f = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), footM); f.scale.set(0.065, 0.025, 0.1); f.position.set(sg * 0.09, 0.02, 0.08); m.root.add(f); return f; });
  m.egg = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), eggM); m.egg.scale.set(0.06, 0.055, 0.08); m.egg.position.set(0, 0.095, 0.12); m.root.add(m.egg);
  m.pouch = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), pouchM); m.pouch.position.set(0, 0.2, 0.08); m.rock.add(m.pouch);
  return m; }
// pose: waddle (Phase), wk (Stärke), flap, headP (+ = runter), headY, call (Schnabel hoch), thin (0..1), egg, pouch (0..1), shiver, frost
function posePeng(m, { pos, yaw = 0, waddle = 0, wk = 0, flap = 0, headP = 0, headY = 0, call = 0, thin = 0, egg = false, pouch = 0, shiver = 0, vis = true, T = 0, frost = 0 } = {}) { m.root.visible = vis; if (!vis) return;
  m.root.position.copy(pos); m.root.rotation.set(0, yaw, 0); m.root.scale.setScalar(m.s); const sh = shiver * 0.03 * Math.sin(T * 60);
  m.rock.rotation.set(0, 0, Math.sin(waddle) * 0.13 * wk + sh); m.rock.position.set(sh * 0.3, Math.abs(Math.sin(waddle)) * 0.03 * wk, 0);
  m.bodyM.scale.set(1 - 0.22 * thin, 1 - 0.04 * thin, 1 - 0.28 * thin);
  m.neck.rotation.set(headP - call * 0.9, headY, 0); m.head.rotation.set(-call * 0.35, 0, 0); m.mand.rotation.x = Math.PI / 2 + 0.42 + call * 0.25 * Math.max(0, Math.sin(T * 14));
  m.flips.forEach(f => { const sg = f.userData.sg; f.rotation.set(0, 0, sg * (0.12 + flap * (0.6 + 0.4 * Math.sin(T * 18))) + sg * Math.sin(waddle) * 0.08 * wk); });
  m.feet.forEach((f, k) => { f.position.y = 0.02 + Math.max(0, Math.sin(waddle + k * Math.PI)) * 0.03 * wk; });
  m.egg.visible = egg; m.pouch.visible = pouch > 0.01; m.pouch.scale.set(0.2, 0.15 * pouch, 0.17); m.pouch.rotation.x = Math.PI; m.pouch.position.set(0, 0.25, 0.1 + 0.03 * pouch);
  m.bodyM.material = frost > 0 ? frostM : penM; }
const frostM = M(0xffffff, { vertexColors: true, roughness: 0.8, emissive: 0x4a6a9a, emissiveIntensity: 0.35 });
const headW = m => { m.root.updateMatrixWorld(true); return m.head.getWorldPosition(V(0, 0, 0)); };
// Küken (graue Daunen, schwarzer Kopf, weiße Maske)
const chickHeadG = (() => { const g = new THREE.SphereGeometry(1, 20, 14); vcol(g, (x, y, z, c) => { c.copy(cDark); c.lerp(cWhite, sm(0.2, 0.55, z) * sm(0.55, 0.1, y) * sm(-0.75, -0.3, y)); c.lerp(cWhite, sm(0.6, 0.8, Math.abs(x)) * sm(0.2, -0.3, y) * 0.0); }); g.scale(0.085, 0.08, 0.085); return g; })();
function makeChick() { const c = { root: new THREE.Group() }; scene.add(c.root); const b = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), M(0xa9adb3, { roughness: 1 })); b.scale.set(0.12, 0.14, 0.12); b.position.y = 0.13; b.castShadow = true; c.root.add(b);
  c.neck = new THREE.Group(); c.neck.position.set(0, 0.25, 0.02); c.root.add(c.neck); const h = new THREE.Mesh(chickHeadG, M(0xffffff, { vertexColors: true, roughness: 0.8 })); h.position.y = 0.05; c.neck.add(h);
  const bk = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.08, 8), beakM); bk.geometry.translate(0, 0.04, 0); bk.rotation.x = Math.PI / 2 + 0.2; bk.position.set(0, 0.04, 0.07); c.neck.add(bk);
  for (const sg of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), eyeM); e.position.set(sg * 0.035, 0.07, 0.07); c.neck.add(e); }
  for (const sg of [-1, 1]) { const f = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), M(0x9aa0a8)); f.scale.set(0.02, 0.08, 0.04); f.position.set(sg * 0.12, 0.15, 0); f.rotation.z = sg * 0.4; c.root.add(f); }
  return c; }
function poseChick(c, { pos, yaw = 0, k = 1, beg = 0, T = 0, vis = true }) { c.root.visible = vis && k > 0.01; if (!c.root.visible) return; c.root.position.copy(pos); c.root.rotation.set(0, yaw, 0); c.root.scale.setScalar(k); c.neck.rotation.set(-beg * (0.6 + 0.15 * Math.sin(T * 10)), 0, 0); }
// Eierschalen-Hälften (Schlüpfen)
G.shell = new THREE.Group(); scene.add(G.shell); for (const sg of [-1, 1]) { const h = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), M(0xf2ede0, { side: THREE.DoubleSide })); h.scale.set(0.06, 0.05 * sg, 0.08); G.shell.add(h); G.shell.userData[sg] = h; }
// Kolonie
const male = makePeng({ s: 1 }), fem = makePeng({ s: 0.97 }), chick = makeChick();
const crowd = []; { const r = rng(21); const pts = []; for (let ring = 0; ring < 5; ring++) { const n = ring === 0 ? 1 : ring * 6; for (let k = 0; k < n; k++) { const a = k / n * 6.283 + ring * 0.4; const R = ring * 0.44; pts.push([Math.cos(a) * R + (r() - 0.5) * 0.08, Math.sin(a) * R + (r() - 0.5) * 0.08, r()]); } }
  for (const [x, z, q] of pts) { const p = makePeng({ s: 0.94 + q * 0.1 }); p.base = V(x, 0, z); p.q = q; crowd.push(p); } }
G.HC = V(0, 0, -1.5); // Zentrum des Huddles
function crowdPose(T, { center = G.HC, spin = 0, skip = -1, vis = true, wk = 0, call = 0, spread = 1 } = {}) { crowd.forEach((p, k) => { if (!vis || k === skip) { posePeng(p, { vis: false }); return; } const b = p.base.clone().multiplyScalar(spread).applyAxisAngle(V(0, 1, 0), spin * (p.base.length() > 1 ? 1 : -0.6)); const pos = center.clone().add(b);
  posePeng(p, { pos, yaw: Math.atan2(-b.x, -b.z) * 0.25 + (p.q - 0.5) * 0.6, waddle: T * 5 + k, wk: wk * (0.4 + p.q * 0.6), headP: Math.sin(T * 0.7 + k) * 0.1, call: call * (p.q > 0.55 ? 1 : 0), T }); }); }
function mood(m) { const P = { night: [0x0e1a36, 0x5a7aa6, 0xc8dcff, 1.6, 1.3, 0x5a7090], storm: [0x2a3a58, 0x9ab0c8, 0xd8e6ff, 1.2, 1.6, 0x9aacc4], dawn: [0x3a5a9a, 0xf0b8a0, 0xffd0a0, 2.6, 1.4, 0xd8c0c0], day: [0x5a8ad0, 0xdce8f4, 0xfff4e0, 3.0, 1.5, 0xdce6f0] }[m];
  skyU.top.value.set(P[0]); skyU.hor.value.set(P[1]); sun.color.set(P[2]); sun.intensity = P[3]; hemi.intensity = P[4]; hemi.color.set(0xdfe8ff); hemi.groundColor.set(0x8a9ab0); scene.fog.color.set(P[5]); }
ground.material.map = snowTex; ground.material.roughness = 0.85; ground.material.needsUpdate = true;
