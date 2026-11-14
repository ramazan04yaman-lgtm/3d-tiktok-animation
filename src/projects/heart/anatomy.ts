import * as THREE from 'three';
import { noise3 } from '../../engine/geometry/noise';
import { len3, sdEllipsoid, sdTube, segDist, smax, smin } from '../../engine/geometry/surfaceNets';
import { clamp, smoothstep } from '../../engine/math';

/**
 * Anatomy of episode 4. Units: 1 = 1 dm (10 cm).
 *
 * HEART LOCAL FRAME (used for the heart mesh, valves and blood paths):
 *   +y = towards the base (great vessels), −y = apex
 *   +x = the patient's LEFT side (left ventricle / left atrium), −x = the patient's right side
 *   +z = anterior (towards the sternum)
 * The local plane z ≈ CUT_Z is a four-chamber plane: it cuts RA, RV, LA and LV, both AV valves,
 * the ascending aorta, the venae cavae and the left pulmonary veins lengthwise.
 * In the torso the heart is rotated so the apex points left, down and forward (as in a real chest).
 */
export const HEART = {
  position: new THREE.Vector3(0.22, 3.92, 0.32),
  rotX: -0.35,
  rotZ: 0.62,
  /** local z of the section plane */
  cutZ: -0.05,
};

export const heartMatrix = (() => {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), HEART.rotZ).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), HEART.rotX));
  return new THREE.Matrix4().compose(HEART.position, q, new THREE.Vector3(1, 1, 1));
})();
export const heartQuat = new THREE.Quaternion().setFromRotationMatrix(heartMatrix);
export const toWorld = (p: readonly number[]): [number, number, number] => {
  const v = new THREE.Vector3(p[0], p[1], p[2]).applyMatrix4(heartMatrix);
  return [v.x, v.y, v.z];
};
/** world-space normal of the four-chamber plane (pointing to the viewer side) */
export const cutNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(heartQuat).normalize();
/** plane offset of the four-chamber cut along cutNormal */
export const cutOffset = (localZ = HEART.cutZ) => new THREE.Vector3(0, 0, localZ).applyMatrix4(heartMatrix).dot(cutNormal);

// ---------------------------------------------------------------------------------------------
// Chambers (cavity ellipsoids) & walls
export const LV = { c: [0.17, -0.13, -0.02], r: [0.165, 0.4, 0.16], wall: 0.11 } as const; // wall ≈ 1.1 cm
export const RV = { c: [-0.2, -0.06, 0.02], r: [0.15, 0.33, 0.19], wall: 0.05 } as const; // wall ≈ 0.5 cm
export const LA = { c: [0.16, 0.42, -0.06], r: [0.17, 0.13, 0.15], wall: 0.035 } as const;
export const RA = { c: [-0.27, 0.38, -0.02], r: [0.19, 0.17, 0.16], wall: 0.035 } as const;
export const RVOT = { a: [-0.17, 0.0, 0.08], b: [-0.03, 0.31, 0.15] } as const;
export const LVOT = { a: [0.1, 0.02, 0.0], b: [0.02, 0.31, 0.0] } as const;
export const AV_PLANE = 0.27;

/** valve annuli (local) */
export const VALVES = {
  mitral: { c: [0.165, 0.27, -0.05], r: 0.1 },
  tricuspid: { c: [-0.255, 0.24, 0.0], r: 0.11 },
  aortic: { c: [0.02, 0.36, 0.0], r: 0.1, axis: [0, 1, 0.0] },
  pulmonary: { c: [0.0, 0.37, 0.172], r: 0.092, axis: [0.3, 0.92, 0.25] },
} as const;

// Papillary muscles (base → tip)
export const PAPILLARY = {
  lvAnt: { a: [0.07, -0.38, 0.06], b: [0.11, -0.13, 0.05] },
  lvPost: { a: [0.28, -0.38, -0.08], b: [0.24, -0.13, -0.07] },
  rv: { a: [-0.3, -0.28, 0.06], b: [-0.27, -0.08, 0.04] },
} as const;

