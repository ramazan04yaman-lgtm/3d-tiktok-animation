// ---------- Helfer ----------
const flash = (k, col = '255,40,30') => { if (k > 0) svg.push(`<rect x="0" y="0" width="1080" height="1920" fill="rgba(${col},${(0.35 * k).toFixed(3)})"/>`); };
function chip(text, x, y, k, col = '#f3c63f') { if (k <= 0) return; ui.push(`<div class="pill" style="left:${x}px;top:${y}px;border-color:${col};transform:translate(-50%,-50%) scale(${back(k)})">${text}</div>`); }
function icon(ok, x, y, k) { if (k <= 0) return; const s = back(k);
  svg.push(`<g transform="translate(${x},${y}) scale(${s})"><circle r="62" fill="${ok ? '#2fbf5b' : '#fff'}" stroke="#000" stroke-width="9"/>` + (ok ? '<path d="M-30 2 L-8 24 L32 -22" fill="none" stroke="#fff" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>' : '<path d="M-27 -27 L27 27 M27 -27 L-27 27" stroke="#e8323c" stroke-width="17" stroke-linecap="round"/>') + '</g>'); }
function ring(p, k, col = '#e8323c', r0 = 70) { if (k <= 0) return; const [x, y] = proj(p); svg.push(`<circle cx="${x}" cy="${y}" r="${(r0 * back(k)).toFixed(1)}" fill="none" stroke="${col}" stroke-width="9"/>`); }
function sunRays(k, T) { if (k <= 0) return; for (let i = 0; i < 6; i++) { const x = 140 + i * 170 + 30 * Math.sin(T + i); svg.push(`<line x1="${x + 260}" y1="0" x2="${x}" y2="900" stroke="#ffd84a" stroke-width="16" opacity="${(0.5 * k).toFixed(2)}" stroke-linecap="round"/>`); } }
function drops(p, k, T) { if (k <= 0) return; const [x, y] = proj(p); for (let i = 0; i < 4; i++) { const ph = (T * 0.6 + i / 4) % 1; const dx = x + (i - 1.5) * 80, dy = y - 140 - ph * 90;
    svg.push(`<path transform="translate(${dx},${dy.toFixed(1)}) scale(${k})" d="M0 -26 C14 -6 18 6 0 18 C-18 6 -14 -6 0 -26 Z" fill="#6ec3ff" stroke="#000" stroke-width="5" opacity="${(1 - ph).toFixed(2)}"/>`); } }
function lens(p, k) { if (k <= 0) return; const [x, y] = proj(p); svg.push(`<g transform="translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${back(k)})"><circle r="70" fill="rgba(255,255,255,0.18)" stroke="#111" stroke-width="14"/><circle r="70" fill="none" stroke="#fff" stroke-width="5"/><line x1="50" y1="50" x2="120" y2="120" stroke="#111" stroke-width="22" stroke-linecap="round"/></g>`); }
function camFix(pos, look, fov = 40) { LOOK = look.clone(); camera.position.copy(pos); camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(look); camera.updateMatrixWorld(true); }
const WP = (i, pre, n) => WT(i, pre, n);
const Q0 = V(0.6, 0, 3.2); const WOOD0 = V(3.6, 0, 0.4), WOOD1 = V(-5.3, 0, -4.9);
const woodTips = (n, seed = 3) => { const r = rng(seed), out = []; for (let i = 0; i < n; i++) { const x = (r() - 0.5) * 12, z = -5.0 - r() * 0.9; out.push({ p: V(x, 0.35 + r() * 0.12, z), s: 0.028 }); } return out; };

