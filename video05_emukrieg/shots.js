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
const backOut = k => k >= 1 ? 1 : 1 + 2.4 * Math.pow(k - 1, 3) + 1.4 * Math.pow(k - 1, 2);
function chip(g, W, H, txt, bg, x, y, k = 1, fs = 0.046) {
  if (k <= 0) return; const s = W * fs; g.save(); g.font = `900 ${s}px "Inter Display"`; const tw = g.measureText(txt).width; const pw = tw + s * 1.5, ph = s * 1.8;
  const e = backOut(clamp(k)); g.translate(x, y); g.scale(e, e); g.globalAlpha = clamp(k * 3);
  g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = s * 0.6; g.shadowOffsetY = s * 0.15; g.fillStyle = bg; g.beginPath(); g.roundRect(-pw / 2, -ph / 2, pw, ph, ph / 2); g.fill();
  g.shadowColor = 'transparent'; g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = s * 0.09; g.stroke(); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 0, s * 0.06); g.restore();
}
function stamp2d(g, W, H, txt, k, col = '#e8202a', y = 0.3, rot = -0.14) {
  if (k <= 0) return; const e = clamp(k / 0.25); const sc = 2.4 - 1.4 * (1 - Math.pow(1 - e, 3)); const s = W * 0.15;
  g.save(); g.translate(W / 2, H * y); g.rotate(rot); g.scale(sc, sc); g.globalAlpha = clamp(e * 2); g.font = `900 ${s}px "Inter Display"`; const tw = g.measureText(txt).width;
  g.lineJoin = 'round'; g.strokeStyle = '#fff'; g.lineWidth = s * 0.3; g.strokeText(txt, -tw / 2, 0); g.fillStyle = col; g.textBaseline = 'middle'; g.fillText(txt, -tw / 2, 0);
  g.strokeStyle = col; g.lineWidth = s * 0.09; g.beginPath(); g.roundRect(-tw / 2 - s * 0.35, -s * 0.72, tw + s * 0.7, s * 1.35, s * 0.2); g.stroke(); g.restore();
}
function qmarks(g, W, H, T, k, x = 0.7, y = 0.26) { if (k <= 0) return; [[0, 0, 1], [-0.12, 0.05, 0.7], [0.11, 0.07, 0.8]].forEach(([dx, dy, s], i) => { const kk = backOut(clamp(k * 3 - i * 0.4)); if (kk <= 0) return; const sz = W * 0.13 * s * kk; g.save(); g.translate(W * (x + dx), H * (y + dy) + Math.sin(T * 5 + i * 2) * W * 0.012); g.rotate(Math.sin(T * 3 + i) * 0.15); g.font = `900 ${sz}px "Inter Display"`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = sz * 0.16; g.strokeStyle = '#000'; g.strokeText('?', 0, 0); g.fillStyle = '#FFD60A'; g.fillText('?', 0, 0); g.restore(); }); }
function bolts(g, W, H, T, x, y, n = 4, k = 1) { if (k <= 0) return; g.save(); g.lineJoin = 'round'; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + T * 0.8; const fl = (Math.sin(T * 23 + i * 5) > -0.3) ? 1 : 0; if (!fl) continue; const r0 = W * 0.07, r1 = W * 0.17; g.save(); g.translate(W * x, H * y); g.rotate(a); g.beginPath(); g.moveTo(r0, 0); g.lineTo(r0 + (r1 - r0) * 0.4, -W * 0.02); g.lineTo(r0 + (r1 - r0) * 0.55, W * 0.015); g.lineTo(r1, -W * 0.005); g.strokeStyle = '#000'; g.lineWidth = W * 0.016; g.stroke(); g.strokeStyle = '#FFD60A'; g.lineWidth = W * 0.009; g.stroke(); g.restore(); } g.restore(); }
function scopeRing(g, W, H, k = 1) { const R = W * 0.47 * k + 2; g.save(); g.fillStyle = '#000'; g.beginPath(); g.rect(0, 0, W, H); g.arc(W / 2, H * 0.4, Math.max(2, R), 0, Math.PI * 2, true); g.fill(); const rg = g.createRadialGradient(W / 2, H * 0.4, R * 0.75, W / 2, H * 0.4, R); rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(0,0,0,0.85)'); g.fillStyle = rg; g.beginPath(); g.arc(W / 2, H * 0.4, R, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2; g.beginPath(); g.moveTo(W / 2 - R * 0.9, H * 0.4); g.lineTo(W / 2 + R * 0.9, H * 0.4); g.moveTo(W / 2, H * 0.4 - R * 0.9); g.lineTo(W / 2, H * 0.4 + R * 0.9); g.stroke(); for (let i = -8; i <= 8; i++) { g.beginPath(); g.moveTo(W / 2 + i * R * 0.1, H * 0.4 - 8); g.lineTo(W / 2 + i * R * 0.1, H * 0.4 + 8); g.stroke(); } g.restore(); }
function arrow(col = 0xff7a1a, len = 0.9) { const a = new THREE.Group(); const m = L.mat(col, { r: 0.3, phys: true, cc: 0.8, e: col, ei: 0.25 }); L.mesh(L.cyl(0.06, 0.06, len, 16), m, 0, len / 2 + 0.22, 0, a); const h = L.mesh(new THREE.ConeGeometry(0.16, 0.3, 20), m, 0, 0.15, 0, a); h.rotation.x = Math.PI; return a; }
let SPARK = null; function sparkle(s, col = 0xffffff, size = 0.4) { if (!SPARK) SPARK = L.canvasTex(128, 128, (g, w, h) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.2, 'rgba(255,255,255,0.6)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(62, 4, 4, 120); g.fillRect(4, 62, 120, 4); });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: SPARK, color: col, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending })); sp.scale.setScalar(size); s.add(sp); return sp; }


// ================= VIDEO 04 – Der Hauptmann von Köpenick =================
const VOIGT_CIV = { skin: 0xe9b48c, shirt: 0x6a5a48, sleeve: 0x6a5a48, pants: 0x4a4038, hair: 0xa8a8a8, suit: true, tie: 0x3a2a1a, armSkin: false, shoes: 0x2a1a10 };
const VOIGT_CAP = { skin: 0xe9b48c, shirt: 0x24324e, sleeve: 0x24324e, pants: 0x15151c, hair: 0xa8a8a8, armSkin: false, shoes: 0x0a0a0a, collar: true };
const SOLDIERS = [0xe9b48c, 0xf3c7a8, 0xd9a07a, 0xf0c09a, 0xe2a77f, 0xf6c9a5].map((sk, i) => ({ skin: sk, shirt: 0x2a3a5e, sleeve: 0x2a3a5e, pants: 0x1a1a22, hair: [0x3a2a1a, 0xc9952b, 0x1d1d1d, 0x6a3a1a][i % 4], mustache: i % 2 === 0, armSkin: false, shoes: 0x0a0a0a }));
const MAYOR = { skin: 0xf2b48e, shirt: 0x2a2a2a, sleeve: 0x2a2a2a, pants: 0x2a2a2a, hair: 0xe0e0e0, suit: true, tie: 0x8a1a1a, belly: true, bignose: true, armSkin: false };
const CLERK = [{ skin: 0xf3c7a8, shirt: 0x5a5a5a, sleeve: 0x5a5a5a, pants: 0x3a3a3a, hair: 0x5a3a1a, suit: true, tie: 0x2a2a6a, glasses: true, mustache: false, armSkin: false }, { skin: 0xe2b090, shirt: 0x4a4a3a, sleeve: 0x4a4a3a, pants: 0x3a3a3a, hair: 0x9a9a9a, suit: true, tie: 0x6a1a1a, armSkin: false }];
const KAISER = { skin: 0xf0c8a8, shirt: 0x1d2a44, sleeve: 0x1d2a44, pants: 0x111118, hair: 0x6a4a2a, armSkin: false, mustache: false };
const JUDGE = { skin: 0xe9b48c, shirt: 0x111111, sleeve: 0x111111, pants: 0x111111, hair: 0xdddddd, armSkin: false, glasses: true };
const COPDE = { skin: 0xe2a77f, shirt: 0x1d3a5a, sleeve: 0x1d3a5a, pants: 0x15151c, hair: 0x2a2a2a, mustache: true, armSkin: false, badge: true };
const gold = () => L.mat(0xe0b84a, { m: 0.9, r: 0.25, env: 1.1 });
function pickel(c, g2 = false) { const h = new THREE.Group(); h.position.set(0, 0.2, -0.01); c.head.add(h); const bk = L.mat(0x111114, { r: 0.18, phys: true, cc: 1, env: 1.2 });
  const d = L.mesh(new THREE.SphereGeometry(0.34, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), bk, 0, 0, 0, h); d.scale.set(1, 1.05, 1.05); L.mesh(L.box(0.5, 0.03, 0.2), bk, 0, 0.0, 0.3, h).rotation.x = 0.2; L.mesh(L.box(0.5, 0.03, 0.16), bk, 0, 0.02, -0.3, h).rotation.x = -0.3;
  const m = g2 ? gold() : L.mat(0xd8dde3, { m: 0.9, r: 0.2 }); L.mesh(L.cyl(0.07, 0.09, 0.08, 16), m, 0, 0.36, 0, h); L.mesh(new THREE.ConeGeometry(0.045, 0.24, 12), m, 0, 0.52, 0, h); const pl = L.mesh(L.sph(0.11, 16), gold(), 0, 0.17, 0.3, h); pl.scale.set(1, 1.2, 0.25); return h; }
function schirm(c) { const h = new THREE.Group(); h.position.set(0, 0.25, 0); h.rotation.x = -0.08; c.head.add(h); const bl = L.mat(0x1d2a44, { fab: true, r: 0.8 });
  L.mesh(L.cyl(0.38, 0.31, 0.14, 32), bl, 0, 0.1, 0, h); L.mesh(L.cyl(0.315, 0.315, 0.06, 32), L.mat(0xb3202a, { fab: true }), 0, 0.02, 0, h); const v = L.mesh(L.box(0.42, 0.025, 0.2), L.mat(0x0a0a0a, { r: 0.2, phys: true, cc: 1 }), 0, -0.02, 0.32, h); v.rotation.x = 0.3; L.mesh(L.sph(0.035, 12), gold(), 0, 0.05, 0.32, h); return h; }
function uniformTrim(c, o = {}) { const g = c.g; const gm = gold(); L.mesh(L.cyl(0.13, 0.15, 0.09), L.mat(o.collar ?? 0xb3202a, { fab: true }), 0, 1.31, 0, g);
  for (let i = 0; i < 6; i++) for (const sx of [-1, 1]) L.mesh(L.sph(0.018, 10), gm, sx * 0.07, 1.22 - i * 0.07, 0.205, g);
  L.mesh(L.cyl(0.27, 0.27, 0.06, 24), L.mat(o.belt ?? 0x6a6a6a, { m: 0.6, r: 0.4 }), 0, 0.84, 0, g).scale.set(1, 1, 0.8);
  if (o.epaul !== false) for (const sx of [-1, 1]) { const e = L.mesh(L.box(0.16, 0.03, 0.14), gm, sx * 0.26, 1.33, 0, g); e.rotation.z = sx * -0.25; for (let i = 0; i < 4; i++) L.mesh(L.cyl(0.012, 0.012, 0.06, 6), gm, sx * (0.32 + 0.0), 1.29, -0.05 + i * 0.035, g); }
  if (o.sabre) { const sb = new THREE.Group(); sb.position.set(-0.27, 0.8, 0.05); sb.rotation.set(0.15, 0, -0.35); g.add(sb); L.mesh(L.box(0.035, 0.9, 0.06), L.mat(0xd8dde3, { m: 0.9, r: 0.2 }), 0, -0.45, 0, sb); L.mesh(new THREE.TorusGeometry(0.06, 0.012, 8, 16, Math.PI), gm, 0, 0.02, 0, sb); }
}
function voigt(s, cap = true, x = 0, y = 0, z = 0, ry = 0) { const c = guy(s, cap ? VOIGT_CAP : VOIGT_CIV, x, y, z, ry); if (cap) { uniformTrim(c, { sabre: true }); c.hat = schirm(c); } else c.hat = L.flatCap(c.head, 0x4a4a3a);
  for (const sx of [-1, 1]) { const m = L.mesh(L.cap(0.045, 0.14), L.mat(0xb8b8b8, { r: 0.9, fab: true }), sx * 0.09, -0.12, 0.31, c.face); m.rotation.z = Math.PI / 2 + sx * 0.25; } return c; }
function soldier(s, i, x, z, ry = 0, rifle = true) { const c = guy(s, SOLDIERS[i % 6], x, 0, z, ry); uniformTrim(c, { epaul: false, collar: 0xb3202a, belt: 0x111111 }); pickel(c); if (rifle) { const r = new THREE.Group(); L.mesh(L.cyl(0.02, 0.02, 1.1, 8), L.mat(0x2b2b2b, { m: 0.8, r: 0.3 }), 0, 0.3, 0, r); L.mesh(L.box(0.07, 0.6, 0.1), L.mat(0x6a3a1a, { r: 0.5 }), 0, -0.3, 0, r); c.arms[1].hand.add(r); r.position.set(0, 0.1, 0.05); c.rifle = r; } return c; }
function shoulderArms(c) { c.arms[1].sh.rotation.set(-0.35, 0, 0.25); c.arms[1].el.rotation.x = -1.6; if (c.rifle) c.rifle.rotation.set(1.6, 0, 0.3); }
function salute(c, k = 1) { c.arms[1].sh.rotation.set(-1.0 * k, 0, (0.15 + 1.45 * k)); c.arms[1].el.rotation.set(0, 0, 1.9 * k); }
function brickTex(rep = 6) { return L.canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#d9cbb3'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 16) for (let x = -(y / 16 % 2) * 16; x < w; x += 32) { g.fillStyle = ['#a8432f', '#b54a33', '#9a3b2a', '#bd5a3e'][Math.floor(Math.random() * 4)]; g.fillRect(x + 1, y + 1, 30, 14); } }, rep); }
function flagImp(w = 1.2) { const t = L.canvasTex(96, 64, (g, W, H) => { g.fillStyle = '#111'; g.fillRect(0, 0, W, H / 3); g.fillStyle = '#fff'; g.fillRect(0, H / 3, W, H / 3); g.fillStyle = '#d11'; g.fillRect(0, 2 * H / 3, W, H / 3); }); const f = new THREE.Group(); L.mesh(L.cyl(0.03, 0.03, 2.4), L.mat(0xe0e0e0, { m: 0.6 }), 0, 1.2, 0, f); const fl = L.mesh(new THREE.PlaneGeometry(w, w * 0.66, 12, 4), new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, roughness: 0.8 }), w / 2, 2.1, 0, f); f.userData.fl = fl; L.tick((t) => { const p = fl.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, Math.sin(x * 4 - t * 6) * 0.06 * (x + w / 2)); } p.needsUpdate = true; }); return f; }
function berlinStreet(s, o = {}) {
  s.background = L.skyTex(o.top ?? '#5b8fcf', o.mid ?? '#b2cde8', o.bot ?? '#ece4d6'); s.fog = new THREE.Fog(o.fog ?? 0xe4ded4, 30, 260);
  const gr = L.mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ map: L.cobbleTex(), roughness: 0.8, envMapIntensity: 0.5 }), 0, 0, 0, s); gr.rotation.x = -Math.PI / 2; gr.castShadow = false;
  L.mesh(L.box(200, 0.18, 4), L.mat(0xb0aba0, { r: 0.8 }), 0, 0.09, -6, s); L.reseed(o.seed ?? 8);
  const tints = [0xf0e6d0, 0xe0d4bc, 0xd8c9a8, 0xe9dcc4, 0xcfd4d8];
  for (let i = -6; i <= 6; i++) { const b = L.makeParisBuilding(10, 13 + ((i + 6) % 3) * 1.6, 8, tints[(i + 6) % 5]); b.position.set(i * 10.2, 0, -12); s.add(b); }
  const signs = [['SCHUHMACHER', '#3a2a1a'], ['BÄCKEREI', '#7a2632'], ['KOLONIALWAREN', '#1d4a2a'], ['APOTHEKE', '#1d2a4a'], ['TRÖDEL', '#4a2a1a'], ['TABAK', '#2a2a2a']];
  [-3, -2, -1, 1, 2, 3].forEach((i, k) => { const sg = L.shopSign(signs[k][0], signs[k][1], '#e9c76a'); sg.position.set(i * 10.2, 2.75, -7.93); s.add(sg); });
  for (let i = -5; i <= 5; i += 2) { const lp = L.makeStreetLamp(); lp.position.set(i * 5 + 2.5, 0, -4.5); s.add(lp); if (o.night) { const pl = new THREE.PointLight(0xffc27a, 18, 14); pl.position.set(i * 5 + 2.5, 4.2, -4.3); s.add(pl); lp.userData.lamp.material = L.mat(0xfff2c0, { e: 0xffc060, ei: 3 }); } }
  for (const x of [-15, 15, -35, 35]) { const t = L.makeTree(0.9); t.position.set(x, 0, -5.8); s.add(t); }
  for (const x of [-20.4, 0, 20.4]) { const f = flagImp(); f.position.set(x + 2, 8, -7.9); f.rotation.z = -0.5; s.add(f); }
  s.add(L.makeBirds(6, V(-10, 18, -30))); for (let i = 0; i < 5; i++) { const c = L.makeCloud(7 + L.RNG() * 5); c.position.set(-150 + i * 70, 70 + L.RNG() * 20, -300); s.add(c); }
  const r = lights(s, { sky: o.sky ?? 0xdfe9f7, ground: 0x8a7a66, hi: o.hi ?? 1.1, si: o.si ?? 2.5, dir: o.dir ?? [8, 11, 7], sun: o.sun, sunCol: o.sunCol, target: o.target ?? V(0, 1, -2), sunSprite: !o.night, sr: o.sr ?? 6 });
  if (o.night) s.environment = null; return r;
}
function rathausExt(s, o = {}) {
  s.background = L.skyTex(o.top ?? '#4f8fd6', o.mid ?? '#a9cdef', o.bot ?? '#f3e6cf'); s.fog = new THREE.Fog(o.fog ?? 0xe9e2d4, 40, 300);
  const gr = L.mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ map: L.cobbleTex(), roughness: 0.8, envMapIntensity: 0.5 }), 0, 0, 0, s); gr.rotation.x = -Math.PI / 2; gr.castShadow = false;
  const bm = new THREE.MeshStandardMaterial({ map: brickTex(8), roughness: 0.85, envMapIntensity: 0.4 }); const z0 = -14;
  L.mesh(L.box(28, 12, 10), bm, 0, 6, z0 - 5, s); L.mesh(L.box(28.6, 0.6, 10.6), L.mat(0xe6dcc8, { r: 0.7 }), 0, 12.2, z0 - 5, s);
  const roof = L.mesh(new THREE.CylinderGeometry(0.1, 7.5, 5, 4, 1), L.mat(0x4a5560, { r: 0.6, m: 0.3 }), 0, 15, z0 - 5, s); roof.scale.set(2.6, 1, 0.95); roof.rotation.y = Math.PI / 4;
  const tm = new THREE.MeshStandardMaterial({ map: brickTex(3), roughness: 0.85 }); L.mesh(L.box(5, 26, 5), tm, 0, 13, z0 + 0.5, s); L.mesh(new THREE.ConeGeometry(3.8, 7, 4), L.mat(0x3f6a5a, { r: 0.5, m: 0.4 }), 0, 29.5, z0 + 0.5, s).rotation.y = Math.PI / 4;
  const clk = L.mesh(new THREE.CircleGeometry(1.4, 40), L.mat(0xf6f0e0, { r: 0.4 }), 0, 21, z0 + 3.02, s); for (const [l, a] of [[0.9, 0.3], [1.2, 2.2]]) { const hnd = L.mesh(L.box(0.1, l, 0.05), L.mat(0x111111), 0, 21, z0 + 3.06, s); hnd.geometry.translate(0, l / 2, 0); hnd.rotation.z = a; }
  const wm = L.mat(0x2a3a5a, { r: 0.15, phys: true, cc: 1, env: 1.3 }), fm = L.mat(0xf2ead8, { r: 0.6 });
  for (let r = 0; r < 3; r++) for (let i = -6; i <= 6; i++) { if (Math.abs(i) <= 1) continue; const x = i * 2, y = 2.6 + r * 3.4; L.mesh(L.box(1.0, 1.9, 0.1), wm, x, y, z0 + 0.03, s); L.mesh(L.box(1.25, 0.18, 0.2), fm, x, y + 1.05, z0 + 0.05, s); L.mesh(L.box(1.2, 0.12, 0.25), fm, x, y - 1.0, z0 + 0.08, s); }
  for (let r = 0; r < 2; r++) L.mesh(L.box(1.2, 2.2, 0.1), wm, 0, 13 + r * 4, z0 + 3.02, s);
  const door = L.mesh(L.box(2.6, 3.6, 0.2), L.mat(0x4a2a16, { r: 0.5 }), 0, 1.8, z0 + 3.0, s); const arch = L.mesh(new THREE.TorusGeometry(1.5, 0.25, 8, 24, Math.PI), fm, 0, 3.6, z0 + 3.05, s); s.userData.door = door;
  for (let i = 0; i < 3; i++) L.mesh(L.box(6 - i, 0.2, 1.2), L.mat(0xcfc6b4, { r: 0.8 }), 0, 0.1 + i * 0.2, z0 + 3.6 - i * 0.35, s);
  const sign = L.mesh(new THREE.PlaneGeometry(4, 0.8), new THREE.MeshStandardMaterial({ map: L.canvasTex(512, 100, (g, w, h) => { g.fillStyle = '#2a1a10'; g.fillRect(0, 0, w, h); g.fillStyle = '#e9c76a'; g.font = '900 64px Inter Display'; g.textAlign = 'center'; g.fillText('RATHAUS', w / 2, 74); }), roughness: 0.5 }), 0, 5.0, z0 + 3.05, s);
  for (const x of [-6, 6]) { const f = flagImp(1.4); f.position.set(x, 12.4, z0 + 0.2); s.add(f); }
  for (const x of [-10, 10]) { const t = L.makeTree(1.1); t.position.set(x, 0, z0 + 6); s.add(t); } for (const x of [-4.5, 4.5]) { const lp = L.makeStreetLamp(); lp.position.set(x, 0, z0 + 5); s.add(lp); }
  s.add(L.makeBirds(5, V(-8, 24, -30))); L.reseed(3); for (let i = 0; i < 5; i++) { const c = L.makeCloud(7 + L.RNG() * 5); c.position.set(-150 + i * 70, 70 + L.RNG() * 20, -300); s.add(c); }
  lights(s, { sky: 0xdfe9f7, ground: 0x8a7a66, hi: o.hi ?? 1.1, si: o.si ?? 2.6, dir: o.dir ?? [8, 12, 9], sun: o.sun, sunCol: o.sunCol, target: V(0, 2, -8), sr: 16 });
}
function amt(s, o = {}) {
  s.background = new THREE.Color(0x1a1a14); if (ENV) s.environment = ENV;
  const wt = L.canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#d9cfae'; g.fillRect(0, 0, w, h); g.fillStyle = '#4a5a3a'; g.fillRect(0, h * 0.62, w, h * 0.38); g.fillStyle = 'rgba(0,0,0,0.15)'; for (let x = 0; x < w; x += 64) g.fillRect(x, h * 0.62, 3, h); g.fillStyle = '#3a2a1a'; g.fillRect(0, h * 0.6, w, 8); });
  const room = L.mesh(L.box(12, 4.5, 10), new THREE.MeshStandardMaterial({ map: wt, roughness: 0.85, side: THREE.BackSide, envMapIntensity: 0.3 }), 0, 2.25, 0, s); room.castShadow = false;
  const fl = L.mesh(new THREE.PlaneGeometry(12, 10), new THREE.MeshStandardMaterial({ map: L.parquetTex(), roughness: 0.4, envMapIntensity: 0.6 }), 0, 0.01, 0, s); fl.rotation.x = -Math.PI / 2;
  const win = L.mesh(new THREE.PlaneGeometry(2, 2.4), new THREE.MeshBasicMaterial({ map: L.skyTex('#5b8fcf', '#b2cde8', '#ece4d6') }), 3.2, 2.6, -4.98, s); win.castShadow = false; for (const y of [1.4, 3.8]) L.mesh(L.box(2.2, 0.1, 0.1), L.mat(0xf2ead8), 3.2, y, -4.95, s); L.mesh(L.box(0.08, 2.4, 0.1), L.mat(0xf2ead8), 3.2, 2.6, -4.95, s);
  const por = L.mesh(new THREE.PlaneGeometry(1.0, 1.3), new THREE.MeshStandardMaterial({ map: L.canvasTex(200, 260, (g, w, h) => { g.fillStyle = '#5a4a3a'; g.fillRect(0, 0, w, h); g.fillStyle = '#1d2a44'; g.beginPath(); g.ellipse(w / 2, h * 0.95, 80, 90, 0, 0, 7); g.fill(); g.fillStyle = '#f0c8a8'; g.beginPath(); g.arc(w / 2, h * 0.45, 45, 0, 7); g.fill(); g.strokeStyle = '#5a3a1a'; g.lineWidth = 8; g.beginPath(); g.moveTo(w / 2 - 35, h * 0.5); g.quadraticCurveTo(w / 2 - 10, h * 0.55, w / 2 - 40, h * 0.38); g.moveTo(w / 2 + 35, h * 0.5); g.quadraticCurveTo(w / 2 + 10, h * 0.55, w / 2 + 40, h * 0.38); g.stroke(); g.fillStyle = '#111'; g.beginPath(); g.arc(w / 2, h * 0.27, 40, Math.PI, 0); g.fill(); g.fillStyle = '#e0b84a'; g.fillRect(w / 2 - 4, h * 0.08, 8, 30); }), roughness: 0.6 }), -1.5, 2.9, -4.98, s);
  L.mesh(L.box(1.15, 1.45, 0.05), gold(), -1.5, 2.9, -5.0, s);
  const desk = new THREE.Group(); desk.position.set(0, 0, -1.6); s.add(desk); const wd = L.mat(0x5a3a22, { r: 0.45, phys: true, cc: 0.3 }); L.mesh(L.box(2.6, 0.08, 1.1), wd, 0, 0.82, 0, desk); L.mesh(L.box(2.5, 0.78, 1.0), L.mat(0x4a2e1a, { r: 0.5 }), 0, 0.39, 0, desk);
  for (let i = 0; i < 5; i++) L.mesh(L.box(0.4, 0.008, 0.55), L.mat(0xf6f1e4), -0.7 + Math.sin(i) * 0.02, 0.87 + i * 0.01, 0.1, desk); const ink = L.mesh(L.cyl(0.06, 0.07, 0.08), L.mat(0x111111, { r: 0.2, phys: true, cc: 1 }), 0.8, 0.9, 0.2, desk);
  const stamp = new THREE.Group(); stamp.position.set(0.35, 0.86, 0.15); desk.add(stamp); L.mesh(L.cyl(0.07, 0.07, 0.05), L.mat(0xb3202a), 0, 0.025, 0, stamp); L.mesh(L.cyl(0.025, 0.025, 0.14), L.mat(0x3a2a1a), 0, 0.12, 0, stamp); L.mesh(L.sph(0.05), L.mat(0x3a2a1a), 0, 0.2, 0, stamp); s.userData.stamp = stamp;
  for (let k = 0; k < 2; k++) { const sh = new THREE.Group(); sh.position.set(-4.5 + k * 9, 0, -4.4); s.add(sh); L.mesh(L.box(2, 2.8, 0.6), L.mat(0x4a2e1a), 0, 1.4, 0, sh); for (let r = 0; r < 4; r++) for (let i = 0; i < 8; i++) L.mesh(L.box(0.18, 0.5, 0.45), L.mat([0xc9a24a, 0x8a3a2a, 0x3a5a7a, 0xd9cfae][(i + r) % 4], { r: 0.8 }), -0.75 + i * 0.21, 0.4 + r * 0.65, 0.1, sh); }
  const clk = L.mesh(new THREE.CircleGeometry(0.35, 32), L.mat(0xf6f0e0), 1.2, 3.3, -4.97, s); L.mesh(new THREE.TorusGeometry(0.35, 0.04, 8, 32), gold(), 1.2, 3.3, -4.96, s);
  const pl = new THREE.PointLight(0xffd9a0, 8, 7); pl.position.set(0, 3.5, -1); s.add(pl);
  lights(s, { sky: 0xfff0dc, ground: 0x5a4a30, hi: 1.0, si: 2.0, dir: [4, 7, 3], sunSprite: false, sr: 5, target: V(0, 1, -1.5) });
  return { desk, stamp };
}
function shop(s) {
  s.background = new THREE.Color(0x1a120c); if (ENV) s.environment = ENV;
  const room = L.mesh(L.box(9, 4, 8), L.mat(0x7a5434, { r: 0.8, fab: true }), 0, 2, 0, s); room.material = room.material.clone(); room.material.side = THREE.BackSide; room.castShadow = false;
  const fl = L.mesh(new THREE.PlaneGeometry(9, 8), new THREE.MeshStandardMaterial({ map: L.parquetTex(), roughness: 0.5 }), 0, 0.01, 0, s); fl.rotation.x = -Math.PI / 2;
  const wd = L.mat(0x5a3a22, { r: 0.5 }); L.mesh(L.box(3.2, 1.0, 0.8), wd, -1.6, 0.5, -1.2, s);
  for (let k = 0; k < 3; k++) { L.mesh(L.box(3, 0.06, 0.5), wd, 2.2, 0.8 + k * 0.8, -3.7, s); for (let i = 0; i < 6; i++) { const t = i % 3; const p = t === 0 ? L.mesh(L.cyl(0.12, 0.15, 0.3), L.mat([0xb87333, 0x6a8a9a, 0xc9a24a][k], { m: 0.7, r: 0.3 }), 0.9 + i * 0.5, 0.98 + k * 0.8, -3.7, s) : t === 1 ? L.mesh(L.box(0.3, 0.25, 0.3), L.mat(0x8a6a3a, { r: 0.8 }), 0.9 + i * 0.5, 0.96 + k * 0.8, -3.7, s) : L.mesh(L.sph(0.13), L.mat(0xd8dde3, { m: 0.8, r: 0.3 }), 0.9 + i * 0.5, 0.96 + k * 0.8, -3.7, s); } }
  L.mesh(L.cyl(0.03, 0.03, 3.2), L.mat(0x888888, { m: 0.8 }), -2.6, 1.9, -3.2, s).rotation.z = Math.PI / 2; for (let i = 0; i < 5; i++) { const j = L.mesh(L.box(0.5, 0.8, 0.12), L.mat([0x6a4a32, 0x3a4a3a, 0x5a2a2a, 0x2a2a3a, 0x7a6a4a][i], { fab: true, r: 0.9 }), -3.9 + i * 0.6, 1.4, -3.2, s); j.rotation.y = 0.3; }
  const uni = new THREE.Group(); uni.position.set(1.6, 0, -2.2); s.add(uni); L.mesh(L.cyl(0.03, 0.04, 1.2), L.mat(0x3a2a1a), 0, 0.6, 0, uni); const tor = L.mesh(L.cap(0.26, 0.42), L.mat(0x24324e, { fab: true, r: 0.85 }), 0, 1.45, 0, uni); tor.scale.set(1, 1, 0.8);
  for (let i = 0; i < 6; i++) for (const sx of [-1, 1]) L.mesh(L.sph(0.018, 10), gold(), sx * 0.07, 1.62 - i * 0.07, 0.205, uni); for (const sx of [-1, 1]) L.mesh(L.box(0.16, 0.03, 0.14), gold(), sx * 0.26, 1.75, 0, uni); L.mesh(L.cyl(0.13, 0.15, 0.09), L.mat(0xb3202a, { fab: true }), 0, 1.73, 0, uni);
  const hat = new THREE.Group(); hat.position.set(0, 1.9, 0); uni.add(hat); L.mesh(L.cyl(0.38, 0.31, 0.14, 32), L.mat(0x1d2a44, { fab: true }), 0, 0.1, 0, hat); L.mesh(L.cyl(0.315, 0.315, 0.06, 32), L.mat(0xb3202a), 0, 0.02, 0, hat); L.mesh(L.box(0.42, 0.025, 0.2), L.mat(0x0a0a0a, { r: 0.2 }), 0, -0.02, 0.32, hat).rotation.x = 0.3;
  const tag = L.mesh(new THREE.PlaneGeometry(0.4, 0.22), new THREE.MeshStandardMaterial({ map: L.canvasTex(160, 90, (g, w, h) => { g.fillStyle = '#f1ead8'; g.fillRect(0, 0, w, h); g.fillStyle = '#b3202a'; g.font = '900 36px Inter Display'; g.textAlign = 'center'; g.fillText('BILLIG!', w / 2, 58); }), side: THREE.DoubleSide }), 0.35, 1.2, 0.25, uni); tag.rotation.z = -0.2;
  const pl = new THREE.PointLight(0xffc880, 10, 8); pl.position.set(0, 3.4, 0); s.add(pl); L.mesh(L.sph(0.12), L.mat(0xffffff, { e: 0xffd9a0, ei: 3 }), 0, 3.5, 0, s);
  lights(s, { sky: 0xffe2c0, ground: 0x4a2a1a, hi: 0.9, si: 1.6, dir: [3, 8, 4], sun: 0xffe0b0, sunSprite: false, sr: 5, target: V(0, 1, -1.5) });
  return { uni };
}
function trainScene(s) {
  s.background = L.skyTex('#4b8fd6', '#a9cdef', '#f3e6cf'); s.fog = new THREE.Fog(0xe9e2d4, 40, 300);
  const gr = L.mesh(new THREE.PlaneGeometry(800, 800), new THREE.MeshStandardMaterial({ map: L.grassTex(), roughness: 1 }), 0, 0, 0, s); gr.rotation.x = -Math.PI / 2;
  for (const z of [-0.9, 0.9]) L.mesh(L.box(400, 0.1, 0.12), L.mat(0x777777, { m: 0.8 }), 0, 0.12, z * 1.2, s); for (let i = -60; i < 60; i++) L.mesh(L.box(0.3, 0.08, 3.4), 0x4a3020, i * 1.2, 0.05, 0, s);
  L.reseed(6); for (let i = 0; i < 30; i++) { const t = L.makeTree(1 + L.RNG()); t.position.set(-120 + L.RNG() * 240, 0, -15 - L.RNG() * 60); s.add(t); }
  const tr = L.makeTrain(); s.add(tr); const st = L.makeSteam(); s.add(st);
  const cars = []; for (let i = 0; i < 2; i++) { const c = new THREE.Group(); L.mesh(L.box(6, 2.6, 2.6), L.mat(0x2a4a2a, { r: 0.5, phys: true, cc: 0.4 }), 0, 2.3, 0, c); L.mesh(L.box(6.2, 0.2, 2.8), L.mat(0x222222), 0, 3.7, 0, c); for (let k = 0; k < 4; k++) L.mesh(L.box(0.8, 0.8, 2.62), L.mat(0xf6e8c0, { e: 0x6a5a3a, ei: 0.4 }), -2.1 + k * 1.4, 2.6, 0, c); for (const x of [-2, 2]) for (const z of [-1.1, 1.1]) { const w = L.mesh(L.cyl(0.55, 0.55, 0.2, 16), L.mat(0x8a1d22), x, 0.6, z, c); w.rotation.x = Math.PI / 2; } s.add(c); cars.push(c); }
  lights(s, { target: V(0, 1, 0), sr: 20 }); return { tr, st, cars };
}
function cellRoom(s) { s.background = new THREE.Color(0x14171a); if (ENV) s.environment = ENV; const room = L.mesh(L.box(5, 3.4, 5), L.mat(0x8a8f94, { r: 0.95, fab: true }), 0, 1.7, 0, s); room.material = room.material.clone(); room.material.side = THREE.BackSide; room.castShadow = false; s.add(new THREE.HemisphereLight(0xa0b0c0, 0x202020, 0.6)); const w = new THREE.SpotLight(0xdfe8ff, 30, 10, 0.5, 0.6); w.position.set(0, 3, -3); w.target.position.set(0, 1, 1.2); w.castShadow = true; s.add(w); s.add(w.target); }
function prisonGate(s, o = {}) {
  s.background = L.skyTex(o.top ?? '#6b8fb8', o.mid ?? '#b9cbe0', o.bot ?? '#e9e4da'); s.fog = new THREE.Fog(0xe0dcd4, 30, 200);
  const gr = L.mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ map: L.cobbleTex(), roughness: 0.85 }), 0, 0, 0, s); gr.rotation.x = -Math.PI / 2; gr.castShadow = false;
  const bm = new THREE.MeshStandardMaterial({ map: brickTex(10), roughness: 0.9, color: 0xc0b0a0 }); L.mesh(L.box(40, 6, 1.2), bm, 0, 3, -6, s); L.mesh(L.box(6, 8, 2), bm, 0, 4, -6, s);
  const gate = new THREE.Group(); gate.position.set(-1.6, 0, -4.9); s.add(gate); const gm = L.mat(0x2a2d30, { m: 0.8, r: 0.35 }); for (let i = 0; i < 9; i++) L.mesh(L.cyl(0.04, 0.04, 4.2, 8), gm, 0.18 + i * 0.36, 2.1, 0, gate); for (const y of [0.3, 2.1, 4.0]) L.mesh(L.box(3.3, 0.12, 0.08), gm, 1.6, y, 0, gate);
  L.mesh(L.box(3.4, 4.4, 0.3), L.mat(0x111111), 0, 2.2, -5.2, s); const sg = L.mesh(new THREE.PlaneGeometry(3.6, 0.6), new THREE.MeshStandardMaterial({ map: L.canvasTex(512, 86, (g, w, h) => { g.fillStyle = '#2a2a2a'; g.fillRect(0, 0, w, h); g.fillStyle = '#e9e4da'; g.font = '900 54px Inter Display'; g.textAlign = 'center'; g.fillText('GEFÄNGNIS', w / 2, 64); }) }), 0, 5.2, -4.95, s);
  lights(s, { sky: 0xdfe9f7, ground: 0x7a7a70, hi: 1.1, si: o.si ?? 2.4, dir: [6, 10, 8], target: V(0, 1, -3), sr: 8, sun: o.sun, sunCol: o.sunCol });
  return { gate };
}
function courtRoom(s) {
  s.background = new THREE.Color(0x140e0a); if (ENV) s.environment = ENV;
  const room = L.mesh(L.box(12, 5, 10), L.mat(0x6a4a2e, { r: 0.7, fab: true }), 0, 2.5, 0, s); room.material = room.material.clone(); room.material.side = THREE.BackSide; room.castShadow = false;
  const fl = L.mesh(new THREE.PlaneGeometry(12, 10), new THREE.MeshStandardMaterial({ map: L.parquetTex(), roughness: 0.4 }), 0, 0.01, 0, s); fl.rotation.x = -Math.PI / 2;
  const wd = L.mat(0x4a2a16, { r: 0.45, phys: true, cc: 0.3 }); L.mesh(L.box(5, 0.5, 2), wd, 0, 0.25, -3, s); L.mesh(L.box(4.4, 1.3, 0.6), wd, 0, 1.15, -2.2, s); L.mesh(L.box(4.6, 0.08, 0.8), L.mat(0x3a1e10), 0, 1.84, -2.2, s);
  const eagle = L.mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshStandardMaterial({ map: L.canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#e0b84a'; g.beginPath(); g.arc(w / 2, h / 2, 120, 0, 7); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.moveTo(w / 2, 40); g.lineTo(w / 2 + 90, 110); g.lineTo(w / 2 + 40, 200); g.lineTo(w / 2, 170); g.lineTo(w / 2 - 40, 200); g.lineTo(w / 2 - 90, 110); g.closePath(); g.fill(); }), transparent: true }), 0, 3.7, -4.95, s);
  const pl = new THREE.PointLight(0xffd9a0, 10, 9); pl.position.set(0, 4, 0); s.add(pl);
  lights(s, { sky: 0xfff0dc, ground: 0x4a3020, hi: 0.9, si: 1.8, dir: [3, 8, 5], sunSprite: false, sr: 5, target: V(0, 1, -1.5) });
}
function kaiser(s, x, z, ry) { const c = guy(s, KAISER, x, 0, z, ry); uniformTrim(c, { belt: 0xe0b84a }); pickel(c, true); for (const sx of [-1, 1]) { const m = L.mesh(L.cap(0.035, 0.16), L.mat(0x6a4a2a, { r: 0.8, fab: true }), sx * 0.1, -0.1, 0.31, c.face); m.rotation.z = sx * 0.55; } const sash = L.mesh(L.box(0.06, 0.62, 0.02), L.mat(0xe8a020), 0.0, 1.05, 0.215, c.g); sash.rotation.z = 0.6; return c; }
function ringLoop(g, W, H, T, k) { if (k <= 0) return; const cx = W / 2, cy = H * 0.24, R = W * 0.2; g.save(); g.globalAlpha = clamp(k * 3); g.lineWidth = W * 0.018; g.strokeStyle = '#FFD60A'; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke(); const a = T * 3;
  for (const [ang, txt, col] of [[a, 'PASS', '#2a8fd6'], [a + Math.PI, 'ARBEIT', '#e8202a']]) chip(g, W, H, txt, col, cx + Math.cos(ang) * R, cy + Math.sin(ang) * R, k * 2, 0.05);
  for (const ang of [a + Math.PI / 2, a - Math.PI / 2]) { g.save(); g.translate(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R); g.rotate(ang + Math.PI / 2); g.fillStyle = '#FFD60A'; g.beginPath(); g.moveTo(W * 0.03, 0); g.lineTo(-W * 0.02, -W * 0.025); g.lineTo(-W * 0.02, W * 0.025); g.fill(); g.restore(); } g.restore(); }
function bubble(g, W, H, txt, t, x = 0.68, y = 0.3, col = '#111') { const k = clamp(t * 5); if (k <= 0) return; g.save(); g.translate(W * x, H * y); g.rotate(-0.1); g.scale(backOut(k), backOut(k)); g.font = `900 ${W * 0.062}px "Inter Display"`; const tw = g.measureText(txt).width; const bw = tw + W * 0.1; g.fillStyle = '#fff'; g.strokeStyle = '#111'; g.lineWidth = W * 0.008; g.beginPath(); g.roundRect(-bw / 2, -W * 0.08, bw, W * 0.16, W * 0.05); g.fill(); g.stroke(); g.beginPath(); g.moveTo(-W * 0.08, W * 0.08); g.lineTo(-W * 0.14, W * 0.17); g.lineTo(-W * 0.02, W * 0.08); g.fill(); g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 0, 4); g.restore(); }
function squad(s, n, x0, z0, dx = 0.9, dz = 0, ry = 0, rifle = true) { const a = []; for (let i = 0; i < n; i++) { const c = soldier(s, i, x0 + i * dx, z0 + i * dz + (i % 2) * 0.25, ry, rifle); c.pose('stand'); a.push(c); } return a; }

// ================= VIDEO 05 – Der Emu-Krieg (Australien 1932) =================
const KHAKI = 0x8f8355;
const FARMER = { skin: 0xe2a77f, shirt: 0x5f86b3, sleeve: 0x5f86b3, pants: 0x5a4a3a, hair: 0x6a4a2a, mustache: true, shoes: 0x3a2a1a };
const MEREDITH = { skin: 0xf0c09a, shirt: KHAKI, sleeve: KHAKI, pants: 0x7a6f48, hair: 0x5a3a1a, mustache: true, armSkin: false, shoes: 0x3a2210 };
const DIGGERS = [{ skin: 0xe9b48c, shirt: KHAKI, sleeve: KHAKI, pants: 0x7a6f48, hair: 0xc9952b, mustache: false, armSkin: false, shoes: 0x3a2210 },
  { skin: 0xd9a07a, shirt: KHAKI, sleeve: KHAKI, pants: 0x7a6f48, hair: 0x2a1a10, mustache: true, armSkin: false, shoes: 0x3a2210 }];
const MINISTER = { skin: 0xf2b48e, shirt: 0x34363d, sleeve: 0x34363d, pants: 0x34363d, hair: 0xd0d0d0, suit: true, tie: 0x1d3a7a, glasses: true, armSkin: false };
const DIRT = 0xc9733f;
function slouchHat(par, col = 0x7a6040, y = 0.24, sc = 1) {
  const h = new THREE.Group(); h.position.set(0, y, -0.01); h.scale.setScalar(sc); par.add(h); const m = L.mat(col, { fab: true, r: 0.9, ds: true });
  const br = L.mesh(new THREE.RingGeometry(0.26, 0.52, 40, 1, 5 * Math.PI / 4, 3 * Math.PI / 2), m, 0, 0, 0, h); br.rotation.x = -Math.PI / 2;
  const up = new THREE.Group(); up.position.set(-0.27, 0, 0); up.rotation.z = -1.3; h.add(up); const gl = new THREE.RingGeometry(0.26, 0.52, 12, 1, 3 * Math.PI / 4, Math.PI / 2); gl.rotateX(-Math.PI / 2); gl.translate(0.27, 0, 0); L.mesh(gl, m, 0, 0, 0, up);
  L.mesh(L.sph(0.05, 12), gold(), -0.1, 0, 0, up).scale.set(1, 0.3, 1);
  const cr = L.mesh(L.cyl(0.27, 0.32, 0.28, 32), L.mat(col, { fab: true, r: 0.9 }), 0, 0.13, 0, h); L.mesh(L.cyl(0.325, 0.325, 0.07, 32), L.mat(0x3a2a1a, { fab: true }), 0, 0.04, 0, h);
  const dn = L.mesh(L.box(0.06, 0.05, 0.4), L.mat(new THREE.Color(col).multiplyScalar(0.7).getHex()), 0, 0.27, 0, h); return h; }
function officerCap(c) { const h = new THREE.Group(); h.position.set(0, 0.25, 0); h.rotation.x = -0.08; c.head.add(h); const km = L.mat(KHAKI, { fab: true, r: 0.8 });
  L.mesh(L.cyl(0.38, 0.31, 0.15, 32), km, 0, 0.1, 0, h); L.mesh(L.cyl(0.315, 0.315, 0.07, 32), L.mat(0xb3202a, { fab: true }), 0, 0.02, 0, h); const v = L.mesh(L.box(0.42, 0.025, 0.2), L.mat(0x3a2210, { r: 0.25, phys: true, cc: 1 }), 0, -0.02, 0.32, h); v.rotation.x = 0.3; L.mesh(L.sph(0.04, 12), gold(), 0, 0.08, 0.33, h); return h; }
function samBrowne(c) { const b = L.mat(0x5a3218, { r: 0.4, phys: true, cc: 0.5 }); const st = L.mesh(L.box(0.05, 0.7, 0.02), b, 0, 1.03, 0.22, c.g); st.rotation.z = 0.55; L.mesh(L.cyl(0.262, 0.262, 0.07), b, 0, 0.8, 0, c.g).scale.z = 0.82; for (const sx of [-1, 1]) { L.mesh(L.box(0.1, 0.1, 0.012), L.mat(0x7a6f48), sx * 0.12, 1.15, 0.212, c.g); L.mesh(L.sph(0.014, 8), gold(), sx * 0.12, 1.19, 0.22, c.g); } }
function digger(s, i, x, z, ry = 0) { const c = guy(s, DIGGERS[i % 2], x, 0, z, ry); c.hat = slouchHat(c.head, 0x8a7048); samBrowne(c); return c; }
function meredith(s, x, z, ry = 0) { const c = guy(s, MEREDITH, x, 0, z, ry); c.hat = officerCap(c); samBrowne(c); for (const sx of [-1, 1]) { const e = L.mesh(L.box(0.16, 0.03, 0.14), gold(), sx * 0.26, 1.33, 0, c.g); e.rotation.z = sx * -0.25; } L.mesh(L.box(0.12, 0.06, 0.02), L.mat(0xb3202a), -0.12, 1.2, 0.215, c.g); return c; }
function farmer(s, x, z, ry = 0) { const c = guy(s, FARMER, x, 0, z, ry); c.hat = slouchHat(c.head, 0x6a5038); return c; }
// ---- Emu
const EMUBODY = [0x5a4a3c, 0x4e4034, 0x63523f];
function makeEmu(o = {}) {
  const g = new THREE.Group(); const fm = L.mat(o.col ?? EMUBODY[0], { r: 0.95, fab: true }), fm2 = L.mat(o.col2 ?? 0x43372c, { r: 0.95, fab: true });
  const skin = L.mat(0x7d8fa8, { r: 0.55, phys: true, sheen: 0.4 }), legM = L.mat(0x6b6a66, { r: 0.6 }), dark = L.mat(0x2e2a28, { r: 0.4 });
  const body = new THREE.Group(); body.position.y = 1.2; g.add(body);
  const b = L.mesh(L.sph(0.5, 32), fm, 0, 0, 0, body); b.scale.set(0.85, 0.78, 1.15);
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; const tf = L.mesh(new THREE.ConeGeometry(0.13, 0.42, 7), i % 2 ? fm : fm2, Math.cos(a) * 0.36, -0.22, Math.sin(a) * 0.45 - 0.05, body); tf.rotation.set(Math.PI + Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); }
  const tail = L.mesh(L.sph(0.3, 20), fm2, 0, -0.08, -0.5, body); tail.scale.set(0.8, 0.9, 0.9);
  for (let i = 0; i < 5; i++) { const tf = L.mesh(new THREE.ConeGeometry(0.1, 0.35, 6), fm2, -0.2 + i * 0.1, -0.15, -0.62, body); tf.rotation.set(Math.PI - 0.7, 0, (i - 2) * 0.15); }
  const neck = new THREE.Group(); neck.position.set(0, 0.22, 0.42); neck.rotation.x = 0.15; body.add(neck);
  L.mesh(L.cap(0.13, 0.22), fm, 0, 0.12, 0, neck);
  const nk = L.mesh(L.cap(0.075, 0.6), skin, 0, 0.45, 0, neck);
  const head = new THREE.Group(); head.position.set(0, 0.82, 0.04); neck.add(head);
  const hd = L.mesh(L.sph(0.15, 28), skin, 0, 0, 0, head); hd.scale.set(0.95, 0.95, 1.1);
  const tuft = L.mesh(L.sph(0.12, 16), fm2, 0, 0.08, -0.05, head); tuft.scale.set(0.9, 0.6, 1.2);
  const beak = L.mesh(L.cap(0.05, 0.12), dark, 0, -0.03, 0.17, head); beak.rotation.x = Math.PI / 2 - 0.15; beak.scale.set(1.3, 1, 0.6);
  const jaw = new THREE.Group(); jaw.position.set(0, -0.06, 0.1); head.add(jaw); const lb = L.mesh(L.cap(0.035, 0.1), dark, 0, 0, 0.07, jaw); lb.rotation.x = Math.PI / 2; lb.scale.set(1.3, 1, 0.5);
  const eyes = [], pupils = [], brows = [];
  for (const sx of [-1, 1]) {
    const ew = L.mesh(L.sph(0.075, 20), L.mat(0xffffff, { r: 0.2 }), sx * 0.09, 0.04, 0.09, head); ew.scale.set(0.8, 1, 0.8); eyes.push(ew);
    const pu = new THREE.Group(); pu.position.set(sx * 0.1, 0.04, 0.145); head.add(pu); L.mesh(L.sph(0.04, 16), L.mat(0xb5542a, { r: 0.3 }), 0, 0, 0, pu).scale.z = 0.5; L.mesh(L.sph(0.022, 12), L.mat(0x050505), 0, 0, 0.01, pu).scale.z = 0.5; L.mesh(L.sph(0.008, 8), L.mat(0xffffff, { e: 0xffffff, ei: 0.6 }), 0.01, 0.012, 0.02, pu); pupils.push(pu);
    const br = L.mesh(L.box(0.1, 0.022, 0.03), dark, sx * 0.09, 0.12, 0.12, head); brows.push(br);
  }
  const legs = [];
  for (const sx of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(sx * 0.17, -0.25, 0.02); body.add(hip);
    L.mesh(L.cap(0.11, 0.22), fm2, 0, -0.08, 0, hip);
    L.mesh(L.cap(0.055, 0.36), legM, 0, -0.32, 0, hip);
    const knee = new THREE.Group(); knee.position.set(0, -0.52, 0); hip.add(knee);
    L.mesh(L.sph(0.06, 12), legM, 0, 0, 0, knee); L.mesh(L.cap(0.045, 0.36), legM, 0, -0.22, 0, knee);
    const foot = new THREE.Group(); foot.position.set(0, -0.42, 0); knee.add(foot);
    for (const a of [-0.45, 0, 0.45]) { const toe = L.mesh(L.cap(0.03, 0.14), legM, Math.sin(a) * 0.08, -0.01, Math.cos(a) * 0.08, foot); toe.rotation.set(Math.PI / 2, 0, -a); }
    legs.push({ hip, knee, foot });
  }
  const ph = Math.random() * 10;
  const e = { g, body, neck, head, jaw, eyes, pupils, brows, legs, ph };
  e.expr = (k = 'normal') => {
    const ang = k === 'angry' ? 0.5 : k === 'smug' ? 0.25 : k === 'shock' ? -0.3 : k === 'sad' ? -0.4 : 0;
    e.brows.forEach((br, i) => { const sx = i ? 1 : -1; br.rotation.z = sx * ang * -1; br.position.y = k === 'shock' ? 0.15 : 0.12; br.position.x = sx * 0.09; });
    e.pupils.forEach(p => p.scale.setScalar(k === 'shock' ? 0.7 : 1)); e.jaw.rotation.x = k === 'shock' ? 0.5 : k === 'happy' ? 0.3 : 0;
    if (k === 'smug') e.eyes.forEach(x => x.scale.set(0.8, 0.75, 0.8)); else e.eyes.forEach(x => x.scale.set(0.8, 1, 0.8));
  };
  e.look = (x, y) => e.pupils.forEach((p, i) => { p.position.x = (i ? 1 : -1) * 0.1 + x * 0.02; p.position.y = 0.04 + y * 0.02; });
  e.stand = (T) => { e.legs.forEach(l => { l.hip.rotation.x = 0; l.knee.rotation.x = 0.0; l.foot.rotation.x = 0; }); e.body.position.y = 1.2 + Math.sin(T * 2 + e.ph) * 0.01; e.neck.rotation.x = 0.15 + Math.sin(T * 1.3 + e.ph) * 0.05; e.head.rotation.y = Math.sin(T * 0.9 + e.ph) * 0.35; e.head.rotation.x = 0; };
  e.run = (T, sp = 14, k = 1) => { const p = T * sp + e.ph; e.legs.forEach((l, i) => { const q = p + i * Math.PI; l.hip.rotation.x = -Math.sin(q) * 0.75 * k; l.knee.rotation.x = Math.max(0, Math.sin(q + 1.4)) * 1.3 * k; l.foot.rotation.x = -Math.max(0, Math.sin(q + 1.4)) * 0.6 * k; });
    e.body.position.y = 1.15 + Math.abs(Math.sin(p)) * 0.12 * k; e.body.rotation.x = 0.12 * k; e.neck.rotation.x = 0.35 * k + Math.sin(p * 2) * 0.08 * k; e.head.rotation.x = -0.3 * k; e.head.rotation.y = 0; };
  e.peck = (T, sp = 4) => { e.stand(T); const k = Math.pow(Math.max(0, Math.sin(T * sp + e.ph)), 2); e.neck.rotation.x = 0.2 + k * 1.75; e.head.rotation.x = k * 0.4; e.jaw.rotation.x = k * 0.3; };
  e.expr('normal'); g.scale.setScalar(o.s ?? 1); return e;
}
function emu(s, x, z, ry = 0, o = {}) { const e = makeEmu({ col: EMUBODY[Math.floor(Math.random() * 3)], ...o }); e.g.position.set(x, 0, z); e.g.rotation.y = ry; s.add(e.g); e.userData = { x0: x, z0: z }; return e; }
function herd(s, n, cx, cz, rx, rz, ry = 0, seed = 5, minD = 1.3) { L.reseed(seed); const a = []; let tries = 0; while (a.length < n && tries++ < n * 40) { const x = cx + (L.RNG() - 0.5) * 2 * rx, z = cz + (L.RNG() - 0.5) * 2 * rz; if (a.some(e => Math.hypot(e.g.position.x - x, e.g.position.z - z) < minD)) continue; const e = emu(s, x, z, ry + (L.RNG() - 0.5) * 0.4, { s: 0.92 + L.RNG() * 0.16 }); e.ph = L.RNG() * 10; a.push(e); } return a; }
// ---- dust puffs
let DUSTTEX = null;
function dust(s, n = 30, col = 0xd99a6a) { if (!DUSTTEX) DUSTTEX = L.canvasTex(128, 128, (g, w, h) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,0.85)'); r.addColorStop(0.5, 'rgba(255,255,255,0.35)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); });
  const ps = []; for (let i = 0; i < n; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: DUSTTEX, color: col, transparent: true, depthWrite: false, opacity: 0.6 })); sp.userData.ph = i / n; s.add(sp); ps.push(sp); }
  // emit(T, getPos(i) -> Vector3 source, dirBack)
  return (T, src, rate = 1.2, life = 1.0, size = 1.6) => ps.forEach((p, i) => { const k = (T * rate + p.userData.ph) % 1; const o = src(i, Math.floor(T * rate + p.userData.ph)); if (!o) { p.visible = false; return; } p.visible = true; p.position.set(o.x + (Math.sin(i * 7.3) * 0.5) * k, 0.25 + k * 0.9 * size * 0.5, o.z + (Math.cos(i * 3.1) * 0.5) * k); p.scale.setScalar(size * (0.3 + k)); p.material.opacity = 0.55 * (1 - k); }); }
