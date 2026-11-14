import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { noise3 } from '../../engine/geometry/noise';
import { len3, sdEllipsoid, segDist, smax, smin, surfaceNets } from '../../engine/geometry/surfaceNets';
import { hash2 } from '../../engine/math';
import { HEART, toWorld, vessel } from './anatomy';

/** World space, 1 = 1 dm. The torso stands on a plinth at y = 0 and faces +z. */
export const BODY = {
  plinthTop: 0,
  chestFront: 1.08,
};

type P3 = [number, number, number];
const v3 = (p: readonly number[]) => new THREE.Vector3(p[0], p[1], p[2]);

// ---------------------------------------------------------------------------------------------
// Torso (anatomical bust: no head, arms cut above the elbow)
/** `full` = no flat cuts at hips/neck/arms (used by the full-figure gut episode). */
export function sdTorso(x: number, y: number, z: number, full = false) {
  const ax = Math.abs(x);
  let d = sdEllipsoid(x, y, z, [0, 4.15, 0.02], [1.5, 1.45, 1.0]);
  d = smin(d, sdEllipsoid(x, y, z, [0, 2.35, 0.0], [1.22, 1.7, 0.84]), 0.6);
  d = smin(d, sdEllipsoid(x, y, z, [0, 0.8, -0.04], [1.32, 1.05, 0.88]), 0.5);
  // shoulders, trapezius, deltoids
  d = smin(d, segDist(ax, y, z, [0.2, 5.05, -0.12], [1.55, 5.1, -0.1]) - 0.5, 0.45);
  d = smin(d, sdEllipsoid(ax, y, z, [1.9, 4.85, -0.05], [0.55, 0.62, 0.55]), 0.3);
  let arm = segDist(ax, y, z, [2.0, 4.6, -0.06], [2.22, 3.2, -0.12]) - 0.46;
  if (!full) arm = smax(arm, 3.45 - y, 0.04);
  d = smin(d, arm, 0.18);
  // neck
  d = smin(d, segDist(x, y, z, [0, 5.0, -0.12], [0, 6.4, -0.02]) - 0.5, 0.35);
  // pectorals
  d = smin(d, sdEllipsoid(ax, y, z, [0.72, 4.5, 0.62], [0.72, 0.48, 0.42]), 0.25);
  // clavicle ridge
  d = smin(d, segDist(ax, y, z, [0.18, 5.1, 0.62], [1.45, 5.3, 0.05]) - 0.08, 0.2);
  // sternal groove & spine groove
  d = smax(d, -(segDist(x, y, z, [0, 3.6, 1.12], [0, 4.9, 0.98]) - 0.07), 0.12);
  d = smax(d, -(segDist(x, y, z, [0, 1.0, -1.06], [0, 5.3, -1.12]) - 0.08), 0.12);
  // abdominal detail (rectus abdominis segments, very subtle)
  d += 0.012 * Math.exp(-(((ax - 0.05) / 0.06) ** 2)) * (z > 0.5 ? 1 : 0);
  d += 0.004 * noise3(x * 3, y * 3, z * 3);
  // navel
  d = smax(d, -(len3(x, y - 2.05, z - 0.86) - 0.045), 0.05);
  if (full) return d;
  // flat cuts: hips & neck
  d = smax(d, 0.02 - y, 0.03);
  d = smax(d, y - 6.3, 0.03);
  return d;
}

let _torso: THREE.BufferGeometry | null = null;
export const torsoGeometry = () => (_torso ??= surfaceNets(sdTorso, { min: [-2.85, -0.1, -1.4], max: [2.85, 6.45, 1.5], step: 0.045, project: 1 }));

