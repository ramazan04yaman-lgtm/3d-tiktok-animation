// ---------- Helfer ----------
const flash = (k, col = '255,40,30') => { if (k > 0) svg.push(`<rect x="0" y="0" width="1080" height="1920" fill="rgba(${col},${(0.35 * k).toFixed(3)})"/>`); };
function chip(text, x, y, k, col = '#f3c63f') { if (k <= 0) return; ui.push(`<div class="pill" style="left:${x}px;top:${y}px;border-color:${col};transform:translate(-50%,-50%) scale(${back(k)})">${text}</div>`); }
function icon(ok, x, y, k) { if (k <= 0) return; const s = back(k);
  svg.push(`<g transform="translate(${x},${y}) scale(${s})"><circle r="62" fill="${ok ? '#2fbf5b' : '#fff'}" stroke="#000" stroke-width="9"/>` + (ok ? '<path d="M-30 2 L-8 24 L32 -22" fill="none" stroke="#fff" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>' : '<path d="M-27 -27 L27 27 M27 -27 L-27 27" stroke="#e8323c" stroke-width="17" stroke-linecap="round"/>') + '</g>'); }
function waves(p, k, T, dir = 1) { if (k <= 0) return; const [x, y] = proj(p); for (let i = 0; i < 3; i++) { const ph = (T * 2.2 + i / 3) % 1; const r = 40 + ph * 120; const op = k * (1 - ph);
    svg.push(`<path d="M${x + dir * r * 0.5} ${y - r * 0.8} A${r} ${r} 0 0 ${dir > 0 ? 1 : 0} ${x + dir * r * 0.5} ${y + r * 0.8}" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity="${op.toFixed(2)}" transform="translate(${dir * 30},-20)"/>`); } }
function ring(p, k, col = '#e8323c') { if (k <= 0) return; const [x, y] = proj(p); svg.push(`<circle cx="${x}" cy="${y}" r="${(70 * back(k)).toFixed(1)}" fill="none" stroke="${col}" stroke-width="9"/>`); }
function bolt(p, k) { if (k <= 0) return; const [x, y] = proj(p); svg.push(`<g transform="translate(${x},${y - 60}) scale(${back(k) * 1.3})"><path d="M10 -70 L-28 8 L0 8 L-14 70 L32 -14 L4 -14 L22 -70 Z" fill="#ffe14a" stroke="#000" stroke-width="7" stroke-linejoin="round"/></g>`); }
function sunRays(k, T) { if (k <= 0) return; for (let i = 0; i < 6; i++) { const x = 140 + i * 170 + 30 * Math.sin(T + i); svg.push(`<line x1="${x + 260}" y1="0" x2="${x}" y2="900" stroke="#ffd84a" stroke-width="16" opacity="${(0.55 * k).toFixed(2)}" stroke-linecap="round"/>`); } }
function camFix(pos, look, fov = 40) { LOOK = look.clone(); camera.position.copy(pos); camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(look); camera.updateMatrixWorld(true); }
const headW = q => { q.root.updateMatrixWorld(true); return q.head.getWorldPosition(V(0, 0, 0)); };
const WP = (i, pre, n) => WT(i, pre, n);
const arc = (a, b, h, k) => a.clone().lerp(b, k).add(V(0, 4 * h * k * (1 - k), 0));
const yawTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
// Ziegen grasen an festen Plätzen
const GOAT_P = [[-1.2, -2.0, 0.4], [0.4, -3.2, 2.1], [1.4, -1.6, -1.2], [-0.6, -0.4, 3.0], [2.2, -2.8, 1.0]];
function goatsGraze(T, off = V(0, 0, 0), vis = true) { goats.forEach((g, i) => { const [x, z, y] = GOAT_P[i]; const ph = Math.sin(T * 0.6 + i * 1.7);
  poseQ(g, { pos: V(x, 0, z).add(off), yaw: y + 0.2 * ph, headP: 1.2 + 0.25 * Math.sin(T * 3 + i), walk: 0, T, vis }); }); }
function goatsBarn(T, vis = true) { const c = G.herdC; goats.forEach((g, i) => { const a = i * 1.3; poseQ(g, { pos: V(c.x + Math.cos(a) * 0.9, 0, c.z + Math.sin(a) * 0.9 + 0.3), yaw: a + 2, headP: i % 2 ? 1.1 : 0.1, lie: i === 3 ? 1 : 0, T, vis }); }); }

