// ---------- Garten-Welt: Rasen, Kaninchen-Auslauf, Stall, Schattendach ----------
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
// Auslauf: x ∈ [-PX, PX], z ∈ [-PZ, PZ]
const PX = 1.6, PZ = 1.1, PH = 0.75;
{ G.pen = new THREE.Group(); garden.add(G.pen); G.posts = [];
  const side = (x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(x1 - x0, z1 - z0); const p = new THREE.Mesh(new THREE.PlaneGeometry(L, PH), meshMat(L * 9, PH * 9)); p.position.set((x0 + x1) / 2, PH / 2, (z0 + z1) / 2); p.rotation.y = a - Math.PI / 2; G.pen.add(p);
    const rl = box(0.04, 0.04, L, woodM, (x0 + x1) / 2, PH, (z0 + z1) / 2, G.pen); rl.rotation.y = a; const rb = box(0.04, 0.04, L, woodM, (x0 + x1) / 2, 0.03, (z0 + z1) / 2, G.pen); rb.rotation.y = a; return p; };
  G.sides = [side(-PX, -PZ, PX, -PZ), side(PX, -PZ, PX, PZ), side(PX, PZ, -PX, PZ), side(-PX, PZ, -PX, -PZ)];
  for (const x of [-PX, 0, PX]) for (const z of [-PZ, PZ]) G.posts.push(box(0.06, PH + 0.04, 0.06, woodM, x, (PH + 0.04) / 2, z, G.pen));
  for (const x of [-PX, PX]) G.posts.push(box(0.06, PH + 0.04, 0.06, woodM, x, (PH + 0.04) / 2, 0, G.pen));
  // Gitterdach
  G.roof = new THREE.Group(); garden.add(G.roof); const rp = new THREE.Mesh(new THREE.PlaneGeometry(2 * PX, 2 * PZ), meshMat(2 * PX * 9, 2 * PZ * 9)); rp.rotation.x = -Math.PI / 2; G.roof.add(rp);
  for (const z of [-PZ, 0, PZ]) box(2 * PX, 0.035, 0.035, woodM, 0, 0, z, G.roof); for (const x of [-PX, 0, PX]) box(0.035, 0.035, 2 * PZ, woodM, x, 0, 0, G.roof); }
// Stall mit Klappe (hinten links im Auslauf, Front zeigt nach +z)
{ const h = new THREE.Group(); h.position.set(-0.95, 0, -0.68); G.pen.add(h); G.hutch = h; const W = 1.0, D = 0.62, H = 0.55, t = 0.03;
  box(W, t, D, woodDM, 0, 0.04, 0, h); box(W, H, t, woodM, 0, H / 2, -D / 2, h); box(t, H, D, woodM, -W / 2, H / 2, 0, h); box(t, H, D, woodM, W / 2, H / 2, 0, h);
  // Front mit Türloch (x 0.12..0.42, y 0..0.3)
  box(0.62, H, t, woodM, -0.19, H / 2, D / 2, h); box(0.08, H, t, woodM, 0.46, H / 2, D / 2, h); box(0.3, H - 0.3, t, woodM, 0.27, 0.3 + (H - 0.3) / 2, D / 2, h);
  const dark = box(0.3, 0.3, 0.01, M(0x140f0b, { roughness: 1 }), 0.27, 0.15, D / 2 - 0.03, h); G.hole2 = dark;
  G.flap = new THREE.Group(); G.flap.position.set(0.27, 0.3, D / 2 + 0.025); h.add(G.flap); box(0.31, 0.3, 0.025, woodDM, 0, -0.15, 0, G.flap); box(0.06, 0.02, 0.03, M(0x888888, { metalness: 0.8, roughness: 0.3 }), 0, -0.27, 0.02, G.flap);
  for (const s of [-1, 1]) { const r = box(W + 0.12, 0.03, D * 0.62, roofM, 0, H + 0.12, s * D * 0.25, h); r.rotation.x = s * 0.55; }
  const gab = new THREE.Shape(); gab.moveTo(-D / 2, 0); gab.lineTo(D / 2, 0); gab.lineTo(0, 0.17); gab.lineTo(-D / 2, 0);
  for (const s of [-1, 1]) { const g = new THREE.Mesh(new THREE.ExtrudeGeometry(gab, { depth: t, bevelEnabled: false }), woodM); g.rotation.y = Math.PI / 2; g.position.set(s * W / 2 - t / 2, H, 0); h.add(g); }
  // Nagespuren an der vorderen Kante (werden in Szene 10 eingeblendet)
  G.bites = []; const biteM = M(0xe9d2a6, { roughness: 0.9 }); for (let k = 0; k < 6; k++) { const b = box(0.06, 0.035, 0.02, biteM, -0.47 + (k % 2) * 0.025, 0.06 + k * 0.045, D / 2 + 0.008, h); b.rotation.z = (k % 2 ? 0.3 : -0.2); G.bites.push(b); }
  G.hutchDoor = V(-0.95 + 0.27, 0, -0.68 + D / 2 + 0.12); }
