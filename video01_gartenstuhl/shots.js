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

export const SHOTS = {
  // ---------------- HOOK (first 3 s: whip up from below, scream, look down) ----------------
  hook_sky(ctx) {
    const s = ctx.scene; highSky(s, { target: V(0, 3, 0) }); const F = flyer(s, 'crazy', 'sit armsUp'); const j = L.makeJet(); j.rotation.y = Math.PI; s.add(j);
    return (u, t) => { F.b.update(t); F.g.position.y = u * 0.6; flail(F.lr, t, 1); F.lr.expr(t % 0.5 < 0.25 ? 'crazy' : 'shock', 1); F.lr.head.rotation.z = Math.sin(t * 7) * 0.12; F.lr.look(Math.sin(t * 6), 0.2);
      j.position.set(-40 + u * 90, 4, -16); ctx.alt = hookAlt(ctx); ctx.shake = 0.35 + 0.6 * clamp(1 - u * 3); ctx.flash = clamp(1 - t * 7) * 0.45;
      cam(ctx, V(4.5, -5, 7), V(1.3, 1.25, 2.5), V(0, 0.5, 0), V(0, 1.85, 0), clamp(u * 1.6), 55, true); };
  },
  hook_face(ctx) {
    const s = ctx.scene; highSky(s, { target: V(0, 2, 0) }); const F = flyer(s, 'shock', 'sit clutch'); const sw = sweat(F.lr);
    return (u, t) => { F.b.update(t); F.lr.expr('shock', 0.6 + 0.4 * Math.sin(t * 9)); F.lr.look(Math.sin(t * 5) * 0.8, -0.7); F.g.position.y = u * 0.3; tremble(F.lr, t); sw(t);
      ctx.alt = hookAlt(ctx); ctx.shake = 0.25;
      cam(ctx, V(0.45, 1.75, 2.1), V(0.06, 1.58, 1.3), V(0, 1.48, 0), V(0, 1.5, 0), u, 50, true); };
  },
  hook_feet(ctx) {
    const s = ctx.scene; highSky(s, { target: V(0, 2, 0), alt: -900, near: false }); const F = flyer(s, 'scared', 'sit clutch'); F.lr.noLegs = true;
    return (u, t) => { F.b.update(t); F.lr.legs.forEach((l, i) => { l.hip.rotation.x = -1.5; l.knee.rotation.x = 1.2 + Math.sin(t * 9 + i * 2) * 0.45; });
      ctx.alt = hookAlt(ctx); ctx.shake = 0.15;
      cam(ctx, V(0.75, 2.3, -0.9), V(0.6, 2.15, -0.7), V(0.25, -2.0, 2.0), V(0.2, -3.0, 2.6), u, 68); ctx.roll = Math.sin(t * 2) * 0.05; };
  },
  rise_wide(ctx) {
    const s = ctx.scene; highSky(s, { target: V(0, 2, 0), alt: -900 }); const F = flyer(s, 'scared', 'sit clutch');
    return (u, t) => { F.b.update(t); F.g.position.y = u * 1.5; ctx.alt = hookAlt(ctx);
      cam(ctx, V(0.6, 9, 3.5), V(0.4, 15, 3.6), V(0, 0, 0), V(0, -8, 0), u, 60); ctx.roll = u * 0.15; };
  },
  // ---------------- BACKSTORY ----------------
  kid_dream(ctx) {
    const s = ctx.scene; garden(s, { target: V(0, 1, 0) });
    const k = guy(s, { ...LARRY, s: 0.72, kid: true, shirt: 0x3a7bd5, sleeve: 0x3a7bd5 }, 0, 0, 0, 0.3); k.expr('dream'); k.pose('stand point'); k.head.rotation.x = -0.45; k.look(0, 1);
    const j = L.makeJet(); j.scale.setScalar(0.6); s.add(j);
    return (u, t) => { j.position.set(-30 + u * 40, 32, -40); k.g.rotation.y = 0.3 + Math.sin(t) * 0.05; k.arms[1].sh.rotation.set(-2.6 + Math.sin(t * 3) * 0.12, 0, 0.2); k.g.position.y = Math.abs(Math.sin(t * 5)) * 0.04;
      ctx.grade = 'dream'; cam(ctx, V(2.2, 0.3, 3.0), V(1.1, 0.4, 1.7), V(0, 1.2, 0), V(-0.2, 1.6, 0), u, 60); };
  },
  kid_close(ctx) {
    const s = ctx.scene; garden(s, { target: V(0, 1, 0) });
    const k = guy(s, { ...LARRY, s: 0.72, kid: true, shirt: 0x3a7bd5, sleeve: 0x3a7bd5 }, 0, 0, 0, 0); k.expr('grin', 0.6); k.head.rotation.x = -0.35; k.look(-0.3, 1);
    const j = L.makeJet(); j.scale.setScalar(0.5); s.add(j);
    return (u, t) => { j.position.set(20 - u * 30, 22, -30); k.look(0.3 - u * 0.8, 1); k.expr(u > 0.4 ? 'grin' : 'dream', 1);
      ctx.grade = 'dream'; cam(ctx, V(0.5, 0.95, 0.95), V(0.25, 1.0, 0.75), V(0, 1.2, 0), V(0, 1.25, 0), u, 55); };
  },
  eye_chart(ctx) {
    const s = ctx.scene; doctorRoom(s);
    L.mesh(new THREE.PlaneGeometry(1.4, 2.1), new THREE.MeshStandardMaterial({ map: chartTex(0), roughness: 0.8 }), 1.3, 2.1, -2.95, s);
    const lr = guy(s, { ...LARRY, glasses: true }, -0.5, 0, 0.5, 0.75); lr.expr('squint'); lr.pose('stand chin');
    return (u, t) => { lr.head.rotation.y = -0.15; lr.g.position.z = 0.5 - u * 0.4; lr.head.rotation.x = Math.sin(t * 3) * 0.05; lr.body.rotation.x = 0.08 * u;
      cam(ctx, V(-2.6, 1.5, 4.0), V(-1.6, 1.75, 2.8), V(0.3, 1.6, -1), V(0.4, 1.7, -1.2), u, 50); };
  },
  eye_pov(ctx) {
    const s = ctx.scene; doctorRoom(s);
    L.mesh(new THREE.PlaneGeometry(1.4, 2.1), new THREE.MeshStandardMaterial({ map: chartTex(9), roughness: 0.8 }), 1.3, 2.1, -2.95, s);
    const r = (u, t) => { cam(ctx, V(0.2, 1.7, 1.8), V(0.9, 1.9, 0.3), V(1.3, 2.0, -3), V(1.3, 2.2, -3), u, 45); ctx.roll = Math.sin(t * 2.5) * 0.04; ctx.hand = 2.5; };
    r.overlay = (g, W, H, u) => { g.save(); g.fillStyle = 'rgba(0,0,0,0.9)'; g.beginPath(); g.rect(0, 0, W, H); for (const x of [0.28, 0.72]) { g.moveTo(W * x + W * 0.27, H * 0.42); g.arc(W * x, H * 0.42, W * 0.27, 0, Math.PI * 2, true); } g.fill('evenodd'); g.restore(); };
    return r;
  },
  eye_face(ctx) {
    const s = ctx.scene; doctorRoom(s);
    const lr = guy(s, { ...LARRY, glasses: true }, 0, 0, 0, 0); lr.pose('stand');
    const stamp = L.canvasTex(512, 200, (g, w, h) => { g.strokeStyle = '#d11'; g.lineWidth = 16; g.strokeRect(10, 10, w - 20, h - 20); g.fillStyle = '#d11'; g.font = '900 70px Inter Display'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('UNTAUGLICH', w / 2, h / 2 + 4); });
    const st = L.mesh(new THREE.PlaneGeometry(0.2, 0.078), new THREE.MeshBasicMaterial({ map: stamp, transparent: true }), 0, 1.5, 0.5, s); st.rotation.z = 0.2; st.castShadow = false;
    return (u, t) => { lr.expr(u < 0.45 ? 'squint' : 'sad'); lr.look(Math.sin(t * 4) * 0.3, u < 0.45 ? 0 : -0.6); const k = clamp((u - 0.4) * 8); st.visible = u > 0.4; st.scale.setScalar(2.2 - 1.2 * k);
      if (u > 0.4 && u < 0.5) ctx.shake = 1.2; if (u > 0.45) lr.head.rotation.x = 0.15 * clamp((u - 0.45) * 4);
      cam(ctx, V(0.1, 1.7, 1.6), V(0, 1.66, 1.1), V(0, 1.62, 0), V(0, 1.64, 0), u, 50); };
  },
  // ---------------- PREP ----------------
  tanks_pan(ctx) {
    const s = ctx.scene; garden(s, { target: V(-1.5, 1, 0) });
    for (let i = 0; i < 7; i++) { const tk = L.makeTank(); tk.position.set(-3.4 + i * 0.55, 0, -0.4 - (i % 2) * 0.35); s.add(tk); }
    const b = L.mesh(L.sph(0.5, 32), L.mat(0x3bceac, { r: 0.3, phys: true, cc: 1 }), -0.1, 1.8, -0.4, s);
    return (u, t) => { const k = 0.25 + u * 0.6; b.scale.set(k + Math.sin(t * 20) * 0.01, k * 1.18, k); b.position.y = 1.65 + k * 0.5;
      cam(ctx, V(-3.8, 0.6, 1.6), V(-0.4, 1.2, 1.9), V(-2.8, 1.0, -0.4), V(-0.1, 1.9, -0.4), u, 55); };
  },
  inflate(ctx) {
    const s = ctx.scene; garden(s, { target: V(0, 1, 0) });
    const lr = guy(s, LARRY, 0, 0, 0, 0.4); lr.pose('stand holdL holdR'); lr.expr('grin');
    for (let i = 0; i < 5; i++) { const tk = L.makeTank(); tk.position.set(-1.4 - i * 0.5, 0, -0.6 - (i % 2) * 0.4); s.add(tk); }
    L.reseed(5); const bs = L.makeBalloons(18, { cy: 4.5, rx: 1.6, ry: 1.0 }); bs.g.position.set(2.4, 0, -1.6); s.add(bs.g);
    L.mesh(L.cyl(0.05, 0.05, 0.4), 0x6b4a2b, 2.4, 0.2, -1.6, s);
    const big = L.mesh(L.sph(0.5, 32), L.mat(0xff4d6d, { r: 0.3, phys: true, cc: 1 }), 0.45, 1.6, 0.6, s);
    return (u, t) => { bs.update(t); const k = 0.3 + u * 1.1; big.scale.set(k, k * 1.18, k); big.position.y = 1.5 + u * 0.5;
      lr.arms.forEach((a, i) => a.sh.rotation.x = -1.2 + Math.sin(t * 8 + i) * 0.15); lr.head.rotation.x = -0.2; lr.look(0.4, 0.6); lr.g.position.y = Math.abs(Math.sin(t * 8)) * 0.02;
      cam(ctx, V(3.8, 1.2, 5.4), V(2.2, 1.8, 3.6), V(0.4, 1.6, 0), V(0.6, 2.0, -0.4), u, 52); };
  },
  inflate_close(ctx) {
    const s = ctx.scene; garden(s, { target: V(0, 1, 0) });
    const lr = guy(s, LARRY, 0, 0, 0, 0); lr.pose('stand holdL holdR'); lr.expr('crazy');
    const big = L.mesh(L.sph(0.5, 32), L.mat(0xffd23f, { r: 0.3, phys: true, cc: 1 }), 0.75, 1.95, 0.3, s);
    return (u, t) => { const k = 0.3 + u * 0.55; big.scale.set(k, k * 1.18, k); lr.look(0.8, 0.2); lr.head.rotation.z = Math.sin(t * 6) * 0.08; lr.head.rotation.y = 0.2;
      cam(ctx, V(-0.7, 1.6, 1.9), V(-0.25, 1.72, 1.2), V(0.1, 1.65, 0), V(0.25, 1.75, 0), u, 55); };
  },
  tie_chair(ctx) {
    const s = ctx.scene; garden(s, { target: V(0, 1, 0) }); const F = flyer(s, 'grin', 'stand holdR'); F.lr.noLegs = true; F.lr.g.position.set(0.9, 0, 0.6); F.lr.g.rotation.y = -0.9;
    return (u, t) => { F.b.update(t); F.lr.arms[1].sh.rotation.x = -1.2 + Math.sin(t * 10) * 0.3; F.lr.arms[0].sh.rotation.x = -0.9 + Math.cos(t * 10) * 0.3; F.lr.legs.forEach(l => { l.hip.rotation.x = 0; l.knee.rotation.x = 0; });
      cam(ctx, V(3.0, 0.8, 6.8), V(1.6, 3.2, 5.4), V(0, 1.5, 0), V(0, 5.0, 0), u, 58); };
  },
  props_sandwich(ctx) { return propShot(ctx, L.makeSandwich(), 0); },
  props_beer(ctx) { return propShot(ctx, L.makeBeer(), 1); },
  props_gun(ctx) {
    const s = ctx.scene; garden(s, { target: V(0, 1, 0) });
    const ch = L.makeChair(); s.add(ch); const r = L.makeRadio(); r.position.set(-0.12, 0.45, 0.05); s.add(r); const gn = L.makeGun(); gn.position.set(0.1, 0.52, 0.1); s.add(gn);
    const sw = L.makeSandwich(); sw.scale.setScalar(0.7); sw.position.set(0.18, 0.7, 0.05); s.add(sw); const be = L.makeBeer(); be.position.set(-0.3, 0.7, 0.15); s.add(be);
    return (u, t) => { popIn(r, u, 0.05); popIn(gn, u, 0.35); gn.rotation.y = 0.6 + Math.sin(t * 3) * 0.05;
      orbit(ctx, V(0, 0.55, 0), 1.5, 1.05, -0.6, 0.5, 1.25, 1.0, u, 50); };
  },
  // ---------------- PLAN (dream look) ----------------
  plan_smug(ctx) {
    const s = ctx.scene; garden(s, { target: V(0, 1, 0) }); const lr = guy(s, LARRY, 0, 0, 0, 0); lr.pose('stand chin'); lr.expr('smug');
    return (u, t) => { lr.look(0.6, 0.3); lr.head.rotation.z = Math.sin(t * 2) * 0.05; lr.head.rotation.x = Math.sin(t * 5) * 0.06; lr.brows[0].position.y = 0.27 + Math.max(0, Math.sin(t * 9)) * 0.04;
      cam(ctx, V(0.8, 1.45, 2.2), V(0.25, 1.62, 1.2), V(0, 1.55, 0), V(0, 1.62, 0), u, 52); };
  },
  hover_low(ctx) {
    const s = ctx.scene; garden(s, { target: V(0, 1, 0) }); const F = flyer(s, 'grin', 'sit cheer');
    const f1 = guy(s, FRIEND1, 2.2, 0, 1.2, -0.9); f1.pose('stand holdL holdR'); f1.expr('grin');
    const rope = L.mesh(L.cyl(0.02, 0.02, 1), 0xd8c49a, 0, 0, 0, s);
    return (u, t) => { F.b.update(t); F.g.position.y = 2.2 + Math.sin(t * 2) * 0.12; F.lr.arms[1].sh.rotation.z = 2.5 + Math.sin(t * 12) * 0.35;
      const a = V(0, F.g.position.y + 0.45, 0), b = V(1.75, 1.0, 1.55); rope.position.copy(a).add(b).multiplyScalar(0.5); rope.scale.y = a.distanceTo(b); rope.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize());
      ctx.grade = 'dream'; cam(ctx, V(5.5, 1.0, 8), V(3.5, 1.8, 5.8), V(0.6, 2.4, 0), V(0.6, 3.0, 0), u, 55); };
  },
  plan_shoot(ctx) {
    const s = ctx.scene; garden(s, { target: V(0, 3, 0) }); const F = flyer(s, 'grin', 'sit aim'); F.g.position.y = 2.3;
    const gn = L.makeGun(); F.lr.arms[0].el.add(gn); gn.position.set(0, -0.32, 0.1);
    return (u, t) => { F.b.update(t); F.lr.head.rotation.x = -0.6; F.lr.look(0, 1); F.b.balls[3].visible = u < 0.6; if (u > 0.6 && u < 0.68) { ctx.shake = 0.6; F.lr.arms[0].sh.rotation.x = -1.75; }
      ctx.grade = 'dream'; cam(ctx, V(1.7, 2.3, 2.8), V(1.0, 3.0, 1.9), V(0, 4.5, 0), V(0, 5.6, 0), u, 60); };
  },
  // ---------------- LAUNCH ----------------
  cut_rope(ctx) {
    const s = ctx.scene; garden(s, { target: V(0, 1, 0) });
    const f2 = guy(s, FRIEND2, 0.45, 0, 0.4, -0.7); f2.pose('stand holdR'); f2.expr('grin');
    const knife = new THREE.Group(); L.mesh(L.box(0.04, 0.25, 0.015), L.mat(0xdadada, { m: 0.9, r: 0.2 }), 0, 0.15, 0, knife); L.mesh(L.box(0.05, 0.12, 0.04), 0x222222, 0, -0.03, 0, knife); f2.arms[1].el.add(knife); knife.position.set(0, -0.35, 0.05); knife.rotation.x = -1.2;
    L.mesh(L.cyl(0.06, 0.06, 0.5), 0x6b4a2b, 0, 0.25, 0, s);
    const ropeA = L.mesh(L.cyl(0.025, 0.025, 1), 0xd8c49a, 0, 0, 0, s), ropeB = L.mesh(L.cyl(0.025, 0.025, 1), 0xd8c49a, 0, 0, 0, s);
    const seg = (r, a, b) => { r.position.copy(a).add(b).multiplyScalar(0.5); r.scale.y = Math.max(0.01, a.distanceTo(b)); r.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()); };
    return (u, t) => { const cut = u > 0.55; const k = clamp((u - 0.55) * 4);
      f2.arms[1].sh.rotation.x = -1.2 + Math.sin(t * 20) * 0.25 * (cut ? 0 : 1);
      if (!cut) { seg(ropeA, V(0, 0.5, 0), V(0, 2.0, 0)); seg(ropeB, V(0, 2.0, 0), V(0, 6, 0)); } else { seg(ropeA, V(0, 0.5, 0), V(0.1 + Math.sin(t * 30) * 0.1 * (1 - k), 1.1 - k * 0.5, 0.05)); seg(ropeB, V(0, 1.9 + k * 4, 0), V(0, 6 + k * 6, 0)); }
      f2.expr(cut ? 'shock' : 'grin', 1); if (cut) { f2.pose('stand headHands'); ctx.shake = 0.8 * (1 - k); ctx.flash = clamp(1 - (u - 0.55) * 10) * 0.6; f2.look(0, 1); }
      cam(ctx, V(-0.8, 1.2, 2.2), V(-0.35, 1.5, 1.4), V(0.2, 1.3, 0), V(0.2, 1.6, 0), u, 55); };
  },
  rocket_up(ctx) {
    const s = ctx.scene; garden(s, { target: V(0, 10, 0), sr: 12 }); const F = flyer(s, 'shock', 'sit armsUp');
    const lines = new THREE.Group(); s.add(lines); for (let i = 0; i < 30; i++) { const l = L.mesh(L.box(0.02, 3, 0.02), L.mat(0xffffff, { t: 0.6, e: 0xffffff }), (Math.random() - 0.5) * 6, 0, (Math.random() - 0.5) * 6, lines); l.castShadow = false; }
    return (u, t) => { F.b.update(t); const y = 1 + Math.pow(u, 1.6) * 30; F.g.position.y = y; F.lr.expr('shock', 1); flail(F.lr, t, 1.2);
      lines.position.y = y - 2; lines.children.forEach((l, i) => l.position.y = ((i * 1.7 - t * 30) % 8 + 8) % 8 - 4);
      ctx.alt = Math.round(y * 3); ctx.shake = 0.9; L.WIND.v = 3;
      cam(ctx, V(2.5, 0.4, 5), V(2.8, y * 0.4, 6), V(0, 1.2, 0), V(0, y + 2, 0), Math.min(1, u * 1.4), 66); };
  },
  rocket_top(ctx) {
    const s = ctx.scene; garden(s, { target: V(0, 0, 0), sr: 14 }); const F = flyer(s, 'scared', 'sit armsUp');
    const f1 = guy(s, FRIEND1, 1.0, 0, 0.8, 0); f1.pose('stand headHands'); f1.expr('shock'); const f2 = guy(s, FRIEND2, -0.9, 0, 0.9, 0); f2.pose('stand cheer'); f2.expr('shock');
    return (u, t) => { F.b.update(t); const y = 4 + u * 40; F.g.position.y = y; flail(F.lr, t, 1.2); F.lr.head.rotation.x = 0.6; F.lr.look(0, -1);
      ctx.alt = Math.round(y * 3 + 100); ctx.shake = 0.5; L.WIND.v = 3;
      cam(ctx, V(0.3, y + 14, 3.5), V(0.3, y + 10, 3.0), V(0, y - 3, 0), V(0, y - 6, 0), u, 70); ctx.roll = t * 0.25; };
  },
  friends_shock(ctx) {
    const s = ctx.scene; garden(s, { target: V(0, 1, 0) });
    const f1 = guy(s, FRIEND1, -0.45, 0, 0, 0.15); const f2 = guy(s, FRIEND2, 0.45, 0, 0.1, -0.15);
    [f1, f2].forEach(f => { f.pose('stand headHands'); f.head.rotation.x = -0.35; });
    return (u, t) => { f1.expr('shock', 0.8 + 0.2 * Math.sin(t * 8)); f2.expr('scared', 1); f1.look(0, 1); f2.look(0, 1);
      f1.g.position.y = Math.abs(Math.sin(t * 9)) * 0.08; f2.g.position.y = Math.abs(Math.cos(t * 9)) * 0.06; f2.head.rotation.z = Math.sin(t * 6) * 0.1;
      cam(ctx, V(0, 0.6, 3.2), V(0, 0.95, 1.9), V(0, 1.7, 0), V(0, 1.78, 0), u, 55, true); };
  },
  // ---------------- FEAR ----------------
  scared_close(ctx) {
    const s = ctx.scene; highSky(s, { target: V(0, 2, 0) }); const F = flyer(s, 'scared', 'sit clutch'); const sw = sweat(F.lr);
    return (u, t) => { F.b.update(t); F.lr.look(Math.sin(t * 2) * 0.8, -0.8); tremble(F.lr, t, 1.5); sw(t); ctx.alt = 4900 + Math.round(Math.sin(t) * 8);
      cam(ctx, V(-0.6, 1.6, 1.5), V(-0.15, 1.5, 0.9), V(0, 1.45, 0), V(0, 1.45, 0), u, 50); };
  },
  scared_wide(ctx) {
    const s = ctx.scene; highSky(s, { target: V(0, 2, 0), alt: -900 }); const F = flyer(s, 'scared', 'sit clutch'); L.WIND.v = 2.2;
    return (u, t) => { F.b.update(t); tremble(F.lr, t); ctx.alt = 4900;
      orbit(ctx, V(0, 3, 0), 18, 13, 0.6, 1.4, -2, 0.5, u, 50); };
  },
  scared_gun(ctx) {
    const s = ctx.scene; highSky(s, { target: V(0, 2, 0) }); const F = flyer(s, 'scared', 'sit aim');
    const gn = L.makeGun(); F.lr.arms[0].el.add(gn); gn.position.set(0, -0.32, 0.1);
    return (u, t) => { F.b.update(t); F.lr.arms.forEach(a => a.sh.rotation.y += Math.sin(t * 40) * 0.02); F.lr.head.rotation.x = -0.5; F.lr.head.rotation.y = Math.sin(t * 9) * 0.25 * clamp(u * 2 - 0.6); F.lr.look(0, 1); ctx.alt = 4900;
      cam(ctx, V(1.8, 0.4, 2.0), V(1.1, 0.55, 1.2), V(0, 2.2, 0), V(0, 2.6, 0), u, 62); };
  },
  // ---------------- AIRPORT ----------------
  jet_pass(ctx) {
    const s = ctx.scene; highSky(s, { target: V(0, 2, 0) }); const F = flyer(s, 'shock', 'sit clutch'); const j = L.makeJet(); s.add(j);
    return (u, t) => { F.b.update(t); j.position.set(40 - u * 80, 3, -18); F.lr.head.rotation.y = -0.5 + u * 1.0; F.lr.look(0.8 - u * 1.6, 0); ctx.alt = 4900;
      ctx.shake = 0.9 * Math.exp(-Math.pow((u - 0.5) * 5, 2)); L.WIND.v = 1 + 2 * Math.exp(-Math.pow((u - 0.55) * 5, 2));
      cam(ctx, V(1.4, 1.2, 4.8), V(0.5, 1.5, 3.6), V(0, 1.6, -3), V(0, 1.7, -3), u, 60); };
  },
  jet_wide(ctx) {
    const s = ctx.scene; highSky(s, { target: V(0, 2, 0) }); const F = flyer(s, 'scared', 'sit clutch'); const j = L.makeJet(); j.rotation.y = Math.PI; s.add(j);
    return (u, t) => { F.b.update(t); j.position.set(-50 + u * 70, -6 + u * 6, -14);
      cam(ctx, V(-12, -3, 33), V(-5, 0.5, 24), V(-6, 0, 0), V(-2, 2, 0), u, 55); };
  },
  pilot_window(ctx) {
    const s = ctx.scene; highSky(s, { target: V(0, 0, 0) }); const j = L.makeJet(); j.position.set(-8, 0, 0); s.add(j);
    const p = guy(s, PILOT, -0.4, -1.1, 0.4, Math.PI / 2); p.expr('shock');
    L.mesh(L.cyl(0.36, 0.33, 0.14), 0x1d2a44, 0, 0.3, 0, p.head); L.mesh(L.box(0.5, 0.04, 0.2), 0x111111, 0, 0.24, 0.3, p.head);
    j.children.forEach(c => { if (c.position.x > 7 && c.position.y > 0.3) c.visible = false; });
    return (u, t) => { talk(p, t); p.look(0.5, 0.2);
      cam(ctx, V(2.5, 0.8, 1.5), V(2.0, 0.7, 1.2), V(-0.4, 0.6, 0.3), V(-0.4, 0.62, 0.3), u, 50); };
  },
  pilot_face(ctx) {
    const s = ctx.scene; s.background = L.skyTex('#2d78d6', '#8cc0f0', '#d4e7f8'); lights(s, { sky: 0xdfefff, ground: 0x445566, hi: 1.3, dir: [-3, 6, 8], sunSprite: false });
    for (let i = 0; i < 5; i++) { const c = L.makeCloud(2 + i); c.position.set(-20 + i * 10, -6 + i, -40); s.add(c); }
    const p = guy(s, PILOT, 0, 0, 0, 0);
    L.mesh(L.cyl(0.36, 0.33, 0.14), 0x1d2a44, 0, 0.3, 0, p.head); L.mesh(L.box(0.5, 0.04, 0.2), 0x111111, 0, 0.24, 0.3, p.head);
    L.mesh(new THREE.TorusGeometry(0.36, 0.025, 8, 24, Math.PI), 0x222222, 0, 0.02, 0, p.head); L.mesh(L.sph(0.07), 0x222222, 0.35, 0, 0, p.head); const mc = L.mesh(L.cyl(0.012, 0.012, 0.3), 0x222222, 0.25, -0.15, 0.2, p.head); mc.rotation.set(0.9, 0, 0.9); L.mesh(L.sph(0.035), 0x111111, 0.12, -0.2, 0.33, p.head);
    p.arms[1].sh.rotation.set(-0.9, 0, 0.5); p.arms[1].el.rotation.x = -2.0;
    L.mesh(L.box(3, 0.8, 0.6), 0x2a2e33, 0, 0.9, 0.9, s); for (let i = 0; i < 6; i++) L.mesh(new THREE.CircleGeometry(0.09, 20), L.mat(0x111111, { e: 0x22aa66, ei: 0.6 }), -1 + i * 0.4, 1.12, 1.21, s);
    const F = flyer(s, 'grin', 'sit cheer', 45); F.g.position.set(-2.8, 0.6, -9);
    for (const x of [-1.4, 1.4]) L.mesh(L.box(0.12, 3, 0.12), 0x22262b, x, 2, -0.8, s);
    return (u, t) => { F.b.update(t); talk(p, t, 'shock'); p.look(-0.6, 0.1); p.head.rotation.y = 0.2 + Math.sin(t * 7) * 0.05; F.lr.arms[1].sh.rotation.z = 2.5 + Math.sin(t * 12) * 0.35;
      cam(ctx, V(-0.5, 1.75, 1.8), V(-0.25, 1.68, 1.1), V(-0.2, 1.6, 0), V(0, 1.62, 0), u, 50); };
  },
  tower(ctx) {
    const s = ctx.scene; garden(s, { target: V(0, 20, 0), sr: 20, jeep: false }); const tw = L.makeTower(); tw.position.set(0, 0, -6); s.add(tw);
    const F = flyer(s, 'grin', 'sit cheer'); F.g.position.set(-14, 34, -30);
    const r = (u, t) => { F.b.update(t); cam(ctx, V(8, 6, 26), V(5, 16, 20), V(0, 18, -6), V(-3, 26, -10), u, 55); };
    r.overlay = (g, W, H, u, T) => { g.save(); g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = W * 0.008; for (let i = 0; i < 3; i++) { const k = ((T * 1.5 + i / 3) % 1); g.globalAlpha = 1 - k; g.beginPath(); g.arc(W * 0.5, H * 0.33, W * (0.05 + k * 0.25), -2.4, -0.7); g.stroke(); } g.restore(); };
    return r;
  },
  jet_pass_close(ctx) {
    const s = ctx.scene; highSky(s, { target: V(0, 2, 0) }); const F = flyer(s, 'crazy', 'sit cheer'); const j = L.makeJet(); s.add(j);
    return (u, t) => { F.b.update(t); j.position.set(25 - u * 45, 2.5, -9); F.lr.head.rotation.y = -0.4; F.lr.look(-0.6, 0.1); F.lr.arms[1].sh.rotation.z = 2.5 + Math.sin(t * 12) * 0.35; ctx.alt = 4900;
      ctx.shake = 0.8 * Math.exp(-Math.pow((u - 0.55) * 4, 2)); L.WIND.v = 1 + 2.5 * Math.exp(-Math.pow((u - 0.6) * 4, 2));
      cam(ctx, V(1.2, 1.4, 2.6), V(0.5, 1.58, 1.7), V(-0.6, 1.6, -3), V(-0.6, 1.7, -3), u, 55); };
  },
  wave_plane(ctx) {
    const s = ctx.scene; highSky(s, { target: V(0, 2, 0) }); const F = flyer(s, 'grin', 'sit cheer'); const j = L.makeJet(); j.rotation.y = Math.PI; s.add(j);
    return (u, t) => { F.b.update(t); F.lr.arms[1].sh.rotation.z = 2.5 + Math.sin(t * 12) * 0.35; j.position.set(-30 + u * 50, 0.5, -12); F.lr.head.rotation.y = -0.6; F.lr.look(-0.8, 0); ctx.alt = 4900;
      cam(ctx, V(3.2, 1.6, 4.4), V(2.0, 2.0, 3.0), V(-1, 1.5, -2), V(-0.8, 1.6, -2), u, 60); };
  },
  // ---------------- DESCENT ----------------
  aim(ctx) {
    const s = ctx.scene; highSky(s, { target: V(0, 2, 0) }); const F = flyer(s, 'angry', 'sit aim'); const gn = L.makeGun(); F.lr.arms[0].el.add(gn); gn.position.set(0, -0.32, 0.1);
    return (u, t) => { F.b.update(t); F.lr.head.rotation.x = -0.55; F.lr.look(0, 1); ctx.alt = 4900; F.lr.lids.forEach((l, i) => { if (i === 0) { l.visible = true; l.rotation.x = -0.15; } });
      cam(ctx, V(-2.2, 0.8, 2.8), V(-1.3, 1.15, 1.7), V(0, 1.8, 0), V(0, 2.3, 0), u, 55); };
  },
  pop(ctx) {
    const s = ctx.scene; highSky(s, { target: V(0, 6, 0) }); const F = flyer(s, 'grin', 'sit aim');
    const parts = []; for (let i = 0; i < 40; i++) { const p = L.mesh(L.box(0.08, 0.08, 0.01), L.mat([0xff4d6d, 0xffd23f, 0x4d96ff][i % 3], { ds: true }), 0, 0, 0, s); p.userData.v = V(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).multiplyScalar(6); parts.push(p); }
    const tg = [0, 5, 12, 20];
    return (u, t) => { F.b.update(t); const pk = Math.floor(u * 4); tg.forEach((i, k) => F.b.balls[i].visible = k >= pk + (u * 4 % 1 > 0.25 ? 1 : 0));
      const b = F.b.balls[tg[Math.min(3, pk)]]; const lt = (u * 4 % 1); parts.forEach((p, i) => { p.visible = lt > 0.25 && lt < 0.9; p.position.copy(b.userData.base).addScaledVector(p.userData.v, (lt - 0.25) * 0.6); p.rotation.set(t * 9 + i, t * 7, 0); });
      if (lt > 0.25 && lt < 0.4) { ctx.shake = 0.7; ctx.flash = 0.25; } ctx.alt = 4900 - Math.round(u * 60);
      cam(ctx, V(3.0, 4.2, 5.2), V(2.0, 5.0, 3.6), V(0, 6.2, 0), V(0, 6.4, 0), u, 55); };
  },
  sink(ctx) {
    const s = ctx.scene; highSky(s, { target: V(0, 2, 0), alt: -500 }); const F = flyer(s, 'grin', 'sit cheer', 34);
    return (u, t) => { F.b.update(t); F.g.position.y = -u * 3; F.lr.arms[1].sh.rotation.z = 2.6 + Math.sin(t * 6) * 0.2; ctx.alt = Math.round(4800 - u * 3000);
      cam(ctx, V(6, 1, 8), V(4, -2.5, 6), V(0, 2, 0), V(0, -0.5, 0), u, 58); };
  },
  gun_fall(ctx) {
    const s = ctx.scene; highSky(s, { target: V(0, 0, 0), alt: -600 }); const F = flyer(s, 'shock', 'sit clutch', 34); const gn = L.makeGun(); s.add(gn);
    return (u, t) => { F.b.update(t); gn.position.set(0.3, 0.6 - u * u * 6, 0.4); gn.rotation.set(t * 5, t * 3, t * 4); ctx.alt = Math.round(1500 - u * 300);
      cam(ctx, V(2.2, 0.8, 2.6), V(2.0, -3.2, 2.2), V(0.3, 0.6, 0.4), V(0.3, -4.8, 0.4), u, 55); };
  },
  nooo(ctx) {
    const s = ctx.scene; highSky(s, { target: V(0, 0, 0), alt: -600 }); const F = flyer(s, 'shock', 'sit', 34);
    return (u, t) => { F.b.update(t); F.lr.expr('shock', 1); F.lr.head.rotation.x = 0.45; F.lr.look(0, -1); F.lr.arms[1].sh.rotation.set(-1.4 + Math.sin(t * 8) * 0.2, 0, 0.5); F.lr.arms[1].el.rotation.x = -0.3; F.lr.arms[0].sh.rotation.set(-0.3, 0, -2.3); F.lr.arms[0].el.rotation.z = -1.5;
      ctx.shake = 0.5; ctx.alt = 1200;
      cam(ctx, V(0.2, 0.1, 1.5), V(0.08, 0.45, 0.9), V(0, 1.45, 0), V(0, 1.45, 0), u, 55, true); };
  },
  // ---------------- POWER LINE ----------------
  powerline(ctx) {
    const s = ctx.scene; garden(s, { target: V(0, 6, 0), sr: 12 });
    const p1 = L.makePole(); p1.position.set(-7, 0, 0); s.add(p1); const p2 = L.makePole(); p2.position.set(7, 0, 0); s.add(p2);
    for (const x of [-1.3, 0, 1.3]) s.add(L.wire(V(-7, 9.45, 0), V(7, 9.45, 0), 0.6)).position.z = x * 0.5;
    const F = flyer(s, 'shock', 'sit armsUp', 30); F.g.position.set(0.5, 5.2, 0.5);
    const sp = []; for (let i = 0; i < 40; i++) { const m = L.mesh(L.sph(0.04, 6), L.mat(0xfff3a0, { e: 0xffe066, ei: 4 }), 0, 0, 0, s); m.castShadow = false; m.userData.v = V(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5).multiplyScalar(5); sp.push(m); }
    const fl = new THREE.PointLight(0xaee2ff, 0, 20); fl.position.set(0, 9, 1); s.add(fl);
    return (u, t) => { F.b.update(t); const z = u > 0.3; F.g.rotation.z = Math.sin(t * 25) * 0.05 * z; if (z) flail(F.lr, t, 1.5);
      sp.forEach((m, i) => { const lt = ((t * 2 + i / 40) % 1); m.visible = z; m.position.set(0.2, 9, 0).addScaledVector(m.userData.v, lt); m.position.y -= lt * lt * 4; });
      fl.intensity = z ? (Math.random() * 60) : 0; F.lr.expr(z ? 'crazy' : 'shock'); if (z) { ctx.shake = 0.7; ctx.flash = Math.random() < 0.3 ? 0.35 : 0; } ctx.alt = 10;
      cam(ctx, V(4.5, 3.8, 11), V(2.4, 5.8, 7.0), V(0, 7.5, 0), V(0, 8, 0), u, 58); };
  },
  zap_face(ctx) {
    const s = ctx.scene; garden(s, { target: V(0, 6, 0), sr: 10 }); const F = flyer(s, 'crazy', 'sit armsUp', 30); F.g.position.set(0, 5.2, 0);
    const fl = new THREE.PointLight(0xaee2ff, 0, 10); fl.position.set(0, 7.5, 1.5); s.add(fl);
    for (let i = 0; i < 12; i++) { const h = L.mesh(L.cap(0.025, 0.25), 0x5b3a1f, Math.cos(i / 12 * 6.28) * 0.2, 0.35, Math.sin(i / 12 * 6.28) * 0.2, F.lr.head); h.rotation.set(Math.sin(i / 12 * 6.28) * 0.7, 0, -Math.cos(i / 12 * 6.28) * 0.7); }
    const sky = L.skyTex('#3f8fe0', '#8cc4f2', '#d9ecfa'), dark = new THREE.Color(0x1a2a44);
    return (u, t) => { F.b.update(t); const fr = Math.floor(t * 20) % 2; fl.intensity = fr ? 40 : 0; F.g.position.x = (fr - 0.5) * 0.03; flail(F.lr, t, 1.5);
      s.background = fr ? dark : sky; ctx.shake = 0.8; ctx.flash = fr ? 0.15 : 0;
      cam(ctx, V(0.3, 6.75, 1.5), V(0.15, 6.75, 1.0), V(0, 6.65, 0), V(0, 6.67, 0), u, 50); };
  },
  blackout_tv(ctx) {
    const s = ctx.scene; s.background = new THREE.Color(0x101418); if (ENV) s.environment = ENV;
    const amb = new THREE.HemisphereLight(0xffe2b8, 0x332a22, 0.9); s.add(amb);
    const lamp = new THREE.PointLight(0xffc27a, 12, 9); lamp.position.set(-1.6, 2.2, 0.5); lamp.castShadow = true; s.add(lamp);
    const room = L.mesh(L.box(10, 5, 10), L.mat(0xd9c7a8, { r: 0.9, ds: true, fab: true }), 0, 2.5, 0, s); room.material.side = THREE.BackSide; room.castShadow = false;
    const sofa = new THREE.Group(); s.add(sofa); L.mesh(L.box(2.4, 0.5, 0.9), L.mat(0x7a3b5c, { fab: true, r: 0.9 }), 0, 0.35, 0, sofa); L.mesh(L.box(2.4, 0.7, 0.25), L.mat(0x7a3b5c, { fab: true, r: 0.9 }), 0, 0.85, -0.35, sofa);
    sofa.position.set(0, 0, 1.2);
    const a = guy(s, { skin: 0xf0c4a0, shirt: 0x6a4c9c, pants: 0x333344, hair: 0xd8b04a, mustache: false }, -0.5, 0.1, 1.3, Math.PI); a.pose('sit'); 
    const b = guy(s, { skin: 0x9a6a4a, shirt: 0xff8a3d, pants: 0x2a3a5a, hair: 0x111111 }, 0.55, 0.1, 1.3, Math.PI); b.pose('sit holdR');
    const tv = new THREE.Group(); s.add(tv); L.mesh(L.box(1.6, 1.0, 0.15), 0x111111, 0, 1.3, -2.6, tv); const scr = L.mesh(new THREE.PlaneGeometry(1.45, 0.85), new THREE.MeshBasicMaterial({ map: L.canvasTex(256, 160, (g, w, h) => { ['#fff', '#ff0', '#0ff', '#0f0', '#f0f', '#f00', '#00f'].forEach((c, i) => { g.fillStyle = c; g.fillRect(i * w / 7, 0, w / 7, h); }); }) }), 0, 1.3, -2.52, tv);
    const tvl = new THREE.PointLight(0x9ad0ff, 8, 7); tvl.position.set(0, 1.3, -2); s.add(tvl);
    L.mesh(L.cyl(0.05, 0.05, 1.5), 0x333333, -1.6, 0.75, 0.5, s); const shade = L.mesh(L.cyl(0.2, 0.3, 0.35), L.mat(0xfff0d0, { e: 0xffd090, ei: 1 }), -1.6, 1.6, 0.5, s);
    return (u, t) => { const off = u > 0.4; lamp.intensity = off ? 0 : 12; tvl.intensity = off ? 0 : 8 + Math.sin(t * 20) * 2; scr.visible = !off; amb.intensity = off ? 0.12 : 0.9; amb.color.set(off ? 0x4a6aa0 : 0xffe2b8); shade.material.emissiveIntensity = off ? 0 : 1;
      [a, b].forEach((c, i) => { c.expr(off ? 'shock' : 'smile', 1); if (off) c.look(i ? -0.6 : 0.6, 0.2); }); if (off && u < 0.5) ctx.shake = 0.4;
      cam(ctx, V(0.3, 1.5, -1.6), V(0.0, 1.45, -0.7), V(0, 1.3, 1.3), V(0, 1.35, 1.3), u, 55); };
  },
  blackout(ctx) {
    const s = ctx.scene; s.background = L.skyTex('#1a2550', '#5a4a7a', '#e08a5a'); s.fog = new THREE.Fog(0x5a4a6a, 30, 120); if (ENV) s.environment = ENV;
    s.add(new THREE.HemisphereLight(0x8090c0, 0x302830, 0.45)); const d = new THREE.DirectionalLight(0xffa070, 0.8); d.position.set(-10, 5, 5); s.add(d);
    const gr = L.mesh(new THREE.PlaneGeometry(400, 400), 0x34502e, 0, 0, 0, s); gr.rotation.x = -Math.PI / 2;
    const road = L.mesh(new THREE.PlaneGeometry(400, 6), 0x333338, 0, 0.01, 6, s); road.rotation.x = -Math.PI / 2;
    const hs = []; for (let i = 0; i < 6; i++) { const h = L.makeHouse([0xd8e3ee, 0xf1e1c6, 0xe6d0d0][i % 3], 0x4a4f5a, true); h.position.set(-25 + i * 10, 0, -2); h.userData.wins.forEach(w => w.material = w.material.clone()); s.add(h); hs.push(h); }
    const lamps = []; for (let i = 0; i < 5; i++) { L.mesh(L.cyl(0.08, 0.1, 5), 0x333333, -20 + i * 10, 2.5, 3, s); const b = L.mesh(L.sph(0.3), L.mat(0xffe9a0, { e: 0xffd060, ei: 3 }).clone(), -20 + i * 10, 5.1, 3, s); const pl = new THREE.PointLight(0xffc060, 15, 12); pl.position.set(-20 + i * 10, 4.8, 3); s.add(pl); lamps.push([b, pl]); }
    return (u, t) => { hs.forEach((h, i) => { const off = u > 0.15 + i * 0.07; h.userData.wins.forEach(w => { w.material.emissiveIntensity = off ? 0 : 1.2; w.material.color.set(off ? 0x1c2230 : 0xffd77a); }); });
      lamps.forEach(([b, pl], i) => { const off = u > 0.15 + i * 0.08; b.material.emissiveIntensity = off ? 0 : 3; pl.intensity = off ? 0 : 15; });
      ctx.grade = 'night'; cam(ctx, V(-12, 2.5, 24), V(4, 4.5, 17), V(-4, 3, 0), V(3, 3, 0), u, 55); };
  },
  // ---------------- ARREST ----------------
  police_car(ctx) {
    const s = ctx.scene; garden(s, { target: V(0, 1, 0), hx: 6, jeep: false }); const car = L.makePoliceCar(); car.position.set(0, 0, 0); car.rotation.y = 0.5; s.add(car);
    const c1 = guy(s, COP, 2.2, 0, 1.6, -0.3); c1.expr('angry'); CAPHAT(c1);
    const F = flyer(s, 'scared', 'sit clutch', 26); F.g.position.set(-1.5, 0, 2.6); F.g.rotation.y = 0.6;
    return (u, t) => { car.userData.flash(t); F.b.update(t); c1.pose('stand point'); c1.arms[1].sh.rotation.x = -1.5 + Math.sin(t * 10) * 0.12; talk(c1, t, 'angry'); c1.expr('angry'); car.position.x = 4 * (1 - easeOut(clamp(u * 2.5)));
      cam(ctx, V(6.5, 0.6, 9.5), V(3.6, 1.6, 6.8), V(0.5, 1.2, 1.2), V(0.0, 1.4, 1.6), u, 55); };
  },
  arrest(ctx) {
    const s = ctx.scene; garden(s, { target: V(0, 1, 0) }); const car = L.makePoliceCar(); car.position.set(-2.5, 0, -2.5); s.add(car);
    const lr = guy(s, LARRY, 0, 0, 0, 0.2); lr.pose('stand cuffed'); lr.expr('sad');
    const c1 = guy(s, COP, 0.75, 0, -0.35, -0.4); c1.expr('angry'); c1.pose('stand holdL'); CAPHAT(c1);
    L.mesh(new THREE.TorusGeometry(0.06, 0.015, 8, 16), L.mat(0xcccccc, { m: 0.9, r: 0.2 }), 0, 0.82, -0.32, lr.g);
    return (u, t) => { car.userData.flash(t); lr.look(-0.3, -0.5); lr.head.rotation.x = 0.25 * u; lr.g.position.x = -u * 0.3;
      orbit(ctx, V(0.2, 1.5, 0), 2.9, 2.2, 0.5, -0.1, 1.5, 1.65, u, 52); };
  },
  cuffs_close(ctx) {
    const s = ctx.scene; garden(s, { target: V(0, 1, 0) }); const car = L.makePoliceCar(); car.position.set(-1.5, 0, -3); s.add(car);
    const lr = guy(s, LARRY, 0, 0, 0, Math.PI); lr.pose('stand cuffed'); lr.expr('sad');
    const cm = L.mat(0xd5d8dc, { m: 1, r: 0.15, env: 1.2 }); const cf = new THREE.Group(); lr.g.add(cf); cf.position.set(0, 0.8, -0.32);
    for (const x of [-0.07, 0.07]) L.mesh(new THREE.TorusGeometry(0.06, 0.015, 10, 24), cm, x, 0, 0, cf); L.mesh(L.box(0.06, 0.012, 0.012), cm, 0, 0, 0, cf);
    return (u, t) => { car.userData.flash(t); const k = clamp(u * 3); cf.scale.setScalar(0.6 + 0.4 * easeOut(k)); if (u > 0.3 && u < 0.38) ctx.shake = 0.5;
      cam(ctx, V(0.6, 1.0, 1.5), V(0.2, 0.88, 0.95), V(0, 0.8, 0.3), V(0, 0.8, 0.3), u, 50); };
  },
  // ---------------- INTERVIEW ----------------
  reporter(ctx) {
    const s = ctx.scene; garden(s, { target: V(0, 1, 0) });
    const lr = guy(s, LARRY, 0, 0, 0, 0.6); lr.expr('smile'); lr.pose('stand');
    const rp = guy(s, REPORTER, 1.1, 0, 0.5, -1.2); rp.pose('stand holdR'); rp.expr('smile');
    const m = mic(); rp.arms[1].el.add(m); m.position.set(0, -0.36, 0.1); m.rotation.x = -1.4;
    const cm = guy(s, FRIEND1, 2.2, 0, 2.3, -2.2); cm.pose('stand holdL holdR'); L.mesh(L.box(0.25, 0.3, 0.6), 0x222222, 0.15, 1.75, 0.15, cm.g);
    const ph = guy(s, { ...FRIEND2, shirt: 0x8a8f99 }, -1.6, 0, 2.0, 2.4); ph.pose('stand holdL holdR'); L.mesh(L.box(0.2, 0.15, 0.12), 0x111111, 0, 1.62, 0.32, ph.g);
    const flashL = new THREE.PointLight(0xffffff, 0, 8); flashL.position.set(-1.5, 1.7, 1.6); s.add(flashL);
    return (u, t) => { talk(rp, t, 'grin'); lr.look(0.7, 0); const f = (t % 0.7) < 0.05; flashL.intensity = f ? 30 : 0; ctx.flash = f ? 0.25 : 0;
      cam(ctx, V(-1.8, 1.5, 4.4), V(-0.8, 1.62, 2.8), V(0.5, 1.55, 0.2), V(0.5, 1.6, 0.2), u, 52); };
  },
  reporter_close(ctx) {
    const s = ctx.scene; garden(s, { target: V(0, 1, 0) });
    const rp = guy(s, REPORTER, 0, 0, 0, 0); rp.pose('stand holdR');
    const m = mic(); rp.arms[1].el.add(m); m.position.set(0, -0.36, 0.1); m.rotation.x = -1.4;
    return (u, t) => { talk(rp, t, 'grin'); rp.look(-0.4, 0); rp.head.rotation.z = Math.sin(t * 3) * 0.06; rp.arms[1].sh.rotation.x = -1.2 + Math.sin(t * 2) * 0.08;
      cam(ctx, V(-0.5, 1.6, 1.8), V(-0.15, 1.66, 1.1), V(0, 1.58, 0), V(0, 1.6, 0), u, 50); };
  },
  quote_face(ctx) {
    const s = ctx.scene; garden(s, { target: V(0, 1, 0) }); const lr = guy(s, LARRY, 0, 0, 0, 0); lr.pose('stand point');
    return (u, t) => { lr.expr(u < 0.8 ? (Math.sin(t * 14) > 0 ? 'grin' : 'smug') : 'smug'); lr.look(0, 0); lr.head.rotation.z = Math.sin(t * 2) * 0.06;
      lr.arms[1].sh.rotation.set(-1.5, Math.sin(t * 10) * 0.25, 0.3);
      if (u > 0.82) { lr.lids[1].visible = true; lr.lids[1].rotation.x = -0.05; }
      ctx.hand = 0.4; cam(ctx, V(0.2, 1.62, 2.4), V(0.03, 1.63, 0.95), V(0, 1.58, 0), V(0, 1.61, 0), u, 50); };
  },
  // ---------------- FINALE ----------------
  finale(ctx) {
    const s = ctx.scene; highSky(s, { top: '#2b2a6b', mid: '#e3735a', bot: '#ffc27a', fog: 0xf2a070, sun: 0xffb070, dir: [-8, 3, 6], target: V(0, 2, 0), sunCol: '#ffcf8a' }); const F = flyer(s, 'grin', 'sit cheer');
    L.reseed(8); s.add(L.makeBirds(6, V(-6, 6, -6)));
    return (u, t) => { F.b.update(t); F.g.position.y = u; F.lr.arms[1].sh.rotation.z = 2.6 + Math.sin(t * 5) * 0.2; ctx.grade = 'warm';
      cam(ctx, V(-2.4, 1.3, 5.5), V(-4.5, 2.5, 10), V(0, 2.4, 0), V(0, 3.5, 0), u, 55); };
  },
  finale_title(ctx) {
    const s = ctx.scene; highSky(s, { top: '#2b2a6b', mid: '#e3735a', bot: '#ffc27a', fog: 0xf2a070, sun: 0xffb070, dir: [-8, 3, 6], target: V(0, 2, 0), sunCol: '#ffcf8a' }); const F = flyer(s, 'smug', 'sit cheer');
    L.reseed(9); s.add(L.makeBirds(6, V(-8, 8, -8)));
    const r = (u, t) => { F.b.update(t); F.g.position.y = 1 + u * 2; F.g.position.x = u * 2; ctx.grade = 'warm'; ctx.flash = clamp(1 - t * 4) * 0.7;
      cam(ctx, V(-4.5, 2.5, 10), V(-7, 3.0, 17), V(0, 3.5, 0), V(1, 4.5, 0), u, 55); };
    r.overlay = (g, W, H, u, T, t) => { bigText(g, '1982', W / 2, H * 0.17, W * 0.2, t / 1.2); bigText(g, 'LAWNCHAIR LARRY', W / 2, H * 0.265, W * 0.085, t / 1.2 - 0.15);
      if (t > 0.9) { g.save(); g.globalAlpha = clamp((t - 0.9) * 3); g.font = `800 ${W * 0.042}px "Inter Display"`; g.textAlign = 'center'; g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 12; g.fillText('EINE WAHRE GESCHICHTE', W / 2, H * 0.315); g.restore(); } };
    return r;
  },
};

