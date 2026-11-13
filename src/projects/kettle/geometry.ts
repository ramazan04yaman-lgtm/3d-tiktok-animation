import * as THREE from 'three';

/**
 * Procedural replacement model of a 1.7 l glass kettle (no licensed asset available).
 * Dimensions in decimetres, modelled after typical consumer kettles (Ø ≈ 16 cm, h ≈ 23 cm).
 * Spout points +X, handle −X. Every mesh is named so the GLB export keeps Blender-friendly names.
 */
export const DIM = {
  baseTop: 0.16,
  skirt: { y0: 0.18, y1: 0.52, r: 0.83 },
  plateY: 0.48,
  plateTop: 0.505,
  element: { y: 0.43, r: 0.5, tube: 0.045 },
  glass: { y0: 0.5, y1: 1.98, r0: 0.81, r1: 0.73 },
  waterTop: 1.45,
  collar: { y0: 1.96, y1: 2.2 },
  bimetal: new THREE.Vector3(-0.98, 0.7, 0),
  switchPivot: new THREE.Vector3(-1.17, 0.56, 0),
  connector: new THREE.Vector3(0, 0.24, 0),
  contact: new THREE.Vector3(-0.92, 0.52, 0.06),
  spoutTip: new THREE.Vector3(0.98, 2.24, 0),
};

export const glassRadius = (y: number) => {
  const { y0, y1, r0, r1 } = DIM.glass;
  const u = THREE.MathUtils.clamp((y - y0) / (y1 - y0), 0, 1);
  return r0 + (r1 - r0) * u - 0.025 * Math.sin(Math.PI * u); // slight waist
};

const v2 = (x: number, y: number) => new THREE.Vector2(x, y);

export function baseStationGeometry() {
  const pts = [v2(0, 0), v2(0.97, 0), v2(1.0, 0.02), v2(1.01, 0.1), v2(0.98, 0.15), v2(0.9, DIM.baseTop), v2(0.16, DIM.baseTop), v2(0.13, 0.2), v2(0.0, 0.205)];
  return new THREE.LatheGeometry(pts, 96);
}

export function skirtGeometry() {
  const { y0, y1, r } = DIM.skirt;
  const pts = [v2(0.15, y0), v2(r - 0.05, y0), v2(r - 0.01, y0 + 0.02), v2(r, y0 + 0.06), v2(r + 0.005, y1 - 0.04), v2(r - 0.02, y1)];
  return new THREE.LatheGeometry(pts, 128);
}

export function glassGeometry(inset = 0) {
  const pts: THREE.Vector2[] = [];
  const { y0, y1 } = DIM.glass;
  for (let i = 0; i <= 32; i++) {
    const y = y0 + ((y1 - y0) * i) / 32;
    pts.push(v2(glassRadius(y) - inset, y));
  }
  return new THREE.LatheGeometry(pts, 128);
}

export function waterGeometry() {
  const pts: THREE.Vector2[] = [v2(0, DIM.plateTop + 0.001)];
  const y0 = DIM.plateTop + 0.001;
  for (let i = 0; i <= 16; i++) {
    const y = y0 + ((DIM.waterTop - y0) * i) / 16;
    pts.push(v2(glassRadius(y) - 0.022, y));
  }
  return new THREE.LatheGeometry(pts, 96);
}

export function waterSurfaceGeometry() {
  const g = new THREE.RingGeometry(0.0001, glassRadius(DIM.waterTop) - 0.022, 72, 14);
  g.rotateX(-Math.PI / 2);
  g.translate(0, DIM.waterTop, 0);
  return g;
}

/** Steel top collar with a smoothly pulled-out pouring spout. */
export function collarGeometry() {
  const { y0, y1 } = DIM.collar;
  const pts = [v2(0.66, y0 + 0.02), v2(0.745, y0), v2(0.75, y0 + 0.06), v2(0.735, y1 - 0.02), v2(0.72, y1), v2(0.66, y1 - 0.01)];
  const g = new THREE.LatheGeometry(pts, 160);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const ang = Math.atan2(z, x);
    const h = THREE.MathUtils.clamp((y - y0) / (y1 - y0), 0, 1);
    const pull = 0.27 * Math.exp(-((ang / 0.42) ** 2)) * Math.pow(h, 1.6);
    const r = Math.hypot(x, z);
    const k = (r + pull) / r;
    p.setXYZ(i, x * k, y + pull * 0.18, z * k);
  }
  g.computeVertexNormals();
  return g;
}

