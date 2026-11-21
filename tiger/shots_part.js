// ---------- Helfer ----------
const flash = (k, col = '255,40,30') => { if (k > 0) svg.push(`<rect x="0" y="0" width="1080" height="1920" fill="rgba(${col},${(0.35 * k).toFixed(3)})"/>`); };
function chip(text, x, y, k, col = '#f3c63f') { if (k <= 0) return; ui.push(`<div class="pill" style="left:${x}px;top:${y}px;border-color:${col};transform:translate(-50%,-50%) scale(${back(k)})">${text}</div>`); }
function icon(ok, x, y, k, s0 = 1) { if (k <= 0) return; const s = back(k) * s0;
  svg.push(`<g transform="translate(${x},${y}) scale(${s})"><circle r="62" fill="${ok ? '#2fbf5b' : '#fff'}" stroke="#000" stroke-width="9"/>` + (ok ? '<path d="M-30 2 L-8 24 L32 -22" fill="none" stroke="#fff" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>' : '<path d="M-27 -27 L27 27 M27 -27 L-27 27" stroke="#e8323c" stroke-width="17" stroke-linecap="round"/>') + '</g>'); }
function ring(p, k, col = '#e8323c', r0 = 70) { if (k <= 0) return; const [x, y] = proj(p); svg.push(`<circle cx="${x}" cy="${y}" r="${(r0 * back(k)).toFixed(1)}" fill="none" stroke="${col}" stroke-width="9"/>`); }
function sunRays(k, T) { if (k <= 0) return; for (let i = 0; i < 6; i++) { const x = 140 + i * 170 + 30 * Math.sin(T + i); svg.push(`<line x1="${x + 260}" y1="0" x2="${x}" y2="900" stroke="#ffd84a" stroke-width="16" opacity="${(0.5 * k).toFixed(2)}" stroke-linecap="round"/>`); } }
function burst(p, k, text) { if (k <= 0 || k >= 1) return; const [x, y] = proj(p); const s = back(clamp(k * 3)); const a = 1 - clamp((k - 0.6) / 0.4);
  svg.push(`<g transform="translate(${x},${y - 60}) scale(${s})" opacity="${a.toFixed(2)}"><path d="M0 -80 L22 -28 L78 -40 L38 2 L70 50 L14 32 L0 84 L-14 32 L-70 50 L-38 2 L-78 -40 L-22 -28 Z" fill="#ffe14a" stroke="#000" stroke-width="7"/><text y="14" text-anchor="middle" font-family="M" font-weight="900" font-size="34" fill="#111">${text}</text></g>`); }
function waves(p, k, T, col = '#fff') { if (k <= 0) return; const [x, y] = proj(p); for (let i = 0; i < 4; i++) { const ph = (T * 1.2 + i / 4) % 1; svg.push(`<circle cx="${x}" cy="${y}" r="${(60 + ph * 520).toFixed(1)}" fill="none" stroke="${col}" stroke-width="${(12 * (1 - ph)).toFixed(1)}" opacity="${(k * (1 - ph)).toFixed(2)}"/>`); } }
function stink(p, k, T) { if (k <= 0) return; const [x, y] = proj(p); for (let i = 0; i < 3; i++) { const ph = (T * 0.7 + i / 3) % 1; const xx = x + (i - 1) * 50; let d = `M${xx} ${y}`; for (let j = 1; j <= 6; j++) d += ` Q${xx + (j % 2 ? 22 : -22)} ${y - j * 30 + 15} ${xx} ${y - j * 30}`;
    svg.push(`<path d="${d}" transform="translate(0,${(-ph * 120).toFixed(1)})" fill="none" stroke="#a8e06a" stroke-width="9" stroke-linecap="round" opacity="${(k * (1 - ph)).toFixed(2)}"/>`); } }
function qmarks(p, k, T) { if (k <= 0) return; const [x, y] = proj(p); for (let i = 0; i < 2; i++) svg.push(`<text x="${x + (i - 0.5) * 70}" y="${y - 70 - 12 * Math.sin(T * 5 + i)}" text-anchor="middle" font-family="M" font-weight="900" font-size="${70 * back(k)}" fill="#fff" stroke="#000" stroke-width="9" paint-order="stroke">?</text>`); }
function camFix(pos, look, fov = 40) { LOOK = look.clone(); camera.position.copy(pos); camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(look); camera.updateMatrixWorld(true); }
const WP = (i, pre, n) => WT(i, pre, n);
const D0 = V(0, 0, -3.5);

