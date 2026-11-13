export type Vec3 = readonly [number, number, number];

export interface CameraKey {
  /** time in seconds */
  t: number;
  position: Vec3;
  target: Vec3;
  fov?: number;
  /**
   * If true the camera comes to a gentle stop at this key (zero velocity).
   * Otherwise the camera flows through it with continuous velocity.
   */
  stop?: boolean;
}

export interface CameraSample {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

const DEFAULT_FOV = 32;

/**
 * Convenience: describe a camera by orbit parameters around a target.
 * azimuth 0° = looking from +Z, positive = from +X side; elevation in degrees above the target.
 */
export function orbit(t: number, target: Vec3, azimuthDeg: number, elevationDeg: number, distance: number, extra: Partial<CameraKey> = {}): CameraKey {
  const az = (azimuthDeg * Math.PI) / 180;
  const el = (elevationDeg * Math.PI) / 180;
  const position: Vec3 = [
    target[0] + Math.sin(az) * Math.cos(el) * distance,
    target[1] + Math.sin(el) * distance,
    target[2] + Math.cos(az) * Math.cos(el) * distance,
  ];
  return { t, position, target, ...extra };
}

/**
 * Time-parameterised cubic Hermite spline through camera keys.
 * Tangents use non-uniform Catmull-Rom (finite differences over time), which gives a
 * C¹-continuous path: position AND velocity are continuous, so there are no jumps or jerks.
 */
export class CameraPath {
  readonly keys: CameraKey[];

  constructor(keys: CameraKey[]) {
    if (keys.length < 2) throw new Error('CameraPath needs at least 2 keys');
    this.keys = [...keys].sort((a, b) => a.t - b.t);
    for (let i = 1; i < this.keys.length; i++) {
      if (this.keys[i].t <= this.keys[i - 1].t) throw new Error(`duplicate camera key time ${this.keys[i].t}`);
    }
  }

  private channel(i: number, get: (k: CameraKey) => number): number {
    return get(this.keys[i]);
  }

  private tangent(i: number, get: (k: CameraKey) => number): number {
    const k = this.keys;
    if (k[i].stop || i === 0 || i === k.length - 1) return 0;
    return (get(k[i + 1]) - get(k[i - 1])) / (k[i + 1].t - k[i - 1].t);
  }

  private hermite(t: number, get: (k: CameraKey) => number): number {
    const k = this.keys;
    if (t <= k[0].t) return get(k[0]);
    if (t >= k[k.length - 1].t) return get(k[k.length - 1]);
    let i = 0;
    while (t > k[i + 1].t) i++;
    const t0 = k[i].t;
    const h = k[i + 1].t - t0;
    const u = (t - t0) / h;
    const p0 = this.channel(i, get);
    const p1 = this.channel(i + 1, get);
    const m0 = this.tangent(i, get) * h;
    const m1 = this.tangent(i + 1, get) * h;
    const u2 = u * u;
    const u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * m1;
  }

  sample(t: number): CameraSample {
    const h = (f: (k: CameraKey) => number) => this.hermite(t, f);
    return {
      position: [h((k) => k.position[0]), h((k) => k.position[1]), h((k) => k.position[2])],
      target: [h((k) => k.target[0]), h((k) => k.target[1]), h((k) => k.target[2])],
      fov: h((k) => k.fov ?? DEFAULT_FOV),
    };
  }
}