// ---------------------------------------------------------------------------------------------
// Great vessels (centre lines, local frame)
type P3 = readonly [number, number, number];
export function smoothPath(pts: readonly P3[], perSeg = 6): P3[] {
  const c = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, 'centripetal');
  return c.getPoints(perSeg * (pts.length - 1)).map((v) => [v.x, v.y, v.z] as P3);
}

export interface Vessel {
  name: string;
  pts: P3[];
  r0: number;
  r1: number;
  wall: number;
  /** true = carries oxygen-poor blood (blue colour code) */
  venous: boolean;
}

const V = (name: string, pts: P3[], r0: number, r1: number, wall: number, venous: boolean): Vessel => ({ name, pts: smoothPath(pts, 4), r0, r1, wall, venous });

/** axis-aligned bounds of a polyline, expanded by r → cheap lower bound for tube distances */
interface Box { lo: number[]; hi: number[] }
function boxOf(pts: readonly P3[], r: number): Box {
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (const p of pts) for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], p[i] - r); hi[i] = Math.max(hi[i], p[i] + r); }
  return { lo, hi };
}
function boxDist(x: number, y: number, z: number, b: Box) {
  const dx = Math.max(b.lo[0] - x, 0, x - b.hi[0]);
  const dy = Math.max(b.lo[1] - y, 0, y - b.hi[1]);
  const dz = Math.max(b.lo[2] - z, 0, z - b.hi[2]);
  return len3(dx, dy, dz);
}

const heartInv = heartMatrix.clone().invert();
/** local point shifted by a WORLD offset (vessels outside the heart follow the body axes) */
const W = (p: P3, dx: number, dy: number, dz: number): P3 => {
  const v = new THREE.Vector3(...p).applyMatrix4(heartMatrix).add(new THREE.Vector3(dx, dy, dz)).applyMatrix4(heartInv);
  return [v.x, v.y, v.z];
};
const up = (p: P3, d: number) => W(p, 0, d, 0);

const SVC_E: P3 = [-0.32, 0.62, -0.03];
const IVC_E: P3 = [-0.37, 0.1, -0.05];
const AO_D: P3 = [0.41, 0.72, -0.43];
const PA_B: P3 = [0.24, 0.73, 0.1];
const LA_L: P3 = [0.3, 0.47, -0.05];
const LA_LI: P3 = [0.3, 0.38, -0.05];
const LA_R: P3 = [0.04, 0.48, -0.1];
const LA_RI: P3 = [0.04, 0.4, -0.1];