// Schattendach mit Steinplatte (hinten rechts im Auslauf)
{ const s = new THREE.Group(); s.position.set(0.95, 0, -0.62); G.pen.add(s); G.shade = s;
  for (const [x, z] of [[-0.38, -0.3], [0.38, -0.3], [-0.38, 0.3], [0.38, 0.3]]) box(0.04, 0.42, 0.04, woodM, x, 0.21, z, s);
  box(0.86, 0.03, 0.7, woodDM, 0, 0.43, 0, s);
  const stoneTex = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#9b9a96'; g.fillRect(0, 0, w, h); const r = rng(3); for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${r() < .5 ? '255,255,255' : '0,0,0'},${r() * 0.12})`; g.fillRect(r() * w, r() * h, 3, 3); } });
  G.slab = box(0.66, 0.035, 0.5, M(0xffffff, { map: stoneTex, roughness: 0.6 }), 0, 0.018, 0.02, s); G.slabP = V(0.95, 0.04, -0.6); }
// Apfelzweige im Auslauf
{ G.twigs = new THREE.Group(); G.twigs.position.set(0.15, 0, 0.05); G.pen.add(G.twigs); const r = rng(17); const bm = M(0x6b4a32, { roughness: 0.95 }); const lm = M(0x5f9a3a);
  for (let k = 0; k < 5; k++) { const b = cyl(0.012, 0.016, 0.5, bm, (r() - .5) * 0.2, 0.02 + k * 0.012, (r() - .5) * 0.2, 6, G.twigs); b.rotation.set(Math.PI / 2, 0, r() * 3); b.rotation.order = 'YXZ'; b.rotation.y = r() * 3;
    for (let j = 0; j < 4; j++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), lm); l.scale.set(1, 0.3, 1.8); l.position.set(0, (j - 1.5) * 0.11, 0.02); b.add(l); } } }
