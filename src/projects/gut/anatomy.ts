import * as THREE from 'three';
import { noise3 } from '../../engine/geometry/noise';
import { len3, sdEllipsoid, sdTube, segDist, smax, smin } from '../../engine/geometry/surfaceNets';
import { sdTorso } from '../heart/body';

/**
 * Episode 5 anatomy. Modelled in decimetres (1 = 10 cm), figure standing on the floor (y = 0),
 * facing +z, patient's left = +x. The whole model is drawn at scale S so the 1.74 m figure
 * fits the series studio; `W()` converts model coordinates to world coordinates.
 */
export const S = 0.45;
/** the heart-episode torso (hips at y = 0) is reused, lifted to standing height */
export const Y0 = 8.9;
export type P = readonly number[];
export const W = (p: P): [number, number, number] => [p[0] * S, p[1] * S, p[2] * S];
const v3 = (p: P) => new THREE.Vector3(p[0], p[1], p[2]);

// ---------------------------------------------------------------------------------------------
// Body (neutral display mannequin: full figure, no sex characteristics)
export function sdBody(x: number, y: number, z: number) {
  const ax = Math.abs(x);
  let d = sdTorso(x, y - Y0, z, true);
  // pelvis & buttocks
  d = smin(d, sdEllipsoid(x, y, z, [0, 9.05, -0.05], [1.3, 0.9, 0.86]), 0.4);
  d = smin(d, sdEllipsoid(ax, y, z, [0.52, 8.85, -0.42], [0.62, 0.72, 0.56]), 0.3);
  // gluteal cleft
  d = smax(d, -(segDist(x, y, z, [0, 9.6, -1.02], [0, 8.2, -0.88]) - 0.035), 0.08);
  // legs
  d = smin(d, sdTube(ax, y, z, [[0.66, 9.0, 0.0], [0.62, 7.2, 0.06], [0.5, 5.05, 0.06]], 0.72, 0.42), 0.35);
  d = smin(d, sdEllipsoid(ax, y, z, [0.5, 4.85, 0.12], [0.4, 0.45, 0.42]), 0.15);
  d = smin(d, sdTube(ax, y, z, [[0.49, 4.75, 0.0], [0.46, 2.6, -0.06], [0.42, 0.95, -0.08]], 0.4, 0.22), 0.2);
  d = smin(d, sdEllipsoid(ax, y, z, [0.5, 3.6, -0.18], [0.37, 0.85, 0.36]), 0.3);
  // feet (flat on the floor)
  let foot = segDist(ax, y, z, [0.43, 0.42, -0.2], [0.5, 0.2, 1.05]) - 0.22;
  foot = smin(foot, sdEllipsoid(ax, y, z, [0.43, 0.3, -0.18], [0.24, 0.3, 0.3]), 0.1);
  d = smin(d, foot, 0.2);
  d = smax(d, 0.005 - y, 0.03);
  // forearms & hands (upper arm comes from the torso)
  d = smin(d, sdEllipsoid(ax, y, z, [2.22, 12.0, -0.12], [0.4, 0.42, 0.4]), 0.2);
  d = smin(d, sdTube(ax, y, z, [[2.22, 12.1, -0.12], [2.3, 10.2, 0.0], [2.32, 8.9, 0.12]], 0.36, 0.24), 0.18);
  let hand = sdEllipsoid(ax, y, z, [2.33, 8.45, 0.16], [0.15, 0.36, 0.3]);
  hand = smin(hand, sdEllipsoid(ax, y, z, [2.33, 7.95, 0.18], [0.12, 0.34, 0.26]), 0.12);
  hand = smin(hand, segDist(ax, y, z, [2.24, 8.6, 0.38], [2.2, 8.2, 0.46]) - 0.065, 0.08);
  d = smin(d, hand, 0.14);
  // head
  let h = sdEllipsoid(x, y, z, [0, 16.35, -0.02], [0.78, 1.0, 0.92]);
  h = smin(h, sdEllipsoid(x, y, z, [0, 15.75, 0.3], [0.56, 0.5, 0.56]), 0.35);
  h = smin(h, segDist(x, y, z, [0, 16.42, 0.88], [0, 16.12, 1.0]) - 0.1, 0.1);
  h = smin(h, sdEllipsoid(x, y, z, [0, 16.62, 0.7], [0.56, 0.16, 0.22]), 0.12);
  h = smax(h, -(len3(ax - 0.3, y - 16.4, z - 0.98) - 0.12), 0.18);
  h = smin(h, sdEllipsoid(ax, y, z, [0.78, 16.3, -0.02], [0.1, 0.27, 0.17]), 0.06);
  d = smin(d, h, 0.3);
  d += 0.003 * noise3(x * 3, y * 3, z * 3);
  return d;
}
export const BODY_BOUNDS = { min: [-2.85, -0.05, -1.4] as [number, number, number], max: [2.85, 17.5, 1.5] as [number, number, number] };