export const VESSELS: Vessel[] = [
  V('aorta', [[0.02, 0.24, 0.0], [0.02, 0.45, 0.0], [0.0, 0.72, -0.01], [0.06, 0.93, -0.07], [0.2, 1.01, -0.19], [0.34, 0.96, -0.31], [0.42, 0.8, -0.42], W(AO_D, 0, -0.32, -0.02), W(AO_D, 0, -0.9, -0.04), W(AO_D, 0, -1.55, -0.05)], 0.135, 0.105, 0.032, false),
  V('brachiocephalic', [[0.08, 0.97, -0.1], up([0.06, 1.0, -0.1], 0.22), up([0.05, 1.0, -0.1], 0.46)], 0.055, 0.05, 0.022, false),
  V('carotidL', [[0.2, 1.03, -0.2], up([0.2, 1.05, -0.2], 0.2), up([0.2, 1.05, -0.2], 0.42)], 0.042, 0.04, 0.02, false),
  V('subclavianL', [[0.31, 1.0, -0.29], up([0.32, 1.02, -0.29], 0.18), W([0.32, 1.02, -0.29], 0.12, 0.38, 0)], 0.046, 0.044, 0.02, false),
  V('pulmonaryTrunk', [[-0.02, 0.3, 0.16], [0.04, 0.48, 0.21], [0.14, 0.63, 0.2], PA_B], 0.12, 0.11, 0.03, true),
  V('pulmonaryL', [PA_B, W(PA_B, 0.22, 0.04, -0.12), W(PA_B, 0.45, 0.06, -0.24), W(PA_B, 0.68, 0.04, -0.32)], 0.09, 0.078, 0.026, true),
  V('pulmonaryR', [PA_B, [0.12, 0.72, -0.2], W(PA_B, -0.35, 0.0, -0.42), W(PA_B, -0.7, -0.02, -0.46), W(PA_B, -1.0, -0.04, -0.46)], 0.09, 0.078, 0.026, true),
  V('svc', [up(SVC_E, 0.66), up(SVC_E, 0.32), SVC_E, [-0.3, 0.5, -0.02]], 0.088, 0.088, 0.028, true),
  V('ivc', [W(IVC_E, 0, -0.95, -0.05), W(IVC_E, 0, -0.5, -0.03), W(IVC_E, 0, -0.18, -0.01), [-0.33, 0.25, -0.03]], 0.1, 0.1, 0.028, true),
  V('pvLS', [W(LA_L, 0.62, 0.12, -0.24), W(LA_L, 0.36, 0.06, -0.14), LA_L], 0.058, 0.058, 0.024, false),
  V('pvLI', [W(LA_LI, 0.62, -0.1, -0.24), W(LA_LI, 0.36, -0.06, -0.14), LA_LI], 0.058, 0.058, 0.024, false),
  V('pvRS', [W(LA_R, -0.95, 0.12, -0.36), W(LA_R, -0.55, 0.08, -0.3), W(LA_R, -0.2, 0.03, -0.14), LA_R], 0.058, 0.058, 0.024, false),
  V('pvRI', [W(LA_RI, -0.95, -0.1, -0.36), W(LA_RI, -0.55, -0.08, -0.3), W(LA_RI, -0.2, -0.03, -0.14), LA_RI], 0.058, 0.058, 0.024, false),
];
export const vessel = (name: string) => VESSELS.find((v) => v.name === name)!;

/** extended centre line so the lumen opens at the cut ends of a vessel */
function extended(v: Vessel): P3[] {
  const p = v.pts;
  const n = p.length;
  const ext = (a: P3, b: P3): P3 => [a[0] + (a[0] - b[0]) * 2, a[1] + (a[1] - b[1]) * 2, a[2] + (a[2] - b[2]) * 2];
  return [ext(p[0], p[1]), ...p, ext(p[n - 1], p[n - 2])];
}
const LUMENS = VESSELS.map((v) => {
  const pts = extended(v);
  return { v, pts, box: boxOf(pts, Math.max(v.r0, v.r1) - v.wall) };
});
const VBOX = VESSELS.map((v) => boxOf(v.pts, Math.max(v.r0, v.r1)));

// ---------------------------------------------------------------------------------------------
// SDF parts
const add = (r: readonly number[], d: number) => [r[0] + d, r[1] + d, r[2] + d];
const LV_OUT = add(LV.r, LV.wall);
const RV_OUT = add(RV.r, RV.wall);
const LA_OUT = add(LA.r, LA.wall);
const RA_OUT = add(RA.r, RA.wall);

export function sdMuscle(x: number, y: number, z: number) {
  const lv = sdEllipsoid(x, y, z, LV.c, LV_OUT);
  const rv = smin(sdEllipsoid(x, y, z, RV.c, RV_OUT), segDist(x, y, z, RVOT.a, RVOT.b) - 0.125, 0.08);
  const ventricles = smin(lv, rv, 0.1);
  let atria = smin(sdEllipsoid(x, y, z, LA.c, LA_OUT), sdEllipsoid(x, y, z, RA.c, RA_OUT), 0.07);
  // auricles (atrial appendages) — the small "ears" in front of the atria
  atria = smin(atria, sdEllipsoid(x, y, z, [-0.17, 0.5, 0.17], [0.13, 0.07, 0.075]), 0.05);
  atria = smin(atria, sdEllipsoid(x, y, z, [0.35, 0.55, 0.11], [0.12, 0.06, 0.065]), 0.05);
  let m = smin(ventricles, atria, 0.08);
  m += 0.0035 * noise3(x * 22, y * 22, z * 22);
  return m;
}

