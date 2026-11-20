// ---------- Helfer ----------
const flash = (k, col = '255,40,30') => { if (k > 0) svg.push(`<rect x="0" y="0" width="1080" height="1920" fill="rgba(${col},${(0.35 * k).toFixed(3)})"/>`); };
function chip(text, x, y, k, col = '#f3c63f') { if (k <= 0) return; ui.push(`<div class="pill" style="left:${x}px;top:${y}px;border-color:${col};transform:translate(-50%,-50%) scale(${back(k)})">${text}</div>`); }
function icon(ok, x, y, k) { if (k <= 0) return; const s = back(k);
  svg.push(`<g transform="translate(${x},${y}) scale(${s})"><circle r="62" fill="${ok ? '#2fbf5b' : '#fff'}" stroke="#000" stroke-width="9"/>` + (ok ? '<path d="M-30 2 L-8 24 L32 -22" fill="none" stroke="#fff" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>' : '<path d="M-27 -27 L27 27 M27 -27 L-27 27" stroke="#e8323c" stroke-width="17" stroke-linecap="round"/>') + '</g>'); }
function waves(p, k, T, dir = 1) { if (k <= 0) return; const [x, y] = proj(p); for (let i = 0; i < 3; i++) { const ph = (T * 2.2 + i / 3) % 1; const r = 40 + ph * 120; const op = k * (1 - ph);
    svg.push(`<path d="M${x + dir * r * 0.5} ${y - r * 0.8} A${r} ${r} 0 0 ${dir > 0 ? 1 : 0} ${x + dir * r * 0.5} ${y + r * 0.8}" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity="${op.toFixed(2)}" transform="translate(${dir * 30},-20)"/>`); } }
function camFix(pos, look, fov = 40) { LOOK = look.clone(); camera.position.copy(pos); camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(look); camera.updateMatrixWorld(true); }
const headP = (p = pea) => { p.root.updateMatrixWorld(true); return p.head.getWorldPosition(V(0, 0, 0)); };
const ptW = (p, x, y, z) => { p.root.updateMatrixWorld(true); return V(x, y, z).applyMatrix4(p.body.matrixWorld); };
const fwd = yaw => V(Math.sin(yaw), 0, Math.cos(yaw));
const WP = (i, pre, n) => WT(i, pre, n); // Kurzform
const arc = (a, b, h, k) => a.clone().lerp(b, k).add(V(0, 4 * h * k * (1 - k), 0));
function fallenAt(c, yaw, n, T, t0 = -1) { const q = new THREE.Quaternion(); G.fallen.visible = n > 0; for (let i = 0; i < NF; i++) { const P = G.fallenP[i];
    if (i >= n) { m4.makeScale(0, 0, 0); G.fallen.setMatrixAt(i, m4); continue; }
    const d = V(Math.cos(P.a) * 0.3, 0, -1).applyAxisAngle(V(0, 1, 0), yaw).normalize(); basisQ(d, V(0, 1, 0), q); const off = V(P.x, 0.012 + i * 0.0001, P.z).applyAxisAngle(V(0, 1, 0), yaw);
    m4.compose(c.clone().add(off), q, V(1, pea.F[i].L * 0.9, 1)); G.fallen.setMatrixAt(i, m4); }
  G.fallen.instanceMatrix.needsUpdate = true; }
function vaseFill(n) { const q = new THREE.Quaternion(); for (let i = 0; i < 40; i++) { if (i >= n) { m4.makeScale(0, 0, 0); G.vaseF.setMatrixAt(i, m4); continue; } const a = i * 2.4, s = 0.25 + (i % 5) * 0.06;
    basisQ(V(Math.cos(a) * s, 1, Math.sin(a) * s), V(Math.cos(a), 0, Math.sin(a)), q); m4.compose(V(0, 0.25, 0), q, V(1, 1.1 + (i % 3) * 0.12, 1)); G.vaseF.setMatrixAt(i, m4); } G.vaseF.instanceMatrix.needsUpdate = true; }

