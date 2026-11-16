// Shared procedural 3D building blocks (characters, props, environments)
import * as THREE from 'three';

export let RNG = mulberry(7);
export function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function reseed(s) { RNG = mulberry(s); }

const matCache = {};
let FABRIC = null;
function fabricTex() {
  if (!FABRIC) FABRIC = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.03})`; g.fillRect(0, y, w, 1); } for (let x = 0; x < w; x += 2) { g.fillStyle = `rgba(0,0,0,${0.03 + Math.random() * 0.03})`; g.fillRect(x, 0, 1, h); } for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.15})`; g.fillRect(Math.random() * w, Math.random() * h, 3, 1); } }, 3);
  return FABRIC;
}
export function mat(color, o = {}) {
  const k = color + JSON.stringify(o);
  if (!matCache[k]) {
    const base = { color, roughness: o.r ?? 0.55, metalness: o.m ?? 0, emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 1, transparent: !!o.t, opacity: o.t ?? 1, side: o.ds ? THREE.DoubleSide : THREE.FrontSide, envMapIntensity: o.env ?? 0.55 };
    if (o.fab) { base.map = fabricTex(); base.bumpMap = fabricTex(); base.bumpScale = 0.6; }
    matCache[k] = o.phys ? new THREE.MeshPhysicalMaterial({ ...base, clearcoat: o.cc ?? 0, clearcoatRoughness: 0.25, sheen: o.sheen ?? 0, sheenColor: new THREE.Color(o.sheenC ?? 0xff9a8a), sheenRoughness: 0.5 }) : new THREE.MeshStandardMaterial(base);
  }
  return matCache[k];
}
// per-shot animation registry (characters blink/breathe, clouds drift, trees sway ...)
export const REG = { tickers: [] };
export function resetReg() { REG.tickers.length = 0; }
export const tick = f => REG.tickers.push(f);
export function mesh(geo, m, x = 0, y = 0, z = 0, parent) {
  const me = new THREE.Mesh(geo, typeof m === 'number' ? mat(m) : m);
  me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true;
  if (parent) parent.add(me); return me;
}
export const sph = (r, s = 40) => new THREE.SphereGeometry(r, s, Math.round(s * 0.75));
export const box = (a, b, c) => new THREE.BoxGeometry(a, b, c);
export const cyl = (a, b, h, s = 24) => new THREE.CylinderGeometry(a, b, h, s);
export const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 10, 24);

export function canvasTex(w, h, draw, rep) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); }
  return t;
}

