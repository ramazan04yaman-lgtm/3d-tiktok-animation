
// ---------- Reset ----------
function resetWorld() {
  rex.root.visible = true; rex.root.position.set(0, 0, 0); rex.root.rotation.set(0, 0, 0); rex.root.scale.setScalar(0.9); rex.ol.userData.u.uA.value = 0;
  anky.root.visible = true; anky.root.position.set(0, 0, 0); anky.root.rotation.set(0, 0, 0); anky.ol.userData.u.uA.value = 0;
  [dust, dust2, blood, sparks, boneBits].forEach(p => p.visible = false); shards.forEach(m => m.visible = false);
  ground.visible = world.visible = sky.visible = true; scene.background = null; scene.fog.near = 40; scene.fog.far = 320;
  ui = []; svg = []; badge.style.display = 'none'; cta.style.display = 'none';
}
// Schwung-Profil: Ausholen -> Peitschen -> Treffer -> Zurückfedern
function swingAng(t, tHit, A = 0.8, hold = false) {
  const d = t - tHit;
  if (d < -0.75) return 0;
  if (d < -0.28) return -0.5 * ease((d + 0.75) / 0.47);
  if (d < 0) { const k = (d + 0.28) / 0.28; return lerp(-0.5, A, k * k); }
  if (hold) return A * (1 - 0.12 * Math.sin(clamp(d / 0.25) * Math.PI));
  return lerp(A, A * 0.55, easeOut(d / 0.35)) * (1 - ease((d - 0.6) / 1.4));
}
const REST_P = restPitch();
const tailMid = () => { anky.root.updateMatrixWorld(true); const P = anky.chain.P; return P[Math.round(AK_NV * 0.6)].clone().applyMatrix4(anky.body.matrixWorld); };
const tailPt = i => { anky.root.updateMatrixWorld(true); return anky.chain.P[i].clone().applyMatrix4(anky.body.matrixWorld); };
// Rex so hinstellen, dass die Keule beim Treffer genau seinen Knöchel trifft
function placeRexForHit(hitPose, leg = 1, extra = {}) {
  poseAnky(anky, hitPose); const cp = clubWorld();
  const a = rexAnkle(leg); rex.root.position.add(V(cp.x - a.x - 0.55, 0, cp.z - a.z + (extra.dz || 0))); rex.root.updateMatrixWorld(true); return cp;
}
const idleRex = (T, o = {}) => poseRex(rex, Object.assign({ t: T, jaw: 0.12, head: 0.12, tail: 1.12, teeth: 2.3 }, o));