// ---------- Reset ----------
function resetWorld() { rex.root.visible = false; ui = []; svg = []; badge.style.display = 'none'; cta.style.display = 'none'; }
function stage(i, T) {
  mood('day'); sunAt(V(0, 0, 0)); ground.visible = i !== 9; G.river.visible = i === 9; sky.visible = world.visible = true; GRASS.visible = true; scene.background = null; scene.fog.near = 30; scene.fog.far = 200;
  UT.uStripe.value = 1; UT.uDeer.value = 0; G.scratch.forEach(s => s.scale.y = i >= 11 ? 1 : 1e-3); G.hide.visible = true;
  [tiger, rival, ...cubs, deer, deer2].forEach(q => poseQ(q, { vis: false }));
}
const shots = [
  // 0: Im Dschungel kannst du Beute nicht über weite Strecken verfolgen
  (T) => { badge.style.display = T < 2.4 ? 'block' : 'none'; const tS = WP(0, 'strecken'), tV = WP(0, 'verfolgen'); const run = clamp(T / tS);
    const tp = V(lerp(2.2, 0.6, ease(run)), 0, lerp(3.5, 0.2, ease(run))); poseQ(tiger, { pos: tp, yaw: Math.PI + 0.45, walk: T * 9 * (1 - 0.8 * clamp((T - tS) / 0.6)), walkK: 1 - clamp((T - tS) / 0.6), neckP: 0.15, headP: 0.1, jaw: T > tS ? 0.35 + 0.1 * Math.sin(T * 12) : 0.15, T });
    const dp = V(lerp(-0.5, -3.5, ease(clamp(T / 4.4))), 0, lerp(-1.5, -11, clamp(T / 4.4))); poseQ(deer, { pos: dp, yaw: Math.PI + 0.3, walk: T * 11, walkK: 1, neckP: 0.6, headP: 0.1, T });
    camFix(V(tp.x + 4.6, 1.3, tp.z + 2.6), V(tp.x - 0.6, 0.6, tp.z - 1.2), 46);
    chip('🌴 DSCHUNGEL', 540, 470, clamp((T - 0.1) / 0.25), '#2fbf5b'); label3('HIRSCH', headW(deer), clamp((T - WP(0, 'beute')) / 0.3), 0, -160); icon(false, 540, 1340, clamp((T - tV) / 0.25)); },
  // 1: Anschleichen bis auf ein paar Meter
  (T) => { const t0 = S[1].start, tB = WP(1, 'bist'); const k = ease(clamp((T - t0) / (tB - t0)));
    const tp = V(0.1, 0, lerp(4.8, -0.9, k)); poseQ(tiger, { pos: tp, yaw: Math.PI, crouch: 1, walk: T * 2.2, walkK: 0.55 * (1 - clamp((T - tB) / 0.4)), neckP: 0.05, headP: 0.0, T });
    poseQ(deer, { pos: D0, yaw: 1.3, neckP: -0.7, headP: 0.6, T }); const d = Math.max(3, Math.round(headW(tiger).distanceTo(headW(deer))));
    camFix(V(3.8, 1.0, tp.z + 3.6), V(0.0, 0.45, tp.z - 1.0), 46);
    chip(`📏 ${d} METER`, 540, 470, clamp((T - t0) / 0.3), d <= 5 ? '#2fbf5b' : '#f3c63f'); icon(true, 540, 1340, clamp((T - tB) / 0.25)); },
  // 2: Oranges Fell leuchtet zwischen grünen Blättern
  (T) => { UT.uStripe.value = 0; const tL = WP(2, 'leuchtet'); poseQ(tiger, { pos: V(-0.55, 0, 1.05), yaw: Math.PI + 0.25, crouch: 1, neckP: 0.0, headP: 0.0, T }); poseQ(deer, { pos: V(1.1, 0, -2.4), yaw: -0.5, neckP: 0.7, headP: 0.2, T });
    camFix(V(-0.1, 1.2, -3.0), V(-0.55, 0.45, 1.0), 40); ring(headW(tiger).add(V(0, -0.1, 0.3)), clamp((T - tL) / 0.3), '#e8323c', 150);
    chip('🟧 LEUCHTET', 540, 470, clamp((T - WP(2, 'oranges')) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - WP(2, 'blättern')) / 0.25)); },
  // 3: Schwarze Streifen – für Hirsche sieht Orange fast aus wie Grün
  (T) => { const tS = WP(3, 'streifen'), tH = WP(3, 'hirsche'); UT.uStripe.value = ease(clamp((T - tS + 0.4) / 0.6)); const dv = ease(clamp((T - tH) / 0.8)); UT.uDeer.value = dv;
    poseQ(tiger, { pos: V(-0.55, 0, 1.05), yaw: Math.PI + 0.25, crouch: 1, neckP: 0.0, headP: 0.0, T }); poseQ(deer, { pos: V(1.1, 0, -2.4), yaw: -0.5, neckP: 0.7, headP: 0.2, T });
    camFix(V(-0.1, 1.2, -3.0), V(-0.55, 0.45, 1.0), 40); if (dv > 0) svg.push(`<rect width="1080" height="1920" fill="rgba(70,100,40,${(0.22 * dv).toFixed(3)})"/>`);
    chip(T < tH ? '🦓 STREIFEN' : '🦌 HIRSCH-SICHT', 540, 470, clamp((T - tS + 0.2) / 0.3), T < tH ? '#f3c63f' : '#2fbf5b'); icon(true, 540, 1340, clamp((T - WP(3, 'grün')) / 0.25)); },
  // 4: Jeder Schritt im trockenen Laub verrät dich
  (T) => { const t0 = S[4].start, tL = WP(4, 'laub'); const tp = V(1.0, 0, lerp(3.2, 2.4, clamp((T - t0) / 2.4))); poseQ(tiger, { pos: tp, yaw: Math.PI, walk: T * 3.5, walkK: 0.7, crouch: 0.4, neckP: 0.05, headP: 0.1, T });
    const pw = pawW(tiger, 0); camFix(V(tp.x + 3.4, 0.55, tp.z - 1.2), V(tp.x, 0.3, tp.z - 0.7), 40);
    burst(pw, clamp((T - tL) / 0.9), 'KNACK!'); chip('🍂 TROCKENES LAUB', 540, 470, clamp((T - WP(4, 'schritt')) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - WP(4, 'verrät')) / 0.25)); },
  // 5: Weiche Ballen, Krallen eingezogen
  (T) => { const tB = WP(5, 'ballen'), tK = WP(5, 'krallen'), tE = WP(5, 'eingezogen'); const tp = V(1.0, 0, 2.4); const cl = 1 - ease(clamp((T - tE + 0.3) / 0.6));
    poseQ(tiger, { pos: tp, yaw: Math.PI, walk: 1.9, walkK: 0.9, crouch: 0.3, neckP: 0.05, headP: 0.1, claws: cl, T }); const pw = pawW(tiger, 0);
    camFix(V(tp.x + 3.0, 0.5, tp.z - 1.4), V(tp.x, 0.25, tp.z - 0.8), 36);
    
    chip(T < tK ? '🐾 WEICHE BALLEN' : '🤫 KRALLEN EIN', 540, 470, clamp((T - WP(5, 'weichen')) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - tE - 0.2) / 0.25)); },
  // 6: Nur ungefähr jede zehnte Jagd klappt
  (T) => { const t0 = S[6].start, tJ = WP(6, 'jagd'); const ph = ((T - t0) * 1.1) % 1; const lunge = ease(clamp(ph * 2.2));
    const tp = V(0.2, 0, lerp(2.0, -0.6, lunge)); poseQ(tiger, { pos: tp, yaw: Math.PI, walk: T * 12, walkK: ph < 0.5 ? 1 : 0.2, neckP: 0.1, headP: 0, jaw: 0.4, T });
    const dp = V(lerp(0, -2.2, ease(clamp(ph * 1.8))), 0, lerp(-1.5, -4.5, ease(clamp(ph * 1.8)))); poseQ(deer, { pos: dp, yaw: Math.PI + 0.6, walk: T * 13, walkK: 1, neckP: 0.6, headP: 0.1, T });
    camFix(V(4.4, 1.4, 2.6), V(-0.5, 0.5, -1.4), 46); const n = Math.min(10, Math.floor(1 + (T - t0) / ((tJ - t0) / 10)));
    for (let k = 0; k < n; k++) icon(k === 9, 108 + k * 96, 1340, 1, 0.62); chip('🎯 1 VON 10', 540, 470, clamp((T - WP(6, 'zehnte')) / 0.3), '#e8483b'); },
  // 7: Bis zu 30 Kilo Fleisch auf einmal – dann tagelang nichts
  (T) => { const t0 = S[7].start, tK = WP(7, 'kilo'), tT = WP(7, 'tagelang'); const eat = clamp((T - t0) / (tK - t0 + 0.3)); const full = lerp(1, 1.35, ease(eat)); const sleep = clamp((T - tT + 0.3) / 0.6);
    poseQ(deer, { pos: V(0.15, 0.24, -0.4), yaw: 1.4, roll: Math.PI / 2, neckP: 0.2, headP: 0.4, T });
    if (sleep <= 0) poseQ(tiger, { pos: V(-0.1, 0, 1.05), yaw: Math.PI + 0.2, crouch: 1, neckP: -0.35, headP: 0.5 + 0.1 * Math.sin(T * 8), jaw: 0.4 + 0.2 * Math.sin(T * 8), belly: full, T });
    else poseQ(tiger, { pos: V(-0.1, 0, 1.05), yaw: Math.PI + 0.2, lie: sleep, neckP: 0.0, headP: 0.2, eyes: 1 - sleep, belly: 1.35, T });
    camFix(V(3.0, 1.3, 3.4), V(0.0, 0.35, 0.3), 42); const n = Math.round(30 * ease(eat));
    chip(T < tT ? `🥩 ${n} KG` : '😴 TAGELANG SATT', 540, 470, clamp((T - WP(7, 'treffer')) / 0.3), '#e8483b'); icon(true, 540, 1340, clamp((T - WP(7, 'nichts')) / 0.25)); },
  // 8: Mittagshitze – unter dem dicken Fell viel zu warm
  (T) => { mood('hot'); const tW = WP(8, 'warm'); poseQ(tiger, { pos: V(0.3, 0, 1.0), yaw: 2.6, lie: 1, neckP: 0.05, headP: 0.1, jaw: 0.45 + 0.15 * Math.sin(T * 14), T });
    const hw = headW(tiger); camFix(V(hw.x + 2.0, 0.8, hw.z + 2.2), V(hw.x - 0.5, 0.35, hw.z - 0.4), 40); sunRays(clamp((T - S[8].start) / 0.4), T);
    chip('🌡️ 35 °C', 540, 470, clamp((T - WP(8, 'mittagshitze')) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - tW) / 0.25)); },
  // 9: Du legst dich in den Fluss – du liebst Wasser
  (T) => { const t0 = S[9].start, tF = WP(9, 'fluss'); const zc = (RZ0 + RZ1) / 2; const k = ease(clamp((T - t0) / 1.2));
    poseQ(tiger, { pos: V(0, lerp(0, -0.55, k), lerp(RZ1 + 0.4, zc + 0.3, k)), yaw: Math.PI * 0.85, lie: k, neckP: 0.15, headP: 0.05, T });
    camFix(V(1.5, 0.55, RZ1 + 2.2), V(0, -0.05, zc + 0.3), 40);
    chip('💦 LIEBT WASSER', 540, 470, clamp((T - tF) / 0.3), '#7fc4ff'); icon(true, 540, 1340, clamp((T - WP(9, 'wasser')) / 0.25)); },
  // 10: Ein anderer Tiger will dein Revier
  (T) => { const t0 = S[10].start; poseQ(tiger, { pos: V(1.9, 0, -0.9), yaw: -2.6, neckP: 0.2, headP: 0.1, T });
    const rp = V(lerp(-3.5, -1.6, ease(clamp((T - t0) / 1.8))), 0, lerp(-5.5, -3.4, ease(clamp((T - t0) / 1.8)))); poseQ(rival, { pos: rp, yaw: 0.55, walk: T * 4, walkK: 0.8, neckP: 0.05, headP: 0.15, T });
    camFix(V(4.6, 1.5, 3.0), V(-0.2, 0.6, -2.0), 44); label3('RIVALE', headW(rival), clamp((T - WP(10, 'anderer')) / 0.3), 0, -200);
    chip('⚔️ RIVALE', 540, 470, clamp((T - WP(10, 'tiger')) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - WP(10, 'revier')) / 0.25)); },
  // 11: Bäume markieren (Kratzspuren + Duft) – Brüllen 3 km weit
  (T) => { const tK = WP(11, 'kratzspuren'), tD = WP(11, 'duft'), tB = WP(11, 'brüllen'), tW = WP(11, 'weit'); G.scratch.forEach((s, k) => s.scale.y = Math.max(1e-3, ease(clamp((T - tK + 0.2 - k * 0.08) / 0.3))));
    const roar = T > tB - 0.1; poseQ(tiger, { pos: V(2.15, 0, -1.45), yaw: roar ? -2.0 : -2.55, neckP: roar ? 0.45 : 0.25, headP: roar ? -0.3 : 0.1, jaw: roar ? 1 : 0, T });
    const rk = clamp((T - tB - 0.3) / 1.6); poseQ(rival, { pos: V(lerp(-1.6, -4.5, ease(rk)), 0, lerp(-3.4, -7, ease(rk))), yaw: rk > 0 ? 0.55 + Math.PI : 0.55, walk: T * 8, walkK: rk > 0 ? 1 : 0, neckP: 0.05, headP: 0.15, T });
    G.tree.updateMatrixWorld(true); const sp = G.scratch[1].getWorldPosition(V(0, 0, 0));
    if (!roar) camFix(V(sp.x + 1.3, 1.1, sp.z + 2.8), V(sp.x - 0.3, 0.75, sp.z), 42); else camFix(V(4.6, 1.5, 3.0), V(0.0, 0.7, -2.0), 44);
    if (!roar) { label3('KRATZSPUREN', sp, clamp((T - tK) / 0.3), 150, -260); stink(sp.clone().add(V(-0.25, -0.2, 0.1)), clamp((T - tD) / 0.3), T); }
    else waves(headW(tiger).add(V(0, 0.05, 0)), clamp((T - tB) / 0.3), T);
    chip(T < tD ? '🐾 KRATZSPUREN' : T < tB ? '💨 DUFTMARKE' : '🔊 3 KM WEIT', 540, 470, clamp((T - tK) / 0.3), '#f3c63f'); icon(true, 540, 1340, clamp((T - tW) / 0.25)); },
  // 12: Junge verlieren dich im hohen Gras aus den Augen
  (T) => { const t0 = S[12].start, tA = WP(12, 'augen'); const C = G.CB; poseQ(tiger, { pos: V(C.x - 1.2 - (T - t0) * 0.5, 0, C.z - 2.2), yaw: -2.4, walk: T * 3.5, walkK: 0.8, neckP: 0.1, headP: 0.1, T });
    cubs.forEach((c, k) => poseQ(c, { pos: V(C.x + (k ? 0.4 : -0.1), 0, C.z + (k ? 0.3 : -0.1)), yaw: Math.sin(T * 1.3 + k * 2) * 1.6 + k, neckP: 0.3, headP: -0.1, scale: 0.38, T }));
    camFix(V(C.x + 1.4, 1.0, C.z + 2.2), V(C.x - 0.1, 0.25, C.z - 0.1), 42); cubs.forEach(c => qmarks(headW(c), clamp((T - WP(12, 'jungen')) / 0.3), T));
    chip('🌾 HOHES GRAS', 540, 470, clamp((T - WP(12, 'gras')) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - tA) / 0.25)); },
  // 13: Weiße Flecken hinter den Ohren – die Jungen folgen ihnen
  (T) => { const t0 = S[13].start, tW = WP(13, 'weiße'), tF = WP(13, 'folgen'); const C = G.CB; const z = C.z - (T - t0) * 0.45; poseQ(tiger, { pos: V(C.x, 0, z - 0.6), yaw: Math.PI, walk: T * 3.2, walkK: 0.7, neckP: 0.15, headP: 0.1, T });
    cubs.forEach((c, k) => poseQ(c, { pos: V(C.x + (k ? 0.28 : -0.25), 0, z + 1.6 + k * 0.4), yaw: Math.PI, walk: T * 6 + k, walkK: 1, neckP: 0.35, headP: -0.2, scale: 0.38, T }));
    camFix(V(C.x + 0.4, 1.45, z + 3.6), V(C.x, 0.7, z - 0.4), 40); tiger.root.updateMatrixWorld(true); tiger.spots.forEach(s => ring(s.getWorldPosition(V(0, 0, 0)), clamp((T - tW) / 0.3), '#ffffff', 45));
    chip('⚪ WEISSE FLECKEN', 540, 470, clamp((T - tW) / 0.3), '#ffffff'); icon(true, 540, 1340, clamp((T - tF) / 0.25)); },
  // 14: Glückwunsch – Tiger
  (T) => { mood('dusk'); const u = T - S[14].start; const P = V(0, 0, 0.5); poseQ(tiger, { pos: P, yaw: 0.4, neckP: 0.2, headP: 0.05, T });
    cubs.forEach((c, k) => poseQ(c, { pos: V(P.x + (k ? 0.6 : -0.5), 0, P.z + 0.7), yaw: 0.6 - k * 0.8, neckP: 0.4, headP: -0.2, scale: 0.38, T }));
    const a = 0.6 + u * 0.15; cam(V(Math.sin(a) * 4.2, lerp(1.0, 1.4, ease(u / 3)), P.z + Math.cos(a) * 4.2), V(0, 0.55, P.z), 44, T, 0.004); cta.style.display = T > WP(14, 'gebaut') ? 'block' : 'none';
    chip('🐯 TIGER', 540, 470, clamp((T - WP(14, 'tiger')) / 0.3), '#f3c63f'); },
];
shots.forEach((f, i) => { shots[i] = T => { stage(i, T); f(T); tallHide(); }; });