// ---------------- CHARACTER ----------------
export function makeGuy(o = {}) {
  const P = Object.assign({ skin: 0xf0b48a, shirt: 0x2f6fd6, pants: 0x4a4038, hair: 0x5a3a22, shoes: 0x2a2a2a, mustache: true, s: 1, kid: false }, o);
  const g = new THREE.Group(); g.scale.setScalar(P.s);
  const skin = mat(P.skin, { r: 0.5, phys: true, sheen: 0.6, sheenC: 0xff8f7a, cc: 0.08 });
  const shirtM = mat(P.shirt, { r: 0.85, fab: true }), pantsM = mat(P.pants, { r: 0.9, fab: true });
  P.shirt = shirtM; P.pants = pantsM; if (typeof P.sleeve === 'number') P.sleeve = mat(P.sleeve, { r: 0.85, fab: true });
  // torso
  const body = new THREE.Group(); g.add(body);
  const torso = mesh(cap(0.26, 0.42), shirtM, 0, 1.02, 0, body); torso.scale.set(P.belly ? 1.25 : 1, 1, P.belly ? 1.15 : 0.8);
  const fz = P.belly ? 0.29 : 0.212;
  if (P.suit) { const wm = mat(0xf4f2ee, { r: 0.7, fab: true }); const sh = mesh(box(0.13, 0.26, 0.01), wm, 0, 1.2, fz + 0.002, body);
    for (const sx of [-1, 1]) { const lp = mesh(box(0.07, 0.3, 0.012), mat(new THREE.Color(P.shirt.color).multiplyScalar(0.7).getHex(), { r: 0.6 }), sx * 0.085, 1.19, fz + 0.006, body); lp.rotation.z = sx * 0.28; }
    mesh(box(0.06, 0.03, 0.01), wm, 0.14, 1.2, fz + 0.004, body); for (let i = 0; i < 2; i++) mesh(sph(0.016, 10), mat(0x222222), 0, 0.98 - i * 0.1, fz + 0.01, body); }
  if (P.dress) { const sk = mesh(new THREE.CylinderGeometry(0.24, 0.46, 0.6, 32, 1, true), mat(P.dress, { r: 0.8, fab: true, ds: true }), 0, 0.5, 0, body); }
  if (P.collar !== false) {
    mesh(cyl(0.12, 0.14, 0.08), shirtM, 0, 1.3, 0, body);
    for (const sx of [-1, 1]) { const c = mesh(box(0.13, 0.025, 0.09), shirtM, sx * 0.07, 1.31, 0.13, body); c.rotation.set(0.5, 0, sx * -0.45); }
    if (!P.tie && !P.dress) { mesh(box(0.035, 0.42, 0.01), mat(new THREE.Color(P.shirt.color).multiplyScalar(0.8).getHex(), { r: 0.8 }), 0, 1.07, 0.212, body); for (let i = 0; i < 3; i++) mesh(sph(0.016, 12), mat(0xf4f1ea, { r: 0.3 }), 0, 1.21 - i * 0.12, 0.222, body); }
    if (!P.suit && !P.dress && !P.belly) { const pk = mesh(box(0.11, 0.1, 0.012), shirtM, 0.11, 1.17, 0.205, body); pk.rotation.y = 0.2; }
  }
  if (P.badge) mesh(box(0.07, 0.08, 0.02), mat(0xf5c542, { m: 0.8, r: 0.3 }), -0.13, 1.15, 0.21, g);
  if (P.tie) mesh(box(0.06, 0.32, 0.02), mat(P.tie, { r: 0.5, fab: true }), 0, 1.12, (P.belly ? 0.295 : 0.218), g);
  // belt + hips
  mesh(cyl(0.255, 0.255, 0.08), mat(0x3a2a1e, { r: 0.6 }), 0, 0.76, 0, g).scale.z = 0.8; mesh(box(0.08, 0.06, 0.02), mat(0xd9b44a, { m: 0.9, r: 0.25 }), 0, 0.76, 0.205, g);
  // legs (thigh pivot at hip, shin pivot at knee)
  const legs = [];
  for (const sx of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(sx * 0.12, 0.74, 0); g.add(hip);
    mesh(cap(0.105, 0.28), P.pants, 0, -0.2, 0, hip);
    const knee = new THREE.Group(); knee.position.set(0, -0.4, 0); hip.add(knee);
    mesh(cap(0.095, 0.26), P.pants, 0, -0.17, 0, knee);
    mesh(cyl(0.1, 0.1, 0.05), pantsM, 0, -0.3, 0, knee);
    const shoe = mesh(cap(0.08, 0.12), mat(P.shoes, { r: 0.45 }), 0, -0.36, 0.06, knee); shoe.rotation.x = Math.PI / 2;
    const sole = mesh(box(0.17, 0.035, 0.32), mat(0xe8e2d6, { r: 0.8 }), 0, -0.42, 0.06, knee);
    legs.push({ hip, knee });
  }
  // arms (shoulder pivot)
  const arms = [];
  for (const sx of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(sx * 0.33, 1.27, 0); g.add(sh);
    mesh(cap(0.085, 0.24), P.sleeve ?? P.shirt, 0, -0.14, 0, sh);
    const el = new THREE.Group(); el.position.set(0, -0.3, 0); sh.add(el);
    mesh(cap(0.07, 0.22), P.armSkin === false ? P.shirt : skin, 0, -0.13, 0, el);
    mesh(cyl(0.09, 0.095, 0.06), P.sleeve ?? P.shirt, 0, -0.27, 0, sh);
    const hand = mesh(sph(0.085, 20), skin, 0, -0.3, 0, el); hand.scale.set(1, 1.1, 0.8);
    const th = mesh(cap(0.028, 0.05), skin, sx * -0.06, -0.27, 0.04, el); th.rotation.z = sx * 0.6;
    arms.push({ sh, el, hand });
  }
  // head
  const head = new THREE.Group(); head.position.set(0, 1.62, 0.02); g.add(head);
  mesh(cyl(0.09, 0.1, 0.16), skin, 0, -0.27, -0.02, head);
  const skull = mesh(sph(0.34, 48), skin, 0, 0, 0, head); skull.scale.set(1, 1.05, 0.95);
  const jaw = mesh(sph(0.3, 32), skin, 0, -0.12, 0.03, head); jaw.scale.set(0.95, 0.75, 0.9);
  for (const sx of [-1, 1]) { const e = mesh(sph(0.075, 20), skin, sx * 0.33, -0.01, -0.02, head); e.scale.set(0.5, 1, 0.8); mesh(sph(0.04, 12), mat(new THREE.Color(P.skin).multiplyScalar(0.75).getHex(), { r: 0.7 }), sx * 0.355, -0.01, 0.0, head).scale.set(0.3, 0.8, 0.6); }
  const blush = mat(new THREE.Color(P.skin).lerp(new THREE.Color(0xff6f6f), 0.35).getHex(), { r: 0.6, phys: true, sheen: 0.5 });
  for (const sx of [-1, 1]) { const ck = mesh(sph(0.09, 24), blush, sx * 0.19, -0.1, 0.2, head); ck.scale.set(1, 0.75, 0.7); }
  // hair
  const hairM = mat(P.hair, { r: 0.8 });
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.355, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.42), hairM);
  hair.rotation.x = -0.35; hair.position.set(0, 0.03, -0.02); hair.castShadow = true; head.add(hair);
  const back = mesh(sph(0.34, 32), hairM, 0, 0.02, -0.07, head); back.scale.set(1.02, 1, 0.9);
  if (!P.kid && !P.female) { const fr = mesh(cap(0.07, 0.3), hairM, 0.03, 0.27, 0.2, head); fr.rotation.z = 1.4; fr.rotation.y = 0.3;
    for (let i = 0; i < 6; i++) { const a = -0.9 + i * 0.36; const tf = mesh(cap(0.06, 0.16), hairM, Math.sin(a) * 0.22, 0.3 - Math.abs(a) * 0.05, Math.cos(a) * 0.05 + 0.04, head); tf.rotation.set(-0.9, 0, -a * 0.6); }
    for (const sx of [-1, 1]) { const sb = mesh(cap(0.05, 0.12), hairM, sx * 0.31, 0.08, -0.04, head); sb.rotation.x = 0.2; } }
  else if (P.female) { for (const sx of [-1, 1]) { const sd = mesh(cap(0.1, 0.35), hairM, sx * 0.3, -0.12, -0.06, head); sd.rotation.z = sx * 0.15; } mesh(sph(0.16, 24), hairM, 0, 0.3, -0.25, head); const fr = mesh(cap(0.08, 0.32), hairM, 0, 0.29, 0.17, head); fr.rotation.z = Math.PI / 2; }
  else { for (let i = 0; i < 5; i++) { const sp = mesh(new THREE.ConeGeometry(0.06, 0.16, 8), hairM, -0.16 + i * 0.08, 0.33, 0.12, head); sp.rotation.x = 0.6; } }
  // face
  const face = new THREE.Group(); head.add(face);
  const eyes = [], pupils = [], lids = [];
  for (const sx of [-1, 1]) {
    const ew = mesh(sph(0.105, 32), mat(0xffffff, { r: 0.2 }), sx * 0.125, 0.07, 0.25, face); ew.scale.set(1, 1.15, 0.75);
    const pu = new THREE.Group(); pu.position.set(sx * 0.125, 0.07, 0.33); face.add(pu);
    mesh(sph(0.052, 20), mat(0x4a7a3a, { r: 0.3 }), 0, 0, 0, pu).scale.z = 0.4;
    mesh(sph(0.03, 16), mat(0x050505, { r: 0.1 }), 0, 0, 0.012, pu).scale.z = 0.4;
    mesh(sph(0.012, 8), mat(0xffffff, { e: 0xffffff, ei: 0.6 }), 0.015, 0.018, 0.024, pu);
    const lid = mesh(new THREE.SphereGeometry(0.112, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), skin, sx * 0.125, 0.07, 0.25, face);
    lid.scale.set(1, 1.15, 0.78); lid.rotation.x = -1.2; lids.push(lid);
    eyes.push(ew); pupils.push(pu);
  }
  const brows = [];
  for (const sx of [-1, 1]) { const b = mesh(cap(0.022, 0.12), mat(P.hair, { r: 0.9 }), sx * 0.13, 0.23, 0.29, face); b.rotation.z = Math.PI / 2; brows.push(b); }
  const nose = mesh(sph(0.065, 24), skin, 0, -0.04, 0.33, face); nose.scale.set(0.9, 0.8, 1); if (P.bignose) nose.scale.set(1.4, 1.2, 1.4);
  if (P.female) for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) { const ls = mesh(box(0.012, 0.05, 0.01), 0x111111, sx * (0.09 + k * 0.035), 0.19, 0.31, face); ls.rotation.z = sx * (-0.4 + k * 0.4); }
  if (P.female) for (const sx of [-1, 1]) mesh(sph(0.025, 10), mat(0xf5d76e, { m: 0.9, r: 0.2 }), sx * 0.34, -0.1, 0, head);
  if (P.mustache && !P.kid && !P.female) { for (const sx of [-1, 1]) { const mu = mesh(cap(0.038, 0.1), mat(P.hair, { r: 0.9, fab: true }), sx * 0.065, -0.118, 0.31, face); mu.rotation.z = Math.PI / 2 + sx * 0.35; mu.rotation.y = sx * -0.35; } }
  if (P.glasses) {
    for (const sx of [-1, 1]) { const r = mesh(new THREE.TorusGeometry(0.12, 0.018, 10, 32), 0x111111, sx * 0.125, 0.07, 0.35, face); const l = mesh(new THREE.CircleGeometry(0.12, 32), mat(0xbfe3ff, { t: 0.25, r: 0.05 }), sx * 0.125, 0.07, 0.355, face); l.castShadow = false; }
    mesh(box(0.05, 0.02, 0.02), 0x111111, 0, 0.09, 0.36, face);
  }
  // mouth variants
  const mouth = new THREE.Group(); mouth.position.set(0, -0.2, 0.275); face.add(mouth);
  const dark = mat(P.female ? 0x8a1a2a : 0x3a0d0d, { r: 0.9 }), teethM = mat(0xfafafa, { r: 0.3 }), tongueM = mat(0xd9505a, { r: 0.6 });
  const M = {};
  M.open = new THREE.Group(); mouth.add(M.open);
  mesh(sph(0.1, 24), dark, 0, 0, 0, M.open).scale.set(1.15, 1, 0.35);
  mesh(box(0.15, 0.03, 0.03), teethM, 0, 0.075, 0.02, M.open);
  mesh(sph(0.06, 16), tongueM, 0, -0.06, 0.02, M.open).scale.set(1.2, 0.6, 0.5);
  M.grin = new THREE.Group(); mouth.add(M.grin);
  const half = new THREE.Mesh(new THREE.CircleGeometry(0.16, 32, Math.PI, Math.PI), dark); half.scale.y = 0.9; half.position.z = 0.045; M.grin.add(half);
  const teeth = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.04), teethM); teeth.position.set(0, -0.02, 0.047); M.grin.add(teeth);
  const tng = new THREE.Mesh(new THREE.CircleGeometry(0.06, 24, 0, Math.PI), tongueM); tng.position.set(0, -0.135, 0.047); M.grin.add(tng);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.012, 6, 32, Math.PI), mat(0xb5524a)); lip.rotation.z = Math.PI; lip.scale.y = 0.9; lip.position.z = 0.046; M.grin.add(lip);
  M.grin.rotation.x = -0.25;
  M.smile = mesh(new THREE.TorusGeometry(0.1, 0.018, 8, 24, Math.PI), dark, 0, 0.05, 0.02, mouth); M.smile.rotation.z = Math.PI;
  M.frown = mesh(new THREE.TorusGeometry(0.09, 0.018, 8, 24, Math.PI), dark, 0, -0.06, 0.02, mouth);
  M.flat = mesh(cap(0.016, 0.12), dark, 0, 0, 0.03, mouth); M.flat.rotation.z = Math.PI / 2;
  const ret = { g, head, face, eyes, pupils, lids, brows, mouth, M, arms, legs, P, body, torso };
  const ph = Math.random() * 10, blinkEvery = 2.6 + Math.random() * 1.5;
  tick((t, T) => {
    const bt = (T + ph) % blinkEvery; const bl = bt < 0.12;
    lids.forEach(l => { if (bl) { l.visible = true; l.rotation.x = -0.05; } else { l.visible = l.userData.v ?? true; l.rotation.x = l.userData.rx ?? -1.2; } });
    torso.scale.y = 1 + Math.sin(T * 2.4 + ph) * 0.018; head.position.y = 1.62 + Math.sin(T * 2.4 + ph) * 0.006;
  });
  ret.expr = (e, amt = 1) => setExpr(ret, e, amt);
  ret.pose = (p) => setPose(ret, p);
  ret.look = (x, y) => pupils.forEach(p => { p.position.x = p.userData.x0 + x * 0.04; p.position.y = 0.07 + y * 0.045; });
  pupils.forEach(p => p.userData.x0 = p.position.x);
  ret.expr('smile'); ret.pose('stand');
  return ret;
}

