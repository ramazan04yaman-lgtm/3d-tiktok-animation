// ---------- Hof-Welt: Weide, Stall, Zäune, Waldrand ----------
world.children.forEach(c => { if (c !== GRASS) c.visible = false; });
const G = {}; const farm = new THREE.Group(); scene.add(farm);
const M = (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.8 }, o));
const box = (w, h, d, m, x, y, z, parent = farm) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; parent.add(b); return b; };
const cyl = (r0, r1, h, m, x, y, z, seg = 12, parent = farm) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), m); c.position.set(x, y, z); c.castShadow = c.receiveShadow = true; parent.add(c); return c; };
const plankTex = (base) => canvasTex(256, 256, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); const r = rng(5); for (let x = 0; x < w; x += 32) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x, 0, 3, h); }
  for (let i = 0; i < 200; i++) { g.strokeStyle = `rgba(0,0,0,${0.05 + r() * 0.08})`; g.beginPath(); const x = r() * w; g.moveTo(x, 0); g.lineTo(x + (r() - .5) * 6, h); g.stroke(); } });
const redM = M(0xffffff, { map: plankTex('#a3241e') }); const whiteM = M(0xf2efe8); const roofM = M(0x3e3a38, { roughness: 0.7 }); const postM = M(0x6b4a2e, { roughness: 0.9 });
const strawTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#c9a24a'; g.fillRect(0, 0, w, h); const r = rng(8); for (let i = 0; i < 1600; i++) { g.strokeStyle = r() < .5 ? 'rgba(240,210,120,0.7)' : 'rgba(150,110,40,0.6)'; g.lineWidth = 1.5; g.beginPath(); const x = r() * w, y = r() * h, a = r() * 6.28; g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14); g.stroke(); } }); strawTex.repeat.set(4, 4);
// Stall (offene Vorderseite für Innenaufnahmen, Tor als zwei Flügel)
{ const b = new THREE.Group(); b.position.set(-5, 0, -4); farm.add(b); G.barn = b; const W = 6, D = 5, H = 3.2;
  const wall = (w, h, x, z, ry) => { const m = box(w, h, 0.12, redM, x, h / 2, z, b); m.rotation.y = ry; m.material = redM; return m; };
  wall(W, H, 0, -D / 2, 0); wall(D, H, -W / 2, 0, Math.PI / 2); wall(D, H, W / 2, 0, Math.PI / 2); wall(1.6, H, -W / 2 + 0.8, D / 2, 0); wall(1.6, H, W / 2 - 0.8, D / 2, 0); box(2.8, 0.7, 0.12, redM, 0, H - 0.35, D / 2, b);
  const gable = new THREE.Shape(); gable.moveTo(-W / 2, 0); gable.lineTo(W / 2, 0); gable.lineTo(0, 1.8); gable.lineTo(-W / 2, 0);
  for (const z of [-D / 2, D / 2]) { const gm = new THREE.Mesh(new THREE.ExtrudeGeometry(gable, { depth: 0.12, bevelEnabled: false }), redM); gm.position.set(0, H, z - 0.06); gm.castShadow = true; b.add(gm); }
  for (const s of [-1, 1]) { const r = box(3.6, 0.1, D + 0.6, roofM, s * 1.55, H + 0.92, 0, b); r.rotation.z = -s * Math.atan2(1.8, W / 2); }
  G.doors = [-1, 1].map(s => { const piv = new THREE.Group(); piv.position.set(s * 1.4, 0, D / 2 + 0.07); b.add(piv); const d = box(1.4, 2.5, 0.08, redM, -s * 0.7, 1.25, 0, piv);
    for (const [w, h, x, y, rz] of [[1.4, 0.1, 0, 2.45, 0], [1.4, 0.1, 0, 0.05, 0], [0.1, 2.5, -0.65, 1.25, 0], [0.1, 2.5, 0.65, 1.25, 0], [1.75, 0.1, 0, 1.25, 1.06]]) { const t = box(w, h, 0.03, whiteM, x, y, 0.05, d); t.rotation.z = s * rz; t.position.y -= 1.25; }
    return piv; });
  for (const [w, h, x, y] of [[0.12, H, -W / 2, H / 2], [0.12, H, W / 2, H / 2]]) box(w, h, 0.16, whiteM, x, y, D / 2 + 0.02, b);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.2, D - 0.2), M(0xffffff, { map: strawTex })); floor.rotation.x = -Math.PI / 2; floor.position.y = 0.02; floor.receiveShadow = true; b.add(floor);
  // Welpen-Abteil mit Gitter (rechts hinten im Stall)
  const gridTex = canvasTex(128, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#9aa0a6'; g.lineWidth = 5; for (let i = 4; i < 128; i += 21) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); } g.beginPath(); g.moveTo(0, 30); g.lineTo(w, 30); g.moveTo(0, 100); g.lineTo(w, 100); g.stroke(); }); gridTex.wrapS = THREE.RepeatWrapping; gridTex.repeat.set(4, 1);
  const gm = new THREE.MeshStandardMaterial({ map: gridTex, alphaTest: 0.4, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.4 });
  G.pen = new THREE.Group(); b.add(G.pen); const g1 = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.1), gm); g1.rotation.y = Math.PI / 2; g1.position.set(0.9, 0.55, -0.9); G.pen.add(g1);
  const g2 = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.1), gm.clone()); g2.material.map = gridTex.clone(); g2.material.map.repeat.set(3.3, 1); g2.material.map.needsUpdate = true; g2.position.set(1.9, 0.55, 0.3); G.pen.add(g2);
  G.penC = V(-5 + 1.95, 0, -4 - 0.9); G.herdC = V(-5 - 1.3, 0, -4 - 0.5); }
