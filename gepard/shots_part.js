// ---------- Helfer ----------
const flash = (k, col = '255,40,30') => { if (k > 0) svg.push(`<rect x="0" y="0" width="1080" height="1920" fill="rgba(${col},${(0.35 * k).toFixed(3)})"/>`); };
function chip(text, x, y, k, col = '#f3c63f') { if (k <= 0) return; ui.push(`<div class="pill" style="left:${x}px;top:${y}px;border-color:${col};transform:translate(-50%,-50%) scale(${back(k)})">${text}</div>`); }
function icon(ok, x, y, k) { if (k <= 0) return; const s = back(k);
  svg.push(`<g transform="translate(${x},${y}) scale(${s})"><circle r="62" fill="${ok ? '#2fbf5b' : '#fff'}" stroke="#000" stroke-width="9"/>` + (ok ? '<path d="M-30 2 L-8 24 L32 -22" fill="none" stroke="#fff" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>' : '<path d="M-27 -27 L27 27 M27 -27 L-27 27" stroke="#e8323c" stroke-width="17" stroke-linecap="round"/>') + '</g>'); }
function ring(p, k, col = '#e8323c', r0 = 70) { if (k <= 0) return; const [x, y] = proj(p); svg.push(`<circle cx="${x}" cy="${y}" r="${(r0 * back(k)).toFixed(1)}" fill="none" stroke="${col}" stroke-width="9"/>`); }
function speedo(v, k) { if (k <= 0) return; const x = 540, y = 1380, R = 150, s = back(k); const a = Math.PI + clamp(v / 120) * Math.PI; const nx = x + (R - 30) * Math.cos(a), ny = y + (R - 30) * Math.sin(a);
  svg.push(`<g transform="translate(${x},${y}) scale(${s}) translate(${-x},${-y})"><path d="M${x - R - 30} ${y + 10} A${R + 30} ${R + 30} 0 0 1 ${x + R + 30} ${y + 10} Z" fill="#fff" stroke="#000" stroke-width="8"/>
    <path d="M${x - R} ${y} A${R} ${R} 0 0 1 ${x + R} ${y}" stroke="#f3c63f" stroke-width="30" fill="none"/><line x1="${x}" y1="${y}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" stroke="#111" stroke-width="12" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="16" fill="#111"/>
    <text x="${x}" y="${y + 90}" text-anchor="middle" font-family="M" font-weight="900" font-size="62" fill="#fff" stroke="#000" stroke-width="12" paint-order="stroke">${Math.round(v)} KM/H</text></g>`); }
function meter(label, val, k, col) { if (k <= 0) return; const s = back(k); const x = 540, y = 1340; svg.push(`<g transform="translate(${x},${y}) scale(${s})"><rect x="-230" y="-40" width="460" height="80" rx="22" fill="#111c" stroke="#000" stroke-width="7"/><rect x="-214" y="-24" width="${(428 * clamp(val)).toFixed(1)}" height="48" rx="12" fill="${col}"/>
  <text x="0" y="16" text-anchor="middle" font-family="M" font-weight="900" font-size="44" fill="#fff" stroke="#000" stroke-width="8" paint-order="stroke">${label}</text></g>`); }
function glare(k, T) { if (k <= 0) return; svg.push(`<defs><radialGradient id="gl"><stop offset="0" stop-color="#fffbe8" stop-opacity="${(0.95 * k).toFixed(2)}"/><stop offset="0.35" stop-color="#fff2b0" stop-opacity="${(0.6 * k).toFixed(2)}"/><stop offset="1" stop-color="#fff2b0" stop-opacity="0"/></radialGradient></defs><circle cx="760" cy="420" r="${(700 + 30 * Math.sin(T * 5)).toFixed(0)}" fill="url(#gl)"/>`);
  for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28 + T * 0.3; svg.push(`<line x1="760" y1="420" x2="${(760 + Math.cos(a) * 900).toFixed(0)}" y2="${(420 + Math.sin(a) * 900).toFixed(0)}" stroke="#fff6c8" stroke-width="22" opacity="${(0.35 * k).toFixed(2)}"/>`); } }
