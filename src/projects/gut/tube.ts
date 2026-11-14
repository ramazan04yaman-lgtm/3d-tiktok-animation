import * as THREE from 'three';

export interface OrganTubeOptions {
  /** radius at arc length s (dm) */
  radius: (s: number, u: number) => number;
  /** rings per dm */
  density?: number;
  radial?: number;
  /** colon: haustra (sacculations between semilunar folds) + three taeniae */
  haustra?: { spacing: number; depth: number; from?: number; to?: number };
  /** small-intestine style shallow circular folds visible on the outside */
  ripple?: number;
  /** round off the ends */
  capStart?: boolean;
  capEnd?: boolean;
  color: THREE.ColorRepresentation;
  bandColor?: THREE.ColorRepresentation;
}

/**
 * Tube along a curve with parallel-transport frames (no twisting). Extra attributes used by the
 * gut shaders: aS = arc length (dm), aR = undeformed radius, aRad = unit radial direction.
 */
export function organTube(curve: THREE.Curve<THREE.Vector3>, o: OrganTubeOptions) {
  const L = curve.getLength();
  const nS = Math.max(8, Math.round(L * (o.density ?? 40)));
  const nR = o.radial ?? 28;
  const T: THREE.Vector3[] = [];
  const N: THREE.Vector3[] = [];
  const P: THREE.Vector3[] = [];
  for (let i = 0; i <= nS; i++) {
    const u = i / nS;
    P.push(curve.getPointAt(u));
    T.push(curve.getTangentAt(u).normalize());
  }
  // parallel transport
  const n0 = new THREE.Vector3(0, 0, 1);
  if (Math.abs(T[0].dot(n0)) > 0.9) n0.set(1, 0, 0);
  N.push(n0.sub(T[0].clone().multiplyScalar(n0.dot(T[0]))).normalize());
  for (let i = 1; i <= nS; i++) {
    const q = new THREE.Quaternion().setFromUnitVectors(T[i - 1], T[i]);
    N.push(N[i - 1].clone().applyQuaternion(q).normalize());
  }
  const pos = new Float32Array((nS + 1) * (nR + 1) * 3);
  const rad = new Float32Array((nS + 1) * (nR + 1) * 3);
  const aS = new Float32Array((nS + 1) * (nR + 1));
  const aR = new Float32Array((nS + 1) * (nR + 1));
  const col = new Float32Array((nS + 1) * (nR + 1) * 3);
  const uv = new Float32Array((nS + 1) * (nR + 1) * 2);
  const base = new THREE.Color(o.color);
  const band = new THREE.Color(o.bandColor ?? o.color);
  const c = new THREE.Color();
  const B = new THREE.Vector3();
  const d = new THREE.Vector3();
  let k = 0;
  for (let i = 0; i <= nS; i++) {
    const u = i / nS;
    const s = u * L;
    B.crossVectors(T[i], N[i]);
    let r = o.radius(s, u);
    if (o.capStart) r *= Math.sqrt(Math.max(0, 1 - Math.max(0, 1 - s / 0.06) ** 2));
    if (o.capEnd) r *= Math.sqrt(Math.max(0, 1 - Math.max(0, 1 - (L - s) / 0.06) ** 2));
    for (let j = 0; j <= nR; j++) {
      const th = (j / nR) * Math.PI * 2;
      d.copy(N[i]).multiplyScalar(Math.cos(th)).addScaledVector(B, Math.sin(th));
      let rr = r;
      let bandW = 0;
      if (o.haustra && s >= (o.haustra.from ?? 0) && s <= (o.haustra.to ?? 1e9)) {
        // three taeniae at 120°: no sacculation there (flat longitudinal bands)
        const a = ((th % ((Math.PI * 2) / 3)) + (Math.PI * 2) / 3) % ((Math.PI * 2) / 3);
        const da = Math.min(a, (Math.PI * 2) / 3 - a);
        bandW = Math.exp(-((da / 0.16) ** 2));
        const f = (s / o.haustra.spacing) % 1;
        const sac = Math.pow(Math.sin(Math.PI * f), 0.7);
        rr = r * (1 - o.haustra.depth + o.haustra.depth * 2 * sac * (1 - bandW) + 0.02 * bandW);
      }
      if (o.ripple) rr *= 1 + o.ripple * Math.sin((s / 0.11) * Math.PI * 2 + th * 0.2);
      pos[k * 3] = P[i].x + d.x * rr;
      pos[k * 3 + 1] = P[i].y + d.y * rr;
      pos[k * 3 + 2] = P[i].z + d.z * rr;
      rad.set([d.x, d.y, d.z], k * 3);
      aS[k] = s;
      aR[k] = rr;
      c.copy(base).lerp(band, bandW * 0.8);
      col.set([c.r, c.g, c.b], k * 3);
      uv[k * 2] = s;
      uv[k * 2 + 1] = j / nR;
      k++;
    }
  }
  const idx: number[] = [];
  for (let i = 0; i < nS; i++)
    for (let j = 0; j < nR; j++) {
      const a = i * (nR + 1) + j;
      const b = a + nR + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aRad', new THREE.BufferAttribute(rad, 3));
  g.setAttribute('aS', new THREE.BufferAttribute(aS, 1));
  g.setAttribute('aR', new THREE.BufferAttribute(aR, 1));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
