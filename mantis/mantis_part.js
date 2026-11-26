// ---------- Gottesanbeterin: Makro-Wiese, Zweig, Weibchen, Männchen, Fliege, Eipaket ----------
const G = {}; world.visible = false; GRASS.visible = false;
const macro = new THREE.Group(); scene.add(macro);
const M = (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.7 }, o));
// Boden: Moos / Erde
const soilTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#4a5a2a'; g.fillRect(0, 0, w, h); const r = rng(9); for (let k = 0; k < 3000; k++) { g.globalAlpha = 0.15 + r() * 0.2; g.fillStyle = ['#3a4a22', '#5a6e30', '#6a5a38', '#2e3a1a'][(r() * 4) | 0]; g.beginPath(); g.arc(r() * w, r() * h, 2 + r() * 8, 0, 7); g.fill(); } g.globalAlpha = 1; });
soilTex.wrapS = soilTex.wrapT = THREE.RepeatWrapping; soilTex.repeat.set(40, 40); soilTex.colorSpace = THREE.SRGBColorSpace; ground.material.map = soilTex; ground.material.needsUpdate = true;
// Riesige Grashalme (Makro)
{ const g = new THREE.PlaneGeometry(0.18, 1, 1, 10); g.translate(0, 0.5, 0); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) * (1 - y * 0.85)); p.setZ(i, 0.35 * y * y); } g.computeVertexNormals();
  const N = 900, r = rng(4); const im = new THREE.InstancedMesh(g, M(0xffffff, { side: THREE.DoubleSide, roughness: 0.6 }), N); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  for (let i = 0; i < N; i++) { let x, z; do { x = (r() - 0.5) * 30; z = (r() - 0.5) * 30 - 4; } while (z > -2.2 && Math.abs(x) < 9); const h = 1.5 + r() * 3.5; m4.compose(V(x, 0, z), q.setFromEuler(new THREE.Euler((r() - 0.5) * 0.3, r() * 6.3, (r() - 0.5) * 0.3)), V(1 + r(), h, 1)); im.setMatrixAt(i, m4); c.setHSL(0.24 + r() * 0.06, 0.5, 0.22 + r() * 0.16); im.setColorAt(i, c); }
  im.castShadow = true; macro.add(im); }
// Blüten im Hintergrund
{ const r = rng(6); const pm = [M(0xf2d24a), M(0xe86a9a), M(0xf4f2ec), M(0x9a6ad8)]; for (let i = 0; i < 16; i++) { const f = new THREE.Group(); const x = (r() - 0.5) * 16, z = -3 - r() * 8, h = 2 + r() * 2.5; f.position.set(x, h, z); macro.add(f); const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, h, 6), M(0x4a7a2a)); stem.position.y = -h / 2; f.add(stem);
    const m = pm[i % 4]; for (let k = 0; k < 8; k++) { const pe = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 6), m); pe.scale.set(1, 0.15, 0.45); pe.position.set(Math.cos(k / 8 * 6.28) * 0.28, 0, Math.sin(k / 8 * 6.28) * 0.28); pe.rotation.y = -k / 8 * 6.28; f.add(pe); } const ctr = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), M(0xd8901a)); f.add(ctr); f.rotation.x = 0.4; } }
// Zweig
const barkM = M(0x6a4a2e, { roughness: 0.95, bumpMap: scaleTex, bumpScale: 1.5 });
G.twigC = new THREE.CatmullRomCurve3([V(-4, 0.7, 0), V(-1.5, 1.0, 0.05), V(1, 1.1, -0.05), V(3, 1.0, 0), V(5, 1.3, 0.1)]); macro.add(new THREE.Mesh(new THREE.TubeGeometry(G.twigC, 80, 0.06, 10), barkM));
{ const r = rng(2); for (let k = 0; k < 6; k++) { const p = G.twigC.getPoint(0.1 + k * 0.15); if (p.x > -0.9 && p.x < 2.8) continue; const c = new THREE.CatmullRomCurve3([p, p.clone().add(V((r() - 0.5) * 0.6, 0.5 + r() * 0.4, (r() - 0.5) * 0.5)), p.clone().add(V((r() - 0.5) * 1.2, 1.0 + r() * 0.6, (r() - 0.5) * 0.8))]); macro.add(new THREE.Mesh(new THREE.TubeGeometry(c, 16, 0.025, 6), barkM));
    const lf = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), M(0x4e8a2e, { side: THREE.DoubleSide })); lf.scale.set(1, 0.08, 0.45); lf.position.copy(c.getPoint(1)); lf.rotation.set(r(), r() * 3, r()); macro.add(lf); } }
