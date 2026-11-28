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

// ================= VIDEO 06 – Pickles & der WM-Pokal (London 1966) =================
const R_ = () => L.RNG();
const DAVID = { skin: 0xf2c4a0, shirt: 0x4a6b8f, sleeve: 0x4a6b8f, pants: 0x3a3a44, hair: 0x2a1a10, mustache: false, shoes: 0x2a1a10, armSkin: false };
const BOBBY = { skin: 0xe9b48c, shirt: 0x1b2340, sleeve: 0x1b2340, pants: 0x1b2340, hair: 0x3a2a1a, mustache: true, armSkin: false, shoes: 0x0a0a0a };
const BOBBY2 = { ...BOBBY, skin: 0xf3c7a8, hair: 0xb07a3a, mustache: false };
const GUARD = { skin: 0xf0c09a, shirt: 0x4a5560, sleeve: 0x4a5560, pants: 0x2f353c, hair: 0x9a9a9a, mustache: true, armSkin: false, badge: true, belly: true };
const GUARD2 = { ...GUARD, skin: 0xe2a77f, hair: 0x3a2a1a, belly: false, mustache: false };
const THIEF = { skin: 0xe2b090, shirt: 0x2a2a30, sleeve: 0x2a2a30, pants: 0x1a1a1e, hair: 0x111111, mustache: true, armSkin: false, shoes: 0x111111 };
const BLACKMAILER = { skin: 0xeab890, shirt: 0xb09a6a, sleeve: 0xb09a6a, pants: 0x5a4a3a, hair: 0x3a3a3a, suit: true, tie: 0x5a1a1a, mustache: true, armSkin: false };
const DETECTIVE = { skin: 0xf0c8a8, shirt: 0x5a4632, sleeve: 0x5a4632, pants: 0x5a4632, hair: 0x6a4a2a, suit: true, tie: 0x1d2a44, mustache: false, armSkin: false };
const OFFICIAL = { skin: 0xf2b48e, shirt: 0x3a3c44, sleeve: 0x3a3c44, pants: 0x3a3c44, hair: 0xd0d0d0, suit: true, tie: 0x9b1d2a, glasses: true, belly: true, armSkin: false };
const CIVS = [{ skin: 0xf3c7a8, shirt: 0x8a6a3a, sleeve: 0x8a6a3a, pants: 0x3a3a3a, hair: 0x5a3a1a, suit: true, tie: 0x2a2a6a, armSkin: false, hat: 'bowler' },
  { ...WIFE, dress: 0xd9822b, shirt: 0xd9822b, sleeve: 0xd9822b, hair: 0xc9952b },
  { skin: 0xc68a5e, shirt: 0x2e7d6b, sleeve: 0x2e7d6b, pants: 0x2a2a2a, hair: 0x111111, mustache: false, armSkin: false },
  { ...WIFE, dress: 0x3a6fb0, shirt: 0x3a6fb0, sleeve: 0x3a6fb0, hair: 0x2a1a10, skin: 0xe8b08a },
  { skin: 0xf0c09a, shirt: 0x5a5a5a, sleeve: 0x5a5a5a, pants: 0x5a5a5a, hair: 0xdddddd, suit: true, tie: 0x8a1a1a, armSkin: false, glasses: true, hat: 'fedora' }];
const ENG = i => ({ skin: [0xf3c7a8, 0xe9b48c, 0xf6c9a5, 0xf0c09a][i % 4], shirt: 0xd0202a, sleeve: 0xd0202a, pants: 0xf4f4f4, hair: [0x2a1a10, 0xc9952b, 0x5a3a1a, 0x111111][i % 4], mustache: false, shoes: 0x111111 });
const GER = i => ({ skin: [0xf3c7a8, 0xe9b48c, 0xf6c9a5][i % 3], shirt: 0xf6f6f6, sleeve: 0xf6f6f6, pants: 0x111111, hair: [0x5a3a1a, 0xc9952b, 0x2a1a10][i % 3], mustache: false, shoes: 0x111111 });

function bobbyHelmet(c) { const h = new THREE.Group(); h.position.set(0, 0.2, -0.01); c.head.add(h); const m = L.mat(0x141a2e, { r: 0.45, fab: true });
  const d = L.mesh(new THREE.SphereGeometry(0.345, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), m, 0, 0, 0, h); d.scale.set(1, 1.5, 1.08);
  L.mesh(new THREE.TorusGeometry(0.35, 0.035, 8, 32), m, 0, 0.01, 0, h).rotation.x = Math.PI / 2;
  const sil = L.mat(0xd8dde2, { m: 0.9, r: 0.25 }); L.mesh(L.sph(0.045, 12), sil, 0, 0.53, 0, h);
  const st = L.mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.02, 8), sil, 0, 0.2, 0.33, h); st.rotation.x = Math.PI / 2 - 0.3; return h; }
function bobby(s, x, z, ry = 0, i = 0) { const c = guy(s, i % 2 ? BOBBY2 : BOBBY, x, 0, z, ry); c.hat = bobbyHelmet(c); for (let k = 0; k < 4; k++) L.mesh(L.sph(0.018, 8), L.mat(0xd8dde2, { m: 0.9, r: 0.25 }), 0, 1.24 - k * 0.12, 0.215, c.g); return c; }
function guard(s, x, z, ry = 0, i = 0) { const c = guy(s, i ? GUARD2 : GUARD, x, 0, z, ry); CAPHAT(c, 0x2a3038); return c; }
function thief(s, x, z, ry = 0) { const c = guy(s, THIEF, x, 0, z, ry); c.hat = L.flatCap(c.head, 0x2a2a2a); return c; }
function civ(s, i, x, z, ry = 0) { return person(s, CIVS[i % CIVS.length], x, 0, z, ry); }
function tiptoe(c, t, sp = 6) { c.legs.forEach((l, i) => { l.hip.rotation.x = Math.sin(t * sp + i * Math.PI) * 0.45 - 0.1; l.knee.rotation.x = 0.4 + Math.max(0, Math.sin(t * sp + i * Math.PI)) * 0.7; }); c.g.position.y = Math.abs(Math.sin(t * sp)) * 0.05; c.body.rotation.x = 0.18; }

// ---- Pickles (black & white collie mix)
function makeDog(o = {}) {
  const g = new THREE.Group(); const blk = L.mat(0x1d1b1e, { r: 0.8, fab: true }), wht = L.mat(0xf4f1ea, { r: 0.85, fab: true }), tan = L.mat(0xc0783a, { r: 0.8, fab: true });
  const nm = L.mat(0x0c0c0c, { r: 0.12, phys: true, cc: 1 }), pink = L.mat(0xe8707e, { r: 0.45, phys: true, cc: 0.6 }), dark = L.mat(0x3a0d12, { r: 0.9 });
  const body = new THREE.Group(); body.position.y = 0.48; g.add(body);
  const torso = L.mesh(L.cap(0.19, 0.4), blk, 0, 0, 0, body); torso.rotation.x = Math.PI / 2;
  const chest = L.mesh(L.sph(0.16, 24), wht, 0, -0.03, 0.24, body); chest.scale.set(0.95, 1.15, 0.85);
  const belly = L.mesh(L.sph(0.15, 24), wht, 0, -0.09, 0.02, body); belly.scale.set(0.85, 0.6, 1.7);
  const neck = new THREE.Group(); neck.position.set(0, 0.08, 0.3); body.add(neck);
  const nk = L.mesh(L.cap(0.1, 0.14), blk, 0, 0.1, 0.03, neck); nk.rotation.x = 0.45;
  const nkw = L.mesh(L.cap(0.085, 0.1), wht, 0, 0.06, 0.08, neck); nkw.rotation.x = 0.45;
  const collar = L.mesh(new THREE.TorusGeometry(0.105, 0.022, 8, 24), L.mat(o.collar ?? 0xd62828, { r: 0.35, phys: true, cc: 0.6 }), 0, 0.1, 0.04, neck); collar.rotation.x = Math.PI / 2 + 0.45;
  const tag = L.mesh(L.cyl(0.03, 0.03, 0.008, 16), L.mat(0xf2c14e, { m: 1, r: 0.2 }), 0, 0.02, 0.15, neck); tag.rotation.x = Math.PI / 2 + 0.3;
  const head = new THREE.Group(); head.position.set(0, 0.22, 0.08); head.scale.setScalar(1.25); neck.add(head);
  L.mesh(L.sph(0.16, 32), blk, 0, 0, 0, head).scale.set(1, 0.95, 1);
  const blaze = L.mesh(L.sph(0.05, 16), wht, 0, 0.07, 0.125, head); blaze.scale.set(0.5, 1.7, 0.5);
  const muz = L.mesh(L.sph(0.095, 24), wht, 0, -0.05, 0.14, head); muz.scale.set(0.85, 0.72, 1.15);
  L.mesh(L.sph(0.034, 16), nm, 0, -0.015, 0.25, head).scale.set(1.35, 1, 1);
  const jaw = new THREE.Group(); jaw.position.set(0, -0.08, 0.1); head.add(jaw);
  L.mesh(L.sph(0.07, 16), wht, 0, -0.01, 0.06, jaw).scale.set(0.8, 0.45, 1.1);
  const mouthIn = L.mesh(L.sph(0.06, 16), dark, 0, 0.014, 0.06, jaw); mouthIn.scale.set(0.75, 0.3, 1.0);
  const tongue = L.mesh(L.cap(0.035, 0.07), pink, 0, -0.03, 0.13, jaw); tongue.rotation.x = 1.25; tongue.scale.set(1.2, 1, 0.5);
  const pupils = [], brows = [];
  for (const sx of [-1, 1]) {
    const ew = L.mesh(L.sph(0.05, 24), L.mat(0xffffff, { r: 0.2 }), sx * 0.066, 0.035, 0.122, head); ew.scale.set(1, 1.1, 0.7);
    const pu = new THREE.Group(); pu.position.set(sx * 0.066, 0.035, 0.148); head.add(pu); pu.userData.x0 = sx * 0.066;
    L.mesh(L.sph(0.029, 16), L.mat(0x2a1a10, { r: 0.1, phys: true, cc: 1 }), 0, 0, 0, pu); L.mesh(L.sph(0.009, 8), L.mat(0xffffff, { e: 0xffffff, ei: 1 }), 0.01, 0.012, 0.024, pu);
    const br = L.mesh(L.sph(0.022, 12), tan, sx * 0.062, 0.1, 0.125, head); br.scale.set(1.4, 0.7, 0.6); brows.push(br); pupils.push(pu);
  }
  const ears = []; for (const sx of [-1, 1]) { const p = new THREE.Group(); p.position.set(sx * 0.11, 0.11, -0.02); head.add(p); const e = L.mesh(L.sph(0.075, 16), blk, sx * 0.02, -0.07, 0, p); e.scale.set(0.45, 1.25, 0.9); ears.push(p); }
  const legs = []; for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { const hp = new THREE.Group(); hp.position.set(sx * 0.1, -0.06, sz * 0.2); body.add(hp);
    if (sz < 0) L.mesh(L.sph(0.11, 16), blk, 0, -0.04, 0, hp).scale.set(0.75, 1, 1.1);
    L.mesh(L.cap(0.055, 0.2), sz > 0 ? wht : blk, 0, -0.17, 0, hp); L.mesh(L.cap(0.05, 0.12), wht, 0, -0.32, 0, hp);
    L.mesh(L.sph(0.058, 16), wht, 0, -0.4, 0.03, hp).scale.set(1, 0.65, 1.35); legs.push(hp); }
  const tail = new THREE.Group(); tail.position.set(0, 0.08, -0.36); body.add(tail);
  L.mesh(L.cap(0.05, 0.16), blk, 0, 0.1, -0.05, tail).rotation.x = -0.5; L.mesh(L.cap(0.045, 0.12), wht, 0, 0.23, -0.13, tail).rotation.x = -0.9;
  const d = { g, body, neck, head, jaw, tongue, ears, legs, tail, pupils, brows, tag };
  d.look = (x, y) => pupils.forEach(p => { p.position.x = p.userData.x0 + x * 0.016; p.position.y = 0.035 + y * 0.016; });
  d.reset = () => { body.rotation.set(0, 0, 0); body.position.set(0, 0.48, 0); body.scale.set(1, 1, 1); neck.rotation.set(0, 0, 0); head.rotation.set(0, 0, 0); head.position.set(0, 0.22, 0.08); legs.forEach(l => l.rotation.set(0, 0, 0)); jaw.rotation.x = 0; tongue.visible = mouthIn.visible = false; ears.forEach((e, i) => e.rotation.set(0, 0, (i ? 1 : -1) * 0.35)); brows.forEach(b => b.position.y = 0.1); };
  d.wag = (t, sp = 14, a = 0.55) => tail.rotation.set(-0.2, Math.sin(t * sp) * a, 0);
  d.pant = (t, k = 1) => { jaw.rotation.x = (0.32 + Math.sin(t * 18) * 0.06) * k; tongue.visible = mouthIn.visible = k > 0; };
  d.happy = (t) => { d.pant(t); brows.forEach(b => b.position.y = 0.115); };
  d.stand = (t) => { d.reset(); d.wag(t, 10, 0.4); body.scale.y = 1 + Math.sin(t * 3) * 0.012; };
  d.walk = (t, sp = 9, k = 1) => { d.reset(); legs.forEach((l, i) => l.rotation.x = Math.sin(t * sp + [0, Math.PI, Math.PI, 0][i]) * 0.55 * k); body.position.y = 0.48 + Math.abs(Math.sin(t * sp)) * 0.025 * k; head.rotation.x = Math.sin(t * sp * 2) * 0.03; d.wag(t, 12, 0.35); ears.forEach((e, i) => e.rotation.x = Math.sin(t * sp * 2 + i) * 0.15); };
  d.run = (t, sp = 15) => { d.walk(t, sp, 1.5); body.rotation.x = Math.sin(t * sp) * 0.06; ears.forEach(e => e.rotation.x = -0.6); };
  d.sniff = (t) => { d.reset(); neck.rotation.x = 0.95; head.rotation.x = 0.35; head.rotation.y = Math.sin(t * 2.5) * 0.25; head.position.z = 0.08 + Math.sin(t * 22) * 0.008; d.wag(t, 16, 0.5); legs[0].rotation.x = legs[1].rotation.x = 0.15; body.rotation.x = 0.12; body.position.y = 0.45; };
  d.sit = (t) => { d.reset(); body.rotation.x = -0.35; body.position.y = 0.47; legs[0].rotation.x = legs[1].rotation.x = 0.35; legs[2].rotation.x = legs[3].rotation.x = -0.25; neck.rotation.x = 0.2; d.wag(t, 9, 0.3); };
  d.reset(); return d;
}
function dog(s, x, z, ry = 0, sc = 1) { const d = makeDog(); d.g.position.set(x, 0, z); d.g.rotation.y = ry; d.g.scale.setScalar(sc); s.add(d.g); return d; }
function leash(s, col = 0xb3202a) { const m = L.mat(col, { r: 0.5 }); let me = null; const a = V(0, 0, 0), b = V(0, 0, 0);
  return (from, to, sag = 0.25) => { if (me) { s.remove(me); me.geometry.dispose(); } s.updateMatrixWorld(true); from.getWorldPosition(a); to.getWorldPosition(b); const mid = a.clone().lerp(b, 0.5); mid.y -= sag; me = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 16, 0.014, 6), m); s.add(me); }; }

// ---- the trophy (generic golden winged-figure cup on a blue base)
function makeCup(sc = 1) {
  const g = new THREE.Group(); g.scale.setScalar(sc); const gm = L.mat(0xf3c24a, { m: 1, r: 0.16, env: 1.7 }), lap = L.mat(0x1f3f99, { r: 0.22, phys: true, cc: 1, env: 1.2 });
  L.mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.1, 8), lap, 0, 0.05, 0, g); L.mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.03, 8), gm, 0, 0.115, 0, g);
  const pts = [[0.085, 0], [0.07, 0.025], [0.045, 0.08], [0.035, 0.15], [0.045, 0.22], [0.05, 0.25], [0.035, 0.28], [0.02, 0.29], [0.001, 0.295]].map(([x, y]) => new THREE.Vector2(x, y));
  L.mesh(new THREE.LatheGeometry(pts, 24), gm, 0, 0.13, 0, g); L.mesh(L.sph(0.03, 16), gm, 0, 0.44, 0.03, g);
  const ws = new THREE.Shape(); ws.moveTo(0, 0); ws.quadraticCurveTo(0.06, 0.04, 0.12, 0.2); ws.quadraticCurveTo(0.08, 0.17, 0.05, 0.14); ws.quadraticCurveTo(0.04, 0.08, 0, 0.05); ws.lineTo(0, 0);
  const wg = new THREE.ExtrudeGeometry(ws, { depth: 0.012, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 2 });
  for (const sx of [-1, 1]) { const w = L.mesh(wg, gm, sx * 0.02, 0.3, -0.03, g); w.scale.x = sx; w.rotation.y = sx * -0.3; }
  for (const sx of [-1, 1]) { const a = L.mesh(L.cyl(0.012, 0.012, 0.12, 8), gm, sx * 0.05, 0.47, 0.02, g); a.rotation.z = sx * 0.4; }
  L.mesh(new THREE.CylinderGeometry(0.11, 0.06, 0.1, 8, 1, true), L.mat(0xf3c24a, { m: 1, r: 0.16, env: 1.7, ds: true }), 0, 0.56, 0.02, g);
  L.mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.01, 8), gm, 0, 0.51, 0.02, g); L.mesh(new THREE.TorusGeometry(0.105, 0.008, 6, 8), gm, 0, 0.61, 0.02, g).rotation.x = Math.PI / 2;
  return g;
}
function cupGlint(s, cup, n = 3) { const sp = []; for (let i = 0; i < n; i++) sp.push(sparkle(s, 0xfff2c0, 0.3)); return t => { cup.updateMatrixWorld(true); const p = V(0, 0, 0); cup.getWorldPosition(p); const sc = cup.getWorldScale(V(0, 0, 0)).x; sp.forEach((x, i) => { const k = (t * 0.9 + i / n) % 1; x.position.set(p.x + Math.sin(i * 2.4) * 0.09 * sc, p.y + (0.25 + i * 0.12) * sc, p.z + 0.12 * sc); x.scale.setScalar(Math.sin(k * Math.PI) * 0.35 * sc + 0.001); x.material.rotation = t * 2 + i; }); }; }
function vitrine(s, x, z, withCup = true) { const g = new THREE.Group(); g.position.set(x, 0, z); s.add(g);
  L.mesh(L.box(0.8, 1.0, 0.8), L.mat(0x3a2418, { r: 0.4, phys: true, cc: 0.5 }), 0, 0.5, 0, g); const gm = L.mat(0xd9b44a, { m: 0.9, r: 0.3 }); L.mesh(L.box(0.84, 0.05, 0.84), gm, 0, 1.02, 0, g);
  L.mesh(L.box(0.5, 0.08, 0.5), L.mat(0x8a1a2a, { r: 0.9, fab: true }), 0, 1.08, 0, g);
  const gl = L.mesh(L.box(0.78, 0.85, 0.78), L.mat(0xe6f4ff, { t: 0.13, r: 0.02, phys: true, env: 1.6 }), 0, 1.47, 0, g); gl.castShadow = false;
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) L.mesh(L.box(0.03, 0.85, 0.03), gm, a * 0.39, 1.47, b * 0.39, g); L.mesh(L.box(0.82, 0.03, 0.82), gm, 0, 1.9, 0, g);
  let cup = null; if (withCup) { cup = makeCup(0.85); cup.position.set(0, 1.12, 0); g.add(cup); } g.userData.cup = cup; return g; }

// ---- London set pieces
let BRICK = null; const brickM = () => new THREE.MeshStandardMaterial({ map: BRICK || (BRICK = brickTex(3)), roughness: 0.9, envMapIntensity: 0.3 });
function terrace(s, x0, n, z, o = {}) { const g = new THREE.Group(); g.position.set(x0, 0, z); g.rotation.y = o.ry ?? 0; s.add(g); const bm = brickM(); const wf = L.mat(0xf4f1ea, { r: 0.6 }), gl = L.mat(o.night ? 0xffd27a : 0x2a3a5a, o.night ? { e: 0xffb050, ei: 1.2 } : { r: 0.1, phys: true, cc: 1, env: 1.2 }), roof = L.mat(0x4a4f58, { r: 0.7 });
  const doors = [0x1d3a6a, 0x8a1d22, 0x2d5a3a, 0x1a1a1a, 0xd9a520];
  for (let i = 0; i < n; i++) { const x = i * 5; L.mesh(L.box(5, 6, 5), bm, x, 3, -2.5, g);
    for (const [sz, rz] of [[-1.3, -0.6], [-3.7, 0.6]]) L.mesh(L.box(5.1, 0.15, 3.0), roof, x, 6.75, sz, g).rotation.x = rz;
    L.mesh(L.box(0.7, 1.4, 0.7), bm, x + 2.1, 7.3, -2.5, g); for (const cx of [-0.15, 0.15]) L.mesh(L.cyl(0.08, 0.08, 0.35, 10), L.mat(0xa85a3a), x + 2.1 + cx, 8.1, -2.5, g);
    for (const [wx, wy] of [[-1.2, 1.7], [-1.2, 4.3], [1.2, 4.3]]) { L.mesh(L.box(1.15, 1.55, 0.08), wf, x + wx, wy, 0.02, g); L.mesh(L.box(0.95, 1.35, 0.08), gl, x + wx, wy, 0.05, g); L.mesh(L.box(0.06, 1.35, 0.1), wf, x + wx, wy, 0.07, g); L.mesh(L.box(1.3, 0.1, 0.25), wf, x + wx, wy - 0.8, 0.1, g); }
    L.mesh(L.box(1.2, 2.3, 0.08), wf, x + 1.3, 1.15, 0.02, g); L.mesh(L.box(0.95, 2.1, 0.1), L.mat(doors[(i + (o.seed ?? 0)) % 5], { r: 0.35, phys: true, cc: 0.6 }), x + 1.3, 1.05, 0.05, g); L.mesh(L.sph(0.04, 8), L.mat(0xd9b44a, { m: 0.9, r: 0.3 }), x + 1.65, 1.05, 0.12, g);
    L.mesh(L.box(1.4, 0.15, 0.5), L.mat(0xd8d2c4), x + 1.3, 0.075, 0.25, g); }
  return g; }
function hedge(s, len, x, z, h = 1.1, seed = 3) { const g = new THREE.Group(); g.position.set(x, 0, z); s.add(g); L.reseed(seed); const m = L.mat(0x3d7a35, { r: 0.95 }), m2 = L.mat(0x4f8f3f, { r: 0.95 });
  L.mesh(L.box(len, h * 0.85, 0.8), m, 0, h * 0.42, 0, g); for (let i = 0; i < len * 4; i++) L.mesh(L.sph(0.22 + R_() * 0.12, 10), i % 2 ? m : m2, -len / 2 + R_() * len, h * (0.25 + R_() * 0.65), (R_() - 0.5) * 0.85, g); return g; }
