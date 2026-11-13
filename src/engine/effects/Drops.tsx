import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useTimelineFrame } from '../time';
import { hash2 } from '../math';
import type { Vec3 } from '../camera';

export interface DropsProps {
  /** centre of the emitting disc */
  origin: Vec3;
  /** emitter radius (0 = point) */
  radius?: number;
  /** fall height */
  height: number;
  intensity: (t: number) => number;
  count?: number;
  size?: number;
  color?: THREE.ColorRepresentation;
  emissive?: number;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const G = 98.1; // dm/s²

/** Free-falling droplets (ballistic, stateless → deterministic). E.g. a shower screen or dripping spout. */
export function Drops({ origin, radius = 0, height, intensity, count = 120, size = 0.01, color = '#9fd4ff', emissive = 0 }: DropsProps) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const mat = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color, roughness: 0.05, transparent: true, opacity: 0.85, clearcoat: 1, emissive: color, emissiveIntensity: emissive }),
    [color, emissive],
  );
  const fallT = Math.sqrt((2 * height) / G);
  useTimelineFrame((t) => {
    const mesh = ref.current;
    if (!mesh) return;
    for (let i = 0; i < count; i++) {
      const period = fallT * (1.2 + hash2(i, 1) * 1.5);
      const local = t + hash2(i, 2) * period;
      const cycle = Math.floor(local / period);
      const age = local - cycle * period;
      const on = age < fallT && hash2(i, cycle + 7) < intensity(t - age);
      let sc = 0;
      if (on) {
        const a = hash2(i, cycle * 2 + 3) * Math.PI * 2;
        const r = radius * Math.sqrt(hash2(i, cycle * 2 + 4));
        _p.set(origin[0] + Math.cos(a) * r, origin[1] - 0.5 * G * age * age, origin[2] + Math.sin(a) * r);
        sc = size * (0.6 + hash2(i, cycle + 9) * 0.8);
      }
      const v = G * age;
      _s.set(sc, sc * (1 + Math.min(1.5, v * 0.15)), sc);
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(i, _m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, mat, count]} frustumCulled={false} renderOrder={6}>
      <sphereGeometry args={[1, 10, 8]} />
    </instancedMesh>
  );
}