// ---------------------------------------------------------------------------------------------
// Digestive tract centrelines (model coordinates). Radii in dm.
const C = (pts: P[]) => new THREE.CatmullRomCurve3(pts.map(v3), false, 'centripetal');

export const ESOPHAGUS = C([[0, 15.1, -0.3], [0, 14.2, -0.42], [0.02, 13.2, -0.42], [0.1, 12.55, -0.25], [0.32, 12.2, -0.02]]);

/** stomach: from the fundus dome along the body to the pylorus */
export const STOMACH = C([[0.6, 12.62, -0.08], [0.68, 12.32, -0.02], [0.78, 11.88, 0.1], [0.7, 11.38, 0.24], [0.42, 11.08, 0.32], [0.02, 11.06, 0.32], [-0.27, 11.27, 0.26], [-0.36, 11.38, 0.22]]);
export const stomachR = (u: number) => {
  const k: [number, number][] = [[0, 0.05], [0.07, 0.3], [0.25, 0.39], [0.45, 0.37], [0.62, 0.3], [0.78, 0.22], [0.92, 0.13], [1, 0.08]];
  for (let i = 1; i < k.length; i++) if (u <= k[i][0]) return k[i - 1][1] + ((u - k[i - 1][0]) / (k[i][0] - k[i - 1][0])) * (k[i][1] - k[i - 1][1]);
  return 0.08;
};

/** duodenum + jejunum + ileum as one continuous tube, packed in serpentine loops below the transverse colon */
function smallIntestinePoints() {
  const pts: P[] = [[-0.36, 11.38, 0.22], [-0.62, 11.25, 0.12], [-0.68, 10.78, 0.06], [-0.45, 10.48, 0.04], [0.0, 10.46, 0.04], [0.32, 10.74, 0.12]];
  const rows = 6;
  for (let j = 0; j < rows; j++) {
    const y = 10.18 - j * 0.235;
    const dir = j % 2 === 0 ? 1 : -1;
    const n = 9;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const x = dir > 0 ? -0.58 + 1.3 * u : 0.72 - 1.3 * u;
      pts.push([x, y + 0.07 * Math.sin(u * 9 + j * 2), 0.24 + 0.17 * Math.sin(u * 7.5 + j * 1.7)]);
    }
  }
  // terminal ileum runs up-right into the caecum (ileocaecal valve)
  pts.push([-0.35, 8.95, 0.32], [-0.55, 9.18, 0.3], [-0.72, 9.32, 0.28]);
  return pts;
}
export const SMALL = C(smallIntestinePoints());
export const SMALL_R = 0.105;

/** colon: caecum → ascending → transverse → descending → sigmoid → rectum (ends at the anorectal junction) */
export const COLON = C([
  [-0.86, 8.92, 0.3], [-0.9, 9.45, 0.24], [-0.97, 10.25, 0.14], [-0.92, 10.95, 0.18], [-0.62, 10.92, 0.4], [-0.2, 10.5, 0.46], [0.32, 10.55, 0.46], [0.76, 11.02, 0.32],
  [0.98, 11.38, 0.08], [1.04, 10.85, -0.06], [1.0, 10.0, -0.06], [0.95, 9.3, 0.04], [0.74, 8.96, 0.2], [0.34, 9.08, 0.3], [0.06, 9.28, 0.12], [0.0, 9.22, -0.22],
  [0.0, 9.0, -0.5], [0.0, 8.72, -0.6], [0.0, 8.46, -0.5], [0.0, 8.3, -0.32],
]);
export const COLON_LEN = COLON.getLength();
/** arc-length landmarks along the colon (dm), filled below */
export const COLON_S = { hepatic: 0, splenic: 0, sigmoid: 0, rectum: 0 };
{
  const N = 2000;
  const marks: [keyof typeof COLON_S, P][] = [['hepatic', [-0.92, 10.95, 0.2]], ['splenic', [0.98, 11.38, 0.08]], ['sigmoid', [0.95, 9.3, 0.04]], ['rectum', [0.0, 9.22, -0.22]]];
  const p = new THREE.Vector3();
  for (const [k, q] of marks) {
    let best = 1e9;
    for (let i = 0; i <= N; i++) {
      COLON.getPointAt(i / N, p);
      const d = p.distanceTo(v3(q));
      if (d < best) {
        best = d;
        COLON_S[k] = (i / N) * COLON_LEN;
      }
    }
  }
}
/** colon radius by arc length: wide caecum, transverse ~ 2.5 cm, narrow sigmoid, wide rectal ampulla */
export const colonR = (s: number) => {
  const L = COLON_LEN;
  const amp = Math.exp(-(((s - (L - 0.45)) / 0.28) ** 2));
  let r = 0.2 - 0.04 * Math.min(1, s / 3) - 0.035 * smooth(COLON_S.sigmoid - 0.4, COLON_S.sigmoid + 0.4, s) * (1 - smooth(COLON_S.rectum - 0.2, COLON_S.rectum + 0.3, s));
  r += 0.07 * amp;
  // caecum: rounded blind pouch
  if (s < 0.2) r *= Math.sqrt(Math.max(0, 1 - ((0.2 - s) / 0.2) ** 2)) * 0.8 + 0.2;
  // tapers into the anal canal
  r *= 1 - 0.55 * smooth(L - 0.12, L, s);
  return r;
};