function hookAlt(ctx) { return Math.round(4900 * easeOut(clamp(ctx.T / 4.6))); }
function doctorRoom(s) {
  s.background = new THREE.Color(0xdfe6ea); lights(s, { sky: 0xffffff, ground: 0xb0b0b0, hi: 1.4, si: 1.6, dir: [3, 8, 6], sunSprite: false });
  L.mesh(new THREE.PlaneGeometry(30, 20), L.mat(0xc9dbe3, { fab: true, r: 0.9 }), 0, 5, -3, s);
  const tiles = L.canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#e9ecef'; g.fillRect(0, 0, w, h); g.fillStyle = '#9aa3ab'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) g.fillRect(i * 64, j * 64, 64, 64); }, 8);
  const flo = L.mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ map: tiles, roughness: 0.4, envMapIntensity: 0.6 }), 0, 0, 0, s); flo.rotation.x = -Math.PI / 2;
  const cab = L.mesh(L.box(1.2, 1.8, 0.5), 0xf2f2f2, -2.6, 0.9, -2.7, s); L.mesh(L.box(0.6, 0.8, 0.05), L.mat(0x3a7bd5), -2.6, 2.6, -2.95, s);
  const plant = L.mesh(L.cyl(0.25, 0.2, 0.5), 0xb5651d, 2.8, 0.25, -2.2, s); for (let i = 0; i < 5; i++) L.mesh(L.sph(0.3, 12), L.mat(0x3d8b3a, { fab: true }), 2.8 + (i - 2) * 0.12, 0.8 + (i % 2) * 0.2, -2.2, s);
}
function chartTex(blur) {
  return L.canvasTex(512, 768, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); if (blur) g.filter = `blur(${blur}px)`; g.fillStyle = '#111'; g.textAlign = 'center'; const rows = ['E', 'F P', 'T O Z', 'L P E D', 'P E C F D', 'E D F C Z P', 'F E L O P Z D']; rows.forEach((r, i) => { g.font = `bold ${150 - i * 20}px Inter Display, sans-serif`; g.fillText(r, w / 2, 150 + i * 92); }); g.filter = 'none'; g.strokeStyle = '#c33'; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16); });
}

