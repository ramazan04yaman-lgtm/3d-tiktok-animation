import * as THREE from 'three';

/** fast 3D length (Math.hypot is slow in V8) */
export const len3 = (x: number, y: number, z = 0) => Math.sqrt(x * x + y * y + z * z);

/** Signed distance function: < 0 inside the solid, > 0 outside. */
export type SDF = (x: number, y: number, z: number) => number;

export interface SurfaceNetsOptions {
  min: [number, number, number];
  max: [number, number, number];
  /** voxel edge length */
  step: number;
  /** Newton steps that pull each vertex onto the exact surface (smoother result) */
  project?: number;
  /** optional per-vertex attributes: name → item size, filled by `attributes.fill` */
  attributes?: { sizes: Record<string, number>; fill: (p: THREE.Vector3, n: THREE.Vector3, out: Record<string, number[]>) => void };
}

/**
 * Naive Surface Nets: turns an SDF into an indexed, smooth-shaded BufferGeometry.
 * Normals come from the SDF gradient, so organic shapes stay perfectly smooth.
 * Deterministic and dependency-free → used for anatomy (heart, lungs, torso) and any organic part.
 */
export function surfaceNets(sdf: SDF, opts: SurfaceNetsOptions): THREE.BufferGeometry {
  const { min, max, step, project = 2 } = opts;
  const nx = Math.ceil((max[0] - min[0]) / step) + 1;
  const ny = Math.ceil((max[1] - min[1]) / step) + 1;
  const nz = Math.ceil((max[2] - min[2]) / step) + 1;
  const field = new Float32Array(nx * ny * nz);
  const idx = (x: number, y: number, z: number) => x + nx * (y + ny * z);
  // narrow band: evaluate a coarse grid first, refine only close to the surface
  const K = 4;
  const cx = Math.ceil((nx - 1) / K) + 1,
    cy = Math.ceil((ny - 1) / K) + 1,
    cz = Math.ceil((nz - 1) / K) + 1;
  const coarse = new Float32Array(cx * cy * cz);
  for (let z = 0; z < cz; z++)
    for (let y = 0; y < cy; y++)
      for (let x = 0; x < cx; x++) coarse[x + cx * (y + cy * z)] = sdf(min[0] + x * K * step, min[1] + y * K * step, min[2] + z * K * step);
  const band = step * K * 1.3;
  for (let z = 0; z < nz; z++) {
    const z0 = Math.min(Math.floor(z / K), cz - 2),
      fz = z / K - z0;
    for (let y = 0; y < ny; y++) {
      const y0 = Math.min(Math.floor(y / K), cy - 2),
        fy = y / K - y0;
      for (let x = 0; x < nx; x++) {
        const x0 = Math.min(Math.floor(x / K), cx - 2),
          fx = x / K - x0;
        const c = (dx: number, dy: number, dz: number) => coarse[x0 + dx + cx * (y0 + dy + cy * (z0 + dz))];
        const l = (a: number, b: number, u: number) => a + (b - a) * u;
        const v = l(l(l(c(0, 0, 0), c(1, 0, 0), fx), l(c(0, 1, 0), c(1, 1, 0), fx), fy), l(l(c(0, 0, 1), c(1, 0, 1), fx), l(c(0, 1, 1), c(1, 1, 1), fx), fy), fz);
        field[idx(x, y, z)] = Math.abs(v) > band ? v : sdf(min[0] + x * step, min[1] + y * step, min[2] + z * step);
      }
    }
  }

  const cellVert = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
  const cidx = (x: number, y: number, z: number) => x + (nx - 1) * (y + (ny - 1) * z);
  const pos: number[] = [];
  const corner = new Float32Array(8);
  // the 12 cube edges as corner index pairs (corner bit order: x=1, y=2, z=4)
  const EDGES = [0, 1, 2, 3, 4, 5, 6, 7, 0, 2, 1, 3, 4, 6, 5, 7, 0, 4, 1, 5, 2, 6, 3, 7];

  for (let z = 0; z < nz - 1; z++)
    for (let y = 0; y < ny - 1; y++)
      for (let x = 0; x < nx - 1; x++) {
        let mask = 0;
        for (let c = 0; c < 8; c++) {
          const v = field[idx(x + (c & 1), y + ((c >> 1) & 1), z + ((c >> 2) & 1))];
          corner[c] = v;
          if (v < 0) mask |= 1 << c;
        }
        if (mask === 0 || mask === 255) continue;
        let sx = 0,
          sy = 0,
          sz = 0,
          n = 0;
        for (let e = 0; e < 12; e++) {
          const a = EDGES[2 * e],
            b = EDGES[2 * e + 1];
          const fa = corner[a],
            fb = corner[b];
          if (fa < 0 === fb < 0) continue;
          const u = fa / (fa - fb);
          sx += (a & 1) + (((b & 1) - (a & 1)) * u);
          sy += ((a >> 1) & 1) + ((((b >> 1) & 1) - ((a >> 1) & 1)) * u);
          sz += ((a >> 2) & 1) + ((((b >> 2) & 1) - ((a >> 2) & 1)) * u);
          n++;
        }
        cellVert[cidx(x, y, z)] = pos.length / 3;
        pos.push(min[0] + (x + sx / n) * step, min[1] + (y + sy / n) * step, min[2] + (z + sz / n) * step);
      }

  const index: number[] = [];
  const quad = (a: number, b: number, c: number, d: number) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    index.push(a, b, c, a, c, d);
  };
  for (let z = 1; z < nz - 1; z++)
    for (let y = 1; y < ny - 1; y++)
      for (let x = 0; x < nx - 1; x++) {
        if (field[idx(x, y, z)] < 0 === field[idx(x + 1, y, z)] < 0) continue;
        quad(cellVert[cidx(x, y - 1, z - 1)], cellVert[cidx(x, y, z - 1)], cellVert[cidx(x, y, z)], cellVert[cidx(x, y - 1, z)]);
      }
  for (let z = 1; z < nz - 1; z++)
    for (let y = 0; y < ny - 1; y++)
      for (let x = 1; x < nx - 1; x++) {
        if (field[idx(x, y, z)] < 0 === field[idx(x, y + 1, z)] < 0) continue;
        quad(cellVert[cidx(x - 1, y, z - 1)], cellVert[cidx(x, y, z - 1)], cellVert[cidx(x, y, z)], cellVert[cidx(x - 1, y, z)]);
      }
  for (let z = 0; z < nz - 1; z++)
    for (let y = 1; y < ny - 1; y++)
      for (let x = 1; x < nx - 1; x++) {
        if (field[idx(x, y, z)] < 0 === field[idx(x, y, z + 1)] < 0) continue;
        quad(cellVert[cidx(x - 1, y - 1, z)], cellVert[cidx(x, y - 1, z)], cellVert[cidx(x, y, z)], cellVert[cidx(x - 1, y, z)]);
      }

  // project vertices onto the surface and compute gradient normals
  const h = step * 0.25;
  const nrm = new Float32Array(pos.length);
  const P = new Float32Array(pos);
  for (let i = 0; i < P.length; i += 3) {
    let px = P[i],
      py = P[i + 1],
      pz = P[i + 2];
    let gx = 0,
      gy = 0,
      gz = 1;
    for (let k = 0; k <= project; k++) {
      gx = sdf(px + h, py, pz) - sdf(px - h, py, pz);
      gy = sdf(px, py + h, pz) - sdf(px, py - h, pz);
      gz = sdf(px, py, pz + h) - sdf(px, py, pz - h);
      const gl = len3(gx, gy, gz) || 1;
      gx /= gl;
      gy /= gl;
      gz /= gl;
      if (k === project) break;
      const d = sdf(px, py, pz);
      // limited Newton step (stays inside the voxel)
      const s = Math.max(-step * 0.5, Math.min(step * 0.5, d));
      px -= gx * s;
      py -= gy * s;
      pz -= gz * s;
    }
    P[i] = px;
    P[i + 1] = py;
    P[i + 2] = pz;
    nrm[i] = gx;
    nrm[i + 1] = gy;
    nrm[i + 2] = gz;
  }

  // orient every triangle along the gradient normal
  const ab = new THREE.Vector3(),
    ac = new THREE.Vector3(),
    fn = new THREE.Vector3();
  for (let t = 0; t < index.length; t += 3) {
    const a = index[t] * 3,
      b = index[t + 1] * 3,
      c = index[t + 2] * 3;
    ab.set(P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]);
    ac.set(P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]);
    fn.crossVectors(ab, ac);
    const d = fn.x * (nrm[a] + nrm[b] + nrm[c]) + fn.y * (nrm[a + 1] + nrm[b + 1] + nrm[c + 1]) + fn.z * (nrm[a + 2] + nrm[b + 2] + nrm[c + 2]);
    if (d < 0) {
      const tmp = index[t + 1];
      index[t + 1] = index[t + 2];
      index[t + 2] = tmp;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  const vcount = P.length / 3;
  geo.setIndex(vcount > 65535 ? new THREE.Uint32BufferAttribute(index, 1) : new THREE.Uint16BufferAttribute(index, 1));

  if (opts.attributes) {
    const { sizes, fill } = opts.attributes;
    const arrays: Record<string, Float32Array> = {};
    const out: Record<string, number[]> = {};
    for (const [k, s] of Object.entries(sizes)) {
      arrays[k] = new Float32Array(vcount * s);
      out[k] = new Array(s).fill(0);
    }
    const p = new THREE.Vector3(),
      n = new THREE.Vector3();
    for (let v = 0; v < vcount; v++) {
      p.set(P[3 * v], P[3 * v + 1], P[3 * v + 2]);
      n.set(nrm[3 * v], nrm[3 * v + 1], nrm[3 * v + 2]);
      fill(p, n, out);
      for (const [k, s] of Object.entries(sizes)) for (let j = 0; j < s; j++) arrays[k][v * s + j] = out[k][j];
    }
    for (const [k, s] of Object.entries(sizes)) geo.setAttribute(k, new THREE.BufferAttribute(arrays[k], s));
  }
  geo.computeBoundingSphere();
  geo.computeBoundingBox();
  return geo;
}