function setExpr(c, e, amt = 1) {
  for (const k in c.M) c.M[k].visible = false;
  const [bl, br] = c.brows; bl.position.y = br.position.y = 0.23; bl.rotation.z = br.rotation.z = Math.PI / 2;
  c.lids.forEach(l => { l.rotation.x = -1.2; l.visible = true; });
  c.eyes.forEach(e => e.scale.set(1, 1.15, 0.75)); c.pupils.forEach(p => p.scale.setScalar(1));
  c.mouth.scale.setScalar(1);
  const show = k => c.M[k].visible = true;
  switch (e) {
    case 'grin': show('grin'); c.mouth.scale.set(1.15, 0.8 + 0.4 * amt, 1); bl.rotation.z = Math.PI / 2 + 0.25; br.rotation.z = Math.PI / 2 - 0.25; bl.position.y = br.position.y = 0.26; break;
    case 'crazy': show('grin'); c.mouth.scale.set(1.35, 1.5, 1); bl.position.y = br.position.y = 0.29; c.eyes.forEach(e => e.scale.set(1.2, 1.4, 0.8)); c.pupils.forEach(p => p.scale.setScalar(0.75)); c.lids.forEach(l => l.visible = false); break;
    case 'shock': show('open'); c.mouth.scale.set(1, 1.2 + 0.6 * amt, 1); bl.position.y = br.position.y = 0.3; c.eyes.forEach(e => e.scale.set(1.15, 1.35, 0.8)); c.pupils.forEach(p => p.scale.setScalar(0.65)); c.lids.forEach(l => l.visible = false); break;
    case 'scared': show('open'); c.mouth.scale.set(1.3, 0.7 + 0.3 * amt, 1); bl.rotation.z = Math.PI / 2 - 0.4; br.rotation.z = Math.PI / 2 + 0.4; bl.position.y = br.position.y = 0.27; c.eyes.forEach(e => e.scale.set(1.15, 1.3, 0.8)); c.pupils.forEach(p => p.scale.setScalar(0.6)); c.lids.forEach(l => l.visible = false); break;
    case 'angry': show('frown'); bl.rotation.z = Math.PI / 2 + 0.45; br.rotation.z = Math.PI / 2 - 0.45; bl.position.y = br.position.y = 0.2; c.lids.forEach(l => l.rotation.x = -0.75); break;
    case 'smug': show('smile'); c.mouth.scale.set(1.2, 1, 1); c.mouth.rotation.z = 0.15; bl.position.y = 0.27; br.rotation.z = Math.PI / 2 + 0.2; c.lids.forEach(l => l.rotation.x = -0.7); break;
    case 'squint': show('flat'); bl.position.y = br.position.y = 0.19; bl.rotation.z = Math.PI / 2 + 0.2; br.rotation.z = Math.PI / 2 - 0.2; c.lids.forEach(l => l.rotation.x = -0.25); break;
    case 'sad': show('frown'); bl.rotation.z = Math.PI / 2 - 0.35; br.rotation.z = Math.PI / 2 + 0.35; c.lids.forEach(l => l.rotation.x = -0.8); break;
    case 'dream': show('smile'); c.lids.forEach(l => l.rotation.x = -0.6); bl.position.y = br.position.y = 0.26; break;
    default: show('smile');
  }
  if (e !== 'smug') c.mouth.rotation.z = 0;
  c.lids.forEach(l => { l.userData.v = l.visible; l.userData.rx = l.rotation.x; });
}

function setPose(c, p) {
  const [aL, aR] = c.arms, [lL, lR] = c.legs;
  [aL, aR].forEach(a => { a.sh.rotation.set(0, 0, 0); a.el.rotation.set(0, 0, 0); });
  [lL, lR].forEach(l => { l.hip.rotation.set(0, 0, 0); l.knee.rotation.set(0, 0, 0); });
  aL.sh.rotation.z = -0.12; aR.sh.rotation.z = 0.12;
  if (p === 'sit' || p.startsWith('sit')) { [lL, lR].forEach(l => { l.hip.rotation.x = -1.5; l.knee.rotation.x = 1.45; }); lL.hip.rotation.z = -0.08; lR.hip.rotation.z = 0.08; }
  if (p.includes('armsUp')) { aL.sh.rotation.z = -2.6; aR.sh.rotation.z = 2.6; aL.el.rotation.z = -0.3; aR.el.rotation.z = 0.3; }
  if (p.includes('clutch')) { aL.sh.rotation.set(-0.5, 0, -0.55); aR.sh.rotation.set(-0.5, 0, 0.55); aL.el.rotation.x = -0.6; aR.el.rotation.x = -0.6; }
  if (p.includes('holdR')) { aR.sh.rotation.set(-1.2, 0, 0.15); aR.el.rotation.x = -0.4; }
  if (p.includes('holdL')) { aL.sh.rotation.set(-1.2, 0, -0.15); aL.el.rotation.x = -0.4; }
  if (p.includes('aim')) { aL.sh.rotation.set(-1.55, 0.4, -0.1); aR.sh.rotation.set(-1.4, -0.3, 0.2); aR.el.rotation.x = -0.6; }
  if (p.includes('point')) { aR.sh.rotation.set(-1.5, 0, 0.3); }
  if (p.includes('chin')) { aR.sh.rotation.set(-0.9, 0, 0.5); aR.el.rotation.x = -2.0; }
  if (p.includes('cheer')) { aR.sh.rotation.z = 2.7; aL.sh.rotation.z = -0.4; }
  if (p.includes('cuffed')) { aL.sh.rotation.set(0.5, 0, 0.25); aR.sh.rotation.set(0.5, 0, -0.25); aL.el.rotation.x = 0.5; aR.el.rotation.x = 0.5; }
  if (p.includes('headHands')) { aL.sh.rotation.set(-0.3, 0, -2.3); aR.sh.rotation.set(-0.3, 0, 2.3); aL.el.rotation.z = -1.5; aR.el.rotation.z = 1.5; }
}

// ---------------- PROPS ----------------
export function makeChair() {
  const g = new THREE.Group();
  const alu = mat(0xd8dde2, { m: 0.85, r: 0.25 });
  const web = canvasTex(256, 256, (x, w, h) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#2e9e5b' : '#f4f1e8'; x.fillRect(i * w / 8, 0, w / 8, h); } x.globalAlpha = .25; for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#1f6d3e' : '#ffffff'; x.fillRect(0, i * h / 8, w, h / 16); } });
  const wm = new THREE.MeshStandardMaterial({ map: web, roughness: 0.8, side: THREE.DoubleSide });
  const tube = (x1, y1, z1, x2, y2, z2, r = 0.022) => { const a = new THREE.Vector3(x1, y1, z1), b = new THREE.Vector3(x2, y2, z2); const l = a.distanceTo(b); const m = mesh(cyl(r, r, l, 10), alu); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); g.add(m); };
  for (const sx of [-0.3, 0.3]) {
    tube(sx, 0, 0.3, sx, 0.45, 0.25); tube(sx, 0, -0.3, sx, 0.45, -0.25);
    tube(sx, 0.45, 0.3, sx, 0.45, -0.3); tube(sx, 0.45, -0.3, sx, 1.15, -0.5);
    tube(sx, 0.68, 0.3, sx, 0.68, -0.32); tube(sx, 0.45, 0.28, sx, 0.68, 0.28);
  }
  tube(-0.3, 1.15, -0.5, 0.3, 1.15, -0.5); tube(-0.3, 0.45, 0.3, 0.3, 0.45, 0.3); tube(-0.3, 0.45, -0.3, 0.3, 0.45, -0.3);
  const seat = mesh(new THREE.PlaneGeometry(0.6, 0.6), wm, 0, 0.44, 0, g); seat.rotation.x = -Math.PI / 2;
  const bk = mesh(new THREE.PlaneGeometry(0.6, 0.74), wm, 0, 0.8, -0.4, g); bk.rotation.x = -0.28;
  for (const sx of [-0.3, 0.3]) mesh(box(0.06, 0.03, 0.6), 0xf4f1e8, sx, 0.69, 0, g);
  return g;
}