function makeBus(dest = 'WEMBLEY') { const g = new THREE.Group(); const red = L.mat(0xc8102e, { r: 0.4, phys: true, cc: 0.6 }), gl = L.mat(0x2a3a4a, { r: 0.1, phys: true, cc: 1, env: 1.2 }), cream = L.mat(0xf0e6c8, { r: 0.6 }), blk = L.mat(0x151515, { r: 0.6 });
  L.mesh(L.box(8.4, 2.0, 2.5), red, 0, 1.45, 0, g); L.mesh(L.box(8.4, 1.9, 2.5), red, 0, 3.4, 0, g); L.mesh(L.box(8.42, 0.18, 2.52), cream, 0, 2.5, 0, g); L.mesh(L.box(8.2, 0.25, 2.4), red, 0, 4.45, 0, g);
  for (const z of [-1.26, 1.26]) for (let i = 0; i < 6; i++) { L.mesh(L.box(1.1, 0.8, 0.04), gl, -3.3 + i * 1.25, 1.9, z, g); L.mesh(L.box(1.1, 0.8, 0.04), gl, -3.3 + i * 1.25, 3.6, z, g); }
  L.mesh(L.box(0.04, 0.8, 2.0), gl, 4.21, 1.9, 0, g); L.mesh(L.box(0.04, 0.8, 2.0), gl, 4.21, 3.6, 0, g);
  const dt = L.canvasTex(256, 48, (c, w, h) => { c.fillStyle = '#111'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffd860'; c.font = '900 34px Inter Display'; c.textAlign = 'center'; c.fillText(dest, w / 2, 37); });
  const dp = L.mesh(new THREE.PlaneGeometry(1.6, 0.3), new THREE.MeshBasicMaterial({ map: dt }), 4.215, 4.2, 0, g); dp.rotation.y = Math.PI / 2;
  const wheels = []; for (const [x, z] of [[2.8, 1.1], [-2.6, 1.1], [2.8, -1.1], [-2.6, -1.1]]) { const w = L.mesh(L.cyl(0.5, 0.5, 0.35, 20), blk, x, 0.5, z, g); w.rotation.x = Math.PI / 2; wheels.push(w); }
  for (const z of [-0.9, 0.9]) L.mesh(L.sph(0.12, 12), L.mat(0xfff6c8, { e: 0xfff0a0, ei: 0.6 }), 4.22, 0.9, z, g); g.userData.wheels = wheels; return g; }
function phoneBox() { const g = new THREE.Group(); const red = L.mat(0xc8102e, { r: 0.4, phys: true, cc: 0.5 }), gl = L.mat(0xd6e6f0, { t: 0.4, r: 0.1 }); L.mesh(L.box(1.0, 2.5, 1.0), red, 0, 1.25, 0, g); L.mesh(L.box(1.1, 0.2, 1.1), red, 0, 2.6, 0, g); const top = L.mesh(L.cyl(0.05, 0.62, 0.3, 4), red, 0, 2.85, 0, g); top.rotation.y = Math.PI / 4;
  for (const [rx, x, z] of [[0, 0, 0.51], [Math.PI / 2, 0.51, 0], [-Math.PI / 2, -0.51, 0]]) { const p = new THREE.Group(); p.position.set(x, 0, z); p.rotation.y = rx; g.add(p); for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) L.mesh(L.box(0.22, 0.24, 0.02), gl, -0.25 + c * 0.25, 0.75 + r * 0.27, 0.01, p);
    const sg = L.mesh(new THREE.PlaneGeometry(0.8, 0.16), new THREE.MeshStandardMaterial({ map: L.canvasTex(256, 52, (c, w, h) => { c.fillStyle = '#f4f1ea'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; c.font = '900 34px Inter Display'; c.textAlign = 'center'; c.fillText('TELEPHONE', w / 2, 38); }), emissive: 0xffffff, emissiveIntensity: 0.25 }), 0, 2.6, 0.06, p); }
  return g; }
function pillarBox() { const g = new THREE.Group(); const red = L.mat(0xc8102e, { r: 0.35, phys: true, cc: 0.6 }); L.mesh(L.cyl(0.28, 0.3, 1.3, 24), red, 0, 0.65, 0, g); L.mesh(L.sph(0.3, 24), red, 0, 1.3, 0, g).scale.y = 0.5; L.mesh(L.box(0.3, 0.05, 0.05), L.mat(0x111111), 0, 1.05, 0.28, g); L.mesh(L.cyl(0.32, 0.32, 0.1, 24), L.mat(0x111111), 0, 0.05, 0, g); return g; }
function blueLamp() { const g = new THREE.Group(); const t = L.canvasTex(128, 64, (c, w, h) => { c.fillStyle = '#2a5ad6'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '900 26px Inter Display'; c.textAlign = 'center'; c.fillText('POLICE', w / 2, 42); });
  const m = new THREE.MeshStandardMaterial({ map: t, emissive: 0x6a9aff, emissiveMap: t, emissiveIntensity: 1.6 }); L.mesh(L.box(0.5, 0.45, 0.5), m, 0, 0, 0, g); L.mesh(L.cyl(0.05, 0.3, 0.2, 4), L.mat(0x111111), 0, 0.32, 0, g).rotation.y = Math.PI / 4; L.mesh(L.box(0.06, 0.6, 0.06), L.mat(0x111111), 0, -0.5, -0.2, g); return g; }
function makeBall() { const t = L.canvasTex(256, 128, (c, w, h) => { c.fillStyle = '#c9772e'; c.fillRect(0, 0, w, h); c.strokeStyle = '#6a3a12'; c.lineWidth = 3; for (let i = 0; i < 12; i++) { c.beginPath(); c.moveTo(i * 22, 0); c.lineTo(i * 22 + 11, h); c.stroke(); } for (let y = 20; y < h; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } });
  return new THREE.Mesh(L.sph(0.11, 24), new THREE.MeshStandardMaterial({ map: t, roughness: 0.55 })); }
function magnifier() { const g = new THREE.Group(); L.mesh(new THREE.TorusGeometry(0.1, 0.015, 8, 24), L.mat(0x2a2a2a, { m: 0.6 }), 0, 0, 0, g); L.mesh(L.cyl(0.095, 0.095, 0.01, 24), L.mat(0xcfe8ff, { t: 0.35, phys: true, r: 0.05 }), 0, 0, 0, g).rotation.x = Math.PI / 2; const hd = L.mesh(L.cyl(0.018, 0.022, 0.18, 8), L.mat(0x5a3a1a), 0, -0.19, 0, g); return g; }
function newspaperPack() { const g = new THREE.Group(); const t = L.canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#e9e2cf'; c.fillRect(0, 0, w, h); c.fillStyle = '#222'; c.font = '900 30px Liberation Serif, serif'; c.fillText('THE DAILY', 20, 40); c.fillStyle = '#555'; for (let y = 60; y < h; y += 10) c.fillRect(14 + (y % 30 ? 0 : 120), y, (y % 30 ? 230 : 110), 4); }, 1);
  L.mesh(L.box(0.32, 0.16, 0.48), new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }), 0, 0.08, 0, g); const st = L.mat(0xd8c9a0, { r: 0.9 }); L.mesh(L.box(0.33, 0.165, 0.015), st, 0, 0.08, 0.05, g); L.mesh(L.box(0.015, 0.165, 0.49), st, 0.02, 0.08, 0, g); return g; }
function crowdTex() { L.reseed(77); const t = L.canvasTex(1024, 256, (g, w, h) => { g.fillStyle = '#24242a'; g.fillRect(0, 0, w, h); const cols = ['#e8e2d6', '#c8202a', '#f2c230', '#3a5a9a', '#e9b48c', '#f0c8a8', '#ffffff', '#2a8a4a', '#c8202a']; for (let r = 0; r < 16; r++) for (let i = 0; i < 128; i++) { g.fillStyle = cols[(R_() * cols.length) | 0]; g.beginPath(); g.arc(i * 8 + 4 + (r % 2) * 4, r * 16 + 8, 3.5, 0, 7); g.fill(); } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 2); return t; }
function pitchTex() { return L.canvasTex(1024, 683, (g, w, h) => { for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#3f8f3a' : '#47a042'; g.fillRect(i * w / 16, 0, w / 16 + 1, h); } g.strokeStyle = '#f4f4f4'; g.lineWidth = 4; const m = 20; g.strokeRect(m, m, w - 2 * m, h - 2 * m); g.beginPath(); g.moveTo(w / 2, m); g.lineTo(w / 2, h - m); g.stroke(); g.beginPath(); g.arc(w / 2, h / 2, 80, 0, 7); g.stroke(); for (const x of [m, w - m - 150]) { g.strokeRect(x, h / 2 - 180, 150, 360); g.strokeRect(x === m ? m : w - m - 50, h / 2 - 80, 50, 160); } }); }
function goalFrame(s, x, dir = 1) { const g = new THREE.Group(); g.position.set(x, 0, 0); g.rotation.y = dir > 0 ? 0 : Math.PI; s.add(g); const wm = L.mat(0xf8f8f8, { r: 0.3, phys: true, cc: 0.6 });
  for (const z of [-3.66, 3.66]) L.mesh(L.cyl(0.06, 0.06, 2.44, 12), wm, 0, 1.22, z, g); const cb = L.mesh(L.cyl(0.06, 0.06, 7.44, 12), wm, 0, 2.44, 0, g); cb.rotation.x = Math.PI / 2;
  const nt = L.canvasTex(128, 128, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 2; for (let i = 0; i <= w; i += 16) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, h); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(w, i); c.stroke(); } }); nt.wrapS = nt.wrapT = THREE.RepeatWrapping; nt.repeat.set(8, 3);
  const nm = new THREE.MeshStandardMaterial({ map: nt, transparent: true, side: THREE.DoubleSide, roughness: 0.9, depthWrite: false });
  const back = L.mesh(new THREE.PlaneGeometry(7.4, 2.4), nm, 1.8, 1.2, 0, g); back.rotation.y = Math.PI / 2; back.castShadow = false;
  const top = L.mesh(new THREE.PlaneGeometry(1.8, 7.4), nm, 0.9, 2.42, 0, g); top.rotation.x = -Math.PI / 2; top.castShadow = false;
  for (const z of [-3.68, 3.68]) { const sd = L.mesh(new THREE.PlaneGeometry(1.8, 2.4), nm, 0.9, 1.2, z, g); sd.castShadow = false; }
  return g; }
function stadium(s, o = {}) {
  s.background = L.skyTex(o.top ?? '#4b8fd6', o.mid ?? '#a9cdef', o.bot ?? '#f3e6cf'); s.fog = new THREE.Fog(0xe9e2d4, 120, 600); if (ENV) s.environment = ENV;
  const out = L.mesh(new THREE.PlaneGeometry(900, 900), L.mat(0x3a7a35, { r: 1 }), 0, -0.02, 0, s); out.rotation.x = -Math.PI / 2; out.castShadow = false;
  const p = L.mesh(new THREE.PlaneGeometry(105, 68), new THREE.MeshStandardMaterial({ map: pitchTex(), roughness: 0.95, envMapIntensity: 0.3 }), 0, 0, 0, s); p.rotation.x = -Math.PI / 2; p.castShadow = false;
  const ct = crowdTex(); const cm = new THREE.MeshStandardMaterial({ map: ct, roughness: 0.9 }); const roofM = L.mat(0x3a3a40, { r: 0.6 }), wallM = L.mat(0xd8d2c4, { r: 0.8 });
  for (const [x, z, ry, len] of [[0, -46, 0, 140], [0, 46, Math.PI, 140], [-66, 0, Math.PI / 2, 100], [66, 0, -Math.PI / 2, 100]]) { const st = new THREE.Group(); st.position.set(x, 0, z); st.rotation.y = ry; s.add(st);
    const pl = L.mesh(new THREE.PlaneGeometry(len, 26), cm, 0, 7, -6, st); pl.rotation.x = -0.55; pl.castShadow = false; L.mesh(L.box(len, 2, 1), wallM, 0, 1, 4.6, st); L.mesh(L.box(len, 0.6, 16), roofM, 0, 18, -10, st); L.mesh(L.box(len, 18, 1), wallM, 0, 9, -18, st); }
  for (const x of [-9, 9]) { const tw = new THREE.Group(); tw.position.set(x, 0, -66); s.add(tw); const wm = L.mat(0xf2efe6, { r: 0.6 }); L.mesh(L.cyl(3.2, 3.6, 26, 16), wm, 0, 13, 0, tw); L.mesh(L.sph(3.3, 20), wm, 0, 26, 0, tw).scale.y = 0.8; L.mesh(L.cyl(0.08, 0.08, 6, 6), L.mat(0x333333), 0, 31, 0, tw); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; L.mesh(L.box(0.6, 3, 0.3), L.mat(0x2a3a4a), Math.sin(a) * 3.35, 20, Math.cos(a) * 3.35, tw).rotation.y = a; } }
  if (o.goals !== false) { goalFrame(s, -52.5, 1); goalFrame(s, 52.5, -1); }
  lights(s, { sky: 0xdfe9f7, ground: 0x5a7a3a, hi: 1.15, si: 2.6, dir: o.dir ?? [20, 30, 14], target: o.target ?? V(0, 0, 0), sr: o.sr ?? 40, sunSprite: true });
}
function londonStreet(s, o = {}) {
  const night = !!o.night; s.background = night ? L.skyTex('#0a1030', '#1c2a5a', '#3a4a7a') : L.skyTex(o.top ?? '#5b8fcf', o.mid ?? '#b2cde8', o.bot ?? '#ece4d6'); s.fog = new THREE.Fog(night ? 0x141c3a : (o.fog ?? 0xdcd8d0), 25, 200);
  const road = L.mesh(new THREE.PlaneGeometry(600, 600), L.mat(0x4a4a4e, { r: 0.9 }), 0, 0, 0, s); road.rotation.x = -Math.PI / 2; road.castShadow = false;
  for (let i = -30; i < 30; i++) L.mesh(L.box(1.5, 0.01, 0.12), L.mat(0xf2f2f2), i * 4, 0.01, 2.0, s);
  L.mesh(L.box(300, 0.15, 3), L.mat(0xb8b4ac, { r: 0.85 }), 0, 0.075, -4.5, s); L.mesh(L.box(300, 0.18, 0.2), L.mat(0x9a968e), 0, 0.09, -3.0, s);
  const gz = o.gardens ? -8 : -6; if (o.gardens) { L.mesh(L.box(300, 0.12, 4), L.mat(0x4f8f3f, { r: 0.95 }), 0, 0.06, -8, s); }
  terrace(s, -42, 18, gz - (o.gardens ? 2 : 0), { night, seed: o.seed ?? 0 });
  if (o.gardens) for (let i = 0; i < 18; i++) hedge(s, 3.4, -42 + i * 5 - 0.8, -6.3, 1.1, 30 + i);
  for (let i = -5; i <= 5; i++) { const lp = L.makeStreetLamp(); lp.position.set(i * 9 + 3, 0, -3.4); s.add(lp); if (night) { const pl = new THREE.PointLight(0xffc27a, 20, 14); pl.position.set(i * 9 + 3, 4.0, -3.2); s.add(pl); lp.userData.lamp.material = L.mat(0xfff2c0, { e: 0xffc060, ei: 3 }); } }
  if (o.props) { const pb = phoneBox(); pb.position.set(o.props[0], 0.15, -5.2); s.add(pb); const px = pillarBox(); px.position.set(o.props[1], 0.15, -3.8); s.add(px); }
  if (!night) { s.add(L.makeBirds(5, V(-10, 18, -30))); L.reseed(4); for (let i = 0; i < 5; i++) { const c = L.makeCloud(7 + L.RNG() * 5); c.position.set(-150 + i * 70, 70 + L.RNG() * 20, -300); s.add(c); } }
  const r = lights(s, { sky: night ? 0x3a4a8a : 0xdfe9f7, ground: 0x6a6a66, hi: night ? 0.35 : (o.hi ?? 1.1), si: night ? 0.5 : (o.si ?? 2.5), sun: night ? 0x8aa0ff : o.sun, dir: o.dir ?? [8, 11, 7], sunCol: o.sunCol, target: o.target ?? V(0, 1, -3), sunSprite: !night && o.sunSprite !== false, sr: o.sr ?? 8 });
  if (night) s.environment = null; return r;
}
function stampsTex(seed = 1) { L.reseed(seed); return L.canvasTex(512, 384, (g, w, h) => { g.fillStyle = '#1d3a2a'; g.fillRect(0, 0, w, h); const cols = ['#c8202a', '#2a5ad6', '#e8a020', '#3a8a4a', '#7a3a8a', '#d9822b']; for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) { const x = 20 + c * 80, y = 20 + r * 90; g.fillStyle = '#f4f1ea'; g.fillRect(x, y, 64, 76); g.fillStyle = cols[(R_() * 6) | 0]; g.fillRect(x + 6, y + 6, 52, 64); g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.arc(x + 32, y + 34, 13, 0, 7); g.fill(); g.fillRect(x + 18, y + 48, 28, 10); g.fillStyle = '#1d3a2a'; for (let k = 0; k < 8; k++) { g.beginPath(); g.arc(x + k * 9 + 1, y, 2.5, 0, 7); g.arc(x + k * 9 + 1, y + 76, 2.5, 0, 7); g.fill(); } } }); }
function hall(s, o = {}) {
  s.background = new THREE.Color(0x120e0a); if (ENV) s.environment = ENV;
  const room = L.mesh(L.box(16, 6, 14), L.mat(0x6a2e2a, { r: 0.85, fab: true }), 0, 3, 0, s); room.material = room.material.clone(); room.material.side = THREE.BackSide; room.castShadow = false;
  const fl = L.mesh(new THREE.PlaneGeometry(16, 14), new THREE.MeshStandardMaterial({ map: L.parquetTex(), roughness: 0.4, envMapIntensity: 0.6 }), 0, 0.01, 0, s); fl.rotation.x = -Math.PI / 2;
  const wd = L.mat(0x3a2418, { r: 0.5 }), gm = L.mat(0xd9b44a, { m: 0.9, r: 0.3 }); L.mesh(L.box(16, 1.2, 0.1), wd, 0, 0.6, -6.94, s);
  for (let i = -2; i <= 2; i++) { L.mesh(L.box(2.4, 1.8, 0.04), gm, i * 3, 2.7, -6.96, s); L.mesh(new THREE.PlaneGeometry(2.2, 1.6), new THREE.MeshStandardMaterial({ map: stampsTex(i + 10), roughness: 0.7 }), i * 3, 2.7, -6.93, s); }
  for (const sx of [-1, 1]) for (let i = -1; i <= 1; i++) { const p = L.mesh(new THREE.PlaneGeometry(2.2, 1.6), new THREE.MeshStandardMaterial({ map: stampsTex(i + 20 + sx), roughness: 0.7 }), sx * 7.93, 2.7, i * 3.5, s); p.rotation.y = -sx * Math.PI / 2; }
  const bn = L.mesh(new THREE.PlaneGeometry(9, 0.9), new THREE.MeshStandardMaterial({ map: L.canvasTex(1024, 100, (g, w, h) => { g.fillStyle = '#1d2a44'; g.fillRect(0, 0, w, h); g.fillStyle = '#e9c76a'; g.font = '900 56px Inter Display'; g.textAlign = 'center'; g.fillText('BRIEFMARKEN-AUSSTELLUNG 1966', w / 2, 70); }), roughness: 0.6 }), 0, 4.8, -6.9, s);
  for (const x of [-5, 5]) { const c = L.makeColumn(6); c.position.set(x, 0, -4); s.add(c); }
  let vit = null; if (o.case !== false) { vit = vitrine(s, 0, -1.5, o.cup !== false); for (const [x, z] of [[-1, -2.5], [1, -2.5], [-1, -0.5], [1, -0.5]]) { L.mesh(L.cyl(0.04, 0.05, 0.9, 10), gm, x, 0.45, z, s); L.mesh(L.sph(0.06, 10), gm, x, 0.92, z, s); } for (const [x, z, ry, l] of [[0, -2.5, 0, 2], [0, -0.5, 0, 2], [-1, -1.5, Math.PI / 2, 2], [1, -1.5, Math.PI / 2, 2]]) { const rp = L.mesh(L.cyl(0.025, 0.025, l, 8), L.mat(0xa3202a, { fab: true }), x, 0.8, z, s); rp.rotation.set(Math.PI / 2, 0, ry ? 0 : Math.PI / 2); if (ry) rp.rotation.set(Math.PI / 2, 0, 0); } }
  const sp = new THREE.SpotLight(0xfff2d8, 60, 14, 0.38, 0.5); sp.position.set(0, 5.8, 1); sp.target.position.set(0, 1.2, -1.5); sp.castShadow = true; s.add(sp); s.add(sp.target);
  lights(s, { sky: 0xfff0dc, ground: 0x4a3020, hi: 1.0, si: 1.5, dir: [3, 8, 5], sunSprite: false, sr: 6, target: V(0, 1, -1.5) });
  return { vit };
}
function office(s) {
  s.background = new THREE.Color(0x120e0a); if (ENV) s.environment = ENV;
  const room = L.mesh(L.box(10, 4, 9), L.mat(0xcdbf9a, { r: 0.85, fab: true }), 0, 2, 0, s); room.material = room.material.clone(); room.material.side = THREE.BackSide; room.castShadow = false;
  const fl = L.mesh(new THREE.PlaneGeometry(10, 9), new THREE.MeshStandardMaterial({ map: L.parquetTex(), roughness: 0.4 }), 0, 0.01, 0, s); fl.rotation.x = -Math.PI / 2;
  L.mesh(L.box(10, 1.1, 0.06), L.mat(0x5a3a22, { r: 0.5 }), 0, 0.55, -4.47, s);
  const win = L.mesh(new THREE.PlaneGeometry(2, 2.2), new THREE.MeshBasicMaterial({ map: L.skyTex('#5b8fcf', '#b2cde8', '#ece4d6') }), 2.6, 2.2, -4.47, s); for (const y of [1.1, 3.3]) L.mesh(L.box(2.2, 0.1, 0.08), L.mat(0xf2ead8), 2.6, y, -4.44, s); L.mesh(L.box(0.08, 2.2, 0.08), L.mat(0xf2ead8), 2.6, 2.2, -4.44, s);
  const ps = L.mesh(new THREE.PlaneGeometry(1.2, 1.6), new THREE.MeshStandardMaterial({ map: L.canvasTex(300, 400, (g, w, h) => { g.fillStyle = '#f2ead8'; g.fillRect(0, 0, w, h); g.fillStyle = '#c8202a'; g.fillRect(0, 0, w, 90); g.fillStyle = '#fff'; g.font = '900 54px Inter Display'; g.textAlign = 'center'; g.fillText('WM 1966', w / 2, 66); g.fillStyle = '#1d2a6a'; g.beginPath(); g.arc(w / 2, 230, 90, 0, 7); g.fill(); g.fillStyle = '#f3c24a'; g.beginPath(); g.moveTo(w / 2 - 30, 290); g.lineTo(w / 2 + 30, 290); g.lineTo(w / 2 + 15, 230); g.lineTo(w / 2 + 50, 170); g.lineTo(w / 2 - 50, 170); g.lineTo(w / 2 - 15, 230); g.fill(); g.fillStyle = '#111'; g.font = '800 30px Inter Display'; g.fillText('ENGLAND', w / 2, 370); }), roughness: 0.7 }), -1.6, 2.4, -4.46, s);
  const bs = L.makeBookshelf(); bs.position.set(-3.8, 0, -4.2); s.add(bs);
  const desk = new THREE.Group(); desk.position.set(0, 0, -1.6); s.add(desk); const wd = L.mat(0x5a3a22, { r: 0.45, phys: true, cc: 0.3 }); L.mesh(L.box(2.4, 0.08, 1.1), wd, 0, 0.82, 0, desk); L.mesh(L.box(2.3, 0.78, 1.0), L.mat(0x4a2e1a, { r: 0.5 }), 0, 0.39, 0, desk);
  for (let i = 0; i < 4; i++) L.mesh(L.box(0.4, 0.008, 0.55), L.mat(0xf6f1e4), -0.7, 0.87 + i * 0.01, 0.1, desk);
  const pl = new THREE.PointLight(0xffd9a0, 8, 7); pl.position.set(0, 3.4, -0.5); s.add(pl);
  lights(s, { sky: 0xfff0dc, ground: 0x5a4a30, hi: 1.0, si: 2.0, dir: [4, 7, 3], sunSprite: false, sr: 5, target: V(0, 1, -1.5) });
  return { desk };
}
function makePhone() { const g = new THREE.Group(); const bm = L.mat(0x111111, { r: 0.2, phys: true, cc: 1 }); L.mesh(L.box(0.26, 0.1, 0.22), bm, 0, 0.05, 0, g); L.mesh(L.box(0.2, 0.06, 0.15), bm, 0, 0.12, -0.01, g);
  L.mesh(L.cyl(0.065, 0.065, 0.012, 24), L.mat(0xe8e2d0, { r: 0.4 }), 0, 0.1, 0.085, g).rotation.x = 0.5;
  const hs = new THREE.Group(); hs.position.set(0, 0.18, -0.01); g.add(hs); L.mesh(L.cap(0.025, 0.2), bm, 0, 0.02, 0, hs).rotation.z = Math.PI / 2; for (const x of [-0.12, 0.12]) L.mesh(L.sph(0.045, 16), bm, x, -0.005, 0, hs).scale.y = 0.7;
  g.userData.hs = hs; return g; }
