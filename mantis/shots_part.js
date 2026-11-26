// ---------- Helfer ----------
const flash = (k, col = '255,40,30') => { if (k > 0) svg.push(`<rect x="0" y="0" width="1080" height="1920" fill="rgba(${col},${(0.35 * k).toFixed(3)})"/>`); };
function chip(text, x, y, k, col = '#f3c63f') { if (k <= 0) return; ui.push(`<div class="pill" style="left:${x}px;top:${y}px;border-color:${col};transform:translate(-50%,-50%) scale(${back(k)})">${text}</div>`); }
function icon(ok, x, y, k) { if (k <= 0) return; const s = back(k);
  svg.push(`<g transform="translate(${x},${y}) scale(${s})"><circle r="62" fill="${ok ? '#2fbf5b' : '#fff'}" stroke="#000" stroke-width="9"/>` + (ok ? '<path d="M-30 2 L-8 24 L32 -22" fill="none" stroke="#fff" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>' : '<path d="M-27 -27 L27 27 M27 -27 L-27 27" stroke="#e8323c" stroke-width="17" stroke-linecap="round"/>') + '</g>'); }
function ring(p, k, col = '#e8323c', r0 = 70) { if (k <= 0) return; const [x, y] = proj(p); svg.push(`<circle cx="${x}" cy="${y}" r="${(r0 * back(k)).toFixed(1)}" fill="none" stroke="${col}" stroke-width="9"/>`); }
function burst(p, k, text) { if (k <= 0 || k >= 1) return; const [x, y] = proj(p); const s = back(clamp(k * 3)); const a = 1 - clamp((k - 0.6) / 0.4);
  svg.push(`<g transform="translate(${x},${y - 40}) scale(${s * 1.3})" opacity="${a.toFixed(2)}"><path d="M0 -80 L22 -28 L78 -40 L38 2 L70 50 L14 32 L0 84 L-14 32 L-70 50 L-38 2 L-78 -40 L-22 -28 Z" fill="#ffe14a" stroke="#000" stroke-width="7"/><text y="14" text-anchor="middle" font-family="M" font-weight="900" font-size="34" fill="#111">${text}</text></g>`); }
function camFix(pos, look, fov = 40) { LOOK = look.clone(); camera.position.copy(pos); camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(look); camera.updateMatrixWorld(true); }
const WP = (i, pre, n) => WT(i, pre, n);
const FX = 0.6; const FP = () => V(FX, twigY(FX), 0); const BACKP = () => FP().add(V(0.12, 0.3, 0)); // Platz auf ihrem Rücken
function maleOnBack(T, extra = {}) { poseMantis(mal, Object.assign({ pos: BACKP(), yaw: -Math.PI / 2, pitch: -0.12, T }, extra)); }
const side = (look, d = 3.0, up = 0.35, fov = 40, k = 0.6, ox = -0.4) => { const L = look.clone().add(V(ox, 0.3 * d / 4, 0)); camFix(L.clone().add(V(0.12, 0.1, d * k)), L, 42); };