// ---- props
function makeLewis() { const g = new THREE.Group(); const gm = L.mat(0x2b2b2d, { m: 0.8, r: 0.35 }), wd = L.mat(0x6a3a1a, { r: 0.5 });
  L.mesh(L.cyl(0.075, 0.075, 0.8, 20), gm, 0, 0, 0.45, g).rotation.x = Math.PI / 2; for (let i = 0; i < 7; i++) L.mesh(L.cyl(0.08, 0.08, 0.02, 20), gm, 0, 0, 0.15 + i * 0.1, g).rotation.x = Math.PI / 2;
  L.mesh(L.cyl(0.025, 0.025, 0.25, 10), gm, 0, 0, 0.95, g).rotation.x = Math.PI / 2; L.mesh(L.cyl(0.045, 0.03, 0.08, 12), gm, 0, 0, 1.07, g).rotation.x = Math.PI / 2;
  L.mesh(L.box(0.12, 0.14, 0.4), gm, 0, 0, -0.1, g); const mag = new THREE.Group(); mag.position.set(0, 0.12, -0.05); g.add(mag); L.mesh(L.cyl(0.2, 0.2, 0.06, 28), gm, 0, 0, 0, mag); for (let i = 0; i < 12; i++) L.mesh(L.box(0.02, 0.065, 0.18), L.mat(0x3a3a3c, { m: 0.7 }), Math.sin(i / 12 * 6.28) * 0.1, 0, Math.cos(i / 12 * 6.28) * 0.1, mag).rotation.y = i / 12 * 6.28;
  const st = L.mesh(L.box(0.07, 0.14, 0.45), wd, 0, -0.04, -0.5, g); st.rotation.x = 0.12; L.mesh(L.box(0.04, 0.12, 0.05), wd, 0, -0.12, -0.22, g);
  for (const sx of [-1, 1]) { const lg = L.mesh(L.cyl(0.012, 0.012, 0.5, 6), gm, sx * 0.1, -0.22, 0.7, g); lg.rotation.set(0.25, 0, sx * 0.3); }
  const fl = sparkle(g, 0xffc040, 0.7); fl.position.set(0, 0, 1.2); fl.visible = false; g.userData = { mag, flash: fl }; return g; }