/** anal canal: anorectal junction → anus. Direction down & back (anorectal angle ≈ 90°). */
export const ANAL = { top: v3([0.0, 8.3, -0.32]), dir: new THREE.Vector3(0, -0.72, -0.69).normalize(), len: 0.4 };
export const ANUS = ANAL.top.clone().addScaledVector(ANAL.dir, ANAL.len);

export function smooth(a: number, b: number, x: number) {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
}

// ---------------------------------------------------------------------------------------------
// Pelvis, sacrum, femora (context skeleton; ribs/spine come from the heart episode's skeleton)
export function sdPelvis(x: number, y: number, z: number) {
  const ax = Math.abs(x);
  // sacrum + coccyx (curved, widening upwards)
  const sw = 1 + 1.6 * smooth(8.7, 10.1, y);
  let d = sdTube(x / sw, y, z, [[0, 10.15, -0.74], [0, 9.75, -0.86], [0, 9.3, -0.86], [0, 8.95, -0.76], [0, 8.66, -0.6]], 0.12, 0.05);
  // iliac wings: thin bowl-shaped shells
  let il = Math.abs(sdEllipsoid(ax, y, z, [0.62, 9.95, -0.2], [0.62, 0.68, 0.55])) - 0.035;
  il = smax(il, 9.55 - y, 0.05);
  il = smax(il, z - 0.28, 0.05);
  il = smax(il, 0.34 - ax, 0.05);
  d = smin(d, il, 0.06);
  // acetabulum region, pubic rami, ischial tuberosities
  d = smin(d, segDist(ax, y, z, [0.82, 9.55, 0.0], [0.84, 9.25, 0.06]) - 0.14, 0.08);
  d = smin(d, segDist(ax, y, z, [0.8, 9.25, 0.12], [0.12, 9.05, 0.6]) - 0.065, 0.06);
  d = smin(d, sdTube(ax, y, z, [[0.12, 8.95, 0.58], [0.35, 8.72, 0.3], [0.52, 8.62, -0.05], [0.7, 9.0, -0.12], [0.82, 9.3, 0.02]], 0.06, 0.09), 0.06);
  d = smin(d, segDist(ax, y, z, [0.04, 9.08, 0.62], [0.04, 8.9, 0.6]) - 0.07, 0.04);
  // femora
  d = smin(d, len3(ax - 0.86, y - 9.3, z - 0.08) - 0.2, 0.04);
  d = smin(d, segDist(ax, y, z, [0.86, 9.3, 0.08], [1.08, 9.05, 0.05]) - 0.11, 0.06);
  d = smin(d, sdTube(ax, y, z, [[1.08, 9.12, 0.04], [1.06, 8.7, 0.05], [0.72, 6.5, 0.1], [0.52, 5.0, 0.08]], 0.15, 0.12), 0.08);
  d = smin(d, sdEllipsoid(ax, y, z, [0.52, 4.95, 0.06], [0.24, 0.17, 0.2]), 0.06);
  d = smin(d, sdTube(ax, y, z, [[0.5, 4.8, 0.05], [0.44, 0.75, 0.0]], 0.13, 0.09), 0.06);
  return d;
}

// ---------------------------------------------------------------------------------------------
// Motility & gas (all pure functions of time)
/** contraction rings travelling along the colon towards the rectum: arc-length positions at time t */
export function colonRings(t: number, out: number[]) {
  out.length = 0;
  const v = 0.42; // dm/s (hugely sped up: real mass movements take minutes)
  const gap = 1.35;
  const base = t * v;
  for (let i = 0; i < 12; i++) {
    const s = ((base + i * gap) % (gap * 12)) - 0.6;
    out.push(s);
  }
  return out;
}