export function sdVessels(x: number, y: number, z: number) {
  let d = 1e9;
  for (let i = 0; i < VESSELS.length; i++) {
    if (boxDist(x, y, z, VBOX[i]) > d + 0.035) continue;
    const v = VESSELS[i];
    d = smin(d, sdTube(x, y, z, v.pts, v.r0, v.r1), 0.035);
  }
  return d;
}

export function sdCavities(x: number, y: number, z: number) {
  // ventricles with trabeculae (noise) and papillary muscles
  const trab = 0.011 * noise3(x * 34, y * 12, z * 34);
  let lv = sdEllipsoid(x, y, z, LV.c, LV.r) + (y < 0.1 ? trab : 0);
  lv = smin(lv, segDist(x, y, z, LVOT.a, LVOT.b) - 0.08, 0.05);
  const lvOut = sdEllipsoid(x, y, z, LV.c, LV_OUT);
  let rv = smax(sdEllipsoid(x, y, z, RV.c, RV.r), -lvOut, 0.04) + (y < 0.1 ? trab : 0);
  rv = smin(rv, smax(segDist(x, y, z, RVOT.a, RVOT.b) - 0.085, -lvOut, 0.03), 0.05);
  for (const p of [PAPILLARY.lvAnt, PAPILLARY.lvPost]) lv = smax(lv, -(sdTube(x, y, z, [p.a, p.b], 0.045, 0.028)), 0.03);
  rv = smax(rv, -(sdTube(x, y, z, [PAPILLARY.rv.a, PAPILLARY.rv.b], 0.035, 0.022)), 0.03);
  // atria: smooth posterior wall, pectinate muscles (fine ridges) elsewhere
  const pect = 0.009 * Math.abs(noise3(x * 30, y * 9, z * 30));
  const la = sdEllipsoid(x, y, z, LA.c, LA.r) + pect * 0.6;
  const ra = sdEllipsoid(x, y, z, RA.c, RA.r) + pect;
  // atrioventricular orifices
  const mitral = segDist(x, y, z, [0.17, 0.16, -0.04], [0.16, 0.36, -0.06]) - 0.1;
  const tricuspid = segDist(x, y, z, [-0.25, 0.12, 0.01], [-0.26, 0.32, -0.01]) - 0.11;
  let c = Math.min(lv, rv, la, ra, mitral, tricuspid);
  for (const { v, pts, box } of LUMENS) {
    if (boxDist(x, y, z, box) > c + 0.02) continue;
    c = smin(c, sdTube(x, y, z, pts, v.r0 - v.wall, v.r1 - v.wall), 0.02);
  }
  return c;
}

export function sdHeart(x: number, y: number, z: number) {
  const solid = smin(sdMuscle(x, y, z), sdVessels(x, y, z), 0.05);
  return smax(solid, -sdCavities(x, y, z), 0.012);
}

export const HEART_BOUNDS = { min: [-1.08, -0.8, -1.12] as [number, number, number], max: [0.98, 1.56, 0.42] as [number, number, number] };