function tracers(s, n = 10) { const m = L.mat(0xffe08a, { e: 0xffc040, ei: 3 }); const bs = []; for (let i = 0; i < n; i++) { const b = L.mesh(L.cap(0.025, 0.5), m, 0, -10, 0, s); b.castShadow = false; b.userData.ph = i / n; bs.push(b); }
  return (T, from, dir, spread = 0.15, range = 30, on = true) => bs.forEach((b, i) => { if (!on) { b.visible = false; return; } const k = (T * 3 + b.userData.ph) % 1; const d = dir.clone().normalize(); const sx = Math.sin(i * 12.9 + Math.floor(T * 3 + b.userData.ph) * 4.1) * spread, sy = Math.cos(i * 7.7 + Math.floor(T * 3 + b.userData.ph) * 2.3) * spread * 0.5; const dd = V(d.x + sx * d.z, d.y + sy, d.z - sx * d.x).normalize(); b.visible = true; b.position.copy(from).addScaledVector(dd, k * range); b.quaternion.setFromUnitVectors(V(0, 1, 0), dd); }); }
function fire(gun, T, on = true) { const f = gun.userData.flash; f.visible = on && ((T * 16) % 1) < 0.45; f.scale.setScalar(0.5 + ((T * 37) % 1) * 0.5); f.material.rotation = T * 20; gun.position.z = gun.userData.z0 ?? gun.position.z; if (on) gun.userData.mag.rotation.y = T * 8; }
function makeTruck(col = 0x2f4a3a) { const g = new THREE.Group(); const m = L.mat(col, { r: 0.45, phys: true, cc: 0.5 }), bk = L.mat(0x151515, { r: 0.5 }), wd = L.mat(0x7a5a38, { r: 0.7 });
  L.mesh(L.box(1.5, 0.15, 5.2), bk, 0, 0.75, 0, g); L.mesh(L.box(1.1, 0.75, 1.5), m, 0, 1.2, 1.75, g); const gr = L.mesh(L.box(0.95, 0.65, 0.05), L.mat(0xb0b0b0, { m: 0.9, r: 0.3 }), 0, 1.2, 2.52, g);
  L.mesh(L.box(1.6, 1.25, 1.2), m, 0, 1.55, 0.45, g); L.mesh(L.box(1.65, 0.08, 1.35), bk, 0, 2.2, 0.45, g); L.mesh(L.box(1.3, 0.55, 0.05), L.mat(0x9fc6e0, { r: 0.05, m: 0.5, phys: true, cc: 1 }), 0, 1.75, 1.06, g);
  for (const sx of [-1, 1]) { L.mesh(L.box(0.05, 0.5, 0.8), L.mat(0x9fc6e0, { r: 0.05, m: 0.5 }), sx * 0.81, 1.75, 0.45, g); const fe = L.mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.35, 20, 1, false, 0, Math.PI), m, sx * 0.72, 0.75, 1.75, g); fe.rotation.z = Math.PI / 2; fe.rotation.y = Math.PI / 2; L.mesh(L.sph(0.12, 14), L.mat(0xfff6c8, { e: 0xfff0a0, ei: 0.4 }), sx * 0.42, 1.45, 2.5, g); }
  L.mesh(L.box(1.8, 0.12, 2.9), wd, 0, 0.9, -1.45, g); for (const sx of [-1, 1]) L.mesh(L.box(0.08, 0.45, 2.9), wd, sx * 0.88, 1.15, -1.45, g); L.mesh(L.box(1.8, 0.45, 0.08), wd, 0, 1.15, -2.88, g);
  const wheels = []; for (const [x, z] of [[0.82, 1.75], [-0.82, 1.75], [0.82, -1.6], [-0.82, -1.6]]) { const w = new THREE.Group(); w.position.set(x, 0.45, z); g.add(w); L.mesh(L.cyl(0.45, 0.45, 0.22, 24), 0x1a1a1a, 0, 0, 0, w).rotation.z = Math.PI / 2; L.mesh(L.cyl(0.24, 0.24, 0.24, 16), L.mat(0xa82a2a, { r: 0.4 }), 0, 0, 0, w).rotation.z = Math.PI / 2; for (let k = 0; k < 6; k++) { const sp = L.mesh(L.box(0.25, 0.04, 0.04), L.mat(0xd8d0c0), 0, 0, 0, w); sp.rotation.x = k / 6 * Math.PI; } wheels.push(w); }
  g.userData.wheels = wheels; return g; }
