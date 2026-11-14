import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useTimelineFrame } from '../time';
import { createXRayMaterial } from '../components/cutaway';
import type { Vec3 } from '../camera';

export interface WaveFrontsProps {
  origin: Vec3;
  intensity: (t: number) => number;
  /** clip to the inside of a box (e.g. a metal cavity the waves cannot leave) */
  box?: { min: Vec3; max: Vec3 };
  maxRadius?: number;
  count?: number;
  /** seconds for one front to expand to maxRadius (visual, hugely slowed down) */
  period?: number;
  color?: THREE.ColorRepresentation;
}

/** Expanding spherical wave fronts (fresnel shells), optionally confined to a box. */
export function WaveFronts({ origin, intensity, box, maxRadius = 3, count = 5, period = 2.4, color = '#5ab8ff' }: WaveFrontsProps) {
  const group = useRef<THREE.Group>(null);
  const mats = useMemo(() => {
    const planes = box
      ? [
          new THREE.Plane(new THREE.Vector3(1, 0, 0), -box.min[0]),
          new THREE.Plane(new THREE.Vector3(-1, 0, 0), box.max[0]),
          new THREE.Plane(new THREE.Vector3(0, 1, 0), -box.min[1]),
          new THREE.Plane(new THREE.Vector3(0, -1, 0), box.max[1]),
          new THREE.Plane(new THREE.Vector3(0, 0, 1), -box.min[2]),
          new THREE.Plane(new THREE.Vector3(0, 0, -1), box.max[2]),
        ]
      : [];
    return Array.from({ length: count }, () => {
      const m = createXRayMaterial(color, planes);
      m.uniforms.uPower.value = 4.0;
      m.uniforms.uBase.value = 0.0;
      return m;
    });
  }, [box, count, color]);
  useTimelineFrame((t) => {
    const g = group.current;
    if (!g) return;
    const k = intensity(t);
    g.visible = k > 0.002;
    g.children.forEach((c, i) => {
      const u = (((t / period + i / count) % 1) + 1) % 1;
      const r = 0.05 + u * maxRadius;
      c.scale.setScalar(r);
      mats[i].uniforms.uOpacity.value = k * Math.sin(Math.PI * Math.min(1, u * 1.15)) * 0.55;
    });
  });
  return (
    <group ref={group} position={origin as unknown as THREE.Vector3Tuple}>
      {mats.map((m, i) => (
        <mesh key={i} material={m} renderOrder={15}>
          <sphereGeometry args={[1, 48, 32]} />
        </mesh>
      ))}
    </group>
  );
}
