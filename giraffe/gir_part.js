// ---------- Giraffe: Savanne, Akazien, Wasserloch, Giraffe, Antilopen, Löwe ----------
const G = {}; const WH = V(7, 0, 3.5), WHR = 1.7; // Wasserloch
// Savannen-Boden
const savTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#b39252'; g.fillRect(0, 0, w, h); const r = rng(12);
  for (let k = 0; k < 2200; k++) { g.globalAlpha = 0.1 + r() * 0.15; g.fillStyle = ['#9c7a40', '#c9a868', '#8a6a3a', '#d2b67a', '#7d6a3a'][(r() * 5) | 0]; g.beginPath(); g.ellipse(r() * w, r() * h, 3 + r() * 16, 2 + r() * 9, r() * 3, 0, 7); g.fill(); }
  g.globalAlpha = 0.35; for (let k = 0; k < 2500; k++) { const x = r() * w, y = r() * h; g.strokeStyle = ['#d8bf7c', '#a88a4c', '#e3cf94'][(r() * 3) | 0]; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 6, y - 4 - r() * 8); g.stroke(); } g.globalAlpha = 1; });
savTex.wrapS = savTex.wrapT = THREE.RepeatWrapping; savTex.repeat.set(160, 160); savTex.colorSpace = THREE.SRGBColorSpace;
ground.material.map = savTex; ground.material.color.set(0xffffff); ground.material.needsUpdate = true;
{ const c = new THREE.Color(), r = rng(8), Z = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < GRASS_BASE.length; i++) { c.setHSL(0.1 + r() * 0.04, 0.45 + r() * 0.2, 0.42 + r() * 0.18); GRASS.setColorAt(i, c);
    const e = GRASS_BASE[i].elements; if (Math.hypot(e[12] - WH.x, e[14] - WH.z) < WHR + 0.6) { GRASS_BASE[i] = Z.clone(); GRASS.setMatrixAt(i, Z); } else { const m = GRASS_BASE[i].clone().multiply(new THREE.Matrix4().makeScale(1, 1.6, 1)); GRASS_BASE[i] = m; GRASS.setMatrixAt(i, m); } }
  GRASS.instanceColor.needsUpdate = true; GRASS.instanceMatrix.needsUpdate = true; GRASS.material.color.set(0xffffff); }
const sav = new THREE.Group(); scene.add(sav);
// Akazien (Schirmkronen)
const barkM = new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 0.95, bumpMap: scaleTex, bumpScale: 2 });
const leafMs = [0x4f6a2a, 0x5d7a32, 0x445c24, 0x6b8436].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true }));
function makeAcacia(x, z, h, w, seed, bareLow = false) { const g = new THREE.Group(); g.position.set(x, 0, z); const r = rng(seed); const tube = (pts, rad) => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, rad, 7), barkM); m.castShadow = true; g.add(m); };
  const fork = V((r() - 0.5) * 0.3, h * 0.45, (r() - 0.5) * 0.3); tube([V(0, 0, 0), V(0.05, h * 0.2, 0), fork], 0.09 * h / 5);
  const nb = 4 + (r() * 2 | 0); const tops = []; for (let k = 0; k < nb; k++) { const a = k / nb * 6.28 + r(); const t = V(Math.cos(a) * w * (0.25 + r() * 0.2), h * (0.9 + r() * 0.08), Math.sin(a) * w * (0.25 + r() * 0.2)); tops.push(t); tube([fork, fork.clone().lerp(t, 0.5).add(V(0, 0.15, 0)), t], 0.05 * h / 5); }
  for (let k = 0; k < 26; k++) { const a = r() * 6.28, d = Math.sqrt(r()) * w * 0.55; const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5 + r() * 0.5, 1), leafMs[(r() * 4) | 0]); b.position.set(Math.cos(a) * d, h + 0.05 + r() * 0.3 - d * 0.08, Math.sin(a) * d); b.scale.set(1.3 * w / 4, 0.32, 1.3 * w / 4); b.castShadow = true; g.add(b); }
  if (bareLow) for (let k = 0; k < 5; k++) { const a = r() * 6.28; const y = h * (0.3 + r() * 0.3); const p0 = V(fork.x * y / fork.y, y, fork.z * y / fork.y); const p1 = p0.clone().add(V(Math.cos(a) * 0.9, 0.3, Math.sin(a) * 0.9)); tube([p0, p0.clone().lerp(p1, 0.5).add(V(0, 0.1, 0)), p1], 0.025);
    for (let j = 0; j < 4; j++) { const q = p0.clone().lerp(p1, 0.3 + j * 0.2); tube([q, q.clone().add(V((r() - 0.5) * 0.4, 0.2 + r() * 0.2, (r() - 0.5) * 0.4))], 0.008); } }
  sav.add(g); return g; }