// ---------------------------------------------------------------------------------------------
// Lungs
const HC = HEART.position;
export function sdLungs(x: number, y: number, z: number) {
  let r = sdEllipsoid(x, y, z, [-0.82, 4.15, -0.1], [0.6, 1.2, 0.8]);
  r = smin(r, sdEllipsoid(x, y, z, [-0.72, 5.0, -0.12], [0.36, 0.42, 0.36]), 0.25);
  r = smax(r, -(len3(x + 0.85, y - 2.25, z) - 0.98), 0.15);
  let l = sdEllipsoid(x, y, z, [0.92, 4.05, -0.15], [0.55, 1.16, 0.78]);
  l = smin(l, sdEllipsoid(x, y, z, [0.78, 4.98, -0.14], [0.33, 0.4, 0.34]), 0.25);
  l = smax(l, -(len3(x - 0.9, y - 2.2, z) - 0.95), 0.15);
  let d = Math.min(r, l);
  // mediastinum: heart & great vessels sit between the lungs (cardiac notch on the left)
  d = smax(d, -sdEllipsoid(x, y, z, [HC.x + 0.05, HC.y - 0.05, HC.z], [0.66, 0.62, 0.62]), 0.12);
  d = smax(d, -(segDist(x, y, z, [0.05, 4.3, -0.05], [0.0, 6.0, -0.2]) - 0.3), 0.1);
  // horizontal/oblique fissures as subtle grooves
  d += 0.01 * Math.exp(-(((y - 4.3 + 0.35 * (z + 0.1)) / 0.03) ** 2));
  d += 0.006 * noise3(x * 6, y * 6, z * 6);
  return d;
}
let _lungs: THREE.BufferGeometry | null = null;
export const lungGeometry = () => (_lungs ??= surfaceNets(sdLungs, { min: [-1.55, 2.6, -1.05], max: [1.6, 5.55, 0.8], step: 0.035, project: 1 }));

// ---------------------------------------------------------------------------------------------
// Skeleton: ribs, costal cartilage, sternum, clavicles, spine
/** pull a point towards the body axis until it lies at least `margin` beneath the skin */
function underSkin(p: THREE.Vector3, margin: number, full = false) {
  for (let i = 0; i < 60; i++) {
    const d = sdTorso(p.x, p.y, p.z, full);
    if (d <= -margin) break;
    const dx = p.x,
      dz = p.z + 0.1;
    const l = Math.sqrt(dx * dx + dz * dz) || 1;
    const step = Math.max(0.004, d + margin) * 0.7;
    p.x -= (dx / l) * step;
    p.z -= (dz / l) * step;
  }
  return p;
}

/** `spineFrom` skips the lowest vertebrae (replaced by a sacrum in the full figure). */
export function skeletonGeometry(spineFrom = 0, full = false) {
  const bone: THREE.BufferGeometry[] = [];
  const cart: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 10; i++) {
    const g = Math.min(1, (i + 1) / 6);
    const a = 0.72 + 0.66 * g - 0.08 * Math.max(0, i - 6) / 3;
    const b = 0.72 + 0.16 * g;
    const yBack = 5.18 - i * 0.235;
    const drop = 0.48 + i * 0.05;
    const tEnd = i < 7 ? 0.82 : 0.62 - (i - 7) * 0.08; // floating ribs end early
    for (const side of [-1, 1]) {
      const pts: THREE.Vector3[] = [];
      const cpts: THREE.Vector3[] = [];
      for (let k = 0; k <= 24; k++) {
        const u = (k / 24) * tEnd;
        const th = 0.04 + u * Math.PI;
        const y = yBack + 0.05 * Math.sin(u * 4) - drop * u * u;
        pts.push(underSkin(new THREE.Vector3(side * a * Math.sin(th), y, -b * Math.cos(th) - 0.08), 0.12, full));
      }
      if (i < 7) {
        const p0 = pts[pts.length - 1];
        const ster = underSkin(new THREE.Vector3(side * 0.13, 5.0 - i * 0.2, 0.8), 0.1, full);
        cpts.push(p0, underSkin(p0.clone().lerp(ster, 0.5).add(new THREE.Vector3(0, -0.05, 0.05)), 0.1, full), ster);
        cart.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cpts), 12, 0.034, 6));
      }
      bone.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.045 - i * 0.0015, 7));
    }
  }
  // sternum (manubrium + body + xiphoid)
  const st = new THREE.CapsuleGeometry(0.13, 1.25, 4, 10);
  st.scale(1, 1, 0.35);
  st.rotateX(-0.12);
  st.translate(0, 4.32, 0.76);
  bone.push(st);
  // clavicles
  for (const side of [-1, 1]) {
    const c = new THREE.CatmullRomCurve3([[side * 0.16, 5.1, 0.62], [side * 0.6, 5.18, 0.5], [side * 1.1, 5.26, 0.24], [side * 1.45, 5.3, -0.02]].map((q) => underSkin(v3(q), 0.08, full)), false, 'centripetal');
    bone.push(new THREE.TubeGeometry(c, 24, 0.055, 7));
  }
  // spine: vertebral bodies + spinous processes
  for (let i = spineFrom; i < 26; i++) {
    const y = 0.35 + i * 0.235;
    const zc = -0.62 - 0.12 * Math.sin(((y - 0.3) / 6) * Math.PI);
    const body = new THREE.CylinderGeometry(0.16, 0.17, 0.17, 12);
    body.translate(0, y, zc);
    bone.push(body);
    const proc = new THREE.BoxGeometry(0.06, 0.08, 0.3);
    proc.rotateX(0.5);
    proc.translate(0, y - 0.04, zc - 0.28);
    bone.push(proc);
  }
  return { bone: mergeGeometries(bone.map((g) => g.toNonIndexed())), cartilage: mergeGeometries(cart.map((g) => g.toNonIndexed())) };
}