// ---------- Reset ----------
function resetWorld() { rex.root.visible = false; ui = []; svg = []; badge.style.display = 'none'; cta.style.display = 'none'; }
function stage(i, T) {
  mood('day'); sunAt(V(0, 0, 0)); ground.visible = sky.visible = true; world.visible = false; GRASS.visible = false; macro.visible = true; scene.background = null; scene.fog.near = 20; scene.fog.far = 160;
  G.fly.visible = false; oothSet(0); poseMantis(fem, { vis: false }); poseMantis(mal, { vis: false });
}
const shots = [
  // 0: Männchen – die gefährlichste Partnerin
  (T) => { badge.style.display = T < 2.4 ? 'block' : 'none'; poseMantis(fem, { pos: FP(), yaw: -Math.PI / 2, headY: lerp(0, 0.9, ease(clamp((T - 1) / 1))), T }); poseMantis(mal, { pos: V(1.75, twigY(1.75), 0), yaw: -Math.PI / 2, T });
    const fh = headW(fem); if (T < 1.6) camFix(fh.clone().add(V(-0.5, 0.05, 0.75)), fh, 38); else side(V(0.95, 1.3, 0), 4.3);
    if (T > 1.6) { label3('♀️ SIE', headW(fem), clamp((T - 1.7) / 0.3), -100, -220); label3('♂️ DU', headW(mal), clamp((T - 1.9) / 0.3), 100, -220); }
    chip('⚠️ GEFÄHRLICHE PARTNERIN', 540, 470, clamp((T - 0.1) / 0.25), '#e8483b'); icon(false, 540, 1340, clamp((T - WP(0, 'partnerin')) / 0.25)); },
  // 1: Sie ist viel größer – alles, was sich bewegt, landet in ihren Fangarmen
  (T) => { const tF = WP(1, 'fangarmen'), tB = WP(1, 'bewegt'); const st = T > tF - 0.4 ? clamp(1 - Math.abs(T - tF + 0.2) / 0.25) : 0; poseMantis(fem, { pos: FP(), yaw: -Math.PI / 2, strike: st, T }); poseMantis(mal, { pos: V(1.75, twigY(1.75), 0), yaw: -Math.PI / 2, T });
    const fh = headW(fem); G.fly.visible = T < tF; G.fly.position.set(fh.x - 0.55 + 0.1 * Math.sin(T * 3), fh.y - 0.1 + 0.08 * Math.sin(T * 5), 0.1); G.fly.rotation.y = Math.PI / 2; G.fly.userData[-1].rotation.z = Math.sin(T * 60) * 0.5; G.fly.userData[1].rotation.z = -Math.sin(T * 60) * 0.5;
    if (T < tB) { side(V(0.95, 1.3, 0), 4.3); label3('♀️ GROSS', headW(fem), clamp((T - WP(1, 'größer')) / 0.3), -60, -230); label3('♂️ KLEIN', headW(mal), clamp((T - WP(1, 'größer') - 0.2) / 0.3), 80, -230); } else camFix(fh.clone().add(V(-0.15, 0.15, 1.0)), fh.clone().add(V(-0.05, -0.15, 0)), 40);
    burst(fh.clone().add(V(-0.4, 0, 0)), clamp((T - tF) / 0.6), 'SCHNAPP!'); chip('🦵 FANGARME', 540, 470, clamp((T - tB) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - tF - 0.3) / 0.25)); },
  // 2: Langsam anschleichen – erstarren, wenn sie den Kopf dreht
  (T) => { const t0 = S[2].start, tE = WP(2, 'erstarrst'); const look = T > tE - 0.2 && T < tE + 1.3; poseMantis(fem, { pos: FP(), yaw: -Math.PI / 2, headY: look ? 1.3 : 0, T }); const k = clamp((T - t0) / (S[2].end - t0)); const mx = lerp(2.0, 1.3, k);
    poseMantis(mal, { pos: V(mx, twigY(mx), 0), yaw: -Math.PI / 2, walk: look ? 0 : T * 2.5, walkK: look ? 0 : 0.8, T }); side(V(0.8, 1.3, 0), 3.9);
    chip(look ? '🧊 ERSTARREN' : '🐌 GANZ LANGSAM', 540, 470, clamp((T - WP(2, 'schleichst')) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - WP(2, 'dreht')) / 0.25)); },
  // 3: Sie dreht den Kopf fast bis nach hinten – sieht dich trotzdem
  (T) => { const tK = WP(3, 'kopf'); const hy = lerp(0, 2.6, ease(clamp((T - tK + 0.2) / 1.2))); poseMantis(fem, { pos: FP(), yaw: -Math.PI / 2, headY: hy, T }); poseMantis(mal, { pos: V(1.3, twigY(1.3), 0), yaw: -Math.PI / 2, T });
    const fh = headW(fem); camFix(fh.clone().add(V(-0.55, 0.12, 0.62)), fh.clone().add(V(0.12, -0.04, 0)), 34); ring(fh, clamp((T - WP(3, 'hinten')) / 0.3), '#e8323c', 80);
    chip('👀 KOPF DREHT NACH HINTEN', 540, 470, clamp((T - tK) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - WP(3, 'trotzdem')) / 0.25)); },
  // 4: Im richtigen Moment auf ihren Rücken springen
  (T) => { const tS = WP(4, 'springst'); const j = ease(clamp((T - tS) / 0.6)); poseMantis(fem, { pos: FP(), yaw: -Math.PI / 2, headY: lerp(1.0, 0, clamp((T - tS) / 0.5)), T });
    const a = V(1.3, twigY(1.3), 0), b = BACKP(); const p = a.clone().lerp(b, j); p.y += Math.sin(j * Math.PI) * 0.6; poseMantis(mal, { pos: p, yaw: -Math.PI / 2, pitch: -0.12 * j, T });
    side(V(0.75, 1.35, 0), 3.4); label3('RÜCKEN', BACKP(), clamp((T - WP(4, 'rücken')) / 0.3), 160, -230);
    chip('🦘 AUF DEN RÜCKEN', 540, 470, clamp((T - tS) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - WP(4, 'erreichen')) / 0.25)); },
  // 5: Manchmal dreht sie sich um und beißt den Kopf ab (Comic, ohne Blut)
  (T) => { const tB = WP(5, 'beißt'), tA = WP(5, 'ab', 1); const turn = ease(clamp((T - WP(5, 'dreht')) / 0.8)); poseMantis(fem, { pos: FP(), yaw: -Math.PI / 2, headY: lerp(0, 2.5, turn), strike: clamp((T - tB + 0.3) / 0.3) * clamp((tA + 0.6 - T) / 0.3), T });
    maleOnBack(T, { headless: T > tA }); side(V(0.55, 1.45, 0), 2.6); burst(headW(fem).add(V(0.2, 0.1, 0)), clamp((T - tA) / 0.7), 'HAPS!'); if (T > tA) flash(clamp(1 - (T - tA) / 0.3), '255,255,255');
    chip('😱 KOPF AB', 540, 470, clamp((T - tA) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - tA - 0.2) / 0.25)); },
  // 6: Ohne Kopf paart sich der Körper weiter – Steuerung im Hinterleib
  (T) => { const tS = WP(6, 'steuerung'); poseMantis(fem, { pos: FP(), yaw: -Math.PI / 2, headY: 2.4, eat: 1, strike: 0.2, T }); maleOnBack(T, { headless: true, glow: T > tS - 0.3 ? 1 : 0, lift: 0.01 * Math.sin(T * 6) });
    mal.root.updateMatrixWorld(true); const gp = mal.gang.getWorldPosition(V(0, 0, 0)); side(gp.clone().add(V(-0.2, -0.05, 0)), 2.8); ring(gp, clamp((T - tS) / 0.3), '#f3c63f', 60); label3('STEUERUNG', gp, clamp((T - WP(6, 'hinterleib')) / 0.3), 180, -240);
    chip(T < tS ? '🤯 DAS VERRÜCKTE' : '🧠 STEUERUNG IM HINTERLEIB', 540, 470, clamp((T - WP(6, 'verrückte')) / 0.3), '#f3c63f'); },
  // 7: Warum frisst sie ausgerechnet dich?
  (T) => { poseMantis(fem, { pos: FP(), yaw: -Math.PI / 2, headY: 2.4, eat: 1, strike: 0.2, T }); maleOnBack(T, { headless: true }); const fh = headW(fem); camFix(fh.clone().add(V(-0.6, 0.3, 1.1)), fh.clone().add(V(0.2, -0.1, 0)), 40);
    chip('❓ WARUM?', 540, 470, clamp((T - WP(7, 'warum')) / 0.3), '#7fc4ff'); },
  // 8: Eiweiß für die Eier – perfekte Mahlzeit
  (T) => { poseMantis(fem, { pos: FP(), yaw: -Math.PI / 2, headY: 0.3, T }); fem.root.updateMatrixWorld(true); const ap = fem.abd.getWorldPosition(V(0, 0, 0)).add(V(0.35, 0, 0)); side(ap.clone().add(V(-0.3, 0.1, 0)), 3.2);
    ring(ap, clamp((T - WP(8, 'eier')) / 0.3), '#f3c63f', 110); label3('EIER', ap, clamp((T - WP(8, 'eier')) / 0.3), 160, -240);
    chip(T < WP(8, 'mahlzeit') ? '🥚 EIWEISS FÜR EIER' : '🍗 PERFEKTE MAHLZEIT', 540, 470, clamp((T - WP(8, 'eier')) / 0.3), '#f3c63f'); icon(true, 540, 1340, clamp((T - WP(8, 'mahlzeit') - 0.2) / 0.25)); },
  // 9: Eipaket aus Schaum mit über 100 Eiern an einem Zweig
  (T) => { const tS = WP(9, 'schaum'); const op = G.twigC.getPoint(0.42).add(V(0, -0.05, 0)); G.ooth.position.copy(op); oothSet(clamp((T - tS + 0.2) / 2.0)); poseMantis(fem, { pos: V(op.x + 0.75, twigY(op.x + 0.75), 0), yaw: -Math.PI / 2, T });
    side(op.clone().add(V(0.3, 0.3, 0)), 2.6, 0.4, 40, 0.72, -0.25); const n = Math.round(100 * clamp((T - tS) / (WP(9, 'hundert') - tS + 0.2))); label3('EIPAKET', op.clone().add(V(0, -0.1, 0)), clamp((T - WP(9, 'eipaket')) / 0.3), -150, 250);
    chip(`🥚 ${n >= 100 ? '100+' : n} EIER`, 540, 470, clamp((T - tS) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - WP(9, 'zweig')) / 0.25)); },
  // 10: In der Natur endet höchstens etwa jede vierte Paarung so
  (T) => { const tV = WP(10, 'vierte'); poseMantis(fem, { pos: FP(), yaw: -Math.PI / 2, T }); const mx = lerp(1.3, 3.0, clamp((T - S[10].start) / 3)); poseMantis(mal, { pos: V(mx, twigY(mx), 0), yaw: Math.PI / 2, walk: T * 3, walkK: 1, T }); side(V(1.3, 1.3, 0), 4.6);
    for (let k = 0; k < 4; k++) { const ok = k < 3; const x = 300 + k * 160, y = 1330; const a = clamp((T - tV + 0.2 - k * 0.12) / 0.3); if (a > 0) svg.push(`<g transform="translate(${x},${y}) scale(${back(a)})"><circle r="62" fill="${ok ? '#2fbf5b' : '#e8323c'}" stroke="#000" stroke-width="8"/><text y="22" text-anchor="middle" font-size="64" font-family="Noto Color Emoji">${ok ? '♂️' : '💀'}</text></g>`); }
    chip('📊 HÖCHSTENS 1 VON 4', 540, 470, clamp((T - WP(10, 'natur')) / 0.3), '#2fbf5b'); },
  // 11: Glückwunsch – Gottesanbeterin
  (T) => { mood('dusk'); const u = T - S[11].start; poseMantis(fem, { pos: FP(), yaw: -Math.PI / 2, headY: 0.4 * Math.sin(T), T }); const op = G.twigC.getPoint(0.42).add(V(0, -0.05, 0)); G.ooth.position.copy(op); oothSet(1); const a = 0.3 + u * 0.18;
    const c = FP().add(V(-0.2, 0.5, 0)); cam(c.clone().add(V(Math.sin(a) * 2.1, 0.3, Math.cos(a) * 2.1)), c, 42, T, 0.003); cta.style.display = T > WP(11, 'gebaut') ? 'block' : 'none';
    chip('🦗 GOTTESANBETERIN', 540, 470, clamp((T - WP(11, 'gottesanbeterin')) / 0.3), '#2fbf5b'); },
];
shots.forEach((f, i) => { shots[i] = T => { stage(i, T); f(T); }; });