const twigY = x => { let best = 0, bd = 9; for (let i = 0; i <= 60; i++) { const p = G.twigC.getPoint(i / 60); const d = Math.abs(p.x - x); if (d < bd) { bd = d; best = p.y; } } return best + 0.06; };
// ---------- Gottesanbeterin ----------
function legSeg(len, r0, r1, m) { const g = new THREE.CylinderGeometry(r1, r0, len, 7); g.translate(0, -len / 2, 0); const mesh = new THREE.Mesh(g, m); mesh.castShadow = true; return mesh; }
const veinTex = canvasTex(128, 256, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(40,70,20,0.55)'; g.lineWidth = 2; for (let k = 0; k < 7; k++) { g.beginPath(); g.moveTo(w / 2, h * 0.02); g.quadraticCurveTo(w * (0.15 + k * 0.12), h * 0.4, w * (0.05 + k * 0.15), h); g.stroke(); } g.lineWidth = 1; for (let y = 10; y < h; y += 14) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + 4); g.stroke(); } });
veinTex.colorSpace = THREE.SRGBColorSpace;
function makeMantis({ s = 1, col = 0x6ab83a, col2 = 0x9ad85a } = {}) { const m = { root: new THREE.Group(), s }; scene.add(m.root); const bm = M(col, { roughness: 0.45, bumpMap: scaleTex, bumpScale: 0.25 }), wm = M(0xffffff, { map: veinTex, color: col2, roughness: 0.35, transparent: true, opacity: 0.92, side: THREE.DoubleSide }), em = M(0xd8e890, { roughness: 0.1, metalness: 0.1 }); const dm = M(0x3a4a1a, { roughness: 0.4 });
  m.mats = [bm]; m.body = new THREE.Group(); m.root.add(m.body);
  // Hinterleib (segmentiert)
  const ab = new THREE.Group(); ab.position.set(0, 0, -0.1); m.body.add(ab); m.abd = ab; { const g = new THREE.SphereGeometry(1, 24, 16); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i); const t = (1 - z) / 2; p.setX(i, p.getX(i) * (0.75 + 0.25 * Math.sin(Math.PI * Math.min(1, t * 1.3)))); p.setY(i, p.getY(i) - 0.15 * z * z + 0.05); } g.computeVertexNormals();
    const seg = new THREE.Mesh(g, bm); seg.scale.set(0.055, 0.045, 0.26); seg.position.set(0, -0.015, -0.24); seg.rotation.x = 0.12; seg.castShadow = true; ab.add(seg);
    for (let k = 0; k < 6; k++) { const rg = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 20), M(0x4a7a2a)); const z = -0.08 - k * 0.07; const w = 0.052 * Math.sin(Math.PI * Math.min(1, (0.5 + k * 0.08))); rg.scale.set(w, w * 0.8, w); rg.position.set(0, -0.015 - 0.012 * k, z - 0.1); ab.add(rg); } }
  const wing = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), wm); wing.scale.set(0.06, 0.014, 0.23); wing.position.set(0, 0.035, -0.2); wing.rotation.x = 0.06; ab.add(wing); m.wing = wing;
  m.gang = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 10), M(0xffd24a, { emissive: 0xffb000, emissiveIntensity: 1.2 })); m.gang.position.set(0, -0.01, -0.36); ab.add(m.gang);
  // Brust (lange Vorderbrust, schräg nach oben)
  m.thor = new THREE.Group(); m.thor.position.set(0, 0.0, 0.0); m.body.add(m.thor); m.thor.rotation.x = -0.75;
  const pt = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.034, 0.32, 12), bm); pt.rotation.x = Math.PI / 2; pt.position.z = 0.16; pt.castShadow = true; m.thor.add(pt); const shd = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), bm); shd.scale.set(0.04, 0.018, 0.06); shd.position.set(0, 0.01, 0.27); m.thor.add(shd);
  // Kopf (dreieckig, große Augen)
  m.neck = new THREE.Group(); m.neck.position.set(0, 0, 0.33); m.thor.add(m.neck); m.head = new THREE.Group(); m.neck.add(m.head); m.head.rotation.x = 0.75;
  { const g = new THREE.SphereGeometry(1, 24, 16); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); const k = y < 0 ? 1 + y * 0.78 : 1 - y * y * 0.15; p.setX(i, p.getX(i) * k); p.setY(i, y < 0 ? y * 1.45 : y * 0.8); } g.computeVertexNormals(); const hd = new THREE.Mesh(g, bm); hd.scale.set(0.068, 0.045, 0.03); m.head.add(hd); }
  const jaw = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.03, 6), dm); jaw.rotation.x = Math.PI; jaw.position.set(0, -0.07, 0.01); m.head.add(jaw); for (let k = 0; k < 3; k++) { const oc = new THREE.Mesh(new THREE.SphereGeometry(0.004, 6, 4), M(0x8a2a1a)); oc.position.set((k - 1) * 0.01, 0.028 + (k === 1 ? 0.006 : 0), 0.026); m.head.add(oc); }
  for (const sg of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), em); e.scale.set(0.9, 1.1, 0.95); e.position.set(sg * 0.066, 0.02, 0.0); m.head.add(e); const pu = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), M(0x1a2a0a)); pu.position.set(sg * 0.074, 0.018, 0.027); m.head.add(pu);
    const an = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(sg * 0.015, 0.04, 0.01), V(sg * 0.05, 0.15, 0.08), V(sg * 0.12, 0.22, 0.2)]), 10, 0.003, 4), bm); m.head.add(an); }
  // Fangarme
  m.raps = []; for (const sg of [-1, 1]) { const cx = new THREE.Group(); cx.position.set(sg * 0.03, -0.01, 0.27); m.thor.add(cx); const c1 = legSeg(0.11, 0.018, 0.014, bm); cx.add(c1); const fe = new THREE.Group(); fe.position.y = -0.11; cx.add(fe); const f1 = legSeg(0.14, 0.022, 0.016, bm); fe.add(f1);
    for (let k = 0; k < 6; k++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.035, 4), dm); sp.position.set(0, -0.025 - k * 0.02, 0.018); sp.rotation.x = 1.25; fe.add(sp); } const kn0 = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), bm); kn0.position.y = -0.14; fe.add(kn0); const ti = new THREE.Group(); ti.position.y = -0.14; fe.add(ti); const t1 = legSeg(0.11, 0.012, 0.007, bm); ti.add(t1); const hook = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.03, 4), dm); hook.position.set(0, -0.11, 0.01); hook.rotation.x = 2.2; ti.add(hook);
    m.raps.push({ cx, fe, ti, sg }); }
  // Lauf-Beine (Mitte + hinten)
  m.legs = []; for (const [sg, z] of [[-1, 0.02], [1, 0.02], [-1, -0.08], [1, -0.08]]) { const h = new THREE.Group(); h.position.set(sg * 0.04, -0.02, z); m.body.add(h); const a = legSeg(0.2, 0.01, 0.007, bm); h.add(a); const kn = new THREE.Group(); kn.position.y = -0.2; h.add(kn); const kj = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 6), bm); kn.add(kj); const ft = legSeg(0.06, 0.004, 0.003, dm); ft.position.y = -0.2; ft.rotation.z = sg * 0.9; kn.add(ft); const b = legSeg(0.2, 0.007, 0.004, bm); kn.add(b); m.legs.push({ h, kn, sg, z }); }
  return m; }
