// ---------- Helfer ----------
const flash = (k, col = '255,40,30') => { if (k > 0) svg.push(`<rect x="0" y="0" width="1080" height="1920" fill="rgba(${col},${(0.35 * k).toFixed(3)})"/>`); };
function chip(text, x, y, k, col = '#f3c63f') { if (k <= 0) return; ui.push(`<div class="pill" style="left:${x}px;top:${y}px;border-color:${col};transform:translate(-50%,-50%) scale(${back(k)})">${text}</div>`); }
function icon(ok, x, y, k) { if (k <= 0) return; const s = back(k);
  svg.push(`<g transform="translate(${x},${y}) scale(${s})"><circle r="62" fill="${ok ? '#2fbf5b' : '#fff'}" stroke="#000" stroke-width="9"/>` + (ok ? '<path d="M-30 2 L-8 24 L32 -22" fill="none" stroke="#fff" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>' : '<path d="M-27 -27 L27 27 M27 -27 L-27 27" stroke="#e8323c" stroke-width="17" stroke-linecap="round"/>') + '</g>'); }
function ring(p, k, col = '#e8323c', r0 = 70) { if (k <= 0) return; const [x, y] = proj(p); svg.push(`<circle cx="${x}" cy="${y}" r="${(r0 * back(k)).toFixed(1)}" fill="none" stroke="${col}" stroke-width="9"/>`); }
function sunRays(k, T) { if (k <= 0) return; for (let i = 0; i < 6; i++) { const x = 140 + i * 170 + 30 * Math.sin(T + i); svg.push(`<line x1="${x + 260}" y1="0" x2="${x}" y2="900" stroke="#ffd84a" stroke-width="16" opacity="${(0.5 * k).toFixed(2)}" stroke-linecap="round"/>`); } }
function zzz(p, k, T) { if (k <= 0) return; const [x, y] = proj(p); for (let i = 0; i < 3; i++) { const ph = (T * 0.5 + i / 3) % 1; svg.push(`<text x="${(x + 40 + ph * 90).toFixed(1)}" y="${(y - 40 - ph * 200).toFixed(1)}" font-family="M" font-weight="900" font-size="${(50 + ph * 40) * k}" fill="#fff" stroke="#000" stroke-width="8" paint-order="stroke" opacity="${(1 - ph).toFixed(2)}">Z</text>`); } }
function measure(a, b, k, text) { if (k <= 0) return; const [x0, y0] = proj(a), [x1, y1] = proj(b); const ye = lerp(y0, y1, ease(k)); svg.push(`<g stroke="#fff" stroke-width="7" stroke-linecap="round"><line x1="${x0}" y1="${y0}" x2="${x1}" y2="${ye}"/><line x1="${x0 - 22}" y1="${y0}" x2="${x0 + 22}" y2="${y0}"/><line x1="${x1 - 22}" y1="${ye}" x2="${x1 + 22}" y2="${ye}"/></g>`);
  ui.push(`<div class="lab" style="left:${x0 + 120}px;top:${(y0 + ye) / 2 + 30}px;transform:translate(-50%,-100%) scale(${back(k)})">${text}</div>`); }
function drops(p, k, T) { if (k <= 0) return; const [x, y] = proj(p); for (let i = 0; i < 3; i++) { const ph = (T * 0.8 + i / 3) % 1; const dx = x + (i - 1) * 60, dy = y - 90 + ph * 60;
    svg.push(`<path transform="translate(${dx},${dy}) scale(${k})" d="M0 -26 C14 -6 18 6 0 18 C-18 6 -14 -6 0 -26 Z" fill="#6ec3ff" stroke="#000" stroke-width="5" opacity="${(1 - ph).toFixed(2)}"/>`); } }
