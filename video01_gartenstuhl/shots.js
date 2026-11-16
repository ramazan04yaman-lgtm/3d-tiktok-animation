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

function cam(ctx, p0, p1, t0, t1, u, fov = 50) {
  const e = ease(u); ctx.camera.fov = fov; ctx.camera.updateProjectionMatrix();
  ctx.camera.position.copy(p0).lerp(p1, e);
  const sh = ctx.T; ctx.camera.position.x += Math.sin(sh * 2.1) * 0.015; ctx.camera.position.y += Math.sin(sh * 1.7 + 1) * 0.015;
  ctx.camera.lookAt(t0.clone().lerp(t1, e));
}
function lights(scene, o = {}) {
  scene.add(new THREE.HemisphereLight(o.sky ?? 0xcfe6ff, o.ground ?? 0x5a7a3a, o.hi ?? 1.1));
  const s = new THREE.DirectionalLight(o.sun ?? 0xfff1d6, o.si ?? 2.6); s.position.set(...(o.dir ?? [6, 10, 7])); s.castShadow = true;
  s.shadow.mapSize.set(2048, 2048); const c = s.shadow.camera; const r = o.sr ?? 8; c.left = c.bottom = -r; c.right = c.top = r; c.near = 0.5; c.far = 60; s.shadow.bias = -0.0005; s.shadow.normalBias = 0.02;
  if (o.target) { s.target.position.copy(o.target); scene.add(s.target); s.position.add(o.target); }
  scene.add(s); return s;
}
function garden(scene, o = {}) {
  scene.background = L.skyTex('#3f8fe0', '#8cc4f2', '#d9ecfa');
  scene.fog = new THREE.Fog(0xcfe5f7, 40, 160);
  const gr = L.mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ map: L.grassTex(), roughness: 1 }), 0, 0, 0, scene); gr.rotation.x = -Math.PI / 2; gr.castShadow = false;
  const h = L.makeHouse(); h.position.set(o.hx ?? -3, 0, o.hz ?? -9); scene.add(h);
  const f = L.makeFence(40); f.position.set(0, 0, -14); scene.add(f);
  for (let i = 0; i < 4; i++) { const n = L.makeHouse([0xd8e3ee, 0xf1e1c6, 0xe6d0d0][i % 3], [0x4a4f5a, 0x7a3a2a][i % 2]); n.position.set(-30 + i * 18, 0, -26); scene.add(n); }
  for (const [x, z, s] of [[6, -7, 1.2], [-11, -5, 1], [13, -16, 1.4], [-18, -17, 1.3], [9, 4, 1]]) { const t = L.makeTree(s); t.position.set(x, 0, z); scene.add(t); }
  return lights(scene, o);
}
function highSky(scene, o = {}) {
  scene.background = L.skyTex(o.top ?? '#1f6fd1', o.mid ?? '#7fb6ec', o.bot ?? '#cfe3f5');
  scene.fog = new THREE.Fog(new THREE.Color(o.fog ?? 0xbcd6ef), 300, 3500);
  const gr = L.mesh(new THREE.PlaneGeometry(20000, 20000), new THREE.MeshStandardMaterial({ map: L.cityTex(), roughness: 1 }), 0, o.alt ?? -1200, 0, scene); gr.rotation.x = -Math.PI / 2;
  gr.material.map.repeat.set(40, 40);
  L.reseed(o.seed ?? 3);
  for (let i = 0; i < 14; i++) { const c = L.makeCloud(1.5 + L.RNG() * 3); const a = L.RNG() * 6.28, d = 25 + L.RNG() * 80; c.position.set(Math.cos(a) * d, -25 + L.RNG() * 30, Math.sin(a) * d); scene.add(c); }
  const s = lights(scene, { sky: 0xdcecff, ground: 0x9fb0c0, hi: 1.3, si: 2.8, ...o }); return s;
}
function flyer(scene, expr = 'grin', pose = 'sit', n = 45) {
  const g = new THREE.Group(); scene.add(g);
  const ch = L.makeChair(); g.add(ch);
  const lr = L.makeGuy(LARRY); lr.pose(pose); lr.expr(expr); lr.g.position.set(0, -0.16, -0.08); g.add(lr.g);
  L.reseed(11); const b = L.makeBalloons(n); g.add(b.g);
  return { g, lr, b, ch };
}
function guy(scene, P, x, y, z, ry = 0) { const c = L.makeGuy(P); c.g.position.set(x, y, z); c.g.rotation.y = ry; scene.add(c.g); return c; }
function popIn(obj, u, at = 0) { const k = clamp((u - at) * 6); const s = k < 1 ? Math.sin(k * Math.PI * 0.75) / Math.sin(Math.PI * 0.75) * k : 1; obj.scale.setScalar(Math.max(0.001, s)); }
function talk(c, t, e = 'shock') { c.expr(e, 0.5 + 0.5 * Math.abs(Math.sin(t * 14))); }