// ---------------------------------------------------------------------------------------------
// Vessel networks (world space)
export interface Branch {
  curve: THREE.CatmullRomCurve3;
  r: number;
  venous: boolean;
  /** depth in the tree: 0 = trunk */
  level: number;
}

/** deterministic branching tree inside one lung */
function lungTree(root: P3, dir: THREE.Vector3, venous: boolean, seed: number, side: number): Branch[] {
  const out: Branch[] = [];
  const grow = (p: THREE.Vector3, d: THREE.Vector3, len: number, r: number, level: number, s: number) => {
    if (level > 3) return;
    const end = p.clone().addScaledVector(d, len);
    const mid = p.clone().lerp(end, 0.5).add(new THREE.Vector3(hash2(s, 1) - 0.5, hash2(s, 2) - 0.5, hash2(s, 3) - 0.5).multiplyScalar(len * 0.25));
    out.push({ curve: new THREE.CatmullRomCurve3([p, mid, end]), r, venous, level });
    const n = level < 1 ? 3 : 2;
    for (let k = 0; k < n; k++) {
      const spread = 0.75;
      const a = (k / n) * Math.PI * 2 + hash2(s, 10 + k) * 1.2;
      const nd = d.clone().add(new THREE.Vector3(Math.cos(a) * spread * 0.6 + side * 0.25, Math.sin(a) * spread, Math.cos(a + 1) * spread * 0.5)).normalize();
      grow(end, nd, len * 0.68, r * 0.66, level + 1, s * 7 + k + 1);
    }
  };
  grow(v3(root), dir.clone().normalize(), 0.42, venous ? 0.045 : 0.05, 0, seed);
  return out;
}

export function lungVessels(): Branch[] {
  const rpa = vessel('pulmonaryR').pts;
  const lpa = vessel('pulmonaryL').pts;
  const ends = {
    rpa: toWorld(rpa[rpa.length - 1]),
    lpa: toWorld(lpa[lpa.length - 1]),
    pvLS: toWorld(vessel('pvLS').pts[0]),
    pvLI: toWorld(vessel('pvLI').pts[0]),
    pvRS: toWorld(vessel('pvRS').pts[0]),
    pvRI: toWorld(vessel('pvRI').pts[0]),
  };
  return [
    ...lungTree(ends.rpa, new THREE.Vector3(-1, 0.15, 0), true, 3, -1),
    ...lungTree(ends.lpa, new THREE.Vector3(1, 0.2, 0), true, 5, 1),
    ...lungTree(ends.pvRS, new THREE.Vector3(-1, 0.45, 0.1), false, 7, -1),
    ...lungTree(ends.pvRI, new THREE.Vector3(-1, -0.5, 0.1), false, 11, -1),
    ...lungTree(ends.pvLS, new THREE.Vector3(1, 0.45, 0.1), false, 13, 1),
    ...lungTree(ends.pvLI, new THREE.Vector3(1, -0.5, 0.1), false, 17, 1),
  ];
}

