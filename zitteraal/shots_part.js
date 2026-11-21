// ---------- Helfer ----------
const flash = (k, col = '255,40,30') => { if (k > 0) svg.push(`<rect x="0" y="0" width="1080" height="1920" fill="rgba(${col},${(0.35 * k).toFixed(3)})"/>`); };
function chip(text, x, y, k, col = '#f3c63f') { if (k <= 0) return; ui.push(`<div class="pill" style="left:${x}px;top:${y}px;border-color:${col};transform:translate(-50%,-50%) scale(${back(k)})">${text}</div>`); }
function icon(ok, x, y, k) { if (k <= 0) return; const s = back(k);
  svg.push(`<g transform="translate(${x},${y}) scale(${s})"><circle r="62" fill="${ok ? '#2fbf5b' : '#fff'}" stroke="#000" stroke-width="9"/>` + (ok ? '<path d="M-30 2 L-8 24 L32 -22" fill="none" stroke="#fff" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>' : '<path d="M-27 -27 L27 27 M27 -27 L-27 27" stroke="#e8323c" stroke-width="17" stroke-linecap="round"/>') + '</g>'); }
function ring(p, k, col = '#e8323c', r0 = 70) { if (k <= 0) return; const [x, y] = proj(p); svg.push(`<circle cx="${x}" cy="${y}" r="${(r0 * back(k)).toFixed(1)}" fill="none" stroke="${col}" stroke-width="9"/>`); }
function camFix(pos, look, fov = 40) { LOOK = look.clone(); camera.position.copy(pos); camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(look); camera.updateMatrixWorld(true); }
const WP = (i, pre, n) => WT(i, pre, n);
const inFront = p => p.clone().applyMatrix4(camera.matrixWorldInverse).z < -0.05;
// Blitz zwischen zwei Weltpunkten (SVG über dem Bild)
function bolt(a, b, k, seed, w = 1, col = '#9fe9ff') { if (k <= 0 || !inFront(a) || !inFront(b)) return; const [x0, y0] = proj(a), [x1, y1] = proj(b); const r = rng(seed * 7919 + 13); const n = 9; const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1; const nx = -dy / L, ny = dx / L;
  const pts = []; for (let i = 0; i <= n; i++) { const t = i / n, o = (i === 0 || i === n) ? 0 : (r() - 0.5) * L * 0.22; pts.push([x0 + dx * t + nx * o, y0 + dy * t + ny * o]); }
  const d = pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' '); const br = []; for (let i = 2; i < n - 1; i += 3) { const [px, py] = pts[i]; const a2 = r() * 6.28, l = L * (0.1 + r() * 0.12); br.push(`${px.toFixed(1)},${py.toFixed(1)} ${(px + Math.cos(a2) * l * 0.5 + (r() - 0.5) * 20).toFixed(1)},${(py + Math.sin(a2) * l * 0.5).toFixed(1)} ${(px + Math.cos(a2) * l).toFixed(1)},${(py + Math.sin(a2) * l).toFixed(1)}`); }
  const op = clamp(k).toFixed(2); svg.push(`<g opacity="${op}" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="${d}" stroke="${col}" stroke-width="${22 * w}" opacity="0.35"/>${br.map(q => `<polyline points="${q}" stroke="${col}" stroke-width="${6 * w}"/>`).join('')}<polyline points="${d}" stroke="${col}" stroke-width="${9 * w}"/><polyline points="${d}" stroke="#fff" stroke-width="${3.5 * w}"/></g>`); }