const BCOL = [0xff4d6d, 0xffd23f, 0x3bceac, 0x4d96ff, 0xff9f1c, 0xc77dff, 0xf15bb5, 0x00bbf9, 0xfee440, 0x9ef01a];
export const WIND = { v: 1 };
export function makeBalloons(n = 45, opts = {}) {
  const g = new THREE.Group(); const balls = [];
  const R = opts.R ?? 0.5, rx = opts.rx ?? 2.0, ry = opts.ry ?? 1.6, cy = opts.cy ?? 6.5;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const y = 1 - (i + 0.5) / n * 1.6; const r = Math.sqrt(Math.max(0, 1 - y * y)); const th = i * 2.399963;
    pts.push(new THREE.Vector3(Math.cos(th) * r * rx * (0.85 + RNG() * 0.25), cy + y * ry, Math.sin(th) * r * rx * (0.85 + RNG() * 0.25)));
  }
  const lineGeo = new THREE.BufferGeometry(); const arr = new Float32Array(n * 6); lineGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: 0xeeeeee, transparent: true, opacity: 0.85 })); g.add(lines);
  pts.forEach((p, i) => {
    const b = new THREE.Group(); b.position.copy(p); g.add(b);
    const m = mesh(sph(R, 32), mat(BCOL[i % BCOL.length], { r: 0.3, phys: true, cc: 1, env: 0.9 }), 0, 0, 0, b); m.scale.set(1, 1.18, 1);
    mesh(new THREE.ConeGeometry(0.06, 0.1, 10), mat(BCOL[i % BCOL.length]), 0, -R * 1.2, 0, b).rotation.x = Math.PI;
    b.userData = { base: p.clone(), ph: RNG() * 6.28, alive: true };
    balls.push(b);
  });
  const anchors = [new THREE.Vector3(-0.3, 0.68, 0.28), new THREE.Vector3(0.3, 0.68, 0.28), new THREE.Vector3(-0.3, 1.15, -0.5), new THREE.Vector3(0.3, 1.15, -0.5)];
  const upd = (t) => {
    balls.forEach((b, i) => {
      const d = b.userData; const w = WIND.v; b.position.set(d.base.x + Math.sin(t * 1.3 + d.ph) * 0.1 * w + w * 0.25 * (d.base.y - 5) * 0.15, d.base.y + Math.sin(t * 1.7 + d.ph) * 0.07, d.base.z + Math.cos(t * 1.1 + d.ph) * 0.1 * w);
      b.rotation.z = Math.sin(t * 1.9 + d.ph) * 0.12 * w; b.rotation.x = Math.cos(t * 1.5 + d.ph) * 0.1 * w;
      const a = anchors[i % 4]; arr.set([a.x, a.y, a.z, b.position.x, b.position.y - R * 1.2, b.position.z], i * 6);
      if (!b.visible) arr.set([a.x, a.y, a.z, a.x, a.y, a.z], i * 6);
    });
    lineGeo.attributes.position.needsUpdate = true;
  };
  upd(0);
  return { g, balls, update: upd };
}

export function makeJet() {
  const g = new THREE.Group(); const white = mat(0xf4f6f8, { r: 0.35, m: 0.2 }), blue = mat(0x1d4fa3, { r: 0.4 });
  const body = mesh(cap(1.6, 14), white, 0, 0, 0, g); body.rotation.z = Math.PI / 2;
  const stripe = mesh(cyl(1.62, 1.62, 14, 32, 1), blue, 0, -0.45, 0, g); stripe.rotation.z = Math.PI / 2; stripe.scale.set(1, 1, 1); stripe.scale.y = 1; stripe.scale.x = 0.25;
  for (let i = 0; i < 22; i++) mesh(box(0.25, 0.32, 0.1), 0x1a2a3a, -6 + i * 0.55, 0.45, 1.5, g);
  const cock = mesh(box(0.9, 0.35, 2.2), mat(0x10202e, { r: 0.1, m: 0.5 }), 8.0, 0.55, 0, g); cock.rotation.z = -0.35;
  const wing = mesh(box(4, 0.25, 18), white, -1, -0.6, 0, g); wing.rotation.y = 0.0;
  for (const sz of [-4, 4]) { const e = mesh(cyl(0.7, 0.6, 2.8), mat(0xc8ccd2, { m: 0.6, r: 0.3 }), 0.2, -1.4, sz, g); e.rotation.z = Math.PI / 2; mesh(cyl(0.5, 0.5, 0.05), 0x222222, 1.62, -1.4, sz, g).rotation.z = Math.PI / 2; }
  const tail = mesh(box(3, 4.2, 0.25), blue, -7.5, 2.4, 0, g); tail.rotation.z = 0.5;
  const hs = mesh(box(2.2, 0.2, 7), white, -7.8, 0.6, 0, g);
  return g;
}

export function makeCloud(s = 1) {
  const g = new THREE.Group(); const m = mat(0xffffff, { r: 1, e: 0xdfe8f5, ei: 0.3, env: 0.3 });
  for (let i = 0; i < 14; i++) { const c = mesh(sph(1, 20), m, (RNG() - 0.5) * 6, (RNG() - 0.2) * 1.4, (RNG() - 0.5) * 3, g); c.scale.set(0.9 + RNG() * 1.3, 0.7 + RNG() * 0.9, 0.9 + RNG() * 1.2); c.castShadow = false; c.receiveShadow = false; }
  g.scale.setScalar(s); const sp = (0.6 + RNG()) * 1.2 * s;
  tick(t => { if (!g.userData.x0 && g.userData.x0 !== 0) g.userData.x0 = g.position.x; g.position.x = g.userData.x0 + t * sp; });
  return g;
}

let _sid, _shi;
const SIDING = () => _sid || (_sid = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 16) { g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, y + 13, w, 3); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(0, y, w, 2); } }, 2));
const SHINGLE = () => _shi || (_shi = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 20) for (let x = (y / 20 % 2) * 16; x < w; x += 32) { const v = 200 + Math.random() * 55 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, 30, 18); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x, y + 16, 30, 3); } }, 3));
export function makeHouse(col = 0xe9dcc4, roof = 0x8a3b2e, lit = false) {
  const g = new THREE.Group();
  mesh(box(8, 4.5, 7), new THREE.MeshStandardMaterial({ color: col, map: SIDING(), roughness: 0.85, envMapIntensity: 0.4 }), 0, 2.25, 0, g);
  mesh(box(0.9, 2.2, 0.9), 0x9a5a44, 2.4, 6.4, -1, g);
  mesh(box(8.4, 0.3, 7.4), 0xf3efe6, 0, 0.15, 0, g);
  const sh = new THREE.Shape(); sh.moveTo(-4.6, 0); sh.lineTo(4.6, 0); sh.lineTo(0, 2.6); sh.lineTo(-4.6, 0);
  const rg = new THREE.ExtrudeGeometry(sh, { depth: 7.8, bevelEnabled: false }); rg.translate(0, 0, -3.9);
  const r = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ color: roof, map: SHINGLE(), roughness: 0.9, envMapIntensity: 0.3 })); r.position.set(0, 4.5, 0); r.castShadow = true; r.receiveShadow = true; g.add(r);
  const winM = lit ? mat(0xffd77a, { e: 0xffc04a, ei: 1.2 }) : mat(0x6f8fae, { r: 0.1, m: 0.4 });
  const wins = [];
  for (const [x, y] of [[-2.6, 3], [2.6, 3], [-2.6, 1.3], [2.6, 1.3]]) { mesh(box(1.5, 1.2, 0.1), 0xffffff, x, y, 3.52, g); wins.push(mesh(box(1.3, 1.0, 0.12), winM, x, y, 3.53, g)); }
  mesh(box(1.2, 2.3, 0.12), 0x7a4a2a, 0, 1.15, 3.53, g);
  g.userData.wins = wins; return g;
}

export function makeTree(s = 1) {
  const g = new THREE.Group(); mesh(cyl(0.18, 0.28, 3), 0x6b4a2b, 0, 1.5, 0, g);
  const lm = mat(0x3f8f3a, { r: 0.9 });
  const crown = new THREE.Group(); crown.position.y = 2.6; g.add(crown); const lm2 = mat(0x4fa346, { r: 0.9, fab: true }), lm3 = mat(0x2f7a32, { r: 0.9 });
  for (let i = 0; i < 9; i++) mesh(sph(1, 18), [lm, lm2, lm3][i % 3], (RNG() - 0.5) * 2, 0.7 + RNG() * 1.6, (RNG() - 0.5) * 2, crown).scale.setScalar(0.8 + RNG() * 0.6);
  const ph = RNG() * 6; tick((t, T) => { crown.rotation.z = Math.sin(T * 1.3 + ph) * 0.035 * WIND.v; crown.rotation.x = Math.cos(T * 1.1 + ph) * 0.025 * WIND.v; });
  g.scale.setScalar(s); return g;
}

