// Shot library: each shot builds a scene and returns update(u, t) (+ optional overlay)
import * as THREE from 'three';
import * as L from './lib.js';
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ease = u => u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

const LARRY = { skin: 0xf1b78f, shirt: 0xe8472f, sleeve: 0xe8472f, pants: 0x3e5a87, hair: 0x5b3a1f };
const FRIEND1 = { skin: 0xc68a5e, shirt: 0x2e9e5b, pants: 0x3d3d3d, hair: 0x1d1d1d, mustache: false };
const FRIEND2 = { skin: 0xf6c9a5, shirt: 0xf2c230, pants: 0x6b4f35, hair: 0xc9952b, mustache: false };
const COP = { skin: 0xe2a77f, shirt: 0x1f3a6b, pants: 0x1a2a4a, hair: 0x2a2a2a, badge: true, mustache: true };

export let ENV = null; export function setEnv(e) { ENV = e; }
const easeOut = u => 1 - Math.pow(1 - u, 3);
function cam(ctx, p0, p1, t0, t1, u, fov = 50, eo = false) {
  const e = eo ? easeOut(u) : ease(u); ctx.camera.fov = fov; ctx.camera.updateProjectionMatrix();
  ctx.camera.position.copy(p0).lerp(p1, e);
  const T = ctx.T, h = ctx.hand ?? 1, d = ctx.camera.position.distanceTo(t0) * 0.006 + 0.004;
  ctx.camera.position.x += (Math.sin(T * 1.9) + 0.5 * Math.sin(T * 4.3 + 2)) * d * h; ctx.camera.position.y += (Math.sin(T * 1.6 + 1) + 0.5 * Math.sin(T * 3.7)) * d * h;
  ctx.camera.lookAt(t0.clone().lerp(t1, e));
  ctx.camera.rotateZ((Math.sin(T * 1.3) * 0.006 + (ctx.roll ?? 0)) * h);
}
function orbit(ctx, tg, r0, r1, a0, a1, y0, y1, u, fov = 50) {
  const e = ease(u), r = r0 + (r1 - r0) * e, a = a0 + (a1 - a0) * e, y = y0 + (y1 - y0) * e;
  const p = V(tg.x + Math.sin(a) * r, y, tg.z + Math.cos(a) * r); cam(ctx, p, p, tg, tg, u, fov);
}
let SUNTEX = null;
function sun(scene, dir, col = '#fff6d8', size = 260) {
  if (!SUNTEX) SUNTEX = L.canvasTex(256, 256, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.12, 'rgba(255,250,220,1)'); r.addColorStop(0.3, 'rgba(255,230,170,0.35)'); r.addColorStop(1, 'rgba(255,220,150,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: SUNTEX, color: col, fog: false, depthWrite: false, transparent: true }));
  sp.position.copy(V(...dir).normalize().multiplyScalar(900)); sp.scale.setScalar(size); scene.add(sp); return sp;
}
function lights(scene, o = {}) {
  if (ENV) scene.environment = ENV;
  scene.add(new THREE.HemisphereLight(o.sky ?? 0xcfe6ff, o.ground ?? 0x5a7a3a, (o.hi ?? 1.1) * 0.75));
  const dir = o.dir ?? [6, 10, 7];
  const s = new THREE.DirectionalLight(o.sun ?? 0xfff1d6, o.si ?? 2.6); s.position.set(...dir); s.castShadow = true;
  s.shadow.mapSize.set(2048, 2048); const c = s.shadow.camera; const r = o.sr ?? 6; c.left = c.bottom = -r; c.right = c.top = r; c.near = 0.5; c.far = 60; s.shadow.bias = -0.0004; s.shadow.normalBias = 0.02;
  if (o.target) { s.target.position.copy(o.target); scene.add(s.target); s.position.add(o.target); }
  scene.add(s);
  const rim = new THREE.DirectionalLight(o.rim ?? 0xd6e8ff, o.ri ?? 1.3); rim.position.set(-dir[0], dir[1] * 0.5 + 2, -dir[2]); if (o.target) { rim.target.position.copy(o.target); scene.add(rim.target); rim.position.add(o.target); } scene.add(rim);
  if (o.sunSprite !== false) sun(scene, dir, o.sunCol);
  return s;
}
function garden(scene, o = {}) {
  scene.background = L.skyTex('#2f86e0', '#8cc4f2', '#e3f1fb');
  scene.fog = new THREE.Fog(0xd6e9f8, 60, 420);
  const gr = L.mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshStandardMaterial({ map: L.grassTex(), roughness: 1, envMapIntensity: 0.3 }), 0, 0, 0, scene); gr.rotation.x = -Math.PI / 2; gr.castShadow = false;
  L.reseed(21); scene.add(L.makeGrass(o.grassN ?? 4500, 11, o.gx ?? 0, o.gz ?? 0));
  const h = L.makeHouse(); h.position.set(o.hx ?? -3, 0, o.hz ?? -9); scene.add(h);
  const f = L.makeFence(40); f.position.set(0, 0, -14); scene.add(f); scene.add(L.makeFlowers(36, -14, 14, -13.6));
  for (let i = 0; i < 4; i++) { const n = L.makeHouse([0xd8e3ee, 0xf1e1c6, 0xe6d0d0][i % 3], [0x4a4f5a, 0x7a3a2a][i % 2]); n.position.set(-30 + i * 18, 0, -26); scene.add(n); }
  for (const [x, z, s] of [[6, -7, 1.2], [-11, -5, 1], [13, -16, 1.4], [-18, -17, 1.3], [9, 4, 1], [-8, 9, 1.1], [16, -2, 1.2]]) { const t = L.makeTree(s); t.position.set(x, 0, z); scene.add(t); }
  if (o.jeep !== false) { const j = L.makeJeep(); j.position.set(o.jx ?? 6.5, 0, o.jz ?? -3.5); j.rotation.y = 0.6; scene.add(j); }
  const mb = L.makeMailbox(); mb.position.set(4.2, 0, 3.5); scene.add(mb);
  L.reseed(33); scene.add(L.makeBirds(5, V(-12, 14, -30)));
  for (let i = 0; i < 6; i++) { const c = L.makeCloud(6 + L.RNG() * 5); c.position.set(-160 + i * 60 + L.RNG() * 20, 45 + L.RNG() * 25, -200 - L.RNG() * 60); scene.add(c); }
  const hl = L.makeHills(); scene.add(hl);
  return lights(scene, o);
}
function highSky(scene, o = {}) {
  scene.background = L.skyTex(o.top ?? '#1a63c9', o.mid ?? '#7fb6ec', o.bot ?? '#d6e8f7');
  scene.fog = new THREE.Fog(new THREE.Color(o.fog ?? 0xbcd6ef), 300, 3500);
  const gr = L.mesh(new THREE.PlaneGeometry(20000, 20000), new THREE.MeshStandardMaterial({ map: L.cityTex(), roughness: 1, envMapIntensity: 0.2 }), 0, o.alt ?? -1200, 0, scene); gr.rotation.x = -Math.PI / 2;
  gr.material.map.repeat.set(40, 40);
  L.reseed(o.seed ?? 3);
  for (let i = 0; i < (o.near === false ? 0 : 18); i++) { const c = L.makeCloud(1.5 + L.RNG() * 3); const a = L.RNG() * 6.28, d = 22 + L.RNG() * 80; c.position.set(Math.cos(a) * d, -25 + L.RNG() * 30, Math.sin(a) * d); scene.add(c); }
  for (let i = 0; i < 26; i++) { const c = L.makeCloud(8 + L.RNG() * 8); const a = L.RNG() * 6.28, d = 60 + L.RNG() * 300; c.position.set(Math.cos(a) * d, -70 - L.RNG() * 30, Math.sin(a) * d); c.scale.y *= 0.4; scene.add(c); }
  const hl = L.makeHills(); hl.position.y = (o.alt ?? -1200); hl.scale.setScalar(6); scene.add(hl);
  if (o.streaks !== false) scene.add(L.makeWindStreaks(30, 7));
  const s = lights(scene, { sky: 0xdcecff, ground: 0x9fb0c0, hi: 1.3, si: 2.8, ...o }); return s;
}
function flyer(scene, expr = 'grin', pose = 'sit', n = 45) {
  const g = new THREE.Group(); scene.add(g); const rig = new THREE.Group(); g.add(rig);
  const ch = L.makeChair(); rig.add(ch);
  const lr = L.makeGuy(LARRY); lr.pose(pose); lr.expr(expr); lr.g.position.set(0, -0.16, -0.08); rig.add(lr.g);
  L.reseed(11); const b = L.makeBalloons(n); rig.add(b.g);
  L.tick((t, T) => { rig.rotation.z = Math.sin(T * 1.1) * 0.035 * L.WIND.v; rig.rotation.x = Math.sin(T * 0.8 + 1) * 0.03 * L.WIND.v; rig.rotation.y = Math.sin(T * 0.5) * 0.06;
    if (!lr.noLegs) lr.legs.forEach((l, i) => { l.knee.rotation.x = 1.45 + Math.sin(T * 3.2 + i * 2) * 0.14; l.hip.rotation.x = -1.5 + Math.sin(T * 2.1 + i) * 0.05; }); });
  return { g, lr, b, ch, rig };
}
function guy(scene, P, x, y, z, ry = 0) { const c = L.makeGuy(P); c.g.position.set(x, y, z); c.g.rotation.y = ry; scene.add(c.g); return c; }
function popIn(obj, u, at = 0) { const k = clamp((u - at) * 6); const s = k < 1 ? Math.sin(k * Math.PI * 0.75) / Math.sin(Math.PI * 0.75) * k : 1; obj.scale.setScalar(Math.max(0.001, s)); }
function talk(c, t, e = 'shock') { c.expr(e, 0.5 + 0.5 * Math.abs(Math.sin(t * 14))); }
function flail(c, t, k = 1) { c.arms[0].sh.rotation.set(Math.sin(t * 11) * 0.5 * k, 0, -2.2 + Math.sin(t * 9) * 0.5 * k); c.arms[1].sh.rotation.set(Math.cos(t * 10) * 0.5 * k, 0, 2.2 + Math.cos(t * 8) * 0.5 * k); c.arms[0].el.rotation.z = -0.4 + Math.sin(t * 13) * 0.4; c.arms[1].el.rotation.z = 0.4 + Math.cos(t * 12) * 0.4; }
function tremble(c, t, k = 1) { c.head.rotation.z = Math.sin(t * 47) * 0.02 * k; c.head.rotation.y = Math.sin(t * 31) * 0.02 * k; }
function sweat(c) { const d = L.mesh(L.sph(0.03, 12), L.mat(0x9fd8ff, { r: 0.05, phys: true, cc: 1, env: 1.2 }), 0.26, 0.15, 0.2, c.head); d.scale.set(0.8, 1.3, 0.8); return t => { const k = (t * 0.9) % 1; d.position.set(0.27, 0.15 - k * 0.3, 0.2); d.visible = k < 0.95; }; }
const CAPHAT = (c, col = 0x1f3a6b) => { L.mesh(L.cyl(0.32, 0.36, 0.16), col, 0, 0.32, 0, c.head); L.mesh(L.box(0.5, 0.04, 0.22), 0x111111, 0, 0.25, 0.28, c.head); L.mesh(L.box(0.07, 0.07, 0.02), L.mat(0xf5c542, { m: 0.8, r: 0.3 }), 0, 0.33, 0.33, c.head); };
const REPORTER = { skin: 0xf3c7a8, shirt: 0x2a2f3a, sleeve: 0x2a2f3a, pants: 0x2a2f3a, hair: 0xa85a2a, mustache: false, tie: 0xb31b1b };
const PILOT = { skin: 0xe9b48c, shirt: 0xffffff, pants: 0x222222, hair: 0x888888, tie: 0x1d2a44 };
function mic() { const m = new THREE.Group(); L.mesh(L.cyl(0.025, 0.02, 0.3), 0x222222, 0, 0, 0, m); L.mesh(L.sph(0.06), L.mat(0x555555, { r: 0.9, fab: true }), 0, 0.17, 0, m); L.mesh(L.box(0.08, 0.06, 0.08), 0xd62828, 0, 0.08, 0, m); return m; }