function ammoBox(n = 1) { const g = new THREE.Group(); const m = L.mat(0x4a5a32, { r: 0.6 }); L.mesh(L.box(0.6, 0.35, 0.35), m, 0, 0.175, 0, g); L.mesh(L.box(0.62, 0.06, 0.37), L.mat(0x3a4a28), 0, 0.33, 0, g); L.mesh(L.box(0.15, 0.03, 0.04), L.mat(0x222222), 0, 0.37, 0, g);
  const lb = L.mesh(new THREE.PlaneGeometry(0.4, 0.2), new THREE.MeshStandardMaterial({ map: L.canvasTex(160, 80, (q, w, h) => { q.fillStyle = '#d8cfa8'; q.fillRect(0, 0, w, h); q.fillStyle = '#222'; q.font = '900 30px Inter Display'; q.textAlign = 'center'; q.fillText('.303', w / 2, 34); q.font = '700 18px Inter Display'; q.fillText('1000 SCHUSS', w / 2, 62); }) }), 0, 0.18, 0.176, g); return g; }
function makeGum(sc = 1) { const g = new THREE.Group(); const bark = L.mat(0xe8e0d0, { r: 0.8 }); L.mesh(L.cyl(0.14, 0.24, 3.2, 10), bark, 0, 1.6, 0, g);
  for (const [a, l] of [[0.6, 1.8], [-0.7, 1.6], [0.1, 1.4]]) { const b = L.mesh(L.cyl(0.06, 0.12, l, 8), bark, Math.sin(a) * l * 0.4, 3.0 + l * 0.35, 0, g); b.rotation.z = -a; }
  const lm = [L.mat(0x7a9a5a, { r: 0.9, fab: true }), L.mat(0x6a8a4e, { r: 0.9 }), L.mat(0x8aa868, { r: 0.9 })];
  for (let i = 0; i < 7; i++) { const c = L.mesh(L.sph(0.9, 14), lm[i % 3], (L.RNG() - 0.5) * 2.6, 3.9 + L.RNG() * 1.2, (L.RNG() - 0.5) * 1.6, g); c.scale.set(1.1 + L.RNG() * 0.4, 0.55, 1); }
  g.scale.setScalar(sc); return g; }