function interrogation(s) {
  s.background = new THREE.Color(0x0c0c10); if (ENV) s.environment = null;
  const room = L.mesh(L.box(7, 3.4, 7), L.mat(0x6a7078, { r: 0.95, fab: true }), 0, 1.7, 0, s); room.material = room.material.clone(); room.material.side = THREE.BackSide; room.castShadow = false;
  const tbl = new THREE.Group(); s.add(tbl); L.mesh(L.box(1.6, 0.06, 0.9), L.mat(0x5a4a3a, { r: 0.6 }), 0, 0.8, 0, tbl); for (const [x, z] of [[-0.7, -0.35], [0.7, -0.35], [-0.7, 0.35], [0.7, 0.35]]) L.mesh(L.cyl(0.03, 0.03, 0.8), L.mat(0x333333, { m: 0.6 }), x, 0.4, z, tbl);
  const lamp = new THREE.Group(); lamp.position.set(0, 3.4, 0); s.add(lamp); L.mesh(L.cyl(0.01, 0.01, 1.2), L.mat(0x111111), 0, -0.6, 0, lamp); const sh = L.mesh(new THREE.ConeGeometry(0.3, 0.25, 20, 1, true), L.mat(0x2a3a2a, { ds: true, m: 0.5, r: 0.4 }), 0, -1.25, 0, lamp);
  L.mesh(L.sph(0.07, 12), L.mat(0xffffff, { e: 0xfff0c0, ei: 4 }), 0, -1.32, 0, lamp);
  const sp = new THREE.SpotLight(0xfff0c8, 50, 8, 0.7, 0.6); sp.position.set(0, 2.05, 0); sp.target.position.set(0, 0, 0); sp.castShadow = true; lamp.add(sp); s.add(sp.target); sp.position.set(0, -1.35, 0);
  s.add(new THREE.HemisphereLight(0xa0b0c0, 0x303030, 1.1)); const fill = new THREE.DirectionalLight(0xffe8c8, 1.2); fill.position.set(2, 3, -2); s.add(fill);
  return { lamp, tbl };
}
function studioScene(s) { s.background = new THREE.Color(0x0e0e14); if (ENV) s.environment = ENV;
  const fl = L.mesh(new THREE.PlaneGeometry(30, 30), L.mat(0x2a2a30, { r: 0.6 }), 0, 0, 0, s); fl.rotation.x = -Math.PI / 2;
  const cyc = L.mesh(new THREE.CylinderGeometry(6, 6, 6, 32, 1, true, Math.PI * 0.6, Math.PI * 0.8), L.mat(0x5a7ab0, { r: 0.9, ds: true }), 0, 3, 0, s); cyc.rotation.y = Math.PI; cyc.castShadow = false;
  const sp = new THREE.SpotLight(0xfff4e0, 120, 14, 0.45, 0.5); sp.position.set(2, 6, 4); sp.target.position.set(0, 0.6, 0); sp.castShadow = true; s.add(sp); s.add(sp.target);
  s.add(new THREE.HemisphereLight(0xb0c0e0, 0x202020, 0.6)); }
function tvCamera() { const g = new THREE.Group(); const gm = L.mat(0x3a3e46, { m: 0.6, r: 0.4 }); for (let i = 0; i < 3; i++) { const lg = L.mesh(L.cyl(0.03, 0.03, 1.3, 8), gm, Math.sin(i * 2.1) * 0.3, 0.6, Math.cos(i * 2.1) * 0.3, g); lg.rotation.set(Math.cos(i * 2.1) * 0.35, 0, -Math.sin(i * 2.1) * 0.35); }
  L.mesh(L.box(0.6, 0.5, 0.9), L.mat(0x6a6e76, { m: 0.5, r: 0.35 }), 0, 1.45, 0, g); const t = L.mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.5, 8), L.mat(0x222222, { m: 0.5 }), 0, 1.5, 0.7, g); t.rotation.x = Math.PI / 2; L.mesh(L.cyl(0.14, 0.14, 0.02, 16), L.mat(0x3a5a8a, { r: 0.05, phys: true, cc: 1, env: 1.5 }), 0, 1.5, 0.96, g).rotation.x = Math.PI / 2;
  const lt = L.mesh(L.box(0.25, 0.12, 0.06), L.mat(0xff2020, { e: 0xff2020, ei: 2 }), 0, 1.78, 0.3, g); g.userData.tally = lt; return g; }
function canTex() { return L.canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#d62828'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2c230'; g.fillRect(0, 34, w, 60); g.fillStyle = '#111'; g.font = '900 28px Inter Display'; g.textAlign = 'center'; g.fillText('HUNDEFUTTER', w / 2, 74); g.fillStyle = '#fff'; g.font = '800 18px Inter Display'; g.fillText('★ PREMIUM ★', w / 2, 24); g.fillText('FÜR HELDEN', w / 2, 118); }); }
function confetti(s, n = 120, area = 4, y0 = 4, seed = 9) { L.reseed(seed); const cols = [0xff4d6d, 0xffd23f, 0x3bceac, 0x4d96ff, 0xffffff, 0xc8202a]; const ps = []; for (let i = 0; i < n; i++) { const p = L.mesh(new THREE.PlaneGeometry(0.06, 0.1), L.mat(cols[i % 6], { ds: true, r: 0.6 }), 0, 0, 0, s); p.castShadow = false; p.userData = { x: (R_() - 0.5) * area, z: (R_() - 0.5) * area, ph: R_(), sp: 0.6 + R_() * 0.5 }; ps.push(p); }
  return (t, cx = 0, cz = 0) => ps.forEach((p, i) => { const d = p.userData; const k = (t * d.sp * 0.25 + d.ph) % 1; p.position.set(cx + d.x + Math.sin(t * 2 + i) * 0.2, y0 - k * y0, cz + d.z); p.rotation.set(t * 3 + i, t * 2 + i * 0.3, t + i); }); }
function sniffLines(g, W, H, T, x, y, k = 1) { if (k <= 0) return; g.save(); g.globalAlpha = clamp(k * 3); g.strokeStyle = '#fff'; g.lineCap = 'round'; g.lineWidth = W * 0.008; for (let i = 0; i < 3; i++) { const ph = (T * 2.2 + i / 3) % 1; g.globalAlpha = clamp(k * 3) * Math.sin(ph * Math.PI); g.beginPath(); const cx = W * x + (i - 1) * W * 0.05, cy = H * y - ph * H * 0.06; g.moveTo(cx, cy); g.bezierCurveTo(cx + W * 0.03, cy - H * 0.01, cx - W * 0.03, cy - H * 0.02, cx, cy - H * 0.03); g.stroke(); } g.restore(); }
function calendar(g, W, H, day, k, flip = 0) { if (k <= 0) return; const w = W * 0.36, h = W * 0.42, x = W / 2 - w / 2, y = H * 0.11; g.save(); g.globalAlpha = clamp(k * 3);
  const card = (d) => { g.fillStyle = '#fbf8f0'; g.fillRect(x, y + h * 0.26, w, h * 0.74); g.fillStyle = '#111'; g.font = `900 ${W * 0.17}px "Inter Display"`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(d), W / 2, y + h * 0.63); };
  g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 24; g.fillStyle = '#fbf8f0'; g.beginPath(); g.roundRect(x, y, w, h, W * 0.02); g.fill(); g.shadowColor = 'transparent';
  card(day); g.fillStyle = '#d62828'; g.beginPath(); g.roundRect(x, y, w, h * 0.26, [W * 0.02, W * 0.02, 0, 0]); g.fill(); g.fillStyle = '#fff'; g.font = `900 ${W * 0.05}px "Inter Display"`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('MÄRZ 1966', W / 2, y + h * 0.13);
  if (flip > 0 && flip < 1) { g.save(); g.translate(x, y + h * 0.26); g.rotate(-flip * 1.1); g.translate(-flip * W * 0.05, flip * flip * H * 0.15); g.globalAlpha *= 1 - flip; g.fillStyle = '#f1ede2'; g.fillRect(0, 0, w, h * 0.74); g.fillStyle = '#111'; g.font = `900 ${W * 0.17}px "Inter Display"`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(day - 1), w / 2, h * 0.37); g.restore(); }
  g.restore(); }
function stampFit(g, W, H, txt, k, col = '#e8202a', y = 0.3, rot = -0.14, sz = 0.15) { if (k <= 0) return; g.save(); g.font = `900 ${W * sz}px "Inter Display"`; const tw = g.measureText(txt).width; g.restore(); const f = Math.min(1, W * 0.62 / tw); g.save(); g.translate(W / 2, H * y); g.scale(f, f); g.translate(-W / 2, -H * y); stamp2d(g, W, H, txt, k, col, y, rot); g.restore(); }
function scoreboard(g, W, H, k, y = 0.2) { if (k <= 0) return; const e = backOut(clamp(k)); g.save(); g.translate(W / 2, H * y); g.scale(e, e); g.globalAlpha = clamp(k * 3); const w = W * 0.86, h = W * 0.15; g.fillStyle = 'rgba(12,14,22,0.85)'; g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, W * 0.03); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 3; g.stroke();
  g.textBaseline = 'middle'; g.font = `900 ${W * 0.05}px "Inter Display"`; g.textAlign = 'left'; g.fillStyle = '#ff5a5a'; g.fillText('ENGLAND', -w / 2 + W * 0.04, 2); g.textAlign = 'right'; g.fillStyle = '#fff'; g.fillText('DEUTSCHLAND', w / 2 - W * 0.04, 2); g.textAlign = 'center'; g.fillStyle = '#FFD60A'; g.font = `900 ${W * 0.075}px "Inter Display"`; g.fillText('4:2', W * 0.03, 2); g.restore(); }
function glow(g, W, H, x, y, r, col = 'rgba(255,220,120,', k = 1) { if (k <= 0) return; const gr = g.createRadialGradient(W * x, H * y, 0, W * x, H * y, W * r); gr.addColorStop(0, col + (0.55 * k) + ')'); gr.addColorStop(1, col + '0)'); g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore(); }

// ================= VIDEO 07 – Wojtek, der Soldatenbär (1942–1963) =================
const UNI = 0x7d7448, UNI2 = 0x6b6440;
const POLE = i => ({ skin: [0xf0c09a, 0xe9b48c, 0xf3c7a8, 0xdba383, 0xf6c9a5][i % 5], shirt: i % 2 ? UNI : UNI2, sleeve: i % 2 ? UNI : UNI2, pants: UNI2, hair: [0x5a3a1a, 0x2a1a10, 0xc9952b, 0x3a2a1a, 0x8a5a2a][i % 5], mustache: i % 3 === 0, armSkin: false, shoes: 0x2a1a10 });
const BOY = { skin: 0xc68a5e, shirt: 0xe8dcc0, sleeve: 0xe8dcc0, pants: 0x6a5a40, hair: 0x111111, mustache: false, kid: true, s: 0.72, shoes: 0x5a3a1a };
const SPY = { skin: 0xe2b090, shirt: 0x2a2a30, sleeve: 0x2a2a30, pants: 0x1a1a1e, hair: 0x111111, mustache: true, suit: true, tie: 0x6a1a1a, armSkin: false, shoes: 0x111111 };
const BRIT = { skin: 0xf3c7a8, shirt: KHAKI, sleeve: KHAKI, pants: 0x7a6f48, hair: 0xb07a3a, mustache: true, armSkin: false, shoes: 0x2a1a10 };
const VET = { skin: 0xf0c09a, shirt: 0x4a4a52, sleeve: 0x4a4a52, pants: 0x3a3a40, hair: 0xdcdcdc, mustache: true, suit: true, tie: 0xb3202a, armSkin: false };
function beret(par, col = 0x3b3a2c, y = 0.24, sc = 1) { const h = new THREE.Group(); h.position.set(0.03, y, 0); h.rotation.z = -0.22; h.scale.setScalar(sc); par.add(h); const b = L.mesh(L.sph(0.35, 28), L.mat(col, { fab: true, r: 0.95 }), 0, 0.03, 0, h); b.scale.set(1.05, 0.36, 1.05); L.mesh(new THREE.TorusGeometry(0.31, 0.035, 8, 28), L.mat(0x2a2a20, { r: 0.8 }), 0, -0.02, 0, h).rotation.x = Math.PI / 2; L.mesh(L.box(0.07, 0.08, 0.02), gold(), -0.1, 0.02, 0.31, h).rotation.y = -0.3; return h; }
function pole(s, i, x, z, ry = 0) { const c = guy(s, POLE(i), x, 0, z, ry); c.hat = beret(c.head); L.mesh(L.cyl(0.262, 0.262, 0.07), L.mat(0x9a9068, { fab: true }), 0, 0.8, 0, c.g).scale.z = 0.82; return c; }
function bronze(o) { const m = L.mat(0x7a5a32, { m: 0.85, r: 0.38, env: 1.2 }); o.traverse(x => { if (x.isMesh) x.material = m; }); }

// ---- the bear
function makeBear(o = {}) {
  const col = o.col ?? 0x6e4424, col2 = o.col2 ?? 0xa8774a;
  const fur = L.mat(col, { r: 0.95, fab: true }), fur2 = L.mat(col2, { r: 0.9, fab: true }), nose = L.mat(0x16100c, { r: 0.15, phys: true, cc: 1 }), dark = L.mat(0x2a0e08, { r: 0.9 }), pink = L.mat(0xd8707a, { r: 0.45, phys: true, cc: 0.5 }), claw = L.mat(0xe8dcc0, { r: 0.4 });
  const g = new THREE.Group(); const HIP = 0.55;
  const body = new THREE.Group(); body.position.y = HIP; g.add(body);
  const torso = L.mesh(L.cap(0.42, 0.42), fur, 0, 0.5, 0, body); torso.scale.set(1.05, 1, 0.9);
  const belly = L.mesh(L.sph(0.34, 28), fur2, 0, 0.42, 0.2, body); belly.scale.set(0.95, 1.2, 0.6);
  const neck = new THREE.Group(); neck.position.set(0, 0.95, 0.05); body.add(neck);
  const head = new THREE.Group(); head.position.set(0, 0.27, 0.03); neck.add(head); head.scale.setScalar(o.cub ? 1.5 : 1);
  L.mesh(L.sph(0.3, 32), fur, 0, 0, 0, head).scale.set(1.08, 0.97, 0.98);
  for (const sx of [-1, 1]) L.mesh(L.sph(0.14, 20), fur, sx * 0.17, -0.09, 0.1, head).scale.set(1, 0.85, 0.9);
  const snout = L.mesh(L.sph(0.15, 24), fur2, 0, -0.07, 0.24, head); snout.scale.set(1.05, 0.78, 1.0);
  L.mesh(L.sph(0.058, 16), nose, 0, -0.025, 0.38, head).scale.set(1.35, 0.9, 1);
  const jaw = new THREE.Group(); jaw.position.set(0, -0.14, 0.2); head.add(jaw);
  L.mesh(L.sph(0.1, 16), fur2, 0, -0.02, 0.06, jaw).scale.set(0.9, 0.45, 1.0);
  const mouthIn = L.mesh(L.sph(0.085, 16), dark, 0, 0.02, 0.07, jaw); mouthIn.scale.set(0.8, 0.35, 0.9);
  const tongue = L.mesh(L.sph(0.05, 12), pink, 0, 0.01, 0.1, jaw); tongue.scale.set(1, 0.4, 1.2);
  const pupils = [], brows = [], eyes = [];
  for (const sx of [-1, 1]) {
    const ew = L.mesh(L.sph(0.062, 24), L.mat(0xffffff, { r: 0.2 }), sx * 0.115, 0.07, 0.235, head); ew.scale.set(1, 1.12, 0.6); eyes.push(ew);
    const pu = new THREE.Group(); pu.position.set(sx * 0.115, 0.07, 0.268); pu.userData.x0 = sx * 0.115; head.add(pu);
    L.mesh(L.sph(0.036, 16), L.mat(0x1a0d06, { r: 0.1, phys: true, cc: 1 }), 0, 0, 0, pu).scale.z = 0.6; L.mesh(L.sph(0.011, 8), L.mat(0xffffff, { e: 0xffffff, ei: 1 }), 0.012, 0.014, 0.02, pu); pupils.push(pu);
    const br = L.mesh(L.cap(0.016, 0.07), L.mat(0x3a2210, { r: 0.8 }), sx * 0.11, 0.16, 0.245, head); br.rotation.z = Math.PI / 2; br.userData.sx = sx; brows.push(br);
  }
  const ears = []; for (const sx of [-1, 1]) { const e = new THREE.Group(); e.position.set(sx * 0.21, 0.21, -0.03); head.add(e); L.mesh(L.sph(0.1, 16), fur, 0, 0, 0, e).scale.set(1, 1, 0.55); L.mesh(L.sph(0.058, 12), fur2, 0, -0.005, 0.035, e).scale.set(1, 1, 0.4); ears.push(e); }
  const arms = []; for (const sx of [-1, 1]) { const sh = new THREE.Group(); sh.position.set(sx * 0.4, 0.78, 0.02); body.add(sh);
    L.mesh(L.cap(0.14, 0.26), fur, 0, -0.2, 0, sh); const el = new THREE.Group(); el.position.set(0, -0.4, 0); sh.add(el); L.mesh(L.cap(0.125, 0.2), fur, 0, -0.15, 0, el);
    const hand = new THREE.Group(); hand.position.set(0, -0.34, 0); el.add(hand); L.mesh(L.sph(0.14, 20), fur, 0, 0, 0, hand).scale.set(1, 0.85, 1.05);
    for (let k = -1; k <= 1; k++) L.mesh(new THREE.ConeGeometry(0.018, 0.06, 8), claw, k * 0.05, -0.09, 0.1, hand).rotation.x = Math.PI / 2 + 0.6;
    arms.push({ sh, el, hand, sx }); }
  const legs = []; for (const sx of [-1, 1]) { const hip = new THREE.Group(); hip.position.set(sx * 0.22, 0.02, 0); body.add(hip);
    L.mesh(L.cap(0.17, 0.16), fur, 0, -0.12, 0, hip); const knee = new THREE.Group(); knee.position.set(0, -0.3, 0); hip.add(knee); L.mesh(L.cap(0.14, 0.08), fur, 0, -0.08, 0, knee);
    const foot = L.mesh(L.sph(0.15, 20), fur, 0, -0.2, 0.07, knee); foot.scale.set(1, 0.55, 1.4); L.mesh(L.sph(0.09, 14), fur2, 0, -0.24, 0.17, knee).scale.set(1, 0.3, 0.6);
    legs.push({ hip, knee }); }
  L.mesh(L.sph(0.09, 14), fur, 0, 0.1, -0.38, body);
  const b = { g, body, torso, neck, head, jaw, tongue, mouthIn, ears, arms, legs, pupils, brows, eyes, HIP };
  b.reset = () => { body.position.set(0, HIP, 0); body.rotation.set(0, 0, 0); neck.rotation.set(0, 0, 0); head.rotation.set(0, 0, 0); torso.scale.y = 1;
    arms.forEach(a => { a.sh.rotation.set(0, 0, a.sx * 0.18); a.el.rotation.set(0, 0, 0); }); legs.forEach(l => { l.hip.rotation.set(0, 0, 0); l.knee.rotation.set(0, 0, 0); });
    jaw.rotation.x = 0; tongue.visible = false; ears.forEach(e => e.rotation.set(0, 0, 0)); brows.forEach(br => { br.position.y = 0.16; br.rotation.z = Math.PI / 2; });
    eyes.forEach(e => e.scale.set(1, 1.12, 0.6)); pupils.forEach(p => p.scale.setScalar(1)); };
  b.look = (x, y) => pupils.forEach(p => { p.position.x = p.userData.x0 + x * 0.02; p.position.y = 0.07 + y * 0.022; });
  b.expr = (k, t = 0) => {
    if (k === 'happy') { jaw.rotation.x = 0.32 + Math.sin(t * 6) * 0.04; tongue.visible = true; brows.forEach(br => br.position.y = 0.178); }
    if (k === 'roar') { jaw.rotation.x = 0.8; tongue.visible = true; brows.forEach(br => { br.rotation.z = Math.PI / 2 - br.userData.sx * 0.5; br.position.y = 0.145; }); }
    if (k === 'shock') { jaw.rotation.x = 0.45; pupils.forEach(p => p.scale.setScalar(0.65)); eyes.forEach(e => e.scale.set(1.15, 1.3, 0.65)); brows.forEach(br => br.position.y = 0.2); }
    if (k === 'sly') { jaw.rotation.x = 0.12; brows.forEach(br => br.rotation.z = Math.PI / 2 - br.userData.sx * 0.25); }
    if (k === 'sad') { brows.forEach(br => { br.rotation.z = Math.PI / 2 + br.userData.sx * 0.4; br.position.y = 0.15; }); }
    if (k === 'chew') { jaw.rotation.x = Math.abs(Math.sin(t * 9)) * 0.28; }
    if (k === 'sleep') { eyes.forEach(e => e.scale.set(1, 0.12, 0.6)); pupils.forEach(p => p.scale.setScalar(0.01)); }
  };
  b.ears = (k) => ears.forEach((e, i) => { e.rotation.z = (i ? -1 : 1) * 0.25 * k; e.position.y = 0.21 + 0.03 * k; });
  b.stand = t => { b.reset(); torso.scale.y = 1 + Math.sin(t * 2.2) * 0.015; head.rotation.z = Math.sin(t * 1.1) * 0.05; };
  b.walk2 = (t, sp = 6, k = 1) => { b.reset(); legs.forEach((l, i) => { const q = t * sp + i * Math.PI; l.hip.rotation.x = Math.sin(q) * 0.45 * k; l.knee.rotation.x = Math.max(0, Math.sin(q + 1)) * 0.5 * k; });
    arms.forEach((a, i) => a.sh.rotation.x = -Math.sin(t * sp + i * Math.PI) * 0.35 * k); body.position.y = HIP + Math.abs(Math.sin(t * sp)) * 0.03; body.rotation.z = Math.sin(t * sp) * 0.06 * k; };
  b.four = (t, sp = 0, k = 1) => { b.reset(); const th = 1.22; body.rotation.x = th; body.position.y = HIP + 0.04 + (sp ? Math.abs(Math.sin(t * sp)) * 0.025 : Math.sin(t * 2) * 0.005); neck.rotation.x = -th + 0.25; head.rotation.x = 0.05;
    arms.forEach((a, i) => { const q = t * sp + i * Math.PI; a.sh.rotation.set(-th + (sp ? Math.sin(q) * 0.4 * k : 0), 0, a.sx * 0.04); a.el.rotation.x = sp ? -Math.max(0, Math.sin(q + 1)) * 0.35 * k : 0; });
    legs.forEach((l, i) => { const q = t * sp + (1 - i) * Math.PI; l.hip.rotation.x = -th + (sp ? Math.sin(q) * 0.4 * k : 0); l.knee.rotation.x = sp ? Math.max(0, Math.sin(q + 1)) * 0.5 * k : 0; }); };
  b.sit = t => { b.reset(); body.position.y = 0.22; body.rotation.x = -0.12; legs.forEach((l, i) => { l.hip.rotation.set(-1.45, 0, (i ? 1 : -1) * 0.28); l.knee.rotation.x = 0.15; });
    arms.forEach(a => { a.sh.rotation.set(-0.35, 0, a.sx * 0.3); a.el.rotation.x = -0.3; }); torso.scale.y = 1 + Math.sin(t * 2.2) * 0.015; };
  b.carry = (t, sp = 0) => { if (sp) b.walk2(t, sp, 0.7); else b.stand(t); arms.forEach(a => { a.sh.rotation.set(-1.05, 0, -a.sx * 0.12); a.el.rotation.set(-0.75, 0, 0); }); };
  b.salute = (k = 1) => { const a = arms[0]; a.sh.rotation.set(-1.2 * k, 0, -a.sx * (0.18 + 1.0 * k)); a.el.rotation.set(-0.2 * k, 0, -a.sx * -1.0 * k); a.el.rotation.x = -1.7 * k; };
  b.wave = (t, i = 0) => { const a = arms[i]; a.sh.rotation.set(0, 0, a.sx * 2.5); a.el.rotation.set(0, 0, a.sx * (0.3 + Math.sin(t * 9) * 0.45)); };
  b.reset(); if (o.cub) g.scale.setScalar(0.3); if (o.s) g.scale.setScalar(o.s); return b;
}
function bear(s, x, z, ry = 0, o = {}) { const b = makeBear(o); b.g.position.set(x, 0, z); b.g.rotation.y = ry; s.add(b.g); if (o.beret) b.cap = beret(b.head, 0x3b3a2c, 0.24, 0.78); return b; }

