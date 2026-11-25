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