// pose: strike 0..1 (Fangarme ausfahren), headY (Kopfdrehung), walk Phase, headless, glow (Ganglion), lean
function poseMantis(m, { pos, yaw = 0, headY = 0, headP = 0, strike = 0, walk = 0, walkK = 0, headless = false, glow = 0, vis = true, eat = 0, T = 0, pitch = 0, lift = 0 } = {}) { m.root.visible = vis; if (!vis) return; m.root.position.copy(pos); m.root.rotation.set(pitch, yaw, 0, 'YXZ'); m.root.scale.setScalar(m.s);
  m.body.position.y = 0.17 + lift; m.neck.rotation.set(0, headY, 0); m.head.rotation.set(0.75 + headP + eat * 0.25 * Math.sin(T * 14), 0, 0); m.head.visible = !headless; m.gang.visible = glow > 0; m.gang.scale.setScalar(0.5 + glow * (0.8 + 0.3 * Math.sin(T * 8)));
  m.raps.forEach(r => { r.cx.rotation.set(lerp(-0.6, -1.6, strike) + eat * 0.3, 0, r.sg * 0.15); r.fe.rotation.set(lerp(-0.4, 0.4, strike), 0, 0); r.ti.rotation.set(lerp(2.7, 0.5, strike), 0, 0); });
  m.legs.forEach((l, k) => { const ph = walk + k * 1.6; l.h.rotation.set((l.z > 0 ? 0.4 : -0.5) + Math.sin(ph) * 0.35 * walkK, 0, l.sg * 1.0); l.kn.rotation.set(0, 0, -l.sg * 1.4 + Math.max(0, Math.sin(ph + 1)) * 0.3 * walkK); }); }
