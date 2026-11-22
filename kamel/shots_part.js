// ---------- Helfer ----------
const flash = (k, col = '255,40,30') => { if (k > 0) svg.push(`<rect x="0" y="0" width="1080" height="1920" fill="rgba(${col},${(0.35 * k).toFixed(3)})"/>`); };
function chip(text, x, y, k, col = '#f3c63f') { if (k <= 0) return; ui.push(`<div class="pill" style="left:${x}px;top:${y}px;border-color:${col};transform:translate(-50%,-50%) scale(${back(k)})">${text}</div>`); }
function icon(ok, x, y, k) { if (k <= 0) return; const s = back(k);
  svg.push(`<g transform="translate(${x},${y}) scale(${s})"><circle r="62" fill="${ok ? '#2fbf5b' : '#fff'}" stroke="#000" stroke-width="9"/>` + (ok ? '<path d="M-30 2 L-8 24 L32 -22" fill="none" stroke="#fff" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>' : '<path d="M-27 -27 L27 27 M27 -27 L-27 27" stroke="#e8323c" stroke-width="17" stroke-linecap="round"/>') + '</g>'); }
function ring(p, k, col = '#e8323c', r0 = 70) { if (k <= 0) return; const [x, y] = proj(p); svg.push(`<circle cx="${x}" cy="${y}" r="${(r0 * back(k)).toFixed(1)}" fill="none" stroke="${col}" stroke-width="9"/>`); }
function sunRays(k, T) { if (k <= 0) return; for (let i = 0; i < 6; i++) { const x = 140 + i * 170 + 30 * Math.sin(T + i); svg.push(`<line x1="${x + 260}" y1="0" x2="${x}" y2="900" stroke="#ffd84a" stroke-width="16" opacity="${(0.5 * k).toFixed(2)}" stroke-linecap="round"/>`); } }
function drops(p, k, T) { if (k <= 0) return; const [x, y] = proj(p); for (let i = 0; i < 5; i++) { const ph = (T * 0.8 + i / 5) % 1; const dx = x + (i - 2) * 70 + ph * (i - 2) * 40, dy = y - 40 + ph * 160;
    svg.push(`<path transform="translate(${dx.toFixed(1)},${dy.toFixed(1)}) scale(${k})" d="M0 -26 C14 -6 18 6 0 18 C-18 6 -14 -6 0 -26 Z" fill="#6ec3ff" stroke="#000" stroke-width="5" opacity="${(1 - ph).toFixed(2)}"/>`); } }
function burst(x, y, k, text) { if (k <= 0 || k >= 1) return; const s = back(clamp(k * 3)); const a = 1 - clamp((k - 0.6) / 0.4);
  svg.push(`<g transform="translate(${x},${y}) scale(${s})" opacity="${a.toFixed(2)}"><path d="M0 -80 L22 -28 L78 -40 L38 2 L70 50 L14 32 L0 84 L-14 32 L-70 50 L-38 2 L-78 -40 L-22 -28 Z" fill="#ffe14a" stroke="#000" stroke-width="7"/><text y="14" text-anchor="middle" font-family="M" font-weight="900" font-size="34" fill="#111">${text}</text></g>`); }
function thermo(v, k, label) { if (k <= 0) return; const x = 900, y = 1180, s = back(k); const h = 300 * clamp(v);
  svg.push(`<g transform="translate(${x},${y}) scale(${s})"><rect x="-34" y="-330" width="68" height="350" rx="34" fill="#fff" stroke="#000" stroke-width="8"/><circle cx="0" cy="40" r="56" fill="#e8323c" stroke="#000" stroke-width="8"/>
    <rect x="-18" y="${(20 - h).toFixed(1)}" width="36" height="${(h + 10).toFixed(1)}" fill="#e8323c"/><text x="0" y="-360" text-anchor="middle" font-family="M" font-weight="900" font-size="56" fill="#fff" stroke="#000" stroke-width="10" paint-order="stroke">${label}</text></g>`); }
function shimmer(k, T) { if (k <= 0) return; for (let i = 0; i < 7; i++) { const x = 90 + i * 150; let d = `M${x} 1700`; for (let j = 1; j <= 8; j++) d += ` Q${x + (j % 2 ? 26 : -26) + 10 * Math.sin(T * 6 + i)} ${1700 - j * 45 + 22} ${x} ${1700 - j * 45}`;
    svg.push(`<path d="${d}" fill="none" stroke="#ff8a3a" stroke-width="8" stroke-linecap="round" opacity="${(0.55 * k * (0.6 + 0.4 * Math.sin(T * 4 + i))).toFixed(2)}"/>`); } }
