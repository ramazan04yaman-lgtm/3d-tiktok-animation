import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/**
 * Procedural replacement model of a compact portafilter espresso machine
 * (≈ 28 × 27 × 31 cm, vibration pump + thermoblock). Front faces +Z, units in dm.
 */
export const P = {
  plinth: { c: [0, 0.2, -0.15], s: [2.8, 0.4, 2.7] },
  tower: { c: [0, 1.75, -0.78], s: [2.8, 2.7, 1.44] },
  head: { c: [0, 2.7, 0.48], s: [2.8, 0.8, 1.05] },
  group: new THREE.Vector3(0, 2.215, 0.45),
  spoutY: 1.715,
  cup: new THREE.Vector3(0, 0.436, 0.45),
  pump: new THREE.Vector3(0.4, 0.72, -0.55),
  block: new THREE.Vector3(0.95, 1.55, -0.55),
  blockH: 0.9,
  gauge: new THREE.Vector3(0.82, 2.72, 1.006),
  powerBtn: new THREE.Vector3(-0.98, 2.72, 1.006),
  brewBtn: new THREE.Vector3(-0.58, 2.72, 1.006),
  tank: { c: [-0.5, 1.72, -1.2], s: [1.5, 2.45, 0.42] },
  cupInnerBottom: 0.51,
  cupFullY: 0.98,
};

export const roundedBox = (s: number[], c: number[], r = 0.12) => new RoundedBoxGeometry(s[0], s[1], s[2], 4, r).translate(c[0], c[1], c[2]);

const v2 = (x: number, y: number) => new THREE.Vector2(x, y);

/** Portafilter basket + ring (open top) */
export function portafilterGeometry() {
  return new THREE.LatheGeometry([v2(0, 1.84), v2(0.24, 1.84), v2(0.33, 1.85), v2(0.36, 1.88), v2(0.36, 2.1), v2(0.34, 2.125), v2(0.305, 2.125), v2(0.3, 2.1), v2(0.3, 1.885), v2(0.0, 1.885)], 96);
}

export function cupGeometry() {
  return new THREE.LatheGeometry(
    [v2(0, 0.46), v2(0.17, 0.46), v2(0.2, 0.475), v2(0.24, 0.6), v2(0.3, 0.85), v2(0.33, 1.04), v2(0.335, 1.06), v2(0.315, 1.065), v2(0.305, 1.0), v2(0.275, 0.82), v2(0.215, 0.6), v2(0.17, 0.53), v2(0.0, 0.51)],
    96,
  );
}
const CUP_INNER: [number, number][] = [
  [0.51, 0.16],
  [0.53, 0.17],
  [0.6, 0.215],
  [0.82, 0.275],
  [1.0, 0.305],
];
export function cupInnerRadius(y: number) {
  for (let i = 1; i < CUP_INNER.length; i++) {
    if (y <= CUP_INNER[i][0]) {
      const [y0, r0] = CUP_INNER[i - 1];
      const [y1, r1] = CUP_INNER[i];
      return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
    }
  }
  return CUP_INNER[CUP_INNER.length - 1][1];
}
export function saucerGeometry() {
  return new THREE.LatheGeometry([v2(0, 0.41), v2(0.38, 0.41), v2(0.5, 0.44), v2(0.53, 0.465), v2(0.51, 0.47), v2(0.42, 0.45), v2(0.24, 0.44), v2(0.0, 0.445)], 96);
}
export const cupHandleCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0.27, 0.95, 0),
  new THREE.Vector3(0.44, 0.97, 0),
  new THREE.Vector3(0.5, 0.82, 0),
  new THREE.Vector3(0.4, 0.68, 0),
  new THREE.Vector3(0.24, 0.66, 0),
]);

const c = (...p: [number, number, number][]) => new THREE.CatmullRomCurve3(p.map((x) => new THREE.Vector3(...x)), false, 'centripetal');

/** Water path: tank outlet → pump inlet */
export const pipeTankToPump = c([-0.5, 0.52, -1.08], [-0.45, 0.55, -0.85], [-0.2, 0.68, -0.6], [0.02, 0.72, -0.55]);
/** pump outlet → thermoblock inlet (bottom) */
export const pipePumpToBlock = c([0.78, 0.72, -0.55], [0.95, 0.75, -0.5], [1.0, 0.92, -0.5], [0.95, 1.08, -0.55]);
/** thermoblock outlet (top) → group head */
export const pipeBlockToGroup = c([0.95, 2.02, -0.55], [0.95, 2.28, -0.4], [0.6, 2.42, -0.05], [0.15, 2.44, 0.3], [0, 2.32, 0.45]);
/** water channel inside the thermoblock (helix) */
export function blockHelix(radius: number, turns: number, phase = 0) {
  const pts: THREE.Vector3[] = [];
  const { x, y, z } = P.block;
  const n = turns * 24;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const a = phase + u * turns * Math.PI * 2;
    pts.push(new THREE.Vector3(x + Math.cos(a) * radius, y - P.blockH / 2 + 0.07 + u * (P.blockH - 0.14), z + Math.sin(a) * radius));
  }
  return new THREE.CatmullRomCurve3(pts);
}
/** Full followed path for flow particles on the pressure side */
export function pressurePath() {
  const pts: THREE.Vector3[] = [];
  const take = (curve: THREE.Curve<THREE.Vector3>, n: number, skip = false) => {
    for (let i = skip ? 1 : 0; i <= n; i++) pts.push(curve.getPointAt(i / n));
  };
  take(pipePumpToBlock, 10);
  take(blockHelix(0.1, 5), 120, true);
  take(pipeBlockToGroup, 16, true);
  return new THREE.CatmullRomCurve3(pts);
}

export const steamWandCurve = c([1.18, 2.3, 0.62], [1.22, 2.0, 0.72], [1.3, 1.6, 0.86], [1.34, 1.35, 0.92]);
export const cableCurve = c([-1.2, 0.08, -1.5], [-1.4, 0.03, -1.9], [-2.4, 0.03, -2.3], [-4, 0.03, -2.6]);
