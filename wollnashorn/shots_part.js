// ---------- Helfer ----------
const flash = (k, col = '255,40,30') => { if (k > 0) svg.push(`<rect x="0" y="0" width="1080" height="1920" fill="rgba(${col},${(0.35 * k).toFixed(3)})"/>`); };
function chip(text, x, y, k, col = '#f3c63f') { if (k <= 0) return; ui.push(`<div class="pill" style="left:${x}px;top:${y}px;border-color:${col};transform:translate(-50%,-50%) scale(${back(k)})">${text}</div>`); }
function icon(ok, x, y, k) { if (k <= 0) return; const s = back(k);
  svg.push(`<g transform="translate(${x},${y}) scale(${s})"><circle r="62" fill="${ok ? '#2fbf5b' : '#fff'}" stroke="#000" stroke-width="9"/>` + (ok ? '<path d="M-30 2 L-8 24 L32 -22" fill="none" stroke="#fff" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>' : '<path d="M-27 -27 L27 27 M27 -27 L-27 27" stroke="#e8323c" stroke-width="17" stroke-linecap="round"/>') + '</g>'); }
function ring(p, k, col = '#e8323c', r0 = 70) { if (k <= 0) return; const [x, y] = proj(p); svg.push(`<circle cx="${x}" cy="${y}" r="${(r0 * back(k)).toFixed(1)}" fill="none" stroke="${col}" stroke-width="9"/>`); }
function arrowDown(p, k, T) { if (k <= 0) return; const [x, y] = proj(p); const o = 12 * Math.sin(T * 6); svg.push(`<g transform="translate(${x},${y - 230 + o}) scale(${back(k)})"><path d="M-26 -90 H26 V0 H62 L0 80 L-62 0 H-26 Z" fill="#e8323c" stroke="#000" stroke-width="8"/></g>`); }
function camFix(pos, look, fov = 40) { LOOK = look.clone(); camera.position.copy(pos); camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(look); camera.updateMatrixWorld(true); }
const WP = (i, pre, n) => WT(i, pre, n);
const graze = (T, extra = {}) => poseQ(rhino, Object.assign({ pos: P0, yaw: 0, neckP: -0.45, headP: 0.75, T }, extra));
function grit(o, T, k) { G.grit.visible = k > 0; if (k <= 0) return; const a = G.grit.geometry.attributes.position.array, r = rng(2); for (let i = 0; i < G.grit.userData.n; i++) { const ph = (T * 0.8 + r()) % 1; a[i * 3] = o.x + (r() - 0.5) * 0.25; a[i * 3 + 1] = o.y + 0.25 - ph * 0.35; a[i * 3 + 2] = o.z + (r() - 0.5) * 0.4; } G.grit.geometry.attributes.position.needsUpdate = true; }

