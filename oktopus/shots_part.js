// ---------- Helfer ----------
const flash = (k, col = '255,40,30') => { if (k > 0) svg.push(`<rect x="0" y="0" width="1080" height="1920" fill="rgba(${col},${(0.35 * k).toFixed(3)})"/>`); };
function chip(text, x, y, k, col = '#f3c63f') { if (k <= 0) return; ui.push(`<div class="pill" style="left:${x}px;top:${y}px;border-color:${col};transform:translate(-50%,-50%) scale(${back(k)})">${text}</div>`); }
function icon(ok, x, y, k) { if (k <= 0) return; const s = back(k);
  svg.push(`<g transform="translate(${x},${y}) scale(${s})"><circle r="62" fill="${ok ? '#2fbf5b' : '#fff'}" stroke="#000" stroke-width="9"/>` + (ok ? '<path d="M-30 2 L-8 24 L32 -22" fill="none" stroke="#fff" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>' : '<path d="M-27 -27 L27 27 M27 -27 L-27 27" stroke="#e8323c" stroke-width="17" stroke-linecap="round"/>') + '</g>'); }
function ring(p, k, col = '#e8323c', r0 = 70) { if (k <= 0) return; const [x, y] = proj(p); svg.push(`<circle cx="${x}" cy="${y}" r="${(r0 * back(k)).toFixed(1)}" fill="none" stroke="${col}" stroke-width="9"/>`); }
function txt3(t, p, k, size = 70, col = '#fff') { if (k <= 0) return; const [x, y] = proj(p); svg.push(`<text x="${x}" y="${y}" text-anchor="middle" font-family="M,'Noto Color Emoji'" font-weight="900" font-size="${(size * back(k)).toFixed(1)}" fill="${col}" stroke="#000" stroke-width="9" paint-order="stroke">${t}</text>`); }
function camFix(pos, look, fov = 40) { LOOK = look.clone(); camera.position.copy(pos); camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(look); camera.updateMatrixWorld(true); }
const WP = (i, pre, n) => WT(i, pre, n);
const FP = (x, z, dy = 0) => V(x, bedY(x, z) + dy, z);
const O0 = FP(0.6, 0.4);

