
// ---------- Uferstelle: sandiger Platz am Wasser ----------
{ const sandTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#b39a72'; g.fillRect(0, 0, w, h); const r = rng(8); for (let i = 0; i < 14000; i++) { const v = r(); g.fillStyle = v < .4 ? 'rgba(90,70,45,0.25)' : v < .8 ? 'rgba(220,200,160,0.25)' : 'rgba(60,50,35,0.35)'; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); } }, 6);
  const sand = new THREE.Mesh(new THREE.CircleGeometry(7, 64), new THREE.MeshStandardMaterial({ map: sandTex, roughness: 0.95, bumpMap: sandTex, bumpScale: 1.5, transparent: false }));
  { const p = sand.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); const a = Math.atan2(y, x); const rr = 1 + 0.18 * Math.sin(a * 5) + 0.1 * Math.sin(a * 11); p.setXY(i, x * rr, y * rr); } }
  sand.rotation.x = -Math.PI / 2; sand.position.set(0.5, 0.012, -0.5); sand.receiveShadow = true; world.add(sand);
  const river = new THREE.Mesh(new THREE.PlaneGeometry(80, 9), new THREE.MeshStandardMaterial({ color: 0x6f8f86, roughness: 0.06, metalness: 0.3 })); river.rotation.x = -Math.PI / 2; river.position.set(0, 0.025, -9.5); world.add(river);
  const mud = new THREE.Mesh(new THREE.PlaneGeometry(80, 1.6), new THREE.MeshStandardMaterial({ color: 0x5e4c36, roughness: 0.5 })); mud.rotation.x = -Math.PI / 2; mud.position.set(0, 0.02, -4.6); world.add(mud);
  const Z0 = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < GRASS_BASE.length; i++) { const e = GRASS_BASE[i].elements; const dx = e[12] - 0.5, dz = e[14] + 0.5; if (dx * dx + dz * dz < 36 || e[14] < -4) { GRASS_BASE[i] = Z0.clone(); GRASS.setMatrixAt(i, Z0); } } GRASS.instanceMatrix.needsUpdate = true;
  // ein paar Grasbüschel am Rand der Sandfläche
  const tuftM = new THREE.MeshStandardMaterial({ color: 0x5d7a2e, side: THREE.DoubleSide, roughness: 0.8 }); const r = rng(77);
  for (let k = 0; k < 26; k++) { const a = r() * Math.PI * 2, d = 4.2 + r() * 2.2; const tf = new THREE.Group(); tf.position.set(0.5 + Math.cos(a) * d, 0, -0.5 + Math.sin(a) * d); if (tf.position.z < -3.6) continue;
    for (let j = 0; j < 9; j++) { const b = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.45 + r() * 0.35, 3), tuftM); b.position.set((r() - .5) * 0.25, 0.25, (r() - .5) * 0.25); b.rotation.set((r() - .5) * 0.6, r() * 3, (r() - .5) * 0.6); tf.add(b); } world.add(tf); } }

