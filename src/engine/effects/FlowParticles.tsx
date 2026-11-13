import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useTimelineFrame } from '../time';

export interface FlowParticlesProps {
  curve: THREE.Curve<THREE.Vector3>;
  intensity: (t: number) => number;
  count?: number;
  /** units per second along the curve */
  speed?: number;
  size?: number;
  color?: THREE.ColorRepresentation | ((t: number, u: number, out: THREE.Color) => THREE.Color);
  /** brightness multiplier (>1 makes particles bloom) */
  glow?: number;
  closed?: boolean;
  /** elongate particles along the flow direction (1 = round) */
  stretch?: number;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();
const _tan = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/**
 * Particles streaming along a curve: electric current, convection loops, steam in a duct…
 * Positions depend only on time → deterministic.
 */
export function FlowParticles({ curve, intensity, count = 40, speed = 0.6, size = 0.025, color = '#ffd36a', glow = 3, closed = false, stretch = 1 }: FlowParticlesProps) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const length = useMemo(() => curve.getLength(), [curve]);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), []);
  const fixed = useMemo(() => (typeof color === 'function' ? null : new THREE.Color(color)), [color]);

  useTimelineFrame((t) => {
    const mesh = ref.current;
    if (!mesh) return;
    const k = intensity(t);
    for (let i = 0; i < count; i++) {
      let u = (i / count + (t * speed) / length) % 1;
      if (u < 0) u += 1;
      curve.getPointAt(u, _p);
      const edge = closed ? 1 : Math.min(1, u / 0.06, (1 - u) / 0.06);
      const sc = k > 0.002 ? size * (0.6 + 0.4 * edge) : 0;
      if (stretch !== 1) {
        curve.getTangentAt(u, _tan);
        _q.setFromUnitVectors(UP, _tan.normalize());
      }
      _s.set(sc, sc * stretch, sc);
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(i, _m);
      if (fixed) _c.copy(fixed);
      else (color as (t: number, u: number, out: THREE.Color) => THREE.Color)(t, u, _c);
      mesh.setColorAt(i, _c.multiplyScalar(glow * k * edge));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, material, count]} frustumCulled={false} renderOrder={15}>
      <sphereGeometry args={[1, 10, 8]} />
    </instancedMesh>
  );
}