// Kleine Funken entlang des Körpers
function sparks(e, k, T, n = 6, reach = 0.12) { if (k <= 0) return; const q = Math.floor(T * 15); const r = rng(q * 31 + 7); for (let i = 0; i < n; i++) { const u = 0.15 + r() * 0.8; const p = eelPt(e, u); const o = V(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(reach * (0.6 + r())); bolt(p, p.clone().add(o), k * (r() < 0.75 ? 1 : 0), q * 11 + i, 0.45); } }
// Dipol-Feldlinien zwischen Kopf (+) und Schwanz (−)
function fieldLines(e, k, T, R = [0.32, 0.55], col = '#7fe3ff', op = 0.8) { if (k <= 0) return; const H = eelPt(e, 0.02), Tl = eelPt(e, 0.98); const C = H.clone().add(Tl).multiplyScalar(0.5), A = H.clone().sub(Tl); const half = A.length() / 2; A.normalize();
  const B = A.clone().cross(V(0, 1, 0)).normalize(), N = B.clone().cross(A).normalize();
  for (const rr of R) for (let f = 0; f < 6; f++) { const ph = f / 6 * Math.PI * 2 + 0.3; const dir = B.clone().multiplyScalar(Math.cos(ph)).addScaledVector(N, Math.sin(ph)); const pts = [];
    for (let i = 0; i <= 28; i++) { const th = lerp(0.06, Math.PI - 0.06, i / 28); const p = C.clone().addScaledVector(A, Math.cos(th) * half).addScaledVector(dir, Math.sin(th) * rr * k); if (!inFront(p)) { pts.length = 0; break; } pts.push(proj(p)); }
    if (pts.length) svg.push(`<polyline points="${pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="none" stroke="${col}" stroke-width="5" stroke-dasharray="18 14" stroke-dashoffset="${(-T * 90).toFixed(1)}" opacity="${(op * clamp(k)).toFixed(2)}"/>`); } }
function meter(label, val, k, col) { if (k <= 0) return; const s = back(k); const x = 540, y = 1340; svg.push(`<g transform="translate(${x},${y}) scale(${s})"><rect x="-230" y="-40" width="460" height="80" rx="22" fill="#111c" stroke="#000" stroke-width="7"/><rect x="-214" y="-24" width="${(428 * clamp(val)).toFixed(1)}" height="48" rx="12" fill="${col}"/>
  <text x="0" y="16" text-anchor="middle" font-family="M" font-weight="900" font-size="44" fill="#fff" stroke="#000" stroke-width="8" paint-order="stroke">${label}</text></g>`); }
const swimPath = (head, dir, wave, amp = 0.06) => u => head.clone().addScaledVector(dir, -u * EL);
function school(n, fn) { const L = []; for (let i = 0; i < n; i++) L.push(fn(i)); fishSet(L); }
const FR = rng(404); const FISHR = [...Array(NF)].map(() => [FR(), FR(), FR(), FR(), FR()]);

// ---------- Reset ----------
function resetWorld() { rex.root.visible = false; ui = []; svg = []; badge.style.display = 'none'; cta.style.display = 'none'; }
function stage(i, T) {
  UTIME.value = T; underwater(1); shaftsUpdate(T, 1); ground.visible = world.visible = false; GRASS.visible = false; E.zap.intensity = 0;
  E.motes.position.set(Math.sin(T * 0.2) * 0.1, Math.sin(T * 0.3) * 0.05, T * 0.02);
  [eel, ...pack].forEach(e => poseEel(e, { vis: false })); poseFish(prey, { vis: false }); poseFish(pred, { vis: false }); poseCaiman(caiman, { vis: false }); fishSet([]); bubSet([]); eggsSet(V(0, 0, 0), 0);
}
const shots = [
  // 0: Schlammiger Fluss im Amazonas – du siehst fast nichts
  (T) => { badge.style.display = T < 2.4 ? 'block' : 'none'; underwater(lerp(2, 1.6, clamp(T / 4))); shaftsUpdate(T, 0.6);
    const H = V(lerp(-0.45, 0.05, ease(T / 4.2)), -0.95, 0.1); poseEel(eel, { pos: H, yaw: Math.PI / 2, wave: T * 3, amp: 0.05, glow: T < 0.5 ? 0.6 : 0, T });
    camFix(V(0.5, -0.72, 0.9), V(H.x - 0.25, -0.8, 0.1), 40);
    if (T < 0.55) { const k = clamp((0.55 - T) / 0.3); E.zap.position.copy(eelPt(eel, 0.3)); E.zap.intensity = 6 * k; sparks(eel, k, T, 9, 0.2); }
    chip('🌫️ TRÜBES WASSER', 540, 470, clamp((T - 0.15) / 0.25), '#c9a14a'); label3('AMAZONAS', V(H.x - 0.6, -0.4, H.z - 1.4), clamp((T - WP(0, 'amazonas')) / 0.3) * clamp((WP(0, 'siehst') - T) / 0.2), 0, -60);
    icon(false, 540, 1340, clamp((T - WP(0, 'nichts')) / 0.25)); },
  // 1: Schwaches Stromfeld – du spürst jeden Stein und jeden Fisch
  (T) => { const t0 = S[1].start, tF = WP(1, 'stromfeld'), tSt = WP(1, 'stein'), tFi = WP(1, 'fisch'); const H = V(0.55, -1.0, -0.3);
    poseEel(eel, { pos: H, yaw: Math.PI / 2, wave: T * 2, amp: 0.035, T }); fieldLines(eel, clamp((T - tF + 0.2) / 0.5), T);
    const st = E.stones[0].position; ring(st, clamp((T - tSt) / 0.3), '#7fe3ff', 85); label3('STEIN', st, clamp((T - tSt) / 0.3), -120, 170);
    const fx = lerp(1.6, -0.4, clamp((T - tFi + 1.0) / 2.2)); const fp = V(fx, -0.72, 0.05); poseFish(prey, { pos: fp, yaw: -Math.PI / 2, tail: T * 14 });
    ring(fp, clamp((T - tFi) / 0.3), '#7fe3ff', 70); label3('FISCH', fp, clamp((T - tFi) / 0.3), 120, -170);
    cam(V(0.5, -0.5, 2.15), V(-0.05, -0.8, -0.3), 50, T, 0.004);
    chip('📡 STROMFELD', 540, 470, clamp((T - tF) / 0.3), '#7fe3ff'); icon(true, 540, 1500, clamp((T - WP(1, 'stört')) / 0.25)); },
  // 2: Zu wenig Sauerstoff – du würdest ersticken
  (T) => { const t0 = S[2].start, tS = WP(2, 'sauerstoff'), tE = WP(2, 'ersticken'); const H = V(0.3, -1.05, 0.1);
    poseEel(eel, { pos: H, yaw: 1.2, pitch: 0.12, wave: T * 1.2, amp: 0.025, T }); camFix(V(0.95 - (T - t0) * 0.04, -0.8, 0.75), V(0.15, -0.88, 0.0), 40);
    const L = []; for (let i = 0; i < 6; i++) { const ph = (T * 0.25 + i / 6) % 1; L.push({ p: V(0.4 + Math.sin(i * 3) * 0.3, lerp(-1.2, -0.3, ph), -0.2 + Math.cos(i * 2) * 0.3), r: 0.008 }); } bubSet(L);
    chip('O₂ 🔻 WENIG SAUERSTOFF', 540, 470, clamp((T - tS) / 0.3), '#e8483b'); meter('O₂', lerp(0.7, 0.12, clamp((T - tS) / 1.6)), clamp((T - tS) / 0.3), '#e8483b');
    icon(false, 540, 1520, clamp((T - tE) / 0.25)); },
  // 3: Alle paar Minuten nach oben – Luft schnappen wie wir
  (T) => { const t0 = S[3].start, tO = WP(3, 'oben'), tL = WP(3, 'schnappst'), tW = WP(3, 'wir'); underwater(0.5);
    const up = clamp((T - t0 + 0.1) / (tL - t0 + 0.1)); const hy = lerp(-1.0, -0.035, ease(up)); const H = V(lerp(0.4, 0.0, ease(up)), hy, lerp(0.2, -0.1, ease(up)));
    poseEel(eel, { pos: H, yaw: 0.9, pitch: lerp(0.15, 1.1, ease(up)), wave: T * 3, amp: 0.05, T });
    const g = clamp((T - tL) / 0.6); const L = []; if (T > tL) { for (let i = 0; i < 40; i++) { const ph = clamp((T - tL - i * 0.02) / 0.8); const a = i * 2.4; L.push({ p: H.clone().add(V(Math.cos(a) * 0.06 * ph, -0.04 + 0.03 * ph, Math.sin(a) * 0.06 * ph)), r: 0.006 + 0.01 * (1 - ph) }); }
      for (let i = 0; i < 18; i++) { const ph = (T * 0.7 + i / 18) % 1; const gp = eelPt(eel, 0.09); L.push({ p: gp.add(V(Math.sin(i) * 0.05, ph * 0.5, Math.cos(i * 1.3) * 0.05)), r: 0.007 + 0.006 * (i % 3) }); } } bubSet(L);
    camFix(V(0.75, -0.75, 1.25), V(0.05, -0.35, -0.1), 46); label3('LUFT', V(H.x, 0, H.z), clamp((T - tL) / 0.3), 140, -120);
    chip('🫁 LUFT SCHNAPPEN', 540, 470, clamp((T - tL) / 0.3), '#7fc4ff'); chip('🐟 = 🧍', 540, 1340, clamp((T - WP(3, 'genau')) / 0.3), '#2fbf5b'); icon(true, 540, 1520, clamp((T - tW) / 0.25)); },
  // 4: Mit schwachem Feld fängst du keinen Fisch
  (T) => { const t0 = S[4].start, tFe = WP(4, 'fängst'), tK = WP(4, 'keinen'); const lunge = clamp((T - tFe) / 0.35);
    const H = V(lerp(0.35, -0.05, easeOut(lunge)), -0.95, -0.2); poseEel(eel, { pos: H, yaw: -Math.PI / 2 + 0.25, wave: T * 3, amp: 0.05, T }); fieldLines(eel, 0.6, T, [0.25], '#7fe3ff', 0.35);
    const fp = V(lerp(-0.25, -0.35, clamp((T - t0) / 1.5)) - (T > tFe ? easeOut((T - tFe) / 0.5) * 1.4 : 0), -0.9 + (T > tFe ? easeOut((T - tFe) / 0.5) * 0.4 : 0), -0.12);
    poseFish(prey, { pos: fp, yaw: -Math.PI / 2 + (T > tFe ? -0.5 : 0), tail: T * (T > tFe ? 30 : 10) });
    if (T > tFe - 0.4 && T < tFe + 0.6) bolt(eelPt(eel, 0.01), fp, 0.45, Math.floor(T * 14), 0.35);
    cam(V(0.3, -0.62, 1.75), V(0.15, -0.78, -0.2), 46, T, 0.004);
    chip('⚡ ZU SCHWACH', 540, 470, clamp((T - WP(4, 'schwachen')) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - tK) / 0.25)); },
  // 5: Fast der ganze Körper wird zu Stromzellen – über 800 Volt
  (T) => { const t0 = S[5].start, tK = WP(5, 'körper'), tZ = WP(5, 'stromzellen'), tV = WP(5, 'volt'); const xr = clamp((T - t0 + 0.1) / 0.5); const lit = clamp((T - tZ) / (tV - tZ));
    const ph = T * 0.8; poseEel(eel, { path: u => V(0.22 - 0.3 * u + 0.2 * Math.sin(u * 6.28 + 0.4 + 0.15 * Math.sin(ph)), -0.15 - 1.25 * u, 0.12 * Math.sin(u * 3.14)), up: V(0, 0, 1), xray: xr, lit, glow: T > tV ? 0.4 + 0.3 * Math.sin(T * 30) : 0, amp: 0, T });
    camFix(V(0.1, -0.78, 2.3), V(0.0, -0.8, 0.0), 45); const n = Math.round(860 * ease(lit) / 10) * 10;
    if (T > tV) { E.zap.position.copy(eelPt(eel, 0.5)).add(V(0, 0, 0.3)); E.zap.intensity = 4 + 2 * Math.sin(T * 40); sparks(eel, 1, T, 10, 0.25); flash(clamp(1 - (T - tV) / 0.4), '200,240,255'); }
    label3('STROMZELLEN', eelPt(eel, 0.55), clamp((T - tZ) / 0.3), 200, 260); label3('ORGANE', eelPt(eel, 0.08), clamp((T - tK) / 0.3) * clamp((tZ + 0.8 - T) / 0.3), -230, -40);
    chip(`⚡ ${n} VOLT`, 540, 470, clamp((T - tZ) / 0.3), n > 600 ? '#f3c63f' : '#7fe3ff'); icon(true, 540, 1560, clamp((T - tV - 0.2) / 0.25)); },
  // 6: Ein Schwarm ist zu schnell für dich allein
  (T) => { const t0 = S[6].start, tS = WP(6, 'schnell'); const C = V(-0.2, -0.85, -0.4); const ln = clamp((T - tS + 0.3) / 0.6);
    const H = V(lerp(0.9, 0.15, easeOut(ln)), -0.88, lerp(0.3, -0.25, easeOut(ln))); poseEel(eel, { pos: H, yaw: -2.2, wave: T * 4, amp: 0.06, T });
    school(140, i => { const f = FISHR[i]; const a = f[0] * 6.28 + T * 0.6, b = (f[1] - 0.5) * 2.4; const R = 0.32 * Math.cbrt(f[2]); let p = C.clone().add(V(Math.cos(a) * Math.cos(b) * R, Math.sin(b) * R * 0.6, Math.sin(a) * Math.cos(b) * R));
      const away = p.clone().sub(H); const d = away.length(); const flee = ln * clamp(1.1 - d) * 0.9; p.addScaledVector(away.normalize(), flee); return { p, yaw: a + Math.PI / 2 + flee * 2, s: 0.075, tail: T * 20 + i }; });
    cam(V(0.5, -0.55, 1.55), V(-0.1, -0.88, -0.35), 46, T, 0.004);
    chip('🐟🐟🐟 ZU SCHNELL', 540, 470, clamp((T - WP(6, 'schwarm')) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - WP(6, 'allein')) / 0.25)); },
  // 7: Zu hundert jagen, Schwarm in die Enge treiben, alle gleichzeitig schocken
  (T) => { const t0 = S[7].start, tH = WP(7, 'hundert'), tE = WP(7, 'enge'), tS = WP(7, 'schockt'); const C = V(0, -0.85, -0.3); const R = lerp(1.25, 0.62, ease(clamp((T - tE + 0.5) / 1.0))); const shock = T > tS;
    [eel, ...pack].forEach((e, k) => { const a0 = k / 8 * Math.PI * 2 + T * 0.45 + (k % 2) * 0.3; const h = -0.85 + ((k * 37) % 5 - 2) * 0.09; const vis = k === 0 || T > tH - 0.6 + k * 0.08;
      poseEel(e, { path: u => { const a = a0 - u * EL / R; return V(C.x + Math.cos(a) * R, h + 0.04 * Math.sin(u * 9 - T * 4), C.z + Math.sin(a) * R); }, amp: 0, glow: shock ? 0.5 + 0.4 * Math.sin(T * 35 + k) : 0, vis, T }); });
    const stun = clamp((T - tS - 0.2) / 0.8); const rS = lerp(0.42, 0.27, ease(clamp((T - tE + 0.5) / 1.0)));
    school(150, i => { const f = FISHR[i]; const a = f[0] * 6.28 + T * (0.9 - stun * 0.9), b = (f[1] - 0.5) * 2.2; const r = rS * Math.cbrt(f[2]); const p = C.clone().add(V(Math.cos(a) * Math.cos(b) * r, Math.sin(b) * r * 0.7 + stun * (0.1 + f[3] * 0.25), Math.sin(a) * Math.cos(b) * r));
      return { p, yaw: a + Math.PI / 2, roll: stun * (2.5 + f[4]), s: 0.075, tail: T * 20 * (1 - stun) + i }; });
    if (shock) { const q = Math.floor(T * 14); [eel, ...pack].forEach((e, k) => bolt(eelPt(e, 0.02), C.clone().add(V(0, 0.05 * Math.sin(q + k), 0)), clamp(1.4 - (T - tS) / 1.5) * (rng(q * 9 + k)() < 0.8 ? 1 : 0), q * 17 + k, 0.7));
      E.zap.position.copy(C).add(V(0, 0.3, 0)); E.zap.intensity = 8 * clamp(1.4 - (T - tS) / 1.5); flash(clamp(1 - (T - tS) / 0.35), '200,240,255'); }
    cam(V(0.0, -0.12, 2.05), V(0, -0.88, -0.3), 50, T, 0.004);
    chip('👥 ZU HUNDERT', 540, 470, clamp((T - tH) / 0.3) * clamp((tS - T) / 0.2 + 1e-3), '#7fc4ff'); chip('⚡ ALLE GLEICHZEITIG', 540, 470, clamp((T - tS) / 0.3), '#f3c63f');
    icon(true, 540, 1520, clamp((T - WP(7, 'gleichzeitig')) / 0.25)); },
  // 8: Ein Kaiman hat es auf dich abgesehen (von unten gegen die Oberfläche)
  (T) => { const t0 = S[8].start, tK = WP(8, 'kaiman'); underwater(0.5); const cz = lerp(-1.6, -0.5, ease(clamp((T - t0) / 2.4)));
    poseCaiman(caiman, { pos: V(0.1, -0.07, cz), yaw: 0.15 }); poseEel(eel, { pos: V(0.45, -1.15, 0.55), yaw: -2.6, pitch: 0.1, wave: T * 2, amp: 0.04, T });
    camFix(V(1.5, -1.25, 1.3), V(0.1, -0.35, -0.7), 50); label3('KAIMAN', caiman.head.getWorldPosition(V(0, 0, 0)), clamp((T - tK) / 0.3), -60, 220);
    chip('🐊 KAIMAN', 540, 470, clamp((T - tK) / 0.3), '#e8483b'); icon(false, 540, 1520, clamp((T - WP(8, 'abgesehen')) / 0.25)); },
  // 9: Aus dem Wasser springen, an ihn drücken – Strom durch seinen Körper
  (T) => { const t0 = S[9].start, tSp = WP(9, 'springst'), tD = WP(9, 'drückst'), tS = WP(9, 'strom'); above(); shaftsUpdate(0, 0);
    const jolt = T > tS ? Math.sin(T * 47) * 0.06 * clamp(1.6 - (T - tS) / 2.5) : 0; const cP = V(0.4, -0.06, -0.3);
    poseCaiman(caiman, { pos: cP, yaw: -Math.PI / 2 + 0.3, jaw: T > tS ? 0.35 + 0.1 * Math.sin(T * 30) : 0.05, roll: jolt, pitch: -0.18 * ease(clamp((T - tSp) / 0.6)) + jolt * 0.5 });
    caiman.root.updateMatrixWorld(true); const C = V(0.13, 0.0, 0.86).applyMatrix4(caiman.root.matrixWorld); // Kontaktpunkt Kehle/Unterkiefer
    const k = ease(clamp((T - tSp + 0.2) / (tD - tSp + 0.2))); const H = V(C.x + 0.05, lerp(-0.8, C.y + 0.02, k), C.z + 0.12);
    poseEel(eel, { path: u => { const s = u * EL; const top = H.clone(); return V(top.x + 0.06 * Math.sin(s * 3) + s * 0.12, top.y - s * 0.75 + Math.max(0, s - 0.7) * 0.4, top.z + s * 0.35 - Math.max(0, s - 0.7) * 0.2); }, up: V(-1, 0, 0), glow: T > tS ? 0.6 + 0.3 * Math.sin(T * 40) : 0, amp: 0, vis: T > tSp - 0.3, T });
    if (T > tSp && T < tD + 0.3) { const L = []; for (let i = 0; i < 40; i++) { const ph = clamp((T - tSp) / 0.8); const a = i * 2.4; L.push({ p: V(H.x + Math.cos(a) * 0.25 * ph, 0.02 + Math.sin(i) * 0.1 * ph * (1 - ph) * 4, H.z + Math.sin(a) * 0.25 * ph), r: 0.015 * (1 - ph) + 0.004 }); } bubSet(L); }
    if (T > tS) { const q = Math.floor(T * 15); const tail = caiman.root.localToWorld(V(0.3, 0.05, -1.8)), mid = caiman.root.localToWorld(V(0, 0.18, -0.2)), leg = caiman.root.localToWorld(V(0.3, -0.25, 0.45));
      bolt(eelPt(eel, 0.01), mid, 1, q, 1.1); bolt(mid, tail, rng(q)() < 0.85 ? 1 : 0, q + 3, 0.9); bolt(mid, leg, 1, q + 5, 0.7); bolt(eelPt(eel, 0.01), caiman.head.getWorldPosition(V(0, 0, 0)), 1, q + 9, 0.8);
      E.zap.position.copy(mid).add(V(0, 0.5, 0.5)); E.zap.intensity = 10; flash(clamp(1 - (T - tS) / 0.4) + 0.15 * (q % 2), '200,240,255'); }
    cam(V(0.25, 0.85, 2.5), V(-0.3, 0.33, -0.2), 40, T, T > tS ? 0.02 : 0.004);
    chip('🦘 SPRUNG', 540, 470, clamp((T - tSp) / 0.3) * clamp((tS - T) / 0.2 + 1e-3), '#7fc4ff'); chip('⚡ VOLLER KONTAKT', 540, 470, clamp((T - tS) / 0.3), '#f3c63f'); icon(true, 540, 1340, clamp((T - WP(9, 'körper')) / 0.25)); },
  // 10: Eier im flachen Wasser – leichte Beute
  (T) => { const t0 = S[10].start, tEi = WP(10, 'eier'), tB = WP(10, 'beute'); const EC = V(-0.35, bedY(-0.35, 0.1) + 0.06, 0.1); eggsSet(EC, clamp((T - t0 + 0.4) / 0.6), clamp((T - tB + 0.6) / 1.4) * 0.7);
    const fp = V(lerp(-1.3, EC.x + 0.12, ease(clamp((T - t0) / (tB - t0 - 0.3)))), EC.y + 0.1 + 0.02 * Math.sin(T * 9), EC.z + 0.05); poseFish(pred, { pos: fp, yaw: Math.PI / 2 + 0.2, pitch: T > tB - 0.5 ? -0.4 : 0, tail: T * 14 });
    camFix(V(0.5, EC.y + 0.38, 1.3), V(-0.4, EC.y + 0.05, 0.05), 40);
    label3('EIER', EC, clamp((T - tEi) / 0.3), 160, -220); chip('🥚 LEICHTE BEUTE', 540, 470, clamp((T - WP(10, 'flachen')) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - tB) / 0.25)); },
  // 11: Schaumnest aus Spucke – bewachen mit voller Spannung
  (T) => { const t0 = S[11].start, tN = WP(11, 'schaumnest'), tSp = WP(11, 'spucke'), tBw = WP(11, 'bewachst'), tV = WP(11, 'spannung'); underwater(0.5);
    const F = V(-0.2, 0, -0.5); const grow = clamp((T - t0 + 0.2) / (tBw - t0)); const L = []; E.foamBase.forEach((b, i) => { if (b.t < grow) L.push({ p: F.clone().add(b.p), r: b.r * back(clamp((grow - b.t) * 6)) }); }); bubSet(L);
    eggsSet(F.clone().add(V(0, -0.05, 0)), clamp((T - tSp) / 0.6));
    const guard = T > tBw - 0.3; const a = T * 0.9; const H = guard ? V(F.x + Math.cos(a) * 0.5, -0.4, F.z + Math.sin(a) * 0.35) : V(F.x + 0.12, -0.08, F.z + 0.3);
    if (guard) poseEel(eel, { path: u => { const b = a - u * 2.6; return V(F.x + Math.cos(b) * (0.5 + u * 0.15), -0.4 - u * 0.25, F.z + Math.sin(b) * (0.35 + u * 0.2)); }, amp: 0, glow: T > tV ? 0.4 + 0.3 * Math.sin(T * 30) : 0.1, T });
    else poseEel(eel, { pos: H, yaw: Math.PI, pitch: 0.75, wave: T * 2, amp: 0.04, T });
    if (guard) sparks(eel, clamp((T - tBw) / 0.3), T, T > tV ? 12 : 5, 0.18);
    if (T > tBw) { const pk = clamp((T - tBw) / 1.0); const pp = V(lerp(1.4, 0.6, ease(pk)) + (T > tV ? easeOut((T - tV) / 0.6) * 1.5 : 0), -0.45, 0.1); poseFish(pred, { pos: pp, yaw: T > tV ? Math.PI / 2 : -Math.PI / 2, tail: T * 16 });
      if (T > tV && T < tV + 0.6) bolt(eelPt(eel, 0.02), pp, 1, Math.floor(T * 15), 0.9); }
    camFix(V(0.7, -0.95, 1.25), V(-0.15, -0.25, -0.45), 48); label3('SCHAUMNEST', F, clamp((T - tN) / 0.3), 220, 130);
    chip('🫧 SCHAUMNEST', 540, 470, clamp((T - tN) / 0.3) * clamp((tBw - T) / 0.2 + 1e-3), '#7fc4ff'); chip('⚡ BEWACHT', 540, 470, clamp((T - tBw) / 0.3), '#f3c63f'); icon(true, 540, 1340, clamp((T - tV) / 0.25)); },
  // 12: Gar kein Aal – ein Messerfisch
  (T) => { const t0 = S[12].start, tA = WP(12, 'aal'), tM = WP(12, 'messerfisch'); const H = V(-0.35 - (T - t0) * 0.08, -0.9, -0.35);
    poseEel(eel, { pos: H, yaw: -Math.PI / 2, wave: T * 1.5, amp: 0.02, finWave: T * 5, T }); camFix(V(0.35 - (T - t0) * 0.08, -0.62, 1.75), V(0.3 - (T - t0) * 0.08, -0.75, -0.35), 52);
    label3('FLOSSENSAUM', eelPt(eel, 0.55).add(V(0, -0.1, 0)), clamp((T - tM) / 0.3), 100, 240);
    chip('KEIN AAL', 540, 470, clamp((T - tA) / 0.3) * clamp((tM - T) / 0.2 + 1e-3), '#e8483b'); icon(false, 540, 1340, clamp((T - tA) / 0.25) * clamp((tM - T) / 0.2 + 1e-3));
    chip('🔪🐟 MESSERFISCH', 540, 470, clamp((T - tM) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - tM - 0.2) / 0.25)); },
  // 13: Glückwunsch – Zitteraal
  (T) => { const u = T - S[13].start; const H = V(0.45 + u * 0.06, -0.85, -0.2);
    poseEel(eel, { pos: H, yaw: Math.PI / 2 - 0.15, wave: T * 3, amp: 0.05, glow: 0.12 + 0.1 * Math.sin(T * 6), T }); sparks(eel, 0.8, T, 7, 0.15);
    E.zap.position.copy(H).add(V(-0.4, 0.3, 0.4)); E.zap.intensity = 3;
    cam(V(0.85 + u * 0.06, -0.5, 1.65), V(0.05 + u * 0.06, -0.72, -0.2), 46, T, 0.004); cta.style.display = T > WP(13, 'gebaut') ? 'block' : 'none';
    chip('⚡ ZITTERAAL', 540, 470, clamp((T - WP(13, 'zitteraal')) / 0.3), '#f3c63f'); },
];
shots.forEach((f, i) => { shots[i] = T => { stage(i, T); f(T); plantHide(); }; });