// ---- props
function rod(p, q, r, m, par) { const d = q.clone().sub(p); const c = L.mesh(L.cyl(r, r, d.length(), 6), m, 0, 0, 0, par); c.position.copy(p).add(q).multiplyScalar(0.5); c.lookAt(q); c.rotateX(Math.PI / 2); return c; }
function tent(col = 0xb8a878, sc = 1) { const g = new THREE.Group(); const m = L.mat(col, { fab: true, r: 0.95 }); L.mesh(L.cyl(1.6, 1.6, 0.9, 28), m, 0, 0.45, 0, g); L.mesh(new THREE.ConeGeometry(1.75, 2.0, 28), m, 0, 1.9, 0, g); L.mesh(L.cyl(0.03, 0.03, 0.4, 6), L.mat(0x5a3a1a), 0, 3.0, 0, g);
  const door = L.mesh(new THREE.PlaneGeometry(0.8, 1.3), L.mat(0x2a2418, { ds: true }), 0, 0.65, 1.61, g); door.castShadow = false; const rm = L.mat(0xd8cfb0);
  for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28 + 0.3; rod(V(Math.sin(a) * 1.65, 0.9, Math.cos(a) * 1.65), V(Math.sin(a) * 2.8, 0, Math.cos(a) * 2.8), 0.008, rm, g); }
  g.scale.setScalar(sc); return g; }