// Waldrand + Bäume
{ const r = rng(14); const coneM = [M(0x24452a), M(0x2d5233), M(0x1d3b24)]; const trunk = M(0x4b3828);
  const fir = (x, z, h) => { const t = new THREE.Group(); t.position.set(x, 0, z); farm.add(t); cyl(0.12, 0.18, h * 0.3, trunk, 0, h * 0.15, 0, 7, t); for (let k = 0; k < 4; k++) { const c = new THREE.Mesh(new THREE.ConeGeometry(h * (0.3 - k * 0.06), h * 0.42, 9), coneM[k % 3]); c.position.y = h * (0.35 + k * 0.17); c.castShadow = true; t.add(c); } return t; };
  for (let i = 0; i < 70; i++) fir(-30 + i * 0.9 + (r() - .5) * 0.8, -13 - r() * 9, 5 + r() * 5);
  for (let i = 0; i < 30; i++) { const a = r() * Math.PI * 2, d = 22 + r() * 25; const x = Math.cos(a) * d, z = Math.sin(a) * d; if (z < -10) continue; fir(x, z, 5 + r() * 6); }
  const hill = M(0x5f7a48); for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), hill); m.scale.set(60 + r() * 50, 10 + r() * 12, 40); m.position.set(-150 + i * 35, -1, -120 - r() * 40); farm.add(m); } }
// Zäune: normaler Holz-/Drahtzaun und Elektrozaun (gleiche Linie)
const FX0 = -8.5, FX1 = 6.5, FZ0 = -8.5, FZ1 = 5.5;
function fenceLine(cb) { const pts = [[FX0, FZ0], [FX1, FZ0], [FX1, FZ1], [FX0, FZ1], [FX0, FZ0]]; for (let k = 0; k < 4; k++) { const [x0, z0] = pts[k], [x1, z1] = pts[k + 1]; const L = Math.hypot(x1 - x0, z1 - z0); cb(x0, z0, x1, z1, L); } }
{ G.oldFence = new THREE.Group(); farm.add(G.oldFence); G.eFence = new THREE.Group(); farm.add(G.eFence);
  const wireM = M(0x8d9196, { metalness: 0.7, roughness: 0.4 }); const tapeM = M(0xf08a1c, { emissive: 0x401800, roughness: 0.5 }); const insM = M(0xf2c81a, { roughness: 0.4 });
  fenceLine((x0, z0, x1, z1, L) => { const n = Math.ceil(L / 2.5), a = Math.atan2(x1 - x0, z1 - z0);
    for (let i = 0; i <= n; i++) { const x = lerp(x0, x1, i / n), z = lerp(z0, z1, i / n); cyl(0.06, 0.07, 1.2, postM, x, 0.6, z, 7, G.oldFence); cyl(0.035, 0.035, 1.25, M(0x2b2b2b), x, 0.62, z, 6, G.eFence);
      for (const y of [0.15, 0.4, 0.65, 0.9, 1.15]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.05), insM); s.position.set(x, y, z); G.eFence.add(s); } }
    for (const y of [0.45, 0.95]) { const w = box(0.02, 0.02, L, wireM, (x0 + x1) / 2, y, (z0 + z1) / 2, G.oldFence); w.rotation.y = a; w.castShadow = false; }
    for (const y of [0.15, 0.4, 0.65, 0.9, 1.15]) { const w = box(0.012, y === 0.15 ? 0.03 : 0.012, L, tapeM, (x0 + x1) / 2, y, (z0 + z1) / 2, G.eFence); w.rotation.y = a; w.castShadow = false; } });
  G.lowWire = G.eFence.children.filter(c => c.geometry.parameters && c.geometry.parameters.height === 0.03);
  // Weidezaungerät
  const dev = box(0.3, 0.35, 0.2, M(0x2a5aa8), FX1 - 1.5, 0.75, FZ0 + 0.15, G.eFence); box(0.18, 0.1, 0.02, M(0xf2c81a, { emissive: 0x806000 }), 0, 0.05, 0.11, dev); }
