// ---------- Anakonda + Capybara ----------
const AR0 = 0.2, ALEN = 8.0; // Körperradius, Länge
// Fleckenmuster (u: entlang 4.8 Einheiten, v: Umfang; v=0.25 oben, 0.75 Bauch)
const snakeTex = canvasTex(2048, 512, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); [[0, '#5e5d30'], [0.08, '#73713f'], [0.14, '#a9a796'], [0.25, '#bcbcb0'], [0.36, '#a9a796'], [0.42, '#73713f'], [0.5, '#5e5d30'], [0.65, '#545429'], [0.75, '#4c4c25'], [0.85, '#545429'], [1, '#5e5d30']].forEach(([s, c]) => gr.addColorStop(s, c));
  g.fillStyle = gr; g.fillRect(0, 0, w, h); const r = rng(21);
  const blob = (x, y, rx, ry, col, a = 0) => { for (const dx of [-w, 0, w]) { g.beginPath(); g.ellipse(x + dx, y, rx, ry, a, 0, 7); g.fillStyle = col; g.fill(); } };
  g.globalAlpha = 0.1; for (let k = 0; k < 900; k++) { const y = 256 + (r() - 0.5) * 330; blob(r() * w, y, 10 + r() * 30, 6 + r() * 14, r() < 0.6 ? '#2e2f14' : '#9a9660', r() * 3); } // dezente Marmorierung
  g.globalAlpha = 0.12; for (let k = 0; k < 5000; k++) { g.fillStyle = r() < 0.5 ? '#000' : '#fff'; g.fillRect(r() * w, r() * h, 2, 2); } g.globalAlpha = 1; });
snakeTex.wrapS = snakeTex.wrapT = THREE.RepeatWrapping;
// Schuppen-Shader: Schuppen überlappen; bei Dehnung (aStretch) öffnen sich Lücken mit heller Zwischenhaut, optional Risse / Falten
const snakeU = { uTear: { value: 0 }, uFold: { value: 0 }, uGapK: { value: 0.35 }, uScaleN: { value: new THREE.Vector2(124, 66) } };
function snakeShader(sh) {
  Object.assign(sh.uniforms, snakeU);
  sh.vertexShader = 'attribute float aStretch; varying float vStretch;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vStretch = aStretch;');
  const fn = `uniform float uTear, uFold, uGapK; uniform vec2 uScaleN; varying float vStretch;
  float hsh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  vec4 scl(vec2 uv) { // x: Höhe, y: innen (0/1), z: Rand, w: Zellzufall
    vec2 p = uv * uScaleN; float row = floor(p.y); p.x += mod(row, 2.0) * 0.5; vec2 id = floor(p); vec2 f = fract(p) - 0.5;
    float belly = smoothstep(0.12, 0.2, fract(uv.y)) * (1.0 - smoothstep(0.3, 0.38, fract(uv.y)));
    float st = vStretch * uGapK; float r = 0.62 / (1.0 + 0.22 * st);
    vec2 q = f; q.y *= mix(1.0, 0.45, belly); float d = abs(q.x) * 0.72 + abs(q.y) * 0.95 + 0.12 * length(q);
    float ins = 1.0 - smoothstep(r - 0.06, r, d); float dome = ins * (0.55 + 0.45 * sqrt(max(0.0, 1.0 - d * d / (r * r)))) * (0.75 + 0.25 * (f.x + 0.5));
    return vec4(dome, ins, smoothstep(r - 0.16, r, d), hsh(id)); }
  float snakeH(vec2 uv) { vec4 s = scl(uv); float gap = 1.0 - s.y; float fold = gap * uFold * (0.5 + 0.5 * sin(uv.x * uScaleN.x * 6.2831 * 2.5)); return s.x * 0.9 + fold * 0.6; }\n`;
  sh.fragmentShader = sh.fragmentShader.replace('#include <bumpmap_pars_fragment>', fn + THREE.ShaderChunk.bumpmap_pars_fragment.replaceAll('texture2D( bumpMap, vBumpMapUv ).x', 'snakeH( vBumpMapUv )').replace('texture2D( bumpMap, vBumpMapUv + dSTdx ).x', 'snakeH( vBumpMapUv + dSTdx )').replace('texture2D( bumpMap, vBumpMapUv + dSTdy ).x', 'snakeH( vBumpMapUv + dSTdy )'))
    .replace('#include <map_fragment>', `#include <map_fragment>
    { vec4 s = scl(vMapUv); float gap = 1.0 - s.y; diffuseColor.rgb *= mix(1.0, 0.72, s.z * s.y) * (0.92 + 0.16 * s.w);
      vec3 skin = mix(vec3(0.16, 0.14, 0.12), vec3(0.42, 0.36, 0.31), uFold); float fo = uFold * (0.5 + 0.5 * sin(vMapUv.x * uScaleN.x * 6.2831 * 2.5)); skin *= 1.0 - 0.35 * fo;
      float tear = uTear * smoothstep(0.25, 0.6, vStretch) * step(0.68, hsh(floor(vMapUv * uScaleN * vec2(1.0, 0.5)))) ;
      diffuseColor.rgb = mix(diffuseColor.rgb, mix(skin, vec3(0.55, 0.04, 0.05), tear), gap * smoothstep(0.02, 0.15, vStretch * uGapK + uFold * 0.3)); }`);
}
const snakeM = new THREE.MeshStandardMaterial({ map: snakeTex, bumpMap: snakeTex, bumpScale: 1.6, roughness: 0.72, metalness: 0.0 });
snakeM.onBeforeCompile = snakeShader; snakeM.customProgramCacheKey = () => 'snake';
const headSkinM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, bumpMap: scaleTex, bumpScale: 1.2 });
const liningM = new THREE.MeshPhysicalMaterial({ color: 0xd98a8f, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.25, side: THREE.DoubleSide, bumpMap: muscleTex, bumpScale: 0.4 });
const ligM = new THREE.MeshPhysicalMaterial({ color: 0xe8909a, roughness: 0.3, clearcoat: 0.8, emissive: 0x2a0508 });
const aBoneM = new THREE.MeshStandardMaterial({ color: 0xf2ead8, roughness: 0.45, emissive: 0x2a2620 });
const fangM = new THREE.MeshPhysicalMaterial({ color: 0xf6f1e4, roughness: 0.25, clearcoat: 0.8 });
const trachM = new THREE.MeshPhysicalMaterial({ color: 0xe6a5aa, roughness: 0.35, clearcoat: 0.6 });
// ---- Kopf ----
const HL = 0.34; // halbe Kopflänge
const SACK_FLIP = true; const UPCUT = true; const UPH = V(0, -0.01, -0.26); // Drehpunkt Oberkiefer
const rotU = (P, ang) => { if (!ang) return P; const y = P.y - UPH.y, z = P.z - UPH.z, c = Math.cos(ang), s = Math.sin(ang); P.y = UPH.y + y * c + z * s; P.z = UPH.z - y * s + z * c; return P; };
const sackR = w => Math.max(0.08, w.r * 1.1 + 0.035);
const skullW = z => 0.14 * (1 - 0.42 * Math.pow(clamp((z + HL) / (2 * HL)), 1.6)); // halbe Breite entlang z
function headColor(x, y, z, ny, c) { // glattes Oliv, heller Lippen-/Kehlbereich
  c.set(0x5a592d); if (y > 0.06) c.lerp(new THREE.Color(0x52522a), 0.6); if (ny < -0.2 || y < 0.006) c.set(0xb0ad98); else if (y < 0.03 && Math.abs(x) > skullW(z) * 0.7) c.set(0x9c9872);
  c.multiplyScalar(0.92 + 0.16 * fbm(x * 14, y * 14, z * 14, 2)); return c; }