// ---------- Reset ----------
const PREY_X0 = 0.3; // Welt-x der Capybara-Nase (Capybara schaut nach -x, zur Schlange)
function resetWorld() {
  rex.root.visible = false; ana.root.visible = true; capy.root.visible = true; ana.ol.userData.u.uA.value = 0; capy.ol.userData.u.uA.value = 0;
  capy.root.position.set(PREY_X0 + 1.06, 0, 0); capy.root.rotation.set(0, 0, 0); capy.legs.forEach(l => { l.scale.setScalar(1); l.rotation.set(0, 0, 0); }); capy.head.rotation.set(0, 0, 0);
  snakeU.uTear.value = 0; snakeU.uFold.value = 0; snakeU.uGapK.value = 0.35;
  [boneChips, airP, redP].forEach(p => p.visible = false);
  ground.visible = world.visible = sky.visible = true; scene.background = null; scene.fog.near = 40; scene.fog.far = 320;
  ui = []; svg = []; badge.style.display = 'none'; cta.style.display = 'none';
}
const restCurve = d => 0.75 * Math.sin((d - 1.6) * 0.75) * clamp((d - 1.2) / 1.2); // S-Kurve hinter der Beute
// Kopf über der Beute: Fortschritt p (0 = Nase berührt, 1 = ganz verschluckt)
function engulf(p, T, extra = {}) {
  const hx = lerp(PREY_X0 - 0.3, PREY_X0 + 2.12, p); const cz = 1.06 - (hx - PREY_X0); const cMouth = 1.06 - (hx + 0.2 - PREY_X0);
  const rc = Math.max(capyR(cz), capyR(cMouth), capyR(cz - 0.2)); const inside = p > 0.02 && rc > 0.01;
  const cyH = capyY(cz); const hy = inside ? cyH + rc * 0.95 + 0.01 : 0.13; const drop = inside ? hy - (cyH - rc * 0.55) : 0; const jl = 0.6;
  const gape = inside ? Math.asin(clamp(drop / jl, 0, 0.98)) : 0.05; const spread = inside ? Math.atan(rc * 1.15 / jl) : 0;
  for (const k in extra) if (extra[k] === undefined) delete extra[k];
  const o = Object.assign({ headPos: V(hx, hy, 0), heading: 0, curve: restCurve, gape, spread, preyX0: PREY_X0, t: T, quad: inside ? clamp(rc * 1.2) : 0, pitch: inside ? -0.08 : 0 }, extra);
  if (inside && rc > 0.12) { const xt = hx + 0.3, cz2 = 1.06 - (xt - PREY_X0), rt = Math.max(0.12, capyR(cz2)), yt = capyY(cz2); const czb = 1.06 - (hx - 0.26 - PREY_X0), rb = Math.max(capyR(czb), 0.15), yb = capyY(czb);
    const jx = rb * 1.0 + 0.04, jy = (yb - rb * 0.3) - hy; o.jawJ = [V(-jx, jy, -0.26), V(jx, jy, -0.26)]; o.jawTW = [V(xt, yt - rt * 0.35, rt + 0.04), V(xt, yt - rt * 0.35, -rt - 0.04)]; o.floorSag = Math.max(rb, rt) * 0.95; }
  poseAna(ana, o);
  // Beine des Capybaras verschwinden, sobald sie im Schlangenkörper stecken
  capy.legs.forEach((l, i) => { const lzW = PREY_X0 + 1.06 - (i < 2 ? 0.38 : -0.38) * 1; const insideL = hx - 0.3 > lzW + 0.05; l.scale.setScalar(insideL ? 0.0001 : 1); });
  return { hx, hy, rc };
}
const headW = () => { ana.head.updateMatrixWorld(true); return ana.head.getWorldPosition(V(0, 0, 0)); };
const hl = (x, y, z) => { ana.head.updateMatrixWorld(true); return V(x, y, z).applyMatrix4(ana.head.matrixWorld); };
// Kamera relativ zum Kopf: vor dem Maul (f), darüber (u), seitlich (s)
function headCam(f, u, s, T, fov = 36, lf = 0.12, lu = -0.06) { ana.head.updateMatrixWorld(true); const m = ana.head.matrixWorld; const o = headW(); const F = V(0, 0, 1).transformDirection(m), U = V(0, 1, 0).transformDirection(m), Sd = V(1, 0, 0).transformDirection(m);
  cam(o.clone().addScaledVector(F, f).addScaledVector(U, u).addScaledVector(Sd, s), o.clone().addScaledVector(F, lf).addScaledVector(U, lu), fov, T, 0.003); }
const flash = (k, col = '255,40,30') => { if (k > 0) svg.push(`<rect x="0" y="0" width="1080" height="1920" fill="rgba(${col},${(0.35 * k).toFixed(3)})"/>`); };
function chip(text, x, y, k, col = '#f3c63f') { if (k <= 0) return; ui.push(`<div class="pill" style="left:${x}px;top:${y}px;border-color:${col};transform:translate(-50%,-50%) scale(${back(k)})">${text}</div>`); }

