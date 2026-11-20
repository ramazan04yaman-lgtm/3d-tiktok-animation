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