G.acacia = makeAcacia(0, -1.6, 4.8, 4.2, 3, true);
{ const r = rng(19); for (let i = 0; i < 46; i++) { const a = r() * 6.28, d = 14 + r() * 110; makeAcacia(Math.cos(a) * d, Math.sin(a) * d, 4 + r() * 3, 3 + r() * 3, 100 + i); }
  const hm = new THREE.MeshStandardMaterial({ color: 0x8a7a6a, roughness: 1 }); for (let i = 0; i < 14; i++) { const a = r() * 6.28, d = 260 + r() * 150; const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.25, 1, 18), hm); m.scale.set(50 + r() * 60, 18 + r() * 25, 40 + r() * 40); m.position.set(Math.cos(a) * d, 8, Math.sin(a) * d); sav.add(m); }
  const tm = new THREE.MeshStandardMaterial({ color: 0xa4703e, roughness: 1, bumpMap: scaleTex, bumpScale: 2 }); for (let i = 0; i < 9; i++) { const a = r() * 6.28, d = 6 + r() * 25; if (Math.hypot(Math.cos(a) * d - WH.x, Math.sin(a) * d - WH.z) < 7 || d < 9) continue; const m = new THREE.Mesh(new THREE.ConeGeometry(0.5 + r() * 0.4, 1.4 + r() * 1.6, 9), tm); m.position.set(Math.cos(a) * d, 0.6, Math.sin(a) * d); m.castShadow = true; sav.add(m); }
  const rm = new THREE.MeshStandardMaterial({ color: 0x8c8270, roughness: 0.9, bumpMap: scaleTex, bumpScale: 0.6 }); for (let i = 0; i < 18; i++) { const a = r() * 6.28, d = 5 + r() * 30; const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + r() * 0.6, 2), rm); m.position.set(Math.cos(a) * d, 0.05, Math.sin(a) * d); m.scale.y = 0.6; m.castShadow = true; sav.add(m); } }
// Wasserloch
{ const mud = new THREE.Mesh(new THREE.CircleGeometry(WHR + 0.7, 40), new THREE.MeshStandardMaterial({ color: 0x6e5333, roughness: 0.9, bumpMap: scaleTex, bumpScale: 1 })); mud.rotation.x = -Math.PI / 2; mud.position.set(WH.x, 0.012, WH.z); mud.scale.y = 0.8; mud.receiveShadow = true; sav.add(mud);
  G.water = new THREE.Mesh(new THREE.CircleGeometry(WHR, 40), new THREE.MeshStandardMaterial({ color: 0x5f7470, roughness: 0.06, metalness: 0.4 })); G.water.rotation.x = -Math.PI / 2; G.water.position.set(WH.x, 0.03, WH.z); G.water.scale.y = 0.8; sav.add(G.water); }
