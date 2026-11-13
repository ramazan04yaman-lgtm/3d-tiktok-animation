import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useTimelineFrame } from '../time';
import type { Vec3 } from '../camera';

export interface HeatRingsProps {
  position: Vec3;
  intensity: (t: number) => number;
  radius?: [number, number];
  rise?: number;
  rings?: number;
  period?: number;
  color?: THREE.ColorRepresentation;
}

/** Expanding glowing rings — a stylised (non-physical) indicator for radiated/conducted heat. */
export function HeatRings({ position, intensity, radius = [0.45, 0.75], rise = 0.25, rings = 4, period = 1.6, color = '#ff6a1f' }: HeatRingsProps) {
  const group = useRef<THREE.Group>(null);
  const mats = useMemo(
    () =>
      Array.from({ length: rings }, () =>
        new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
      ),
    [rings, color],
  );
  const base = useMemo(() => new THREE.Color(color), [color]);
  useTimelineFrame((t) => {
    const g = group.current;
    if (!g) return;
    const k = intensity(t);
    g.visible = k > 0.002;
    g.children.forEach((child, i) => {
      const u = (((t / period + i / rings) % 1) + 1) % 1;
      const r = radius[0] + (radius[1] - radius[0]) * u;
      child.scale.set(r, r, r);
      child.position.y = rise * u;
      const a = Math.sin(Math.PI * u) * k * 1.6;
      mats[i].color.copy(base).multiplyScalar(a);
    });
  });
  return (
    <group ref={group} position={position as unknown as THREE.Vector3Tuple}>
      {mats.map((m, i) => (
        <mesh key={i} material={m} rotation-x={Math.PI / 2} renderOrder={14}>
          <torusGeometry args={[1, 0.008, 6, 96]} />
        </mesh>
      ))}
    </group>
  );
}