// Garten drumherum: Holzzaun, Haus, Apfelbaum, Beet
{ const FXg = 6.5, FZa = -6.0, FZb = 7.0, H = 1.6; const pos = []; const run = (x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(L / 0.16), a = Math.atan2(x1 - x0, z1 - z0); for (let i = 0; i <= n; i++) pos.push([lerp(x0, x1, i / n), lerp(z0, z1, i / n), a]); };
  run(-FXg, FZa, FXg, FZa); run(-FXg, FZa, -FXg, FZb); run(FXg, FZa, FXg, FZb);
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.15, H, 0.03), woodDM, pos.length); const m4 = new THREE.Matrix4(); const r = rng(9); const col = new THREE.Color();
  pos.forEach(([x, z, a], i) => { m4.compose(V(x, H / 2, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, a + Math.PI / 2, 0)), V(1, 1, 1)); im.setMatrixAt(i, m4); col.setHSL(0.07, 0.35, 0.55 + r() * 0.12); im.setColorAt(i, col); });
  im.castShadow = im.receiveShadow = true; garden.add(im);
  const sidingTex = canvasTex(64, 256, (g, w, hh) => { g.fillStyle = '#e9e4da'; g.fillRect(0, 0, w, hh); for (let y = 0; y < hh; y += 16) { g.fillStyle = 'rgba(0,0,0,0.14)'; g.fillRect(0, y + 13, w, 3); } }); sidingTex.repeat.set(10, 3);
  const hs = new THREE.Group(); hs.position.set(-1, 0, -10); garden.add(hs); box(12, 6, 6, M(0xffffff, { map: sidingTex }), 0, 3, 0, hs);
  const rf = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 4.6, 2.4, 4, 1), M(0x7a3b2e)); rf.rotation.y = Math.PI / 4; rf.scale.set(1.9, 1, 1); rf.position.y = 7.2; hs.add(rf);
  for (const x of [-3.5, 0, 3.5]) { box(1.6, 1.4, 0.12, M(0xf7f5f0), x, 3.8, 3.02, hs); box(1.35, 1.15, 0.05, M(0x5d7891, { roughness: 0.15, metalness: 0.3 }), x, 3.8, 3.08, hs); }
  const trunk = M(0x5b4632, { roughness: 0.9 }); const leafMs = [M(0x3d6b2a), M(0x4f7d32), M(0x2f5a24)];
  const tree = (x, z, s) => { const t = new THREE.Group(); t.position.set(x, 0, z); garden.add(t); cyl(0.12 * s, 0.2 * s, 3.2 * s, trunk, 0, 1.6 * s, 0, 8, t);
    for (let k = 0; k < 9; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry((0.9 + r() * 0.6) * s, 1), leafMs[k % 3]); b.position.set((r() - .5) * 2.2 * s, (3.2 + r() * 1.8) * s, (r() - .5) * 2.2 * s); b.castShadow = true; t.add(b); } return t; };
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + 0.2, d = 12 + r() * 8; tree(Math.cos(a) * d, Math.sin(a) * d - 2, 1 + r() * 0.5); }
  // Apfelbaum rechts hinter dem Auslauf
  const at = new THREE.Group(); at.position.set(3.4, 0, -2.6); garden.add(at); G.apple = at; cyl(0.11, 0.17, 1.9, trunk, 0, 0.95, 0, 9, at);
  const appleM = M(0xc8231d, { roughness: 0.45 });
  for (let k = 0; k < 9; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75 + r() * 0.35, 1), leafMs[k % 3]); b.position.set((r() - .5) * 1.8, 2.1 + r() * 1.1, (r() - .5) * 1.8); b.castShadow = true; at.add(b);
    for (let j = 0; j < 4; j++) { const a = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), appleM); const d = V(r() - .5, r() - .6, r() - .5).normalize().multiplyScalar(0.78); a.position.copy(b.position).add(d); at.add(a); } }
  // Beet mit Tomaten links
  const bed = new THREE.Group(); bed.position.set(-3.6, 0, -2.4); garden.add(bed); box(1.4, 0.25, 2.6, woodDM, 0, 0.125, 0, bed); box(1.3, 0.04, 2.5, M(0x3b2a1e, { roughness: 1 }), 0, 0.24, 0, bed);
  const tm = M(0xd8301f, { roughness: 0.4 }); for (let k = 0; k < 6; k++) { const px = (k % 2 - 0.5) * 0.6, pz = (Math.floor(k / 2) - 1) * 0.8; cyl(0.012, 0.012, 1.1, M(0x8a6a44), px, 0.8, pz, 5, bed);
    for (let j = 0; j < 5; j++) { const l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), leafMs[j % 3]); l.position.set(px + (r() - .5) * 0.25, 0.45 + j * 0.16, pz + (r() - .5) * 0.25); bed.add(l); const t2 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), tm); t2.position.set(px + (r() - .5) * 0.3, 0.45 + j * 0.15, pz + 0.12); bed.add(t2); } } }
// Karotte
{ G.carrot = new THREE.Group(); scene.add(G.carrot); const c = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.16, 10), M(0xf07a1a, { roughness: 0.6 })); c.rotation.z = Math.PI / 2; c.position.x = 0.08; c.castShadow = true; G.carrot.add(c);
  for (let k = 0; k < 4; k++) { const l = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.09, 4), M(0x4f9a2e)); l.rotation.z = Math.PI / 2 + (k - 1.5) * 0.25; l.position.set(-0.035, (k - 1.5) * 0.008, 0); G.carrot.add(l); } }