// ---------- Reset ----------
function resetWorld() {
  rex.root.visible = false; ui = []; svg = []; badge.style.display = 'none'; cta.style.display = 'none'; }
function stage(i, T) { // Ausbaustufe des Gartens je Szene
  mood('day'); sunAt(V(0, 0, 0)); G.nightLamp.intensity = 0;
  ground.visible = world.visible = sky.visible = true; scene.background = null; scene.fog.near = 40; scene.fog.far = 320;
  G.paths.visible = G.fountain.visible = i !== 3 || true; G.paths.scale.set(1, 1, 1); G.fountain.scale.set(1, 1, 1);
  G.crate.visible = i === 2 || i === 3; G.crateDoor.rotation.y = 0;
  G.aviary.visible = i >= 4; G.avPosts.concat(G.avBeams, G.avNets).forEach(o => { o.scale.set(1, 1, 1); o.visible = true; }); G.perch.visible = true; G.night.visible = i >= 6; G.night.scale.set(1, 1, 1);
  G.car.visible = i >= 7; G.paint.opacity = 1; G.paint.depthWrite = true; G.tarp.visible = i >= 9; G.tarp.position.set(0, 0, 0);
  G.beds.visible = true; G.bedNets.forEach(n => { n.visible = i >= 11; n.scale.set(1, 1, 1.15); }); G.kale.forEach(l => l.forEach(m => m.visible = true));
  G.pile.forEach(o => o.m.visible = i >= 11); for (const o of G.pile) { o.m.position.set(1.6 + Math.cos(o.a) * o.d, 0.03 + o.d * 0.1, -2.4 + Math.sin(o.a) * o.d); o.m.rotation.set(-1.3, o.a, o.rx * 0.2); o.m.scale.setScalar(o.s * (i >= 11 ? 0.0001 : 1)); }
  G.tape.visible = false; G.fallen.visible = false; G.vase.visible = i >= 12; vaseFill(i >= 13 ? 40 : 0); G.vase.position.set(-1.9, 0, 3.8);
  G.pane.material.emissiveIntensity = 0; G.sil.forEach(m => m.visible = false); sprayAt(T);
  posePea(rival, { vis: false }); posePea(pea, { pos: V(0, 0, 2.6), T });
}
function neighbor(phone, T, t0) { G.pane.material.emissiveIntensity = 1.4; G.sil[phone ? 1 : 0].visible = true; G.sil[phone ? 1 : 0].position.x = 0.1 + 0.03 * Math.sin(T * 3);
  cam(V(-0.6, 2.4, -4.6), V(-1.5, 3.9, -9.5), 36, T, 0.01); }

