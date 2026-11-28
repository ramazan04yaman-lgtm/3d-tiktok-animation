// ---------- Helfer ----------
const flash = (k, col = '255,40,30') => { if (k > 0) svg.push(`<rect x="0" y="0" width="1080" height="1920" fill="rgba(${col},${(0.35 * k).toFixed(3)})"/>`); };
function chip(text, x, y, k, col = '#f3c63f') { if (k <= 0) return; ui.push(`<div class="pill" style="left:${x}px;top:${y}px;border-color:${col};transform:translate(-50%,-50%) scale(${back(k)})">${text}</div>`); }
function icon(ok, x, y, k) { if (k <= 0) return; const s = back(k);
  svg.push(`<g transform="translate(${x},${y}) scale(${s})"><circle r="62" fill="${ok ? '#2fbf5b' : '#fff'}" stroke="#000" stroke-width="9"/>` + (ok ? '<path d="M-30 2 L-8 24 L32 -22" fill="none" stroke="#fff" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>' : '<path d="M-27 -27 L27 27 M27 -27 L-27 27" stroke="#e8323c" stroke-width="17" stroke-linecap="round"/>') + '</g>'); }
function ring(p, k, col = '#e8323c', r0 = 70) { if (k <= 0) return; const [x, y] = proj(p); svg.push(`<circle cx="${x}" cy="${y}" r="${(r0 * back(k)).toFixed(1)}" fill="none" stroke="${col}" stroke-width="9"/>`); }
function waves(p, T, k, col = '#ffffff') { if (k <= 0) return; const [x, y] = proj(p); for (let j = 0; j < 3; j++) { const u = ((T * 1.4 + j / 3) % 1); svg.push(`<circle cx="${x}" cy="${y}" r="${(30 + u * 150).toFixed(1)}" fill="none" stroke="${col}" stroke-width="${(10 * (1 - u)).toFixed(1)}" opacity="${(k * (1 - u)).toFixed(2)}"/>`); } }
function emo(e, p, k, size = 90, dy = 0) { if (k <= 0) return; const [x, y] = proj(p); svg.push(`<text x="${x}" y="${y + dy}" text-anchor="middle" font-size="${size}" font-family="Noto Color Emoji" transform="translate(${x},${y + dy}) scale(${back(k)}) translate(${-x},${-(y + dy)})">${e}</text>`); }
function camFix(pos, look, fov = 40) { LOOK = look.clone(); camera.position.copy(pos); camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(look); camera.updateMatrixWorld(true); }
const WP = (i, pre, n) => WT(i, pre, n);
// Kamera: Ziel-Fußpunkt b, Abstand d, Winkel a (0 = von vorne), Höhe h, Blickhöhe ly
const fr = (b, d = 4.5, a = 0.3, h = 0.9, ly = 1.25, fov = 40, T = 0) => cam(b.clone().add(V(Math.sin(a) * d, h, Math.cos(a) * d)), b.clone().add(V(0, ly, 0)), fov, T, 0.004);
const MP = V(0, 0, 0);
const OUTK = crowd.reduce((bi, p, k) => p.base.z - Math.abs(p.base.x) * 0.5 > crowd[bi].base.z - Math.abs(crowd[bi].base.x) * 0.5 ? k : bi, 0);
const outPos = () => G.HC.clone().add(crowd[OUTK].base);
const bellyW = m => { m.root.updateMatrixWorld(true); return m.root.localToWorld(V(0, 0.55, 0.25)); };
const feetW = m => { m.root.updateMatrixWorld(true); return m.root.localToWorld(V(0, 0.1, 0.2)); };
const chW = m => { m.root.updateMatrixWorld(true); return m.root.localToWorld(V(0, 0.04, 0.36)); };