function colGeo(geo, fn) { geo.computeVertexNormals(); const p = geo.attributes.position, n = geo.attributes.normal, cols = [], c = new THREE.Color(); for (let i = 0; i < p.count; i++) { fn(p.getX(i), p.getY(i), p.getZ(i), n.getY(i), c); cols.push(c.r, c.g, c.b); } geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); return geo; }
function makeAna() {
  const root = new THREE.Group(); const ol = outlineMat(0xffe27a, 0.03);
  // Körper-Schlauch (dynamisch)
  const RINGS = 300, RS = 44; const bg = new THREE.BufferGeometry(); const n = (RINGS + 1) * (RS + 1);
  const pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), str = new Float32Array(n); const idx = [];
  for (let i = 0; i < RINGS; i++) for (let j = 0; j < RS; j++) { const a = i * (RS + 1) + j, b = a + 1, c = a + RS + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
  bg.setIndex(idx); bg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); bg.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); bg.setAttribute('aStretch', new THREE.BufferAttribute(str, 1));
  const body = new THREE.Mesh(bg, snakeM); body.castShadow = body.receiveShadow = true; body.frustumCulled = false; root.add(body); const bodyOl = new THREE.Mesh(bg, ol); bodyOl.frustumCulled = false; root.add(bodyOl);
  // Kopf
  const head = new THREE.Group(); root.add(head);
  const sg = new THREE.SphereGeometry(1, 56, 36); sg.rotateX(Math.PI / 2); { const p = sg.attributes.position; for (let i = 0; i < p.count; i++) { const X = p.getX(i), Y = p.getY(i), Z = p.getZ(i); const z = Z * HL; const f = clamp((z + HL) / (2 * HL));
    const w = skullW(z) * (Z > 0.92 ? Math.sqrt(Math.max(0.05, (1 - Z) / 0.08)) * 0.85 + 0.15 : 1); const top = 0.128 * (1 - 0.42 * Math.pow(f, 1.3));
    const yy = Y > 0 ? Math.pow(Y, 0.62) * top : Y * 0.04; p.setXYZ(i, Math.sign(X) * Math.pow(Math.abs(X), 0.75) * w, yy, z + (Y > 0 ? 0 : -0.01)); } }
  const skull = new THREE.Mesh(colGeo(sg, headColor), headSkinM); skull.castShadow = true; head.add(skull); skull.add(new THREE.Mesh(sg, ol)); const skirt = (() => { const NU = 40, NV = 8, P = [], UV = [], I = []; for (let v = 0; v <= NV; v++) for (let u = 0; u <= NU; u++) { const th = lerp(-0.95, 0.95, u / NU), X = Math.sin(th), Z = -Math.cos(th), tv = v / NV; const end = Math.min(1, (0.95 - Math.abs(th)) / 0.35); const z = Z * HL * 0.97, x = Math.sign(X) * Math.pow(Math.abs(X), 0.75) * skullW(z) * lerp(0.97, 0.8, tv);
      P.push(x, 0.012 - tv * 0.17 * (0.25 + 0.75 * end), z + tv * 0.03); UV.push(u / NU * 3, tv); }
    for (let v = 0; v < NV; v++) for (let u = 0; u < NU; u++) { const A = v * (NU + 1) + u, B = A + 1, C = A + NU + 1, D = C + 1; I.push(A, C, B, B, C, D); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(I);
    const m = new THREE.Mesh(colGeo(g, (x, y, z, ny, c) => c.set(0x5a592d)), headSkinM.clone()); m.material.side = THREE.DoubleSide; m.visible = false; head.add(m); return m; })(); // Nackenhaut-Schürze: verbindet Hinterkopf mit dem Hals
  for (const s of [-1, 1]) { // Augen oben seitlich, Nasenlöcher oben auf der Schnauze
    const eg = new THREE.Group(); eg.position.set(s * 0.097, 0.06, 0.06); head.add(eg);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 18, 14), new THREE.MeshPhysicalMaterial({ color: 0xa8782a, roughness: 0.05, clearcoat: 1 })); eg.add(eye);
    const pup = new THREE.Mesh(new THREE.SphereGeometry(0.0225, 18, 14, 0, Math.PI * 2, 0, 0.5), new THREE.MeshBasicMaterial({ color: 0x050403 })); pup.rotation.x = -Math.PI / 2 - 0.2; pup.rotation.z = s * 0.6; pup.scale.set(0.35, 1, 1); eg.add(pup);
    const lid = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.009, 8, 20), headSkinM); colGeo(lid.geometry, (x, y, z, ny, c) => c.set(0x6a6836)); lid.rotation.set(Math.PI / 2 - 0.4, s * 0.5, 0); lid.position.y = 0.004; eg.add(lid);
    const nos = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), new THREE.MeshBasicMaterial({ color: 0x0b0b06 })); nos.position.set(s * 0.03, 0.036, 0.27); nos.scale.set(1, 0.6, 1.3); head.add(nos); }
  // ---- Zähne: kurz, kräftig an der Basis, nach hinten gebogen (Widerhaken) ----
  const fangG = (() => { const c = new THREE.CatmullRomCurve3([V(0, 0.25, 0.02), V(0, -0.45, -0.04), V(0, -0.85, -0.3), V(0, -1.0, -0.62)]); const SEG = 12, RAD = 8; const g = new THREE.TubeGeometry(c, SEG, 1, RAD, false); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const k = Math.floor(i / (RAD + 1)) / SEG; const cp = c.getPoint(k); const r = 0.24 * Math.pow(1 - k, 0.85) + 0.004; p.setXYZ(i, cp.x + (p.getX(i) - cp.x) * r * 0.8, cp.y + (p.getY(i) - cp.y) * r, cp.z + (p.getZ(i) - cp.z) * r); }
    g.computeVertexNormals(); const col = []; for (let i = 0; i < p.count; i++) { const k = Math.floor(i / (RAD + 1)) / SEG; const cc = new THREE.Color(0xe9dcc0).lerp(new THREE.Color(0xfffcf2), clamp(k * 1.4)); col.push(cc.r, cc.g, cc.b); } g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return g; })();
  const toothM = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.15, sheen: 0.3 });
  const gumM = new THREE.MeshPhysicalMaterial({ color: 0xb8606a, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2, bumpMap: muscleTex, bumpScale: 0.25 });
  const tRnd = rng(77); const upTeeth = [], gums = [];
  const palY = (u, z) => { const rho2 = Math.max(0, 1 - (z / HL) ** 2); const X = Math.pow(Math.min(1, Math.abs(u)), 4 / 3); return -0.035 * Math.sqrt(Math.max(0, rho2 - X * X)) - 0.003; }; // Gaumen direkt unter dem Schädel
  for (const s of [-1, 1]) {
    const gp = []; for (let k = 0; k <= 16; k++) { const z = lerp(-0.27, 0.3, k / 16); gp.push(V(s * skullW(z) * (0.9 - 0.25 * clamp((z - 0.22) / 0.1)), -0.006, z)); }
    const gum = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(gp), 60, 0.008, 8, false), gumM); head.add(gum); gums.push(gum);
    const pp = []; for (let k = 0; k <= 10; k++) { const z = lerp(-0.25, 0.16, k / 10); pp.push(V(s * skullW(z) * 0.5, palY(0.5 / 0.95, z) - 0.002, z)); }
    { const gm = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pp), 40, 0.005, 6, false), gumM); head.add(gm); gums.push(gm); }
    for (let k = 0; k < 15; k++) { const z = lerp(-0.25, 0.27, k / 14); const m = new THREE.Mesh(fangG, toothM); const xf = 0.9 - 0.25 * clamp((z - 0.22) / 0.1); m.position.set(s * skullW(z) * xf, -0.008, z); m.rotation.set(0, 0, s * 0.12); m.userData.s = 0.026 * (0.8 + 0.35 * clamp((z + 0.25) / 0.35)) * (0.85 + 0.3 * tRnd()); head.add(m); upTeeth.push(m); }
    for (let k = 0; k < 9; k++) { const z = lerp(-0.23, 0.15, k / 8); const m = new THREE.Mesh(fangG, toothM); m.position.set(s * skullW(z) * 0.5, palY(0.5 / 0.95, z) - 0.006, z); m.userData.s = 0.022 * (0.85 + 0.3 * tRnd()); head.add(m); upTeeth.push(m); }
  }
  const upper = new THREE.Group(); upper.position.copy(UPH); [...head.children].forEach(ch => { ch.position.sub(UPH); upper.add(ch); }); head.add(upper); // Oberkiefer-Gruppe, Drehpunkt = Kiefergelenk
  // ---- Unterkieferhälften: flache Knochenspange mit Lippenschuppen außen, Zahnfleisch oben ----
  const mandibles = []; const JL = 0.6;
  for (const s of [-1, 1]) {
    const mg = new THREE.Group(); mg.position.set(s * 0.125, 0.0, -0.3); head.add(mg);
    const path = [V(0, 0, 0), V(-s * 0.02, -0.01, 0.2), V(-s * 0.06, -0.015, 0.42), V(-s * 0.105, -0.012, JL)];
    const curve = new THREE.CatmullRomCurve3(path); const NS = 48, NR = 20; const mpos = [], muv = [], mcol = [], midx = []; const c = new THREE.Color();
    for (let i = 0; i <= NS; i++) { const k = i / NS; const cp = curve.getPoint(k); const T = curve.getTangent(k); const B = T.clone().cross(V(0, 1, 0)).normalize(); if (B.x * s < 0) B.negate(); const N = B.clone().cross(T).normalize(); if (N.y < 0) N.negate();
      const hh = lerp(0.025, 0.014, Math.pow(k, 0.8)) * (k > 0.93 ? Math.sqrt(1 - (k - 0.93) / 0.075 * 0.6) : 1), ww = lerp(0.017, 0.011, k) * (k < 0.05 ? 0.6 + 8 * k : 1);
      for (let j = 0; j <= NR; j++) { const an = j / NR * Math.PI * 2; const ca = Math.cos(an), sa = Math.sin(an); const ex = Math.sign(ca) * Math.pow(Math.abs(ca), 0.8), ey = Math.sign(sa) * Math.pow(Math.abs(sa), 0.8);
        const P = cp.clone().addScaledVector(N, -hh + ey * hh).addScaledVector(B, ex * ww); mpos.push(P.x, P.y, P.z); muv.push(k * 5, j / NR);
        if (sa > 0.75 && ca < 0.2) c.set(0xd59a9a); else if (sa > 0.75) c.set(0x9c9872); // Zahnfleisch oben
        else if (ca < -0.3) c.set(sa > 0.1 ? 0xc98d8f : 0xb3ae86); // Innenseite
        else if (sa > -0.35) { if (sa > 0.55) { c.set(0x9c9872); if ((k * 13 + 0.3) % 1 < 0.08 && k < 0.95) c.set(0x8d8960); } else c.set(0x5a592d); } // Lippenschuppen
        else c.set(sa < -0.8 ? 0xb0ad98 : 0x6e6c3e);
        c.multiplyScalar(0.88 + 0.24 * fbm(P.x * 40, P.y * 40, P.z * 40, 2)); mcol.push(c.r, c.g, c.b); } }
    for (let i = 0; i < NS; i++) for (let j = 0; j < NR; j++) { const a = i * (NR + 1) + j, b = a + 1, cc = a + NR + 1, d = cc + 1; midx.push(a, cc, b, b, cc, d); }
    const jg = new THREE.BufferGeometry(); jg.setIndex(midx); jg.setAttribute('position', new THREE.Float32BufferAttribute(mpos, 3)); jg.setAttribute('uv', new THREE.Float32BufferAttribute(muv, 2)); jg.setAttribute('color', new THREE.Float32BufferAttribute(mcol, 3)); jg.computeVertexNormals();
    const jaw = new THREE.Mesh(jg, headSkinM); jaw.castShadow = true; mg.add(jaw); const jol = new THREE.Mesh(jg, ol); mg.add(jol);
    const bone = new THREE.Mesh(jg, aBoneM); bone.visible = false; mg.add(bone);
    const teeth = []; for (let k = 0; k < 15; k++) { const u = 0.07 + k * 0.061; const p = curve.getPoint(u); const m = new THREE.Mesh(fangG, toothM); m.position.copy(p).add(V(0, 0.004, 0)); m.rotation.set(0, 0, Math.PI - s * 0.15); m.userData.s = 0.024 * (1.15 - 0.35 * u) * (0.85 + 0.3 * tRnd()); mg.add(m); teeth.push(m); }
    mandibles.push({ g: mg, s, jaw, jol, bone, teeth, curve });
  }
  const chin = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1, 10), aBoneM); chin.rotation.z = Math.PI / 2; chin.visible = false; head.add(chin); // verwachsenes Kinn (Röntgen)
  const lig = new THREE.Mesh(new THREE.BufferGeometry(), ligM); lig.frustumCulled = false; head.add(lig); // dehnbares Band
  // ---- Mundraum: Gaumen -> Rachen -> Mundboden (innen rosa, außen Kehlhaut) + Mundwinkel-Häute ----
  const mkSheet = (NU, NV, flip, su = 1.5, sv = 3) => { const g = new THREE.BufferGeometry(); const n = (NU + 1) * (NV + 1); const idx = [];
    for (let i = 0; i < NV; i++) for (let j = 0; j < NU; j++) { const a = i * (NU + 1) + j, b = a + 1, c2 = a + NU + 1, d = c2 + 1; if (flip) idx.push(a, c2, b, b, c2, d); else idx.push(a, b, c2, b, d, c2); }
    g.setIndex(idx); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); const uvs = new Float32Array(n * 2);
    for (let i = 0; i <= NV; i++) for (let j = 0; j <= NU; j++) { const k = i * (NU + 1) + j; uvs[k * 2] = i / NV * sv; uvs[k * 2 + 1] = j / NU * su; } g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2)); g.setAttribute('aStretch', new THREE.BufferAttribute(new Float32Array(n).fill(0.75), 1)); return g; };
  const innerM = new THREE.MeshPhysicalMaterial({ vertexColors: true, emissive: 0x3a0c10, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.22, bumpMap: muscleTex, bumpScale: 0.35, side: THREE.FrontSide });
  const outerM = snakeM.clone(); outerM.side = THREE.BackSide; outerM.onBeforeCompile = snakeShader; outerM.customProgramCacheKey = () => 'snakeB';
  const MU = 26, MV = 70; const lg = mkSheet(MU, MV, true, 0.8, 0.3); const lining = new THREE.Group(); head.add(lining);
  lining.add(new THREE.Mesh(lg, innerM)); var lgo = new THREE.Mesh(lg, outerM); lgo.castShadow = true; lining.add(lgo);
  const cornM = innerM.clone(); cornM.side = THREE.BackSide; // Mundwinkel: beidseitig rosa Schleimhaut, keine grüne Haut
  const corners = [-1, 1].map(s => { const g = mkSheet(12, 24, s < 0, 0.45, 0.13); const mi = new THREE.Mesh(g, innerM); lining.add(mi); const o = new THREE.Mesh(g, cornM); lining.add(o); return { s, g, mi, o }; });
  // Gedehnter Hautsack um die Beute (eine durchgehende Fläche vom Hals bis zu den Kieferspitzen)
  const SU = 64, SV = 44; const sackG = mkSheet(SU, SV, SACK_FLIP, 1, 1); const sinM = innerM.clone(); sinM.side = THREE.BackSide;
  const sack = new THREE.Group(); head.add(sack); const sko = new THREE.Mesh(sackG, snakeM); sko.castShadow = true; sack.add(sko); sack.add(new THREE.Mesh(sackG, sinM)); sack.visible = false; const lipM = new THREE.MeshPhysicalMaterial({ color: 0xd88a90, emissive: 0x3a0c10, roughness: 0.35, clearcoat: 0.6 }); const lips = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.BufferGeometry(), lipM); sack.add(m); return m; }); const cfill = [0, 1].map(() => { const g = mkSheet(8, 12, false, 0.3, 0.3); const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ vertexColors: true, emissive: 0x3a0c10, roughness: 0.3, clearcoat: 0.8, side: THREE.DoubleSide })); sack.add(m); return m; });
  // Luftröhre (Glottis) – Schnorchel mit Knorpelringen
  const trach = new THREE.Group(); head.add(trach); const tt = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.034, 1, 16, 1, true), trachM); tt.rotation.x = Math.PI / 2; trach.add(tt);
  const rings = []; for (let k = 0; k < 12; k++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.007, 6, 18), aBoneM); trach.add(r); rings.push(r); }
  const trTip = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.01, 8, 18), trachM); trach.add(trTip); trach.visible = false;
  root.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
  return { skirt, root, body, bodyOl, bg, RINGS, RS, head, skull, mandibles, upTeeth, gums, chin, lig, lining, lg, MU, MV, corners, lgo, sack, lips, cfill, upper, sg: sackG, SU, SV, palY, trach, tt, rings, trTip, ol, JL };
}
const ana = makeAna(); scene.add(ana.root);
// ---- Capybara ----
const furTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); const r = rng(33); for (let i = 0; i < 9000; i++) { const x = r() * w, y = r() * h; g.strokeStyle = r() < 0.5 ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.3)'; g.lineWidth = 1 + r(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 3, y + 6 + r() * 6); g.stroke(); } }, 1);
furTex.wrapS = furTex.wrapT = THREE.RepeatWrapping;
const furM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, bumpMap: furTex, bumpScale: 3.2, map: furTex });
furM.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', 'vec4 fT = texture2D(map, vMapUv); diffuseColor.rgb *= 0.82 + 0.36 * fT.r;'); };
function capyColor(x, y, z, ny, c) { c.set(0x7d5e40).lerp(new THREE.Color(0x5e4430), clamp(ny * 1.2)).lerp(new THREE.Color(0x96754f), clamp(-ny * 1.3)); c.multiplyScalar(0.9 + 0.2 * fbm(x * 4, y * 4, z * 4, 3)); return c; }
function makeCapy() {
  const root = new THREE.Group(); const g = new THREE.Group(); g.rotation.y = -Math.PI / 2; root.add(g); const ol = outlineMat(0xffe27a, 0.03);
  const ell = (geoFn, uvs = [3, 2]) => { const geo = geoFn; const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * uvs[0], uv.getY(i) * uvs[1]); return colGeo(geo, capyColor); };
  const add = (geo, p, s, rot = [0, 0, 0], parent = g) => { const m = new THREE.Mesh(geo, furM); m.position.set(...p); m.scale.set(...s); m.rotation.set(...rot); m.castShadow = true; parent.add(m); return m; };
  // Rumpf: tonnenförmig, hinten rund, Rücken leicht gewölbt
  const bgeo = new THREE.SphereGeometry(1, 48, 32); { const p = bgeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); p.setXYZ(i, x * 0.42 * (1 - 0.08 * z), y * 0.4 * (1 + 0.06 * (y > 0 ? 1 - z * z : 0)), z * 0.66); } }
  const body = add(ell(bgeo, [4, 3]), [0, 0.55, 0], [1, 1, 1]);
  // Kopf: groß, kastenförmig, stumpfe Schnauze
  const head = new THREE.Group(); head.position.set(0, 0.66, 0.6); g.add(head);
  const hgeo = new THREE.SphereGeometry(1, 40, 28); { const p = hgeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const f = (z + 1) / 2;
    const yy = Math.sign(y) * Math.pow(Math.abs(y), 0.7) * 0.2 * (1 - 0.12 * f) - 0.03 * f; p.setXYZ(i, Math.sign(x) * Math.pow(Math.abs(x), 0.7) * 0.165 * (1 - 0.1 * f), yy, z * 0.36 * (z > 0.85 ? 1 - (z - 0.85) * 0.6 : 1) + 0.12); } }
  add(ell(hgeo), [0, 0, 0], [1, 1, 1], [0.15, 0, 0], head);
  const mouthL = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.006, 6, 20, Math.PI), new THREE.MeshBasicMaterial({ color: 0x2a1c14 })); mouthL.position.set(0, -0.11, 0.43); mouthL.rotation.set(0.3, 0, Math.PI); head.add(mouthL);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), new THREE.MeshPhysicalMaterial({ color: 0x120c08, roughness: 0.05, clearcoat: 1 })); eye.position.set(s * 0.145, 0.1, 0.12); head.add(eye);
    const ear = add(colGeo(new THREE.SphereGeometry(1, 16, 12), (x, y, z, ny, c) => c.set(0x5a3a22)), [s * 0.1, 0.19, -0.1], [0.04, 0.045, 0.022], [0, s * 0.4, 0], head);
    const ns = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), new THREE.MeshBasicMaterial({ color: 0x150d08 })); ns.scale.set(0.6, 1, 0.5); ns.rotation.z = s * 0.4; ns.position.set(s * 0.045, 0.03, 0.465); head.add(ns); }
  // Beine
  const legs = []; for (const [x, z] of [[-0.22, 0.38], [0.22, 0.38], [-0.24, -0.38], [0.24, -0.38]]) { const l = new THREE.Group(); l.position.set(x, 0.42, z); g.add(l); legs.push(l);
    add(ell(new THREE.CylinderGeometry(0.1, 0.055, 0.44, 16), [2, 1]), [0, -0.18, 0], [1, 1, 1], [0, 0, 0], l); const ft = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ color: 0x2f2218, roughness: 0.7 })); ft.position.set(0, -0.4, 0.03); ft.scale.set(0.07, 0.035, 0.09); l.add(ft); }
  root.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
  return { root, g, head, legs, ol, body };
}
const capy = makeCapy(); scene.add(capy.root);
// Querschnittsradius des Capybaras entlang seiner Längsachse (lokal: +z = Kopf)
const CAPY_CY = 0.55;
function capyR(z) { const b = z > -0.66 && z < 0.66 ? 0.43 * Math.sqrt(1 - Math.pow(z / 0.66, 2)) : 0; const h = z > 0.34 && z < 1.1 ? 0.26 * Math.pow(Math.max(0, 1 - Math.pow((z - 0.72) / 0.38, 2)), 0.4) : 0; return Math.max(b, h); }
function capyY(z) { const b = z > -0.66 && z < 0.66 ? 0.43 * Math.sqrt(1 - Math.pow(z / 0.66, 2)) : 0; const h = z > 0.34 && z < 1.1 ? 0.26 * Math.pow(Math.max(0, 1 - Math.pow((z - 0.72) / 0.38, 2)), 0.4) : 0; return h > b ? CAPY_CY + 0.1 : CAPY_CY + 0.1 * clamp((z - 0.3) / 0.3); }
// ---- Pose ----
// opt: head (Vector3, Weltposition Kopfmitte), dir (Blickrichtung), trail(d) -> Kurs-Winkel, gape, spread, slide [L,R], teeth, xray, lig, trach, prey {x0 (Welt-x der Capybara-Nase), cy}, bulge (0..1 Radiuszuschlag), stretchK
function poseAna(a, o) {
  const { headPos, heading = 0, curve = d => 0, gape = 0.05, spread = 0, slide = [0, 0], teeth = 1, xray = 0, chinK = -1, lig = 0, trach = 0, trachAir = 0, trachX = 0, trachY = 0, jawJ = null, jawTW = null, floorSag = 0, trachSide = -1, wrap = null, jawK = 1, upLift = 0, upW = 1, preyX0 = null, cy = CAPY_CY, t = 0, quad = 0, pitch = 0, rest = false, bulgeScale = 1 } = o;
  // Kopf ausrichten
  const fwd = V(Math.cos(heading) * Math.cos(pitch), Math.sin(pitch), -Math.sin(heading) * Math.cos(pitch)); // heading 0 -> +x
  a.head.position.copy(headPos); a.head.quaternion.setFromUnitVectors(V(0, 0, 1), fwd);
  // Körper: vom Hinterkopf rückwärts integrieren
  const NK = HL * (wrap ? lerp(0.45, 0.85, jawK) : 0.45); a.NK = NK; const back0 = headPos.clone().addScaledVector(fwd, -NK); const pos = a.bg.attributes.position.array, uvA = a.bg.attributes.uv.array, stA = a.bg.attributes.aStretch.array;
  const step = ALEN / a.RINGS; let p = back0.clone(); let hd = heading; const pts = [], rads = [], strs = [], bfs = [];
  for (let i = 0; i <= a.RINGS; i++) { const d = i * step;
    // Radius: Hals -> Körper -> Schwanzspitze
    let r = AR0 * (d < 0.6 ? lerp(0.62, 1, ease(d / 0.6)) : d > ALEN - 2.6 ? Math.pow(Math.max(0.004, (ALEN - d) / 2.6), 0.85) : 1) * (1 + 0.08 * Math.sin(clamp((d - 0.3) / (ALEN - 3)) * Math.PI));
    let rb = r, y;
    let cyA = cy; if (preyX0 !== null) { const lz = (p.x - preyX0); const cz = 1.06 - lz; const pr = cz > -0.7 && cz < 1.12 ? capyR(cz) * 1.08 * bulgeScale : 0; if (pr > r) r = pr; cyA = capyY(cz); } // Beule (Capybara-Koordinate, Nase = +1.06)
    const inPrey = preyX0 !== null && r > rb * 1.05; y = inPrey && !rest ? cyA : r * 0.92;
    if (d < 1.3 && !inPrey) y = Math.max(y, lerp(back0.y, y, ease(d / 1.3)));
    let bfK = 1; if (wrap && d < 0.8) { const zl = -NK - d; const w = wrap(zl); const e = ease(clamp(d / 0.7)); bfK = e; const rS = lerp(sackR(w) * 1.012, r, e); if (rS > r) r = rS; y = lerp(headPos.y + w.cy + zl * Math.sin(pitch), y, e); }
    pts.push(V(p.x, y, p.z)); bfs.push(bfK); rads.push(r); strs.push(clamp((r / rb - 1) / 1.3));
    hd = heading + curve(d); const dir = V(-Math.cos(hd), 0, Math.sin(hd)); p.addScaledVector(dir, step); }
  // Höhe glätten (sanfte Übergänge an der Beule)
  for (let it = 0; it < 6; it++) for (let i = 1; i < pts.length - 1; i++) pts[i].y = Math.max(rads[i] * 0.92, (pts[i - 1].y + pts[i].y * 2 + pts[i + 1].y) / 4);
  a.spine = pts; a.rads = rads;
  for (let i = 0; i <= a.RINGS; i++) { const P = pts[i]; const T = (i < a.RINGS ? pts[i + 1].clone().sub(P) : P.clone().sub(pts[i - 1])).normalize().negate(); const side = T.clone().cross(V(0, 1, 0)).normalize(); const up = side.clone().cross(T).normalize();
    const r = rads[i]; for (let j = 0; j <= a.RS; j++) { const an = j / a.RS * Math.PI * 2; const ca = Math.cos(an), sa = Math.sin(an); const k = i * (a.RS + 1) + j;
      const bf = sa < 0 ? lerp(1, 0.85, bfs[i]) : 1; // Bauch etwas flacher
      pos[k * 3] = P.x + side.x * ca * r + up.x * sa * r * bf; pos[k * 3 + 1] = P.y + side.y * ca * r + up.y * sa * r * bf; pos[k * 3 + 2] = P.z + side.z * ca * r + up.z * sa * r * bf;
      uvA[k * 2] = i * step / 4.8; uvA[k * 2 + 1] = j / a.RS; stA[k] = strs[i]; } }
  a.bg.attributes.position.needsUpdate = a.bg.attributes.uv.needsUpdate = a.bg.attributes.aStretch.needsUpdate = true; a.bg.computeVertexNormals();
  // Unterkiefer
  const tOpen = xray ? 1 : clamp((Math.max(gape, spread * 1.5) - 0.09) / 0.2);
  a.mandibles.forEach((m, i) => { const s = m.s; m.g.position.set(s * (0.125 + spread * 0.25 * 0), -quad * 0.12, -0.3 + (slide[i] || 0)); m.g.rotation.set(gape, s * spread, 0);
    if (jawTW) { const p0 = m.g.position.clone(), q0 = m.g.quaternion.clone(); m.g.position.copy(jawJ[i]).add(V(0, 0, slide[i] || 0)); const tl = jawTW[i].clone().add(V(0, 0, slide[i] || 0)).sub(m.g.position).normalize(); m.g.quaternion.setFromUnitVectors(m.curve.getPoint(1).normalize(), tl);
      if (jawK < 1) { m.g.position.lerpVectors(p0, m.g.position, jawK); m.g.quaternion.slerpQuaternions(q0, m.g.quaternion.clone(), jawK); } }
    m.jaw.visible = m.jol.visible = !xray; m.bone.visible = !!xray; m.teeth.forEach(tm => tm.scale.setScalar(Math.max(0.0001, tm.userData.s * teeth * tOpen))); });
  a.upTeeth.forEach(tm => tm.scale.setScalar(Math.max(0.0001, tm.userData.s * teeth * tOpen))); a.gums.forEach(gm => gm.visible = tOpen > 0.02);
  a.upper.rotation.x = -upLift; a.skirt.visible = jawK > 0.01 && upLift > 0.001; a.upper.scale.x = upW; /* Oberkiefer breiter, bis an die Mundwinkel */
  a.head.updateMatrixWorld(true);
  // Kinnspitzen (Kopf-lokal)
  const tip = m => m.curve.getPoint(1).clone().applyMatrix4(m.g.matrix); const tL = tip(a.mandibles[0]), tR = tip(a.mandibles[1]);
  a.tips = [tL, tR];
  // verwachsenes Kinn / Bruch
  a.chin.visible = chinK >= 0; if (chinK >= 0) { const mid = tL.clone().add(tR).multiplyScalar(0.5); const len = tL.distanceTo(tR) + 0.04; a.chin.position.copy(mid); a.chin.scale.set(1, Math.max(0.05, len * (chinK > 0 ? 0.5 : 1)), 1); a.chin.rotation.set(0, 0, Math.PI / 2); }
  // Band
  a.lig.visible = lig > 0.01; if (a.lig.visible) { const mid = tL.clone().add(tR).multiplyScalar(0.5).add(V(0, -0.02 - 0.03 * clamp(tL.distanceTo(tR) * 3), 0.0)); const c = new THREE.CatmullRomCurve3([tL, mid, tR]); const th = 0.026 / Math.sqrt(1 + tL.distanceTo(tR) * 6); a.lig.geometry.dispose(); a.lig.geometry = new THREE.TubeGeometry(c, 20, th * lig, 10, false); }
  // Mundraum
  a.lining.visible = gape > 0.06 || spread > 0.02; if (a.lining.visible) {
    const M = a.mandibles.map(m => m.g.matrix); const mp = (i, k, out) => { const m = a.mandibles[i]; const p = m.curve.getPoint(clamp(k)).applyMatrix4(M[i]); return p; };
    const sepAt = k => mp(0, k).distanceTo(mp(1, k));
    const pal = (u, z) => { const w = skullW(z) * 0.93 * (1 - 0.25 * clamp((z - 0.22) / 0.1)); return rotU(V(u * w * upW, a.palY(u, z) - 0.004, z), upLift); };
    const flo = (u, k) => { const L = mp(0, k), R = mp(1, k); const mid = L.clone().add(R).multiplyScalar(0.5); const inL = mid.clone().sub(L).normalize(); L.addScaledVector(inL, 0.012); R.addScaledVector(inL, -0.012); L.y -= 0.012; R.y -= 0.012;
      if (wrap) { const z = (L.z + R.z) / 2, w = wrap(z); const f = (u + 1) / 2; let tL = Math.atan2(L.y - w.cy, L.x), tR = Math.atan2(R.y - w.cy, R.x); if (tL > 0) tL -= Math.PI * 2; if (tR > Math.PI / 2) tR -= Math.PI * 2;
        let rad = lerp(Math.hypot(L.x, L.y - w.cy), Math.hypot(R.x, R.y - w.cy), f); rad += Math.max(0, w.r * 1.06 + 0.01 - rad) * Math.pow(Math.sin(Math.PI * f), 0.35); const an = lerp(tL, tR, f); return V(rad * Math.cos(an), w.cy + rad * Math.sin(an), lerp(L.z, R.z, f)); }
      const sep = L.distanceTo(R); const sag = Math.max(floorSag * (1 - 0.75 * clamp((k - 0.35) / 0.5)), Math.min(0.13, 0.012 + 0.2 * sep * sep)); const f = (u + 1) / 2; const P = L.lerp(R, f); P.y -= sag * (1 - u * u) - 0.007 * Math.exp(-((u / 0.18) ** 2)) * clamp((k - 0.3) / 0.2) * clamp((0.85 - k) / 0.1); return P; };
    const KF0 = 0.08, KF1 = 0.92, Z0 = -0.22;
    const pos = a.lg.attributes.position.array, col = a.lg.attributes.color.array; const cP = new THREE.Color(0xe8a0a4), cF = new THREE.Color(0xe39399), cT = new THREE.Color(0x3a090e), cS = new THREE.Color(0xc4ad58), cO = new THREE.Color(0x4f5424), c = new THREE.Color();
    for (let i = 0; i <= a.MV; i++) { const v = i / a.MV; for (let j = 0; j <= a.MU; j++) { const u = j / a.MU * 2 - 1; let P;
        if (v < 0.4) P = pal(u, lerp(0.29, Z0, v / 0.4));
        else if (v > 0.6) P = flo(u, lerp(KF0, KF1, (v - 0.6) / 0.4));
        else { const t = (v - 0.4) / 0.2; const P0 = pal(u, Z0), P2 = flo(u, KF0); const C = P0.clone().add(P2).multiplyScalar(0.5).add(V(0, 0, -0.16)); C.x *= 0.7;
          P = P0.multiplyScalar((1 - t) ** 2).addScaledVector(C, 2 * t * (1 - t)).addScaledVector(P2, t * t); }
        const k = i * (a.MU + 1) + j; pos[k * 3] = P.x; pos[k * 3 + 1] = P.y; pos[k * 3 + 2] = P.z;
        const dk = Math.exp(-(((v - 0.5) / 0.13) ** 2)); c.copy(v < 0.5 ? cP : cF).lerp(cT, dk * 0.92); c.multiplyScalar((1 - 0.22 * clamp((Math.abs(u) - 0.7) / 0.3)) * (v > 0.6 ? (0.86 + 0.14 * Math.cos(u * 22)) * (1 - 0.25 * Math.exp(-((u / 0.25) ** 2))) * (0.8 + 0.2 * clamp((v - 0.6) / 0.3)) : 1)); col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b; } }
    a.lg.attributes.position.needsUpdate = a.lg.attributes.color.needsUpdate = true; a.lg.computeVertexNormals();
    a.corners.forEach(({ s, g }) => { const i = s < 0 ? 0 : 1; const Ub = V(s * skullW(-0.27) * 0.92, -0.008, -0.27), Uf = V(s * skullW(-0.1) * 0.92, -0.008, -0.1); const Lb = mp(i, 0.03), Lf = mp(i, 0.32); Lb.y -= 0.01; Lf.y -= 0.01;
      const A = Ub.clone().add(Lb).multiplyScalar(0.5); const p = g.attributes.position.array, cc = g.attributes.color.array;
      const jz = mp(i, 0).z, tz = mp(i, 1).z;
      for (let ii = 0; ii <= 24; ii++) { const b = ii / 24; for (let j = 0; j <= 12; j++) { const t = j / 12; let P;
          if (wrap) { const z = lerp(-0.37, 0.29, b); const U = V(s * skullW(z) * 0.9, -0.01, z); const Lm = mp(i, clamp((z - jz) / (tz - jz), 0.01, 0.99)); Lm.y -= 0.012; const w = wrap(z); const C = V(0, w.cy, z);
            const dU = Math.hypot(U.x, U.y - w.cy), dL = Math.hypot(Lm.x, Lm.y - w.cy); const aU = Math.atan2(U.y - w.cy, Math.abs(U.x)), aL = Math.atan2(Lm.y - w.cy, Math.abs(Lm.x));
            let rad = lerp(dU, dL, t); rad += Math.max(0, w.r * 1.1 + 0.045 - rad) * Math.pow(Math.sin(Math.PI * t), 0.35); const an = lerp(aU, aL, t); P = V(s * rad * Math.cos(an), w.cy + rad * Math.sin(an), lerp(U.z, Lm.z, t)); }
          else { const S = Ub.clone().lerp(Lb, t); const mid = Uf.clone().add(Lf).multiplyScalar(0.5).lerp(A, 0.55);
          const E = Uf.clone().multiplyScalar((1 - t) ** 2).addScaledVector(mid, 2 * t * (1 - t)).addScaledVector(Lf, t * t); P = S.lerp(E, b); P.x += s * 0.012 * Math.sin(Math.PI * t) * Math.sin(Math.PI * b * 0.8); }
          const k = ii * 13 + j; p[k * 3] = P.x; p[k * 3 + 1] = P.y; p[k * 3 + 2] = P.z; c.copy(cF).lerp(cT, wrap ? 0.2 : 0.35 * (1 - b)); cc[k * 3] = c.r; cc[k * 3 + 1] = c.g; cc[k * 3 + 2] = c.b; } }
      g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = true; g.computeVertexNormals(); }); }
  const sk = !!wrap && a.lining.visible; a.sack.visible = sk; a.lgo.visible = !sk; a.corners.forEach(c => { c.mi.visible = c.o.visible = !sk; });
  if (sk) { const M = a.mandibles.map(m => m.g.matrix); const mp = (i, k) => a.mandibles[i].curve.getPoint(clamp(k)).applyMatrix4(M[i]); const jz = [0, 1].map(i => [mp(i, 0).z, mp(i, 1).z]);
    const pos = a.sg.attributes.position.array, uvA = a.sg.attributes.uv.array, col = a.sg.attributes.color.array, stS = a.sg.attributes.aStretch.array; const cI = new THREE.Color(0xd98a8f), cD = new THREE.Color(0x5a1418), c = new THREE.Color(); const Z0s = -a.NK - 0.012, Z1s = 0.3;
    const zh = (jz[0][0] + jz[1][0]) / 2 + 0.02; const kRow = []; const SU = a.SU, SA = 16; // Seitenbereiche j<=SA und j>=SU-SA; dazwischen Boden zwischen den Kieferhälften
    for (let i = 0; i <= a.SV; i++) { const z = lerp(Z0s, Z1s, i / a.SV); const w = wrap(z); const R = sackR(w); const gapK = clamp((z + 0.26) / 0.1); const sw = skullW(clamp(z, -HL, HL)) * 0.9;
      const aU = Math.atan2(-0.012 - w.cy, sw), dU = Math.hypot(sw, -0.012 - w.cy); const ph0 = lerp(Math.PI / 2, aU, gapK), ph1 = -Math.PI - ph0;
      // Seiten offen: vor dem Kiefergelenk keine Haut zwischen Ober- und Unterkiefer (nur schmale Lippen)
      const kO = ease(clamp((z - zh) / 0.07)); /* Mundwinkel direkt am Kiefergelenk */ kRow.push(kO); const lipQ = lerp(1, 0.04, kO); const rm = s => s <= 0.5 ? s * lipQ : 1 - (1 - s) * lipQ;
      const jw = [0, 1].map(s => { const kk = (z - jz[s][0]) / (jz[s][1] - jz[s][0]); const L = mp(s, clamp(kk)); let aJ = Math.atan2(L.y - w.cy, L.x); if (aJ > ph0) aJ -= Math.PI * 2; return kk < -0.05 || kk > 1.05 ? [aJ, null] : [aJ, Math.hypot(L.x, L.y - w.cy)]; });
      const aR = jw[1][0], aL = jw[0][0];
      for (let j = 0; j <= SU; j++) { let ph, e = 0;
        if (j <= SA) { const sp = rm(j / SA); ph = lerp(ph0, aR, sp); e = 1 - clamp(sp / 0.55); }
        else if (j >= SU - SA) { const sp = rm((SU - j) / SA); ph = lerp(ph1, aL, sp); e = 1 - clamp(sp / 0.55); }
        else ph = lerp(aR, aL, (j - SA) / (SU - 2 * SA));
        e = e * e * (3 - 2 * e); let rad = Math.max(lerp(R, dU, e * gapK), w.r * 1.06 + 0.014);
        for (const J of jw) if (J[1] !== null) { const wg = Math.exp(-(((ph - J[0]) / 0.32) ** 2)); rad -= Math.max(0, rad - (J[1] - 0.014)) * wg; }
        const k = i * (SU + 1) + j; const Pv = V(rad * Math.cos(ph), w.cy + rad * Math.sin(ph), z); { const tN = ease(clamp((z + 0.8) / 0.5)) * (1 - ease(clamp((z + 0.3) / 0.12))) * jawK * Math.max(0, Math.sin(ph)) ** 3; const yN = 0.085; if (Pv.y < yN) Pv.y = lerp(Pv.y, yN, tN); } /* Nacken: Haut wächst bis an den Hinterkopf */ if (upLift && (j <= SA / 2 || j >= SU - SA / 2)) rotU(Pv, upLift * clamp((z - zh + 0.06) / 0.12)); pos[k * 3] = Pv.x; pos[k * 3 + 1] = Pv.y; pos[k * 3 + 2] = Pv.z;
        uvA[k * 2] = (-a.NK - z) / 4.8; uvA[k * 2 + 1] = 0.5 - ph / (Math.PI * 2); stS[k] = clamp((rad / (AR0 * 0.62) - 1) / 1.3); c.copy(cI).lerp(cD, 0.5 * clamp((0.3 - z) / 0.5)); col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b; } }
    { const idx = [], cut = [SA / 2, SU - SA / 2 - 1]; for (let i = 0; i < a.SV; i++) for (let j = 0; j < SU; j++) { if ((kRow[i] > 0.001 || kRow[i + 1] > 0.001) && (cut.includes(j) || (UPCUT && (j < SA / 2 || j >= SU - SA / 2)))) continue; /* oberer Seitenstreifen neben dem Schädel weg */
        const A = i * (SU + 1) + j, B = A + 1, C = A + SU + 1, D = C + 1; if (SACK_FLIP) idx.push(A, C, B, B, C, D); else idx.push(A, B, C, B, D, C); } a.sg.setIndex(idx); }
    // rosa Lippensaum entlang der offenen Seitenränder (oben -> Mundwinkel -> unten)
    a.lips.forEach((lm, n) => { const cU = n ? SU - SA / 2 : SA / 2, cL = n ? cU - 1 : cU + 1; const P = k => V(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]); const pts = []; let i0 = kRow.findIndex(k => k > 0.001);
      if (i0 > 0) { if (!UPCUT) for (let i = a.SV; i >= i0; i--) pts.push(P(i * (SU + 1) + cU)); pts.push(P((i0 - 1) * (SU + 1) + cU).lerp(P((i0 - 1) * (SU + 1) + cL), 0.5)); for (let i = i0; i <= a.SV; i++) pts.push(P(i * (SU + 1) + cL)); }
      lm.visible = pts.length > 3; if (lm.visible) { lm.geometry.dispose(); lm.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, 0.009, 8, false); } });
    // Mundwinkel: fleischige rosa Falte zwischen Ober- und Unterlippe, nach innen eingezogen
    a.cfill.forEach((m, n) => { const cU = n ? SU - SA / 2 : SA / 2, cL = n ? cU - 1 : cU + 1; const i0 = kRow.findIndex(k => k > 0.001); m.visible = i0 > 0; if (!m.visible) return;
      let i1 = i0; while (i1 < a.SV && lerp(Z0s, Z1s, i1 / a.SV) < zh + 0.12) i1++; const g = m.geometry, gp = g.attributes.position.array, gc = g.attributes.color.array; const cA = new THREE.Color(0xd98a8f), cB = new THREE.Color(0x6a1a20), cc = new THREE.Color();
      const P = k => V(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]);
      for (let r = 0; r <= 12; r++) { const fi = lerp(i0 - 1, i1, r / 12), ia = Math.floor(fi), ib = Math.min(a.SV, ia + 1), ft = fi - ia;
        const U = P(ia * (SU + 1) + cU).lerp(P(ib * (SU + 1) + cU), ft), L = P(ia * (SU + 1) + cL).lerp(P(ib * (SU + 1) + cL), ft); const zz = U.z; const w = wrap(zz);
        const dep = 0.05 + 0.12 * (r / 12); // Falte zieht sich zur Mitte hin ein
        for (let q = 0; q <= 8; q++) { const t = q / 8; const X = U.clone().lerp(L, t); const toC = V(-X.x, w.cy - X.y, 0); const dl = toC.length(); if (dl > 1e-4) X.addScaledVector(toC, Math.min(dep * Math.pow(Math.sin(Math.PI * t), 0.6), dl * 0.6) / dl); X.z -= 0.03 * Math.sin(Math.PI * t) * (1 - r / 12);
          const k = r * 9 + q; gp[k * 3] = X.x; gp[k * 3 + 1] = X.y; gp[k * 3 + 2] = X.z; cc.copy(cA).lerp(cB, 0.55 * Math.sin(Math.PI * t) * (1 - r / 12)); gc[k * 3] = cc.r; gc[k * 3 + 1] = cc.g; gc[k * 3 + 2] = cc.b; } }
      g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = true; g.computeVertexNormals(); });
    a.sg.attributes.position.needsUpdate = a.sg.attributes.aStretch.needsUpdate = a.sg.attributes.uv.needsUpdate = a.sg.attributes.color.needsUpdate = true; a.sg.computeVertexNormals(); }
  // Luftröhre: schiebt sich am Mundboden nach vorn
  a.trach.visible = trach > 0.01; if (a.trach.visible) { const mid = tL.clone().add(tR).multiplyScalar(0.5); let base = V(0, mid.y * 0.5 + 0.01, -0.12); let tipP = V(trachX * trach, mid.y + 0.02 + trachY * trach, lerp(0.0, 0.42, trach) + mid.z * 0.4);
    if (trachSide === 9) { if (wrap) { const w = wrap(0.12); base.set(0, w.cy - w.r * 1.06 + 0.035, 0.12); tipP = base.clone().addScaledVector(V(0, 0.55, 1).normalize(), 0.06 + 0.42 * trach); } /* unten am Mundboden unter der Beute nach vorn */ else { base.set(0, -0.045, 0.06); tipP = base.clone().addScaledVector(V(0, 0.32, 1).normalize(), 0.06 + 0.46 * trach); } }
    if (trachSide >= 0 && trachSide < 9) { const m = a.mandibles[trachSide]; base.copy(m.curve.getPoint(0.4).applyMatrix4(m.g.matrix)).add(V(-m.s * 0.03, 0.03, 0)); tipP = base.clone().addScaledVector(V(m.s * 0.85, 0.45, 0.3).normalize(), 0.03 + 0.4 * trach); } const len = base.distanceTo(tipP);
    a.trach.position.copy(base).lerp(tipP, 0.5); a.trach.quaternion.setFromUnitVectors(V(0, 0, 1), tipP.clone().sub(base).normalize()); a.tt.scale.set(1, len, 1);
    a.rings.forEach((r, k) => { const f = (k + 0.5) / a.rings.length - 0.5; r.position.set(0, 0, f * len); r.visible = true; }); a.trTip.position.set(0, 0, len / 2); }
}
// ---- Effekte ----
function aParticles(n, size, color, seed) { const p = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ map: dotTex, size, color, transparent: true, depthWrite: false }));
  p.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); const r = rng(seed); p.userData.v = Array.from({ length: n }, () => [r() - .5, r() - .5, r() - .5, r()]); p.frustumCulled = false; scene.add(p); return p; }