function sandTex(seed = 3) { const r = L.mulberry(seed); return L.canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#d8b27a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 6000; i++) { const v = r(); g.fillStyle = v < 0.5 ? `rgba(160,110,60,${r() * 0.25})` : `rgba(250,225,175,${r() * 0.3})`; const q = 1 + r() * 3; g.fillRect(r() * w, r() * h, q, q); }
  for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(170,120,70,${0.12 + r() * 0.12})`; g.lineWidth = 2; g.beginPath(); const y = r() * h; g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + 20 * (r() - 0.5), w * 0.6, y - 20, w, y + 10 * (r() - 0.5)); g.stroke(); } }, 30); }
function grassTex2(seed = 5, base = '#5f9a3e') { const r = L.mulberry(seed); return L.canvasTex(512, 512, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { g.fillStyle = r() < 0.5 ? `rgba(40,90,30,${r() * 0.35})` : `rgba(150,200,90,${r() * 0.3})`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 2 + r() * 4); } }, 40); }
function mountains(s, R = 320, n = 18, col = 0xa07a58, seed = 7, snow = true) { const r = L.mulberry(seed); const m = L.mat(col, { r: 1, env: 0.1 }), sm = L.mat(0xf4f4f8, { r: 0.8 });
  for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * 2.6; const h = 40 + r() * 70, w = 50 + r() * 40, R2 = R + r() * 60; const x = Math.cos(a) * R2, z = Math.sin(a) * R2; const ry = r() * 3;
    const mt = L.mesh(new THREE.ConeGeometry(w, h, 7), m, x, h / 2 - 2, z, s); mt.rotation.y = ry; mt.castShadow = false;
    if (snow && h > 80) { const c = L.mesh(new THREE.ConeGeometry(w * 0.29, h * 0.29, 7), sm, x, h - 2 - h * 0.145 + 0.2, z, s); c.rotation.y = ry; c.castShadow = false; } } }
function ground(s, tex, rough = 1) { const gr = L.mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshStandardMaterial({ map: tex, roughness: rough, envMapIntensity: 0.3 }), 0, 0, 0, s); gr.rotation.x = -Math.PI / 2; gr.castShadow = false; return gr; }
function desert(s, o = {}) {
  s.background = L.skyTex(o.top ?? '#3a86d8', o.mid ?? '#9cc8ef', o.bot ?? '#f4e2c0'); s.fog = new THREE.Fog(o.fog ?? 0xf0dcb8, o.f0 ?? 60, o.f1 ?? 480);
  ground(s, sandTex()); mountains(s, 330, 18, o.mcol ?? 0xa47c5a);
  L.reseed(o.seed ?? 14); const d = new THREE.Object3D();
  const rk = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.5, 0), L.mat(0x9a8468, { r: 0.95 }), 110), sc = new THREE.InstancedMesh(new THREE.SphereGeometry(0.4, 8, 6), L.mat(0x8a9a5a, { r: 0.95, fab: true }), 110);
  for (const [im, k] of [[rk, 0], [sc, 1]]) for (let i = 0; i < 110; i++) { let x, z; do { x = (R_() - 0.5) * 140; z = 12 - R_() * 140; } while (o.clear && Math.abs(x - o.clear[0]) < o.clear[2] && Math.abs(z - o.clear[1]) < o.clear[3]);
    d.position.set(x, k ? 0.1 : 0.05, z); const q = 0.3 + R_() * (k ? 0.9 : 0.7); d.scale.set(q * 1.3, q * (k ? 0.6 : 0.5), q); d.rotation.set(0, R_() * 6, 0); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }
  rk.castShadow = sc.castShadow = true; s.add(rk, sc);
  if (o.camp) for (const [x, z, r, c] of o.camp) { const t = tent(c ?? 0xb8a878); t.position.set(x, 0, z); t.rotation.y = r ?? 0; s.add(t); }
  for (let i = 0; i < 5; i++) { const c = L.makeCloud(6 + R_() * 5); c.position.set(-200 + i * 90, 70 + R_() * 20, -300); s.add(c); }
  return lights(s, { sky: 0xe8f0ff, ground: 0xb08a5a, hi: o.hi ?? 1.15, si: o.si ?? 2.8, dir: o.dir ?? [7, 11, 6], sun: o.sun ?? 0xfff0d0, sunCol: o.sunCol, target: o.target ?? V(0, 1, 0), sr: o.sr ?? 8, sunSprite: o.sunSprite });
}
const SUNSET = { top: '#2b2a6b', mid: '#e3735a', bot: '#ffc27a', fog: 0xf2a070, sun: 0xffb070, dir: [-8, 4, -12], sunCol: '#ffcf8a', si: 2.0, mcol: 0x8a5a4a };
function crate(lbl = 'MUNITION', sc = 1) { const g = new THREE.Group(); const w = L.mat(0x9a7a4a, { r: 0.75 }), w2 = L.mat(0x7a5a32, { r: 0.75 }); L.mesh(L.box(0.7, 0.42, 0.42), w, 0, 0.21, 0, g);
  for (const x of [-0.33, 0.33]) L.mesh(L.box(0.05, 0.44, 0.44), w2, x, 0.21, 0, g); L.mesh(L.box(0.72, 0.05, 0.44), w2, 0, 0.4, 0, g);
  const t = L.canvasTex(256, 128, (q, W, H) => { q.fillStyle = '#9a7a4a'; q.fillRect(0, 0, W, H); q.fillStyle = '#1d1d1a'; q.font = '900 46px Inter Display'; q.textAlign = 'center'; q.fillText(lbl, W / 2, 62); q.font = '800 26px Inter Display'; q.fillText('▲ 25 PFD ▲', W / 2, 104); });
  for (const sz of [1, -1]) { const p = L.mesh(new THREE.PlaneGeometry(0.58, 0.29), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }), 0, 0.2, sz * 0.212, g); if (sz < 0) p.rotation.y = Math.PI; p.castShadow = false; }
  g.scale.setScalar(sc); return g; }
function bottle(kind = 'vodka') { const g = new THREE.Group(); const gl = L.mat(kind === 'beer' ? 0x5a3a12 : 0xd8e8e8, { t: kind === 'beer' ? 0.9 : 0.45, r: 0.05, phys: true, cc: 1, env: 1.5 });
  L.mesh(L.cyl(0.055, 0.055, 0.24, 20), gl, 0, 0.12, 0, g); L.mesh(L.cyl(0.02, 0.055, 0.08, 20), gl, 0, 0.28, 0, g); L.mesh(L.cyl(0.02, 0.02, 0.07, 12), gl, 0, 0.35, 0, g);
  if (kind === 'vodka') { L.mesh(L.cyl(0.048, 0.048, 0.2, 20), L.mat(0xfafaf4, { r: 0.3 }), 0, 0.105, 0, g); L.mesh(L.sph(0.028, 12), L.mat(0xe8707e, { r: 0.6 }), 0, 0.4, 0, g).scale.y = 1.4; }
  const lt = L.canvasTex(256, 96, (q, W, H) => { q.fillStyle = kind === 'beer' ? '#e8c84a' : '#b3202a'; q.fillRect(0, 0, W, H); q.fillStyle = kind === 'beer' ? '#3a1a0a' : '#fff'; q.font = '900 50px Inter Display'; q.textAlign = 'center'; q.fillText(kind === 'beer' ? 'PIWO' : 'WÓDKA', W / 2, 66); });
  const lb = L.mesh(new THREE.CylinderGeometry(0.057, 0.057, 0.09, 24, 1, true), new THREE.MeshStandardMaterial({ map: lt, roughness: 0.6 }), 0, 0.12, 0, g); lb.rotation.y = -Math.PI / 2; return g; }
function cigPack() { const g = new THREE.Group(); const t = L.canvasTex(128, 160, (q, W, H) => { q.fillStyle = '#f2efe6'; q.fillRect(0, 0, W, H); q.fillStyle = '#c8202a'; q.beginPath(); q.arc(W / 2, H * 0.45, 40, 0, 7); q.fill(); q.fillStyle = '#fff'; q.font = '900 22px Inter Display'; q.textAlign = 'center'; q.fillText('ZIGA', W / 2, H * 0.47); q.fillStyle = '#111'; q.font = '800 16px Inter Display'; q.fillText('RETTEN', W / 2, H * 0.85); });
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }); L.mesh(L.box(0.13, 0.16, 0.05), [L.mat(0xf2efe6), L.mat(0xf2efe6), L.mat(0xf2efe6), L.mat(0xf2efe6), m, m], 0, 0.08, 0, g);
  for (let i = 0; i < 3; i++) L.mesh(L.cyl(0.009, 0.009, 0.08, 8), L.mat(i ? 0xf6f2ea : 0xd98a3a), -0.03 + i * 0.03, 0.18, 0, g); return g; }
function choco() { const g = new THREE.Group(); const t = L.canvasTex(256, 128, (q, W, H) => { q.fillStyle = '#2a4ab0'; q.fillRect(0, 0, W, H); q.fillStyle = '#f2c230'; q.font = '900 44px Inter Display'; q.textAlign = 'center'; q.fillText('SCHOKO', W / 2, 78); q.fillStyle = '#fff'; q.fillRect(0, 10, W, 6); q.fillRect(0, H - 16, W, 6); });
  L.mesh(L.box(0.36, 0.035, 0.18), [L.mat(0x2a4ab0), L.mat(0x2a4ab0), new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 }), L.mat(0x2a4ab0), L.mat(0x2a4ab0), L.mat(0x2a4ab0)], 0, 0.018, 0, g); L.mesh(L.box(0.1, 0.036, 0.181), L.mat(0xd8d8dc, { m: 0.9, r: 0.25 }), 0.14, 0.018, 0, g); return g; }
function tinCan() { const g = new THREE.Group(); const t = L.canvasTex(256, 96, (q, W, H) => { q.fillStyle = '#c8202a'; q.fillRect(0, 0, W, H); q.fillStyle = '#fff'; q.font = '900 40px Inter Display'; q.textAlign = 'center'; q.fillText('FLEISCH', W / 2, 62); });
  L.mesh(L.cyl(0.1, 0.1, 0.13, 28), L.mat(0xc8ccd2, { m: 0.9, r: 0.3 }), 0, 0.065, 0, g); const lb = L.mesh(new THREE.CylinderGeometry(0.102, 0.102, 0.09, 28, 1, true), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }), 0, 0.065, 0, g); lb.rotation.y = -Math.PI / 2; return g; }
function pocketKnife() { const g = new THREE.Group(); L.mesh(L.box(0.2, 0.03, 0.05), L.mat(0xc8202a, { r: 0.3, phys: true, cc: 0.8 }), 0, 0.015, 0, g); L.mesh(L.box(0.035, 0.032, 0.035), L.mat(0xffffff), 0, 0.017, 0, g); const bl = L.mesh(L.box(0.17, 0.008, 0.035), L.mat(0xd8dde2, { m: 1, r: 0.15 }), 0.17, 0.03, 0, g); bl.rotation.y = 0.25; return g; }
function lantern() { const g = new THREE.Group(); L.mesh(L.cyl(0.07, 0.08, 0.03, 16), L.mat(0x3a3a3a, { m: 0.7 }), 0, 0.015, 0, g); L.mesh(L.cyl(0.055, 0.055, 0.16, 16), L.mat(0xffd890, { e: 0xffb040, ei: 2.5, t: 0.9 }), 0, 0.11, 0, g); L.mesh(L.cyl(0.03, 0.07, 0.05, 16), L.mat(0x3a3a3a, { m: 0.7 }), 0, 0.21, 0, g); return g; }
function makeShip() { const g = new THREE.Group(); const sh = new THREE.Shape(); sh.moveTo(-3, -13); sh.lineTo(3, -13); sh.lineTo(3, 6); sh.quadraticCurveTo(2.6, 10, 0, 13.5); sh.quadraticCurveTo(-2.6, 10, -3, 6); sh.closePath();
  const hg = new THREE.ExtrudeGeometry(sh, { depth: 4.2, bevelEnabled: false }); hg.rotateX(-Math.PI / 2); L.mesh(hg, L.mat(0x434a52, { r: 0.5, m: 0.3 }), 0, -3, 0, g);
  const dk = new THREE.ShapeGeometry(sh); dk.rotateX(-Math.PI / 2); L.mesh(dk, L.mat(0x9a8462, { r: 0.8 }), 0, 1.21, 0, g).castShadow = false;
  const band = new THREE.ExtrudeGeometry(sh, { depth: 0.5, bevelEnabled: false }); band.rotateX(-Math.PI / 2); const bm = L.mesh(band, L.mat(0xa82a2a, { r: 0.5 }), 0, -1.65, 0, g); bm.scale.set(1.004, 1, 1.002);
  const wh = L.mat(0xeeeae0, { r: 0.5 }), dkm = L.mat(0x1d2a3a, { r: 0.2, m: 0.4 });
  L.mesh(L.box(5, 2.4, 8), wh, 0, 2.4, -1.5, g); L.mesh(L.box(4.2, 1.6, 4.5), wh, 0, 4.4, -0.5, g); L.mesh(L.box(4.4, 0.6, 2), wh, 0, 5.5, 0.6, g);
  for (const sx of [-1, 1]) for (let i = 0; i < 7; i++) L.mesh(L.box(0.02, 0.4, 0.6), dkm, sx * 2.51, 2.6, -5 + i * 1.1, g);
  for (let i = 0; i < 6; i++) L.mesh(L.box(0.6, 0.35, 0.02), dkm, -1.7 + i * 0.68, 5.55, 1.61, g);
  L.mesh(L.cyl(0.8, 0.9, 3.2, 24), L.mat(0x1a1a1a, { r: 0.5 }), 0, 6.5, -2.5, g); L.mesh(L.cyl(0.82, 0.82, 0.6, 24), L.mat(0xd8a82a, { r: 0.5 }), 0, 7.4, -2.5, g);
  for (const z of [8, -9]) { L.mesh(L.cyl(0.08, 0.1, 7, 8), L.mat(0x3a3a3a, { m: 0.6 }), 0, 4.6, z, g); L.mesh(L.box(3, 0.08, 0.08), L.mat(0x3a3a3a), 0, 6.5, z, g); }
  for (const sx of [-1, 1]) for (const z of [-3.5, 0.5]) { const lb = L.mesh(L.cap(0.35, 1.4), L.mat(0xe8742a, { r: 0.5 }), sx * 2.75, 3.9, z, g); lb.rotation.x = Math.PI / 2; }
  for (const sx of [-1, 1]) for (let i = 0; i < 16; i++) L.mesh(L.cyl(0.13, 0.13, 0.05, 16), L.mat(0xd8dde2, { m: 0.8, r: 0.25 }), sx * 3.02, -0.4, -11 + i * 1.3, g).rotation.z = Math.PI / 2;
  return g; }
function harborSet(s, o = {}) { s.background = L.skyTex('#4b8fd6', '#a9cdef', '#f3e6cf'); s.fog = new THREE.Fog(0xe9e2d4, 60, 520);
  const wt = L.makeWater(0x2f6a86); wt.position.y = -1.4; s.add(wt);
  const q = L.mesh(L.box(60, 2, 30), L.mat(0xa8a090, { r: 0.85 }), 15 + 0.5, -1, 0, s); q.receiveShadow = true; L.mesh(L.box(0.4, 0.12, 60), L.mat(0xe8d23a, { r: 0.6 }), -14.2, 0.06, 0, s);
  const sh = makeShip(); sh.position.set(-18.5, 0, 0); s.add(sh);
  for (const z of [-8, 0, 8]) { L.mesh(L.cyl(0.18, 0.22, 0.4, 14), L.mat(0x2a2a2a, { m: 0.6 }), -14, 0.2, z, s); }
  L.reseed(o.seed ?? 3); for (let i = 0; i < 10; i++) { const c = crate(i % 3 ? 'MUNITION' : 'PROVIANT'); c.position.set(-9 + (i % 4) * 0.8 + R_() * 0.2, (i > 7 ? 0.42 : 0), 4 + Math.floor(i / 4) * 0.55); c.rotation.y = (R_() - 0.5) * 0.3; s.add(c); }
  const crn = new THREE.Group(); crn.position.set(-6, 0, -10); s.add(crn); const cm = L.mat(0xd8a82a, { r: 0.5, m: 0.3 }); for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) L.mesh(L.box(0.25, 8, 0.25), cm, x, 4, z, crn); L.mesh(L.box(2.4, 1.6, 2.4), cm, 0, 8.6, 0, crn); const jib = L.mesh(L.box(12, 0.4, 0.4), cm, -5, 9.4, 0, crn); jib.rotation.z = 0.15;
  for (let i = 0; i < 4; i++) { const h = L.makeHouse([0xe9dcc4, 0xf1e1c6, 0xd8c8b0][i % 3], [0x8a3b2e, 0xa85a3a][i % 2]); h.position.set(8 + i * 6, 0, -14 - (i % 2) * 3); h.scale.setScalar(1.3); s.add(h); }
  s.add(L.makeBirds(6, V(-10, 14, -10)));
  return lights(s, { sky: 0xdfe9f7, ground: 0x8a7a66, hi: 1.15, si: 2.7, dir: [9, 11, 6], target: o.target ?? V(-8, 1, 0), sr: o.sr ?? 10 }); }
function tentInside(s, o = {}) { s.background = new THREE.Color(0x1a140c); if (ENV) s.environment = ENV;
  const m = L.mat(o.col ?? 0xb8a878, { fab: true, r: 0.95, ds: true }); const wall = L.mesh(new THREE.CylinderGeometry(4.2, 4.2, 1.6, 40, 1, true), m, 0, 0.8, 0, s); wall.castShadow = false; const roof = L.mesh(new THREE.ConeGeometry(4.4, 3.6, 40, 1, true), m, 0, 3.4, 0, s); roof.castShadow = false;
  L.mesh(L.cyl(0.06, 0.06, 5.2, 10), L.mat(0x6a4a2a), 0, 2.6, 0, s); const fl = L.mesh(new THREE.CircleGeometry(4.2, 40), L.mat(0x8a7454, { r: 1, fab: true }), 0, 0.01, 0, s); fl.rotation.x = -Math.PI / 2; fl.castShadow = false;
  const night = !!o.night; s.add(new THREE.HemisphereLight(night ? 0x5a6a9a : 0xfff0d0, 0x4a3a22, night ? 0.45 : 1.0));
  const pl = new THREE.PointLight(0xffb860, night ? 14 : 8, 9, 1.6); pl.position.set(o.lx ?? 1.2, 1.4, o.lz ?? 1.0); pl.castShadow = true; pl.shadow.mapSize.set(1024, 1024); s.add(pl); const ln = lantern(); ln.position.set(o.lx ?? 1.2, 1.15, o.lz ?? 1.0); s.add(ln); const lt = L.mesh(L.box(0.4, 0.05, 0.4), L.mat(0x6a4a2a), o.lx ?? 1.2, 1.12, o.lz ?? 1.0, s);
  if (!night) { const sun = new THREE.DirectionalLight(0xfff0d0, 1.2); sun.position.set(3, 8, 5); s.add(sun); }
  return pl; }
function tileTex() { return L.canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#9fb8c8'; g.fillRect(0, 0, w, h); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 5 === 0 ? '#5a8aa8' : '#e8f0f4'; g.fillRect(x * 32 + 2, y * 32 + 2, 28, 28); } }, 4); }
function bathhouse(s) { s.background = new THREE.Color(0x101820); if (ENV) s.environment = ENV;
  const room = L.mesh(L.box(8, 3.6, 7), new THREE.MeshStandardMaterial({ map: tileTex(), roughness: 0.25, side: THREE.BackSide, envMapIntensity: 0.6 }), 0, 1.8, 0, s); room.castShadow = false;
  const fl = L.mesh(new THREE.PlaneGeometry(8, 7), new THREE.MeshStandardMaterial({ map: tileTex(), roughness: 0.2, color: 0xb8c8d0 }), 0, 0.01, 0, s); fl.rotation.x = -Math.PI / 2;
  const pm = L.mat(0xb8bec4, { m: 0.9, r: 0.25 }); for (const x of [-2.5, -0.8, 0.9]) { L.mesh(L.cyl(0.03, 0.03, 1.2, 8), pm, x, 2.8, -3.45, s); const h = L.mesh(L.cyl(0.13, 0.05, 0.1, 16), pm, x, 2.2, -3.3, s); h.rotation.x = 0.5; L.mesh(L.cyl(0.03, 0.03, 0.2, 8), pm, x, 2.25, -3.4, s).rotation.x = Math.PI / 2; }
  const rail = L.mesh(L.cyl(0.02, 0.02, 3, 8), pm, 2.6, 2.5, -2.0, s); rail.rotation.x = Math.PI / 2;
  const cur = new THREE.Group(); cur.position.set(2.6, 0, -2.0); s.add(cur); const ct = L.canvasTex(128, 128, (g, w, h) => { for (let x = 0; x < 8; x++) { g.fillStyle = x % 2 ? '#e8e2d0' : '#2a6fb0'; g.fillRect(x * 16, 0, 16, h); } });
  for (let i = 0; i < 9; i++) { const p = L.mesh(L.box(0.02, 2.3, 0.34), new THREE.MeshStandardMaterial({ map: ct, roughness: 0.8 }), Math.sin(i * 1.7) * 0.06, 1.3, -1.35 + i * 0.3, cur); p.rotation.y = Math.sin(i) * 0.3; }
  L.mesh(L.box(1.8, 0.08, 0.4), L.mat(0x8a5a32, { r: 0.6 }), -1.5, 0.45, 2.8, s); for (const x of [-2.2, -0.8]) L.mesh(L.box(0.08, 0.45, 0.35), L.mat(0x6a4a2a), x, 0.22, 2.8, s);
  const tw = L.mesh(L.box(0.5, 0.05, 0.35), L.mat(0xf2f2ee, { fab: true }), -1.4, 0.51, 2.8, s);
  const door = L.mesh(L.box(1.4, 2.4, 0.06), L.mat(0x2a2a2a), -3.98, 1.2, 0.5, s); door.rotation.y = Math.PI / 2; const doorLight = new THREE.PointLight(0xfff0d0, 8, 6); doorLight.position.set(-3.5, 2, 0.5); s.add(doorLight);
  s.add(new THREE.HemisphereLight(0xd8eaff, 0x4a5a6a, 1.0)); const d = new THREE.DirectionalLight(0xffffff, 1.4); d.position.set(2, 6, 4); d.castShadow = true; d.shadow.mapSize.set(1024, 1024); const c = d.shadow.camera; c.left = c.bottom = -5; c.right = c.top = 5; s.add(d);
  if (!DUSTTEX) dust(s, 0); const st = []; for (let i = 0; i < 16; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: DUSTTEX, color: 0xffffff, transparent: true, depthWrite: false, opacity: 0.3 })); sp.userData.ph = i / 16; s.add(sp); st.push(sp); }
  L.tick((t, T) => st.forEach((sp, i) => { const k = (T * 0.15 + sp.userData.ph) % 1; sp.position.set(-2.5 + (i % 4) * 1.4 + Math.sin(T * 0.5 + i) * 0.4, 0.5 + k * 3, -2.8 + (i % 3) * 0.6); sp.scale.setScalar(1.5 + k * 2); sp.material.opacity = 0.28 * Math.sin(k * Math.PI); }));
  return cur; }
function emblemDraw(g, r, col = '#5a3418') { // bear carrying a shell, centred at 0,0, radius r
  g.save(); g.fillStyle = '#f4ecd8'; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); g.lineWidth = r * 0.09; g.strokeStyle = '#b3202a'; g.stroke(); g.lineWidth = r * 0.03; g.strokeStyle = '#3a2a1a'; g.beginPath(); g.arc(0, 0, r * 0.88, 0, 7); g.stroke();
  g.fillStyle = col; const e = (x, y, a, b, rot = 0) => { g.beginPath(); g.ellipse(x * r, y * r, a * r, b * r, rot, 0, 7); g.fill(); };
  e(-0.02, 0.12, 0.25, 0.34, 0.15); e(0.08, -0.32, 0.17, 0.15); e(-0.02, -0.44, 0.06, 0.06); e(0.17, -0.44, 0.06, 0.06); e(0.24, -0.3, 0.1, 0.07, 0.2);
  e(-0.12, 0.5, 0.09, 0.2, 0.25); e(0.12, 0.5, 0.09, 0.2, -0.3); e(-0.2, 0.68, 0.12, 0.05); e(0.2, 0.68, 0.12, 0.05);
  g.save(); g.translate(r * 0.08, -r * 0.62); g.rotate(-0.5); g.fillStyle = '#c9902a'; g.beginPath(); g.roundRect(-r * 0.09, -r * 0.05, r * 0.18, r * 0.42, r * 0.02); g.fill(); g.fillStyle = '#9a9aa2'; g.beginPath(); g.moveTo(-r * 0.09, -r * 0.05); g.quadraticCurveTo(0, -r * 0.3, r * 0.09, -r * 0.05); g.fill(); g.restore();
  g.lineCap = 'round'; g.strokeStyle = col; g.lineWidth = r * 0.12; g.beginPath(); g.moveTo(-r * 0.12, -r * 0.05); g.lineTo(-r * 0.02, -r * 0.48); g.moveTo(r * 0.12, -r * 0.02); g.lineTo(r * 0.2, -r * 0.42); g.stroke(); g.restore(); }
function emblemTex() { return L.canvasTex(512, 512, (g, w, h) => { g.clearRect(0, 0, w, h); g.translate(w / 2, h / 2); emblemDraw(g, w * 0.46); }); }
function soldbuch(g, W, H, k, T) { if (k <= 0) return; const e = 1 - Math.pow(1 - clamp(k), 3); const w = W * 0.78, h = W * 0.56; g.save(); g.translate(W / 2, H * 0.22 + (1 - e) * H * 0.5); g.rotate(-0.05 + (1 - e) * 0.3);
  g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 30; g.fillStyle = '#e9dfc4'; g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, W * 0.015); g.fill(); g.shadowColor = 'transparent';
  g.fillStyle = '#7a1d22'; g.fillRect(-w / 2, -h / 2, w, h * 0.2); g.fillStyle = '#fff'; g.font = `900 ${W * 0.06}px "Inter Display"`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SOLDBUCH', 0, -h / 2 + h * 0.1);
  const rows = [['NAME', 'WOJTEK'], ['DIENSTGRAD', 'SOLDAT'], ['EINHEIT', '22. KOMPANIE'], ['NUMMER', '']]; g.textAlign = 'left';
  rows.forEach(([a, b], i) => { const y = -h / 2 + h * (0.31 + i * 0.165); const kk = clamp(k * 4 - 1 - i * 0.6); if (kk <= 0) return; g.globalAlpha = kk; g.fillStyle = '#6a5a3a'; g.font = `800 ${W * 0.03}px "Inter Display"`; g.fillText(a, -w / 2 + W * 0.04, y); g.fillStyle = '#1a2a6a'; g.font = `900 ${W * 0.048}px "Inter Display"`;
    if (b) g.fillText(b, -w / 2 + W * 0.25, y); else { g.fillRect(-w / 2 + W * 0.25, y - W * 0.02, W * 0.2, W * 0.04); } g.strokeStyle = 'rgba(90,70,40,0.3)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-w / 2 + W * 0.04, y + W * 0.035); g.lineTo(w / 2 - W * 0.22, y + W * 0.035); g.stroke(); g.globalAlpha = 1; });
  const pk = clamp(k * 4 - 3.2); if (pk > 0) { g.save(); g.translate(w / 2 - W * 0.12, h * 0.12); g.scale(1 + (1 - pk) * 1.5, 1 + (1 - pk) * 1.5); g.globalAlpha = pk; g.fillStyle = '#5a3418'; const p = (x, y, a, b) => { g.beginPath(); g.ellipse(x * W, y * W, a * W, b * W, 0, 0, 7); g.fill(); }; p(0, 0.02, 0.05, 0.04); p(-0.045, -0.04, 0.016, 0.02); p(-0.015, -0.06, 0.016, 0.02); p(0.017, -0.06, 0.016, 0.02); p(0.047, -0.04, 0.016, 0.02); g.restore(); }
  g.restore(); }
function chevrons(par, n = 2, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); par.add(g); const m = L.mat(0xf2e6b0, { r: 0.5 }); for (let i = 0; i < n; i++) for (const sx of [-1, 1]) { const b = L.mesh(L.box(0.13, 0.03, 0.02), m, sx * 0.05, -i * 0.05, 0, g); b.rotation.z = sx * 0.55; } return g; }
function castle(s, x, z, sc = 1) { const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(sc); s.add(g); const rk = L.mat(0x5a5a52, { r: 1 }), st = L.mat(0xa89a80, { r: 0.9 }), rf = L.mat(0x4a4a52, { r: 0.7 });
  const r = L.mesh(new THREE.DodecahedronGeometry(14, 1), rk, 0, 2, 0, g); r.scale.set(1.6, 0.75, 1); r.castShadow = false;
  L.mesh(L.box(26, 5, 10), st, 0, 13, 0, g); for (let i = 0; i < 13; i++) L.mesh(L.box(1, 1, 10.4), st, -12 + i * 2, 16, 0, g);
  L.mesh(L.box(8, 9, 7), st, -6, 18, -1, g); L.mesh(new THREE.ConeGeometry(5.5, 3, 4), rf, -6, 24, -1, g).rotation.y = Math.PI / 4; L.mesh(L.cyl(2.2, 2.4, 12, 16), st, 8, 17, 1, g); L.mesh(new THREE.ConeGeometry(2.6, 3.5, 16), rf, 8, 24.7, 1, g);
  L.mesh(L.box(10, 6, 6), st, 2, 17, -2, g); const fl = L.mesh(new THREE.PlaneGeometry(2.4, 1.5), new THREE.MeshStandardMaterial({ map: L.canvasTex(128, 80, (q, w, h) => { q.fillStyle = '#1d5fc4'; q.fillRect(0, 0, w, h); q.strokeStyle = '#fff'; q.lineWidth = 14; q.beginPath(); q.moveTo(0, 0); q.lineTo(w, h); q.moveTo(w, 0); q.lineTo(0, h); q.stroke(); }), side: THREE.DoubleSide }), -4.8, 28, -1, g);
  L.mesh(L.cyl(0.08, 0.08, 4, 6), L.mat(0x222222), -6, 27, -1, g); L.tick((t, T) => { fl.rotation.y = Math.sin(T * 2) * 0.2; }); return g; }
function greenLand(s, o = {}) { s.background = L.skyTex(o.top ?? '#5a86b8', o.mid ?? '#b8cde0', o.bot ?? '#e8eef2'); s.fog = new THREE.Fog(o.fog ?? 0xdde6ec, 60, 500); ground(s, grassTex2());
  const hm = L.mat(0x5f8a48, { r: 1, env: 0.1 }); L.reseed(o.seed ?? 8); for (let i = 0; i < 14; i++) { const a = -Math.PI / 2 + (i / 13 - 0.5) * 2.6; const h = L.mesh(L.sph(60 + R_() * 40, 20), hm, Math.cos(a) * 340, -30, Math.sin(a) * 340, s); h.scale.y = 0.5 + R_() * 0.3; h.castShadow = false; }
  for (let i = 0; i < 7; i++) { const c = L.makeCloud(7 + R_() * 6); c.position.set(-220 + i * 75, 55 + R_() * 20, -260); s.add(c); }
  return lights(s, { sky: 0xdfe9f7, ground: 0x5a7a3a, hi: o.hi ?? 1.2, si: o.si ?? 2.2, dir: o.dir ?? [7, 10, 6], target: o.target ?? V(0, 1, 0), sr: o.sr ?? 8 }); }
function zooSet(s, o = {}) { const L_ = greenLand(s, { ...o, sr: 9 }); const rk = L.mat(0x8a8478, { r: 0.95 });
  L.reseed(5); for (let i = 0; i < 7; i++) { const r = L.mesh(new THREE.DodecahedronGeometry(0.9 + R_() * 0.9, 0), rk, -4 + i * 1.3 + R_() * 0.4, 0.3, -5.5 - R_() * 1.5, s); r.rotation.set(R_(), R_(), R_()); }
  const pool = L.mesh(new THREE.CircleGeometry(1.6, 32), L.mat(0x3a7aa0, { r: 0.1, m: 0.2, phys: true, cc: 1 }), 3.2, 0.03, -3.2, s); pool.rotation.x = -Math.PI / 2; pool.scale.y = 0.6;
  L.mesh(L.box(14, 0.6, 0.3), L.mat(0xb8a888, { r: 0.9 }), 0, 0.3, 1.2, s); const bars = L.makeBars(14, 1.6); bars.position.set(0, 0.6, 1.2); s.add(bars);
  const sg = L.shopSign('EDINBURGH ZOO', '#1d4a2a', '#f4e6c0', 3.4); sg.position.set(-3.6, 2.7, 1.45); s.add(sg); L.mesh(L.cyl(0.06, 0.06, 2.6, 8), L.mat(0x3a3a3a), -5.1, 1.3, 1.4, s); L.mesh(L.cyl(0.06, 0.06, 2.6, 8), L.mat(0x3a3a3a), -2.1, 1.3, 1.4, s);
  for (const [x, z, sc] of [[-7, -7, 1.2], [6.5, -7.5, 1.4], [9, -2, 1]]) { const t = L.makeTree(sc); t.position.set(x, 0, z); s.add(t); }
  const path = L.mesh(new THREE.PlaneGeometry(30, 2.4), L.mat(0xc8b89a, { r: 0.9 }), 0, 0.02, 2.8, s); path.rotation.x = -Math.PI / 2; path.castShadow = false; return L_; }
function cassinoSet(s, o = {}) { s.background = L.skyTex(o.top ?? '#5a6a8a', o.mid ?? '#c8a890', o.bot ?? '#f0c8a0'); s.fog = new THREE.Fog(o.fog ?? 0xc8b0a0, 40, 400);
  ground(s, grassTex2(9, '#8a8a52'));
  const hm = L.mat(0x7a7a4a, { r: 1, env: 0.1 }), rk = L.mat(0x9a9080, { r: 1 }); const hill = L.mesh(new THREE.CylinderGeometry(22, 95, 60, 12), hm, 0, 28, -170, s); hill.castShadow = false;
  for (const [x, z, r, h] of [[-90, -150, 70, 35], [95, -160, 80, 42], [-150, -220, 90, 50], [160, -230, 90, 45]]) L.mesh(new THREE.CylinderGeometry(r * 0.3, r, h, 10), hm, x, h / 2 - 2, z, s).castShadow = false;
  const mo = new THREE.Group(); mo.position.set(0, 58, -170); s.add(mo); const wm = L.mat(0xeee4cc, { r: 0.8 }), rf = L.mat(0x9a4a30, { r: 0.7 }), wn = L.mat(0x3a3028);
  L.mesh(L.box(34, 7, 14), wm, 0, 3.5, 0, mo); L.mesh(L.box(34.4, 1.2, 14.4), rf, 0, 7.4, 0, mo); L.mesh(L.box(10, 6, 10), wm, 0, 9, 0, mo); L.mesh(new THREE.ConeGeometry(7.2, 3, 4), rf, 0, 13.5, 0, mo).rotation.y = Math.PI / 4;
  for (let r = 0; r < 2; r++) for (let i = 0; i < 16; i++) L.mesh(L.box(0.8, 1.4, 0.1), wn, -15 + i * 2, 2 + r * 2.6, 7.05, mo);
  L.reseed(o.seed ?? 6); for (let i = 0; i < 40; i++) { const r = L.mesh(new THREE.DodecahedronGeometry(0.4 + R_() * 1.2, 0), rk, (R_() - 0.5) * 80, 0.2, -10 - R_() * 70, s); r.rotation.set(R_(), R_(), R_()); }
  for (let i = 0; i < 14; i++) { const t = L.makeTree(0.7 + R_() * 0.5); t.position.set((R_() - 0.5) * 90, 0, -15 - R_() * 60); s.add(t); }
  return lights(s, { sky: 0xffe0c0, ground: 0x6a6a4a, hi: o.hi ?? 1.05, si: o.si ?? 2.3, dir: o.dir ?? [-6, 7, 8], sun: 0xffd0a0, target: o.target ?? V(0, 1, 0), sr: o.sr ?? 9 }); }
function smokeCols(s, pts, col = 0x8a8a8a, size = 8, n = 8) { if (!DUSTTEX) dust(s, 0); const ps = []; pts.forEach((p, j) => { for (let i = 0; i < n; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: DUSTTEX, color: col, transparent: true, depthWrite: false, opacity: 0.7 })); sp.userData = { p, ph: i / n, j }; s.add(sp); ps.push(sp); } });
  return T => ps.forEach(sp => { const { p, ph, j } = sp.userData; const k = (T * 0.1 + ph + j * 0.13) % 1; sp.position.set(p.x + Math.sin(k * 3 + j) * size * 0.3 + k * size * 0.9, p.y + k * size * 2.4, p.z); sp.scale.setScalar(size * (0.5 + k * 1.3)); sp.material.opacity = 0.75 * Math.sin(Math.min(1, k * 1.3) * Math.PI * 0.95 + 0.05); }); }
function flashes(s, pts, size = 10) { const fs = pts.map(p => { const f = sparkle(s, 0xffa040, size); f.position.copy(p); return f; }); return T => fs.forEach((f, i) => { const k = (T * 0.7 + i * 0.37) % 1; f.visible = k < 0.12; f.scale.setScalar(size * (0.5 + k * 6)); f.material.opacity = 1 - k * 6; }); }
function zzz(g, W, H, T, x, y, k = 1) { if (k <= 0) return; g.save(); g.textAlign = 'center'; g.lineJoin = 'round'; for (let i = 0; i < 3; i++) { const ph = (T * 0.5 + i / 3) % 1; const sz = W * (0.05 + ph * 0.05); g.globalAlpha = k * Math.sin(ph * Math.PI); g.font = `900 ${sz}px "Inter Display"`; g.lineWidth = sz * 0.15; g.strokeStyle = '#000'; const px = W * x + ph * W * 0.08 + Math.sin(T * 3 + i) * W * 0.01, py = H * y - ph * H * 0.1; g.strokeText('Z', px, py); g.fillStyle = '#fff'; g.fillText('Z', px, py); } g.restore(); }
function heightBar(g, W, H, k, frac, x = 0.86) { if (k <= 0) return; g.save(); g.globalAlpha = clamp(k * 3); const y0 = H * 0.55, y1 = H * 0.14; g.fillStyle = 'rgba(10,12,30,0.55)'; g.beginPath(); g.roundRect(W * x - W * 0.035, y1 - W * 0.02, W * 0.07, y0 - y1 + W * 0.04, W * 0.035); g.fill();
  const yy = y0 - (y0 - y1) * frac; const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, '#4CFF7A'); gr.addColorStop(1, '#FFD60A'); g.fillStyle = gr; g.beginPath(); g.roundRect(W * x - W * 0.022, yy, W * 0.044, y0 - yy, W * 0.022); g.fill();
  g.font = `900 ${W * 0.04}px "Inter Display"`; g.textAlign = 'right'; g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = 8; g.fillText('GRÖSSE', W * x - W * 0.05, yy + W * 0.015); g.restore(); }
function emblem2d(g, W, H, k, x = 0.5, y = 0.25, r = 0.22) { if (k <= 0) return; const e = backOut(clamp(k)); g.save(); g.translate(W * x, H * y); g.scale(e, e); g.rotate((1 - clamp(k)) * -0.6); g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 30; g.fillStyle = '#000'; g.beginPath(); g.arc(0, 0, W * r, 0, 7); g.fill(); g.shadowColor = 'transparent'; emblemDraw(g, W * r); g.restore(); }
function ctaOverlay(g, W, H, u) {
  const kL = clamp((u - 0.45) * 4), kS = clamp((u - 0.62) * 4);
  if (u > 0.4) { const e = backOut(clamp((u - 0.4) * 5)); const liked = kL > 0.5; g.save(); g.translate(W * 0.28, H * 0.11); g.scale(e * (liked ? 1 + 0.15 * Math.sin(clamp((kL - 0.5) * 2) * Math.PI) : 1), e); g.fillStyle = 'rgba(15,15,20,0.75)'; g.beginPath(); g.arc(0, 0, W * 0.11, 0, 7); g.fill();
    g.fillStyle = liked ? '#ff2d55' : '#fff'; g.beginPath(); const r0 = W * 0.045; g.moveTo(0, r0 * 1.3); g.bezierCurveTo(-r0 * 2.2, -r0 * 0.2, -r0 * 0.9, -r0 * 1.7, 0, -r0 * 0.6); g.bezierCurveTo(r0 * 0.9, -r0 * 1.7, r0 * 2.2, -r0 * 0.2, 0, r0 * 1.3); g.fill(); g.restore();
    g.save(); g.globalAlpha = clamp((u - 0.4) * 5); g.font = `900 ${W * 0.045}px "Inter Display"`; g.textAlign = 'center'; g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = 10; g.fillText('LIKE', W * 0.28, H * 0.11 + W * 0.17); g.restore(); }
  if (u > 0.5) { const e = backOut(clamp((u - 0.5) * 5)); const done = kS > 0.5; g.save(); g.translate(W * 0.66, H * 0.11); g.scale(e * (done ? 0.95 : 1), e); g.fillStyle = done ? '#5a5a62' : '#e8202a'; g.beginPath(); g.roundRect(-W * 0.2, -W * 0.065, W * 0.4, W * 0.13, W * 0.065); g.fill(); g.fillStyle = '#fff'; g.font = `900 ${W * 0.05}px "Inter Display"`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(done ? 'ABONNIERT ✓' : 'ABONNIEREN', 0, 3); g.restore(); }
  const cx = u < 0.55 ? W * 0.28 : W * 0.66, tap = (u > 0.42 && u < 0.5) || (u > 0.6 && u < 0.68); if (u > 0.38 && u < 0.85) { g.save(); g.translate(cx + W * 0.03, H * 0.11 + W * 0.04); g.scale(tap ? 0.85 : 1, tap ? 0.85 : 1); g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = W * 0.006; g.beginPath(); g.arc(0, 0, W * 0.03, 0, 7); g.fill(); g.stroke(); g.restore(); }
  chip(g, W, H, 'GLEICH GEHT’S WEITER', '#2a5ad6', W / 2, H * 0.25, (u - 0.1) * 3, 0.045); }
function camp(s, o = {}) { return desert(s, { camp: [[-5, -7, 0.3], [4.5, -9, -0.4], [-1, -13, 0], [9, -4, -0.8], [-10, -3, 0.6]], clear: [0, -4, 14, 12], ...o }); }

// ================= VIDEO 08 – Die Taschenuhr von Gallipoli (1915) =================
const OTC = 0x8b8660;
const OTTO = i => ({ skin: [0xe9b48c, 0xdba383, 0xf0c09a, 0xc68a5e, 0xe2a77f][i % 5], shirt: OTC, sleeve: OTC, pants: 0x7a7550, hair: [0x2a1a10, 0x111111, 0x3a2a1a][i % 3], mustache: i % 2 === 0, armSkin: false, shoes: 0x3a2a1a });
const KEMAL = { skin: 0xf0c8a8, shirt: 0x6e6e5a, sleeve: 0x6e6e5a, pants: 0x5e5e4c, hair: 0xb08a50, mustache: false, armSkin: false, shoes: 0x1a1a1a };
const KEMAL_SUIT = { skin: 0xf0c8a8, shirt: 0x26262e, sleeve: 0x26262e, pants: 0x26262e, hair: 0xb08a50, mustache: false, suit: true, tie: 0x9b1d2a, armSkin: false, shoes: 0x111111 };
const LIMAN = { skin: 0xf2c4a0, shirt: 0x6a7062, sleeve: 0x6a7062, pants: 0x5a6052, hair: 0xd0d0d0, mustache: true, armSkin: false, shoes: 0x111111, belly: true };
const ENTENTE = i => ({ skin: [0xf3c7a8, 0xe9b48c, 0xf6c9a5][i % 3], shirt: KHAKI, sleeve: KHAKI, pants: 0x7a6f48, hair: [0xc9952b, 0x5a3a1a, 0x2a1a10][i % 3], mustache: i % 2 === 1, armSkin: false, shoes: 0x3a2210 });
function kalpak(c, col = 0x6a6458) { const h = new THREE.Group(); h.position.set(0, 0.2, 0); c.head.add(h); L.mesh(L.cyl(0.33, 0.35, 0.3, 32), L.mat(col, { fab: true, r: 1 }), 0, 0.15, 0, h); L.mesh(L.sph(0.33, 24), L.mat(col, { fab: true, r: 1 }), 0, 0.28, 0, h).scale.set(1, 0.18, 1); return h; }
function kabalak(c) { const h = new THREE.Group(); h.position.set(0, 0.17, 0); c.head.add(h); const m = L.mat(0x9a9468, { fab: true, r: 0.95 }); L.mesh(L.sph(0.37, 28), m, 0, 0.02, 0, h).scale.set(1, 0.72, 1.02); for (let i = 0; i < 3; i++) { const t = L.mesh(new THREE.TorusGeometry(0.33 - i * 0.07, 0.045, 8, 28), m, 0, 0.0 + i * 0.09, 0, h); t.rotation.x = Math.PI / 2 + (i - 1) * 0.15; } return h; }
function gcap(c) { const h = new THREE.Group(); h.position.set(0, 0.25, 0); h.rotation.x = -0.06; c.head.add(h); L.mesh(L.cyl(0.37, 0.31, 0.15, 32), L.mat(0x6a7062, { fab: true }), 0, 0.1, 0, h); L.mesh(L.cyl(0.315, 0.315, 0.07, 32), L.mat(0xb3202a, { fab: true }), 0, 0.02, 0, h); const v = L.mesh(L.box(0.42, 0.025, 0.2), L.mat(0x111111, { r: 0.25, phys: true, cc: 1 }), 0, -0.02, 0.32, h); v.rotation.x = 0.3; L.mesh(L.sph(0.035, 12), gold(), 0, 0.08, 0.33, h); return h; }
function otto(s, i, x, z, ry = 0) { const c = guy(s, OTTO(i), x, 0, z, ry); c.hat = kabalak(c); L.mesh(L.cyl(0.262, 0.262, 0.07), L.mat(0x6a5a3a, { fab: true }), 0, 0.8, 0, c.g).scale.z = 0.82; return c; }
function kemal(s, x, z, ry = 0) { const c = guy(s, KEMAL, x, 0, z, ry); c.hat = kalpak(c); L.mesh(L.cyl(0.262, 0.262, 0.07), L.mat(0x4a3018, { r: 0.4, phys: true, cc: 0.5 }), 0, 0.8, 0, c.g).scale.z = 0.82; for (const sx of [-1, 1]) L.mesh(L.box(0.06, 0.05, 0.02), L.mat(0xb3202a), sx * 0.07, 1.3, 0.13, c.g); return c; }
function liman(s, x, z, ry = 0) { const c = guy(s, LIMAN, x, 0, z, ry); c.hat = gcap(c); for (const sx of [-1, 1]) { const e = L.mesh(L.box(0.16, 0.03, 0.14), gold(), sx * 0.26, 1.33, 0, c.g); e.rotation.z = sx * -0.25; } return c; }
function entente(s, i, x, z, ry = 0) { const c = guy(s, ENTENTE(i), x, 0, z, ry); c.hat = slouchHat(c.head, 0x8a7048); return c; }
function binoculars() { const g = new THREE.Group(); const m = L.mat(0x1a1a1a, { r: 0.4 }); for (const sx of [-1, 1]) { L.mesh(L.cyl(0.04, 0.05, 0.16, 16), m, sx * 0.05, 0, 0, g).rotation.x = Math.PI / 2; } L.mesh(L.box(0.06, 0.03, 0.05), m, 0, 0, 0, g); return g; }
function flagTex() { return L.canvasTex(300, 200, (q, w, h) => { q.fillStyle = '#e30a17'; q.fillRect(0, 0, w, h); q.fillStyle = '#fff'; q.beginPath(); q.arc(w * 0.38, h / 2, h * 0.25, 0, 7); q.fill(); q.fillStyle = '#e30a17'; q.beginPath(); q.arc(w * 0.42, h / 2, h * 0.2, 0, 7); q.fill(); q.fillStyle = '#fff'; q.save(); q.translate(w * 0.56, h / 2); q.rotate(-Math.PI / 2); q.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? h * 0.05 : h * 0.125; const a = i / 10 * Math.PI * 2; q.lineTo(Math.cos(a) * r, Math.sin(a) * r); } q.fill(); q.restore(); }); }
function flag(s, x, y, z, w = 1.5, pole = 3) { const g = new THREE.Group(); g.position.set(x, y, z); s.add(g); L.mesh(L.cyl(0.03, 0.035, pole, 8), L.mat(0xd8d8d8, { m: 0.7, r: 0.3 }), 0, pole / 2, 0, g); L.mesh(L.sph(0.06, 10), gold(), 0, pole + 0.03, 0, g);
  const geo = new THREE.PlaneGeometry(w, w * 0.66, 24, 6); geo.translate(w / 2, 0, 0); const base = geo.attributes.position.array.slice(); const f = L.mesh(geo, new THREE.MeshStandardMaterial({ map: flagTex(), side: THREE.DoubleSide, roughness: 0.8 }), 0, pole - w * 0.36, 0, g);
  L.tick((t, T) => { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x0 = base[i * 3]; p.setZ(i, Math.sin(x0 * 3 - T * 6) * 0.08 * x0 / w * 1.5); } p.needsUpdate = true; geo.computeVertexNormals(); }); return g; }
function dialTex(crack = false) { return L.canvasTex(512, 512, (g, w, h) => { const c = w / 2; g.fillStyle = '#f6efdc'; g.fillRect(0, 0, w, h); g.strokeStyle = '#3a2a1a'; g.lineWidth = 6; g.beginPath(); g.arc(c, c, c * 0.92, 0, 7); g.stroke();
  const R = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI']; g.fillStyle = '#1a1208'; g.font = '700 54px Liberation Serif, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  R.forEach((t, i) => { const a = i / 12 * Math.PI * 2 - Math.PI / 2; g.save(); g.translate(c + Math.cos(a) * c * 0.72, c + Math.sin(a) * c * 0.72); g.rotate(a + Math.PI / 2); g.fillText(t, 0, 0); g.restore(); });
  for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2; g.lineWidth = i % 5 ? 2 : 5; g.beginPath(); g.moveTo(c + Math.cos(a) * c * 0.86, c + Math.sin(a) * c * 0.86); g.lineTo(c + Math.cos(a) * c * 0.9, c + Math.sin(a) * c * 0.9); g.stroke(); }
  g.lineWidth = 3; g.beginPath(); g.arc(c, c * 1.45, c * 0.16, 0, 7); g.stroke();
  if (crack) { const r = L.mulberry(4); g.strokeStyle = 'rgba(40,40,40,0.85)'; g.lineWidth = 3; const ox = c * 1.35, oy = c * 0.7; for (let i = 0; i < 9; i++) { let x = ox, y = oy; g.beginPath(); g.moveTo(x, y); const a = i / 9 * 6.28 + r(); for (let k = 0; k < 5; k++) { x += Math.cos(a + (r() - 0.5) * 0.8) * 40; y += Math.sin(a + (r() - 0.5) * 0.8) * 40; g.lineTo(x, y); } g.stroke(); } g.fillStyle = 'rgba(60,50,40,0.5)'; g.beginPath(); g.arc(ox, oy, 26, 0, 7); g.fill(); } }); }
function pocketWatch(o = {}) { const g = new THREE.Group(); const gm = L.mat(o.col ?? 0xe0b84a, { m: 1, r: 0.22, env: 1.3 });
  const cs = L.mesh(L.cyl(1, 1, 0.28, 64), gm, 0, 0, 0, g); cs.rotation.x = Math.PI / 2; L.mesh(new THREE.TorusGeometry(0.97, 0.07, 12, 64), gm, 0, 0, 0.14, g); L.mesh(new THREE.TorusGeometry(0.97, 0.07, 12, 64), gm, 0, 0, -0.14, g);
  const face = L.mesh(new THREE.CircleGeometry(0.92, 64), new THREE.MeshStandardMaterial({ map: dialTex(!!o.dent), roughness: 0.5 }), 0, 0, 0.145, g); face.castShadow = false;
  const hm = L.mat(0x1a1208, { r: 0.3, m: 0.5 }); const hh = new THREE.Group(); hh.position.z = 0.16; g.add(hh); L.mesh(L.box(0.06, 0.45, 0.015), hm, 0, 0.2, 0, hh); const mh = new THREE.Group(); mh.position.z = 0.17; g.add(mh); L.mesh(L.box(0.04, 0.72, 0.015), hm, 0, 0.33, 0, mh); L.mesh(L.cyl(0.05, 0.05, 0.03, 16), gm, 0, 0, 0.18, g).rotation.x = Math.PI / 2;
  const sh = new THREE.Group(); sh.position.set(0, -0.4, 0.165); g.add(sh); L.mesh(L.box(0.015, 0.14, 0.01), L.mat(0xb3202a), 0, 0.06, 0, sh);
  const gl = L.mesh(new THREE.CircleGeometry(0.93, 64), L.mat(0xffffff, { t: 0.12, r: 0.02, phys: true, cc: 1, env: 2 }), 0, 0, 0.2, g); gl.castShadow = false;
  L.mesh(L.cyl(0.1, 0.12, 0.2, 16), gm, 0, 1.08, 0, g); const ring = L.mesh(new THREE.TorusGeometry(0.17, 0.035, 10, 24), gm, 0, 1.3, 0, g);
  const pts = []; for (let i = 0; i <= 20; i++) { const k = i / 20; pts.push(V(Math.sin(k * 2.2) * 1.6 * k, 1.45 + Math.sin(k * Math.PI) * 0.4 - k * 2.6, -0.3 * k)); } const chain = L.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.03, 6), gm, 0, 0, 0, g); chain.visible = o.chain !== false;
  if (o.dent) { const sd = L.mesh(new THREE.DodecahedronGeometry(0.16, 0), L.mat(0x3a3a3c, { m: 0.8, r: 0.5 }), 0.34, 0.27, 0.22, g); sd.scale.set(1.2, 0.8, 0.6); sd.rotation.set(0.4, 0.8, 0.2); for (let i = 0; i < 6; i++) { const d = L.mesh(L.sph(0.08, 10), L.mat(0xb08a38, { m: 1, r: 0.35 }), 0.34 + Math.cos(i) * 0.15, 0.27 + Math.sin(i) * 0.15, 0.17, g); d.scale.z = 0.4; } }
  const w = { g, hh, mh, sh, stopped: !!o.dent }; w.time = (T, base = 10.15) => { const tt = w.stopped ? 0 : T; const hrs = base + tt / 3600 * 60; hh.rotation.z = -(hrs % 12) / 12 * Math.PI * 2; mh.rotation.z = -(hrs % 1) * Math.PI * 2; sh.rotation.z = -Math.floor(tt) / 60 * Math.PI * 2 * (w.stopped ? 0 : 1) - (w.stopped ? 1.2 : 0); }; w.time(0); return w; }
function battleship(col = 0x6a7078) { const g = new THREE.Group(); const sh = new THREE.Shape(); sh.moveTo(0, -13); sh.quadraticCurveTo(2.6, -9, 2.6, -5); sh.lineTo(2.6, 8); sh.quadraticCurveTo(2.4, 11, 0, 14); sh.quadraticCurveTo(-2.4, 11, -2.6, 8); sh.lineTo(-2.6, -5); sh.quadraticCurveTo(-2.6, -9, 0, -13);
  const hg = new THREE.ExtrudeGeometry(sh, { depth: 3.4, bevelEnabled: false }); hg.rotateX(-Math.PI / 2); const m = L.mat(col, { r: 0.55, m: 0.3 }); L.mesh(hg, m, 0, -2.2, 0, g); const dk = new THREE.ShapeGeometry(sh); dk.rotateX(-Math.PI / 2); L.mesh(dk, L.mat(0x8a7a62, { r: 0.8 }), 0, 1.21, 0, g).castShadow = false;
  const sm = L.mat(new THREE.Color(col).multiplyScalar(1.15).getHex(), { r: 0.5, m: 0.2 }); L.mesh(L.box(3.2, 1.6, 7), sm, 0, 2, 0.5, g); L.mesh(L.box(2.4, 1.2, 2), sm, 0, 3.4, -2.2, g); for (let i = 0; i < 5; i++) L.mesh(L.box(0.35, 0.25, 0.02), L.mat(0x1a2a3a), -0.8 + i * 0.4, 3.5, -3.21, g);
  const funnels = []; for (const z of [0, 2.6]) { L.mesh(L.cyl(0.6, 0.7, 3.2, 20), L.mat(0x3a3a3e, { r: 0.5 }), 0, 4.1, z, g); funnels.push(V(0, 5.8, z)); }
  for (const z of [-3.6, 5]) { L.mesh(L.cyl(0.09, 0.12, 6, 8), L.mat(0x2a2a2a, { m: 0.6 }), 0, 5, z, g); L.mesh(L.box(2.6, 0.08, 0.08), L.mat(0x2a2a2a), 0, 6.6, z, g); }
  const turrets = []; for (const [z, d] of [[-7.2, -1], [8.2, 1]]) { const t = new THREE.Group(); t.position.set(0, 1.6, z); g.add(t); L.mesh(L.cyl(1.1, 1.25, 0.8, 24), sm, 0, 0, 0, t); for (const sx of [-0.3, 0.3]) { const b = L.mesh(L.cyl(0.13, 0.15, 3.2, 12), L.mat(0x2a2a2e, { m: 0.6 }), sx, 0.1, d * 2.2, t); b.rotation.x = Math.PI / 2 - d * 0.08; } turrets.push(t); }
  for (const sx of [-1, 1]) for (let i = 0; i < 6; i++) L.mesh(L.cyl(0.08, 0.08, 1.2, 8), L.mat(0x2a2a2e), sx * 2.7, 0.6, -3 + i * 1.4, g).rotation.z = Math.PI / 2;
  g.userData = { funnels, turrets }; return g; }
function rowboat(s, x, z, ry = 0, n = 3, seed = 0) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; s.add(g); const hull = L.mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), L.mat(0x7a5232, { r: 0.7, ds: true }), 0, 0.35, 0, g); hull.scale.set(0.8, 0.5, 2.4);
  const cs = []; for (let i = 0; i < n; i++) { const c = L.makeGuy(ENTENTE(i + seed)); c.g.scale.setScalar(0.85); c.pose('sit'); c.g.position.set(0, -0.15, -1.3 + i * 1.0); g.add(c.g); c.hat = slouchHat(c.head, 0x8a7048); cs.push(c); } return { g, cs }; }
function mine() { const g = new THREE.Group(); const m = L.mat(0x5a5a62, { m: 0.7, r: 0.3, env: 1.4 }); L.mesh(L.sph(0.45, 24), m, 0, 0, 0, g); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, b = (i % 2 ? 0.4 : -0.3); const c = L.mesh(L.cyl(0.04, 0.06, 0.2, 8), m, Math.cos(a) * Math.cos(b) * 0.47, Math.sin(b) * 0.47, Math.sin(a) * Math.cos(b) * 0.47, g); c.lookAt(c.position.clone().multiplyScalar(3)); c.rotateX(Math.PI / 2); } L.mesh(L.cyl(0.04, 0.06, 0.2, 8), m, 0, 0.5, 0, g); return g; }
function seaSet(s, o = {}) { const night = !!o.night; s.background = L.skyTex(o.top ?? (night ? '#05081a' : '#4b8fd6'), o.mid ?? (night ? '#1a2a5a' : '#a9cdef'), o.bot ?? (night ? '#3a4a7a' : '#f3e6cf')); s.fog = new THREE.Fog(o.fog ?? (night ? 0x1a2240 : 0xe9e2d4), 60, 700);
  const wt = L.makeWater(o.water ?? (night ? 0x10203a : 0x2f6a86)); s.add(wt);
  const lm = L.mat(o.land ?? (night ? 0x2a3020 : 0x9a8a5a), { r: 1, env: 0.1 }); L.reseed(o.seed ?? 5); for (let i = 0; i < 12; i++) { const side = i % 2 ? 1 : -1; const h = L.mesh(L.sph(40 + R_() * 30, 18), lm, side * (130 + R_() * 40), -15, -100 - i * 50, s); h.scale.set(1, 0.45 + R_() * 0.2, 1.4); h.castShadow = false; }
  if (night) { sun(s, [-6, 5, -12], '#e8eeff', 120); s.add(new THREE.HemisphereLight(0x5a6aa0, 0x0a0a1a, 0.7)); const d = new THREE.DirectionalLight(0xa0b4ff, 1.0); d.position.set(-6, 8, -10); s.add(d); if (ENV) s.environment = ENV; return d; }
  for (let i = 0; i < 6; i++) { const c = L.makeCloud(7 + R_() * 6); c.position.set(-220 + i * 85, 60 + R_() * 20, -300); s.add(c); }
  return lights(s, { sky: 0xdfe9f7, ground: 0x5a7a8a, hi: o.hi ?? 1.15, si: o.si ?? 2.6, dir: o.dir ?? [8, 10, 6], sun: o.sun, sunCol: o.sunCol, target: o.target ?? V(0, 1, 0), sr: o.sr ?? 20, sunSprite: o.sunSprite }); }
function coast(s, o = {}) { // hillside above the sea (camera looks towards -z = sea)
  const night = !!o.night; s.background = L.skyTex(o.top ?? '#4b8fd6', o.mid ?? '#a9cdef', o.bot ?? '#f3e6cf'); s.fog = new THREE.Fog(o.fog ?? 0xe9e2d4, 40, 600);
  const wt = L.makeWater(o.water ?? 0x2f6a86); wt.position.y = -8; s.add(wt);
  const gr = L.mesh(new THREE.PlaneGeometry(300, 120), new THREE.MeshStandardMaterial({ map: grassTex2(11, o.grass ?? '#9a8f5a'), roughness: 1, envMapIntensity: 0.3 }), 0, 0, 40, s); gr.rotation.x = -Math.PI / 2; gr.castShadow = false; gr.material.map.repeat.set(12, 5);
  const cl = L.mat(o.cliff ?? 0xa8865a, { r: 1 }); L.reseed(o.seed ?? 9); for (let i = 0; i < 24; i++) { const r = L.mesh(new THREE.DodecahedronGeometry(3 + R_() * 3, 0), cl, -70 + i * 6 + R_() * 2, -4 - R_() * 2, -20 - R_() * 3, s); r.rotation.set(R_(), R_(), R_()); r.castShadow = false; }
  const bush = new THREE.InstancedMesh(new THREE.SphereGeometry(0.4, 8, 6), L.mat(0x6a7a3a, { r: 0.95, fab: true }), 140); const d = new THREE.Object3D(); for (let i = 0; i < 140; i++) { let x, z; do { x = (R_() - 0.5) * 60; z = -18 + R_() * 45; } while (o.clear && Math.abs(x - o.clear[0]) < o.clear[2] && Math.abs(z - o.clear[1]) < o.clear[3]); d.position.set(x, 0.12, z); const q = 0.4 + R_() * 0.9; d.scale.set(q * 1.3, q * 0.6, q); d.updateMatrix(); bush.setMatrixAt(i, d.matrix); } bush.castShadow = true; s.add(bush);
  const hm = L.mat(o.hill ?? 0x8a8a52, { r: 1, env: 0.1 }); for (const [x, z, r] of [[-60, 40, 40], [50, 50, 45], [0, 80, 50]]) { const h = L.mesh(L.sph(r, 18), hm, x, -r * 0.55, z, s); h.castShadow = false; }
  for (const [x, z, ry] of (o.ships ?? [[-30, -160, 0.4], [25, -210, -0.3], [70, -260, 0.2]])) { const b = battleship(0x7a8088); b.position.set(x, -8, z); b.rotation.y = ry; b.scale.setScalar(1.2); s.add(b); }
  if (o.trench) { const sm = L.mat(0xb89a6a, { fab: true, r: 0.95 }); for (let i = 0; i < 30; i++) { const sb = L.mesh(L.cap(0.18, 0.35), sm, -8 + i * 0.55, 0.15 + (i % 2) * 0.18, o.trench, s); sb.rotation.z = Math.PI / 2; } }
  return lights(s, { sky: 0xdfe9f7, ground: 0x7a7a4a, hi: o.hi ?? 1.15, si: o.si ?? 2.6, dir: o.dir ?? [7, 10, 8], sun: o.sun, sunCol: o.sunCol, target: o.target ?? V(0, 1, 0), sr: o.sr ?? 8, sunSprite: o.sunSprite }); }
const DUSK8 = { top: '#2b2a6b', mid: '#e3735a', bot: '#ffc27a', fog: 0xf2a070, sun: 0xffb070, dir: [-8, 4, -12], sunCol: '#ffcf8a', si: 2.0 };
function blast(s, pos, size = 3, col = 0x8a8478) { if (!DUSTTEX) dust(s, 0); const fl = sparkle(s, 0xffa040, size); fl.position.copy(pos); const ps = []; for (let i = 0; i < 7; i++) { const p = new THREE.Sprite(new THREE.SpriteMaterial({ map: DUSTTEX, color: col, transparent: true, depthWrite: false, opacity: 0.8 })); s.add(p); ps.push(p); }
  return t => { const on = t >= 0; fl.visible = on && t < 0.3; fl.scale.setScalar(size * (1 + Math.max(0, t) * 8)); fl.material.opacity = 1 - Math.max(0, t) * 3.3;
    ps.forEach((p, i) => { p.visible = on && t < 3; const a = i / 7 * 6.28; const k = Math.min(1, Math.max(0, t) * 1.5); p.position.set(pos.x + Math.cos(a) * size * 0.45 * k, pos.y + size * 0.15 + k * size * 0.5 + (i % 2) * size * 0.2, pos.z + Math.sin(a) * size * 0.3 * k); p.scale.setScalar(size * (0.35 + k * 0.9)); p.material.opacity = 0.85 * Math.max(0, 1 - t / 3); }); }; }
function funnelSmoke(s, ship, n = 10) { if (!DUSTTEX) dust(s, 0); const ps = []; ship.userData.funnels.forEach((f, j) => { for (let i = 0; i < n; i++) { const p = new THREE.Sprite(new THREE.SpriteMaterial({ map: DUSTTEX, color: 0x3a3a3e, transparent: true, depthWrite: false, opacity: 0.6 })); p.userData = { f, ph: i / n + j * 0.37 }; s.add(p); ps.push(p); } });
  const w = new THREE.Vector3(); return T => ps.forEach(p => { const k = (T * 0.35 + p.userData.ph) % 1; w.copy(p.userData.f); ship.localToWorld(w); p.position.set(w.x + k * 6, w.y + k * 4, w.z + k * 2); p.scale.setScalar(1.2 + k * 4); p.material.opacity = 0.6 * (1 - k); }); }
function mapOverlay(g, W, H, k, prog = 1, mines = 0) { if (k <= 0) return; const x0 = W * 0.06, y0 = H * 0.1, w = W * 0.88, h = H * 0.48; g.save(); g.globalAlpha = clamp(k * 3); const e = backOut(clamp(k * 2)); g.translate(W / 2, y0 + h / 2); g.scale(e, e); g.translate(-W / 2, -(y0 + h / 2));
  g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 30; g.fillStyle = '#3a7ab8'; g.beginPath(); g.roundRect(x0, y0, w, h, W * 0.04); g.fill(); g.shadowColor = 'transparent'; g.save(); g.beginPath(); g.roundRect(x0, y0, w, h, W * 0.04); g.clip();
  const P = (a, b) => [x0 + a * w, y0 + b * h]; const poly = (pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach(([a, b], i) => { const [x, y] = P(a, b); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.fill(); g.strokeStyle = 'rgba(80,60,30,0.5)'; g.lineWidth = 3; g.stroke(); };
  poly([[0, 0], [1, 0], [1, 0.12], [0.62, 0.22], [0.44, 0.4], [0.33, 0.58], [0.24, 0.74], [0.14, 0.86], [0, 0.92]], '#e8d8a8');
  poly([[1, 0.3], [0.7, 0.36], [0.5, 0.52], [0.4, 0.68], [0.33, 0.84], [0.28, 1], [1, 1]], '#d9c690');
  g.restore(); const lab = (t, a, b, sz, col = '#3a2a1a', rot = 0) => { const [x, y] = P(a, b); g.save(); g.translate(x, y); g.rotate(rot); g.font = `900 ${W * sz}px "Inter Display"`; g.textAlign = 'center'; g.fillStyle = col; g.fillText(t, 0, 0); g.restore(); };
  lab('GALLIPOLI', 0.2, 0.62, 0.04, '#3a2a1a', -0.9); lab('DARDANELLEN', 0.5, 0.42, 0.034, '#fff', -0.85); lab('ÄGÄIS', 0.12, 0.97, 0.03, '#fff'); lab('ISTANBUL', 0.8, 0.07, 0.045);
  const [ix, iy] = P(0.93, 0.13); g.fillStyle = '#d62828'; g.beginPath(); g.arc(ix, iy, W * 0.02, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 4; g.stroke();
  const path = [[0.1, 1.02], [0.26, 0.8], [0.36, 0.64], [0.47, 0.47], [0.62, 0.3], [0.8, 0.2], [0.92, 0.14]]; const n = path.length - 1; const pp = clamp(prog) * n;
  g.strokeStyle = '#ff453a'; g.lineWidth = W * 0.012; g.setLineDash([W * 0.025, W * 0.018]); g.lineCap = 'round'; g.beginPath(); for (let i = 0; i <= Math.floor(pp); i++) { const [x, y] = P(...path[i]); i ? g.lineTo(x, y) : g.moveTo(x, y); }
  const fi = Math.floor(pp), fr = pp - fi; let hx, hy; if (fi < n) { const [ax, ay] = P(...path[fi]), [bx, by] = P(...path[fi + 1]); hx = ax + (bx - ax) * fr; hy = ay + (by - ay) * fr; g.lineTo(hx, hy); } else [hx, hy] = P(...path[n]); g.stroke(); g.setLineDash([]);
  if (prog > 0) { g.fillStyle = '#ff453a'; g.beginPath(); g.arc(hx, hy, W * 0.018, 0, 7); g.fill(); }
  for (let i = 0; i < mines; i++) { const [mx, my] = P(0.42 + i * 0.035, 0.5 - i * 0.012); g.fillStyle = '#111'; g.beginPath(); g.arc(mx, my, W * 0.01, 0, 7); g.fill(); }
  g.restore(); }
function quote(g, W, H, k1, k2) { const L2 = [['ICH BEFEHLE EUCH', '#fff', k1], ['NICHT ANZUGREIFEN.', '#fff', k1 - 0.15], ['ICH BEFEHLE EUCH', '#fff', k2], ['ZU STERBEN.', '#FF453A', k2 - 0.15]];
  L2.forEach(([t, c, k], i) => { if (k <= 0) return; const e = clamp(k * 3); g.save(); g.globalAlpha = e; g.translate(W / 2, H * (0.12 + i * 0.065 + (i > 1 ? 0.03 : 0))); const sc = 1.3 - 0.3 * (1 - Math.pow(1 - e, 3)); g.scale(sc, sc); g.font = `900 ${W * (i === 3 ? 0.085 : 0.065)}px "Inter Display"`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = W * 0.014; g.strokeStyle = '#000'; g.strokeText(t, 0, 0); g.fillStyle = c; g.fillText(t, 0, 0); g.restore(); }); }
function shard(s) { const m = L.mesh(new THREE.DodecahedronGeometry(0.06, 0), L.mat(0x2a2a2c, { m: 0.8, r: 0.5 }), 0, -50, 0, s); m.scale.set(1.3, 0.7, 0.6); const tr = L.mesh(L.cyl(0.012, 0.03, 1, 6), L.mat(0xffe0a0, { e: 0xffb040, ei: 2, t: 0.6 }), 0, -50, 0, s); tr.castShadow = false;
  return (a, b, k) => { const on = k > 0 && k < 1; m.visible = tr.visible = on; if (!on) return; m.position.copy(a).lerp(b, k); m.rotation.set(k * 20, k * 13, 0); const back = a.clone().lerp(b, Math.max(0, k - 0.25)); tr.position.copy(back).add(m.position).multiplyScalar(0.5); tr.scale.y = back.distanceTo(m.position); tr.lookAt(m.position); tr.rotateX(Math.PI / 2); }; }
function tentHQ(s) { const pl = tentInside(s, { col: 0xc8b890, lx: -1.8, lz: -1.2 }); const tb = new THREE.Group(); s.add(tb); L.mesh(L.box(2.0, 0.07, 1.2), L.mat(0x7a5232, { r: 0.6 }), 0, 0.8, 0, tb); for (const [x, z] of [[-0.9, -0.5], [0.9, -0.5], [-0.9, 0.5], [0.9, 0.5]]) L.mesh(L.box(0.07, 0.8, 0.07), L.mat(0x4a3018), x, 0.4, z, tb);
  const mp = L.mesh(new THREE.PlaneGeometry(1.7, 1.0), new THREE.MeshStandardMaterial({ map: L.canvasTex(512, 300, (q, w, h) => { const W2 = w, H2 = h; q.save(); q.scale(1, 1); const fake = { save() { }, restore() { } }; q.fillStyle = '#3a7ab8'; q.fillRect(0, 0, w, h); q.fillStyle = '#e8d8a8'; q.beginPath(); q.moveTo(0, 0); q.lineTo(w, 0); q.lineTo(w, h * 0.15); q.lineTo(w * 0.6, h * 0.25); q.lineTo(w * 0.42, h * 0.45); q.lineTo(w * 0.3, h * 0.7); q.lineTo(w * 0.15, h * 0.9); q.lineTo(0, h); q.fill(); q.fillStyle = '#d9c690'; q.beginPath(); q.moveTo(w, h * 0.35); q.lineTo(w * 0.62, h * 0.45); q.lineTo(w * 0.45, h * 0.7); q.lineTo(w * 0.35, h); q.lineTo(w, h); q.fill(); q.strokeStyle = '#d62828'; q.lineWidth = 6; for (let i = 0; i < 4; i++) { q.beginPath(); q.moveTo(w * (0.05 + i * 0.05), h * (0.98 - i * 0.03)); q.lineTo(w * (0.15 + i * 0.05), h * (0.78 - i * 0.04)); q.stroke(); } q.restore(); }), roughness: 0.8 }), 0, 0.84, 0, tb); mp.rotation.x = -Math.PI / 2; mp.castShadow = false;
  const lp = lantern(); lp.position.set(0.8, 0.84, -0.4); s.add(lp); return tb; }

export const SHOTS = {
  // ---------- HOOK ----------
  h_hit(ctx) {
    const s = ctx.scene; coast(s, { ...DUSK8, target: V(0, 1, 0), sr: 6 }); const k = kemal(s, 0, 0, 0.3); const bn = binoculars(); k.arms[1].hand.add(bn); bn.position.set(0, -0.1, 0.06); const bl = blast(s, V(-2.6, 0.2, -3), 2.2); const sd = shard(s);
    const r = (u, t) => { const hit = 0.5; const kk = clamp((u - hit) * 8); k.pose('stand'); k.expr(u < hit ? 'squint' : 'shock'); k.look(-0.6, 0); k.arms[1].sh.rotation.set(-1.4 + kk * 0.6, 0, 0.3); k.arms[1].el.rotation.x = -1.5;
      if (u > hit) { k.arms[0].sh.rotation.set(-1.2, 0.5, 0.2); k.arms[0].el.rotation.x = -1.3; k.body.rotation.x = -0.12 * kk; k.g.position.z = -0.1 * kk; } bl((u - 0.25) * 3); sd(V(-2.4, 0.8, -2.8), V(-0.05, 1.25, 0.24), (u - 0.3) / 0.2);
      if (u > hit && u < hit + 0.08) ctx.flash = 0.8; if (u > hit) ctx.shake = 1.2 * (1 - clamp((u - hit) * 3)); ctx.grade = 'warm';
      cam(ctx, V(1.4, 1.5, 3.0), V(0.8, 1.45, 2.2), V(-0.3, 1.3, 0), V(0, 1.3, 0), u, 50); };
    r.overlay = (g, W, H, u, T, t) => { chip(g, W, H, '1915', '#d62828', W / 2, H * 0.17, (t - 0.1) * 3, 0.06); };
    return r;
  },
  h_watch(ctx) {
    const s = ctx.scene; s.background = new THREE.Color(0x1a1410); lights(s, { dir: [3, 6, 8], sunSprite: false, si: 2.6, hi: 1.0, sr: 3, target: V(0, 0, 0) }); const w = pocketWatch({ dent: true }); s.add(w.g); w.g.scale.setScalar(0.9);
    const gl = sparkle(s, 0xffffff, 0.9);
    const r = (u, t) => { w.g.rotation.set(-0.15 + Math.sin(t) * 0.05, -0.3 + u * 0.4, 0.05); gl.position.set(0.6, 0.7, 0.4); gl.material.rotation = t * 2; gl.scale.setScalar(0.6 + Math.sin(t * 5) * 0.3);
      cam(ctx, V(0.2, 0.3, 4.6), V(0.1, 0.2, 3.6), V(0, 0, 0), V(0, 0, 0), u, 45); };
    r.overlay = (g, W, H, u, T, t) => { stampFit(g, W, H, 'GERETTET!', (u - 0.45) * 3, '#1f9a3a', 0.2, -0.1); };
    return r;
  },
  h_land(ctx) {
    const s = ctx.scene; coast(s, { ...DUSK8, target: V(0, 1, 0), sr: 6 }); const k = kemal(s, 0, 0, 0.2); flag(s, 0.9, 0, -0.4, 1.6, 3.4);
    const r = (u, t) => { k.pose('stand'); k.expr('smile'); k.look(0.3, 0.3); k.arms[0].sh.rotation.set(0, 0, -0.35); ctx.grade = 'warm'; cam(ctx, V(-0.6, 0.8, 4.0), V(-0.3, 0.9, 3.0), V(0.2, 1.7, 0), V(0.2, 1.8, 0), u, 50); };
    r.overlay = (g, W, H, u, T, t) => { qmarks(g, W, H, T, (u - 0.2) * 2, 0.72, 0.22); chip(g, W, H, 'WER IST ER?', '#d62828', W * 0.38, H * 0.2, (u - 0.35) * 3, 0.055); };
    return r;
  },
  // ---------- 1915: FLOTTE ----------
  map(ctx) {
    const s = ctx.scene; seaSet(s, { target: V(0, 0, -20) }); const b = battleship(); b.position.set(0, 0, -30); s.add(b); const fs = funnelSmoke(s, b);
    const r = (u, t) => { b.position.z = -30 - t * 2; fs(ctx.T); ctx.tag = 'ERSTER WELTKRIEG · 1915'; cam(ctx, V(8, 4, 2), V(6, 3.5, -2), V(0, 2, -30), V(0, 2, -36), u, 50); };
    r.overlay = (g, W, H, u, T, t) => mapOverlay(g, W, H, t * 2, (u - 0.25) * 1.4);
    return r;
  },
  fleet(ctx) {
    const s = ctx.scene; seaSet(s, { target: V(0, 0, -20), sr: 40 }); const sh = [[0, 0, 0], [-14, 22, 0x6a7078], [12, 30, 0x7a7e86], [-5, 48, 0x5e646c]].map(([x, z, c], i) => { const b = battleship(c || 0x6a7078); b.position.set(x, 0, -40 - z); s.add(b); return b; }); const fs = sh.map(b => funnelSmoke(s, b, 6)); const fl = sh.slice(0, 2).map(b => { const f = sparkle(s, 0xffa040, 6); return f; });
    const r = (u, t) => { sh.forEach((b, i) => { b.position.z = -40 - [0, 22, 30, 48][i] - t * 3; }); fs.forEach(f => f(ctx.T)); fl.forEach((f, i) => { const k = (t * 0.8 + i * 0.5) % 1; f.visible = k < 0.12; const b = sh[i]; f.position.set(b.position.x, 2.6, b.position.z - 10.5); f.scale.setScalar(4 + k * 30); });
      ctx.tag = 'DARDANELLEN'; cam(ctx, V(-6, 2.2, -10), V(-5, 2.4, -16), V(0, 3, -50), V(0, 3, -58), u, 50); };
    r.overlay = (g, W, H, u, T, t) => { chip(g, W, H, 'ZIEL: ISTANBUL', '#1d5fc4', W / 2, H * 0.2, (u - 0.4) * 3, 0.06); };
    return r;
  },
  nusret(ctx) {
    const s = ctx.scene; seaSet(s, { night: true }); const b = makeShip(); b.scale.setScalar(0.45); s.add(b); const ms = []; for (let i = 0; i < 6; i++) { const m = mine(); m.scale.setScalar(0.8); s.add(m); ms.push(m); }
    const r = (u, t) => { b.position.set(-t * 1.6, -0.2, 0); b.rotation.y = Math.PI / 2; ms.forEach((m, i) => { const dropT = i * 0.9 + 0.3; const k = t - dropT; if (k < 0) { m.visible = false; return; } m.visible = true; const x0 = -dropT * 1.6 + 6.0; m.position.set(x0, Math.max(-0.25, 0.9 - k * k * 6), 0); m.rotation.y = k; });
      ctx.grade = 'night'; ctx.tag = 'NACHTS'; cam(ctx, V(-t * 1.6 + 4, 3.2, 17), V(-t * 1.6 + 2, 2.8, 15), V(-t * 1.6 + 2, 1.0, 0), V(-t * 1.6, 1.0, 0), u, 50); };
    r.overlay = (g, W, H, u, T, t) => { chip(g, W, H, 'MINENLEGER „NUSRET“', '#2a3a7a', W / 2, H * 0.2, (t - 0.2) * 3, 0.05); };
    return r;
  },
  mines(ctx) {
    const s = ctx.scene; seaSet(s, { night: true, water: 0x14304a }); const ms = []; for (let i = 0; i < 26; i++) { const m = mine(); m.position.set(-12 + i * 1.0, -0.15 + Math.sin(i * 1.7) * 0.05, -2 - (i % 3) * 1.2 - i * 0.6); s.add(m); ms.push(m); }
    const r = (u, t, T = ctx.T) => { ms.forEach((m, i) => { m.position.y = -0.2 + Math.sin(T * 1.5 + i) * 0.06; m.rotation.y = T * 0.2 + i; }); cam(ctx, V(-9, 1.4, 3), V(3, 1.2, 1.5), V(-6, 0, -6), V(6, 0, -14), u, 50); };
    r.overlay = (g, W, H, u, T, t) => { counter(g, W, H, 'MINEN', Math.floor(clamp(u * 1.2) * 26), (t - 0.05) * 3, '#FFD60A', 0.2); };
    return r;
  },
  sink(ctx) {
    const s = ctx.scene; seaSet(s, { target: V(0, 0, -20), sr: 30 }); const b = battleship(); b.position.set(0, 0, -25); b.rotation.y = 0.8; s.add(b); const bl = blast(s, V(2, 0.5, -22), 6, 0xd8d8d8); const bl2 = blast(s, V(-2, 1, -27), 4, 0x5a5a5a); const fs = funnelSmoke(s, b, 8);
    const r = (u, t) => { const k = clamp((u - 0.2) * 1.4); b.rotation.z = k * 0.35; b.rotation.x = -k * 0.12; b.position.y = -k * 3; bl((u - 0.18) * 3); bl2((u - 0.3) * 3); fs(ctx.T); if (u > 0.18 && u < 0.35) ctx.shake = 1.2;
      cam(ctx, V(-10, 3, 6), V(-8, 2.5, 3), V(0, 1, -25), V(0, 0.5, -25), u, 50); };
    r.overlay = (g, W, H, u, T, t) => { counter(g, W, H, 'SCHLACHTSCHIFFE GESUNKEN', 1 + Math.floor(clamp((u - 0.2) * 1.6) * 2.01), (u - 0.2) * 3, '#FF453A', 0.2); };
    return r;
  },
  retreat(ctx) {
    const s = ctx.scene; seaSet(s, { ...DUSK8, target: V(0, 0, -30), sr: 40, sunSprite: true }); const sh = [[0, 0], [-12, 14], [10, 20]].map(([x, z]) => { const b = battleship(); b.position.set(x, 0, -40 + z); b.rotation.y = Math.PI; s.add(b); return b; }); const fs = sh.map(b => funnelSmoke(s, b, 6));
    const r = (u, t) => { sh.forEach((b, i) => { b.rotation.y = Math.PI - 0.6 * ease(clamp(u * 1.5)); b.position.z = -40 + [0, 14, 20][i] - t * 2.5; }); fs.forEach(f => f(ctx.T)); ctx.grade = 'warm'; cam(ctx, V(4, 3, 14), V(3, 3.5, 18), V(0, 2, -30), V(0, 2, -40), u, 50); };
    r.overlay = (g, W, H, u, T, t) => { stampFit(g, W, H, 'ABGEDREHT', (u - 0.35) * 3, '#e8202a', 0.2, -0.1); };
    return r;
  },
  landing(ctx) {
    const s = ctx.scene; seaSet(s, { top: '#5a6a9a', mid: '#e0a080', bot: '#ffd8a8', fog: 0xe8b890, sun: 0xffc080, dir: [-6, 7, -10], target: V(0, 0, 4), sr: 20, sunSprite: false });
    const beach = L.mesh(L.box(80, 1, 14), L.mat(0xd8c08a, { r: 1 }), 0, -0.3, 18, s); beach.rotation.x = 0.05; const cl = L.mat(0xa8865a, { r: 1 }); L.reseed(4); for (let i = 0; i < 18; i++) { const r = L.mesh(new THREE.DodecahedronGeometry(4 + R_() * 4, 0), cl, -40 + i * 5, 2 + R_() * 3, 28 + R_() * 4, s); r.rotation.set(R_(), R_(), R_()); r.scale.y = 1.6; }
    const bs = [[-4, 0], [0, -3], [4, 1], [8, -4], [-8, -5]].map(([x, z], i) => rowboat(s, x, z, Math.PI, 3, i));
    const r = (u, t) => { bs.forEach((b, i) => { b.g.position.z = [0, -3, 1, -4, -5][i] + t * 1.5; b.g.position.y = Math.sin(t * 2 + i) * 0.06; b.g.rotation.z = Math.sin(t * 1.6 + i) * 0.04; b.cs.forEach((c, j) => { c.arms.forEach(a => { a.sh.rotation.x = -0.8 + Math.sin(t * 3 + j) * 0.5; }); c.expr('squint'); }); });
      ctx.tag = 'GALLIPOLI · 25. APRIL 1915'; cam(ctx, V(-10, 2.6, -2), V(-9, 2.3, 1), V(0, 0.6, 3), V(0, 0.8, 7), u, 50); };
    return r;
  },
  cta(ctx) {
    const s = ctx.scene; s.background = new THREE.Color(0x1a1410); lights(s, { dir: [3, 7, 6], sunSprite: false, si: 2.4, hi: 1.0, sr: 3, target: V(0, 0, 0) }); const tb = L.mesh(L.box(10, 0.2, 10), new THREE.MeshStandardMaterial({ map: L.parquetTex(), roughness: 0.5 }), 0, -0.25, 0, s);
    const w = pocketWatch(); s.add(w.g); w.g.rotation.x = -Math.PI / 2 + 0.5; w.g.position.y = 0.05;
    const r = (u, t) => { w.time(ctx.T); cam(ctx, V(0, 3.2, 3.4), V(0, 2.8, 2.9), V(0, 0, 0), V(0, 0, 0), u, 50); };
    r.overlay = (g, W, H, u) => ctaOverlay(g, W, H, u);
    return r;
  },
  // ---------- GALLIPOLI ----------
  hq(ctx) {
    const s = ctx.scene; tentHQ(s); const lm = liman(s, 0, -1.1, 0); const o1 = otto(s, 1, -1.3, 0.3, 1.3), o2 = otto(s, 3, 1.3, 0.2, -1.4);
    const r = (u, t) => { lm.pose('stand'); lm.arms[1].sh.rotation.set(-1.0, 0, 0.1); lm.arms[1].el.rotation.x = -0.4; talk(lm, t, 'squint'); lm.look(0, -0.8); lm.head.rotation.x = 0.25; o1.expr('squint'); o2.expr('smile'); o1.look(0.5, -0.5); o2.look(-0.5, -0.5);
      cam(ctx, V(1.5, 2.0, 2.6), V(1.3, 1.9, 2.2), V(0, 1.3, -0.8), V(0, 1.35, -0.9), u, 50); };
    r.overlay = (g, W, H, u, T, t) => { chip(g, W, H, 'LIMAN VON SANDERS', '#3a3a42', W / 2, H * 0.17, (u - 0.45) * 3, 0.05); chip(g, W, H, 'DEUTSCHER GENERAL', '#b3202a', W / 2, H * 0.235, (u - 0.6) * 3, 0.04); };
    return r;
  },
  kemal(ctx) {
    const s = ctx.scene; coast(s, { target: V(0, 1, 0), sr: 6 }); const k = kemal(s, 0, 0, Math.PI - 0.3); const bn = binoculars(); k.arms[1].hand.add(bn); bn.position.set(0, -0.1, 0.06);
    const r = (u, t) => { k.pose('stand'); k.expr('squint'); k.arms[1].sh.rotation.set(-2.3, 0, 0.35); k.arms[1].el.rotation.x = -1.4; k.arms[0].sh.rotation.set(-0.1, 0, -0.2);
      cam(ctx, V(1.6, 1.6, -2.6), V(1.2, 1.7, -2.0), V(0, 1.6, 0), V(0, 1.7, 0), u, 50); };
    r.overlay = (g, W, H, u, T, t) => { chip(g, W, H, 'MUSTAFA KEMAL', '#d62828', W / 2, H * 0.17, (u - 0.5) * 3, 0.06); chip(g, W, H, 'OBERSTLEUTNANT', '#3a3a42', W / 2, H * 0.235, (u - 0.65) * 3, 0.04); };
    return r;
  },
  hill(ctx) {
    const s = ctx.scene; coast(s, { target: V(0, 0, -8), sr: 12, clear: [0, -8, 8, 8] }); const es = []; for (let i = 0; i < 7; i++) { const c = entente(s, i, -4 + i * 1.3, -12 - (i % 2) * 1.2, 0); es.push(c); }
    const r = (u, t) => { es.forEach((c, i) => { walk(c, t + i * 0.3, 6); c.g.position.z = -12 - (i % 2) * 1.2 + t * 0.8; c.body.rotation.x = 0.25; c.expr('angry'); }); cam(ctx, V(0.5, 2.6, 3), V(0.3, 2.3, 2), V(0, 0.5, -9), V(0, 0.5, -8), u, 50); };
    r.overlay = (g, W, H, u, T, t) => { chip(g, W, H, 'DER FEIND KOMMT', '#d62828', W / 2, H * 0.2, (t - 0.2) * 3, 0.055); };
    return r;
  },
  troops(ctx) {
    const s = ctx.scene; coast(s, { target: V(0, 1, 0), sr: 6 }); const k = kemal(s, 0, 1.2, Math.PI); const os = []; for (let i = 0; i < 6; i++) os.push(otto(s, i, -2.0 + i * 0.8, -0.6 - (i % 2) * 0.7, 0));
    const r = (u, t) => { k.pose('point'); talk(k, t, 'angry'); k.arms[1].sh.rotation.x = -1.5 + Math.sin(t * 3) * 0.1; os.forEach((o, i) => { o.expr(i % 2 ? 'squint' : 'smile'); o.look(0, 0.2); }); cam(ctx, V(2.6, 1.9, 3.4), V(2.3, 1.8, 3.0), V(-0.5, 1.3, -0.3), V(-0.5, 1.4, -0.3), u, 50); };
    return r;
  },
  order(ctx) {
    const s = ctx.scene; coast(s, { ...DUSK8, target: V(0, 1, 0), sr: 5, sunSprite: true }); const k = kemal(s, 0, 0, 0);
    const r = (u, t) => { k.pose('point'); k.arms[1].sh.rotation.set(-1.6, 0, 0.2); talk(k, t, 'angry'); k.look(0, 0); ctx.grade = 'warm'; cam(ctx, V(0.2, 1.4, 2.4), V(0.1, 1.45, 1.9), V(0, 1.65, 0), V(0, 1.7, 0), u, 50); };
    r.overlay = (g, W, H, u, T, t) => quote(g, W, H, u * 2.2, (u - 0.45) * 2.2);
    return r;
  },
  fallen(ctx) {
    const s = ctx.scene; coast(s, { top: '#1b1a3b', mid: '#7a4a5a', bot: '#d8906a', fog: 0x8a6a6a, sun: 0xffa070, dir: [-8, 3, -12], si: 1.4, target: V(0, 0.5, 0), sr: 6 }); flag(s, 0.6, 0, -1.6, 1.3, 2.6);
    L.reseed(7); const hm = L.mat(0x9a9468, { fab: true, r: 0.95 }); for (let i = 0; i < 14; i++) { const h = L.mesh(L.sph(0.33, 20), hm, (R_() - 0.5) * 6, 0.08, -1 + (R_() - 0.5) * 5, s); h.scale.set(1, 0.6, 1); h.rotation.set(R_() * 0.6, R_() * 6, R_() * 0.6); }
    for (let i = 0; i < 40; i++) { const f = L.mesh(L.sph(0.07, 8), L.mat(0xd62828, { r: 0.6 }), (R_() - 0.5) * 7, 0.12, (R_() - 0.5) * 6, s); f.scale.y = 0.4; }
    const r = (u, t) => { ctx.grade = 'night'; cam(ctx, V(-1.5, 1.2, 4.6), V(-0.8, 1.5, 4.0), V(0.3, 0.8, -1), V(0.3, 1.4, -1.5), u, 50); };
    return r;
  },
  hold(ctx) {
    const s = ctx.scene; coast(s, { target: V(0, 1, 0), sr: 8, trench: 0.4 }); const os = []; for (let i = 0; i < 5; i++) { const o = otto(s, i, -3 + i * 1.3, 1.0, Math.PI); os.push(o); } const rs = []; for (let i = 0; i < 6; i++) { const o = otto(s, i + 2, -4 + i * 1.5, 9, Math.PI); rs.push(o); }
    const r = (u, t) => { os.forEach((o, i) => { o.pose('stand'); o.legs[0].hip.rotation.x = -0.6; o.legs[0].knee.rotation.x = 1.0; o.g.position.y = -0.3; o.expr('angry'); o.arms.forEach(a => { a.sh.rotation.set(-1.4, 0, 0); a.el.rotation.x = -0.3; }); });
      rs.forEach((o, i) => { o.g.position.z = 9 - t * 2.6; walk(o, t + i * 0.2, 12); o.expr('angry'); o.body.rotation.x = 0.2; }); cam(ctx, V(4, 2.4, 6), V(3.2, 2.2, 5), V(-0.5, 1, 2.5), V(-0.5, 1, 2.0), u, 50); };
    r.overlay = (g, W, H, u, T, t) => { chip(g, W, H, 'VERSTÄRKUNG!', '#1f9a3a', W / 2, H * 0.2, (u - 0.45) * 3, 0.06); };
    return r;
  },
  shrapnel(ctx) {
    const s = ctx.scene; coast(s, { target: V(0, 1, 0), sr: 6 }); const k = kemal(s, 0, 0, -0.4); const bl = blast(s, V(3, 0.2, -2.5), 2.4); const sd = shard(s);
    const r = (u, t) => { const hit = 0.55, kk = clamp((u - hit) * 6); k.pose('point'); k.expr(u < hit ? 'squint' : 'shock'); k.arms[1].sh.rotation.set(-1.5 + kk * 1.2, 0, 0.3); if (u > hit) { k.arms[0].sh.rotation.set(-1.2, 0.5, 0.2); k.arms[0].el.rotation.x = -1.3; k.body.rotation.x = -0.15 * kk; }
      bl((u - 0.3) * 3); sd(V(2.8, 0.9, -2.3), V(0.1, 1.25, 0.22), (u - 0.38) / 0.17); if (u > hit && u < hit + 0.06) ctx.flash = 0.8; if (u > hit) ctx.shake = (1 - clamp((u - hit) * 3));
      cam(ctx, V(-1.4, 1.5, 3.2), V(-1.0, 1.45, 2.4), V(0.4, 1.3, 0), V(0.1, 1.3, 0), u, 50); };
    r.overlay = (g, W, H, u, T, t) => { chip(g, W, H, 'AUGUST 1915', '#d62828', W / 2, H * 0.17, (t - 0.1) * 3, 0.06); };
    return r;
  },
  dent(ctx) {
    const s = ctx.scene; s.background = new THREE.Color(0x14100c); lights(s, { dir: [-3, 6, 8], sunSprite: false, si: 2.8, hi: 0.9, sr: 3, target: V(0, 0, 0) }); const w = pocketWatch({ dent: true, chain: false }); s.add(w.g); const gl = sparkle(s, 0xffffff, 1.0);
    const r = (u, t) => { w.g.rotation.set(0.1, 0.5 - u * 0.6, 0); gl.position.set(0.34, 0.27, 0.5); gl.scale.setScalar(0.8 + Math.sin(t * 6) * 0.3); cam(ctx, V(0.6, 0.4, 3.4), V(0.4, 0.3, 2.4), V(0.15, 0.1, 0), V(0.25, 0.2, 0), u, 45); };
    r.overlay = (g, W, H, u, T, t) => { stampFit(g, W, H, 'GERETTET!', (u - 0.5) * 3, '#1f9a3a', 0.2, -0.1); };
    return r;
  },
  gift(ctx) {
    const s = ctx.scene; tentHQ(s); const k = kemal(s, -0.55, 0.9, Math.PI / 2 - 0.3), lm = liman(s, 0.6, 0.9, -Math.PI / 2 + 0.3); const w1 = pocketWatch({ dent: true, chain: false }), w2 = pocketWatch({ chain: false }); w1.g.scale.setScalar(0.11); w2.g.scale.setScalar(0.11); s.add(w1.g, w2.g);
    const r = (u, t) => { k.pose('stand'); lm.pose('stand'); k.expr('smile'); lm.expr('smile'); k.look(1, 0); lm.look(-1, 0); const a = ease(clamp(u * 2)), b = ease(clamp((u - 0.5) * 2)); k.arms[1].sh.rotation.set(-0.6 - a * 0.7, 0, 0); k.arms[1].el.rotation.x = -0.8; lm.arms[1].sh.rotation.set(-0.6 - b * 0.7, 0, 0); lm.arms[1].el.rotation.x = -0.8;
      const p = new THREE.Vector3(); k.arms[1].hand.getWorldPosition(p); const q = new THREE.Vector3(); lm.arms[1].hand.getWorldPosition(q); w1.g.position.copy(p).lerp(q, a * 0.5).add(V(0, 0.08, 0)); w2.g.position.copy(q).lerp(p, b * 0.5).add(V(0, 0.08, 0)); w2.g.visible = u > 0.45; w1.g.lookAt(ctx.camera.position); w2.g.lookAt(ctx.camera.position);
      cam(ctx, V(0.1, 1.6, 3.4), V(0.05, 1.5, 2.8), V(0, 1.3, 0.9), V(0, 1.3, 0.9), u, 50); };
    r.overlay = (g, W, H, u, T, t) => { chip(g, W, H, 'GESCHENK', '#e8902a', W * 0.32, H * 0.2, (u - 0.2) * 3, 0.05); chip(g, W, H, 'GEGENGESCHENK', '#3a3a42', W * 0.66, H * 0.26, (u - 0.6) * 3, 0.05); };
    return r;
  },
  evac(ctx) {
    const s = ctx.scene; seaSet(s, { night: true }); const beach = L.mesh(L.box(80, 1, 14), L.mat(0x6a6050, { r: 1 }), 0, -0.3, 14, s); const bs = [[-4, 4], [1, 2], [5, 5]].map(([x, z], i) => rowboat(s, x, z, 0, 3, i)); const shp = battleship(0x4a5058); shp.position.set(6, 0, -40); s.add(shp);
    const r = (u, t) => { bs.forEach((b, i) => { b.g.position.z = [4, 2, 5][i] - t * 1.4; b.g.position.y = Math.sin(t * 2 + i) * 0.05; b.cs.forEach((c, j) => c.arms.forEach(a => a.sh.rotation.x = -0.8 + Math.sin(t * 3 + j) * 0.5)); }); ctx.grade = 'night';
      cam(ctx, V(-4, 3.5, 16), V(-3, 3.2, 13), V(0, 0.5, 0), V(0, 0.5, -4), u, 50); };
    r.overlay = (g, W, H, u, T, t) => { chip(g, W, H, 'RÜCKZUG IM WINTER', '#2a3a7a', W / 2, H * 0.2, (t - 0.15) * 3, 0.055); };
    return r;
  },
  president(ctx) {
    const s = ctx.scene; greenLand(s, { target: V(0, 1, 0), sr: 7 }); const k = guy(s, KEMAL_SUIT, 0, 0.6, -0.5, 0); L.mesh(L.box(2.4, 0.6, 1.6), L.mat(0x8a2a2a, { fab: true }), 0, 0.3, -0.5, s); flag(s, -1.4, 0.6, -0.9, 1.4, 3); flag(s, 1.0, 0.6, -0.9, 1.4, 3);
    L.reseed(3); const crowd = []; for (let i = 0; i < 10; i++) { const sd = i % 2 ? 1 : -1; const c = person(s, CIVS[i % CIVS.length], sd * (2.2 + Math.floor(i / 2) % 3 * 0.9) + R_() * 0.2, 0.8 + Math.floor(i / 6) * 1.2 + (i % 3) * 0.3, Math.PI + sd * 0.5); crowd.push(c); } const cf = confetti(s, 90, 6, 5);
    const r = (u, t) => { k.pose('stand'); k.expr('smile'); k.arms[1].sh.rotation.set(-0.2, 0, 2.3 + Math.sin(t * 4) * 0.15); k.look(0, 0.1); crowd.forEach((c, i) => { c.pose('cheer'); c.expr('grin'); c.arms[1].sh.rotation.z = 2.6 + Math.sin(t * 8 + i) * 0.3; }); cf(t);
      cam(ctx, V(0.5, 2.6, 8.0), V(0.3, 2.5, 7.2), V(0, 1.6, -0.5), V(0, 1.8, -0.5), u, 64); };
    r.overlay = (g, W, H, u, T, t) => { chip(g, W, H, 'ATATÜRK', '#d62828', W / 2, H * 0.17, (u - 0.35) * 3, 0.07); chip(g, W, H, '1923 · REPUBLIK TÜRKEI', '#3a3a42', W / 2, H * 0.245, (u - 0.55) * 3, 0.045); };
    return r;
  },
  // ---------- ENDE ----------
  finale_title(ctx) {
    const s = ctx.scene; s.background = L.skyTex('#2b2a6b', '#e3735a', '#ffc27a'); lights(s, { dir: [-3, 5, 8], sunSprite: false, si: 2.6, hi: 1.1, sr: 3, target: V(0, 0, 0) }); const w = pocketWatch({ dent: true }); s.add(w.g); const gl = sparkle(s, 0xffffff, 1.0);
    const r = (u, t) => { w.g.rotation.set(0.1, Math.sin(t * 0.8) * 0.5, 0); w.g.position.y = -0.6 + Math.sin(t * 1.5) * 0.05; gl.position.set(0.6, 0.1, 0.4); gl.scale.setScalar(0.8 + Math.sin(t * 5) * 0.3); ctx.flash = clamp(1 - t * 4) * 0.7; cam(ctx, V(0, -0.3, 5.4), V(0, -0.2, 4.6), V(0, 0.2, 0), V(0, 0.3, 0), u, 50); };
    r.overlay = (g, W, H, u, T, t) => { bigText(g, 'DIE TASCHENUHR', W / 2, H * 0.14, W * 0.12, t / 1.2); bigText(g, 'VON GALLIPOLI', W / 2, H * 0.21, W * 0.1, t / 1.2 - 0.15); bigText(g, '1915', W / 2, H * 0.275, W * 0.08, t / 1.2 - 0.25);
      if (t > 0.9) { g.save(); g.globalAlpha = clamp((t - 0.9) * 3); g.font = `800 ${W * 0.042}px "Inter Display"`; g.textAlign = 'center'; g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 12; g.fillText('EINE WAHRE GESCHICHTE', W / 2, H * 0.325); g.restore(); } };
    return r;
  },
  question(ctx) {
    const s = ctx.scene; s.background = new THREE.Color(0x1a1410); lights(s, { dir: [3, 7, 6], sunSprite: false, si: 2.4, hi: 1.0, sr: 3, target: V(0, 0, 0) }); L.mesh(L.box(10, 0.2, 10), new THREE.MeshStandardMaterial({ map: L.parquetTex(), roughness: 0.5 }), 0, -0.25, 0, s);
    const w = pocketWatch({ dent: true }); s.add(w.g); w.g.rotation.x = -Math.PI / 2 + 0.5; w.g.position.y = 0.05;
    const r = (u, t) => { cam(ctx, V(0, 2.6, 4.2), V(0, 2.9, 4.8), V(0, -0.3, 0), V(0, -0.2, 0), u, 50); };
    r.overlay = (g, W, H, u, T, t) => {
      const k = clamp(t * 3); if (k <= 0) return; const e2 = 1 - Math.pow(1 - k, 3);
      g.save(); g.globalAlpha = e2; g.fillStyle = 'rgba(10,12,30,0.55)'; g.beginPath(); g.roundRect(W * 0.06, H * 0.1, W * 0.88, H * 0.27, W * 0.05); g.fill(); g.restore();
      g.save(); g.translate(W / 2, H * 0.165); g.scale(0.8 + 0.2 * e2, 0.8 + 0.2 * e2); g.globalAlpha = e2; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      const line = (txt, y, size, col) => { g.font = `900 ${size}px "Inter Display"`; g.lineWidth = size * 0.18; g.strokeStyle = '#000'; g.strokeText(txt, 0, y); g.fillStyle = col; g.fillText(txt, 0, y); };
      line('WAR DAS', 0, W * 0.075, '#fff'); line('GLÜCK ODER', W * 0.09, W * 0.075, '#fff'); line('SCHICKSAL?', W * 0.19, W * 0.095, '#FFD60A'); g.restore();
      const bb = clamp(t * 3 - 1.2); if (bb > 0) { const pulse = 1 + 0.05 * Math.sin(T * 8);
        [['GLÜCK', '#3a9a4a', -1], ['SCHICKSAL', '#7a3ad6', 1]].forEach(([tx, c, sx]) => { g.save(); g.translate(W / 2 + sx * W * 0.21, H * 0.43 - W * 0.1); g.scale(bb * pulse, bb * pulse); g.fillStyle = c; g.strokeStyle = '#000'; g.lineWidth = W * 0.008; g.beginPath(); g.roundRect(-W * 0.19, -W * 0.06, W * 0.38, W * 0.12, W * 0.06); g.fill(); g.stroke(); g.fillStyle = '#fff'; g.font = `900 ${W * 0.052}px "Inter Display"`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(tx, 0, 4); g.restore(); });
        g.save(); g.globalAlpha = bb; g.font = `800 ${W * 0.042}px "Inter Display"`; g.textAlign = 'center'; g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = 10; g.fillText('SCHREIB ES IN DIE KOMMENTARE', W / 2, H * 0.5 - W * 0.1); g.restore(); }
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
export { guy, lights, fedora, magnifier, bear, beret, dog, cam, sparkle, pocketWatch, kemal };