function propShot(ctx, obj, k) {
  const s = ctx.scene; garden(s, { target: V(0, 1, 0) }); const ch = L.makeChair(); s.add(ch); obj.position.set(0, 0.46, 0.05); s.add(obj);
  return (u, t) => { popIn(obj, u, 0.05); obj.rotation.y = 0.5 + t * 1.2; obj.position.y = 0.46 + Math.max(0, Math.sin(clamp(u * 6) * Math.PI)) * 0.15;
    orbit(ctx, V(0, 0.55, 0.05), 1.3, 0.8, k ? 0.9 : -0.9, k ? 0.2 : -0.2, 1.15, 0.85, u, 50); };
}

export function bigText(g, txt, x, y, size, u) {
  const k = clamp(u * 5); if (k <= 0) return; const sc = 1.6 - 0.6 * (1 - Math.pow(1 - k, 3));
  g.save(); g.translate(x, y); g.scale(sc, sc); g.font = `900 ${size}px "Inter Display"`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const w = g.measureText(txt).width; if (w > 0.9 * g.canvas.width / sc) { const f = 0.9 * g.canvas.width / sc / w; g.scale(f, f); }
  for (let i = 12; i > 0; i--) { g.fillStyle = `rgb(${90 - i * 4},${90 - i * 4},${100 - i * 4})`; g.fillText(txt, i * 0.6, i * 0.9); }
  const gr = g.createLinearGradient(0, -size / 2, 0, size / 2); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#c9d3dd'); g.fillStyle = gr; g.fillText(txt, 0, 0);
  g.lineWidth = size * 0.03; g.strokeStyle = '#3a3f48'; g.strokeText(txt, 0, 0); g.restore();
}
