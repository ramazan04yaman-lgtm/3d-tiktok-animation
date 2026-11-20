// ---------- Helfer ----------
const flash = (k, col = '255,40,30') => { if (k > 0) svg.push(`<rect x="0" y="0" width="1080" height="1920" fill="rgba(${col},${(0.35 * k).toFixed(3)})"/>`); };
function chip(text, x, y, k, col = '#f3c63f') { if (k <= 0) return; ui.push(`<div class="pill" style="left:${x}px;top:${y}px;border-color:${col};transform:translate(-50%,-50%) scale(${back(k)})">${text}</div>`); }
function icon(ok, x, y, k) { if (k <= 0) return; const s = back(k);
  svg.push(`<g transform="translate(${x},${y}) scale(${s})"><circle r="62" fill="${ok ? '#2fbf5b' : '#fff'}" stroke="#000" stroke-width="9"/>` + (ok ? '<path d="M-30 2 L-8 24 L32 -22" fill="none" stroke="#fff" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>' : '<path d="M-27 -27 L27 27 M27 -27 L-27 27" stroke="#e8323c" stroke-width="17" stroke-linecap="round"/>') + '</g>'); }
function ring(p, k, col = '#e8323c') { if (k <= 0) return; const [x, y] = proj(p); svg.push(`<circle cx="${x}" cy="${y}" r="${(70 * back(k)).toFixed(1)}" fill="none" stroke="${col}" stroke-width="9"/>`); }
function sunRays(k, T) { if (k <= 0) return; for (let i = 0; i < 6; i++) { const x = 140 + i * 170 + 30 * Math.sin(T + i); svg.push(`<line x1="${x + 260}" y1="0" x2="${x}" y2="900" stroke="#ffd84a" stroke-width="16" opacity="${(0.5 * k).toFixed(2)}" stroke-linecap="round"/>`); } }
function hearts(p, k, T) { if (k <= 0) return; const [x, y] = proj(p); for (let i = 0; i < 4; i++) { const ph = (T * 0.6 + i / 4) % 1; const hx = x + Math.sin(ph * 6 + i * 2) * 50 + (i - 1.5) * 40, hy = y - 60 - ph * 260, s = (0.7 + 0.5 * Math.sin(ph * Math.PI)) * k;
    svg.push(`<path transform="translate(${hx.toFixed(1)},${hy.toFixed(1)}) scale(${s.toFixed(2)})" d="M0 18 C-40 -10 -28 -40 0 -22 C28 -40 40 -10 0 18 Z" fill="#ff4f78" stroke="#000" stroke-width="5" opacity="${(1 - ph).toFixed(2)}"/>`); } }
function drops(p, k, T) { if (k <= 0) return; const [x, y] = proj(p); for (let i = 0; i < 3; i++) { const ph = (T * 0.8 + i / 3) % 1; const dx = x + (i - 1) * 60, dy = y - 90 + ph * 60;
    svg.push(`<path transform="translate(${dx},${dy}) scale(${k})" d="M0 -26 C14 -6 18 6 0 18 C-18 6 -14 -6 0 -26 Z" fill="#6ec3ff" stroke="#000" stroke-width="5" opacity="${(1 - ph).toFixed(2)}"/>`); } }
function camFix(pos, look, fov = 40) { LOOK = look.clone(); camera.position.copy(pos); camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(look); camera.updateMatrixWorld(true); }
const headW = k => { k.root.updateMatrixWorld(true); return k.head.getWorldPosition(V(0, 0, 0)); };
const WP = (i, pre, n) => WT(i, pre, n);
const yawTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
// Hoppeln von a nach b in t0..t1 (Sprünge à ~0.35 s)
function hopTo(k, a, b, T, t0, t1, extra = {}) { const u = clamp((T - t0) / (t1 - t0)); const moving = T > t0 && T < t1; const p = a.clone().lerp(b, ease(u));
  poseR(k, Object.assign({ pos: p, yaw: yawTo(a, b), hop: moving ? (T - t0) / 0.36 : 0, hopK: moving ? 1 : 0, T }, extra)); return p; }