// ---------------------------------------------------------------------------------------------
// Cardiac cycle (real time, 60 beats per minute)
export const BPM = 60;
export const PERIOD = 60 / BPM;
const T0 = 0.25;
export const phase = (t: number) => {
  const p = ((t - T0) / PERIOD) % 1;
  return p < 0 ? p + 1 : p;
};
/** ventricular contraction 0..1 (systole ≈ 0.10–0.45 of the cycle) */
export const ventricle = (t: number) => {
  const f = phase(t);
  return smoothstep(0.1, 0.3, f) * (1 - smoothstep(0.42, 0.6, f));
};
/** atrial contraction 0..1 (end of diastole, just before the ventricles) */
export const atrium = (t: number) => {
  const f = phase(t);
  return smoothstep(0.0, 0.05, f) * (1 - smoothstep(0.06, 0.13, f));
};
/** AV valves (tricuspid, mitral): open in diastole, shut at the start of systole */
export const avOpen = (t: number) => {
  const f = phase(t);
  if (f < 0.13) return 1 - smoothstep(0.08, 0.12, f);
  const o = smoothstep(0.5, 0.57, f);
  return o * (1 - 0.35 * smoothstep(0.7, 0.8, f) * (1 - smoothstep(0.93, 1.0, f)));
};
/** semilunar valves (pulmonary, aortic): open only during ejection */
export const slOpen = (t: number) => {
  const f = phase(t);
  return smoothstep(0.15, 0.19, f) * (1 - smoothstep(0.41, 0.46, f));
};
/** left-ventricular volume in ml (EDV 120 → ESV 50, stroke volume ≈ 70 ml) */
export const lvVolume = (t: number) => {
  const f = phase(t);
  if (f < 0.1) return 110 + 10 * smoothstep(0.0, 0.1, f);
  if (f < 0.15) return 120;
  if (f < 0.45) return 120 - 70 * smoothstep(0.15, 0.43, f);
  if (f < 0.5) return 50;
  return 50 + 55 * smoothstep(0.5, 0.7, f) + 5 * smoothstep(0.7, 1.0, f);
};
export const isSystole = (t: number) => {
  const f = phase(t);
  return f >= 0.1 && f < 0.46;
};

/** cumulative integral of a flow-rate function (deterministic table, 1/300 s resolution) */
export function cumulative(rate: (t: number) => number, duration = 61) {
  const dt = 1 / 300;
  const n = Math.ceil(duration / dt) + 1;
  const tab = new Float32Array(n);
  for (let i = 1; i < n; i++) tab[i] = tab[i - 1] + rate((i - 0.5) * dt) * dt;
  return (t: number) => {
    const x = clamp(t / dt, 0, n - 1.001);
    const i = Math.floor(x);
    return tab[i] + (tab[i + 1] - tab[i]) * (x - i);
  };
}
/** blood transport: inflow through the AV valves (diastole) and ejection (systole) */
export const fillTravel = cumulative((t) => avOpen(t) * (0.6 + 0.4 * atrium(t)) * 2.2);
export const ejectTravel = cumulative((t) => slOpen(t) * 3.4);
export const veinTravel = cumulative((t) => 0.75 + 0.25 * avOpen(t));

// ---------------------------------------------------------------------------------------------
// Beat deformation — identical in GLSL (heart mesh) and TypeScript (valves, paths)
export const BEAT = { longShort: 0.085, outer: 0.07, inner: 0.24, atrial: 0.07 };

export const DISPLACE_GLSL = /* glsl */ `
uniform float uV;
uniform float uA;
attribute vec3 aBeat;
vec3 heartDisplace(vec3 p) {
  float wv = aBeat.x, wa = aBeat.y, inner = aBeat.z;
  float base = p.y < ${AV_PLANE.toFixed(3)} ? smoothstep(-0.66, ${AV_PLANE.toFixed(3)}, p.y) : 1.0 - smoothstep(${AV_PLANE.toFixed(3)}, 0.8, p.y);
  float lat = 1.0 - smoothstep(0.5, 0.85, abs(p.x));
  vec3 q = p;
  q.y -= ${BEAT.longShort.toFixed(3)} * uV * base * lat;
  vec2 ax = inner > 0.5 ? (p.x > -0.03 ? vec2(${LV.c[0]}, ${LV.c[2]}) : vec2(${RV.c[0]}, ${RV.c[2]})) : vec2(0.0, 0.0);
  float k = mix(${BEAT.outer.toFixed(3)}, ${BEAT.inner.toFixed(3)}, inner) * uV * wv * smoothstep(-0.68, -0.3, p.y);
  q.xz = mix(q.xz, ax, k);
  vec3 ac = p.x > -0.05 ? vec3(${LA.c.join(',')}) : vec3(${RA.c.join(',')});
  q = mix(q, ac, ${BEAT.atrial.toFixed(3)} * uA * wa * (inner > 0.5 ? 1.6 : 1.0));
  return q;
}`;

