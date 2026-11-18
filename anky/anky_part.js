
// ---------- Ankylosaurus ----------
const AK_SIDE = new THREE.Color(0x9b8f70), AK_BACK = new THREE.Color(0x6e6650), AK_BELLY = new THREE.Color(0xcbbd98), AK_DARK = new THREE.Color(0x4a4334);
function akColor(ny, x, y, z, c) {
  c.copy(AK_BELLY).lerp(AK_SIDE, clamp((ny + 0.55) / 0.6)).lerp(AK_BACK, clamp((ny - 0.25) / 0.6));
  const n = Math.sin(x * 6.1 + z * 2.3) * Math.sin(y * 4.7 - z * 3.9) + 0.5 * Math.sin(x * 13 + y * 11 + z * 9);
  c.multiplyScalar(0.92 + 0.07 * n); return c;
}
function akCol(geo, us = 1.3, vs = 0.8) {
  geo.computeVertexNormals(); const p = geo.attributes.position, n = geo.attributes.normal; const cols = new Float32Array(p.count * 3); const c = new THREE.Color();
  if (geo.attributes.uv && (us !== 1 || vs !== 1)) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * us, uv.getY(i) * vs); }
  for (let i = 0; i < p.count; i++) { akColor(n.getY(i), p.getX(i), p.getY(i), p.getZ(i), c); cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); return geo;
}
// Rumpf: breit, flach, Rücken leicht gewölbt (Einheitskugel -> Körper)
const AKB = { y: 1.5 };
function akBody(x, y, z) {
  const w = 1.32 * (1 - 0.16 * z * z) * (1 + 0.05 * z);
  const X = Math.sign(x) * Math.pow(Math.abs(x), 0.82) * w;
  const Y = y > 0 ? Math.pow(y, 0.75) * 0.74 * (1 - 0.1 * z * z) * (1 + 0.06 * (-z)) : y * 0.6;
  return V(X, AKB.y + Y, z * 2.35);
}
function akBodyN(x, y, z) { const e = 0.01; const p = akBody(x, y, z); const v = V(x, y, z);
  const t1 = V(-z, 0, x).normalize(); if (t1.lengthSq() < 1e-6) t1.set(1, 0, 0); const t2 = v.clone().cross(t1).normalize();
  const a = V(x, y, z).addScaledVector(t1, e).normalize(), b = V(x, y, z).addScaledVector(t2, e).normalize();
  const pa = akBody(a.x, a.y, a.z).sub(p), pb = akBody(b.x, b.y, b.z).sub(p); const n = pa.cross(pb).normalize(); if (n.dot(p.clone().sub(V(0, AKB.y, 0))) < 0) n.negate(); return n; }