const shots = [
  // 0: Wenn … Capybara 3× breiter … Unterkiefer bricht am Kinn
  (T) => {
    badge.style.display = T < 3.0 ? 'block' : 'none'; sunAt(V(0, 0, 0));
    const t3 = WT(0, 'dreimal') - 0.25, tU = WT(0, 'bricht') - 1.1, tB = WT(0, 'bricht') + 0.15;
    if (T < t3) { // Annäherung: Schlange gleitet über den Sand
      const k = (T - S[0].start) / (t3 - S[0].start); const hx = lerp(PREY_X0 - 3.2, PREY_X0 - 1.0, ease(k));
      poseAna(ana, { headPos: V(hx, 0.13, 0), heading: 0.12 * Math.sin(T * 2.2), curve: d => 0.55 * Math.sin(d * 1.3 - T * 3.4) * clamp(d / 0.8), gape: 0.05, t: T });
      cam(V(hx - 2.2, 1.05, 2.4), V(hx + 0.6, 0.25, 0), 42, T);
    } else if (T < tU) { // Größenvergleich
      poseAna(ana, { headPos: V(PREY_X0 - 0.95, 0.13, 0), heading: 0, curve: d => 0.4 * Math.sin(d * 1.3 - t3 * 3.4) * clamp(d / 0.8), gape: 0.05, t: T });
      cam(V(PREY_X0 - 2.6, 0.75, 0.35), V(PREY_X0 + 0.0, 0.42, 0), 36, T, 0.01);
      const kL = clamp((T - t3) / 0.3); label3('DEIN KOPF', hl(0, 0.12, 0), kL, -60, -260); label3('3× SO BREIT', V(PREY_X0 + 0.5, CAPY_CY + 0.42, 0), clamp((T - t3 - 0.5) / 0.3), 120, -330);
    } else { // Röntgen: starrer Unterkiefer, Kinn verwachsen -> bricht
      const kO = ease((T - tU) / (tB - tU)); const broke = T > tB; const g0 = lerp(0.05, 0.5, kO);
      poseAna(ana, { headPos: V(PREY_X0 - 0.95, 0.42, 0), pitch: 0.35, heading: 0, curve: d => 0.4 * Math.sin(d * 1.3 - t3 * 3.4) * clamp(d / 0.8), gape: broke ? 0.62 : g0, spread: broke ? 0.32 * easeOut((T - tB) / 0.15) * (1 - 0.15 * Math.sin((T - tB) * 20) * Math.exp(-(T - tB) * 5)) : 0.0, xray: 1, chinK: broke ? -1 : 0, t: T, teeth: 0.6 });
      headCam(1.25, 0.22, 0.45, T);
      label3('UNTERKIEFER', hl(0.1, -0.15, 0.1), clamp((T - tU - 0.2) / 0.3) * (broke ? clamp(1 - (T - tB) / 0.2) : 1), -40, 240);
      if (broke) { const tp = ana.tips[0].clone().add(ana.tips[1]).multiplyScalar(0.5).applyMatrix4(ana.head.matrixWorld); burstA(boneChips, tp, T - tB, 0.25); label3('KINN BRICHT!', tp, clamp((T - tB) / 0.2), 0, -300); flash(clamp(1 - (T - tB) / 0.35)); }
    }
  },
  // 1: Also: zwei Hälften + dehnbares Band
  (T) => {
    sunAt(V(0, 0, 0)); const u = T - S[1].start; const tH = WT(1, 'hälften'), tB = WT(1, 'band');
    const sp = 0.06 + 0.3 * ease((T - tH + 0.3) / 0.6) * (0.75 + 0.25 * Math.sin((T - tH) * 3.0));
    poseAna(ana, { headPos: V(PREY_X0 - 0.95, 0.5, 0), pitch: 0.55, heading: 0, curve: d => 0.4 * Math.sin(d * 1.3) * clamp(d / 0.8), gape: 0.5, spread: sp, xray: 1, lig: clamp((T - tH + 0.3) / 0.3), t: T, teeth: 0.6 });
    const u2 = u; headCam(1.15, 0.28, 0.3 + 0.12 * Math.sin(u2 * 0.6), T);
    label3('2 HÄLFTEN', hl(-0.16, -0.25, 0.1), clamp((T - tH) / 0.3), -120, -330);
    const lm = ana.tips[0].clone().add(ana.tips[1]).multiplyScalar(0.5).add(V(0, -0.03, 0)).applyMatrix4(ana.head.matrixWorld); label3('DEHNBARES BAND', lm, clamp((T - tB + 0.3) / 0.3), 60, 280);
  },
  // 2: Maul klappt riesig auf – aber ohne Arme rutscht das Capybara wieder raus
  (T) => {
    sunAt(V(0, 0, 0)); const tA = WT(2, 'aber'), tR = WT(2, 'rutscht');
    let p; if (T < tA) p = lerp(0.0, 0.22, ease((T - S[2].start - 0.2) / (tA - S[2].start - 0.4))); else if (T < tR) p = 0.22 + 0.015 * Math.sin((T - tA) * 9); else p = lerp(0.22, -0.12, ease((T - tR) / 0.9));
    engulf(p, T, { gape: p < 0.03 ? lerp(0.05, 0.9, clamp((T - S[2].start) / 0.4)) * (p < -0.05 ? clamp(1 - (T - tR - 0.9) / 0.5) * 0.9 + 0.05 : 1) : undefined });
    if (p <= 0.02) { const o = { headPos: V(lerp(PREY_X0 - 0.3, PREY_X0 + 2.12, p), 0.2 + 0.25 * clamp(p * 20 + 1), 0), heading: 0, curve: restCurve, gape: 0.85, spread: 0.18, t: T, pitch: 0.1 }; if (T > tR + 0.9) o.gape = lerp(0.85, 0.05, clamp((T - tR - 0.9) / 0.4)); poseAna(ana, o); }
    const hp = headW(); cam(V(PREY_X0 - 0.6, 1.05, 2.5), V(PREY_X0 + 0.15, 0.5, 0), 38, T, 0.006);
    if (T > tR - 0.1) capy.root.position.x += 0.0;
    label3('KEINE ARME 🙅', hp.clone().add(V(0, 0.15, 0)), clamp((T - WT(2, 'arme') + 0.1) / 0.3) * clamp(1 - (T - tR - 0.2) / 0.3), -80, -300);
    label3('RUTSCHT RAUS', V(PREY_X0 + 0.6, CAPY_CY + 0.45, 0), clamp((T - tR) / 0.3), 100, -300);
  },
  // 3: Also: Zähne wie Widerhaken
  (T) => {
    sunAt(V(0, 0, 0)); const u = T - S[3].start; const tZ = WT(3, 'zähne'), tW = WT(3, 'widerhaken');
    poseAna(ana, { headPos: V(PREY_X0 - 0.95, 0.5, 0), pitch: 0.5, heading: 0, curve: d => 0.4 * Math.sin(d * 1.3) * clamp(d / 0.8), gape: 0.6, spread: 0.2, lig: 1, teeth: lerp(0.0, 1.35, back((T - tZ + 0.1) / 0.6)), t: T });
    headCam(0.62, 0.08, 0.62, T, 36, 0.05, -0.05);
    label3('WIDERHAKEN', hl(0.12, -0.08, 0.05), clamp((T - tW) / 0.3), 60, -320);
  },
  // 4: Links/rechts vorschieben, festhaken, über die Beute ziehen
  (T) => {
    sunAt(V(0, 0, 0)); const u = (T - S[4].start) / (S[4].end - S[4].start); const p = lerp(0.18, 0.62, ease(u)); const ph = (T - S[4].start) * 4.2;
    const sl = 0.07 * Math.sin(ph); const r = engulf(p, T, { slide: [sl, -sl], heading: 0.05 * Math.sin(ph) });
    const hp = headW(); cam(hp.clone().add(V(-0.45, 2.3, 0.9)), hp.clone().add(V(0.2, 0, 0)), 40, T, 0.004);
    const tL = WT(4, 'linke'), tRr = WT(4, 'rechte'); const side = Math.sin(ph) > 0;
    const pL = hl(-0.3, -0.1, 0.2), pR = hl(0.3, -0.1, 0.2);
    if (T > tL - 0.2) { label3('LINKS', pL, side ? 1 : 0.0001, -120, -200); label3('RECHTS', pR, !side && T > tRr - 0.2 ? 1 : 0.0001, 120, 260); }
  },
  // 5: Schlucken dauert Stunden – keine Luft
  (T) => {
    sunAt(V(0, 0, 0)); const u = (T - S[5].start) / (S[5].end - S[5].start); const p = lerp(0.62, 0.72, u); engulf(p, T, { slide: [0.03 * Math.sin(T * 2), -0.03 * Math.sin(T * 2)] });
    const hp = headW(); cam(V(hp.x - 0.4, 0.85, 2.3), V(hp.x - 0.2, 0.55, 0), 40, T, 0.006);
    const hrs = Math.min(5, 1 + Math.floor(clamp((T - WT(5, 'stunden') + 0.2) / 1.4) * 4.99)); chip(`⏱ ${hrs} STUNDE${hrs > 1 ? 'N' : ''}`, 540, 470, clamp((T - WT(5, 'stunden') + 0.2) / 0.3));
    const kL = clamp((T - WT(5, 'luft') + 0.4) / 0.3); if (kL > 0) { const lv = clamp(1 - (T - WT(5, 'luft') + 0.3) / 0.9); svg.push(`<g opacity="${kL}"><rect x="290" y="1240" width="500" height="64" rx="32" fill="#111c" stroke="#fff" stroke-width="6"/><rect x="300" y="1250" width="${480 * lv}" height="44" rx="22" fill="${lv > 0.3 ? '#3ddc84' : '#e8483b'}"/><text x="540" y="1216" text-anchor="middle" font-family="M" font-weight="900" font-size="48" fill="#fff" stroke="#000" stroke-width="10" paint-order="stroke">LUFT</text></g>`); }
  },
  // 6: Luftröhre schiebt sich nach vorn – wie ein Schnorchel
  (T) => {
    sunAt(V(0, 0, 0)); const tL = WT(6, 'luftröhre') - 0.2; const k = ease((T - tL) / 0.9); engulf(0.72, T, { trach: k, trachSide: 9 });
    const hp = headW(); cam(hp.clone().add(V(0.75, -0.1, 1.45)), hp.clone().add(V(0.3, -0.28, 0)), 40, T, 0.004);
    ana.trach.updateMatrixWorld(true); const tip = ana.trTip.getWorldPosition(V(0, 0, 0)), base = ana.trach.localToWorld(V(0, 0, -0.1));
    if (k > 0.8) airFlow(airP, tip.clone().add(V(0.25, 0.05, 0)), base, T);
    label3('LUFTRÖHRE', tip, clamp((T - tL - 0.4) / 0.3), 60, 260); label3('SCHNORCHEL 🤿', tip.clone().add(V(0.1, 0, 0)), clamp((T - WT(6, 'schnorchel')) / 0.3), -40, -380);
  },
  // 7: Haut reißt zwischen den Schuppen
  (T) => {
    sunAt(V(0, 0, 0)); capy.root.visible = false; const tE = WT(7, 'einreißt') - 0.1; const k = ease((T - S[7].start) / 1.2);
    engulf(1, T, { headPos: V(PREY_X0 + 2.25, 0.12, 0), gape: 0.05, spread: 0, rest: true, bulgeScale: lerp(0.9, 1.06, k) });
    snakeU.uGapK.value = lerp(0.4, 1.0, k); snakeU.uTear.value = ease((T - tE) / 0.5);
    const bp = V(PREY_X0 + 0.9, 0.5, 0); cam(V(bp.x + 0.3, 0.95, 1.35), V(bp.x, 0.42, 0), 38, T, 0.004);
    if (T > tE) burstA(redP, V(bp.x, 0.85, 0.2), (T - tE) % 0.9, 0.12, 0.9);
    label3('HAUT REISST', V(bp.x, 0.86, 0.15), clamp((T - tE) / 0.3), -60, -330);
  },
  // 8: Faltige, dehnbare Haut wie eine Ziehharmonika
  (T) => {
    sunAt(V(0, 0, 0)); capy.root.visible = false; const tW = WT(8, 'weich') - 0.2; const k = ease((T - tW) / 0.8); const acc = Math.sin((T - WT(8, 'dehnt')) * 4) * clamp((T - WT(8, 'dehnt') + 0.2) / 0.3);
    engulf(1, T, { headPos: V(PREY_X0 + 2.25, 0.12, 0), gape: 0.05, spread: 0, rest: true, bulgeScale: 1.06 + 0.06 * acc });
    snakeU.uGapK.value = 1.0 + 0.25 * acc; snakeU.uTear.value = 1 - k; snakeU.uFold.value = k;
    const bp = V(PREY_X0 + 0.9, 0.5, 0); const a = 1.4 + (T - S[8].start) * 0.06; cam(V(bp.x + Math.cos(a) * 0.2, 0.95, 1.3), V(bp.x, 0.45, 0), 38, T, 0.004);
    label3('DEHNBARE HAUT', V(bp.x - 0.1, 0.88, 0.15), clamp((T - tW - 0.4) / 0.3), -80, -330);
    label3('ZIEHHARMONIKA 🪗', V(bp.x + 0.25, 0.8, 0.3), clamp((T - WT(8, 'ziehharmonika')) / 0.3), 120, 300);
  },
  // 9: Eine Mahlzeit reicht für Wochen
  (T) => {
    sunAt(V(0, 0, 0)); capy.root.visible = false; const u = (T - S[9].start) / (S[9].end - S[9].start);
    engulf(1, T, { headPos: V(PREY_X0 + 2.25, 0.12, 0), gape: 0.05, spread: 0, rest: true, bulgeScale: lerp(1.0, 0.8, u) });
    snakeU.uGapK.value = 0.9; snakeU.uFold.value = 1;
    const a = -0.6 + u * 0.4; cam(V(PREY_X0 + 1 + Math.sin(a) * 3.6, 2.6, Math.cos(a) * 3.6), V(PREY_X0 + 0.6, 0.3, -0.3), 40, T);
    const wk = Math.min(4, 1 + Math.floor(clamp((T - WT(9, 'wochen') + 0.3) / 1.0) * 3.99)); chip(`📅 WOCHE ${wk}`, 540, 470, clamp((T - WT(9, 'wochen') + 0.3) / 0.3));
  },
  // 10: Glückwunsch – Anakonda
  (T) => {
    sunAt(V(0, 0, 0)); capy.root.visible = false; const u = T - S[10].start;
    engulf(1, T, { headPos: V(PREY_X0 + 2.25, 0.16, 0), heading: 0.05 * Math.sin(T), gape: 0.05, spread: 0, rest: true, bulgeScale: 0.85 });
    snakeU.uGapK.value = 0.8; snakeU.uFold.value = 0.7; ana.ol.userData.u.uA.value = clamp((T - WT(10, 'anakonda')) * 4) * 0.9;
    const a = 0.9 - u * 0.2; const R = lerp(2.4, 3.6, ease(u / 2)); const hp = headW(); cam(V(hp.x - 0.6 + Math.sin(a) * R, lerp(0.7, 1.6, ease(u / 2)), Math.cos(a) * R), V(hp.x - 0.9, 0.3, 0), 40, T);
    cta.style.display = 'block';
  },
];