// Dornenzweig (Nahaufnahmen) – liegt in der Krone der Hauptakazie
G.TB = V(0.55, 4.05, -0.25); G.branch = new THREE.Group(); G.branch.position.copy(G.TB); scene.add(G.branch);
{ const r = rng(55); const c = new THREE.CatmullRomCurve3([V(-0.9, 0.12, -0.5), V(-0.3, 0.02, -0.15), V(0.25, -0.02, 0.05), V(0.75, 0.04, 0.2)]); G.branchC = c;
  G.branch.add(new THREE.Mesh(new THREE.TubeGeometry(c, 40, 0.014, 8), barkM));
  const thM = new THREE.MeshStandardMaterial({ color: 0xf2ecdc, roughness: 0.35 }); for (let k = 0; k < 22; k++) { const u = 0.08 + k * 0.042; const p = c.getPoint(u); for (const s of [-1, 1]) { const th = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.09 + r() * 0.05, 6), thM); th.position.copy(p); th.rotation.set(s * 0.9 + (r() - 0.5) * 0.3, 0, s * 0.5 + (r() - 0.5) * 0.4); th.translateY(0.05); th.castShadow = true; G.branch.add(th); } }
  const NLV = 520; G.leaves = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshStandardMaterial({ color: 0x6b8a34, roughness: 0.7 }), NLV); G.leafBase = []; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
  for (let i = 0; i < NLV; i++) { const u = r(); const p = c.getPoint(u); const st = V((r() - 0.5) * 0.22, 0.03 + r() * 0.08, (r() - 0.5) * 0.22); const pp = p.clone().add(st); q.setFromEuler(new THREE.Euler(r() * 3, r() * 3, r() * 3)); m4.compose(pp, q, V(0.012, 0.004, 0.006)); G.leafBase.push({ m: m4.clone(), u }); G.leaves.setMatrixAt(i, m4); col.setHSL(0.22 + r() * 0.05, 0.45, 0.3 + r() * 0.12); G.leaves.setColorAt(i, col); }
  G.branch.add(G.leaves); }
function leavesStrip(u0, u1, k) { const Z = new THREE.Matrix4().makeScale(0, 0, 0); G.leafBase.forEach((l, i) => G.leaves.setMatrixAt(i, (l.u > u0 && l.u < u1 && (i % 100) / 100 < k) ? Z : l.m)); G.leaves.instanceMatrix.needsUpdate = true; }

// ---------- Vierbeiner-Baukasten (Giraffe, Antilope, Löwe) ----------
const girTex = canvasTex(512, 512, (g, w, h) => { const r = rng(7); const P = []; for (let i = 0; i < 46; i++) P.push([r() * w, r() * h, r()]); const im = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let d1 = 1e9, d2 = 1e9, id = 0; for (let k = 0; k < P.length; k++) for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) { const dx = x - P[k][0] - ox, dy = y - P[k][1] - oy; const d = dx * dx + dy * dy; if (d < d1) { d2 = d1; d1 = d; id = k; } else if (d < d2) d2 = d; }
    const e = Math.sqrt(d2) - Math.sqrt(d1); const i = (y * w + x) * 4; const line = e < 7; const v = P[id][2]; const n = 0.9 + 0.1 * Math.sin(x * 0.3 + y * 0.2);
    if (line) { im.data[i] = 236; im.data[i + 1] = 222; im.data[i + 2] = 190; } else { im.data[i] = (150 + 50 * v) * n; im.data[i + 1] = (78 + 30 * v) * n; im.data[i + 2] = (30 + 14 * v) * n; } im.data[i + 3] = 255; }
  g.putImageData(im, 0, 0); });