/** systemic arteries (red) and veins (blue) of the trunk, connected to the heart's great vessels */
export function bodyVessels(): Branch[] {
  const W = (p: readonly number[]) => v3(toWorld(p));
  const last = (n: string) => vessel(n).pts[vessel(n).pts.length - 1];
  const first = (n: string) => vessel(n).pts[0];
  const bc = W(last('brachiocephalic'));
  const lcc = W(last('carotidL'));
  const lsc = W(last('subclavianL'));
  const desc = W(last('aorta'));
  const svc = W(first('svc'));
  const ivc = W(first('ivc'));
  const A = (pts: THREE.Vector3[], r: number, level = 0): Branch => ({ curve: new THREE.CatmullRomCurve3(pts, false, 'centripetal'), r, venous: false, level });
  const Vn = (pts: THREE.Vector3[], r: number, level = 0): Branch => ({ curve: new THREE.CatmullRomCurve3(pts, false, 'centripetal'), r, venous: true, level });
  const p = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  return [
    // arteries
    A([bc, p(-0.2, 5.15, 0.05), p(-0.28, 5.7, 0.05), p(-0.3, 6.35, 0.08)], 0.04), // right common carotid
    A([bc, p(-0.45, 5.05, 0.05), p(-1.2, 5.12, -0.02), p(-1.9, 4.75, -0.05), p(-2.15, 3.5, -0.1)], 0.04), // right subclavian → brachial
    A([lcc, p(0.26, 5.6, 0.05), p(0.3, 6.35, 0.08)], 0.038),
    A([lsc, p(0.6, 5.1, -0.02), p(1.25, 5.12, -0.02), p(1.9, 4.75, -0.05), p(2.15, 3.5, -0.1)], 0.04),
    A([desc, p(0.06, 2.6, -0.58), p(0.0, 1.5, -0.52), p(0.0, 1.0, -0.48)], 0.09),
    A([p(0.0, 1.05, -0.48), p(0.4, 0.6, -0.3), p(0.62, 0.05, -0.15)], 0.06, 1),
    A([p(0.0, 1.05, -0.48), p(-0.4, 0.6, -0.3), p(-0.62, 0.05, -0.15)], 0.06, 1),
    A([p(0.03, 2.2, -0.55), p(0.4, 2.15, -0.55), p(0.72, 2.1, -0.6)], 0.035, 1), // renal
    A([p(0.03, 2.2, -0.55), p(-0.4, 2.15, -0.55), p(-0.72, 2.1, -0.6)], 0.035, 1),
    A([p(0.04, 2.75, -0.55), p(0.1, 2.6, -0.1), p(0.15, 2.0, 0.3), p(0.1, 1.4, 0.45)], 0.035, 1), // mesenteric
    // veins
    Vn([p(-0.35, 6.35, 0.0), p(-0.36, 5.6, -0.02), p(-0.3, 5.1, 0.0), svc], 0.05), // right jugular → SVC
    Vn([p(0.36, 6.35, 0.0), p(0.36, 5.6, -0.02), p(0.15, 5.1, 0.05), p(-0.2, 4.95, 0.05), svc], 0.045), // left jugular / brachiocephalic vein
    Vn([p(-2.08, 3.5, 0.02), p(-1.85, 4.7, 0.06), p(-1.1, 5.05, 0.08), p(-0.4, 4.98, 0.05), svc], 0.045),
    Vn([p(2.08, 3.5, 0.02), p(1.85, 4.7, 0.06), p(1.1, 5.05, 0.08), p(0.3, 5.0, 0.08), p(-0.2, 4.95, 0.05)], 0.045, 1),
    Vn([p(-0.55, 0.05, -0.12), p(-0.38, 0.6, -0.28), p(-0.16, 1.05, -0.42), p(-0.2, 2.2, -0.42), p(-0.25, 2.9, -0.3), ivc], 0.085),
    Vn([p(0.55, 0.05, -0.12), p(0.36, 0.6, -0.3), p(-0.16, 1.05, -0.42)], 0.06, 1),
  ];
}

export function branchGeometry(branches: Branch[], venous: boolean) {
  const g = branches.filter((b) => b.venous === venous).map((b) => new THREE.TubeGeometry(b.curve, Math.max(12, Math.round(b.curve.getLength() * 30)), b.r, 8).toNonIndexed());
  return g.length ? mergeGeometries(g) : new THREE.BufferGeometry();
}