// ---------- Reset ----------
function resetWorld() { rex.root.visible = false; ui = []; svg = []; badge.style.display = 'none'; cta.style.display = 'none'; }
function stage(i, T) {
  mood('day'); sunAt(V(0, 0, 0)); ground.visible = world.visible = sky.visible = true; scene.background = null; scene.fog.near = 40; scene.fog.far = 320; GRASS.visible = true; garden.visible = true;
  G.pen.visible = i >= 1 && i !== 4 && i !== 5; G.roof.visible = i >= 7 && i !== 4 && i !== 5; G.roof.position.set(0, PH + 0.02, 0); G.pen.scale.set(1, 1, 1);
  G.flap.rotation.x = -1.2; G.slab.visible = i >= 9; G.slab.scale.set(1, 1, 1); G.twigs.visible = i >= 11; G.twigs.scale.setScalar(1); G.bites.forEach(b => b.visible = i >= 10 && i <= 10);
  G.cut.visible = i === 4 || i === 5; G.buried.visible = i === 5; G.tun1.visible = i === 4; G.tun2.visible = i === 5; G.dirt.visible = G.chips.visible = false; G.carrot.visible = false;
  G.shade.visible = i >= 8; G.hutch.visible = i >= 1; G.posts.forEach(p => p.scale.set(1, 1, 1)); G.sides.forEach(s => s.scale.set(1, 1, 1));
  lawnSet(i >= 2 ? 1 : 0, (i === 4 || i === 5) ? ZF - 0.03 : 99);
  [bun, bun2, ...babies].forEach(k => poseR(k, { vis: false })); poseFox(fox, { vis: false });
}
const shots = [
  // 0: Karotten = Süßigkeiten – sie brauchen frisches Gras
  (T) => { badge.style.display = T < 2.4 ? 'block' : 'none'; G.pen.visible = false; const tW = WP(0, 'was'), tG = WP(0, 'gras');
    const P = V(0, 0, 0.6); const eatCar = T < tW - 0.15;
    if (eatCar) { G.carrot.visible = true; G.carrot.position.set(P.x - 0.02, 0.025, P.z + 0.17); G.carrot.rotation.set(0, Math.PI / 2 + 0.3, 0.15); poseR(bun, { pos: P, yaw: 0, headP: 0.5, chew: 1, T }); }
    else { const h = clamp((T - tW) / 0.5); poseR(bun, { pos: P, yaw: 0, headP: lerp(0.2, 1.4, ease(h)), chew: 1, T }); }
    camFix(V(0.36 - T * 0.02, 0.26, 1.6), V(0, 0.12, 0.64), 34);
    if (eatCar) { icon(false, 540, 1240, clamp((T - 0.05) / 0.2)); chip('🥕 = 🍬 SÜSSIGKEIT', 540, 470, clamp((T - 0.15) / 0.25), '#e8483b'); }
    else { chip('🌱 FRISCHES GRAS', 540, 470, clamp((T - tW) / 0.3), '#2fbf5b'); icon(true, 540, 1240, clamp((T - tG) / 0.25)); }
  },
  // 1: Auslauf direkt auf dem Rasen – sie mähen ihn für dich
  (T) => { const t0 = S[1].start, tA = WP(1, 'auslauf'), tM = WP(1, 'mähen');
    G.posts.forEach((p, k) => p.scale.set(1, clamp((T - t0 - 0.05 * k) / 0.35) + 1e-3, 1)); G.sides.forEach((s, k) => s.scale.set(1, clamp((T - tA + 0.3 - 0.12 * k) / 0.4) + 1e-3, 1));
    G.hutch.visible = T > tA + 0.4; G.hutch.scale.setScalar(back(clamp((T - tA - 0.4) / 0.35)) + 1e-3);
    const mow = clamp((T - tM + 0.2) / 1.8); lawnSet(mow);
    hopTo(bun, V(0.9, 0, 0.6), V(-0.2, 0, 0.1), T, tA + 0.5, tA + 2.2, { headP: T > tA + 2.3 ? 1.3 : 0, chew: 1 });
    camFix(V(1.4 - (T - t0) * 0.06, 1.45, 3.1), V(0.0, 0.15, 0.0), 40); label3('AUSLAUF', V(PX - 0.2, PH, PZ), clamp((T - tA - 0.2) / 0.3), 60, -200);
    chip('🌱 MÄHT DEN RASEN', 540, 470, clamp((T - tM) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - WP(1, 'dich')) / 0.25));
  },
  // 2: Ein Kaninchen allein wird einsam
  (T) => { poseR(bun, { pos: V(-0.3, 0, 0.35), yaw: 0.5, earsDown: 1, headP: 0.5, T }); camFix(V(0.28 - (T - S[2].start) * 0.03, 0.3, 0.95), V(-0.3, 0.1, 0.35), 38);
    chip('😢 EINSAM', 540, 470, clamp((T - WP(2, 'allein')) / 0.3), '#7fc4ff'); icon(false, 540, 1340, clamp((T - WP(2, 'einsam')) / 0.25)); },
  // 3: Ein zweites dazu – ab jetzt kuscheln sie
  (T) => { const tZ = WP(3, 'zweites'), tK = WP(3, 'kuscheln'); poseR(bun, { pos: V(-0.3, 0, 0.35), yaw: 0.5, earsDown: lerp(1, 0, clamp((T - tZ - 0.8) / 0.6)), headP: 0.2, T });
    const a = V(1.0, 0, 0.15), b = V(-0.08, 0, 0.36); hopTo(bun2, a, b, T, tZ - 0.1, tZ + 1.3); if (T > tZ + 1.3) poseR(bun2, { pos: b, yaw: -1.2, headY: 0.3, T });
    camFix(V(-0.05, 0.36, 1.04), V(-0.18, 0.1, 0.35), 42); label3('NR. 2', headW(bun2), clamp((T - tZ - 0.3) / 0.3) * clamp((tK - T) / 0.3), 120, -200);
    hearts(V(-0.2, 0.25, 0.4), clamp((T - tK) / 0.3), T); chip('❤️ ZU ZWEIT', 540, 470, clamp((T - tK) / 0.3), '#ff4f78'); icon(true, 540, 1340, clamp((T - WP(3, 'zusammen')) / 0.25)); },
  // 4: Unter dem Zaun durchgegraben (Querschnitt)
  (T) => { mood('morning'); ground.visible = false; GRASS.visible = false; const t0 = S[4].start, tD = WP(4, 'durchgegraben'); const k = clamp((T - t0 - 0.2) / (tD - t0 + 0.2));
    tunnelGrow(G.tun1, k); const c = G.tun1.userData.c; const u = clamp(k - 0.04); const p = c.getPoint(u), tg = c.getTangent(u);
    if (k < 0.97) poseR(bun2, { pos: V(p.x, p.y - 0.07, ZF + 0.1), yaw: Math.PI / 2, pitch: -Math.atan2(tg.y, tg.x) * 0.6, dig: 1, scale: 0.7, T }); else hopTo(bun2, V(2.15, 0, ZF - 0.15), V(2.6, 0, ZF - 0.3), T, tD + 0.1, tD + 0.9);
    if (k > 0.05 && k < 0.98) spray(G.dirt, V(p.x, p.y, ZF + 0.15), T, V(-1, 0, 0.3), 0.3, 0.4);
    poseR(bun, { pos: V(0.75, 0, ZF - 0.4), yaw: 1.2, headP: 0.3, T });
    camFix(V(1.55, -0.1, ZF + 3.0), V(1.55, -0.15, ZF), 40); label3('ZAUN', V(PX, PH * 0.8, ZF - 0.05), clamp((T - t0 - 0.2) / 0.3), -150, -160);
    chip('🕳️ AUSGEBÜXT', 540, 470, clamp((T - tD) / 0.3), '#e8483b'); icon(false, 540, 1500, clamp((T - tD - 0.2) / 0.25)); },
  // 5: Drahtgitter unter die Erde – jeder Tunnel endet nach ein paar Zentimetern
  (T) => { ground.visible = false; GRASS.visible = false; const tG = WP(5, 'drahtgitter'), tJ = WP(5, 'jeder'), tE = WP(5, 'endet');
    G.buried.position.y = lerp(0.9, 0, ease(clamp((T - tG + 0.2) / 0.7))); const k = clamp((T - tJ + 0.3) / (tE - tJ + 0.3)); tunnelGrow(G.tun2, k);
    const c = G.tun2.userData.c; const u = clamp(k - 0.06); const p = c.getPoint(u), tg = c.getTangent(u); const stuck = k >= 1;
    if (T > tJ - 0.3) { poseR(bun2, { pos: V(p.x - (stuck ? 0.03 * Math.abs(Math.sin(T * 9)) : 0), p.y - 0.07, ZF + 0.1), yaw: Math.PI / 2, pitch: -Math.atan2(tg.y, tg.x) * 0.6, dig: 1, scale: 0.7, earsDown: stuck ? 0.6 : 0, T }); if (!stuck) spray(G.dirt, V(p.x, p.y, ZF + 0.15), T, V(-1, 0, 0.3), 0.3, 0.4); }
    else poseR(bun2, { pos: V(1.1, 0, ZF - 0.12), yaw: Math.PI / 2, T });
    poseR(bun, { pos: V(0.75, 0, ZF - 0.4), yaw: 1.2, headP: 0.3, T });
    camFix(V(1.5, -0.12, ZF + 2.8), V(1.5, -0.2, ZF), 40); label3('DRAHTGITTER', V(PX, -0.3, ZF + 0.02), clamp((T - tG - 0.3) / 0.3), 190, 120);
    chip('🛑 SACKGASSE', 540, 470, clamp((T - tE) / 0.3), '#2fbf5b'); icon(true, 540, 1500, clamp((T - WP(5, 'zentimetern')) / 0.25)); },
  // 6: Nachts schleicht ein Fuchs ums Gehege
  (T) => { mood('night'); const t0 = S[6].start, tF = WP(6, 'fuchs'); const a = -0.6 + (T - t0) * 0.32; const R = 2.15;
    const fp = V(Math.sin(a) * R, 0, Math.cos(a) * R * 0.78); poseFox(fox, { pos: fp, yaw: a + Math.PI / 2, walk: 1, gait: T * 6, headY: -0.5, sniff: 0.5, T });
    poseR(bun, { pos: V(-0.3, 0, 0.15), yaw: 0.6, earsDown: 0.3, sit: 0.5, T }); poseR(bun2, { pos: V(-0.12, 0, 0.3), yaw: -0.5, sit: 0.4, T });
    cam(V(0.8, 1.2, 3.2), V(0.2, 0.2, 0.3), 42, T, 0.004); label3('FUCHS', fox.head.getWorldPosition(V(0, 0, 0)), clamp((T - tF) / 0.3), 0, -200);
    chip('🌙 NACHTS', 540, 470, clamp((T - WP(6, 'nachts')) / 0.3), '#7fc4ff'); icon(false, 540, 1340, clamp((T - WP(6, 'gehege')) / 0.25)); },
  // 7: Gitterdach + Stall mit Klappe, die du abends schließt
  (T) => { mood('dusk'); const tD = WP(7, 'gitterdach'), tS = WP(7, 'stall'), tC = WP(7, 'schließt');
    G.roof.position.y = lerp(PH + 1.4, PH + 0.02, ease(clamp((T - tD + 0.2) / 0.6)));
    const door = G.hutchDoor; const inK = clamp((T - tS) / 1.4);
    hopTo(bun, V(0.2, 0, 0.3), door.clone().add(V(0, 0, 0.02)), T, tS, tS + 1.0, { vis: T < tS + 1.05 }); hopTo(bun2, V(0.5, 0, 0.55), door.clone().add(V(0.02, 0, 0.05)), T, tS + 0.3, tS + 1.3, { vis: T < tS + 1.35 });
    G.flap.rotation.x = lerp(-1.2, 0, ease(clamp((T - tC + 0.2) / 0.4)));
    const fx = lerp(3.4, 2.3, ease(clamp((T - S[7].start) / 1.5))); poseFox(fox, { pos: V(fx, 0, 1.6), yaw: -1.9, walk: T < S[7].start + 1.5 ? 1 : 0, gait: T * 6, sniff: 1, headP: -0.2, T });
    cam(V(1.7, 1.6, 3.0), V(-0.3, 0.3, -0.1), 40, T, 0.004); label3('GITTERDACH', V(0.6, G.roof.position.y, 0.4), clamp((T - tD) / 0.3) * clamp((tS - T) / 0.3), 0, -220);
    label3('KLAPPE', V(door.x, 0.22, door.z - 0.08), clamp((T - tC + 0.2) / 0.3), -120, -260);
    chip('🔒 ABENDS ZU', 540, 470, clamp((T - tC) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - tC - 0.3) / 0.25)); },
  // 8: Sommer – platt im Gras, können nicht schwitzen
  (T) => { mood('summer'); const tP = WP(8, 'platt'), tN = WP(8, 'schwitzen'); const lie = clamp((T - tP + 0.4) / 0.6);
    poseR(bun, { pos: V(-0.1, 0, 0.45), yaw: 0.8, lie, pant: lie, earsDown: 0.6 * lie, T }); poseR(bun2, { pos: V(0.35, 0, 0.6), yaw: -0.4, lie, pant: lie, earsDown: 0.6 * lie, T });
    camFix(V(0.8 - (T - S[8].start) * 0.03, 0.42, 0.98), V(0.12, 0.05, 0.5), 40); sunRays(clamp((T - S[8].start) / 0.4), T);
    chip('🌡️ 32 °C', 540, 470, clamp((T - WP(8, 'sommer')) / 0.3), '#e8483b'); drops(headW(bun2), clamp((T - tN + 0.3) / 0.3), T); icon(false, 540, 1340, clamp((T - tN) / 0.25)); },
  // 9: Kühle Steinplatte im Schatten – sie strecken sich darauf aus
  (T) => { mood('summer'); const tSt = WP(9, 'steinplatte'), tR = WP(9, 'strecken'); G.slab.scale.setScalar(back(clamp((T - tSt + 0.1) / 0.35)) + 1e-3);
    const sp = G.slabP; hopTo(bun, V(0.1, 0, 0.45), V(sp.x - 0.12, 0.035, sp.z + 0.05), T, tSt + 0.3, tR); hopTo(bun2, V(0.45, 0, 0.6), V(sp.x + 0.15, 0.035, sp.z - 0.02), T, tSt + 0.5, tR + 0.2);
    if (T > tR) { const l = clamp((T - tR) / 0.5); poseR(bun, { pos: V(sp.x - 0.12, 0.035, sp.z + 0.05), yaw: yawTo(V(0.1, 0, 0.45), V(sp.x, 0, sp.z)), lie: l, T }); }
    if (T > tR + 0.2) { const l = clamp((T - tR - 0.2) / 0.5); poseR(bun2, { pos: V(sp.x + 0.15, 0.035, sp.z - 0.02), yaw: yawTo(V(0.45, 0, 0.6), V(sp.x, 0, sp.z)), lie: l, T }); }
    camFix(V(1.15, 0.3, 0.6), V(0.85, 0.07, -0.55), 42); sunRays(0.6, T); label3('SCHATTEN', V(0.95, 0.45, -0.3), clamp((T - WP(9, 'schatten')) / 0.3), 120, -160);
    chip('🪨 KÜHLE STEINPLATTE', 540, 470, clamp((T - tSt) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - tR) / 0.25)); },
  // 10: Zähne wachsen ein Leben lang – Holzstall annagen
  (T) => { const tZ = WP(10, 'zähne'), tF = WP(10, 'fangen'); const gnaw = T > tF - 0.1;
    if (!gnaw) { poseR(bun, { pos: V(0.0, 0, 0.3), yaw: 0.15, teeth: lerp(1, 2.6, ease(clamp((T - WP(10, 'wachsen')) / 1.2))), chew: 0.5, T }); camFix(V(0.07, 0.2, 1.02), V(0.02, 0.16, 0.46), 28);
      chip('🦷 WACHSEN IMMER', 540, 470, clamp((T - tZ) / 0.3)); G.bites.forEach(b => b.visible = false); }
    else { const P = V(-1.32, 0, -0.18); poseR(bun, { pos: P, yaw: Math.PI + 0.25, chew: 1, headP: 0.3 + 0.1 * Math.sin(T * 16), teeth: 2.2, T }); G.bites.forEach((b, k) => b.visible = T > tF + 0.15 * k);
      spray(G.chips, V(-1.43, 0.12, -0.34), T, V(0, 0, 1), 0.4, 0.3, 8); camFix(V(-0.85, 0.32, 0.55), V(-1.38, 0.13, -0.3), 36);
      chip('🪵 STALL KAPUTT', 540, 470, clamp((T - tF) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - WP(10, 'anzunagen')) / 0.25)); } },
  // 11: Frische Äste vom Apfelbaum – Stall bleibt heil
  (T) => { const tA = WP(11, 'äste'), tH = WP(11, 'heil'); G.twigs.scale.setScalar(back(clamp((T - tA + 0.1) / 0.35)) + 1e-3);
    const tw = V(0.15, 0, 0.05); poseR(bun, { pos: tw.clone().add(V(-0.2, 0, 0.12)), yaw: 2.0, chew: 1, headP: 1.1, teeth: 1, T }); poseR(bun2, { pos: tw.clone().add(V(0.22, 0, 0.1)), yaw: -2.1, chew: 1, headP: 1.1, T });
    if (T < tH - 0.3) { camFix(V(0.55, 0.45, 1.02), V(0.15, 0.06, 0.08), 40); label3('APFELÄSTE', V(0.15, 0.05, 0.05), clamp((T - tA - 0.2) / 0.3), 0, -260); }
    else { camFix(V(-0.4, 0.5, 0.9), V(-0.9, 0.25, -0.5), 40); label3('HEIL', V(-1.42, 0.25, -0.36), clamp((T - tH) / 0.3), 120, -160); }
    chip('🍎 ÄSTE ZUM NAGEN', 540, 470, clamp((T - tA) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - tH) / 0.25)); },
  // 12: Aus zwei werden schnell zwanzig
  (T) => { const t0 = S[12].start, tZ = WP(12, 'zwanzig'); const r = rng(5); const n = Math.round(lerp(2, 20, ease(clamp((T - t0 - 0.6) / (tZ - t0 + 0.4)))));
    poseR(bun, { pos: V(-0.4, 0, 0.1), yaw: 0.4, T, sit: 0.3 }); poseR(bun2, { pos: V(0.1, 0, -0.05), yaw: -0.3, T });
    babies.forEach((b, k) => { const x = (r() - 0.5) * 2.6, z = -0.15 + r() * 1.1; const nf = lerp(2, 20, ease(clamp((T - t0 - 0.6) / (tZ - t0 + 0.4)))); const vis = k < nf - 2; const pop = clamp((nf - 2 - k) / 1.2);
      poseR(b, { pos: V(x, 0, z), yaw: r() * 6.28, hop: T * 2.6 + r(), hopK: k % 3 === 0 ? 1 : 0, scale: 0.62 * back(pop) + 1e-3, headP: k % 3 === 1 ? 1.2 : 0, T, vis }); });
    camFix(V(0.5, 1.45, 2.1), V(0, 0, 0.35), 44); chip(`🐰 ${n}`, 540, 470, clamp((T - t0) / 0.3), n > 10 ? '#e8483b' : '#f3c63f'); icon(false, 540, 1340, clamp((T - tZ - 0.2) / 0.25)); },
  // 13: Rammler kastrieren – es bleibt bei zwei
  (T) => { const tR = WP(13, 'rammler'), tK = WP(13, 'kastrieren'), tB = WP(13, 'bleibt');
    poseR(bun, { pos: V(-0.25, 0, 0.0), yaw: 0.5, T, chew: 0.5 }); poseR(bun2, { pos: V(0.1, 0, 0.12), yaw: -0.6, T, headY: -0.3 });
    camFix(V(0.3, 0.4, 1.02), V(-0.08, 0.1, 0.06), 40); label3('RAMMLER ♂', headW(bun), clamp((T - tR) / 0.3), -60, -220);
    chip('🩺 KASTRIERT', 540, 470, clamp((T - tK) / 0.3), '#7fc4ff'); chip('🐰🐰 = 2', 540, 1340, clamp((T - tB) / 0.3), '#2fbf5b'); },
  // 14: Glückwunsch – Kaninchenparadies
  (T) => { const u = T - S[14].start; G.flap.rotation.x = -1.2; poseR(bun, { pos: V(G.slabP.x - 0.12, 0.035, G.slabP.z + 0.05), yaw: -0.6, lie: 1, T }); poseR(bun2, { pos: V(0.0, 0, 0.45), yaw: 0.6, chew: 1, headP: 1.2, T });
    const a = 0.35 + u * 0.09; cam(V(Math.sin(a) * 3.6, lerp(1.8, 2.6, ease(u / 3)), Math.cos(a) * 3.6), V(0, 0.2, 0), 42, T, 0.004); cta.style.display = T > WP(14, 'gebaut') ? 'block' : 'none';
    chip('🏡 KANINCHENPARADIES', 540, 470, clamp((T - WP(14, 'kaninchenparadies')) / 0.3), '#2fbf5b'); },
];
shots.forEach((f, i) => { shots[i] = T => { stage(i, T); f(T); }; });