export function lidGeometry() {
  const pts = [v2(0, 2.31), v2(0.3, 2.295), v2(0.55, 2.255), v2(0.68, 2.215), v2(0.7, 2.2), v2(0.66, 2.19)];
  return new THREE.LatheGeometry(pts, 128);
}

export const handleCurve = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(-0.68, 2.08, 0),
    new THREE.Vector3(-1.02, 2.07, 0),
    new THREE.Vector3(-1.27, 1.86, 0),
    new THREE.Vector3(-1.34, 1.35, 0),
    new THREE.Vector3(-1.27, 0.98, 0),
    new THREE.Vector3(-1.1, 0.74, 0),
  ],
  false,
  'centripetal',
);

export const steamDuctCurve = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(-0.6, 1.99, 0),
    new THREE.Vector3(-0.82, 2.05, 0),
    new THREE.Vector3(-1.04, 2.04, 0),
    new THREE.Vector3(-1.25, 1.84, 0),
    new THREE.Vector3(-1.315, 1.35, 0),
    new THREE.Vector3(-1.245, 0.99, 0),
    new THREE.Vector3(-1.08, 0.82, 0),
    new THREE.Vector3(-0.98, 0.76, 0),
  ],
  false,
  'centripetal',
);

/** Tubular sheathed element: terminal A → ring → terminal B (gap faces the control at −X). */
export function elementCurve() {
  const { y, r } = DIM.element;
  const gap = 0.25;
  const pts = [new THREE.Vector3(-0.66, y + 0.02, 0.12), new THREE.Vector3(-0.56, y, 0.123)];
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const a = Math.PI - gap - ((2 * Math.PI - 2 * gap) * i) / steps;
    pts.push(new THREE.Vector3(r * Math.cos(a), y, r * Math.sin(a)));
  }
  pts.push(new THREE.Vector3(-0.56, y, -0.123), new THREE.Vector3(-0.66, y + 0.02, -0.12));
  return new THREE.CatmullRomCurve3(pts, false, 'centripetal');
}

const c = (...p: [number, number, number][]) => new THREE.CatmullRomCurve3(p.map((x) => new THREE.Vector3(...x)), false, 'centripetal');

export const wireLive = c([0.02, 0.24, 0.04], [-0.3, 0.29, 0.13], [-0.7, 0.36, 0.11], [-0.88, 0.46, 0.07], [-0.92, 0.52, 0.06]);
export const wireToElement = c([-0.92, 0.52, 0.06], [-0.86, 0.56, 0.1], [-0.74, 0.5, 0.12], [-0.66, 0.45, 0.12]);
export const wireNeutral = c([-0.66, 0.45, -0.12], [-0.72, 0.38, -0.13], [-0.4, 0.3, -0.13], [0.02, 0.24, -0.04]);

/** Whole current loop for the flow particles: connector → switch → element → connector. */
export function currentLoopCurve() {
  const pts: THREE.Vector3[] = [];
  const take = (curve: THREE.Curve<THREE.Vector3>, n: number, skipFirst = false) => {
    for (let i = skipFirst ? 1 : 0; i <= n; i++) pts.push(curve.getPointAt(i / n));
  };
  take(wireLive, 10);
  take(wireToElement, 6, true);
  take(elementCurve(), 60, true);
  take(wireNeutral, 10, true);
  return new THREE.CatmullRomCurve3(pts, false, 'centripetal');
}

/** Simplified convection cell in one vertical plane (rotated around Y). */
export function convectionLoop(angle: number) {
  const p = (r: number, y: number) => new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r);
  return new THREE.CatmullRomCurve3([p(0.18, 0.62), p(0.12, 1.0), p(0.2, 1.33), p(0.45, 1.38), p(0.62, 1.15), p(0.64, 0.8), p(0.5, 0.6), p(0.3, 0.57)], true, 'centripetal');
}

export const cableCurve = c([-0.95, 0.07, 0], [-1.3, 0.04, 0.05], [-2.1, 0.03, -0.4], [-3.2, 0.03, -1.6], [-4.5, 0.03, -2.4]);