// ---------- Reset ----------
function resetWorld() { rex.root.visible = false; ui = []; svg = []; badge.style.display = 'none'; cta.style.display = 'none'; }
function stage(i, T) {
  mood('day'); sunAt(V(0, 0, 0)); ground.visible = world.visible = sky.visible = true; scene.background = null; scene.fog.near = 40; scene.fog.far = 320;
  G.oldFence.visible = i <= 1; G.eFence.visible = i >= 2; G.eFence.children.forEach(c => c.scale.set(1, 1, 1)); G.hole.visible = i === 1; G.dirt.visible = false; G.doors.forEach((d, k) => d.rotation.y = 0);
  G.pen.visible = i >= 6 && i <= 7; G.snowP.visible = G.snowCover.visible = false; GRASS.visible = true; G.fluff.visible = false; G.brush.visible = G.clipper.visible = false;
  [dog, dog2, ...wolves, ...kids, ...goats].forEach(q => poseQ(q, { vis: false })); goatsGraze(T);
}
const shots = [
  // 0: Ziegen auf der Weide – ein Wolf in der Gegend – normaler Zaun reicht nicht
  (T) => { const tW = WP(0, 'wolf'), tZ = WP(0, 'zaun'); badge.style.display = T < 2.4 ? 'block' : 'none'; const u = T - S[0].start;
    if (T < tW - 0.1) cam(V(4.6 - u * 0.3, 1.9, 4.4), V(0.3, 0.3, -1.9), 40, T, 0.006);
    else if (T < tZ - 0.2) { const w = wolves[0]; poseQ(w, { pos: V(-1.0, 0, -12.6), yaw: 0.2, headP: -0.1, T }); cam(V(0.2, 1.2, -6.8), V(-1.0, 0.6, -12.6), 34, T, 0.004); label3('WOLF', headW(w), clamp((T - tW) / 0.3), 140, -220); }
    else { camFix(V(0.6 - (T - tZ) * 0.15, 1.1, -5.7), V(-2.0, 0.45, -8.5), 40); label3('ZAUN', V(-2.5, 0.95, FZ0), clamp((T - tZ) / 0.3), 120, -260); icon(false, 540, 1340, clamp((T - WP(0, 'aus')) / 0.25)); }
  },
  // 1: Wolf gräbt sich unter dem Zaun durch – am Morgen fehlt eine Ziege
  (T) => { const tG = WP(1, 'graben'), tD = WP(1, 'durch'), tM = WP(1, 'morgen'); const w = wolves[0]; const H = G.hole.position;
    if (T < tM - 0.1) { mood('night'); goatsGraze(T, V(0, 0, 0), false); const dg = T < tD - 0.2 ? clamp((T - tG + 0.5) / 0.3) : 0; G.hole.scale.setScalar(0.3 + 0.7 * clamp((T - tG + 0.5) / 1.4));
      const k = clamp((T - tD + 0.2) / 1.0); poseQ(w, { pos: V(H.x, 0, lerp(H.z - 0.9, H.z + 0.9, ease(k))), yaw: 0, dig: dg, crouch: k > 0 && k < 1 ? 1 : 0, walk: k > 0 && k < 1 ? 1 : 0, gait: T * 8, T });
      dirtAt(V(H.x, 0, H.z - 0.4), T, dg); G.dirt.visible = dg > 0; cam(V(H.x + 2.6, 1.1, H.z + 2.4), V(H.x, 0.35, H.z - 0.3), 40, T, 0.004); }
    else { mood('morning'); goatsGraze(T); goats[4].root.visible = false; cam(V(4.6, 1.9, 4.4), V(0.3, 0.3, -1.9), 40, T, 0.005); chip('🐐 4 VON 5', 540, 470, clamp((T - tM) / 0.3)); icon(false, 540, 1340, clamp((T - WP(1, 'ziege')) / 0.25)); }
  },
  // 2: Elektrozaun mit Draht knapp über dem Boden – Schlag beim Graben
  (T) => { const tE = WP(2, 'elektrozaun'), tD = WP(2, 'draht'), tG = WP(2, 'graben'), tS = WP(2, 'schlag'); const w = wolves[0];
    G.eFence.children.forEach((c, i) => c.scale.set(1, ease((T - tE + 0.3 - (i % 40) * 0.008) / 0.5) + 0.001, 1));
    if (T < tG - 0.4) { cam(V(-0.6, 0.9, -5.6), V(-2.4, 0.3, FZ0), 40, T, 0.004); label3('DRAHT', V(-2.6, 0.15, FZ0), clamp((T - tD) / 0.3), 120, -300); chip('⚡ ELEKTROZAUN', 540, 470, clamp((T - tE) / 0.3), '#f2c81a'); }
    else { mood('night'); goatsGraze(T, V(0, 0, 0), false); const shock = T > tS; const bk = clamp((T - tS) / 0.5);
      poseQ(w, { pos: V(-2.5, 0, FZ0 - 0.75 - bk * 1.2), yaw: 0, dig: shock ? 0 : 1, jump: shock ? Math.sin(Math.PI * bk) : 0, T, mouth: shock ? 0.6 : 0 });
      w.root.position.y = shock ? Math.sin(Math.PI * bk) * 0.5 : 0; dirtAt(V(-2.5, 0, FZ0 - 0.35), T, shock ? 0 : 1);
      cam(V(-0.3, 1.0, FZ0 + 1.8), V(-2.5, 0.35, FZ0 - 0.4), 40, T, 0.004); if (shock) { bolt(V(-2.5, 0.3, FZ0), clamp((T - tS) / 0.15) * (1 - clamp((T - tS - 1.2) / 0.3))); flash(clamp(1 - (T - tS) / 0.3), '255,225,60'); } }
  },
  // 3: Wölfe sind schlau – springen einfach darüber
  (T) => { mood('night'); goatsGraze(T, V(0, 0, 0), true); const tJ = WP(3, 'springen'); const w = wolves[0]; const A = V(-1.5, 0, FZ0 - 2.2), B = V(-0.8, 0, FZ0 + 2.4);
    const k = clamp((T - tJ + 0.3) / 0.8); const P = k <= 0 ? A.clone().add(V(0, 0, (T - S[3].start) * 0.2)) : arc(A, B, 1.5, k); if (k >= 1) P.copy(B);
    poseQ(w, { pos: P, yaw: yawTo(A, B), run: k > 0 ? 1 : 0, walk: k <= 0 ? 1 : 0, gait: T * (k > 0 ? 12 : 6), jump: k > 0 && k < 1 ? Math.sin(Math.PI * k) : 0, headP: -0.2, T });
    cam(V(3.6, 1.5, FZ0 + 4.2), V(-1.15, 0.8, FZ0 - 0.2), 40, T, 0.004); label3('SCHLAU', headW(w), clamp((T - WP(3, 'schlau')) / 0.3) * clamp((tJ - T) / 0.3), 120, -240); icon(false, 540, 1340, clamp((T - WP(3, 'darüber')) / 0.25));
  },
  // 4: Herdenschutzhund-Welpe wächst bei den Ziegen im Stall auf
  (T) => { goatsGraze(T, V(0, 0, 0), false); goatsBarn(T); const c = G.herdC; const tW = WP(4, 'herdenschutzhund'), tH = WP(4, 'herde');
    poseQ(dog, { pos: V(c.x + 1.3, 0, c.z + 1.3 + 0.15 * Math.sin(T * 0.8)), yaw: 0.9, scale: 0.45, wag: 1, headY: 0.3 * Math.sin(T * 1.3), walk: 0.5, gait: T * 7, T });
    camFix(V(c.x + 2.7, 0.9, c.z + 2.4), V(c.x + 0.8, 0.3, c.z + 0.7), 46); label3('WELPE', headW(dog), clamp((T - tW - 0.6) / 0.3), 160, -260);
    chip('🐐 = FAMILIE', 540, 470, clamp((T - tH) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - tH) / 0.25));
  },
  // 5: Welpe spielt zu wild – jagt die Zicklein durch den Stall
  (T) => { goatsGraze(T, V(0, 0, 0), false); goatsBarn(T); const c = G.herdC.clone().add(V(1.4, 0, 1.0)); const ph = (T - S[5].start) * 2.4;
    kids.forEach((k, i) => { const a = ph + i * 2.6; poseQ(k, { pos: V(c.x + Math.cos(a) * 0.9, 0, c.z + Math.sin(a) * 0.7), yaw: a + Math.PI, run: 1, gait: T * 14 + i, scale: 0.55, T }); });
    const a = ph - 0.9; poseQ(dog, { pos: V(c.x + Math.cos(a) * 0.9, 0, c.z + Math.sin(a) * 0.7), yaw: a + Math.PI, run: 1, gait: T * 15, scale: 0.45, mouth: 0.5, wag: 1, T });
    camFix(V(c.x + 1.6, 1.6, c.z + 1.4), V(c.x - 0.2, 0.25, c.z - 0.2), 52); icon(false, 540, 1340, clamp((T - WP(5, 'stall')) / 0.25)); chip('🐶 ZU WILD', 540, 470, clamp((T - WP(5, 'wild')) / 0.3), '#e8483b');
  },
  // 6: Eigenes Abteil neben der Herde – sieht und riecht die Ziegen durch das Gitter
  (T) => { goatsGraze(T, V(0, 0, 0), false); const pc = G.penC; const tA = WP(6, 'abteil'), tR = WP(6, 'riecht');
    goats.forEach((g, i) => { if (i > 2) return; poseQ(g, { pos: V(pc.x - 1.6 + 0.1 * i, 0, pc.z - 0.6 + i * 0.6), yaw: Math.PI / 2 + 0.2 * Math.sin(T + i), headP: i === 1 ? -0.1 : 0.4, T }); });
    const sniff = T > tR ? 1 : 0; poseQ(dog, { pos: V(pc.x - 0.55, 0, pc.z - 0.1), yaw: -Math.PI / 2, scale: 0.5, lie: T < tR - 0.5 ? 0.0 : 0, headP: 0.1 - 0.1 * sniff * Math.sin(T * 14), wag: 1, T });
    camFix(V(pc.x + 0.6, 1.0, pc.z + 1.9), V(pc.x - 0.9, 0.35, pc.z - 0.2), 50); chip('🏠 EIGENES ABTEIL', 540, 470, clamp((T - tA) / 0.3)); icon(true, 540, 1340, clamp((T - WP(6, 'tag')) / 0.25));
    label3('GITTER', V(pc.x - 1.0, 0.8, pc.z + 0.6), clamp((T - WP(6, 'gitter')) / 0.3), -120, -260);
  },
  // 7: Mit einem Jahr über 40 Kilo – schläft tagsüber, läuft nachts am Zaun
  (T) => { const tJ = WP(7, 'jahr'), tS = WP(7, 'schläft'), tN = WP(7, 'nachts');
    if (T < tS - 0.1) { const g = ease((T - tJ) / 1.4); poseQ(dog, { pos: V(1.2, 0, 2.0), yaw: -0.4, scale: lerp(0.5, 1, g), wag: 1, T }); cam(V(4.8, 1.5, 4.9), V(1.2, 0.5, 1.8), 40, T, 0.004);
      chip('🎂 1 JAHR', 540, 470, clamp((T - tJ) / 0.3)); chip('⚖️ ÜBER 40 KILO', 540, 1340, clamp((T - WP(7, 'kilo')) / 0.3), '#2fbf5b'); }
    else if (T < tN - 0.1) { poseQ(dog, { pos: V(1.2, 0, 2.0), yaw: -0.4, lie: 1, sleep: 1, T }); cam(V(4.6, 1.4, 4.9), V(1.2, 0.3, 1.8), 40, T, 0.004); chip('💤 SCHLÄFT TAGSÜBER', 540, 470, clamp((T - tS) / 0.3)); }
    else { mood('night'); const k = (T - tN) * 1.1; poseQ(dog, { pos: V(lerp(-1.5, 3, clamp(k / 6)), 0, FZ0 + 0.9), yaw: Math.PI / 2, walk: 1, gait: T * 7, T }); { const x = lerp(-1.5, 3, clamp(k / 6)); camFix(V(x + 2.4, 1.4, FZ0 + 3.2), V(x - 0.2, 0.5, FZ0 + 0.9), 40); }
      chip('🌙 NACHTS AM ZAUN', 540, 470, clamp((T - tN) / 0.3)); }
  },
  // 8: Bellt bei jedem Geräusch – der Wolf zieht weiter
  (T) => { mood('night'); const tB = WP(8, 'bellt'), tW = WP(8, 'zieht'), tJ = WP(8, 'job'); const bark = T > tB - 0.1 ? Math.max(0, Math.sin((T - tB) * 9)) : 0;
    poseQ(dog, { pos: V(2.5, 0, FZ0 + 0.9), yaw: Math.PI, mouth: bark, headP: -0.2, T });
    const w = wolves[0]; const k = clamp((T - tW + 0.3) / 1.6); poseQ(w, { pos: V(2.9 + k * 3.5, 0, FZ0 - 4.0 - k * 2), yaw: k > 0 ? 2.0 : Math.PI * 0.05, walk: k > 0 ? 1 : 0, gait: T * 7, headP: -0.1, T });
    if (T < tJ) cam(V(5.0, 1.4, FZ0 + 4.4), V(2.0, 0.7, FZ0 + 0.6), 40, T, 0.004); else cam(V(1.0, 1.5, FZ0 + 5.0), V(2.9, 0.5, FZ0 - 2.8), 40, T, 0.004);
    waves(headW(dog), bark > 0.3 ? 1 : 0.3 * (T > tB ? 1 : 0), T, 1); chip('🔊 BELLT', 540, 470, clamp((T - tB) / 0.3)); icon(true, 540, 1340, clamp((T - WP(8, 'weiter')) / 0.25));
  },
  // 9: Wölfe jagen im Rudel – ein Hund kann nicht überall sein
  (T) => { mood('night'); const tR = WP(9, 'rudel'); poseQ(dog, { pos: V(-3.5, 0, FZ0 + 0.9), yaw: Math.PI / 2, walk: 1, gait: T * 7, T });
    const WPOS = [V(-6, 0, FZ0 - 1.4), V(FX1 + 1.4, 0, -2), V(2, 0, FZ1 + 1.4)]; wolves.forEach((w, i) => { poseQ(w, { pos: WPOS[i], yaw: yawTo(WPOS[i], V(0, 0, 0)), T, vis: T > tR - 0.3 + i * 0.25 }); });
    const u = T - S[9].start; camFix(V(Math.sin(0.3 + u * 0.05) * 15, 17, Math.cos(0.3 + u * 0.05) * 15 - 1.5), V(-1, 0, -1.5), 40);
    wolves.forEach((w, i) => ring(w.root.position.clone().add(V(0, 0.5, 0)), clamp((T - tR - i * 0.25) / 0.3))); ring(dog.root.position.clone().add(V(0, 0.5, 0)), clamp((T - WP(9, 'hund')) / 0.3), '#2fbf5b');
    icon(false, 540, 1340, clamp((T - WP(9, 'gleichzeitig')) / 0.25)); chip('🐺🐺🐺 RUDEL', 540, 470, clamp((T - tR) / 0.3), '#e8483b');
  },
  // 10: Zweiter Hund – einer bleibt bei der Herde, einer läuft den Zaun ab
  (T) => { mood('morning'); const tZ = WP(10, 'zweiten'), tE = WP(10, 'einer'), tA = WP(10, 'andere');
    poseQ(dog, { pos: V(0.4, 0, 0.9), yaw: 0.5, lie: T > tE ? 1 : 0, T }); const k = clamp((T - tZ) / 0.6); const P = V(lerp(6, 2.0, ease(k)), 0, 3.6);
    const k2 = clamp((T - tA) / 3); if (T > tA) P.set(lerp(2.0, -4, k2), 0, FZ1 - 0.9);
    poseQ(dog2, { pos: P, yaw: T > tA ? -Math.PI / 2 : -Math.PI / 2, walk: k < 1 || T > tA ? 1 : 0, gait: T * 7, wag: 1, T, vis: T > tZ - 0.2 });
    cam(V(4.2, 2.6, 8.2), V(0.4, 0.3, 1.2), 40, T, 0.005); label3('HERDE', headW(dog), clamp((T - tE) / 0.3), -140, -260); if (T > tA) label3('ZAUN', headW(dog2), clamp((T - tA) / 0.3), 140, -260);
    chip('🐕🐕 ZWEI HUNDE', 540, 470, clamp((T - tZ) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - WP(10, 'ab')) / 0.25));
  },
  // 11: Winter – schlafen draußen im Schnee, doppeltes Fell
  (T) => { mood('winter'); G.snowCover.visible = true; G.snowP.visible = true; GRASS.visible = false; snowAt(T, V(0.5, 0, 1.5)); goatsGraze(T, V(0, 0, 0), false);
    poseQ(dog, { pos: V(0.0, 0.02, 1.3), yaw: 0.6, lie: 1, sleep: 1, T }); poseQ(dog2, { pos: V(1.3, 0.02, 1.9), yaw: -0.5, lie: 1, sleep: 1, T });
    cam(V(4.4, 1.7, 4.9), V(0.6, 0.3, 1.6), 40, T, 0.004); chip('❄️ -15 °C', 540, 470, clamp((T - WP(11, 'winter')) / 0.3), '#7fc4ff'); label3('DOPPELTES FELL', headW(dog), clamp((T - WP(11, 'doppeltes')) / 0.3), -60, -300);
    icon(true, 540, 1340, clamp((T - WP(11, 'kälte')) / 0.25));
  },
  // 12: Sommer – du willst sie scheren
  (T) => { mood('summer'); const tS = WP(12, 'scheren'); poseQ(dog, { pos: V(0.6, 0, 1.6), yaw: -0.5, mouth: 0.35 + 0.1 * Math.sin(T * 10), T });
    const k = ease((T - tS + 0.3) / 0.8); G.clipper.visible = true; G.clipper.position.set(lerp(2.4, 1.0, k), lerp(1.4, 0.95, k), lerp(2.8, 1.75, k)); G.clipper.rotation.set(0, 0.5, Math.sin(T * 40) * 0.02);
    cam(V(4.6, 1.5, 4.8), V(0.7, 0.6, 1.5), 40, T, 0.004); chip('☀️ SOMMER', 540, 470, clamp((T - WP(12, 'sommer')) / 0.3)); chip('✂️ SCHEREN?', 540, 1340, clamp((T - tS) / 0.3), '#e8483b');
  },
  // 13: Nicht scheren – Fell schützt vor Sonne – nur die Unterwolle ausbürsten
  (T) => { mood('summer'); const tN = WP(13, 'nicht'), tSo = WP(13, 'sonne'), tB = WP(13, 'bürstest'); poseQ(dog, { pos: V(0.6, 0, 1.6), yaw: -0.5, mouth: 0.25, wag: T > tB ? 1 : 0, T });
    cam(V(4.6, 1.5, 4.8), V(0.7, 0.6, 1.5), 40, T, 0.004);
    if (T < tB - 0.1) { G.clipper.visible = true; G.clipper.position.set(1.0, 0.95, 1.75); icon(false, 540, 960, clamp((T - S[13].start) / 0.2) * clamp((tSo - T) / 0.3)); sunRays(clamp((T - WP(13, 'fell') + 0.2) / 0.4), T); chip('🛡️ FELL = SONNENSCHUTZ', 540, 470, clamp((T - tSo) / 0.3), '#2fbf5b'); }
    else { const b = (T - tB) * 2.2; G.brush.visible = true; G.brush.position.set(0.85 + 0.25 * Math.sin(b * Math.PI), 1.02, 1.55 + 0.2 * Math.sin(b * Math.PI)); G.brush.rotation.set(0, -0.5, 0); G.fluff.visible = true; fluffAt(V(0.9, 0.95, 1.6), T);
      chip('🪮 NUR UNTERWOLLE RAUS', 540, 470, clamp((T - tB) / 0.3), '#2fbf5b'); icon(true, 540, 1340, clamp((T - WP(13, 'raus')) / 0.25)); }
  },
  // 14: Glückwunsch – wolfssichere Ziegenweide
  (T) => { const u = T - S[14].start; poseQ(dog, { pos: V(0.4, 0, 0.9), yaw: 0.5, lie: 1, T }); poseQ(dog2, { pos: V(-2, 0, FZ1 - 0.9), yaw: -Math.PI / 2, walk: 1, gait: T * 7, T });
    const a = 0.5 + u * 0.1; cam(V(Math.sin(a) * 12, lerp(5, 7, ease(u / 2.5)), Math.cos(a) * 12 - 1), V(-0.8, 0.3, -1.2), 42, T, 0.004); cta.style.display = 'block';
  },
];
shots.forEach((f, i) => { shots[i] = T => { stage(i, T); f(T); }; });