function camFix(pos, look, fov = 40) { LOOK = look.clone(); camera.position.copy(pos); camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(look); camera.updateMatrixWorld(true); }
const WP = (i, pre, n) => WT(i, pre, n);
const kneeW = k => { camel.root.updateMatrixWorld(true); return camel.legs[k].knee.getWorldPosition(V(0, 0, 0)); };
function bloodAnim(T, cells, swell, popAt) { const B = G.BL; G.drops.forEach((d, i) => { const ph = (T * 0.5 + i / G.drops.length) % 1; d.position.set(-2.2 + ph * 4.4, Math.sin(i * 2.3) * 0.8, Math.cos(i * 1.7) * 0.5); d.visible = true; });
  cells.forEach((c, k) => { c.visible = !(popAt !== null && T > popAt + k * 0.06); const s = 1 + swell * (0.9 + 0.1 * Math.sin(T * 6 + k)); c.scale.set(c.userData.sx * s, c.userData.sy * s, c.userData.sz * s); c.rotation.z = Math.sin(T * 0.8 + k) * 0.3; }); }
[...G.round, ...G.oval].forEach(c => { c.userData.sx = c.scale.x; c.userData.sy = c.scale.y; c.userData.sz = c.scale.z; });

// ---------- Reset ----------
function resetWorld() { rex.root.visible = false; ui = []; svg = []; badge.style.display = 'none'; cta.style.display = 'none'; }
function stage(i, T) {
  mood('day'); sunAt(V(0, 0, 0)); ground.visible = sky.visible = true; world.visible = false; GRASS.visible = false; des.visible = true; scene.background = null; scene.fog.near = 40; scene.fog.far = 300;
  G.blood.visible = i === 2 || i === 3; G.round.forEach(c => c.visible = i === 2); G.oval.forEach(c => c.visible = i === 3); sandStorm(V(0, 0, 0), T, 0);
  poseQ(camel, { vis: false });
}
const CP = V(0, 0, 0); const stand = (T, extra = {}) => poseQ(camel, Object.assign({ pos: CP, yaw: Math.PI / 2, neckP: 0.55, headP: 0.25, T }, extra));
const shots = [
  // 0: Wüste – tagelang kein Wasserloch
  (T) => { badge.style.display = T < 2.4 ? 'block' : 'none'; const k = clamp(T / 4.2); const p = V(lerp(1.8, -0.6, k), 0, lerp(-0.2, -0.9, k));
    poseQ(camel, { pos: p, yaw: -Math.PI / 2 - 0.25, walk: T * 3, walkK: 0.8, neckP: 0.5, headP: 0.3, T }); camFix(V(2.6, 1.7, 5.8), V(-0.6, 1.1, -0.9), 46);
    chip('🏜️ WÜSTE', 540, 470, clamp((T - 0.1) / 0.25), '#f3c63f'); ring(G.DRY.clone().add(V(0, 0.05, 0)), clamp((T - WP(0, 'wasserloch')) / 0.3), '#e8323c', 150);
    label3('AUSGETROCKNET', G.DRY, clamp((T - WP(0, 'wasserloch')) / 0.3), -60, 260); icon(false, 540, 1340, clamp((T - WP(0, 'wasserloch') - 0.2) / 0.25)); },
  // 1: In 10 Minuten über 100 Liter trinken
  (T) => { const tZ = WP(1, 'zehn'), tH = WP(1, 'hundert'), tT = WP(1, 'trinken'); const P = V(G.OAS.x - 2.9, 0, G.OAS.z + 0.2);
    poseQ(camel, { pos: P, yaw: Math.PI / 2, neckP: -0.55, headP: 0.8, splay: 0.3, T }); camFix(V(P.x - 0.4, 1.5, P.z + 6.0), V(P.x + 0.9, 0.9, P.z), 44);
    const n = Math.round(110 * ease(clamp((T - tZ) / (tH - tZ + 0.4)))); chip(T < tH - 0.5 ? '⏱️ 10 MINUTEN' : `💧 ${n} LITER`, 540, 470, clamp((T - tZ) / 0.3), '#7fc4ff'); icon(true, 540, 1340, clamp((T - tT) / 0.25)); },
  // 2: Bei den meisten Tieren würden die Blutzellen platzen
  (T) => { scene.fog.near = 100; scene.fog.far = 900; const tB = WP(2, 'blutzellen'), tP = WP(2, 'platzen'); bloodAnim(T, G.round, ease(clamp((T - S[2].start - 0.3) / (tP - S[2].start))) * 0.7, tP);
    camFix(G.BL.clone().add(V(0, 0, 2.4)), G.BL, 50); if (T > tP) { burst(330, 1000, clamp((T - tP) / 0.7), 'PLOPP!'); burst(740, 1250, clamp((T - tP - 0.15) / 0.7), 'PLOPP!'); flash(clamp(1 - (T - tP) / 0.4)); }
    chip('🩸 BLUTZELLEN', 540, 470, clamp((T - tB) / 0.3), '#e8483b'); icon(false, 540, 1520, clamp((T - tP - 0.2) / 0.25)); },
  // 3: Ovale Blutkörperchen dehnen sich mit
  (T) => { scene.fog.near = 100; scene.fog.far = 900; const tO = WP(3, 'oval'), tD = WP(3, 'dehnen'); bloodAnim(T, G.oval, ease(clamp((T - tD + 0.2) / 0.8)) * 0.45, null);
    camFix(G.BL.clone().add(V(0, 0, 2.4)), G.BL, 50); chip('🥚 OVAL & DEHNBAR', 540, 470, clamp((T - tO) / 0.3), '#2fbf5b'); icon(true, 540, 1520, clamp((T - tD - 0.6) / 0.25)); },
  // 4: Futter ist so selten wie Wasser
  (T) => { const sh = G.shrubs[0].position; const P = V(sh.x - 1.7, 0, sh.z); poseQ(camel, { pos: P, yaw: Math.PI / 2, neckP: -0.2, headP: 0.6 + 0.1 * Math.sin(T * 3), T });
    camFix(V(P.x + 1.0, 1.3, P.z + 4.8), V(P.x + 1.0, 0.9, P.z), 44); ring(sh.clone().add(V(0, 0.25, 0)), clamp((T - WP(4, 'futter')) / 0.3), '#e8323c', 90);
    chip('🌵 KAUM FUTTER', 540, 470, clamp((T - WP(4, 'futter')) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - WP(4, 'wasser')) / 0.25)); },
  // 5: Fett im Höcker – wochenlang davon zehren
  (T) => { const tF = WP(5, 'fett'), tH = WP(5, 'höcker'); stand(T, { fat: ease(clamp((T - tF + 0.2) / 0.5)) }); camel.root.updateMatrixWorld(true); const hp = camel.hump.getWorldPosition(V(0, 0, 0));
    camFix(V(hp.x + 0.6, hp.y + 0.1, hp.z + 4.6), V(hp.x, hp.y - 0.4, hp.z), 42); label3('FETT', hp, clamp((T - tF) / 0.3), 180, -240);
    chip('🐪 FETT-SPEICHER', 540, 470, clamp((T - tH) / 0.3), '#f3c63f'); chip('📅 WOCHENLANG', 540, 1340, clamp((T - WP(5, 'wochenlang')) / 0.3), '#2fbf5b'); },
  // 6: Sonne – jeder Tropfen Schweiß kostet Wasser
  (T) => { mood('hot'); stand(T, { headP: 0.35 }); camFix(V(0.5, 1.7, 5.6), V(0.2, 1.4, 0), 44); sunRays(clamp((T - WP(6, 'sonne')) / 0.3), T);
    drops(V(0, 1.6, 0), clamp((T - WP(6, 'tropfen')) / 0.3), T); chip('💦 SCHWEISS = WASSERVERLUST', 540, 470, clamp((T - WP(6, 'schweiß')) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - WP(6, 'wasser')) / 0.25)); },
  // 7: Körper heizt sich bis 41 °C auf – nachts abkühlen
  (T) => { const t0 = S[7].start, tA = WP(7, 'aufheizen'), tN = WP(7, 'nachts'); const night = T > tN - 0.2; if (night) mood('night'); else mood('hot');
    stand(T, { headP: 0.3 }); camFix(V(-0.6, 1.6, 6.4), V(-0.3, 1.25, 0), 44); const v = night ? lerp(41, 34, ease(clamp((T - tN + 0.2) / 1.0))) : lerp(34, 41, ease(clamp((T - WP(7, 'tagsüber')) / (tA - WP(7, 'tagsüber') + 0.3))));
    thermo((v - 30) / 12, clamp((T - t0) / 0.3), `${v.toFixed(0)} °C`); chip(night ? '🌙 NACHTS ABKÜHLEN' : '🔥 AUFHEIZEN STATT SCHWITZEN', 540, 470, clamp((T - WP(7, 'körper')) / 0.3), night ? '#7fc4ff' : '#f3c63f'); icon(true, 540, 1340, clamp((T - WP(7, 'ab')) / 0.25)); },
  // 8: Sandsturm – Sand in Augen und Nase
  (T) => { mood('storm'); scene.fog.near = 0.5; scene.fog.far = 9; stand(T, { headP: 0.35, eyes: 0.55 + 0.4 * Math.sin(T * 7) }); const hw = headW(camel); sandStorm(hw, T, 1);
    camFix(hw.clone().add(V(0.4, 0.15, 1.6)), hw.clone().add(V(0.1, -0.1, 0)), 40); chip('🌪️ SANDSTURM', 540, 470, clamp((T - WP(8, 'sandsturm')) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - WP(8, 'nase')) / 0.25)); },
  // 9: Zwei Reihen Wimpern, Nasenlöcher zuklappen
  (T) => { mood('storm'); scene.fog.near = 1; scene.fog.far = 16; const tW = WP(9, 'wimpern'), tZ = WP(9, 'zuklappen'); stand(T, { headP: 0.35, eyes: 0.45, nose: 1 - ease(clamp((T - tZ + 0.2) / 0.4)) }); const hw = headW(camel); sandStorm(hw, T, 1);
    camel.root.updateMatrixWorld(true); camFix(hw.clone().add(V(0.25, 0.08, 0.9)), hw.clone().add(V(0.12, 0.0, 0)), 36); label3('WIMPERN', camel.lashes[1].getWorldPosition(V(0, 0, 0)), clamp((T - tW) / 0.3), -160, -230);
    label3('NASE ZU', camel.nostrils[1].getWorldPosition(V(0, 0, 0)), clamp((T - tZ) / 0.3), 160, 260); chip('🛡️ SANDSCHUTZ', 540, 470, clamp((T - tW) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - tZ - 0.3) / 0.25)); },
  // 10: Mit schmalen Hufen im Sand versinken
  (T) => { const tH = WP(10, 'hufen'), tV = WP(10, 'versinken'); const sink = ease(clamp((T - tH) / (tV - tH + 0.6))); stand(T, { pos: V(0, -0.55 * sink, 0), foot: 0, walk: T * 2, walkK: 0.3 * (1 - sink) });
    camFix(V(1.2, 0.55, 4.6), V(0.5, 0.25, 0), 40); chip('🦶 SCHMALE HUFE', 540, 470, clamp((T - tH) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - tV) / 0.25)); },
  // 11: Breite, weiche Füße wie Schneeschuhe
  (T) => { const tB = WP(11, 'breite'), tS = WP(11, 'schneeschuhe'); const f = ease(clamp((T - tB + 0.1) / 0.6)); stand(T, { pos: V(0, -0.55 * (1 - f), 0), foot: f, walk: T * 2.5, walkK: 0.4 * f });
    camFix(V(1.2, 0.55, 4.6), V(0.5, 0.25, 0), 40); camel.root.updateMatrixWorld(true); const fp = camel.feet[1].getWorldPosition(V(0, 0, 0)); label3('BREITE FÜSSE', fp, clamp((T - WP(11, 'füße')) / 0.3), 160, -300);
    chip(T < tS ? '🐾 BREITE FÜSSE' : '❄️ WIE SCHNEESCHUHE', 540, 470, clamp((T - tB) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - WP(11, 'ausbreiten')) / 0.25)); },
  // 12: Beim Hinlegen ist der Sand fast 70 °C heiß
  (T) => { mood('hot'); const tL = WP(12, 'hinlegst'), tS = WP(12, 'siebzig'); stand(T, { lie: ease(clamp((T - tL + 0.3) / 1.2)), neckP: 0.6, headP: 0.2 });
    camFix(V(3.0, 0.9, 3.6), V(0.5, 0.4, 0), 42); shimmer(clamp((T - tS + 0.3) / 0.4), T); chip('🔥 70 °C SAND', 540, 470, clamp((T - tS) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - WP(12, 'heiß')) / 0.25)); },
  // 13: Dicke Hornpolster an Knien und Brust
  (T) => { const tH = WP(13, 'hornpolster'), tK = WP(13, 'knien'), tB = WP(13, 'brust'); const g = 0.5 + 0.5 * Math.sin(T * 6); stand(T, { lie: 1, neckP: 0.6, headP: 0.2, padGlow: T > tH ? g : 0 });
    camFix(V(2.8, 0.55, 2.6), V(0.6, 0.3, 0), 40); camel.root.updateMatrixWorld(true);
    ring(kneeW(0), clamp((T - tK) / 0.3), '#f3c63f', 55); ring(kneeW(1), clamp((T - tK - 0.1) / 0.3), '#f3c63f', 55); ring(camel.pads[0].getWorldPosition(V(0, 0, 0)), clamp((T - tB) / 0.3), '#f3c63f', 70);
    chip('🛡️ HORNPOLSTER', 540, 470, clamp((T - tH) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - WP(13, 'kissen')) / 0.25)); },
  // 14: Glückwunsch – Kamel
  (T) => { mood('dusk'); const u = T - S[14].start; stand(T, { headP: 0.25 }); const a = 0.4 + u * 0.13;
    cam(V(Math.sin(a) * 6, lerp(1.6, 2.2, ease(u / 3)), Math.cos(a) * 6), V(0, 1.3, 0), 44, T, 0.004); cta.style.display = T > WP(14, 'gebaut') ? 'block' : 'none';
    chip('🐪 KAMEL', 540, 470, clamp((T - WP(14, 'kamel')) / 0.3), '#f3c63f'); },
];
shots.forEach((f, i) => { shots[i] = T => { stage(i, T); f(T); }; });
