// ---------- Tiger: Dschungel, Fluss, Tiger, Hirsche, Junge ----------
const G = {}; const UT = { uStripe: { value: 1 }, uDeer: { value: 0 } };
world.visible = true;
// Streifen-Material: Muster aus Objektkoordinaten (Achse, Frequenz), heller Bauch
function stripeMat({ ax = V(0, 0, 1), f = 14, bellyY = -0.35, bellyAx = V(0, 1, 0), base = 0xd8661c, cream = 0xf2e6cc, stripes = 1 } = {}) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });
  m.onBeforeCompile = sh => { sh.uniforms.uStripe = UT.uStripe; sh.uniforms.uDeer = UT.uDeer; sh.uniforms.uAx = { value: ax }; sh.uniforms.uF = { value: f }; sh.uniforms.uBY = { value: bellyY }; sh.uniforms.uBA = { value: bellyAx };
    sh.uniforms.uBase = { value: new THREE.Color(base) }; sh.uniforms.uCream = { value: new THREE.Color(cream) }; sh.uniforms.uSt = { value: stripes };
    sh.vertexShader = 'varying vec3 vP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vP = position;');
    sh.fragmentShader = 'uniform float uStripe, uDeer, uF, uBY, uSt; uniform vec3 uAx, uBA, uBase, uCream; varying vec3 vP;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
    { float n = sin(vP.x * 5.0 + vP.y * 3.0) * 0.5 + sin(vP.y * 9.0 - vP.z * 4.0) * 0.3 + sin(vP.z * 13.0 + vP.x * 7.0) * 0.15;
      float s = sin(dot(vP, uAx) * uF + n * 2.4); float bel = smoothstep(uBY + 0.08, uBY - 0.08, dot(vP, uBA));
      float st = smoothstep(0.62, 0.74, s) * uStripe * uSt * (1.0 - 0.7 * bel); vec3 c = mix(uBase, uCream, bel); c = mix(c, vec3(0.05, 0.04, 0.035), st);
      vec3 dc = vec3((c.r + c.g) * 0.36, (c.r + c.g) * 0.5, c.b * 0.7); diffuseColor.rgb = mix(c, dc, uDeer); }`); };
  m.customProgramCacheKey = () => 'stripe' + f + ax.x + ax.y + ax.z + bellyY + stripes + base; return m; }
// Hirsch-Fell (Axishirsch mit weißen Punkten)
const deerTex = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#9a5f2e'; g.fillRect(0, 0, w, h); const r = rng(4); g.fillStyle = '#f2e8d8'; for (let k = 0; k < 220; k++) { g.beginPath(); g.arc(r() * w, h * 0.2 + r() * h * 0.6, 3 + r() * 4, 0, 7); g.fill(); } });
deerTex.colorSpace = THREE.SRGBColorSpace;
// ---------- Vierbeiner-Baukasten ----------
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
    let hoof; if (o.paw) { hoof = new THREE.Mesh(new THREE.SphereGeometry(o.legR * 1.5, 14, 10), o.lowMat || o.legMat); hoof.scale.set(1, 0.6, 1.35); hoof.position.set(0, -seg + o.legR * 0.3, o.legR * 0.5); knee.add(hoof);
      const padM = new THREE.MeshStandardMaterial({ color: 0x3a2a2a, roughness: 0.9 }); const pad = new THREE.Mesh(new THREE.SphereGeometry(o.legR * 0.7, 10, 8), padM); pad.scale.set(1.3, 0.35, 1); pad.position.set(0, -o.legR * 0.8, -0.1 * o.legR); hoof.add(pad);
      for (let k = 0; k < 4; k++) { const tp = new THREE.Mesh(new THREE.SphereGeometry(o.legR * 0.32, 8, 6), padM); tp.scale.y = 0.4; tp.position.set((k - 1.5) * o.legR * 0.5, -o.legR * 0.8, o.legR * 0.95); hoof.add(tp); }
      if (front) { const cg = new THREE.Group(); hoof.add(cg); for (let k = 0; k < 4; k++) { const c = new THREE.Mesh(new THREE.ConeGeometry(o.legR * 0.13, o.legR * 0.9, 6), new THREE.MeshStandardMaterial({ color: 0xf0ead8, roughness: 0.3 })); c.position.set((k - 1.5) * o.legR * 0.48, -o.legR * 0.2, o.legR * 1.25); c.rotation.x = 1.9; cg.add(c); } (q.claws = q.claws || []).push(cg); } }
    else { hoof = new THREE.Mesh(new THREE.CylinderGeometry(o.legR * 0.8, o.legR * 1.05, o.legR * 1.6, 10), new THREE.MeshStandardMaterial({ color: o.hoof || 0x2a2018, roughness: 0.6 })); hoof.position.y = -seg; knee.add(hoof); }
    q.legs.push({ hip, knee, sx, front, paw: hoof }); }
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
    const ear = new THREE.Mesh(o.roundEar ? new THREE.SphereGeometry(o.headH * 0.32, 12, 8) : new THREE.ConeGeometry(o.headH * 0.28, o.headH * 0.9, 8), o.earMat || hm); ear.position.set(s * o.headW * (o.roundEar ? 0.7 : 0.95), o.headH * (o.roundEar ? 0.85 : 0.75), o.headL * 0.05); ear.rotation.set(-0.3, 0, o.roundEar ? -s * 0.3 : -s * 1.15); ear.scale.z = o.roundEar ? 0.35 : 0.5; q.head.add(ear);
    if (o.earSpot) { const sp = new THREE.Mesh(new THREE.CircleGeometry(o.headH * 0.17, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x505050, roughness: 0.6, side: THREE.DoubleSide })); sp.position.set(0, 0.02 * o.headH, -1.02 * o.headH * 0.32 * 0.35 / 0.35 * 1.0); sp.rotation.y = Math.PI; ear.add(sp); sp.position.z = -o.headH * 0.33; (q.spots = q.spots || []).push(sp); }
    if (o.antlers) { const am = new THREE.MeshStandardMaterial({ color: 0x8a7458, roughness: 0.7 }); const main = new THREE.CatmullRomCurve3([V(0, 0, 0), V(s * 0.12, 0.25, -0.05), V(s * 0.2, 0.5, 0.02), V(s * 0.18, 0.7, 0.1)]); const ag = new THREE.Group(); ag.position.set(s * 0.05, o.headH * 0.85, o.headL * 0.02); q.head.add(ag); ag.add(new THREE.Mesh(new THREE.TubeGeometry(main, 16, 0.016, 6), am));
      for (const u of [0.3, 0.55, 0.8]) { const p = main.getPoint(u); ag.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([p, p.clone().add(V(s * 0.02, 0.1, 0.1)), p.clone().add(V(s * 0.01, 0.18, 0.15))]), 8, 0.01, 5), am)); } }
    if (o.ossi) { const os = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.2, 8), hm); os.position.set(s * 0.06, o.headH + 0.06, -o.headL * 0.02); os.rotation.set(-0.25, 0, -s * 0.15); q.head.add(os); const tip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshStandardMaterial({ color: 0x1e1610, roughness: 1 })); tip.position.set(0, 0.1, 0); os.add(tip); }
    if (o.horns) { const c = new THREE.CatmullRomCurve3([V(0, 0, 0), V(s * 0.05, 0.15, -0.08), V(s * 0.02, 0.32, -0.12), V(s * 0.07, 0.45, -0.04)]); const hr = new THREE.Mesh(new THREE.TubeGeometry(c, 16, 0.016, 6), new THREE.MeshStandardMaterial({ color: 0x2e2620, roughness: 0.6 })); hr.position.set(s * 0.05, o.headH * 0.8, o.headL * 0.05); q.head.add(hr); } }
  if (o.mane === 'lion') { const g = new THREE.IcosahedronGeometry(1, 3); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const v = V(p.getX(i), p.getY(i), p.getZ(i)); v.multiplyScalar(1 + 0.25 * fbm(v.x * 3, v.y * 3, v.z * 3, 2)); p.setXYZ(i, v.x, v.y, v.z); } g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x6a3e1c, roughness: 1, flatShading: true })); m.scale.set(o.headW * 1.9, o.headH * 1.9, o.headL * 0.55); m.position.set(0, 0.02, -o.headL * 0.02); m.castShadow = true; q.head.add(m); }
  // Röntgen: Herz, Ader, Blutstropfen, Ventile
  if (o.xray) { q.heart = new THREE.Group(); const hM = new THREE.MeshStandardMaterial({ color: 0xc8202c, emissive: 0x5a0008, roughness: 0.35 }); for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 14), hM); l.position.set(s * 0.09, 0.05, 0); q.heart.add(l); } const tip = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.3, 18), hM); tip.rotation.x = Math.PI; tip.position.y = -0.17; q.heart.add(tip);
    q.heart.position.set(0, -o.bodyH * 0.2, o.bodyL * 0.3); q.body.add(q.heart); q.vessel = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ color: 0xb01826, emissive: 0x400006, roughness: 0.4, transparent: true, opacity: 0.85 })); q.body.add(q.vessel);
    q.NB = 60; q.blood = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3040 }), q.NB); q.blood.frustumCulled = false; q.body.add(q.blood);
    q.valves = []; for (let k = 0; k < 5; k++) { const v = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.022, 8, 20), new THREE.MeshStandardMaterial({ color: 0xffd24a, emissive: 0x6a4a00, roughness: 0.3 })); q.body.add(v); q.valves.push(v); } }
  if (o.jaw) { q.jaw = new THREE.Group(); q.jaw.position.set(0, -o.headH * 0.35, o.headL * 0.3); q.head.add(q.jaw); const jw = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), o.lowMat || hm); jw.scale.set(o.headW * 0.6, o.headH * 0.22, o.headL * 0.34); jw.position.z = o.headL * 0.22; q.jaw.add(jw);
    const mo = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshStandardMaterial({ color: 0x5a1414, roughness: 0.6 })); mo.scale.set(o.headW * 0.5, o.headH * 0.3, o.headL * 0.3); mo.position.set(0, -o.headH * 0.3, o.headL * 0.5); q.head.add(mo); q.mouth = mo;
    const fm = new THREE.MeshStandardMaterial({ color: 0xf4eedc, roughness: 0.3 }); for (const s of [-1, 1]) { const f = new THREE.Mesh(new THREE.ConeGeometry(o.headW * 0.07, o.headH * 0.35, 6), fm); f.rotation.x = Math.PI; f.position.set(s * o.headW * 0.25, -o.headH * 0.35, o.headL * 0.68); q.head.add(f); } }
  q.tongue = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshPhysicalMaterial({ color: 0x2a2440, roughness: 0.35, clearcoat: 0.6 })); q.tongue.castShadow = true; scene.add(q.tongue);
  return q; }
// pose: neckP = Halswinkel über der Waagerechten, headP = Kopfneigung (+ = Nase runter), walk = Gangphase, splay 0..1, lie 0..1, crouch 0..1
function poseQ(q, { pos = V(0, 0, 0), yaw = 0, neckP = 1.0, neckY = 0, neckL = null, headP = 0.4, walk = 0, walkK = 0, splay = 0, lie = 0, crouch = 0, eyes = 1, xray = 0, flow = 0, flowSpeed = 1, valves = 0, tongue = null, vis = true, T = 0, tilt = null, scale = 1, roll = 0, claws = 1, jaw = 0, belly = 1, tailUp = 0 } = {}) {
  const o = q.o; q.root.visible = vis; q.tongue.visible = false; if (!vis) return; q.root.position.copy(pos); q.root.rotation.set(0, yaw, roll, 'YXZ'); q.root.scale.setScalar(scale); if (q.claws) q.claws.forEach(c => c.scale.setScalar(Math.max(1e-3, claws))); if (q.jaw) { q.jaw.rotation.x = jaw * 0.7; q.mouth.scale.y = Math.max(0.01, jaw) * q.o.headH * 0.3; } q.bodyMesh.scale.x = q.o.bodyW * belly; q.bodyMesh.scale.y = q.o.bodyH * lerp(1, belly, 0.6);
  const stand = o.legL + o.bodyH * 0.1; let by = lerp(stand, o.bodyH * 0.92, ease(lie)) - crouch * o.legL * 0.3 - splay * o.legL * 0.22; q.body.position.y = by;
  q.body.rotation.x = (tilt === null ? o.tilt : tilt) + splay * 0.12 + Math.sin(walk * 2) * 0.01 * walkK;
  q.legs.forEach(L => { const ph = walk + (L.sx < 0 ? 0 : Math.PI) + (L.front ? 0 : Math.PI * 0.15); let ux = Math.sin(ph) * 0.35 * walkK, kx = Math.max(0, Math.sin(ph + 1.2)) * 0.7 * walkK * (L.front ? -1 : 1), uz = 0;
    if (L.front) { uz = -L.sx * 0.42 * splay; ux += 0.08 * splay; } ux += crouch * (L.front ? 0.5 : -0.6); kx += crouch * (L.front ? -1.0 : 1.1);
    ux = lerp(ux, L.front ? -1.4 : 1.5, ease(lie)); kx = lerp(kx, L.front ? 2.9 : -2.8, ease(lie)); L.hip.rotation.set(ux, 0, uz); L.knee.rotation.set(kx, 0, 0); });
  if (q.tail) q.tail.rotation.set(0.1 + (q.o.tailX || 0) - tailUp + 0.08 * Math.sin(T * 2.3), 0, 0.12 * Math.sin(T * 1.7));
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
const tBody = stripeMat({ ax: V(0, 0, 1), f: 24, bellyY: -0.45 }), tNeck = stripeMat({ ax: V(0, 0, 1), f: 30, bellyY: -0.12 + 0.6, bellyAx: V(0, 1, 0), stripes: 1 }), tLeg = stripeMat({ ax: V(0, 1, 0), f: 22, bellyY: -9 }), tLow = stripeMat({ ax: V(0, 1, 0), f: 26, bellyY: -9, stripes: 0.6 }),
  tHead = stripeMat({ ax: V(1, 0.3, 0), f: 16, bellyY: -0.15 }), tEar = new THREE.MeshStandardMaterial({ color: 0x1a1512, roughness: 0.9 });
const TIG = { legL: 0.55, legR: 0.075, bodyL: 1.8, bodyW: 0.34, bodyH: 0.4, neckL: 0.3, neckR0: 0.25, neckR1: 0.21, headL: 0.44, headW: 0.21, headH: 0.2, snout: 0.22, tilt: 0, tailL: 0.95, tailX: -0.6, paw: true, roundEar: true, earSpot: true, jaw: true,
  bodyMat: tBody, neckMat: tNeck, legMat: tLeg, lowMat: tLow, headMat: tHead, earMat: tEar, muzzle: 0xf2e8d4 };
const tiger = makeQuad(TIG), rival = makeQuad(TIG), cubs = [0, 1].map(() => makeQuad(TIG));
const deerM = new THREE.MeshStandardMaterial({ map: deerTex, roughness: 0.85 }), deerLeg = new THREE.MeshStandardMaterial({ color: 0x8a5630, roughness: 0.85 });
const DEER = { legL: 0.72, legR: 0.035, bodyL: 1.15, bodyW: 0.24, bodyH: 0.32, neckL: 0.48, neckR0: 0.12, neckR1: 0.08, headL: 0.32, headW: 0.09, headH: 0.1, snout: 0.4, tilt: 0, tailL: 0.18, antlers: true,
  bodyMat: deerM, neckMat: deerLeg, legMat: deerLeg, lowMat: new THREE.MeshStandardMaterial({ color: 0xd8c8a8, roughness: 0.85 }), headMat: deerLeg, belly: 0xf0e6d4, muzzle: 0x2a2018 };
const deer = makeQuad(DEER), deer2 = makeQuad(DEER);
const headW = q => { q.root.updateMatrixWorld(true); return q.head.getWorldPosition(V(0, 0, 0)); };
const pawW = (q, k = 0) => { q.root.updateMatrixWorld(true); return q.legs[k].paw.getWorldPosition(V(0, 0, 0)); };

// ---------- Umgebung ----------
const RZ0 = -10, RZ1 = -6; // Fluss-Streifen
{ const Z = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < GRASS_BASE.length; i++) { const e = GRASS_BASE[i].elements; if (e[14] > RZ0 - 0.3 && e[14] < RZ1 + 0.3 && Math.abs(e[12]) < 30) { GRASS_BASE[i] = Z.clone(); GRASS.setMatrixAt(i, Z); } } GRASS.instanceMatrix.needsUpdate = true; }
const jung = new THREE.Group(); scene.add(jung);
{ const r = rng(33); const leafMs = [0x2c5a22, 0x3a6a2a, 0x24481c, 0x4a7a30].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, flatShading: true }));
  // Büsche rund um den Drehort
  for (let i = 0; i < 70; i++) { const a = r() * 6.28, d = 3.2 + r() * 8; const x = Math.cos(a) * d, z = Math.sin(a) * d; if (z > RZ0 - 1 && z < RZ1 + 1) continue; const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4 + r() * 0.6, 1), leafMs[(r() * 4) | 0]); b.position.set(x, 0.25 + r() * 0.3, z); b.scale.y = 0.75; b.castShadow = b.receiveShadow = true; jung.add(b); (G.bushes = G.bushes || []).push(b); }
  // Großblättrige Pflanzen (Versteck in Shot 2/3)
  G.hide = new THREE.Group(); G.hide.position.set(-0.6, 0, 1.2); jung.add(G.hide); const lg = new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2); lg.scale(0.18, 0.02, 0.45); lg.translate(0, 0, 0.4);
  for (let k = 0; k < 34; k++) { const m = new THREE.Mesh(lg, leafMs[(r() * 4) | 0]); m.position.set((r() - 0.5) * 2.4, 0.05 + r() * 0.15, (r() - 0.5) * 1.0); m.rotation.set(-0.6 - r() * 0.6, r() * 6.28, 0); m.scale.setScalar(0.8 + r() * 0.8); m.castShadow = true; G.hide.add(m); }
  // Trockenes Laub
  const leaf = new THREE.CircleGeometry(0.035, 7); leaf.scale(1, 0.55, 1); leaf.rotateX(-Math.PI / 2); const NL = 1600; const lm = new THREE.InstancedMesh(leaf, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, side: THREE.DoubleSide }), NL); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
  for (let i = 0; i < NL; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * 3.5; const x = 1.0 + Math.cos(a) * d, z = 2.5 + Math.sin(a) * d; m4.compose(V(x, 0.015 + r() * 0.01, z), q.setFromEuler(new THREE.Euler((r() - 0.5) * 0.5, r() * 6.3, 0)), V(1, 1, 1).multiplyScalar(0.7 + r())); lm.setMatrixAt(i, m4); col.setHSL(0.06 + r() * 0.05, 0.55, 0.25 + r() * 0.15); lm.setColorAt(i, col); } jung.add(lm);
  // Kratzbaum
  G.tree = new THREE.Group(); G.tree.position.set(2.6, 0, -2.4); jung.add(G.tree); const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.45, 7, 18), new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.95, bumpMap: scaleTex, bumpScale: 3 })); trunk.position.y = 3.5; trunk.castShadow = true; G.tree.add(trunk);
  for (let k = 0; k < 6; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4 + r(), 1), leafMs[k % 4]); b.position.set((r() - 0.5) * 2.5, 6.5 + r() * 1.2, (r() - 0.5) * 2.5); b.scale.y = 0.6; G.tree.add(b); }
  G.scratch = []; const sm = new THREE.MeshBasicMaterial({ color: 0xf2e2c0 }); for (let k = 0; k < 4; k++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.6, 0.03), sm); const a = 0.35 + k * 0.09; s.position.set(Math.sin(a) * 0.445, 1.0 - k * 0.03, Math.cos(a) * 0.445); s.rotation.set(0, a, 0.12); G.tree.add(s); G.scratch.push(s); }
  // Hohes Gras (Junge)
  G.CB = V(-4, 0, 3); const bl = new THREE.BufferGeometry(); bl.setAttribute('position', new THREE.Float32BufferAttribute([-0.012, 0, 0, 0.012, 0, 0, -0.008, 0.35, 0.03, 0.008, 0.35, 0.03, 0, 0.75, 0.1], 3)); bl.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]); bl.computeVertexNormals();
  const NT = 5000; const tg = new THREE.InstancedMesh(bl, new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.85 }), NT); G.tallBase = [];
  for (let i = 0; i < NT; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * 4; const x = G.CB.x + Math.cos(a) * d, z = G.CB.z + Math.sin(a) * d; m4.compose(V(x, 0, z), q.setFromEuler(new THREE.Euler((r() - 0.5) * 0.5, r() * 6.3, (r() - 0.5) * 0.5)), V(1, 0.7 + r() * 0.6, 1)); tg.setMatrixAt(i, m4); G.tallBase.push(m4.clone()); col.setHSL(0.18 + r() * 0.06, 0.5, 0.28 + r() * 0.15); tg.setColorAt(i, col); }
  G.tall = tg; jung.add(tg); }
function segDist(p, a, b) { const ab = b.clone().sub(a), t = clamp(p.clone().sub(a).dot(ab) / ab.lengthSq()); return p.distanceTo(a.clone().addScaledVector(ab, t)); }
function tallHide() { const c = camera.position, L = LOOK.clone().add(c.clone().sub(LOOK).multiplyScalar(0.25)), Z = new THREE.Matrix4().makeScale(0, 0, 0), P = V(0, 0, 0);
  for (let i = 0; i < G.tallBase.length; i++) { const e = G.tallBase[i].elements; P.set(e[12], Math.min(c.y, 0.5), e[14]); G.tall.setMatrixAt(i, segDist(P, c, L) < 0.35 ? Z : G.tallBase[i]); } G.tall.instanceMatrix.needsUpdate = true;
  G.bushes.forEach(b => { b.visible = segDist(b.position, c, L) > b.scale.x * 1.0 * (b.geometry.parameters.radius || 1) + 0.25; }); }
// Fluss (nur in der Fluss-Szene: Boden aus, eigenes Flussbett + Ufer)
G.river = new THREE.Group(); scene.add(G.river);
{ const bed = new THREE.Mesh(new THREE.PlaneGeometry(80, RZ1 - RZ0 + 2), new THREE.MeshStandardMaterial({ color: 0x5a4a32, roughness: 1, bumpMap: scaleTex, bumpScale: 1 })); bed.rotation.x = -Math.PI / 2; bed.position.set(0, -0.7, (RZ0 + RZ1) / 2); G.river.add(bed);
  for (const [z0, z1] of [[RZ1, 60], [-60, RZ0]]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(200, z1 - z0), new THREE.MeshStandardMaterial({ color: 0xffffff, map: grassTex, roughness: 0.95 })); b.rotation.x = -Math.PI / 2; b.position.set(0, 0, (z0 + z1) / 2); b.receiveShadow = true; G.river.add(b);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(200, 0.75, 0.3), new THREE.MeshStandardMaterial({ color: 0x5e4a30, roughness: 1, bumpMap: scaleTex, bumpScale: 2 })); edge.position.set(0, -0.36, z0 === RZ1 ? RZ1 : RZ0); G.river.add(edge); }
  G.water = new THREE.Mesh(new THREE.PlaneGeometry(200, RZ1 - RZ0), new THREE.MeshStandardMaterial({ color: 0x4a6a62, roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.82 })); G.water.rotation.x = -Math.PI / 2; G.water.position.set(0, -0.12, (RZ0 + RZ1) / 2); G.river.add(G.water); }
// Fleisch / Beute (liegender Hirsch dient als Riss)
function mood(m) { const P = { day: [0x8fb4dc, 0xf2e6cf, 0xffe0b0, 3.0, 1.45, 0xd8e0c8], hot: [0x9ac4ea, 0xfff4d6, 0xfff2cc, 4.4, 1.7, 0xf2ecd4], dusk: [0x5a5f9a, 0xf2a46a, 0xffa060, 2.8, 1.15, 0xc8a07e] }[m];
  skyU.top.value.set(P[0]); skyU.hor.value.set(P[1]); sun.color.set(P[2]); sun.intensity = P[3]; hemi.intensity = P[4]; scene.fog.color.set(P[5]); }
