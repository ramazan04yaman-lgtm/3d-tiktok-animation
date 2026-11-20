import * as THREE from 'three';
import { hash2 } from '../../engine/math';

/**
 * Episode 7 world: the figure from the gut episode (scale 0.45, 1 unit ≈ 2.2 cm) stands on the
 * floor; an overhead rain shower head (Ø ≈ 27 cm) hangs above it. Head-local frame: y up,
 * face plate at y ≈ −0.06, section plane x = 0 (camera on the +x side).
 */
export const HEAD = new THREE.Vector3(0, 8.6, 0.6);
export const HR = 0.6;
export const PLATE = { top: -0.035, bottom: -0.06, r: 0.565 };
export const NUB = { len: 0.028, r: 0.017 };

export interface Nozzle {
  p: THREE.Vector3; // tip (head-local)
  clogged: boolean;
  /** jet direction when clogged (crooked) */
  dir: THREE.Vector3;
}

export const NOZZLES: Nozzle[] = (() => {
  const out: Nozzle[] = [];
  const rings = [0, 0.085, 0.17, 0.255, 0.34, 0.425, 0.505];
  rings.forEach((r, k) => {
    const n = k === 0 ? 1 : 6 * k;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + k * 0.3;
      const id = out.length;
      const clogged = hash2(id, 7) < 0.17 && k > 0;
      const tilt = 0.35 + 0.45 * hash2(id, 8);
      const az = hash2(id, 9) * Math.PI * 2;
      out.push({
        p: new THREE.Vector3(Math.cos(a) * r, PLATE.bottom - NUB.len, Math.sin(a) * r),
        clogged,
        dir: new THREE.Vector3(Math.cos(az) * tilt, -1, Math.sin(az) * tilt).normalize(),
      });
    }
  });
  return out;
})();

/** chrome housing as a lathe of its wall cross-section (hollow: water chamber inside) */
export function housingGeometry() {
  const outer: [number, number][] = [[0.0, 0.135], [0.18, 0.13], [0.36, 0.11], [0.5, 0.075], [0.59, 0.03], [0.615, -0.015], [0.6, -0.055], [0.585, -0.062]];
  const inner: [number, number][] = [[0.567, -0.062], [0.567, -0.01], [0.55, 0.025], [0.46, 0.06], [0.33, 0.085], [0.16, 0.1], [0.0, 0.105]];
  const prof = [...outer, ...inner].map(([r, y]) => new THREE.Vector2(r, y));
  prof.push(prof[0].clone());
  const g = new THREE.LatheGeometry(prof.reverse(), 96);
  g.computeVertexNormals();
  return g;
}

export const chamberTop = (r: number) => {
  // inner ceiling height of the chamber at radius r (matches the inner lathe profile)
  const k: [number, number][] = [[0, 0.105], [0.16, 0.1], [0.33, 0.085], [0.46, 0.06], [0.55, 0.025], [0.567, -0.01]];
  for (let i = 1; i < k.length; i++) if (r <= k[i][0]) return k[i - 1][1] + ((r - k[i - 1][0]) / (k[i][0] - k[i - 1][0])) * (k[i][1] - k[i - 1][1]);
  return -0.01;
};