function makeWindmill() { const g = new THREE.Group(); const m = L.mat(0x9aa0a6, { m: 0.7, r: 0.4 });
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const lg = L.mesh(L.cyl(0.04, 0.05, 7.2, 6), m, x * 0.45, 3.5, z * 0.45, g); lg.rotation.set(-z * 0.12, 0, x * 0.12); }
  for (let i = 1; i < 6; i++) { const w = 1.6 - i * 0.22; for (const [x, z, ry] of [[0, 1, 0], [0, -1, 0], [1, 0, Math.PI / 2], [-1, 0, Math.PI / 2]]) { const b = L.mesh(L.box(w, 0.05, 0.05), m, x * w / 2, i * 1.25, z * w / 2, g); b.rotation.y = ry; } }
  const hub = new THREE.Group(); hub.position.set(0, 7.3, 0.4); g.add(hub); const fan = new THREE.Group(); hub.add(fan); for (let i = 0; i < 14; i++) { const bl = L.mesh(L.box(0.3, 1.5, 0.03), L.mat(0xd8dde3, { m: 0.6, r: 0.35 }), 0, 0.95, 0, fan); bl.geometry = bl.geometry.clone(); bl.rotation.set(0, 0.35, 0); const p = new THREE.Group(); p.rotation.z = i / 14 * Math.PI * 2; p.add(bl); fan.add(p); }
  L.mesh(L.cyl(0.18, 0.18, 0.3, 12), m, 0, 0, 0, hub).rotation.x = Math.PI / 2; const tl = L.mesh(L.box(0.04, 0.9, 1.6), L.mat(0xb3202a, { r: 0.6 }), 0, 0.1, -1.6, hub); L.mesh(L.box(0.06, 0.06, 1.6), m, 0, 0, -0.9, hub);
  L.tick((t, T) => { fan.rotation.z = T * 2.5; }); return g; }
function wheat(n, x0, x1, z0, z1, seed = 4, mask = null) { L.reseed(seed); const geo = new THREE.CylinderGeometry(0.012, 0.016, 1, 4); geo.translate(0, 0.5, 0); const hg = L.cap(0.035, 0.16); hg.translate(0, 1.05, 0);
  const sm = new THREE.InstancedMesh(geo, L.mat(0xc9a248, { r: 0.9 }), n), hm = new THREE.InstancedMesh(hg, L.mat(0xe6bd5a, { r: 0.8, fab: true }), n); const d = new THREE.Object3D(); let k = 0;
  for (let i = 0; i < n * 3 && k < n; i++) { const x = x0 + (x1 - x0) * L.RNG(), z = z0 + (z1 - z0) * L.RNG(); if (mask && !mask(x, z)) continue; d.position.set(x, 0, z); d.rotation.set((L.RNG() - 0.5) * 0.3, L.RNG() * 6, (L.RNG() - 0.5) * 0.3); d.scale.set(1, 0.75 + L.RNG() * 0.4, 1); d.updateMatrix(); sm.setMatrixAt(k, d.matrix); hm.setMatrixAt(k, d.matrix); k++; }
  sm.count = hm.count = k; sm.castShadow = hm.castShadow = true; sm.receiveShadow = true; const g = new THREE.Group(); g.add(sm, hm); return g; }
function wireFence(len = 20, posts = 1) { const g = new THREE.Group(); const pm = L.mat(0x6a4a2a, { r: 0.8 }), wm = L.mat(0x8a8a8a, { m: 0.8, r: 0.4 }); const ps = [];
  for (let i = 0; i <= len / 2.5; i++) { const p = L.mesh(L.cyl(0.06, 0.07, 1.3, 8), pm, -len / 2 + i * 2.5, 0.65, 0, g); ps.push(p); }
  const ws = []; for (const y of [0.4, 0.75, 1.1]) ws.push(L.mesh(L.cyl(0.008, 0.008, len, 4), wm, 0, y, 0, g)); ws.forEach(w => w.rotation.z = Math.PI / 2); g.userData = { ps, ws }; return g; }
function dirtTex() { return L.canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#c9733f'; g.fillRect(0, 0, w, h); for (let i = 0; i < 7000; i++) { const v = Math.random(); g.fillStyle = v < 0.5 ? `rgba(150,70,35,${Math.random() * 0.35})` : `rgba(235,160,100,${Math.random() * 0.3})`; const r = 1 + Math.random() * 4; g.fillRect(Math.random() * w, Math.random() * h, r, r); } for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(110,120,70,${0.25 + Math.random() * 0.3})`; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 4 + Math.random() * 8, 0, 7); g.fill(); } }, 40); }
function outback(s, o = {}) {
  s.background = L.skyTex(o.top ?? '#2f7fd6', o.mid ?? '#8cc0ee', o.bot ?? '#f6dcb4'); s.fog = new THREE.Fog(o.fog ?? 0xefcfa8, o.f0 ?? 50, o.f1 ?? 420);
  const gr = L.mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshStandardMaterial({ map: dirtTex(), roughness: 1, envMapIntensity: 0.3 }), 0, 0, 0, s); gr.rotation.x = -Math.PI / 2; gr.castShadow = false;
  L.reseed(o.seed ?? 12);
  const scrubG = new THREE.SphereGeometry(0.5, 10, 8); const scrub = new THREE.InstancedMesh(scrubG, L.mat(0x8a9a5a, { r: 0.95, fab: true }), 260); const d = new THREE.Object3D();
  for (let i = 0; i < 260; i++) { let x, z; do { x = (L.RNG() - 0.5) * 160; z = -L.RNG() * 150 + 20; } while (o.clear && Math.abs(x - o.clear[0]) < o.clear[2] && Math.abs(z - o.clear[1]) < o.clear[3]); d.position.set(x, 0.12, z); const sc = 0.4 + L.RNG() * 0.8; d.scale.set(sc * 1.3, sc * 0.6, sc); d.rotation.y = L.RNG() * 6; d.updateMatrix(); scrub.setMatrixAt(i, d.matrix); }
  scrub.castShadow = true; s.add(scrub);
  for (let i = 0; i < (o.trees ?? 9); i++) { let x = (L.RNG() - 0.5) * 120, z = -20 - L.RNG() * 90; if (o.clear && Math.abs(x - o.clear[0]) < o.clear[2] + 4 && Math.abs(z - o.clear[1]) < o.clear[3] + 4) x += 30 * Math.sign(x || 1); const t = makeGum(0.8 + L.RNG() * 0.6); t.position.set(x, 0, z); t.rotation.y = L.RNG() * 6; s.add(t); }
  const hm = L.mat(o.hill ?? 0xb8603a, { r: 1, env: 0.1 }); for (let i = 0; i < 18; i++) { const a = -Math.PI / 2 + (i / 17 - 0.5) * 2.6; const h = L.mesh(new THREE.CylinderGeometry(20 + L.RNG() * 25, 35 + L.RNG() * 30, 10 + L.RNG() * 22, 7), hm, Math.cos(a) * 360, 2, Math.sin(a) * 360, s); h.castShadow = false; }
  for (let i = 0; i < 6; i++) { const c = L.makeCloud(7 + L.RNG() * 6); c.position.set(-200 + i * 80 + L.RNG() * 20, 55 + L.RNG() * 25, -280 - L.RNG() * 60); s.add(c); }
  s.add(L.makeBirds(4, V(-10, 20, -40)));
  if (o.farm) { const h = L.makeHouse(0xeee4cc, 0x8f969c); h.position.set(o.farm[0], 0, o.farm[1]); h.rotation.y = o.farm[2] ?? 0; s.add(h); const tk = L.mesh(L.cyl(1.0, 1.0, 1.8, 20), L.mat(0xb8bec4, { m: 0.7, r: 0.4 }), o.farm[0] + 5.5, 2.6, o.farm[1], s); L.mesh(L.box(1.8, 1.7, 1.8), L.mat(0x6a4a2a), o.farm[0] + 5.5, 0.85, o.farm[1], s); const wm = makeWindmill(); wm.position.set(o.farm[0] - 8, 0, o.farm[1] - 3); s.add(wm); }
  if (o.wheat) s.add(wheat(o.wheat.n ?? 5000, ...o.wheat.r, o.wheat.seed ?? 4, o.wheat.mask));
  if (o.fence) { const f = wireFence(o.fence[2] ?? 30); f.position.set(o.fence[0], 0, o.fence[1]); f.rotation.y = o.fence[3] ?? 0; s.add(f); s.userData.fence = f; }
  return lights(s, { sky: o.sky ?? 0xdfe9f7, ground: 0xa0603a, hi: o.hi ?? 1.15, si: o.si ?? 2.8, dir: o.dir ?? [7, 11, 6], sun: o.sun ?? 0xfff0d0, sunCol: o.sunCol, target: o.target ?? V(0, 1, 0), sr: o.sr ?? 8, sunSprite: o.sunSprite });
}
const DUSK = { top: '#2b2a6b', mid: '#e3735a', bot: '#ffc27a', fog: 0xf2a070, sun: 0xffb070, dir: [-8, 4, -12], sunCol: '#ffcf8a', si: 2.0, hill: 0x8a4a3a };
function speedLines(g, W, H, T, k = 1, dir = 1) { if (k <= 0) return; g.save(); g.globalAlpha = 0.5 * k; g.strokeStyle = '#fff'; g.lineCap = 'round'; for (let i = 0; i < 14; i++) { const y = H * (0.15 + ((i * 0.137) % 1) * 0.7); const x = ((i * 0.31 + T * 2.5 * (1 + i % 3 * 0.3)) % 1.4 - 0.2) * W; g.lineWidth = W * (0.004 + (i % 3) * 0.002); g.beginPath(); g.moveTo(dir > 0 ? W - x : x, y); g.lineTo(dir > 0 ? W - x - W * 0.18 : x + W * 0.18, y); g.stroke(); } g.restore(); }
function gauge(g, W, H, v, max = 60, k = 1, x = 0.5, y = 0.27) { if (k <= 0) return; const R = W * 0.2, cx = W * x, cy = H * y; g.save(); g.globalAlpha = clamp(k * 3); const sc = backOut(clamp(k * 2)); g.translate(cx, cy); g.scale(sc, sc);
  g.fillStyle = 'rgba(15,18,30,0.85)'; g.beginPath(); g.arc(0, 0, R * 1.12, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = W * 0.008; g.stroke(); const a0 = Math.PI * 0.8, a1 = Math.PI * 2.2;
  for (let i = 0; i <= 12; i++) { const a = a0 + (a1 - a0) * i / 12; g.strokeStyle = i >= 10 ? '#FF453A' : '#fff'; g.lineWidth = W * (i % 2 ? 0.004 : 0.008); g.beginPath(); g.moveTo(Math.cos(a) * R * 0.82, Math.sin(a) * R * 0.82); g.lineTo(Math.cos(a) * R * 0.98, Math.sin(a) * R * 0.98); g.stroke(); if (i % 2 === 0) { g.fillStyle = '#fff'; g.font = `800 ${W * 0.03}px "Inter Display"`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(i * 5), Math.cos(a) * R * 0.64, Math.sin(a) * R * 0.64); } }
  const a = a0 + (a1 - a0) * clamp(v / max); g.strokeStyle = '#FFD60A'; g.lineWidth = W * 0.012; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * R * 0.85, Math.sin(a) * R * 0.85); g.stroke(); g.fillStyle = '#FFD60A'; g.beginPath(); g.arc(0, 0, W * 0.02, 0, 7); g.fill();
  g.fillStyle = '#FFD60A'; g.font = `900 ${W * 0.06}px "Inter Display"`; g.textAlign = 'center'; g.fillText(Math.round(v) + ' km/h', 0, R * 0.62); g.restore(); }
function counter(g, W, H, label, val, k, col = '#FFD60A', y = 0.26) { if (k <= 0) return; const s = W * 0.12; g.save(); g.translate(W / 2, H * y); const sc = backOut(clamp(k * 3)); g.scale(sc, sc); g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.font = `900 ${s}px "Inter Display"`; g.lineWidth = s * 0.16; g.strokeStyle = '#000'; const txt = Math.round(val).toLocaleString('de-DE'); g.strokeText(txt, 0, 0); g.fillStyle = col; g.fillText(txt, 0, 0);
  g.font = `900 ${s * 0.4}px "Inter Display"`; g.lineWidth = s * 0.08; g.strokeText(label, 0, s * 0.72); g.fillStyle = '#fff'; g.fillText(label, 0, s * 0.72); g.restore(); }