export const SHOTS = {
  // ---------------- HOOK ----------------
  hook_sky(ctx) {
    const s = ctx.scene; highSky(s, { target: V(0, 3, 0) }); const F = flyer(s, 'crazy', 'sit armsUp');
    return (u, t) => { F.b.update(t); F.g.position.y = u * 0.6; F.g.rotation.z = Math.sin(t * 2) * 0.05; F.lr.head.rotation.z = Math.sin(t * 5) * 0.08;
      cam(ctx, V(1.8, 0.9, 3.2), V(1.2, 1.3, 2.4), V(0, 1.6, 0), V(0, 1.9, 0), u, 55); };
  },
  hook_face(ctx) {
    const s = ctx.scene; highSky(s, { target: V(0, 2, 0) }); const F = flyer(s, 'shock', 'sit clutch');
    return (u, t) => { F.b.update(t); F.lr.expr('shock', 0.6 + 0.4 * Math.sin(t * 9)); F.lr.look(Math.sin(t * 3) * 0.6, -0.6); F.g.position.y = u * 0.3;
      cam(ctx, V(0.15, 1.6, 1.25), V(0.05, 1.55, 0.95), V(0, 1.45, 0), V(0, 1.47, 0), u, 50); };
  },
  rise_wide(ctx) {
    const s = ctx.scene; highSky(s, { target: V(0, 2, 0), alt: -900 }); const F = flyer(s, 'scared', 'sit clutch');
    return (u, t) => { F.b.update(t); F.g.position.y = u * 1.5;
      cam(ctx, V(0.6, 11, 4.5), V(0.4, 13, 3.2), V(0, 0, 0), V(0, -8, 0), u, 60); };
  },
  // ---------------- BACKSTORY ----------------
  kid_dream(ctx) {
    const s = ctx.scene; garden(s, { target: V(0, 1, 0) });
    const k = guy(s, { ...LARRY, s: 0.72, kid: true, shirt: 0x3a7bd5, sleeve: 0x3a7bd5 }, 0, 0, 0, 0.3); k.expr('dream'); k.pose('stand point'); k.arms[1].sh.rotation.set(-2.6, 0, 0.2); k.head.rotation.x = -0.45; k.look(0, 1);
    const j = L.makeJet(); j.scale.setScalar(0.6); s.add(j);
    return (u, t) => { j.position.set(-30 + u * 40, 32, -40); k.g.rotation.y = 0.3 + Math.sin(t) * 0.05;
      cam(ctx, V(1.6, 0.35, 2.3), V(1.1, 0.4, 1.7), V(0, 1.4, 0), V(-0.2, 1.6, 0), u, 60); };
  },
  eye_chart(ctx) {
    const s = ctx.scene; s.background = new THREE.Color(0xdfe6ea); lights(s, { sky: 0xffffff, ground: 0xb0b0b0, hi: 1.4, si: 1.6, dir: [3, 8, 6] });
    const wall = L.mesh(new THREE.PlaneGeometry(30, 20), 0xc9dbe3, 0, 5, -3, s);
    const flo = L.mesh(new THREE.PlaneGeometry(30, 30), 0x8b8f94, 0, 0, 0, s); flo.rotation.x = -Math.PI / 2;
    const tex = L.canvasTex(512, 768, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#111'; g.textAlign = 'center'; const rows = ['E', 'F P', 'T O Z', 'L P E D', 'P E C F D', 'E D F C Z P', 'F E L O P Z D']; rows.forEach((r, i) => { g.font = `bold ${150 - i * 20}px Inter Display, sans-serif`; g.fillText(r, w / 2, 150 + i * 92 - (i ? 0 : 0)); }); g.strokeStyle = '#c33'; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16); });
    L.mesh(new THREE.PlaneGeometry(1.4, 2.1), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }), 1.3, 2.1, -2.95, s);
    const lr = guy(s, { ...LARRY, glasses: true }, -0.5, 0, 0.5, 0.75); lr.expr('squint'); lr.pose('stand chin');
    return (u, t) => { lr.head.rotation.y = -0.15; lr.g.position.z = 0.5 - u * 0.4;
      cam(ctx, V(-2.2, 1.7, 3.6), V(-1.8, 1.7, 3.0), V(0.3, 1.6, -1), V(0.4, 1.7, -1.2), u, 50); };
  },
  eye_face(ctx) {
    const s = ctx.scene; s.background = new THREE.Color(0xc9dbe3); lights(s, { sky: 0xffffff, ground: 0xb0b0b0, hi: 1.4, si: 1.6, dir: [3, 8, 6] });
    const lr = guy(s, { ...LARRY, glasses: true }, 0, 0, 0, 0); lr.pose('stand');
    const stamp = L.canvasTex(512, 200, (g, w, h) => { g.strokeStyle = '#d11'; g.lineWidth = 16; g.strokeRect(10, 10, w - 20, h - 20); g.fillStyle = '#d11'; g.font = '900 110px Inter Display'; g.textAlign = 'center'; g.fillText('UNTAUGLICH', w / 2, 140); });
    const st = L.mesh(new THREE.PlaneGeometry(0.24, 0.094), new THREE.MeshBasicMaterial({ map: stamp, transparent: true }), 0, 1.5, 0.5, s); st.rotation.z = 0.2; st.castShadow = false;
    return (u, t) => { lr.expr(u < 0.45 ? 'squint' : 'sad'); lr.look(Math.sin(t * 4) * 0.3, 0); const k = clamp((u - 0.4) * 8); st.visible = u > 0.4; st.scale.setScalar(2.2 - 1.2 * k);
      cam(ctx, V(0, 1.68, 1.5), V(0, 1.66, 1.15), V(0, 1.62, 0), V(0, 1.64, 0), u, 50); };
  },
  // ---------------- PREP ----------------
  inflate(ctx) {
    const s = ctx.scene; garden(s, { target: V(0, 1, 0) });
    const lr = guy(s, LARRY, 0, 0, 0, 0.4); lr.pose('stand holdL holdR'); lr.expr('grin');
    for (let i = 0; i < 5; i++) { const tk = L.makeTank(); tk.position.set(-1.4 - i * 0.5, 0, -0.6 - (i % 2) * 0.4); s.add(tk); }
    L.reseed(5); const bs = L.makeBalloons(18, { cy: 4.5, rx: 1.6, ry: 1.0 }); bs.g.position.set(2.4, 0, -1.6); s.add(bs.g);
    const stake = L.mesh(L.cyl(0.05, 0.05, 0.4), 0x6b4a2b, 2.4, 0.2, -1.6, s);
    const big = L.mesh(L.sph(0.5, 32), L.mat(0xff4d6d, { r: 0.25 }), 0.45, 1.6, 0.6, s);
    return (u, t) => { bs.update(t); big.scale.set(0.3 + u * 1.1, (0.3 + u * 1.1) * 1.18, 0.3 + u * 1.1); big.position.y = 1.5 + u * 0.5;
      cam(ctx, V(3.2, 1.4, 4.8), V(2.4, 1.7, 3.8), V(0.4, 1.6, 0), V(0.6, 2.0, -0.4), u, 52); };
  },
  inflate_close(ctx) {
    const s = ctx.scene; garden(s, { target: V(0, 1, 0) });
    const lr = guy(s, LARRY, 0, 0, 0, 0); lr.pose('stand holdL holdR'); lr.expr('crazy');
    const big = L.mesh(L.sph(0.5, 32), L.mat(0xffd23f, { r: 0.25 }), 0.75, 1.95, 0.3, s);
    return (u, t) => { const k = 0.3 + u * 0.55; big.scale.set(k, k * 1.18, k); lr.look(0.8, 0.2);
      cam(ctx, V(-0.5, 1.7, 1.6), V(-0.3, 1.7, 1.3), V(0.1, 1.65, 0), V(0.2, 1.7, 0), u, 55); };
  },
  tie_chair(ctx) {
    const s = ctx.scene; garden(s, { target: V(0, 1, 0) }); const F = flyer(s, 'grin', 'stand holdR'); F.lr.g.position.set(0.9, 0, 0.6); F.lr.g.rotation.y = -0.9;
    return (u, t) => { F.b.update(t);
      cam(ctx, V(2.5, 1.2, 6.5), V(2.0, 2.4, 6.0), V(0, 2.0, 0), V(0, 4.5, 0), u, 58); };
  },
  props_sandwich(ctx) { return propShot(ctx, L.makeSandwich(), 'SANDWICHES'); },
  props_beer(ctx) { return propShot(ctx, L.makeBeer(), 'BIER'); },
  props_gun(ctx) {
    const s = ctx.scene; garden(s, { target: V(0, 1, 0) });
    const ch = L.makeChair(); s.add(ch); const r = L.makeRadio(); r.position.set(-0.12, 0.45, 0.05); s.add(r); const gn = L.makeGun(); gn.rotation.set(0, 0.6, Math.PI / 2 * 0); gn.position.set(0.1, 0.52, 0.1); s.add(gn);
    const sw = L.makeSandwich(); sw.scale.setScalar(0.7); sw.position.set(0.18, 0.7, 0.05); s.add(sw); const be = L.makeBeer(); be.position.set(-0.3, 0.7, 0.15); s.add(be);
    return (u, t) => { popIn(r, u, 0.05); popIn(gn, u, 0.35); gn.rotation.y = 0.6 + Math.sin(t * 3) * 0.05;
      cam(ctx, V(0.6, 1.2, 1.3), V(0.3, 1.0, 1.0), V(0, 0.5, 0), V(0, 0.52, 0), u, 50); };
  },
  // ---------------- PLAN ----------------
  plan_smug(ctx) {
    const s = ctx.scene; garden(s, { target: V(0, 1, 0) }); const lr = guy(s, LARRY, 0, 0, 0, 0); lr.pose('stand chin'); lr.expr('smug');
    return (u, t) => { lr.look(0.6, 0.3); lr.head.rotation.z = Math.sin(t * 2) * 0.05;
      cam(ctx, V(0.6, 1.5, 1.8), V(0.3, 1.6, 1.3), V(0, 1.55, 0), V(0, 1.6, 0), u, 52); };
  },
  hover_low(ctx) {
    const s = ctx.scene; garden(s, { target: V(0, 1, 0) }); const F = flyer(s, 'grin', 'sit cheer');
    const f1 = guy(s, FRIEND1, 2.2, 0, 1.2, -0.9); f1.pose('stand holdL holdR'); f1.expr('grin');
    const rope = L.mesh(L.cyl(0.02, 0.02, 1), 0xd8c49a, 0, 0, 0, s);
    return (u, t) => { F.b.update(t); F.g.position.y = 2.2 + Math.sin(t * 2) * 0.12;
      const a = V(0, F.g.position.y + 0.45, 0), b = V(1.75, 1.0, 1.55); rope.position.copy(a).add(b).multiplyScalar(0.5); rope.scale.y = a.distanceTo(b); rope.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize());
      cam(ctx, V(4.5, 1.3, 7), V(3.8, 1.6, 6.2), V(0.6, 2.6, 0), V(0.6, 3.0, 0), u, 55); };
  },
  plan_shoot(ctx) {
    const s = ctx.scene; garden(s, { target: V(0, 3, 0) }); const F = flyer(s, 'grin', 'sit aim'); F.g.position.y = 2.3;
    const gn = L.makeGun(); F.lr.arms[0].el.add(gn); gn.position.set(0, -0.32, 0.1); gn.rotation.x = -Math.PI / 2 * 0;
    return (u, t) => { F.b.update(t); F.lr.head.rotation.x = -0.6; F.lr.look(0, 1); F.b.balls[3].visible = u < 0.6;
      cam(ctx, V(1.4, 2.6, 2.4), V(1.1, 2.9, 2.0), V(0, 4.5, 0), V(0, 5.5, 0), u, 60); };
  },
  // ---------------- LAUNCH ----------------
  cut_rope(ctx) {
    const s = ctx.scene; garden(s, { target: V(0, 1, 0) });
    const f2 = guy(s, FRIEND2, 0.45, 0, 0.4, -0.7); f2.pose('stand holdR'); f2.expr('grin');
    const knife = new THREE.Group(); L.mesh(L.box(0.04, 0.25, 0.015), L.mat(0xdadada, { m: 0.9, r: 0.2 }), 0, 0.15, 0, knife); L.mesh(L.box(0.05, 0.12, 0.04), 0x222222, 0, -0.03, 0, knife); f2.arms[1].el.add(knife); knife.position.set(0, -0.35, 0.05); knife.rotation.x = -1.2;
    const stake = L.mesh(L.cyl(0.06, 0.06, 0.5), 0x6b4a2b, 0, 0.25, 0, s);
    const ropeA = L.mesh(L.cyl(0.025, 0.025, 1), 0xd8c49a, 0, 0, 0, s), ropeB = L.mesh(L.cyl(0.025, 0.025, 1), 0xd8c49a, 0, 0, 0, s);
    const seg = (r, a, b) => { r.position.copy(a).add(b).multiplyScalar(0.5); r.scale.y = Math.max(0.01, a.distanceTo(b)); r.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()); };
    return (u, t) => { const cut = u > 0.55; const k = clamp((u - 0.55) * 4);
      f2.arms[1].sh.rotation.x = -1.2 + Math.sin(t * 20) * 0.25 * (cut ? 0 : 1);
      if (!cut) { seg(ropeA, V(0, 0.5, 0), V(0, 2.0, 0)); seg(ropeB, V(0, 2.0, 0), V(0, 6, 0)); } else { seg(ropeA, V(0, 0.5, 0), V(0.1, 1.1 - k * 0.5, 0.05)); seg(ropeB, V(0, 1.9 + k * 4, 0), V(0, 6 + k * 6, 0)); }
      f2.expr(cut ? 'shock' : 'grin');
      cam(ctx, V(-0.6, 1.4, 1.9), V(-0.4, 1.5, 1.6), V(0.2, 1.3, 0), V(0.2, 1.5, 0), u, 55); };
  },
  rocket_up(ctx) {
    const s = ctx.scene; garden(s, { target: V(0, 10, 0), sr: 12 }); const F = flyer(s, 'shock', 'sit armsUp');
    const lines = new THREE.Group(); s.add(lines); for (let i = 0; i < 30; i++) { const l = L.mesh(L.box(0.02, 3, 0.02), L.mat(0xffffff, { t: 0.6, e: 0xffffff }), (Math.random() - 0.5) * 6, 0, (Math.random() - 0.5) * 6, lines); l.castShadow = false; }
    return (u, t) => { F.b.update(t); const y = 1 + Math.pow(u, 1.6) * 30; F.g.position.y = y; F.lr.expr('shock', 1);
      lines.position.y = y - 2; lines.children.forEach((l, i) => l.position.y = ((i * 1.7 - t * 30) % 8 + 8) % 8 - 4);
      cam(ctx, V(2.5, 0.4, 5), V(2.8, y * 0.4, 6), V(0, 1.2, 0), V(0, y + 2, 0), Math.min(1, u * 1.4), 62); };
  },
  friends_shock(ctx) {
    const s = ctx.scene; garden(s, { target: V(0, 1, 0) });
    const f1 = guy(s, FRIEND1, -0.45, 0, 0, 0.15); const f2 = guy(s, FRIEND2, 0.45, 0, 0.1, -0.15);
    [f1, f2].forEach(f => { f.pose('stand headHands'); f.head.rotation.x = -0.35; });
    return (u, t) => { f1.expr('shock', 0.8 + 0.2 * Math.sin(t * 8)); f2.expr('scared', 1); f1.look(0, 1); f2.look(0, 1);
      cam(ctx, V(0, 0.9, 2.6), V(0, 0.95, 2.1), V(0, 1.75, 0), V(0, 1.75, 0), u, 55); };
  },
  // ---------------- FEAR ----------------
  scared_close(ctx) {
    const s = ctx.scene; highSky(s, { target: V(0, 2, 0) }); const F = flyer(s, 'scared', 'sit clutch');
    return (u, t) => { F.b.update(t); F.g.position.x = Math.sin(t * 30) * 0.008; F.lr.look(Math.sin(t * 2) * 0.8, -0.8);
      cam(ctx, V(-0.4, 1.55, 1.2), V(-0.2, 1.5, 0.95), V(0, 1.45, 0), V(0, 1.45, 0), u, 50); };
  },
  scared_gun(ctx) {
    const s = ctx.scene; highSky(s, { target: V(0, 2, 0) }); const F = flyer(s, 'scared', 'sit aim');
    const gn = L.makeGun(); F.lr.arms[0].el.add(gn); gn.position.set(0, -0.32, 0.1);
    return (u, t) => { F.b.update(t); F.lr.arms.forEach(a => a.sh.rotation.y += Math.sin(t * 40) * 0.01); F.lr.head.rotation.x = -0.5; F.lr.look(0, 1);
      cam(ctx, V(1.5, 0.6, 1.6), V(1.2, 0.5, 1.3), V(0, 2.2, 0), V(0, 2.6, 0), u, 62); };
  },
  // ---------------- AIRPORT ----------------
  jet_pass(ctx) {
    const s = ctx.scene; highSky(s, { target: V(0, 2, 0) }); const F = flyer(s, 'shock', 'sit clutch'); const j = L.makeJet(); s.add(j);
    return (u, t) => { F.b.update(t); j.position.set(40 - u * 80, 3, -18); F.lr.head.rotation.y = -0.5 + u * 1.0; F.lr.look(0.8 - u * 1.6, 0);
      cam(ctx, V(1.0, 1.4, 4.2), V(0.6, 1.5, 3.8), V(0, 1.6, -3), V(0, 1.7, -3), u, 60); };
  },
  jet_wide(ctx) {
    const s = ctx.scene; highSky(s, { target: V(0, 2, 0) }); const F = flyer(s, 'scared', 'sit clutch'); const j = L.makeJet(); j.rotation.y = Math.PI; s.add(j);
    const fr = new THREE.Group(); s.add(fr);
    return (u, t) => { F.b.update(t); j.position.set(-50 + u * 70, -6 + u * 6, -14);
      cam(ctx, V(-10, -2, 30), V(-6, 0, 26), V(-6, 0, 0), V(-2, 2, 0), u, 55); };
  },
  pilot_window(ctx) {
    const s = ctx.scene; highSky(s, { target: V(0, 0, 0) }); const j = L.makeJet(); j.position.set(-8, 0, 0); s.add(j);
    const p = guy(s, { skin: 0xe9b48c, shirt: 0xffffff, pants: 0x222222, hair: 0x888888, tie: 0x1d2a44 }, -0.4, -1.1, 0.4, Math.PI / 2); p.expr('shock');
    const hat = L.mesh(L.cyl(0.36, 0.33, 0.14), 0x1d2a44, 0, 0.3, 0, p.head); L.mesh(L.box(0.5, 0.04, 0.2), 0x111111, 0, 0.24, 0.3, p.head);
    j.children.forEach(c => { if (c.position.x > 7 && c.position.y > 0.3) c.visible = false; });
    return (u, t) => { talk(p, t); p.look(0.5, 0.2);
      cam(ctx, V(2.5, 0.8, 1.5), V(2.0, 0.7, 1.2), V(-0.4, 0.6, 0.3), V(-0.4, 0.62, 0.3), u, 50); };
  },
  pilot_face(ctx) {
    const s = ctx.scene; s.background = L.skyTex('#2d78d6', '#8cc0f0', '#d4e7f8'); lights(s, { sky: 0xdfefff, ground: 0x445566, hi: 1.3, dir: [-3, 6, 8] });
    const p = guy(s, { skin: 0xe9b48c, shirt: 0xffffff, pants: 0x222222, hair: 0x888888, tie: 0x1d2a44 }, 0, 0, 0, 0);
    L.mesh(L.cyl(0.36, 0.33, 0.14), 0x1d2a44, 0, 0.3, 0, p.head); L.mesh(L.box(0.5, 0.04, 0.2), 0x111111, 0, 0.24, 0.3, p.head);
    const hs = L.mesh(new THREE.TorusGeometry(0.36, 0.025, 8, 24, Math.PI), 0x222222, 0, 0.02, 0, p.head); L.mesh(L.sph(0.07), 0x222222, 0.35, 0, 0, p.head); const mic = L.mesh(L.cyl(0.012, 0.012, 0.3), 0x222222, 0.25, -0.15, 0.2, p.head); mic.rotation.set(0.9, 0, 0.9); L.mesh(L.sph(0.035), 0x111111, 0.12, -0.2, 0.33, p.head);
    p.arms[1].sh.rotation.set(-0.9, 0, 0.5); p.arms[1].el.rotation.x = -2.0;
    const panel = L.mesh(L.box(3, 0.8, 0.6), 0x2a2e33, 0, 0.9, 0.9, s); for (let i = 0; i < 6; i++) L.mesh(new THREE.CircleGeometry(0.09, 20), L.mat(0x111111, { e: 0x2a6, ei: 0.4 }), -1 + i * 0.4, 1.12, 1.21, s);
    return (u, t) => { talk(p, t, 'shock'); p.look(-0.6, 0.1); p.head.rotation.y = 0.2;
      cam(ctx, V(-0.35, 1.7, 1.45), V(-0.25, 1.68, 1.15), V(0, 1.6, 0), V(0, 1.62, 0), u, 50); };
  },
  jet_pass_close(ctx) {
    const s = ctx.scene; highSky(s, { target: V(0, 2, 0) }); const F = flyer(s, 'crazy', 'sit cheer'); const j = L.makeJet(); s.add(j);
    return (u, t) => { F.b.update(t); j.position.set(25 - u * 45, 2.5, -9); F.lr.head.rotation.y = -0.4; F.lr.look(-0.6, 0.1); F.lr.arms[1].sh.rotation.z = 2.5 + Math.sin(t * 12) * 0.35;
      cam(ctx, V(0.9, 1.5, 2.2), V(0.6, 1.55, 1.9), V(-0.6, 1.6, -3), V(-0.6, 1.7, -3), u, 55); };
  },
  wave_plane(ctx) {
    const s = ctx.scene; highSky(s, { target: V(0, 2, 0) }); const F = flyer(s, 'grin', 'sit cheer'); const j = L.makeJet(); j.rotation.y = Math.PI; s.add(j);
    return (u, t) => { F.b.update(t); F.lr.arms[1].sh.rotation.z = 2.5 + Math.sin(t * 12) * 0.35; j.position.set(-30 + u * 50, 0.5, -12); F.lr.head.rotation.y = -0.6; F.lr.look(-0.8, 0);
      cam(ctx, V(2.6, 1.8, 3.6), V(2.2, 1.9, 3.2), V(-1, 1.5, -2), V(-0.8, 1.6, -2), u, 60); };
  },
  // ---------------- DESCENT ----------------
  aim(ctx) {
    const s = ctx.scene; highSky(s, { target: V(0, 2, 0) }); const F = flyer(s, 'angry', 'sit aim'); const gn = L.makeGun(); F.lr.arms[0].el.add(gn); gn.position.set(0, -0.32, 0.1);
    return (u, t) => { F.b.update(t); F.lr.head.rotation.x = -0.55; F.lr.look(0, 1);
      cam(ctx, V(-1.8, 1.0, 2.4), V(-1.5, 1.1, 2.0), V(0, 1.8, 0), V(0, 2.2, 0), u, 55); };
  },
  pop(ctx) {
    const s = ctx.scene; highSky(s, { target: V(0, 6, 0) }); const F = flyer(s, 'grin', 'sit aim');
    const parts = []; for (let i = 0; i < 40; i++) { const p = L.mesh(L.box(0.08, 0.08, 0.01), L.mat([0xff4d6d, 0xffd23f, 0x4d96ff][i % 3], { ds: true }), 0, 0, 0, s); p.userData.v = V(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).multiplyScalar(6); parts.push(p); }
    const tg = [0, 5, 12, 20]; const C = V();
    return (u, t) => { F.b.update(t); const pk = Math.floor(u * 4); tg.forEach((i, k) => F.b.balls[i].visible = k >= pk + (u * 4 % 1 > 0.25 ? 1 : 0) ? true : false);
      const b = F.b.balls[tg[Math.min(3, pk)]]; const lt = (u * 4 % 1); parts.forEach((p, i) => { p.visible = lt > 0.25 && lt < 0.9; p.position.copy(b.userData.base).addScaledVector(p.userData.v, (lt - 0.25) * 0.6); p.rotation.set(t * 9 + i, t * 7, 0); });
      cam(ctx, V(2.6, 4.5, 4.5), V(2.2, 4.8, 4.0), V(0, 6.2, 0), V(0, 6.4, 0), u, 55); };
  },
  sink(ctx) {
    const s = ctx.scene; highSky(s, { target: V(0, 2, 0), alt: -500 }); const F = flyer(s, 'grin', 'sit cheer', 34);
    return (u, t) => { F.b.update(t); F.g.position.y = -u * 3;
      cam(ctx, V(5, 0, 7), V(5, -2, 7), V(0, 2, 0), V(0, 0, 0), u, 58); };
  },
  gun_fall(ctx) {
    const s = ctx.scene; highSky(s, { target: V(0, 0, 0), alt: -600 }); const F = flyer(s, 'shock', 'sit clutch', 34); const gn = L.makeGun(); s.add(gn);
    return (u, t) => { F.b.update(t); gn.position.set(0.3, 0.6 - u * u * 6, 0.4); gn.rotation.set(t * 5, t * 3, t * 4);
      cam(ctx, V(2.2, 0.8, 2.6), V(2.2, -2.8, 2.6), V(0.3, 0.6, 0.4), V(0.3, -4.5, 0.4), u, 55); };
  },
  nooo(ctx) {
    const s = ctx.scene; highSky(s, { target: V(0, 0, 0), alt: -600 }); const F = flyer(s, 'shock', 'sit', 34); F.lr.arms[1].sh.rotation.set(-1.4, 0, 0.5); F.lr.arms[1].el.rotation.x = -0.3;
    return (u, t) => { F.b.update(t); F.lr.expr('shock', 1); F.lr.head.rotation.x = 0.45; F.lr.look(0, -1);
      cam(ctx, V(0.2, 0.3, 1.2), V(0.1, 0.4, 0.95), V(0, 1.45, 0), V(0, 1.45, 0), u, 55); };
  },
  // ---------------- POWER LINE ----------------
  powerline(ctx) {
    const s = ctx.scene; garden(s, { target: V(0, 6, 0), sr: 12 });
    const p1 = L.makePole(); p1.position.set(-7, 0, 0); s.add(p1); const p2 = L.makePole(); p2.position.set(7, 0, 0); s.add(p2);
    for (const x of [-1.3, 0, 1.3]) s.add(L.wire(V(-7, 9.45, x * 0), V(7, 9.45, 0).setZ(0), 0.6)).position.z = x * 0.5;
    const F = flyer(s, 'shock', 'sit armsUp', 30); F.g.position.set(0.5, 5.2, 0.5);
    const sp = []; for (let i = 0; i < 40; i++) { const m = L.mesh(L.sph(0.04, 6), L.mat(0xfff3a0, { e: 0xffe066, ei: 4 }), 0, 0, 0, s); m.castShadow = false; m.userData.v = V(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5).multiplyScalar(5); sp.push(m); }
    const fl = new THREE.PointLight(0xaee2ff, 0, 20); fl.position.set(0, 9, 1); s.add(fl);
    return (u, t) => { F.b.update(t); F.g.rotation.z = Math.sin(t * 25) * 0.05 * (u > 0.3);
      const z = u > 0.3; sp.forEach((m, i) => { const lt = ((t * 2 + i / 40) % 1); m.visible = z; m.position.set(0.2, 9, 0).addScaledVector(m.userData.v, lt); m.position.y -= lt * lt * 4; });
      fl.intensity = z ? (Math.random() * 60) : 0; F.lr.expr(z ? 'crazy' : 'shock');
      cam(ctx, V(3.5, 4.5, 9), V(2.8, 5.5, 7.5), V(0, 7.5, 0), V(0, 8, 0), u, 58); };
  },
  zap_face(ctx) {
    const s = ctx.scene; garden(s, { target: V(0, 6, 0), sr: 10 }); const F = flyer(s, 'crazy', 'sit armsUp', 30); F.g.position.set(0, 5.2, 0);
    const fl = new THREE.PointLight(0xaee2ff, 0, 10); fl.position.set(0, 7.5, 1.5); s.add(fl);
    const hairs = []; for (let i = 0; i < 12; i++) { const h = L.mesh(L.cap(0.025, 0.25), 0x5b3a1f, Math.cos(i / 12 * 6.28) * 0.2, 0.35, Math.sin(i / 12 * 6.28) * 0.2, F.lr.head); h.rotation.set(Math.sin(i / 12 * 6.28) * 0.7, 0, -Math.cos(i / 12 * 6.28) * 0.7); hairs.push(h); }
    return (u, t) => { F.b.update(t); const fr = Math.floor(t * 20) % 2; fl.intensity = fr ? 40 : 0; F.g.position.x = (fr - 0.5) * 0.03;
      s.background = fr ? new THREE.Color(0x1a2a44) : L.skyTex('#3f8fe0', '#8cc4f2', '#d9ecfa'); F.lr.g.traverse(o => { if (o.isMesh && o.material.map === undefined) {} });
      cam(ctx, V(0.3, 6.75, 1.35), V(0.2, 6.75, 1.05), V(0, 6.65, 0), V(0, 6.67, 0), u, 50); };
  },
  blackout(ctx) {
    const s = ctx.scene; s.background = L.skyTex('#1a2550', '#5a4a7a', '#e08a5a'); s.fog = new THREE.Fog(0x5a4a6a, 30, 120);
    s.add(new THREE.HemisphereLight(0x8090c0, 0x302830, 0.6)); const d = new THREE.DirectionalLight(0xffa070, 0.8); d.position.set(-10, 5, 5); s.add(d);
    const gr = L.mesh(new THREE.PlaneGeometry(400, 400), 0x34502e, 0, 0, 0, s); gr.rotation.x = -Math.PI / 2;
    const road = L.mesh(new THREE.PlaneGeometry(400, 6), 0x333338, 0, 0.01, 6, s); road.rotation.x = -Math.PI / 2;
    const hs = []; for (let i = 0; i < 6; i++) { const h = L.makeHouse([0xd8e3ee, 0xf1e1c6, 0xe6d0d0][i % 3], 0x4a4f5a, true); h.position.set(-25 + i * 10, 0, -2); h.userData.wins.forEach(w => w.material = w.material.clone()); s.add(h); hs.push(h); }
    const lamps = []; for (let i = 0; i < 5; i++) { L.mesh(L.cyl(0.08, 0.1, 5), 0x333333, -20 + i * 10, 2.5, 3, s); const b = L.mesh(L.sph(0.3), L.mat(0xffe9a0, { e: 0xffd060, ei: 3 }).clone(), -20 + i * 10, 5.1, 3, s); const pl = new THREE.PointLight(0xffc060, 15, 12); pl.position.set(-20 + i * 10, 4.8, 3); s.add(pl); lamps.push([b, pl]); }
    return (u, t) => { hs.forEach((h, i) => { const off = u > 0.25 + i * 0.07; h.userData.wins.forEach(w => { w.material.emissiveIntensity = off ? 0 : 1.2; w.material.color.set(off ? 0x1c2230 : 0xffd77a); }); });
      lamps.forEach(([b, pl], i) => { const off = u > 0.25 + i * 0.08; b.material.emissiveIntensity = off ? 0 : 3; pl.intensity = off ? 0 : 15; });
      cam(ctx, V(-4, 3, 22), V(-2, 4, 18), V(0, 3, 0), V(0, 3, 0), u, 55); };
  },
  // ---------------- ARREST ----------------
  police_car(ctx) {
    const s = ctx.scene; garden(s, { target: V(0, 1, 0), hx: 6 }); const car = L.makePoliceCar(); car.position.set(0, 0, 0); car.rotation.y = 0.5; s.add(car);
    const c1 = guy(s, COP, 2.2, 0, 1.6, -0.3); c1.expr('angry'); L.mesh(L.cyl(0.32, 0.36, 0.16), 0x1f3a6b, 0, 0.32, 0, c1.head); L.mesh(L.box(0.5, 0.04, 0.22), 0x111111, 0, 0.25, 0.28, c1.head);
    const F = flyer(s, 'scared', 'sit clutch', 26); F.g.position.set(-1.5, 0, 2.6); F.g.rotation.y = 0.6;
    return (u, t) => { car.userData.flash(t); F.b.update(t); c1.pose('stand point');
      cam(ctx, V(5, 1.6, 8.5), V(4, 1.8, 7.5), V(0.5, 1.2, 1.2), V(0.3, 1.4, 1.4), u, 55); };
  },
  arrest(ctx) {
    const s = ctx.scene; garden(s, { target: V(0, 1, 0) }); const car = L.makePoliceCar(); car.position.set(-2.5, 0, -2.5); s.add(car);
    const lr = guy(s, LARRY, 0, 0, 0, 0.2); lr.pose('stand cuffed'); lr.expr('sad');
    const c1 = guy(s, COP, 0.75, 0, -0.35, -0.4); c1.expr('angry'); c1.pose('stand holdL'); L.mesh(L.cyl(0.32, 0.36, 0.16), 0x1f3a6b, 0, 0.32, 0, c1.head); L.mesh(L.box(0.5, 0.04, 0.22), 0x111111, 0, 0.25, 0.28, c1.head);
    const cuffs = L.mesh(new THREE.TorusGeometry(0.06, 0.015, 8, 16), L.mat(0xcccccc, { m: 0.9, r: 0.2 }), 0, 0.82, -0.32, lr.g);
    return (u, t) => { car.userData.flash(t); lr.look(-0.3, -0.5);
      cam(ctx, V(0.6, 1.6, 2.8), V(0.4, 1.6, 2.3), V(0.2, 1.45, 0), V(0.2, 1.5, 0), u, 52); };
  },
  // ---------------- INTERVIEW ----------------
  reporter(ctx) {
    const s = ctx.scene; garden(s, { target: V(0, 1, 0) });
    const lr = guy(s, LARRY, 0, 0, 0, 0.6); lr.expr('smile'); lr.pose('stand');
    const rp = guy(s, { skin: 0xf3c7a8, shirt: 0x2a2f3a, sleeve: 0x2a2f3a, pants: 0x2a2f3a, hair: 0xa85a2a, mustache: false, tie: 0xb31b1b }, 1.1, 0, 0.5, -1.2); rp.pose('stand holdR'); rp.expr('smile');
    const mic = new THREE.Group(); L.mesh(L.cyl(0.025, 0.02, 0.3), 0x222222, 0, 0, 0, mic); L.mesh(L.sph(0.06), 0x444444, 0, 0.17, 0, mic); L.mesh(L.box(0.08, 0.06, 0.08), 0xd62828, 0, 0.08, 0, mic); rp.arms[1].el.add(mic); mic.position.set(0, -0.36, 0.1); mic.rotation.x = -1.4;
    const cm = guy(s, FRIEND1, 2.2, 0, 2.3, -2.2); cm.pose('stand holdL holdR'); const camb = L.mesh(L.box(0.25, 0.3, 0.6), 0x222222, 0.15, 1.75, 0.15, cm.g);
    return (u, t) => { talk(rp, t, 'grin'); lr.look(0.7, 0);
      cam(ctx, V(-1.2, 1.6, 3.6), V(-0.9, 1.6, 3.0), V(0.5, 1.55, 0.2), V(0.5, 1.6, 0.2), u, 52); };
  },
  reporter_close(ctx) {
    const s = ctx.scene; garden(s, { target: V(0, 1, 0) });
    const rp = guy(s, { skin: 0xf3c7a8, shirt: 0x2a2f3a, sleeve: 0x2a2f3a, pants: 0x2a2f3a, hair: 0xa85a2a, mustache: false, tie: 0xb31b1b }, 0, 0, 0, 0); rp.pose('stand holdR');
    const mic = new THREE.Group(); L.mesh(L.cyl(0.025, 0.02, 0.3), 0x222222, 0, 0, 0, mic); L.mesh(L.sph(0.06), 0x444444, 0, 0.17, 0, mic); L.mesh(L.box(0.08, 0.06, 0.08), 0xd62828, 0, 0.08, 0, mic); rp.arms[1].el.add(mic); mic.position.set(0, -0.36, 0.1); mic.rotation.x = -1.4;
    return (u, t) => { talk(rp, t, 'grin'); rp.look(-0.4, 0);
      cam(ctx, V(-0.3, 1.65, 1.5), V(-0.2, 1.65, 1.2), V(0, 1.58, 0), V(0, 1.6, 0), u, 50); };
  },
  quote_face(ctx) {
    const s = ctx.scene; garden(s, { target: V(0, 1, 0) }); const lr = guy(s, LARRY, 0, 0, 0, 0); lr.pose('stand point');
    return (u, t) => { lr.expr(u < 0.85 ? (Math.sin(t * 14) > 0 ? 'grin' : 'smug') : 'smug'); lr.look(0, 0); lr.head.rotation.z = Math.sin(t * 2) * 0.06;
      cam(ctx, V(0.15, 1.65, 1.6), V(0.05, 1.63, 1.15), V(0, 1.6, 0), V(0, 1.6, 0), u, 50); };
  },
  // ---------------- FINALE ----------------
  finale(ctx) {
    const s = ctx.scene; highSky(s, { top: '#2b2a6b', mid: '#e3735a', bot: '#ffc27a', fog: 0xf2a070, sun: 0xffb070, dir: [-8, 3, 6], target: V(0, 2, 0) }); const F = flyer(s, 'grin', 'sit cheer');
    return (u, t) => { F.b.update(t); F.g.position.y = u; cam(ctx, V(-3, 1.2, 7), V(-4.5, 2.5, 10), V(0, 3, 0), V(0, 3.5, 0), u, 55); };
  },
  finale_title(ctx) {
    const s = ctx.scene; highSky(s, { top: '#2b2a6b', mid: '#e3735a', bot: '#ffc27a', fog: 0xf2a070, sun: 0xffb070, dir: [-8, 3, 6], target: V(0, 2, 0) }); const F = flyer(s, 'smug', 'sit cheer');
    const r = (u, t) => { F.b.update(t); F.g.position.y = 1 + u; cam(ctx, V(-4.5, 2.5, 10), V(-6, 3.5, 14), V(0, 3.5, 0), V(0, 4, 0), u, 55); };
    r.overlay = (g, W, H, u) => { bigText(g, '1982', W / 2, H * 0.17, W * 0.2, u); bigText(g, 'LAWNCHAIR LARRY', W / 2, H * 0.27, W * 0.085, u - 0.1); };
    return r;
  },
};