function camFix(pos, look, fov = 40) { LOOK = look.clone(); camera.position.copy(pos); camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(look); camera.updateMatrixWorld(true); }
const WP = (i, pre, n) => WT(i, pre, n);
const faceCam = (q, d = 1.0, side = 0.35, up = 0.08, fov = 36) => { q.root.updateMatrixWorld(true); const hw = q.head.localToWorld(V(0, 0, q.o.headL * 0.45)); const f = q.head.localToWorld(V(0, 0, q.o.headL * 2)).sub(hw).normalize(); const sd = V(0, 1, 0).cross(f).normalize(); camFix(hw.clone().addScaledVector(f, d).addScaledVector(sd, side).add(V(0, up, 0)), hw, fov); };
const LZ = 7; // Renn-Bahn
const runX = (T, t0, v = 26) => { const u = Math.max(0, T - t0); return u < 3 ? 0.5 * (v / 3) * u * u : 0.5 * v * 3 + v * (u - 3); };

// ---------- Reset ----------
function resetWorld() { rex.root.visible = false; ui = []; svg = []; badge.style.display = 'none'; cta.style.display = 'none'; }
function stage(i, T) {
  mood('day'); sunAt(V(0, 0, LZ)); ground.visible = sky.visible = true; world.visible = false; sav.visible = true; GRASS.visible = true; scene.background = null; scene.fog.near = 40; scene.fog.far = 320;
  G.branch.visible = false; dust(V(0, 0, 0), T, 0);
  [gep, ...ants, lion, ...hyenas].forEach(q => poseQ(q, { vis: false }));
}
const shots = [
  // 0: Die schnellsten Antilopen – normales Rennen reicht nicht
  (T) => { badge.style.display = T < 2.4 ? 'block' : 'none'; const ax = -2 + T * 6; ants.forEach((a, k) => poseQ(a, { pos: V(ax + k * 1.3, 0, LZ + (k - 1) * 0.8), yaw: Math.PI / 2, walk: T * 14 + k, walkK: 1, neckP: 0.7, headP: 0.1, T }));
    const gx = ax - 2.2 - T * 0.9; poseQ(gep, { pos: V(gx, 0, LZ + 1.6), yaw: Math.PI / 2, walk: T * 10, walkK: 1 - clamp((T - 3.2) / 1), neckP: 0.15, headP: 0.1, jaw: T > 3 ? 0.35 : 0, T });
    camFix(V(ax - 0.6, 1.3, LZ + 7.5), V(ax - 0.6, 0.5, LZ + 0.6), 46);
    chip('🌾 SAVANNE', 540, 470, clamp((T - 0.1) / 0.25), '#f3c63f'); chip('💨 ZU SCHNELL', 540, 470, clamp((T - WP(0, 'rennen')) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - WP(0, 'nicht')) / 0.25)); },
  // 1: In 3 Sekunden auf fast 100 km/h
  (T) => { const t0 = WP(1, 'beschleunigst'); const x = -10 + runX(T, t0); const u = Math.max(0, T - t0); const v = Math.min(98, u < 3 ? 98 * u / 3 : 98);
    poseQ(gep, { pos: V(x, 0, LZ), yaw: Math.PI / 2, walk: T * (6 + 14 * clamp(u / 3)), walkK: 1, neckP: 0.05, headP: 0.05, T }); dust(V(x - 0.4, 0, LZ), T, clamp(u / 1.5));
    camFix(V(x + 1.2, 0.9, LZ + 4.6), V(x + 0.4, 0.5, LZ), 44); speedo(v, clamp((T - S[1].start) / 0.3)); chip('⏱️ 3 SEKUNDEN', 540, 470, clamp((T - WP(1, 'sekunden')) / 0.3), '#2fbf5b'); },
  // 2: Bei diesem Tempo rutschen die Pfoten weg
  (T) => { const t0 = S[2].start, tP = WP(2, 'pfoten'); const sk = ease(clamp((T - tP + 0.3) / 0.8)); const x = -2 + (T - t0) * 9 * (1 - 0.7 * sk);
    poseQ(gep, { pos: V(x, 0, LZ + sk * 1.2), yaw: Math.PI / 2 - sk * 1.4, roll: sk * 0.45 * Math.sin(T * 9), claws: 0, walk: T * 18, walkK: 1 - 0.6 * sk, neckP: 0.1, headP: 0.0, T }); dust(V(x, 0, LZ + sk), T, sk, V(-1, 0, -0.5));
    camFix(V(x + 1.6, 1.1, LZ + 5.0), V(x, 0.45, LZ + 0.5), 44); chip('🧊 WIE GLATTEIS', 540, 470, clamp((T - WP(2, 'glatteis')) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - WP(2, 'glatteis') - 0.2) / 0.25)); },
  // 3: Krallen bleiben immer draußen – greifen wie Spikes
  (T) => { const tK = WP(3, 'krallen'); const P = V(0, 0, LZ); poseQ(gep, { pos: P, yaw: Math.PI / 2, walk: 1.9, walkK: 0.9, crouch: 0.3, neckP: 0.1, headP: 0.1, claws: 1.8, T }); dust(pawW(gep, 0), T, clamp((T - WP(3, 'greifen')) / 0.3), V(-1, 0, 0.2));
    const pw = pawW(gep, 0); camFix(V(pw.x + 0.7, 0.45, pw.z + 2.0), V(pw.x, 0.25, pw.z), 36); ring(pw, clamp((T - tK) / 0.3), '#2fbf5b', 70); label3('KRALLEN', pw, clamp((T - tK) / 0.3), 200, -260);
    chip('👟 WIE SPIKES', 540, 470, clamp((T - WP(3, 'spikes') + 0.3) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - WP(3, 'spikes')) / 0.25)); },
  // 4: Sprint verbraucht riesige Mengen Sauerstoff
  (T) => { const t0 = S[4].start; const x = -4 + (T - t0) * 9; poseQ(gep, { pos: V(x, 0, LZ), yaw: Math.PI / 2, walk: T * 20, walkK: 1, neckP: 0.05, headP: 0.05, jaw: 0.25, T }); dust(V(x - 0.4, 0, LZ), T, 1);
    camFix(V(x + 1.2, 0.9, LZ + 4.6), V(x + 0.4, 0.5, LZ), 44); meter('O₂', lerp(0.95, 0.1, clamp((T - t0) / (WP(4, 'sauerstoff') - t0 + 0.3))), clamp((T - WP(4, 'sprint')) / 0.3), '#7fc4ff');
    chip('🫁 SAUERSTOFF', 540, 470, clamp((T - WP(4, 'sauerstoff')) / 0.3), '#e8483b'); icon(false, 540, 1520, clamp((T - WP(4, 'sauerstoff') - 0.2) / 0.25)); },
  // 5: Große Nasenlöcher, große Lunge, kräftiges Herz
  (T) => { const tN = WP(5, 'nasenlöcher'), tL = WP(5, 'lunge'), tH = WP(5, 'herz'); const P = V(0, 0, LZ); poseQ(gep, { pos: P, yaw: Math.PI / 2 + 0.3, neckP: 0.15, headP: 0.1, jaw: 0.25, xray: clamp((T - tL + 0.4) / 0.4), breath: 1, T });
    gep.root.updateMatrixWorld(true); const hw = headW(gep); if (T < tL - 0.2) faceCam(gep, 0.75, 0.6); else camFix(V(P.x + 0.6, 0.85, P.z + 3.0), V(P.x + 0.3, 0.75, P.z), 40);
    if (T < tL - 0.2) gep.nostrils.forEach(n => ring(n.getWorldPosition(V(0, 0, 0)), clamp((T - tN) / 0.3), '#2fbf5b', 34)); else { label3('LUNGE', gep.lungs[1].getWorldPosition(V(0, 0, 0)), clamp((T - tL) / 0.3), 180, -260); label3('HERZ', gep.heart.getWorldPosition(V(0, 0, 0)), clamp((T - tH) / 0.3), -180, 260); }
    chip(T < tL - 0.2 ? '👃 GROSSE NASE' : T < tH ? '🫁 GROSSE LUNGE' : '❤️ KRÄFTIGES HERZ', 540, 470, clamp((T - tN) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - tH - 0.2) / 0.25)); },
  // 6: Die grelle Sonne blendet mitten in der Jagd
  (T) => { mood('hot'); const t0 = S[6].start; const x = -3 + (T - t0) * 7; poseQ(gep, { pos: V(x, 0, LZ), yaw: Math.PI / 2, walk: T * 16, walkK: 1, neckP: 0.05, headP: 0.05, eyes: T > WP(6, 'blendet') ? 0.25 : 1, T }); ants.forEach((a, k) => poseQ(a, { pos: V(x + 4 + k * 1.2, 0, LZ + (k - 1) * 0.8), yaw: Math.PI / 2, walk: T * 14 + k, walkK: 1, neckP: 0.7, headP: 0.1, T }));
    camFix(V(x - 2.0, 1.2, LZ + 2.4), V(x + 2.5, 0.5, LZ), 46); glare(clamp((T - WP(6, 'sonne')) / 0.4), T); chip('☀️ GEBLENDET', 540, 470, clamp((T - WP(6, 'blendet')) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - WP(6, 'jagd')) / 0.25)); },
  // 7: Schwarze Streifen unter den Augen schlucken das Licht – wie bei Footballspielern
  (T) => { mood('hot'); const tS = WP(7, 'streifen'); const P = V(0, 0, LZ); poseQ(gep, { pos: P, yaw: Math.PI / 2 + 0.6, neckP: 0.25, headP: 0.0, T }); const hw = headW(gep);
    faceCam(gep, 0.7, 0.6); gep.root.updateMatrixWorld(true); gep.tears.forEach((t, k) => { const c = t.geometry.parameters.path.getPoint(0.5).applyMatrix4(gep.head.matrixWorld); ring(c, clamp((T - tS - k * 0.1) / 0.3), '#f3c63f', 60); });
    chip(T < WP(7, 'footballspielern') ? '🖤 TRÄNENSTREIFEN' : '🏈 WIE FOOTBALLSPIELER', 540, 470, clamp((T - tS) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - WP(7, 'footballspielern') - 0.3) / 0.25)); },
  // 8: Nach dem Sprint außer Atem – erst mal verschnaufen
  (T) => { const P = V(0, 0, LZ); poseQ(ants[0], { pos: P.clone().add(V(0.9, 0.2, 0.3)), yaw: 1.6, roll: Math.PI / 2, neckP: 0.2, headP: 0.4, T }); poseQ(gep, { pos: P, yaw: Math.PI / 2 + 0.4, lie: 1, neckP: 0.1, headP: 0.1, jaw: 0.45 + 0.15 * Math.sin(T * 14), belly: 1 + 0.06 * Math.sin(T * 14), T });
    camFix(V(P.x + 2.6, 1.3, P.z + 4.4), V(P.x + 0.4, 0.35, P.z), 40); chip('😮‍💨 AUSSER ATEM', 540, 470, clamp((T - WP(8, 'atem')) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - WP(8, 'verschnaufen')) / 0.25)); },
  // 9: Löwen und Hyänen wollen die Beute klauen
  (T) => { const t0 = S[9].start; const P = V(0, 0, LZ); const k = ease(clamp((T - t0) / 3.6)); poseQ(ants[0], { pos: P.clone().add(V(0.9, 0.2, 0.3)), yaw: 1.6, roll: Math.PI / 2, neckP: 0.2, headP: 0.4, T }); poseQ(gep, { pos: P, yaw: Math.PI / 2 + 0.4, lie: 0.6, neckP: 0.3, headP: -0.1, T });
    poseQ(lion, { pos: V(lerp(-6, -2.4, k), 0, LZ - 1.2), yaw: Math.PI / 2 + 0.2, walk: T * 4, walkK: 0.8, neckP: 0.1, headP: 0, T }); hyenas.forEach((h, j) => poseQ(h, { pos: V(lerp(6, 2.6, k) + j * 0.8, 0, LZ - 1 + j * 0.9), yaw: -Math.PI / 2 - 0.2, walk: T * 6 + j, walkK: 0.9, neckP: 0.1, headP: 0.1, jaw: 0.2, T }));
    camFix(V(0.3, 2.0, LZ + 7.5), V(0.2, 0.5, LZ - 0.4), 46); label3('LÖWE', headW(lion), clamp((T - WP(9, 'löwen')) / 0.3), 0, -200); label3('HYÄNEN', headW(hyenas[0]), clamp((T - WP(9, 'hyänen')) / 0.3), 0, -200);
    chip('🦁 BEUTEDIEBE', 540, 470, clamp((T - WP(9, 'löwen')) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - WP(9, 'klauen')) / 0.25)); },
  // 10: Schnell schlingen und lieber aufgeben statt kämpfen
  (T) => { const tA = WP(10, 'auf'); const P = V(0, 0, LZ); const leave = ease(clamp((T - tA + 0.2) / 1.6));
    if (T < tA - 0.2) poseQ(gep, { pos: P, yaw: Math.PI / 2 + 0.6, crouch: 1, neckP: -0.4, headP: 0.6 + 0.1 * Math.sin(T * 12), jaw: 0.3 + 0.3 * Math.sin(T * 12), T });
    else poseQ(gep, { pos: P.clone().add(V(-2.2 * leave, 0, 1.6 * leave)), yaw: -2.2, walk: T * 4, walkK: 0.7, neckP: 0.1, headP: 0.2, T });
    poseQ(ants[0], { pos: P.clone().add(V(0.9, 0.2, 0.3)), yaw: 1.6, roll: Math.PI / 2, neckP: 0.2, headP: 0.4, T }); poseQ(lion, { pos: V(lerp(-2.4, 0.2, ease(clamp((T - tA) / 1.5))), 0, LZ - 0.5), yaw: Math.PI / 2 + 0.3, walk: T * 4, walkK: T > tA ? 0.8 : 0, neckP: 0.1, headP: 0.1, jaw: T > WP(10, 'kämpfen') ? 0.6 : 0, T });
    hyenas.forEach((h, j) => poseQ(h, { pos: V(2.6 + j * 0.8, 0, LZ - 1 + j * 0.9), yaw: -Math.PI / 2 - 0.2, neckP: 0.1, headP: 0.1, jaw: 0.3, T }));
    camFix(V(0.3, 2.0, LZ + 7.5), V(0.2, 0.5, LZ - 0.4), 46); chip(T < tA ? '🍖 SCHNELL SCHLINGEN' : T < WP(10, 'verletzung') ? '🏳️ LIEBER AUFGEBEN' : '🩹 VERLETZUNG = ENDE', 540, 470, clamp((T - WP(10, 'schlingst')) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - WP(10, 'ende')) / 0.25)); },
  // 11: Glückwunsch – Gepard
  (T) => { mood('dusk'); const u = T - S[11].start; const P = V(0, 0, LZ); poseQ(gep, { pos: P, yaw: 0.5, neckP: 0.35, headP: 0.0, T }); const a = 0.4 + u * 0.15;
    cam(V(P.x + Math.sin(a) * 3.4, lerp(0.9, 1.3, ease(u / 3)), P.z + Math.cos(a) * 3.4), V(P.x, 0.65, P.z), 44, T, 0.004); cta.style.display = T > WP(11, 'gebaut') ? 'block' : 'none';
    chip('🐆 GEPARD', 540, 470, clamp((T - WP(11, 'geparden')) / 0.3), '#f3c63f'); },
];
shots.forEach((f, i) => { shots[i] = T => { stage(i, T); f(T); }; });