const shots = [
  // 0: Hook – weicher Schwanz knickt beim Schlag ab
  (T) => {
    badge.style.display = T < 3.0 ? 'block' : 'none'; sunAt(V(0, 0, -2));
    const tW = WT(0, 'weich'), tHit = WT(0, 'schlägt') + 0.12, tSnap = WT(0, 'knickt') - 0.05;
    const A = 0.8; const sw = s => swingAng(s, tHit, A) / 1.38;
    idleRex(T); const hitPose = { yaw: softYaw(sw, tHit), pitch: REST_P, armor: 0, t: T };
    const cp = placeRexForHit(hitPose, 1);
    const yaw = softYaw(sw, Math.min(T, tSnap + 0.02)); const pitch = REST_P.slice();
    const sk = T > tSnap ? easeOut((T - tSnap) / 0.35) : 0;
    if (sk > 0) { yaw[13] -= 1.25 * sk; yaw[14] -= 0.25 * sk; pitch[13] -= 0.55 * sk; pitch[14] -= 0.2 * sk; for (let i = 0; i < 13; i++) yaw[i] *= lerp(1, 0.6, ease((T - tSnap) / 1.2)); }
    const xr = T > tW - 0.1 ? 1 : 0;
    poseAnky(anky, { yaw, pitch, armor: 0, t: T, xray: xr, win: [0.22, 0.97], winW: 1.0, gapK: sk });
    const hd = T - tHit; if (hd > 0) { burst(dust, V(cp.x - 0.3, 0.3, cp.z), hd, { spread: 2.5, up: 2, g: 2, life: 1.4 }); }
    const sd = T - tSnap; if (sd > 0) { const sp = tailPt(14); burst(blood, sp, sd, { spread: 1.4, up: 2.5, life: 1.0 }); burst(boneBits, sp, sd, { spread: 1.2, up: 2.2, life: 1.0 }); }
    if (T < tW - 0.1) { // Totale: Ankylosaurus + T-Rex
      cam(V(7.5, 3.6, 4.5), V(-1.3, 2.0, -2.5), 50, T, 0.03);
      label3('KNOCHENKEULE', clubWorld(), clamp((T - WT(0, 'knochenkeule')) * 3), 140, -260);
    } else if (T < tHit - 0.8) { CUT = tW - 0.1; const m = tailMid(); cam(m.clone().add(V(2.6, 4.4, -1.8)), m.clone().add(V(-0.1, 0, 0.2)), 44, T, 0.02);
      label3('WEICHER SCHWANZ', tailPt(9), clamp((T - tW) * 3), 120, -320);
    } else { CUT = tHit - 0.8; const m = tailPt(8); cam(m.clone().add(V(3.4, 8.2, 1.2)), m.clone().add(V(-1.2, -0.6, -1.0)), 50, T * 6, 0.02 + (hd > 0 ? 0.18 * Math.exp(-hd * 5) : 0) + (sd > 0 ? 0.12 * Math.exp(-sd * 5) : 0));
      label3('KNICKT AB!', tailPt(14), clamp((T - tSnap) * 3), 160, -300);
    }
  },
  // 1: Wirbel verwachsen zum Knochenstiel
  (T) => {
    sunAt(V(0, 0, -3)); rex.root.visible = false;
    const tF = WT(1, 'verwachs'); const fk = ease((T - tF) / 1.5);
    const yaw = hingeYaw(0.12 * Math.sin(T * 1.3)); poseAnky(anky, { yaw, pitch: REST_P, armor: 0, t: T, xray: 1, win: [0.5, 0.985], winW: 1.05, fuse: fk, fused: fk >= 0.999 });
    const m = tailPt(17); cam(m.clone().add(V(1.7, 3.0, 0.6)), m.clone().add(V(0, -0.1, -0.2)), 42, T, 0.015);
    label3('WIRBEL', tailPt(16), clamp((T - WT(1, 'wirbel')) * 3) * (1 - clamp((T - tF - 1.2) * 3)), -150, -300);
    label3('VERWACHSEN', tailPt(18), clamp((T - tF - 0.6) * 3), 120, -320);
    label3('KNOCHENSTIEL', tailPt(19), clamp((T - WT(1, 'knochenstiel')) * 3), -120, 330);
  },
  // 2: steif – aber bricht beim Aufprall
  (T) => {
    sunAt(V(0, 0, -3)); const tA = WT(2, 'aber'), tHit = WT(2, 'kracht') + 0.05, tBr = WT(2, 'bricht') - 0.05;
    idleRex(T);
    if (T < tA - 0.05) { rex.root.visible = false; const yaw = hingeYaw(0.55 * Math.sin((T - S[2].start) * 3.2)); poseAnky(anky, { yaw, pitch: REST_P, armor: 0, t: T, xray: 1, win: [0.5, 0.985], winW: 1.05, fuse: 1, fused: true });
      const m = tailPt(15); cam(m.clone().add(V(0.6, 6.5, 1.8)), m.clone().add(V(0, 0, -0.6)), 46, T, 0.015);
      label3('STEIF', tailPt(19), clamp((T - WT(2, 'nichts')) * 3), -140, -280); return; }
    CUT = tA - 0.05; const A = 0.8;
    const hitPose = { yaw: hingeYaw(A), pitch: REST_P, armor: 0, t: T, fuse: 1, fused: true }; const cp = placeRexForHit(hitPose, 1);
    const yaw = hingeYaw(swingAng(T, tHit, A, true)); const pitch = REST_P.slice(); const ck = T > tBr ? easeOut((T - tBr) / 0.3) : 0;
    yaw[AK_BREAK] -= 0.42 * ck; pitch[AK_BREAK] -= 0.3 * ck;
    poseAnky(anky, { yaw, pitch, armor: 0, t: T, xray: 1, win: [0.5, 0.985], winW: 1.1, fuse: 1, fused: true, crackK: ck });
    const hd = T - tHit; if (hd > 0) burst(dust, V(cp.x - 0.3, 0.3, cp.z), hd, { spread: 2.5, up: 2, g: 2, life: 1.4 });
    const bd = T - tBr; if (bd > 0) { const bp = tailPt(AK_BREAK); burst(boneBits, bp, bd, { spread: 1.0, up: 2, life: 1.0 }); burst(blood, bp, bd, { spread: 1.2, up: 2.2, life: 0.9 }); }
    const bp = tailPt(AK_BREAK); const zk = ease((T - tBr + 0.2) / 0.6);
    cam(bp.clone().add(V(lerp(3.6, 1.6, zk), lerp(4.8, 2.6, zk), lerp(-3.4, -0.9, zk))), bp.clone().add(V(lerp(-1.2, 0, zk), lerp(-0.3, 0, zk), lerp(-0.6, 0, zk))), 48, T * 6, 0.02 + (hd > 0 ? 0.2 * Math.exp(-hd * 5) : 0));
    label3('T-REX-BEIN', rexAnkle(1).add(V(0, 0.8, 0)), clamp((T - WT(2, 'trex')) * 3) * (1 - clamp((T - tBr) * 4)), -160, -260);
    label3('BRICHT DURCH!', bp, clamp((T - tBr) * 3), 150, -300);
  },
  // 3: verknöcherte Sehnen umwickeln den Stiel
  (T) => {
    sunAt(V(0, 0, -3)); rex.root.visible = false; const tS = WT(3, 'wickeln') - 0.15, tE = WT(3, 'stahl') + 0.3; const k = clamp((T - tS) / (tE - tS));
    const yaw = hingeYaw(0.1 * Math.sin(T * 1.1)); poseAnky(anky, { yaw, pitch: REST_P, armor: 0, t: T, xray: 1, win: [0.5, 0.985], winW: 1.25, fuse: 1, fused: true, tendon: k });
    const m = tailPt(18); const a = 0.6 - (T - S[3].start) * 0.18; cam(m.clone().add(V(Math.sin(a) * 2.2, 1.9, -Math.cos(a) * 2.2 + 0.3)), m, 38, T, 0.012);
    label3('VERKNÖCHERTE SEHNEN', tailPt(17), clamp((T - WT(3, 'sehnen')) * 3), 0, -330);
    label3('WIE STAHLSEILE', tailPt(20), clamp((T - WT(3, 'stahl')) * 3), 0, 330);
  },
  // 4: hält jeden Schlag aus – aber zu steif zum Schwingen
  (T) => {
    sunAt(V(0, 0, -3)); const tA = WT(4, 'aber'), tHit = WT(4, 'schlag') + 0.05; idleRex(T);
    if (T < tA - 0.05) { const A = 0.8; const hitPose = { yaw: hingeYaw(A), pitch: REST_P, armor: 0, t: T, fuse: 1, fused: true, tendon: 1 }; const cp = placeRexForHit(hitPose, 1);
      const hd = T - tHit; if (hd > 0) { const rk = Math.exp(-hd * 4) * Math.sin(hd * 30) * 0.05; rex.root.rotation.z = rk; burst(sparks, cp.clone().add(V(-0.3, 0.2, 0)), hd, { spread: 2.2, up: 2.5, life: 0.8 }); burst(dust, V(cp.x - 0.3, 0.3, cp.z), hd, { spread: 2.5, up: 2, g: 2, life: 1.4 }); }
      poseAnky(anky, { yaw: hingeYaw(swingAng(T, tHit, A, true)), pitch: REST_P, armor: 0, t: T, xray: 1, win: [0.5, 0.985], winW: 1.1, fuse: 1, fused: true, tendon: 1 });
      const m = tailPt(16); cam(m.clone().add(V(3.4, 4.6, -3.6)), m.clone().add(V(-1.0, -0.4, -1.0)), 50, T * 6, 0.02 + (hd > 0 ? 0.2 * Math.exp(-hd * 5) : 0));
      label3('HÄLT!', clubWorld(), clamp((T - WT(4, 'aus')) * 3), 150, -300); return; }
    CUT = tA - 0.05; rex.root.visible = false;
    const tr = T - tA; const strain = Math.sin(tr * 3.0) * 0.06 * ease(tr / 0.4); const yaw = Z22(); for (let i = 0; i < 3; i++) yaw[i] = strain / 3 + Math.sin(T * 40) * 0.002;
    anky.root.rotation.y = -strain * 1.6; poseAnky(anky, { yaw, pitch: REST_P, armor: 0, t: T, xray: 0, fuse: 1, fused: true, tendon: 1 });
    cam(V(0, 7.5, -10.5), V(0, 0.8, -3.2), 46, T, 0.03 + 0.015 * Math.abs(Math.sin(T * 25)) * ease(tr / 0.4));
    label3('ZU STEIF!', tailPt(16), clamp((T - WT(4, 'steif')) * 3), 0, -330);
  },
  // 5: Scharnier an der Hüfte – Keule peitscht links/rechts
  (T) => {
    sunAt(V(0, 0, -3)); rex.root.visible = false; const u = T - S[5].start; const tP = WT(5, 'peitscht');
    const amp = lerp(0.35, 0.95, ease((T - tP + 0.3) / 0.5)); const fr = lerp(1.6, 3.4, ease((T - tP + 0.3) / 0.5)); const ang = amp * Math.sin(u * fr);
    const yaw = hingeYaw(ang, 7); for (let i = 0; i < 7; i++) yaw[i] *= 1 + 0.25 * Math.sin(u * fr - i * 0.35);
    poseAnky(anky, { yaw, pitch: REST_P, armor: 0, t: T, xray: 1, win: [0.0, 0.42], winW: 1.15, fuse: 1, fused: true, tendon: 1, gapK: 1 });
    if (T < tP - 0.3) { const m = tailPt(4); cam(m.clone().add(V(1.6, 4.0, 1.4)), m.clone().add(V(0, -0.2, -0.3)), 44, T, 0.015);
      label3('LOCKERE WIRBEL', tailPt(3), clamp((T - WT(5, 'locker')) * 3), 0, -330); label3('SCHARNIER', tailPt(6), clamp((T - WT(5, 'scharnier')) * 3), 0, 330); }
    else { CUT = tP - 0.3; cam(V(0, 10.5, -6.5), V(0, 0.5, -3.6), 50, T, 0.02); label3('LINKS', V(-3.2, 1, -5.2), clamp((T - WT(5, 'links')) * 3), -60, -200); label3('RECHTS', V(3.2, 1, -5.2), clamp((T - WT(5, 'rechts')) * 3), 60, -200); }
  },
  // 6: Panzer aus Knochenplatten mit Stacheln
  (T) => {
    sunAt(V(0, 0, 0)); const tP = WT(6, 'panzer') - 0.3, tS = WT(6, 'stacheln') + 0.5; const ak = clamp((T - tP) / (tS - tP)); const tB = S[6].end - 0.25;
    poseAnky(anky, { yaw: hingeYaw(0.15 * Math.sin(T * 1.2)), pitch: REST_P, armor: ak, t: T, fuse: 1, fused: true });
    const bt = T - tB; const lunge = ease((T - (tB - 0.6)) / 0.6) * (1 - ease((T - tB - 0.15) / 0.5));
    poseRex(rex, { t: T, jaw: bt < 0 ? lerp(0.25, 0.75, lunge) : lerp(0.75, 0.2, ease(bt / 0.15)), head: lerp(0.15, 0.55, lunge), pitch: lerp(0.05, 0.3, lunge), tail: 1.12, teeth: 2.3 });
    const bk = V(-0.45, 2.15, 0.2); rex.root.rotation.y = Math.PI / 2 - 0.25; alignMouth(bk.clone().add(V(-2.4, 1.4, -0.6)).lerp(bk, lunge));
    if (bt > 0) burst(sparks, bk.clone().add(V(0, 0.2, 0)), bt, { spread: 2.4, up: 3, life: 0.8 });
    cam(V(6.5, 3.6, 3.5), V(-0.3, 1.9, 0.2), 46, T * (bt > 0 ? 6 : 1), 0.02 + (bt > 0 ? 0.15 * Math.exp(-bt * 5) : 0));
    label3('KNOCHENPLATTEN', V(0.3, 2.15, -0.6), clamp((T - WT(6, 'knochenplatten')) * 3), 120, -360);
    label3('STACHELN', V(0.95, 1.65, 1.0), clamp((T - WT(6, 'stacheln')) * 3), 160, 300);
  },
  // 7: ein Schlag zertrümmert den Knöchel
  (T) => {
    sunAt(V(-1, 0, -3)); const tHit = WT(7, 'schlag') + 0.05; const A = 0.85;
    const hitPose = { yaw: hingeYaw(A), pitch: REST_P, armor: 1, t: T, fuse: 1, fused: true, tendon: 1 };
    const walk = clamp((T - S[7].start) / (tHit - 0.35 - S[7].start)); const hd = T - tHit;
    poseRex(rex, { phase: T * 4.2, amp: 1 - ease((T - tHit + 0.5) / 0.4), t: T, jaw: hd > 0 ? lerp(0.15, 0.85, ease(hd / 0.3)) : 0.15, head: hd > 0 ? -0.2 * ease(hd / 0.3) : 0.12, tail: 1.12, teeth: 2.3 });
    const cp = placeRexForHit(hitPose, 1); rex.root.position.x -= (1 - ease(walk)) * 7.5;
    if (hd > 0) { const fk = ease((hd - 0.25) / 1.1); rex.legs[1].knee.rotation.x += 0.9 * ease(hd / 0.25); rex.legs[1].ankle.rotation.x -= 0.6 * ease(hd / 0.2); rex.root.rotation.z = 1.35 * fk; rex.root.position.y += 0.7 * Math.sin(fk * 1.35); rex.root.position.x -= 0.6 * fk; }
    poseAnky(anky, { yaw: hingeYaw(swingAng(T, tHit, A, true)), pitch: REST_P, armor: 1, t: T, fuse: 1, fused: true, tendon: 1 });
    if (hd > 0) { const o = cp.clone().add(V(-0.45, 0.1, 0)); burst(boneBits, o, hd, { spread: 2, up: 2.6, life: 1.2 }); burst(blood, o, hd, { spread: 1.8, up: 2.4, life: 1.1 }); flyShards(o, hd); }
    if (T < tHit - 0.9) cam(V(4.8, 4.2, -13.0), V(-1.8, 1.6, -4.0), 50, T, 0.03);
    else { CUT = tHit - 0.9; cam(cp.clone().add(V(5.6, 0.9, -2.6)), cp.clone().add(V(-0.8, 1.3, 0.4)), 50, T * 7, 0.02 + (hd > 0 ? 0.25 * Math.exp(-hd * 4) : 0)); }
    label3('KNÖCHEL', rexAnkle(1), clamp((T - WT(7, 'knöchel')) * 3), -120, -320);
  },
  // 8: Glückwunsch – Ankylosaurus
  (T) => {
    sunAt(V(0, 0, 0)); const u = T - S[8].start; const tA = WT(8, 'ankylo');
    poseAnky(anky, { yaw: hingeYaw(0.35 * Math.sin(T * 1.4)), pitch: REST_P, armor: 1, t: T, fuse: 1, fused: true, tendon: 1 });
    anky.ol.userData.u.uA.value = clamp((T - tA) * 4) * 0.9;
    rex.root.visible = false;
    const a = 0.9 - u * 0.15; const k = ease(u / 2.5); const R = lerp(9.0, 10.5, k); cam(V(Math.sin(a) * R, lerp(2.6, 3.4, k), Math.cos(a) * R - 1.6), V(0, 1.0, -1.6), 48, T, 0.02);
    cta.style.display = 'block';
  },
];