// ---- SDF primitives & operators (shared by organic models) ----
export const sdSphere = (x: number, y: number, z: number, cx: number, cy: number, cz: number, r: number) => len3(x - cx, y - cy, z - cz) - r;

/** approximate ellipsoid distance (good enough near the surface) */
export function sdEllipsoid(x: number, y: number, z: number, c: readonly number[], r: readonly number[]) {
  const px = (x - c[0]) / r[0],
    py = (y - c[1]) / r[1],
    pz = (z - c[2]) / r[2];
  const k0 = len3(px, py, pz);
  const k1 = len3(px / r[0], py / r[1], pz / r[2]);
  return k1 === 0 ? -Math.min(r[0], r[1], r[2]) : (k0 * (k0 - 1)) / k1;
}

/** distance to a segment */
export function segDist(x: number, y: number, z: number, a: readonly number[], b: readonly number[]) {
  const bax = b[0] - a[0],
    bay = b[1] - a[1],
    baz = b[2] - a[2];
  const pax = x - a[0],
    pay = y - a[1],
    paz = z - a[2];
  const hh = Math.max(0, Math.min(1, (pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz)));
  return len3(pax - bax * hh, pay - bay * hh, paz - baz * hh);
}

/** polyline tube with linearly varying radius; returns distance minus radius */
export function sdTube(x: number, y: number, z: number, pts: readonly (readonly number[])[], r0: number, r1 = r0) {
  let best = 1e9;
  const n = pts.length - 1;
  for (let i = 0; i < n; i++) {
    const a = pts[i],
      b = pts[i + 1];
    const bax = b[0] - a[0],
      bay = b[1] - a[1],
      baz = b[2] - a[2];
    const pax = x - a[0],
      pay = y - a[1],
      paz = z - a[2];
    const hh = Math.max(0, Math.min(1, (pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz)));
    const d = len3(pax - bax * hh, pay - bay * hh, paz - baz * hh);
    const r = r0 + (r1 - r0) * ((i + hh) / n);
    best = Math.min(best, d - r);
  }
  return best;
}

export const smin = (a: number, b: number, k: number) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};
export const smax = (a: number, b: number, k: number) => -smin(-a, -b, k);