// Loch unter dem Zaun + Erdbrocken
G.hole = new THREE.Mesh(new THREE.CircleGeometry(0.45, 20), M(0x3a2a1c, { roughness: 1 })); G.hole.rotation.x = -Math.PI / 2; G.hole.position.set(-2.5, 0.025, FZ0); farm.add(G.hole);
{ const N = 120, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3)); G.dirt = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x4a3420, size: 0.06 })); farm.add(G.dirt); G.dirtN = N; }
function dirtAt(o, t, k) { const a = G.dirt.geometry.attributes.position.array, r = rng(4); G.dirt.visible = k > 0; for (let i = 0; i < G.dirtN; i++) { const ph = (t * 2 + r()) % 1; const vx = (r() - .5) * 0.8, vz = 0.6 + r() * 0.8, vy = 1 + r() * 1.2;
    a[i * 3] = o.x + vx * ph; a[i * 3 + 1] = Math.max(0.02, vy * ph - 4 * ph * ph); a[i * 3 + 2] = o.z + vz * ph; } G.dirt.geometry.attributes.position.needsUpdate = true; }
// Schneeflocken + Schneedecke
{ const N = 2500, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3)); G.snowP = new THREE.Points(g, new THREE.PointsMaterial({ map: dotTex, color: 0xffffff, size: 0.07, transparent: true, depthWrite: false })); scene.add(G.snowP); G.snowN = N;
  G.snowCover = new THREE.Mesh(new THREE.CircleGeometry(60, 64), M(0xf4f7fb, { roughness: 0.9 })); G.snowCover.rotation.x = -Math.PI / 2; G.snowCover.position.y = 0.035; G.snowCover.receiveShadow = true; scene.add(G.snowCover); }
function snowAt(t, c) { const a = G.snowP.geometry.attributes.position.array, r = rng(9); for (let i = 0; i < G.snowN; i++) { const x = (r() - .5) * 14, z = (r() - .5) * 14, y0 = r() * 6; a[i * 3] = c.x + x + 0.2 * Math.sin(t + i); a[i * 3 + 1] = (y0 - t * 0.6 + 600) % 6; a[i * 3 + 2] = c.z + z; } G.snowP.geometry.attributes.position.needsUpdate = true; }
// Fell-Flocken (Bürsten)
{ const N = 160, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3)); G.fluff = new THREE.Points(g, new THREE.PointsMaterial({ map: dotTex, color: 0xf6f2ea, size: 0.09, transparent: true, depthWrite: false })); scene.add(G.fluff); G.fluffN = N; }
function fluffAt(o, t) { const a = G.fluff.geometry.attributes.position.array, r = rng(6); for (let i = 0; i < G.fluffN; i++) { const ph = (t * 0.7 + r()) % 1; a[i * 3] = o.x + (r() - .5) * 0.6 + ph * (r() - .3) * 1.2; a[i * 3 + 1] = o.y + ph * 0.8 - ph * ph * 1.2; a[i * 3 + 2] = o.z + (r() - .5) * 0.6 + ph * 0.6; } G.fluff.geometry.attributes.position.needsUpdate = true; }
// Bürste + Schermaschine
G.brush = new THREE.Group(); scene.add(G.brush); box(0.3, 0.06, 0.12, M(0x8a5a32), 0, 0, 0, G.brush); { const br = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.1), M(0x222222, { roughness: 1 })); br.position.y = -0.05; G.brush.add(br); cyl(0.02, 0.02, 0.35, M(0x8a5a32), 0.3, 0.02, 0, 8, G.brush).rotation.z = Math.PI / 2; }
G.clipper = new THREE.Group(); scene.add(G.clipper); { const c = cyl(0.05, 0.06, 0.32, M(0x1f6fd0, { metalness: 0.3, roughness: 0.3 }), 0, 0, 0, 14, G.clipper); c.rotation.z = Math.PI / 2; box(0.04, 0.09, 0.12, M(0xc8ccd2, { metalness: 0.9, roughness: 0.2 }), -0.19, 0, 0, G.clipper); }