// Dichter Rasen um den Auslauf (eigene Halme, mähbar)
const LAWN_N = 18000; const LAWN_P = [];
{ const blade = new THREE.BufferGeometry(); blade.setAttribute('position', new THREE.Float32BufferAttribute([-0.008, 0, 0, 0.008, 0, 0, -0.005, 0.06, 0.01, 0.005, 0.06, 0.01, 0.0, 0.12, 0.03], 3)); blade.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]); blade.computeVertexNormals();
  const im = new THREE.InstancedMesh(blade, M(0x5b8a2c, { side: THREE.DoubleSide, roughness: 0.85 }), LAWN_N); const r = rng(55); const col = new THREE.Color();
  for (let i = 0; i < LAWN_N; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 4.6; const x = Math.cos(a) * d, z = Math.sin(a) * d * 0.9 + 0.3; const inPen = Math.abs(x) < PX - 0.03 && Math.abs(z) < PZ - 0.03;
    const under = (x > -1.48 && x < -0.42 && z > -1.02 && z < -0.34) || (x > 0.58 && x < 1.32 && z > -0.9 && z < -0.34) || (x > -4.35 && x < -2.85 && z > -3.75 && z < -1.05);
    LAWN_P.push({ x, z, ry: r() * 6.3, tx: (r() - .5) * 0.5, s: 0.7 + r() * 0.8, sy: 0.7 + r() * 0.7, inPen, under }); col.setHSL(0.22 + r() * 0.05, 0.45, 0.22 + r() * 0.16); im.setColorAt(i, col); }
  im.receiveShadow = true; garden.add(im); G.lawn = im; }
let lawnKey = '';
function lawnSet(mow = 1, zClip = 99) { const key = mow.toFixed(3) + '|' + zClip; if (key === lawnKey) return; lawnKey = key; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  LAWN_P.forEach((p, i) => { let sy = p.sy * (p.inPen ? lerp(1, 0.32, mow) : 1); let s = p.s; if (p.under || p.z > zClip) s = sy = 0; e.set(p.tx, p.ry, 0); q.setFromEuler(e); m4.compose(V(p.x, 0, p.z), q, V(s, s * sy, s)); G.lawn.setMatrixAt(i, m4); });
  G.lawn.instanceMatrix.needsUpdate = true; }
// Großes Basis-Gras im Garten kürzen, rund um den Auslauf entfernen
{ const Z = new THREE.Matrix4().makeScale(0, 0, 0), P = new THREE.Vector3(), Q = new THREE.Quaternion(), Sc = new THREE.Vector3();
  for (let i = 0; i < GRASS_BASE.length; i++) { GRASS_BASE[i].decompose(P, Q, Sc); if (Math.hypot(P.x, (P.z - 0.3) / 0.9) < 4.7 || (P.x > -4.4 && P.x < -2.8 && P.z > -3.8 && P.z < -1.0)) GRASS_BASE[i] = Z.clone(); else { Sc.y *= 0.5; GRASS_BASE[i] = new THREE.Matrix4().compose(P, Q, Sc); } GRASS.setMatrixAt(i, GRASS_BASE[i]); }
  GRASS.instanceMatrix.needsUpdate = true; }
// Partikel: Erde / Holzspäne
function particles(n, col, size) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3)); const p = new THREE.Points(g, new THREE.PointsMaterial({ color: col, size })); p.userData.n = n; scene.add(p); return p; }
G.dirt = particles(90, 0x4a3420, 0.035); G.chips = particles(60, 0xe2c48e, 0.03);
function spray(P, o, t, dir = V(0, 0, 1), spread = 0.4, up = 0.8, seed = 4) { const a = P.geometry.attributes.position.array, r = rng(seed); P.visible = true; for (let i = 0; i < P.userData.n; i++) { const ph = (t * 2 + r()) % 1; const vx = dir.x * (0.3 + r() * 0.5) + (r() - .5) * spread, vz = dir.z * (0.3 + r() * 0.5) + (r() - .5) * spread, vy = up * (0.5 + r());
    a[i * 3] = o.x + vx * ph; a[i * 3 + 1] = Math.max(o.y > 0.01 ? -9 : 0.01, o.y + vy * ph - 3 * ph * ph); a[i * 3 + 2] = o.z + vz * ph; } P.geometry.attributes.position.needsUpdate = true; }