// ================= VIDEO 02 – Victor Lustig =================
const LUSTIG = { skin: 0xf0c8a8, shirt: 0x2f3440, sleeve: 0x2f3440, pants: 0x2f3440, hair: 0x161616, tie: 0x9b1d2a, suit: true, shoes: 0x111111, armSkin: false };
const POISSON = { skin: 0xf2b48e, shirt: 0x6b4a32, sleeve: 0x6b4a32, pants: 0x6b4a32, hair: 0x9a9a9a, suit: true, tie: 0x2a4a7a, belly: true, bignose: true, armSkin: false };
const WIFE = { skin: 0xf6cdb0, shirt: 0x2e7d6b, sleeve: 0x2e7d6b, pants: 0xf6cdb0, hair: 0x6a2e1e, female: true, dress: 0x2e7d6b, shoes: 0x5a1a1a };
const GENDARME = { skin: 0xe8b08a, shirt: 0x1d2a4a, sleeve: 0x1d2a4a, pants: 0x1d2a4a, hair: 0x333333, badge: true, armSkin: false };
const AGENT = { skin: 0xe2b090, shirt: 0xb59a6a, sleeve: 0xb59a6a, pants: 0x3a3a3a, hair: 0x4a3020, suit: true, tie: 0x222222, mustache: false, armSkin: false };
const DEALERS = [
  { skin: 0xe9b48c, shirt: 0x4a5a3a, pants: 0x4a5a3a, hair: 0x3a2a1a, suit: true, tie: 0x6a1a1a, armSkin: false, hat: 'bowler' },
  { skin: 0xc68a5e, shirt: 0x3a3f5a, pants: 0x3a3f5a, hair: 0x111111, suit: true, tie: 0xb38a2a, armSkin: false, mustache: false, hat: 'fedora' },
  { skin: 0xf3c7a8, shirt: 0x5a3a4a, pants: 0x5a3a4a, hair: 0xb07a3a, suit: true, tie: 0x2a5a2a, armSkin: false, hat: 'fedora' },
  { skin: 0xdba383, shirt: 0x555555, pants: 0x555555, hair: 0x777777, suit: true, tie: 0x1a2a6a, armSkin: false, mustache: false, hat: 'bowler' },
  { skin: 0xf0c09a, shirt: 0x2a4a4a, pants: 0x2a4a4a, hair: 0x5a3a1a, suit: true, tie: 0x8a3a1a, armSkin: false, hat: 'fedora' }];