// ---------- Vierbeiner (Ziege, Hund, Wolf) ----------
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
const goatSpecs = [[0xe8e2d4, 0x8a6a48], [0x7a5636, 0x3a2a1c], [0x2e2a28, 0xe8e2d4], [0xc9a27a, 0xf0ebe0], [0xf0ebe0, 0xf0ebe0]];
const goats = goatSpecs.map((c, i) => makeQuad({ H: 0.48, L: 0.75, R: 0.19, col: c[0], col2: c[1], fur: 0.06, ears: 'goat', tail: 'goat', horns: i % 2 === 0, beard: i !== 4, snout: 0.12, legCol: c[1], seed: i * 3 + 1 }));
const kids = [0, 1].map(i => makeQuad({ H: 0.48, L: 0.75, R: 0.19, col: i ? 0xf0ebe0 : 0xc9a27a, col2: 0x8a6a48, fur: 0.05, ears: 'goat', tail: 'goat', snout: 0.11, legCol: 0x8a6a48, seed: 40 + i }));
const dogSpec = { H: 0.66, L: 1.0, R: 0.26, col: 0xf6f2ea, col2: 0xefe8dc, fur: 0.16, ears: 'floppy', earCol: 0xc9a46e, tail: 'curl', snout: 0.22, seed: 21, snoutCol: 0xf1ebe0, eyeR: 1.5 };
const dog = makeQuad(dogSpec), dog2 = makeQuad(Object.assign({}, dogSpec, { seed: 33, col2: 0xd9c8a8 }));
const wolves = [0, 1, 2].map(i => makeQuad({ H: 0.62, L: 0.92, R: 0.22, col: 0xa39b8e, col2: 0x5c554c, fur: 0.18, ears: 'prick', tail: 'bushy', snout: 0.2, seed: 60 + i, snoutCol: 0xb8afa2 }));
// Licht-Stimmungen
function mood(m) { const P = { day: [0x9fb7cf, 0xf2e3cc, 0xffd9a6, 3.1, 1.5, 0xe9e0cf], morning: [0x9bb2d4, 0xf6dcc0, 0xffc890, 2.6, 1.3, 0xe6d8c8], night: [0x2a3a6e, 0x52628e, 0xb4c4ff, 2.2, 1.05, 0x34406a], winter: [0xb9c6d6, 0xe8edf2, 0xfff1de, 2.4, 1.6, 0xdfe5ec], summer: [0x7fb2e6, 0xf6ecd0, 0xffe2a8, 3.6, 1.6, 0xeee6cc] }[m];
  skyU.top.value.set(P[0]); skyU.hor.value.set(P[1]); sun.color.set(P[2]); sun.intensity = P[3]; hemi.intensity = P[4]; scene.fog.color.set(P[5]); }
// Gras im Stall entfernen + Rasen etwas kürzer
{ const Z = new THREE.Matrix4().makeScale(0, 0, 0), P = new THREE.Vector3(), Q = new THREE.Quaternion(), Sc = new THREE.Vector3();
  for (let i = 0; i < GRASS_BASE.length; i++) { GRASS_BASE[i].decompose(P, Q, Sc); if (P.x > -8.1 && P.x < -1.9 && P.z > -6.6 && P.z < -1.4) GRASS_BASE[i] = Z.clone(); else { Sc.y *= 0.45; GRASS_BASE[i] = new THREE.Matrix4().compose(P, Q, Sc); } GRASS.setMatrixAt(i, GRASS_BASE[i]); }
  GRASS.instanceMatrix.needsUpdate = true; }