girTex.wrapS = girTex.wrapT = THREE.RepeatWrapping; girTex.colorSpace = THREE.SRGBColorSpace;
const texRep = (rx, ry) => { const t = girTex.clone(); t.repeat.set(rx, ry); t.needsUpdate = true; return t; };
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
    const hoof = new THREE.Mesh(new THREE.CylinderGeometry(o.legR * 0.8, o.legR * 1.05, o.legR * 1.6, 10), new THREE.MeshStandardMaterial({ color: o.hoof || 0x2a2018, roughness: 0.6 })); hoof.position.y = -seg; knee.add(hoof);
    q.legs.push({ hip, knee, sx, front }); }
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
    const ear = new THREE.Mesh(new THREE.ConeGeometry(o.headH * 0.28, o.headH * 0.9, 8), hm); ear.position.set(s * o.headW * 0.95, o.headH * 0.75, o.headL * 0.05); ear.rotation.set(-0.3, 0, -s * 1.15); ear.scale.z = 0.5; q.head.add(ear);
    if (o.ossi) { const os = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.2, 8), hm); os.position.set(s * 0.06, o.headH + 0.06, -o.headL * 0.02); os.rotation.set(-0.25, 0, -s * 0.15); q.head.add(os); const tip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshStandardMaterial({ color: 0x1e1610, roughness: 1 })); tip.position.set(0, 0.1, 0); os.add(tip); }
    if (o.horns) { const c = new THREE.CatmullRomCurve3([V(0, 0, 0), V(s * 0.05, 0.15, -0.08), V(s * 0.02, 0.32, -0.12), V(s * 0.07, 0.45, -0.04)]); const hr = new THREE.Mesh(new THREE.TubeGeometry(c, 16, 0.016, 6), new THREE.MeshStandardMaterial({ color: 0x2e2620, roughness: 0.6 })); hr.position.set(s * 0.05, o.headH * 0.8, o.headL * 0.05); q.head.add(hr); } }
  if (o.mane === 'lion') { const g = new THREE.IcosahedronGeometry(1, 3); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const v = V(p.getX(i), p.getY(i), p.getZ(i)); v.multiplyScalar(1 + 0.25 * fbm(v.x * 3, v.y * 3, v.z * 3, 2)); p.setXYZ(i, v.x, v.y, v.z); } g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x6a3e1c, roughness: 1, flatShading: true })); m.scale.set(o.headW * 1.9, o.headH * 1.9, o.headL * 0.55); m.position.set(0, 0.02, -o.headL * 0.02); m.castShadow = true; q.head.add(m); }
  // Röntgen: Herz, Ader, Blutstropfen, Ventile
  if (o.xray) { q.heart = new THREE.Group(); const hM = new THREE.MeshStandardMaterial({ color: 0xc8202c, emissive: 0x5a0008, roughness: 0.35 }); for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 14), hM); l.position.set(s * 0.09, 0.05, 0); q.heart.add(l); } const tip = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.3, 18), hM); tip.rotation.x = Math.PI; tip.position.y = -0.17; q.heart.add(tip);
    q.heart.position.set(0, -o.bodyH * 0.2, o.bodyL * 0.3); q.body.add(q.heart); q.vessel = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ color: 0xb01826, emissive: 0x400006, roughness: 0.4, transparent: true, opacity: 0.85 })); q.body.add(q.vessel);
    q.NB = 60; q.blood = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3040 }), q.NB); q.blood.frustumCulled = false; q.body.add(q.blood);
    q.valves = []; for (let k = 0; k < 5; k++) { const v = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.022, 8, 20), new THREE.MeshStandardMaterial({ color: 0xffd24a, emissive: 0x6a4a00, roughness: 0.3 })); q.body.add(v); q.valves.push(v); } }
  q.tongue = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshPhysicalMaterial({ color: 0x2a2440, roughness: 0.35, clearcoat: 0.6 })); q.tongue.castShadow = true; scene.add(q.tongue);
  return q; }
