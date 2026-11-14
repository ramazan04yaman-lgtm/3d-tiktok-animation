import { CAVITY, fieldAt } from './physics';
import { T, foodTemp, turntableAngle } from './script';

/**
 * Simplified heating model for the soup surface (honest disclosure):
 * absorbed power ∝ |E|² of the fixed standing-wave pattern at the texel's current world position
 * (the bowl rotates with the turntable) + explicit heat diffusion. The mean is then scaled to the
 * scripted average temperature. Pre-computed once → every frame is reproducible.
 */
export const HEAT_N = 56;
export const SOUP_R = 0.55;
const DT = 0.1;
const TABLE_CENTER = { x: (CAVITY.min[0] + CAVITY.max[0]) / 2, z: 0 };

export interface HeatModel {
  /** temperature field (°C), row-major N×N, for video time t */
  sample: (t: number, out: Float32Array) => Float32Array;
}

let cached: HeatModel | null = null;

export function getHeatModel(): HeatModel {
  if (cached) return cached;
  const N = HEAT_N;
  const steps = Math.ceil((T.powerOff - T.powerOn) / DT);
  const snaps: Float32Array[] = [];
  const mask = new Uint8Array(N * N);
  const local: [number, number][] = [];
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const u = ((i + 0.5) / N) * 2 - 1;
      const v = ((j + 0.5) / N) * 2 - 1;
      local.push([u * SOUP_R, v * SOUP_R]);
      mask[j * N + i] = u * u + v * v <= 1 ? 1 : 0;
    }
  let H = new Float32Array(N * N);
  let tmp = new Float32Array(N * N);
  snaps.push(H.slice());
  const D = 0.06; // diffusion (texel units), stands in for conduction + gentle convection
  for (let s = 0; s < steps; s++) {
    const t = T.powerOn + s * DT;
    const a = turntableAngle(t);
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    for (let k = 0; k < N * N; k++) {
      if (!mask[k]) continue;
      const [x, z] = local[k];
      // three.js rotation.y: local (x,z) → world (x·cos + z·sin, −x·sin + z·cos)
      const wx = TABLE_CENTER.x + x * ca + z * sa;
      const wz = TABLE_CENTER.z - x * sa + z * ca;
      // microwaves also enter from the rim → slightly stronger absorption near the edge
      const rim = 0.75 + 0.25 * Math.hypot(x, z) / SOUP_R;
      H[k] += fieldAt(wx, wz) * rim * DT;
    }
    for (let it = 0; it < 2; it++) {
      for (let j = 0; j < N; j++)
        for (let i = 0; i < N; i++) {
          const k = j * N + i;
          if (!mask[k]) continue;
          let sum = 0;
          let cnt = 0;
          for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const ii = i + di;
            const jj = j + dj;
            if (ii < 0 || jj < 0 || ii >= N || jj >= N) continue;
            const kk = jj * N + ii;
            if (!mask[kk]) continue;
            sum += H[kk];
            cnt++;
          }
          tmp[k] = H[k] + D * (sum - cnt * H[k]);
        }
      [H, tmp] = [tmp, H];
    }
    snaps.push(H.slice());
  }
  const means = snaps.map((h) => {
    let m = 0;
    let c = 0;
    for (let k = 0; k < N * N; k++) if (mask[k]) (m += h[k]), c++;
    return m / Math.max(1, c);
  });
  cached = {
    sample(t, out) {
      const f = Math.max(0, Math.min(steps, (t - T.powerOn) / DT));
      const i0 = Math.floor(f);
      const i1 = Math.min(steps, i0 + 1);
      const w = f - i0;
      const mean = means[i0] * (1 - w) + means[i1] * w;
      const Tm = foodTemp(t);
      const scale = mean > 1e-6 ? (Tm - 20) / mean : 0;
      for (let k = 0; k < N * N; k++) {
        const h = snaps[i0][k] * (1 - w) + snaps[i1][k] * w;
        out[k] = mask[k] ? 20 + h * scale : -1;
      }
      return out;
    },
  };
  return cached;
}