export function makeFence(len = 30) {
  const g = new THREE.Group(); const m = mat(0xf2efe6, { r: 0.7 });
  for (let i = 0; i < len / 0.35; i++) mesh(box(0.22, 1.3, 0.06), m, -len / 2 + i * 0.35, 0.65, 0, g);
  mesh(box(len, 0.12, 0.08), m, 0, 0.4, -0.06, g); mesh(box(len, 0.12, 0.08), m, 0, 1.0, -0.06, g);
  return g;
}

export function makeTank() {
  const g = new THREE.Group(); mesh(cap(0.22, 1.1), mat(0x6c7a89, { m: 0.6, r: 0.35 }), 0, 0.77, 0, g);
  mesh(cyl(0.07, 0.07, 0.15), 0x999999, 0, 1.55, 0, g); mesh(box(0.25, 0.05, 0.05), 0x333333, 0, 1.6, 0, g);
  const l = mesh(cyl(0.225, 0.225, 0.4, 24, 1), mat(0x2f7d4f), 0, 0.9, 0, g); return g;
}

export function makeGun() {
  const g = new THREE.Group(); mesh(cyl(0.025, 0.025, 0.9), mat(0x2b2b2b, { m: 0.8, r: 0.3 }), 0, 0, 0.35, g).rotation.x = Math.PI / 2;
  const st = mesh(box(0.08, 0.14, 0.5), 0x7a4a24, 0, -0.04, -0.25, g); st.rotation.x = 0.12; return g;
}
export function makeBeer() { const g = new THREE.Group(); mesh(cyl(0.065, 0.065, 0.24), mat(0xe8e8ea, { m: 0.9, r: 0.25 }), 0, 0.12, 0, g); mesh(cyl(0.066, 0.066, 0.12), mat(0x1d5fc4, { r: 0.4 }), 0, 0.12, 0, g); mesh(cyl(0.05, 0.065, 0.02), 0xcfcfcf, 0, 0.25, 0, g); return g; }
export function makeSandwich() { const g = new THREE.Group(); mesh(box(0.3, 0.06, 0.3), 0xe7c08a, 0, 0.03, 0, g); mesh(box(0.33, 0.02, 0.33), 0x5bbd3a, 0, 0.07, 0, g); mesh(box(0.3, 0.03, 0.3), 0xd9534f, 0, 0.095, 0, g); mesh(box(0.31, 0.02, 0.31), 0xf6d34a, 0, 0.12, 0, g); mesh(box(0.3, 0.06, 0.3), 0xe7c08a, 0, 0.16, 0, g); g.rotation.y = 0.5; return g; }
export function makeRadio() { const g = new THREE.Group(); mesh(box(0.4, 0.15, 0.3), 0x333333, 0, 0.075, 0, g); mesh(box(0.25, 0.06, 0.01), mat(0x7fff7f, { e: 0x33ff55, ei: 0.8 }), -0.03, 0.09, 0.155, g); for (const x of [0.12, 0.16]) mesh(cyl(0.02, 0.02, 0.03), 0xbbbbbb, x, 0.08, 0.16, g).rotation.x = Math.PI / 2; mesh(cyl(0.008, 0.008, 0.6), 0x111111, 0.17, 0.45, -0.1, g); return g; }

export function makePoliceCar() {
  const g = new THREE.Group();
  mesh(box(4.6, 0.8, 1.9), 0x111111, 0, 0.75, 0, g); mesh(box(2.3, 0.82, 1.92), 0xffffff, 0.1, 0.75, 0, g);
  mesh(box(2.4, 0.65, 1.7), 0xf3f3f3, -0.2, 1.45, 0, g); mesh(box(2.2, 0.5, 1.72), mat(0x1a2633, { m: 0.5, r: 0.1 }), -0.2, 1.45, 0, g);
  for (const [x, z] of [[1.5, 0.95], [-1.5, 0.95], [1.5, -0.95], [-1.5, -0.95]]) mesh(cyl(0.38, 0.38, 0.3, 20), 0x151515, x, 0.38, z, g).rotation.x = Math.PI / 2;
  const red = mesh(box(0.6, 0.18, 0.4), mat(0xff2222, { e: 0xff0000, ei: 2 }), -0.55, 1.88, 0, g);
  const blu = mesh(box(0.6, 0.18, 0.4), mat(0x2244ff, { e: 0x0033ff, ei: 2 }), 0.15, 1.88, 0, g);
  const lR = new THREE.PointLight(0xff2020, 8, 12); lR.position.set(-0.6, 2.2, 0); g.add(lR);
  const lB = new THREE.PointLight(0x2050ff, 8, 12); lB.position.set(0.2, 2.2, 0); g.add(lB);
  g.userData.flash = t => { const on = Math.floor(t * 6) % 2; lR.intensity = on ? 14 : 0; lB.intensity = on ? 0 : 14; red.material.emissiveIntensity = on ? 3 : 0.2; blu.material.emissiveIntensity = on ? 0.2 : 3; };
  return g;
}

export function makePole() { const g = new THREE.Group(); mesh(cyl(0.14, 0.18, 10), 0x6b4a2b, 0, 5, 0, g); mesh(box(3, 0.18, 0.18), 0x6b4a2b, 0, 9.3, 0, g); for (const x of [-1.3, 0, 1.3]) mesh(cyl(0.06, 0.06, 0.2), 0x88aacc, x, 9.48, 0, g); return g; }

export function wire(a, b, sag = 1, color = 0x111111) {
  const pts = []; for (let i = 0; i <= 30; i++) { const u = i / 30; const p = a.clone().lerp(b, u); p.y -= Math.sin(u * Math.PI) * sag; pts.push(p); }
  const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.03, 6); return mesh(tube, color);
}

export function skyTex(top, mid, bot) {
  return canvasTex(16, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(0.6, mid); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
}

export function grassTex() {
  return canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#5aa53c'; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { const v = 70 + Math.random() * 60; g.fillStyle = `rgba(${v * 0.6 | 0},${v + 60 | 0},${v * 0.35 | 0},0.5)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 5); } }, 30);
}
export function cityTex() {
  return canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#6f8f5a'; g.fillRect(0, 0, w, h);
    const bs = 64; for (let x = 0; x < w; x += bs) for (let y = 0; y < h; y += bs) {
      g.fillStyle = '#8a8f96'; g.fillRect(x, y, bs, bs); g.fillStyle = Math.random() < 0.2 ? '#5d8a4a' : '#c9c2b0'; g.fillRect(x + 6, y + 6, bs - 12, bs - 12);
      for (let i = 0; i < 6; i++) { g.fillStyle = ['#b55a45', '#d8d2c2', '#8c7b6a', '#a9b4bf'][Math.random() * 4 | 0]; g.fillRect(x + 8 + Math.random() * 40, y + 8 + Math.random() * 40, 8 + Math.random() * 10, 8 + Math.random() * 10); }
    }
    g.fillStyle = '#3b6fa8'; g.beginPath(); g.moveTo(0, h * 0.75); g.bezierCurveTo(w * 0.3, h * 0.7, w * 0.6, h * 0.95, w, h * 0.85); g.lineTo(w, h); g.lineTo(0, h); g.fill();
  }, 6);
}