// ---------- Reset ----------
function resetWorld() { rex.root.visible = false; ui = []; svg = []; badge.style.display = 'none'; cta.style.display = 'none'; }
function stage(i, T) {
  UTIME.value = T; underwater(0.5); shaftsUpdate(T, 0); ground.visible = world.visible = false; GRASS.visible = false; E.zap.intensity = 0; E.motes.position.set(Math.sin(T * 0.2) * 0.1, Math.sin(T * 0.3) * 0.05, T * 0.02);
  poseOkto(okto, { vis: false }); poseShark(shark, { vis: false }); poseCrab(crab, { vis: false }); poseFish(prey, { vis: false }); poseFish(pred, { vis: false }); fishSet([]); bubSet([]); eggsSet(V(0, 0, 0), 0); inkSet(V(0, 0, 0), 0);
}
const shots = [
  // 0: Kein Panzer, keine Knochen – nur ein weicher Körper
  (T) => { badge.style.display = T < 2.4 ? 'block' : 'none'; const tK = WP(0, 'knochen'); poseOkto(okto, { pos: O0, yaw: 0.4, T, wob: T > tK - 0.3 ? 1 : 0.3 });
    camFix(V(O0.x + 0.45 - T * 0.03, O0.y + 0.55, O0.z + 1.35), V(O0.x, O0.y + 0.38, O0.z), 42);
    chip('🌊 MEERESGRUND', 540, 470, clamp((T - 0.1) / 0.25), '#7fc4ff'); chip('🦴 KEINE KNOCHEN', 540, 1340, clamp((T - tK) / 0.3) * clamp((WP(0, 'körper') - T) / 0.2 + 1e-3), '#e8483b');
    icon(false, 540, 1340, clamp((T - WP(0, 'körper')) / 0.25)); },
  // 1: Durch jede Spalte, die größer ist als der Schnabel
  (T) => { const t0 = S[1].start, tS = WP(1, 'schnabel'); const R = G.REEF; const k = clamp((T - t0) / (tS - t0 + 0.6)); const z = lerp(R.z + 0.9, R.z - 0.7, ease(k)); const sq = clamp(1 - Math.abs(z - R.z) / 0.45);
    poseOkto(okto, { pos: FP(R.x, z, 0.0), yaw: Math.PI, mode: 'jet', squeeze: ease(sq), T }); camFix(V(R.x + 0.5, bedY(R.x, R.z) + 1.0, R.z + 1.9), V(R.x, bedY(R.x, R.z) + 0.2, R.z), 42);
    const hp = oktoHead(); ring(hp.clone().add(V(0, -0.08, 0)), clamp((T - tS) / 0.3), '#f3c63f', 40); label3('SCHNABEL', hp.clone().add(V(0, -0.08, 0)), clamp((T - tS) / 0.3), 200, -220);
    chip('🫠 DURCH JEDE SPALTE', 540, 470, clamp((T - WP(1, 'spalte')) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - tS - 0.2) / 0.25)); },
  // 2: Auf dem Sand sieht dich jeder Hai sofort
  (T) => { const t0 = S[2].start, tH = WP(2, 'hai'); poseOkto(okto, { pos: O0, yaw: 0.4, T }); const sx = lerp(-4, 1.5, clamp((T - t0 + 0.5) / 3.5)); poseShark(shark, { pos: V(sx, O0.y + 1.1, O0.z - 1.2), yaw: Math.PI / 2, T });
    camFix(V(O0.x + 0.5, O0.y + 0.4, O0.z + 2.4), V(O0.x - 0.2, O0.y + 0.6, O0.z - 0.6), 46); ring(oktoHead(), clamp((T - WP(2, 'sofort')) / 0.3), '#e8323c', 110);
    chip('🦈 HAI', 540, 470, clamp((T - tH) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - WP(2, 'sofort')) / 0.25)); },
  // 3: Farbe und Hautstruktur in Sekundenbruchteilen ändern
  (T) => { const tF = WP(3, 'farbe'), tSt = WP(3, 'struktur'); const c = ease(clamp((T - WP(3, 'sekundenbruchteilen')) / 0.6)); poseOkto(okto, { pos: O0, yaw: 0.4, T, camo: c, eye: 0.6 });
    camFix(V(O0.x + 0.6, O0.y + 0.55, O0.z + 1.3), V(O0.x, O0.y + 0.35, O0.z), 40);
    chip(T < tSt ? '🎨 TARNFARBE' : '🪨 HAUTSTRUKTUR', 540, 470, clamp((T - tF + 0.4) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - WP(3, 'haut')) / 0.25)); },
  // 4: Ein Hai hat dich trotzdem entdeckt
  (T) => { const t0 = S[4].start, tE = WP(4, 'entdeckt'); poseOkto(okto, { pos: O0, yaw: 0.4, T, camo: 1, eye: 0.6 }); const k = ease(clamp((T - t0) / 1.6));
    poseShark(shark, { pos: V(lerp(O0.x - 1.8, O0.x - 0.4, k), O0.y + lerp(1.0, 0.55, k), lerp(O0.z - 1.0, O0.z - 1.4, k)), yaw: lerp(Math.PI / 2, 0.5, k), T });
    camFix(V(O0.x + 1.1, O0.y + 0.5, O0.z + 2.0), V(O0.x - 0.4, O0.y + 0.45, O0.z - 0.6), 46); txt3('!', shark.root.position.clone().add(V(0, 0.55, 0)), clamp((T - tE) / 0.3), 130, '#ff3b3b');
    chip('👀 ENTDECKT', 540, 470, clamp((T - tE) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - tE - 0.2) / 0.25)); },
  // 5: Tintenwolke ins Gesicht – per Rückstoß davon
  (T) => { const tT = WP(5, 'tintenwolke'), tR = WP(5, 'schießt'); const go = ease(clamp((T - tR + 0.3) / 1.3)); const P = O0.clone().add(V(1.8 * go, 0.25 * Math.sin(go * Math.PI) + 0.1 * go, 0.4 * go));
    poseOkto(okto, { pos: P, yaw: Math.PI / 2 - 0.2, mode: go > 0 ? 'jet' : 'sit', T }); inkSet(O0.clone().add(V(-0.05, 0.25, 0)), clamp((T - tT + 0.1) / 1.2), V(-1, 0.2, 0));
    poseShark(shark, { pos: V(O0.x - 0.6, O0.y + 0.55, O0.z - 1.3), yaw: 0.5 + 0.3 * Math.sin(T * 4) * clamp(T - tT), T });
    camFix(V(O0.x + 1.0, O0.y + 0.6, O0.z + 2.6), V(O0.x + 0.4, O0.y + 0.35, O0.z - 0.3), 48);
    chip(T < tR ? '🖤 TINTENWOLKE' : '🚀 RÜCKSTOSS', 540, 470, clamp((T - tT) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - WP(5, 'davon')) / 0.25)); },
  // 6: Blut muss durch Kiemen und Körper gleichzeitig
  (T) => { poseOkto(okto, { pos: O0, yaw: 0.4, T, xray: clamp((T - S[6].start) / 0.4), flow: 1 }); camFix(V(O0.x + 0.35, O0.y + 0.5, O0.z + 1.05), V(O0.x, O0.y + 0.18, O0.z), 40);
    chip('🩸 KIEMEN + KÖRPER', 540, 470, clamp((T - WP(6, 'kiemen')) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - WP(6, 'körper')) / 0.25)); },
  // 7: Drei Herzen, blaues Blut
  (T) => { const tH = WP(7, 'herzen'), tB = WP(7, 'blau'); poseOkto(okto, { pos: O0, yaw: 0.4, T, xray: 1, flow: 1 }); camFix(V(O0.x + 0.3, O0.y + 0.45, O0.z + 0.85), V(O0.x, O0.y + 0.2, O0.z), 40);
    okto.root.updateMatrixWorld(true); okto.hearts.forEach((h, k) => ring(h.getWorldPosition(V(0, 0, 0)), clamp((T - tH - k * 0.12) / 0.3), '#ff4f78', 40));
    chip(T < tB ? '❤️❤️❤️ 3 HERZEN' : '🔵 BLAUES BLUT', 540, 470, clamp((T - WP(7, 'drei')) / 0.3), T < tB ? '#ff4f78' : '#4a9aff'); icon(true, 540, 1340, clamp((T - tB - 0.2) / 0.25)); },
  // 8: Mit zwei Augen nicht in jede Ritze gleichzeitig
  (T) => { const R = G.REEF; const P = FP(R.x, R.z + 0.75); poseOkto(okto, { pos: P, yaw: Math.PI, T, eye: 1 }); camFix(V(R.x + 0.5, P.y + 0.75, R.z + 2.1), V(R.x, P.y + 0.3, R.z), 44);
    const spots = [V(R.x, P.y + 0.3, R.z + 0.2), V(R.x - 0.75, P.y + 0.15, R.z + 0.45), V(R.x + 0.75, P.y + 0.2, R.z + 0.45), V(R.x - 0.4, P.y + 0.6, R.z + 0.35), V(R.x + 0.45, P.y + 0.55, R.z + 0.35)];
    spots.forEach((s, k) => txt3('?', s, clamp((T - WP(8, 'ritze') - k * 0.08) / 0.3), 80));
    chip('👀 NUR 2 AUGEN', 540, 470, clamp((T - WP(8, 'augen')) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - WP(8, 'schauen')) / 0.25)); },
  // 9: Zwei Drittel der Nervenzellen in den Armen – jeder Arm tastet und schmeckt
  (T) => { const R = G.REEF; const P = FP(R.x, R.z + 0.75); const reach = ease(clamp((T - S[9].start) / 1.0));
    const tg = [V(R.x - 0.75, P.y + 0.15, R.z + 0.42), V(R.x - 0.4, P.y + 0.6, R.z + 0.32), V(R.x, P.y + 0.3, R.z + 0.15), V(R.x + 0.45, P.y + 0.55, R.z + 0.32), V(R.x + 0.75, P.y + 0.2, R.z + 0.42)];
    const targets = []; [4, 5, 6, 7, 3].forEach((a, k) => targets[a] = P.clone().add(V(0, 0.1, 0)).lerp(tg[k], reach)); poseOkto(okto, { pos: P, yaw: Math.PI, T, targets });
    camFix(V(R.x + 0.5, P.y + 0.75, R.z + 2.1), V(R.x, P.y + 0.3, R.z), 44); [4, 5, 6, 7, 3].forEach((a, k) => txt3('🧠', okto.curves[a].getPoint(0.6).applyMatrix4(okto.root.matrixWorld), clamp((T - WP(9, 'armen') - k * 0.1) / 0.3), 54));
    chip('🧠 ⅔ IN DEN ARMEN', 540, 470, clamp((T - WP(9, 'nervenzellen')) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - WP(9, 'schmeckt')) / 0.25)); },
  // 10: Krabbe im Panzer – schwer zu knacken
  (T) => { const t0 = S[10].start; const cp = O0.clone().add(V(lerp(0.9, 0.55, clamp((T - t0) / 2)), 0, 0.35)); poseCrab(crab, { pos: cp, yaw: -1.2, T, walk: 1 }); poseOkto(okto, { pos: O0, yaw: 0.4, T });
    camFix(V(O0.x + 0.9, O0.y + 0.5, O0.z + 1.6), V(O0.x + 0.35, O0.y + 0.35, O0.z + 0.2), 42); ring(cp.clone().add(V(0, 0.07, 0)), clamp((T - WP(10, 'panzer')) / 0.3), '#e8323c', 70);
    chip('🦀 HARTER PANZER', 540, 470, clamp((T - WP(10, 'krabbe')) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - WP(10, 'knacken')) / 0.25)); },
  // 11: Mit dem Schnabel zubeißen und mit Gift lähmen
  (T) => { const t0 = S[11].start, tS = WP(11, 'schnabel'), tG = WP(11, 'gift'); const g = ease(clamp((T - t0) / 1.0)); const cp = O0.clone().add(V(lerp(0.55, 0.05, g), 0, lerp(0.35, 0.05, g)));
    poseCrab(crab, { pos: cp, yaw: -1.2, T, walk: T < tG ? 1 : 0, roll: T > tG ? 0.4 : 0 }); const targets = []; [0, 1, 7].forEach(a => targets[a] = cp.clone().add(V(0, 0.08, 0))); poseOkto(okto, { pos: O0, yaw: 0.4, T, targets, wob: 0.4 });
    camFix(V(O0.x + 0.8, O0.y + 0.45, O0.z + 1.3), V(O0.x + 0.15, O0.y + 0.33, O0.z + 0.1), 40); if (T > tG) txt3('☠️', cp.clone().add(V(0, 0.3, 0)), clamp((T - tG) / 0.3), 80);
    chip(T < tG ? '🦜 SCHNABEL' : '☠️ GIFT', 540, 470, clamp((T - tS) / 0.3), T < tG ? '#f3c63f' : '#2fbf5b'); icon(true, 540, 1340, clamp((T - tG - 0.2) / 0.25)); },
  // 12: Ein Fisch reißt dir einen Arm ab
  (T) => { const t0 = S[12].start, tA = WP(12, 'ab', 1); const cut = T > tA - 0.15; const al = []; al[1] = cut ? 0.22 : 1; poseOkto(okto, { pos: O0, yaw: 0.4, T, armLen: al });
    const tip = armTip(1); const fk = ease(clamp((T - t0) / (tA - t0))); const fp = cut ? tip.clone().add(V(0.4 + (T - tA) * 1.2, 0.15 + (T - tA) * 0.3, 0.3)) : V(tip.x + lerp(1.2, 0.12, fk), tip.y + 0.12, tip.z + lerp(0.6, 0.05, fk));
    poseFish(pred, { pos: fp, yaw: cut ? 1.0 : -2.0, tail: T * 18 }); if (cut) flash(clamp(1 - (T - tA) / 0.3)); camFix(V(O0.x + 0.9, O0.y + 0.55, O0.z + 1.7), V(O0.x + 0.2, O0.y + 0.38, O0.z + 0.1), 44);
    chip('🐟 ARM AB', 540, 470, clamp((T - tA) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - tA - 0.1) / 0.25)); },
  // 13: Der Arm wächst einfach wieder nach
  (T) => { const t0 = S[13].start; const al = []; al[1] = lerp(0.22, 1, ease(clamp((T - t0) / 1.4))); poseOkto(okto, { pos: O0, yaw: 0.4, T, armLen: al }); camFix(V(O0.x + 0.9, O0.y + 0.55, O0.z + 1.7), V(O0.x + 0.2, O0.y + 0.38, O0.z + 0.1), 44);
    label3('NEU', armTip(1), clamp((T - WP(13, 'wächst')) / 0.3), 150, -200); chip('🔁 WÄCHST NACH', 540, 470, clamp((T - WP(13, 'wächst')) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - WP(13, 'nach')) / 0.25)); },
  // 14: Glückwunsch – Oktopus
  (T) => { const u = T - S[14].start; poseOkto(okto, { pos: O0, yaw: 0.4 + u * 0.1, T }); const a = 0.3 + u * 0.18;
    cam(V(O0.x + Math.sin(a) * 1.6, O0.y + lerp(0.6, 0.85, ease(u / 3)), O0.z + Math.cos(a) * 1.6), O0.clone().add(V(0, 0.38, 0)), 44, T, 0.003); cta.style.display = T > WP(14, 'gebaut') ? 'block' : 'none';
    chip('🐙 OKTOPUS', 540, 470, clamp((T - WP(14, 'oktopus')) / 0.3), '#f3c63f'); },
];
shots.forEach((f, i) => { shots[i] = T => { stage(i, T); f(T); plantHide(); }; });