function camFix(pos, look, fov = 40) { LOOK = look.clone(); camera.position.copy(pos); camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(look); camera.updateMatrixWorld(true); }
const WP = (i, pre, n) => WT(i, pre, n);
const BR = (u) => G.branch.localToWorld(G.branchC.getPoint(u));
// Giraffe an der Akazie (frisst oben)
const GA = V(0.55, 0, 1.55); const graze = (T, extra = {}) => poseQ(gir, Object.assign({ pos: GA, yaw: Math.PI, neckP: 1.22, headP: 0.25, T }, extra));

// ---------- Reset ----------
function resetWorld() { rex.root.visible = false; ui = []; svg = []; badge.style.display = 'none'; cta.style.display = 'none'; }
function stage(i, T) {
  mood('day'); sunAt(V(0, 0, 0)); ground.visible = sky.visible = true; world.visible = false; sav.visible = true; GRASS.visible = true; scene.background = null; scene.fog.near = 40; scene.fog.far = 320;
  G.branch.visible = i >= 8 && i <= 11; leavesStrip(0, 0, 0);
  [gir, ...ants, lion].forEach(q => poseQ(q, { vis: false }));
}
const shots = [
  // 0: Savanne – die unteren Blätter sind längst weggefressen
  (T) => { badge.style.display = T < 2.4 ? 'block' : 'none'; const tU = WP(0, 'unteren'), tW = WP(0, 'weggefressen');
    poseQ(gir, { pos: V(1.3, 0, 1.6), yaw: Math.PI + 0.35, neckL: 0.7, neckP: 0.9, headP: -0.35, T });
    poseQ(ants[0], { pos: V(-0.9, 0, 0.1), yaw: 2.6, neckP: lerp(0.5, 1.1, 0.5 + 0.5 * Math.sin(T * 1.5)), headP: -0.2, T }); poseQ(ants[1], { pos: V(0.9, 0, -0.2), yaw: -2.4, neckP: 0.9, headP: -0.1, T });
    camFix(V(6.8 - T * 0.08, 2.0, 3.2), V(-0.2, 1.9, -0.3), 44);
    chip('🌍 SAVANNE', 540, 470, clamp((T - 0.1) / 0.25), '#f3c63f'); ring(V(-0.4, 1.9, -1.4), clamp((T - tU) / 0.3), '#e8323c', 110); label3('LEER', V(-0.4, 2.2, -1.4), clamp((T - tU) / 0.3), -120, -200);
    icon(false, 540, 1340, clamp((T - tW) / 0.25)); },
  // 1: Der Hals wächst – Blätter ganz oben
  (T) => { const t0 = S[1].start, tH = WP(1, 'hals'), tO = WP(1, 'oben'); const g = ease(clamp((T - tH + 0.1) / 1.6));
    graze(T, { neckL: lerp(0.7, 2.0, g), neckP: lerp(0.9, 1.22, g), headP: lerp(-0.35, 0.25, g) }); camFix(V(4.8, 2.6, 6.8), V(0.3, 2.6, 0.2), 46);
    measure(V(GA.x + 0.6, 2.2, GA.z - 0.6), V(GA.x + 0.6, 2.2 + 1.9 * g, GA.z - 0.6), clamp((T - tH) / 0.3), '📏');
    chip('🦒 LANGER HALS', 540, 470, clamp((T - tH) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - tO) / 0.25)); },
  // 2: Blut muss zwei Meter nach oben
  (T) => { const tB = WP(2, 'blut'), tZ = WP(2, 'zwei'), tK = WP(2, 'kopf'); const P = V(-9, 0, 7);
    poseQ(gir, { pos: P, yaw: Math.PI / 2, neckP: 1.15, headP: 0.3, xray: clamp((T - S[2].start + 0.1) / 0.4), flow: 1, flowSpeed: 0.35, T });
    camFix(V(P.x + 0.9, 2.8, P.z + 9.0), V(P.x + 0.7, 2.75, P.z), 40); gir.root.updateMatrixWorld(true); const nb = gir.body.localToWorld(V(0, GIR.bodyH * 0.45, GIR.bodyL * 0.4)), ne = gir.body.localToWorld(gir.neckE.clone());
    measure(V(ne.x + 0.5, nb.y, P.z), V(ne.x + 0.5, ne.y, P.z), clamp((T - tZ) / 0.3), '2 m');
    chip('🩸 2 METER BERGAUF', 540, 470, clamp((T - tB) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - tK) / 0.25)); },
  // 3: Herz über 10 kg – doppelter Druck
  (T) => { const tH = WP(3, 'herz'), tKi = WP(3, 'kilo'), tD = WP(3, 'doppelt'); const P = V(-9, 0, 7);
    poseQ(gir, { pos: P, yaw: Math.PI / 2, neckP: 1.15, headP: 0.3, xray: 1, flow: 1, flowSpeed: T > tD ? 1.2 : 0.5, T });
    gir.root.updateMatrixWorld(true); const hp = gir.heart.getWorldPosition(V(0, 0, 0)); camFix(V(hp.x + 0.4, hp.y + 0.5, P.z + 3.6 - (T - S[3].start) * 0.1), V(hp.x + 0.2, hp.y + 0.55, P.z), 40);
    label3('HERZ', hp, clamp((T - tH) / 0.3), -200, 260);
    chip(T < tD ? '❤️ ÜBER 10 KG' : '💪 2× DRUCK', 540, 470, clamp((T - tKi + 0.2) / 0.3), '#e8483b'); icon(true, 540, 1340, clamp((T - WP(3, 'unseres')) / 0.25)); },
  // 4: Beim Bücken schießt das Blut in den Kopf
  (T) => { const t0 = S[4].start, tT = WP(4, 'trinken'), tS = WP(4, 'schießt'); const d = ease(clamp((T - tT) / 1.2)); const P = V(WH.x - 2.5, 0, WH.z);
    poseQ(gir, { pos: P, yaw: Math.PI / 2, neckP: lerp(1.15, -1.25, d), headP: lerp(0.3, 1.1, d), splay: d, xray: 0.9, flow: 1, flowSpeed: T > tS ? -3.5 : 0.5, T });
    camFix(V(P.x + 1.4, 2.0, P.z + 6.8), V(P.x + 1.2, 1.7, P.z), 42); const hw = headW(gir);
    if (T > tS) { flash(0.35 + 0.25 * Math.sin(T * 14), '255,30,40'); ring(hw, clamp((T - tS) / 0.3), '#e8323c', 90); }
    chip('💥 BLUT SCHIESST IN DEN KOPF', 540, 470, clamp((T - tS) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - WP(4, 'kopf')) / 0.25)); },
  // 5: Ventile im Hals bremsen das Blut
  (T) => { const tV = WP(5, 'ventile'), tA = WP(5, 'abbremsen'); const P = V(WH.x - 2.5, 0, WH.z); const v = clamp((T - tV + 0.2) / 0.8);
    poseQ(gir, { pos: P, yaw: Math.PI / 2, neckP: -1.25, headP: 1.1, splay: 1, xray: 0.9, flow: 1, flowSpeed: lerp(-3.5, -0.4, v), valves: v, T });
    gir.root.updateMatrixWorld(true); const vp = gir.valves[2].getWorldPosition(V(0, 0, 0)); camFix(V(vp.x + 0.3, vp.y + 0.4, vp.z + 5.0), V(vp.x, vp.y + 0.1, vp.z), 44);
    label3('VENTIL', gir.valves[1].getWorldPosition(V(0, 0, 0)), clamp((T - tV - 0.2) / 0.3), -180, 300);
    chip('🚧 VENTILE', 540, 470, clamp((T - tV) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - tA) / 0.25)); },
  // 6: Breitbeinig am Wasserloch – Beute für Löwen
  (T) => { const t0 = S[6].start, tL = WP(6, 'löwen'); const P = V(WH.x - 2.5, 0, WH.z);
    poseQ(gir, { pos: P, yaw: Math.PI / 2, neckP: -1.25, headP: 1.1, splay: 1, T }); const lk = clamp((T - t0) / 3.5);
    poseQ(lion, { pos: V(lerp(P.x - 4.5, P.x - 2.4, lk), 0, P.z + lerp(3.2, 2.0, lk)), yaw: 2.6, crouch: 1, walk: T * 3, walkK: 0.4, neckP: 0.15, headP: -0.1, T });
    camFix(V(P.x - 1.0, 1.7, P.z + 9.5), V(P.x - 1.0, 1.3, P.z + 1.0), 46); label3('BREITBEINIG', V(P.x + 0.6, 0.6, P.z), clamp((T - WP(6, 'breitbeinig')) / 0.3) * clamp((tL - T) / 0.3), 200, -260);
    label3('LÖWE', headW(lion), clamp((T - WP(6, 'beute')) / 0.3), 0, -220);
    chip('🦁 GEFAHR', 540, 470, clamp((T - WP(6, 'beute')) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - tL) / 0.25)); },
  // 7: Nur alle paar Tage trinken – Wasser aus den Blättern
  (T) => { const tT = WP(7, 'tage'), tW = WP(7, 'wasser'), tB = WP(7, 'blättern'); graze(T, { tongue: { len: 0.4 + 0.3 * Math.sin(T * 4) } });
    camFix(V(GA.x + 2.2, 4.35, GA.z + 0.6), V(GA.x - 0.1, 4.0, GA.z - 1.4), 42); drops(headW(gir).add(V(0, 0.2, 0)), clamp((T - tW) / 0.3), T);
    chip(T < tW ? '📅 ALLE PAAR TAGE' : '💧 AUS DEN BLÄTTERN', 540, 470, clamp((T - tT + 0.2) / 0.3), '#7fc4ff'); icon(true, 540, 1340, clamp((T - tB) / 0.25)); },
  // 8: Die leckersten Blätter zwischen langen Dornen
  (T) => { const tD = WP(8, 'dornen'); graze(T, { headP: 0.35 }); const c = BR(0.45);
    camFix(c.clone().add(V(1.1, 0.2, 0.35)), c.clone().add(V(0, 0.02, 0.05)), 40); label3('DORNEN', BR(0.6), clamp((T - tD) / 0.3), 120, 260);
    chip('🌵 LANGE DORNEN', 540, 470, clamp((T - WP(8, 'leckersten')) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - tD - 0.2) / 0.25)); },
  // 9: Fast halber Meter Zunge – wickelt sich um die Dornen
  (T) => { const tZ = WP(9, 'zunge'), tH = WP(9, 'herumwickelt'); const len = ease(clamp((T - WP(9, 'halben') + 0.3) / 1.0)); const w = ease(clamp((T - tH + 0.5) / 0.9));
    const tg = BR(0.45); graze(T, { headP: 0.35, tongue: { len, target: tg, wrap: w, col: 0x3a2e52 } }); leavesStrip(0.3, 0.6, clamp((T - tH) / 0.8));
    const hw = headW(gir); const mid = hw.clone().lerp(tg, 0.5); camFix(mid.clone().add(V(2.4, 0.35, 0.4)), mid, 48); label3('ZUNGE', tg.clone().lerp(hw, 0.4), clamp((T - tZ) / 0.3), -150, 280);
    chip('👅 45 CM ZUNGE', 540, 470, clamp((T - tZ) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - tH - 0.3) / 0.25)); },
  // 10: Den ganzen Tag in der Sonne – Sonnenbrand
  (T) => { mood('hot'); const tS = WP(10, 'sonne'), tB = WP(10, 'sonnenbrand'); const burn = clamp((T - tS) / (tB - tS + 0.3)); const col = new THREE.Color(0xe98a9a).lerp(new THREE.Color(0xff2a2a), burn);
    graze(T, { headP: 0.2, tongue: { len: 0.9, col: col.getHex() } }); const hw = headW(gir); camFix(hw.clone().add(V(2.3, 0.3, -0.1)), hw.clone().add(V(0, -0.05, -0.4)), 46); sunRays(clamp((T - S[10].start) / 0.4), T);
    if (T > tB) flash(0.2 + 0.1 * Math.sin(T * 10)); chip('☀️ SONNENBRAND', 540, 470, clamp((T - tS) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - tB) / 0.25)); },
  // 11: Sie wird dunkelblau – eingebauter Sonnenschutz
  (T) => { mood('hot'); const tD = WP(11, 'dunkelblau'), tS = WP(11, 'sonnenschutz'); const k = ease(clamp((T - tD + 0.2) / 0.8)); const col = new THREE.Color(0xe98a9a).lerp(new THREE.Color(0x2a2448), k);
    graze(T, { headP: 0.2, tongue: { len: 0.9, col: col.getHex() } }); const hw = headW(gir); camFix(hw.clone().add(V(2.3, 0.3, -0.1)), hw.clone().add(V(0, -0.05, -0.4)), 46); sunRays(0.6, T);
    chip(T < tS ? '🫐 DUNKELBLAU' : '🧴 SONNENSCHUTZ', 540, 470, clamp((T - tD) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - tS) / 0.25)); },
  // 12: Im Liegen zu langsam, um vor Löwen zu fliehen
  (T) => { mood('day'); const t0 = S[12].start, tL = WP(12, 'langsam'); const P = V(-3, 0, 4); const up = clamp((T - WP(12, 'löwen') + 0.4) / 2.0);
    poseQ(gir, { pos: P, yaw: 0.4, lie: 1 - 0.55 * ease(up), neckP: 1.0, headP: 0.2, T }); const lk = clamp((T - t0) / 3.0);
    poseQ(lion, { pos: V(P.x + lerp(4.8, 2.4, ease(lk)), 0, P.z + lerp(2.5, 1.6, ease(lk))), yaw: -2.0, walk: T * 6, walkK: 1 - lk * 0.5, neckP: 0.15, headP: 0, T });
    camFix(V(P.x + 1.6, 1.7, P.z + 8.5), V(P.x + 1.8, 1.2, P.z + 0.5), 44); label3('LÖWE', headW(lion), clamp((T - WP(12, 'löwen')) / 0.3), 0, -220);
    chip('🐢 ZU LANGSAM', 540, 470, clamp((T - tL) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - tL - 0.2) / 0.25)); },
  // 13: Im Stehen schlafen – nur ein paar Minuten
  (T) => { mood('night'); const tSt = WP(13, 'stehen'), tM = WP(13, 'minuten'); const P = V(0.55, 0, 1.55); poseQ(gir, { pos: P, yaw: Math.PI - 0.6, neckP: 0.95, headP: 0.6, eyes: 0, T });
    camFix(V(P.x + 5.6, 2.6, P.z + 7.2), V(P.x, 2.6, P.z), 44); zzz(headW(gir), clamp((T - WP(13, 'schläfst')) / 0.3), T);
    chip('😴 IM STEHEN', 540, 470, clamp((T - tSt) / 0.3) * clamp((tM - T) / 0.2 + 1e-3), '#7fc4ff'); chip('⏱️ PAAR MINUTEN', 540, 470, clamp((T - tM) / 0.3), '#7fc4ff'); icon(true, 540, 1340, clamp((T - WP(13, 'stück')) / 0.25)); },
  // 14: Glückwunsch – Giraffe
  (T) => { mood('dusk'); const u = T - S[14].start; graze(T, { tongue: { len: 0.5 + 0.3 * Math.sin(T * 3) } }); const a = 0.5 + u * 0.12;
    cam(V(GA.x + Math.sin(a) * 7.5, lerp(2.2, 3.0, ease(u / 3)), GA.z + Math.cos(a) * 7.5), V(GA.x, 2.6, GA.z - 0.5), 44, T, 0.004); cta.style.display = T > WP(14, 'gebaut') ? 'block' : 'none';
    chip('🦒 GIRAFFE', 540, 470, clamp((T - WP(14, 'giraffe')) / 0.3), '#f3c63f'); },
];
shots.forEach((f, i) => { shots[i] = T => { stage(i, T); f(T); }; });