const headW = m => { m.root.updateMatrixWorld(true); return m.head.getWorldPosition(V(0, 0, 0)); };
const fem = makeMantis({ s: 1.6, col: 0x6ab83a, col2: 0x9ad85a }), mal = makeMantis({ s: 1.15, col: 0x8a9a4a, col2: 0xb0c070 });
// Fliege
G.fly = new THREE.Group(); scene.add(G.fly); { const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), M(0x2a2a2a)); b.scale.z = 1.5; G.fly.add(b); for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 6), M(0xe0eef8, { transparent: true, opacity: 0.6 })); w.scale.set(1, 0.1, 0.5); w.position.set(s * 0.06, 0.03, -0.02); G.fly.add(w); G.fly.userData[s] = w; } const e = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), M(0x9a2a1a)); e.position.z = 0.07; G.fly.add(e); }
// Eipaket (Schaum)
G.ooth = new THREE.Group(); scene.add(G.ooth); { const om = M(0xd8c49a, { roughness: 0.95, bumpMap: scaleTex, bumpScale: 1.2 }); const r = rng(3); for (let k = 0; k < 14; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.09 + r() * 0.05, 12, 10), om); b.position.set((r() - 0.5) * 0.12, -0.04 - r() * 0.12, (k - 7) * 0.035); G.ooth.add(b); G.ooth.userData[k] = b; } }
function oothSet(k) { G.ooth.children.forEach((b, i) => b.scale.setScalar(Math.max(1e-3, clamp(k * 14 - i) * 1))); G.ooth.visible = k > 0; }
function mood(m) { const P = { day: [0x8fc4ec, 0xf2f0d8, 0xffecc0, 3.0, 1.5, 0xd8e8c8], dusk: [0x6a70aa, 0xf0b088, 0xffb070, 2.4, 1.2, 0xd8b8a0] }[m];
  skyU.top.value.set(P[0]); skyU.hor.value.set(P[1]); sun.color.set(P[2]); sun.intensity = P[3]; hemi.intensity = P[4]; scene.fog.color.set(P[5]); }