// ---------------- NEW ENVIRONMENT DETAILS ----------------
export function makeGrass(n = 5000, R = 12, cx = 0, cz = 0) {
  const geo = new THREE.ConeGeometry(0.035, 0.28, 3); geo.translate(0, 0.14, 0);
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, envMapIntensity: 0.3 });
  const im = new THREE.InstancedMesh(geo, m, n); const d = new THREE.Object3D(); const c = new THREE.Color();
  const base = [];
  for (let i = 0; i < n; i++) { const r = Math.sqrt(RNG()) * R, a = RNG() * 6.28; d.position.set(cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r); d.rotation.set((RNG() - 0.5) * 0.4, RNG() * 6, (RNG() - 0.5) * 0.4); d.scale.setScalar(0.6 + RNG() * 0.9); d.updateMatrix(); im.setMatrixAt(i, d.matrix); c.setHSL(0.26 + RNG() * 0.06, 0.55, 0.28 + RNG() * 0.15); im.setColorAt(i, c); }
  im.receiveShadow = true; return im;
}
export function makeFlowers(n = 40, x0 = -10, x1 = 10, z = -13.4) {
  const g = new THREE.Group(); const cols = [0xff5d8f, 0xffd23f, 0xffffff, 0xc77dff, 0xff7b39];
  for (let i = 0; i < n; i++) { const x = x0 + (x1 - x0) * RNG(), zz = z + RNG() * 0.8; mesh(cyl(0.012, 0.012, 0.45, 5), 0x3c8a35, x, 0.22, zz, g); const f = mesh(sph(0.07, 10), mat(cols[i % 5], { r: 0.6 }), x, 0.47, zz, g); f.scale.y = 0.6; f.castShadow = false; }
  for (let i = 0; i < 8; i++) { const b = mesh(sph(0.6, 16), mat(0x3d8b3a, { r: 0.95, fab: true }), x0 + (x1 - x0) * RNG(), 0.4, z + 0.3, g); b.scale.set(1.2, 0.8, 1); }
  return g;
}
export function makeJeep(col = 0x5b6b3a) {
  const g = new THREE.Group(); const m = mat(col, { r: 0.5, m: 0.3 });
  mesh(box(3.6, 0.9, 1.8), m, 0, 0.9, 0, g); mesh(box(1.6, 0.8, 1.7), m, -0.6, 1.75, 0, g); mesh(box(0.08, 0.6, 1.6), mat(0x9fc6e0, { r: 0.05, m: 0.5 }), 0.24, 1.75, 0, g);
  for (const [x, z] of [[1.2, 0.95], [-1.2, 0.95], [1.2, -0.95], [-1.2, -0.95]]) { mesh(cyl(0.42, 0.42, 0.32, 20), 0x1a1a1a, x, 0.42, z, g).rotation.x = Math.PI / 2; mesh(cyl(0.2, 0.2, 0.34, 12), 0xaaaaaa, x, 0.42, z, g).rotation.x = Math.PI / 2; }
  for (const z of [-0.6, 0.6]) mesh(sph(0.13, 12), mat(0xfff6c8, { e: 0xfff0a0, ei: 0.3 }), 1.81, 1.05, z, g);
  return g;
}
export function makeMailbox() { const g = new THREE.Group(); mesh(cyl(0.05, 0.05, 1.1), 0x6b4a2b, 0, 0.55, 0, g); const b = mesh(cap(0.16, 0.3), mat(0x2f5fb3, { m: 0.4, r: 0.4 }), 0, 1.2, 0, g); b.rotation.x = Math.PI / 2; mesh(box(0.04, 0.2, 0.06), 0xd62828, 0.17, 1.3, 0.05, g); return g; }
export function makeBirds(n = 5, center = new THREE.Vector3(0, 12, -20)) {
  const g = new THREE.Group(); const m = mat(0x2a2a2a, { r: 0.8, ds: true });
  const birds = [];
  for (let i = 0; i < n; i++) { const b = new THREE.Group(); for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.14), m); w.geometry.translate(sx * 0.25, 0, 0); b.add(w); b.userData[sx] = w; } b.position.set(center.x + (RNG() - 0.5) * 6, center.y + (RNG() - 0.5) * 2, center.z + (RNG() - 0.5) * 4); b.userData.ph = RNG() * 6; g.add(b); birds.push(b); }
  tick((t, T) => birds.forEach((b, i) => { const f = Math.sin(T * 10 + b.userData.ph) * 0.6; b.userData[-1].rotation.z = -f; b.userData[1].rotation.z = f; b.position.x += 0.06; b.position.y += Math.sin(T * 2 + i) * 0.005; }));
  return g;
}
export function makeHills() {
  const g = new THREE.Group(); const m = mat(0x7fa6c9, { r: 1, env: 0.1 });
  for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2; const h = mesh(new THREE.ConeGeometry(60 + RNG() * 50, 30 + RNG() * 40, 7), m, Math.cos(a) * 320, -5, Math.sin(a) * 320, g); h.castShadow = false; h.receiveShadow = false; }
  return g;
}
export function makeWindStreaks(n = 40, area = 8) {
  const g = new THREE.Group(); const m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false });
  const ls = []; for (let i = 0; i < n; i++) { const l = new THREE.Mesh(box(1.4, 0.012, 0.012), m); l.position.set((RNG() - 0.5) * area * 2, (RNG() - 0.5) * area, (RNG() - 0.5) * area); l.userData.sp = 8 + RNG() * 10; g.add(l); ls.push(l); }
  tick((t) => ls.forEach((l, i) => { l.position.x = ((l.userData.sp * t + i * 3.1) % (area * 2)) - area; }));
  return g;
}
export function makeTower() {
  const g = new THREE.Group(); mesh(cyl(1.2, 1.6, 22, 24), mat(0xe8e4dc, { r: 0.7 }), 0, 11, 0, g);
  mesh(cyl(3.2, 2.4, 2.6, 8), mat(0xe8e4dc, { r: 0.6 }), 0, 23, 0, g); mesh(cyl(3.3, 3.3, 2.0, 8), mat(0x1e3a55, { r: 0.05, m: 0.6, env: 1 }), 0, 25.2, 0, g); mesh(cyl(3.6, 3.6, 0.4, 8), 0xdddddd, 0, 26.4, 0, g);
  const rad = new THREE.Group(); rad.position.y = 27.4; g.add(rad); mesh(box(3, 0.6, 0.2), 0xcccccc, 0, 0.4, 0, rad); mesh(cyl(0.1, 0.1, 0.8), 0x888888, 0, 0, 0, rad);
  tick((t) => rad.rotation.y = t * 4); return g;
}