// ---------- Reset ----------
function resetWorld() { rex.root.visible = false; ui = []; svg = []; badge.style.display = 'none'; cta.style.display = 'none'; }
function stage(i, T) {
  mood('day'); sunAt(V(0, 0, 0)); ground.visible = sky.visible = true; world.visible = true; GRASS.visible = true; garden.visible = true; scene.background = null; scene.fog.near = 40; scene.fog.far = 320;
  lawnSet(i >= 1 ? 1 : 0, i >= 4 ? 1 : 0); G.chips.visible = i >= 3; G.chips.scale.x = 1; leavesSet(i >= 6 ? 1 : 0); G.leaves.visible = i < 6; G.bag.visible = i === 5; G.bag.position.copy(G.LPOS).add(V(1.0, 0.4, 0.4)); G.bag.scale.setScalar(1);
  G.wood.position.copy(i >= 8 ? WOOD1 : WOOD0); G.wood.rotation.y = i >= 8 ? Math.PI / 2 : 0.3; G.mower.visible = false; G.blade.visible = false; dog.collar.visible = i >= 10;
  poseTick(tick, { vis: false }); dotsSet([]); mice.forEach(m => poseMouse(m, { vis: false })); poseQ(dog, { vis: false }); kids.forEach(k => poseKid(k, { vis: false }));
}
const shots = [
  // 0: Zecken fallen nicht von Bäumen – sie warten im hohen Gras
  (T) => { badge.style.display = T < 2.4 ? 'block' : 'none'; const tG = WP(0, 'gras'), tF = WP(0, 'falsch'); const A = G.apple.position;
    if (T < tG - 0.4) { const fk = clamp(T / 1.6); const tp = V(A.x + 0.6, lerp(2.0, 0.45, fk * fk), A.z + 1.3); poseTick(tick, { pos: tp, yaw: T * 3, pitch: T * 2, s: 0.09, T }); camFix(V(A.x + 0.9, 1.3, A.z + 3.6), V(A.x + 0.6, 1.25, A.z + 1.3), 44); ring(tp, clamp((T - 0.2) / 0.3), '#e8323c', 60);
      chip('🌳 ZECKE VOM BAUM?', 540, 470, clamp((T - 0.1) / 0.25), '#e8483b'); icon(false, 540, 1340, clamp((T - 0.3) / 0.25)); chip('❌ MYTHOS', 540, 1520, clamp((T - tF) / 0.3), '#e8483b'); }
    else { G.blade.visible = true; G.blade.position.copy(Q0); const tip = Q0.clone().add(V(0, 0.585, 0.1)); poseTick(tick, { pos: tip, yaw: 0.3, pitch: -0.5, s: 0.012, quest: 1, T }); camFix(tip.clone().add(V(0.12, 0.02, 0.2)), tip.clone().add(V(0, -0.03, 0)), 40);
      label3('ZECKE', tip, clamp((T - tG) / 0.3), 180, -260); chip('🌾 IM HOHEN GRAS', 540, 470, clamp((T - tG + 0.3) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - WP(0, 'dich')) / 0.25)); } },
  // 1: Rasen kurz mähen – in der Sonne trocknen Zecken aus
  (T) => { const t0 = S[1].start, tS = WP(1, 'sonne'); const mx = lerp(-7, 7, clamp((T - t0) / (tS - t0))); lawnSet(1, 0, mx); lawnKey = '';
    if (T < tS - 0.2) { G.mower.visible = true; G.mower.position.set(mx, 0, 1.6); G.mower.rotation.y = Math.PI / 2; camFix(V(mx - 1.0, 2.2, 5.6), V(mx - 0.8, 0.2, 1.2), 44); chip('✂️ RASEN KURZ', 540, 470, clamp((T - WP(1, 'rasen')) / 0.3), '#2fbf5b'); }
    else { mood('hot'); const P = V(0.3, 0.06, 2.4); poseTick(tick, { pos: P, yaw: 0.6, s: 0.03, dry: ease(clamp((T - WP(1, 'trocknen')) / 1.0)), T }); camFix(P.clone().add(V(0.2, 0.16, 0.3)), P, 40); sunRays(clamp((T - tS) / 0.3), T);
      chip('☀️ ZECKE TROCKNET AUS', 540, 470, clamp((T - tS) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - WP(1, 'aus')) / 0.25)); } },
  // 2: Am Waldrand wachsen Gras und Büsche hoch – dort lauern sie
  (T) => { lawnSet(1, 0); lawnKey = ''; const tL = WP(2, 'lauern'); dotsSet(clamp((T - WP(2, 'gras')) / 0.5) > 0 ? woodTips(40) : []); camFix(V(0.8, 1.2, -1.4), V(0.2, 0.3, -5.2), 44);
    label3('WALDRAND', V(-1.5, 0.6, -5.4), clamp((T - WP(2, 'waldrand')) / 0.3), 0, -200); ring(V(0.4, 0.4, -5.1), clamp((T - tL) / 0.3), '#e8323c', 120);
    chip('🌿 HOHES GRAS AM WALD', 540, 470, clamp((T - WP(2, 'waldrand')) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - tL) / 0.25)); },
  // 3: Breiter Streifen aus Holzhäckseln zwischen Wald und Rasen
  (T) => { const t0 = S[3].start, tH = WP(3, 'holzhäckseln'); const c = ease(clamp((T - tH + 0.3) / 1.6)); lawnSet(1, c); lawnKey = ''; G.chips.scale.x = Math.max(0.001, c);
    const tp = V(lerp(0.6, 0.6, 0), 0.03, lerp(-4.9, -4.95, 0)); const back = clamp((T - WP(3, 'ungern')) / 0.8); poseTick(tick, { pos: V(0.6, 0.03, -4.25 - 0.15 * Math.sin(back * Math.PI)), yaw: back > 0.5 ? 0 : Math.PI, s: 0.03, T, vis: T > WP(3, 'rasen') });
    camFix(V(1.4, 1.5, -1.6), V(0.3, 0.1, -4.9), 42); label3('HOLZHÄCKSEL', V(-1.0, 0.05, -5.0), clamp((T - tH) / 0.3), 0, -220);
    chip('🪵 HÄCKSEL-STREIFEN', 540, 470, clamp((T - WP(3, 'streifen')) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - WP(3, 'überqueren')) / 0.25)); },
  // 4: Laubhaufen bleibt feucht und kühl – ein Zeckenhotel
  (T) => { const L = G.LPOS; const r = rng(8), d = []; if (T > WP(4, 'feucht')) for (let i = 0; i < 18; i++) { const a = r() * 6.28, rr = Math.sqrt(r()) * 0.8; d.push({ p: L.clone().add(V(Math.cos(a) * rr, 0.5 * Math.sqrt(1 - rr * rr / 1.1) + 0.03, Math.sin(a) * rr * 0.8)), s: 0.025 }); } dotsSet(d);
    camFix(L.clone().add(V(-0.1, 1.5, 2.8)), L.clone().add(V(0, 0.25, 0)), 40); drops(L.clone().add(V(0, 0.6, 0)), clamp((T - WP(4, 'feucht')) / 0.3), T);
    chip('🏨 ZECKENHOTEL', 540, 470, clamp((T - WP(4, 'zeckenhotel')) / 0.3), '#e8483b'); chip('💧 FEUCHT & KÜHL', 540, 470, clamp((T - WP(4, 'feucht')) / 0.3) * clamp((WP(4, 'zeckenhotel') - T) / 0.2 + 1e-3), '#7fc4ff'); icon(false, 540, 1340, clamp((T - WP(4, 'zeckenhotel') - 0.3) / 0.25)); },
  // 5: Das Laub wegräumen – weit weg von Spielplatz und Terrasse
  (T) => { const t0 = S[5].start, tL = WP(5, 'laub'); const k = ease(clamp((T - tL) / 1.4)); leavesSet(k); G.bag.scale.setScalar(back(clamp((T - tL) / 0.4)) + 1e-3);
    if (T < WP(5, 'weit')) camFix(G.LPOS.clone().add(V(-0.1, 1.5, 2.8)), G.LPOS.clone().add(V(0.3, 0.25, 0.2)), 40); else camFix(V(-2.5, 2.2, 6.0), V(-1.2, 0.4, -0.5), 48);
    if (T > WP(5, 'spielplatz')) label3('SPIELPLATZ', G.play.position.clone().add(V(0, 1.9, 0)), clamp((T - WP(5, 'spielplatz')) / 0.3), 0, -200); if (T > WP(5, 'terrasse')) label3('TERRASSE', V(-1, 0.2, 7.0), clamp((T - WP(5, 'terrasse')) / 0.3), 0, -260);
    chip('🍂 LAUB WEG', 540, 470, clamp((T - tL) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - WP(5, 'terrasse')) / 0.25)); },
  // 6: Mäuse aus dem Holzstapel tragen neue Zecken in den Garten
  (T) => { const t0 = S[6].start; const W = WOOD0; const d = []; mice.forEach((m, k) => { const u = clamp((T - t0 - k * 0.4) / 2.6); const p = W.clone().add(V(-u * (1.6 + k * 0.4), 0, u * (1.0 + k * 0.5))); poseMouse(m, { pos: p, yaw: -1.0 + k * 0.2, T: T + k });
      if (T > WP(6, 'zecken')) d.push({ p: p.clone().add(V(0.02, 0.15, 0)), s: 0.022 }, { p: p.clone().add(V(-0.04, 0.13, -0.06)), s: 0.02 }); }); dotsSet(d);
    camFix(W.clone().add(V(-0.6, 1.3, 3.3)), W.clone().add(V(-1.0, 0.2, 0.6)), 42); label3('HOLZSTAPEL', W.clone().add(V(0, 0.8, 0)), clamp((T - WP(6, 'holzstapel')) / 0.3), 0, -200);
    chip('🐭 MÄUSE BRINGEN ZECKEN', 540, 470, clamp((T - WP(6, 'mäuse')) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - WP(6, 'garten')) / 0.25)); },
  // 7: Holz weit weg von Haus und Spielbereich lagern
  (T) => { const t0 = S[7].start; const k = ease(clamp((T - WP(7, 'holz')) / 1.6)); G.wood.position.copy(WOOD0).lerp(WOOD1, k); G.wood.position.y = Math.sin(k * Math.PI) * 0.8; G.wood.rotation.y = lerp(0.3, Math.PI / 2, k);
    camFix(V(0.5, 6.5, 6.0), V(-0.8, 0, -1.5), 50); label3('HOLZ', G.wood.position.clone().add(V(0, 0.8, 0)), clamp((T - WP(7, 'holz')) / 0.3), 0, -200); label3('SPIELPLATZ', G.play.position.clone().add(V(0, 2, 0)), clamp((T - WP(7, 'spielbereich')) / 0.3), 120, -160);
    chip('📦 HOLZ NACH HINTEN', 540, 470, clamp((T - WP(7, 'holz')) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - WP(7, 'spielbereich')) / 0.25)); },
  // 8: Der Hund bringt nach jedem Waldspaziergang Zecken mit
  (T) => { const t0 = S[8].start; const k = clamp((T - t0) / 2.6); const p = V(0, 0, lerp(-7.5, -1.5, ease(k))); poseQ(dog, { pos: p, yaw: 0, gait: T * 7, walk: 1 - clamp((k - 0.9) * 10), wag: 1, T });
    dotsSet(T > WP(8, 'zecken') ? dogTicks(clamp((T - WP(8, 'zecken')) / 0.8)) : []); camFix(V(p.x + 1.8, 1.2, p.z + 3.2), V(p.x, 0.6, p.z), 42);
    chip('🐕 ZECKEN IM FELL', 540, 470, clamp((T - WP(8, 'zecken')) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - WP(8, 'hause')) / 0.25)); },
  // 9: Zeckenschutz vom Tierarzt – nach jedem Spaziergang absuchen
  (T) => { const tZ = WP(9, 'zeckenschutz'), tS = WP(9, 'suchst'); const p = V(0, 0, -1.5); dog.collar.visible = T > tZ; dog.collar.scale.setScalar(back(clamp((T - tZ) / 0.4)) + 1e-3); poseQ(dog, { pos: p, yaw: 0.6, headP: 0.1, wag: 0.6, T });
    const left = T < tS ? 1 : 1 - clamp((T - tS) / 2.4); const tk = dogTicks(left); dotsSet(tk); camFix(V(p.x + 1.9, 1.1, p.z + 2.1), V(p.x + 0.1, 0.65, p.z), 40);
    if (T > tS && tk.length) lens(tk[tk.length - 1].p, 1); label3('ZECKENSCHUTZ', dog.collar.getWorldPosition(V(0, 0, 0)), clamp((T - tZ) / 0.3), -160, -230);
    chip(T < tS ? '🩺 VOM TIERARZT' : '🔍 ABSUCHEN', 540, 470, clamp((T - tZ) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - WP(9, 'spaziergang')) / 0.25)); },
  // 10: Kinder toben im hohen Gras hinten am Zaun
  (T) => { const t0 = S[10].start; kids.forEach((k, j) => poseKid(k, { pos: V(5.7 - j * 0.4, 0, lerp(-3.5, 2.5, ((T - t0) * 0.35 + j * 0.3) % 1)), yaw: 0.0, run: 1, T: T + j }));
    const d = T > WP(10, 'gras') ? [...kidTicks(kids[0], 3), ...kidTicks(kids[1], 3)].filter((x, i) => i % 3 !== 0) : []; dotsSet(d); camFix(V(3.0, 1.3, 2.2), V(5.6, 0.6, -0.6), 44);
    label3('HOHES GRAS', V(5.9, 0.5, -1.5), clamp((T - WP(10, 'gras')) / 0.3), -150, -260); chip('🌾 SPIELEN AM ZAUN', 540, 470, clamp((T - WP(10, 'kinder')) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - WP(10, 'zaun')) / 0.25)); },
  // 11: Helle, lange Kleidung – Zecken sofort sehen – abends absuchen
  (T) => { const tA = WP(11, 'abends'); const eve = T > tA - 0.2; if (eve) mood('dusk'); const P = V(1.0, 0, 3.0); poseKid(kids[0], { pos: P, yaw: 0.4, light: 1, T }); const tk = kidTicks(kids[0], 5); dotsSet(eve ? tk.slice(0, Math.max(0, 5 - Math.floor((T - tA) * 2.2))) : tk);
    camFix(P.clone().add(V(0.9, 1.0, 2.9)), P.clone().add(V(0, 0.68, 0)), 40); if (eve) lens(tk[Math.max(0, 4 - Math.floor((T - tA) * 2.2))].p, 1); else tk.forEach((t, i) => ring(t.p, clamp((T - WP(11, 'zecken') - i * 0.08) / 0.3), '#e8323c', 34));
    chip(eve ? '🌙 ABENDS ABSUCHEN' : '👕 HELLE KLEIDUNG', 540, 470, clamp((T - WP(11, 'helle')) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - WP(11, 'abgesucht')) / 0.25)); },
  // 12: Glückwunsch – zeckensicherer Garten
  (T) => { mood('dusk'); const u = T - S[12].start; poseQ(dog, { pos: V(-0.6, 0, 2.2), yaw: 0.8, wag: 1, T }); kids.forEach((k, j) => poseKid(k, { pos: V(1.4 + j * 0.6, 0, 2.6 - j * 0.3), yaw: -0.4, light: 1, T }));
    const a = 0.2 + u * 0.12; cam(V(Math.sin(a) * 8.5, lerp(4.5, 5.5, ease(u / 3)), Math.cos(a) * 8.5 + 1), V(0, 0.5, -0.5), 46, T, 0.004); cta.style.display = T > WP(12, 'gebaut') ? 'block' : 'none';
    chip('🏡 ZECKENSICHER', 540, 470, clamp((T - WP(12, 'garten')) / 0.3), '#2fbf5b'); },
];
shots.forEach((f, i) => { shots[i] = T => { stage(i, T); f(T); }; });