function haha(g, W, H, T, t, txt = 'HA HA!', pts = [[0.25, 0.22, -0.2, 0.1], [0.75, 0.27, 0.2, 0.4], [0.32, 0.4, -0.1, 0.7]]) { g.save(); g.font = `900 ${W * 0.08}px "Inter Display"`; g.fillStyle = '#FFD60A'; g.strokeStyle = '#000'; g.lineWidth = W * 0.012; g.textAlign = 'center'; for (const [x, y, a, d] of pts) { if (t < d) continue; g.save(); g.translate(W * x, H * y + Math.sin(T * 12 + x * 9) * 10); g.rotate(a); const sc = backOut(clamp((t - d) * 5)); g.scale(sc, sc); g.strokeText(txt, 0, 0); g.fillText(txt, 0, 0); g.restore(); } g.restore(); }
function aimGun(c, gun) { c.arms[0].sh.rotation.set(-1.45, 0.35, 0); c.arms[1].sh.rotation.set(-1.3, -0.3, 0); c.arms[0].el.rotation.x = -0.3; c.arms[1].el.rotation.x = -0.4; }
function prone(c, gun) { c.g.rotation.x = Math.PI / 2 - 0.05; c.g.position.y = 0.25; c.legs.forEach(l => { l.hip.rotation.x = 0; l.knee.rotation.x = 0; }); c.arms.forEach(a => { a.sh.rotation.set(-2.9, 0, 0); a.el.rotation.x = 0; }); c.head.rotation.x = -1.2; }
function gunPost(s, x, z, ry = 0) { const gun = makeLewis(); gun.position.set(x, 0.55, z); gun.rotation.y = ry; s.add(gun); for (let i = 0; i < 6; i++) { const sb = L.mesh(L.cap(0.18, 0.35), L.mat(0xb89a6a, { fab: true, r: 0.95 }), x + Math.sin(ry) * 0.9 + Math.cos(ry) * (-1.0 + i * 0.4), 0.18, z + Math.cos(ry) * 0.9 - Math.sin(ry) * (-1.0 + i * 0.4), s); sb.rotation.z = Math.PI / 2; sb.rotation.y = ry; } return gun; }
function shells(s, n, x, z, r = 0.8) { const m = L.mat(0xd9a23a, { m: 0.9, r: 0.25 }); const a = []; for (let i = 0; i < n; i++) { const c = L.mesh(L.cyl(0.02, 0.02, 0.09, 8), m, x + (Math.random() - 0.5) * r * 2, 0.02, z + (Math.random() - 0.5) * r * 2, s); c.rotation.set(Math.PI / 2, Math.random() * 6, Math.random() * 6); c.castShadow = false; a.push(c); } return a; }