/** AV-plane descent at time t (valves and blood paths follow it) */
export const avPlaneShift = (t: number) => -BEAT.longShort * ventricle(t);

/** per-vertex attributes for the heart mesh: colour + beat weights */
const C = {
  muscle: new THREE.Color('#6a1a17'),
  muscleHi: new THREE.Color('#84302a'),
  fat: new THREE.Color('#c9a454'),
  endo: new THREE.Color('#9b3a33'),
  intima: new THREE.Color('#d6b0a6'),
  venous: new THREE.Color('#3f4f9c'),
  arterial: new THREE.Color('#a8302a'),
};
const _c = new THREE.Color();
export function heartVertex(p: THREE.Vector3, _n: THREE.Vector3, out: Record<string, number[]>) {
  const { x, y, z } = p;
  const cav = sdCavities(x, y, z);
  const mus = sdMuscle(x, y, z);
  let best = 1e9;
  let bestV: Vessel | null = null;
  for (let i = 0; i < VESSELS.length; i++) {
    if (boxDist(x, y, z, VBOX[i]) > best) continue;
    const v = VESSELS[i];
    const d = sdTube(x, y, z, v.pts, v.r0, v.r1);
    if (d < best) {
      best = d;
      bestV = v;
    }
  }
  const inner = Math.abs(cav) < Math.min(Math.abs(mus), Math.abs(best)) + 0.004 ? 1 : 0;
  const vesselW = smoothstep(-0.025, 0.025, mus - best); // 1 = vessel surface
  if (inner) {
    // inside: endocardium in the chambers, pale intima inside vessels
    let lum = 1e9;
    for (const { v, pts, box } of LUMENS) if (boxDist(x, y, z, box) < lum) lum = Math.min(lum, sdTube(x, y, z, pts, v.r0 - v.wall, v.r1 - v.wall));
    const chamberCav = cav;
    const isLumen = smoothstep(0.02, -0.01, lum - chamberCav) * smoothstep(0.02, 0.06, mus + 0.08);
    _c.copy(C.endo).lerp(C.intima, clamp(isLumen * 0.8 * vesselW + 0.0));
  } else {
    const vc = bestV?.venous ? C.venous : C.arterial;
    _c.copy(C.muscle).lerp(C.muscleHi, 0.5 + 0.5 * noise3(x * 9, y * 9, z * 9));
    // epicardial fat in the coronary (AV) groove and the interventricular grooves
    const groove = Math.exp(-(((y - AV_PLANE - 0.01) / 0.045) ** 2)) * smoothstep(0.0, 0.08, z + 0.3);
    const ivg = Math.exp(-(((x - (-0.02 + 0.08 * (y - 0.2))) / 0.04) ** 2)) * smoothstep(0.05, 0.15, z) * smoothstep(-0.55, -0.2, y) * (1 - smoothstep(0.2, 0.3, y));
    const fat = clamp((groove * 0.85 + ivg * 0.75) * (0.75 + 0.5 * noise3(x * 14, y * 14, z * 14)));
    _c.lerp(C.fat, fat);
    _c.lerp(vc, vesselW);
  }
  out.color[0] = _c.r;
  out.color[1] = _c.g;
  out.color[2] = _c.b;
  const muscleW = 1 - vesselW;
  out.aBeat[0] = smoothstep(AV_PLANE + 0.07, AV_PLANE - 0.05, y) * (inner ? 1 : muscleW);
  out.aBeat[1] = smoothstep(AV_PLANE - 0.05, AV_PLANE + 0.05, y) * (1 - smoothstep(0.62, 0.75, y)) * (inner ? 1 - vesselW * 0.6 : muscleW);
  out.aBeat[2] = inner;
}