const boneChips = aParticles(40, 0.03, 0xf4ecd8, 5), airP = aParticles(60, 0.035, 0xdff4ff, 7), redP = aParticles(30, 0.03, 0xa01010, 11);
function burstA(p, o, t, spread = 0.6, life = 0.8) { const a = p.geometry.attributes.position.array; p.visible = t > 0 && t < life; p.userData.v.forEach((v, i) => { const tt = clamp(t, 0, life); a[i * 3] = o.x + v[0] * spread * tt * 2; a[i * 3 + 1] = o.y + v[1] * spread * tt * 2 + 0.6 * tt - 2.5 * tt * tt; a[i * 3 + 2] = o.z + v[2] * spread * tt * 2; }); p.geometry.attributes.position.needsUpdate = true; p.material.opacity = 1 - clamp(t / life); }
function airFlow(p, from, to, t) { const a = p.geometry.attributes.position.array; p.visible = true; p.material.opacity = 0.85; p.userData.v.forEach((v, i) => { const k = (t * 0.9 + v[3]) % 1; const q = from.clone().lerp(to, k); a[i * 3] = q.x + v[0] * 0.06 * (1 - k); a[i * 3 + 1] = q.y + v[1] * 0.06 * (1 - k); a[i * 3 + 2] = q.z + v[2] * 0.06 * (1 - k); }); p.geometry.attributes.position.needsUpdate = true; }