// ---------- Reset ----------
function resetWorld() { rex.root.visible = false; ui = []; svg = []; badge.style.display = 'none'; cta.style.display = 'none'; }
function stage(i, T) {
  mood('snow'); sunAt(V(0, 0, 0)); groundMode(true); ground.visible = sky.visible = true; world.visible = false; GRASS.visible = false; ice.visible = true; scene.background = null; scene.fog.near = 15; scene.fog.far = 140;
  G.patch.visible = G.cover.visible = i <= 1; coverSet(i === 0 ? 0 : 1); snowfall(P0, T, 0); spray(P0, T, V(0, 0, 0), 0); grit(P0, T, 0); G.car.visible = false; G.cave.visible = i === 11; G.iceBox.visible = false;
  [rhino, cavelion, ...wolves].forEach(q => poseQ(q, { vis: false }));
}
const shots = [
  // 0: Eiszeit – Futter monatelang unter dicker Schneedecke
  (T) => { badge.style.display = T < 2.4 ? 'block' : 'none'; mood('blizzard'); scene.fog.near = 4; scene.fog.far = 45; snowfall(P0, T, 1, 1.5); const tS = WP(0, 'schneedecke');
    poseQ(rhino, { pos: V(lerp(-1.2, 0, ease(T / 4.5)), 0, 0), yaw: 0.2, neckP: -0.35, headP: 0.6, walk: T * 2.5, walkK: 1 - clamp(T / 4.5), horn: 0.3, T });
    camFix(V(4.2 - T * 0.1, 1.9, 6.4), V(0.2, 0.9, 1.0), 44); ring(G.GP.clone().add(V(0, 0.05, 0)), clamp((T - WP(0, 'futter')) / 0.3), '#e8323c', 120); label3('GRAS', G.GP, clamp((T - WP(0, 'futter')) / 0.3), 160, 220);
    chip('❄️ EISZEIT', 540, 470, clamp((T - 0.1) / 0.25), '#7fc4ff'); icon(false, 540, 1340, clamp((T - tS) / 0.25)); },
  // 1: Riesiges flaches Horn – Schnee zur Seite schieben
  (T) => { const tH = WP(1, 'horn'), tSch = WP(1, 'schnee'); const h = lerp(0.3, 1, ease(clamp((T - WP(1, 'riesiges')) / 1.0))); const sw = T > tSch - 0.3; const ny = sw ? Math.sin((T - tSch) * 4.5) * 0.45 : 0;
    graze(T, { horn: h, neckY: ny }); coverSet(sw ? ease(clamp((T - tSch + 0.3) / 2.0)) : 0); if (sw) { rhino.root.updateMatrixWorld(true); const hp = rhino.horn.getWorldPosition(V(0, 0, 0)); spray(V(hp.x, 0.05, hp.z), T, V(Math.sign(Math.cos((T - tSch) * 4.5)) || 1, 0, 0.3), 1); }
    camFix(V(3.4, 1.4, 5.0), V(0.2, 0.6, 1.6), 42); rhino.root.updateMatrixWorld(true); label3('FLACHES HORN', rhino.hornMesh.getWorldPosition(V(0, 0, 0)), clamp((T - tH) / 0.3), -150, -260);
    chip('🦏 SCHNEESCHIEBER', 540, 470, clamp((T - tSch) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - WP(1, 'schiebst')) / 0.25)); },
  // 2: Minus 30 Grad – Haut und Ohren frieren fast ab
  (T) => { mood('blizzard'); scene.fog.near = 4; scene.fog.far = 45; snowfall(P0, T, 1, 1.5); const fr = ease(clamp((T - WP(2, 'frieren')) / 1.2));
    poseQ(rhino, { pos: P0, yaw: 0.5, neckP: -0.1, headP: 0.35, fur: 0, ear: 2.4, tailS: 1.8, frost: 0.6 * fr, T }); camFix(V(3.6, 1.6, 4.6), V(0.4, 1.0, 0.4), 42);
    rhino.root.updateMatrixWorld(true); rhino.ears.forEach((e, k) => ring(e.getWorldPosition(V(0, 0, 0)), clamp((T - WP(2, 'ohren') - k * 0.1) / 0.3), '#7fc4ff', 50));
    chip('🥶 −30 °C', 540, 470, clamp((T - WP(2, 'minus')) / 0.3), '#7fc4ff'); icon(false, 540, 1340, clamp((T - WP(2, 'ab', 1)) / 0.25)); },
  // 3: Dichtes langes Fell – Ohren und Schwanz bleiben klein
  (T) => { mood('blizzard'); scene.fog.near = 4; scene.fog.far = 45; snowfall(P0, T, 1, 1.5); const f = ease(clamp((T - WP(3, 'dichtes') + 0.2) / 1.2)); const sm = ease(clamp((T - WP(3, 'ohren')) / 1.0));
    poseQ(rhino, { pos: P0, yaw: 0.5, neckP: -0.1, headP: 0.35, fur: f, ear: lerp(2.4, 0.8, sm), tailS: lerp(1.8, 0.6, sm), T }); camFix(V(3.6, 1.6, 4.6), V(0.4, 1.0, 0.4), 42);
    label3('KLEINE OHREN', rhino.ears[1].getWorldPosition(V(0, 0, 0)), clamp((T - WP(3, 'ohren') - 0.3) / 0.3), -100, -240);
    chip('🧥 LANGES FELL', 540, 470, clamp((T - WP(3, 'fell')) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - WP(3, 'klein')) / 0.25)); },
  // 4: Gefrorenes Steppengras voller Sand – schleift die Zähne ab
  (T) => { const tS = WP(4, 'sand'), tZ = WP(4, 'zähne'); graze(T, { xray: 0.75, teeth: 1, toothH: lerp(0.6, 0.12, ease(clamp((T - tZ + 0.3) / 1.3))), headP: 0.7 + 0.05 * Math.sin(T * 9) });
    const hw = headW(rhino); camFix(hw.clone().add(V(3.0, 0.35, 0.3)), hw.clone().add(V(0, -0.15, 0.3)), 38); grit(hw.clone().add(V(0, -0.2, 0.3)), T, clamp((T - tS) / 0.3));
    label3('ZÄHNE', rhino.mol[2].getWorldPosition(V(0, 0, 0)), clamp((T - tZ) / 0.3), 180, 260); chip('🪨 SAND IM GRAS', 540, 470, clamp((T - tS) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - WP(4, 'ab', 1)) / 0.25)); },
  // 5: Backenzähne extra hoch – immer genug zum Mahlen
  (T) => { const tB = WP(5, 'backenzähne'); graze(T, { xray: 0.75, teeth: 1, toothH: lerp(0.12, 1.5, ease(clamp((T - tB) / 1.2))), headP: 0.7 + 0.05 * Math.sin(T * 9) });
    const hw = headW(rhino); camFix(hw.clone().add(V(3.0, 0.35, 0.3)), hw.clone().add(V(0, -0.15, 0.3)), 38); grit(hw.clone().add(V(0, -0.2, 0.3)), T, 1);
    label3('HOHE ZÄHNE', rhino.mol[2].getWorldPosition(V(0, 0, 0)), clamp((T - WP(5, 'hoch')) / 0.3), 180, 260); chip('🦷 EXTRA HOCH', 540, 470, clamp((T - WP(5, 'hoch')) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - WP(5, 'übrig')) / 0.25)); },
  // 6: Der schwere Kopf hängt den ganzen Tag am Boden
  (T) => { const tK = WP(6, 'kopf'); graze(T, { hump: 0.15, neckP: -0.6 - 0.05 * Math.sin(T * 2), headP: 0.8 }); camFix(V(1.4, 1.3, 6.2), V(0.6, 0.8, 0.4), 42);
    arrowDown(headW(rhino), clamp((T - tK) / 0.3), T); chip('🏋️ SCHWERER KOPF', 540, 470, clamp((T - WP(6, 'schwerer')) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - WP(6, 'boden')) / 0.25)); },
  // 7: Dicker Muskelbuckel im Nacken trägt ihn mühelos
  (T) => { const tM = WP(7, 'muskelbuckel'); const h = ease(clamp((T - tM + 0.3) / 1.0)); graze(T, { hump: lerp(0.15, 1.15, h) }); camFix(V(1.4, 1.3, 6.2), V(0.6, 0.8, 0.4), 42);
    rhino.root.updateMatrixWorld(true); const hp = rhino.hump.getWorldPosition(V(0, 0, 0)).add(V(0, 0.4, 0)); ring(hp, clamp((T - tM) / 0.3), '#2fbf5b', 120); label3('MUSKELBUCKEL', hp, clamp((T - tM) / 0.3), 140, -230);
    chip('💪 MUSKELBUCKEL', 540, 470, clamp((T - tM) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - WP(7, 'trägt')) / 0.25)); },
  // 8: Höhlenlöwen und Wolfsrudel lauern
  (T) => { const t0 = S[8].start; const k = ease(clamp((T - t0) / 3.2)); graze(T, { neckP: -0.1, headP: 0.3, neckY: 0.4 });
    poseQ(cavelion, { pos: V(lerp(-3.0, -1.2, k), 0, lerp(4.2, 3.4, k)), yaw: 1.9, walk: T * 3.5, walkK: 0.6, crouch: 0.6, neckP: 0.1, headP: 0, T });
    wolves.forEach((w, j) => poseQ(w, { pos: V(lerp(2.6, 0.9, k) + j * 0.45, 0, lerp(4.2, 3.2, k) + j * 0.6), yaw: -2.0 - j * 0.15, walk: T * 6 + j, walkK: 0.9, neckP: 0.1, headP: 0.1, T }));
    camFix(V(-0.2, 2.4, 8.5), V(-0.3, 0.6, 1.8), 50); label3('HÖHLENLÖWE', headW(cavelion), clamp((T - WP(8, 'höhlenlöwen')) / 0.3), 0, -200); label3('WÖLFE', headW(wolves[0]), clamp((T - WP(8, 'wolfsrudel')) / 0.3), 0, -200);
    chip('⚠️ RAUBTIERE', 540, 470, clamp((T - WP(8, 'höhlenlöwen')) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - WP(8, 'tier')) / 0.25)); },
  // 9: So groß wie ein Auto, fast so schwer wie zwei – Horn als Waffe
  (T) => { const tA = WP(9, 'auto'), tH = WP(9, 'horn'); const charge = ease(clamp((T - tH + 0.2) / 0.9)); G.car.visible = T < tH - 0.1; G.car.position.set(-2.4, 0, 0.2); G.car.scale.setScalar(back(clamp((T - tA + 0.3) / 0.4)) + 1e-3);
    poseQ(rhino, { pos: V(lerp(0.4, -1.4, charge), 0, lerp(0, 1.2, charge)), yaw: lerp(0, -0.9, charge), neckP: lerp(-0.1, -0.35, charge), headP: 0.5, walk: T * 7, walkK: charge > 0 && charge < 1 ? 1 : 0, T });
    const lk = clamp((T - tH - 0.2) / 1.0); poseQ(cavelion, { pos: V(lerp(-3.4, -5.5, ease(lk)), 0, lerp(2.4, 3.8, ease(lk))), yaw: lk > 0 ? -1.2 + Math.PI : 1.9, walk: T * 9, walkK: lk > 0 ? 1 : 0, neckP: 0.1, headP: 0, T, vis: T > tH - 0.6 });
    camFix(V(0.6, 2.0, 8.6), V(-0.8, 0.9, 0.6), 46); chip(T < WP(9, 'schwer') ? '🚗 SO GROSS WIE EIN AUTO' : T < tH ? '⚖️ FAST 2 AUTOS SCHWER' : '⚔️ HORN = WAFFE', 540, 470, clamp((T - tA + 0.2) / 0.3), '#f3c63f'); icon(true, 540, 1340, clamp((T - WP(9, 'waffe')) / 0.25)); },
  // 10: Ende der Eiszeit – es wird warm, die Grassteppe verschwindet
  (T) => { const tW = WP(10, 'warm'), tV = WP(10, 'verschwindet'); const w = T > tW - 0.2; if (w) { mood('warm'); groundMode(false); ice.visible = false; world.visible = true; GRASS.visible = true; }
    poseQ(rhino, { pos: P0, yaw: 0.6, neckP: 0.0, headP: 0.3, neckY: Math.sin(T * 1.5) * 0.4, T }); camFix(V(3.8, 1.8, 5.6), V(0.2, 1.0, 0.0), 44);
    chip(w ? '🌲 WALD STATT STEPPE' : '🌡️ ES WIRD WARM', 540, 470, clamp((T - WP(10, 'eiszeit')) / 0.3), '#e8483b'); icon(false, 540, 1340, clamp((T - tV) / 0.25)); },
  // 11: Heute nur noch aus Höhlenmalereien und dem gefrorenen Boden Sibiriens
  (T) => { const tM = WP(11, 'höhlenmalereien'), tG = WP(11, 'gefrorenen'); const second = T > tG - 0.2;
    if (!second) { mood('cave'); scene.background = new THREE.Color(0x0e0a08); sky.visible = ground.visible = false; ice.visible = false; G.torch.intensity = 30 + 5 * Math.sin(T * 13) + 3 * Math.sin(T * 7.3);
      camFix(G.CAVE.clone().add(V(0.3 - (T - S[11].start) * 0.08, 2.0, 3.2)), G.CAVE.clone().add(V(0, 2.1, -1)), 46); chip('🎨 HÖHLENMALEREI', 540, 470, clamp((T - tM) / 0.3), '#f3c63f'); }
    else { mood('snow'); G.cave.visible = false; G.iceBox.visible = true; poseQ(rhino, { pos: G.ICE.clone().add(V(0, 0.15, 0)), yaw: Math.PI / 2, lie: 1, neckP: -0.1, headP: 0.3, frost: 0.55, eyes: 0, T });
      camFix(G.ICE.clone().add(V(0.8, 1.6, 5.4)), G.ICE.clone().add(V(0, 0.9, 0)), 44); chip('🧊 SIBIRIEN', 540, 470, clamp((T - tG) / 0.3), '#7fc4ff'); } },
  // 12: Glückwunsch – Wollnashorn
  (T) => { mood('dusk'); const u = T - S[12].start; snowfall(P0, T, 0.6, 1); graze(T, { neckY: Math.sin(T * 2) * 0.3 }); coverSet(1); const a = 0.5 + u * 0.14;
    cam(V(Math.sin(a) * 6.5, lerp(1.6, 2.3, ease(u / 3)), Math.cos(a) * 6.5), V(0, 0.9, 0.3), 44, T, 0.004); cta.style.display = T > WP(12, 'gebaut') ? 'block' : 'none';
    chip('🦏 WOLLNASHORN', 540, 470, clamp((T - WP(12, 'wollnashorn')) / 0.3), '#f3c63f'); },
];
shots.forEach((f, i) => { shots[i] = T => { stage(i, T); f(T); }; });