function fedora(c, col = 0x2a2a2a) { const h = new THREE.Group(); h.position.set(0, 0.27, -0.01); h.rotation.x = -0.12; c.head.add(h); L.mesh(L.cyl(0.46, 0.46, 0.03, 32), L.mat(col, { fab: true, r: 0.9 }), 0, 0, 0, h); L.mesh(L.cyl(0.29, 0.32, 0.24, 32), L.mat(col, { fab: true, r: 0.9 }), 0, 0.13, 0, h); L.mesh(L.cyl(0.322, 0.322, 0.06, 32), 0x111111, 0, 0.04, 0, h); return h; }
function bowler(c, col = 0x1a1a1a) { const h = new THREE.Group(); h.position.set(0, 0.25, -0.01); c.head.add(h); L.mesh(L.cyl(0.42, 0.42, 0.03, 32), L.mat(col, { r: 0.4 }), 0, 0, 0, h); const d = L.mesh(new THREE.SphereGeometry(0.31, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), L.mat(col, { r: 0.35 }), 0, 0.01, 0, h); d.scale.y = 1.1; return h; }
function kepi(c) { const h = new THREE.Group(); h.position.set(0, 0.27, 0); c.head.add(h); L.mesh(L.cyl(0.3, 0.33, 0.3, 32), L.mat(0x1d2a4a, { fab: true }), 0, 0.12, 0, h); L.mesh(L.cyl(0.3, 0.3, 0.03, 32), 0xa3202a, 0, 0.28, 0, h); const v = L.mesh(L.box(0.4, 0.03, 0.18), 0x111111, 0, -0.02, 0.32, h); v.rotation.x = 0.25; L.mesh(L.box(0.08, 0.06, 0.02), L.mat(0xd9b44a, { m: 0.9 }), 0, 0.14, 0.33, h); return h; }
function person(s, P, x, y, z, ry = 0) { const c = guy(s, P, x, y, z, ry); if (P.hat === 'bowler') bowler(c); if (P.hat === 'fedora') fedora(c, 0x3a3020); return c; }
function lustig(s, x = 0, y = 0, z = 0, ry = 0) { const c = guy(s, LUSTIG, x, y, z, ry); c.hat = fedora(c); return c; }
function poisson(s, x = 0, y = 0, z = 0, ry = 0) { const c = guy(s, POISSON, x, y, z, ry); c.hat = bowler(c, 0x3a2a1a); return c; }
function parisStreet(s, o = {}) {
  s.background = L.skyTex(o.top ?? '#4b8fd6', o.mid ?? '#a9cdef', o.bot ?? '#f3e6cf'); s.fog = new THREE.Fog(o.fog ?? 0xe9e2d4, 40, 380);
  const gr = L.mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ map: L.cobbleTex(), roughness: 0.75, envMapIntensity: 0.5 }), 0, 0, 0, s); gr.rotation.x = -Math.PI / 2; gr.castShadow = false;
  L.mesh(L.box(200, 0.18, 4), L.mat(0xb9b2a4, { r: 0.8 }), 0, 0.09, -6, s);
  L.reseed(o.seed ?? 4);
  for (let i = -6; i <= 6; i++) { if (o.gap !== false && Math.abs(i) <= 1) continue; const b = L.makeParisBuilding(10, 13 + (i % 3) * 1.5, 8, [0xffffff, 0xf3ead8, 0xfff4e0][((i % 3) + 3) % 3]); b.position.set(i * 10.2, 0, -12); s.add(b); }
  for (let i = -5; i <= 5; i += 2) { const lp = L.makeStreetLamp(); lp.position.set(i * 5 + 2.5, 0, -4.5); s.add(lp); if (o.night) { const pl = new THREE.PointLight(0xffc27a, 18, 14); pl.position.set(i * 5 + 2.5, 4.2, -4.3); s.add(pl); lp.userData.lamp.material = L.mat(0xfff2c0, { e: 0xffc060, ei: 3 }); } }
  if (o.gap === false || Math.abs(o.cafeX ?? 0) > 15) { const aw = L.makeAwning(7); aw.position.set(o.cafeX ?? 0, 3.0, -7.4); s.add(aw); } else { const aw = L.makeAwning(7); aw.position.set(-20.4, 3.0, -7.4); s.add(aw); } for (let i = 0; i < 3; i++) { const t = L.makeCafeTable(); t.position.set((o.cafeX ?? 0) - 2.5 + i * 2.5, 0.18, -5.4); s.add(t); }
  for (const x of [-14, 14, -34, 34]) { const t = L.makeTree(0.9); t.position.set(x, 0, -5.8); s.add(t); }
  const e = L.makeEiffel(); e.position.set(o.ex ?? 0, 0, o.ez ?? -150); e.scale.setScalar(o.es ?? 1.6); s.add(e);
  if (o.citroen) { const cl = L.makeCitroenLetters(); cl.userData.letters.forEach((m, i) => { const y = 55 - i * 3.4; const hw = (5.6 - (y - 30.6) / 30 * 4.2) / Math.SQRT2; m.position.set(0, y, hw + 0.3); m.scale.setScalar(0.9); }); e.add(cl); s.userData.citroen = cl; }
  // --- Paris 1925 street life
  const signs = [['BOULANGERIE', '#7a2632'], ['TABAC', '#1d2a4a'], ['PHARMACIE', '#1d4a2a'], ['CAFÉ', '#3a2a1a'], ['CHAPELLERIE', '#2a2a2a'], ['FLEURISTE', '#4a2a4a']];
  [-6, -4, -2, 2, 4, 6].forEach((i, k) => { if (o.gap === false && Math.abs(i) <= 1) return; const sg = L.shopSign(signs[k][0], signs[k][1]); sg.position.set(i * 10.2, 2.75, -7.93); s.add(sg); });
  for (let i = -6; i <= 6; i++) { if (o.gap !== false && Math.abs(i) <= 1) continue; for (const x of [-2.6, 2.6]) { const fb = L.makeFlowerBox(1.4); fb.position.set(i * 10.2 + x, 4.6, -7.85); s.add(fb); } }
  if (o.props !== false) { const mc = L.makeMorrisColumn(); mc.position.set(-7.5, 0.18, -5.6); s.add(mc); const me = L.makeMetroEntrance(); me.position.set(8.5, 0.18, -5.0); s.add(me); }
  if (o.cars) { const cars = [[L.makeCar1920(0x1d2a44), o.cars[0], 1], [L.makeCar1920(0x7a1d22), o.cars[1], -1], [L.makeCar1920(0x2d4a2d), o.cars[0], 1]]; cars.forEach(([c, z, d], i) => { c.rotation.y = d > 0 ? 0 : Math.PI; s.add(c); L.tick(t => { c.position.set(((i * 23 + t * 5 * d + 60) % 120 - 60) * 1, 0, z); c.userData.wheels.forEach(w => w.rotation.z = -t * 15 * d * 0); c.userData.wheels.forEach(w => w.rotation.z = -t * 15); }); }); }
  if (o.gap !== false) { const lawn = L.mesh(new THREE.PlaneGeometry(30, 400), L.mat(0x5d9a3e, { r: 1 }), 0, 0.03, -212, s); lawn.rotation.x = -Math.PI / 2; lawn.castShadow = false; }
  s.add(L.makeBirds(6, V(-10, 18, -30)));
  for (let i = 0; i < 5; i++) { const c = L.makeCloud(7 + L.RNG() * 5); c.position.set(-150 + i * 70, 70 + L.RNG() * 20, -300); s.add(c); }
  const L_ = lights(s, { sky: o.sky ?? 0xdfe9f7, ground: 0x8a7a66, hi: o.hi ?? 1.1, si: o.si ?? 2.6, dir: o.dir ?? [8, 11, 7], sun: o.sun, sunCol: o.sunCol, target: o.target ?? V(0, 1, 0), sunSprite: !o.night });
  if (o.night) s.environment = null; return L_;
}
function towerSite(s, o = {}) {
  parisStreet(s, { ...o, ex: 0, ez: -60, es: 1.1, target: o.target ?? V(0, 1, 0) });
  const lawn = L.mesh(new THREE.PlaneGeometry(80, 70), L.mat(0x5d9a3e, { r: 1 }), 0, 0.02, -40, s); lawn.rotation.x = -Math.PI / 2; lawn.castShadow = false;
}
function viewTex() { return L.canvasTex(512, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5a9be0'); gr.addColorStop(1, '#f6e2c0'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#c8b9a0'; for (let i = 0; i < 12; i++) g.fillRect(i * 44, h * 0.68 - (i % 3) * 18, 40, h); g.strokeStyle = '#5a4030'; g.lineWidth = 5; const x = w * 0.62; g.beginPath(); g.moveTo(x - 70, h * 0.75); g.quadraticCurveTo(x - 20, h * 0.4, x, h * 0.12); g.quadraticCurveTo(x + 20, h * 0.4, x + 70, h * 0.75); g.moveTo(x - 45, h * 0.6); g.lineTo(x + 45, h * 0.6); g.moveTo(x - 25, h * 0.42); g.lineTo(x + 25, h * 0.42); g.stroke(); }); }
function hotelRoom(s, o = {}) {
  s.background = new THREE.Color(0x1a1010); if (ENV) s.environment = ENV;
  const wp = L.wallpaperTex(); const room = L.mesh(L.box(16, 6, 12), new THREE.MeshStandardMaterial({ color: o.tint ?? 0xffffff, map: wp, roughness: 0.85, side: THREE.BackSide, envMapIntensity: 0.3 }), 0, 3, 0, s); room.castShadow = false;
  const fl = L.mesh(new THREE.PlaneGeometry(16, 12), new THREE.MeshStandardMaterial({ map: L.parquetTex(), roughness: 0.35, envMapIntensity: 0.7 }), 0, 0.01, 0, s); fl.rotation.x = -Math.PI / 2;
  L.mesh(L.box(16, 1.1, 0.1), L.mat(0x3a1e14, { r: 0.4 }), 0, 0.55, -5.95, s);
  const win = L.mesh(new THREE.PlaneGeometry(2.6, 3.2), new THREE.MeshBasicMaterial({ map: viewTex() }), 3.5, 2.8, -5.93, s); win.castShadow = false;
  L.mesh(L.box(2.8, 0.15, 0.15), L.mat(0xd9b44a, { m: 0.8, r: 0.3 }), 3.5, 4.45, -5.9, s);
  const curtains = []; for (const x of [2.0, 5.0]) curtains.push(L.mesh(L.box(0.7, 3.8, 0.15), L.mat(0x8a1d22, { fab: true, r: 0.9 }), x, 2.5, -5.8, s));
  for (const x of [-4, -1]) { L.mesh(L.box(1.4, 1.8, 0.08), L.mat(0xd9b44a, { m: 0.8, r: 0.3 }), x, 3, -5.92, s); L.mesh(L.box(1.2, 1.6, 0.05), L.mat([0x3a4a6a, 0x6a4a3a][x < -2 ? 0 : 1], { r: 0.8 }), x, 3, -5.88, s); }
  const ch = L.makeChandelier(); ch.position.set(0, 4.6, 0); s.add(ch);
  for (const [x, z] of [[-7, -5], [7, -5], [-7, 5], [7, 5]]) { const c = L.makeColumn(6); c.position.set(x, 0, z); s.add(c); }
  for (const x of [-6.5, -2.2, 6.5]) { const sc = L.makeSconce(); sc.position.set(x, 2.6, -5.95); s.add(sc); }
  const rug = L.mesh(new THREE.PlaneGeometry(7, 4), new THREE.MeshStandardMaterial({ map: L.canvasTex(256, 160, (g, w, h) => { g.fillStyle = '#7a1d22'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d9b44a'; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h - 20); g.lineWidth = 2; g.strokeRect(22, 22, w - 44, h - 44); g.fillStyle = 'rgba(217,180,74,0.5)'; g.beginPath(); g.ellipse(w / 2, h / 2, 40, 26, 0, 0, 7); g.fill(); }), roughness: 0.95 }), 0, 0.015, 0, s); rug.rotation.x = -Math.PI / 2; rug.castShadow = false;
  lights(s, { sky: 0xffe2c0, ground: 0x4a2a1a, hi: 0.9, si: 1.4, dir: [3, 8, 2], sun: 0xffe0b0, sunSprite: false, sr: 6, target: V(0, 1, 0) });
  if (o.table !== false) { L.mesh(L.box(5, 0.08, 1.8), L.mat(0xf4f1ea, { fab: true, r: 0.8 }), 0, 0.8, 0, s); for (const [x, z] of [[-2.3, -0.8], [2.3, -0.8], [-2.3, 0.8], [2.3, 0.8]]) L.mesh(L.cyl(0.06, 0.06, 0.78), 0x3a1e14, x, 0.39, z, s); for (let i = 0; i < 3; i++) { const c = L.mesh(L.cyl(0.04, 0.06, 0.25), L.mat(0xd9b44a, { m: 0.9, r: 0.2 }), -1.5 + i * 1.5, 0.96, 0, s); }
    for (let i = 0; i < 6; i++) { const gl = L.makeGlass(); gl.position.set(-1.6 + (i % 3) * 1.6, 0.84, i < 3 ? -0.55 : 0.55); s.add(gl); }
    const tray = L.mesh(L.cyl(0.12, 0.1, 0.03, 16), L.mat(0x888888, { m: 0.8, r: 0.3 }), 0.8, 0.86, 0.3, s); L.mesh(L.cap(0.018, 0.12), L.mat(0x5a3a22), 0.8, 0.89, 0.3, s).rotation.z = Math.PI / 2; const sm = L.makeCigarSmoke(); sm.position.set(0.87, 0.9, 0.3); s.add(sm); }
  return { curtains, win };
}
function meeting(s, dealersN = 5, withPoisson = true, seed = 0) {
  const R = hotelRoom(s); const ds = []; const seats = [[-1.6, -1.25, 0], [0, -1.25, 0], [1.6, -1.25, 0], [-1.6, 1.25, Math.PI], [0, 1.25, Math.PI], [1.6, 1.25, Math.PI]];
  let po = null;
  seats.slice(0, dealersN + (withPoisson ? 1 : 0)).forEach(([x, z, ry], i) => {
    const ch = L.makeChairWood(); ch.position.set(x, 0, z); ch.rotation.y = ry; s.add(ch);
    let c; if (withPoisson && i === 1) { c = poisson(s, x, 0, z + (z < 0 ? -0.05 : 0.05), ry); po = c; } else c = person(s, DEALERS[(i + seed) % DEALERS.length], x, 0, z + (z < 0 ? -0.05 : 0.05), ry);
    c.pose('sit'); c.g.position.y = -0.2; c.expr('smile'); ds.push(c);
  });
  const lu = lustig(s, -3.2, 0, 0, Math.PI / 2, false); lu.pose('stand point'); lu.expr('smug');
  return { R, ds, po, lu };
}
const LADIES = [{ dress: 0xc0392b, shirt: 0xc0392b, sleeve: 0xc0392b, hat: 0x2a2a2a }, { dress: 0x2a6fb0, shirt: 0x2a6fb0, sleeve: 0x2a6fb0, hat: 0xe0c060 }, { dress: 0xd98a2a, shirt: 0xd98a2a, sleeve: 0xd98a2a, hat: 0x6a2a4a }];
function lady(s, x, z, ry, i = 0) { const L0 = LADIES[i % 3]; const c = guy(s, { ...WIFE, ...L0, hair: [0x2a1a10, 0xc9952b, 0x6a2e1e][i % 3], skin: [0xf6cdb0, 0xe8b08a, 0xf3c7a8][i % 3] }, x, 0, z, ry); L.clocheHat(c.head, L0.hat); return c; }
function newsboy(s, x, z, ry) { const c = guy(s, { skin: 0xf3c7a8, shirt: 0xd8cbb0, sleeve: 0xd8cbb0, pants: 0x4a3a2a, hair: 0xb07a3a, kid: true, s: 0.72 }, x, 0, z, ry); L.flatCap(c.head); return c; }
function rubHands(c, t) { c.arms[0].sh.rotation.set(-1.0, 0.5, -0.1); c.arms[1].sh.rotation.set(-1.0, -0.5, 0.1); c.arms[0].el.rotation.set(-0.6 + Math.sin(t * 16) * 0.15, 0, 0); c.arms[1].el.rotation.set(-0.6 - Math.sin(t * 16) * 0.15, 0, 0); }
function crossArms(c) { c.arms[0].sh.rotation.set(-1.1, 0.7, -0.2); c.arms[1].sh.rotation.set(-1.1, -0.7, 0.2); c.arms[0].el.rotation.set(-1.7, 0, 0); c.arms[1].el.rotation.set(-1.7, 0, 0); }
function walk(c, t, sp = 9) { c.legs.forEach((l, i) => { l.hip.rotation.x = Math.sin(t * sp + i * Math.PI) * 0.5; l.knee.rotation.x = Math.max(0, Math.sin(t * sp + i * Math.PI + 1)) * 0.6; }); c.arms.forEach((a, i) => a.sh.rotation.x = -Math.sin(t * sp + i * Math.PI) * 0.45); c.g.position.y = Math.abs(Math.sin(t * sp)) * 0.04; }
function coinRain(s, n = 50, area = 4, col = 0xf5c542, cz = 0) { const m = L.mat(col, { m: 0.9, r: 0.25, env: 1.2 }); const cs = []; for (let i = 0; i < n; i++) { const c = L.mesh(L.cyl(0.07, 0.07, 0.015, 16), m, (Math.random() - 0.5) * area, 0, cz + (Math.random() - 0.5) * area * 0.6, s); c.userData = { ph: Math.random(), sp: 2 + Math.random() * 2 }; cs.push(c); } return (t, y0 = 4) => cs.forEach((c, i) => { const k = (t * c.userData.sp * 0.25 + c.userData.ph) % 1; c.position.y = y0 - k * y0; c.rotation.set(t * 5 + i, t * 3, 0); }); }
function billRain(s, n = 40, area = 4) { const bs = []; for (let i = 0; i < n; i++) { const b = L.makeBill(); b.position.set((Math.random() - 0.5) * area, 0, (Math.random() - 0.5) * area * 0.7); b.userData = { ph: Math.random(), sp: 0.8 + Math.random() * 0.6 }; s.add(b); bs.push(b); } return (t, y0 = 4) => bs.forEach((b, i) => { const k = (t * b.userData.sp * 0.3 + b.userData.ph) % 1; b.position.y = y0 - k * y0; b.rotation.set(Math.sin(t * 3 + i) * 1.2, t * 2 + i, Math.cos(t * 2.5 + i) * 0.8); }); }

function stampTex(txt, col = '#d11') { return L.canvasTex(1024, 300, (g, w, h) => { g.clearRect(0, 0, w, h); g.translate(w / 2, h / 2); g.strokeStyle = col; g.lineWidth = 26; g.beginPath(); g.roundRect(-w / 2 + 20, -h / 2 + 20, w - 40, h - 40, 30); g.stroke(); g.lineWidth = 8; g.beginPath(); g.roundRect(-w / 2 + 50, -h / 2 + 50, w - 100, h - 100, 18); g.stroke(); g.fillStyle = col; g.font = '900 150px Inter Display'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 0, 10); g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.6})`; g.fillRect(Math.random() * w - w / 2, Math.random() * h - h / 2, 3 + Math.random() * 6, 2 + Math.random() * 4); } }); }
export const SHOTS = {
  h_sold(ctx) {
    const s = ctx.scene; towerSite(s, { target: V(0, 20, -60), sr: 40 });
    const st = L.mesh(new THREE.PlaneGeometry(30, 8.8), new THREE.MeshBasicMaterial({ map: stampTex('VERKAUFT!'), transparent: true, depthTest: false, fog: false }), 0, 30, -40, s); st.castShadow = false; st.renderOrder = 10;
    const coins = coinRain(s, 0, 1);
    return (u, t) => { const k = clamp((t - 0.22) / 0.12); st.visible = t > 0.22; st.scale.setScalar(2.6 - 1.6 * (1 - Math.pow(1 - k, 3))); st.rotation.z = 0.12 - 0.04 * k;
      if (t > 0.22 && t < 0.55) { ctx.shake = 1.4; ctx.flash = 0.45 * (1 - (t - 0.22) / 0.33); }
      cam(ctx, V(0, 2, 70), V(0, 18, 8), V(0, 22, -60), V(0, 32, -60), clamp(u * 1.5), 55, true); ctx.roll = (1 - clamp(u * 2)) * 0.25; };
  },
  newsboy(ctx) {
    const s = ctx.scene; parisStreet(s, { target: V(0, 1, -3) }); const k = newsboy(s, 0, -3, 0.3); const np = L.makeNewspaper(); k.arms[1].el.add(np); np.position.set(0, -0.4, 0.15); np.rotation.set(-1.2, 0, 0); np.scale.setScalar(0.7);
    const bag = L.mesh(L.box(0.4, 0.35, 0.15), L.mat(0x8a6a3a, { fab: true }), 0.25, 0.75, 0.1, k.g); for (let i = 0; i < 4; i++) L.mesh(L.box(0.3, 0.02, 0.4), 0xf1ead8, 0.25, 0.95 + i * 0.02, 0.1, k.g);
    const r = (u, t) => { k.arms[1].sh.rotation.set(-2.4 + Math.sin(t * 10) * 0.35, 0, 0.3); talk(k, t, 'grin'); k.g.position.y = Math.abs(Math.sin(t * 8)) * 0.05; ctx.tag = 'PARIS · 1925';
      cam(ctx, V(1.2, 0.6, 0.2), V(0.6, 0.9, -1.0), V(0, 1.1, -3), V(0, 1.2, -3), u, 50); };
    r.overlay = (g, W, H, u, T, t) => { const k = clamp(t * 5); if (k <= 0) return; g.save(); g.translate(W * 0.68, H * 0.3); g.rotate(-0.12); g.scale(k, k); g.fillStyle = '#fff'; g.strokeStyle = '#111'; g.lineWidth = W * 0.008; g.beginPath(); g.roundRect(-W * 0.24, -W * 0.08, W * 0.48, W * 0.16, W * 0.05); g.fill(); g.stroke(); g.beginPath(); g.moveTo(-W * 0.08, W * 0.08); g.lineTo(-W * 0.14, W * 0.17); g.lineTo(-W * 0.02, W * 0.08); g.fill(); g.fillStyle = '#111'; g.font = `900 ${W * 0.06}px "Inter Display"`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('EXTRABLATT!', 0, 4); g.restore(); };
    return r;
  },
  question(ctx) {
    const s = ctx.scene; towerSite(s, { top: '#1b1a4b', mid: '#b35a5a', bot: '#f2a86a', fog: 0xd88a60, sun: 0xffa060, dir: [-8, 3, -12], sunCol: '#ffbf7a', si: 1.6, citroen: true }); const lu = lustig(s, 0.6, 0, 6, -0.2);
    const r = (u, t) => { lu.pose('stand'); lu.expr('smug'); lu.look(0, 0); lu.arms[0].sh.rotation.set(-1.4, 0, -0.3 - Math.sin(t * 3) * 0.1); lu.arms[0].el.rotation.x = -0.3; if (t > 1.2 && (t % 2.6) < 0.25) { lu.lids[1].visible = true; lu.lids[1].rotation.x = -0.05; }
      const cl = s.userData.citroen; if (cl) cl.userData.letters.forEach((m, i) => m.visible = (t * 3 - i * 0.3) > 0 && (Math.floor(t * 2 + i) % 7 !== 0)); ctx.grade = 'warm';
      cam(ctx, V(1.4, 1.5, 9.8), V(1.0, 2.2, 11.5), V(0.4, 3.0, 4), V(0.2, 8, -20), u, 55); };
    r.overlay = (g, W, H, u, T, t) => {
      const k = clamp(t * 3); if (k <= 0) return; const e = 1 - Math.pow(1 - k, 3);
      g.save(); g.globalAlpha = e; g.fillStyle = 'rgba(10,12,30,0.55)'; g.beginPath(); g.roundRect(W * 0.06, H * 0.1, W * 0.88, H * 0.27, W * 0.05); g.fill(); g.restore();
      g.save(); g.translate(W / 2, H * 0.165); g.scale(0.8 + 0.2 * e, 0.8 + 0.2 * e); g.globalAlpha = e; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      const line = (txt, y, size, col) => { g.font = `900 ${size}px "Inter Display"`; g.lineWidth = size * 0.18; g.strokeStyle = '#000'; g.strokeText(txt, 0, y); g.fillStyle = col; g.fillText(txt, 0, y); };
      line('HÄTTEST DU DEN', 0, W * 0.075, '#fff'); line('EIFFELTURM', W * 0.1, W * 0.1, '#FFD60A'); line('GEKAUFT?', W * 0.2, W * 0.075, '#fff'); g.restore();
      const b = clamp(t * 3 - 1.2); if (b > 0) { const pulse = 1 + 0.05 * Math.sin(T * 8);
        [['JA', '#2ecc71', -1], ['NEIN', '#e74c3c', 1]].forEach(([tx, c, sx]) => { g.save(); g.translate(W / 2 + sx * W * 0.2, H * 0.43); g.scale(b * pulse, b * pulse); g.fillStyle = c; g.strokeStyle = '#000'; g.lineWidth = W * 0.008; g.beginPath(); g.roundRect(-W * 0.15, -W * 0.06, W * 0.3, W * 0.12, W * 0.06); g.fill(); g.stroke(); g.fillStyle = '#fff'; g.font = `900 ${W * 0.065}px "Inter Display"`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(tx, 0, 4); g.restore(); });
        g.save(); g.globalAlpha = b; g.font = `800 ${W * 0.042}px "Inter Display"`; g.textAlign = 'center'; g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = 10; g.fillText('SCHREIB ES IN DIE KOMMENTARE', W / 2, H * 0.5); g.restore(); }
    };
    return r;
  },
  // ---------- HOOK ----------
  h_tower_sell(ctx) {
    const s = ctx.scene; towerSite(s); const lu = lustig(s, -0.45, 0, 0, 0.5); const po = poisson(s, 0.5, 0, 0.1, -0.5);
    const doc = L.makeLetter(); po.arms[0].el.add(doc); doc.position.set(0, -0.4, 0.1); doc.rotation.x = -1.2; doc.scale.setScalar(0.8);
    return (u, t) => { lu.expr('grin'); po.expr('grin', 1); lu.pose('stand'); po.pose('stand holdL'); const sh = Math.sin(t * 14) * 0.12; lu.arms[1].sh.rotation.set(-1.3 + sh, -0.5, 0); po.arms[1].sh.rotation.set(-1.3 + sh, 0.5, 0);
      ctx.flash = clamp(1 - t * 7) * 0.45; ctx.shake = 0.3 * clamp(1 - u * 2);
      cam(ctx, V(0.6, 0.5, 3.0), V(0.3, 1.2, 6.5), V(0, 1.4, 0), V(0, 16, -60), u, 55, true); };
  },
  h_face(ctx) {
    const s = ctx.scene; towerSite(s); const lu = lustig(s, 0, 0, 0, 0.2);
    return (u, t) => { lu.expr(u < 0.6 ? 'grin' : 'smug', 1); lu.look(0.2, 0); lu.brows[1].position.y = 0.27 + Math.max(0, Math.sin(t * 8)) * 0.05; if (u > 0.7) { lu.lids[1].visible = true; lu.lids[1].rotation.x = -0.05; } lu.head.rotation.z = Math.sin(t * 3) * 0.05;
      cam(ctx, V(0.5, 1.75, 2.1), V(0.15, 1.65, 1.25), V(0, 1.6, 0), V(0, 1.62, 0), u, 50, true); };
  },
  h_cash(ctx) {
    const s = ctx.scene; parisStreet(s, { target: V(0, 0, 0) }); const sc = L.makeSuitcase(0); s.add(sc); const rain = billRain(s, 50, 3);
    const bills = []; for (let i = 0; i < 30; i++) { const b = L.makeBill(); b.userData.v = V((Math.random() - 0.5) * 2, 2 + Math.random() * 2, 1 + Math.random() * 2); s.add(b); bills.push(b); }
    return (u, t) => { const k = clamp((u - 0.15) * 4); sc.userData.lid.rotation.x = -1.9 * easeOut(k); bills.forEach((b, i) => { const lt = Math.max(0, t - 0.25 - i * 0.012); b.visible = k > 0; b.position.set(b.userData.v.x * lt, 0.25 + b.userData.v.y * lt - 2.5 * lt * lt, b.userData.v.z * lt); b.rotation.set(t * 6 + i, t * 4, i); });
      if (u > 0.15 && u < 0.3) { ctx.shake = 0.8; ctx.flash = 0.3; }
      cam(ctx, V(0.0, 0.6, 1.8), V(0.0, 0.9, 1.3), V(0, 0.2, 0), V(0, 0.6, 0), u, 55); };
  },
  // ---------- SETUP ----------
  paris_wide(ctx) {
    const s = ctx.scene; parisStreet(s, { target: V(0, 1, 0), ez: -130, es: 1.6, cars: [1.2, 3.4] }); const pe = []; for (let i = 0; i < 5; i++) { const p = i % 2 ? lady(s, -8 + i * 3.5, -3 + (i % 2) * 1.5, Math.PI / 2, i) : person(s, DEALERS[i], -8 + i * 3.5, 0, -3 + (i % 2) * 1.5, -Math.PI / 2); p.pose('stand'); pe.push(p); }
    const r = (u, t) => { pe.forEach((p, i) => { walk(p, t + i); p.g.position.x += (i % 2 ? 1 : -1) * 0.015; }); ctx.tag = 'PARIS · 1925';
      cam(ctx, V(-6, 1.2, 9), V(1, 2.5, 6), V(-2, 4, -40), V(0, 40, -130), u, 55); };
    return r;
  },
  cafe_read(ctx) {
    const s = ctx.scene; parisStreet(s, { target: V(0, 1, -5) }); const lu = lustig(s, 0, 0.18, -4.6, 0); lu.pose('sit holdL holdR'); lu.g.position.y = -0.05;
    const ch = L.makeChairWood(); ch.position.set(0, 0.18, -4.7); s.add(ch); const np = L.makeNewspaper(); np.position.set(0, 1.35, -4.1); s.add(np);
    return (u, t) => { np.rotation.x = -0.15 + Math.sin(t * 2) * 0.02; ctx.tag = 'PARIS · 1925';
      orbit(ctx, V(0, 1.2, -4.4), 3.0, 2.2, 0.6, -0.3, 1.5, 1.4, u, 50); };
  },
  paper_close(ctx) {
    const s = ctx.scene; parisStreet(s, { target: V(0, 1, -5) }); const np = L.makeNewspaper(); np.position.set(0, 1.35, -4.1); s.add(np);
    return (u, t) => { np.rotation.set(-0.1, Math.sin(t * 1.5) * 0.05, Math.sin(t) * 0.02); cam(ctx, V(0.25, 1.15, -2.9), V(0.0, 1.55, -3.45), V(0, 1.2, -4.1), V(0, 1.5, -4.1), u, 50); };
  },
  idea_face(ctx) {
    const s = ctx.scene; parisStreet(s, { target: V(0, 1, -5) }); const lu = lustig(s, 0, 0.18, -4.6, 0); lu.pose('sit holdL'); lu.g.position.y = -0.05; const np = L.makeNewspaper(); lu.arms[0].el.add(np); np.position.set(0, -0.35, 0.15); np.rotation.x = -1.4; np.scale.setScalar(0.8);
    return (u, t) => { lu.expr(u < 0.35 ? 'smile' : 'crazy', 1); lu.look(u < 0.35 ? 0 : 0.6, 0.3); lu.arms[1].sh.rotation.set(-0.9, 0, 0.5); lu.arms[1].el.rotation.x = -2.0; if (u > 0.35 && u < 0.45) ctx.flash = 0.2;
      cam(ctx, V(0.6, 1.55, -2.6), V(0.2, 1.48, -3.35), V(0, 1.42, -4.6), V(0, 1.45, -4.6), u, 50, true); };
  },
  letters_stamp(ctx) {
    const s = ctx.scene; hotelRoom(s, { table: true }); const lt = L.makeLetter(); lt.rotation.x = -Math.PI / 2; lt.position.set(0, 0.845, 0); s.add(lt);
    const st = new THREE.Group(); s.add(st); L.mesh(L.cyl(0.08, 0.1, 0.05), 0xa3202a, 0, 0, 0, st); L.mesh(L.cyl(0.03, 0.03, 0.18), 0x3a1e14, 0, 0.1, 0, st); L.mesh(L.sph(0.06), 0x3a1e14, 0, 0.22, 0, st);
    const seal = L.mesh(new THREE.CircleGeometry(0.07, 24), L.mat(0xc0141e, { r: 0.6 }), 0.06, 0.847, 0.12, s); seal.rotation.x = -Math.PI / 2;
    const lu = lustig(s, 0, 0, -1.0, 0, false); lu.pose('stand holdR'); lu.expr('grin');
    return (u, t) => { const k = u < 0.45 ? 0.5 - u : Math.max(0, (u - 0.5) * 0.8); st.position.set(0.06, 0.87 + k * 0.8, 0.12); seal.visible = u > 0.45; if (u > 0.45 && u < 0.55) ctx.shake = 1.0;
      cam(ctx, V(0.6, 1.6, 1.0), V(0.3, 1.3, 0.7), V(0, 0.85, 0), V(0.05, 0.85, 0.05), u, 50); };
  },
  letters_fly(ctx) {
    const s = ctx.scene; parisStreet(s, { target: V(0, 1, 0) }); const ls = []; for (let i = 0; i < 6; i++) { const l = L.makeLetter(); l.scale.setScalar(1.6); s.add(l); ls.push(l); }
    return (u, t) => { ls.forEach((l, i) => { const k = t * 1.1 + i * 0.18; l.position.set(-4 + k * 3.5 + Math.sin(i * 2) * 0.8, 2.6 + Math.sin(k * 3 + i) * 0.5 + (i % 3) * 0.4, 1.0 + Math.cos(i * 3) * 1.2 + k * 0.8); l.rotation.set(Math.sin(t * 3 + i) * 0.6, t * 2 + i, Math.cos(t * 2 + i) * 0.5); }); L.WIND.v = 2;
      cam(ctx, V(-1.5, 2.6, 6.5), V(0.5, 3.0, 5.2), V(-1, 2.9, 1), V(1.5, 3.1, 1), u, 55); ctx.roll = Math.sin(t * 2) * 0.04; };
  },
  hotel_ext(ctx) {
    const s = ctx.scene; parisStreet(s, { target: V(0, 1, 0), cafeX: 40, gap: false, cars: [3.4, 5.2] });
    const sign = L.mesh(new THREE.PlaneGeometry(6, 0.9), new THREE.MeshStandardMaterial({ map: L.canvasTex(512, 80, (g, w, h) => { g.fillStyle = '#1d2a22'; g.fillRect(0, 0, w, h); g.fillStyle = '#e9c76a'; g.font = '700 46px Liberation Serif, serif'; g.textAlign = 'center'; g.fillText('HÔTEL DE CRILLON', w / 2, 56); }), roughness: 0.6 }), 0, 3.6, -7.85, s);
    for (const x of [-3, 3]) { L.mesh(L.cyl(0.03, 0.03, 3), 0xd9b44a, x, 5.5, -7.2, s).rotation.x = 0.6; const f = L.mesh(new THREE.PlaneGeometry(1.2, 0.8), new THREE.MeshStandardMaterial({ map: L.canvasTex(60, 40, (g, w, h) => { ['#1d3b8a', '#fff', '#c0141e'].forEach((c, i) => { g.fillStyle = c; g.fillRect(i * w / 3, 0, w / 3, h); }); }), side: THREE.DoubleSide }), x + 0.6, 6.4, -6.3, s); f.userData.f = 1; }
    const ds = []; for (let i = 0; i < 6; i++) { const d = i === 2 ? poisson(s, 0, 0, 0, 0) : person(s, DEALERS[i % 5], 0, 0, 0, 0); ds.push(d); }
    return (u, t) => { ds.forEach((d, i) => { d.g.position.set(-6 + i * 1.3 + u * 2.5, 0, 1.5 - u * 3 + (i % 2) * 0.8); d.g.rotation.y = Math.PI - 0.6; walk(d, t + i * 0.7); });
      cam(ctx, V(4, 1.2, 8), V(2, 2.4, 6.5), V(0, 2.2, -6), V(0, 3.2, -7), u, 55); };
  },
  meeting_wide(ctx) {
    const s = ctx.scene; const M = meeting(s);
    return (u, t) => { talk(M.lu, t, 'grin'); M.lu.arms[1].sh.rotation.set(-1.4 + Math.sin(t * 5) * 0.2, 0, 0.3); M.lu.arms[0].sh.rotation.set(-0.8 + Math.cos(t * 4) * 0.2, 0, -0.3); M.ds.forEach((d, i) => { d.head.rotation.y = (d.g.rotation.y ? 1 : -1) * 0.7 + Math.sin(t + i) * 0.05; d.head.rotation.x = Math.max(0, Math.sin(t * 4 + i * 1.3)) * 0.12; d.expr(i % 3 ? 'smile' : 'squint'); });
      cam(ctx, V(4.5, 3.6, 4.5), V(3.0, 2.6, 3.4), V(-0.8, 0.9, 0), V(-1.2, 1.2, 0), u, 55); };
  },
  lustig_present(ctx) {
    const s = ctx.scene; const M = meeting(s); const e = L.makeEiffel(); e.scale.setScalar(0.022); e.position.set(-1.6, 0.84, 0); s.add(e);
    return (u, t) => { talk(M.lu, t, 'grin'); M.lu.g.rotation.y = Math.PI / 2 - 0.4; M.lu.arms[1].sh.rotation.set(-1.2, 0, 0.6 + Math.sin(t * 4) * 0.1); e.rotation.y = t * 0.6;
      cam(ctx, V(-0.6, 2.1, 0.5), V(-1.5, 1.85, 0.45), V(-2.6, 1.3, 0), V(-3.1, 1.55, 0), u, 50); };
  },
  dealers_shock(ctx) {
    const s = ctx.scene; const M = meeting(s);
    return (u, t) => { M.ds.forEach((d, i) => { const k = clamp(u * 3 - i * 0.25); d.expr(k > 0.3 ? (i % 2 ? 'shock' : 'scared') : 'smile', 1); d.look(-0.7, 0.1); d.body.rotation.x = -0.12 * k; d.g.position.y = -0.2 + Math.abs(Math.sin(k * Math.PI)) * 0.06; }); M.lu.expr('smug'); if (u < 0.15) ctx.shake = 0.4;
      cam(ctx, V(2.6, 1.45, 3.2), V(-0.6, 1.45, 3.0), V(1.6, 1.3, 1.25), V(-1.6, 1.3, 1.25), u, 45); };
  },
  secret_finger(ctx) {
    const s = ctx.scene; hotelRoom(s); const lu = lustig(s, 0, 0, 0, 0, false); lu.pose('stand');
    return (u, t) => { lu.expr('smug'); lu.lids.forEach(l => { l.visible = true; l.rotation.x = -0.65; }); lu.arms[1].sh.rotation.set(-1.25, 0.55, 0.35); lu.arms[1].el.rotation.set(-1.85, 0, 0); lu.look(0, 0);
      ctx.grade = 'night'; cam(ctx, V(0.3, 1.66, 1.7), V(0.08, 1.64, 1.05), V(0, 1.58, 0), V(0, 1.6, 0), u, 50); };
  },
  dealers_lean(ctx) {
    const s = ctx.scene; const M = meeting(s);
    return (u, t) => { M.ds.forEach((d, i) => { d.body.rotation.x = 0.25 * ease(u); d.head.rotation.x = 0.2 * u; d.expr('scared', 0.5); d.look(-0.5, 0); });
      ctx.grade = 'night'; cam(ctx, V(4.2, 1.5, 0.3), V(3.0, 1.45, 0.1), V(0, 1.2, 0), V(0, 1.15, 0), u, 50); ctx.roll = u * 0.08; };
  },
  // ---------- POISSON ----------
  poisson_eager(ctx) {
    const s = ctx.scene; hotelRoom(s); const po = poisson(s, 0, 0, 0, 0); po.pose('stand'); const sw = sweat(po);
    return (u, t) => { po.expr('crazy', 1); rubHands(po, t); po.look(Math.sin(t * 3) * 0.3, 0.2); sw(t); po.head.rotation.z = Math.sin(t * 6) * 0.05;
      cam(ctx, V(-0.5, 1.6, 2.4), V(-0.15, 1.6, 1.4), V(0, 1.4, 0), V(0, 1.55, 0), u, 50); };
  },
  poisson_dream(ctx) {
    const s = ctx.scene; towerSite(s, { target: V(0, 1, 0) }); const po = poisson(s, 0, 0, 4, 0); po.pose('stand cheer'); const rain = coinRain(s, 70, 5, 0xf5c542, 4);
    return (u, t) => { po.expr('crazy', 1); po.arms[1].sh.rotation.z = 2.6 + Math.sin(t * 9) * 0.3; po.arms[0].sh.rotation.z = -2.6 - Math.sin(t * 9) * 0.3; po.g.position.y = Math.abs(Math.sin(t * 7)) * 0.15; rain(t, 4);
      ctx.grade = 'dream'; cam(ctx, V(1.5, 0.8, 8.5), V(0.5, 1.5, 7), V(0, 3, 0), V(0, 14, -60), u, 55); };
  },
  wife_suspicious(ctx) {
    const s = ctx.scene; hotelRoom(s, { tint: 0x9fc0ff, table: false }); const w = guy(s, WIFE, -0.5, 0, 0, 0.35); const po = poisson(s, 0.65, 0, 0.3, -0.4); po.pose('stand');
    return (u, t) => { crossArms(w); w.expr('angry'); w.look(0.7, 0); w.head.rotation.z = -0.12; po.expr('scared', 0.6); po.look(-0.6, 0); po.head.rotation.x = 0.1; const sw = 0;
      cam(ctx, V(0.2, 1.4, 3.6), V(0.0, 1.55, 2.6), V(0, 1.4, 0), V(0, 1.5, 0), u, 50); };
  },
  wife_close(ctx) {
    const s = ctx.scene; hotelRoom(s, { tint: 0x9fc0ff, table: false }); const w = guy(s, WIFE, 0, 0, 0, 0);
    return (u, t) => { crossArms(w); w.expr(u < 0.5 ? 'angry' : 'squint'); w.look(0.4 + Math.sin(t * 2) * 0.3, 0); w.head.rotation.z = -0.12 + Math.sin(t * 2) * 0.04; w.brows[0].position.y = 0.2 + (u > 0.5 ? 0.06 : 0);
      cam(ctx, V(-0.4, 1.68, 1.6), V(-0.1, 1.64, 1.05), V(0, 1.6, 0), V(0, 1.62, 0), u, 50); };
  },
  whisper(ctx) {
    const s = ctx.scene; hotelRoom(s, { table: false }); const lu = lustig(s, -0.38, 0, 0, Math.PI / 2 - 0.2, false); const po = poisson(s, 0.38, 0, 0, -Math.PI / 2 + 0.3); po.pose('stand'); lu.pose('stand');
    return (u, t) => { lu.body.rotation.x = 0.0; lu.g.rotation.z = -0.08; lu.arms[1].sh.rotation.set(-1.3, 0.4, 0.5); lu.arms[1].el.rotation.x = -1.6; talk(lu, t * 0.6, 'smug'); po.expr('shock', 0.4); po.look(-0.8, 0);
      ctx.grade = 'night'; cam(ctx, V(1.4, 1.75, 1.7), V(1.0, 1.7, 1.15), V(-0.2, 1.6, 0), V(-0.25, 1.62, 0), u, 50); };
  },
  finger_rub(ctx) {
    const s = ctx.scene; hotelRoom(s, { table: false }); const lu = lustig(s, 0, 0, 0, 0, false); lu.pose('stand'); const coin = L.mesh(L.cyl(0.05, 0.05, 0.01, 20), L.mat(0xf5c542, { m: 1, r: 0.2, env: 1.5 }), 0, 0, 0, s);
    return (u, t) => { lu.expr('smug'); lu.arms[1].sh.rotation.set(-1.1, -0.2, 0.25); lu.arms[1].el.rotation.set(-0.9, 0, 0); const hd = lu.arms[1].hand; hd.rotation.z = Math.sin(t * 18) * 0.3; lu.brows.forEach(b => b.position.y = 0.26 + Math.max(0, Math.sin(t * 7)) * 0.04);
      const hp = new THREE.Vector3(); hd.getWorldPosition(hp); coin.position.copy(hp).add(V(0, 0.15 + Math.sin(t * 6) * 0.03, 0.05)); coin.rotation.set(Math.PI / 2, t * 6, 0);
      ctx.grade = 'night'; cam(ctx, V(0.6, 1.35, 1.5), V(0.4, 1.25, 1.05), V(0.2, 1.1, 0.3), V(0.2, 1.15, 0.3), u, 50); };
  },
  poisson_think(ctx) {
    const s = ctx.scene; hotelRoom(s, { table: false }); const po = poisson(s, 0, 0, 0, 0); po.pose('stand chin');
    return (u, t) => { po.expr(u < 0.6 ? 'squint' : 'shock', 1); po.look(Math.sin(t * 2) * 0.6, 0.7); po.head.rotation.z = Math.sin(t * 1.5) * 0.08; if (u > 0.6 && u < 0.7) ctx.flash = 0.15;
      ctx.grade = 'night'; cam(ctx, V(0.5, 1.6, 1.9), V(0.15, 1.62, 1.25), V(0, 1.55, 0), V(0, 1.58, 0), u, 50); };
  },
  poisson_relief(ctx) {
    const s = ctx.scene; hotelRoom(s, { table: false }); const po = poisson(s, 0, 0, 0, 0); po.pose('stand');
    return (u, t) => { po.expr('grin', 1); po.head.rotation.x = Math.sin(t * 9) * 0.15; po.look(0, 0); rubHands(po, t);
      cam(ctx, V(-0.4, 1.5, 2.0), V(-0.1, 1.6, 1.3), V(0, 1.5, 0), V(0, 1.58, 0), u, 50); };
  },
  handshake(ctx) {
    const s = ctx.scene; hotelRoom(s, { table: false }); const lu = lustig(s, -0.45, 0, 0, Math.PI / 2 - 0.2, false); const po = poisson(s, 0.5, 0, 0, -Math.PI / 2 + 0.2); lu.pose('stand'); po.pose('stand');
    return (u, t) => { const sh = Math.sin(t * 14) * 0.1; lu.arms[1].sh.rotation.set(-1.25 + sh, 0, 0); po.arms[0].sh.rotation.set(-1.25 + sh, 0, 0); lu.expr('grin'); po.expr('grin');
      cam(ctx, V(0.2, 1.5, 2.6), V(0.05, 1.35, 1.7), V(0, 1.3, 0), V(0, 1.2, 0), u, 48); };
  },
  pay_cash(ctx) {
    const s = ctx.scene; hotelRoom(s); const st = []; for (let i = 0; i < 4; i++) { const c = L.makeCashStack(6); c.position.set(1.4, 0.84, -0.4 + i * 0.28); s.add(c); st.push(c); }
    const lu = lustig(s, -3.0, 0, 0, Math.PI / 2, false); lu.pose('stand holdR holdL'); const po = poisson(s, 3.0, 0, 0, -Math.PI / 2); po.pose('stand holdR holdL');
    return (u, t) => { st.forEach((c, i) => { const k = clamp(u * 2.2 - i * 0.25); c.position.x = 1.4 - easeOut(k) * 2.6; }); lu.expr('crazy'); po.expr('grin');
      cam(ctx, V(0.2, 2.6, 1.6), V(-0.3, 1.9, 1.3), V(0, 0.85, 0), V(-0.6, 0.9, 0), u, 50); };
  },
  money_rain(ctx) {
    const s = ctx.scene; hotelRoom(s, { table: false }); const lu = lustig(s, 0, 0, 0, 0, false); lu.pose('stand armsUp'); const rain = billRain(s, 60, 4);
    return (u, t) => { lu.expr(Math.sin(t * 10) > 0 ? 'crazy' : 'grin', 1); lu.arms[0].sh.rotation.z = -2.6 + Math.sin(t * 8) * 0.3; lu.arms[1].sh.rotation.z = 2.6 - Math.sin(t * 8) * 0.3; lu.g.rotation.y = t * 1.5; rain(t, 4);
      cam(ctx, V(0, 0.9, 3.2), V(0, 1.3, 2.4), V(0, 1.6, 0), V(0, 1.7, 0), u, 55); };
  },
  // ---------- ESCAPE ----------
  train_ext(ctx) {
    const s = ctx.scene; s.background = L.skyTex('#4b8fd6', '#a9cdef', '#f3e6cf'); s.fog = new THREE.Fog(0xe9e2d4, 40, 300);
    const gr = L.mesh(new THREE.PlaneGeometry(800, 800), new THREE.MeshStandardMaterial({ map: L.grassTex(), roughness: 1 }), 0, 0, 0, s); gr.rotation.x = -Math.PI / 2;
    for (const z of [-0.9, 0.9]) L.mesh(L.box(400, 0.1, 0.12), L.mat(0x777777, { m: 0.8 }), 0, 0.12, z * 1.2, s); for (let i = -60; i < 60; i++) L.mesh(L.box(0.3, 0.08, 3.4), 0x4a3020, i * 1.2, 0.05, 0, s);
    L.reseed(6); for (let i = 0; i < 30; i++) { const t = L.makeTree(1 + L.RNG()); t.position.set(-120 + L.RNG() * 240, 0, -15 - L.RNG() * 60); s.add(t); }
    const tr = L.makeTrain(); s.add(tr); const st = L.makeSteam(); s.add(st);
    lights(s, { target: V(0, 1, 0), sr: 20 });
    return (u, t) => { tr.position.x = -10 + u * 18; tr.userData.wheels.forEach(w => w.rotation.y = -t * 8); st.position.set(tr.position.x + 2.6, 4.3, 0); ctx.tag = 'NACH WIEN';
      cam(ctx, V(10, 1.0, 12), V(8, 2.5, 10), V(-2, 2, 0), V(4, 2.5, 0), u, 55); };
  },
  train_int(ctx) {
    const s = ctx.scene; s.background = new THREE.Color(0x2a1a14); if (ENV) s.environment = ENV;
    const room = L.mesh(L.box(4, 3, 3), L.mat(0x6b4a2e, { r: 0.6, fab: true }), 0, 1.5, 0, s); room.material = room.material.clone(); room.material.side = THREE.BackSide; room.castShadow = false;
    const land = L.canvasTex(1024, 256, (g, w, h) => { g.fillStyle = '#8fc0ec'; g.fillRect(0, 0, w, h); g.fillStyle = '#6aa04a'; g.fillRect(0, h * 0.55, w, h); for (let i = 0; i < 40; i++) { g.fillStyle = ['#3f7f35', '#2f6a2a', '#4f9a3a'][i % 3]; g.beginPath(); g.arc(Math.random() * w, h * 0.55, 10 + Math.random() * 25, 0, 7); g.fill(); } }); land.wrapS = THREE.RepeatWrapping;
    const win = L.mesh(new THREE.PlaneGeometry(2.4, 1.2), new THREE.MeshBasicMaterial({ map: land }), 0, 1.7, -1.48, s); win.castShadow = false;
    for (const z of [-0.9, 0.9]) { const se = L.mesh(L.box(3.6, 0.5, 0.8), L.mat(0x8a1d22, { fab: true, r: 0.9 }), 0, 0.45, z, s); }
    const lu = lustig(s, 0.2, -0.05, 0.9, Math.PI); lu.pose('sit holdL holdR'); const sc = L.makeSuitcase(0.5); sc.position.set(0.2, 0.95, 0.35); sc.rotation.y = Math.PI; s.add(sc);
    s.add(new THREE.HemisphereLight(0xffe2c0, 0x4a2a1a, 0.8)); const sun = new THREE.DirectionalLight(0xfff1d6, 2.2); sun.position.set(0, 3, -5); sun.castShadow = true; s.add(sun);
    return (u, t) => { land.offset.x = t * 0.25; lu.expr(Math.sin(t * 6) > 0 ? 'grin' : 'smug', 1); lu.look(0, -0.5); lu.g.position.y = -0.05 + Math.abs(Math.sin(t * 20)) * 0.01; sc.userData.lid.rotation.x = -0.5 - Math.sin(t * 3) * 0.1; ctx.tag = 'NACH WIEN';
      cam(ctx, V(1.0, 1.5, -1.3), V(0.65, 1.45, -0.75), V(0.2, 1.3, 0.9), V(0.2, 1.4, 0.9), u, 55); };
  },
  poisson_waits(ctx) {
    const s = ctx.scene; towerSite(s, { top: '#6b7f99', mid: '#a9b6c6', bot: '#d8d8d0', si: 1.2, sun: 0xdfe6f0 }); const po = poisson(s, 0, 0, 6, 0); po.pose('stand holdL'); const doc = L.makeLetter(); po.arms[0].el.add(doc); doc.position.set(0, -0.4, 0.1); doc.rotation.x = -1.2; doc.scale.setScalar(0.8);
    return (u, t) => { po.head.rotation.y = Math.sin(t * 2) * 0.7; po.look(Math.sin(t * 2) * 0.8, 0.2); po.expr('scared', 0.4);
      cam(ctx, V(-4, 0.4, 14), V(-2.5, 1.0, 11), V(0, 1.6, 6), V(0, 8, -40), u, 55); };
  },
  poisson_shame(ctx) {
    const s = ctx.scene; towerSite(s, { top: '#6b7f99', mid: '#a9b6c6', bot: '#d8d8d0', si: 1.2 }); const po = poisson(s, 0, 0, 6, 0); po.pose('stand');
    const drops = []; for (let i = 0; i < 80; i++) { const d = L.mesh(L.box(0.01, 0.25, 0.01), L.mat(0xbfd6ff, { t: 0.5 }), (Math.random() - 0.5) * 4, 0, 6 + (Math.random() - 0.3) * 3, s); d.castShadow = false; d.userData.p = Math.random(); drops.push(d); }
    return (u, t) => { po.expr('sad'); po.look(0, -1); po.head.rotation.x = 0.35; po.arms[0].sh.rotation.set(-1.9, 0, -0.3); po.arms[0].el.rotation.x = -1.6; po.arms[1].sh.rotation.set(-1.9, 0, 0.3); po.arms[1].el.rotation.x = -1.6; drops.forEach(d => d.position.y = 4 - ((t * 1.5 + d.userData.p) % 1) * 4);
      ctx.grade = 'night'; cam(ctx, V(0.4, 1.6, 8.0), V(0.1, 1.55, 7.3), V(0, 1.5, 6), V(0, 1.5, 6), u, 50); };
  },
  police_pass(ctx) {
    const s = ctx.scene; parisStreet(s, { top: '#6b7f99', mid: '#a9b6c6', bot: '#d8d8d0', si: 1.3, target: V(0, 1, -2), gap: false });
    L.mesh(new THREE.PlaneGeometry(4, 0.7), new THREE.MeshStandardMaterial({ map: L.canvasTex(400, 70, (g, w, h) => { g.fillStyle = '#1d2a4a'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '800 44px Inter Display'; g.textAlign = 'center'; g.fillText('GENDARMERIE', w / 2, 50); }) }), 0, 3.6, -7.85, s);
    const gd = guy(s, GENDARME, 1.3, 0.18, -6.2, 0); kepi(gd); gd.pose('stand'); const po = poisson(s, 0, 0, 0, 0);
    return (u, t) => { po.g.position.set(-3 + u * 2.4, 0, -3.2); po.g.rotation.y = u < 0.55 ? Math.PI / 2 : Math.PI / 2 + (u - 0.55) * 4; walk(po, t, u < 0.5 ? 8 : 4); po.expr(u < 0.5 ? 'sad' : 'scared'); po.look(u < 0.5 ? 0.8 : -0.5, 0); gd.expr('smile'); gd.look(-0.5, 0);
      cam(ctx, V(-1, 1.5, 4.5), V(0, 1.6, 3.2), V(-1, 1.8, -4), V(0.3, 1.9, -5), u, 50); };
  },
  // ---------- SECOND ATTEMPT ----------
  return_walk(ctx) {
    const s = ctx.scene; parisStreet(s, { target: V(0, 1, -3) }); const lu = lustig(s, 0, 0, -3, Math.PI / 2); const sc = L.makeSuitcase(0); sc.scale.setScalar(0.7); lu.arms[0].el.add(sc); sc.position.set(0, -0.45, 0); sc.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    return (u, t) => { lu.g.position.x = -2 + u * 3; walk(lu, t, 7); lu.expr('smug'); lu.look(0.7, 0); lu.arms[1].sh.rotation.set(-0.6, 0, 2.6 * clamp(u * 3 - 1.2)); if (lu.hat) lu.hat.position.y = 0.27 + 0.1 * Math.max(0, Math.sin(clamp(u * 3 - 1.4) * Math.PI)); ctx.tag = 'EINEN MONAT SPÄTER';
      cam(ctx, V(-0.5, 1.2, 1.8), V(1.6, 1.5, 1.4), V(-1, 1.5, -3), V(1, 1.6, -3), u, 50); };
  },
  meeting2(ctx) {
    const s = ctx.scene; const M = meeting(s, 6, false, 2);
    return (u, t) => { talk(M.lu, t, 'grin'); M.lu.arms[1].sh.rotation.set(-1.4 + Math.sin(t * 5) * 0.2, 0, 0.3); M.ds.forEach((d, i) => d.expr('smile'));
      orbit(ctx, V(-0.5, 1, 0), 5.0, 4.0, 2.2, 1.4, 2.6, 2.0, u, 55); };
  },
  dealer_police(ctx) {
    const s = ctx.scene; parisStreet(s, { target: V(0, 1, -3), gap: false }); L.mesh(new THREE.PlaneGeometry(4, 0.7), new THREE.MeshStandardMaterial({ map: L.canvasTex(400, 70, (g, w, h) => { g.fillStyle = '#1d2a4a'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '800 44px Inter Display'; g.textAlign = 'center'; g.fillText('GENDARMERIE', w / 2, 50); }) }), 0, 3.6, -7.85, s);
    const d = person(s, DEALERS[1], -0.45, 0, -3, 0.6); const gd = guy(s, GENDARME, 0.45, 0, -3, -0.6); kepi(gd);
    return (u, t) => { talk(d, t, 'angry'); d.pose('stand point'); d.arms[1].sh.rotation.x = -1.5 + Math.sin(t * 10) * 0.15; gd.expr(u < 0.5 ? 'shock' : 'angry'); gd.look(-0.6, 0);
      cam(ctx, V(0.3, 1.5, 0.2), V(0.1, 1.6, -0.8), V(0, 1.5, -3), V(0, 1.55, -3), u, 50); };
  },
  raid(ctx) {
    const s = ctx.scene; const R = hotelRoom(s); const door = new THREE.Group(); door.position.set(-6.5, 0, -5.9); s.add(door); L.mesh(L.box(1.4, 2.6, 0.1), L.mat(0x4a2a1a, { r: 0.5 }), 0.7, 1.3, 0, door);
    const gs = []; for (let i = 0; i < 3; i++) { const g2 = guy(s, GENDARME, -5.8, 0, -4.8, 0.6); kepi(g2); gs.push(g2); }
    const sc = L.makeLetter(); sc.position.set(0.6, 0.85, 0.2); sc.rotation.x = -Math.PI / 2; s.add(sc);
    return (u, t) => { door.rotation.y = -1.6 * easeOut(clamp(u * 4)); if (u < 0.2) { ctx.shake = 1; ctx.flash = 0.2 * (1 - u * 5); }
      gs.forEach((g2, i) => { const k = clamp(u * 1.6 - i * 0.15); g2.g.position.set(-5.8 + k * 4 + i * 0.3, 0, -4.8 + k * 3.2 + i * 0.4); walk(g2, t + i, 12); g2.expr(k > 0.7 ? 'shock' : 'angry'); g2.look(0.6, 0); });
      R.curtains.forEach((c, i) => { c.rotation.x = Math.sin(t * 6 + i) * 0.25; c.position.z = -5.6 + Math.sin(t * 5 + i) * 0.15; });
      cam(ctx, V(4.5, 2.2, 4.5), V(3.4, 1.9, 3.6), V(-3, 1.3, -2), V(-1.5, 1.4, -2), u, 55); };
  },
  escape_run(ctx) {
    const s = ctx.scene; parisStreet(s, { night: true, top: '#0c1430', mid: '#1d2a50', bot: '#3a3a5a', fog: 0x1a2040, sky: 0x4a5a9a, hi: 0.35, si: 0.3, sun: 0x8090c0, target: V(0, 1, -3) });
    const lu = lustig(s, 0, 0, -2.5, Math.PI / 2); const sc = L.makeSuitcase(0); sc.scale.setScalar(0.7); lu.arms[0].el.add(sc); sc.position.set(0, -0.45, 0); sc.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    const gs = []; for (let i = 0; i < 2; i++) { const g2 = guy(s, GENDARME, 0, 0, -2.2 + i * 0.6, Math.PI / 2); kepi(g2); gs.push(g2); }
    const hatW = new THREE.Vector3();
    return (u, t) => { lu.g.position.x = -1 + u * 6; walk(lu, t, 15); lu.expr('crazy'); lu.look(-0.8, 0); lu.body.rotation.x = 0.2;
      if (lu.hat) { if (u > 0.25) { lu.hat.position.set(-1.0 * (u - 0.25) * 3, 0.27 + (u - 0.25) * 1.2, 0); lu.hat.rotation.set(t * 6, 0, t * 4); } }
      gs.forEach((g2, i) => { g2.g.position.x = -7 + u * 6.5 - i * 1.2; walk(g2, t + i, 14); g2.expr('angry'); g2.pose('stand point'); walk(g2, t + i, 14); });
      ctx.grade = 'night'; cam(ctx, V(0, 1.2, 3.5), V(5, 1.4, 3.2), V(-1, 1.3, -2.5), V(4, 1.3, -2.5), u, 55); };
  },
  // ---------- ARREST / ALCATRAZ ----------
  press(ctx) {
    const s = ctx.scene; s.background = new THREE.Color(0x15181c); if (ENV) s.environment = ENV;
    const room = L.mesh(L.box(10, 5, 10), L.mat(0x5a5f66, { r: 0.9, fab: true }), 0, 2.5, 0, s); room.material = room.material.clone(); room.material.side = THREE.BackSide; room.castShadow = false;
    s.add(new THREE.HemisphereLight(0xbfd0e0, 0x2a2a2a, 0.5)); const bulb = new THREE.SpotLight(0xffe2a8, 40, 12, 0.7, 0.5); bulb.position.set(0, 4, 1); bulb.castShadow = true; s.add(bulb); s.add(bulb.target); L.mesh(L.sph(0.1), L.mat(0xffffff, { e: 0xffe2a8, ei: 3 }), 0, 4, 1, s);
    const pr = L.makePress(); s.add(pr); const lu = lustig(s, 1.5, 0, 0.5, -1.2, false); lu.pose('stand holdL holdR');
    const bills = []; for (let i = 0; i < 12; i++) { const b = L.makeBill(); b.rotation.x = -Math.PI / 2; s.add(b); bills.push(b); }
    return (u, t) => { pr.userData.rolls.forEach((r, i) => r.rotation.y = t * 6 * (i ? -1 : 1)); pr.userData.wheel.rotation.z = t * 3; lu.expr('crazy'); lu.arms.forEach((a, i) => a.sh.rotation.x = -1.2 + Math.sin(t * 6 + i * Math.PI) * 0.3);
      bills.forEach((b, i) => { const k = ((t * 0.8 + i / 12) % 1); b.position.set(-0.2 + k * 0.2, 0.92, 0.5 + k * 1.2); }); ctx.tag = 'USA · 1935';
      cam(ctx, V(-1.8, 1.8, 3.2), V(-1.1, 1.6, 2.4), V(0, 1.1, 0.4), V(0.3, 1.2, 0.4), u, 50); };
  },
  arrest_us(ctx) {
    const s = ctx.scene; parisStreet(s, { night: true, top: '#0c1430', mid: '#1d2a50', bot: '#3a3a5a', fog: 0x1a2040, sky: 0x4a5a9a, hi: 0.4, si: 0.4, target: V(0, 1, -3) });
    const lu = lustig(s, 0, 0, -3, 0); lu.pose('stand cuffed'); const a1 = guy(s, AGENT, -0.65, 0, -3.2, 0.4); fedora(a1, 0x5a4a3a); a1.pose('stand holdR'); const a2 = guy(s, AGENT, 0.65, 0, -3.2, -0.4); fedora(a2, 0x3a3a3a); a2.pose('stand holdL');
    const fl = new THREE.PointLight(0xffffff, 0, 10); fl.position.set(0, 2, 0); s.add(fl);
    return (u, t) => { lu.expr('shock', 1); lu.look(Math.sin(t * 4) * 0.8, 0); a1.expr('angry'); a2.expr('angry'); const f = (t % 0.6) < 0.05; fl.intensity = f ? 40 : 0; ctx.flash = f ? 0.2 : 0; ctx.tag = 'USA · 1935';
      cam(ctx, V(0.6, 1.5, 0.6), V(0.2, 1.6, -0.6), V(0, 1.5, -3), V(0, 1.55, -3), u, 50); };
  },
  alcatraz(ctx) {
    const s = ctx.scene; s.background = L.skyTex('#55708f', '#9fb3c6', '#d6dde2'); s.fog = new THREE.Fog(0xc6d0d8, 60, 600); s.add(L.makeWater()); const is = L.makeIsland(); s.add(is);
    L.reseed(12); const b = L.makeBirds(7, V(-10, 30, 30)); b.children.forEach(c => c.children.forEach(w => w.material = L.mat(0xffffff, { ds: true }))); s.add(b);
    lights(s, { sky: 0xd6e0ea, ground: 0x5a6a7a, hi: 1.2, si: 1.8, dir: [-10, 12, 8], sr: 40, target: V(0, 8, 0), sunSprite: false });
    return (u, t) => { ctx.tag = 'ALCATRAZ'; cam(ctx, V(-30, 8, 80), V(-12, 16, 55), V(0, 8, 0), V(0, 11, 0), u, 50); };
  },
  cell(ctx) {
    const s = ctx.scene; s.background = new THREE.Color(0x14171a); if (ENV) s.environment = ENV;
    const room = L.mesh(L.box(4, 3, 4), L.mat(0x8a8f94, { r: 0.95, fab: true }), 0, 1.5, 0, s); room.material = room.material.clone(); room.material.side = THREE.BackSide; room.castShadow = false;
    s.add(new THREE.HemisphereLight(0xa0b0c0, 0x202020, 0.5)); const win = new THREE.SpotLight(0xdfe8ff, 30, 10, 0.4, 0.6); win.position.set(0, 3, -3); win.target.position.set(0, 1, 1.2); win.castShadow = true; s.add(win); s.add(win.target);
    const lu = lustig(s, 0, 0, 0.6, 0); lu.pose('stand');
    const bars = L.makeBars(3.6, 3); bars.position.set(0, 0, 1.4); s.add(bars);
    return (u, t) => { lu.expr('sad'); lu.look(0, -0.4); lu.head.rotation.x = 0.15; lu.arms[0].sh.rotation.set(-1.2, 0.3, -0.2); lu.arms[1].sh.rotation.set(-1.2, -0.3, 0.2); lu.arms[0].el.rotation.x = -0.4; lu.arms[1].el.rotation.x = -0.4; ctx.tag = 'ALCATRAZ';
      ctx.grade = 'night'; cam(ctx, V(0.3, 1.6, 3.6), V(0.1, 1.62, 2.4), V(0, 1.6, 0.6), V(0, 1.62, 0.6), u, 50); };
  },
  // ---------- FINALE ----------
  finale(ctx) {
    const s = ctx.scene; towerSite(s, { top: '#2b2a6b', mid: '#e3735a', bot: '#ffc27a', fog: 0xf2a070, sun: 0xffb070, dir: [-8, 3, -12], sunCol: '#ffcf8a', si: 2.0, citroen: true }); const lu = lustig(s, 0, 0, 5, 0.3);
    return (u, t) => { lu.pose('stand'); lu.expr('smug'); lu.arms[1].sh.rotation.set(-0.5, 0, 2.6 * clamp(u * 2)); if (lu.hat) lu.hat.position.y = 0.27 + 0.1 * Math.sin(clamp(u * 2 - 0.4) * Math.PI); ctx.grade = 'warm';
      cam(ctx, V(1.2, 1.2, 8.5), V(2.5, 2.5, 13), V(0, 1.6, 5), V(0, 16, -60), u, 55); };
  },
  finale_title(ctx) {
    const s = ctx.scene; towerSite(s, { top: '#2b2a6b', mid: '#e3735a', bot: '#ffc27a', fog: 0xf2a070, sun: 0xffb070, dir: [-8, 3, -12], sunCol: '#ffcf8a', si: 2.0, citroen: true });
    const r = (u, t) => { ctx.grade = 'warm'; ctx.flash = clamp(1 - t * 4) * 0.7; cam(ctx, V(2, 2, 22), V(3, 3, 32), V(0, 30, -60), V(0, 34, -60), u, 55); };
    r.overlay = (g, W, H, u, T, t) => { bigText(g, '1925', W / 2, H * 0.17, W * 0.2, t / 1.2); bigText(g, 'VICTOR LUSTIG', W / 2, H * 0.265, W * 0.095, t / 1.2 - 0.15);
      if (t > 0.9) { g.save(); g.globalAlpha = clamp((t - 0.9) * 3); g.font = `800 ${W * 0.042}px "Inter Display"`; g.textAlign = 'center'; g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 12; g.fillText('EINE WAHRE GESCHICHTE', W / 2, H * 0.315); g.restore(); } };
    return r;
  },
};

export function bigText(g, txt, x, y, size, u) {
  const k = clamp(u * 5); if (k <= 0) return; const sc = 1.6 - 0.6 * (1 - Math.pow(1 - k, 3));
  g.save(); g.translate(x, y); g.scale(sc, sc); g.font = `900 ${size}px "Inter Display"`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const w = g.measureText(txt).width; if (w > 0.9 * g.canvas.width / sc) { const f = 0.9 * g.canvas.width / sc / w; g.scale(f, f); }
  for (let i = 12; i > 0; i--) { g.fillStyle = `rgb(${90 - i * 4},${90 - i * 4},${100 - i * 4})`; g.fillText(txt, i * 0.6, i * 0.9); }
  const gr = g.createLinearGradient(0, -size / 2, 0, size / 2); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#c9d3dd'); g.fillStyle = gr; g.fillText(txt, 0, 0);
  g.lineWidth = size * 0.03; g.strokeStyle = '#3a3f48'; g.strokeText(txt, 0, 0); g.restore();
}
