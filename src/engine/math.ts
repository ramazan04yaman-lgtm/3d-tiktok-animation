/** Pure, deterministic helpers shared by all animation tracks. */
export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
export const invLerp = (a: number, b: number, v: number) => clamp((v - a) / (b - a));
export const smoothstep = (a: number, b: number, v: number) => {
  const u = invLerp(a, b, v);
  return u * u * (3 - 2 * u);
};
/** Quintic smootherstep: zero 1st and 2nd derivative at both ends (no visible jerk). */
export const smootherstep = (a: number, b: number, v: number) => {
  const u = invLerp(a, b, v);
  return u * u * u * (u * (u * 6 - 15) + 10);
};

export const Ease = {
  linear: (u: number) => u,
  inOutCubic: (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
  outCubic: (u: number) => 1 - Math.pow(1 - u, 3),
  inCubic: (u: number) => u * u * u,
  inOutSine: (u: number) => -(Math.cos(Math.PI * u) - 1) / 2,
  smoother: (u: number) => u * u * u * (u * (u * 6 - 15) + 10),
  outBack: (u: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
  },
};
export type EaseFn = (u: number) => number;

/** 0→1 between a and b with easing (default: quintic smootherstep). */
export const ramp = (t: number, a: number, b: number, ease: EaseFn = Ease.smoother) =>
  ease(invLerp(a, b, t));

/** Rise a0→a1, hold, fall b0→b1. Typical "visible during scene" envelope. */
export const envelope = (t: number, a0: number, a1: number, b0: number, b1: number, ease: EaseFn = Ease.smoother) =>
  Math.min(ramp(t, a0, a1, ease), 1 - ramp(t, b0, b1, ease));

/** Piecewise-linear interpolation through [x, y] key pairs (x ascending). */
export const piecewise = (keys: ReadonlyArray<readonly [number, number]>, x: number) => {
  if (x <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (x <= keys[i][0]) {
      const [x0, y0] = keys[i - 1];
      const [x1, y1] = keys[i];
      return lerp(y0, y1, (x - x0) / (x1 - x0));
    }
  }
  return keys[keys.length - 1][1];
};

/** Deterministic hash → [0,1). Same input always gives the same output (render reproducibility). */
export const hash = (n: number) => {
  let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
};
export const hash2 = (a: number, b: number) => hash(Math.imul(a, 73856093) ^ Math.imul(b, 19349663));

/** Smooth deterministic 1D noise from summed sines (no state, frame-order independent). */
export const wobble = (t: number, seed: number) =>
  Math.sin(t * 1.7 + seed * 12.9898) * 0.5 +
  Math.sin(t * 3.1 + seed * 78.233) * 0.3 +
  Math.sin(t * 5.3 + seed * 37.719) * 0.2;