export const SHOTS = {
  // ---------- HOOK ----------
  h_army(ctx) {
    const s = ctx.scene; outback(s, { target: V(0, 1, -2), clear: [0, 0, 12, 12] }); const gun = gunPost(s, 0, -1.5, 0); const d1 = digger(s, 0, -0.55, -2.55, 0.2); const d2 = digger(s, 1, 0.9, -2.3, -0.3); const me = meredith(s, 2.0, -3.0, -0.4);
    const tr = tracers(s, 14); const em = [emu(s, -4, 1.6, Math.PI / 2), emu(s, -6.5, 2.4, Math.PI / 2), emu(s, -9, 1.2, Math.PI / 2)];
    const r = (u, t) => { const on = t > 0.15; fire(gun, t, on); tr(t, V(0, 0.6, -0.3), V(0.12, 0.06, 1), 0.25, 14, on); d1.pose('stand'); aimGun(d1); d1.expr('angry'); d1.g.position.y = 0; d2.expr('shock'); d2.arms[0].sh.rotation.set(-1.0, 0, -0.5); me.pose('point'); me.expr('angry'); talk(me, t, 'angry');
      em.forEach((e, i) => { e.run(t, 15); e.g.position.x = e.userData.x0 + t * 6.5; e.expr('smug'); e.head.rotation.y = 0.6; e.look(-0.5, 0); }); if (on && t < 0.5) { ctx.shake = 1.2; ctx.flash = 0.35 * (1 - (t - 0.15) / 0.35); } else if (on) ctx.shake = 0.25;
      cam(ctx, V(1.6, 1.2, 5.5), V(1.1, 1.5, 4.0), V(0, 1.0, -1.8), V(0, 1.3, -2.2), clamp(u * 1.2), 55, true); };
    r.overlay = (g, W, H, u, T, t) => { if (u > 0.55) stamp2d(g, W, H, 'VERLOREN!', (u - 0.55) * 3, '#e8202a', 0.24, -0.12); };
    return r;
  },
  h_emu(ctx) {
    const s = ctx.scene; outback(s, { target: V(0, 1, 0) }); const e = emu(s, 0, 0, 0, { s: 1.0 }); const bg = herd(s, 14, 0, -8, 9, 4, 0, 8, 1.6);
    const r = (u, t) => { e.stand(t); e.expr(u > 0.45 ? 'smug' : 'normal'); e.look(0, 0); e.head.rotation.y = Math.sin(t * 2) * 0.15 * (1 - u); if (u > 0.45) { e.head.rotation.z = Math.sin(t * 6) * 0.1; e.jaw.rotation.x = Math.abs(Math.sin(t * 9)) * 0.4; } bg.forEach(b => { b.stand(t); b.expr('smug'); });
      cam(ctx, V(0, 2.1, 1.3), V(0.3, 1.9, 4.6), V(0, 2.0, 0), V(0, 1.6, -4), u, 50); };
    r.overlay = (g, W, H, u, T, t) => { haha(g, W, H, T, t - 0.5); };
    return r;
  },
  // ---------- SETTING ----------
  outback_wide(ctx) {
    const s = ctx.scene; outback(s, { farm: [6, -30, -0.3], wheat: { n: 7000, r: [-22, 8, -40, -14] }, fence: [-7, -13, 30], target: V(0, 1, -20), sr: 30 });
    return (u, t) => { ctx.tag = 'WESTAUSTRALIEN · 1932'; cam(ctx, V(-10, 16, 22), V(-4, 9, 10), V(-4, 0, -22), V(-2, 2, -24), u, 50); };
  },
  farm(ctx) {
    const s = ctx.scene; outback(s, { farm: [3, -10, -0.2], wheat: { n: 6000, r: [-14, 0, -12, -2] }, target: V(-6, 1, -6), sr: 12 }); const f = farmer(s, -6, -1.4, 0.3); const f2 = guy(s, { ...FARMER, shirt: 0xb85a3a, sleeve: 0xb85a3a, hair: 0x2a1a10 }, -8.5, 0, -3.0, 0.6); f2.hat = slouchHat(f2.head, 0x8a6a48);
    const sc = new THREE.Group(); f.arms[1].hand.add(sc); L.mesh(L.cyl(0.02, 0.02, 1.2), L.mat(0x6a4a2a), 0, -0.1, 0.1, sc).rotation.x = 1.2; const bl = L.mesh(L.box(0.5, 0.04, 0.12), L.mat(0xaaaaaa, { m: 0.8 }), 0, -0.3, 0.6, sc); bl.rotation.x = 0.3;
    return (u, t) => { f.expr('grin'); f2.expr('smile'); f.arms[1].sh.rotation.set(-0.8 + Math.sin(t * 5) * 0.4, 0, 0.3); f.arms[0].sh.rotation.set(-0.8 + Math.sin(t * 5) * 0.4, 0, -0.3); f2.arms[1].sh.rotation.set(-2.6 + Math.sin(t * 6) * 0.3, 0, 0.3); talk(f2, t, 'grin');
      cam(ctx, V(-3.5, 1.8, 4.5), V(-4.5, 2.4, 3.2), V(-6.5, 1.2, -3), V(-6.0, 1.6, -5), u, 50); };
  },
  farmer(ctx) {
    const s = ctx.scene; outback(s, { farm: [5, -12, -0.3], wheat: { n: 5000, r: [-8, 8, -9, -1] }, target: V(0, 1, 0), sr: 8 }); const f = farmer(s, 0, 0, 0); const sh = L.mesh(L.cyl(0.18, 0.08, 0.5, 10), L.mat(0xe6bd5a, { fab: true }), 0, -0.25, 0.12, f.arms[1].hand);
    const md = L.mesh(L.cyl(0.05, 0.05, 0.015, 16), gold(), -0.12, 1.15, 0.215, f.g); md.rotation.x = Math.PI / 2; L.mesh(L.box(0.06, 0.08, 0.01), L.mat(0xb3202a), -0.12, 1.24, 0.213, f.g);
    return (u, t) => { f.expr('grin'); f.look(0, 0); f.arms[1].sh.rotation.set(-1.6, 0, 0.4 + Math.sin(t * 3) * 0.05); f.arms[1].el.rotation.x = -0.5; f.arms[0].sh.rotation.set(0.2, 0, -0.4); f.arms[0].el.rotation.x = -1.6;
      cam(ctx, V(0.9, 1.5, 3.2), V(0.5, 1.6, 2.3), V(0, 1.5, 0), V(0, 1.55, 0), u, 48); };
  },
  // ---------- EMUS ----------
  emu_arrive(ctx) {
    const s = ctx.scene; outback(s, { target: V(0, 1, -6), wheat: { n: 2500, r: [-6, 6, 1, 4] } }); L.mesh(new THREE.CylinderGeometry(30, 34, 3, 24), L.mat(0xb8653a, { r: 1 }), 0, -1.2, -42, s);
    const em = []; for (let i = 0; i < 9; i++) { const e = emu(s, -8 + i * 2, -12 - (i % 3), Math.PI * 0 + 0.0); e.g.rotation.y = 0; em.push(e); }
    return (u, t) => { em.forEach((e, i) => { const k = clamp((u - i * 0.06) * 3); e.g.position.y = -2.6 + ease(k) * 2.6; e.stand(t); e.expr(k >= 1 ? 'smug' : 'normal'); e.look(0, -0.3); }); ctx.grade = 'warm';
      cam(ctx, V(0, 1.5, 7), V(0, 1.6, 5.5), V(0, 1.6, -12), V(0, 1.7, -12), u, 45); };
  },
  emu_horde(ctx) {
    const s = ctx.scene; outback(s, { target: V(0, 1, -10), sr: 30 }); const em = herd(s, 70, 0, -12, 16, 14, -0.3, 21, 1.4); const du = dust(s, 40);
    const r = (u, t) => { em.forEach((e, i) => { e.run(t, 12); e.g.position.z = e.userData.z0 + t * 3.2; e.g.position.x = e.userData.x0 - t * 1.0; });
      du(t, (i) => em[(i * 7) % em.length].g.position, 1.5, 1, 2.2);
      cam(ctx, V(10, 13, 12), V(6, 9, 10), V(-1, 0, -10), V(-2, 0, -6), u, 50); };
    r.overlay = (g, W, H, u, T, t) => counter(g, W, H, 'EMUS', 20000 * ease(clamp(u * 1.6)), clamp(u * 4), '#FFD60A', 0.24);
    return r;
  },
  emu_eat(ctx) {
    const s = ctx.scene; const holes = [[-1.5, -0.5], [1.4, -1.2], [0, -3]]; outback(s, { wheat: { n: 7000, r: [-7, 7, -7, 3], mask: (x, z) => !holes.some(([hx, hz]) => Math.hypot(x - hx, z - hz) < 1.6) }, target: V(0, 1, -1), sr: 8 });
    const em = holes.map(([x, z], i) => emu(s, x, z, [0.5, -0.8, 0.2][i])); const f = farmer(s, 3.6, 1.6, -0.9);
    const r = (u, t) => { em.forEach((e, i) => { e.peck(t + i, 5); e.expr('happy'); }); f.expr('shock'); f.pose('stand'); flail(f, t, 0.8); tremble(f, t);
      cam(ctx, V(-1.0, 3.2, 8.5), V(0.2, 2.8, 7.4), V(0.6, 1.0, -0.5), V(1.2, 1.1, -0.5), u, 50); };
    r.overlay = (g, W, H, u, T, t) => { if (u > 0.2) { g.save(); g.font = `900 ${W * 0.075}px "Inter Display"`; g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = W * 0.012; g.textAlign = 'center'; [[0.25, 0.3, 0], [0.7, 0.24, 0.3], [0.5, 0.38, 0.6]].forEach(([x, y, d]) => { const k = ((t - d) * 1.6) % 1.6; if (t < d || k > 1) return; g.save(); g.globalAlpha = 1 - k; g.translate(W * x, H * y - k * H * 0.05); g.strokeText('PICK!', 0, 0); g.fillText('PICK!', 0, 0); g.restore(); }); g.restore(); } };
    return r;
  },
  fence_break(ctx) {
    const s = ctx.scene; outback(s, { target: V(0, 1, 0), clear: [0, 0, 10, 10] }); const fe = wireFence(16); s.add(fe); const em = herd(s, 6, 0, -9, 4, 2, 0, 31, 1.5); const du = dust(s, 24);
    const parts = fe.userData.ps.map(p => ({ p, v: V((Math.random() - 0.5) * 4, 4 + Math.random() * 3, 3 + Math.random() * 3), r: V(Math.random() * 6, Math.random() * 6, 0) }));
    const r = (u, t) => { const hit = 0.38; em.forEach(e => { e.run(t, 13); e.expr('angry'); e.g.position.z = e.userData.z0 + t * 7; });
      const tb = t - hit * (ctx.dur ?? 2.2); const br = u > hit; fe.userData.ws.forEach((w, i) => { w.visible = !br; }); parts.forEach(({ p, v, r: rr }, i) => { if (Math.abs(p.position.x) > 4.5) return; if (!br) { p.position.set(p.position.x, 0.65, 0); p.rotation.set(0, 0, 0); return; } const k = (u - hit) * 2.5; p.position.set(p.userData.x0 ?? (p.userData.x0 = p.position.x), 0.65 + v.y * k - 9 * k * k, v.z * k); p.position.x = p.userData.x0 + v.x * k; p.rotation.set(rr.x * k, rr.y * k, 0); });
      if (u > hit && u < hit + 0.12) { ctx.shake = 1.3; ctx.flash = 0.3; } du(t, i => em[i % em.length].g.position, 1.6, 1, 2.0);
      cam(ctx, V(2.5, 1.0, 6.0), V(1.5, 1.4, 7.5), V(0, 1.4, -1), V(0, 1.6, 0), u, 55); };
    r.overlay = (g, W, H, u, T, t) => { if (u > 0.38) stamp2d(g, W, H, 'KRACH!', (u - 0.38) * 4, '#e8202a', 0.24, 0.1); };
    return r;
  },
  farmer_letter(ctx) {
    const s = ctx.scene; hotelRoom(s, { table: false, tint: 0xf0dcc0 }); const f = farmer(s, 0, -1.25, 0); f.pose('sit'); f.g.position.y = -0.2; const ch = L.makeChairWood(0x6a4a2a); ch.position.set(0, 0, -1.3); s.add(ch);
    L.mesh(L.box(1.6, 0.08, 0.9), L.mat(0x6a4a2a, { r: 0.5 }), 0, 0.82, -0.5, s); for (const [x, z] of [[-0.7, -0.85], [0.7, -0.85], [-0.7, -0.15], [0.7, -0.15]]) L.mesh(L.cyl(0.04, 0.04, 0.8), L.mat(0x4a2e1a), x, 0.4, z, s);
    const lt = L.mesh(new THREE.PlaneGeometry(0.42, 0.56), new THREE.MeshStandardMaterial({ map: L.canvasTex(300, 400, (g, w, h) => { g.fillStyle = '#f6f1e4'; g.fillRect(0, 0, w, h); g.fillStyle = '#1d2a6a'; g.font = '900 64px Inter Display'; g.textAlign = 'center'; g.fillText('HILFE!', w / 2, 90); g.font = '700 30px Inter Display'; g.fillText('DIE EMUS', w / 2, 160); g.fillText('FRESSEN', w / 2, 200); g.fillText('ALLES!', w / 2, 240); g.strokeStyle = '#1d2a6a'; g.lineWidth = 3; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(40, 290 + i * 30); g.lineTo(w - 40 - i * 30, 290 + i * 30); g.stroke(); } }) }), 0, 0.87, -0.45, s); lt.rotation.x = -Math.PI / 2;
    const pen = L.mesh(L.cyl(0.01, 0.008, 0.2), L.mat(0x111111), 0, -0.05, 0.08, f.arms[1].hand); pen.rotation.x = 1.0;
    const r = (u, t) => { f.expr('angry'); f.look(0, -0.8); f.head.rotation.x = 0.35; f.arms[1].sh.rotation.set(-0.9, -0.2 + Math.sin(t * 14) * 0.05, 0.3); f.arms[1].el.rotation.x = -0.7; const fly = clamp((u - 0.7) * 3.5); lt.position.set(0, 0.87 + fly * 2.2, -0.45 + fly * 1.5); lt.rotation.set(-Math.PI / 2 + fly * 1.3, 0, fly * 4);
      cam(ctx, V(1.2, 1.6, 1.3), V(0.9, 1.7, 0.9), V(0, 1.15, -0.8), V(0, 1.3, -0.8), u, 50); };
    return r;
  },
  minister(ctx) {
    const s = ctx.scene; const A = amt(s); const mi = guy(s, MINISTER, 0, -0.15, -2.5, 0); mi.pose('sit'); const lt = L.makeLetter(0); mi.arms[0].hand.add(lt); lt.position.set(0.05, -0.05, 0.12); lt.rotation.set(-1.2, 0, 0); lt.scale.setScalar(0.6);
    const r = (u, t) => { const k = clamp((u - 0.45) * 6); mi.arms[1].sh.rotation.set(-1.4 + (k > 0 && k < 1 ? Math.sin(k * Math.PI) * 0.7 : 0), 0, 0.3); mi.arms[0].sh.rotation.set(-1.2, 0.3, -0.1); mi.arms[0].el.rotation.x = -0.6; mi.expr(u > 0.45 ? 'angry' : 'shock'); A.stamp.position.y = 0.86 + (k > 0 && k < 1 ? Math.sin(k * Math.PI) * 0.25 : 0); A.stamp.position.x = 0.35;
      if (u > 0.5 && u < 0.58) { ctx.shake = 1.1; ctx.flash = 0.2; } ctx.tag = 'REGIERUNG';
      cam(ctx, V(0.9, 1.6, 0.4), V(0.5, 1.65, -0.2), V(0, 1.35, -2.4), V(0, 1.4, -2.4), u, 50); };
    r.overlay = (g, W, H, u, T, t) => { if (u > 0.5) stamp2d(g, W, H, 'ARMEE!', (u - 0.5) * 4, '#2a7a3a', 0.22, -0.1); };
    return r;
  },
  // ---------- DIE ARMEE ----------
  major(ctx) {
    const s = ctx.scene; outback(s, { target: V(0, 1, 0) }); const me = meredith(s, 0, 0, 0); const tk = makeTruck(); tk.position.set(3.2, 0, -3); tk.rotation.y = -0.4; s.add(tk);
    const r = (u, t) => { me.expr('smug'); me.look(0, 0); me.arms[0].sh.rotation.set(0.1, 0, -0.35); me.arms[0].el.rotation.x = -1.6; me.arms[1].sh.rotation.set(0.1, 0, 0.35); me.arms[1].el.rotation.x = -1.6; me.g.rotation.y = Math.sin(t * 1.4) * 0.05;
      cam(ctx, V(0.2, 0.5, 3.4), V(0.5, 1.2, 2.4), V(0, 1.6, 0), V(0, 1.7, 0), u, 50); };
    r.overlay = (g, W, H, u, T, t) => { chip(g, W, H, 'MAJOR MEREDITH', '#7a6f48', W / 2, H * 0.2, (t - 0.2) * 3, 0.05); };
    return r;
  },
  squad(ctx) {
    const s = ctx.scene; outback(s, { target: V(0, 1, 0) }); const ds = [digger(s, 0, -0.8, 0, 0), digger(s, 1, 0.8, 0, 0)]; const g1 = gunPost(s, -1.3, 1.4, 0), g2 = gunPost(s, 1.3, 1.4, 0);
    const r = (u, t) => { ds.forEach((c, i) => { salute(c, clamp(u * 4 - i * 0.3)); c.expr('grin'); }); cam(ctx, V(0, 1.4, 5.8), V(0, 1.6, 4.4), V(0, 1.1, 0), V(0, 1.3, 0), u, 50); };
    r.overlay = (g, W, H, u, T, t) => { chip(g, W, H, '2 SOLDATEN', '#2a6fb0', W * 0.5, H * 0.17, (u - 0.05) * 4, 0.05); chip(g, W, H, '2 MASCHINENGEWEHRE', '#b3202a', W * 0.5, H * 0.24, (u - 0.4) * 4, 0.05); };
    return r;
  },
  ammo(ctx) {
    const s = ctx.scene; outback(s, { target: V(0, 0.5, 0) }); const bx = []; for (let i = 0; i < 10; i++) { const b = ammoBox(); b.position.set(-0.65 + (i % 3) * 0.65, 0, -0.2 + 0); s.add(b); bx.push(b); }
    const r = (u, t) => { bx.forEach((b, i) => { const lv = Math.floor(i / 3); const k = clamp((u - i * 0.07) * 6); b.position.set(-0.65 + (i % 3) * 0.65 + (lv % 2) * 0.32, lv * 0.4 + (1 - ease(k)) * 3, -0.2); b.visible = k > 0; if (i === 9) b.position.set(0, 4 * 0.4 - 0.4 + (1 - ease(k)) * 3, -0.2); });
      cam(ctx, V(0.8, 1.3, 3.6), V(0.4, 1.5, 3.0), V(0, 0.9, -0.2), V(0, 1.0, -0.2), u, 50); };
    r.overlay = (g, W, H, u, T, t) => counter(g, W, H, 'SCHUSS MUNITION', 10000 * ease(clamp(u * 1.4)), clamp(u * 5), '#FFD60A', 0.22);
    return r;
  },
  war_title(ctx) {
    const s = ctx.scene; outback(s, { ...DUSK, target: V(0, 1, 0), clear: [0, 0, 14, 14] }); const ds = [digger(s, 0, -1.5, 2.2, Math.PI), digger(s, 1, 1.5, 2.2, Math.PI)]; const gun = gunPost(s, 0, 1.2, Math.PI); const me = meredith(s, 0, 2.8, Math.PI);
    const em = herd(s, 14, 0, -6, 5, 2, 0, 44, 1.4);
    const r = (u, t) => { ds.forEach(c => c.expr('angry')); me.expr('angry'); me.pose('point'); em.forEach(e => { e.stand(t); e.expr('angry'); e.look(0, 0); }); ctx.grade = 'warm'; ctx.flash = clamp(1 - t * 4) * 0.6;
      cam(ctx, V(0.6, 1.2, 7.5), V(0.4, 2.6, 10.5), V(0, 1.4, -2), V(0, 1.8, -5), u, 55); };
    r.overlay = (g, W, H, u, T, t) => { bigText(g, '2. NOVEMBER 1932', W / 2, H * 0.16, W * 0.075, t / 1.2); bigText(g, 'DER EMU-KRIEG', W / 2, H * 0.23, W * 0.12, t / 1.2 - 0.15); };
    return r;
  },
  standoff(ctx) {
    const s = ctx.scene; outback(s, { target: V(0, 1, 0), clear: [0, 0, 12, 12] }); const d = digger(s, 0, -2.0, 0, Math.PI / 2); const gun = gunPost(s, -1.2, 0, Math.PI / 2); const e = emu(s, 2.6, 0, -Math.PI / 2); const tw = new THREE.Group(); s.add(tw); for (let i = 0; i < 10; i++) { const c = L.mesh(new THREE.TorusGeometry(0.28, 0.02, 4, 12), L.mat(0x9a7a4a, { r: 1 }), 0, 0, 0, tw); c.rotation.set(Math.random() * 6, Math.random() * 6, 0); }
    const r = (u, t) => { d.expr('angry'); d.look(0.8, 0); aimGun(d); e.stand(t); e.head.rotation.y = 0; e.expr(u > 0.6 ? 'smug' : 'angry'); e.look(-0.8, 0); tw.position.set(-3 + u * 6, 0.32 + Math.abs(Math.sin(t * 4)) * 0.3, 1.2); tw.rotation.z = -t * 4;
      const k = u < 0.5 ? 0 : 1; if (k === 0) cam(ctx, V(-0.6, 1.8, 1.0), V(-0.7, 1.75, 0.8), V(-2.0, 1.7, 0), V(-2.0, 1.7, 0), u, 40); else cam(ctx, V(0.5, 2.2, 1.3), V(0.6, 2.2, 1.15), V(2.05, 2.15, 0), V(2.05, 2.15, 0), u, 40); };
    return r;
  },
  scatter(ctx) {
    const s = ctx.scene; outback(s, { target: V(0, 1, 6), sr: 14, clear: [0, 6, 16, 16] }); const gun = gunPost(s, 0, -1, 0); const d = digger(s, 0, -0.6, -2.0, 0.2); const tr = tracers(s, 14); const em = herd(s, 18, 0, 7, 4, 2, Math.PI, 52, 1.3); const du = dust(s, 36);
    em.forEach(e => { e.userData = { x0: e.g.position.x, z0: e.g.position.z, a: Math.atan2(e.g.position.x, e.g.position.z - 7) + (Math.random() - 0.5) * 0.6 }; });
    const r = (u, t) => { const go = u > 0.2; fire(gun, t, true); tr(t, V(0, 0.6, 0.2), V(0, 0.05, 1), 0.3, 18, true); aimGun(d); d.expr('angry');
      em.forEach(e => { const k = go ? (u - 0.2) * (ctx.shotDur ?? 2.5) : 0; if (!go) { e.stand(t); e.expr('shock'); e.g.position.y = Math.abs(Math.sin(t * 20)) * 0.15 * (u > 0.12 ? 1 : 0); return; } e.g.position.y = 0; e.run(t, 15); e.expr('shock'); e.g.rotation.y = e.userData.a; e.g.position.x = e.userData.x0 + Math.sin(e.userData.a) * k * 9; e.g.position.y = 0; e.g.position.z = e.userData.z0 + Math.cos(e.userData.a) * k * 9; });
      if (go) du(t, i => em[i % em.length].g.position, 1.6, 1, 2.0); ctx.shake = 0.3;
      cam(ctx, V(1.4, 1.5, -3.2), V(1.0, 1.8, -2.8), V(0, 1.2, 6), V(0, 1.2, 8), u, 55); };
    r.overlay = (g, W, H, u, T, t) => { if (u > 0.1 && u < 0.4) { qmarks(g, W, H, T, 0); } };
    return r;
  },
  scatter_top(ctx) {
    const s = ctx.scene; outback(s, { target: V(0, 0, 0), sr: 20, clear: [0, 0, 20, 20] }); const gun = gunPost(s, 0, 0, 0); const d = digger(s, 0, -0.5, -1.0, 0); const em = herd(s, 26, 0, 0, 6, 6, 0, 61, 1.6).filter(e => Math.hypot(e.g.position.x, e.g.position.z) > 2 || (e.g.visible = false)); const du = dust(s, 40);
    em.forEach(e => { const a = Math.atan2(e.g.position.x, e.g.position.z); e.userData = { a, r0: Math.hypot(e.g.position.x, e.g.position.z) + 3 }; });
    const r = (u, t) => { const k = t; gun.rotation.y = Math.sin(t * 5) * 1.5; fire(gun, t, true); d.expr('shock'); d.g.rotation.y = gun.rotation.y; flail(d, t, 0.5);
      em.forEach(e => { e.run(t, 15); e.expr('happy'); e.g.rotation.y = e.userData.a; const rr = e.userData.r0 - 2 + k * 2.6; e.g.position.set(Math.sin(e.userData.a) * rr, 0, Math.cos(e.userData.a) * rr); }); du(t, i => em[i % em.length].g.position, 1.6, 1, 2.4);
      cam(ctx, V(0.1, 12, 4), V(0.1, 16, 5), V(0, 0, 0), V(0, 0, 0), u, 50); };
    return r;
  },
  speedo(ctx) {
    const s = ctx.scene; outback(s, { target: V(0, 1, 0), sr: 10 }); const e = emu(s, 0, 0, Math.PI / 2); const du = dust(s, 20);
    const r = (u, t) => { e.run(t, 18); e.expr('smug'); e.look(1, 0); e.g.position.x = t * 14; du(t, i => V(e.g.position.x - 0.5 - (i % 5) * 0.6, 0, e.g.position.z), 2.5, 1, 1.5);
      const p = e.g.position; cam(ctx, V(p.x - 0.5, 1.6, 6.2), V(p.x - 0.5, 1.6, 6.2), V(p.x, 1.3, 0), V(p.x, 1.3, 0), u, 50); ctx.hand = 0.4; };
    r.overlay = (g, W, H, u, T, t) => { speedLines(g, W, H, T, 1, -1); gauge(g, W, H, 50 * ease(clamp(u * 2)), 60, clamp(u * 4), 0.5, 0.24); };
    return r;
  },
  // ---------- LASTWAGEN ----------
  truck(ctx) {
    const s = ctx.scene; outback(s, { target: V(0, 1, 0) }); const tk = makeTruck(); s.add(tk); const gun = makeLewis(); tk.add(gun); const d1 = digger(s, 0, 0, 0, Math.PI); tk.add(d1.g); d1.g.position.set(0.0, 0.95, -1.9); d1.g.rotation.y = 0; const d2 = digger(s, 1, -2.0, -0.5, 0.6);
    const r = (u, t) => { const k = ease(clamp(u * 1.8)); gun.position.set(0, 1.55 + (1 - k) * 1.5, -0.8 - (1 - k) * 1.6); gun.rotation.set(0, (1 - k) * 1.5, 0); d1.expr('grin'); d1.arms.forEach(a => a.sh.rotation.set(-1.4, 0, 0)); d2.expr('grin'); d2.arms[1].sh.rotation.set(0, 0, 2.6); talk(d2, t, 'grin');
      tk.position.z = u > 0.6 ? (u - 0.6) * 6 : 0; tk.userData.wheels.forEach(w => w.rotation.x = tk.position.z * 2);
      cam(ctx, V(-4.5, 2.6, 4.2), V(-4.0, 2.4, 5.4), V(0, 1.3, -0.5), V(0, 1.3, 0.8), u, 50); };
    r.overlay = (g, W, H, u, T, t) => { if (u > 0.3) { const k = (u - 0.3) * 4; chip(g, W, H, 'NEUER PLAN!', '#20a35a', W / 2, H * 0.2, k, 0.055); } };
    return r;
  },
  truck_bumpy(ctx) {
    const s = ctx.scene; outback(s, { target: V(0, 1, 0), sr: 12 }); const tk = makeTruck(); s.add(tk); const gun = makeLewis(); gun.position.set(0, 1.55, -0.8); tk.add(gun); const d1 = digger(s, 0, 0, 0, 0); tk.add(d1.g); d1.g.position.set(0, 0.95, -1.9); const tr = tracers(s, 12); const du = dust(s, 24);
    const r = (u, t) => { const z = t * 6; tk.position.set(0, Math.abs(Math.sin(t * 9)) * 0.35, z); tk.rotation.set(Math.sin(t * 7) * 0.12, 0, Math.sin(t * 11) * 0.1); tk.userData.wheels.forEach(w => w.rotation.x = z * 2.2); d1.g.position.y = 0.95 + Math.abs(Math.sin(t * 9 + 1)) * 0.35; d1.expr('shock'); aimGun(d1); tremble(d1, t, 3);
      gun.rotation.set(Math.sin(t * 13) * 0.4, Math.sin(t * 8) * 0.6, 0); fire(gun, t, true); const gp = gun.getWorldPosition(V(0, 0, 0)); const gd = V(0, 0, 1).applyQuaternion(gun.getWorldQuaternion(new THREE.Quaternion())); tr(t, gp, gd, 0.2, 20, true); du(t, i => V((i % 2 ? 0.8 : -0.8), 0, z - 2.5 - (i % 4) * 0.5), 2, 1, 1.8);
      cam(ctx, V(3.2, 2.6, z + 5.5), V(3.0, 2.5, z + 5.0), V(0, 1.6, z - 0.5), V(0, 1.6, z - 0.5), u, 55); ctx.shake = 0.4; };
    r.overlay = (g, W, H, u, T, t) => { qmarks(g, W, H, T, (u - 0.3) * 2, 0.72, 0.22); };
    return r;
  },
  emu_overtake(ctx) {
    const s = ctx.scene; outback(s, { target: V(0, 1, 0), sr: 12 }); const tk = makeTruck(); s.add(tk); const d1 = digger(s, 0, 0, 0, 0); tk.add(d1.g); d1.g.position.set(0, 0.95, -1.9); const gun = makeLewis(); gun.position.set(0, 1.55, -0.8); tk.add(gun); const e = emu(s, 2.4, -5, 0); const du = dust(s, 24);
    const r = (u, t) => { const z = t * 4; tk.position.set(0, Math.abs(Math.sin(t * 9)) * 0.25, z); tk.rotation.z = Math.sin(t * 11) * 0.06; tk.userData.wheels.forEach(w => w.rotation.x = z * 2.2); d1.expr('sad'); d1.look(1, 0); d1.head.rotation.y = -0.6 + u * 1.2;
      e.run(t, 16); e.g.position.z = -5 + t * 9; e.expr('smug'); e.head.rotation.y = -0.7; e.look(-1, 0); du(t, i => i % 2 ? e.g.position : V((i % 4 < 2 ? 0.8 : -0.8), 0, z - 2.5), 2, 1, 1.8);
      cam(ctx, V(7.5, 2.2, z + 1), V(7.5, 2.2, z + 3), V(1.2, 1.5, z - 0.5), V(1.6, 1.6, z + 4), u, 55); };
    r.overlay = (g, W, H, u, T, t) => { if (u > 0.5) bubble(g, W, H, 'TSCHÜSS!', (u - 0.5) * 2.2, 0.66, 0.24); };
    return r;
  },
  // ---------- RÜCKZUG ----------
  retreat(ctx) {
    const s = ctx.scene; outback(s, { ...DUSK, target: V(0, 1, 0), clear: [0, 0, 10, 10] }); const me = meredith(s, 0, 0, 0); const ds = [digger(s, 0, -1.1, -0.6, 0), digger(s, 1, 1.1, -0.5, 0)]; const gun = makeLewis(); ds[0].arms[1].hand.add(gun); gun.position.set(0, -0.1, 0.1); gun.rotation.set(1.2, 0, 0); gun.scale.setScalar(0.8);
    const em = herd(s, 8, 0, -7, 5, 1.5, 0, 72, 1.4);
    const r = (u, t) => { [me, ...ds].forEach((c, i) => { walk(c, t + i, 5); c.expr('sad'); c.g.position.z = (i ? -0.55 : 0) + t * 0.9; c.head.rotation.x = 0.3; }); em.forEach(e => { e.stand(t); e.expr('smug'); e.head.rotation.y = 0; }); ctx.grade = 'warm'; const z = t * 0.9;
      cam(ctx, V(0.6, 1.7, z + 5.5), V(0.4, 1.8, z + 5.0), V(0, 1.4, z - 2), V(0, 1.5, z - 3), u, 50); };
    r.overlay = (g, W, H, u, T, t) => { if (u > 0.2) haha(g, W, H, T, t - 0.3, 'BYE BYE!', [[0.3, 0.22, -0.15, 0.1], [0.72, 0.28, 0.15, 0.5]]); };
    return r;
  },
  newspaper(ctx) {
    const s = ctx.scene; outback(s, { target: V(0, 1, -3) }); const np = L.makeNewspaper('EMUS SCHLAGEN DIE ARMEE!', 'OUTBACK NEWS', 'AUSTRALIEN — 1932'); np.position.set(0, 1.5, -2); s.add(np);
    const r = (u, t) => { np.rotation.set(0, Math.sin(t * 2) * 0.1, (1 - ease(clamp(u * 2))) * 6); np.scale.setScalar(0.3 + 0.7 * ease(clamp(u * 2))); cam(ctx, V(0, 1.5, -0.7), V(0, 1.5, -0.85), V(0, 1.5, -2), V(0, 1.5, -2), u, 50); };
    r.overlay = (g, W, H, u, T, t) => { if (u > 0.45) haha(g, W, H, T, t - (ctx.d45 ?? 1.0)); };
    return r;
  },
  second_try(ctx) {
    const s = ctx.scene; outback(s, { target: V(0, 1, 4), clear: [0, 4, 14, 14] }); const g1 = gunPost(s, -1.2, 0, 0.1), g2 = gunPost(s, 1.2, 0, -0.1); const d1 = digger(s, 0, -1.6, -1.0, 0.1), d2 = digger(s, 1, 1.6, -1.0, -0.1); const me = meredith(s, 0, -2.2, 0); const tr = tracers(s, 16); const em = herd(s, 10, 0, 12, 8, 3, Math.PI, 81, 1.6); const du = dust(s, 24);
    const r = (u, t) => { fire(g1, t, true); fire(g2, t + 0.03, true); tr(t, V(0, 0.6, 0.5), V(0, 0.05, 1), 0.35, 20, true); [d1, d2].forEach(c => { aimGun(c); c.expr('angry'); }); me.pose('point'); talk(me, t, 'angry');
      em.forEach((e, i) => { e.run(t, 14); e.g.rotation.y = Math.PI / 2 * (i % 2 ? 1 : -1); e.g.position.x = e.userData.x0 + (i % 2 ? 1 : -1) * t * 5; e.expr('happy'); }); du(t, i => em[i % em.length].g.position, 1.6, 1, 2); ctx.shake = 0.3;
      cam(ctx, V(-6.5, 2.2, -4.2), V(-5.8, 2.3, -3.4), V(0.5, 1.1, 2), V(0.5, 1.2, 4), u, 55); };
    r.overlay = (g, W, H, u, T, t) => chip(g, W, H, '2. VERSUCH', '#b3202a', W / 2, H * 0.2, (t - 0.15) * 3, 0.055);
    return r;
  },
  ammo_empty(ctx) {
    const s = ctx.scene; outback(s, { target: V(0, 0.4, 0) }); const bx = []; for (let i = 0; i < 6; i++) { const b = ammoBox(); b.position.set(-1.2 + (i % 3) * 0.8, 0, -0.6 + Math.floor(i / 3) * 0.9); b.rotation.y = (i * 0.7) % 1 - 0.5; s.add(b); bx.push(b); } shells(s, 220, 0, 0.2, 1.3); const d = digger(s, 1, 1.6, -0.2, -0.5);
    const r = (u, t) => { d.expr('sad'); d.pose('stand'); d.head.rotation.x = 0.4; d.arms[0].sh.rotation.set(-0.3, 0, -0.9); d.arms[1].sh.rotation.set(-0.3, 0, 0.9);
      cam(ctx, V(-0.5, 2.4, 3.6), V(0.2, 2.0, 3.2), V(0, 0.4, 0), V(0.4, 0.8, 0), u, 50); };
    r.overlay = (g, W, H, u, T, t) => counter(g, W, H, 'SCHUSS VERBRAUCHT', 9860 * ease(clamp(u * 1.3)), clamp(u * 5), '#FF453A', 0.22);
    return r;
  },
  emus_still(ctx) {
    const s = ctx.scene; outback(s, { farm: [8, -14, -0.4], wheat: { n: 4000, r: [-8, 8, -8, 0], mask: (x, z) => (Math.sin(x * 0.9) + Math.cos(z * 1.1)) > -0.2 }, target: V(0, 1, -3), sr: 10 }); const em = herd(s, 14, 0, -3, 6, 3.5, 0.0, 91, 1.4); const f = farmer(s, 4.2, 1.2, -0.6);
    const r = (u, t) => { em.forEach((e, i) => { if (i % 3 === 0) e.peck(t + i, 4); else e.stand(t); e.expr(i % 2 ? 'smug' : 'happy'); }); f.expr('sad'); f.arms[0].sh.rotation.set(-2.2, 0.4, 0); f.arms[0].el.rotation.x = -2.0; f.head.rotation.x = 0.25;
      cam(ctx, V(-6, 2.6, 6), V(2, 2.4, 6.5), V(-2, 1.4, -3), V(2, 1.4, -3), u, 50); };
    r.overlay = (g, W, H, u, T, t) => { chip(g, W, H, 'IMMER NOCH DA', '#7a5a2a', W / 2, H * 0.2, (u - 0.3) * 3, 0.055); };
    return r;
  },
  major_quote(ctx) {
    const s = ctx.scene; outback(s, { ...DUSK, target: V(0, 1, 0) }); const me = meredith(s, 0, 0, 0); const e = emu(s, -2.2, -2.5, 0.4);
    const r = (u, t) => { me.expr('shock'); me.look(-0.6, 0); salute(me, clamp(u * 3 - 0.6)); e.stand(t); e.expr('smug'); e.look(1, 0); ctx.grade = 'warm';
      cam(ctx, V(0.9, 1.7, 3.0), V(0.6, 1.8, 2.4), V(-0.4, 1.7, 0), V(-0.5, 1.75, 0), u, 50); };
    r.overlay = (g, W, H, u, T, t) => { const k = clamp(t * 3); if (k <= 0) return; g.save(); g.globalAlpha = k; g.fillStyle = 'rgba(15,12,8,0.6)'; g.beginPath(); g.roundRect(W * 0.07, H * 0.11, W * 0.86, H * 0.17, W * 0.04); g.fill(); g.font = `900 ${W * 0.16}px Georgia`; g.fillStyle = '#FFD60A'; g.fillText('“', W * 0.1, H * 0.19); g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = `800 ${W * 0.048}px "Inter Display"`; g.fillText('MIT SOLDATEN WIE DIESEN', W / 2, H * 0.165); g.fillText('VÖGELN …', W / 2, H * 0.2); g.font = `700 ${W * 0.032}px "Inter Display"`; g.fillStyle = '#e9c76a'; g.fillText('— MAJOR MEREDITH (SINNGEMÄSS)', W / 2, H * 0.25); g.restore(); };
    return r;
  },
  emu_army(ctx) {
    const s = ctx.scene; outback(s, { ...DUSK, target: V(0, 1, 0), clear: [0, 0, 14, 14], sr: 12 }); const em = []; for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) { const e = emu(s, -4 + c * 2, -r * 2.2, 0); slouchHat(e.head, 0x8a7048, 0.1, 0.55); em.push(e); }
    const r = (u, t) => { em.forEach((e, i) => { e.run(t, 7, 0.6); e.g.position.z = -Math.floor(i / 5) * 2.2 + t * 1.6; e.expr('angry'); e.look(0, 0); }); ctx.grade = 'warm';
      cam(ctx, V(0.5, 1.0, 6.5), V(0.5, 1.2, 6.5 + 1.6 * 3), V(0, 1.9, 0), V(0, 1.9, 3), u, 55); };
    return r;
  },
  finale_title(ctx) {
    const s = ctx.scene; outback(s, { ...DUSK, target: V(0, 1, 0), clear: [0, 0, 10, 10] }); const tk = makeTruck(); tk.rotation.y = -0.5; s.add(tk); const e = emu(s, 0, 0, 0); tk.add(e.g); e.g.position.set(0, 0.95, -1.4); e.g.rotation.y = 0.5; slouchHat(e.head, 0x8a7048, 0.1, 0.55); const em = herd(s, 8, 0, -6, 6, 2, 0, 101, 1.5);
    const r = (u, t) => { ctx.grade = 'warm'; ctx.flash = clamp(1 - t * 4) * 0.7; e.stand(t); e.expr('smug'); e.head.rotation.y = 0; em.forEach(b => { b.stand(t); b.expr('smug'); }); cam(ctx, V(0.8, 1.6, 4.5), V(1.6, 3.4, 10.5), V(0, 2.0, -0.5), V(0, 4.5, -6), u, 55); };
    r.overlay = (g, W, H, u, T, t) => { bigText(g, '1932', W / 2, H * 0.15, W * 0.2, t / 1.2); bigText(g, 'DER GROSSE', W / 2, H * 0.235, W * 0.09, t / 1.2 - 0.15); bigText(g, 'EMU-KRIEG', W / 2, H * 0.29, W * 0.12, t / 1.2 - 0.25);
      if (t > 0.9) { g.save(); g.globalAlpha = clamp((t - 0.9) * 3); g.font = `800 ${W * 0.042}px "Inter Display"`; g.textAlign = 'center'; g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 12; g.fillText('EINE WAHRE GESCHICHTE', W / 2, H * 0.34); g.restore(); } };
    return r;
  },
  question(ctx) {
    const s = ctx.scene; outback(s, { top: '#1b1a4b', mid: '#b35a5a', bot: '#f2a86a', fog: 0xd88a60, sun: 0xffa060, dir: [-8, 3, -12], sunCol: '#ffbf7a', si: 1.6, hill: 0x7a3a3a, target: V(0, 1, 0), clear: [0, 0, 8, 8] }); const me = meredith(s, -1.0, 0, 0.3); const e = emu(s, 1.1, -0.3, -0.3);
    const r = (u, t) => { me.expr('angry'); me.look(0.6, 0); crossArms(me); e.stand(t); e.head.rotation.y = -0.3; e.expr('smug'); e.look(-0.6, 0); ctx.grade = 'warm';
      cam(ctx, V(0.2, 1.4, 5.8), V(0.1, 1.7, 7.0), V(0, 2.4, 0), V(0, 4.5, -12), u, 55); };
    r.overlay = (g, W, H, u, T, t) => {
      const k = clamp(t * 3); if (k <= 0) return; const e2 = 1 - Math.pow(1 - k, 3);
      g.save(); g.globalAlpha = e2; g.fillStyle = 'rgba(10,12,30,0.55)'; g.beginPath(); g.roundRect(W * 0.06, H * 0.1, W * 0.88, H * 0.27, W * 0.05); g.fill(); g.restore();
      g.save(); g.translate(W / 2, H * 0.165); g.scale(0.8 + 0.2 * e2, 0.8 + 0.2 * e2); g.globalAlpha = e2; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      const line = (txt, y, size, col) => { g.font = `900 ${size}px "Inter Display"`; g.lineWidth = size * 0.18; g.strokeStyle = '#000'; g.strokeText(txt, 0, y); g.fillStyle = col; g.fillText(txt, 0, y); };
      line('WER HÄTTE', 0, W * 0.075, '#fff'); line('GEWONNEN?', W * 0.1, W * 0.09, '#FFD60A'); g.restore();
      const b = clamp(t * 3 - 1.2); if (b > 0) { const pulse = 1 + 0.05 * Math.sin(T * 8);
        [['ARMEE', '#2a6fb0', -1], ['EMUS', '#e8902a', 1]].forEach(([tx, c, sx]) => { g.save(); g.translate(W / 2 + sx * W * 0.2, H * 0.43 - W * 0.12); g.scale(b * pulse, b * pulse); g.fillStyle = c; g.strokeStyle = '#000'; g.lineWidth = W * 0.008; g.beginPath(); g.roundRect(-W * 0.17, -W * 0.06, W * 0.34, W * 0.12, W * 0.06); g.fill(); g.stroke(); g.fillStyle = '#fff'; g.font = `900 ${W * 0.06}px "Inter Display"`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(tx, 0, 4); g.restore(); });
        g.save(); g.globalAlpha = b; g.font = `800 ${W * 0.042}px "Inter Display"`; g.textAlign = 'center'; g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = 10; g.fillText('SCHREIB ES IN DIE KOMMENTARE', W / 2, H * 0.5 - W * 0.12); g.restore(); }
    };
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