// pose: neckP = Halswinkel über der Waagerechten, headP = Kopfneigung (+ = Nase runter), walk = Gangphase, splay 0..1, lie 0..1, crouch 0..1
function poseQ(q, { pos = V(0, 0, 0), yaw = 0, neckP = 1.0, neckY = 0, neckL = null, headP = 0.4, walk = 0, walkK = 0, splay = 0, lie = 0, crouch = 0, eyes = 1, xray = 0, flow = 0, flowSpeed = 1, valves = 0, tongue = null, vis = true, T = 0, tilt = null } = {}) {
  const o = q.o; q.root.visible = vis; q.tongue.visible = false; if (!vis) return; q.root.position.copy(pos); q.root.rotation.set(0, yaw, 0);
  const stand = o.legL + o.bodyH * 0.1; let by = lerp(stand, o.bodyH * 0.92, ease(lie)) - crouch * o.legL * 0.3 - splay * o.legL * 0.22; q.body.position.y = by;
  q.body.rotation.x = (tilt === null ? o.tilt : tilt) + splay * 0.12 + Math.sin(walk * 2) * 0.01 * walkK;
  q.legs.forEach(L => { const ph = walk + (L.sx < 0 ? 0 : Math.PI) + (L.front ? 0 : Math.PI * 0.15); let ux = Math.sin(ph) * 0.35 * walkK, kx = Math.max(0, Math.sin(ph + 1.2)) * 0.7 * walkK * (L.front ? -1 : 1), uz = 0;
    if (L.front) { uz = -L.sx * 0.42 * splay; ux += 0.08 * splay; } ux += crouch * (L.front ? 0.5 : -0.6); kx += crouch * (L.front ? -1.0 : 1.1);
    ux = lerp(ux, L.front ? -1.4 : 1.5, ease(lie)); kx = lerp(kx, L.front ? 2.9 : -2.8, ease(lie)); L.hip.rotation.set(ux, 0, uz); L.knee.rotation.set(kx, 0, 0); });
  if (q.tail) q.tail.rotation.set(0.1 + 0.08 * Math.sin(T * 2.3), 0, 0.12 * Math.sin(T * 1.7));
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
const headW = q => { q.root.updateMatrixWorld(true); return q.head.getWorldPosition(V(0, 0, 0)); };
const girM = new THREE.MeshStandardMaterial({ map: texRep(2, 2), roughness: 0.8 }), girNeckM = new THREE.MeshStandardMaterial({ map: texRep(4, 1.2), roughness: 0.8 }), girLegM = new THREE.MeshStandardMaterial({ map: texRep(1, 1.5), roughness: 0.8 }), girHeadM = new THREE.MeshStandardMaterial({ map: texRep(1.2, 1.2), roughness: 0.75 });
const GIR = { legL: 1.75, legR: 0.07, bodyL: 1.9, bodyW: 0.5, bodyH: 0.62, neckL: 2.0, neckR0: 0.26, neckR1: 0.12, headL: 0.62, headW: 0.16, headH: 0.17, snout: 0.35, tilt: -0.16, tailL: 0.9, ossi: true, mane: 'giraffe', xray: true,
  bodyMat: girM, neckMat: girNeckM, legMat: girLegM, lowMat: new THREE.MeshStandardMaterial({ color: 0xe4d4b4, roughness: 0.85 }), headMat: girHeadM, muzzle: 0x8a6a48 };
const gir = makeQuad(GIR);
const antM = new THREE.MeshStandardMaterial({ color: 0xb9773c, roughness: 0.85 });
const ANT = { legL: 0.62, legR: 0.03, bodyL: 1.0, bodyW: 0.22, bodyH: 0.28, neckL: 0.45, neckR0: 0.11, neckR1: 0.07, headL: 0.3, headW: 0.08, headH: 0.09, snout: 0.4, tilt: 0, tailL: 0.25, horns: true, bodyMat: antM, legMat: antM, lowMat: new THREE.MeshStandardMaterial({ color: 0xd9b88e, roughness: 0.85 }), belly: 0xf2ead8, muzzle: 0x3a2a20 };
const ants = [makeQuad(ANT), makeQuad(ANT)];
const lionM = new THREE.MeshStandardMaterial({ color: 0xc49352, roughness: 0.85 });
const LION = { legL: 0.7, legR: 0.07, bodyL: 1.55, bodyW: 0.32, bodyH: 0.4, neckL: 0.32, neckR0: 0.2, neckR1: 0.17, headL: 0.42, headW: 0.17, headH: 0.18, snout: 0.25, tilt: 0, tailL: 0.75, mane: 'lion', bodyMat: lionM, legMat: lionM, lowMat: lionM, muzzle: 0xd8b888, hoof: 0xb8884a };
const lion = makeQuad(LION);

// ---------- Stimmung ----------
function mood(m) { const P = { day: [0x7fb0de, 0xf4e2c0, 0xffdcaa, 3.3, 1.45, 0xeadfc8], hot: [0x9ac4ea, 0xfff4d6, 0xfff2cc, 4.4, 1.7, 0xf6eed8], dusk: [0x5a5f9a, 0xf2a46a, 0xffa060, 2.8, 1.15, 0xd8a47e], night: [0x1e2a5a, 0x3e4c7a, 0xa8b8ff, 1.6, 0.8, 0x2c3660] }[m];
  skyU.top.value.set(P[0]); skyU.hor.value.set(P[1]); sun.color.set(P[2]); sun.intensity = P[3]; hemi.intensity = P[4]; scene.fog.color.set(P[5]); }