// Erd-Schnitt (Querschnitt am rechten Zaun, Blick nach -z)
const ZF = 0.4;
{ G.cut = new THREE.Group(); scene.add(G.cut);
  const soilTex = canvasTex(512, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5a3d24'); gr.addColorStop(0.12, '#6b4a2c'); gr.addColorStop(0.5, '#8a5f38'); gr.addColorStop(1, '#a5724a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); const r = rng(21);
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${r() < .5 ? '40,25,12' : '200,160,110'},${0.15 + r() * 0.25})`; g.beginPath(); g.ellipse(r() * w, r() * h, 2 + r() * 6, 2 + r() * 4, r() * 3, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(220,200,160,0.55)'; for (let i = 0; i < 40; i++) { g.lineWidth = 1 + r() * 1.5; g.beginPath(); let x = r() * w, y = 0; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (r() - .5) * 14; y += 5 + r() * 10; g.lineTo(x, y); } g.stroke(); }
    g.fillStyle = '#3f6b22'; g.fillRect(0, 0, w, 5); });
  const mats = [M(0x7a5232), M(0x7a5232), M(0xffffff, { map: grassTex, roughness: 0.95 }), M(0x7a5232), M(0xffffff, { map: soilTex, roughness: 1 }), M(0x7a5232)];
  const b = new THREE.Mesh(new THREE.BoxGeometry(14, 1.6, 14), mats); b.position.set(1, -0.8, ZF - 7); b.receiveShadow = true; G.cut.add(b);
  // Zaun-Pfosten am Schnitt + Seitenwand
  const p = new THREE.Mesh(new THREE.PlaneGeometry(3, PH), meshMat(27, PH * 9)); p.rotation.y = Math.PI / 2; p.position.set(PX, PH / 2, ZF - 1.5); G.cut.add(p);
  box(0.06, PH + 0.04, 0.06, woodM, PX, (PH + 0.04) / 2, ZF - 0.04, G.cut); box(0.04, 0.04, 3, woodM, PX, PH, ZF - 1.5, G.cut);
  // Vergrabenes Gitter (als Schnittkante auf der Front)
  G.buried = new THREE.Group(); G.cut.add(G.buried); const bm = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.6), meshMat(1, 9)); bm.material.color.set(0xd8dde2); bm.position.set(PX, -0.3, ZF + 0.012); G.buried.add(bm);
  const bf = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.07), meshMat(6, 1)); bf.material.color.set(0xd8dde2); bf.position.set(PX + 0.2, -0.6, ZF + 0.012); G.buried.add(bf);
  // Tunnel als dunkles Band auf der Schnittfläche
  G.tunM = new THREE.MeshBasicMaterial({ color: 0x24160c }); }
function makeTunnel(pts, w = 0.27) { const c = new THREE.CatmullRomCurve3(pts.map(([x, y]) => V(x, y, ZF + 0.006))); const N = 60; const pos = [], idx = [];
  for (let i = 0; i <= N; i++) { const p = c.getPoint(i / N), t = c.getTangent(i / N); const n = V(-t.y, t.x, 0).multiplyScalar(w / 2); pos.push(p.x + n.x, p.y + n.y, p.z, p.x - n.x, p.y - n.y, p.z); if (i < N) idx.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); const m = new THREE.Mesh(g, G.tunM); G.cut.add(m); m.userData = { c, N }; return m; }
function tunnelGrow(m, k) { m.geometry.setDrawRange(0, Math.floor(clamp(k) * m.userData.N) * 6); }
G.tun1 = makeTunnel([[1.1, 0.02], [1.18, -0.2], [1.4, -0.4], [1.8, -0.42], [2.05, -0.22], [2.15, 0.02]]);
G.tun2 = makeTunnel([[1.1, 0.02], [1.18, -0.2], [1.36, -0.38], [1.55, -0.42]]);

// ---------- Kaninchen ----------
function furGeo(r, amp, seed) { const g = new THREE.IcosahedronGeometry(r, 4); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const v = V(p.getX(i), p.getY(i), p.getZ(i)); const n = fbm(v.x * 30 + seed, v.y * 30, v.z * 30, 3); v.multiplyScalar(1 + amp * (n - 0.45)); p.setXYZ(i, v.x, v.y, v.z); } g.computeVertexNormals(); return g; }
function makeRabbit(o = {}) {
  const { col = 0x8b6b4e, belly = 0xd9c8ae, earCol = col, seed = 1, spots = null } = o;
  const k = { root: new THREE.Group(), body: new THREE.Group(), o }; scene.add(k.root); k.root.add(k.body);
  const m1 = new THREE.MeshStandardMaterial({ color: col, roughness: 0.95 }), mb = new THREE.MeshStandardMaterial({ color: belly, roughness: 0.95 }), me = new THREE.MeshStandardMaterial({ color: earCol, roughness: 0.95 });
  const pink = M(0xe9a3a8, { roughness: 0.6 }), black = M(0x111111, { roughness: 0.25 }), white = M(0xf8f6f0, { roughness: 0.4 });
  const sp = (g, m, x, y, z, sx = 1, sy = 1, sz = 1, parent = k.body) => { const s = new THREE.Mesh(g, m); s.position.set(x, y, z); s.scale.set(sx, sy, sz); s.castShadow = true; parent.add(s); return s; };
  k.torso = sp(furGeo(0.1, 0.05, seed), m1, 0, 0.12, -0.02, 1.0, 0.95, 1.45);
  sp(furGeo(0.085, 0.05, seed + 2), mb, 0, 0.1, 0.07, 0.95, 0.95, 0.9); // Brust
  for (const s of [-1, 1]) sp(furGeo(0.075, 0.05, seed + 4 + s), m1, s * 0.055, 0.1, -0.09, 0.8, 1, 1.15); // Keulen
  if (spots) sp(furGeo(0.07, 0.08, seed + 9), M(spots, { roughness: 0.95 }), 0.03, 0.17, -0.06, 1.1, 0.6, 1.3);
  k.tail = sp(furGeo(0.035, 0.2, seed + 7), white, 0, 0.13, -0.17);
  // Kopf
  k.neck = new THREE.Group(); k.neck.position.set(0, 0.16, 0.1); k.body.add(k.neck);
  k.head = new THREE.Group(); k.head.position.set(0, 0.045, 0.04); k.neck.add(k.head);
  sp(furGeo(0.065, 0.05, seed + 11), m1, 0, 0, 0, 0.92, 0.88, 1.12, k.head);
  for (const s of [-1, 1]) sp(furGeo(0.035, 0.05, seed + 12 + s), mb, s * 0.03, -0.025, 0.045, 1, 0.9, 1, k.head); // Backen
  k.nose = sp(new THREE.SphereGeometry(0.012, 8, 6), pink, 0, -0.008, 0.074, 1.3, 0.8, 0.8, k.head);
  for (const s of [-1, 1]) { sp(new THREE.SphereGeometry(0.015, 10, 8), black, s * 0.047, 0.015, 0.03, 0.8, 1, 0.9, k.head); sp(new THREE.SphereGeometry(0.004, 6, 4), white, s * 0.052, 0.022, 0.042, 1, 1, 1, k.head); }
  k.teeth = new THREE.Group(); k.teeth.position.set(0, -0.036, 0.066); k.head.add(k.teeth); for (const s of [-1, 1]) sp(new THREE.BoxGeometry(0.008, 0.016, 0.004), white, s * 0.0045, -0.008, 0, 1, 1, 1, k.teeth);
  // Schnurrhaare
  { const wm = new THREE.LineBasicMaterial({ color: 0xf0f0f0 }); const pts = []; for (const s of [-1, 1]) for (let j = 0; j < 3; j++) { pts.push(V(s * 0.015, -0.012, 0.068), V(s * 0.09, -0.004 - j * 0.012, 0.05)); } k.head.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), wm)); }
  k.ears = [-1, 1].map(s => { const piv = new THREE.Group(); piv.position.set(s * 0.024, 0.045, -0.02); k.head.add(piv); sp(furGeo(0.03, 0.04, seed + 20 + s), me, 0, 0.085, 0, 0.95, 3.0, 0.45, piv); sp(new THREE.SphereGeometry(0.022, 10, 8), pink, 0, 0.085, 0.01, 0.75, 3.4, 0.25, piv); return piv; });
  // Beine
  k.front = [-1, 1].map(s => { const g = new THREE.Group(); g.position.set(s * 0.04, 0.09, 0.09); k.body.add(g); sp(new THREE.CylinderGeometry(0.014, 0.012, 0.09, 8), m1, 0, -0.045, 0, 1, 1, 1, g); sp(new THREE.SphereGeometry(0.018, 8, 6), mb, 0, -0.085, 0.01, 1, 0.6, 1.4, g); return g; });
  k.hind = [-1, 1].map(s => { const g = new THREE.Group(); g.position.set(s * 0.06, 0.05, -0.08); k.body.add(g); sp(new THREE.SphereGeometry(0.026, 8, 6), mb, 0, -0.04, 0.03, 0.9, 0.5, 2.6, g); return g; });
  return k;
}
// o: pos, yaw, hop (Phase), hopK, lie (platt), sit (Männchen), earsDown, chew, dig, scale, teeth, pant, headY, headP, pitch, vis
function poseR(k, o = {}) {
  const { pos = V(0, 0, 0), yaw = 0, hop = 0, hopK = 0, lie = 0, sit = 0, earsDown = 0, chew = 0, dig = 0, scale = 1, teeth = 1, pant = 0, headY = 0, headP = 0, pitch = 0, T = 0, vis = true } = o;
  k.root.visible = vis; if (!vis) return; k.root.position.copy(pos); k.root.rotation.set(0, yaw, 0); k.root.scale.setScalar(scale);
  const ph = hop % 1, air = Math.sin(Math.PI * ph);
  k.body.position.set(0, hopK * 0.1 * air - lie * 0.055, 0); k.body.rotation.x = pitch + hopK * (-0.35 * Math.cos(Math.PI * ph)) - sit * 0.7 + dig * 0.3;
  k.body.scale.set(1 + lie * 0.12, 1 - lie * 0.25 + pant * 0.03 * Math.sin(T * 30), 1 + lie * 0.25 + hopK * 0.15 * air);
  if (sit > 0) k.body.position.y += sit * 0.03;
  k.front.forEach((g, i) => { g.rotation.x = hopK * (0.9 * Math.cos(Math.PI * ph)) - lie * 1.1 + sit * 0.9 + dig * (-0.4 + 0.6 * Math.sin(T * 22 + i * Math.PI)); });
  k.hind.forEach(g => { g.rotation.x = hopK * (-0.8 * air) + lie * 0.9; g.position.z = -0.08 - lie * 0.06; });
  k.neck.rotation.x = headP * 0.6 + lie * 0.35 + dig * 0.4 - sit * 0.3; k.head.rotation.set(headP * 0.4 + sit * 0.5, headY, 0);
  k.ears.forEach((e, i) => { const s = i ? 1 : -1; e.rotation.set(lerp(-0.2, -1.35, earsDown) - hopK * 0.3 * air + Math.sin(T * 1.7 + i) * 0.04, 0, s * lerp(-0.14, -0.35, earsDown)); });
  k.nose.scale.set(1.3, 0.8 + 0.25 * Math.max(chew, 0.4) * Math.abs(Math.sin(T * 14)), 0.8);
  k.teeth.scale.set(1, teeth, 1); k.teeth.position.y = -0.036 - (teeth - 1) * 0.006;
  k.head.position.y = 0.045 + chew * 0.004 * Math.sin(T * 16);
}
const bun = makeRabbit({ col: 0x8b6b4e, belly: 0xd9c8ae, seed: 1 });
const bun2 = makeRabbit({ col: 0xf2efe9, belly: 0xf7f4ee, earCol: 0x3a3330, spots: 0x8a7a6c, seed: 31 });
const babyCols = [[0x8b6b4e, 0xd9c8ae], [0xf2efe9, 0xf7f4ee], [0x6e5a48, 0xcdbda4], [0xa58a6a, 0xe0d2bc], [0x3a3330, 0x8c8278]];
const babies = Array.from({ length: 18 }, (_, i) => { const c = babyCols[i % 5]; return makeRabbit({ col: c[0], belly: c[1], seed: 50 + i * 3 }); });

// ---------- Fuchs (Vierbeiner) ----------
function makeFox() {
  const q = { root: new THREE.Group(), body: new THREE.Group() }; scene.add(q.root); q.root.add(q.body); const H = 0.3, L = 0.55, R = 0.13;
  const mo = M(0xc8642a, { roughness: 0.95 }), mw = M(0xf2ebe0, { roughness: 0.95 }), md = M(0x2a2220, { roughness: 0.9 });
  const sp = (g, m, x, y, z, sx = 1, sy = 1, sz = 1, parent = q.body) => { const s = new THREE.Mesh(g, m); s.position.set(x, y, z); s.scale.set(sx, sy, sz); s.castShadow = true; parent.add(s); return s; };
  sp(furGeo(R, 0.1, 3), mo, 0, H + R * 0.3, 0, 0.95, 0.95, L / (2 * R)); sp(furGeo(R * 0.8, 0.08, 4), mw, 0, H + R * 0.05, L * 0.3, 0.9, 0.8, 0.9);
  q.head = new THREE.Group(); q.head.position.set(0, H + R * 1.0, L * 0.5); q.body.add(q.head);
  sp(furGeo(R * 0.7, 0.06, 5), mo, 0, 0, 0, 1, 0.9, 1); const sn = sp(new THREE.ConeGeometry(R * 0.38, R * 1.2, 10), mw, 0, -R * 0.15, R * 0.85, 1, 1, 1, q.head); sn.rotation.x = Math.PI / 2;
  sp(new THREE.SphereGeometry(R * 0.11, 8, 6), md, 0, -R * 0.12, R * 1.45, 1, 1, 1, q.head);
  for (const s of [-1, 1]) { const e = sp(new THREE.ConeGeometry(R * 0.28, R * 0.7, 4), mo, s * R * 0.38, R * 0.62, -R * 0.05, 1, 1, 0.5, q.head); e.rotation.z = -s * 0.2; sp(new THREE.SphereGeometry(R * 0.09, 8, 6), M(0xffd25a, { emissive: 0xffb020, emissiveIntensity: 1.2 }), s * R * 0.3, R * 0.18, R * 0.5, 1, 1, 0.6, q.head); }
  q.legs = []; for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { const hip = new THREE.Group(); hip.position.set(x * R * 0.5, H + R * 0.1, z * L * 0.36); q.body.add(hip); sp(new THREE.CylinderGeometry(R * 0.16, R * 0.12, H + R * 0.1, 8), md, 0, -(H + R * 0.1) / 2, 0, 1, 1, 1, hip); q.legs.push({ hip, front: z > 0, side: x }); }
  q.tail = new THREE.Group(); q.tail.position.set(0, H + R * 0.4, -L * 0.5); q.body.add(q.tail); sp(furGeo(R * 0.55, 0.12, 8), mo, 0, -R * 0.4, -R * 1.2, 0.9, 0.9, 2.2, q.tail); sp(furGeo(R * 0.3, 0.1, 9), mw, 0, -R * 0.75, -R * 2.6, 1, 1, 1, q.tail);
  return q;
}
function poseFox(q, { pos = V(0, 0, 0), yaw = 0, walk = 0, gait = 0, headP = 0, headY = 0, T = 0, vis = true, sniff = 0 } = {}) { q.root.visible = vis; if (!vis) return; q.root.position.copy(pos); q.root.rotation.y = yaw;
  q.legs.forEach(l => { const ph = gait + ((l.front === (l.side < 0)) ? 0 : Math.PI); l.hip.rotation.x = walk * 0.5 * Math.sin(ph); });
  q.body.position.y = walk * 0.01 * Math.abs(Math.sin(gait * 2)); q.head.rotation.set(headP + sniff * (0.5 + 0.08 * Math.sin(T * 20)), headY, 0); q.tail.rotation.set(0.3, 0, 0.25 * Math.sin(T * 2.3)); }
const fox = makeFox();
// Licht-Stimmungen
function mood(m) { const P = { day: [0x8fb4dc, 0xf2e6cf, 0xffe0b0, 3.2, 1.5, 0xe9e2cf], morning: [0x9bb2d4, 0xf6dcc0, 0xffc890, 2.7, 1.35, 0xe6d8c8], dusk: [0x5a5f9a, 0xf0a878, 0xffa060, 2.6, 1.15, 0xc9a08a], night: [0x26346a, 0x4c5c8a, 0xb4c4ff, 2.2, 1.05, 0x34406a], summer: [0x6faee8, 0xf6ecd0, 0xffe6aa, 3.8, 1.6, 0xeee6cc] }[m];
  skyU.top.value.set(P[0]); skyU.hor.value.set(P[1]); sun.color.set(P[2]); sun.intensity = P[3]; hemi.intensity = P[4]; scene.fog.color.set(P[5]); }