// ---------- Reset ----------
function resetWorld() { rex.root.visible = false; ui = []; svg = []; badge.style.display = 'none'; cta.style.display = 'none'; }
function stage(i, T) {
  mood(i < 6 ? 'storm' : i < 10 ? 'night' : 'dawn'); if (i === 0 || i === 1) mood('night'); sunAt(V(0, 0, 0)); ground.visible = sky.visible = true; world.visible = false; GRASS.visible = false; ice.visible = true; scene.background = null; scene.fog.near = 12; scene.fog.far = i < 6 ? 90 : 200;
  posePeng(male, { vis: false }); posePeng(fem, { vis: false }); poseChick(chick, { vis: false }); crowdPose(T, { vis: false }); G.shell.visible = false;
  const wind = i < 6 ? 1 : i < 10 ? 0.3 : 0.1, amt = i < 6 ? 1 : i < 10 ? 0.6 : i < 11 ? 0.3 : 0; snowAt(T, camera.position.clone().add(LOOK).multiplyScalar(0.5), wind, amt);
}
const shots = [
  // 0: Kaiserpinguin-Männchen, Ei im antarktischen Winter, minus 40 Grad
  (T) => { badge.style.display = T < 2.4 ? 'block' : 'none'; posePeng(male, { pos: MP, yaw: 0.1, egg: true, pouch: 0.5, headP: lerp(0.5, 0, ease(clamp((T - 1.2) / 1))), shiver: 0.4, T }); crowdPose(T, { center: V(0, 0, -6), spread: 1.3 });
    const z = ease(clamp((T - 0.3) / 3)); fr(MP, lerp(2.4, 5.0, z), lerp(0.1, 0.45, z), lerp(0.75, 1.0, z), lerp(0.9, 1.3, z), 40, T); snowAt(T, V(0, 0, 2), 1, 1);
    label3('♂️ DU', headW(male), clamp((T - 1.4) / 0.3), -120, -220); label3('EI', feetW(male), clamp((T - WP(0, 'ei')) / 0.3), 170, 140);
    chip(T < WP(0, 'minus') ? '❄️ ANTARKTIS-WINTER' : '🌡️ MINUS 40 °C', 540, 470, clamp((T - WP(0, 'antarktischen')) / 0.3), '#7fc4ff'); },
  // 1: Ei auf die Füße, Bauchfalte drüber
  (T) => { const tB = WP(1, 'bauchfalte'); const pc = ease(clamp((T - tB + 0.2) / 0.9)); posePeng(male, { pos: MP, yaw: 0.25, egg: true, pouch: lerp(0.15, 1, pc), headP: 0.55, T }); crowdPose(T, { center: V(0, 0, -6), spread: 1.3 });
    fr(MP, 3.0, 0.55, 0.7, 0.75, 40, T); label3('EI', feetW(male), clamp((T - WP(1, 'ei')) / 0.3) * (1 - pc), 200, 120); label3('BAUCHFALTE', bellyW(male).add(V(0, -0.25, 0)), clamp((T - tB) / 0.3), 210, 160);
    chip(T < tB ? '🥚 EI AUF DEN FÜSSEN' : '🔥 WARME BAUCHFALTE', 540, 470, clamp((T - WP(1, 'stellst')) / 0.3), '#f3c63f'); icon(true, 540, 1300, clamp((T - WP(1, 'zu')) / 0.25)); },
  // 2: Partnerin geht ins Meer – du bekommst 2 Monate nichts
  (T) => { const t0 = WP(2, 'geht'); const k = clamp((T - t0 + 0.3) / 5.5); const fp = V(0.8, 0, 0.1).lerp(V(4, 0, -16), ease(k)); posePeng(fem, { pos: fp, yaw: Math.atan2(3.2, -16.1), waddle: T * 7, wk: k > 0 && k < 1 ? 1 : 0, T });
    posePeng(male, { pos: MP, yaw: Math.PI * 0.85, egg: true, pouch: 1, headP: 0.1, T }); fr(MP, 4.6, 0.55, 1.6, 1.0, 40, T);
    label3('♀️ PARTNERIN', headW(fem), clamp((T - WP(2, 'partnerin')) / 0.3) * clamp((WP(2, 'über') - T) / 0.3), 150, -200); const tU = WP(2, 'über'); const d = Math.round(65 * clamp((T - tU) / (WP(2, 'essen') - tU + 0.3)));
    chip(T < tU ? '🌊 SIE GEHT FRESSEN' : `🍽️ ${d} TAGE NICHTS`, 540, 470, clamp((T - t0) / 0.3), T < tU ? '#7fc4ff' : '#e8483b'); icon(false, 540, 1300, clamp((T - WP(2, 'essen')) / 0.25)); },
  // 3: Mit tausenden Männchen eng zusammen – gegenseitig wärmen
  (T) => { const u = T - S[3].start; crowdPose(T, { skip: OUTK, spin: u * 0.02 }); posePeng(male, { pos: outPos(), yaw: 0, egg: true, pouch: 1, T }); const a = 0.3 + u * 0.06;
    cam(G.HC.clone().add(V(Math.sin(a) * 6.5, 4.2, Math.cos(a) * 6.5)), G.HC.clone().add(V(0, 0.2, 0)), 42, T, 0.004); label3('♂️ DU', headW(male), clamp((T - WP(3, 'drängst')) / 0.3), -160, 260);
    chip(T < WP(3, 'damit') ? '🐧 TAUSENDE MÄNNCHEN' : '🔥 GEGENSEITIG WÄRMEN', 540, 470, clamp((T - WP(3, 'drängst')) / 0.3), '#f3c63f'); icon(true, 540, 1300, clamp((T - WP(3, 'wärmt')) / 0.25)); },
  // 4: Wer außen steht, bekommt den eisigen Wind ab
  (T) => { crowdPose(T, { skip: OUTK }); const op = outPos(); posePeng(male, { pos: op, yaw: 0, egg: true, pouch: 1, shiver: 1, headP: 0.3, frost: 1, T }); fr(op, 5.4, -0.2, 1.0, 1.2, 40, T); snowAt(T, op.clone().add(V(0, 0, 2)), 1.6, 1);
    ring(bellyW(male).add(V(0, 0.2, 0)), clamp((T - WP(4, 'außen')) / 0.3), '#7fc4ff', 170); emo('🥶', headW(male).add(V(0, 0.32, 0)), clamp((T - WP(4, 'eisigen')) / 0.3), 110);
    chip(T < WP(4, 'eisigen') ? '⚠️ GANZ AUSSEN' : '🌬️ EISIGER WIND', 540, 470, clamp((T - WP(4, 'wer')) / 0.3), '#7fc4ff'); icon(false, 540, 1300, clamp((T - WP(4, 'ab')) / 0.25)); },
  // 5: Plätze wechseln – jeder darf mal in die Mitte
  (T) => { const u = T - S[5].start; const k = ease(clamp((T - WP(5, 'wechselt')) / 3)); crowdPose(T, { skip: OUTK, spin: u * 0.12, wk: 0.6 }); const op = outPos(); const mp = op.clone().lerp(G.HC.clone().add(V(0.1, 0, 0.15)), k);
    posePeng(male, { pos: mp, yaw: Math.PI, egg: true, pouch: 1, waddle: T * 6, wk: k < 1 ? 0.7 : 0, T }); const a = 0.4 + u * 0.08; cam(G.HC.clone().add(V(Math.sin(a) * 6.0, 4.8, Math.cos(a) * 6.0)), G.HC.clone().add(V(0, 0.3, 0)), 42, T, 0.004);
    { const [x, y] = proj(G.HC.clone().add(V(0, 1.3, 0))); const a2 = clamp((T - WP(5, 'plätze')) / 0.3); if (a2 > 0) svg.push(`<g transform="translate(${x},${y}) scale(${back(a2)}) rotate(${(u * 120) % 360})" opacity="0.9"><path d="M-110 0 A110 110 0 0 1 95 -55" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round"/><path d="M95 -55 l-6 -40 l40 26 z" fill="#fff"/><path d="M110 0 A110 110 0 0 1 -95 55" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round"/><path d="M-95 55 l6 40 l-40 -26 z" fill="#fff"/></g>`); }
    label3('♂️ DU', headW(male), 1, -170, -200); chip(T < WP(5, 'jeder') ? '🔄 PLÄTZE TAUSCHEN' : '🔥 WARME MITTE', 540, 470, clamp((T - WP(5, 'wechselt')) / 0.3), '#2fbf5b'); icon(true, 540, 1300, clamp((T - WP(5, 'mitte')) / 0.25)); },
  // 6: Küken schlüpft – Partnerin noch nicht zurück
  (T) => { const tS = WP(6, 'schlüpft'); const h = clamp((T - tS + 0.3) / 0.8); posePeng(male, { pos: MP, yaw: 0.2, egg: h <= 0, pouch: lerp(1, 0.25, ease(clamp((T - S[6].start) / 0.8))), headP: 0.6, T }); crowdPose(T, { center: V(0.5, 0, -5), spread: 1.2 });
    const fp = chW(male).add(V(0, 0.06, 0)); G.shell.visible = h > 0 && h < 1.5; G.shell.position.copy(fp); G.shell.rotation.y = 0.2; G.shell.userData[1].position.y = 0.06 * ease(h); G.shell.userData[1].position.x = 0.06 * ease(h); G.shell.userData[-1].position.x = -0.06 * ease(h);
    poseChick(chick, { pos: fp.clone().add(V(0, -0.06, 0)), yaw: 0.2, k: 0.9 * ease(h), beg: 0.3, T }); fr(MP, 2.6, 0.35, 0.6, 0.65, 40, T); if (T > tS) emo('✨', fp.clone().add(V(0, 0.25, 0)), clamp((T - tS) / 0.3) * clamp((tS + 1.2 - T) / 0.3), 80);
    label3('KÜKEN', fp, clamp((T - tS - 0.3) / 0.3), 200, 160); chip(T < WP(6, 'partnerin') ? '🐣 KÜKEN SCHLÜPFT' : '♀️ NOCH NICHT ZURÜCK', 540, 470, clamp((T - WP(6, 'küken')) / 0.3), T < WP(6, 'partnerin') ? '#f3c63f' : '#e8483b'); icon(false, 540, 1300, clamp((T - WP(6, 'zurück')) / 0.25)); },
  // 7: Füttern mit Milch aus der Speiseröhre – obwohl du selbst nichts gegessen hast
  (T) => { const tF = WP(7, 'fütterst'); posePeng(male, { pos: MP, yaw: 0.2, pouch: 0.25, headP: 0.95 + 0.06 * Math.sin(T * 8), T }); crowdPose(T, { center: V(0.5, 0, -5), spread: 1.2 }); const fp = chW(male); poseChick(chick, { pos: fp, yaw: 0.2, k: 0.9, beg: 1, T });
    fr(MP, 2.8, 0.6, 0.6, 0.7, 40, T); const bp = headW(male).add(V(0.02, -0.12, 0.18)); if (T > WP(7, 'milch')) for (let j = 0; j < 3; j++) { const u = (T * 1.5 + j / 3) % 1; emo('💧', bp.clone().add(V(0, -0.15 * u, 0)), 1 - u, 40); }
    label3('MILCH', bp, clamp((T - WP(7, 'milch')) / 0.3), 220, -150); const tO = WP(7, 'obwohl');
    chip(T < tO ? '🥛 PINGUIN-MILCH' : '🍽️ SEIT MONATEN NICHTS', 540, 470, clamp((T - tF) / 0.3), T < tO ? '#2fbf5b' : '#e8483b'); icon(true, 540, 1300, clamp((T - WP(7, 'speiseröhre')) / 0.25)); },
  // 8: Wie findet sie dich unter tausenden gleich aussehenden Pinguinen?
  (T) => { const u = T - S[8].start; crowdPose(T, { center: V(0, 0, -1.2), spread: 1.25 }); posePeng(male, { pos: V(0, 0, -1.2).add(crowd[0].base), vis: false }); const fp = V(lerp(4.5, 3.2, ease(clamp(u / 3))), 0, 1.6); posePeng(fem, { pos: fp, yaw: -1.9, waddle: T * 7, wk: u < 3 ? 1 : 0, headY: 0.4 * Math.sin(T * 1.5), T });
    fr(V(1.2, 0, 0), 6.5, 0.35, 2.0, 0.8, 42, T); label3('♀️ SIE', headW(fem), clamp((u - 0.3) / 0.3), 0, -220);
    crowd.forEach((p, k) => { if (k % 4 === 1 && p.base.z > -0.5) emo('❓', headW(p).add(V(0, 0.35, 0)), clamp((T - WP(8, 'tausenden') - (k % 7) * 0.08) / 0.3), 60); });
    chip('❓ WER IST ES?', 540, 470, clamp((T - WP(8, 'wie')) / 0.3), '#7fc4ff'); },
  // 9: Ihr ruft euch – jeder hat seine eigene Stimme
  (T) => { const tR = WP(9, 'ruft'); posePeng(male, { pos: V(-0.45, 0, 0), yaw: Math.PI / 2 - 0.3, pouch: 0.25, call: T > tR - 0.1 && T < tR + 1.4 ? 1 : T > WP(9, 'stimme') - 0.6 ? 0.6 : 0, T }); posePeng(fem, { pos: V(0.5, 0, 0), yaw: -Math.PI / 2 + 0.3, call: T > tR + 0.5 && T < tR + 2.2 ? 1 : 0, T });
    poseChick(chick, { pos: chW(male), yaw: Math.PI / 2 - 0.3, k: 0.9, beg: 0.5, T }); crowdPose(T, { center: V(0, 0, -4.5), spread: 1.25, call: 0.3 }); fr(V(0.02, 0, 0), 5.6, 0.05, 1.0, 1.2, 40, T);
    waves(headW(male).add(V(0.15, 0.05, 0)), T, T > tR - 0.1 && T < tR + 1.4 ? 1 : 0, '#7fc4ff'); waves(headW(fem).add(V(-0.15, 0.05, 0)), T + 0.3, T > tR + 0.5 && T < tR + 2.2 ? 1 : 0, '#ff8ab0');
    emo('❤️', V(0.07, 1.55, 0), clamp((T - WP(9, 'stimme')) / 0.3), 110); chip('🔊 EIGENE STIMME', 540, 470, clamp((T - tR) / 0.3), '#2fbf5b'); icon(true, 540, 1300, clamp((T - WP(9, 'stimme') - 0.3) / 0.25)); },
  // 10: Küken übergeben, halbes Gewicht verloren, endlich zum Meer
  (T) => { const tU = WP(10, 'übergibst'), tH = WP(10, 'hälfte'), tW = WP(10, 'watschelst'); const hk = ease(clamp((T - tU) / 1.0)); const th = ease(clamp((T - tH + 0.4) / 0.8)); const wk = clamp((T - tW + 0.3) / 0.4);
    const mp = V(-0.45, 0, 0).lerp(V(-5, 0, -14), ease(clamp((T - tW + 0.3) / 6))); const fpos = V(0.5, 0, 0); posePeng(fem, { pos: fpos, yaw: -Math.PI / 2 + 0.6, pouch: hk > 0.9 ? 0.4 : 0, T });
    posePeng(male, { pos: mp, yaw: wk > 0 ? lerp(Math.PI / 2 - 0.3, Math.atan2(-4.4, -14), clamp(wk * 2)) : Math.PI / 2 - 0.3, thin: th, waddle: T * 7, wk, pouch: wk > 0 ? 0 : 0.25, T });
    const a = chW(male), b = chW(fem); const cp = a.clone().lerp(b, hk); cp.y += Math.sin(hk * Math.PI) * 0.2; if (wk > 0) cp.copy(b); poseChick(chick, { pos: cp, yaw: lerp(Math.PI / 2, -Math.PI / 2 + 0.6, hk), k: 0.9, T }); crowdPose(T, { center: V(0, 0, -4.5), spread: 1.25 });
    fr(V(-0.3, 0, -0.5), lerp(5.0, 6.8, clamp((T - tW) / 4)), -0.35, 1.3, 1.0, 40, T); label3('-45 % GEWICHT', headW(male), clamp((T - tH) / 0.3) * clamp((tW + 1.5 - T) / 0.3), -60, -230);
    chip(T < tH ? '👶 ÜBERGABE' : T < tW ? '⚖️ FAST HALB SO SCHWER' : '🌊 ENDLICH FRESSEN', 540, 470, clamp((T - tU) / 0.3), T < tW ? '#f3c63f' : '#2fbf5b'); icon(true, 540, 1300, clamp((T - WP(10, 'fressen')) / 0.25)); },
  // 11: Glückwunsch – Kaiserpinguin
  (T) => { const u = T - S[11].start; posePeng(fem, { pos: V(0, 0, 0), yaw: 0.3, pouch: 0.4, headP: 0.2 * Math.sin(T), T }); poseChick(chick, { pos: chW(fem), yaw: 0.3, k: 0.9, beg: 0.3 + 0.3 * Math.sin(T * 2), T }); crowdPose(T, { center: V(0, 0, -4.5), spread: 1.3 });
    const a = 0.1 + u * 0.18; cam(V(Math.sin(a) * 4.2, 1.1, Math.cos(a) * 4.2), V(0, 1.15, 0), 40, T, 0.003); cta.style.display = T > WP(11, 'gebaut') ? 'block' : 'none';
    chip('🐧 KAISERPINGUIN', 540, 470, clamp((T - WP(11, 'kaiserpinguin')) / 0.3), '#2fbf5b'); },
];
shots.forEach((f, i) => { shots[i] = T => { stage(i, T); f(T); }; });