const shots = [
  // 0: Pfau im Garten – schönster Vogel – Nachbarn hassen ihn
  (T) => { const tA = WP(0, 'aber'); badge.style.display = T < 3 ? 'block' : 'none';
    if (T < tA) { const u = T - S[0].start; posePea(pea, { pos: V(0, 0, 2.6), yaw: 0, wheel: 1, shake: T > 2.8 && T < 3.6 ? 1 : 0, T, head: V(0, 1.06, 0.3 + 0.02 * Math.sin(T * 3)) });
      cam(V(Math.sin(u * 0.12) * 1.2, lerp(0.7, 1.0, ease(u / 4)), lerp(7.5, 6.0, ease(u / 4))), V(0, 1.05, 2.4), 40, T, 0.004);
      label3('PFAU', headP(), clamp((T - WP(0, 'pfau')) / 0.3) * clamp((2.6 - T) / 0.3), 160, -180); }
    else { posePea(pea, { pos: V(-1.0, 1.9, -7.2), yaw: Math.PI, T }); neighbor(false, T); chip('😡 NACHBARN', 540, 520, clamp((T - WP(0, 'nachbarn')) / 0.3)); icon(false, 540, 1340, clamp((T - WP(0, 'hassen')) / 0.25)); }
  },
  // 1: 200 Federn, 1,5 m lang – springt trotzdem 3 m hoch
  (T) => { const tR = WP(1, 'trotzdem'), tJ = WP(1, 'springt');
    if (T < tR) { const P0 = V(3.6, 0, 1.6); posePea(pea, { pos: P0, yaw: Math.PI / 2, T, head: V(0, 1.04, 0.3) });
      cam(V(3.2, 1.25, 6.6), V(3.25, 0.55, 1.6), 40, T, 0.004);
      const tF = WP(1, 'zweihundert'); const n = Math.round(200 * ease((T - tF) / 0.9)); chip(`🪶 ${n} FEDERN`, 540, 470, clamp((T - tF + 0.1) / 0.3));
      const tM = WP(1, 'anderthalb'); if (T > tM - 0.2) { const k = ease((T - tM + 0.2) / 0.8); G.tape.visible = true; G.tape.scale.set(1.5 * k + 0.001, 1, 1); G.tape.position.set(P0.x - 0.22 - 0.75 * k, 0.03, P0.z + 0.32); chip('📏 1,5 METER', 540, 1330, clamp((T - tM) / 0.3), '#f2cf2a'); } }
    else { const B = G.branch, P0 = V(B.x, 0, B.z + 0.05); const k = ease((T - tJ - 0.15) / 0.75); const crouch = clamp((T - tJ + 0.4) / 0.4) * (1 - clamp((T - tJ - 0.15) / 0.1));
      posePea(pea, { pos: V(P0.x, B.y * k, P0.z), yaw: Math.PI / 2, T, wings: k > 0 && k < 1 ? 1 : 0, flap: T * 18, sit: crouch * 0.4, bodyPitch: k > 0 && k < 1 ? -0.3 : 0 });
      cam(V(B.x + 2.0, 1.9, B.z + 7.6), V(B.x + 0.4, 2.1, B.z), 40, T, 0.006);
      G.tape.visible = true; const hk = ease((T - tJ) / 0.8); G.tape.scale.set(3 * hk + 0.001, 1, 1); G.tape.rotation.set(0, 0, Math.PI / 2); G.tape.position.set(B.x + 0.75, 1.5 * hk, B.z + 0.3);
      chip('⬆️ 3 METER', 540, 470, clamp((T - WP(1, 'drei')) / 0.3), '#f2cf2a'); }
  },
  // 2: Garten mit Springbrunnen – Pfau zieht ein
  (T) => { const tG = WP(2, 'garten'), tS = WP(2, 'springbrunnen'), tH = WP(2, 'holst');
    G.paths.scale.set(ease((T - tG + 0.3) / 0.6) + 0.001, 1, ease((T - tG + 0.3) / 0.6) + 0.001); G.fountain.scale.set(1, back((T - tS + 0.1) / 0.6) + 0.001, 1);
    if (T < tH) { posePea(pea, { vis: false }); const u = T - S[2].start; cam(V(Math.sin(u * 0.1) * 2, 10, 10.5), V(0, 0, 0.6), 40, T, 0.01); }
    else { const k = ease((T - tH) / 0.5); G.crateDoor.rotation.y = -2.1 * k; const w = clamp((T - tH - 0.3) / 1.0);
      const P = V(0, 0, lerp(0.1, 1.6, w)).applyAxisAngle(V(0, 1, 0), G.crate.rotation.y).add(G.crate.position); posePea(pea, { pos: P, yaw: G.crate.rotation.y, walk: T * 7, stepK: w > 0 && w < 1 ? 1 : 0, T });
      cam(V(4.6, 1.4, 6.0), V(2.0, 0.7, 3.2), 40, T, 0.005); }
  },
  // 3: Am nächsten Morgen weg – fliegt über den Zaun
  (T) => { const tD = WP(3, 'denn'), tF = WP(3, 'fliegen'); G.crateDoor.rotation.y = -2.1;
    if (T < tD) { posePea(pea, { vis: false }); const c = G.crate; const look = V(0, 0.5, 0).applyAxisAngle(V(0, 1, 0), c.rotation.y).add(c.position); const cp = V(0, 1.1, 2.6).applyAxisAngle(V(0, 1, 0), c.rotation.y).add(c.position);
      cam(cp, look, 40, T, 0.005); icon(false, 540, 760, clamp((T - WP(3, 'weg')) / 0.25)); chip('🌅 NÄCHSTER MORGEN', 540, 470, clamp((T - S[3].start) / 0.3)); }
    else { const A = V(1.5, 0, -4.6), B = V(1.2, 0, -10.5); const k = clamp((T - tF + 0.1) / 1.6); const P = arc(A, B, 2.8, ease(k)); if (k <= 0) P.copy(A);
      posePea(pea, { pos: P, yaw: Math.PI, T, floor: k > 0 ? P.y + 0.35 : 0, wings: k > 0.02 && k < 0.98 ? 1 : 0, flap: T * 16, bodyPitch: k > 0 && k < 1 ? -0.15 : 0, walk: T * 8, stepK: k <= 0 ? 1 : 0 });
      cam(V(3.2, 1.3, -0.4), V(1.4, 1.7, -7.0), 40, T, 0.006); label3('ZAUN', V(-0.5, G.fenceH, G.fenceZ), clamp((T - WP(3, 'zaun')) / 0.3), -120, -200); }
  },
  // 4: Voliere mit Netzdach – ein paar Monate drin – hier zu Hause
  (T) => { const tB = WP(4, 'baust'), tN = WP(4, 'netzdach'), tL = WP(4, 'lässt'), tM = WP(4, 'monate'), tZ = WP(4, 'hause');
    G.avPosts.forEach((p, i) => p.scale.set(1, ease((T - tB - i * 0.07) / 0.5) + 0.001, 1)); G.avBeams.forEach((b, i) => b.scale.set(ease((T - tB - 0.5 - i * 0.08) / 0.4) + 0.001, 1, ease((T - tB - 0.5 - i * 0.08) / 0.4) + 0.001));
    G.avNets.forEach((n, i) => { const k = ease((T - tN + 0.6 - i * 0.12) / 0.5); n.visible = k > 0.01; n.scale.set(1, k + 0.001, 1); });
    const a = G.aviary.position; const ph = (T - S[4].start) * 0.35; const P = V(a.x + Math.cos(ph) * 0.8, 0, a.z + 0.3 + Math.sin(ph) * 0.8);
    posePea(pea, { pos: P, yaw: ph + Math.PI, walk: T * 7, stepK: 1, T });
    if (T < tL) cam(V(0.6, 2.8, 2.4), V(-3.6, 1.1, -3.6), 40, T, 0.006); else cam(V(-0.2, 1.7, 0.4), V(-3.4, 0.8, -3.2), 40, T, 0.005);
    if (T > tM - 0.2) { const mo = 1 + Math.min(2, Math.floor((T - tM) / 0.45)); chip(`📅 ${mo} MONAT${mo > 1 ? 'E' : ''}`, 540, 470, clamp((T - tM + 0.2) / 0.3)); }
    icon(true, 540, 1330, clamp((T - tZ) / 0.25)); chip('🏡 ZUHAUSE', 540, 600, clamp((T - tZ) / 0.3), '#2fbf5b');
  },
  // 5: Sonnenaufgang – schreit – Nachbarn beschweren sich
  (T) => { mood('dawn'); const tS = WP(5, 'fängt'), tN = WP(5, 'deine');
    if (T < tN) { const P = G.perchTop.clone(); const scream = ease((T - tS) / 0.35) * (T < tN - 0.1 ? 1 : 0);
      posePea(pea, { pos: P, yaw: 0, T, floor: 0, head: V(0, lerp(1.06, 1.32, scream), lerp(0.3, 0.2, scream)), pitch: -0.5 * scream, beak: scream * (0.6 + 0.4 * Math.sin(T * 20)) });
      sunAt(V(-3.6, 0, -3.6)); { const L = G.perchTop.clone().add(V(0, 0.7, 0)); camFix(V(-1.85, 1.75, -1.85), L, 55); } waves(headP(), scream, T, 1); chip('🌄 SONNENAUFGANG', 540, 470, clamp((T - WP(5, 'sonnenaufgang')) / 0.3)); }
    else { posePea(pea, { vis: false }); neighbor(true, T); chip('BESCHWERDE BEI DER STADT', 540, 520, clamp((T - WP(5, 'beschweren')) / 0.3)); icon(false, 540, 1340, clamp((T - WP(5, 'stadt')) / 0.25)); }
  },
  // 6: Dunkles Nachthaus, Stange direkt unter der Decke – Hals kann sich nicht strecken
  (T) => { mood('night'); const tH = WP(6, 'nachthaus'), tS = WP(6, 'stange'), tX = WP(6, 'strecken'), tK = WP(6, 'kann');
    G.night.scale.setScalar(back((T - tH + 0.2) / 0.6) + 0.001);
    if (T < tS) { posePea(pea, { vis: false }); cam(V(-1.0, 1.8, -0.9), V(-4.6, 0.9, -4.3), 40, T, 0.005); G.nightLamp.intensity = 0; }
    else { G.nightLamp.intensity = 4; hemi.intensity = 0.3; sun.intensity = 0.05; const P = G.nightPerch.clone(); const push = T > tX - 0.3 ? Math.max(0, Math.sin((T - tX + 0.3) * 7)) * clamp((tK + 0.6 - T) / 0.3) : 0;
      posePea(pea, { pos: P, yaw: Math.PI / 2, T, floor: 0, sit: 0.5, head: V(0, 0.8 + push * 0.05, 0.27), pitch: 0.25 - push * 0.2, shake: push });
      { const C = G.nightC; camFix(V(C.x + 0.85, 1.15, C.z + 0.78), V(C.x - 0.15, 1.3, C.z - 0.1), 70); } label3('DECKE', V(G.nightC.x - 0.3, G.nightCeil - 0.02, G.nightC.z - 0.4), clamp((T - WP(6, 'decke')) / 0.3), 120, 200);
      chip('🔇 KEIN SCHREI', 540, 470, clamp((T - WP(6, 'nicht')) / 0.3), '#2fbf5b'); icon(true, 540, 1330, clamp((T - WP(6, 'schreien')) / 0.25)); }
  },
  // 7: Greift das Auto an – Spiegelbild
  (T) => { const tA = WP(7, 'greift'); const carS = G.car.position.z - 0.91; const P = V(3.9, 0, carS - 0.75); const peck = T > tA ? Math.max(0, Math.sin((T - tA) * 9)) : 0;
    const o = { yaw: 0, T, head: V(0, lerp(1.0, 0.86, peck), lerp(0.3, 0.5, peck)), pitch: 0.4 * peck, wings: 0.25 * (T > tA ? 1 : 0), wheel: 0.25 * clamp((T - tA) / 0.5) };
    posePea(pea, Object.assign({ pos: P }, o)); posePea(rival, Object.assign({ pos: V(P.x, 0, carS - 0.03), mirror: true, opacity: 0.7 }, o)); rival.root.scale.z = -0.08; // flaches Spiegelbild auf dem Lack
    cam(V(1.2, 1.5, carS - 4.0), V(3.95, 0.8, carS), 40, T, 0.006);
    label3('SPIEGELBILD', headP(rival), clamp((T - WP(7, 'spiegelbild')) / 0.3), 160, -230); chip('😡 RIVALE?', 540, 470, clamp((T - WP(7, 'fremden')) / 0.3));
  },
  // 8: Plane über das Auto – Rivale verschwunden
  (T) => { const tP = WP(8, 'plane'), tV = WP(8, 'verschwunden'); const carS = G.car.position.z - 0.91; const P = V(3.9, 0, carS - 0.75);
    const k = ease((T - tP) / 0.6); G.tarp.visible = k > 0; G.tarp.position.y = (1 - k) * 2.4; G.tarp.scale.set(1.04, lerp(0.4, 1.03, k), 1.05);
    posePea(pea, { pos: P, yaw: -0.3, T, head: V(0, 1.06, 0.3) }); const ro = clamp(1 - (T - tP - 0.4) / 0.3); posePea(rival, { pos: V(P.x, 0, carS - 0.03), yaw: -0.3, mirror: true, T, vis: ro > 0.02, opacity: 0.7 * ro }); rival.root.scale.z = -0.08;
    cam(V(0.8, 1.9, carS - 3.4), V(4.1, 0.8, carS + 0.3), 40, T, 0.006); icon(true, 540, 1330, clamp((T - tV) / 0.25)); chip('🙈 RIVALE WEG', 540, 470, clamp((T - tV) / 0.3), '#2fbf5b');
  },
  // 9: Fliegt ins Gemüsebeet – frisst jedes Grünkohlblatt
  (T) => { const tF = WP(9, 'fliegt'), tE = WP(9, 'frisst'); const A = V(0.6, 0, -1.0), B = V(3.6, 0, -4.2); const k = clamp((T - tF) / 0.9); const P = arc(A, B, 1.4, ease(k)); if (k <= 0) P.copy(A); const fl = k > 0 && k < 1;
    const eatK = clamp((T - tE) / (S[9].end - tE + 0.2)); const peck = T > tE ? Math.max(0, Math.sin((T - tE) * 10)) : 0;
    posePea(pea, { pos: P, yaw: k < 1 ? Math.atan2(B.x - A.x, B.z - A.z) : 0, T, floor: fl ? P.y + 0.35 : 0, wings: k > 0 && k < 1 ? 1 : 0, flap: T * 16, head: V(0, lerp(1.06, 0.5, peck), lerp(0.3, 0.55, peck)), pitch: 0.9 * peck });
    let c = 0; G.kale.forEach((l, pi) => l.forEach((m, j) => { m.visible = (c++ / 90) >= eatK; }));
    cam(V(-0.4, 2.7, 1.4), V(3.2, 0.5, -3.8), 40, T, 0.006); icon(false, 540, 1330, clamp((T - WP(9, 'grünkohlblatt')) / 0.25)); chip('🥬 GRÜNKOHL WEG', 540, 470, clamp((T - WP(9, 'jedes')) / 0.3));
  },
  // 10: Netze über die Beete – eigener Haufen Grünzeug
  (T) => { const tN = WP(10, 'netze'), tW = WP(10, 'wirfst');
    G.bedNets.forEach((n, i) => { const k = back((T - tN + 0.2 - i * 0.2) / 0.5); n.visible = k > 0.01; n.scale.set(1, 1, 1.15 * k + 0.001); });
    G.pile.forEach(o => { o.m.visible = true; const k = clamp((T - tW - o.dl) / 0.5); o.m.scale.setScalar(k > 0 ? o.s : 0.0001); o.m.position.y = 0.03 + o.d * 0.1 + (1 - ease(k)) * o.h; o.m.rotation.x = -1.3 + (1 - k) * o.rx; });
    const w = clamp((T - tW - 0.5) / 1.0); const A = V(2.0, 0, -1.4), B = V(1.6, 0, -1.65); const P = A.clone().lerp(B, ease(w)); const peck = T > tW + 1.5 ? Math.max(0, Math.sin((T - tW) * 9)) : 0;
    posePea(pea, { pos: P, yaw: Math.PI + 0.3, walk: T * 7, stepK: w > 0 && w < 1 ? 1 : 0, T, head: V(0, lerp(1.06, 0.45, peck), lerp(0.3, 0.55, peck)), pitch: 0.9 * peck });
    cam(V(-0.9, 1.4, -1.2), V(1.7, 0.45, -2.1), 40, T, 0.006); chip('🥬 EIGENES FUTTER', 540, 470, clamp((T - WP(10, 'haufen')) / 0.3), '#2fbf5b'); icon(true, 540, 1330, clamp((T - WP(10, 'grünzeug')) / 0.25));
  },
  // 11: Spätsommer – alle Schwanzfedern fallen aus
  (T) => { mood('late'); const tF = WP(11, 'fallen'), tA = WP(11, 'aus'); const shed = clamp((T - tF) / (tA - tF + 0.3)); const P = V(-0.6, 0, 2.6), yaw = Math.PI / 2;
    posePea(pea, { pos: P, yaw, T, shed, head: V(0, lerp(1.06, 0.92, clamp((T - WP(11, 'denkst')) / 0.4)), 0.32), pitch: 0.3 * clamp((T - WP(11, 'denkst')) / 0.4) });
    fallenAt(V(P.x - 0.2, 0, P.z), yaw, Math.round(NF * shed), T); cam(V(-0.9, 1.15, 6.6), V(-0.9, 0.5, 2.6), 40, T, 0.004);
    chip('🍂 SPÄTSOMMER', 540, 470, clamp((T - WP(11, 'spätsommer')) / 0.3)); chip('🤒 KRANK?', 540, 1330, clamp((T - WP(11, 'krank')) / 0.3), '#e8483b');
  },
  // 12: Jedes Jahr – 200 Federn gratis – wächst bis zum Frühling nach
  (T) => { const tJ = WP(12, 'jahr'), tS = WP(12, 'sammelst'), tF = WP(12, 'frühling'); const P = V(-0.6, 0, 2.6), yaw = Math.PI / 2;
    if (T < tF - 0.3) { mood('late'); const kc = clamp((T - tS) / 1.6); fallenAt(V(P.x - 0.2, 0, P.z), yaw, Math.round(NF * (1 - kc)), T); vaseFill(Math.round(40 * kc));
      posePea(pea, { pos: P, yaw, T, shed: 1 }); cam(V(-2.0, 1.25, 5.6), V(-1.6, 0.5, 2.4), 40, T, 0.004);
      chip('📅 JEDES JAHR', 540, 470, clamp((T - tJ) / 0.3)); const tZ = WP(12, 'zweihundert'); chip(`🪶 ${Math.round(200 * ease((T - tZ) / 0.9))} FEDERN GRATIS`, 540, 1330, clamp((T - tZ + 0.1) / 0.3), '#2fbf5b'); }
    else { mood('day'); vaseFill(40); const g = ease((T - tF + 0.1) / 1.3); posePea(pea, { pos: P, yaw, T, shed: 1 - g, grow: lerp(0.35, 1, g) }); cam(V(-0.9, 1.15, 6.6), V(-0.9, 0.5, 2.6), 40, T, 0.004);
      chip('🌸 FRÜHLING', 540, 470, clamp((T - tF + 0.2) / 0.3), '#f06aa0'); }
  },
  // 13: Jeden Morgen schlägt er vor dem Springbrunnen sein Rad
  (T) => { mood('late'); const tR = WP(13, 'schlägt'); const w = ease((T - tR) / 0.8); const u = T - S[13].start;
    posePea(pea, { pos: V(0, 0, 2.6), yaw: 0, wheel: w, shake: w > 0.95 && T < tR + 1.6 ? 1 : 0, T }); cam(V(-1.2 + u * 0.3, 0.75, 6.6), V(0, 1.0, 2.4), 40, T, 0.004);
  },
  // 14: Glückwunsch – Pfauen-Paradies
  (T) => { const u = T - S[14].start; posePea(pea, { pos: V(0, 0, 2.6), yaw: 0, wheel: 1, T }); const a = 0.35 + u * 0.12;
    cam(V(Math.sin(a) * 9.5, lerp(7.5, 9.5, ease(u / 2.5)), Math.cos(a) * 9.5 + 0.5), V(0, 0.3, -0.8), 42, T, 0.004); cta.style.display = 'block';
  },
];
shots.forEach((f, i) => { shots[i] = T => { stage(i, T); f(T); }; });
