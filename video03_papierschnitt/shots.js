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

// ================= VIDEO 03 – Papierschnitt =================
const BEN = { skin: 0xf1c29a, shirt: 0x19a7a0, sleeve: 0x19a7a0, pants: 0x2f3e5a, hair: 0x4a2a14, mustache: false, shoes: 0xf2f2f2 };
const SCI1 = { skin: 0xe8b08a, shirt: 0xf4f6f8, sleeve: 0xf4f6f8, pants: 0x3a4a6a, hair: 0x8a8a8a, glasses: true, tie: 0x2a6fb0, suit: true, armSkin: false };
const SCI2 = { skin: 0xf6cdb0, shirt: 0xf4f6f8, sleeve: 0xf4f6f8, pants: 0x2a2a3a, hair: 0x2a1a10, female: true, dress: 0xf4f6f8, glasses: true, armSkin: false };
const FY = 1.75; // height of the cut on the giant finger
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

function studio(s, o = {}) {
  s.background = L.skyTex(o.top ?? '#2a78d2', o.mid ?? '#74ade8', o.bot ?? '#e2edf8');
  s.fog = new THREE.Fog(o.fog ?? 0xdce8f4, o.fn ?? 9, o.ff ?? 40);
  const fl = L.mesh(new THREE.PlaneGeometry(300, 300), L.mat(o.floor ?? 0xe9f0f7, { r: 0.65 }), 0, o.fy ?? -1.6, 0, s); fl.rotation.x = -Math.PI / 2; fl.castShadow = false;
  return lights(s, { sky: o.sky ?? 0xe6f0ff, ground: o.ground ?? 0xb0c0d0, hi: o.hi ?? 1.15, si: o.si ?? 2.3, dir: o.dir ?? [4, 8, 6], sunSprite: false, sr: o.sr ?? 4, target: o.target ?? V(0, FY, 0), rim: o.rim, ri: o.ri });
}
function office(s, o = {}) {
  s.background = new THREE.Color(0x2a2018); if (ENV) s.environment = ENV;
  const wallT = L.canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#f0dfbf'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 32) { g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(x, 0, 14, h); } for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(160,120,80,${Math.random() * 0.05})`; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); } }, 3);
  const room = L.mesh(L.box(10, 4.2, 9), new THREE.MeshStandardMaterial({ map: wallT, roughness: 0.9, side: THREE.BackSide, envMapIntensity: 0.3 }), 0, 2.1, 0, s); room.castShadow = false;
  const fl = L.mesh(new THREE.PlaneGeometry(10, 9), new THREE.MeshStandardMaterial({ map: L.parquetTex(), roughness: 0.4, envMapIntensity: 0.6 }), 0, 0.01, 0, s); fl.rotation.x = -Math.PI / 2;
  L.mesh(L.box(10, 0.14, 0.05), L.mat(0xffffff, { r: 0.5 }), 0, 0.07, -4.47, s);
  const win = L.mesh(new THREE.PlaneGeometry(2.2, 1.8), new THREE.MeshBasicMaterial({ map: L.skyTex('#3a8fe0', '#8cc4f2', '#f3f7fb') }), -1.7, 2.3, -4.48, s); win.castShadow = false;
  const wf = L.mat(0xffffff, { r: 0.4 }); for (const y of [1.38, 3.22]) L.mesh(L.box(2.4, 0.08, 0.1), wf, -1.7, y, -4.44, s); for (const x of [-2.84, -0.56, -1.7]) L.mesh(L.box(0.08, 1.9, 0.1), wf, x, 2.3, -4.44, s); L.mesh(L.box(2.3, 0.05, 0.08), wf, -1.7, 2.3, -4.44, s);
  for (const x of [-3.0, -0.4]) L.mesh(L.box(0.5, 2.6, 0.08), L.mat(0x2a6fb0, { fab: true, r: 0.9 }), x, 2.2, -4.38, s);
  const post = L.mesh(new THREE.PlaneGeometry(1.0, 1.3), new THREE.MeshStandardMaterial({ map: L.canvasTex(256, 330, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ff7a59'); gr.addColorStop(1, '#ffc65a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '900 44px Inter Display'; g.textAlign = 'center'; g.fillText('WISSEN', w / 2, 70); g.fillText('IST', w / 2, 120); g.fillText('COOL', w / 2, 170); g.beginPath(); g.arc(w / 2, 250, 45, 0, 7); g.fill(); g.fillStyle = '#ff7a59'; g.font = '900 50px Inter Display'; g.fillText('?', w / 2, 268); }), roughness: 0.6 }), 1.0, 2.5, -4.47, s);
  const bs = L.makeBookshelf(); bs.position.set(3.2, 0, -4.2); s.add(bs);
  const desk = L.makeDesk(); desk.position.set(0, 0, -0.6); s.add(desk);
  const ch = L.makeChairWood(0x2a6fb0); ch.position.set(0, 0, -1.6); s.add(ch);
  const rug = L.mesh(new THREE.PlaneGeometry(4, 3), L.mat(0x3a7a8a, { fab: true, r: 1 }), 0, 0.02, -0.8, s); rug.rotation.x = -Math.PI / 2; rug.castShadow = false;
  const pl = new THREE.PointLight(0xffd9a0, 6, 5); pl.position.set(-0.8, 1.35, -0.9); s.add(pl);
  lights(s, { sky: 0xfff0dc, ground: 0x6a4a30, hi: o.hi ?? 1.0, si: o.si ?? 2.2, dir: o.dir ?? [-3, 6, 5], sun: o.sun ?? 0xfff2dc, sunSprite: false, sr: 4, target: V(0, 1, -1) });
  return { desk, ch };
}
function lab(s, o = {}) {
  s.background = new THREE.Color(0x1a2a2a); if (ENV) s.environment = ENV;
  const wallT = L.canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#e3f3ef'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(80,140,130,0.25)'; g.lineWidth = 2; for (let x = 0; x <= w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y <= h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } }, 4);
  const room = L.mesh(L.box(12, 4.5, 11), new THREE.MeshStandardMaterial({ map: wallT, roughness: 0.7, side: THREE.BackSide, envMapIntensity: 0.4 }), 0, 2.25, 0, s); room.castShadow = false;
  const flT = L.canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#b9c7cf'; g.fillRect(0, 0, w, h); g.strokeStyle = '#98a8b2'; g.lineWidth = 3; for (let x = 0; x <= w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); g.beginPath(); g.moveTo(0, x); g.lineTo(w, x); g.stroke(); } }, 6);
  const fl = L.mesh(new THREE.PlaneGeometry(12, 11), new THREE.MeshStandardMaterial({ map: flT, roughness: 0.3, envMapIntensity: 0.7 }), 0, 0.01, 0, s); fl.rotation.x = -Math.PI / 2;
  const top = L.mat(0xf6f8fa, { r: 0.25, phys: true, cc: 0.6 }), cab = L.mat(0x2a9d8f, { r: 0.4, phys: true, cc: 0.4 });
  for (const [z, w] of [[-1.0, 4], [-4.9, 7]]) { L.mesh(L.box(w, 0.08, 1.2), top, 0, 0.92, z, s); L.mesh(L.box(w - 0.1, 0.86, 1.1), cab, 0, 0.45, z, s); for (let i = 0; i < w / 0.8 - 1; i++) L.mesh(L.box(0.18, 0.03, 0.02), L.mat(0xdddddd, { m: 0.8, r: 0.3 }), -w / 2 + 0.6 + i * 0.8, 0.75, z + 0.56, s); }
  const cols = [0x3ad6a0, 0xff5d73, 0x4aa8ff, 0xffc145, 0xa86bff]; for (let i = 0; i < 9; i++) { const f = L.makeFlask(cols[i % 5], 0.9 + (i % 3) * 0.2); f.position.set(-3 + i * 0.75, 0.96, -5.0 + (i % 2) * 0.25); s.add(f); }
  for (let i = 0; i < 6; i++) { const f = L.makeFlask(cols[(i + 2) % 5], 0.7); f.position.set(-2.2 + i * 0.9, 2.42, -5.3); s.add(f); } L.mesh(L.box(6, 0.05, 0.4), top, 0, 2.4, -5.3, s);
  const ms = L.makeMicroscope(); ms.scale.setScalar(0.45); ms.position.set(2.6, 0.96, -4.9); s.add(ms);
  const post = L.mesh(new THREE.PlaneGeometry(1.6, 1.1), new THREE.MeshStandardMaterial({ map: L.canvasTex(320, 220, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#c8102e'; g.fillRect(0, 0, w, 44); g.fillStyle = '#fff'; g.font = '900 28px Inter Display'; g.fillText('PAPIER-LABOR', 14, 32); g.strokeStyle = '#2a6fb0'; g.lineWidth = 5; g.beginPath(); g.moveTo(20, 190); for (let x = 0; x < 280; x += 10) g.lineTo(20 + x, 190 - Math.exp(-(((x - 140) / 50) ** 2)) * 120); g.stroke(); g.fillStyle = '#c8102e'; g.beginPath(); g.arc(160, 70, 8, 0, 7); g.fill(); }), roughness: 0.6 }), -3.5, 2.9, -5.47, s);
  for (const x of [-3, 0, 3]) { L.mesh(L.box(1.6, 0.06, 0.5), L.mat(0xffffff, { e: 0xf4fbff, ei: 1.6 }), x, 4.46, -2, s); L.mesh(L.box(1.6, 0.06, 0.5), L.mat(0xffffff, { e: 0xf4fbff, ei: 1.6 }), x, 4.46, 1.5, s); }
  lights(s, { sky: 0xeafffa, ground: 0x7a8a8a, hi: 1.15, si: 2.0, dir: [3, 8, 5], sunSprite: false, sr: 5, target: V(0, 1, -1.5) });
}
function benAtDesk(s, o = {}) { const b = guy(s, BEN, 0, -0.2, -1.55, 0); b.pose('sit'); b.expr(o.expr ?? 'smile'); return b; }
function holdPaper(c, side = 1, w = 0.42, h = 0.56) { const p = L.makePaper(w, h); const a = c.arms[side]; a.hand.add(p); p.position.set(0, -h / 2 + 0.05, 0.06); p.rotation.set(0.15, 0, 0); return p; }
function fallingPapers(s, n, c, area = 1.6) { const ps = []; for (let i = 0; i < n; i++) { const p = L.makePaper(0.3, 0.4); p.userData = { x: c.x + (Math.random() - 0.5) * area, z: c.z + (Math.random() - 0.5) * 0.6, ph: Math.random() * 6, sp: 0.5 + Math.random() * 0.5 }; s.add(p); ps.push(p); }
  return t => ps.forEach(p => { const d = p.userData; p.position.set(d.x + Math.sin(t * 2.5 + d.ph) * 0.25, c.y - t * d.sp + 0.2 * Math.sin(t * 3 + d.ph), d.z); p.rotation.set(Math.sin(t * 2 + d.ph) * 0.8, t + d.ph, Math.cos(t * 2.2 + d.ph) * 0.6); }); }
function fingerScene(s, o = {}) { studio(s, o); const f = L.makeFinger(BEN.skin, o); s.add(f.g); return f; }

export const SHOTS = {
  // ---------- HOOK ----------
  h_cut(ctx) {
    const s = ctx.scene; const f = fingerScene(s); const pg = new THREE.Group(); s.add(pg); const p = L.makePaper(4.6, 2.6); p.position.y = -1.3; pg.add(p); pg.position.set(0, FY, 0.47); pg.rotation.x = -0.7;
    const sp = sparkle(s, 0xffd0a0, 0.9);
    const r = (u, t) => { const k = 1 - Math.pow(1 - clamp(t / 0.5), 2); pg.position.x = -3.6 + 4.6 * k; f.cutG.visible = t > 0.22; f.glow.material.opacity = 0.35 + 0.25 * Math.sin(t * 20);
      sp.position.set(0.05, FY, 0.52); sp.visible = t > 0.12 && t < 0.4; sp.scale.setScalar(0.4 + Math.sin(t * 60) * 0.2);
      if (t > 0.2 && t < 0.55) { ctx.shake = 1.5; ctx.flash = 0.5 * (1 - (t - 0.2) / 0.35); }
      cam(ctx, V(2.2, 3.0, 8.5), V(0.6, 2.3, 4.6), V(0, 2.0, 0.3), V(0, 2.0, 0.4), clamp(u * 1.3), 42, true); ctx.roll = (1 - clamp(u * 2)) * -0.2; };
    r.overlay = (g, W, H, u, T, t) => stamp2d(g, W, H, 'AUTSCH!', t - 0.22, '#e8202a', 0.22);
    return r;
  },
  h_finger(ctx) {
    const s = ctx.scene; const f = fingerScene(s, { dir: [2, 8, 7] }); f.cutG.visible = true;
    return (u, t) => { f.glow.material.opacity = 0.3 + 0.2 * Math.sin(t * 9); f.drops.forEach((d, i) => { const k = clamp((t - 0.15 - i * 0.18) * 3); d.scale.setScalar(Math.max(0.001, k)); d.position.y = FY - 0.02 - Math.max(0, t - 0.6 - i * 0.18) * 0.08 * (i % 2 + 1); });
      orbit(ctx, V(0, FY + 0.4, 0.2), 3.8, 2.9, -0.7, 0.35, FY + 1.0, FY + 0.6, u, 40); };
  },
  h_ouch(ctx) {
    const s = ctx.scene; office(s); const b = guy(s, BEN, 0, 0, -1.5, 0); const fall = fallingPapers(s, 6, V(0, 2.6, -1.2), 2.2);
    const red = L.mesh(L.box(0.1, 0.02, 0.02), L.mat(0xd11a2a, { e: 0x7a0000 }), 0, -0.02, 0.07, b.arms[1].hand);
    return (u, t) => { b.pose('stand'); talk(b, t, 'shock'); b.arms[1].sh.rotation.set(-2.3 + Math.sin(t * 18) * 0.15, 0, 0.35); b.arms[1].el.rotation.x = -0.9; b.arms[0].sh.rotation.set(-0.4, 0, -0.9 + Math.sin(t * 14) * 0.2);
      b.g.position.y = Math.abs(Math.sin(t * 7)) * 0.12; tremble(b, t, 3); b.look(0.6, 0.6); fall(t); ctx.shake = 0.7 * (1 - u);
      cam(ctx, V(0.9, 1.9, 1.4), V(0.4, 1.75, 0.6), V(0, 1.65, -1.5), V(0.05, 1.7, -1.5), u, 48, true); };
  },
  why_face(ctx) {
    const s = ctx.scene; office(s); const b = benAtDesk(s); const p = holdPaper(b, 1, 0.42, 0.56);
    const r = (u, t) => { b.arms[1].sh.rotation.set(-1.75, 0, 0.45); b.arms[1].el.rotation.set(-0.5, 0, 0); p.rotation.set(0.1, -0.5 + Math.sin(t * 2) * 0.1, 0); b.expr('squint'); b.look(0.8, 0.2); b.head.rotation.z = 0.15 + Math.sin(t * 2) * 0.05; b.head.rotation.y = 0.35;
      cam(ctx, V(-0.8, 1.55, 0.8), V(-0.45, 1.5, 0.1), V(0.1, 1.38, -1.5), V(0.15, 1.38, -1.5), u, 45); };
    r.overlay = (g, W, H, u, T, t) => qmarks(g, W, H, T, t * 1.5, 0.72, 0.24);
    return r;
  },
  press_straight(ctx) {
    const s = ctx.scene; const f = fingerScene(s); const tipY = 3.1; const pg = new THREE.Group(); s.add(pg); const p = L.makePaper(2.2, 3.0); p.position.y = 1.5; pg.add(p); pg.rotation.y = 0.55;
    const ar = arrow(); s.add(ar);
    return (u, t) => { const k = ease(clamp(u / 0.8)); pg.position.y = tipY + 1.4 * (1 - k); ar.position.set(0, pg.position.y + 3.05 + Math.sin(t * 10) * 0.05, 0); ar.scale.setScalar(0.9);
      cam(ctx, V(2.2, 2.4, 6.6), V(1.6, 2.8, 5.6), V(0, 3.6, 0), V(0, 3.9, 0), u, 50); };
  },
  press_buckle(ctx) {
    const s = ctx.scene; const f = fingerScene(s); const tipY = 3.1; const pg = new THREE.Group(); s.add(pg); const p = L.makePaper(2.2, 3.0); p.position.y = 1.5; pg.add(p); pg.rotation.y = 0.55; pg.position.y = tipY;
    const ar = arrow(); s.add(ar);
    const r = (u, t) => { const k = ease(clamp(u * 1.4)); p.userData.bend(k, 'buckle'); ar.position.set(0, tipY + 3.0 * (1 - 0.35 * k) + 0.05, 0); ar.scale.setScalar(0.9); if (u > 0.2 && u < 0.35) ctx.shake = 0.4;
      cam(ctx, V(3.2, 2.6, 5.2), V(3.8, 3.0, 3.9), V(0, 3.9, 0), V(0, 3.9, 0.3), u, 50); };
    r.overlay = (g, W, H, u, T, t) => chip(g, W, H, '✗  KNICKT EINFACH WEG', '#e8202a', W / 2, H * 0.2, t * 2.5 - 0.6);
    return r;
  },
  slide_wide(ctx) {
    const s = ctx.scene; office(s); const b = benAtDesk(s, { expr: 'smile' }); const p = L.makePaper(0.5, 0.66); p.position.set(0, 1.02, -1.0); p.rotation.x = -0.25; s.add(p);
    const sp = sparkle(s, 0xffb070, 0.18);
    const r = (u, t) => { b.arms[0].sh.rotation.set(-1.35, 0.35, -0.1); b.arms[0].el.rotation.x = -0.3; const sw = Math.sin(t * 3.2) * 0.32; b.arms[1].sh.rotation.set(-1.55, -0.15 + sw, 0.25); b.arms[1].el.rotation.x = -0.25;
      b.expr(u > 0.45 ? 'scared' : 'smile'); b.look(0, -0.6); sp.position.set(0.12 + sw * 0.9, 1.34, -0.95); sp.visible = u > 0.4;
      cam(ctx, V(1.0, 1.8, 0.9), V(0.6, 1.65, 0.2), V(0, 1.3, -1.2), V(0, 1.35, -1.1), u, 46); };
    r.overlay = (g, W, H, u, T, t) => chip(g, W, H, '⚠  ACHTUNG', '#ff9f1a', W / 2, H * 0.2, t * 2 - 0.4);
    return r;
  },
  slide_angle(ctx) {
    const s = ctx.scene; const f = fingerScene(s); const pg = new THREE.Group(); s.add(pg); const p = L.makePaper(4.4, 2.6); p.position.y = -1.3; pg.add(p); pg.position.set(0, FY, 0.47); pg.rotation.x = -0.38;
    const ag = new THREE.Group(); ag.position.set(0.0, FY, 0.47); ag.rotation.y = -Math.PI / 2; s.add(ag); const am = L.mat(0xffd60a, { e: 0xffb000, ei: 0.8 });
    const arc = L.mesh(new THREE.TorusGeometry(0.85, 0.022, 8, 32, 0.38), am, 0, 0, 0, ag); arc.rotation.z = -Math.PI / 2; const ln = L.mesh(L.box(0.03, 1.0, 0.03), am, 0, -0.5, 0, ag);
    const r = (u, t) => { pg.position.x = -1.6 + 3.2 * u; f.cutG.visible = u > 0.35; f.cutG.scale.set(1, 1, 1); arc.scale.setScalar(Math.max(0.001, clamp(u * 3)));
      cam(ctx, V(5.0, 1.4, 3.8), V(4.2, 1.6, 2.9), V(0, FY - 0.3, 0.5), V(0, FY - 0.2, 0.5), u, 45); };
    r.overlay = (g, W, H, u, T, t) => chip(g, W, H, '✓  FLACHER WINKEL', '#20b35a', W / 2, H * 0.2, t * 2 - 0.2);
    return r;
  },
  edge_force(ctx) {
    const s = ctx.scene; studio(s, { target: V(0, 1.5, 0) }); const sl = L.makeEdgeSlab(4.4, 3, 0.09); sl.position.y = 1.5; s.add(sl);
    const gl = L.mesh(L.box(4.4, 0.035, 0.11), new THREE.MeshBasicMaterial({ color: 0xff8a2a }), 0, 1.5, 0, s); gl.castShadow = false;
    const ars = []; for (let i = 0; i < 5; i++) { const a = arrow(0xff6a1a, 0.8); a.position.set(-1.6 + i * 0.8, 2.6, 0); a.rotation.z = (i - 2) * 0.12; s.add(a); ars.push(a); }
    const r = (u, t) => { ars.forEach((a, i) => { const k = (t * 2.2 + i * 0.13) % 1; a.position.y = 1.62 + 0.55 * (1 - Math.pow(k, 2)); a.position.x = (-1.6 + i * 0.8) * (1 - 0.6 * clamp(u * 1.5)); });
      gl.material.color.setHSL(0.07, 1, 0.5 + 0.2 * Math.sin(t * 12)); gl.scale.y = 1 + 0.4 * Math.sin(t * 12);
      cam(ctx, V(1.4, 2.6, 3.4), V(0.7, 2.0, 2.2), V(0, 1.6, 0), V(0, 1.55, 0), u, 45); };
    r.overlay = (g, W, H, u, T, t) => chip(g, W, H, 'ALLE KRAFT AUF EINER KANTE', '#ff6a1a', W / 2, H * 0.2, t * 2 - 0.3, 0.04);
    return r;
  },
  hair_compare(ctx) {
    const s = ctx.scene; studio(s, { target: V(0, 1, 0), top: '#1f5fae', mid: '#5f9fe0' }); const sl = L.makeEdgeSlab(2.6, 2.5, 0.13); sl.position.set(-0.6, 1, 0); s.add(sl);
    const hm = new THREE.MeshPhysicalMaterial({ color: 0x5a3418, roughness: 0.35, clearcoat: 0.6, map: L.canvasTex(256, 64, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 12) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x, 0, 2, h); } }, 1) });
    hm.map.wrapS = hm.map.wrapT = THREE.RepeatWrapping; hm.map.repeat.set(8, 1);
    const hair = L.mesh(L.cyl(0.07, 0.07, 6, 24), hm, 1.0, 1.0, 0.0, s); hair.rotation.set(0.0, 0.0, Math.PI / 2 - 0.2); hair.position.set(1.0, 0.96, 0);
    const r = (u, t) => { cam(ctx, V(0.2, 1.9, 1.9), V(0.25, 1.4, 1.25), V(0.25, 0.95, 0), V(0.25, 0.97, 0), u, 42); };
    r.overlay = (g, W, H, u, T, t) => { chip(g, W, H, 'PAPIER  ≈ 0,065 mm', '#2a8fd6', W / 2, H * 0.17, t * 2.5 - 0.2); chip(g, W, H, 'HAAR  ≈ 0,07 mm', '#7a4a22', W / 2, H * 0.24, t * 2.5 - 0.9); };
    return r;
  },
  microscope(ctx) {
    const s = ctx.scene; office(s); const b = benAtDesk(s, { expr: 'dream' }); const ms = L.makeMicroscope(); ms.scale.setScalar(0.4); ms.position.set(0, 0.815, -0.95); ms.rotation.y = Math.PI; s.add(ms);
    const r = (u, t) => { b.head.rotation.x = 0.35; b.g.rotation.x = 0.12; b.arms.forEach((a, i) => { a.sh.rotation.set(-1.2, 0, (i ? 1 : -1) * 0.35); a.el.rotation.x = -0.5; }); b.lids.forEach(l => { l.visible = true; l.rotation.x = -0.35; });
      cam(ctx, V(1.1, 1.6, 0.4), V(0.12, 1.32, -0.62), V(0, 1.18, -1.0), V(0, 1.2, -1.05), clamp(u * 1.1), 45); };
    r.overlay = (g, W, H, u, T, t) => { if (u > 0.78) scopeRing(g, W, H, 1 - (u - 0.78) / 0.22); };
    return r;
  },
  micro_zoom(ctx) {
    const s = ctx.scene; studio(s, { top: '#0b2a3a', mid: '#1f6a7e', bot: '#9fd0dc', fog: 0x6fb0c0, target: V(0, 0, 0), fy: -3 }); const sl = L.makeEdgeSlab(5, 3, 0.09); s.add(sl); const fb = L.makeFibers(5, 420); s.add(fb);
    const r = (u, t) => { ctx.grade = 'micro'; cam(ctx, V(0.4, 1.2, 7.5), V(0.1, 0.35, 1.3), V(0, -0.2, 0), V(0, 0.08, 0), u, 42, true); };
    r.overlay = (g, W, H, u, T, t) => scopeRing(g, W, H, clamp(t * 3));
    return r;
  },
  fibers(ctx) {
    const s = ctx.scene; studio(s, { top: '#0b2a3a', mid: '#1f6a7e', bot: '#9fd0dc', fog: 0x6fb0c0, target: V(0, 0, 0), fy: -3 }); const sl = L.makeEdgeSlab(6, 3, 0.09); s.add(sl); const fb = L.makeFibers(6, 520, 12); s.add(fb);
    const r = (u, t) => { ctx.grade = 'micro'; cam(ctx, V(-1.3, 0.42, 0.95), V(0.9, 0.3, 0.8), V(-0.6, 0.06, 0), V(1.3, 0.06, 0), u, 40); };
    r.overlay = (g, W, H, u, T, t) => { scopeRing(g, W, H, 1); chip(g, W, H, 'AUSGEFRANSTE FASERN', '#2a8fd6', W / 2, H * 0.12, t * 2 - 0.2, 0.04); };
    return r;
  },
  saw_teeth(ctx) {
    const s = ctx.scene; studio(s, { top: '#0b2a3a', mid: '#1f6a7e', bot: '#9fd0dc', fog: 0x6fb0c0, target: V(0, 0, 0), fy: -3 }); const gr = new THREE.Group(); s.add(gr); const sl = L.makeEdgeSlab(5, 3, 0.09); gr.add(sl); const fb = L.makeFibers(5, 420); gr.add(fb); const te = L.makeTeeth(5, 16); gr.add(te);
    const r = (u, t) => { ctx.grade = 'micro'; const k = ease(clamp(u * 2.2)); te.scale.set(1, Math.max(0.001, k), 1); fb.scale.y = Math.max(0.001, 1 - k); gr.position.x = Math.sin(t * 9) * 0.22 * k; if (k > 0.5) ctx.shake = 0.25;
      cam(ctx, V(0.5, 0.75, 2.3), V(0.3, 0.55, 1.8), V(0, 0.1, 0), V(0, 0.12, 0), u, 42); };
    r.overlay = (g, W, H, u, T, t) => { scopeRing(g, W, H, 1); chip(g, W, H, 'WIE EINE SÄGE', '#e8202a', W / 2, H * 0.12, t * 2 - 0.5); };
    return r;
  },
  skin_section(ctx) {
    const s = ctx.scene; studio(s, { target: V(0, -0.6, 0), fy: -2.5, top: '#2a5fae', mid: '#7aa8e0' }); const sk = L.makeSkinBlock(); s.add(sk);
    const pp = new THREE.Group(); s.add(pp); const sl = L.makeEdgeSlab(1.8, 2.2, 0.07); sl.rotation.z = Math.PI; sl.position.y = 0; pp.add(sl); const fb = L.makeFibers(1.8, 120, 4, 0.07); fb.rotation.z = Math.PI; pp.add(fb); te(pp);
    function te(g) { const t = L.makeTeeth(1.8, 10); t.rotation.z = Math.PI; t.scale.y = 0.6; g.add(t); }
    const r = (u, t) => { pp.position.set(-3.2 + 6.4 * u, 0.02, 0.6); cam(ctx, V(2.6, 1.0, 4.6), V(1.8, 0.6, 3.8), V(0, -0.5, 0.3), V(0, -0.4, 0.3), u, 45); };
    r.overlay = (g, W, H, u, T, t) => chip(g, W, H, 'DEINE HAUT IM QUERSCHNITT', '#d6456a', W / 2, H * 0.17, t * 2 - 0.2, 0.04);
    return r;
  },
  skin_cut(ctx) {
    const s = ctx.scene; studio(s, { target: V(0, -0.4, 0.6), fy: -2.5, top: '#2a5fae', mid: '#7aa8e0' }); const sk = L.makeSkinBlock(); s.add(sk); const n = sk.userData.notch;
    const pp = new THREE.Group(); s.add(pp); const sl = L.makeEdgeSlab(1.8, 2.2, 0.07); sl.rotation.z = Math.PI; pp.add(sl); const t3 = L.makeTeeth(1.8, 10); t3.rotation.z = Math.PI; t3.scale.y = 0.6; pp.add(t3);
    const drops = []; for (let i = 0; i < 4; i++) { const d = L.mesh(L.sph(0.06, 16), L.mat(0xb3121b, { r: 0.08, phys: true, cc: 1 }), 0, 0, 0.3 + i * 0.25, s); d.scale.setScalar(0.001); drops.push(d); }
    const r = (u, t) => { pp.position.set(-2.4 + 4.8 * clamp(u * 1.4), 0.02 - 0.05, 0.6); const k = ease(clamp(u * 1.6 - 0.1)); n.scale.set(1, Math.max(0.001, 0.28 * k), 1);
      drops.forEach((d, i) => { const kk = clamp((u - 0.45 - i * 0.08) * 5); d.scale.setScalar(Math.max(0.001, kk)); d.position.y = 0.04 + kk * 0.03; });
      cam(ctx, V(1.1, 0.5, 2.9), V(0.6, 0.2, 2.3), V(0, -0.2, 0.9), V(0, -0.2, 0.9), u, 42); };
    return r;
  },
  lab_wide(ctx) {
    const s = ctx.scene; lab(s); const a = guy(s, SCI1, -0.8, 0, -2.0, 0.2); const b = guy(s, SCI2, 0.8, 0, -2.0, -0.2);
    const gel = L.makeGel(3, 1.2, 2); gel.scale.setScalar(0.18); gel.position.set(0, 0.96, -1.0); s.add(gel); const cl = L.makeClamp(); cl.scale.setScalar(0.35); cl.position.set(0.35, 0.98, -1.1); s.add(cl);
    const ms = L.makeMicroscope(); ms.scale.setScalar(0.42); ms.position.set(-1.3, 0.96, -1.0); ms.rotation.y = Math.PI * 0.85; s.add(ms); for (let i = 0; i < 3; i++) { const f = L.makeFlask([0x3ad6a0, 0xff5d73, 0x4aa8ff][i], 0.8); f.position.set(1.0 + i * 0.3, 0.96, -0.8); s.add(f); }
    const r = (u, t) => { a.pose('stand'); b.pose('stand'); a.expr('smile'); b.expr('grin'); a.arms[1].sh.rotation.set(-0.9, 0, 0.3); a.arms[1].el.rotation.x = -0.6; b.arms[0].sh.rotation.set(-1.2 + Math.sin(t * 3) * 0.1, 0, -0.3); b.look(-0.5, 0); a.look(0.5, 0); ctx.tag = 'DÄNEMARK · 2024';
      cam(ctx, V(-0.6, 2.4, 4.4), V(0.2, 1.75, 2.4), V(0, 1.3, -1.6), V(0, 1.35, -1.6), u, 50); };
    return r;
  },
  lab_scientists(ctx) {
    const s = ctx.scene; lab(s); const a = guy(s, SCI1, -0.45, 0, -2.0, 0.35); const b = guy(s, SCI2, 0.5, 0, -2.0, -0.35);
    const clip = L.mesh(L.box(0.26, 0.34, 0.02), L.mat(0x8a5a32, { r: 0.5 }), 0, -0.12, 0.09, a.arms[0].hand); L.mesh(L.box(0.22, 0.26, 0.005), L.mat(0xffffff), 0, -0.02, 0.012, clip);
    return (u, t) => { a.pose('stand'); b.pose('stand'); a.arms[0].sh.rotation.set(-1.2, 0.4, -0.1); a.arms[0].el.rotation.x = -0.6; talk(a, t, 'grin'); b.expr('smile'); b.g.rotation.y = -0.35 + Math.sin(t * 2) * 0.05; b.head.rotation.x = Math.sin(t * 6) * 0.08;
      b.arms[1].sh.rotation.set(-1.4, 0, 0.4); a.look(0.5, 0); b.look(-0.6, 0); cam(ctx, V(0.5, 1.75, 0.9), V(0.2, 1.7, 0.3), V(0, 1.55, -2.0), V(0.05, 1.58, -2.0), u, 45); };
  },
  gel_press(ctx) {
    const s = ctx.scene; studio(s, { top: '#1d6f73', mid: '#6fc0bb', bot: '#e6f4f2', fog: 0xd8eeec, target: V(0, 1.3, 0), fy: 0 }); const gel = L.makeGel(); s.add(gel);
    const pg = new THREE.Group(); s.add(pg); const p = L.makePaper(2.2, 2.4, { lined: false }); p.position.y = 1.2; pg.add(p); const bar = L.mesh(L.box(2.5, 0.22, 0.22), L.mat(0x7d8794, { m: 0.8, r: 0.3 }), 0, 2.45, 0, pg); L.mesh(L.cyl(0.06, 0.06, 4), L.mat(0x7d8794, { m: 0.8, r: 0.3 }), 0, 4.5, 0, pg);
    const r = (u, t) => { const k = ease(clamp(u * 1.3)); pg.position.y = 1.2 + 1.3 * (1 - k); gel.userData.dent(0.03 * k); cam(ctx, V(3.6, 3.2, 6.6), V(2.8, 2.6, 5.4), V(0, 1.7, 0), V(0, 1.5, 0), u, 48); };
    r.overlay = (g, W, H, u, T, t) => chip(g, W, H, 'KÜNSTLICHE HAUT AUS GEL', '#f08a2a', W / 2, H * 0.2, t * 2 - 0.2, 0.042);
    return r;
  },
  too_thin(ctx) {
    const s = ctx.scene; studio(s, { top: '#1d6f73', mid: '#6fc0bb', bot: '#e6f4f2', fog: 0xd8eeec, target: V(0, 1.3, 0), fy: 0 }); const gel = L.makeGel(); s.add(gel);
    const pg = new THREE.Group(); s.add(pg); const p = L.makePaper(2.2, 2.4, { lined: false, color: 0xf2f6ff }); p.position.y = 1.2; pg.add(p); L.mesh(L.box(2.5, 0.22, 0.22), L.mat(0x7d8794, { m: 0.8, r: 0.3 }), 0, 2.45, 0, pg);
    const r = (u, t) => { const k = ease(clamp(u * 1.4)); const c = clamp(k * 1.3 - 0.3); pg.position.y = 1.2 + 0.6 * (1 - clamp(k * 1.6)); p.userData.bend(c, 'buckle'); p.position.y = 1.2; const top = p.geometry.attributes.position; pg.children[1].position.y = 2.45 - 2.4 * 0.35 * c;
      cam(ctx, V(3.6, 2.4, 3.6), V(4.2, 2.2, 2.4), V(0, 1.9, 0), V(0, 1.8, 0.3), u, 48); };
    r.overlay = (g, W, H, u, T, t) => chip(g, W, H, '✗  ZU DÜNN: VERBIEGT SICH', '#e8202a', W / 2, H * 0.2, t * 2.5 - 0.2, 0.042);
    return r;
  },
  too_thick(ctx) {
    const s = ctx.scene; studio(s, { top: '#1d6f73', mid: '#6fc0bb', bot: '#e6f4f2', fog: 0xd8eeec, target: V(0, 1.3, 0), fy: 0 }); const gel = L.makeGel(); s.add(gel);
    const pg = new THREE.Group(); s.add(pg); L.mesh(L.box(2.2, 2.4, 0.16), L.mat(0xe9dcc0, { r: 0.85 }), 0, 1.2, 0, pg); L.mesh(L.box(2.5, 0.22, 0.3), L.mat(0x7d8794, { m: 0.8, r: 0.3 }), 0, 2.45, 0, pg);
    const r = (u, t) => { const k = ease(clamp(u * 1.4)); const d = 0.28 * clamp(k * 1.6 - 0.6); pg.position.y = 1.2 + 0.6 * (1 - clamp(k * 1.6)) - d; gel.userData.dent(d, 0.35, 1.1);
      cam(ctx, V(2.8, 2.1, 3.8), V(2.0, 1.6, 3.1), V(0, 1.3, 0), V(0, 1.2, 0), u, 46); };
    r.overlay = (g, W, H, u, T, t) => chip(g, W, H, '✗  ZU DICK: NUR EINE DELLE', '#e8202a', W / 2, H * 0.2, t * 2.5 - 0.2, 0.042);
    return r;
  },
  just_right(ctx) {
    const s = ctx.scene; studio(s, { top: '#1d6f73', mid: '#6fc0bb', bot: '#e6f4f2', fog: 0xd8eeec, target: V(0, 1.3, 0), fy: 0 }); const gel = L.makeGel(); s.add(gel); const sl = gel.userData.slit;
    const pg = new THREE.Group(); s.add(pg); const p = L.makePaper(2.2, 2.4, { lined: false }); p.position.y = 1.2; pg.add(p); L.mesh(L.box(2.5, 0.22, 0.22), L.mat(0x7d8794, { m: 0.8, r: 0.3 }), 0, 2.45, 0, pg);
    const sp = sparkle(s, 0xffe0a0, 0.8);
    const r = (u, t) => { const k = ease(clamp(u * 1.2)); const dep = 0.7 * clamp(k * 1.6 - 0.6); pg.position.y = 1.2 + 0.6 * (1 - clamp(k * 1.6)) - dep; sl.scale.set(2.2, Math.max(0.001, dep), 1); sl.position.y = 1.2 - dep / 2;
      sp.position.set(Math.sin(t * 4) * 1.0, 1.22, 0.05); sp.visible = dep > 0.01; sp.scale.setScalar(0.5 + Math.sin(t * 30) * 0.2);
      cam(ctx, V(2.4, 2.0, 3.9), V(1.6, 1.5, 3.2), V(0, 1.2, 0), V(0, 1.0, 0), u, 46); };
    r.overlay = (g, W, H, u, T, t) => chip(g, W, H, '✓  PERFEKT: ≈ 0,065 mm', '#20b35a', W / 2, H * 0.2, t * 2.5 - 0.4, 0.044);
    return r;
  },
  magazine(ctx) {
    const s = ctx.scene; studio(s, { top: '#e0703a', mid: '#f4b26a', bot: '#fbe6cc', fog: 0xf6dcc0, target: V(0, 0, 0), fy: 0, floor: 0xf7ecdc }); const m = L.makeMagazine(true); m.scale.setScalar(1.3); s.add(m); const fl = m.userData.flip, fp = m.userData.fp;
    const sp = sparkle(s, 0xffffff, 0.6);
    const r = (u, t) => { const k = ease(clamp(u * 1.3 - 0.1)); fl.rotation.z = k * Math.PI * 0.98; fp.userData.bend(Math.sin(k * Math.PI) * 0.8, 'wave');
      const a = fl.rotation.z; sp.position.set(Math.cos(a) * 1.3 * 1.3, 0.05 + Math.sin(a) * 1.3 * 1.3, 0.3); sp.visible = k > 0.15 && k < 0.85; sp.scale.setScalar(0.6 + 0.3 * Math.sin(t * 25));
      cam(ctx, V(0.6, 3.0, 2.4), V(0.2, 2.4, 1.6), V(0, 0.2, 0), V(0, 0.4, 0), u, 50); };
    r.overlay = (g, W, H, u, T, t) => chip(g, W, H, 'ZEITSCHRIFT: GENAU DIE DICKE', '#f08a2a', W / 2, H * 0.2, t * 2 - 0.2, 0.04);
    return r;
  },
  why_pain(ctx) {
    const s = ctx.scene; office(s); const b = benAtDesk(s); L.mesh(L.box(0.1, 0.02, 0.02), L.mat(0xd11a2a, { e: 0x7a0000 }), 0, -0.02, 0.07, b.arms[1].hand);
    const tears = []; for (let i = 0; i < 2; i++) { const d = L.mesh(L.sph(0.03, 12), L.mat(0x9fd8ff, { r: 0.05, phys: true, cc: 1, env: 1.2 }), (i ? 1 : -1) * 0.15, 0, 0.27, b.head); d.scale.set(0.8, 1.2, 0.8); tears.push(d); }
    return (u, t) => { b.expr('sad'); b.arms[1].sh.rotation.set(-1.9, 0, 0.5); b.arms[1].el.rotation.x = -1.0; b.look(0.6, 0.3); b.head.rotation.y = 0.3; b.head.rotation.z = Math.sin(t * 2) * 0.05;
      tears.forEach((d, i) => { const k = (t * 0.9 + i * 0.5) % 1; d.position.y = 0.02 - k * 0.3; d.visible = k < 0.9; });
      cam(ctx, V(-0.7, 1.6, 0.4), V(-0.45, 1.52, -0.1), V(0.1, 1.4, -1.5), V(0.1, 1.4, -1.5), u, 45); };
  },
  nerves(ctx) {
    const s = ctx.scene; studio(s, { top: '#04122e', mid: '#0c2f63', bot: '#1d5596', fog: 0x0c2f63, fy: -6, hi: 0.7, si: 1.4 }); const f = L.makeFinger(BEN.skin, { xray: true }); s.add(f.g); const nv = L.makeNerves(); f.g.add(nv);
    const r = (u, t) => { ctx.grade = 'night'; nv.userData.mat.emissiveIntensity = 1.3 + 0.9 * Math.max(0, Math.sin(t * 7)); orbit(ctx, V(0, 2.1, 0), 3.4, 2.6, 0.5, -0.4, 2.6, 2.4, u, 42); };
    r.overlay = (g, W, H, u, T, t) => chip(g, W, H, 'TAUSENDE NERVENENDEN', '#c9a400', W / 2, H * 0.17, t * 2 - 0.3, 0.042);
    return r;
  },
  shallow_cut(ctx) {
    const s = ctx.scene; studio(s, { target: V(0, -0.4, 0.6), fy: -2.5, top: '#2a5fae', mid: '#7aa8e0' }); const sk = L.makeSkinBlock(); s.add(sk); sk.userData.notch.scale.y = 0.27;
    const ends = sk.userData.ends; const sps = ends.slice(2, 4).map(e => { const sp = sparkle(s, 0xffe066, 0.5); sp.position.copy(e.position).add(V(0, 0, 0.05)); return sp; });
    const d = L.mesh(L.sph(0.05, 16), L.mat(0xb3121b, { r: 0.08, phys: true, cc: 1 }), 0.02, 0.03, 1.0, s);
    const r = (u, t) => { const fl = Math.max(0, Math.sin(t * 14)); sk.userData.nm.emissiveIntensity = 0.6 + 1.6 * fl; sps.forEach((sp, i) => { sp.scale.setScalar(0.25 + 0.45 * Math.max(0, Math.sin(t * 14 + i))); }); ends.forEach(e => e.scale.setScalar(1 + 0.6 * fl));
      cam(ctx, V(1.2, 0.2, 3.4), V(0.5, -0.05, 2.5), V(0, -0.35, 1.0), V(0, -0.3, 1.1), u, 42); };
    r.overlay = (g, W, H, u, T, t) => chip(g, W, H, 'NERVEN LIEGEN OFFEN', '#e8202a', W / 2, H * 0.17, t * 2 - 0.4);
    return r;
  },
  guy_pain(ctx) {
    const s = ctx.scene; office(s); const b = guy(s, BEN, 0, 0, -1.5, 0); L.mesh(L.box(0.1, 0.02, 0.02), L.mat(0xd11a2a, { e: 0x7a0000 }), 0, -0.02, 0.07, b.arms[1].hand); const sw = sweat(b);
    const r = (u, t) => { b.pose('stand'); talk(b, t, 'scared'); b.arms[1].sh.rotation.set(-2.0, 0, 0.5 + Math.sin(t * 20) * 0.25); b.arms[1].el.rotation.x = -0.6 + Math.sin(t * 25) * 0.3; b.arms[0].sh.rotation.set(-0.3, 0, -0.5);
      b.g.position.y = Math.abs(Math.sin(t * 8)) * 0.1; b.legs.forEach((l, i) => l.hip.rotation.x = Math.sin(t * 16 + i * Math.PI) * 0.3); tremble(b, t, 3); sw(t); ctx.shake = 0.35;
      cam(ctx, V(0.6, 1.7, 0.9), V(0.35, 1.6, 0.4), V(0, 1.6, -1.5), V(0.15, 1.7, -1.5), u, 50); };
    r.overlay = (g, W, H, u, T, t) => bolts(g, W, H, T, 0.62, 0.3, 5, 1);
    return r;
  },
  paper_knife(ctx) {
    const s = ctx.scene; studio(s, { target: V(0, 0, 0), fy: -2.5 }); const kn = L.makePaperKnife(); const g = new THREE.Group(); s.add(g); g.add(kn); kn.position.x = -0.75; kn.scale.setScalar(1.15);
    const sps = []; for (let i = 0; i < 6; i++) sps.push(sparkle(s, 0xffffff, 0.3));
    const r = (u, t) => { g.rotation.set(0.25, -0.6 + t * 0.9, -0.2 + Math.sin(t * 2) * 0.1); g.position.y = Math.sin(t * 2.5) * 0.05; sps.forEach((sp, i) => { const a = t * 1.5 + i; sp.position.set(Math.cos(a) * 1.4, Math.sin(a * 1.3) * 0.6, Math.sin(a) * 0.6); sp.scale.setScalar(0.15 + 0.2 * Math.max(0, Math.sin(t * 6 + i * 2))); });
      cam(ctx, V(0, 0.4, 8.0), V(0, 0.25, 6.6), V(0, 0, 0), V(0, 0, 0), u, 45); };
    r.overlay = (g2, W, H, u, T, t) => chip(g2, W, H, 'EIN MESSER AUS PAPIER', '#2a8fd6', W / 2, H * 0.2, t * 2 - 0.2);
    return r;
  },
  chicken_cut(ctx) {
    const s = ctx.scene; studio(s, { target: V(0, 0.5, 0), fy: -2, top: '#2f7fd6' }); s.add(L.makeBoard()); const ds = L.makeDrumstick(); ds.position.y = 0.5; s.add(ds); const [h0, h1] = ds.userData.halves;
    const kn = L.makePaperKnife(); kn.rotation.y = Math.PI / 2; s.add(kn);
    const r = (u, t) => { const k = clamp((u - 0.12) / 0.45); kn.position.set(0, 1.75 - 1.6 * ease(k), 1.1 + Math.sin(t * 14) * 0.15 * (k > 0 && k < 1 ? 1 : 0)); const sep = ease(clamp((u - 0.6) / 0.3)); h0.position.x = 0.35 * sep; h0.rotation.z = -0.25 * sep; h0.position.y = -0.05 * sep;
      if (u > 0.58 && u < 0.68) ctx.flash = 0.35;
      cam(ctx, V(3.4, 2.6, 5.6), V(2.6, 2.0, 4.6), V(-0.3, 0.55, 0), V(-0.3, 0.5, 0), u, 46); };
    r.overlay = (g, W, H, u, T, t) => { if (u > 0.6) stamp2d(g, W, H, 'ZACK!', (u - 0.6) * 4, '#20b35a', 0.24, 0.1); };
    return r;
  },
  finale_title(ctx) {
    const s = ctx.scene; office(s, { si: 2.6, sun: 0xffd9a0 }); const b = benAtDesk(s, { expr: 'grin' }); const ba = L.makeBandaid(); b.arms[1].hand.add(ba); ba.position.set(0, -0.03, 0.08);
    const p = holdPaper(b, 0);
    const r = (u, t) => { ctx.grade = 'warm'; ctx.flash = clamp(1 - t * 4) * 0.6; b.arms[1].sh.rotation.set(-1.9, 0, 0.4); b.arms[1].el.rotation.x = -1.2; b.arms[0].sh.rotation.set(-1.3, 0.3, -0.2); b.look(0, 0);
      cam(ctx, V(0.3, 1.5, 0.9), V(0.15, 1.45, 0.4), V(0, 1.4, -1.5), V(0, 1.42, -1.5), u, 50); };
    r.overlay = (g, W, H, u, T, t) => { bigText(g, 'PAPIERSCHNITT', W / 2, H * 0.17, W * 0.12, t / 1.2); bigText(g, 'ECHTE FORSCHUNG', W / 2, H * 0.245, W * 0.07, t / 1.2 - 0.15);
      if (t > 0.9) { g.save(); g.globalAlpha = clamp((t - 0.9) * 3); g.font = `800 ${W * 0.04}px "Inter Display"`; g.textAlign = 'center'; g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 12; g.fillText('TECHNISCHE UNIVERSITÄT DÄNEMARK · 2024', W / 2, H * 0.295); g.restore(); } };
    return r;
  },
  question(ctx) {
    const s = ctx.scene; office(s, { si: 2.6, sun: 0xffd9a0 }); const b = guy(s, BEN, 0.25, 0, -1.4, -0.15); const ba = L.makeBandaid(); b.arms[1].hand.add(ba); ba.position.set(0, -0.03, 0.08);
    const r = (u, t) => { b.pose('stand'); b.expr('grin'); b.arms[1].sh.rotation.set(0, 0, 2.5 + Math.sin(t * 7) * 0.25); b.arms[1].el.rotation.z = 0.4; b.look(0, 0); ctx.grade = 'warm';
      cam(ctx, V(0.1, 1.45, 1.6), V(0.15, 1.5, 1.2), V(0.15, 1.75, -1.5), V(0.15, 1.8, -1.5), u, 52); };
    r.overlay = (g, W, H, u, T, t) => {
      const k = clamp(t * 3); if (k <= 0) return; const e = 1 - Math.pow(1 - k, 3);
      g.save(); g.globalAlpha = e; g.fillStyle = 'rgba(10,12,30,0.55)'; g.beginPath(); g.roundRect(W * 0.06, H * 0.1, W * 0.88, H * 0.27, W * 0.05); g.fill(); g.restore();
      g.save(); g.translate(W / 2, H * 0.165); g.scale(0.8 + 0.2 * e, 0.8 + 0.2 * e); g.globalAlpha = e; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      const line = (txt, y, size, col) => { g.font = `900 ${size}px "Inter Display"`; g.lineWidth = size * 0.18; g.strokeStyle = '#000'; g.strokeText(txt, 0, y); g.fillStyle = col; g.fillText(txt, 0, y); };
      line('WAS WAR DEIN', 0, W * 0.072, '#fff'); line('SCHLIMMSTER', W * 0.095, W * 0.085, '#fff'); line('PAPIERSCHNITT?', W * 0.2, W * 0.095, '#FFD60A'); g.restore();
      const b2 = clamp(t * 3 - 1.2); if (b2 > 0) { const pulse = 1 + 0.05 * Math.sin(T * 8); g.save(); g.translate(W / 2, H * 0.43); g.scale(b2 * pulse, b2 * pulse); g.fillStyle = '#e8202a'; g.strokeStyle = '#000'; g.lineWidth = W * 0.008; g.beginPath(); g.roundRect(-W * 0.36, -W * 0.06, W * 0.72, W * 0.12, W * 0.06); g.fill(); g.stroke(); g.fillStyle = '#fff'; g.font = `900 ${W * 0.045}px "Inter Display"`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SCHREIB ES IN DIE KOMMENTARE', 0, 4); g.restore(); }
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