const AK_NV = 22, AK_LEN = 5.2, AK_L = AK_LEN / AK_NV, AK_FUSE = 14, AK_BREAK = 18, AK_T0 = V(0, 1.62, -1.9);
const akR = u => u < 0.66 ? 0.17 + 0.5 * Math.pow(1 - u / 0.66, 1.5) : 0.17;
const armorM = new THREE.MeshStandardMaterial({ color: 0x5e5644, roughness: 0.55, bumpMap: scaleTex, bumpScale: 0.6 });
const spikeM = new THREE.MeshStandardMaterial({ color: 0x8a7f66, roughness: 0.45 });
const clubM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, bumpMap: scaleTex, bumpScale: 1.4 });
const fleshM = new THREE.MeshPhysicalMaterial({ color: 0xa3262a, roughness: 0.38, clearcoat: 0.55, clearcoatRoughness: 0.3, side: THREE.BackSide, map: muscleTex, emissive: 0x1a0003 });
const vertM = new THREE.MeshStandardMaterial({ color: 0xf2ead8, roughness: 0.45, emissive: 0x2a2620 });
const tendonM = new THREE.MeshStandardMaterial({ color: 0xe0cfa6, roughness: 0.4, emissive: 0x1c170e });
const crackM = new THREE.MeshBasicMaterial({ color: 0x1a0606 });
function makeAnky() {
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  const ol = outlineMat(0xffe27a, 0.05);
  const addM = (geo, parent, mat = skinM, outline = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; parent.add(m); if (outline) m.add(new THREE.Mesh(geo, ol)); return m; };
  // Rumpf
  const bg = new THREE.SphereGeometry(1, 72, 44); { const p = bg.attributes.position; for (let i = 0; i < p.count; i++) { const q = akBody(p.getX(i), p.getY(i), p.getZ(i)); p.setXYZ(i, q.x, q.y, q.z); } }
  addM(akCol(bg, 2.2, 1.2), body);
  // Hüft- und Schultermuskeln (weicher Übergang zu den Beinen)
  for (const [x, y, z, sx, sy, sz] of [[0.95, 1.2, 1.35, 0.42, 0.5, 0.5], [1.0, 1.25, -1.3, 0.5, 0.6, 0.62]]) for (const s of [-1, 1]) { const m = addM(akCol(new THREE.SphereGeometry(1, 28, 20)), body); m.position.set(s * x, y, z); m.scale.set(sx, sy, sz); }
  // Hals + Kopf
  const neck = addM(akCol(new THREE.SphereGeometry(1, 32, 22)), body); neck.position.set(0, 1.5, 2.3); neck.scale.set(0.72, 0.52, 0.62);
  const head = new THREE.Group(); head.position.set(0, 1.42, 2.95); head.scale.setScalar(1.3); body.add(head);
  const hg = new THREE.SphereGeometry(1, 48, 32); { const p = hg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const f = (z + 1) / 2;
    const w = 0.66 * (1 - 0.42 * Math.pow(f, 1.3)); const Y = y > 0 ? Math.pow(y, 0.7) * 0.36 * (1 - 0.3 * f) : y * 0.3 * (1 - 0.25 * f); p.setXYZ(i, Math.sign(x) * Math.pow(Math.abs(x), 0.8) * w, Y, z * 0.62); } }
  addM(akCol(hg), head);
  const beak = addM(akCol(new THREE.SphereGeometry(1, 24, 16)), head); beak.position.set(0, -0.07, 0.6); beak.scale.set(0.24, 0.15, 0.14); beak.material = new THREE.MeshStandardMaterial({ color: 0x6b5d45, roughness: 0.4 });
  for (const s of [-1, 1]) {
    const hornS = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.38, 10), spikeM); hornS.position.set(s * 0.52, 0.14, -0.38); hornS.rotation.set(-1.9, 0, s * 0.9); hornS.castShadow = true; head.add(hornS); // Schuppenhorn hinten
    const hornQ = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.3, 10), spikeM); hornQ.position.set(s * 0.5, -0.17, -0.15); hornQ.rotation.set(-2.5, 0, s * 2.2); hornQ.castShadow = true; head.add(hornQ); // Wangenhorn
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), new THREE.MeshStandardMaterial({ color: 0x1a0e05, roughness: 0.15 })); eye.position.set(s * 0.44, 0.1, 0.12); head.add(eye);
    const iris = new THREE.Mesh(new THREE.CircleGeometry(0.04, 20), new THREE.MeshStandardMaterial({ color: 0xc89a22, roughness: 0.25 })); iris.position.set(s * 0.494, 0.1, 0.12); iris.rotation.y = s * Math.PI / 2; head.add(iris);
    const pup = new THREE.Mesh(new THREE.CircleGeometry(0.02, 16), new THREE.MeshBasicMaterial({ color: 0x050302 })); pup.position.set(s * 0.496, 0.1, 0.12); pup.rotation.y = s * Math.PI / 2; head.add(pup);
    const brow = addM(akCol(new THREE.SphereGeometry(1, 16, 12)), head, skinM, false); brow.position.set(s * 0.43, 0.2, 0.1); brow.scale.set(0.1, 0.06, 0.14);
    const nos = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), new THREE.MeshStandardMaterial({ color: 0x1d140c })); nos.position.set(s * 0.17, 0.06, 0.6); nos.scale.set(1, 0.6, 1); head.add(nos);
  }
  // Kopfplatten (Panzer auf dem Schädel)
  { const r = rng(55); for (let k = 0; k < 14; k++) { const x = (r() - 0.5) * 0.8, z = -0.4 + r() * 0.8; const f = (z / 0.62 + 1) / 2; const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.09 + r() * 0.05, 0.11 + r() * 0.05, 0.05, 6), armorM); pl.position.set(x * (1 - 0.42 * f), 0.34 * (1 - 0.3 * f) - 0.02, z); pl.rotation.set((r() - .5) * 0.2, r() * 3, (r() - .5) * 0.2); pl.castShadow = true; head.add(pl); } }
  // Beine: kurze, kräftige Säulen mit Elefantenfüßen
  const legs = [];
  for (const [x, z, front] of [[-0.98, 1.4, 1], [0.98, 1.4, 1], [-1.02, -1.3, 0], [1.02, -1.3, 0]]) {
    const l = new THREE.Group(); l.position.set(x, 1.2, z); body.add(l); l.userData.front = front;
    const up = addM(akCol(new THREE.CylinderGeometry(0.27, front ? 0.34 : 0.4, 0.7, 18)), l); up.position.set(x * 0.04, -0.3, 0);
    const kn = addM(akCol(new THREE.SphereGeometry(1, 18, 12)), l, skinM, false); kn.position.set(x * 0.05, -0.66, front ? 0.04 : -0.04); kn.scale.set(0.27, 0.22, 0.27);
    const lo = addM(akCol(new THREE.CylinderGeometry(0.25, 0.25, 0.55, 18)), l); lo.position.set(x * 0.06, -0.92, 0.02);
    const foot = addM(akCol(new THREE.CylinderGeometry(0.26, 0.32, 0.18, 20)), l); foot.position.set(x * 0.06, -1.12, 0.06);
    for (let k = 0; k < (front ? 5 : 4); k++) { const nl = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 8), new THREE.MeshStandardMaterial({ color: 0x3a3226, roughness: 0.4 })); const a = -0.7 + k * (front ? 0.35 : 0.47); nl.scale.set(1, 0.7, 1.3); nl.position.set(x * 0.06 + Math.sin(a) * 0.3, -1.17, 0.06 + Math.cos(a) * 0.3); l.add(nl); }
    legs.push(l);
  }
  // Panzer: Reihen gekielter Knochenplatten + seitliche Stacheln + Nacken-Halbringe
  const osteoG = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2); { const p = osteoG.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setY(i, y * (0.45 + 0.75 * Math.exp(-x * x * 9))); } osteoG.computeVertexNormals(); }
  const plates = []; // [pos, normal, sx, sy, sz, delay]
  const basis = (n, fwd) => { const t = fwd.clone().addScaledVector(n, -fwd.dot(n)).normalize(); const b = n.clone().cross(t).normalize(); return new THREE.Matrix4().makeBasis(b, n, t); };
  for (let zi = -0.9; zi <= 0.86; zi += 0.1) { const rowW = Math.sqrt(Math.max(0, 1 - zi * zi)); const nAcross = Math.max(3, Math.round(rowW * 9)) | 1;
    for (let k = 0; k < nAcross; k++) { const ph = (k / (nAcross - 1) - 0.5) * 2.3; const x = Math.sin(ph) * rowW, y = Math.cos(ph) * rowW; if (y < 0.12) continue; const n0 = V(x, y, zi).normalize();
      const p = akBody(n0.x, n0.y, n0.z), n = akBodyN(n0.x, n0.y, n0.z); const big = 1 - 0.35 * Math.abs(ph) / 1.15; const s = 0.13 * big * (0.9 + 0.2 * Math.abs(Math.sin(k * 7.3 + zi * 13)));
      plates.push([p, n, s * 1.05, s * 0.9, s * 1.35, (zi + 1) / 2]); } }
  const spikes = []; for (let zi = -0.82; zi <= 0.8; zi += 0.13) for (const s of [-1, 1]) { const rowW = Math.sqrt(1 - zi * zi); const n0 = V(s * rowW * 0.97, 0.22, zi).normalize(); const p = akBody(n0.x, n0.y, n0.z); const n = akBodyN(n0.x, n0.y, n0.z);
    const dir = n.clone().multiplyScalar(1).add(V(0, 0.05, -0.35)).normalize(); const L = 0.26 + 0.2 * clamp((zi + 0.2) * 1.2); spikes.push([p, dir, L, (zi + 1) / 2]); }
  for (const zn of [2.05, 2.45]) for (let k = 0; k < 6; k++) { const a = (k / 5 - 0.5) * 2.4; const n = V(Math.sin(a), Math.cos(a), 0.15).normalize(); const p = V(Math.sin(a) * 0.72, 1.5 + Math.cos(a) * 0.53, zn); plates.push([p, n, 0.17, 0.17, 0.2, 1.05]); }
  for (const s of [-1, 1]) for (const zn of [2.1, 2.5]) { const p = V(s * 0.72, 1.55, zn); spikes.push([p, V(s, 0.35, -0.2).normalize(), 0.42, 1.05]); }
  const plateIM = new THREE.InstancedMesh(osteoG, armorM, plates.length); plateIM.castShadow = true; body.add(plateIM);
  const spikeG = new THREE.ConeGeometry(0.11, 1, 10); spikeG.translate(0, 0.5, 0); spikeG.scale(1, 1, 0.55);
  const spikeIM = new THREE.InstancedMesh(spikeG, spikeM, spikes.length); spikeIM.castShadow = true; body.add(spikeIM);
  const setArmor = k => { const m4 = new THREE.Matrix4(), sc = new THREE.Matrix4();
    plates.forEach(([p, n, sx, sy, sz, d], i) => { const kk = Math.max(0.0001, back(clamp(k * 1.6 - d * 0.6))); m4.copy(basis(n, V(0, 0, 1))).multiply(sc.makeScale(sx * kk, sy * kk, sz * kk)); m4.setPosition(p.clone().addScaledVector(n, -0.03)); plateIM.setMatrixAt(i, m4); });
    spikes.forEach(([p, dir, L, d], i) => { const kk = Math.max(0.0001, back(clamp(k * 1.6 - d * 0.6))); const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir); m4.compose(p.clone().addScaledVector(dir, -0.05), q, V(1.1 * kk, L * kk, 1.1 * kk)); spikeIM.setMatrixAt(i, m4); });
    plateIM.instanceMatrix.needsUpdate = spikeIM.instanceMatrix.needsUpdate = true; plateIM.visible = spikeIM.visible = k > 0.001; };
  setArmor(1);
  // ---- Schwanz: Haut-Schlauch entlang einer beweglichen Wirbelkette ----
  const SUB = 3, ROWS = AK_NV * SUB + 1, RS = 26;
  const tg = new THREE.BufferGeometry(); const tpos = new Float32Array(ROWS * RS * 3), tuv = new Float32Array(ROWS * RS * 2), tcut = new Float32Array(ROWS * RS * 2), tcol = new Float32Array(ROWS * RS * 3); const tidx = [];
  for (let i = 0; i < ROWS - 1; i++) for (let j = 0; j < RS; j++) { const a = i * RS + j, b = i * RS + (j + 1) % RS, c = a + RS, d = b + RS; tidx.push(a, c, b, b, c, d); }
  for (let i = 0; i < ROWS; i++) for (let j = 0; j < RS; j++) { const k = i * RS + j; tuv[k * 2] = i / ROWS * 9; tuv[k * 2 + 1] = j / RS * 1.6; tcut[k * 2] = i / (ROWS - 1); tcut[k * 2 + 1] = j / RS * Math.PI * 2; }
  tg.setIndex(tidx); tg.setAttribute('position', new THREE.BufferAttribute(tpos, 3)); tg.setAttribute('uv', new THREE.BufferAttribute(tuv, 2)); tg.setAttribute('aCut', new THREE.BufferAttribute(tcut, 2)); tg.setAttribute('color', new THREE.BufferAttribute(tcol, 3));
  const cutU = { uX: { value: 0 }, uU0: { value: 0.3 }, uU1: { value: 0.9 }, uA: { value: Math.PI / 2 }, uW: { value: 0.95 } };
  const tailM = skinM.clone(); tailM.side = THREE.FrontSide;
  tailM.onBeforeCompile = sh => { skinVar(sh); Object.assign(sh.uniforms, cutU);
    sh.vertexShader = 'attribute vec2 aCut; varying vec2 vCut;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vCut = aCut;');
    sh.fragmentShader = 'uniform float uX, uU0, uU1, uA, uW; varying vec2 vCut;\n' + sh.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
      float dA = abs(mod(vCut.y - uA + 3.14159265, 6.2831853) - 3.14159265); float du = min(vCut.x - uU0, uU1 - vCut.x);
      float inWin = uX > 0.0 ? min(du * 9.0, (uW - dA) * 2.2) : -1.0; if (inWin > 0.12) discard;`)
      .replace('#include <color_fragment>', '#include <color_fragment>\n if (inWin > -0.02) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.78, 0.36, 0.36), 0.85);'); };
  tailM.customProgramCacheKey = () => 'akTail';
  const tail = new THREE.Mesh(tg, tailM); tail.castShadow = true; tail.receiveShadow = true; tail.frustumCulled = false; body.add(tail);
  const tailOl = new THREE.Mesh(tg, ol); tailOl.frustumCulled = false; body.add(tailOl);
  const flesh = new THREE.Mesh(tg, fleshM); flesh.frustumCulled = false; body.add(flesh);
  // Keule: breite Knochenkeule mit zwei großen Seitenknollen, höckrige Osteoderm-Oberfläche
  const cg = new THREE.SphereGeometry(1, 64, 44); { const p = cg.attributes.position; const cols = []; const c = new THREE.Color(), a = new THREE.Color(0x7b7158), b = new THREE.Color(0x4f4839);
    for (let i = 0; i < p.count; i++) { const v = V(p.getX(i), p.getY(i), p.getZ(i)); const lob = Math.exp(-Math.pow((Math.abs(v.x) - 0.82), 2) * 6) * Math.exp(-v.y * v.y * 3);
      const bump = 0.07 * (fbm(v.x * 4 + 3, v.y * 4, v.z * 4, 3) - 0.5) + 0.05 * Math.pow(Math.abs(Math.sin(v.x * 9) * Math.sin(v.z * 8 + v.y * 5)), 3);
      const r = 1 + bump; p.setXYZ(i, v.x * (0.42 + 0.3 * lob) * r, v.y * (0.27 + 0.06 * lob) * r, (v.z * 0.44 + 0.08 * v.z * lob) * r);
      c.copy(a).lerp(b, clamp(0.4 + (fbm(v.x * 6, v.y * 6, v.z * 6, 2) - 0.5) * 2)); cols.push(c.r, c.g, c.b); }
    cg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); cg.computeVertexNormals(); }
  const club = new THREE.Group(); body.add(club); const clubMesh = new THREE.Mesh(cg, clubM); clubMesh.castShadow = true; clubMesh.position.z = 0.3; club.add(clubMesh); clubMesh.add(new THREE.Mesh(cg, ol));
  // Wirbel (Röntgenblick)
  const vertGeo = (() => { const parts = []; const cen = new THREE.CylinderGeometry(1, 1, 1, 14); cen.rotateX(Math.PI / 2); parts.push(cen); return parts; })();
  const verts = []; for (let i = 0; i < AK_NV; i++) { const g = new THREE.Group(); const cen = new THREE.Mesh(vertGeo[0], vertM); g.add(cen);
    const nsG = new THREE.BoxGeometry(0.3, 1, 0.45); nsG.translate(0, 0.5, 0); const ns = new THREE.Mesh(nsG, vertM); ns.position.y = 0.6; g.add(ns); // Dornfortsatz
    const tps = [-1, 1].map(s => { const tg2 = new THREE.BoxGeometry(1, 0.25, 0.4); tg2.translate(s * 0.5, 0, 0); const tp = new THREE.Mesh(tg2, vertM); tp.position.x = s * 0.7; g.add(tp); return tp; }); // Querfortsätze
    const chG = new THREE.BoxGeometry(0.26, 0.9, 0.35); chG.translate(0, -0.45, 0); const ch = new THREE.Mesh(chG, vertM); ch.position.y = -0.6; g.add(ch); // Hämalbogen
    g.userData = { cen, ns, ch, tps }; g.visible = false; body.add(g); verts.push(g); }
  // verwachsener Knochenstiel (2 Hälften für den Bruch) + Bruchkante
  const bar1 = new THREE.Mesh(new THREE.BufferGeometry(), vertM), bar2 = new THREE.Mesh(new THREE.BufferGeometry(), vertM); body.add(bar1, bar2); bar1.visible = bar2.visible = false;
  const crack = new THREE.Group(); body.add(crack); { const r = rng(91); for (let k = 0; k < 9; k++) { const sh = new THREE.Mesh(new THREE.TetrahedronGeometry(0.035 + r() * 0.03), crackM); const a = k / 9 * Math.PI * 2; sh.position.set(Math.cos(a) * 0.07, Math.sin(a) * 0.07, (r() - .5) * 0.04); crack.add(sh); }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.016, 6, 18), crackM); crack.add(ring); } crack.visible = false;
  const tendons = Array.from({ length: 8 }, () => { const m = new THREE.Mesh(new THREE.BufferGeometry(), tendonM); m.visible = false; m.castShadow = true; body.add(m); return m; });
  root.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
  return { root, body, head, neck, legs, ol, setArmor, tail, tailOl, flesh, tg, cutU, club, clubMesh, verts, bar1, bar2, crack, tendons, SUB, ROWS, RS, plateIM, spikeIM };
}
const anky = makeAnky(); scene.add(anky.root); anky.root.scale.setScalar(0.85);

// Schwanz-Pose: yaw/pitch je Gelenk -> Wirbelkette, Haut, Keule, Wirbel, Stiel, Sehnen
function tailChain(yaw, pitch) {
  const P = [AK_T0.clone()]; const D = []; let dir = V(0, -0.08, -1).normalize();
  for (let i = 0; i < AK_NV; i++) { dir.applyAxisAngle(V(0, 1, 0), yaw[i]); const ax = dir.clone().cross(V(0, 1, 0)).normalize(); dir.applyAxisAngle(ax, pitch[i]); D.push(dir.clone()); P.push(P[i].clone().addScaledVector(dir, AK_L)); }
  return { P, D };
}
function poseAnky(a, { yaw, pitch, xray = 0, win = [0.3, 0.92], winA = Math.PI / 2, winW = 0.95, fuse = 0, fused = false, crackK = 0, tendon = 0, armor = 1, phase = 0, amp = 0, t = 0, gapK = 0 }) {
  const { P, D } = tailChain(yaw, pitch); a.chain = { P, D };
  const curve = new THREE.CatmullRomCurve3(P, false, 'centripetal'); const pos = a.tg.attributes.position.array, col = a.tg.attributes.color.array; const c = new THREE.Color();
  for (let i = 0; i < a.ROWS; i++) { const u = i / (a.ROWS - 1); const p = curve.getPoint(u), T = curve.getTangent(u); const side = T.clone().cross(V(0, 1, 0)).normalize(), up = side.clone().cross(T).normalize();
    const r = akR(u) * (1 + 0.05 * Math.sin(u * 60) * (u < 0.66 ? 1 : 0.3));
    for (let j = 0; j < a.RS; j++) { const an = j / a.RS * Math.PI * 2; const ca = Math.cos(an), sa = Math.sin(an); const k = (i * a.RS + j) * 3;
      const q = p.clone().addScaledVector(side, ca * r * 1.12).addScaledVector(up, sa * r * (sa > 0 ? 0.9 : 0.8)); pos[k] = q.x; pos[k + 1] = q.y; pos[k + 2] = q.z;
      akColor(sa * 0.95, q.x, q.y, q.z, c); col[k] = c.r; col[k + 1] = c.g; col[k + 2] = c.b; } }
  a.tg.attributes.position.needsUpdate = a.tg.attributes.color.needsUpdate = true; a.tg.computeVertexNormals();
  const end = P[AK_NV], dEnd = D[AK_NV - 1]; a.club.position.copy(end); a.club.quaternion.setFromUnitVectors(V(0, 0, 1), dEnd);
  a.cutU.uX.value = xray; a.cutU.uU0.value = win[0]; a.cutU.uU1.value = win[1]; a.cutU.uA.value = winA; a.cutU.uW.value = winW; a.flesh.visible = xray > 0;
  // Wirbel
  a.verts.forEach((g, i) => { const u = (i + 0.5) / AK_NV; g.visible = xray > 0 && !(fused && i >= AK_FUSE); if (!g.visible) return; const r = akR(u);
    g.position.copy(P[i]).lerp(P[i + 1], 0.5); g.quaternion.setFromUnitVectors(V(0, 0, 1), D[i]); const fz = i >= AK_FUSE ? fuse : 0; const len = AK_L * lerp(lerp(0.74, 0.55, gapK), 1.04, fz);
    g.scale.set(r * 0.3, r * 0.3, len); g.userData.ns.scale.y = lerp(1, 0.3, fz); g.userData.ch.scale.y = lerp(1, 0.3, fz); g.userData.tps.forEach(m => m.scale.x = lerp(1, 0.4, fz)); });
  // verwachsener Stiel
  const barOn = xray > 0 && fused; a.bar1.visible = a.bar2.visible = barOn; a.crack.visible = barOn && crackK > 0;
  if (barOn) { const rb = 0.17 * 0.32; const mk = (i0, i1, gap0, gap1) => { const pts = []; for (let i = i0; i <= i1; i++) pts.push(P[i].clone()); const d0 = D[i0], d1 = D[i1 - 1];
      pts[0].addScaledVector(d0, gap0); pts[pts.length - 1].addScaledVector(d1, -gap1); const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, rb, 14, false);
      { const p = g.attributes.position; const nn = g.attributes.normal; for (let k = 0; k < p.count; k++) { const s = Math.floor(k / 15) / 40; const bump = 0.12 * Math.pow(Math.max(0, Math.sin(s * (i1 - i0) * Math.PI)), 8); p.setXYZ(k, p.getX(k) + nn.getX(k) * rb * bump, p.getY(k) + nn.getY(k) * rb * bump, p.getZ(k) + nn.getZ(k) * rb * bump); } g.computeVertexNormals(); }
      return g; };
    const g0 = crackK > 0 ? 0.02 * crackK : 0; a.bar1.geometry.dispose(); a.bar1.geometry = mk(AK_FUSE, AK_BREAK, 0.03, g0); a.bar2.geometry.dispose(); a.bar2.geometry = mk(AK_BREAK, AK_NV, g0, -0.1);
    if (crackK > 0) { a.crack.position.copy(P[AK_BREAK]); a.crack.quaternion.setFromUnitVectors(V(0, 0, 1), D[AK_BREAK]); a.crack.scale.setScalar(0.75 + 0.5 * crackK); } }
  // verknöcherte Sehnen: geflochtene Stränge um den Stiel
  a.tendons.forEach((m, j) => { m.visible = xray > 0 && tendon > 0.001; if (!m.visible) return; const i0 = AK_FUSE - 1, n = 70; const pts = []; const tw = (j % 2 ? 1 : -1); const a0 = j / a.tendons.length * Math.PI * 2;
    for (let k = 0; k <= n; k++) { const s = k / n; const f = i0 + s * (AK_NV - i0); const i = Math.min(AK_NV - 1, Math.floor(f)); const fr = f - i; const p = P[i].clone().lerp(P[i + 1], fr); const T = D[i];
      const side = T.clone().cross(V(0, 1, 0)).normalize(), up = side.clone().cross(T).normalize(); const ang = a0 + tw * s * Math.PI * 2.6; const rr = 0.17 * 0.32 * (1.7 + 0.35 * Math.sin(ang * 3 + j));
      pts.push(p.addScaledVector(side, Math.cos(ang) * rr).addScaledVector(up, Math.sin(ang) * rr)); }
    const kk = clamp(tendon * 1.25 - j * 0.03); const cnt = Math.max(2, Math.round(kk * n)); const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.slice(0, cnt + 1)), Math.max(4, cnt * 2), 0.018, 6, false);
    m.geometry.dispose(); m.geometry = g; });
  a.setArmor(armor);
  a.legs.forEach((l, i) => { l.rotation.x = Math.sin(phase + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.3 * amp; });
  a.body.position.y = Math.abs(Math.sin(phase)) * 0.04 * amp + Math.sin(t * 1.5) * 0.008; a.head.rotation.x = Math.sin(t * 0.8) * 0.05; a.head.rotation.y = Math.sin(t * 0.5) * 0.08;
}
// Gelenkwinkel-Generatoren
const Z22 = () => new Array(AK_NV).fill(0);
function restPitch() { const p = Z22(); for (let i = 0; i < AK_NV; i++) p[i] = i < 4 ? -0.01 : 0.02; return p; } // Schwanz waagerecht über dem Boden
// weicher Schwanz: Peitschenwelle mit Verzögerung entlang der Kette
function softYaw(sw, t, lag = 0.045) { const y = Z22(); for (let i = 0; i < AK_NV; i++) y[i] = sw(t - i * lag) * (i < 8 ? 0.085 : 0.05); return y; }
// steifer Stiel: nur die Gelenke an der Hüfte bewegen sich
function hingeYaw(ang, nHinge = 7, wob = 0) { const y = Z22(); for (let i = 0; i < nHinge; i++) y[i] = ang / nHinge; for (let i = nHinge; i < AK_FUSE; i++) y[i] = wob * (i - nHinge) * 0.01; return y; }
function clubWorld() { anky.root.updateMatrixWorld(true); return anky.clubMesh.getWorldPosition(V(0, 0, 0)); }

// ---------- Requisiten / Effekte ----------
function particles(n, size, color, seed) { const p = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ map: dotTex, size, color, transparent: true, depthWrite: false }));
  p.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); const r = rng(seed); p.userData.v = Array.from({ length: n }, () => [(r() - .5), r(), (r() - .5), r()]); p.frustumCulled = false; scene.add(p); return p; }
function burst(p, origin, t, { spread = 2, up = 3, g = 9.8, life = 1.5 } = {}) {
  const a = p.geometry.attributes.position.array; p.visible = t > 0 && t < life;
  p.userData.v.forEach((v, i) => { const tt = clamp(t, 0, life); a[i * 3] = origin.x + v[0] * spread * tt; a[i * 3 + 1] = Math.max(0.02, origin.y + (v[1] * up) * tt - 0.5 * g * tt * tt); a[i * 3 + 2] = origin.z + v[2] * spread * tt; });
  p.geometry.attributes.position.needsUpdate = true; p.material.opacity = 1 - clamp(t / life);
}
const dust = particles(220, 0.9, 0xb8a27e, 9), dust2 = particles(160, 0.7, 0xa58c68, 19), blood = particles(90, 0.1, 0x9a1512, 29), sparks = particles(70, 0.12, 0xfff1c0, 39), boneBits = particles(80, 0.09, 0xf1e9d6, 49);
const shards = []; { const r = rng(61); for (let k = 0; k < 12; k++) { const m = new THREE.Mesh(new THREE.TetrahedronGeometry(0.05 + r() * 0.06), k % 3 ? vertM : new THREE.MeshStandardMaterial({ color: 0x8a2420, roughness: 0.4 })); m.userData.v = [(r() - .5) * 3, 1 + r() * 2.5, (r() - .5) * 3, r() * 10]; m.castShadow = true; m.visible = false; scene.add(m); shards.push(m); } }
function flyShards(o, t, life = 1.4) { shards.forEach(m => { const v = m.userData.v; m.visible = t > 0 && t < life; if (!m.visible) return; m.position.set(o.x + v[0] * t, Math.max(0.04, o.y + v[1] * t - 4.9 * t * t), o.z + v[2] * t); m.rotation.set(v[3] + t * 7, t * 5, 0); }); }
// Rex an die Keule bringen: Knöchel eines Beins auf Trefferpunkt ausrichten
function rexAnkle(i = 0) { rex.root.updateMatrixWorld(true); return rex.legs[i].ankle.getWorldPosition(V(0, 0, 0)); }