// ================= VIDEO 02: PARIS 1925 =================
export function latticeTex() {
  return canvasTex(128, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#fff'; g.lineWidth = 7; g.strokeRect(3, 3, w - 6, h - 6); g.lineWidth = 4; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke(); g.lineWidth = 3; g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke(); });
}
export function makeEiffel(col = 0x6f5236) {
  const g = new THREE.Group(); const base = latticeTex();
  const lm = (rx, ry) => { const t = base.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return new THREE.MeshStandardMaterial({ color: col, map: t, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.7, metalness: 0.3, envMapIntensity: 0.6 }); };
  const solid = mat(col, { r: 0.6, m: 0.3 });
  const frustum = (r0, r1, h, y, rx, ry) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, h, 4, 1, true), lm(rx, ry)); m.rotation.y = Math.PI / 4; m.position.y = y + h / 2; m.castShadow = true; g.add(m); return m; };
  // legs
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const a = new THREE.Vector3(sx * 13, 0, sz * 13), b = new THREE.Vector3(sx * 7.5, 15, sz * 7.5); const l = a.distanceTo(b);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.6, l, 4, 1, true), lm(2, 6)); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); m.castShadow = true; g.add(m);
    mesh(box(4, 1, 4), solid, sx * 13, 0.5, sz * 13, g);
  }
  for (let i = 0; i < 4; i++) { const a = mesh(new THREE.TorusGeometry(8.5, 0.45, 8, 32, Math.PI), solid, 0, 4.5, 0, g); a.rotation.y = i * Math.PI / 2; a.position.set(Math.sin(i * Math.PI / 2) * 10.3, 4.5, Math.cos(i * Math.PI / 2) * 10.3); a.rotation.y = i * Math.PI / 2 + Math.PI / 2 * 0; a.rotation.y = (i % 2) ? Math.PI / 2 : 0; a.scale.y = 1.15; }
  mesh(box(23, 1.6, 23), lm(10, 1), 0, 15.6, 0, g); mesh(box(23.4, 0.3, 23.4), solid, 0, 16.5, 0, g);
  frustum(10.5, 6.2, 13, 16.5, 5, 6);
  mesh(box(12, 1.1, 12), lm(6, 1), 0, 30, 0, g); mesh(box(12.4, 0.25, 12.4), solid, 0, 30.6, 0, g);
  frustum(5.6, 1.4, 30, 30.6, 3, 18);
  mesh(box(3.2, 1.6, 3.2), solid, 0, 61.4, 0, g); mesh(sph(1.4, 16), solid, 0, 62.8, 0, g); mesh(cyl(0.12, 0.2, 5), solid, 0, 66, 0, g);
  return g;
}
let _cob, _fac, _wall, _parq, _bill;
export const cobbleTex = () => _cob || (_cob = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#6d6a66'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32) for (let x = (y / 32 % 2) * 20; x < w + 40; x += 40) { const v = 120 + Math.random() * 50 | 0; g.fillStyle = `rgb(${v},${v - 4},${v - 10})`; g.beginPath(); g.roundRect(x - 18, y + 2, 36, 28, 9); g.fill(); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x - 12, y + 5, 20, 4); } }, 30));
export const facadeTex = () => _fac || (_fac = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#efe3c8'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(150,130,100,0.25)'; for (let y = 0; y < h; y += 16) g.fillRect(0, y, w, 2); g.fillStyle = '#41506a'; g.fillRect(70, 50, 116, 160); g.fillStyle = '#9fb7cf'; g.fillRect(80, 60, 44, 70); g.fillRect(132, 60, 44, 70); g.fillRect(80, 136, 44, 66); g.fillRect(132, 136, 44, 66); g.fillStyle = '#e8dcc0'; g.fillRect(60, 40, 136, 12); g.fillStyle = '#222'; g.fillRect(56, 196, 144, 6); for (let x = 60; x < 200; x += 10) g.fillRect(x, 202, 3, 28); g.fillRect(56, 228, 144, 4); }));
export const wallpaperTex = () => _wall || (_wall = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#7a2632'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(232,190,110,0.55)'; for (let x = 0; x < w; x += 64) for (let y = 0; y < h; y += 64) { g.beginPath(); g.ellipse(x + 32, y + 32, 10, 18, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(x, y, 6, 10, 0, 0, 7); g.fill(); } g.fillStyle = 'rgba(0,0,0,0.12)'; for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 3, h); }, 4));
export const parquetTex = () => _parq || (_parq = canvasTex(256, 256, (g, w, h) => { for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 64) { const v = 120 + Math.random() * 40 | 0; g.fillStyle = `rgb(${v + 40},${v},${v - 50})`; g.fillRect(x + ((y / 32) % 2) * 32, y, 62, 30); } }, 8));
export const billTex = () => _bill || (_bill = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#c9dcb3'; g.fillRect(0, 0, w, h); g.strokeStyle = '#4c6b3c'; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12); g.fillStyle = '#4c6b3c'; g.beginPath(); g.ellipse(w / 2, h / 2, 34, 40, 0, 0, 7); g.fill(); g.font = '900 34px Inter Display'; g.fillText('1000', 18, 44); g.fillText('1000', w - 98, h - 18); g.fillStyle = '#c9dcb3'; g.font = '900 30px Inter Display'; g.textAlign = 'center'; g.fillText('F', w / 2, h / 2 + 10); }));
export function makeParisBuilding(wd = 10, ht = 14, dp = 8, tint = 0xffffff) {
  const g = new THREE.Group(); const t = facadeTex().clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(wd / 2.6, (ht - 3) / 2.6);
  mesh(box(wd, ht - 3, dp), new THREE.MeshStandardMaterial({ color: tint, map: t, roughness: 0.85, envMapIntensity: 0.4 }), 0, 3 + (ht - 3) / 2, 0, g);
  mesh(box(wd, 3, dp), mat(0xd9ccb0, { r: 0.8 }), 0, 1.5, 0, g);
  for (let x = -wd / 2 + 1.5; x < wd / 2 - 1; x += 3) mesh(box(2, 2.3, 0.1), mat(0x2b3a4a, { r: 0.1, m: 0.5 }), x, 1.3, dp / 2 + 0.02, g);
  const rf = mesh(box(wd - 0.6, 2.4, dp - 0.6), mat(0x55606e, { r: 0.6, m: 0.3 }), 0, ht + 1.2, 0, g); rf.scale.x = 1;
  for (let x = -wd / 2 + 1.5; x < wd / 2 - 1; x += 2.6) { mesh(box(1, 1.2, 0.8), 0xe9dfc8, x, ht + 1.2, dp / 2 - 0.2, g); mesh(box(0.6, 0.8, 0.05), 0x2b3a4a, x, ht + 1.2, dp / 2 + 0.22, g); }
  mesh(box(0.8, 1.6, 0.8), 0xb3735a, wd / 2 - 1.5, ht + 3, 0, g);
  return g;
}
export function makeAwning(w = 6, c1 = '#c0392b') { const t = canvasTex(128, 32, (g, W, H) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f6efe0' : c1; g.fillRect(i * W / 8, 0, W / 8, H); } }); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.6), new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, roughness: 0.9 })); m.rotation.x = -0.9; m.castShadow = true; return m; }
export function makeStreetLamp() { const g = new THREE.Group(); const m = mat(0x1d2420, { m: 0.6, r: 0.4 }); mesh(cyl(0.08, 0.14, 4), m, 0, 2, 0, g); mesh(cyl(0.2, 0.25, 0.3), m, 0, 0.15, 0, g); const l = mesh(cyl(0.18, 0.28, 0.5, 6), mat(0xfff2c0, { e: 0xffd27a, ei: 0.4 }), 0, 4.3, 0, g); mesh(new THREE.ConeGeometry(0.32, 0.3, 6), m, 0, 4.7, 0, g); g.userData.lamp = l; return g; }
export function makeCafeTable() { const g = new THREE.Group(); mesh(cyl(0.4, 0.4, 0.04, 24), mat(0xe8e8e8, { m: 0.6, r: 0.3 }), 0, 0.75, 0, g); mesh(cyl(0.03, 0.03, 0.73), 0x222222, 0, 0.37, 0, g); mesh(cyl(0.2, 0.25, 0.03), 0x222222, 0, 0.02, 0, g); const cup = mesh(cyl(0.05, 0.04, 0.08), 0xffffff, 0.15, 0.81, 0.1, g); mesh(cyl(0.09, 0.09, 0.01), 0xffffff, 0.15, 0.775, 0.1, g); return g; }
export function makeChairWood(col = 0x8b2e2e) { const g = new THREE.Group(); const w = mat(0x5a3a22, { r: 0.5 }); for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) mesh(cyl(0.025, 0.025, 0.45), w, x, 0.22, z, g); mesh(box(0.48, 0.08, 0.48), mat(col, { fab: true, r: 0.9 }), 0, 0.48, 0, g); mesh(box(0.48, 0.6, 0.06), mat(col, { fab: true, r: 0.9 }), 0, 0.8, -0.22, g); return g; }
export function makeBill() { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.16), new THREE.MeshStandardMaterial({ map: billTex(), side: THREE.DoubleSide, roughness: 0.8 })); m.castShadow = true; return m; }
export function makeCashStack(n = 1) { const g = new THREE.Group(); const side = mat(0xc9dcb3, { r: 0.9 }); const top = new THREE.MeshStandardMaterial({ map: billTex(), roughness: 0.8 }); for (let i = 0; i < n; i++) { const b = new THREE.Mesh(box(0.32, 0.08, 0.16), [side, side, top, side, side, side]); b.position.set((i % 3) * 0.34 - 0.34, 0.04 + Math.floor(i / 3) * 0.08, 0); b.castShadow = true; mesh(box(0.06, 0.082, 0.162), 0xd9b44a, b.position.x, b.position.y, 0, g); g.add(b); } return g; }
export function makeSuitcase(open = 0) {
  const g = new THREE.Group(); const lm = mat(0x6b3d22, { r: 0.55, fab: true }); mesh(box(0.7, 0.18, 0.45), lm, 0, 0.09, 0, g);
  const lid = new THREE.Group(); lid.position.set(0, 0.18, -0.225); g.add(lid); mesh(box(0.7, 0.1, 0.45), lm, 0, 0.05, 0.225, lid); mesh(cap(0.025, 0.12), 0x2a1a10, 0, 0.12, 0.45, lid).rotation.z = Math.PI / 2;
  for (const x of [-0.3, 0.3]) mesh(box(0.05, 0.19, 0.46), mat(0xc9a24a, { m: 0.8, r: 0.3 }), x, 0.095, 0, g);
  const cash = makeCashStack(6); cash.scale.setScalar(0.62); cash.position.set(0, 0.06, 0); g.add(cash);
  g.userData.lid = lid; lid.rotation.x = -open; return g;
}
export function makeNewspaper(head = 'EIFFELTURM: INSTANDHALTUNG KOSTET EIN VERMÖGEN') {
  const t = canvasTex(512, 700, (g, w, h) => { g.fillStyle = '#f1ead8'; g.fillRect(0, 0, w, h); g.fillStyle = '#111'; g.font = '900 64px Liberation Serif, serif'; g.textAlign = 'center'; g.fillText('LA GAZETTE', w / 2, 72); g.fillRect(20, 88, w - 40, 4); g.font = '20px serif'; g.fillText('PARIS — 1925', w / 2, 116); g.font = '900 46px Inter Display'; const words = head.split(' '); let line = '', y = 180; for (const wd of words) { if (g.measureText(line + wd).width > w - 60) { g.fillText(line, w / 2, y); y += 52; line = ''; } line += wd + ' '; } g.fillText(line, w / 2, y); g.fillStyle = '#777'; for (let i = 0; i < 16; i++) g.fillRect(30 + (i % 2) * 240, y + 40 + Math.floor(i / 2) * 22, 210, 8); g.strokeStyle = '#333'; g.lineWidth = 3; const ex = w / 2, ey = y + 260; g.beginPath(); g.moveTo(ex - 60, ey + 120); g.lineTo(ex, ey - 110); g.lineTo(ex + 60, ey + 120); g.moveTo(ex - 35, ey + 30); g.lineTo(ex + 35, ey + 30); g.stroke(); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.85), new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, roughness: 0.95 })); m.castShadow = true; return m;
}
export function makeLetter(stamped = 0) {
  const t = canvasTex(400, 520, (g, w, h) => { g.fillStyle = '#fbf6ea'; g.fillRect(0, 0, w, h); g.fillStyle = '#1d2a55'; g.font = '700 22px Liberation Serif, serif'; g.textAlign = 'center'; g.fillText('RÉPUBLIQUE FRANÇAISE', w / 2, 50); g.font = '700 17px Liberation Serif, serif'; g.fillText('MINISTÈRE DES POSTES ET TÉLÉGRAPHES', w / 2, 80); g.fillRect(40, 92, w - 80, 2); g.fillStyle = '#888'; for (let i = 0; i < 12; i++) g.fillRect(40, 130 + i * 24, w - 80 - (i % 3) * 40, 7); g.fillStyle = '#c00'; g.font = '900 26px Inter Display'; g.fillText('VERTRAULICH', w / 2, 460); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.52), new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, roughness: 0.95 })); m.castShadow = true; return m;
}
export function makeChandelier() { const g = new THREE.Group(); const gold = mat(0xd9b44a, { m: 0.9, r: 0.25 }); mesh(cyl(0.02, 0.02, 1.2), gold, 0, 0.6, 0, g); mesh(new THREE.TorusGeometry(0.6, 0.03, 8, 32), gold, 0, 0, 0, g).rotation.x = Math.PI / 2; for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; mesh(sph(0.07, 12), mat(0xfff4d0, { e: 0xffd890, ei: 2 }), Math.cos(a) * 0.6, 0.1, Math.sin(a) * 0.6, g); } for (let i = 0; i < 16; i++) { const a = i / 16 * 6.28; mesh(new THREE.OctahedronGeometry(0.04), mat(0xffffff, { m: 0.1, r: 0.05, phys: true, cc: 1, env: 1.5 }), Math.cos(a) * 0.5, -0.12, Math.sin(a) * 0.5, g); } const l = new THREE.PointLight(0xffd9a0, 14, 14); l.position.y = -0.2; g.add(l); return g; }
export function makePress() {
  const g = new THREE.Group(); const iron = mat(0x2d3033, { m: 0.7, r: 0.4 }); mesh(box(1.6, 0.9, 1.0), iron, 0, 0.45, 0, g); mesh(box(0.15, 1.6, 1.0), iron, -0.75, 1.3, 0, g); mesh(box(0.15, 1.6, 1.0), iron, 0.75, 1.3, 0, g);
  const rolls = []; for (const y of [1.2, 1.55]) { const r = mesh(cyl(0.16, 0.16, 1.3, 24), mat(0x9aa0a6, { m: 0.9, r: 0.2 }), 0, y, 0, g); r.rotation.x = Math.PI / 2; r.rotation.z = Math.PI / 2; rolls.push(r); }
  const wheel = mesh(new THREE.TorusGeometry(0.45, 0.05, 8, 24), iron, 0.85, 1.3, 0, g); wheel.rotation.y = Math.PI / 2; g.userData = { rolls, wheel }; return g;
}
export function makeWater(col = 0x2d5f7a) {
  const t = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); for (let i = 0; i < 300; i++) { g.strokeStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.1})`; g.lineWidth = 2; const x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 10, y - 4, x + 20, y); g.stroke(); } }, 60);
  const m = mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshStandardMaterial({ color: col, map: t, roughness: 0.25, metalness: 0.2, envMapIntensity: 1 }), 0, 0, 0); m.rotation.x = -Math.PI / 2; m.castShadow = false;
  tick(tt => { t.offset.set(tt * 0.01, tt * 0.006); }); return m;
}
export function makeIsland() {
  const g = new THREE.Group(); const geo = new THREE.IcosahedronGeometry(1, 4); const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i); const n = 1 + 0.12 * Math.sin(v.x * 7) * Math.cos(v.z * 6) + 0.08 * Math.sin(v.y * 11); p.setXYZ(i, v.x * n, Math.max(-0.2, v.y) * n, v.z * n); } geo.computeVertexNormals();
  const rock = mesh(geo, mat(0x8c8072, { r: 0.95, fab: true }), 0, -2, 0, g); rock.scale.set(26, 12, 14);
  const wallM = mat(0xd8d2c4, { r: 0.8 }); mesh(box(22, 6, 7), wallM, 0, 12, 0, g); for (let i = 0; i < 18; i++) mesh(box(0.6, 1.2, 0.1), 0x2a2e33, -10 + i * 1.2, 12.5, 3.55, g); mesh(box(8, 4, 6), wallM, -8, 8.5, 5, g); mesh(box(6, 3, 5), wallM, 9, 8, 4, g);
  mesh(cyl(0.8, 1.1, 9, 16), wallM, 13, 13, -1, g); const lt = mesh(cyl(0.9, 0.9, 1.2, 16), mat(0xfff4b0, { e: 0xffe28a, ei: 2 }), 13, 18, -1, g); mesh(new THREE.ConeGeometry(1, 1, 16), 0x333333, 13, 19.1, -1, g);
  mesh(cyl(0.2, 0.2, 8), 0x555555, -12, 14, -2, g); return g;
}
export function makeBars(w = 2, h = 2.4) { const g = new THREE.Group(); const m = mat(0x4a4d52, { m: 0.8, r: 0.35 }); for (let x = -w / 2; x <= w / 2 + 0.01; x += 0.18) mesh(cyl(0.025, 0.025, h, 10), m, x, h / 2, 0, g); for (const y of [0.1, h - 0.1]) mesh(box(w + 0.1, 0.08, 0.06), m, 0, y, 0, g); return g; }
export function makeTrain() {
  const g = new THREE.Group(); const bk = mat(0x1d1f22, { m: 0.6, r: 0.4 }), red = mat(0x8a1d22, { m: 0.3, r: 0.5 });
  const boiler = mesh(cyl(1.1, 1.1, 7, 24), bk, 0, 2.2, 0, g); boiler.rotation.z = Math.PI / 2; mesh(cyl(0.45, 0.6, 1.4, 16), bk, 2.6, 3.6, 0, g); mesh(box(2.6, 3, 2.6), bk, -3.6, 2.6, 0, g); mesh(box(0.15, 0.15, 2.4), red, 3.6, 0.9, 0, g);
  const wheels = []; for (const x of [-2.5, -0.5, 1.5]) for (const z of [-1.1, 1.1]) { const w = mesh(cyl(0.75, 0.75, 0.2, 20), red, x, 0.75, z, g); w.rotation.x = Math.PI / 2; wheels.push(w); }
  for (let c = 0; c < 3; c++) { const cx = -9.5 - c * 8.5; mesh(box(8, 3, 2.8), mat(0x24462e, { r: 0.5, fab: true }), cx, 2.4, 0, g); mesh(box(8.2, 0.3, 3), bk, cx, 4.05, 0, g); for (let i = 0; i < 5; i++) mesh(box(1, 0.9, 0.05), mat(0xffe0a0, { e: 0xffc060, ei: 0.4 }), cx - 3 + i * 1.5, 2.9, 1.42, g); for (const x of [-2.8, 2.8]) for (const z of [-1.1, 1.1]) { const w = mesh(cyl(0.5, 0.5, 0.2, 16), red, cx + x, 0.5, z, g); w.rotation.x = Math.PI / 2; wheels.push(w); } }
  g.userData.wheels = wheels; return g;
}
export function makeSteam() {
  const g = new THREE.Group(); const m = mat(0xf2f2f2, { r: 1, t: 0.85, e: 0xdddddd, ei: 0.3 }); const ps = []; for (let i = 0; i < 18; i++) { const p = mesh(sph(0.5, 12), m, 0, 0, 0, g); p.castShadow = false; ps.push(p); }
  tick(t => ps.forEach((p, i) => { const k = ((t * 0.6 + i / 18) % 1); p.position.set(-k * 8, k * 5, Math.sin(i) * k); p.scale.setScalar(0.4 + k * 2.2); })); return g;
}