function propShot(ctx, obj) {
  const s = ctx.scene; garden(s, { target: V(0, 1, 0) }); const ch = L.makeChair(); s.add(ch); obj.position.set(0, 0.46, 0.05); s.add(obj);
  return (u, t) => { popIn(obj, u, 0.05); obj.rotation.y = 0.5 + t * 0.8; cam(ctx, V(0.5, 1.0, 0.9), V(0.35, 0.9, 0.7), V(0, 0.52, 0), V(0, 0.52, 0), u, 50); };
}

export function bigText(g, txt, x, y, size, u) {
  const k = clamp(u * 5); if (k <= 0) return; const sc = 1.6 - 0.6 * (1 - Math.pow(1 - k, 3));
  g.save(); g.translate(x, y); g.scale(sc, sc); g.font = `900 ${size}px "Inter Display"`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const w = g.measureText(txt).width; if (w > 0.9 * g.canvas.width / sc) { const f = 0.9 * g.canvas.width / sc / w; g.scale(f, f); }
  for (let i = 12; i > 0; i--) { g.fillStyle = `rgb(${90 - i * 4},${90 - i * 4},${100 - i * 4})`; g.fillText(txt, i * 0.6, i * 0.9); }
  const gr = g.createLinearGradient(0, -size / 2, 0, size / 2); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#c9d3dd'); g.fillStyle = gr; g.fillText(txt, 0, 0);
  g.lineWidth = size * 0.03; g.strokeStyle = '#3a3f48'; g.strokeText(txt, 0, 0); g.restore();
}
