import * as THREE from 'three';
import { hash2, piecewise } from '../../engine/math';
import { COLON, COLON_LEN, COLON_S, SMALL, colonR, smooth } from './anatomy';
import { MAX_RINGS } from './materials';
import * as track from './script';

const L = COLON_LEN;

/** parallel-transport frames sampled along a curve: point, tangent, normal, binormal by arc length */
export class Frames {
  readonly n: number;
  readonly len: number;
  private P: THREE.Vector3[] = [];
  private T: THREE.Vector3[] = [];
  private N: THREE.Vector3[] = [];
  private B: THREE.Vector3[] = [];
  constructor(curve: THREE.Curve<THREE.Vector3>, n = 800) {
    this.n = n;
    this.len = curve.getLength();
    for (let i = 0; i <= n; i++) {
      this.P.push(curve.getPointAt(i / n));
      this.T.push(curve.getTangentAt(i / n).normalize());
    }
    const n0 = new THREE.Vector3(0, 0, 1);
    if (Math.abs(this.T[0].dot(n0)) > 0.9) n0.set(1, 0, 0);
    this.N.push(n0.sub(this.T[0].clone().multiplyScalar(n0.dot(this.T[0]))).normalize());
    for (let i = 1; i <= n; i++) this.N.push(this.N[i - 1].clone().applyQuaternion(new THREE.Quaternion().setFromUnitVectors(this.T[i - 1], this.T[i])).normalize());
    for (let i = 0; i <= n; i++) this.B.push(new THREE.Vector3().crossVectors(this.T[i], this.N[i]));
  }
  private at(s: number) {
    const u = Math.min(1, Math.max(0, s / this.len)) * this.n;
    const i = Math.min(this.n - 1, Math.floor(u));
    return { i, f: u - i };
  }
  point(s: number, out: THREE.Vector3) {
    const { i, f } = this.at(s);
    return out.copy(this.P[i]).lerp(this.P[i + 1], f);
  }
  tangent(s: number, out: THREE.Vector3) {
    const { i, f } = this.at(s);
    return out.copy(this.T[i]).lerp(this.T[i + 1], f).normalize();
  }
  /** point + radial offset (angle a, distance r) */
  offset(s: number, a: number, r: number, out: THREE.Vector3) {
    const { i, f } = this.at(s);
    this.point(s, out);
    const N = this.N[i].clone().lerp(this.N[i + 1], f);
    const B = this.B[i].clone().lerp(this.B[i + 1], f);
    return out.addScaledVector(N, Math.cos(a) * r).addScaledVector(B, Math.sin(a) * r);
  }
}

export const colonFrames = new Frames(COLON, 1200);
export const smallFrames = new Frames(SMALL, 1200);

// ---------------------------------------------------------------------------------------------
// Gas pockets in the colon. Pocket 0 is the "hero" pocket the camera follows to the rectum.
const T = track.T;
const ease = (a: number, b: number, t: number) => smooth(a, b, t);

export function heroS(t: number) {
  const transverseMid = COLON_S.hepatic + 1.0;
  const keys: [number, number][] = [
    [0, 1.0],
    [T.peristalsis[0], 1.55],
    [T.toRectum[0], transverseMid],
    [T.toRectum[1], L - 0.55],
  ];
  let s = keys[0][1];
  for (let i = 1; i < keys.length; i++) s += (keys[i][1] - keys[i - 1][1]) * ease(keys[i - 1][0], keys[i][0], t);
  // pushed into the upper anal canal while sampling, then out
  s += 0.18 * track.internal(t) * (1 - track.release(t));
  return s;
}

export const POCKETS = 4;
/** arc length of pocket k at time t */
export function pocketS(k: number, t: number) {
  if (k === 0) return heroS(t);
  const s0 = [0, 3.0, COLON_S.hepatic + 2.2, COLON_S.splenic + 1.4][k];
  return s0 + 0.9 * ease(T.peristalsis[0], T.peristalsis[1] + 1, t) + 0.25 * ease(T.toRectum[0], T.toRectum[1] + 1, t);
}
/** pocket radius (dm), limited by the lumen */
export function pocketR(k: number, t: number) {
  const grow = ease(21.5, k === 0 ? 43 : 40, t);
  const base = (k === 0 ? 0.13 : 0.075 + 0.015 * k) * Math.cbrt(Math.max(0.02, grow));
  const r = grow < 0.01 ? 0 : base;
  const out = k === 0 ? Math.cbrt(Math.max(0, 1 - track.release(t))) : 1 - ease(57.5, 59, t);
  return Math.min(r, colonR(pocketS(k, t)) * 0.82) * out;
}

/** contraction rings: one behind each pocket (only while it is being pushed) + a slow background train */
export function colonRingState(t: number, pos: number[], amp: number[]) {
  const peri = track.peri(t);
  for (let k = 0; k < POCKETS; k++) {
    const v = (pocketS(k, t + 0.05) - pocketS(k, t - 0.05)) / 0.1;
    pos[k] = pocketS(k, t) - (k === 0 ? 0.42 : 0.3);
    amp[k] = Math.min(0.7, Math.abs(v) * 0.9) * smooth(0, 0.2, peri) + 0.25 * peri;
  }
  const gap = 1.4;
  const v = 0.38;
  for (let i = POCKETS; i < MAX_RINGS; i++) {
    const j = i - POCKETS;
    pos[i] = ((t * v + j * gap) % (gap * (MAX_RINGS - POCKETS))) - 0.3;
    amp[i] = 0.32 * peri * (0.6 + 0.4 * hash2(j, 3));
  }
}

/** small intestine: peristaltic waves travelling towards the colon */
export function smallRingState(t: number, pos: number[], amp: number[]) {
  const k = track.chyme(t);
  const len = smallFrames.len;
  const gap = len / MAX_RINGS;
  for (let i = 0; i < MAX_RINGS; i++) {
    pos[i] = (t * 0.55 + i * gap) % len;
    amp[i] = 0.32 * k;
  }
}

/** distance travelled by intestinal contents (slower than the waves) */
export const chymeTravel = (t: number) => t * 0.22;

export { L as COLON_LENGTH, piecewise };
